import {
  applyFarmAction, eligibleForOrder, farmActionError, farmView, FEED_BUNDLE, formatCash, OVERHEAD, PADDOCK_COST,
  PADDOCK_FORAGE, PIG_PAIR, PRODUCTIVE_WEEKS, RECOVERY_WEEKS, SEASON_WEEKS
} from './farm.mjs';

const pigArt = new URL('./art/pig.svg', import.meta.url).href;
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

function herdArt(state, position) {
  if (!position || !state.cohorts.length) return '';

  const herd = state.cohorts.flatMap(cohort => Array.from({ length: cohort.pigs }, () => cohort.fedWeeks)).slice(0, 8);
  return `<div class="farm-herd-art farm-herd-art--${position}" aria-hidden="true">
    ${herd.map(age => `<img class="farm-pig-art" data-growth="${age >= 4 ? 'mature' : age >= 2 ? 'feeder' : 'young'}"
      src="${pigArt}" width="164" height="105" alt="">`).join('')}
  </div>`;
}

export function renderHotspots(scene, state, view) {
  switch (scene) {
    case 'pasture': {
      const active = state.paddocks.find(plot => plot.status === 'active');
      const pigs = herdArt(state, active?.id.toLowerCase());
      return pigs + state.paddocks.map(plot => objectButton(
        `Paddock ${plot.id}`, `paddock-${plot.id}`, plot.id.toLowerCase(),
        labels[plot.status], plot.status
      )).join('');
    }
    case 'barn':
      return herdArt(state, 'barn')
        + objectButton('Herd', 'herd', 'herd', pigCount(view.herd))
        + objectButton('Feed bin', 'feed', 'feed', `${unitCount(state.feed)} stored`);
    case 'orders':
      return state.orders.map(order => objectButton(
        order.label, `order-${order.id}`, order.id === 'A' ? 'pickup' : 'delivery',
        orderStatus(order, state, view), order.status
      )).join('');
    case 'office':
      return objectButton('Ledger', 'ledger', 'ledger', `${formatCash(state.cash)} balance`);
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
      markup = `<div class="farm-scene-columns">${state.paddocks.map(plot => `
        <div class="farm-scene-column">
          <h3>Paddock ${plot.id} <span class="farm-condition" data-condition="${plot.status}">${labels[plot.status]}</span></h3>
          <p>${plotDetail(plot)}. ${plot.status === 'active' && !state.result ? `${PADDOCK_FORAGE} forage this week.` : ''}</p>
        </div>`).join('')}</div>`;
      break;
    case 'barn':
      markup = `<h3>This week’s feed outlook</h3>
        <p>${state.result ? 'The season has ended.' : forecastText(view)}</p>
        ${renderCohorts(state)}`;
      break;
    case 'orders':
      markup = `<h3>Fictional orders</h3>
        <div class="farm-scene-columns">${state.orders.map(order => `
        <div class="farm-scene-column">
          <h3>${order.label}</h3>
          ${orderFacts(order, state, view)}
        </div>`).join('')}</div>`;
      break;
    case 'office':
      markup = `<h3>Farm office</h3>
        ${officePlan(state, view)}`;
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
  return `${error ? `<p class="farm-action-reason">${error}</p>` : ''}
    <div class="farm-decision-actions">
      <button class="farm-small-button farm-primary-action" type="button" data-action="${type}" data-target="${id}"${error ? ' disabled' : ''}>${label}</button>
      <button class="farm-small-button" type="button" data-panel-close>Cancel</button>
    </div>`;
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
  if (plot.status === 'ready') {
    const active = state.paddocks.find(candidate => candidate.status === 'active');
    decision = `<p>Pay ${formatCash(PADDOCK_COST)} to get ${PADDOCK_FORAGE} forage units a week for ${weekCount(PRODUCTIVE_WEEKS)}.
      ${active ? `Paddock ${active.id} will start resting.` : ''}</p>
      ${mutation(state, 'activate', 'Activate paddock', id)}`;
  } else if (plot.status === 'active' || plot.status === 'exhausted') {
    decision = `<p>Rest this paddock for ${weekCount(RECOVERY_WEEKS)} at no cost.
      ${plot.status === 'active' ? 'It will stop supplying forage when you confirm.' : ''}</p>
      ${mutation(state, 'rest', 'Rest paddock', id)}`;
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
      ${decision}`
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
    body: `${officePlan(state, view)}
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
    body: `<p class="farm-outcome" data-outcome="${state.result}"><strong>${outcome}</strong></p>
      <dl class="farm-ledger-summary">
        <dt>Closing cash</dt><dd><strong>${formatCash(state.cash)}</strong></dd>
        ${state.orders.map(order => `<dt>${order.label}</dt><dd>${order.status === 'open' ? 'Open when the season ended' : labels[order.status]}</dd>`).join('')}
        <dt>Supplemental feed</dt><dd>${unitCount(state.feed)}</dd>
      </dl>
      ${state.result !== 'won' && warnings.length ? `<h4>What happened</h4>${eventList(warnings)}` : ''}
      <div class="farm-decision-actions">
        <button class="farm-small-button farm-primary-action" type="button" data-action="restart">Restart season</button>
      </div>`
  };
}

export function renderPanel(panel, state, view) {
  if (panel.startsWith('paddock-')) return paddockPanel(state, panel.at(-1), view);
  if (panel.startsWith('order-')) {
    const order = state.orders.find(candidate => candidate.id === panel.at(-1));
    if (!order) return null;
    return {
      title: order.label,
      body: `${orderFacts(order, state, view)}
        <p>Confirm the fictional handoff to remove ${pigCount(order.quantity)} and receive ${formatCash(order.payment)}.</p>
        ${mutation(state, 'fulfill', order.id === 'A' ? 'Confirm pickup' : 'Confirm delivery', order.id)}`
    };
  }

  switch (panel) {
    case 'feed':
      return {
        title: 'Feed bin',
        body: `<p><strong>${unitCount(state.feed)} in storage</strong></p>
          <p>${state.result ? 'The season has ended.' : forecastText(view)}</p>
          <p>Pay ${formatCash(FEED_BUNDLE.cost)} to add ${unitCount(FEED_BUNDLE.units)} of supplemental feed.</p>
          ${purchaseProjection(state, 'buy-feed')}
          ${mutation(state, 'buy-feed', 'Buy feed')}`
      };
    case 'herd':
      return {
        title: 'Herd',
        body: `${renderCohorts(state)}
          <p>A fully fed week adds one week of growth. Feeders need two fed weeks and whole hogs need four.</p>
          ${state.result ? '' : `<div class="farm-decision-actions">
            <button class="farm-small-button farm-primary-action" type="button" data-panel="buy-pigs">Buy pigs</button>
          </div>`}`
      };
    case 'buy-pigs':
      return {
        title: 'Buy pigs',
        body: `<p>Pay ${formatCash(PIG_PAIR.cost)} for ${pigCount(PIG_PAIR.pigs)} at zero fed weeks.
          They will need ${unitCount(PIG_PAIR.pigs)} more feed each week.</p>
          ${purchaseProjection(state, 'buy-pigs')}
          ${mutation(state, 'buy-pigs', 'Buy pigs')}`
      };
    case 'ledger':
      return ledgerPanel(state, view);
    case 'recap':
      return recapPanel(state);
    default:
      return null;
  }
}
