import assert from 'node:assert/strict';
import { test } from 'node:test';

const saveKey = 'jdhogfarm.season';
const heading = (farm, name) => farm.game.getByRole('heading', { name, exact: true });

async function startHerd(farm, quantity = 2) {
  await farm.build();
  await farm.go('supply');
  await farm.stock('1', quantity);
}

async function continueSeason(farm) {
  await farm.page.reload({ waitUntil: 'domcontentloaded' });
  await farm.page.getByRole('button', { name: 'Continue season', exact: true }).click({ timeout: 2500 });
}

export function registerSaveBrowserTests(farmDriver) {
  async function openFarm(t, input, options) {
    const farm = await farmDriver(t, input, options);
    // The homepage's unrelated Google Fonts stylesheet loads again on every navigation.
    await farm.page.route('https://fonts.googleapis.com/**', route => route.abort());
    return farm;
  }

  test('saved season can continue on the homepage after exiting without a reload', async t => {
    const farm = await openFarm(t, 'keyboard');
    const originalLauncher = await farm.page.locator('.farm-launch button').elementHandle();
    await startHerd(farm);
    await farm.click('Exit game');

    const launcher = farm.page.getByRole('button', { name: 'Continue season', exact: true });
    assert.equal(await launcher.evaluate((node, original) => node === original && node === document.activeElement,
      originalLauncher, { timeout: 2500 }), true);
    await launcher.press('Enter');
    assert.equal(await farm.value('cash'), '$800');
    assert.equal(await farm.value('herd'), '5');
  });

  test('saved season resumes a paid truck load during unloading and credits it once', async t => {
    const farm = await openFarm(t, 'pointer');
    await startHerd(farm);
    await farm.go('barn');
    await farm.pick('grain-order');
    await farm.action('order-grain');
    await farm.page.clock.runFor(450);
    assert.match(await farm.game.innerText(), /truck is unloading/i);

    await continueSeason(farm);
    await heading(farm, 'Barn').waitFor();
    assert.equal(await farm.value('cash'), '$700');
    assert.equal(await farm.value('herd'), '5');
    assert.equal(await farm.value('grain'), '0');
    await farm.page.clock.runFor(2500);
    assert.equal(await farm.value('grain'), '4');
    assert.equal(await farm.value('cash'), '$700');

    await continueSeason(farm);
    await farm.page.clock.runFor(2500);
    assert.equal(await farm.value('grain'), '4');
    assert.equal(await farm.value('cash'), '$700');
    await farm.go('office');
    await farm.pick('ledger');
    assert.equal(await farm.game.getByRole('rowheader', { name: /Grain delivery/ }).count(), 1);
  });

  test('saved season restarts a reserved bucket at the entrance and settles it once', async t => {
    const farm = await openFarm(t, 'pointer', { reducedMotion: 'reduce' });
    await startHerd(farm);
    await farm.go('barn');
    await farm.buyGrain();
    await farm.local('start-route');
    await farm.local('walk-route');
    await farm.page.clock.runFor(1000);
    const progress = farm.game.getByRole('progressbar', { name: 'Route progress' });
    assert.ok(Number(await progress.getAttribute('value')) > 0);

    await continueSeason(farm);
    await heading(farm, 'Feed run').waitFor();
    const start = farm.game.getByRole('button', { name: 'Start walking' });
    assert.equal(await start.evaluate(node => node === document.activeElement), true);
    await farm.page.clock.runFor(3000);
    assert.equal(await progress.getAttribute('value'), '0');
    assert.equal(await farm.value('grain'), '4');

    await farm.local('assist-route');
    await farm.page.clock.runFor(2500);
    await heading(farm, 'Piglet pen').waitFor();
    assert.match(await farm.game.innerText(), /bucket reached the pen with 3 units/i);
    await farm.action('settle-feed');
    assert.equal(await farm.value('grain'), '1');
    assert.match(await farm.game.innerText(), /Piglets.+grew to 1 fed week/i);

    await continueSeason(farm);
    await heading(farm, 'Piglet pen').waitFor();
    assert.equal(await farm.value('grain'), '1');
    assert.match(await farm.game.innerText(), /Piglets.+grew to 1 fed week/i);
    assert.equal(await farm.game.getByRole('button', { name: 'Pour feed' }).count(), 0);
  });

  test('saved season keeps one weekly bill and the conversations already read', async t => {
    const farm = await openFarm(t, 'keyboard');
    await startHerd(farm);
    await farm.click('Talk to Joe');
    await farm.click('Close');
    await farm.feed();
    await farm.closeWeek();

    await continueSeason(farm);
    await heading(farm, 'Barn').waitFor();
    assert.equal(await farm.value('week'), 'Week 2 of 6');
    assert.equal(await farm.value('cash'), '$620');
    assert.equal(await farm.value('herd'), '5');
    assert.equal(await farm.value('grain'), '1');
    await farm.click('Help journal');
    await farm.game.getByRole('button', { name: 'Week 1 · The first morning' }).waitFor();
    assert.match(await farm.game.locator('#farm-panel').innerText(), /Week 2 · Unread/);
  });

  test('saved season reopens the finished recap and replaces it on Replay', async t => {
    const farm = await openFarm(t, 'pointer', { reducedMotion: 'reduce' });
    await startHerd(farm, 1);
    await farm.feed();
    await farm.sell('feeder', '1', 1);
    await farm.closeWeek();
    await farm.feed();
    await farm.sell('feeder', 'litter', 3);
    for (let week = 2; week <= 6; week += 1) await farm.closeWeek();

    await continueSeason(farm);
    await heading(farm, 'Season recap').waitFor();
    const recap = farm.game.getByRole('dialog', { name: 'Season recap' });
    assert.match(await recap.innerText(), /No market hog sale/);
    assert.match(await recap.innerText(), /\$1,020 after the last bill/);
    assert.equal(await farm.value('week'), 'Week 6 of 6');

    await farm.action('replay');
    await continueSeason(farm);
    await heading(farm, 'Pasture').waitFor();
    assert.equal(await farm.value('week'), 'Week 1 of 6');
    assert.equal(await farm.value('cash'), '$1,000');
    assert.equal(await farm.value('grain'), '0');
    assert.equal(await farm.value('herd'), '0');
    assert.equal(await recap.count(), 0);
  });

  for (const failure of ['broken JSON', 'unknown version', 'unsafe ledger label', 'locked first plot']) {
    test(`saved season recovers from ${failure}`, async t => {
      const farm = await openFarm(t, 'pointer');
      await farm.page.evaluate(({ failure, saveKey }) => {
        if (failure === 'broken JSON') {
          localStorage.setItem(saveKey, '{broken');
          return;
        }
        const save = JSON.parse(localStorage.getItem(saveKey));
        if (failure === 'unknown version') save.version = 999;
        else if (failure === 'unsafe ledger label') save.state.ledger[0].label = '<button>Forged entry</button>';
        else save.state.plots[0].status = 'locked';
        localStorage.setItem(saveKey, JSON.stringify(save));
      }, { failure, saveKey });

      await farm.page.reload({ waitUntil: 'domcontentloaded' });
      await farm.page.getByText(/saved season couldn’t be opened/i).filter({ visible: true }).waitFor({ timeout: 2500 });
      await farm.page.getByRole('button', { name: 'Open game', exact: true }).click();
      await farm.click('Skip intro');
      await farm.build();
      await continueSeason(farm);
      await farm.game.getByRole('button', { name: 'Go to Farm Supply' }).waitFor();
      assert.equal(await farm.value('cash'), '$1,000');
    });
  }

  test('saved season keeps the last checkpoint when a new write fails', async t => {
    const farm = await openFarm(t, 'pointer');
    await startHerd(farm);
    await farm.go('barn');
    await farm.page.evaluate(key => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('Storage full for this test', 'QuotaExceededError');
        return setItem.call(this, name, value);
      };
    }, saveKey);

    await farm.pick('grain-order');
    await farm.action('order-grain');
    await farm.page.clock.runFor(1500);
    assert.equal(await farm.value('cash'), '$700');
    assert.equal(await farm.value('grain'), '4');
    await farm.game.getByText(/latest progress wasn’t saved/i).waitFor();

    await continueSeason(farm);
    await heading(farm, 'Barn').waitFor();
    assert.equal(await farm.value('cash'), '$800');
    assert.equal(await farm.value('grain'), '0');
  });

  test('saved season warns before a stale tab can replace newer progress', async t => {
    const farm = await openFarm(t, 'pointer');
    const secondTab = await farm.page.context().newPage();
    const origin = new URL(farm.page.url()).origin;
    await secondTab.route('**/*', route =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await secondTab.goto(farm.page.url(), { waitUntil: 'domcontentloaded' });
    await secondTab.getByRole('button', { name: 'Continue season', exact: true }).click();
    await startHerd(farm);

    await secondTab.getByRole('button', { name: 'Wooded plot', exact: true }).click();
    await secondTab.getByRole('dialog', { name: 'Hog Farm Game' })
      .getByText(/another tab changed the saved season/i).waitFor();
    await secondTab.getByRole('button', { name: 'Clear trees', exact: true }).click();
    await secondTab.getByRole('button', { name: 'Build first pen', exact: true }).waitFor();
    await secondTab.close();

    await continueSeason(farm);
    assert.equal(await farm.value('cash'), '$800');
    assert.equal(await farm.value('herd'), '5');
  });

  test('saved season reports unavailable storage and still lets the player raise hogs', async t => {
    const farm = await openFarm(t, 'pointer');
    await farm.page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('Storage blocked for this test', 'SecurityError'); }
      });
    });

    await farm.page.reload({ waitUntil: 'domcontentloaded' });
    await farm.page.getByText(/couldn’t read a saved season/i).filter({ visible: true }).waitFor({ timeout: 2500 });
    await farm.page.getByRole('button', { name: 'Open game', exact: true }).click();
    await farm.click('Skip intro');
    await startHerd(farm);
    await farm.game.getByText(/latest progress wasn’t saved/i).waitFor();
    assert.equal(await farm.value('herd'), '5');
    assert.equal(await farm.value('cash'), '$800');
  });
}
