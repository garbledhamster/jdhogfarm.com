import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const saveKey = 'jdhogfarm.season';
const [, firstWin] = JSON.parse(readFileSync(new URL('./fixtures/farm-season-v1.json', import.meta.url)));

async function reloadFarm(farm, snapshot) {
  if (snapshot) {
    await farm.page.evaluate(({ key, snapshot }) => {
      localStorage.setItem(key, JSON.stringify(snapshot));
    }, { key: saveKey, snapshot });
  }
  await farm.page.reload({ waitUntil: 'domcontentloaded' });
}

async function resume(farm, snapshot) {
  await reloadFarm(farm, snapshot);
  await farm.page.getByRole('button', { name: 'Continue season', exact: true }).click();
}

export function registerLandBrowserTests(farmDriver) {
  test('farther land can be bought before the planned starter is affordable', async t => {
    const farm = await farmDriver(t, 'pointer');
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    await resume(farm, firstWin);
    await farm.click('Continue farm');
    await farm.buyGrain();
    await farm.buyGrain();
    assert.equal(await farm.value('cash'), '$270');
    await farm.go('supply');
    await farm.pick('kit', '4');
    const figures = farm.game.getByRole('region', { name: 'Price and feed outlook' });
    assert.match(await figures.innerText(), /Due now\s+\$220/);
    assert.match(await figures.innerText(), /After starters\s+-\$50/);
    assert.match(await figures.innerText(), /Save \$50 more for the planned starters/);
    await farm.click('Buy land and kit');
    assert.equal(await farm.value('cash'), '$50');
  });

  test('farther land in the ledger prevents a truncated current save from resuming', async t => {
    const farm = await farmDriver(t, 'pointer');
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    await resume(farm, firstWin);
    await farm.click('Continue farm');
    await farm.go('supply');
    await farm.pick('kit', '4');
    await farm.confirm('buy-kit', 0);
    const damaged = await farm.page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
    assert.equal(damaged.state.ledger.at(-1).id, '4');
    damaged.state.plots = damaged.state.plots.slice(0, 3);
    await reloadFarm(farm, damaged);
    assert.equal(await farm.page.getByRole('button', { name: 'Continue season', exact: true }).count(), 0);
    await farm.page.getByRole('button', { name: 'Open game', exact: true }).waitFor();
  });

  for (const [width, height] of [[320, 568], [667, 375]]) {
    test(`farther land preview and purchase survive reload at ${width} × ${height}`, async t => {
      const farm = await farmDriver(t, 'touch', { viewport: { width, height }, reducedMotion: 'reduce' });
      await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
      await resume(farm, firstWin);
      await farm.click('Continue farm');
      if (width === 320) {
        const olderGrowth = await farm.page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
        olderGrowth.state.plots = olderGrowth.state.plots.slice(0, 3);
        await resume(farm, olderGrowth);
        assert.equal(await farm.value('week'), 'Week 7 of 12');
      }
      await farm.go('supply');
      const panel = farm.game.locator('#farm-panel');
      for (const id of ['4', '5']) {
        await farm.pick('kit', id);
        assert.equal(await panel.getByRole('heading').innerText(), `Preview Plot ${id}`);
        const figures = panel.getByRole('region', { name: 'Price and feed outlook' });
        assert.match(await figures.innerText(), /Land now\s+\$100\s+Kit now\s+\$120\s+Starters later\s+\$100/);
        assert.match(await figures.innerText(), /After starters\s+\$150/);
        assert.match(await figures.innerText(), /Added capacity\s+4 pigs/);
        assert.match(await figures.innerText(), /Grain needed/);
        assert.ok(await panel.locator('.farm-panel-body').evaluate(body => body.scrollWidth <= body.clientWidth));
        if (id === '4') await farm.click('Cancel');
      }
      await farm.confirm('buy-kit', 0);
      assert.equal(await farm.value('cash'), '$250');
      await resume(farm);
      assert.equal(await farm.value('cash'), '$250');
      await farm.click('Farm map');
      assert.equal(await farm.game.locator('[data-map-plot="4"]').getAttribute('data-stage'), 'available');
      assert.equal(await farm.game.locator('[data-map-plot="5"]').getAttribute('data-stage'), 'wooded');
      await farm.click('Pasture');
      await farm.action('clear-plot', '5');
      await farm.action('build-pen', '5');
      await farm.go('supply');
      await farm.stock('5', 1);
      await resume(farm);
      assert.equal(await farm.value('cash'), '$150');
      await farm.click('Farm map');
      assert.equal(await farm.game.locator('[data-map-plot="5"]').getAttribute('data-stage'), 'fenced');
      assert.equal(await farm.game.locator('[data-map-plot="5"]').getAttribute('data-pigs'), '1');
      await farm.click('Pasture');
      await farm.click('Pen 5');
      assert.match(await farm.game.locator('.farm-scene').innerText(), /1 starter pig/);
      await farm.go('office');
      await farm.click('Farm book');
      assert.match(await panel.locator('#farm-book-page-pens').innerText(), /Pen 5\s+1\/4 pigs/);
      await farm.click('Close');
      await farm.click('Debbie’s books');
      const row = farm.game.getByRole('row', { name: /Land and pen kit for Plot 5/ });
      await row.waitFor();
      assert.match(await row.innerText(), /-\$220\s+\$250/);
      assert.equal(await farm.value('cash'), '$150');

      if (width === 320) {
        await farm.click('Close');
        await farm.feed({ order: false });
        await farm.sell('market', 'litter', 1);
        await farm.closeWeek();
        await farm.pick('grain-order');
        await farm.confirm('order-grain');
        await farm.click('Farm book');
        await farm.click('Feed');
        const feed = panel.locator('#farm-book-page-feed');
        assert.match(await feed.innerText(), /Short by 1 unit/);
        assert.match(await feed.innerText(), /4 units incoming/);
        await farm.page.clock.runFor(1400);
        assert.match(await feed.innerText(), /4 units in the bin/);
        assert.doesNotMatch(await feed.innerText(), /Short by/);
      }
    });
  }
}
