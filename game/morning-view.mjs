import { openingArt } from './opening-art.mjs';
import { herdDetails, renderCommerceDecision, renderCommercePlace, spareGrassDetail } from './commerce-view.mjs';
import { applyFarmAction, feedForecast, saleGroups } from './morning.mjs';
import { renderChoreDecision, renderChorePlace, renderPastureGate } from './chores-view.mjs';
import { renderOfficeDecision, renderOfficePlace } from './office-view.mjs';

export const placeNames = {
  pasture: 'Pasture',
  barn: 'Barn',
  supply: 'Farm Supply',
  piglets: 'Piglet pen',
  route: 'Feed run',
  orders: 'Orders',
  office: 'Office',
  map: 'Farm map'
};

export const prologue = [
  {
    speaker: 'Joe Rice',
    art: 'opening-hogs',
    alt: 'Joe beside a hog at the fence',
    title: 'A new piece of ground',
    text: 'Morning. We’ve got a wooded plot and six weeks to raise a herd. Could use a hand getting started.'
  },
  {
    speaker: 'Debbie Rice',
    art: 'opening-ledger',
    alt: 'Debbie at her ledger in the office',
    title: 'I’ll keep the books',
    text: 'We start with $1,000. Come see me in the Office to look over the morning and pay the bill.'
  },
  {
    speaker: 'Joe Rice',
    art: 'opening-tractor',
    alt: 'Joe on the tractor by the pasture gate',
    title: 'Let’s open the first plot',
    text: 'Tap the wooded plot. We’ll clear the trees, then fence it for our first pigs. We’ve already got what we need to build it.'
  }
];

const mapLocations = ['barn', 'pasture', 'piglets', 'supply', 'orders', 'office'];

function barnCue(state, forecast) {
  if (state.shipment) return 'Truck on the road';
  if (state.lastDelivery?.week === state.week && state.grain) return 'Grain ready';
  if (!state.feeding && forecast.shortfall) return `Feed short by ${forecast.shortfall}`;
  return '';
}

function pastureCue(state, forecast) {
  const unfinished = state.plots.find(plot => plot.status === 'wooded' || plot.status === 'cleared');
  if (unfinished) {
    const first = unfinished.id === '1';
    const text = unfinished.status === 'wooded'
      ? first ? 'Clear trees' : `Clear Plot ${unfinished.id}`
      : first ? 'Build first pen' : `Build Pen ${unfinished.id}`;
    return { text, attributes: first ? '' : ` data-select-plot="${unfinished.id}"` };
  }
  if (!state.feeding && forecast.shortfall) {
    const ready = state.paddocks.find(paddock => paddock.status === 'ready');
    if (ready) {
      const rotated = applyFarmAction(state, { type: 'rotate', id: ready.id }).state;
      if (feedForecast(rotated).shortfall < forecast.shortfall) {
        return { text: 'Rotate pasture', attributes: ' data-open="pasture-gate"' };
      }
    }
  }
  const spare = state.plots.find(plot => plot.status === 'grazing');
  if (!spare) return null;
  const status = { active: 'available', resting: 'resting', exhausted: 'grazed out' }[spare.forage.status];
  return { text: `Spare grass ${status}`, attributes: ` data-select-plot="${spare.id}"` };
}

function mapView(state, { previousPlace, route, deliveryStage }) {
  const forecast = feedForecast(state);
  const first = state.plots[0];
  const routePaused = Boolean(route && route.status !== 'arrived');
  const marketReady = saleGroups(state, 'market').length;
  const feederReady = saleGroups(state, 'feeder').length;
  const pasture = state.result ? null : pastureCue(state, forecast);
  const cues = state.result ? {} : {
    barn: barnCue(state, forecast),
    pasture: pasture?.text,
    piglets: route?.status === 'arrived' && !state.feeding ? 'Bucket at the pen' : '',
    supply: state.plots.some(plot => plot.status === 'fenced' && !plot.pigs) ? 'Buy starters'
      : state.plots.some(plot => plot.status === 'available') ? 'Pen kits available' : '',
    orders: marketReady ? 'Market hogs ready' : feederReady ? 'Feeders ready' : '',
    office: state.feeding && !state.shipment ? 'Review morning' : ''
  };
  const pin = place => {
    const cue = cues[place];
    const remainingShort = place === 'barn' && cue === 'Grain ready' && !state.feeding && forecast.shortfall
      ? ` · short by ${forecast.shortfall}` : '';
    return `<button class="farm-map-pin farm-map-pin--${place}" type="button" data-place="${place}"
      aria-label="${placeNames[place]}"${place === 'pasture' ? pasture?.attributes ?? '' : ''}${cue ? ` data-map-cue="${place}" aria-description="${cue}${remainingShort}"` : ''}>
      <span>${placeNames[place]}</span>${cue ? `<small><span>${cue}</span>${remainingShort}</small>` : ''}
    </button>`;
  };
  const routePin = routePaused ? `<button class="farm-map-pin farm-map-pin--route" type="button"
    data-place="route" data-map-cue="route"${previousPlace === 'route' ? ' aria-label="Return to Feed run"' : ''}>Resume feed run</button>` : '';
  const back = routePaused && previousPlace === 'route' ? ''
    : `<button class="farm-map-return farm-small-button" type="button" data-place="back">Return to ${placeNames[previousPlace]}</button>`;
  return {
    art: openingArt('map', first.status, { plots: state.plots, deliveryStage: state.shipment && (deliveryStage || 'arriving') }),
    controls: `<nav class="farm-map-pins" aria-label="Places on the farm">
      ${mapLocations.map(pin).join('')}${routePin}${back}
    </nav>`,
    details: '<p>Pick a place to visit.</p>'
  };
}

function plotControl(state, plot, selected) {
  const first = plot.id === '1';
  if (!selected && plot.status === 'wooded') {
    return `<button class="farm-plot-target" type="button" data-select-plot="${plot.id}">
      <span>${first ? 'Wooded plot' : `Wooded Plot ${plot.id}`}</span>
    </button>`;
  }
  const next = {
    wooded: `<button class="farm-primary-action" type="button" data-action="clear-plot" data-target="${plot.id}">Clear trees</button>`,
    cleared: `<button class="farm-primary-action" type="button" data-action="build-pen" data-target="${plot.id}">Build ${first ? 'first pen' : `Pen ${plot.id}`}</button>`,
    fenced: !plot.pigs ? '<button class="farm-primary-action" type="button" data-place="supply">Go to Farm Supply</button>'
      : state.week === 1 && !state.feeding ? '<button class="farm-primary-action" type="button" data-place="barn">Go to Barn</button>' : '',
    grazing: '<button class="farm-small-button" type="button" data-place="supply">Review pen conversion</button>',
    available: '<button class="farm-small-button" type="button" data-place="supply">Review land use at Farm Supply</button>'
  };
  return next[plot.status] ? `<div class="farm-stage-controls">${next[plot.status]}</div>` : '';
}

function plotDetail(state, plot, selected) {
  switch (plot.status) {
    case 'wooded':
      return selected ? `Clear the trees to make room for Pen ${plot.id}.` : 'Tap the wooded plot to start.';
    case 'cleared':
      return plot.id === '1' ? 'The trees are clear. We have supplies for the first pen.'
        : `Plot ${plot.id} is clear. Build the pen with the supplies you bought.`;
    case 'fenced':
      if (!plot.pigs) return plot.id === '1' && !state.litterBorn
        ? 'The first pen is ready. Visit Farm Supply for starters.' : `Pen ${plot.id} is empty. Farm Supply has starters.`;
      return plot.fedWeeks >= 6 ? `Pen ${plot.id} is market ready. Check Orders.` : `The growers are in Pen ${plot.id}.`;
    case 'grazing':
      return 'Plot 2 is open for spare grazing. Review the forecast before converting it to a pen.';
    default:
      return `Plot ${plot.id} is available. Check Farm Supply for the land-use choices.`;
  }
}

function pastureView(state, { selectedPlot, recentAction }) {
  const plots = state.plots.filter(plot => plot.status !== 'locked');
  const plot = plots.find(plot => plot.id === selectedPlot) ?? plots[0];
  const selected = selectedPlot === plot.id;
  const gate = state.litterBorn ? renderPastureGate(state) : null;
  const switches = plots.length > 1 ? `<div class="farm-plot-selectors" role="group" aria-label="Grower plots">
    ${plots.map(candidate => `<button class="farm-small-button" type="button" data-select-plot="${candidate.id}"
      aria-pressed="${candidate === plot}">${candidate.status === 'fenced' ? 'Pen' : 'Plot'} ${candidate.id}</button>`).join('')}
    </div>` : '';
  return {
    art: openingArt('pasture', plot.status, {
      pigs: plot.pigs, fedWeeks: plot.fedWeeks, breeders: state.breeders,
      arriving: recentAction?.type === 'buy-starters' && recentAction.id === plot.id
    }),
    controls: `<div class="farm-plot" data-plot="${plot.id}" data-stage="${plot.status}">${plotControl(state, plot, selected)}</div>
      ${switches}${gate?.controls ?? ''}`,
    details: `<p>${plotDetail(state, plot, selected)}</p>${herdDetails(state, plot)}
      ${gate?.details ?? ''}${spareGrassDetail(state)}`
  };
}

export function renderPlace(place, state, context) {
  if (place === 'pasture') return pastureView(state, context);
  if (place === 'map') return mapView(state, context);
  return renderChorePlace(place, state, context) ?? renderCommercePlace(place, state, context)
    ?? renderOfficePlace(place, state, context) ?? {
    art: '',
    controls: '',
    details: '<p>Open the map to visit another place.</p>'
  };
}

export function renderDecision(panel, state, context) {
  return renderChoreDecision(panel, state, context) ?? renderCommerceDecision(panel, state, context)
    ?? renderOfficeDecision(panel, state, context);
}
