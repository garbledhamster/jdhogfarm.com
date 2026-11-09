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
  const { fixtures = false, launch = !fixtures, keyboard = false, keepIntro = false, ...contextOptions } = options;
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
  const launcher = page.getByRole('button', { name: 'Open game', exact: true });
  if (launch && keyboard) await launcher.press('Enter');
  else if (launch) await launcher.click();
  const game = page.getByRole(launch ? 'dialog' : 'region', { name: 'Hog Farm Game', exact: true });
  const button = name => game.getByRole('button', { name, exact: true });
  const value = async key => (await game.locator(`[data-stat="${key}"]`).innerText()).trim();
  await game.waitFor();
  if (launch && !keepIntro) {
    if (keyboard) await button('Skip intro').press('Enter');
    else await button('Skip intro').click();
  }
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
  await page.clock.fastForward(30000);
  assert.match(await value('week'), /1/);

  await button('Start season').click();
  await page.clock.fastForward(19999);
  assert.match(await value('week'), /1/);
  await page.clock.runFor(1);
  assert.match(await value('week'), /2/);
  assert.match(await value('cash'), /\$920/);
  assert.match(await value('feed'), /\b1\b/);
  await button('Office').click();
  await button('Ledger').click();
  assert.match(await game.getByRole('dialog').innerText(), /Week 1[^\n]*Weekly overhead[\s\S]*-\$80/);
  await page.keyboard.press('Escape');
  await page.clock.fastForward(20000);
  assert.match(await value('cash'), /\$840/);
  assert.match(await value('feeders'), /\b4\b/);
});

test('#95 clock preserves partial progress on pause, speed change and hidden-tab pause', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('Start season').click();
  await page.clock.fastForward(5000);
  await button('Pause').click();
  await page.clock.fastForward(60000);
  assert.match(await value('week'), /1/);

  await button('2×').click();
  await button('Resume').click();
  await page.clock.fastForward(2500);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await button('Resume').waitFor();
  assert.match(await game.innerText(), /paused.*(?:tab|hidden)|(?:tab|hidden).*paused/i);
  await page.clock.fastForward(60000);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    Reflect.deleteProperty(document, 'visibilityState');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.match(await value('week'), /1/);
  await button('Resume').click();
  await page.clock.fastForward(4999);
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
      : { viewport: { width: 1280, height: 850 }, keyboard: true };
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
  await page.clock.fastForward(20000);
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
  await page.clock.fastForward(30000);
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

test('hog art stays in the active enclosure and clear of scene controls on a narrow phone', async t => {
  const { game, button } = await openGame(t, { viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true });
  const pigs = game.locator('.farm-pig-art');
  async function checkHerd(count, left, right) {
    assert.equal(await pigs.count(), count);
    const placement = await pigs.evaluateAll((sprites, bounds) => {
      const art = sprites[0].closest('.farm-art').getBoundingClientRect();
      const signs = [...sprites[0].closest('.farm-hotspots').querySelectorAll('button')].map(el => el.getBoundingClientRect());
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return sprites.map(sprite => {
        const pig = sprite.getBoundingClientRect();
        const center = (pig.left + pig.width / 2 - art.left) / art.width;
        return { inside: center > bounds.left && center < bounds.right, coveredByControl: signs.some(sign => overlaps(pig, sign)) };
      });
    }, { left, right });
    assert.deepEqual(placement, Array.from({ length: count }, () => ({ inside: true, coveredByControl: false })));
  }

  await checkHerd(4, 0.19, 0.45);
  await button('Paddock B').tap();
  await button('Activate paddock').tap();
  await checkHerd(4, 0.51, 0.82);
  await button('Barn').tap();
  for (let i = 0; i < 2; i += 1) {
    await button('Herd').tap();
    await button('Buy pigs').tap();
    await button('Buy pigs').tap();
  }
  await checkHerd(8, 0.24, 0.6);
});

test('the viewport player fits short phones, landscape and desktop without moving the homepage', async t => {
  for (const [width, height] of [[320, 568], [667, 375], [1280, 720]]) {
    const { page } = await openGame(t, { launch: false, viewport: { width, height }, hasTouch: width < 800, isMobile: width < 800 });
    const launch = page.getByRole('button', { name: 'Open game', exact: true });
    await launch.scrollIntoViewIfNeeded();
    await launch.evaluate(el => el.addEventListener('click', () => {
      el.dataset.testLaunchTop = String(el.getBoundingClientRect().top);
    }, { capture: true, once: true }));
    await launch.click();
    const launchTop = Number(await launch.getAttribute('data-test-launch-top'));
    const player = page.getByRole('dialog', { name: 'Hog Farm Game', exact: true });
    const control = name => player.getByRole('button', { name, exact: true });

    async function fits(name) {
      assert.equal(await control(name).evaluate(el => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
          && el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }), true, `${name} fits at ${width} × ${height}`);
    }

    assert.equal(await player.evaluate(el => el.matches(':modal')), true);
    assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).overflowY), 'hidden');
    await fits('Continue');
    await control('Skip intro').click();
    await fits('Exit game');
    await fits('Start season');
    await fits('Office');
    await fits('Paddock B');
    await control('Barn').click();
    await fits('Feed bin');
    await control('Feed bin').click();
    await fits('Buy feed');
    await fits('Cancel');
    await control('Buy feed').click();
    await control('Start season').click();
    await page.clock.fastForward(4000);
    await control('Exit game').click();
    await player.waitFor({ state: 'hidden' });
    const returnedTop = await launch.evaluate(el => el.getBoundingClientRect().top);
    assert.ok(Math.abs(returnedTop - launchTop) <= 2, `Launcher returns to the same viewport position at ${width} × ${height}`);
    assert.equal(await launch.evaluate(el => el === document.activeElement), true);
    await page.clock.fastForward(30000);
    await launch.click();
    await fits('Resume');
    assert.match(await player.locator('[data-stat="cash"]').innerText(), /\$900/);
    await control('Resume').click();
    await page.clock.fastForward(15999);
    assert.match(await player.locator('[data-stat="week"]').innerText(), /Week 1/);
    await page.clock.runFor(1);
    assert.match(await player.locator('[data-stat="week"]').innerText(), /Week 2/);
    await page.keyboard.press('Escape');
    await player.waitFor({ state: 'hidden' });
  }
});

test('tapping a hog opens its enclosure controls', async t => {
  const { page, game, button } = await openGame(t, { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  async function tapHog() {
    const box = await game.locator('.farm-pig-art').first().boundingBox();
    assert.ok(box);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  await tapHog();
  assert.equal(await game.getByRole('dialog', { name: 'Paddock A', exact: true }).isVisible(), true);
  await button('Close').tap();
  await button('Barn').tap();
  await tapHog();
  assert.equal(await game.getByRole('dialog', { name: 'Herd', exact: true }).isVisible(), true);
});

test('game artwork switches to still assets when reduced motion is enabled', async t => {
  const { page, game } = await openGame(t, { reducedMotion: 'no-preference' });
  const pig = game.locator('.farm-pig-art').first();
  const backdrop = game.locator('.farm-art');
  assert.match(await pig.getAttribute('href'), /pig-motion\.svg$/);
  assert.match(await backdrop.evaluate(el => getComputedStyle(el).backgroundImage), /pasture-motion\.svg/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await game.locator('.farm-pig-art[href$="/pig.svg"]').first().waitFor();
  assert.match(await backdrop.evaluate(el => getComputedStyle(el).backgroundImage), /pasture\.svg/);
});

test('Joe’s opening stays paused and points to a first action on a short phone', async t => {
  const { page, game, button, value } = await openGame(t, {
    viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, keepIntro: true
  });
  const story = game.getByRole('region', { name: 'First morning at J&D' });
  await story.waitFor();
  assert.match(await story.innerText(), /Joe Rice/);
  const portrait = story.getByRole('img', { name: 'Illustrated portrait of Joe Rice' });
  assert.equal(await portrait.evaluate(async el => {
    await el.decode();
    return el.naturalWidth > 0;
  }), true);
  assert.equal(await button('Start season').isVisible(), false);
  await page.clock.fastForward(60000);
  await button('Continue').tap();
  assert.match(await story.innerText(), /two orders/i);
  await button('Continue').tap();
  assert.match(await story.innerText(), /the clock/i);
  await button('Go to the pasture').tap();
  assert.match(await value('week'), /Week 1/);
  assert.match(await value('cash'), /\$1,000/);
  assert.match(await game.locator('.farm-coach').innerText(), /Start season/);
  const timer = game.getByRole('timer', { name: 'Time until the next week' });
  assert.match(await timer.innerText(), /0:20/);
  await button('Start season').tap();
  await page.clock.fastForward(5000);
  assert.match(await timer.innerText(), /0:15/);
  await page.clock.fastForward(15000);
  assert.match(await value('week'), /Week 2/);
  await button('Barn').tap();
  assert.match(await game.locator('.farm-coach').innerText(), /herd|feed bin/i);
  await button('Talk to Joe').tap();
  const chapter = game.getByRole('dialog', { name: 'Joe’s story', exact: true });
  assert.match(await chapter.innerText(), /One week at a time/);
  await button('Resume').waitFor();
  await button('Close').tap();
  await button('Exit game').tap();
  await page.getByRole('button', { name: 'Open game', exact: true }).tap();
  assert.equal(await story.isVisible(), false);
  await button('Resume').waitFor();
});

test('Joe and Debbie’s scene avatars open their story and ledger', async t => {
  const { game, button } = await openGame(t, { viewport: { width: 1280, height: 720 } });
  async function clickCharacter(expected) {
    const character = game.locator('.farm-character-art');
    assert.equal(await character.evaluate(async el => {
      const image = new Image();
      image.src = el.getAttribute('href');
      await image.decode();
      return image.naturalWidth > 0;
    }), true);
    await character.click();
    await game.getByRole('dialog', { name: expected, exact: true }).waitFor();
  }

  await clickCharacter('Joe’s story');
  await button('Close').click();
  await button('Office').click();
  await clickCharacter('Farm ledger');
  const ledger = game.getByRole('dialog', { name: 'Farm ledger', exact: true });
  assert.match(await ledger.innerText(), /Debbie[\s\S]*Cash activity/);
});

test('Joe and Debbie have a fresh exchange in every week of the season', async t => {
  const { page, game, button } = await openGame(t, {
    viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true
  });
  await button('2×').tap();
  const chapter = game.getByRole('dialog', { name: 'Joe’s story', exact: true });
  const titles = [
    'The first morning', 'One week at a time', 'Someone’s coming for feeders',
    'Give the grass a rest', 'The second order', 'Before we shut the gate'
  ];
  const debbieLines = new Set();

  for (const [index, title] of titles.entries()) {
    const week = index + 1;
    const talk = button('Talk to Joe');
    assert.match(await talk.getAttribute('aria-description') ?? '', new RegExp(`New dialogue for Week ${week}`));
    await talk.tap();
    assert.equal(await chapter.getByRole('heading', { name: `Week ${week} · ${title}` }).isVisible(), true);
    const lines = await chapter.locator('.farm-speaker-line').allTextContents();
    assert.equal(lines.length, 2);
    assert.match(lines[0], /Joe\s+\S/);
    assert.match(lines[1], /Debbie\s+\S/);
    debbieLines.add(lines[1].trim());
    await button('Close').tap();
    assert.equal(await talk.getAttribute('aria-description'), null);
    if (week < 6) {
      await button(week === 1 ? 'Start season' : 'Resume').tap();
      await runWeeks(page, 1);
    }
  }

  assert.equal(debbieLines.size, 6);
});
