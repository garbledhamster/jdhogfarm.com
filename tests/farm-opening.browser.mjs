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
    const cwd = fileURLToPath(new URL('../', import.meta.url));
    server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd });
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

async function play(t, options) {
  const context = await browser.newContext(options);
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin
    && ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const launcher = page.getByRole('button', { name: 'Open game', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Hog Farm Game', exact: true });
  const button = name => dialog.getByRole('button', { name, exact: true });
  return { page, launcher, dialog, button };
}

test('keyboard opening and map preserve the staged free first pen', async t => {
  const { page, launcher, dialog, button } = await play(t, { reducedMotion: 'reduce' });
  await launcher.press('Enter');
  for (const illustration of ['opening-hogs', 'opening-ledger', 'opening-tractor']) {
    await dialog.locator(`img[src="game/art/${illustration}.webp"]`).waitFor();
    await button(illustration === 'opening-tractor' ? 'Go to Pasture' : 'Continue').press('Enter');
  }
  assert.equal(await dialog.locator('[data-stat="week"]').innerText(), 'Week 1 of 6');
  assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$1,000');
  assert.equal(await dialog.getByRole('heading', { name: 'Pasture' }).evaluate(node => document.activeElement === node), true);
  const assertPlot = async status => {
    const stage = dialog.locator(`[data-plot="1"][data-stage="${status}"]`);
    await stage.waitFor();
    assert.equal(await stage.evaluate(node => Boolean(node.getClientRects().length)), true);
  };
  await assertPlot('wooded');
  await button('Wooded plot').press('Enter');
  await button('Clear trees').press('Enter');
  await assertPlot('cleared');
  await button('Farm map').press('Enter');
  await dialog.getByRole('heading', { name: 'Farm map' }).waitFor();
  await button('Return to Pasture').press('Enter');
  await assertPlot('cleared');
  await button('Build first pen').press('Enter');
  await assertPlot('fenced');
  assert.equal(await button('Build first pen').count(), 0);
  assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$1,000');
  await button('Exit game').press('Enter');
  assert.equal(await launcher.evaluate(node => document.activeElement === node), true);
  await page.locator('#home').getByRole('link', { name: 'Ask about availability' }).waitFor();
});

test('skip opens the same plot with touch, frame in portrait and full viewport in short landscape', async t => {
  const { page, launcher, dialog, button } = await play(t, {
    isMobile: true, hasTouch: true, viewport: { width: 390, height: 740 }, reducedMotion: 'reduce'
  });
  await launcher.tap();
  await button('Skip intro').tap();
  assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$1,000');
  const portrait = await dialog.boundingBox();
  assert.ok(portrait.width < 390 && portrait.x > 0);
  await button('Wooded plot').tap();
  await button('Clear trees').tap();
  await page.setViewportSize({ width: 740, height: 350 });
  const landscape = await dialog.boundingBox();
  assert.ok(landscape.width >= 739 && landscape.x <= 1);
  await button('Build first pen').tap();
  await dialog.locator('[data-plot="1"][data-stage="fenced"]').waitFor();
});

for (const [width, height] of [[320, 568], [667, 375]]) {
  test(`season goals before the first purchase and in Help at ${width} × ${height}`, async t => {
    const { launcher, dialog, button } = await play(t, {
      isMobile: true, hasTouch: true, viewport: { width, height }, reducedMotion: 'reduce'
    });
    const goals = /feeder sale.+market hog sale.+cash left after the last bill/i;
    await launcher.press('Enter');
    assert.match(await dialog.locator('.farm-prologue-text').innerText(), goals);
    await button('Skip intro').tap();
    await button('Wooded plot').tap();
    await button('Clear trees').tap();
    await button('Build first pen').tap();
    await button('Go to Farm Supply').tap();
    await button('Buy starters for Pen 1').tap();
    const purchase = dialog.getByRole('dialog', { name: 'Starters for Pen 1' });
    const displayedGoals = purchase.getByText(goals);
    const goalsBounds = await displayedGoals.boundingBox();
    const bodyBounds = await purchase.locator('.farm-panel-body').boundingBox();
    assert.ok(goalsBounds.y + goalsBounds.height <= bodyBounds.y + bodyBounds.height + 1);
    await purchase.getByRole('button', { name: 'Confirm starter purchase' }).tap();
    assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$800');
    await button('Help journal').tap();
    await dialog.getByRole('dialog', { name: 'Help journal' }).getByText(goals).waitFor();
  });
}

test('Farm Supply waits for a pen and starts two distinct groups with one purchase', async t => {
  const { launcher, dialog, button } = await play(t, { reducedMotion: 'reduce' });
  await launcher.click();
  await button('Skip intro').click();
  await button('Farm map').click();
  await button('Farm Supply').click();
  await dialog.getByText('Build the first pen before buying starters.').waitFor();
  assert.equal(await dialog.locator('[data-open="starters"]').count(), 0);
  await button('Farm map').click();
  await button('Pasture').click();
  await button('Wooded plot').click();
  await button('Clear trees').click();
  await button('Build first pen').click();
  await button('Go to Farm Supply').click();
  await dialog.locator('[data-open="starters"][data-target="1"]').click();
  const quantity = dialog.getByRole('spinbutton', { name: 'Number of starter pigs' });
  await quantity.fill('5');
  await dialog.locator('[data-action="buy-starters"]').click();
  assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$1,000');
  await button('Close').click();
  assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$1,000');
  await dialog.locator('[data-open="starters"][data-target="1"]').click();
  await quantity.fill('2');
  await dialog.locator('[data-action="buy-starters"]').evaluate(confirm => {
    confirm.click();
    confirm.click();
  });
  assert.equal(await dialog.locator('[data-stat="cash"]').innerText(), '$800');
  assert.equal(await dialog.locator('[data-stat="herd"]').innerText(), '5');
  assert.equal(await dialog.locator('[data-open="starters"][data-target="1"]').count(), 0);
  await button('Farm map').click();
  await button('Pasture').click();
  await dialog.getByText('2 starter pigs · 1 fed week').waitFor();
  await dialog.getByText('3 piglets in their own pen').waitFor();
  await dialog.getByText('Boar and sow stay on the farm').waitFor();
});
