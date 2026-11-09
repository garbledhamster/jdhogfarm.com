import { openingArt } from './opening-art.mjs';

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
    text: 'We’ve got $1,000 to get the farm going. I’ll be in the Office when you’re ready to look over the morning and pay the weekly bill.'
  },
  {
    speaker: 'Joe Rice',
    art: 'opening-tractor',
    alt: 'Joe on the tractor by the pasture gate',
    title: 'Let’s open the first plot',
    text: 'Tap the wooded plot. We’ll clear the trees, then fence it for our first pigs. We’ve already got what we need to build it.'
  }
];

const mapLocations = [
  ['barn', 'barn'], ['pasture', 'pasture'], ['piglets', 'piglets'],
  ['supply', 'supply'], ['orders', 'orders'], ['office', 'office']
];

function mapView(state, { previousPlace }) {
  return {
    art: openingArt('map', state.plots[0].status),
    controls: `<nav class="farm-map-pins" aria-label="Places on the farm">
      ${mapLocations.map(([place, position]) =>
        `<button class="farm-map-pin farm-map-pin--${position}" type="button" data-place="${place}">${placeNames[place]}</button>`
      ).join('')}
      <button class="farm-map-return farm-small-button" type="button" data-place="back">Return to ${placeNames[previousPlace]}</button>
    </nav>`,
    details: '<p>Pick a place to visit.</p>'
  };
}

function pastureView(state, { selectedPlot }) {
  const plot = state.plots[0];
  const selected = selectedPlot === plot.id;
  const labels = { wooded: 'Wooded plot', cleared: 'Cleared plot', fenced: 'First grower pen' };
  const tasks = {
    wooded: selected ? 'Clear the trees to make room for the first pen.' : 'Tap the wooded plot to start.',
    cleared: 'The trees are clear. We have supplies for the first pen.',
    fenced: 'The first pen is ready. Visit Farm Supply for starters.'
  };
  const next = {
    wooded: '<button class="farm-primary-action" type="button" data-action="clear-plot" data-target="1">Clear trees</button>',
    cleared: '<button class="farm-primary-action" type="button" data-action="build-pen" data-target="1">Build first pen</button>',
    fenced: '<button class="farm-primary-action" type="button" data-place="supply">Go to Farm Supply</button>'
  };
  const needsSelection = !selected && plot.status === 'wooded';
  return {
    art: openingArt('pasture', plot.status),
    controls: `<div class="farm-plot" data-plot="${plot.id}" data-stage="${plot.status}">
      ${needsSelection
        ? `<button class="farm-plot-target" type="button" data-select-plot="${plot.id}"><span>${labels[plot.status]}</span></button>`
        : `<div class="farm-stage-controls">${next[plot.status]}</div>`}
    </div>`,
    details: `<p>${tasks[plot.status]}</p>`
  };
}

export function renderPlace(place, state, context) {
  if (place === 'pasture') return pastureView(state, context);
  if (place === 'map') return mapView(state, context);
  return {
    art: '',
    controls: '',
    details: '<p>Open the map to visit another place.</p>'
  };
}

export function renderDecision() {
  return null;
}
