import * as farm from './farm.mjs';
import { createClock } from './clock.mjs';
import { renderHotspots, renderPanel, renderScene, renderWarnings } from './season-view.mjs';

const markupByRegion = new WeakMap();
const root = document.getElementById('farm-game');
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const select = selector => root.querySelector(selector);
const ui = {
  player: select('.farm-player'),
  launcher: select('.farm-launch button'),
  exit: select('.farm-exit'),
  summary: select('.farm-summary'),
  art: select('.farm-art'),
  hotspots: select('.farm-hotspots'),
  scene: select('.farm-scene'),
  panel: select('.farm-panel'),
  panelTitle: select('#farm-panel-title'),
  panelBody: select('.farm-panel-body'),
  panelActions: select('.farm-decision-actions'),
  panelFeedback: select('.farm-panel-feedback'),
  notice: select('#farm-notice'),
  warnings: select('.farm-warnings'),
  time: select('.farm-clock-toggle'),
  clockState: select('.farm-clock-state'),
  progress: select('.farm-progress'),
  scenes: [...root.querySelectorAll('[data-scene]')],
  speeds: [...root.querySelectorAll('[data-speed]')],
  stats: Object.fromEntries([...root.querySelectorAll('[data-stat]')].map(element => [element.dataset.stat, element]))
};

let state = farm.createFarm();
let scene = 'pasture';
let panel = null;
let panelTrigger = null;
let feedback = null;
let latestEvents = [];
let started = false;
let frame = 0;
let launcherTop;

const clock = createClock(() => {
  const gameHadFocus = root.contains(document.activeElement);
  const previousEventCount = state.events.length;
  state = farm.tickFarm(state);
  latestEvents = state.events.slice(previousEventCount);
  feedback = null;
  if (state.result) {
    clock.pause();
    panel = 'recap';
    panelTrigger = null;
  }
  render();
  if (state.result && gameHadFocus && !ui.panel.hidden) focusPanel();
  return !state.result;
});

function setText(element, content) {
  if (element.textContent !== content) element.textContent = content;
}

function controlKey(element) {
  if (!element?.matches('button')) return null;
  const { panel: panelId, action, target, panelClose } = element.dataset;
  if (panelId) return `[data-panel="${CSS.escape(panelId)}"]`;
  if (action) return `[data-action="${CSS.escape(action)}"]${target ? `[data-target="${CSS.escape(target)}"]` : ''}`;
  return panelClose === undefined ? null : '[data-panel-close]';
}

function setMarkup(element, markup, fallback) {
  if (markupByRegion.get(element) === markup) return;
  const hadFocus = element.contains(document.activeElement);
  const key = hadFocus ? controlKey(document.activeElement) : null;
  // These renderers produce markup from fixed game definitions and numeric session values.
  element.innerHTML = markup;
  markupByRegion.set(element, markup);
  if (hadFocus) {
    const control = key && element.querySelector(key);
    (control && !control.disabled ? control : fallback)?.focus({ preventScroll: true });
  }
}

function drawProgress() {
  const progress = state.result ? 100 : Math.floor(clock.progress() * 100);
  if (ui.progress.value !== progress) ui.progress.value = progress;
  if (clock.running && !frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      drawProgress();
    });
  } else if (!clock.running && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

function renderClock() {
  setText(ui.time, clock.running ? 'Pause' : started ? 'Resume' : 'Start season');
  setText(ui.clockState, state.result ? 'Season ended' : clock.running ? 'Running' : 'Paused');
  ui.time.disabled = Boolean(state.result);
  for (const button of ui.speeds) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === clock.speed));
    button.disabled = Boolean(state.result);
  }
  drawProgress();
}

function renderPlaces(view) {
  const active = state.paddocks.find(plot => plot.status === 'active');
  const alerts = state.result ? {} : {
    pasture: !active ? 'No paddock is supplying forage.' : active.productiveWeeks === 1 ? 'The active paddock has one productive week left.' : '',
    barn: view.forecast?.shortfall ? 'The herd needs more feed this week.' : '',
    orders: state.orders.some(order => order.status === 'open' && order.deadline === view.week) ? 'An open order is due this week.' : '',
    office: state.cash <= farm.OVERHEAD ? 'Cash is low. Check the next overhead charge.' : ''
  };

  for (const button of ui.scenes) {
    const place = button.dataset.scene;
    button.setAttribute('aria-pressed', String(place === scene));
    button.querySelector('.farm-place-badge').hidden = !alerts[place];
    if (alerts[place]) {
      button.setAttribute('aria-description', alerts[place]);
    } else {
      button.removeAttribute('aria-description');
    }
  }
}

function renderNotice() {
  const warnings = latestEvents.filter(event => event.kind === 'warning');
  const events = warnings.length ? warnings : latestEvents;
  const messages = events.map(event => `Week ${event.week} · ${event.message}`).join(' ');
  ui.notice.dataset.tone = feedback?.kind ?? (warnings.length ? 'warning' : 'info');
  setText(ui.notice, feedback?.message ?? (messages || 'Explore the farm while the clock is paused.'));
  setText(ui.panelFeedback, feedback?.kind === 'warning' && panel ? feedback.message : '');
  ui.panelFeedback.hidden = !ui.panelFeedback.textContent;
}

function render() {
  const view = farm.farmView(state);
  const values = {
    week: `Week ${view.week} of ${farm.SEASON_WEEKS}`,
    cash: farm.formatCash(state.cash),
    herd: String(view.herd),
    feed: String(state.feed),
    feeders: String(view.feeders),
    whole: String(view.whole)
  };

  for (const [key, value] of Object.entries(values)) setText(ui.stats[key], value);
  renderClock();
  renderPlaces(view);
  setMarkup(ui.warnings, renderWarnings(state, view));
  ui.art.dataset.view = scene;
  const selectedPlace = ui.scenes.find(button => button.dataset.scene === scene);
  setMarkup(ui.hotspots, renderHotspots(scene, state, view, motion.matches), selectedPlace);
  for (const hotspot of ui.hotspots.querySelectorAll('[data-panel]')) {
    hotspot.setAttribute('aria-expanded', String(hotspot.dataset.panel === panel));
  }
  setMarkup(ui.scene, renderScene(scene, state, view), selectedPlace);

  const details = panel && renderPanel(panel, state, view);
  ui.panel.hidden = !details;
  ui.summary.hidden = Boolean(details);
  if (details) {
    setText(ui.panelTitle, details.title);
    setMarkup(ui.panelBody, details.body, ui.panelTitle);
    setMarkup(ui.panelActions, details.actions ?? '', ui.panelTitle);
    ui.panelActions.hidden = !details.actions;
  }
  renderNotice();
}

function focusPanel() {
  ui.panelBody.scrollTop = 0;
  ui.panelTitle.focus({ preventScroll: true });
}

function closePanel() {
  const previous = panelTrigger;
  panel = null;
  panelTrigger = null;
  if (feedback?.kind === 'warning') feedback = null;
  render();
  const replacement = previous?.key && previous.region.querySelector(previous.key);
  const opener = previous?.element.isConnected ? previous.element : replacement;
  const selectedPlace = ui.scenes.find(button => button.dataset.scene === scene);
  (opener?.getClientRects().length && !opener.disabled ? opener : selectedPlace)?.focus({ preventScroll: true });
}

function toggleClock() {
  if (state.result || document.hidden) return;
  if (clock.running) {
    clock.pause();
    feedback = { message: 'Season paused. You can still make farm decisions.', kind: 'info' };
  } else {
    started = true;
    clock.play();
    feedback = { message: 'Season running.', kind: 'info' };
  }
  renderClock();
  renderNotice();
}

function restart() {
  clock.reset();
  state = farm.createFarm();
  scene = 'pasture';
  panel = null;
  panelTrigger = null;
  feedback = null;
  latestEvents = [];
  started = false;
  render();
  ui.time.focus({ preventScroll: true });
}

root.addEventListener('click', event => {
  const animal = event.target.closest('[data-scene-object]');
  const button = event.target.closest('button') ?? (animal
    ? ui.hotspots.querySelector(`[data-panel="${CSS.escape(animal.dataset.sceneObject)}"]`)
    : null);
  if (!button || button.disabled) return;
  ui.notice.removeAttribute('data-feedback');
  const { speed, scene: place, panel: panelId, action, target } = button.dataset;
  if (button === ui.launcher) {
    launcherTop = ui.launcher.getBoundingClientRect().top;
    ui.player.showModal();
    if (!ui.panel.hidden) focusPanel();
    else (ui.time.disabled ? ui.exit : ui.time).focus({ preventScroll: true });
  } else if (button === ui.exit) {
    exitGame();
  } else if (button === ui.time) {
    toggleClock();
  } else if (speed) {
    clock.setSpeed(Number(speed));
    renderClock();
  } else if (place) {
    scene = place;
    panel = null;
    panelTrigger = null;
    if (feedback?.kind === 'warning') feedback = null;
    render();
  } else if (panelId) {
    panel = panelId;
    if (!ui.panel.contains(button)) {
      const region = ui.hotspots.contains(button) ? ui.hotspots : ui.scene;
      panelTrigger = { element: button, key: controlKey(button), region };
    }
    if (feedback?.kind === 'warning') feedback = null;
    render();
    if (!ui.panel.hidden) focusPanel();
  } else if (button.hasAttribute('data-panel-close')) {
    closePanel();
  } else if (action === 'restart') {
    restart();
  } else if (action) {
    const previousEventCount = state.events.length;
    const result = farm.applyFarmAction(state, { type: action, id: target });
    state = result.state;
    if (!result.error) latestEvents = state.events.slice(previousEventCount);
    feedback = result.error ? { message: result.error, kind: 'warning' } : null;
    if (result.error) render();
    else {
      if (panel) closePanel();
      else render();
      ui.notice.dataset.feedback = 'applied';
    }
  }
});

function exitGame() {
  if (clock.running) {
    clock.pause();
    feedback = { message: 'Season paused. Select Resume when you return.', kind: 'info' };
  }
  renderClock();
  renderNotice();
  ui.player.close();
  ui.launcher.focus({ preventScroll: true });
  // The site header can resize during play. Restore the launcher’s screen position.
  window.scrollBy({ top: ui.launcher.getBoundingClientRect().top - launcherTop, behavior: 'instant' });
}

ui.player.addEventListener('cancel', event => {
  event.preventDefault();
  if (ui.panel.hidden) exitGame();
  else closePanel();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden || !clock.running) return;
  clock.pause();
  feedback = { message: 'The season paused when you left this tab. Select Resume when you’re ready.', kind: 'info' };
  renderClock();
  renderNotice();
});

motion.addEventListener('change', render);
render();
ui.launcher.hidden = false;
