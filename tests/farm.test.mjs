import assert from 'node:assert/strict';
import test from 'node:test';

async function loadGame(file) {
  const module = await import(`../game/${file}.mjs`).catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url?.endsWith(`/game/${file}.mjs`)) return null;
    throw error;
  });
  assert.ok(module, `The game needs a ${file} module`);
  return module;
}

test('the season opens with both orders, four young pigs and a productive paddock', async () => {
  const { createFarm, farmView } = await loadGame('farm');
  const farm = createFarm();
  const view = farmView(farm);
  assert.deepEqual([view.week, farm.cash, view.herd, farm.feed, view.feeders, view.whole], [1, 1000, 4, 1, 0, 0]);
  assert.deepEqual(farm.orders.map(order => order.status), ['open', 'open']);
  assert.equal(farm.paddocks[0].status, 'active');
  assert.equal(farm.paddocks[0].productiveWeeks, 3);
});

test('the first fed week costs $80 and the second makes four pigs feeder-eligible', async () => {
  const { createFarm, tickFarm, farmView } = await loadGame('farm');
  const initial = createFarm();
  const weekOne = tickFarm(initial);
  assert.equal(initial.cash, 1000);
  assert.deepEqual([weekOne.cash, weekOne.feed, weekOne.cohorts[0].fedWeeks, weekOne.paddocks[0].productiveWeeks], [920, 1, 1, 2]);
  assert.deepEqual(weekOne.ledger.at(-1), { week: 1, label: 'Weekly overhead', amount: -80, balance: 920 });
  const weekTwo = tickFarm(weekOne);
  assert.equal(weekTwo.cash, 840);
  assert.equal(farmView(weekTwo).feeders, 4);
});

test('the farm never resolves a seventh week', async () => {
  const { createFarm, tickFarm, farmView } = await loadGame('farm');
  let farm = createFarm();
  for (let i = 0; i < 6; i++) farm = tickFarm(farm);
  assert.equal(farm.completedWeeks, 6);
  assert.equal(farmView(farm).week, 6);
  assert.ok(farm.result);
  assert.equal(tickFarm(farm), farm);
});
