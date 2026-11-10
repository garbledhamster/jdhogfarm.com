import { chapterEndWeek, fartherPlots, FARTHER_PLOT_IDS, PEN_CAPACITY, PRODUCTIVE_WEEKS, RECOVERY_WEEKS, SEASON_WEEKS } from './morning.mjs';
import { placeNames } from './morning-view.mjs';

const saveKey = 'jdhogfarm.season';
const version = 2;

const plotIds = ['1', '2', '3'];
const growthPlotIds = [...plotIds, ...FARTHER_PLOT_IDS];
const groupIds = ['litter', ...plotIds];
const validGroupId = (id, week) => groupIds.includes(id) || (week > SEASON_WEEKS && FARTHER_PLOT_IDS.includes(id));
const penStatuses = ['wooded', 'cleared', 'fenced'];
const spareStatuses = ['locked', 'available', ...penStatuses];
const plotStatuses = { '1': penStatuses, '2': [...spareStatuses, 'grazing'], '3': spareStatuses,
  '4': ['available', ...penStatuses], '5': ['available', ...penStatuses] };
const pastureStatuses = ['active', 'ready', 'exhausted', 'resting'];
const ledgerLabels = {
  opening: 'Opening balance',
  starter: 'Starter pigs',
  grain: 'Grain delivery',
  overhead: 'Weekly bill',
  feeder: 'Feeder pickup',
  market: 'Market hog sale'
};

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

function validPasture(value, endWeek) {
  return record(value) && pastureStatuses.includes(value.status) &&
    whole(value.productiveWeeks, 0, PRODUCTIVE_WEEKS) &&
    whole(value.restedWeeks, 0, RECOVERY_WEEKS) && whole(value.lastUsedWeek, 0, endWeek);
}

function validPlot(plot, id, endWeek) {
  return record(plot) && plot.id === id && plotStatuses[id].includes(plot.status) &&
    whole(plot.pigs, 0, plot.status === 'fenced' ? PEN_CAPACITY : 0) &&
    whole(plot.fedWeeks, 0, endWeek + 1) &&
    (plot.status === 'grazing' ? validPasture(plot.forage, endWeek) : plot.forage === undefined);
}

function validFeeding(value, week, endWeek) {
  const totals = ['demand', 'forage', 'forageCapacity', 'grainAvailable', 'grainNeeded', 'grainUsed',
    'grainRemaining', 'litterGrain', 'shortfall'];
  return record(value) && value.week === week && totals.every(key => whole(value[key])) &&
    Array.isArray(value.groups) && value.groups.length <= 1 + (week > SEASON_WEEKS ? growthPlotIds.length : plotIds.length) &&
    value.groups.every(group => record(group) && validGroupId(group.id, week) &&
      whole(group.pigs, 1, PEN_CAPACITY) && whole(group.fedWeeks, 0, endWeek + 1) &&
      ['forage', 'grain', 'missing'].every(key => whole(group[key], 0, group.pigs)) &&
      typeof group.grew === 'boolean' && whole(group.fedWeeksAfter, 0, endWeek + 1));
}

function validEntry(entry, throughWeek) {
  if (!record(entry) || typeof entry.type !== 'string' || !whole(entry.week, 1, throughWeek) ||
    !Number.isSafeInteger(entry.amount) || !Number.isSafeInteger(entry.balance)) return false;

  // Ledger labels and group identifiers are interpolated by the game views.
  if (entry.type === 'kit') {
    const farther = FARTHER_PLOT_IDS.includes(entry.id);
    const label = farther ? `Land and pen kit for Plot ${entry.id}` : `Pen kit for Plot ${entry.id}`;
    return (farther ? entry.week > SEASON_WEEKS : ['2', '3'].includes(entry.id)) &&
      entry.label === label && entry.quantity === undefined;
  }
  if (!Object.hasOwn(ledgerLabels, entry.type) || entry.label !== ledgerLabels[entry.type]) return false;
  if (['starter', 'feeder', 'market'].includes(entry.type)) {
    return validGroupId(entry.id, entry.week) && whole(entry.quantity, 1, PEN_CAPACITY);
  }
  if (entry.type === 'grain') return whole(entry.quantity, 1);
  return entry.quantity === undefined;
}

function validHistory(state, endWeek) {
  const closedWeeks = state.result ? state.week : state.week - 1;
  return Array.isArray(state.history) && state.history.length === closedWeeks &&
    state.history.every((entry, index) => {
      const week = index + 1;
      return record(entry) && entry.week === week && Number.isSafeInteger(entry.cash) &&
        validFeeding(entry.feeding, week, endWeek) && Array.isArray(entry.transactions) &&
        entry.transactions.every(transaction => validEntry(transaction, week) && transaction.week === week) &&
        entry.transactions.at(-1)?.type === 'overhead' && entry.transactions.at(-1).balance === entry.cash;
    });
}

function validShipment(state) {
  const { shipment, lastDelivery, nextShipmentId, week } = state;
  if (!whole(nextShipmentId, 1) || !(shipment === null ||
    (record(shipment) && whole(shipment.id, 1) && shipment.id === nextShipmentId - 1))) return false;
  const lastId = nextShipmentId - (shipment ? 2 : 1);
  return lastId === 0 ? lastDelivery === null
    : record(lastDelivery) && lastDelivery.id === lastId && whole(lastDelivery.week, 1, week);
}

function validMilestone(state) {
  if (state.chapter === 'first') return state.firstMilestone === null;
  const milestone = state.firstMilestone;
  if (!record(milestone) || milestone.result !== 'won' ||
    !whole(milestone.ledgerLength, 1, state.ledger.length) || !record(milestone.sales)) return false;

  const { ledgerLength, sales } = milestone;
  const closingBill = state.ledger[ledgerLength - 1];
  if (closingBill.week !== SEASON_WEEKS || closingBill.type !== 'overhead' ||
    closingBill.balance !== state.history[SEASON_WEEKS - 1].cash || closingBill.balance <= 0 ||
    (state.ledger[ledgerLength] && state.ledger[ledgerLength].week <= SEASON_WEEKS)) return false;
  const firstEntries = state.ledger.slice(0, ledgerLength);
  return ['feeder', 'market'].every(kind => whole(sales[kind], 1, state.sales[kind]) &&
    sales[kind] === firstEntries.filter(entry => entry.type === kind).reduce((sum, entry) => sum + entry.quantity, 0));
}

// A receipt points to a committed outcome already validated by the save.
function validLastOutcome(state) {
  switch (state.lastOutcome) {
    case null: return true;
    case 'cash': return state.ledger.at(-1).type !== 'opening';
    case 'delivery': return !state.result && !state.shipment && state.lastDelivery?.week === state.week;
    case 'feeding': return !state.result && state.feeding !== null;
    default: return false;
  }
}

function validFarm(state) {
  if (!record(state) || !['first', 'growth'].includes(state.chapter)) return false;
  const endWeek = chapterEndWeek(state);
  const startWeek = state.chapter === 'growth' ? SEASON_WEEKS + 1 : 1;
  if (!whole(state.week, startWeek, endWeek) ||
    !Number.isSafeInteger(state.cash) || !whole(state.grain)) return false;

  const expectedPlots = state.chapter === 'growth' ? growthPlotIds : plotIds;
  return Array.isArray(state.plots) && state.plots.length === expectedPlots.length &&
    expectedPlots.every((id, index) => validPlot(state.plots[index], id, endWeek)) &&
    record(state.litter) && state.litter.id === 'litter' && whole(state.litter.pigs, 0, 3) &&
    whole(state.litter.fedWeeks, 0, endWeek) && typeof state.litterBorn === 'boolean' &&
    record(state.breeders) && state.breeders.boar === 1 && state.breeders.sow === 1 &&
    Array.isArray(state.paddocks) && state.paddocks.length === 2 &&
    ['A', 'B'].every((id, index) => validPasture(state.paddocks[index], endWeek) && state.paddocks[index].id === id) &&
    validShipment(state) &&
    (state.bucket === null || (record(state.bucket) && state.bucket.week === state.week &&
      whole(state.bucket.amount, 0, Math.min(3, state.grain)) && state.litter.pigs > 0 && state.feeding === null)) &&
    (state.feeding === null || validFeeding(state.feeding, state.week, endWeek)) &&
    Array.isArray(state.ledger) && state.ledger[0]?.type === 'opening' &&
    state.ledger.every(entry => validEntry(entry, state.week)) && state.ledger.at(-1).balance === state.cash &&
    record(state.sales) && whole(state.sales.feeder) && whole(state.sales.market) &&
    (state.result === null || (state.week === endWeek && ['won', 'lost'].includes(state.result) &&
      state.shipment === null && state.bucket === null)) && validHistory(state, endWeek) && validMilestone(state) &&
    validLastOutcome(state);
}

function hasFartherPlotReferences({ state, selectedPlot }) {
  const includesFarther = records => records.some(({ id }) => FARTHER_PLOT_IDS.includes(id));
  return FARTHER_PLOT_IDS.includes(selectedPlot) || includesFarther(state.ledger) ||
    includesFarther(state.feeding?.groups ?? []) ||
    state.history.some(week => includesFarther(week.transactions) || includesFarther(week.feeding.groups));
}

function decode(raw) {
  try {
    const stored = JSON.parse(raw);
    if (!record(stored) || ![1, version].includes(stored.version) || !record(stored.state)) return null;
    // Keep the raw storage value as the write guard until the player next changes progress.
    let saved = stored.version === 1
      ? { ...stored, version, state: { ...stored.state, chapter: 'first', firstMilestone: null } }
      : stored;
    if (saved.state.lastOutcome === undefined) saved.state.lastOutcome = null;
    if (saved.state.chapter === 'growth' && Array.isArray(saved.state.plots) && saved.state.plots.length === plotIds.length) {
      // A save with a farther purchase or feeding record has lost plot data.
      if (hasFartherPlotReferences(saved)) return null;
      saved = { ...saved, state: { ...saved.state, plots: [...saved.state.plots, ...fartherPlots()] } };
    }
    if (validFarm(saved.state) &&
      typeof saved.place === 'string' && Object.hasOwn(placeNames, saved.place) &&
      typeof saved.previousPlace === 'string' && Object.hasOwn(placeNames, saved.previousPlace) &&
      saved.previousPlace !== 'map' && (saved.selectedPlot === null || saved.state.plots.some(plot => plot.id === saved.selectedPlot)) &&
      typeof saved.bucketArrived === 'boolean' && (!saved.bucketArrived || saved.state.bucket !== null) &&
      Array.isArray(saved.seenStories) && saved.seenStories.length <= SEASON_WEEKS &&
      saved.seenStories.every(week => whole(week, 1, Math.min(SEASON_WEEKS, saved.state.week)))) return saved;
  } catch {
    // Unreadable saves use the same fresh-game path as unsupported versions.
  }
  return null;
}

export function openSeasonSave() {
  let expected = null;
  let season = null;
  let status = null;
  try {
    expected = window.localStorage.getItem(saveKey);
    if (expected !== null) {
      season = decode(expected);
      if (!season) status = 'unreadable';
    }
  } catch {
    status = 'unavailable';
  }

  return {
    season,
    status,
    write(snapshot) {
      try {
        const storage = window.localStorage;
        if (storage.getItem(saveKey) !== expected) return 'changed';
        const raw = JSON.stringify({ version, ...snapshot });
        if (raw !== expected) {
          storage.setItem(saveKey, raw);
          expected = raw;
        }
        return null;
      } catch {
        return 'unwritten';
      }
    }
  };
}
