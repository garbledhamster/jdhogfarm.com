import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChores } from '../game/chores.mjs';
import { applyFarmAction, createFarm } from '../game/morning.mjs';

function act(state, type, fields) {
  const result = applyFarmAction(state, { type, ...fields });
  assert.equal(result.error, null, result.error);
  return result.state;
}

function reject(state, type, fields) {
  const result = applyFarmAction(state, { type, ...fields });
  assert.ok(result.error);
  assert.equal(result.state, state);
}

function deliver(state) {
  const jobs = [];
  const chores = createChores({
    schedule: callback => jobs.push(callback),
    onDelivery: id => { state = act(state, 'deliver-grain', { id }); }
  });
  chores.sync({ week: state.week, shipment: state.shipment });
  while (jobs.length) jobs.shift()();
  return state;
}

function settle(state) {
  return act(act(state, 'reserve-litter'), 'settle-feed', { source: 'bucket' });
}

test('farm receipts track committed cash, grain and feeding outcomes without double-counting', () => {
  let state = act(createFarm(), 'clear-plot', { id: '1' });
  state = act(state, 'build-pen', { id: '1' });
  state = act(state, 'buy-starters', { id: '1', quantity: 2 });
  assert.equal(state.lastOutcome, 'cash');
  state = deliver(act(state, 'order-grain'));
  state = settle(state);
  state = act(state, 'end-week', { week: 1 });

  const sale = { id: '1', quantity: 1, week: 2, expectedPigs: 2 };
  state = act(state, 'sell-feeder', sale);
  assert.equal(state.lastOutcome, 'cash');
  assert.deepEqual(state.ledger.at(-1), {
    week: 2, type: 'feeder', label: 'Feeder pickup', amount: 200, balance: 820, id: '1', quantity: 1
  });
  reject(state, 'sell-feeder', sale);

  state = act(state, 'order-grain');
  assert.equal(state.lastOutcome, 'cash');
  assert.equal(state.grain, 1);
  assert.equal(state.cash, 720);
  reject(state, 'order-grain');
  reject(state, 'deliver-grain', { id: 1 });
  const paidLedger = state.ledger;
  state = deliver(state);
  assert.equal(state.lastOutcome, 'delivery');
  assert.equal(state.grain, 5);
  assert.equal(state.ledger, paidLedger);
  reject(state, 'deliver-grain', { id: 2 });

  state = settle(state);
  assert.equal(state.lastOutcome, 'feeding');
  assert.equal(state.feeding.grainUsed, 3);
  assert.deepEqual(state.feeding.groups.map(({ id, grew, fedWeeksAfter }) => [id, grew, fedWeeksAfter]), [
    ['litter', true, 2], ['1', true, 3]
  ]);
  assert.equal(state.grain, 2);
  assert.equal(state.ledger, paidLedger);
  reject(state, 'settle-feed', { source: 'bucket' });

  state = act(state, 'end-week', { week: 2 });
  assert.equal(state.lastOutcome, 'cash');
  assert.deepEqual(state.ledger.at(-1), {
    week: 2, type: 'overhead', label: 'Weekly bill', amount: -80, balance: 640
  });
  reject(state, 'end-week', { week: 2 });
  assert.deepEqual(state.ledger.map(entry => [entry.amount, entry.balance]), [
    [1000, 1000], [-200, 800], [-100, 700], [-80, 620], [200, 820], [-100, 720], [-80, 640]
  ]);
});

test('farm receipt save validation accepts old saves and rejects references without a committed action', async () => {
  const { openSeasonSave } = await import('../game/season-save.mjs');
  const stored = { version: 2, state: createFarm(), place: 'pasture', previousPlace: 'pasture',
    selectedPlot: null, bucketArrived: false, seenStories: [] };
  delete stored.state.lastOutcome;
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(stored) } };

  try {
    assert.equal(openSeasonSave().season.state.lastOutcome, null);
    stored.version = 1;
    delete stored.state.chapter;
    delete stored.state.firstMilestone;
    assert.equal(openSeasonSave().season.state.lastOutcome, null);
    stored.version = 2;
    stored.state.chapter = 'first';
    stored.state.firstMilestone = null;

    for (const invalid of ['cash', 'feeding', 'delivery', 'unexpected', { kind: 'cash', balance: 900 }]) {
      stored.state.lastOutcome = invalid;
      assert.equal(openSeasonSave().status, 'unreadable');
    }
  } finally {
    delete globalThis.window;
  }
});
