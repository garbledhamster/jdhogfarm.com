import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyFarmAction, createFarm } from '../game/morning.mjs';

function act(state, type, fields) {
  const result = applyFarmAction(state, { type, week: state.week, ...fields });
  assert.equal(result.error, null, result.error);
  return result.state;
}

function feed(state, { order = false, rotate } = {}) {
  if (rotate) state = act(state, 'rotate', { id: rotate });
  if (order) {
    state = act(state, 'order-grain');
    state = act(state, 'deliver-grain', { id: state.shipment.id });
  }
  if (!state.litter.pigs) return act(state, 'settle-feed', { source: 'barn' });
  state = act(state, 'reserve-litter');
  return act(state, 'settle-feed', { source: 'bucket' });
}

function firstMorning() {
  let state = act(createFarm(), 'clear-plot', { id: '1' });
  state = act(state, 'build-pen', { id: '1' });
  return act(state, 'buy-starters', { id: '1', quantity: 2 });
}

function firstRecap({ marketQuantity = 1 } = {}) {
  let state = firstMorning();
  for (let week = 1; week <= 6; week += 1) {
    state = feed(state, { order: week !== 4, rotate: { 4: 'B', 6: 'A' }[week] });
    if (week === 1) state = act(state, 'sell-feeder', { id: '1', quantity: 1, expectedPigs: 2 });
    if (week === 6 && marketQuantity) {
      state = act(state, 'sell-market', { id: 'litter', quantity: marketQuantity, expectedPigs: 3 });
    }
    state = act(state, 'end-week');
  }
  return state;
}

function rejected(state, type, fields) {
  const response = applyFarmAction(state, { type, ...fields });
  assert.ok(response.error);
  assert.equal(response.state, state);
}

test('week-6-continuation carries the same farm through Week 12 on the existing land', () => {
  const first = firstRecap();
  assert.equal(first.result, 'won');
  assert.equal(first.cash, 470);
  assert.equal(first.grain, 2);
  assert.deepEqual(first.paddocks[1], { id: 'B', status: 'resting', productiveWeeks: 0, restedWeeks: 1, lastUsedWeek: 5 });

  let state = act(first, 'continue-farm');
  assert.equal(state.week, 7);
  assert.equal(state.result, null);
  assert.equal(state.feeding, null);
  assert.equal(state.bucket, null);
  for (const key of ['cash', 'plots', 'litter', 'breeders', 'paddocks', 'grain', 'lastDelivery', 'sales', 'ledger', 'history']) {
    assert.deepEqual(state[key], first[key], key);
  }
  assert.equal(state.history.length, 6);
  assert.deepEqual(state.firstMilestone, { result: 'won', ledgerLength: first.ledger.length, sales: first.sales });
  rejected(state, 'continue-farm');
  rejected(state, 'end-week', { week: 6 });

  for (let week = 7; week <= 12; week += 1) {
    state = feed(state, { rotate: { 9: 'B', 12: 'A' }[week] });
    if (week === 7) {
      state = act(state, 'sell-market', { id: 'litter', quantity: 2, expectedPigs: 2 });
      state = act(state, 'sell-market', { id: '1', quantity: 1, expectedPigs: 1 });
      state = act(state, 'buy-starters', { id: '1', quantity: 2 });
    }
    if (week === 8) state = act(state, 'sell-feeder', { id: '1', quantity: 1, expectedPigs: 2 });
    if (week === 12) state = act(state, 'sell-market', { id: '1', quantity: 1, expectedPigs: 1 });
    state = act(state, 'end-week');
  }

  assert.equal(state.week, 12);
  assert.equal(state.result, 'won');
  assert.equal(state.cash, 1790);
  assert.equal(state.plots.filter(plot => plot.status === 'fenced').length, 1);
  assert.deepEqual(state.history.slice(0, 6), first.history);
  assert.deepEqual(state.firstMilestone, { result: 'won', ledgerLength: first.ledger.length, sales: first.sales });
  assert.deepEqual(state.ledger.filter(entry => entry.type === 'overhead').map(({ week, amount }) => [week, amount]),
    Array.from({ length: 12 }, (_, index) => [index + 1, -80]));
  rejected(state, 'continue-farm');
  rejected(state, 'end-week', { week: 12 });
});

test('Continue farm requires the first win', () => {
  rejected(firstMorning(), 'continue-farm');
  const first = firstRecap({ marketQuantity: 0 });
  assert.equal(first.result, 'lost');
  rejected(first, 'continue-farm');
});

for (const [marketQuantity, cash, outcome] of [[1, -10, 'lost'], [2, 440, 'won']]) {
  test(`Week 12 records a ${outcome} at ${cash} closing cash with no new sales`, () => {
    const first = firstRecap({ marketQuantity });
    let state = act(first, 'continue-farm');
    // A player can leave the herd short and still close each week after settling what is available.
    for (let week = 7; week <= 12; week += 1) {
      state = act(state, 'reserve-litter');
      state = act(state, 'settle-feed', { source: 'bucket', allowShortfall: true });
      state = act(state, 'end-week');
    }
    assert.equal(state.week, 12);
    assert.equal(state.cash, cash);
    assert.equal(state.result, outcome);
    assert.deepEqual(state.sales, first.sales);
    assert.equal(state.firstMilestone.result, 'won');
  });
}
