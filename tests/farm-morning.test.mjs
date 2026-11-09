import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as farm from '../game/morning.mjs';

function act(state, type, fields) {
  const result = farm.applyFarmAction(state, { type, ...fields });
  assert.equal(result.error, null, result.error);
  return result.state;
}

function reject(state, type, fields, reason) {
  const result = farm.applyFarmAction(state, { type, ...fields });
  assert.match(result.error, reason);
  assert.equal(result.state, state);
}

function stock(state, id, quantity) {
  state = act(state, 'clear-plot', { id });
  state = act(state, 'build-pen', { id });
  return act(state, 'buy-starters', { id, quantity });
}

function start(quantity = 2) {
  return stock(farm.createFarm(), '1', quantity);
}

function orderGrain(state) {
  const pending = act(state, 'order-grain');
  return act(pending, 'deliver-grain', { id: pending.shipment.id });
}

function feed(state, allowShortfall = false) {
  const source = state.litter.pigs ? 'bucket' : 'barn';
  if (source === 'bucket') state = act(state, 'reserve-litter');
  return act(state, 'settle-feed', { source, allowShortfall });
}

function close(state) {
  return act(state, 'end-week', { week: state.week });
}

function sell(state, kind, id, quantity) {
  const group = farm.saleGroups(state, kind).find(candidate => candidate.id === id);
  return act(state, `sell-${kind}`, { id, quantity, week: state.week, expectedPigs: group?.pigs });
}

test('starts empty with free staged plot work, and buys a separate litter and starter group once', () => {
  let state = farm.createFarm();
  assert.equal(state.cash, 1_000);
  assert.equal(state.grain, 0);
  reject(state, 'buy-starters', { id: '1', quantity: 2 }, /pen/i);
  reject(state, 'end-week', { week: 1 }, /starter/i);
  reject(state, 'settle-feed', { source: 'barn' }, /starter/i);

  state = act(state, 'clear-plot', { id: '1' });
  reject(state, 'clear-plot', { id: '1' }, /plot|clear/i);
  state = act(state, 'build-pen', { id: '1' });
  assert.equal(state.cash, 1_000);
  reject(state, 'build-pen', { id: '1' }, /plot|pen/i);
  for (const quantity of [0, 1.5, 5, '2', Infinity]) {
    reject(state, 'buy-starters', { id: '1', quantity }, /one to four/i);
  }
  reject({ ...state, cash: 99 }, 'buy-starters', { id: '1', quantity: 1 }, /cash|need/i);

  state = act(state, 'buy-starters', { id: '1', quantity: 2 });
  assert.equal(state.cash, 800);
  assert.equal(state.plots[0].pigs, 2);
  assert.equal(state.plots[0].fedWeeks, 1);
  assert.deepEqual(state.litter, { id: 'litter', pigs: 3, fedWeeks: 0 });
  assert.deepEqual(state.breeders, { boar: 1, sow: 1 });
  reject(state, 'buy-starters', { id: '1', quantity: 2 }, /already|occupied/i);
});

test('charges each shipment once and credits only its matching delivery', () => {
  const opening = farm.createFarm();
  let pending = act(opening, 'order-grain');
  const firstId = pending.shipment.id;
  assert.equal(pending.cash, 900);
  assert.equal(pending.grain, 0);
  reject(pending, 'order-grain', {}, /pending|truck|load/i);
  reject(opening, 'deliver-grain', { id: firstId }, /shipment|delivery/i);
  let delivered = act(pending, 'deliver-grain', { id: firstId });
  assert.equal(delivered.grain, 4);
  assert.equal(delivered.shipment, null);
  assert.equal(delivered.cash, 900);
  assert.deepEqual(delivered.lastDelivery, { id: firstId, week: 1 });
  reject(delivered, 'deliver-grain', { id: firstId }, /shipment|delivery/i);
  pending = act(delivered, 'order-grain');
  reject(pending, 'deliver-grain', { id: firstId }, /shipment|delivery/i);
  delivered = act(pending, 'deliver-grain', { id: pending.shipment.id });
  assert.equal(delivered.grain, 8);
  assert.equal(delivered.cash, 800);
  reject({ ...delivered, cash: 99 }, 'order-grain', {}, /cash|need/i);
});

test('reserves the litter first, supports a short bucket, and grows each fully fed group once', () => {
  let state = start(4);
  assert.equal(farm.feedForecast(state).shortfall, 3);
  reject(state, 'settle-feed', { source: 'barn', allowShortfall: true }, /bucket/i);
  state = act(state, 'reserve-litter');
  assert.equal(state.bucket.amount, 0);
  assert.equal(state.grain, 0);
  reject(state, 'settle-feed', { source: 'bucket' }, /short/i);
  state = act(state, 'settle-feed', { source: 'bucket', allowShortfall: true });
  assert.equal(state.litter.fedWeeks, 0);
  assert.equal(state.plots[0].fedWeeks, 2);
  assert.deepEqual(state.feeding.groups.map(({ id, grew, missing }) => [id, grew, missing]), [
    ['litter', false, 3], ['1', true, 0]
  ]);
  reject(state, 'settle-feed', { source: 'bucket', allowShortfall: true }, /already/i);
});

test('preserves the bucket amount until the player refills after a new delivery', () => {
  let state = act(start(), 'reserve-litter');
  state = act(state, 'order-grain');
  reject(state, 'settle-feed', { source: 'bucket', allowShortfall: true }, /truck|shipment/i);
  state = act(state, 'deliver-grain', { id: state.shipment.id });
  assert.equal(state.bucket.amount, 0);
  assert.equal(state.grain, 4);
  reject(state, 'settle-feed', { source: 'bucket', allowShortfall: true }, /refill/i);
  state = act(state, 'reserve-litter', { refill: true });
  assert.equal(state.bucket.amount, 3);
  assert.equal(state.grain, 4);
  state = act(state, 'settle-feed', { source: 'bucket' });
  assert.equal(state.grain, 1);
  assert.equal(state.litter.fedWeeks, 1);
  assert.equal(state.bucket, null);
});

test('end week needs settled feeding and no truck, posts one bill and retains stock', () => {
  let state = start();
  reject(state, 'end-week', { week: 1 }, /feed/i);
  state = act(state, 'order-grain');
  reject(state, 'end-week', { week: 1 }, /truck|shipment/i);
  state = act(state, 'deliver-grain', { id: state.shipment.id });
  state = feed(state);
  const firstFeeding = state.feeding;
  state = close(state);
  assert.equal(state.week, 2);
  assert.equal(state.cash, 620);
  assert.equal(state.grain, 1);
  assert.equal(state.feeding, null);
  assert.equal(state.history[0].feeding, firstFeeding);
  assert.equal(state.history[0].transactions.at(-1).amount, -80);
  reject(state, 'end-week', { week: 1 }, /week/i);
});

test('paddocks provide three productive mornings and recover after two closed rest weeks', () => {
  let state = start();
  for (let week = 1; week <= 3; week += 1) {
    while (state.grain < 3) state = orderGrain(state);
    state = feed(state);
    assert.equal(state.feeding.forage, 2);
    state = close(state);
  }
  assert.equal(state.paddocks[0].status, 'resting');
  assert.equal(state.paddocks[0].restedWeeks, 0);
  const cash = state.cash;
  state = act(state, 'rotate', { id: 'B' });
  assert.equal(state.cash, cash);
  reject(state, 'rotate', { id: 'A' }, /rest/i);
  if (state.grain < 3) state = orderGrain(state);
  state = close(feed(state));
  assert.equal(state.paddocks[0].restedWeeks, 1);
  if (state.grain < 3) state = orderGrain(state);
  state = close(feed(state));
  assert.equal(state.paddocks[0].status, 'ready');
});

test('sells a same-morning feeder once and excludes the breeding pair at either age', () => {
  let state = start();
  assert.deepEqual(farm.saleGroups(state, 'feeder'), []);
  state = feed(orderGrain(state));
  assert.deepEqual(farm.saleGroups(state, 'feeder').map(group => group.id), ['1']);
  reject(state, 'sell-feeder', { id: '1', quantity: 3, week: 1, expectedPigs: 2 }, /quantity|only|between/i);
  reject(state, 'sell-feeder', { id: 'boar', quantity: 1, week: 1 }, /eligible/i);
  const demand = farm.feedForecast(state, { next: true }).demand;
  state = sell(state, 'feeder', '1', 1);
  assert.equal(state.cash, 900);
  assert.equal(state.sales.feeder, 1);
  assert.equal(farm.feedForecast(state, { next: true }).demand, demand - 1);
  reject(state, 'sell-feeder', { id: '1', quantity: 1, week: 1, expectedPigs: 2 }, /changed|again|eligible/i);
});

test('previews both expansions without changing cash, feed or the current feeding record', () => {
  let state = start();
  reject(state, 'buy-kit', { id: '2' }, /feeder|locked/i);
  state = sell(feed(orderGrain(state)), 'feeder', '1', 2);
  const before = structuredClone(state);
  const feeding = state.feeding;
  const preview = farm.expansionPreview(state, '2', 2);
  assert.equal(preview.kitCost, 120);
  assert.equal(preview.hogCost, 200);
  assert.equal(preview.cashLeft, state.cash - 320);
  assert.equal(preview.demandAfter, preview.demandBefore + 2);
  assert.deepEqual(state, before);
  reject({ ...state, cash: 119 }, 'buy-kit', { id: '2' }, /cash|need/i);
  state = act(state, 'buy-kit', { id: '2' });
  reject(state, 'buy-kit', { id: '2' }, /kit|plot/i);
  state = stock(state, '2', 1);
  state = stock(act(state, 'buy-kit', { id: '3' }), '3', 1);
  assert.equal(state.feeding, feeding);
  assert.equal(farm.feedForecast(state, { next: true }).demand, 5);
  assert.equal(state.plots[1].fedWeeks, 1);
  assert.equal(state.plots[2].fedWeeks, 1);
  reject(state, 'buy-kit', { id: '4' }, /plot|kit/i);
});

test('allocates remaining grain in plot order and skips the bucket when the litter is empty', () => {
  let state = start(4);
  state = sell(feed(orderGrain(state)), 'feeder', '1', 1);
  state = stock(act(state, 'buy-kit', { id: '2' }), '2', 4);
  state = close(state);
  state = feed(orderGrain(state), true);
  assert.deepEqual(state.feeding.groups.map(({ id, forage, grain, missing, grew }) => [id, forage, grain, missing, grew]), [
    ['litter', 0, 3, 0, true],
    ['1', 3, 0, 0, true],
    ['2', 1, 2, 1, false]
  ]);
  state = sell(state, 'feeder', 'litter', 3);
  state = close(state);
  reject(state, 'reserve-litter', {}, /empty/i);
  state = feed(orderGrain(state));
  assert.equal(state.feeding.groups.some(group => group.id === 'litter'), false);
});

test('keeps the spare pasture or previews and converts it permanently to a pen', () => {
  let state = start(4);
  state = sell(feed(orderGrain(state)), 'feeder', '1', 1);
  const feeding = state.feeding;
  state = act(state, 'keep-grass', { id: '2' });
  assert.equal(state.feeding, feeding);
  state = stock(act(state, 'buy-kit', { id: '3' }), '3', 3);
  assert.equal(farm.feedForecast(state, { next: true }).forage, 6);
  const snapshot = structuredClone(state);
  const conversion = farm.expansionPreview(state, '2', 1);
  assert.equal(conversion.capacityGained, 4);
  assert.equal(conversion.forageLost, 2);
  assert.equal(conversion.forageAfter, 4);
  assert.equal(conversion.cashLeft, state.cash - 220);
  assert.deepEqual(state, snapshot);
  state = act(state, 'buy-kit', { id: '2' });
  assert.equal(farm.feedForecast(state, { next: true }).forage, 4);
  reject(state, 'keep-grass', { id: '2' }, /plot|grass/i);
  state = stock(state, '2', 1);
  assert.equal(state.plots[1].status, 'fenced');
  assert.equal(state.feeding, feeding);
});

test('land previews project grain left after changing the current unsettled morning', () => {
  let state = start(4);
  state = sell(feed(orderGrain(state)), 'feeder', '1', 1);
  state = stock(act(state, 'buy-kit', { id: '3' }), '3', 3);
  state = orderGrain(close(state));
  assert.equal(state.feeding, null);
  assert.equal(state.grain, 5);

  const keepPreview = farm.expansionPreview(state, '2', 0, { grass: true });
  const withGrass = act(state, 'keep-grass', { id: '2' });
  const kept = farm.feedForecast(withGrass, { next: true });
  assert.equal(kept.shortfall, 1);
  assert.equal(keepPreview.shortfall, kept.shortfall);

  const canAffordKit = sell(withGrass, 'feeder', '1', 1);
  const convertPreview = farm.expansionPreview(canAffordKit, '2');
  const withoutGrass = act(canAffordKit, 'buy-kit', { id: '2' });
  const converted = farm.feedForecast(withoutGrass, { next: true });
  assert.equal(converted.shortfall, 3);
  assert.equal(convertPreview.shortfall, converted.shortfall);
});

test('rests the spare grass for two closed weeks after its third productive morning', () => {
  let state = start(4);
  state = sell(feed(orderGrain(state)), 'feeder', '1', 1);
  state = act(state, 'keep-grass', { id: '2' });
  state = stock(act(state, 'buy-kit', { id: '3' }), '3', 3);
  state = close(state);
  for (let week = 2; week <= 4; week += 1) {
    if (week === 4) state = act(state, 'rotate', { id: 'B' });
    state = feed(state, true);
    assert.equal(state.feeding.forage, 6);
    assert.equal(state.plots[1].forage.productiveWeeks, 4 - week);
    state = close(state);
  }
  for (let week = 5; week <= 6; week += 1) {
    assert.equal(state.plots[1].forage.status, 'resting');
    assert.equal(state.plots[1].forage.restedWeeks, week - 5);
    state = feed(state, true);
    assert.equal(state.feeding.forage, 4);
    state = close(state);
  }
  assert.equal(state.plots[1].forage.status, 'active');
  assert.equal(state.plots[1].forage.productiveWeeks, 3);
});

test('closes at $470 with the first pen and $680 with two expansions', () => {
  for (const expand of [false, true]) {
    let state = start(expand ? 4 : 2);
    for (let week = 1; week <= 6; week += 1) {
      if (week === 4) state = act(state, 'rotate', { id: 'B' });
      while (state.grain < 3) state = orderGrain(state);
      if (week === 6) {
        assert.equal(state.litter.fedWeeks, 5);
        assert.equal(farm.saleGroups(state, 'market').some(group => group.id === 'litter'), false);
        assert.equal(farm.saleGroups(state, 'feeder').some(group => group.id === 'litter'), true);
      }
      state = feed(state);
      if (week === 1) {
        state = sell(state, 'feeder', '1', expand ? 4 : 1);
        if (expand) {
          for (const id of ['2', '3']) state = stock(act(state, 'buy-kit', { id }), id, 1);
        }
      }
      if (week === 6) {
        assert.equal(farm.saleGroups(state, 'feeder').some(group => group.id === 'litter'), false);
        state = sell(state, 'market', 'litter', expand ? 2 : 1);
        if (expand) {
          state = act(state, 'buy-starters', { id: '1', quantity: 2 });
          assert.deepEqual(state.litter, { id: 'litter', pigs: 1, fedWeeks: 6 });
          assert.equal(state.plots[0].fedWeeks, 1);
        }
      }
      state = close(state);
    }
    assert.equal(state.result, 'won');
    assert.equal(state.cash, expand ? 680 : 470);
    assert.equal(state.history.length, 6);
    assert.equal(state.history[5].transactions.at(-1).amount, -80);
    assert.equal(state.ledger.filter(entry => entry.type === 'grain').length, 5);
    assert.deepEqual(state.breeders, { boar: 1, sow: 1 });
    reject(state, 'end-week', { week: 6 }, /season/i);
  }
});

test('records the full six weeks and loses on a missed sale or on nonpositive closing cash', () => {
  let state = start();
  for (let week = 1; week <= 6; week += 1) state = close(feed(state, true));
  assert.equal(state.result, 'lost');
  assert.equal(state.cash, 320);
  assert.equal(state.history.length, 6);
  assert.equal(state.history[0].feeding.shortfall, 3);

  const sixthMorning = { ...feed(start(), true), week: 6, cash: 80, sales: { feeder: 1, market: 1 } };
  const closed = close(sixthMorning);
  assert.equal(closed.cash, 0);
  assert.equal(closed.result, 'lost');
  assert.equal(farm.createFarm().result, null);
});
