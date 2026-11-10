import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChores } from '../game/chores.mjs';
import { applyFarmAction, createFarm, feedForecast } from '../game/morning.mjs';

function act(state, action) {
  const result = applyFarmAction(state, action);
  assert.equal(result.error, null, `Week ${state.week} ${action.type} failed: ${result.error}`);
  return result.state;
}

function observe(t, checkpoint, actual, expected) {
  t.diagnostic(`${checkpoint} ${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected, checkpoint);
}

function stockedFarm() {
  let state = createFarm();
  state = act(state, { type: 'clear-plot', id: '1' });
  state = act(state, { type: 'build-pen', id: '1' });
  return act(state, { type: 'buy-starters', id: '1', quantity: 2 });
}

function refillAfterTruckDelivery(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let state = act(stockedFarm(), { type: 'reserve-litter' });
  const deliveries = [];
  const chores = createChores({
    onDelivery(id) {
      deliveries.push(id);
      state = act(state, { type: 'deliver-grain', id });
      syncChores();
    }
  });

  function syncChores() {
    chores.sync({
      week: state.week,
      shipment: state.shipment,
      active: false,
      hasBucket: Boolean(state.bucket)
    });
  }

  state = act(state, { type: 'order-grain' });
  const shipmentId = state.shipment.id;
  syncChores();
  observe(t, 'Order placed', {
    stage: chores.deliveryStage, cash: state.cash, grain: state.grain, bucketGrain: state.bucket.amount
  }, { stage: 'arriving', cash: 700, grain: 0, bucketGrain: 0 });

  t.mock.timers.tick(500);
  observe(t, 'Truck unloading away from the Barn', {
    stage: chores.deliveryStage, grain: state.grain, deliveries
  }, { stage: 'unloading', grain: 0, deliveries: [] });

  t.mock.timers.tick(1500);
  observe(t, 'Delivery credited', {
    grain: state.grain, cash: state.cash, pending: state.shipment !== null,
    bucketGrain: state.bucket.amount, deliveries
  }, { grain: 4, cash: 700, pending: false, bucketGrain: 0, deliveries: [shipmentId] });

  const feed = { type: 'settle-feed', source: 'bucket' };
  const rejected = applyFarmAction(state, feed);
  assert.match(rejected.error ?? '', /refill/i);
  assert.strictEqual(rejected.state, state);

  state = act(state, { type: 'reserve-litter', refill: true });
  state = act(state, feed);
  syncChores();
  t.mock.timers.tick(2500);
  observe(t, 'After refilling and feeding', {
    grain: state.grain, cash: state.cash, litterFedWeeks: state.litter.fedWeeks,
    starterFedWeeks: state.plots[0].fedWeeks, deliveries
  }, { grain: 1, cash: 700, litterFedWeeks: 1, starterFedWeeks: 2, deliveries: [shipmentId] });
}

function sellOrKeepAFeeder(t) {
  let state = act(stockedFarm(), { type: 'order-grain' });
  state = act(state, { type: 'deliver-grain', id: state.shipment.id });
  state = act(state, { type: 'reserve-litter' });
  const fed = act(state, { type: 'settle-feed', source: 'bucket' });

  const sold = act(fed, { type: 'sell-feeder', id: '1', quantity: 1, week: 1, expectedPigs: 2 });
  const close = { type: 'end-week', week: 1 };

  function afterClosing(morning) {
    return {
      week: morning.week,
      cash: morning.cash,
      grain: morning.grain,
      starters: morning.plots[0].pigs,
      feederSales: morning.sales.feeder,
      feedDemand: feedForecast(morning).demand,
      weeklyBills: morning.ledger.filter(entry => entry.type === 'overhead').map(entry => entry.amount)
    };
  }

  observe(t, 'Keep both starters', afterClosing(act(fed, close)), {
    week: 2, cash: 620, grain: 1, starters: 2, feederSales: 0, feedDemand: 5, weeklyBills: [-80]
  });
  observe(t, 'Sell one feeder', afterClosing(act(sold, close)), {
    week: 2, cash: 820, grain: 1, starters: 1, feederSales: 1, feedDemand: 4, weeklyBills: [-80]
  });
}

const scenarios = new Map([
  ['refill-after-truck-delivery', refillAfterTruckDelivery],
  ['sell-or-keep-a-feeder', sellOrKeepAFeeder]
]);

const [name, ...extraArgs] = process.argv.slice(2);
if (name === undefined) {
  for (const [scenario, run] of scenarios) test(scenario, run);
} else if (scenarios.has(name) && extraArgs.length === 0) {
  test(name, scenarios.get(name));
} else {
  test('select a farm simulation', () => {
    assert.fail(`Unknown simulation or extra arguments. Pass one of: ${[...scenarios.keys()].join(', ')}`);
  });
}
