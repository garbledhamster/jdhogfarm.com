import { renderFeedingGroups } from './chores-view.mjs';
import { feedForecast, formatCash, GRAIN_BUNDLE, PEN_CAPACITY, saleGroups } from './morning.mjs';

const sections = { pens: 'Pens', feed: 'Feed', land: 'Land', sales: 'Sales' };
const count = (quantity, noun) => `${quantity} ${noun}${quantity === 1 ? '' : 's'}`;
const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;

function penFacts(state) {
  const feeders = new Set(saleGroups(state, 'feeder').map(group => group.id));
  const market = new Set(saleGroups(state, 'market').map(group => group.id));
  const readiness = ({ id, pigs, fedWeeks }) => {
    if (!pigs) return 'Empty';
    const ready = market.has(id) ? `${pigs} market-ready` : feeders.has(id) ? `${pigs} feeder-ready` : 'Growing';
    return `${count(fedWeeks, 'fed week')} · ${ready}`;
  };
  const pens = state.plots.filter(plot => plot.status === 'fenced').map(plot =>
    fact(`Pen ${plot.id}`, `${plot.pigs}/${PEN_CAPACITY} pigs · ${readiness(plot)}`));
  const { litter, breeders } = state;
  return `<dl class="farm-book-facts">
    ${pens.length ? pens.join('') : fact('Grower pens', 'None built')}
    ${fact('Litter', litter.pigs ? `${count(litter.pigs, 'piglet')} · ${readiness(litter)}` : 'Empty')}
    ${fact('Breeding pair', `${count(breeders.boar, 'boar')} · ${count(breeders.sow, 'sow')}`)}
  </dl>`;
}

function feedLine(title, { demand, forage, shortfall }, grain = '') {
  const short = shortfall ? ` · <strong class="farm-book-short">Short by ${count(shortfall, 'unit')}</strong>` : '';
  return fact(title, `${demand} to feed · ${forage} from forage${grain ? ` · ${grain}` : ''}${short}`);
}

function feedFacts(state, deliveryStage) {
  const morning = state.feeding ?? feedForecast(state);
  const next = state.result ? null : feedForecast(state, { next: true });
  const bucket = state.bucket
    ? `${count(state.bucket.amount, 'unit')} reserved in the bucket, included in the bin total`
    : 'No bucket reserved';
  const shipment = state.shipment
    ? `${count(GRAIN_BUNDLE.units, 'unit')} incoming${deliveryStage === 'unloading' ? ' · Unloading' : ''}`
    : 'No shipment incoming';
  return `<dl class="farm-book-facts">
    ${feedLine(state.feeding ? 'This morning · Fed' : 'This morning', morning,
      state.feeding ? `${morning.grainUsed} grain used` : '')}
    ${fact('Grain', `${count(state.grain, 'unit')} in the bin`)}
    ${fact('Bucket', bucket)}
    ${fact('Shipment', shipment)}
    ${next ? feedLine('Next morning', next, `${next.grainAvailable} grain projected in the bin`) : ''}
  </dl>${renderFeedingGroups(state.feeding)}`;
}

function landFacts(state) {
  const plotStatus = {
    locked: 'Locked', available: 'Available', wooded: 'Wooded', cleared: 'Cleared',
    fenced: 'Fenced', grazing: 'Spare grazing'
  };
  const pasture = ({ status, productiveWeeks }) => {
    const label = { active: 'Active', ready: 'Ready', exhausted: 'Used up', resting: 'Resting' }[status];
    return productiveWeeks ? `${label} · ${count(productiveWeeks, 'forage week')} left` : label;
  };
  return `<dl class="farm-book-facts">
    ${state.plots.map(plot => fact(`Plot ${plot.id}`, plot.forage
      ? `${plotStatus[plot.status]} · ${pasture(plot.forage)}` : plotStatus[plot.status])).join('')}
    ${state.paddocks.map(paddock => fact(`Paddock ${paddock.id}`, pasture(paddock))).join('')}
  </dl>`;
}

function salesFacts(state) {
  let receipts = 0;
  let spending = 0;
  for (const { type, amount } of state.ledger) {
    if (type === 'opening') continue;
    if (amount > 0) receipts += amount;
    else spending -= amount;
  }
  return `<dl class="farm-book-facts">
    ${fact('Feeders sold', state.sales.feeder)}
    ${fact('Market hogs sold', state.sales.market)}
    ${fact('Receipts', formatCash(receipts))}
    ${fact('Spending', formatCash(spending))}
  </dl>`;
}

export function renderFarmBook(state, { bookSection, deliveryStage }) {
  const pages = { pens: penFacts, feed: feedFacts, land: landFacts, sales: salesFacts };
  const body = `<div class="farm-book-sections" role="group" aria-label="Farm book sections">
    ${Object.entries(sections).map(([key, label]) =>
      `<button class="farm-small-button" id="farm-book-${key}" type="button" data-book-section="${key}"
        aria-pressed="${key === bookSection}">${label}</button>`).join('')}
  </div>
  <section class="farm-book-page" id="farm-book-page-${bookSection}" aria-labelledby="farm-book-${bookSection}" tabindex="0">
    ${pages[bookSection](state, deliveryStage)}
  </section>`;
  return { title: 'Farm book', body, actions: '' };
}
