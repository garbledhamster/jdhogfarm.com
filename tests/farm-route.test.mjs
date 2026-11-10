import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as model from '../game/morning.mjs';
import { createChores } from '../game/chores.mjs';
import { act, loadSnapshot, routeClock, routeFarm, sell, snapshot } from './farm-route-fixture.mjs';

const ids = plan => plan.map(stop => stop.id);
function setup(state, options = {}) {
  const clock = routeClock(options);
  const chores = createChores(clock);
  chores.sync({ week: state.week, hasBucket: true, active: true });
  chores.routeAction('prepare-route', state.bucket.plan);
  return { chores, clock };
}

test('multi-stop-feeding reserves actual grain stops and settles five once before one next bill', () => {
  for (const [kind, expected] of [['small', ['litter']], ['empty', ['litter']], ['covered', ['litter']],
    ['expanded', ['litter', '4', '5']], ['growers', ['gate', '4', '5']]]) {
    let state = routeFarm(kind);
    assert.equal(typeof model.feedRoutePlan, 'function');
    assert.deepEqual(ids(model.feedRoutePlan(state)), expected, kind);
    const before = state.grain;
    state = act(state, 'reserve-litter');
    assert.equal(state.grain, before);
    assert.deepEqual(ids(state.bucket.plan), expected);
    const arrivals = [];
    const { chores, clock } = setup(state, { onArrive: () => arrivals.push(1) });
    chores.routeAction('walk-route');
    chores.routeAction('route-lane', 0);
    clock.advance(5640);
    assert.equal(state.grain, before);
    assert.equal(chores.route.completedStops, 1);
    if (expected.length > 1) {
      assert.equal(chores.route.status, 'walking');
      assert.match(model.applyFarmAction(state, { type: 'settle-feed', source: 'bucket', route: chores.milestone }).error, /route|stop/i);
      clock.advance(4000);
    }
    assert.equal(chores.route.status, 'arrived');
    assert.equal(arrivals.length, 1);
    state = act(state, 'settle-feed', { source: 'bucket', route: chores.milestone, allowShortfall: kind === 'small' });
    assert.ok(model.applyFarmAction(state, { type: 'settle-feed', source: 'bucket', route: chores.milestone }).error);
    if (kind === 'expanded') {
      assert.equal(state.cash, 430);
      assert.equal(state.grain, 1);
      assert.equal(state.feeding.grainUsed, 5);
      state = act(state, 'end-week');
      assert.equal(state.cash, 350);
      assert.equal(state.ledger.filter(entry => entry.week === 7 && entry.type === 'overhead').length, 1);
    }
  }
});

test('farther route freezes the plan through changed allocations and requires explicit refill', () => {
  let state = act(routeFarm('covered'), 'reserve-litter');
  const original = structuredClone(state.bucket);
  // Buy four more pigs in the near pen, shifting forage off both farther pens.
  state = act(state, 'buy-starters', { id: '1', quantity: 4 });
  assert.deepEqual(state.bucket, original);
  assert.match(model.applyFarmAction(state, { type: 'settle-feed', source: 'bucket', route: { completedStops: 1 } }).error, /refill|replan/i);
  state = act(state, 'reserve-litter', { refill: true });
  assert.deepEqual(ids(state.bucket.plan), ['litter', '4', '5']);
  assert.equal(state.bucket.amount, 5);
});

test('farther route retries only the unfinished segment, pauses, and restores durable stops', () => {
  const state = act(routeFarm(), 'reserve-litter');
  const { chores, clock } = setup(state);
  chores.routeAction('walk-route');
  clock.advance(3000);
  assert.equal(chores.route.status, 'blocked');
  chores.routeAction('retry-route');
  chores.routeAction('route-lane', 0);
  clock.advance(5640);
  assert.equal(chores.route.completedStops, 1);
  assert.equal(chores.route.obstacles.length, 1);
  const atStop = chores.milestone;
  clock.advance(400);
  chores.sync({ week: 7, hasBucket: true, active: false });
  const paused = chores.route;
  clock.advance(10000);
  assert.deepEqual(chores.route, paused);
  const saved = loadSnapshot(snapshot(state, { routeProgress: atStop }));
  assert.ok(saved);
  const restored = setup(saved.state);
  restored.chores.routeAction('restore-route', saved.routeProgress);
  assert.equal(restored.chores.route.completedStops, 1);
  assert.equal(restored.chores.route.progress, 0);
  restored.chores.routeAction('assist-route');
  restored.clock.advance(4000);
  assert.equal(restored.chores.route.status, 'arrived');
  const arrival = loadSnapshot(snapshot(state, { bucketArrived: true, routeProgress: restored.chores.milestone }));
  assert.ok(arrival);
  const again = setup(arrival.state);
  again.chores.routeAction('restore-route', arrival.routeProgress);
  assert.equal(again.chores.route.status, 'arrived');
  assert.equal(again.chores.route.progress, 1);
});

test('farther route keeps a frozen plan after a sale or rotation and rejects an old arrival after delivery', () => {
  let state = routeFarm();
  state = act(state, 'reserve-litter');
  const plan = structuredClone(state.bucket.plan);
  const { chores, clock } = setup(state);
  chores.routeAction('assist-route');
  clock.advance(4400);
  state = sell(state, 'litter', 1);
  assert.deepEqual(state.bucket.plan, plan);
  state = act(state, 'rotate', { id: 'A' });
  assert.deepEqual(state.bucket.plan, plan);
  const fed = act(state, 'settle-feed', { source: 'bucket', route: chores.milestone });
  assert.equal(fed.feeding.grainUsed, 0);
  assert.equal(fed.grain, 6);

  // Depart short with just Piglets and part of Pen 4 allocated, then unload a truck.
  let short = routeFarm();
  // A second pair near home takes grain before the farther groups.
  short = act(short, 'buy-starters', { id: '1', quantity: 2 });
  short = act(short, 'reserve-litter');
  assert.deepEqual(short.bucket.plan, [{ id: 'litter', grain: 1 }, { id: '4', grain: 2 }, { id: '5', grain: 1 }]);
  const old = setup(short);
  old.chores.routeAction('assist-route');
  old.clock.advance(4400);
  short = act(short, 'order-grain');
  short = act(short, 'deliver-grain', { id: short.shipment.id });
  assert.match(model.applyFarmAction(short, { type: 'settle-feed', source: 'bucket', route: old.chores.milestone }).error, /refill/i);
  short = act(short, 'reserve-litter', { refill: true });
  assert.match(model.applyFarmAction(short, { type: 'settle-feed', source: 'bucket', route: old.chores.milestone }).error, /stop|route/i);
});

test('farther route save rejects malformed plans and milestones while old bucket saves still load', () => {
  const state = act(routeFarm(), 'reserve-litter');
  const progress = { plan: state.bucket.plan, completedStops: 1 };
  for (const change of [
    saved => { delete saved.routeProgress; },
    saved => { saved.routeProgress.completedStops = 4; },
    saved => { saved.routeProgress.completedStops = 1.5; },
    saved => { saved.bucketArrived = true; },
    saved => { saved.routeProgress.plan = [{ id: 'litter', grain: 1 }]; },
    saved => { saved.state.bucket.plan[1].id = '3'; },
    saved => { saved.state.bucket.plan.reverse(); },
    saved => { saved.state.bucket.plan[2].id = '4'; },
    saved => { saved.state.bucket.amount = 1; },
    saved => { saved.state.bucket.plan[1].grain = 0; }
  ]) {
    const saved = structuredClone(snapshot(state, { routeProgress: progress }));
    change(saved);
    assert.equal(loadSnapshot(saved), null);
  }
  const old = act(routeFarm('small'), 'reserve-litter');
  delete old.bucket.plan;
  assert.ok(loadSnapshot(snapshot(old)));
  assert.ok(loadSnapshot(snapshot(old, { bucketArrived: true })));
});

test('farther route caps manual time at 9640 ms and adds one readable hazard per segment', () => {
  for (const [week, expected] of [[1, ['rock']], [2, ['rock', 'snake']], [7, ['rock', 'snake', 'moving-snake']], [12, ['rock', 'snake', 'moving-snake']]]) {
    const state = act(routeFarm(), 'reserve-litter');
    const clock = routeClock();
    const chores = createChores(clock);
    chores.sync({ week, active: true, hasBucket: true });
    chores.routeAction('prepare-route', state.bucket.plan);
    assert.deepEqual(chores.route.obstacles.map(obstacle => obstacle.id), expected);
    chores.routeAction('walk-route');
    chores.routeAction('route-lane', 0);
    clock.advance(5640);
    assert.equal(chores.route.obstacles.length, 1);
    assert.equal(chores.route.obstacles[0].id, week >= 9 ? 'snake' : 'rock');
    clock.advance(3999);
    assert.equal(chores.route.status, 'walking');
    clock.advance(1);
    assert.equal(chores.route.status, 'arrived');
  }
});
