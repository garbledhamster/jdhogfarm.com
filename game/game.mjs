import * as farm from './farm.mjs';
import { createClock } from './clock.mjs';
import { chapterFor, nextChore, prologue } from './story.mjs';
import { renderHotspots, renderPanel, renderScene, renderWarnings } from './season-view.mjs';

const markupByRegion = new WeakMap();
const root = document.getElementById('farm-game');
const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const select = selector => root.querySelector(selector);
const ui = {
  player: select('.farm-player'),
  launcher: select('.farm-launch button'),
  exit: select('.farm-exit'),
  talk: select('.farm-talk'),
  help: select('.farm-help'),
  endWeek: select('.farm-end-week'),
  interface: select('.farm-interface'),
  intro: select('.farm-prologue'),
  introPortrait: select('.farm-prologue-portrait img'),
  introSpeaker: select('.farm-prologue-speaker'),
  introStep: select('.farm-prologue-step'),
  introTitle: select('.farm-prologue-title'),
  introText: select('.farm-prologue-text'),
  introNext: select('.farm-prologue-next'),
  introSkip: select('.farm-prologue-skip'),
  coach: select('.farm-coach span'),
  coachSpeaker: select('.farm-coach strong'),
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
  countdown: select('.farm-countdown'),
  countdownValue: select('.farm-countdown strong'),
  scenes: [...root.querySelectorAll('[data-scene]')],
  speed: select('.farm-speed'),
  speedValue: select('.farm-speed-value'),
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
let prologuePage = 0;
let readStoryWeek = 0;
let stories = {};
let storyWeek = null;
let storyFromHelp = false;
let weekResult = null;
let settling = false;
let inspectedFirstPaddock = false;

const clock = createClock(() => {
  settleWeek('clock');
  return false;
});

function settleWeek(source = 'manual') {
  if (settling || state.result || panel || !ui.player.open || ui.interface.hidden) return;
  settling = true;
  clock.clearProgress();
  const week = state.completedWeeks + 1;
  const forecast = farm.farmView(state).forecast;
  const previousEventCount = state.events.length;
  state = farm.tickFarm(state);
  latestEvents = state.events.slice(previousEventCount);
  weekResult = { week, forecast, source, events: latestEvents, orders: state.orders.map(order => ({ ...order })) };
  feedback = null;
  panel = 'week-result';
  panelTrigger = null;
  render();
  focusPanel();
  settling = false;
}

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
  const seconds = Math.ceil((1 - clock.progress()) * farm.WEEK_MS / clock.speed / 1000);
  setText(ui.countdownValue, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
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
  setText(ui.time, clock.running ? 'Pause' : started ? 'Resume' : 'Start clock');
  setText(ui.clockState, state.result ? 'Season ended' : clock.running ? 'Running' : started ? 'Paused' : 'Manual');
  ui.time.disabled = Boolean(state.result || panel);
  ui.endWeek.disabled = Boolean(state.result || panel);
  ui.speed.disabled = Boolean(state.result);
  ui.speed.value = String(clock.speed);
  ui.speed.setAttribute('aria-valuetext', `${clock.speed} times speed`);
  setText(ui.speedValue, `${clock.speed}×`);
  ui.countdown.hidden = !started || Boolean(state.result);
  ui.progress.hidden = !started;
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
    button.querySelector('.farm-place-badge').classList.toggle('is-visible', Boolean(alerts[place]));
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
  const notice = feedback?.message ?? messages;
  setText(ui.notice, notice);
  ui.notice.hidden = !notice;
  setText(ui.panelFeedback, feedback?.kind === 'warning' && panel ? feedback.message : '');
  ui.panelFeedback.hidden = !ui.panelFeedback.textContent;
}

function render() {
  const view = farm.farmView(state);
  const unreadStory = !state.result && view.week !== readStoryWeek;
  ui.talk.toggleAttribute('data-unread', unreadStory);
  if (unreadStory) ui.talk.setAttribute('aria-description', `New dialogue for Week ${view.week}`);
  else ui.talk.removeAttribute('aria-description');
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
  setText(ui.coachSpeaker, scene === 'office' ? 'Debbie' : 'Joe');
  setText(ui.coach, nextChore(scene, state, view, inspectedFirstPaddock));
  setMarkup(ui.warnings, renderWarnings(state, view));
  ui.art.dataset.view = scene;
  const selectedPlace = ui.scenes.find(button => button.dataset.scene === scene);
  setMarkup(ui.hotspots, renderHotspots(scene, state, view, motion.matches), selectedPlace);
  for (const hotspot of ui.hotspots.querySelectorAll('[data-panel]')) {
    hotspot.setAttribute('aria-expanded', String(hotspot.dataset.panel === panel));
  }
  setMarkup(ui.scene, renderScene(scene, state, view), selectedPlace);

  const details = panel && renderPanel(panel, state, view, { weekResult, scene, stories, storyWeek });
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
  if (panel === 'week-result') { continueWeek(); return; }
  if (panel === 'story' && storyFromHelp) {
    storyFromHelp = false;
    panel = 'help';
    render();
    (ui.panelBody.querySelector(`[data-story-week="${storyWeek}"]`) ?? ui.panelTitle).focus({ preventScroll: true });
    return;
  }
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

function continueWeek() {
  panel = state.result ? 'recap' : null;
  weekResult = null;
  panelTrigger = null;
  render();
  if (panel) focusPanel();
  else ui.endWeek.focus({ preventScroll: true });
}

function toggleClock() {
  if (state.result || document.hidden || panel) return;
  if (clock.running) {
    clock.pause();
    feedback = { message: 'Season paused. You can still make farm decisions.', kind: 'info' };
  } else {
    started = true;
    clock.play();
    feedback = { message: 'Season running.', kind: 'info' };
  }
  render();
}

function restart() {
  clock.reset();
  readStoryWeek = 0;
  stories = {};
  storyWeek = null;
  storyFromHelp = false;
  weekResult = null;
  inspectedFirstPaddock = false;
  state = farm.createFarm();
  scene = 'pasture';
  panel = null;
  panelTrigger = null;
  feedback = null;
  latestEvents = [];
  started = false;
  render();
  ui.endWeek.focus({ preventScroll: true });
}

function renderIntro() {
  const page = prologue[prologuePage];
  const portrait = `game/art/${page.art}.webp`;
  ui.intro.dataset.frame = page.art;
  if (ui.introPortrait.getAttribute('src') !== portrait) {
    const frame = ui.introPortrait.parentElement;
    delete frame.dataset.missing;
    frame.dataset.loading = '';
    ui.introPortrait.hidden = false;
    ui.introPortrait.setAttribute('src', portrait);
  }
  ui.introPortrait.alt = page.alt;
  setText(ui.introSpeaker, page.speaker);
  setText(ui.introStep, `${prologuePage + 1} of ${prologue.length}`);
  setText(ui.introTitle, page.title);
  setText(ui.introText, `“${page.text}”`);
  ui.introText.scrollTop = 0;
  setText(ui.introNext, prologuePage === prologue.length - 1 ? 'Go to Pasture' : 'Continue');
}

function beginPlay() {
  ui.intro.hidden = true;
  ui.interface.hidden = false;
  ui.talk.hidden = false;
  ui.help.hidden = false;
  ui.endWeek.focus({ preventScroll: true });
}

root.addEventListener('click', event => {
  const object = event.target.closest('[data-scene-object]');
  const button = event.target.closest('button') ?? (object
    ? root.querySelector(`[data-panel="${CSS.escape(object.dataset.sceneObject)}"]`)
    : null);
  if (!button || button.disabled) return;
  if (panel === 'week-result' && button !== ui.exit && !button.hasAttribute('data-panel-close') && button.dataset.action !== 'continue-week') return;
  ui.notice.removeAttribute('data-feedback');
  const { scene: place, panel: panelId, action, target, storyWeek: selectedStory } = button.dataset;
  if (button === ui.launcher) {
    launcherTop = ui.launcher.getBoundingClientRect().top;
    ui.player.showModal();
    if (!ui.intro.hidden) {
      ui.introPortrait.loading = 'eager';
      ui.introTitle.focus({ preventScroll: true });
    }
    else if (!ui.panel.hidden) focusPanel();
    else (ui.endWeek.disabled ? ui.exit : ui.endWeek).focus({ preventScroll: true });
  } else if (button === ui.introSkip) {
    beginPlay();
  } else if (button === ui.introNext) {
    if (prologuePage === prologue.length - 1) beginPlay();
    else {
      prologuePage += 1;
      renderIntro();
      ui.introTitle.focus({ preventScroll: true });
    }
  } else if (button === ui.exit) {
    exitGame();
  } else if (button === ui.time) {
    toggleClock();
  } else if (button === ui.endWeek) {
    settleWeek();
  } else if (selectedStory) {
    storyWeek = Number(selectedStory);
    storyFromHelp = true;
    panel = 'story';
    render();
    focusPanel();
  } else if (place) {
    scene = place;
    panel = null;
    panelTrigger = null;
    if (feedback?.kind === 'warning') feedback = null;
    render();
  } else if (panelId) {
    panel = panelId;
    if (panelId === 'paddock-A' && state.completedWeeks === 0) inspectedFirstPaddock = true;
    if (clock.running) {
      clock.pause();
      feedback = { message: 'The clock is paused. Select Resume when you’re ready.', kind: 'info' };
    }
    if (panelId === 'story') {
      storyFromHelp = false;
      storyWeek = farm.farmView(state).week;
      readStoryWeek = storyWeek;
      stories[storyWeek] = chapterFor(storyWeek, state);
    }
    if (!ui.panel.contains(button)) {
      const region = ui.hotspots.contains(button) ? ui.hotspots : ui.scene;
      panelTrigger = { element: button, key: controlKey(button), region };
    }
    if (feedback?.kind === 'warning') feedback = null;
    render();
    if (!ui.panel.hidden) focusPanel();
  } else if (button.hasAttribute('data-panel-close')) {
    closePanel();
  } else if (action === 'continue-week') {
    continueWeek();
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

ui.speed.addEventListener('input', () => {
  clock.setSpeed(Number(ui.speed.value));
  renderClock();
});
function showIntroFallback() {
  const frame = ui.introPortrait.parentElement;
  delete frame.dataset.loading;
  frame.dataset.missing = '';
  ui.introPortrait.hidden = true;
}

ui.introPortrait.addEventListener('load', () => { delete ui.introPortrait.parentElement.dataset.loading; });
ui.introPortrait.addEventListener('error', showIntroFallback);
motion.addEventListener('change', render);
renderIntro();
if (ui.introPortrait.complete && !ui.introPortrait.naturalWidth) showIntroFallback();
render();
ui.launcher.hidden = false;
