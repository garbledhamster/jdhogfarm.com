import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { registerFarmBookBrowserTests } from './farm-book.browser.mjs';
import { registerChoreBrowserTests } from './farm-chores.browser.mjs';
import { registerOfficeBrowserTests } from './farm-office.browser.mjs';
import { registerGrowthBrowserTests } from './farm-growth.browser.mjs';
import { registerSaveBrowserTests } from './farm-save.browser.mjs';

let server;
let browser;
let url;

before(async () => {
  url = process.env.GAME_URL;
  if (!url) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: root });
    // Drain request logs so repeated navigations cannot fill the server's stderr pipe.
    server.stderr.resume();
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
        ? route.abort() : route.fallback();
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

registerChoreBrowserTests(openGame);

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

async function farmDriver(t, input, options = {}) {
  const touch = input === 'touch';
  const opened = await openGame(t, {
    viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    hasTouch: touch, isMobile: touch, keyboard: input === 'keyboard', networkIsolation: true,
    ...options
  });
  const { page, game, button, value } = opened;
  const writes = [];
  const externalGameRequests = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const destination = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method()) || /formspree|firestore\.googleapis/i.test(request.url())) writes.push(request.url());
    if (destination.origin !== new URL(url).origin && (destination.pathname.includes('/game/') || request.resourceType() === 'font')) {
      externalGameRequests.push(request.url());
    }
  });
  t.after(() => {
    assert.deepEqual(errors, [], 'No uncaught page errors during play');
    assert.deepEqual(writes, [], 'Game never writes to network services');
    assert.deepEqual(externalGameRequests, [], 'Game art and type are local');
  });

  async function activate(locator) {
    if (touch) await locator.tap();
    else if (input === 'keyboard') await locator.press('Enter');
    else await locator.click();
  }

  function control(data, key, target) {
    const selector = `[data-${data}="${key}"]${target === undefined ? '' : `[data-target="${target}"]`}`;
    return game.locator(`button${selector}:visible`);
  }

  const action = (type, target) => activate(control('action', type, target));
  const local = (type, target) => activate(control('local-action', type, target));
  const pick = (panel, target) => activate(control('open', panel, target));
  const click = name => activate(button(name));

  async function go(place) {
    await activate(control('place', 'map'));
    await activate(control('place', place));
  }

  async function confirm(type, quantity) {
    if (quantity !== undefined) {
      await game.locator('input[type="number"]:visible').fill(String(quantity));
    }
    await action(type);
  }

  async function build(plot = '1') {
    await activate(control('select-plot', plot));
    await action('clear-plot', plot);
    await action('build-pen', plot);
  }

  async function buyGrain() {
    await pick('grain-order');
    await confirm('order-grain');
    await page.clock.runFor(1400);
  }

  async function feed({ rotate = false, order = true } = {}) {
    if (rotate) {
      await go('pasture');
      await pick('pasture-gate');
      await action('rotate', 'B');
    }
    await go('barn');
    if (order) await buyGrain();
    await local('start-route');
    await local('assist-route');
    await page.clock.runFor(2500);
    await action('settle-feed');
  }

  async function stock(plot, quantity) {
    await pick('starters', plot);
    await confirm('buy-starters', quantity);
  }

  async function sell(kind, group, quantity) {
    await go('orders');
    await pick(kind, group);
    await confirm(`sell-${kind}`, quantity);
  }

  async function closeWeek() {
    await go('office');
    await action('end-week');
  }

  return { page, game, value, action, local, pick, go, confirm, click, build, buyGrain, feed, stock, sell, closeWeek };
}

registerFarmBookBrowserTests(farmDriver);
registerOfficeBrowserTests(farmDriver);
registerSaveBrowserTests(farmDriver);
registerGrowthBrowserTests(farmDriver);

test('Orders explains how morning feeding changes sale readiness', async t => {
  const farm = await farmDriver(t, 'pointer', { reducedMotion: 'reduce' });
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 2);
  await farm.go('orders');
  assert.match(await farm.game.locator('.farm-scene').innerText(), /full morning.+adds one fed week/i);
  assert.match(await farm.game.locator('.farm-scene').innerText(), /feeders.+2.+5.+market hogs.+6/is);
  assert.equal(await farm.game.getByRole('button', { name: /sell feeders/i }).count(), 0);
  await farm.feed();
  await farm.go('orders');
  await farm.game.getByRole('button', { name: /sell feeders.+Pen 1/i }).waitFor();
  assert.equal(await farm.game.getByRole('button', { name: /sell feeders.+litter/i }).count(), 0);
  assert.match(await farm.game.locator('.farm-scene').innerText(), /full morning.+adds one fed week/i);
});

for (const [name, input, expansions, marketSale, finalCash] of [
  ['one pen', 'keyboard', false, true, '$470'],
  ['two expansions', 'touch', true, true, '$680'],
  ['a missed market sale', 'pointer', false, false, '$20']
]) {
  test(`six-week reference season with ${name} via ${input}`, async t => {
    const farm = await farmDriver(t, input, { reducedMotion: input === 'touch' ? 'reduce' : 'no-preference' });
    assert.match(await farm.value('week'), /Week 1/);
    assert.equal(await farm.value('cash'), '$1,000');
    await farm.build();
    await farm.go('supply');
    await farm.stock('1', expansions ? 4 : 2);
    assert.equal(await farm.value('cash'), expansions ? '$600' : '$800');

    await farm.feed();
    await farm.sell('feeder', '1', expansions ? 4 : 1);
    if (expansions) {
      for (const plot of ['2', '3']) {
        await farm.go('supply');
        await farm.pick('kit', plot);
        await farm.confirm('buy-kit');
        await farm.go('pasture');
        await farm.build(plot);
        await farm.go('supply');
        await farm.stock(plot, 1);
      }
    }
    await farm.closeWeek();

    for (let week = 2; week <= 6; week += 1) {
      assert.match(await farm.value('week'), new RegExp(`Week ${week}`));
      await farm.feed({ rotate: week === 4, order: week !== 4 });
      if (week === 6 && marketSale) {
        assert.match(await farm.game.innerText(), /market.ready|ready for market/i);
        await farm.sell('market', 'litter', expansions ? 2 : 1);
        if (expansions) {
          await farm.go('supply');
          await farm.stock('1', 2);
        }
      }
      if (week === 6 && input === 'pointer') {
        await farm.page.setViewportSize({ width: 320, height: 568 });
        await farm.go('office');
        await farm.pick('ledger');
        const scrollBeforeClose = await farm.game.locator('.farm-panel-body').evaluate(body => {
          body.scrollTop = body.scrollHeight;
          return body.scrollTop;
        });
        assert.ok(scrollBeforeClose > 0);
        await farm.action('end-week');
      } else {
        await farm.closeWeek();
      }
    }

    assert.equal(await farm.value('cash'), finalCash);
    assert.match(await farm.game.innerText(), marketSale
      ? /season won|you did it|successful season|both sales/i
      : /no market|missed market|market.+needed/i);
    const recap = farm.game.getByRole('dialog', { name: 'Season recap', exact: true });
    const exchange = recap.getByRole('region', { name: 'Closing exchange' });
    await exchange.waitFor({ timeout: 2500 });
    assert.equal(await recap.locator('.farm-panel-body').evaluate(body => body.scrollTop), 0);
    assert.match(await exchange.innerText(), marketSale ? /both sales/i : /without a market hog sale/i);
    assert.ok((await exchange.innerText()).includes(finalCash));
    const openLedger = recap.getByRole('button', { name: 'Closing ledger' });
    const ledgerButton = await openLedger.elementHandle();
    assert.equal(await exchange.evaluate((node, button) =>
      node.closest('.farm-panel-body') === button.closest('.farm-panel-body') &&
      Boolean(node.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING), ledgerButton), true);
    await farm.click('Closing ledger');
    const ledger = farm.game.getByRole('dialog', { name: 'Closing ledger', exact: true });
    assert.equal(await ledger.getByRole('rowheader', { name: 'Weekly bill', exact: true }).count(), 6);
    const lastBill = ledger.getByRole('table', { name: 'Week 6 ledger' }).getByRole('row', { name: /Weekly bill/ });
    assert.match(await lastBill.innerText(), /-\$80/);
    assert.ok((await lastBill.innerText()).includes(finalCash));
    assert.equal(await ledger.getByRole('button', { name: 'Replay season', exact: true }).count(), 1);
    const scrolled = await ledger.locator('.farm-panel-body').evaluate(body => {
      body.scrollTop = body.scrollHeight;
      return body.scrollTop;
    });
    assert.ok(scrolled > 0);
    await farm.click('Back to recap');
    await exchange.waitFor();
    assert.equal(await recap.locator('.farm-panel-body').evaluate(body => body.scrollTop), 0);
    await farm.action('replay');
    assert.equal(await farm.value('cash'), '$1,000');
    assert.match(await farm.value('week'), /Week 1/);
    assert.match(await farm.game.innerText(), /wooded|trees/i);
  });
}

test('blocked opening art leaves a playable intro and a working homepage launcher', async t => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.route('**/*', route => {
    const request = route.request();
    return new URL(request.url()).origin === new URL(url).origin && ['GET', 'HEAD'].includes(request.method())
      && !request.url().includes('/game/art/opening-') ? route.continue() : route.abort();
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const launch = page.getByRole('button', { name: 'Open game', exact: true });
  await launch.click();
  const game = page.getByRole('dialog', { name: 'Hog Farm Game', exact: true });
  await game.locator('.farm-prologue-portrait[data-missing]').waitFor();
  await game.getByRole('button', { name: 'Skip intro', exact: true }).press('Enter');
  assert.match(await game.locator('[data-stat="week"]').innerText(), /Week 1/);
  await game.getByRole('button', { name: 'Exit game', exact: true }).press('Enter');
  const resume = page.getByRole('button', { name: 'Continue season', exact: true });
  assert.equal(await resume.evaluate(element => element === document.activeElement), true);
});

test('a grain shortage holds the litter while the pasture-fed starters grow', async t => {
  const farm = await farmDriver(t, 'pointer', { reducedMotion: 'reduce' });
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 2);
  await farm.go('barn');
  assert.match(await farm.game.innerText(), /short by 3 units/i);
  await farm.local('start-route');
  await farm.local('assist-route');
  await farm.page.clock.runFor(2500);
  await farm.pick('feed-shortfall-bucket');
  assert.match(await farm.game.locator('#farm-panel').innerText(), /Piglets.+short by 3 units/i);
  await farm.click('Feed what you can');
  assert.equal(await farm.value('grain'), '0');
  assert.match(await farm.game.innerText(), /Piglets.+held at 0 fed weeks/i);
  assert.match(await farm.game.innerText(), /Grower pen 1.+grew to 2 fed weeks/i);
  await farm.sell('feeder', '1', 1);
  assert.equal(await farm.value('cash'), '$1,000');
  assert.equal(await farm.value('herd'), '4');
});

test('replaying a paused bucket run clears the farm and leaves no route callback', async t => {
  const farm = await farmDriver(t, 'pointer');
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 1);
  await farm.go('barn');
  await farm.buyGrain();
  await farm.local('start-route');
  await farm.local('walk-route');
  await farm.page.clock.runFor(1000);
  await farm.click('Farm map');
  await farm.click('Help journal');
  await farm.pick('replay');
  await farm.action('replay');
  await farm.page.clock.runFor(9000);
  assert.match(await farm.value('week'), /Week 1/);
  assert.equal(await farm.value('cash'), '$1,000');
  assert.equal(await farm.value('grain'), '0');
  assert.equal(await farm.value('herd'), '0');
  await farm.game.getByRole('heading', { name: 'Pasture', exact: true }).waitFor();
  await farm.game.getByRole('button', { name: 'Wooded plot', exact: true }).waitFor();
});

test('the spare grass covers two growers and conversion changes only the next forecast', async t => {
  const farm = await farmDriver(t, 'touch', { viewport: { width: 740, height: 350 }, reducedMotion: 'reduce' });
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 4);
  await farm.feed();
  await farm.sell('feeder', '1', 2);

  await farm.go('supply');
  await farm.pick('kit', '3');
  await farm.confirm('buy-kit', 4);
  await farm.go('pasture');
  await farm.build('3');
  await farm.go('supply');
  await farm.stock('3', 4);

  await farm.go('supply');
  await farm.pick('grass', '2');
  await farm.action('keep-grass');
  const balance = await farm.value('cash');
  assert.equal(balance, '$380');
  await farm.go('barn');
  assert.match(await farm.game.innerText(), /next morning.+9 to feed.+6 from grass/is);

  await farm.go('supply');
  await farm.pick('kit', '2');
  const preview = farm.game.locator('[data-expansion-preview]');
  assert.match(await preview.innerText(), /up to 2 units from the spare grass will be lost/i);
  assert.match(await preview.innerText(), /4 pigs/i);
  assert.equal(await farm.value('cash'), balance);
  await farm.click('Cancel');
  await farm.go('barn');
  assert.match(await farm.game.innerText(), /next morning.+9 to feed.+6 from grass/is);
  assert.match(await farm.game.innerText(), /grew to 2 fed weeks/i);

  await farm.go('supply');
  await farm.pick('kit', '2');
  await farm.confirm('buy-kit', 1);
  assert.equal(await farm.value('cash'), '$260');
  await farm.go('pasture');
  await farm.build('2');
  await farm.go('barn');
  assert.match(await farm.game.innerText(), /next morning.+9 to feed.+4 from grass/is);
  assert.match(await farm.game.innerText(), /grew to 2 fed weeks/i);
});

test('the illustrated map follows a delivery, route and eligible feeder sale', async t => {
  const farm = await farmDriver(t, 'touch', { reducedMotion: 'reduce' });
  const cue = place => farm.game.locator(`[data-map-cue="${place}"]`);
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 2);
  await farm.click('Farm map');
  assert.match(await cue('barn').innerText(), /feed short by 3/i);
  await cue('barn').tap();

  await farm.pick('grain-order');
  await farm.action('order-grain');
  await farm.click('Farm map');
  assert.match(await cue('barn').innerText(), /truck on the road/i);
  await farm.page.clock.runFor(1400);
  assert.match(await cue('barn').innerText(), /grain ready/i);
  assert.equal(await farm.value('grain'), '4');
  await cue('barn').tap();

  await farm.local('start-route');
  await farm.click('Farm map');
  assert.match(await cue('route').innerText(), /resume feed run/i);
  await cue('route').tap();
  await farm.local('assist-route');
  await farm.page.clock.runFor(2500);
  await farm.action('settle-feed');
  await farm.click('Farm map');
  assert.equal(await cue('route').count(), 0);
  assert.match(await cue('orders').innerText(), /feeders ready/i);
  await cue('orders').tap();
  await farm.pick('feeder', '1');
  await farm.confirm('sell-feeder', 2);
  await farm.click('Farm map');
  assert.equal(await cue('orders').count(), 0);
  assert.equal(await farm.value('herd'), '3');
});

test('Debbie links back to unfinished chores, records one bill and reopens a seen conversation', async t => {
  const farm = await farmDriver(t, 'keyboard');
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 2);
  await farm.go('barn');
  await farm.pick('grain-order');
  await farm.action('order-grain');
  await farm.go('office');
  assert.match(await farm.game.innerText(), /wait for the grain truck/i);
  assert.equal(await farm.game.locator('[data-action="end-week"]').count(), 0);
  await farm.page.clock.runFor(1400);
  assert.match(await farm.game.innerText(), /settle the morning feeding/i);
  await farm.feed({ order: false });

  await farm.go('office');
  await farm.click('Talk to Debbie');
  const decision = farm.game.locator('#farm-panel');
  assert.match(await decision.innerText(), /Week 1.+The first morning/i);
  await farm.click('Close');
  await farm.click('Help journal');
  const weekOne = decision.locator('[data-story-week="1"]');
  await weekOne.press('Enter');
  assert.match(await decision.innerText(), /Week 1.+The first morning/i);
  await farm.click('Close');
  assert.equal(await weekOne.evaluate(element => element === document.activeElement), true);
  await farm.click('Close');

  await farm.game.locator('[data-action="end-week"]').evaluate(confirm => {
    confirm.click();
    confirm.click();
  });
  assert.match(await farm.value('week'), /Week 2/);
  assert.equal(await farm.value('cash'), '$620');
});

test('a delivery refreshes an open pen preview without losing the selected number of starters', async t => {
  const farm = await farmDriver(t, 'pointer');
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', 2);
  await farm.feed();
  await farm.sell('feeder', '1', 2);
  await farm.go('barn');
  await farm.pick('grain-order');
  await farm.action('order-grain');

  await farm.go('supply');
  await farm.pick('kit', '2');
  const quantity = farm.game.getByRole('spinbutton', { name: 'Number of starters to plan for' });
  await quantity.fill('4');
  const preview = farm.game.locator('[data-expansion-preview]');
  assert.match(await preview.innerText(), /short by 2/i);
  await farm.game.getByRole('button', { name: 'Confirm kit purchase' }).focus();
  await farm.page.clock.runFor(1400);
  assert.equal(await farm.value('grain'), '5');
  assert.equal(await quantity.inputValue(), '4');
  assert.match(await preview.innerText(), /\$400/);
  assert.doesNotMatch(await preview.innerText(), /short by/i);
});
