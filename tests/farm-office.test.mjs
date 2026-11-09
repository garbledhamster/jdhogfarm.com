import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyFarmAction, createFarm } from '../game/morning.mjs';
import { renderOfficeDecision, renderOfficePlace } from '../game/office-view.mjs';

const context = { seenStories: new Set(), storyWeek: 1 };

function act(state, type, fields) {
  const result = applyFarmAction(state, { type, ...fields });
  assert.equal(result.error, null, result.error);
  return result.state;
}

function fedFirstMorning() {
  let state = createFarm();
  state = act(state, 'clear-plot', { id: '1' });
  state = act(state, 'build-pen', { id: '1' });
  state = act(state, 'buy-starters', { id: '1', quantity: 2 });
  state = act(state, 'order-grain');
  state = act(state, 'deliver-grain', { id: state.shipment.id });
  state = act(state, 'reserve-litter');
  return act(state, 'settle-feed', { source: 'bucket' });
}

test('Office links to unfinished work and offers End Week only after settlement', () => {
  const start = createFarm();
  const first = renderOfficePlace('office', start, context);
  assert.match(first.art, /debbie-avatar\.webp/);
  assert.match(first.controls, /data-open="ledger"/);
  assert.match(first.details, /starter pigs/);
  assert.match(first.details, /data-place="pasture"/);
  assert.doesNotMatch(first.details, /data-action="end-week"/);

  let state = fedFirstMorning();
  state = act(state, 'sell-feeder', { id: '1', quantity: 1, week: 1, expectedPigs: 2 });
  const ledger = renderOfficeDecision('ledger', state, context);
  assert.match(ledger.body, /Starter pigs/);
  assert.match(ledger.body, /Grain delivery/);
  assert.match(ledger.body, /Feeder pickup/);
  assert.match(ledger.body, /grew to 2 fed weeks/);
  assert.match(ledger.body, /\$900/);
  assert.match(ledger.body, /\$80/);
  assert.match(ledger.actions, /data-action="end-week" data-week="1"/);

  state = act(state, 'order-grain');
  const pending = renderOfficeDecision('ledger', state, context);
  assert.match(pending.body, /truck/);
  assert.match(pending.actions, /data-place="barn"/);
  assert.doesNotMatch(pending.actions, /data-action="end-week"/);
});

test('Office reflects expansion demand for the next morning after feeding has closed', () => {
  let state = fedFirstMorning();
  state = act(state, 'sell-feeder', { id: '1', quantity: 1, week: 1, expectedPigs: 2 });
  state = act(state, 'buy-kit', { id: '2' });
  state = act(state, 'clear-plot', { id: '2' });
  state = act(state, 'build-pen', { id: '2' });
  state = act(state, 'buy-starters', { id: '2', quantity: 2 });
  const office = renderOfficePlace('office', state, context);
  const ledger = renderOfficeDecision('ledger', state, context);
  assert.match(office.details, /Next morning.+6 to feed.+3 from grass.+1 grain/s);
  assert.match(ledger.body, /Next morning.+6 to feed.+3 from grass.+1 grain/s);
  assert.match(ledger.body, /5 to feed/);
});

test('Week 6 Office and books show closing cash without a next morning forecast', () => {
  const state = { ...fedFirstMorning(), week: 6 };
  const office = renderOfficePlace('office', state, context);
  const ledger = renderOfficeDecision('ledger', state, context);
  for (const markup of [office.details, ledger.body]) {
    assert.match(markup, /Closing cash.+\$620/s);
    assert.doesNotMatch(markup, /Next morning/);
  }
});

test('Help reopens seen weeks, preserves all six illustrated conversations and links to Replay', () => {
  const start = createFarm();
  const journal = renderOfficeDecision('help', start, { ...context, seenStories: new Set([1, 3]) });
  assert.match(journal.body, /data-open="story" data-story-week="1"/);
  assert.match(journal.body, /data-open="story" data-story-week="3"/);
  assert.doesNotMatch(journal.body, /data-story-week="2"/);
  assert.match(journal.actions, /data-open="replay"/);
  const replay = renderOfficeDecision('replay', start, context);
  assert.match(replay.body, /truck or bucket/);
  assert.match(replay.actions, /data-action="replay"/);

  const titles = new Set();
  for (let storyWeek = 1; storyWeek <= 6; storyWeek += 1) {
    const story = renderOfficeDecision('story', start, { ...context, storyWeek });
    titles.add(story.title);
    assert.match(story.body, /joe-portrait\.webp/);
    assert.match(story.body, /debbie-portrait\.webp/);
  }
  assert.equal(titles.size, 6);
  assert.match(renderOfficeDecision('story', start, { ...context, storyWeek: 6 }).body, /market size/);
});

test('recap grounds a replay choice in the recorded sale and feeding result', () => {
  const state = {
    ...fedFirstMorning(), week: 6, cash: 470, result: 'lost', sales: { feeder: 1, market: 0 },
    history: [{
      week: 3, cash: 640, transactions: [],
      feeding: { demand: 4, forage: 1, grainUsed: 2, shortfall: 1, groups: [{ id: 'litter', missing: 1 }] }
    }]
  };
  const recap = renderOfficeDecision('recap', state, context);
  assert.match(recap.body, /\$470/);
  assert.match(recap.body, /No market hog sale/);
  assert.match(recap.body, /Week 3/);
  assert.match(recap.body, /before you take the bucket/);
  assert.match(recap.actions, /data-action="replay"/);
  assert.match(renderOfficePlace('office', state, context).controls, /data-open="recap"/);
});
