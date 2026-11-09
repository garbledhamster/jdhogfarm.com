import assert from 'node:assert/strict';
import test from 'node:test';
import * as choresModule from '../game/chores.mjs';

function setup() {
  assert.equal(typeof choresModule.createChores, 'function');
  let time = 0;
  const tasks = new Map();
  const deliveries = [];
  const arrivals = [];
  const chores = choresModule.createChores({
    onDelivery: id => deliveries.push(id),
    onArrive: () => arrivals.push(time),
    now: () => time,
    schedule(callback, delay) {
      const key = Symbol();
      tasks.set(key, { callback, at: time + delay });
      return key;
    },
    cancel(key) { tasks.delete(key); }
  });

  function advance(delay) {
    const end = time + delay;
    while (tasks.size) {
      const [key, task] = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (task.at > end) break;
      time = task.at;
      tasks.delete(key);
      task.callback();
    }
    time = end;
  }

  return { chores, tasks, deliveries, arrivals, advance };
}

test('a shipment unloads once while the player is away from the Barn', () => {
  const { chores, advance, deliveries } = setup();
  chores.sync({ week: 1, shipment: { id: 1 }, active: false });
  assert.equal(chores.deliveryStage, 'arriving');
  advance(500);
  assert.equal(chores.deliveryStage, 'unloading');
  chores.sync({ week: 1, shipment: { id: 1 }, active: false });
  assert.deepEqual(deliveries, []);
  advance(1500);
  assert.deepEqual(deliveries, [1]);
  chores.sync({ week: 1, shipment: { id: 1 }, active: false });
  advance(2500);
  assert.deepEqual(deliveries, [1]);
});

test('a stale delivery callback cannot unload a replay shipment with the same id', () => {
  const { chores, advance, deliveries, tasks } = setup();
  chores.sync({ week: 1, shipment: { id: 1 }, active: false });
  advance(500);
  const stale = [...tasks.values()][0].callback;
  chores.reset();
  chores.sync({ week: 1, shipment: { id: 1 }, active: false });
  stale();
  assert.deepEqual(deliveries, []);
  advance(2000);
  assert.deepEqual(deliveries, [1]);
});

test('a prepared bucket waits at the entrance until the player starts walking', () => {
  const { chores, advance, tasks } = setup();
  chores.sync({ week: 1, active: false, hasBucket: true });
  assert.equal(chores.routeAction('prepare-route'), true);
  chores.sync({ week: 1, active: true, hasBucket: true });
  advance(10000);
  assert.equal(chores.route.status, 'ready');
  assert.equal(chores.route.progress, 0);
  assert.equal(tasks.size, 0);

  assert.equal(chores.routeAction('walk-route'), true);
  assert.equal(chores.routeAction('walk-route'), false);
  advance(1000);
  assert.equal(chores.route.status, 'walking');
  assert.ok(chores.route.progress > 0);
});

test('the bucket route preserves the lane and progress while the map or another tab is open', () => {
  const { chores, advance, arrivals } = setup();
  chores.sync({ week: 1, active: true });
  chores.routeAction('prepare-route');
  chores.routeAction('walk-route');
  chores.routeAction('route-lane', 0);
  advance(1000);
  const atMap = chores.route;
  assert.equal(atMap.lane, 0);
  assert.ok(atMap.progress > 0);
  chores.sync({ week: 1, active: false });
  advance(10000);
  assert.deepEqual(chores.route, atMap);
  assert.deepEqual(arrivals, []);
  chores.sync({ week: 1, active: true });
  advance(5500);
  assert.equal(chores.route.status, 'arrived');
  assert.equal(arrivals.length, 1);
  advance(5500);
  assert.equal(arrivals.length, 1);
});

test('a collision stops route progress until Retry or Walk with Joe', () => {
  const { chores, advance, arrivals } = setup();
  chores.sync({ week: 1, active: true });
  chores.routeAction('prepare-route');
  chores.routeAction('walk-route');
  advance(3000);
  assert.equal(chores.route.status, 'blocked');
  assert.equal(chores.route.hit, 'rock');
  advance(10000);
  assert.deepEqual(arrivals, []);
  chores.routeAction('retry-route');
  assert.equal(chores.route.status, 'walking');
  assert.equal(chores.route.progress, 0);
  advance(3000);
  assert.equal(chores.route.status, 'blocked');
  chores.routeAction('assist-route');
  advance(3000);
  assert.equal(chores.route.status, 'arrived');
  assert.equal(arrivals.length, 1);
});

test('later routes add snakes and always leave a manual lane open', () => {
  const { chores, advance } = setup();
  chores.sync({ week: 2, active: true });
  chores.routeAction('prepare-route');
  chores.routeAction('walk-route');
  assert.deepEqual(chores.route.obstacles.map(obstacle => obstacle.id), ['rock', 'snake']);
  chores.routeAction('route-lane', 2);
  advance(4500);
  assert.equal(chores.route.hit, 'snake');
  chores.sync({ week: 3, active: true });
  assert.equal(chores.route, null);
  chores.routeAction('prepare-route');
  chores.routeAction('walk-route');
  assert.deepEqual(chores.route.obstacles.map(obstacle => obstacle.id), ['rock', 'snake', 'moving-snake']);
  const movingLane = chores.route.obstacles.at(-1).lane;
  chores.routeAction('route-lane', 0);
  advance(500);
  assert.notEqual(chores.route.obstacles.at(-1).lane, movingLane);
  advance(5500);
  assert.equal(chores.route.status, 'arrived');
});

test('Barn and pen art reflect credited grain, feeding, and the exact litter size', async () => {
  const { renderBarnArt, renderPigletArt } = await import('../game/chores-art.mjs');
  assert.match(renderBarnArt(0, 'unloading'), /data-delivery-stage="unloading"/u);
  assert.match(renderBarnArt(4, null), /data-bin-stocked="true"/u);
  const art = renderPigletArt({ pigs: 2, fedWeeks: 4, fed: true, bucketAtPen: false });
  assert.match(art, /data-trough-stocked="true"/u);
  assert.equal(art.match(/data-piglet-sprite/gu).length, 2);
});

test('the route illustration moves the bucket carrier up the path and over the creek', async () => {
  const { renderRouteArt } = await import('../game/chores-art.mjs');
  const route = { lane: 0, progress: 0, obstacles: [{ id: 'rock', at: 0.5, lane: 1 }] };
  const heroY = progress => {
    const art = renderRouteArt({ ...route, progress }, true);
    return Number(art.match(/data-chore-hero="" transform="translate\([\d.]+ ([\d.]+)/u)[1]);
  };
  assert.ok(heroY(0) > 400);
  assert.ok(heroY(0.95) < 250);
});

test('clearing the bucket cancels its route without cancelling a truck shipment', () => {
  const { chores, advance, arrivals, deliveries } = setup();
  chores.sync({ week: 3, active: true, hasBucket: true, shipment: { id: 9 } });
  chores.routeAction('prepare-route');
  chores.routeAction('walk-route');
  chores.routeAction('route-lane', 0);
  advance(500);
  chores.sync({ week: 3, active: false, hasBucket: false, shipment: { id: 9 } });
  assert.equal(chores.route, null);
  advance(7000);
  assert.deepEqual(arrivals, []);
  assert.deepEqual(deliveries, [9]);
});

test('the first Barn visit keeps the bucket available when a grain load is unaffordable', async () => {
  const { createFarm, applyFarmAction } = await import('../game/morning.mjs');
  const { renderChorePlace, renderChoreDecision } = await import('../game/chores-view.mjs');
  let state = createFarm();
  for (const type of ['clear-plot', 'build-pen', 'buy-starters']) {
    const result = applyFarmAction(state, { type, id: '1', quantity: 2 });
    assert.equal(result.error, null);
    state = result.state;
  }
  const lowCash = { ...state, cash: 99 };
  const barn = renderChorePlace('barn', lowCash, {});
  assert.match(barn.controls, /farm-primary-action" type="button" data-local-action="start-route"/u);
  assert.match(barn.details, /short on cash for grain/u);
  assert.match(renderChoreDecision('grain-order', lowCash).actions, /data-action="order-grain" disabled/u);
});

test('a later morning puts grain first when the piglets would come up short', async () => {
  const { createFarm, applyFarmAction } = await import('../game/morning.mjs');
  const { renderChorePlace } = await import('../game/chores-view.mjs');
  let state = createFarm();
  for (const type of ['clear-plot', 'build-pen', 'buy-starters']) {
    state = applyFarmAction(state, { type, id: '1', quantity: 2 }).state;
  }
  const morning = { ...state, week: 2, grain: 1 };
  const barn = renderChorePlace('barn', morning, {});
  assert.match(barn.controls, /farm-primary-action" type="button" data-open="grain-order"/u);
  assert.match(barn.controls, /data-local-action="start-route"/u);
  assert.match(barn.details, /Order grain before taking the bucket/u);
});

test('a piglet-only shortfall offers an affordable Barn recovery before feeding anyway', async () => {
  const { createFarm } = await import('../game/morning.mjs');
  const { renderChoreDecision } = await import('../game/chores-view.mjs');
  const farm = createFarm();
  const morning = { ...farm, week: 2, grain: 1, litter: { ...farm.litter, pigs: 3 } };
  const { actions } = renderChoreDecision('feed-shortfall-bucket', morning);
  assert.match(actions, /farm-primary-action" type="button" data-place="barn"/u);
  assert.doesNotMatch(actions, /data-place="pasture"/u);
  assert.match(actions, /data-allow-shortfall/u);
});
