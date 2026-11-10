import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const saveKey = 'jdhogfarm.season';
// Captured with the released 8fce539 reducer and save writer after real farm actions.
const [midseason, firstWin, firstLoss] = JSON.parse(readFileSync(new URL('./fixtures/farm-season-v1.json', import.meta.url)));

const saved = farm => farm.page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
const button = (farm, name) => farm.game.getByRole('button', { name, exact: true });
const heading = (farm, name) => farm.game.getByRole('heading', { name, exact: true });

async function resume(farm, snapshot) {
  if (snapshot) {
    await farm.page.evaluate(({ key, snapshot }) => {
      localStorage.setItem(key, JSON.stringify(snapshot));
    }, { key: saveKey, snapshot });
  }
  await farm.page.reload({ waitUntil: 'domcontentloaded' });
  await farm.page.getByRole('button', { name: 'Continue season', exact: true }).click();
}

export function registerGrowthBrowserTests(farmDriver) {
  async function openFarm(t, options) {
    const farm = await farmDriver(t, 'pointer', options);
    // Reloading the homepage should not count the site's fonts as game assets.
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    return farm;
  }

  test('a released V1 saved season resumes midseason with its herd, pasture, bill and journal', async t => {
    const farm = await openFarm(t);
    await resume(farm, midseason);
    await heading(farm, 'Barn').waitFor();
    assert.equal(await farm.value('week'), 'Week 2 of 6');
    assert.equal(await farm.value('cash'), '$620');
    assert.equal(await farm.value('herd'), '5');
    assert.equal(await farm.value('grain'), '1');
    await farm.click('Help journal');
    await button(farm, 'Week 1 · The first morning').waitFor();
    await farm.click('Close');
    await farm.go('office');
    const migrated = await saved(farm);
    assert.equal(migrated.version, 2);
    assert.deepEqual(migrated.state.paddocks, midseason.state.paddocks);
    assert.deepEqual(migrated.state.ledger, midseason.state.ledger);
    assert.deepEqual(migrated.state.history, midseason.state.history);
  });

  test('a released Week 6 loss keeps its recap and can Replay', async t => {
    const farm = await openFarm(t);
    await resume(farm, firstLoss);
    await heading(farm, 'Season recap').waitFor();
    assert.match(await farm.game.innerText(), /The season fell short/);
    assert.equal(await button(farm, 'Continue farm').count(), 0);
    await farm.click('Replay season');
    assert.equal(await farm.value('week'), 'Week 1 of 6');
    assert.equal(await farm.value('cash'), '$1,000');
    assert.equal((await saved(farm)).state.firstMilestone, null);
  });

  test('a released Week 6 win continues once into a saved Week 7 and closes at Week 12', async t => {
    const farm = await openFarm(t, { reducedMotion: 'reduce', viewport: { width: 320, height: 568 } });
    await resume(farm, firstWin);
    await heading(farm, 'Season recap').waitFor();
    assert.match(await farm.game.innerText(), /made both sales/);

    await farm.click('Continue farm');
    assert.equal(await farm.value('week'), 'Week 7 of 12');
    await heading(farm, 'Barn').waitFor();
    const continued = await saved(farm);
    assert.equal(continued.version, 2);
    for (const key of ['cash', 'grain', 'plots', 'paddocks', 'litter', 'sales', 'ledger', 'history']) {
      assert.deepEqual(continued.state[key], firstWin.state[key], key);
    }
    assert.equal(continued.state.firstMilestone.result, 'won');
    assert.equal(await button(farm, 'Continue farm').count(), 0);

    await resume(farm);
    assert.equal(await farm.value('week'), 'Week 7 of 12');
    await heading(farm, 'Barn').waitFor();
    await farm.click('Help journal');
    assert.match(await farm.game.locator('#farm-panel').innerText(), /Week 12/);
    assert.doesNotMatch(await farm.game.locator('#farm-panel').innerText(), /Week 7 · Unread/);
    await farm.click('Close');
    assert.equal(await button(farm, 'Talk to Joe').count(), 0);

    await farm.feed({ order: false });
    await farm.sell('market', 'litter', 2);
    await farm.sell('market', '1', 1);
    await farm.go('supply');
    await farm.stock('1', 2);
    await farm.go('office');
    assert.match(await farm.game.locator('.farm-scene').innerText(), /Next morning/);
    await farm.action('end-week');

    for (let week = 8; week <= 12; week += 1) {
      assert.equal(await farm.value('week'), `Week ${week} of 12`);
      if (week === 9 || week === 12) {
        await farm.go('pasture');
        await farm.pick('pasture-gate');
        await farm.action('rotate', week === 9 ? 'B' : 'A');
      }
      await farm.go('barn');
      await farm.action('settle-feed');
      if (week === 8) await farm.sell('feeder', '1', 1);
      if (week === 12) {
        assert.doesNotMatch(await farm.game.locator('.farm-scene').innerText(), /Next morning/);
        await farm.sell('market', '1', 1);
      }
      await farm.closeWeek();
    }

    const recap = farm.game.getByRole('dialog', { name: 'Growth chapter recap', exact: true });
    await recap.waitFor();
    assert.equal(await farm.value('cash'), '$1,790');
    assert.match(await recap.innerText(), /\$470/);
    assert.match(await recap.innerText(), /Sales: \$2,000/);
    assert.match(await recap.innerText(), /Purchases: \$200/);
    assert.match(await recap.innerText(), /Weekly bills: \$480/);
    assert.equal(await button(farm, 'Continue farm').count(), 0);
    assert.equal(await recap.locator('.farm-panel-body').evaluate(body => body.scrollWidth <= body.clientWidth), true);

    await resume(farm);
    await recap.waitFor();
    const complete = await saved(farm);
    assert.equal(complete.state.history.length, 12);
    assert.deepEqual(complete.state.ledger.filter(entry => entry.type === 'overhead').map(entry => entry.week),
      Array.from({ length: 12 }, (_, index) => index + 1));
    assert.deepEqual(complete.state.firstMilestone, continued.state.firstMilestone);
    await farm.click('Closing ledger');
    assert.equal(await farm.game.getByRole('rowheader', { name: 'Weekly bill', exact: true }).count(), 12);
    await farm.click('Replay season');
    assert.equal(await farm.value('week'), 'Week 1 of 6');
  });
}
