export const SEASON_WEEKS = 6;
export const GROWTH_END_WEEK = 12;
export const OVERHEAD = 80;
export const STARTER_COST = 100;
export const PEN_CAPACITY = 4;
export const KIT_COST = 120;
export const GRAIN_BUNDLE = { units: 4, cost: 100 };
export const SEASON_GOAL = 'Make a feeder sale and a market hog sale, and have cash left after the last bill.';
export const SALE_AGE = { feeder: 2, market: 6 };
export const SALE_PRICES = { feeder: 200, market: 450 };
export const PADDOCK_FORAGE = 4;
export const SPARE_FORAGE = 2;
export const PRODUCTIVE_WEEKS = 3;
export const RECOVERY_WEEKS = 2;

const OPENING_CASH = 1_000;
const plotStages = {
  'clear-plot': { from: 'wooded', to: 'cleared' },
  'build-pen': { from: 'cleared', to: 'fenced' }
};

function pasture(status) {
  return { status, productiveWeeks: PRODUCTIVE_WEEKS, restedWeeks: 0, lastUsedWeek: 0 };
}

function plot(id, status) {
  return { id, status, pigs: 0, fedWeeks: 0 };
}

export function createFarm() {
  return {
    week: 1,
    chapter: 'first',
    firstMilestone: null,
    cash: OPENING_CASH,
    grain: 0,
    plots: [plot('1', 'wooded'), plot('2', 'locked'), plot('3', 'locked')],
    litter: { id: 'litter', pigs: 0, fedWeeks: 0 },
    litterBorn: false,
    breeders: { boar: 1, sow: 1 },
    paddocks: [{ id: 'A', ...pasture('active') }, { id: 'B', ...pasture('ready') }],
    shipment: null,
    nextShipmentId: 1,
    lastDelivery: null,
    bucket: null,
    feeding: null,
    ledger: [{ week: 1, label: 'Opening balance', amount: OPENING_CASH, balance: OPENING_CASH, type: 'opening' }],
    history: [],
    sales: { feeder: 0, market: 0 },
    result: null
  };
}

export function chapterEndWeek(state) {
  return state.chapter === 'growth' ? GROWTH_END_WEEK : SEASON_WEEKS;
}

export function canContinueFarm(state) {
  return state.chapter === 'first' && state.week === SEASON_WEEKS && state.result === 'won';
}

export function formatCash(cash) {
  return `${cash < 0 ? '-' : ''}$${Math.abs(cash).toLocaleString('en-US')}`;
}

const accept = state => ({ state, error: null });
const reject = (state, error) => ({ state, error });

function transaction(state, type, label, amount, details = {}) {
  const cash = state.cash + amount;
  const entry = { week: state.week, label, amount, balance: cash, type, ...details };
  return { ...state, cash, ledger: [...state.ledger, entry] };
}

function replacePlot(state, updated) {
  return { ...state, plots: state.plots.map(candidate => candidate.id === updated.id ? updated : candidate) };
}

function insufficientCash(cost) {
  return `You need ${formatCash(cost)} in cash.`;
}

function hasForage(pasture) {
  return pasture?.status === 'active' && pasture.productiveWeeks > 0;
}

function feedGroups(state) {
  return [state.litter, ...state.plots].filter(group => group.pigs > 0);
}

function forageSupply(state) {
  const main = state.paddocks.some(hasForage) ? PADDOCK_FORAGE : 0;
  const spare = state.plots.some(plot => hasForage(plot.forage)) ? SPARE_FORAGE : 0;
  return { main, spare };
}

function allocateFeed(state) {
  const { main, spare } = forageSupply(state);
  const forageCapacity = main + spare;
  let forageLeft = forageCapacity;
  let grainLeft = state.grain;
  const groups = feedGroups(state).map(({ id, pigs, fedWeeks }) => {
    const forage = id === 'litter' ? 0 : Math.min(pigs, forageLeft);
    const grain = Math.min(pigs - forage, grainLeft);
    forageLeft -= forage;
    grainLeft -= grain;
    return { id, pigs, fedWeeks, forage, grain, missing: pigs - forage - grain };
  });
  const demand = groups.reduce((total, group) => total + group.pigs, 0);
  const forage = forageCapacity - forageLeft;
  const grainUsed = state.grain - grainLeft;
  return {
    week: state.week, demand, forage, forageCapacity, grainAvailable: state.grain,
    grainNeeded: demand - forage, grainUsed, grainRemaining: grainLeft,
    litterGrain: groups.find(group => group.id === 'litter')?.grain ?? 0,
    shortfall: demand - forage - grainUsed, groups
  };
}

function usePasture(pasture, week) {
  const productiveWeeks = pasture.productiveWeeks - 1;
  return { ...pasture, productiveWeeks, status: productiveWeeks ? 'active' : 'exhausted', lastUsedWeek: week };
}

function afterFeeding(state, forecast) {
  const { main } = forageSupply(state);
  return {
    ...state,
    grain: forecast.grainRemaining,
    paddocks: state.paddocks.map(paddock => forecast.forage > 0 && hasForage(paddock)
      ? usePasture(paddock, state.week)
      : paddock),
    plots: state.plots.map(plot => forecast.forage > main && hasForage(plot.forage)
      ? { ...plot, forage: usePasture(plot.forage, state.week) }
      : plot)
  };
}

function startRest(pasture) {
  return { ...pasture, status: 'resting', productiveWeeks: 0, restedWeeks: 0 };
}

function closePasture(pasture, week, resumeStatus) {
  const resting = pasture.status === 'exhausted' ? startRest(pasture) : pasture;
  if (resting.status !== 'resting' || resting.lastUsedWeek === week) return resting;
  const restedWeeks = resting.restedWeeks + 1;
  return restedWeeks === RECOVERY_WEEKS
    ? { ...resting, status: resumeStatus, productiveWeeks: PRODUCTIVE_WEEKS, restedWeeks }
    : { ...resting, restedWeeks };
}

function nextMorning(state) {
  return {
    ...state,
    week: state.week + 1,
    paddocks: state.paddocks.map(paddock => closePasture(paddock, state.week, 'ready')),
    plots: state.plots.map(plot => plot.forage
      ? { ...plot, forage: closePasture(plot.forage, state.week, 'active') }
      : plot)
  };
}

function projectNextMorning(state) {
  const fed = state.feeding ? state : afterFeeding(state, allocateFeed(state));
  return nextMorning(fed);
}

export function feedForecast(state, { next = false } = {}) {
  return allocateFeed(next ? projectNextMorning(state) : state);
}

export function saleGroups(state, kind) {
  if (state.result) return [];
  const groups = feedGroups(state);
  if (kind === 'feeder') return groups.filter(group => group.fedWeeks >= SALE_AGE.feeder && group.fedWeeks < SALE_AGE.market);
  if (kind === 'market') return groups.filter(group => group.fedWeeks >= SALE_AGE.market);
  return [];
}

function validStarterQuantity(quantity) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= PEN_CAPACITY;
}

function starterError(state, pen, quantity) {
  if (pen?.status !== 'fenced') return 'Build the pen before bringing home starters.';
  if (pen.pigs) return 'This pen already has a group. Choose an empty pen for the starters.';
  if (!validStarterQuantity(quantity)) return 'Choose one to four starter pigs.';
  if (state.cash < quantity * STARTER_COST) return insufficientCash(quantity * STARTER_COST);
  return null;
}

function buyStarters(state, pen, quantity) {
  const error = starterError(state, pen, quantity);
  if (error) return reject(state, error);
  let next = replacePlot(state, { ...pen, pigs: quantity, fedWeeks: 1 });
  if (!state.litterBorn && state.week === 1) {
    next = { ...next, litterBorn: true, litter: { ...state.litter, pigs: 3 } };
  }
  return accept(transaction(next, 'starter', 'Starter pigs', -quantity * STARTER_COST, { quantity, id: pen.id }));
}

function orderGrain(state) {
  if (state.shipment) return reject(state, 'The grain truck already has a load for you.');
  if (state.cash < GRAIN_BUNDLE.cost) return reject(state, insufficientCash(GRAIN_BUNDLE.cost));
  const shipment = { id: state.nextShipmentId };
  const ordered = { ...state, shipment, nextShipmentId: shipment.id + 1 };
  return accept(transaction(ordered, 'grain', 'Grain delivery', -GRAIN_BUNDLE.cost, { quantity: GRAIN_BUNDLE.units }));
}

function deliverGrain(state, id) {
  if (!state.shipment || state.shipment.id !== id) return reject(state, 'This delivery is no longer pending.');
  return accept({
    ...state, shipment: null, grain: state.grain + GRAIN_BUNDLE.units, lastDelivery: { id, week: state.week }
  });
}

function reserveLitter(state, refill) {
  if (state.feeding) return reject(state, 'The morning feeding is already settled.');
  if (!state.litter.pigs) return reject(state, 'The litter pen is empty.');
  const amount = allocateFeed(state).litterGrain;
  if (state.bucket && (!refill || state.bucket.amount >= amount)) {
    return reject(state, 'The bucket is already on its way.');
  }
  return accept({ ...state, bucket: { week: state.week, amount } });
}

function rotate(state, id) {
  const target = state.paddocks.find(paddock => paddock.id === id);
  if (!target || target.status !== 'ready') return reject(state, 'Choose a ready paddock. Used ground needs time to rest.');
  return accept({
    ...state,
    paddocks: state.paddocks.map(paddock => {
      if (paddock === target) return { ...paddock, status: 'active', restedWeeks: 0 };
      return paddock.status === 'active' || paddock.status === 'exhausted' ? startRest(paddock) : paddock;
    })
  });
}

function settleFeed(state, { source, allowShortfall }) {
  if (state.feeding) return reject(state, 'The morning feeding is already settled.');
  if (state.shipment) return reject(state, 'Wait for the grain truck to unload at the Barn.');
  if (state.week === 1 && !state.litterBorn) {
    return reject(state, 'Bring starter pigs home before settling the first feeding.');
  }
  if (state.litter.pigs && (source !== 'bucket' || !state.bucket)) {
    return reject(state, 'Carry the bucket to the litter pen first.');
  }
  if (!state.litter.pigs && source !== 'barn') return reject(state, 'Settle the older hogs’ feed at the Barn.');

  const forecast = allocateFeed(state);
  if (state.bucket && state.bucket.amount < forecast.litterGrain) {
    return reject(state, 'Return to the Barn to refill the bucket with the grain that arrived.');
  }
  if (forecast.shortfall && !allowShortfall) {
    return reject(state, 'There is a feed shortfall. Add grain, rotate pasture, or confirm feeding what you have.');
  }

  const groups = forecast.groups.map(group => ({
    ...group, grew: group.missing === 0, fedWeeksAfter: group.fedWeeks + Number(group.missing === 0)
  }));
  const ages = new Map(groups.map(group => [group.id, group.fedWeeksAfter]));
  const grow = group => ages.has(group.id) ? { ...group, fedWeeks: ages.get(group.id) } : group;
  const fed = afterFeeding(state, forecast);
  return accept({
    ...fed,
    litter: grow(fed.litter), plots: fed.plots.map(grow), bucket: null, feeding: { ...forecast, groups }
  });
}

export function endWeekBlocker(state) {
  if (state.result) return { place: 'office', message: 'The season is over.' };
  if (state.shipment) return { place: 'barn', message: 'Wait for the grain truck to unload at the Barn.' };
  if (state.week === 1 && !state.litterBorn) {
    return state.plots[0].status === 'fenced'
      ? { place: 'supply', message: 'Bring starter pigs home before closing the first week.' }
      : { place: 'pasture', message: 'Build the first pen and bring starter pigs home before closing the first week.' };
  }
  if (!state.feeding && feedGroups(state).length) {
    if (state.litter.pigs && state.bucket) {
      return { place: 'route', message: 'Finish feeding the litter before you close the books.' };
    }
    return { place: 'barn', message: 'Settle the morning feeding before you close the books.' };
  }
  return null;
}

function endWeek(state, week) {
  if (week !== state.week) return reject(state, 'This week has changed. Check Debbie’s books again.');
  const blocker = endWeekBlocker(state);
  if (blocker) return reject(state, blocker.message);

  const billed = transaction(state, 'overhead', 'Weekly bill', -OVERHEAD);
  const history = [...state.history, {
    week: state.week,
    feeding: state.feeding ?? allocateFeed(state),
    transactions: billed.ledger.filter(entry => entry.week === state.week),
    cash: billed.cash
  }];
  const next = nextMorning(billed);
  if (state.week === chapterEndWeek(state)) {
    const won = billed.cash > 0 && (state.chapter === 'growth' || (state.sales.feeder > 0 && state.sales.market > 0));
    return accept({ ...next, week: state.week, history, result: won ? 'won' : 'lost' });
  }
  return accept({ ...next, history, feeding: null, bucket: null });
}

function continueFarm(state) {
  if (!canContinueFarm(state)) return reject(state, 'Finish the first season with a win to continue.');
  // The Week 6 close already posted the bill and rolled the pasture into the next morning.
  return accept({
    ...state,
    chapter: 'growth',
    firstMilestone: { result: state.result, ledgerLength: state.ledger.length, sales: state.sales },
    week: SEASON_WEEKS + 1,
    result: null,
    feeding: null,
    bucket: null
  });
}

function sell(state, kind, { id, quantity, week, expectedPigs }) {
  const group = saleGroups(state, kind).find(group => group.id === id);
  if (!group) return reject(state, 'This group is no longer eligible for that sale.');
  if (week !== state.week || expectedPigs !== group.pigs) {
    return reject(state, 'This sale has changed. Check the group again in Orders.');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > group.pigs) {
    return reject(state, `Choose a quantity between 1 and ${group.pigs}.`);
  }

  const updated = { ...group, pigs: group.pigs - quantity };
  let next = id === 'litter'
    ? { ...state, litter: updated, bucket: updated.pigs ? state.bucket : null }
    : replacePlot(state, updated);
  if (kind === 'feeder' && !state.sales.feeder) {
    next = { ...next, plots: next.plots.map(plot => plot.status === 'locked' ? { ...plot, status: 'available' } : plot) };
  }
  const paid = transaction(next, kind, kind === 'feeder' ? 'Feeder pickup' : 'Market hog sale',
    quantity * SALE_PRICES[kind], { quantity, id });
  return accept({ ...paid, sales: { ...state.sales, [kind]: state.sales[kind] + quantity } });
}

function kitError(state, plot, quantity) {
  if (!plot || plot.id === '1') return 'Choose a spare plot for the kit.';
  if (!state.sales.feeder) return 'Make a feeder sale to unlock the spare plots.';
  if (plot.status !== 'available' && plot.status !== 'grazing') return 'This plot already has its pen kit.';
  if (quantity !== 0 && !validStarterQuantity(quantity)) return 'Choose one to four starter pigs.';
  const cost = KIT_COST + quantity * STARTER_COST;
  if (state.cash < cost) return insufficientCash(cost);
  return null;
}

function grassError(state, plot) {
  if (!state.sales.feeder) return 'Make a feeder sale to unlock the spare plot.';
  if (plot?.id !== '2' || plot.status !== 'available') return 'Choose the first spare plot to keep its grass.';
  return null;
}

export function expansionPreview(state, id, quantity = 0, { grass = false } = {}) {
  const spare = state.plots.find(plot => plot.id === id);
  const before = feedForecast(state, { next: true });
  const error = grass ? grassError(state, spare) : kitError(state, spare, quantity);
  const land = grass
    ? { ...plot(id, 'grazing'), forage: pasture('active') }
    : plot(id, 'wooded');

  // Changed land can affect today's unfinished feeding. Planned starters arrive tomorrow.
  const tomorrow = projectNextMorning(replacePlot(state, land));
  const withStarters = !grass && validStarterQuantity(quantity)
    ? replacePlot(tomorrow, { ...plot(id, 'fenced'), pigs: quantity, fedWeeks: 1 })
    : tomorrow;
  const after = allocateFeed(withStarters);
  const kitCost = grass ? 0 : KIT_COST;
  const hogCost = !grass && validStarterQuantity(quantity) ? quantity * STARTER_COST : 0;

  return {
    kitCost, hogCost, cashLeft: state.cash - kitCost - hogCost,
    demandBefore: before.demand, demandAfter: after.demand,
    forageBefore: before.forage, forageAfter: after.forage,
    forageCapacityBefore: before.forageCapacity, forageCapacityAfter: after.forageCapacity,
    grainNeeded: after.grainNeeded, shortfall: after.shortfall,
    capacityGained: grass ? 0 : PEN_CAPACITY, forageLost: !grass && spare?.forage ? SPARE_FORAGE : 0, error
  };
}

export function applyFarmAction(state, action) {
  if (action.type === 'continue-farm') return continueFarm(state);
  if (state.result) return reject(state, 'The season is over. Replay to start again.');

  const { type, id, quantity } = action;
  const stage = Object.hasOwn(plotStages, type) && plotStages[type];
  const pen = state.plots.find(candidate => candidate.id === id);
  if (stage) {
    if (pen?.status !== stage.from) return reject(state, 'That plot is not ready for this step.');
    return accept(replacePlot(state, { ...pen, status: stage.to }));
  }

  switch (type) {
    case 'buy-starters': return buyStarters(state, pen, quantity);
    case 'order-grain': return orderGrain(state);
    case 'deliver-grain': return deliverGrain(state, id);
    case 'reserve-litter': return reserveLitter(state, action.refill);
    case 'rotate': return rotate(state, id);
    case 'settle-feed': return settleFeed(state, action);
    case 'end-week': return endWeek(state, action.week);
    case 'sell-feeder': return sell(state, 'feeder', action);
    case 'sell-market': return sell(state, 'market', action);
    case 'buy-kit': {
      const error = kitError(state, pen, quantity ?? 0);
      if (error) return reject(state, error);
      const clearedForWork = replacePlot(state, plot(pen.id, 'wooded'));
      return accept(transaction(clearedForWork, 'kit', `Pen kit for Plot ${pen.id}`, -KIT_COST, { id }));
    }
    case 'keep-grass': {
      const error = grassError(state, pen);
      if (error) return reject(state, error);
      return accept(replacePlot(state, { ...pen, status: 'grazing', forage: pasture('active') }));
    }
    default: return reject(state, 'This action is unavailable.');
  }
}
