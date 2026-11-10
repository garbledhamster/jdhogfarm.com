import { FARTHER_PLOT_IDS } from './morning.mjs';
import { creekBridge, penGate, pigletPen, supplyShop } from './landmark-art.mjs';

function barn(deliveryStage) {
  const truck = deliveryStage ? `<g class="farm-map-truck" data-map-truck="${deliveryStage}"
    transform="translate(${deliveryStage === 'unloading' ? '164 98' : '201 98'}) scale(.8)">
    <path d="M-40-19H6v25h-46z" fill="#d79753" stroke="#603a2b" stroke-width="3"/>
    <path d="M6-17h23l12 15v8H6z" fill="#477863" stroke="#263f3a" stroke-width="3"/>
    <path d="M11-12h15l7 9H11z" fill="#cde2d3"/>
    <path d="M-34-13h34" fill="none" stroke="#f5cf85" stroke-width="3"/>
    <circle cx="-26" cy="7" r="7" fill="#412e23"/><circle cx="28" cy="7" r="7" fill="#412e23"/>
  </g>` : '';
  return `<use href="#jd-grain-barn" transform="translate(65 37) scale(.44)"/>${truck}`;
}

function fartherPlotArt(plot) {
  const fill = { available: '#a1ac58', wooded: '#829446', cleared: '#d6aa69', fenced: '#c28f57' }[plot.status];
  const fence = plot.status === 'fenced' ? '#704426' : '#e2ce86';
  const x = plot.id === '4' ? 21 : 175;
  const rails = plot.status === 'fenced'
    ? '<path d="M5 16v-5l18-10 21 12v6M23 1v7m11-1v6" fill="none" stroke="#704426" stroke-width="2.5"/>' : '';
  const woods = plot.status === 'wooded' ? '<use href="#jd-oak-art" transform="translate(12 5) scale(.25)"/>' : '';
  const pig = plot.pigs ? '<image href="game/art/pig.svg" x="20" y="6" width="31" height="23"/>' : '';
  return `<g data-map-plot="${plot.id}" data-stage="${plot.status}" data-pigs="${plot.pigs}"
    transform="translate(${x} 9)">
    <path d="M0 17 23 3 48 17 23 32Z" fill="${fill}" stroke="${fence}" stroke-width="3"/>
    ${rails}${woods}${pig}
    <rect x="0" y="16" width="24" height="24" rx="4" fill="#583b28" stroke="#ffedc0" stroke-width="1.5"/>
    <text x="12" y="34" text-anchor="middle" fill="#ffedc0" font-size="21" font-weight="700">${plot.id}</text>
  </g>`;
}

function pasture(plots) {
  const first = plots[0].status;
  const farther = plots.filter(plot => FARTHER_PLOT_IDS.includes(plot.id));
  const extra = plots.slice(1).filter(plot => !FARTHER_PLOT_IDS.includes(plot.id) && plot.status !== 'locked').map((plot, index) => {
    const fill = plot.status === 'grazing' ? '#a1bc68' : plot.status === 'available' ? '#a1ac58' : '#c28f57';
    const fence = plot.status === 'fenced' ? '#704426' : '#e2ce86';
    return `<path data-map-plot="${plot.id}" data-stage="${plot.status}" transform="translate(${137 + index * 20} ${35 + index * 21})"
      d="M0 19l33-18 32 21-34 20z" fill="${fill}" stroke="${fence}" stroke-width="3"/>`;
  }).join('');
  const wooded = `<use href="#jd-oak-art" transform="translate(94 63) scale(.39)"/>
    <use href="#jd-oak-art" transform="translate(126 73) scale(.37)"/>`;
  const fence = '<path d="M53 56l59-31 56 28-59 37z" fill="none" stroke="#84502f" stroke-width="5" stroke-linejoin="round"/>';
  return `<g${plots.some(plot => plot.status === 'grazing') ? ' data-map-spare-grass="true"' : ''}>${extra}
    <path d="M48 67l63-33 62 28-62 39z" fill="${first === 'wooded' ? '#acb65e' : '#bf905c'}" stroke="#e9ce77" stroke-width="3"/>
    ${first === 'wooded' ? wooded : first === 'fenced' ? fence : ''}
    ${farther.map(fartherPlotArt).join('')}
  </g>`;
}

const office = `<path d="M56 83l72 29 66-25-63-25z" fill="#445e34" opacity=".38"/>
  <path d="M60 45h84v54H60z" fill="#e0b781" stroke="#6c482e" stroke-width="3"/>
  <path d="M144 45l38-16v54l-38 16z" fill="#b98252" stroke="#6c482e" stroke-width="3"/>
  <path d="M49 47l27-29h83l-12 29z" fill="#995139" stroke="#5b3e2c" stroke-width="4"/>
  <path d="M159 18l31 11-43 18z" fill="#6b3e2d" stroke="#5b3e2c" stroke-width="4"/>
  <path d="M63 40h86M73 31h79" stroke="#cb8763" stroke-width="3"/>
  <path d="M94 96V61h22v35" fill="#6e4b33"/>
  <path d="M69 61h15v19H69zm57 0h11v19h-11zm26-4 18-7v19l-18 7z" fill="#5d7f6e" stroke="#8d6945" stroke-width="3"/>`;

const orders = `<path d="M44 76l72-44 82 37-66 38z" fill="#bd945b" stroke="#e0bd80" stroke-width="4"/>
  <path d="M58 72l57-34 65 29m-122 13 57-34 65 29" fill="none" stroke="#845530" stroke-width="5"/>
  <path d="M58 84V62m57-12V27m65 55V57" stroke="#624229" stroke-width="6"/>
  <path d="M68 84l47-13 27 10-41 17z" fill="#c77a47" stroke="#634229" stroke-width="3"/>
  <path d="M114 71V54h22l12 17v10h-7z" fill="#b66848" stroke="#634229" stroke-width="3"/>
  <path d="M119 58h13l8 11h-21z" fill="#cde2d3"/>
  <circle cx="86" cy="89" r="7" fill="#413024"/><circle cx="134" cy="80" r="7" fill="#413024"/>`;

export function mapPlaceArt(place, { plots, deliveryStage } = {}) {
  const artwork = {
    barn: () => barn(deliveryStage),
    pasture: () => pasture(plots),
    piglets: () => pigletPen('translate(112 58) scale(.75)'),
    supply: () => supplyShop('translate(109 70) scale(.62)'),
    orders: () => orders,
    office: () => office,
    bridge: () => creekBridge('translate(116 59) rotate(88) scale(.45 .78)'),
    gate: () => penGate('translate(115 69) scale(.9)')
  };
  return `<svg data-map-place-art="${place}" viewBox="0 0 230 116" aria-hidden="true">${artwork[place]()}</svg>`;
}
