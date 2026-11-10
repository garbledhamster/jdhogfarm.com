import assert from 'node:assert/strict';
import { applyFarmAction, createFarm, saleGroups } from '../game/morning.mjs';
import { openSeasonSave } from '../game/season-save.mjs';

export function act(state, type, fields = {}) {
  const result = applyFarmAction(state, { type, week: state.week, ...fields });
  assert.equal(result.error, null, result.error);
  return result.state;
}

export function sell(state, id, quantity) {
  return act(state, 'sell-market', { id, quantity,
    expectedPigs: saleGroups(state, 'market').find(group => group.id === id).pigs });
}

export function loadSnapshot(snapshot) {
  const prior = globalThis.window;
  const memory = new Map([['jdhogfarm.season', JSON.stringify(snapshot)]]);
  globalThis.window = { localStorage: {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
  } };
  try { return openSeasonSave().season; } finally { globalThis.window = prior; }
}

export function snapshot(state, fields = {}) {
  return { version: 2, state, place: 'barn', previousPlace: 'barn', selectedPlot: null,
    bucketArrived: false, seenStories: [], ...fields };
}

export function routeFarm(kind = 'expanded') {
  let first = act(createFarm(), 'clear-plot', { id: '1' });
  first = act(first, 'build-pen', { id: '1' });
  first = act(first, 'buy-starters', { id: '1', quantity: 2 });
  for (let week = 1; week <= 6; week += 1) {
    if (week === 4) first = act(first, 'rotate', { id: 'B' });
    if (week !== 4) {
      first = act(first, 'order-grain');
      first = act(first, 'deliver-grain', { id: first.shipment.id });
    }
    first = act(first, 'reserve-litter');
    first = act(first, 'settle-feed', { source: 'bucket' });
    if (week === 1) first = act(first, 'sell-feeder', { id: '1', quantity: 1, expectedPigs: 2 });
    if (week === 6) first = sell(first, 'litter', 1);
    first = act(first, 'end-week');
  }
  assert.equal(first.cash, 470);
  assert.equal(first.grain, 2);
  delete first.chapter;
  delete first.firstMilestone;
  delete first.lastOutcome;
  let state = act(loadSnapshot(snapshot(first, { version: 1 })).state, 'continue-farm');
  if (kind === 'small') return state;
  state = sell(state, 'litter', 1);
  state = sell(state, '1', 1);
  for (const id of ['4', '5']) {
    state = act(state, 'buy-kit', { id, quantity: 2 });
    state = act(state, 'clear-plot', { id });
    state = act(state, 'build-pen', { id });
    if (kind !== 'empty') state = act(state, 'buy-starters', { id, quantity: 2 });
  }
  state = act(state, 'order-grain');
  state = act(state, 'deliver-grain', { id: state.shipment.id });
  if (kind === 'covered') state = act(state, 'rotate', { id: 'A' });
  if (kind === 'growers') state = sell(state, 'litter', 1);
  return state;
}

export function routeClock(options = {}) {
  let time = 0;
  const tasks = new Map();
  return {
    ...options, now: () => time,
    schedule(callback, delay) { const key = Symbol(); tasks.set(key, { callback, at: time + delay }); return key; },
    cancel(key) { tasks.delete(key); },
    advance(delay) {
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
  };
}
