import { WEEK_MS } from './farm.mjs';

export function createClock(onTick, {
  now = () => performance.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = timer => clearTimeout(timer)
} = {}) {
  let speed = 1;
  let elapsed = 0;
  let startedAt = null;
  let timer;

  function total() {
    return elapsed + (startedAt === null ? 0 : (now() - startedAt) * speed);
  }

  function queueTick() {
    timer = schedule(resolveTick, Math.ceil(Math.max(0, WEEK_MS - total()) / speed));
  }

  function resolveTick() {
    if (total() < WEEK_MS) {
      queueTick();
      return;
    }
    elapsed = 0;
    startedAt = now();
    if (onTick() === false) startedAt = null;
    if (startedAt !== null) queueTick();
  }

  return {
    get running() { return startedAt !== null; },
    get speed() { return speed; },
    progress() { return Math.min(1, total() / WEEK_MS); },
    play() {
      if (startedAt !== null) return;
      startedAt = now();
      queueTick();
    },
    pause() {
      if (startedAt === null) return;
      elapsed = Math.min(WEEK_MS, total());
      startedAt = null;
      cancel(timer);
    },
    setSpeed(nextSpeed) {
      if (nextSpeed === speed || ![1, 2].includes(nextSpeed)) return;
      const wasRunning = startedAt !== null;
      this.pause();
      speed = nextSpeed;
      if (wasRunning) this.play();
    },
    reset() {
      this.pause();
      elapsed = 0;
      speed = 1;
    }
  };
}
