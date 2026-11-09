import {
  applyFarmAction, eligibleForOrder, farmActionError, farmView, FEED_BUNDLE, formatCash, OVERHEAD, PADDOCK_COST,
  PADDOCK_FORAGE, PIG_PAIR, PRODUCTIVE_WEEKS, RECOVERY_WEEKS, SEASON_WEEKS
} from './farm.mjs';
import { chapterFor, seasonLines } from './story.mjs';

const pigStill = new URL('./art/pig.svg', import.meta.url).href;
const pigMotion = new URL('./art/pig-motion.svg', import.meta.url).href;

// Ground points are in the 1200 × 530 illustrations' coordinate space.
const pigSpots = {
  a: [[278, 356, 1], [358, 294, -1], [432, 343, 1], [505, 277, -1],
    [278, 303, -1], [353, 354, 1], [432, 287, 1], [507, 332, -1]],
  b: [[657, 340, 1], [733, 279, -1], [810, 339, 1], [885, 260, -1],
    [657, 282, -1], [735, 358, -1], [808, 267, 1], [886, 322, -1]],
  barn: [[326, 379, 1], [424, 338, -1], [526, 373, 1], [622, 330, -1],
    [327, 344, -1], [426, 382, -1], [525, 334, 1], [623, 366, -1]]
};
const labels = {
  active: 'Active',
  exhausted: 'Exhausted',
  resting: 'Resting',
  ready: 'Ready',
  open: 'Open',
  fulfilled: 'Fulfilled',
  missed: 'Missed'
};

const weekCount = count => `${count} ${count === 1 ? 'week' : 'weeks'}`;
const pigCount = count => `${count} ${count === 1 ? 'pig' : 'pigs'}`;
const unitCount = count => `${count} ${count === 1 ? 'unit' : 'units'}`;
const fedWeeks = count => `${count} fed ${count === 1 ? 'week' : 'weeks'}`;

function objectButton(label, panel, position, detail, status = '') {
  return `<button class="farm-object farm-object--${position}" type="button" data-panel="${panel}"
    data-condition="${status}" aria-haspopup="dialog" aria-label="${label}" aria-description="${detail}">
    <strong>${label}</strong><span>${detail}</span>
  </button>`;
}

function plotDetail(plot) {
  switch (plot.status) {
    case 'active': return `${weekCount(plot.productiveWeeks)} of forage left`;
    case 'resting': return `${weekCount(RECOVERY_WEEKS - plot.restedWeeks)} of rest left`;
    case 'exhausted': return 'Rest this paddock to restore its forage';
    default: return `Activate for ${formatCash(PADDOCK_COST)}`;
  }
}

function orderStatus(order, state, view) {
  if (order.status !== 'open') return labels[order.status];
  return !state.result && order.deadline === view.week ? 'Open · due this week' : 'Open';
}

function maturity(fed) {
  if (fed >= 4) return 'Whole hog and feeder eligible';
  if (fed >= 2) return 'Feeder eligible';
  return 'Growing';
}

function herdArt(state, position, animate) {
  const spots = pigSpots[position];
  if (!spots || !state.cohorts.length) return '';

  const target = position === 'barn' ? 'herd' : `paddock-${position.toUpperCase()}`;
  const pigArt = animate ? pigMotion : pigStill;

  const ages = state.cohorts.flatMap(cohort => Array.from({ length: cohort.pigs }, () => cohort.fedWeeks));
  const pigs = ages.slice(0, spots.length)
    .map((age, index) => ({ age, spot: spots[index] }))
    .sort((a, b) => a.spot[1] - b.spot[1]);
  return `<svg class="farm-herd-art" viewBox="0 0 1200 530" aria-hidden="true">
    ${pigs.map(({ age, spot: [x, y, facing] }) => {
      const width = age >= 4 ? 76 : age >= 2 ? 66 : 56;
      const height = width * 105 / 164;
      const flip = facing < 0 ? ` transform="translate(${x * 2} 0) scale(-1 1)"` : '';
      return `<image class="farm-pig-art" data-scene-object="${target}" href="${pigArt}" x="${x - width / 2}" y="${y - height * 94 / 105}"
        width="${width}" height="${height}"${flip}></image>`;
    }).join('')}
  </svg>`;
}

function personArt(name, action, x, y, width, height) {
  return `<svg class="farm-herd-art" viewBox="0 0 1200 530" aria-hidden="true">
    <image class="farm-character-art" data-scene-object="${action}" href="game/art/${name}-avatar.webp"
      x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMax meet"></image>
  </svg>`;
}

function speakerLine(name, copy) {
  const person = name.toLowerCase();
  return `<div class="farm-speaker-line">
    <img src="game/art/${person}-portrait.webp" alt="" width="640" height="512">
    <p><strong>${name}</strong> ${copy}</p>
  </div>`;
}

export function renderHotspots(scene, state, view, animate) {
  switch (scene) {
    case 'pasture': {
      const active = state.paddocks.find(plot => plot.status === 'active');
      const pigs = herdArt(state, active?.id.toLowerCase(), animate);
      return pigs + personArt('joe', 'story', 35, 310, 165, 206) + state.paddocks.map(plot => objectButton(
        `Paddock ${plot.id}`, `paddock-${plot.id}`, plot.id.toLowerCase(),
        labels[plot.status], plot.status
      )).join('');
    }
    case 'barn':
      return herdArt(state, 'barn', animate)
        + objectButton('Herd', 'herd', 'herd', pigCount(view.herd))
        + objectButton('Feed bin', 'feed', 'feed', `${unitCount(state.feed)} stored`);
    case 'orders':
      return state.orders.map(order => objectButton(
        order.label, `order-${order.id}`, order.id === 'A' ? 'pickup' : 'delivery',
        orderStatus(order, state, view), order.status
      )).join('');
    case 'office':
      return personArt('debbie', 'ledger', 852, 300, 160, 200)
        + objectButton('Ledger', 'ledger', 'ledger', `${formatCash(state.cash)} balance`);
    default:
      return '';
  }
}

function forecastText(view) {
  const { demand, forage, supplemental, feedUsed, shortfall } = view.forecast;
  const supply = `${unitCount(demand)} needed, ${forage} from pasture, ${supplemental} in storage.`;
  if (shortfall) return `${supply} Short by ${unitCount(shortfall)}. No pigs will gain a fed week.`;
  if (!demand) return `${supply} The barn is empty.`;
  const plan = feedUsed ? `The herd will use ${unitCount(feedUsed)} from storage and gain a fed week.` : 'Pasture covers the herd. The pigs will gain a fed week.';
  return `${supply} ${plan}`;
}

function orderFacts(order, state, view) {
  return `<p>${order.route}. Due at the end of Week ${order.deadline}.</p>
    <p>Pays ${formatCash(order.payment)} for ${pigCount(order.quantity)} with ${fedWeeks(order.minFedWeeks)} or more.</p>
    <p><strong>${orderStatus(order, state, view)}</strong> · ${eligibleForOrder(state, order)} eligible in the herd</p>`;
}

function seasonRecapButton(state) {
  if (!state.result) return '';
  return '<p class="farm-scene-recap"><button class="farm-small-button" type="button" data-panel="recap" aria-haspopup="dialog">Season recap</button></p>';
}

export function renderScene(scene, state, view) {
  let markup = '';
  switch (scene) {
    case 'pasture':
      markup = `<dl class="farm-scene-columns farm-field-facts">${state.paddocks.map(plot => `
        <div class="farm-scene-column">
          <dt>Paddock ${plot.id}</dt><dd>${plotDetail(plot)}</dd>
        </div>`).join('')}</dl>`;
      break;
    case 'barn':
      markup = state.result ? '' : `<dl class="farm-ledger-summary farm-field-facts">
        <dt>Feed needed</dt><dd>${view.forecast.demand}</dd>
        <dt>From pasture</dt><dd>${view.forecast.forage}</dd>
        <dt>In storage</dt><dd>${state.feed}</dd>
      </dl>`;
      break;
    case 'orders':
      markup = `<dl class="farm-scene-columns farm-field-facts">${state.orders.map(order => `
        <div class="farm-scene-column">
          <dt>${order.label}</dt><dd>${orderStatus(order, state, view)} · Week ${order.deadline}</dd>
        </div>`).join('')}</dl>`;
      break;
    case 'office':
      markup = state.result ? '' : `<dl class="farm-ledger-summary farm-field-facts">
        <dt>Next bill</dt><dd>${formatCash(OVERHEAD)}</dd>
      </dl>`;
      break;
  }
  return markup + seasonRecapButton(state);
}

export function renderWarnings(state, view) {
  if (state.result) return '';

  const warnings = [];
  const active = state.paddocks.find(plot => plot.status === 'active');
  if (active?.productiveWeeks === 1) warnings.push('Pasture has one productive week left.');
  if (!active) warnings.push('No paddock is supplying forage.');
  if (view.forecast.shortfall) warnings.push(`Barn is short by ${unitCount(view.forecast.shortfall)} of feed this week.`);
  for (const order of state.orders) {
    if (order.status === 'open' && order.deadline === view.week) warnings.push(`Last week for ${order.label.toLowerCase()}.`);
  }
  if (state.cash <= OVERHEAD) warnings.push(`The next ${formatCash(OVERHEAD)} overhead charge would end the season.`);
  return warnings.length ? `<ul>${warnings.map(warning => `<li>${warning}</li>`).join('')}</ul>` : '';
}

function mutation(state, type, label, id = '') {
  const error = farmActionError(state, { type, id });
  return {
    reason: error ? `<p class="farm-action-reason">${error}</p>` : '',
    actions: `<button class="farm-small-button farm-primary-action" type="button" data-action="${type}" data-target="${id}"${error ? ' disabled' : ''}>${label}</button>
      <button class="farm-small-button" type="button" data-panel-close>Cancel</button>`
  };
}

function purchaseProjection(state, type) {
  const purchase = applyFarmAction(state, { type });
  if (purchase.error) return '';

  const projected = purchase.state;
  const view = farmView(projected);
  return `<section class="farm-purchase-projection" aria-labelledby="farm-projection-heading">
    <h4 id="farm-projection-heading">After purchase</h4>
    <p><strong>Balance ${formatCash(projected.cash)}</strong> · ${pigCount(view.herd)} · ${unitCount(projected.feed)} in storage</p>
    <p>${forecastText(view)}</p>
  </section>`;
}

function renderCohorts(state) {
  if (!state.cohorts.length) return '<p>No pigs in the herd.</p>';

  const groups = new Map();
  for (const cohort of state.cohorts) {
    groups.set(cohort.fedWeeks, (groups.get(cohort.fedWeeks) ?? 0) + cohort.pigs);
  }
  return `<ul class="farm-cohorts">${[...groups].sort((a, b) => b[0] - a[0]).map(([fed, pigs]) => `
    <li><strong>${pigCount(pigs)}</strong> at ${fedWeeks(fed)} · ${maturity(fed)}</li>`).join('')}</ul>`;
}

function paddockPanel(state, id, view) {
  const plot = state.paddocks.find(candidate => candidate.id === id);
  if (!plot) return null;

  let decision = '';
  let controls;
  if (plot.status === 'ready') {
    const active = state.paddocks.find(candidate => candidate.status === 'active');
    decision = `<p>Pay ${formatCash(PADDOCK_COST)} to get ${PADDOCK_FORAGE} forage units a week for ${weekCount(PRODUCTIVE_WEEKS)}.
      ${active ? `Paddock ${active.id} will start resting.` : ''}</p>`;
    controls = mutation(state, 'activate', 'Activate paddock', id);
  } else if (plot.status === 'active' || plot.status === 'exhausted') {
    decision = `<p>Rest this paddock for ${weekCount(RECOVERY_WEEKS)} at no cost.
      ${plot.status === 'active' ? 'It will stop supplying forage when you confirm.' : ''}</p>`;
    controls = mutation(state, 'rest', 'Rest paddock', id);
  } else {
    decision = `<p>It will be ready after ${weekCount(RECOVERY_WEEKS - plot.restedWeeks)} of rest.</p>`;
  }

  const forage = plot.status === 'active' ? PADDOCK_FORAGE : 0;
  const detail = {
    active: `${weekCount(plot.productiveWeeks)} of forage left`,
    exhausted: 'No forage left',
    resting: `${plot.restedWeeks} of ${RECOVERY_WEEKS} rest weeks completed`,
    ready: 'Available to activate'
  }[plot.status];
  return {
    title: `Paddock ${id}`,
    body: `<p><strong>${labels[plot.status]}</strong> · ${detail}</p>
      <p>${state.result ? 'The season has ended.' : `Covers ${Math.min(forage, view.herd)} of ${view.herd} pigs this week.`}</p>
      ${decision}${controls?.reason ?? ''}`,
    actions: controls?.actions
  };
}

function officePlan(state, view) {
  return `<p>Finish both orders and keep cash above ${formatCash(0)} at the end of Week ${SEASON_WEEKS}.</p>
    <dl class="farm-ledger-summary">
      <dt>${state.result ? 'Closing balance' : 'Next overhead'}</dt>
      <dd>${state.result ? formatCash(state.cash) : `${formatCash(OVERHEAD)} at the end of Week ${view.week}`}</dd>
      ${state.orders.map(order => `<dt>${order.label}</dt>
        <dd>${order.status === 'open' && !state.result ? `Due Week ${order.deadline}` : labels[order.status]}</dd>`).join('')}
    </dl>
    ${state.result ? '' : `<p><strong>Feed outlook</strong> · ${forecastText(view)}</p>`}`;
}

function eventList(events) {
  if (!events.length) return '<p>No events yet.</p>';
  return `<ol class="farm-event-list">${events.map(event => `
    <li data-tone="${event.kind}"><strong>Week ${event.week}</strong> · ${event.message}</li>`).join('')}</ol>`;
}

function ledgerPanel(state, view) {
  const entries = [...state.ledger].reverse();
  return {
    title: 'Farm ledger',
    body: `${speakerLine('Debbie', 'Here’s what’s come in and what’s gone out. Leave enough for the next bill before you buy anything.')}${officePlan(state, view)}
      <h4>Cash activity</h4>
      <ol class="farm-cash-list">${entries.map(entry => `
        <li><span><strong>Week ${entry.week}</strong> · ${entry.label}</span>
          <span class="farm-cash-amount">${entry.amount > 0 && entry.label !== 'Opening balance' ? '+' : ''}${formatCash(entry.amount)}</span>
          <small>Balance ${formatCash(entry.balance)}</small></li>`).join('')}
      </ol>
      <h4>Recent events</h4>
      ${eventList(state.events.slice(-8).reverse())}`
  };
}

function recapPanel(state) {
  if (!state.result) return null;

  const outcome = {
    won: 'You met your goal.',
    lost: 'You reached the end of the season with orders missed.',
    bankrupt: 'The farm went bankrupt.'
  }[state.result];
  const warnings = state.events.filter(event => event.kind === 'warning').slice(-5).reverse();
  return {
    title: 'Season recap',
    body: `${speakerLine('Joe', seasonLines[state.result])}<p class="farm-outcome" data-outcome="${state.result}"><strong>${outcome}</strong></p>
      <dl class="farm-ledger-summary">
        <dt>Closing cash</dt><dd><strong>${formatCash(state.cash)}</strong></dd>
        ${state.orders.map(order => `<dt>${order.label}</dt><dd>${order.status === 'open' ? 'Open when the season ended' : labels[order.status]}</dd>`).join('')}
        <dt>Supplemental feed</dt><dd>${unitCount(state.feed)}</dd>
      </dl>
      ${state.result !== 'won' && warnings.length ? `<h4>What happened</h4>${eventList(warnings)}` : ''}`,
    actions: '<button class="farm-small-button farm-primary-action" type="button" data-action="restart">Restart season</button>'
  };
}

export function renderPanel(panel, state, view) {
  if (panel.startsWith('paddock-')) return paddockPanel(state, panel.at(-1), view);
  if (panel.startsWith('order-')) {
    const order = state.orders.find(candidate => candidate.id === panel.at(-1));
    if (!order) return null;
    const controls = mutation(state, 'fulfill', order.id === 'A' ? 'Confirm pickup' : 'Confirm delivery', order.id);
    return {
      title: order.label,
      body: `${orderFacts(order, state, view)}
        <p>Confirm the fictional handoff to remove ${pigCount(order.quantity)} and receive ${formatCash(order.payment)}.</p>
        ${controls.reason}`,
      actions: controls.actions
    };
  }

  switch (panel) {
    case 'feed': {
      const controls = mutation(state, 'buy-feed', 'Buy feed');
      return {
        title: 'Feed bin',
        body: `<p>Pay ${formatCash(FEED_BUNDLE.cost)} to add ${unitCount(FEED_BUNDLE.units)} of supplemental feed.</p>
          <p><strong>${unitCount(state.feed)} in storage</strong></p>
          <p>${state.result ? 'The season has ended.' : forecastText(view)}</p>
          ${purchaseProjection(state, 'buy-feed')}${controls.reason}`,
        actions: controls.actions
      };
    }
    case 'herd':
      return {
        title: 'Herd',
        body: `${renderCohorts(state)}
          <p>A fully fed week adds one week of growth. Feeders need two fed weeks and whole hogs need four.</p>`,
        actions: state.result ? '' : '<button class="farm-small-button farm-primary-action" type="button" data-panel="buy-pigs">Buy pigs</button>'
      };
    case 'buy-pigs': {
      const controls = mutation(state, 'buy-pigs', 'Buy pigs');
      return {
        title: 'Buy pigs',
        body: `<p>Pay ${formatCash(PIG_PAIR.cost)} for ${pigCount(PIG_PAIR.pigs)} at zero fed weeks.
          They will need ${unitCount(PIG_PAIR.pigs)} more feed each week.</p>
          ${purchaseProjection(state, 'buy-pigs')}${controls.reason}`,
        actions: controls.actions
      };
    }
    case 'story': {
      const chapter = chapterFor(view.week);
      return {
        title: 'Joe’s story',
        body: `<h4>Week ${view.week} · ${chapter.title}</h4>
          ${speakerLine('Joe', chapter.text)}${speakerLine('Debbie', chapter.reply)}`
      };
    }
    case 'ledger':
      return ledgerPanel(state, view);
    case 'recap':
      return recapPanel(state);
    default:
      return null;
  }
}
