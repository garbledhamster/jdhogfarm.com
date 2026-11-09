import {
  expansionPreview, feedForecast, formatCash, KIT_COST, PEN_CAPACITY, saleGroups, SALE_PRICES, SPARE_FORAGE, STARTER_COST
} from './morning.mjs';

const supplyArt = `<svg viewBox="0 0 960 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <pattern id="farm-supply-planks" width="88" height="120" patternUnits="userSpaceOnUse">
      <path d="M0 0h88v120H0z" fill="#a5734b"/>
      <path d="M1 0v120m80-120v120" fill="none" stroke="#805339" stroke-width="3"/>
      <path d="M20 14v28m34 23v43m-17-40v18" fill="none" stroke="#be8a58" stroke-width="2"/>
    </pattern>
  </defs>
  <path fill="#835335" d="M0 0h960v620H0z"/>
  <path fill="url(#farm-supply-planks)" d="M0 0h960v415H0z"/>
  <path d="M0 410h960v210H0z" fill="#6d4930"/>
  <path d="M0 444h960M0 497h960M0 562h960M186 620l167-209m224 209-43-209m255 209L643 411" stroke="#8a613e" stroke-width="5" fill="none"/>
  <path d="M240 165h480v254H240z" fill="#583724" stroke="#bc8a55" stroke-width="14"/>
  <path d="M236 270h488m-487 90h486" stroke="#d0a064" stroke-width="13"/>
  <path d="M264 222h84v40h-84zm98-16h111v56H362zm129 20h66v36h-66zm89-19h109v55H580z" fill="#bd985a" stroke="#82552e" stroke-width="4"/>
  <path d="M267 304h111v48H267zm128 7h100v41H395zm135-6h84v47h-84zm97 8h61v39h-61z" fill="#aa8050" stroke="#795030" stroke-width="4"/>
  <path d="M185 402h588v86H185z" fill="#805433" stroke="#613a26" stroke-width="7"/>
  <path d="M173 391h612v25H173z" fill="#d3a468" stroke="#73472b" stroke-width="5"/>
  <path d="M584 371h82v19h-82zm16-16h47v16h-47z" fill="#596557" stroke="#394b41" stroke-width="4"/>
  <rect x="345" y="80" width="270" height="54" rx="3" fill="#4e3927" stroke="#d5a46b" stroke-width="4"/>
  <path d="M384 107h192" stroke="#f0cd85" stroke-width="3" stroke-dasharray="28 8 10 8"/>
</svg>`;

const saleLabels = { feeder: 'Feeder pickup', market: 'Market hog sale' };
const pigLabel = quantity => `${quantity} ${quantity === 1 ? 'pig' : 'pigs'}`;
const fedLabel = weeks => `${weeks} fed ${weeks === 1 ? 'week' : 'weeks'}`;
export const groupName = group => group.id === 'litter' ? 'Sow’s litter' : `Pen ${group.id}`;

function control(label, attrs, primary = false) {
  return `<button class="${primary ? 'farm-primary-action' : 'farm-small-button'}" type="button" ${attrs}>${label}</button>`;
}

function numericChoice(id, label, max, value, attributes = '') {
  return `<label class="farm-commerce-quantity" for="${id}">${label}</label>
    <input id="${id}" type="number" min="1" max="${max}" step="1" value="${value}" ${attributes}>`;
}

function supplyView(state) {
  const pens = state.plots.filter(plot => plot.status === 'fenced' && !plot.pigs);
  const canStock = pens.length > 0;
  const firstPenBuilt = state.plots[0].status === 'fenced';
  const purchase = state.ledger.at(-1);
  const justStocked = purchase?.type === 'starter' && purchase.week === state.week;
  const options = pens.map(pen => control(`Buy starters for Pen ${pen.id}`, `data-open="starters" data-target="${pen.id}"`, true));
  if (!state.result) {
    const spare = state.plots.filter(plot => plot.status === 'available' || plot.status === 'grazing');
    for (const plot of spare) {
      options.push(control(plot.status === 'grazing' ? 'Convert spare grass to Pen 2' : `Preview Pen ${plot.id} kit`,
        `data-open="kit" data-target="${plot.id}"`));
      if (plot.id === '2' && plot.status === 'available') {
        options.push(control('Keep the spare grass', 'data-open="grass" data-target="2"'));
      }
    }
  }
  if (!canStock) {
    options.push(control(justStocked ? `See the pigs in Pen ${purchase.id}` : 'Go to Pasture',
      `data-place="pasture"${justStocked ? ` data-select-plot="${purchase.id}"` : ''}`, true));
  }
  const message = !firstPenBuilt ? 'Build the first pen before buying starters.'
    : justStocked ? `${pigLabel(purchase.quantity)} delivered to Pen ${purchase.id}.`
      : canStock ? `Weaned starters cost ${formatCash(STARTER_COST)} each and come with one fed week.`
        : state.sales.feeder ? `Pen kits cost ${formatCash(KIT_COST)}. Preview the kit and feed before spending.`
          : 'The fenced pens already have their hogs.';
  return {
    art: supplyArt,
    controls: `<div class="farm-stage-controls farm-commerce-controls">${options.join('')}</div>`,
    details: `<p>${message}</p>`
  };
}

function starterDecision(state, id) {
  const pen = state.plots.find(plot => plot.id === id);
  if (pen?.status !== 'fenced' || pen.pigs) return null;
  const quantity = 'farm-starter-quantity';
  return {
    title: `Starters for Pen ${pen.id}`,
    body: `<p>Weaned starters cost ${formatCash(STARTER_COST)} each. Choose up to ${PEN_CAPACITY}.</p>
      <p>Cash on hand ${formatCash(state.cash)}.</p>
      ${numericChoice(quantity, 'Number of starter pigs', PEN_CAPACITY, 2)}`,
    actions: control('Confirm starter purchase', `data-action="buy-starters" data-target="${pen.id}" data-quantity-from="${quantity}"`, true)
      + control('Cancel', 'data-panel-close')
  };
}

function pickupArt(sale) {
  if (!sale) return '';
  const pigs = Array.from({ length: sale.quantity }, (_, index) =>
    `<image href="game/art/pig.svg" x="${456 + index * 59}" y="${373 - index % 2 * 15}" width="68" height="44"/>`
  ).join('');
  return `<svg viewBox="0 0 1200 530" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g class="farm-pickup-hogs" data-pickup-kind="${sale.type}" data-pickup-count="${sale.quantity}">${pigs}</g>
  </svg>`;
}

function saleView(state) {
  const choices = Object.keys(saleLabels).flatMap(kind => saleGroups(state, kind).map(group => {
    const label = kind === 'feeder' ? 'Sell feeders' : 'Sell market hogs';
    return control(`${label} · ${groupName(group)}`, `data-open="${kind}" data-target="${group.id}"`, true);
  }));
  const sale = state.ledger.findLast(entry => entry.week === state.week && Object.hasOwn(saleLabels, entry.type));
  const receipt = sale ? `<p><strong>${saleLabels[sale.type]}</strong> · ${pigLabel(sale.quantity)} left the gate for ${formatCash(sale.amount)}.</p>` : '';
  const readiness = choices.length
    ? '<p>Choose a group at the pickup gate.</p>'
    : '<p>Feeders need two through five fed weeks. Market hogs need six. No group is ready for a pickup yet.</p>';
  return {
    art: pickupArt(sale),
    controls: `<div class="farm-stage-controls farm-commerce-controls">${choices.join('')}
      ${control('Go to Office', 'data-place="office"')}</div>`,
    details: receipt + readiness
  };
}

function saleDecision(state, kind, id) {
  const group = saleGroups(state, kind).find(candidate => candidate.id === id);
  if (!group) return null;
  const quantity = 'farm-sale-quantity';
  const price = SALE_PRICES[kind];
  return {
    title: `${saleLabels[kind]} · ${groupName(group)}`,
    body: `<p>${pigLabel(group.pigs)} eligible with ${fedLabel(group.fedWeeks)}. The buyer pays ${formatCash(price)} each.</p>
      ${numericChoice(quantity, 'Number of hogs to sell', group.pigs, 1, `data-commerce-quantity="${kind}"`)}
      <p data-sale-total role="status">Pickup total ${formatCash(price)}.</p>`,
    actions: control('Confirm sale', `data-action="sell-${kind}" data-target="${group.id}"
      data-quantity-from="${quantity}" data-week="${state.week}" data-expected-pigs="${group.pigs}"`, true)
      + control('Cancel', 'data-panel-close')
  };
}

function expansionFigures(preview, grass) {
  const { cashLeft, demandBefore, demandAfter, forageAfter, forageCapacityAfter, grainNeeded, shortfall,
    kitCost, hogCost, capacityGained, forageLost, forageCapacityBefore } = preview;
  const forageNote = forageLost ? ` Up to ${forageLost} units from the spare grass will be lost for the season.`
    : forageCapacityAfter > forageCapacityBefore ? ` Spare grass can add up to ${SPARE_FORAGE} units for older hogs.` : '';
  return `<dl class="farm-expansion-figures">
    ${grass ? '' : `<dt>Kit now</dt><dd>${formatCash(kitCost)}</dd><dt>Selected starters later</dt><dd>${formatCash(hogCost)}</dd>
    <dt>Pen capacity gained</dt><dd>${pigLabel(capacityGained)}</dd>`}
    <dt>Expected cash left</dt><dd>${formatCash(cashLeft)}</dd>
    <dt>Next morning demand</dt><dd>${demandBefore} → ${demandAfter} feed units</dd>
    <dt>Forage credit</dt><dd>${forageAfter} of ${forageCapacityAfter} available units used.${forageNote}</dd>
    <dt>Grain needed</dt><dd>${grainNeeded} units${shortfall ? ` · Short by ${shortfall}` : ''}</dd>
  </dl>${preview.error ? `<p class="farm-expansion-warning">${preview.error}</p>` : ''}`;
}

function expansionDecision(state, id, grass) {
  const plot = state.plots.find(candidate => candidate.id === id);
  if (!plot || !state.sales.feeder || state.result) return null;
  if (grass && (plot.id !== '2' || plot.status !== 'available')) return null;
  if (!grass && plot.status !== 'available' && plot.status !== 'grazing') return null;
  const input = 'farm-expansion-quantity';
  const planned = grass ? 0 : 1;
  const preview = expansionPreview(state, id, planned, { grass });
  const explanation = grass
    ? 'Keep this plot available for older hogs. It grazes for three mornings and then rests for two closed weeks.'
    : plot.status === 'grazing'
      ? 'Buying the kit commits this ground to a pen and removes its forage for the season. Clear and fence the plot before ordering pigs.'
      : 'Buy the kit now, then clear and fence the plot. Order starters after the pen is ready.';
  return {
    title: grass ? 'Keep the spare grass' : plot.status === 'grazing' ? 'Convert the spare grass' : `Preview Pen ${id}`,
    body: `<p>${explanation}</p>
      ${grass ? '' : numericChoice(input, 'Number of starters to plan for', PEN_CAPACITY, planned, `data-commerce-quantity="kit" data-target="${id}"`)}
      <div data-expansion-preview aria-live="polite">${expansionFigures(preview, grass)}</div>`,
    actions: (grass ? control('Confirm grazing', `data-action="keep-grass" data-target="${id}"`, true)
      : control('Confirm kit purchase', `data-action="buy-kit" data-target="${id}" data-quantity-from="${input}"`, true))
      + control('Cancel', 'data-panel-close')
  };
}

export function updateCommercePreview(root, state) {
  const input = root.querySelector('[data-commerce-quantity]');
  if (!input) return;
  const kind = input.dataset.commerceQuantity;
  const quantity = input.valueAsNumber;
  if (kind === 'kit') {
    root.querySelector('[data-expansion-preview]').innerHTML =
      expansionFigures(expansionPreview(state, input.dataset.target, quantity), false);
  } else {
    const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= Number(input.max);
    root.querySelector('[data-sale-total]').textContent = valid
      ? `Pickup total ${formatCash(quantity * SALE_PRICES[kind])}.`
      : `Choose a quantity between 1 and ${input.max}.`;
  }
}

export function renderCommercePlace(place, state) {
  if (place === 'supply') return supplyView(state);
  if (place === 'orders') return saleView(state);
  return null;
}

export function renderCommerceDecision(panel, state, { panelTarget }) {
  if (panel === 'starters') return starterDecision(state, panelTarget);
  if (Object.hasOwn(saleLabels, panel)) return saleDecision(state, panel, panelTarget);
  if (panel === 'kit' || panel === 'grass') return expansionDecision(state, panelTarget, panel === 'grass');
  return null;
}

export function spareGrassDetail(state) {
  const spare = state.plots.find(plot => plot.status === 'grazing');
  if (!spare) return '';
  const forecast = feedForecast(state, { next: Boolean(state.feeding) });
  const status = spare.forage.status === 'active'
    ? `up to ${SPARE_FORAGE} forage units for older hogs`
    : 'resting for another morning';
  return `<p>Spare grass · ${status}. ${forecast.forage} total forage in the feed outlook.</p>`;
}

export function herdDetails(state, plot) {
  const details = [];
  if (plot.pigs) {
    const stage = plot.fedWeeks >= 6 ? ' · Market ready' : '';
    details.push(`<p>${plot.pigs} starter ${plot.pigs === 1 ? 'pig' : 'pigs'} · ${fedLabel(plot.fedWeeks)}${stage}</p>`);
  }
  if (state.litter.pigs) {
    details.push(`<p>${state.litter.pigs} ${state.litter.pigs === 1 ? 'piglet' : 'piglets'} in their own pen · ${fedLabel(state.litter.fedWeeks)}</p>`);
  }
  details.push('<p>Boar and sow stay on the farm.</p>');
  return details.join('');
}
