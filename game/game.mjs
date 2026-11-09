import { applyFarmAction, createFarm } from './morning.mjs';
import { placeNames, prologue, renderDecision, renderPlace } from './morning-view.mjs';

const root = document.getElementById('farm-game');
const select = selector => root.querySelector(selector);
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
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
  details: select('.farm-scene'),
  panel: select('.farm-panel'),
  panelTitle: select('#farm-panel-title'),
  panelBody: select('.farm-panel-body'),
  panelActions: select('.farm-decision-actions'),
  notice: select('#farm-notice'),
  stats: Object.fromEntries([...root.querySelectorAll('[data-stat]')].map(node => [node.dataset.stat, node]))
};

let state = createFarm();
let place = 'pasture';
let previousPlace = place;
let selectedPlot = null;
let panel = null;
let panelTrigger = null;
let prologuePage = 0;
let launcherTop;
let notice = '';

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function setMarkup(node, markup = '') {
  if (markupByRegion.get(node) === markup) return;
  // The views provide game-owned text, asset paths, and numeric session values.
  node.innerHTML = markup;
  markupByRegion.set(node, markup);
}

function focus(node) {
  node?.focus({ preventScroll: true });
}

function render() {
  const context = { previousPlace, selectedPlot, panel, motion: motion.matches };
  const view = renderPlace(place, state, context);
  const decision = panel && renderDecision(panel, state, context);
  setText(ui.stats.week, `Week ${state.week} of 6`);
  setText(ui.stats.cash, dollars.format(state.cash));
  setText(ui.stats.grain, String(state.grain));
  setText(ui.stats.herd, String((state.groups ?? []).reduce((total, group) => total + group.pigs, 0)));
  setText(ui.sceneTitle, placeNames[place]);
  setText(ui.notice, notice);
  ui.map.setAttribute('aria-pressed', String(place === 'map'));
  ui.stage.dataset.view = place;
  setMarkup(ui.art, view.art);
  setMarkup(ui.controls, view.controls);
  setMarkup(ui.details, view.details);
  ui.field.inert = Boolean(decision);
  ui.panel.hidden = !decision;
  if (decision) {
    setText(ui.panelTitle, decision.title);
    setMarkup(ui.panelBody, decision.body);
    setMarkup(ui.panelActions, decision.actions);
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
  focus(ui.sceneTitle);
}

function goTo(destination) {
  if (destination === 'map') {
    if (place === 'map') destination = previousPlace;
    else previousPlace = place;
  } else if (destination === 'back') {
    destination = previousPlace;
  }
  if (!Object.hasOwn(placeNames, destination)) return;
  place = destination;
  panel = null;
  panelTrigger = null;
  notice = '';
  render();
  focus(ui.sceneTitle);
}

function closePanel() {
  const opener = panelTrigger;
  panel = null;
  panelTrigger = null;
  notice = '';
  render();
  focus(opener?.isConnected ? opener : ui.sceneTitle);
}

function applyAction(button) {
  const { action, target, quantity, quantityFrom } = button.dataset;
  const input = quantityFrom && document.getElementById(quantityFrom);
  const result = applyFarmAction(state, { type: action, id: target, quantity: Number(input ? input.value : quantity) });
  state = result.state;
  notice = result.error ?? '';
  if (!result.error) {
    panel = null;
    panelTrigger = null;
  }
  render();
  if (!result.error) {
    const replacement = ui.controls.querySelector('button:not(:disabled)');
    focus(replacement ?? ui.sceneTitle);
  }
}

function exitGame() {
  ui.player.close();
  focus(ui.launcher);
  window.scrollBy({ top: ui.launcher.getBoundingClientRect().top - launcherTop, behavior: 'instant' });
}

root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button?.isConnected || button.disabled) return;
  const { place: destination, open, selectPlot, action } = button.dataset;
  if (button === ui.launcher) {
    launcherTop = ui.launcher.getBoundingClientRect().top;
    ui.introPortrait.loading = 'eager';
    ui.player.showModal();
    focus(!ui.intro.hidden ? ui.introTitle : ui.panel.hidden ? ui.sceneTitle : ui.panelTitle);
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
    goTo(destination);
  } else if (selectPlot) {
    selectedPlot = selectPlot;
    render();
    focus(ui.controls.querySelector('[data-action]'));
  } else if (open) {
    panel = open;
    panelTrigger = button;
    notice = '';
    render();
    if (!ui.panel.hidden) focus(ui.panelTitle);
  } else if (button.hasAttribute('data-panel-close')) {
    closePanel();
  } else if (action) {
    applyAction(button);
  }
});

ui.player.addEventListener('cancel', event => {
  event.preventDefault();
  if (place === 'map') goTo('back');
  else if (ui.panel.hidden) exitGame();
  else closePanel();
});

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
