import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChores } from '../game/chores.mjs';
import { routeClock } from './farm-route-fixture.mjs';
import { applyFarmAction, createFarm, expansionPreview, feedForecast, feedRoutePlan, saleGroups } from '../game/morning.mjs';

function act(state, type, fields) {
  const result = applyFarmAction(state, { type, week: state.week, ...fields });
  assert.equal(result.error, null, result.error);
  return result.state;
}

function reject(state, type, fields, error) {
  const response = applyFarmAction(state, { type, ...fields });
  assert.match(response.error, error);
  assert.equal(response.state, state);
}

function feed(state) {
  if (!feedRoutePlan(state).length) return act(state, 'settle-feed', { source: 'barn' });
  state = act(state, 'reserve-litter');
  const clock = routeClock();
  const chores = createChores(clock);
  chores.sync({ week: state.week, hasBucket: true, active: true });
  chores.routeAction('prepare-route', state.bucket.plan);
  chores.routeAction('assist-route');
  clock.advance(4400);
  return act(state, 'settle-feed', { source: 'bucket', route: chores.milestone });
}

function addGrain(state) {
  const ordered = act(state, 'order-grain');
  return act(ordered, 'deliver-grain', { id: ordered.shipment.id });
}

function firstRecap(throughWeek = 6) {
  let state = act(createFarm(), 'clear-plot', { id: '1' });
  state = act(state, 'build-pen', { id: '1' });
  state = act(state, 'buy-starters', { id: '1', quantity: 2 });
  for (let week = 1; week <= throughWeek; week += 1) {
    if (week === 4 || week === 6) state = act(state, 'rotate', { id: week === 4 ? 'B' : 'A' });
    if (week !== 4) state = addGrain(state);
    state = feed(state);
    if (week === 1) state = act(state, 'sell-feeder', { id: '1', expectedPigs: 2, quantity: 1 });
    if (week === 6) state = act(state, 'sell-market', { id: 'litter', expectedPigs: 3, quantity: 1 });
    state = act(state, 'end-week');
  }
  return state;
}

function newChapter() {
  return act(firstRecap(), 'continue-farm');
}

test('keep-or-buy-farther-land uses farm earnings to raise market hogs by Week 12', () => {
  let opening = newChapter();
  opening = feed(opening);
  opening = act(opening, 'sell-market', { id: 'litter', expectedPigs: 2, quantity: 2 });
  assert.equal(opening.cash, 1370);
  assert.equal(feedForecast(opening, { next: true }).demand, 1);

  for (const id of ['4', '5']) {
    const { landCost, kitCost, hogCost, cashLeft, capacityGained, demandBefore, demandAfter, forageAfter, grainNeeded, shortfall, error } =
      expansionPreview(opening, id, 4);
    assert.deepEqual({ landCost, kitCost, hogCost, cashLeft, capacityGained, demandBefore, demandAfter, forageAfter, grainNeeded, shortfall, error }, {
      landCost: 100, kitCost: 120, hogCost: 400, cashLeft: 750, capacityGained: 4,
      demandBefore: 1, demandAfter: 5, forageAfter: 4, grainNeeded: 1, shortfall: 1, error: null
    });
  }

  function play(expand) {
    let state = opening;
    if (expand) {
      state = act(state, 'buy-kit', { id: '4', quantity: 4 });
      assert.equal(state.cash, 1150, 'Only land and setup are paid now');
      assert.equal(state.ledger.at(-1).balance, 1150);
      state = act(state, 'clear-plot', { id: '4' });
      state = act(state, 'build-pen', { id: '4' });
      state = act(state, 'buy-starters', { id: '4', quantity: 4 });
      assert.equal(state.cash, 750);
    }

    state = act(state, 'end-week');
    assert.equal(state.cash, expand ? 670 : 1290);
    for (let week = 8; week <= 12; week += 1) {
      if (week === 9 || week === 12) state = act(state, 'rotate', { id: week === 9 ? 'B' : 'A' });
      if (expand && (week === 8 || week === 12)) {
        const ordered = act(state, 'order-grain');
        const before = feedForecast(ordered);
        assert.equal(before.shortfall, 1);
        state = act(ordered, 'deliver-grain', { id: ordered.shipment.id });
        const after = feedForecast(state);
        assert.equal(after.shortfall, 0);
        assert.equal(after.groups.find(group => group.id === '4').grain, 1);
      }
      state = feed(state);
      if (week === 12) {
        const ready = saleGroups(state, 'market');
        assert.equal(ready.find(group => group.id === '4')?.pigs, expand ? 4 : undefined);
        state = act(state, 'sell-market', { id: '1', expectedPigs: 1, quantity: 1 });
        if (expand) state = act(state, 'sell-market', { id: '4', expectedPigs: 4, quantity: 4 });
      }
      state = act(state, 'end-week');
    }
    return state;
  }

  const kept = play(false);
  const expanded = play(true);
  assert.equal(kept.result, 'won');
  assert.equal(expanded.result, 'won');
  assert.equal(kept.cash, 1340);
  assert.equal(expanded.cash, 2320);
  assert.equal(expanded.ledger.at(-1).balance, expanded.cash);
  assert.deepEqual(expanded.history[11].feeding.groups.find(group => group.id === '4'), {
    id: '4', pigs: 4, fedWeeks: 5, forage: 3, grain: 1, missing: 0, grew: true, fedWeeksAfter: 6
  });
});

test('farther plot purchases are guarded before growth, when short of cash, and after purchase', () => {
  const beforeGrowth = firstRecap(5);
  assert.equal(beforeGrowth.plots.length, 3);
  const state = newChapter();
  const poor = addGrain(addGrain(addGrain(state)));
  assert.equal(poor.cash, 170);
  for (const id of ['4', '5']) {
    reject(beforeGrowth, 'buy-kit', { id }, /growth chapter/);
    reject(poor, 'buy-kit', { id }, /\$220/);
    const purchased = act(state, 'buy-kit', { id });
    assert.equal(purchased.plots.find(plot => plot.id === id)?.status, 'wooded');
    assert.equal(purchased.ledger.at(-1).amount, -220);
    reject(purchased, 'buy-kit', { id }, /already has/);
  }
});
