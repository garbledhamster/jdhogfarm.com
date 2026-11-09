import { PEN_CAPACITY, PRODUCTIVE_WEEKS, RECOVERY_WEEKS, SEASON_WEEKS } from './morning.mjs';
import { placeNames } from './morning-view.mjs';

const saveKey = 'jdhogfarm.season';
const version = 1;

const plotIds = ['1', '2', '3'];
const groupIds = ['litter', ...plotIds];
const penStatuses = ['wooded', 'cleared', 'fenced'];
const spareStatuses = ['locked', 'available', ...penStatuses];
const plotStatuses = { '1': penStatuses, '2': [...spareStatuses, 'grazing'], '3': spareStatuses };
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

function validPasture(value) {
  return record(value) && pastureStatuses.includes(value.status) &&
    whole(value.productiveWeeks, 0, PRODUCTIVE_WEEKS) &&
    whole(value.restedWeeks, 0, RECOVERY_WEEKS) && whole(value.lastUsedWeek, 0, SEASON_WEEKS);
}

function validPlot(plot, id) {
  return record(plot) && plot.id === id && plotStatuses[id].includes(plot.status) &&
    whole(plot.pigs, 0, plot.status === 'fenced' ? PEN_CAPACITY : 0) &&
    whole(plot.fedWeeks, 0, SEASON_WEEKS + 1) &&
    (plot.status === 'grazing' ? validPasture(plot.forage) : plot.forage === undefined);
}

function validFeeding(value, week) {
  const totals = ['demand', 'forage', 'forageCapacity', 'grainAvailable', 'grainNeeded', 'grainUsed',
    'grainRemaining', 'litterGrain', 'shortfall'];
  return record(value) && value.week === week && totals.every(key => whole(value[key])) &&
    Array.isArray(value.groups) && value.groups.length <= groupIds.length &&
    value.groups.every(group => record(group) && groupIds.includes(group.id) &&
      whole(group.pigs, 1, PEN_CAPACITY) && whole(group.fedWeeks, 0, SEASON_WEEKS + 1) &&
      ['forage', 'grain', 'missing'].every(key => whole(group[key], 0, group.pigs)) &&
      typeof group.grew === 'boolean' && whole(group.fedWeeksAfter, 0, SEASON_WEEKS + 1));
}

function validEntry(entry, throughWeek) {
  if (!record(entry) || typeof entry.type !== 'string' || !whole(entry.week, 1, throughWeek) ||
    !Number.isSafeInteger(entry.amount) || !Number.isSafeInteger(entry.balance)) return false;

  // Ledger labels and group identifiers are interpolated by the game views.
  if (entry.type === 'kit') {
    return ['2', '3'].includes(entry.id) && entry.label === `Pen kit for Plot ${entry.id}` &&
      entry.quantity === undefined;
  }
  if (!Object.hasOwn(ledgerLabels, entry.type) || entry.label !== ledgerLabels[entry.type]) return false;
  if (['starter', 'feeder', 'market'].includes(entry.type)) {
    return groupIds.includes(entry.id) && whole(entry.quantity, 1, PEN_CAPACITY);
  }
  if (entry.type === 'grain') return whole(entry.quantity, 1);
  return entry.quantity === undefined;
}

function validHistory(state) {
  const closedWeeks = state.result ? state.week : state.week - 1;
  return Array.isArray(state.history) && state.history.length === closedWeeks &&
    state.history.every((entry, index) => {
      const week = index + 1;
      return record(entry) && entry.week === week && Number.isSafeInteger(entry.cash) &&
        validFeeding(entry.feeding, week) && Array.isArray(entry.transactions) &&
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

function validFarm(state) {
  if (!record(state) || !whole(state.week, 1, SEASON_WEEKS) ||
    !Number.isSafeInteger(state.cash) || !whole(state.grain)) return false;

  return Array.isArray(state.plots) && state.plots.length === plotIds.length &&
    plotIds.every((id, index) => validPlot(state.plots[index], id)) &&
    record(state.litter) && state.litter.id === 'litter' && whole(state.litter.pigs, 0, 3) &&
    whole(state.litter.fedWeeks, 0, SEASON_WEEKS) && typeof state.litterBorn === 'boolean' &&
    record(state.breeders) && state.breeders.boar === 1 && state.breeders.sow === 1 &&
    Array.isArray(state.paddocks) && state.paddocks.length === 2 &&
    ['A', 'B'].every((id, index) => validPasture(state.paddocks[index]) && state.paddocks[index].id === id) &&
    validShipment(state) &&
    (state.bucket === null || (record(state.bucket) && state.bucket.week === state.week &&
      whole(state.bucket.amount, 0, Math.min(3, state.grain)) && state.litter.pigs > 0 && state.feeding === null)) &&
    (state.feeding === null || validFeeding(state.feeding, state.week)) &&
    Array.isArray(state.ledger) && state.ledger[0]?.type === 'opening' &&
    state.ledger.every(entry => validEntry(entry, state.week)) && state.ledger.at(-1).balance === state.cash &&
    record(state.sales) && whole(state.sales.feeder) && whole(state.sales.market) &&
    (state.result === null || (state.week === SEASON_WEEKS && ['won', 'lost'].includes(state.result) &&
      state.shipment === null && state.bucket === null)) && validHistory(state);
}

function decode(raw) {
  try {
    const saved = JSON.parse(raw);
    if (record(saved) && saved.version === version && validFarm(saved.state) &&
      typeof saved.place === 'string' && Object.hasOwn(placeNames, saved.place) &&
      typeof saved.previousPlace === 'string' && Object.hasOwn(placeNames, saved.previousPlace) &&
      saved.previousPlace !== 'map' && (saved.selectedPlot === null || plotIds.includes(saved.selectedPlot)) &&
      typeof saved.bucketArrived === 'boolean' && (!saved.bucketArrived || saved.state.bucket !== null) &&
      Array.isArray(saved.seenStories) && saved.seenStories.length <= SEASON_WEEKS &&
      saved.seenStories.every(week => whole(week, 1, saved.state.week))) return saved;
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
