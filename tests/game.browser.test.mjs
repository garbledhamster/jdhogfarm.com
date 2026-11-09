import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

let server;
let browser;
let url;

before(async () => {
  url = process.env.GAME_URL;
  if (!url) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root });
    url = await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`Static server exited with code ${code}`)));
      server.stdout.on('data', data => {
        const port = String(data).match(/port (\d+)/)?.[1];
        if (port) resolve(`http://127.0.0.1:${port}/`);
      });
    });
  }
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
});

after(async () => {
  await browser?.close();
  server?.kill();
});

async function openGame(t, options = {}) {
  const { fixtures = false, ...contextOptions } = options;
  const context = await browser.newContext({ ignoreHTTPSErrors: true, ...contextOptions });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
  await page.route('https://www.google.com/maps/**', route => route.abort());
  if (fixtures) await inquiryFixtures(page);
  else await page.route('https://www.google.com/recaptcha/**', route => route.abort());
  await page.clock.install({ time: new Date('2026-11-08T18:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-08T18:01:00Z'));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const game = page.getByRole('region', { name: 'Hog Farm Game' });
  const button = name => game.getByRole('button', { name, exact: true });
  const value = async key => (await game.locator(`[data-stat="${key}"]`).innerText()).trim();
  await game.waitFor();
  return { page, game, button, value };
}

async function runWeeks(page, weeks, milliseconds = 10000) {
  for (let week = 0; week < weeks; week += 1) await page.clock.fastForward(milliseconds);
}

test('#95 homepage starts paused and shares one farm across four scenes', async t => {
  const { page, game, button, value } = await openGame(t);
  assert.match(await value('week'), /1/);
  assert.match(await value('cash'), /\$1,000/);
  assert.match(await value('herd'), /\b4\b/);
  assert.match(await value('feed'), /\b1\b/);
  await button('Start season').waitFor();
  assert.match(await game.innerText(), /Paddock A/i);

  await button('Orders').click();
  assert.match(await game.innerText(), /Feeder pickup/i);
  assert.match(await game.innerText(), /Whole.hog delivery/i);
  await button('Barn').click();
  assert.match(await value('cash'), /\$1,000/);
  await page.clock.runFor(30000);
  assert.match(await value('week'), /1/);

  await button('Start season').click();
  await page.clock.runFor(19999);
  assert.match(await value('week'), /1/);
  await page.clock.runFor(1);
  assert.match(await value('week'), /2/);
  assert.match(await value('cash'), /\$920/);
  assert.match(await value('feed'), /\b1\b/);
  await button('Office').click();
  await button('Ledger').click();
  assert.match(await game.getByRole('dialog').innerText(), /Week 1[^\n]*Weekly overhead[\s\S]*-\$80/);
  await page.keyboard.press('Escape');
  await page.clock.runFor(20000);
  assert.match(await value('cash'), /\$840/);
  assert.match(await value('feeders'), /\b4\b/);
});

test('#95 clock preserves partial progress on pause, speed change and hidden-tab pause', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('Start season').click();
  await page.clock.runFor(5000);
  await button('Pause').click();
  await page.clock.runFor(60000);
  assert.match(await value('week'), /1/);

  await button('2×').click();
  await button('Resume').click();
  await page.clock.runFor(2500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await button('Resume').waitFor();
  assert.match(await game.innerText(), /paused.*(?:tab|hidden)|(?:tab|hidden).*paused/i);
  await page.clock.runFor(60000);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    Reflect.deleteProperty(document, 'visibilityState');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.match(await value('week'), /1/);
  await button('Resume').click();
  await page.clock.runFor(4999);
  assert.match(await value('week'), /1/);
  await page.clock.runFor(1);
  assert.match(await value('week'), /2/);
});

async function inquiryFixtures(page) {
  await page.route('https://www.google.com/recaptcha/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.grecaptcha = { enterprise: { execute: async () => "fixture-token" } };'
  }));
  await page.route('https://www.gstatic.com/firebasejs/**', route => {
    const body = route.request().url().includes('firestore')
      ? `window.firebase.firestore = Object.assign(() => ({
          collection: name => ({add: async data => {
            window.testInquiry = {name, data};
            return {id: 'fixture'};
          }})
        }), {FieldValue: {serverTimestamp: () => 'fixture-timestamp'}});`
      : 'window.firebase = { initializeApp() {} };';
    return route.fulfill({ contentType: 'application/javascript', body });
  });
}

test('homepage inquiry link and existing inquiry flow still work with writes intercepted', async t => {
  const { page } = await openGame(t, { fixtures: true });
  const sent = [];
  await page.route('https://formspree.io/f/**', route => {
    const request = route.request();
    sent.push({ url: request.url(), method: request.method(), body: request.postData() });
    return route.fulfill({ json: { ok: true }, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.locator('#home').getByRole('link', { name: 'Ask about availability' }).click();
  assert.equal(new URL(page.url()).hash, '#contact');
  const form = page.locator('#contact-form');
  await form.getByLabel('Your Name:').fill('Browser check');
  await form.getByLabel('Your Email:').fill('browser@example.invalid');
  await form.getByLabel(/Your Message/).fill('This is an intercepted browser test.');
  await form.getByRole('button', { name: 'Send inquiry' }).click();
  await page.getByRole('heading', { name: 'Inquiry sent' }).waitFor();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, 'https://formspree.io/f/xvgongjo');
  assert.equal(sent[0].method, 'POST');
  assert.match(sent[0].body, /fixture-token/);
  const log = await page.evaluate(() => window.testInquiry);
  assert.equal(log.name, 'messages');
  assert.equal(log.data.message, 'This is an intercepted browser test.');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await form.getByLabel('Your Name:').inputValue(), '');
});

test('#96 rotation restores forage and the old paddock recovers after two boundaries', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('2×').click();
  await button('Start season').click();
  await runWeeks(page, 2);

  await button('Paddock B').click();
  await button('Activate paddock').click();
  assert.match(await value('cash'), /\$790/);
  await button('Paddock A').click();
  assert.match(await game.getByRole('dialog').innerText(), /Resting/i);
  await page.keyboard.press('Escape');
  await runWeeks(page, 2);
  await button('Paddock A').click();
  assert.match(await game.getByRole('dialog').innerText(), /Ready/i);
  assert.match(await value('whole'), /\b4\b/);
  assert.match(await value('feed'), /\b1\b/);
});

test('#97 cancel leaves the farm alone; buying pigs and feed changes next week’s outlook', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('Barn').click();
  await button('Feed bin').click();
  const dialog = game.getByRole('dialog');
  assert.match(await dialog.innerText(), /After purchase[\s\S]*\$900[\s\S]*5 units/i);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.match(await value('cash'), /\$1,000/);
  assert.match(await value('feed'), /\b1\b/);

  await button('Herd').click();
  await dialog.getByRole('button', { name: 'Buy pigs', exact: true }).click();
  const pigPreview = await dialog.innerText();
  assert.match(pigPreview, /After purchase[\s\S]*\$800[\s\S]*6 pigs/i);
  assert.match(pigPreview, /short by 1 unit/i);
  await dialog.getByRole('button', { name: 'Buy pigs', exact: true }).click();
  assert.match(await value('herd'), /\b6\b/);
  assert.match(await value('cash'), /\$800/);
  assert.match(await game.innerText(), /short/i);

  await button('Feed bin').click();
  const feedPreview = await dialog.innerText();
  assert.match(feedPreview, /After purchase[\s\S]*\$700[\s\S]*5 units/i);
  assert.match(feedPreview, /use 2 units from storage and gain a fed week/i);
  await dialog.getByRole('button', { name: 'Buy feed', exact: true }).click();
  assert.match(await value('feed'), /\b5\b/);
  assert.match(await value('cash'), /\$700/);
  await button('2×').click();
  await button('Start season').click();
  await runWeeks(page, 1);
  assert.match(await value('feed'), /\b3\b/);
  assert.match(await value('herd'), /\b6\b/);
  await button('Herd').click();
  assert.match(await dialog.innerText(), /1 fed week/i);
});

test('#98 an open pickup panel cannot confirm after its deadline', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('2×').click();
  await button('Start season').click();
  await button('Orders').click();
  await runWeeks(page, 3);
  assert.match(await game.innerText(), /last week|due this week|final week/i);
  await button('Feeder pickup').click();
  const dialog = game.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Confirm pickup', exact: true });
  assert.equal(await confirm.isEnabled(), true);
  await runWeeks(page, 1);
  assert.match(await dialog.innerText(), /missed|deadline.*passed/i);
  assert.equal(await confirm.isEnabled(), false);
  assert.match(await value('cash'), /\$680/);
  assert.match(await value('herd'), /\b4\b/);
  await button('Pause').waitFor();
});

for (const input of ['keyboard', 'touch']) {
  test(`#99 wins the reference season with ${input} and keeps game actions local`, async t => {
    const context = input === 'touch'
      ? { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
      : { viewport: { width: 1280, height: 850 } };
    const { page, game, button, value } = await openGame(t, context);
    const activate = async (name, scope = game) => {
      const control = scope.getByRole('button', { name, exact: true });
      if (input === 'touch') await control.tap();
      else await control.press('Enter');
    };
    const dialog = game.getByRole('dialog');
    const mutations = [];
    const gameErrors = [];
    page.on('request', request => {
      if (!['GET', 'HEAD'].includes(request.method()) || /formspree|firestore\.googleapis/.test(request.url())) {
        mutations.push(request.method() + ' ' + request.url());
      }
    });
    page.on('pageerror', error => {
      if (error.stack?.includes('/game/')) gameErrors.push(error.message);
    });

    if (input === 'keyboard') {
      for (let i = 0; i < 16 && !(await button('Start season').evaluate(el => el === document.activeElement)); i += 1) {
        await page.keyboard.press('Tab');
      }
      assert.equal(await button('Start season').evaluate(el => el.matches(':focus-visible')), true);
      const outline = await button('Start season').evaluate(el => getComputedStyle(el).outlineStyle);
      assert.notEqual(outline, 'none');
    }
    await activate('2×');
    await activate('Start season');
    await runWeeks(page, 2);
    assert.match(await value('feeders'), /\b4\b/);

    await activate('Orders');
    await activate('Feeder pickup');
    if (input === 'keyboard') {
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      await page.keyboard.press('Escape');
      assert.equal(await button('Feeder pickup').evaluate(el => el === document.activeElement), true);
      await activate('Feeder pickup');
    } else {
      const confirmation = dialog.getByRole('button', { name: 'Confirm pickup', exact: true });
      assert.equal(await confirmation.evaluate(el => {
        const { left, top, width, height, bottom } = el.getBoundingClientRect();
        return bottom <= innerHeight && el.contains(document.elementFromPoint(left + width / 2, top + height / 2));
      }), true, 'The pickup confirmation is visible and tappable when the panel opens');
    }
    await activate('Confirm pickup', dialog);
    assert.match(await value('cash'), /\$1,240/);
    assert.match(await value('herd'), /\b2\b/);

    await activate('Pasture');
    await runWeeks(page, 1);
    await activate('Paddock A');
    await activate('Rest paddock', dialog);
    await activate('Paddock B');
    await activate('Activate paddock', dialog);
    await runWeeks(page, 1);
    assert.match(await value('cash'), /\$1,030/);
    await activate('Orders');
    await activate('Whole-hog delivery');
    await activate('Confirm delivery', dialog);
    assert.match(await value('cash'), /\$1,480/);
    assert.match(await value('herd'), /\b0\b/);
    await runWeeks(page, 2);

    const recap = await game.innerText();
    assert.match(recap, /\$1,320/);
    assert.match(recap, /season won|success|met (?:the|your) goal/i);
    assert.match(recap, /Feeder pickup[\s\S]*Fulfilled[\s\S]*Whole.hog delivery[\s\S]*Fulfilled/i);
    assert.match(await value('feed'), /\b1\b/);
    assert.equal(await game.getByRole('status').count() >= 1, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(mutations, []);
    assert.deepEqual(gameErrors, []);
  });
}

test('#99 no-action run shows missed orders and shortage, then restarts the entire season', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('2×').click();
  await button('Start season').click();
  await runWeeks(page, 4);
  assert.match(await value('cash'), /\$680/);
  assert.match(await value('feed'), /\b0\b/);
  assert.match(await game.innerText(), /short/i);
  await runWeeks(page, 2);
  assert.match(await value('cash'), /\$520/);
  assert.match(await game.innerText(), /Feeder pickup[\s\S]*Missed[\s\S]*Whole.hog delivery[\s\S]*Missed/i);
  await page.clock.runFor(20000);
  assert.match(await value('cash'), /\$520/);
  await button('Restart season').click();
  await button('Start season').waitFor();
  assert.match(await value('week'), /1/);
  assert.match(await value('cash'), /\$1,000/);
  assert.match(await value('feed'), /\b1\b/);
  assert.match(await value('herd'), /\b4\b/);
  assert.equal(await button('1×').getAttribute('aria-pressed'), 'true');
  assert.doesNotMatch(await game.innerText(), /Missed/);
});

test('#99 bankruptcy records the overhead and stops a running season', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('Barn').click();
  const dialog = game.getByRole('dialog');
  for (let i = 0; i < 5; i += 1) {
    await button('Herd').click();
    await dialog.getByRole('button', { name: 'Buy pigs', exact: true }).click();
    await dialog.getByRole('button', { name: 'Buy pigs', exact: true }).click();
  }
  assert.match(await value('cash'), /\$0/);
  await button('2×').click();
  await button('Start season').click();
  await runWeeks(page, 1);
  assert.match(await value('cash'), /-\$80|−\$80/);
  assert.match(await game.innerText(), /bankrupt/i);
  assert.match(await game.innerText(), /overhead/i);
  await page.clock.runFor(30000);
  assert.match(await value('cash'), /-\$80|−\$80/);
  await button('Restart season').waitFor();
});

test('#99 narrow Orders artwork leaves room for the deadline label and focus outline', async t => {
  const { page, button } = await openGame(t, { viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true });
  await button('2×').tap();
  await button('Start season').tap();
  await runWeeks(page, 5);
  await button('Orders').tap();
  const delivery = button('Whole-hog delivery');
  assert.match(await delivery.innerText(), /due this week/i);
  assert.equal(await delivery.evaluate(el => {
    const art = el.closest('.farm-art').getBoundingClientRect();
    const target = el.getBoundingClientRect();
    return target.top >= art.top + 6 && target.bottom <= art.bottom - 6;
  }), true, 'The complete delivery control and its focus outline fit inside the art');
});
