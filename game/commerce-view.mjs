import {
  expansionPreview, feedForecast, formatCash, KIT_COST, PEN_CAPACITY, saleGroups, SALE_AGE, SALE_PRICES, SEASON_GOAL, SPARE_FORAGE, STARTER_COST
} from './morning.mjs';

import { renderSupplyArt } from './supply-art.mjs';

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
    art: renderSupplyArt(),
    controls: `<div class="farm-stage-controls farm-commerce-controls">${options.join('')}</div>`,
    details: `<p>${message}</p>`
  };
}

function starterDecision(state, id) {
  const pen = state.plots.find(plot => plot.id === id);
  if (pen?.status !== 'fenced' || pen.pigs) return null;
  const quantity = 'farm-starter-quantity';
  const firstPurchase = !state.litterBorn ? `<p><strong>Season goals.</strong> ${SEASON_GOAL}</p>` : '';
  const initialQuantity = 2;
  return {
    title: `Starters for Pen ${pen.id}`,
    body: `${firstPurchase}<p data-starter-price>Weaned starters cost ${formatCash(STARTER_COST)} each. Choose up to ${PEN_CAPACITY}.</p>
      <p data-starter-cash>Cash on hand ${formatCash(state.cash)}.</p>
      <div class="farm-starter-choice">
        ${numericChoice(quantity, 'Number of starter pigs', PEN_CAPACITY, initialQuantity, 'data-commerce-quantity="starters"')}
        <p data-starter-total role="status">Purchase total ${formatCash(initialQuantity * STARTER_COST)}.</p>
      </div>`,
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
    : '<p>No group is ready for a pickup yet.</p>';
  const fedWeeks = `<p>A full morning of feed adds one fed week to a group.
    Feeders need ${SALE_AGE.feeder} to ${SALE_AGE.market - 1} fed weeks. Market hogs need ${SALE_AGE.market}.</p>`;
  return {
    art: pickupArt(sale),
    controls: `<div class="farm-stage-controls farm-commerce-controls">${choices.join('')}
      ${control('Go to Office', 'data-place="office"')}</div>`,
    details: receipt + fedWeeks + readiness
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
    const [total, label, unitPrice] = kind === 'starters'
      ? ['[data-starter-total]', 'Purchase total', STARTER_COST]
      : ['[data-sale-total]', 'Pickup total', SALE_PRICES[kind]];
    root.querySelector(total).textContent = valid
      ? `${label} ${formatCash(quantity * unitPrice)}.`
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
