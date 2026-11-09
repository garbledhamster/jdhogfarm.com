export const WEEK_MS = 60_000;
export const SEASON_WEEKS = 6;
export const OVERHEAD = 80;
export const PADDOCK_COST = 50;
export const PADDOCK_FORAGE = 4;
export const PRODUCTIVE_WEEKS = 3;
export const RECOVERY_WEEKS = 2;
export const FEED_BUNDLE = { units: 4, cost: 100 };
export const PIG_PAIR = { pigs: 2, cost: 200 };

export function createFarm() {
  return {
    completedWeeks: 0,
    cash: 1000,
    feed: 1,
    cohorts: [{ id: 1, pigs: 4, fedWeeks: 0 }],
    paddocks: [
      { id: 'A', status: 'active', productiveWeeks: PRODUCTIVE_WEEKS, restedWeeks: 0 },
      { id: 'B', status: 'ready', productiveWeeks: 0, restedWeeks: 0 }
    ],
    orders: [
      { id: 'A', label: 'Feeder pickup', route: 'Pickup at the farm', quantity: 2, minFedWeeks: 2, payment: 400, deadline: 4, status: 'open' },
      { id: 'B', label: 'Whole-hog delivery', route: 'Delivery to a local butcher', quantity: 2, minFedWeeks: 4, payment: 450, deadline: 6, status: 'open' }
    ],
    ledger: [{ week: 1, label: 'Opening balance', amount: 1000, balance: 1000 }],
    events: [],
    result: null
  };
}

function eligiblePigs(cohorts, minFedWeeks) {
  return cohorts.reduce((count, cohort) => count + (cohort.fedWeeks >= minFedWeeks ? cohort.pigs : 0), 0);
}

export function eligibleForOrder(state, order) {
  return eligiblePigs(state.cohorts, order.minFedWeeks);
}

export function formatCash(cash) {
  const dollars = Math.abs(cash).toLocaleString('en-US');
  return `${cash < 0 ? '-' : ''}$${dollars}`;
}

function feedForecast(state) {
  const forage = state.paddocks.some(plot => plot.status === 'active' && plot.productiveWeeks > 0) ? PADDOCK_FORAGE : 0;
  const demand = eligiblePigs(state.cohorts, 0);
  const feedNeeded = Math.max(0, demand - forage);
  const feedUsed = Math.min(state.feed, feedNeeded);
  return { demand, forage, supplemental: state.feed, feedUsed, shortfall: feedNeeded - feedUsed };
}

export function farmView(state) {
  return {
    week: state.result ? state.completedWeeks : state.completedWeeks + 1,
    herd: eligiblePigs(state.cohorts, 0),
    feeders: eligiblePigs(state.cohorts, 2),
    whole: eligiblePigs(state.cohorts, 4),
    forecast: feedForecast(state)
  };
}

function recordEvent(state, week, message, kind = 'info') {
  return { ...state, events: [...state.events, { week, message, kind }] };
}

function recordTransaction(state, week, label, amount) {
  const cash = state.cash + amount;
  return { ...state, cash, ledger: [...state.ledger, { week, label, amount, balance: cash }] };
}

function restPaddock(plot) {
  return { ...plot, status: 'resting', productiveWeeks: 0, restedWeeks: 0 };
}

function advancePaddock(plot) {
  if (plot.status === 'active') {
    const productiveWeeks = plot.productiveWeeks - 1;
    return { ...plot, productiveWeeks, status: productiveWeeks ? 'active' : 'exhausted' };
  }
  if (plot.status === 'resting') {
    const restedWeeks = plot.restedWeeks + 1;
    return { ...plot, restedWeeks, status: restedWeeks === RECOVERY_WEEKS ? 'ready' : 'resting' };
  }
  return plot;
}

export function farmActionError(state, { type, id }) {
  if (state.result) return 'The season is over. Restart to make more farm decisions.';

  if (type === 'rest' || type === 'activate') {
    const plot = state.paddocks.find(paddock => paddock.id === id);
    if (!plot) return 'This paddock is unavailable.';
    if (type === 'rest') {
      if (plot.status === 'resting') return `Paddock ${id} is already resting.`;
      if (plot.status === 'ready') return `Paddock ${id} is ready to use.`;
      return null;
    }
    if (plot.status === 'active') return `Paddock ${id} is already active.`;
    if (plot.status === 'exhausted') return `Rest Paddock ${id} before activating it again.`;
    if (plot.status === 'resting') {
      const left = RECOVERY_WEEKS - plot.restedWeeks;
      return `Paddock ${id} needs ${left} more ${left === 1 ? 'week' : 'weeks'} of rest.`;
    }
    return state.cash < PADDOCK_COST ? `You need ${formatCash(PADDOCK_COST)} to activate a paddock.` : null;
  }

  if (type === 'buy-feed') {
    return state.cash < FEED_BUNDLE.cost ? `You need ${formatCash(FEED_BUNDLE.cost)} to buy feed.` : null;
  }
  if (type === 'buy-pigs') {
    return state.cash < PIG_PAIR.cost ? `You need ${formatCash(PIG_PAIR.cost)} to buy pigs.` : null;
  }
  if (type === 'fulfill') {
    const order = state.orders.find(candidate => candidate.id === id);
    if (!order) return 'This order is unavailable.';
    if (order.status === 'fulfilled') return 'This order has been fulfilled.';
    if (order.status === 'missed' || state.completedWeeks >= order.deadline) return 'The deadline has passed.';
    const eligible = eligibleForOrder(state, order);
    return eligible < order.quantity ? `This order needs ${order.quantity} eligible pigs. You have ${eligible}.` : null;
  }
  return 'This action is unavailable.';
}

export function applyFarmAction(state, action) {
  const error = farmActionError(state, action);
  if (error) return { state, error };

  const { type, id } = action;
  const week = state.completedWeeks + 1;
  if (type === 'rest') {
    const paddocks = state.paddocks.map(plot => plot.id === id ? restPaddock(plot) : plot);
    const updated = recordEvent({ ...state, paddocks }, week, `Paddock ${id} began resting.`);
    return { state: updated, error: null };
  }

  if (type === 'buy-feed') {
    const feed = state.feed + FEED_BUNDLE.units;
    const paid = recordTransaction({ ...state, feed }, week, 'Bought supplemental feed', -FEED_BUNDLE.cost);
    const updated = recordEvent(paid, week, `Bought ${FEED_BUNDLE.units} feed units. ${feed} in storage. Balance ${formatCash(paid.cash)}.`);
    return { state: updated, error: null };
  }

  if (type === 'buy-pigs') {
    const cohortId = (state.cohorts.at(-1)?.id ?? 0) + 1;
    const cohorts = [...state.cohorts, { id: cohortId, pigs: PIG_PAIR.pigs, fedWeeks: 0 }];
    const paid = recordTransaction({ ...state, cohorts }, week, 'Bought pigs', -PIG_PAIR.cost);
    const updated = recordEvent(paid, week, `Bought ${PIG_PAIR.pigs} pigs. ${eligiblePigs(cohorts, 0)} in the herd. Balance ${formatCash(paid.cash)}.`);
    return { state: updated, error: null };
  }

  if (type === 'fulfill') {
    return { state: fulfillOrder(state, id, week), error: null };
  }

  const former = state.paddocks.find(plot => plot.status === 'active');
  const paddocks = state.paddocks.map(plot => {
    if (plot.id === id) return { ...plot, status: 'active', productiveWeeks: PRODUCTIVE_WEEKS, restedWeeks: 0 };
    return plot === former ? restPaddock(plot) : plot;
  });
  const paid = recordTransaction({ ...state, paddocks }, week, `Activated Paddock ${id}`, -PADDOCK_COST);
  const change = former ? ` Paddock ${former.id} began resting.` : '';
  const updated = recordEvent(paid, week, `Paddock ${id} is active. Balance ${formatCash(paid.cash)}.${change}`);
  return { state: updated, error: null };
}

function fulfillOrder(state, id, week) {
  const order = state.orders.find(candidate => candidate.id === id);
  const eligible = state.cohorts
    .filter(cohort => cohort.fedWeeks >= order.minFedWeeks)
    .sort((a, b) => b.fedWeeks - a.fedWeeks || a.id - b.id);
  const removed = new Map();
  let remaining = order.quantity;

  for (const cohort of eligible) {
    if (!remaining) break;
    const count = Math.min(cohort.pigs, remaining);
    removed.set(cohort.id, count);
    remaining -= count;
  }

  const cohorts = state.cohorts
    .map(cohort => ({ ...cohort, pigs: cohort.pigs - (removed.get(cohort.id) ?? 0) }))
    .filter(cohort => cohort.pigs > 0);
  const orders = state.orders.map(candidate => candidate === order ? { ...order, status: 'fulfilled' } : candidate);
  const paid = recordTransaction({ ...state, cohorts, orders }, week, order.label, order.payment);
  return recordEvent(paid, week, `${order.label} fulfilled. ${order.quantity} pigs left the herd. Balance ${formatCash(paid.cash)}.`);
}

function resolveDeadlines(state, week, beforeSettlement) {
  let next = state;
  const orders = state.orders.map(order => {
    if (order.status !== 'open') return order;
    if (order.deadline === week) {
      const eligible = eligibleForOrder(beforeSettlement, order);
      const cause = eligible < order.quantity
        ? `${eligible} of ${order.quantity} pigs were eligible before the week ended.`
        : 'Enough pigs were eligible, but the order was never confirmed.';
      next = recordEvent(next, week, `Missed deadline. ${order.label} closed without payment. ${cause}`, 'warning');
      return { ...order, status: 'missed' };
    }
    if (order.deadline === week + 1) {
      next = recordEvent(next, week + 1, `Last week for ${order.label.toLowerCase()}. Confirm before Week ${order.deadline} ends.`, 'warning');
    }
    return order;
  });
  return { ...next, orders };
}

export function tickFarm(state) {
  if (state.result) return state;

  const week = state.completedWeeks + 1;
  const { demand, forage, feedUsed, shortfall } = feedForecast(state);
  const cohorts = shortfall ? state.cohorts : state.cohorts.map(cohort => ({ ...cohort, fedWeeks: cohort.fedWeeks + 1 }));
  const paddocks = state.paddocks.map(advancePaddock);
  let next = { ...state, completedWeeks: week, feed: state.feed - feedUsed, cohorts, paddocks };

  if (shortfall) {
    next = recordEvent(next, week, `Feed shortage. The herd needed ${demand} units and got ${forage + feedUsed}. No pigs gained a fed week.`, 'warning');
  } else if (demand) {
    next = recordEvent(next, week, 'The herd gained a fed week.');
  }

  next = recordTransaction(next, week, 'Weekly overhead', -OVERHEAD);
  if (next.cash <= 0) {
    const bankrupt = { ...next, result: 'bankrupt' };
    return recordEvent(bankrupt, week, `Weekly overhead of ${formatCash(OVERHEAD)} left ${formatCash(next.cash)}. The farm went bankrupt.`, 'warning');
  }

  next = resolveDeadlines(next, week, state);
  if (week < SEASON_WEEKS) return next;

  const won = next.orders.every(order => order.status === 'fulfilled');
  const message = won
    ? 'Season won. Both orders were fulfilled and the farm stayed solvent.'
    : 'Season ended. The farm missed one or more orders.';
  return recordEvent({ ...next, result: won ? 'won' : 'lost' }, week, message, won ? 'info' : 'warning');
}
