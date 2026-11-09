import { createChores } from './chores.mjs';
import { paintChoreRoute } from './chores-art.mjs';
import { updateCommercePreview } from './commerce-view.mjs';
import { applyFarmAction, createFarm, formatCash, SEASON_WEEKS } from './morning.mjs';
import { placeNames, prologue, renderDecision, renderPlace } from './morning-view.mjs';

const root = document.getElementById('farm-game');
const select = selector => root.querySelector(selector);
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const markupByRegion = new WeakMap();

const ui = {
  player: select('.farm-player'),
  launcher: select('.farm-launch button'),
  exit: select('.farm-exit'),
  help: select('.farm-help'),
  talk: select('.farm-talk'),
  intro: select('.farm-prologue'),
  introPortrait: select('.farm-prologue-portrait img'),
  introSpeaker: select('.farm-prologue-speaker'),
  introStep: select('.farm-prologue-step'),
  introTitle: select('.farm-prologue-title'),
  introText: select('.farm-prologue-text'),
  introNext: select('.farm-prologue-next'),
  introSkip: select('.farm-prologue-skip'),
  interface: select('.farm-interface'),
  map: select('.farm-map-toggle'),
  stage: select('.farm-stage'),
  field: select('.farm-playfield'),
  art: select('.farm-artwork'),
  controls: select('.farm-hotspots'),
  sceneTitle: select('#farm-scene-title'),
  summary: select('.farm-summary'),
  details: select('.farm-scene'),
  panel: select('.farm-panel'),
  panelTitle: select('#farm-panel-title'),
  panelBody: select('.farm-panel-body'),
  panelActions: select('.farm-decision-actions'),
  panelFeedback: select('.farm-panel-feedback'),
  notice: select('#farm-notice'),
  stats: Object.fromEntries([...root.querySelectorAll('[data-stat]')].map(node => [node.dataset.stat, node]))
};

let state = createFarm();
let place = 'pasture';
let previousPlace = place;
let selectedPlot = null;
let panel = null;
let panelTrigger = null;
let panelTarget = null;
let storyWeek = null;
let storyFromHelp = false;
let seenStories = new Set();
let recentAction = null;
let prologuePage = 0;
let launcherTop;
let notice = '';

const chores = createChores({
  onDelivery(id) {
    const result = applyFarmAction(state, { type: 'deliver-grain', id });
    if (result.error) return;
    state = result.state;
    notice = 'Grain ready. The truck filled the bin.';
    render();
  },
  onDeliveryChange: render,
  onRouteChange(route, { progressOnly }) {
    if (progressOnly) paintChoreRoute(ui.stage, route, motion.matches);
    else {
      const collision = place === 'route' && route.status === 'blocked' && ui.controls.contains(document.activeElement);
      render();
      if (collision) focusPlace();
    }
  },
  onArrive() {
    goTo('piglets');
    focus(ui.controls.querySelector('button:not(:disabled)'));
  }
});

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function controlSelector(control) {
  if (control.id) return `#${CSS.escape(control.id)}`;
  const attributes = ['data-place', 'data-open', 'data-action', 'data-local-action', 'data-target', 'data-story-week'];
  const keys = attributes.filter(name => control.hasAttribute(name));
  return keys.length ? keys.map(name => `[${name}="${CSS.escape(control.getAttribute(name))}"]`).join('') : '';
}

function setMarkup(node, markup = '', fallback) {
  if (markupByRegion.get(node) === markup) return;
  const active = document.activeElement;
  const hadFocus = node.contains(active);
  const key = hadFocus && controlSelector(active);
  // The views provide game-owned text, asset paths, and numeric session values.
  node.innerHTML = markup;
  markupByRegion.set(node, markup);
  if (hadFocus) {
    const replacement = key && node.querySelector(key);
    focus(replacement && !replacement.disabled ? replacement : fallback);
  }
}

function focus(node) {
  node?.focus({ preventScroll: true });
}

function focusPlace() {
  const route = place === 'route' && chores.route;
  const selector = route && {
    ready: '[data-local-action="walk-route"]',
    blocked: '[data-local-action="retry-route"]',
    walking: '[data-local-action="route-lane"][aria-pressed="true"]:enabled'
  }[route.status];
  focus((selector && ui.controls.querySelector(selector)) || ui.sceneTitle);
}

function render() {
  chores.sync({
    week: state.week,
    shipment: state.shipment,
    hasBucket: Boolean(state.bucket),
    active: ui.player.open && !document.hidden && place === 'route' && !panel
  });
  const context = {
    previousPlace, selectedPlot, panel, panelTarget, storyWeek, storyFromHelp, seenStories, recentAction,
    motion: motion.matches, route: chores.route, deliveryStage: chores.deliveryStage
  };
  const view = renderPlace(place, state, context);
  const decision = panel && renderDecision(panel, state, context);
  setText(ui.stats.week, `Week ${state.week} of ${SEASON_WEEKS}`);
  setText(ui.stats.cash, formatCash(state.cash));
  setText(ui.stats.grain, String(state.grain));
  const pigs = state.plots.reduce((total, plot) => total + plot.pigs, state.litter.pigs);
  setText(ui.stats.herd, String(pigs));
  setText(ui.talk, place === 'office' ? 'Talk to Debbie' : 'Talk to Joe');
  ui.talk.toggleAttribute('data-unread', !seenStories.has(state.week) && !state.result);
  setText(ui.sceneTitle, placeNames[place]);
  setText(ui.notice, decision ? '' : notice);
  setText(ui.panelFeedback, decision ? notice : '');
  ui.panelFeedback.hidden = !decision || !notice;
  ui.map.setAttribute('aria-pressed', String(place === 'map'));
  ui.stage.dataset.view = place;
  setMarkup(ui.art, view.art);
  setMarkup(ui.controls, view.controls, ui.sceneTitle);
  setMarkup(ui.details, view.details, ui.sceneTitle);
  ui.field.inert = Boolean(decision);
  ui.summary.inert = Boolean(decision);
  renderDecisionPanel(decision);
}

function renderDecisionPanel(decision) {
  ui.panel.hidden = !decision;
  if (!decision) {
    delete ui.panel.dataset.decisionKey;
    setMarkup(ui.panelBody);
    setMarkup(ui.panelActions);
    return;
  }

  const key = `${panel}:${panelTarget ?? ''}`;
  const previousInput = ui.panel.dataset.decisionKey === key
    ? ui.panelBody.querySelector('input[type="number"]')
    : null;
  ui.panel.dataset.decisionKey = key;
  setText(ui.panelTitle, decision.title);
  setMarkup(ui.panelBody, decision.body, ui.panelTitle);
  setMarkup(ui.panelActions, decision.actions, ui.panelTitle);
  if (previousInput) {
    const currentInput = ui.panelBody.querySelector(`#${CSS.escape(previousInput.id)}`);
    if (currentInput) {
      if (currentInput !== previousInput) currentInput.value = previousInput.value;
      if (currentInput.matches('[data-commerce-quantity]')) updateCommercePreview(ui.panel, state);
    }
  }
}

function renderIntro() {
  const page = prologue[prologuePage];
  const src = `game/art/${page.art}.webp`;
  ui.intro.dataset.frame = page.art;
  if (ui.introPortrait.getAttribute('src') !== src) {
    delete ui.introPortrait.parentElement.dataset.missing;
    ui.introPortrait.hidden = false;
    ui.introPortrait.setAttribute('src', src);
  }
  ui.introPortrait.alt = page.alt;
  setText(ui.introSpeaker, page.speaker);
  setText(ui.introStep, `${prologuePage + 1} of ${prologue.length}`);
  setText(ui.introTitle, page.title);
  setText(ui.introText, `“${page.text}”`);
  setText(ui.introNext, prologuePage === prologue.length - 1 ? 'Go to Pasture' : 'Continue');
}

function beginPlay() {
  ui.intro.hidden = true;
  ui.interface.hidden = false;
  ui.help.hidden = false;
  ui.talk.hidden = false;
  focus(ui.sceneTitle);
}

function clearPanel() {
  panel = null;
  panelTarget = null;
  panelTrigger = null;
  storyFromHelp = false;
}

function goTo(destination, nextNotice = '') {
  if (destination === 'map') {
    if (place === 'map') destination = previousPlace;
    else previousPlace = place;
  } else if (destination === 'back') {
    destination = previousPlace;
  }
  if (!Object.hasOwn(placeNames, destination)) return;
  place = destination;
  clearPanel();
  notice = nextNotice;
  render();
  focusPlace();
}

function openPanel(key, target, opener) {
  const fromHelp = panel === 'help';
  panel = key;
  panelTarget = target ?? null;
  panelTrigger = opener;
  notice = '';
  if (key === 'story') {
    storyFromHelp = fromHelp;
    storyWeek = Number(opener.dataset.storyWeek ?? state.week);
    seenStories.add(storyWeek);
  }
  render();
  if (!ui.panel.hidden) focus(ui.panelTitle);
}

function closePanel() {
  if (panel === 'story' && storyFromHelp) {
    openPanel('help', null, ui.help);
    focus(ui.panelBody.querySelector(`[data-story-week="${storyWeek}"]`));
    return;
  }
  const opener = panelTrigger;
  clearPanel();
  notice = '';
  render();
  focus(opener?.isConnected ? opener : ui.sceneTitle);
}

function replay() {
  chores.reset();
  state = createFarm();
  selectedPlot = null;
  storyWeek = null;
  seenStories = new Set();
  recentAction = null;
  previousPlace = 'pasture';
  goTo('pasture');
}

function applyAction(button) {
  const { action, target, quantity, quantityFrom, source, week, expectedPigs } = button.dataset;
  if (action === 'replay') {
    replay();
    return;
  }
  if (action === 'end-week' && place !== 'office') return;
  const input = quantityFrom && document.getElementById(quantityFrom);
  const amount = input ? input.valueAsNumber : quantity === undefined ? undefined : Number(quantity);
  const result = applyFarmAction(state, {
    type: action, id: target, quantity: amount,
    source, week: week === undefined ? state.week : Number(week),
    expectedPigs: expectedPigs === undefined ? undefined : Number(expectedPigs),
    allowShortfall: button.hasAttribute('data-allow-shortfall')
  });
  if (result.error) {
    notice = result.error;
    render();
    return;
  }
  const previous = state;
  state = result.state;
  recentAction = { type: action, id: target };
  clearPanel();
  notice = previous.ledger.length !== state.ledger.length ? state.ledger.at(-1).label : '';
  if (action === 'buy-starters') {
    selectedPlot = target;
    goTo('pasture');
    return;
  }
  if (action === 'end-week') {
    recentAction = null;
    if (!state.result) {
      goTo('barn', `Week ${previous.week} closed. Debbie posted the ${formatCash(-state.ledger.at(-1).amount)} bill.`);
      return;
    }
    panel = 'recap';
  }
  render();
  if (!ui.panel.hidden) focus(ui.panelTitle);
  else focus(ui.controls.querySelector('button:not(:disabled)') ?? ui.sceneTitle);
}

function routeAction(type, target) {
  if (type === 'start-route' || type === 'refill-route') {
    const reservation = applyFarmAction(state, { type: 'reserve-litter', refill: type === 'refill-route' });
    if (reservation.error) {
      notice = reservation.error;
      render();
      return;
    }
    state = reservation.state;
    goTo('route');
    chores.routeAction('prepare-route');
    focusPlace();
    return;
  }
  if (chores.routeAction(type, Number(target)) && type !== 'route-lane') focusPlace();
}

function exitGame() {
  ui.player.close();
  render();
  focus(ui.launcher);
  window.scrollBy({ top: ui.launcher.getBoundingClientRect().top - launcherTop, behavior: 'instant' });
}

root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button?.isConnected || button.disabled) return;
  const { place: destination, open, selectPlot, action, localAction, target } = button.dataset;
  if (button === ui.launcher) {
    launcherTop = ui.launcher.getBoundingClientRect().top;
    ui.introPortrait.loading = 'eager';
    ui.player.showModal();
    render();
    if (!ui.intro.hidden) focus(ui.introTitle);
    else if (!ui.panel.hidden) focus(ui.panelTitle);
    else focusPlace();
  } else if (button === ui.exit) {
    exitGame();
  } else if (button === ui.introSkip) {
    beginPlay();
  } else if (button === ui.introNext) {
    if (prologuePage === prologue.length - 1) beginPlay();
    else {
      prologuePage += 1;
      renderIntro();
      focus(ui.introTitle);
    }
  } else if (destination) {
    if (selectPlot) selectedPlot = selectPlot;
    goTo(destination);
    if (open) openPanel(open, target, button);
  } else if (selectPlot) {
    selectedPlot = selectPlot;
    render();
    focus(ui.controls.querySelector('[data-action]'));
  } else if (open) {
    openPanel(open, target, button);
  } else if (button.hasAttribute('data-panel-close')) {
    closePanel();
  } else if (localAction) {
    routeAction(localAction, target);
  } else if (action) {
    applyAction(button);
  }
});

root.addEventListener('input', event => {
  if (event.target.matches('[data-commerce-quantity]')) updateCommercePreview(ui.panel, state);
});

ui.player.addEventListener('cancel', event => {
  event.preventDefault();
  if (!ui.panel.hidden) closePanel();
  else if (place === 'map') goTo('back');
  else exitGame();
});

ui.player.addEventListener('keydown', event => {
  if (place !== 'route' || panel || !['ArrowLeft', 'ArrowRight'].includes(event.key) || !chores.route) return;
  const shift = event.key === 'ArrowLeft' ? -1 : 1;
  const lane = Math.max(0, Math.min(2, chores.route.lane + shift));
  if (chores.routeAction('route-lane', lane)) {
    event.preventDefault();
    if (ui.controls.contains(document.activeElement)) focusPlace();
  }
});

document.addEventListener('visibilitychange', render);

function showIntroFallback() {
  ui.introPortrait.parentElement.dataset.missing = '';
  ui.introPortrait.hidden = true;
}

ui.introPortrait.addEventListener('error', showIntroFallback);
motion.addEventListener('change', render);
renderIntro();
if (ui.introPortrait.complete && !ui.introPortrait.naturalWidth) showIntroFallback();
render();
ui.launcher.hidden = false;
