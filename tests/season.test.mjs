import assert from 'node:assert/strict';
import test from 'node:test';
import { applyFarmAction, createFarm, farmView, tickFarm } from '../game/farm.mjs';
import { chapterFor } from '../game/story.mjs';
const paddock = (state, id) => state.paddocks.find(plot => plot.id === id);

function advance(state, weeks) {
  for (let week = 0; week < weeks; week++) state = tickFarm(state);
  return state;
}

function action(state, type, id) {
  return applyFarmAction(state, { type, id });
}

function apply(state, type, id) {
  const result = action(state, type, id);
  assert.equal(result.error, null);
  return result.state;
}

test('weekly dialogue acknowledges a completed order and stops giving chores after the season', () => {
  const pickupWeek = advance(createFarm(), 2);
  assert.match(chapterFor(3, pickupWeek).reply, /confirm/i);
  const pickupDone = apply(pickupWeek, 'fulfill', 'A');
  assert.match(chapterFor(3, pickupDone).reply, /pickup.*already in the books/i);
  const ended = advance(pickupDone, 4);
  assert.match(chapterFor(6, ended).reply, /recap/i);
});

test('switching paddocks charges $50 and starts the former active plot resting', () => {
  const state = apply(createFarm(), 'activate', 'B');

  assert.equal(state.cash, 950);
  assert.equal(paddock(state, 'B').status, 'active');
  assert.equal(paddock(state, 'B').productiveWeeks, 3);
  assert.equal(paddock(state, 'A').status, 'resting');
  assert.equal(paddock(state, 'A').restedWeeks, 0);
  assert.equal(state.ledger.at(-1).amount, -50);
  assert.equal(state.ledger.at(-1).balance, 950);
});

test('the third productive tick feeds the herd, then the plot stays exhausted until rested', () => {
  const exhausted = advance(createFarm(), 3);

  assert.equal(exhausted.cohorts[0].fedWeeks, 3);
  assert.equal(exhausted.feed, 1);
  assert.equal(paddock(exhausted, 'A').status, 'exhausted');
  assert.equal(paddock(tickFarm(exhausted), 'A').status, 'exhausted');

  const resting = apply(exhausted, 'rest', 'A');
  assert.equal(resting.cash, 760);
  assert.equal(paddock(resting, 'A').restedWeeks, 0);
  const firstBoundary = tickFarm(resting);
  assert.equal(paddock(firstBoundary, 'A').status, 'resting');
  assert.equal(paddock(firstBoundary, 'A').restedWeeks, 1);
  assert.equal(paddock(tickFarm(firstBoundary), 'A').status, 'ready');
});

test('a rejected repeat rest does not erase recovery already earned', () => {
  const resting = tickFarm(apply(createFarm(), 'rest', 'A'));
  const result = action(resting, 'rest', 'A');

  assert.match(result.error, /already resting/i);
  assert.equal(result.state, resting);
  assert.equal(paddock(tickFarm(result.state), 'A').status, 'ready');
});

test('a resting paddock cannot be activated before its second rest boundary', () => {
  const resting = tickFarm(apply(createFarm(), 'activate', 'B'));
  const result = action(resting, 'activate', 'A');

  assert.match(result.error, /1 (more )?week/i);
  assert.equal(result.state, resting);
});

test('a ready paddock stays ready when the farm cannot afford its activation', () => {
  const lowCash = { ...createFarm(), cash: 49 };
  const result = action(lowCash, 'activate', 'B');

  assert.match(result.error, /\$50/);
  assert.equal(result.state, lowCash);
});

test('rotating before the shortage lets the whole herd reach four fed weeks', () => {
  const state = advance(createFarm(), 3);
  const rotated = apply(apply(state, 'rest', 'A'), 'activate', 'B');
  const fed = tickFarm(rotated);

  assert.equal(farmView(fed).whole, 4);
  assert.equal(fed.feed, 1);
  assert.equal(fed.cash, 630);
});

test('the forecast identifies a shortage and the tick uses the last supplement without erasing growth', () => {
  const state = advance(createFarm(), 3);
  const forecast = farmView(state).forecast;
  assert.ok(forecast, 'the farm view exposes the next-week feed forecast');
  assert.deepEqual(forecast, {
    demand: 4,
    forage: 0,
    supplemental: 1,
    feedUsed: 1,
    shortfall: 3
  });

  const short = tickFarm(state);
  assert.equal(short.feed, 0);
  assert.equal(short.cohorts[0].fedWeeks, 3);
  assert.equal(farmView(short).feeders, 4);
  assert.ok(short.events.some(event => /no pigs gained a fed week/i.test(event.message)));
});

test('unused forage expires even when no pigs need feed', () => {
  const empty = { ...createFarm(), cohorts: [] };
  const next = tickFarm(empty);

  assert.equal(paddock(next, 'A').productiveWeeks, 2);
  assert.equal(next.feed, 1);
  assert.equal(next.cash, 920);
  assert.equal(farmView(next).forecast?.demand, 0);
  assert.equal(farmView(next).forecast?.forage, 4);
});

test('buying pigs preserves older cohorts and recalculates the forecast', () => {
  const state = tickFarm(createFarm());
  const expanded = apply(state, 'buy-pigs');

  assert.equal(expanded.cash, 720);
  assert.equal(farmView(expanded).herd, 6);
  assert.deepEqual(expanded.cohorts.map(({ pigs, fedWeeks }) => [pigs, fedWeeks]), [[4, 1], [2, 0]]);
  assert.equal(farmView(expanded).forecast.shortfall, 1);
  assert.equal(expanded.ledger.at(-1).amount, -200);
});

test('four purchased feed units cover the extra pigs and leave three in storage', () => {
  const expanded = apply(createFarm(), 'buy-pigs');
  const stocked = apply(expanded, 'buy-feed');

  assert.equal(stocked.cash, 700);
  assert.equal(stocked.feed, 5);
  assert.equal(stocked.ledger.at(-1).amount, -100);
  assert.equal(farmView(stocked).forecast.shortfall, 0);

  const fed = tickFarm(stocked);
  assert.equal(fed.feed, 3);
  assert.deepEqual(fed.cohorts.map(({ pigs, fedWeeks }) => [pigs, fedWeeks]), [[4, 1], [2, 1]]);
});

test('a purchase accepts exact funds and an unaffordable confirmation changes nothing', () => {
  const exact = { ...createFarm(), cash: 100 };
  const spent = apply(exact, 'buy-feed');

  assert.equal(spent.cash, 0);
  assert.equal(spent.feed, 5);
  assert.equal(spent.result, null);

  const rejected = action(spent, 'buy-pigs');
  assert.match(rejected.error, /\$200/);
  assert.equal(rejected.state, spent);
});

test('feeder pickup pays once and removes the exact number from the oldest eligible cohorts', () => {
  const state = {
    ...advance(createFarm(), 2),
    cohorts: [
      { id: 1, pigs: 2, fedWeeks: 2 },
      { id: 2, pigs: 1, fedWeeks: 4 },
      { id: 3, pigs: 2, fedWeeks: 3 }
    ]
  };
  const sold = apply(state, 'fulfill', 'A');

  assert.equal(sold.cash, 1240);
  assert.equal(sold.orders[0].status, 'fulfilled');
  assert.deepEqual(sold.cohorts.map(({ id, pigs }) => [id, pigs]), [[1, 2], [3, 1]]);
  assert.equal(farmView(sold).whole, 0);
  assert.equal(sold.ledger.at(-1).amount, 400);
  assert.ok(sold.events.some(event => /feeder pickup.*fulfilled/i.test(event.message)));

  const duplicate = action(sold, 'fulfill', 'A');
  assert.match(duplicate.error, /fulfilled/i);
  assert.equal(duplicate.state, sold);
});

test('equal maturity favors the earliest cohort by creation order', () => {
  const state = {
    ...advance(createFarm(), 2),
    cohorts: [
      { id: 1, pigs: 1, fedWeeks: 4 },
      { id: 2, pigs: 3, fedWeeks: 4 }
    ]
  };
  const sold = apply(state, 'fulfill', 'B');

  assert.deepEqual(sold.cohorts.map(({ id, pigs }) => [id, pigs]), [[2, 2]]);
  assert.equal(sold.cash, 1290);
  assert.equal(sold.ledger.at(-1).amount, 450);
});

test('an open order explains missing eligible pigs and warns when its last week begins', () => {
  const fresh = createFarm();
  const rejected = action(fresh, 'fulfill', 'A');

  assert.match(rejected.error, /2.*eligible/i);
  assert.equal(rejected.state, fresh);

  const finalWeek = advance(fresh, 3);
  assert.ok(finalWeek.events.some(event => event.week === 4 && /last week.*feeder pickup/i.test(event.message)));
  const missed = tickFarm(finalWeek);
  assert.equal(missed.orders[0].status, 'missed');
  assert.equal(missed.result, null);
  assert.equal(missed.cash, 680);
});

test('growth on the deadline tick cannot reopen a missed order', () => {
  let state = apply(createFarm(), 'rest', 'A');
  state = advance(state, 2);
  state = advance(apply(state, 'activate', 'B'), 3);
  state = apply(state, 'activate', 'A');
  assert.equal(farmView(state).whole, 0);

  const deadline = tickFarm(state);
  assert.equal(farmView(deadline).whole, 4);
  assert.equal(deadline.orders[1].status, 'missed');

  const rejected = action(deadline, 'fulfill', 'B');
  assert.ok(rejected.error);
  assert.equal(rejected.state, deadline);
});

test('both fulfilled orders and a positive balance win the reference season', () => {
  let state = advance(createFarm(), 2);
  state = tickFarm(apply(state, 'fulfill', 'A'));
  state = apply(state, 'rest', 'A');
  state = tickFarm(apply(state, 'activate', 'B'));

  assert.equal(state.cash, 1030);
  assert.equal(farmView(state).whole, 2);

  const closing = advance(apply(state, 'fulfill', 'B'), 2);
  assert.equal(closing.result, 'won');
  assert.equal(closing.cash, 1320);
  assert.equal(closing.feed, 1);
  assert.deepEqual(closing.orders.map(order => order.status), ['fulfilled', 'fulfilled']);
  assert.equal(tickFarm(closing), closing);
});

test('a no-action season misses both deadlines and closes with $520', () => {
  const closing = advance(createFarm(), 6);

  assert.equal(closing.result, 'lost');
  assert.equal(closing.cash, 520);
  assert.equal(closing.cohorts[0].fedWeeks, 3);
  assert.deepEqual(closing.orders.map(order => order.status), ['missed', 'missed']);
});

test('exact-zero overhead ends the season before closing a deadline and rejects later actions', () => {
  const finalWeek = { ...advance(createFarm(), 5), cash: 80 };
  const bankrupt = tickFarm(finalWeek);

  assert.equal(bankrupt.completedWeeks, 6);
  assert.equal(bankrupt.cash, 0);
  assert.equal(bankrupt.result, 'bankrupt');
  assert.equal(bankrupt.orders[1].status, 'open');
  assert.equal(bankrupt.ledger.at(-1).amount, -80);
  assert.equal(bankrupt.ledger.at(-1).balance, 0);
  assert.ok(bankrupt.events.some(event => /overhead.*\$0/i.test(event.message)));

  const rejected = action(bankrupt, 'buy-feed');
  assert.match(rejected.error, /season.*over/i);
  assert.equal(rejected.state, bankrupt);
});
