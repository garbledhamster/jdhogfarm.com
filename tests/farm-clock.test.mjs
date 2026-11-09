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

test('the clock starts paused and only ticks after sixty running seconds', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  elapse(60_000);
  assert.equal(ticks, 0);
  clock.play();
  elapse(59_999);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
});

test('a pause and speed change preserve progress toward the next tick', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  clock.play();
  elapse(30_000);
  clock.pause();
  assert.equal(clock.progress(), 0.5);
  elapse(60_000);
  assert.equal(ticks, 0);
  clock.setSpeed(2);
  clock.play();
  elapse(14_999);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
});

test('changing speed during play schedules exactly one tick', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  clock.play();
  elapse(24_000);
  clock.setSpeed(2);
  elapse(17_999);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
  elapse(29_999);
  assert.equal(ticks, 1);
  elapse(1);
  assert.equal(ticks, 2);
});

test('a terminal tick stops time and reset restores the starting clock', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; return false; });
  clock.setSpeed(2);
  clock.play();
  elapse(30_000);
  assert.equal(ticks, 1);
  assert.equal(clock.running, false);
  elapse(60_000);
  assert.equal(ticks, 1);
  clock.reset();
  assert.equal(clock.running, false);
  assert.equal(clock.speed, 1);
  assert.equal(clock.progress(), 0);
});

for (const [speed, duration] of [[1, 60000], [2, 30000], [3, 20000], [4, 15000]]) {
  test(`${speed}× runs one week only at its full boundary`, async t => {
    let ticks = 0;
    const { clock, elapse } = await clockFixture(t, () => { ticks++; });
    clock.setSpeed(speed);
    clock.play();
    elapse(duration - 1);
    assert.equal(ticks, 0);
    elapse(1);
    assert.equal(ticks, 1);
  });
}

test('rapid speed and pause changes preserve partial time without duplicate ticks', async t => {
  let ticks = 0;
  const { clock, elapse } = await clockFixture(t, () => { ticks++; });
  clock.play();
  elapse(15000);
  clock.setSpeed(4);
  clock.pause();
  clock.play();
  clock.setSpeed(2);
  elapse(22499);
  assert.equal(ticks, 0);
  elapse(1);
  assert.equal(ticks, 1);
  clock.pause();
  elapse(120000);
  assert.equal(ticks, 1);
});
