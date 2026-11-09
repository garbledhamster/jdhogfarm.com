import { feedForecast, formatCash, GRAIN_BUNDLE, PADDOCK_FORAGE, RECOVERY_WEEKS, saleGroups } from './morning.mjs';
import { renderBarnArt, renderPigletArt, renderRouteArt } from './chores-art.mjs';

const groupName = group => group.id === 'litter' ? 'Piglets' : `Grower pen ${group.id}`;
const units = amount => `${amount} ${amount === 1 ? 'unit' : 'units'}`;
const age = weeks => `${weeks} fed ${weeks === 1 ? 'week' : 'weeks'}`;
const button = (label, attributes, primary = false) => `<button class="farm-small-button${primary ? ' farm-primary-action' : ''}" type="button" ${attributes}>${label}</button>`;
const controls = (name, content) => `<div class="farm-chore-controls farm-chore-controls--${name}">${content}</div>`;

export function renderFeedForecast(state, forecast = feedForecast(state), { focusable = false } = {}) {
  const heading = state.feeding ? 'Next morning' : 'This morning';
  const warning = forecast.shortfall ? ` <strong>Short by ${units(forecast.shortfall)}.</strong>` : '';
  return `<p class="farm-feed-forecast"${focusable ? ' tabindex="0"' : ''}><strong>${heading}</strong> · ${forecast.demand} to feed ·
    ${forecast.forage} from grass · ${forecast.grainAvailable} grain in the bin.${warning}</p>`;
}

export function renderFeedingGroups(feeding) {
  if (!feeding?.groups.length) return '';
  return `<ul class="farm-feeding-groups">${feeding.groups.map(group =>
    `<li><strong>${groupName(group)}</strong> · ${group.grew
      ? `grew to ${age(group.fedWeeksAfter)}.`
      : `held at ${age(group.fedWeeksAfter)}. Short by ${units(group.missing)}.`}</li>`
  ).join('')}</ul>`;
}

function showForecast(state) {
  if (state.feeding) return renderFeedingGroups(state.feeding) + renderFeedForecast(state, feedForecast(state, { next: true }));
  return renderFeedForecast(state);
}

function nextAfterFeed(state) {
  const saleMorning = (!state.sales.feeder && saleGroups(state, 'feeder').length) ||
    (!state.sales.market && saleGroups(state, 'market').length);
  return button(saleMorning ? 'Go to Orders' : 'Go to Office', `data-place="${saleMorning ? 'orders' : 'office'}"`, true);
}

function settleButton(label, source, forecast) {
  return forecast.shortfall
    ? button(label, `data-open="feed-shortfall-${source}"`, true)
    : button(label, `data-action="settle-feed" data-source="${source}"`, true);
}

function barnAction(state, route, forecast, orderFirst) {
  if (state.feeding) return nextAfterFeed(state);
  if (state.shipment) return '';
  if (state.week === 1 && !state.litterBorn) {
    return state.plots[0].status === 'fenced'
      ? button('Go to Farm Supply', 'data-place="supply"', true)
      : button('Go to Pasture', 'data-place="pasture"', true);
  }
  if (state.litter?.pigs) {
    if (state.bucket && forecast.litterGrain > state.bucket.amount) {
      return button('Refill bucket', 'data-local-action="refill-route"', !orderFirst);
    }
    if (route?.status === 'arrived') return button('Go to piglet pen', 'data-place="piglets"', !orderFirst);
    if (route) return button('Return to feed run', 'data-place="route"', !orderFirst);
    return button('Take bucket', 'data-local-action="start-route"', !orderFirst);
  }
  return settleButton(forecast.demand > forecast.forage ? 'Feed growers' : 'Finish feeding', 'barn', forecast);
}

function barnView(state, { deliveryStage, route }) {
  const forecast = feedForecast(state);
  const litterShort = !state.feeding && forecast.litterGrain < state.litter.pigs;
  const orderFirst = litterShort && state.cash >= GRAIN_BUNDLE.cost;
  const order = state.shipment ? '' : button('Order grain', 'data-open="grain-order"', orderFirst);
  let status = '';
  if (state.shipment) {
    status = deliveryStage === 'unloading' ? 'The truck is unloading.' : 'The grain truck is on its way.';
  } else if (litterShort) {
    status = orderFirst
      ? 'Order grain before taking the bucket. The piglets need a full share to grow.'
      : 'You’re short on cash for grain. You can take the bucket and feed what you have.';
  } else if (state.lastDelivery?.week === state.week && state.grain) {
    status = 'Grain ready.';
  } else if (!state.feeding && !state.litter?.pigs && forecast.demand && forecast.demand === forecast.forage) {
    status = 'The grass covers the growers this morning.';
  } else if (!state.feeding && state.litter?.pigs && !state.bucket) {
    status = 'Take the bucket to the piglets when you’re ready to feed.';
  }
  return {
    art: renderBarnArt(state.grain, deliveryStage),
    controls: controls('barn', order + barnAction(state, route, forecast, orderFirst)),
    details: (status ? `<p>${status}</p>` : '') + showForecast(state)
  };
}

const laneNames = ['Left', 'Middle', 'Right'];
const hazardNames = { rock: 'a rock', snake: 'a snake', 'moving-snake': 'a moving snake' };

function routeView({ route, motion }) {
  if (!route || route.status === 'arrived') {
    return {
      art: renderRouteArt(route, motion),
      controls: controls('route', button(route ? 'Go to piglet pen' : 'Go to Barn', `data-place="${route ? 'piglets' : 'barn'}"`, true)),
      details: `<p>${route ? 'The bucket made it across the creek.' : 'Pick up the feed bucket at the Barn first.'}</p>`
    };
  }

  const blocked = route.status === 'blocked';
  const laneButtons = laneNames.map((name, lane) => button(name,
    `aria-label="${name} lane" aria-pressed="${route.lane === lane}" data-local-action="route-lane" data-target="${lane}"` +
      (blocked || route.assisted ? ' disabled' : '')
  )).join('');
  const retry = blocked ? button('Retry route', 'data-local-action="retry-route"', true) : '';
  const assist = route.assisted ? '' : button('Walk with Joe', 'data-local-action="assist-route"');
  const snakeHint = route.obstacles.length > 1 ? ' Watch for snakes on the right.' : '';
  let prompt = `A rock blocks the middle.${snakeHint} Tap a lane or use the arrow keys.`;
  if (blocked) prompt = `You met ${hazardNames[route.hit]}. Retry or walk with Joe.`;
  else if (route.assisted) prompt = 'Joe is walking with you to the piglet pen.';
  return {
    art: renderRouteArt(route, motion),
    controls: controls('route', `<progress data-chore-progress max="100" value="${Math.floor(route.progress * 100)}" aria-label="Route progress"></progress>
      <div class="farm-route-lanes" role="group" aria-label="Choose a lane">${laneButtons}</div>
      <div class="farm-route-options">${retry}${assist}</div>`),
    details: `<p>${prompt}</p>`
  };
}

function pigletView(state, { route }) {
  const { litter, feeding, bucket, shipment } = state;
  const forecast = feedForecast(state);
  const bucketAtPen = Boolean(bucket && route?.status === 'arrived');
  const troughHasGrain = (feeding?.groups.find(group => group.id === 'litter')?.grain ?? 0) > 0;
  let action = button('Go to Barn', 'data-place="barn"', true);
  let status = 'Pick up the bucket at the Barn.';
  if (feeding) {
    const marketReady = saleGroups(state, 'market').some(group => group.id === litter.id);
    status = marketReady ? 'The litter is market ready. The butcher can pick up hogs today.'
      : 'You’ve finished feeding for this morning.';
    action = marketReady ? button('Go to Orders', 'data-place="orders"', true) : nextAfterFeed(state);
  } else if (!litter?.pigs) {
    status = 'The piglet pen is empty. You can finish feeding at the Barn.';
  } else if (shipment) {
    status = 'The grain truck is still unloading. Check the Barn before you feed.';
  } else if (bucketAtPen && bucket.amount < forecast.litterGrain) {
    status = 'There’s more grain in the bin now. Refill the bucket at the Barn before you pour.';
  } else if (bucketAtPen) {
    status = `The bucket reached the pen with ${units(bucket.amount)} of grain.`;
    action = settleButton('Pour feed', 'bucket', forecast);
  } else if (route) {
    status = 'Your bucket is on the path.';
    action = button('Return to feed run', 'data-place="route"', true);
  }
  return {
    art: renderPigletArt({ pigs: litter?.pigs ?? 0, fedWeeks: litter?.fedWeeks ?? 0, fed: troughHasGrain, bucketAtPen }),
    controls: controls('piglets', action),
    details: `<p>${status}</p>` + showForecast(state)
  };
}

export function renderChorePlace(place, state, context) {
  switch (place) {
    case 'barn': return barnView(state, context);
    case 'route': return routeView(context);
    case 'piglets': return pigletView(state, context);
    default: return null;
  }
}

function paddockDetail(plot) {
  switch (plot.status) {
    case 'active':
      return `${plot.productiveWeeks} productive ${plot.productiveWeeks === 1 ? 'morning' : 'mornings'} left`;
    case 'resting':
      return `Resting for ${RECOVERY_WEEKS - plot.restedWeeks} more ${RECOVERY_WEEKS - plot.restedWeeks === 1 ? 'week' : 'weeks'}`;
    case 'exhausted':
      return 'Grazed out. Rotate to fresh grass so this ground can rest.';
    default:
      return 'Ready to graze';
  }
}

export function renderPastureGate(state) {
  if (!state.litterBorn) return { controls: '', details: '' };
  const active = state.paddocks.find(plot => plot.status === 'active');
  return {
    controls: `<div class="farm-pasture-gate">${button('Pasture gate', 'data-open="pasture-gate"')}</div>`,
    details: `<p>${active ? `Paddock ${active.id} · ${paddockDetail(active)}.` : 'The main paddock is grazed out.'}</p>`
  };
}

function pastureDecision(state) {
  const body = `<p>Fresh grass covers up to ${PADDOCK_FORAGE} growers. Rotate for free and give the old ground ${RECOVERY_WEEKS} weeks to rest.</p>
    <ul class="farm-feeding-groups">${state.paddocks.map(plot =>
    `<li><strong>Paddock ${plot.id}</strong> · ${paddockDetail(plot)}.</li>`
  ).join('')}</ul>`;
  const actions = state.paddocks.filter(plot => plot.status === 'ready').map(plot =>
    button(`Open Paddock ${plot.id}`, `data-action="rotate" data-target="${plot.id}"`, true)
  ).join('');
  return { title: 'Pasture gate', body, actions };
}

function grainDecision(state) {
  const affordable = state.cash >= GRAIN_BUNDLE.cost;
  const price = formatCash(GRAIN_BUNDLE.cost);
  const body = `<p>A load of ${units(GRAIN_BUNDLE.units)} costs ${price}. The truck fills the bin this morning.</p>
    <p>${affordable ? `Cash after delivery: ${formatCash(state.cash - GRAIN_BUNDLE.cost)}.` : `You need ${price} to buy a load.`}</p>`;
  const actions = button('Confirm grain order', `data-action="order-grain"${affordable ? '' : ' disabled'}`, true);
  return { title: 'Order grain', body, actions };
}

function shortageDecision(source, state) {
  const forecast = feedForecast(state);
  const shortGroups = forecast.groups.filter(group => group.missing);
  const affected = shortGroups.map(group =>
    `<li>${groupName(group)} · short by ${units(group.missing)}</li>`
  ).join('');
  const body = `<p>We’re short by ${units(forecast.shortfall)}. A group needs its full share to grow.</p>
    <ul class="farm-feeding-groups">${affected}</ul>`;
  const canOrder = state.cash >= GRAIN_BUNDLE.cost;
  const growersShort = shortGroups.some(group => group.id !== 'litter');
  const rotationHelps = growersShort && !state.paddocks.some(plot => plot.status === 'active')
    && state.paddocks.some(plot => plot.status === 'ready');
  const grain = source === 'barn'
    ? button('Order more grain', 'data-open="grain-order"', canOrder)
    : button('Back to Barn', 'data-place="barn"', canOrder);
  const pasture = growersShort ? button('Check pasture', 'data-place="pasture"', !canOrder && rotationHelps) : '';
  const actions = grain + pasture + button('Feed what you can',
    `data-action="settle-feed" data-source="${source}" data-allow-shortfall`, !canOrder && !rotationHelps);
  return { title: 'Feed shortfall', body, actions };
}

export function renderChoreDecision(panel, state) {
  switch (panel) {
    case 'pasture-gate': return pastureDecision(state);
    case 'grain-order': return grainDecision(state);
    case 'feed-shortfall-bucket': return shortageDecision('bucket', state);
    case 'feed-shortfall-barn': return shortageDecision('barn', state);
    default: return null;
  }
}
