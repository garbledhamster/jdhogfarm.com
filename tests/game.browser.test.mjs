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
  const { fixtures = false, launch = !fixtures, keyboard = false, keepIntro = false, networkIsolation = false, ...contextOptions } = options;
  const context = await browser.newContext({ ignoreHTTPSErrors: true, ...contextOptions });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
  await page.route('https://www.google.com/maps/**', route => route.abort());
  if (fixtures) await inquiryFixtures(page);
  else {
    await page.route('**/*', route => {
      const request = route.request();
      return !['GET', 'HEAD'].includes(request.method()) || /formspree|firestore\.googleapis/i.test(request.url())
        ? route.abort() : route.continue();
    });
    await page.route('https://www.google.com/recaptcha/**', route => route.abort());
  }
  if (networkIsolation && process.env.GAME_INTERCEPT_CF_CHALLENGE === '1') {
    await page.route('**/cdn-cgi/challenge-platform/**', route =>
      route.request().resourceType() === 'script' ? route.abort() : route.continue());
  }
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

async function endWeek(game, input = 'click') {
  const end = game.locator('.farm-end-week');
  if (input === 'keyboard') await end.press('Enter');
  else await end[input]();
  const result = game.locator('#farm-panel');
  await result.locator('[data-action="continue-week"]').waitFor();
  const next = result.locator('[data-action="continue-week"]');
  if (input === 'keyboard') await next.press('Enter');
  else await next[input]();
}

async function advance(game, count, input = 'click') {
  for (let i = 0; i < count; i += 1) await endWeek(game, input);
}

async function timerStart(game) {
  await game.locator('.farm-clock-toggle').click();
}

async function timedWeek(page, game, ms = 60000) {
  await page.clock.fastForward(ms);
  const next = game.locator('#farm-panel [data-action="continue-week"]');
  await next.waitFor();
  await next.click();
}

test('manual play waits for End Week and explains the first feeding and overhead', async t => {
  const { page, game, button, value } = await openGame(t);
  await page.clock.fastForward(120000);
  assert.match(await value('week'), /1/);
  await button('Paddock A').click();
  assert.match(await game.locator('#farm-panel').innerText(), /4|four/i);
  await button('Close').click();
  await button('Barn').click();
  await button('Feed bin').click();
  await button('Cancel').click();
  assert.match(await value('cash'), /\$1,000/);
  await game.locator('.farm-end-week').click();
  const result = game.locator('#farm-panel');
  assert.match(await result.innerText(), /feed|forage/i);
  assert.match(await result.innerText(), /\$80|overhead/i);
  assert.match(await result.innerText(), /growth|fed week/i);
  await result.locator('[data-action="continue-week"]').click();
  assert.match(await value('week'), /2/);
  assert.match(await value('cash'), /\$920/);
});

test('intro scenes and skip lead to the same farm, even when opening art fails', async t => {
  const first = await openGame(t, { keepIntro: true, viewport: { width: 320, height: 568 }, hasTouch: true });
  const story = first.game.getByRole('region', { name: 'First morning at J&D' });
  for (const [index, speaker] of ['Joe', 'Debbie', 'Joe'].entries()) {
    assert.match(await story.innerText(), new RegExp(speaker, 'i'));
    const img = story.locator('.farm-prologue-portrait img');
    assert.match(await img.getAttribute('src'), new RegExp(`opening-${['hogs', 'ledger', 'tractor'][index]}\\.webp`));
    await first.button(index === 2 ? 'Go to Pasture' : 'Continue').tap();
  }
  assert.match(await first.value('week'), /1/);
  assert.match(await first.value('cash'), /\$1,000/);
  const skipped = await openGame(t);
  assert.equal(await skipped.value('week'), await first.value('week'));
  assert.equal(await skipped.value('cash'), await first.value('cash'));
  assert.equal(await skipped.value('herd'), await first.value('herd'));

  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  await page.route('**/game/art/opening-*.webp', route => route.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open game', exact: true }).click();
  const game = page.getByRole('dialog', { name: 'Hog Farm Game' });
  for (let i = 0; i < 2; i += 1) await game.getByRole('button', { name: 'Continue', exact: true }).click();
  await game.getByRole('button', { name: 'Go to Pasture', exact: true }).click();
  assert.match(await game.locator('[data-stat="week"]').innerText(), /1/);
});

for (const input of ['keyboard', 'touch']) {
  test(`reference winning season ends at $1,320 using ${input} without sending game requests`, async t => {
    const { page, game, value } = await openGame(t, input === 'touch'
      ? { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', networkIsolation: true }
      : { viewport: { width: 1280, height: 850 }, keyboard: true, networkIsolation: true });
    const activate = async name => {
      const control = game.getByRole('button', { name, exact: true });
      if (input === 'touch') await control.tap();
      else await control.press('Enter');
    };
    const method = input === 'touch' ? 'tap' : 'keyboard';
    const requests = [];
    page.on('request', request => {
      if (!['GET', 'HEAD'].includes(request.method()) || /formspree|firestore\.googleapis/i.test(request.url())) requests.push(request.url());
    });
    await advance(game, 2, method);
    await activate('Orders');
    await activate('Feeder pickup');
    await activate('Confirm pickup');
    assert.match(await value('cash'), /\$1,240/);
    await activate('Pasture');
    await advance(game, 1, method);
    await activate('Paddock A');
    await activate('Rest paddock');
    await activate('Paddock B');
    await activate('Activate paddock');
    await advance(game, 1, method);
    await activate('Orders');
    await activate('Whole-hog delivery');
    await activate('Confirm delivery');
    await advance(game, 2, method);
    assert.match(await game.innerText(), /\$1,320/);
    assert.match(await game.innerText(), /Feeder pickup[\s\S]*Fulfilled[\s\S]*Whole.hog delivery[\s\S]*Fulfilled/i);
    assert.match(await value('feed'), /\b1\b/);
    assert.deepEqual(requests, []);
  });
}

test('no-action season misses both orders and replay resets farm and pacing', async t => {
  const { page, game, button, value } = await openGame(t);
  await advance(game, 4);
  assert.match(await value('cash'), /\$680/);
  assert.match(await game.innerText(), /short/i);
  await advance(game, 2);
  assert.match(await game.innerText(), /\$520/);
  assert.match(await game.innerText(), /Feeder pickup[\s\S]*Missed[\s\S]*Whole.hog delivery[\s\S]*Missed/i);
  await page.clock.fastForward(120000);
  assert.match(await value('cash'), /\$520/);
  await button('Restart season').click();
  assert.match(await value('week'), /1/);
  assert.match(await value('cash'), /\$1,000/);
  assert.match(await value('herd'), /\b4\b/);
  assert.match(await value('feed'), /\b1\b/);
  assert.equal(await game.locator('.farm-speed').inputValue(), '1');
  assert.doesNotMatch(await game.innerText(), /Missed/i);
  await page.clock.fastForward(120000);
  assert.match(await value('week'), /1/);
});

test('bankruptcy occurs at overhead and blocks further settlement until replay', async t => {
  const { page, game, button, value } = await openGame(t);
  await button('Barn').click();
  for (let i = 0; i < 5; i += 1) {
    await button('Herd').click();
    await button('Buy pigs').click();
    await button('Buy pigs').click();
  }
  assert.match(await value('cash'), /\$0/);
  await game.locator('.farm-end-week').click();
  await game.locator('#farm-panel [data-action="continue-week"]').click();
  assert.match(await game.innerText(), /bankrupt/i);
  assert.match(await game.innerText(), /overhead/i);
  assert.match(await value('cash'), /[-−]\$80/);
  await page.clock.fastForward(120000);
  assert.match(await value('cash'), /[-−]\$80/);
  await button('Restart season').click();
  assert.match(await value('cash'), /\$1,000/);
});

test('timed play preserves partial progress across speed, Help, decisions and inactivity', async t => {
  const { page, game, button, value } = await openGame(t);
  const speed = game.locator('.farm-speed');
  assert.equal(await speed.inputValue(), '1');
  await timerStart(game);
  await page.clock.fastForward(15000);
  await speed.fill('2');
  await game.locator('.farm-help').click();
  await page.clock.fastForward(90000);
  assert.match(await value('week'), /1/);
  await button('Close').click();
  await page.clock.fastForward(90000);
  assert.match(await value('week'), /1/);
  await timerStart(game);
  await page.clock.fastForward(5000);
  await button('Paddock A').click();
  await page.clock.fastForward(90000);
  assert.match(await value('week'), /1/);
  await button('Close').click();
  await timerStart(game);
  await page.clock.fastForward(5000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(90000);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    Reflect.deleteProperty(document, 'visibilityState');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.match(await value('week'), /1/);
  await timerStart(game);
  await page.clock.fastForward(12499);
  assert.match(await value('week'), /1/);
  await page.clock.runFor(1);
  assert.match(await value('week'), /2/);
});

test('a manual commit at the timer boundary cannot settle twice', async t => {
  const { page, game, value } = await openGame(t);
  await timerStart(game);
  await page.clock.fastForward(59999);
  await game.locator('.farm-end-week').evaluate(el => { el.click(); el.click(); });
  await page.clock.fastForward(1000);
  assert.match(await value('week'), /2/);
  assert.match(await value('cash'), /\$920/);
  await game.locator('#farm-panel [data-action="continue-week"]').click();
  await page.clock.fastForward(60000);
  assert.match(await value('week'), /2/);
});

test('manual and timed weeks produce equal farm results for equivalent choices', async t => {
  const manual = await openGame(t);
  await advance(manual.game, 2);
  const timed = await openGame(t);
  await timerStart(timed.game);
  await timedWeek(timed.page, timed.game);
  await timerStart(timed.game);
  await timedWeek(timed.page, timed.game);
  for (const stat of ['week', 'cash', 'herd', 'feed', 'feeders', 'whole']) {
    assert.equal(await timed.value(stat), await manual.value(stat), stat);
  }
});

test('Help returns focus and reopens previously seen conversations through all six weeks', async t => {
  const { game, button } = await openGame(t);
  const seen = new Set();
  for (let week = 1; week <= 6; week += 1) {
    await button('Talk to Joe').click();
    const panel = game.locator('#farm-panel');
    assert.match(await panel.innerText(), new RegExp(`Week ${week}`));
    const lines = await panel.locator('.farm-speaker-line').allTextContents();
    assert.equal(lines.length, 2);
    assert.match(lines[0], /Joe/i);
    assert.match(lines[1], /Debbie/i);
    seen.add(lines.join(' '));
    await button('Close').click();
    const help = game.locator('.farm-help');
    await help.focus();
    await help.press('Enter');
    assert.equal(await panel.locator(`[data-story-week="${week}"]`).isVisible(), true);
    await panel.locator(`[data-story-week="${week}"]`).click();
    assert.match(await panel.innerText(), new RegExp(`Week ${week}`));
    await button('Close').click();
    assert.match(await panel.innerText(), /Help journal/i);
    assert.equal(await panel.locator(`[data-story-week="${week}"]`).evaluate(el => el === document.activeElement), true);
    await button('Close').click();
    if (week < 6) await advance(game, 1);
  }
  assert.equal(seen.size, 6);
  const help = game.locator('.farm-help');
  await help.focus();
  await help.press('Enter');
  await button('Close').click();
  assert.equal(await help.evaluate(el => el === document.activeElement), true);
});

for (const [width, height] of [[320, 568], [667, 375], [1280, 720]]) {
  test(`game controls remain reachable at ${width} × ${height}`, async t => {
    const { page, game, button } = await openGame(t, { viewport: { width, height }, hasTouch: width < 800, isMobile: width < 800 });
    async function fits(locator, name) {
      assert.equal(await locator.evaluate(el => {
        const box = el.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
          && el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }), true, `${name} must be visible and actionable`);
    }
    await page.evaluate(async () => { await document.fonts.ready; });
    if (width === 667 && height === 375) {
      const stats = await game.locator('.farm-stats > div').evaluateAll(columns => columns.map(column => {
        const outer = column.getBoundingClientRect();
        return [...column.querySelectorAll('dt, dd')].map(text => {
          const range = document.createRange();
          range.selectNodeContents(text);
          return [...range.getClientRects()].every(rect => rect.left >= outer.left - 1 && rect.right <= outer.right + 1);
        });
      }));
      assert.deepEqual(stats, Array.from({ length: 5 }, () => [true, true]), 'Stats labels and values stay inside their columns');
    }
    await fits(button('Exit game'), 'Exit game');
    await fits(game.locator('.farm-end-week'), 'End Week');
    await fits(game.locator('.farm-help'), 'Help');
    await fits(button('Paddock A'), 'Paddock A');
    await fits(button('Paddock B'), 'Paddock B');
    for (const place of ['Pasture', 'Barn', 'Orders', 'Office']) {
      const control = button(place);
      assert.match(await control.locator('img').getAttribute('src'), new RegExp(`${place.toLowerCase()}\\.svg`));
      await fits(control, place);
    }
    await button('Barn').click();
    await button('Feed bin').click();
    await fits(button('Buy feed'), 'Buy feed');
    await fits(button('Cancel'), 'Cancel');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
}

test('navigation communicates selected place without color and keyboard focus is visible at zoom', async t => {
  const { page, game, button } = await openGame(t, { viewport: { width: 1280, height: 850 }, keyboard: true });
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  const barn = button('Barn');
  await barn.focus();
  assert.equal(await barn.evaluate(el => el.matches(':focus-visible')), true);
  assert.notEqual(await barn.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
  await barn.press('Enter');
  assert.equal(await barn.getAttribute('aria-pressed'), 'true');
  assert.equal(await button('Pasture').getAttribute('aria-pressed'), 'false');
  assert.equal(await game.locator('.farm-end-week').isVisible(), true);
});

test('reduced motion uses still artwork and characters open their actions', async t => {
  const { game, button } = await openGame(t, { reducedMotion: 'reduce' });
  const backdrop = game.locator('.farm-art');
  assert.match(await backdrop.evaluate(el => getComputedStyle(el).backgroundImage), /pasture\.svg/);
  assert.match(await game.locator('.farm-pig-art').first().getAttribute('href'), /pig\.svg$/);
  await game.locator('.farm-character-art').click();
  assert.match(await game.locator('#farm-panel').innerText(), /Joe/i);
  await button('Close').click();
  await button('Office').click();
  await game.locator('.farm-character-art').click();
  assert.match(await game.locator('#farm-panel').innerText(), /ledger|cash activity/i);
});

test('character poses and portraits agree after a pickup and during a shortage', async t => {
  const { game, button } = await openGame(t, { reducedMotion: 'reduce' });
  await advance(game, 2);
  await button('Orders').click();
  await button('Feeder pickup').click();
  await button('Confirm pickup').click();
  await button('Office').click();
  const character = game.locator('.farm-character-art');
  const panel = game.locator('#farm-panel');
  assert.match(await character.getAttribute('href'), /debbie-settled-avatar\.webp$/);
  await character.click();
  assert.match(await panel.locator('img').getAttribute('src'), /debbie-settled-portrait\.webp$/);
  await button('Close').click();
  await advance(game, 1);
  await button('Pasture').click();
  assert.match(await character.getAttribute('href'), /joe-concerned-avatar\.webp$/);
  await character.click();
  assert.match(await panel.locator('img').first().getAttribute('src'), /joe-concerned-portrait\.webp$/);
  assert.match(await panel.innerText(), /short by 1 feed unit/i);
});

test('speed slider accepts keyboard steps and touch-accessible values from one through four', async t => {
  const { game } = await openGame(t, { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });
  const speed = game.getByRole('slider', { name: /speed/i });
  await speed.focus();
  for (let next = 2; next <= 4; next += 1) {
    await speed.press('ArrowRight');
    assert.equal(await speed.inputValue(), String(next));
    assert.match(await game.locator('.farm-speed-value').innerText(), new RegExp(`${next}×`));
  }
  await speed.fill('1');
  assert.equal(await speed.inputValue(), '1');
});

test('rotation restores forage and the former paddock recovers after two boundaries', async t => {
  const { game, button, value } = await openGame(t);
  await advance(game, 2);
  await button('Paddock B').click();
  await button('Activate paddock').click();
  assert.match(await value('cash'), /\$790/);
  await button('Paddock A').click();
  assert.match(await game.locator('#farm-panel').innerText(), /Resting/i);
  await button('Close').click();
  await advance(game, 2);
  await button('Paddock A').click();
  assert.match(await game.locator('#farm-panel').innerText(), /Ready/i);
  assert.match(await value('whole'), /\b4\b/);
  assert.match(await value('feed'), /\b1\b/);
});

test('canceling a purchase changes nothing; buying pigs and feed changes the forecast', async t => {
  const { game, button, value } = await openGame(t);
  await button('Barn').click();
  await button('Feed bin').click();
  assert.match(await game.locator('#farm-panel').innerText(), /After purchase[\s\S]*\$900[\s\S]*5 units/i);
  await button('Cancel').click();
  assert.match(await value('cash'), /\$1,000/);
  await button('Herd').click();
  await button('Buy pigs').click();
  assert.match(await game.locator('#farm-panel').innerText(), /After purchase[\s\S]*\$800[\s\S]*6 pigs/i);
  await button('Buy pigs').click();
  assert.match(await value('herd'), /\b6\b/);
  await button('Feed bin').click();
  assert.match(await game.locator('#farm-panel').innerText(), /After purchase[\s\S]*\$700[\s\S]*5 units/i);
  await button('Buy feed').click();
  await advance(game, 1);
  assert.match(await value('feed'), /\b3\b/);
  assert.match(await value('herd'), /\b6\b/);
});

test('leaving the game pauses its clock and restores launcher focus and position', async t => {
  const { page, game, button, value } = await openGame(t);
  await timerStart(game);
  await page.clock.fastForward(15000);
  await button('Exit game').click();
  const launcher = page.getByRole('button', { name: 'Open game', exact: true });
  assert.equal(await launcher.evaluate(el => el === document.activeElement), true);
  const position = await launcher.evaluate(el => el.getBoundingClientRect().top);
  await page.clock.fastForward(120000);
  await launcher.click();
  assert.match(await value('week'), /1/);
  await timerStart(game);
  await page.clock.fastForward(44999);
  assert.match(await value('week'), /1/);
  await page.clock.runFor(1);
  assert.match(await value('week'), /2/);
  await game.locator('#farm-panel [data-action="continue-week"]').click();
  await button('Exit game').click();
  assert.ok(Math.abs((await launcher.evaluate(el => el.getBoundingClientRect().top)) - position) <= 2);
});

for (const [width, height] of [[320, 568], [667, 375]]) {
  test(`all opening quotes fit without scrolling at ${width} × ${height}`, async t => {
    const { page, game, button } = await openGame(t, {
      keepIntro: true, viewport: { width, height }, hasTouch: true, isMobile: true
    });
    await page.evaluate(async () => { await document.fonts.ready; });
    const script = game.locator('.farm-prologue-script');
    const quote = game.locator('.farm-prologue-text');
    for (let scene = 0; scene < 3; scene += 1) {
      const fitting = await quote.evaluate(el => {
        const container = el.closest('.farm-prologue-script');
        const text = el.getBoundingClientRect();
        const bounds = container.getBoundingClientRect();
        return {
          quoteFits: el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1,
          scriptFits: container.scrollHeight <= container.clientHeight + 1,
          visible: text.top >= bounds.top - 1 && text.bottom <= bounds.bottom + 1 && text.top >= 0 && text.bottom <= innerHeight
        };
      });
      assert.deepEqual(fitting, { quoteFits: true, scriptFits: true, visible: true }, `Scene ${scene + 1} quote fits`);
      assert.equal(await script.evaluate(el => el.scrollTop), 0);
      await button(scene === 2 ? 'Go to Pasture' : 'Continue').click();
    }
  });
}
