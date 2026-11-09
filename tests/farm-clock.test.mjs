import assert from 'node:assert/strict';
import test from 'node:test';

async function clockFixture(t, onTick) {
  const module = await import('../game/clock.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url?.endsWith('/game/clock.mjs')) return null;
    throw error;
  });
  assert.ok(module, 'The game needs a clock module');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const clock = module.createClock(onTick, { now: Date.now });
  return { clock, elapse: ms => t.mock.timers.tick(ms) };
}

test('the clock starts paused and only ticks after twenty running seconds', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  elapse(60_000);
  assert.equal(ticks, 0);
  clock.play();
  elapse(19_999);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
});

test('a pause and speed change preserve progress toward the next tick', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  clock.play();
  elapse(10_000);
  clock.pause();
  assert.equal(clock.progress(), 0.5);
  elapse(60_000);
  assert.equal(ticks, 0);
  clock.setSpeed(2);
  clock.play();
  elapse(4_999);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
});

test('changing speed during play schedules exactly one tick', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  clock.play();
  elapse(8_000);
  clock.setSpeed(2);
  elapse(5_999);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
  elapse(9_999);
  assert.equal(ticks, 1);
  elapse(1);
  assert.equal(ticks, 2);
});

test('a terminal tick stops time and reset restores the starting clock', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; return false; });
  clock.setSpeed(2);
  clock.play();
  elapse(10_000);
  assert.equal(ticks, 1);
  assert.equal(clock.running, false);
  elapse(60_000);
  assert.equal(ticks, 1);
  clock.reset();
  assert.equal(clock.running, false);
  assert.equal(clock.speed, 1);
  assert.equal(clock.progress(), 0);
});
