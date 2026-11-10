import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { test } from 'node:test';
import { routeFarm, snapshot } from './farm-route-fixture.mjs';

const key = 'jdhogfarm.season';
const read = farm => farm.page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
async function resume(farm, state) {
  if (state) await farm.page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data: snapshot(state) });
  await farm.page.reload({ waitUntil: 'domcontentloaded' });
  await farm.page.getByRole('button', { name: 'Continue season', exact: true }).click();
}
async function capture(farm, name) {
  if (!process.env.ROUTE_SCREENSHOTS) return;
  await mkdir(process.env.ROUTE_SCREENSHOTS, { recursive: true });
  await farm.page.screenshot({ path: `${process.env.ROUTE_SCREENSHOTS}/${name}.png` });
}

export function registerRouteBrowserTests(farmDriver) {
  for (const [input, viewport, reducedMotion] of [
    ['keyboard', { width: 1280, height: 800 }, 'no-preference'],
    ['touch', { width: 320, height: 568 }, 'no-preference'],
    ['touch', { width: 667, height: 375 }, 'reduce']
  ]) {
    test(`multi-stop-feeding manual ${input} at ${viewport.width} preserves grain, pauses and settles once`, async t => {
      const farm = await farmDriver(t, input, { viewport, reducedMotion });
      const { page, game } = farm;
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      await resume(farm, routeFarm());
      await farm.local('start-route');
      assert.match(await game.locator('[data-route-stops]').innerText(), /Piglets → Pen 4 → Pen 5/);
      assert.equal((await read(farm)).state.bucket.amount, 5);
      await farm.local('walk-route');
      if (input === 'keyboard') await page.keyboard.press('ArrowLeft');
      else await farm.local('route-lane', '0');
      await page.clock.runFor(5640);
      assert.equal((await read(farm)).routeProgress.completedStops, 1);
      assert.equal(await game.locator('[data-chore-progress]').evaluate(node => node.value), 58);
      assert.equal(await farm.value('grain'), '6');
      await game.locator('[data-route-stop="4"]').waitFor();
      await capture(farm, `route-pen4-${viewport.width}`);
      const carrier = game.locator('[data-chore-hero]');
      await page.clock.runFor(240);
      const pose = await carrier.getAttribute('transform');
      await farm.click('Farm book');
      await page.clock.runFor(2000);
      await farm.click('Close');
      assert.equal(await carrier.getAttribute('transform'), pose);
      await farm.click('Farm map');
      await page.clock.runFor(2000);
      await farm.click('Return to Feed run');
      assert.equal(await carrier.getAttribute('transform'), pose);
      await page.clock.runFor(1760);
      assert.equal((await read(farm)).routeProgress.completedStops, 2);
      await game.locator('[data-route-stop="5"]').waitFor();
      await page.clock.runFor(2000);
      assert.equal((await read(farm)).routeProgress.completedStops, 3);
      assert.equal(await farm.value('grain'), '6');
      assert.equal((await read(farm)).state.feeding, null);
      await capture(farm, `route-arrival-${viewport.width}`);
      await resume(farm);
      await farm.action('settle-feed');
      assert.equal(await farm.value('grain'), '1');
      assert.equal(await farm.value('cash'), '$430');
      const fed = await read(farm);
      assert.equal(fed.state.feeding.grainUsed, 5);
      assert.equal(fed.state.feeding.groups.length, 3);
      await farm.closeWeek();
      assert.equal(await farm.value('cash'), '$350');
      assert.equal((await read(farm)).state.ledger.filter(entry => entry.week === 7 && entry.type === 'overhead').length, 1);
    });
  }

  test('farther route Retry, reload after a stop, and full assistance keep durable progress', async t => {
    const farm = await farmDriver(t, 'touch', { viewport: { width: 320, height: 568 } });
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    await resume(farm, routeFarm());
    await farm.local('start-route');
    await farm.local('walk-route');
    await farm.page.clock.runFor(3000);
    await farm.local('retry-route');
    await farm.local('route-lane', '0');
    await farm.page.clock.runFor(6040);
    assert.equal((await read(farm)).routeProgress.completedStops, 1);
    await resume(farm);
    assert.equal((await read(farm)).routeProgress.completedStops, 1);
    assert.equal(await farm.game.locator('[data-chore-progress]').getAttribute('value'), '58');
    await farm.local('assist-route');
    await farm.page.clock.runFor(2000);
    assert.equal((await read(farm)).bucketArrived, true);
    await farm.action('settle-feed');
    assert.equal(await farm.value('grain'), '1');
  });

  test('farther route is skipped for forage and supports growers alone', async t => {
    const farm = await farmDriver(t, 'keyboard', { reducedMotion: 'reduce' });
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    for (const kind of ['small', 'empty', 'covered', 'growers']) {
      await resume(farm, routeFarm(kind));
      await farm.local('start-route');
      const plan = (await read(farm)).state.bucket.plan;
      assert.equal(plan.length, kind === 'growers' ? 3 : 1);
      await farm.local('assist-route');
      await farm.page.clock.runFor(kind === 'growers' ? 4400 : 2400);
      assert.equal((await read(farm)).bucketArrived, true);
      await capture(farm, `route-${kind}`);
      if (kind === 'small') await farm.pick('feed-shortfall-bucket');
      await farm.action('settle-feed');
      assert.ok((await read(farm)).state.feeding);
    }
  });
  test('farther route replans after new allocations without settling an unvisited pen', async t => {
    const farm = await farmDriver(t, 'keyboard');
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    await resume(farm, routeFarm('covered'));
    await farm.local('start-route');
    await farm.local('walk-route');
    await farm.page.keyboard.press('ArrowLeft');
    await farm.page.clock.runFor(400);
    const original = (await read(farm)).state.bucket.plan;
    await farm.go('supply');
    await farm.stock('1', 4);
    assert.deepEqual((await read(farm)).state.bucket.plan, original);
    await farm.click('Farm map');
    await farm.click('Resume feed run');
    await farm.local('assist-route');
    await farm.page.clock.runFor(2400);
    assert.equal(await farm.game.locator('[data-action="settle-feed"]').count(), 0);
    await farm.go('barn');
    await farm.local('refill-route');
    assert.deepEqual((await read(farm)).state.bucket.plan.map(stop => stop.id), ['litter', '4', '5']);
    assert.equal((await read(farm)).routeProgress.completedStops, 0);
    await farm.local('assist-route');
    await farm.page.clock.runFor(4400);
    await farm.action('settle-feed');
    assert.equal(await farm.value('grain'), '1');
    assert.equal((await read(farm)).state.feeding.grainUsed, 5);
  });

}
