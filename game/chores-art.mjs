import { barnSymbol } from './barn-art.mjs';
import { creekBridge, penGate, pigletPen } from './landmark-art.mjs';

// Scene layers from the approved farm-morning prototype. Only foreground actors move.
const outdoors = `          <pattern id="chore-turf" width="69" height="58" patternUnits="userSpaceOnUse">
            <path d="M8 16l4-5m-4 5-3-3m29 27 5-6m-5 6-3-5m20-23 4-6m-4 6-4-2" fill="none" stroke="#466b37" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 40l6 2m38 5 7-1m-39-32 6-1" fill="none" stroke="#e6da82" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
          </pattern>
          <g id="chore-oak-art">
            <ellipse cx="13" cy="2" rx="42" ry="12" fill="#2c4a2a" opacity=".28"/>
            <path d="M-8 0l6-42-13-12 5-5 12 10 9-19 7 3-9 27 5 38z" fill="#69402a"/>
            <path d="M0-3l6-37 4-7-1 15 4 29z" fill="#976036"/>
            <path d="M-48-53q-9-13 2-29 3-19 20-26 12-21 33-16 21-7 36 13 17 4 20 23 14 15 1 30-10 17-33 17-21 12-40-1-23 6-39-11z" fill="#355831"/>
            <path d="M-48-73q1-18 18-27 14-21 33-16 20-7 35 11 16 4 21 17-12 12-23 9-8 17-27 12-19 10-32-3-15 8-25-3z" fill="#598343"/>
            <path d="M-34-93q10-14 27-11 14-10 31 2 5 3 7 7-14-3-24 5-12-5-27 1z" fill="#7e9d50"/>
            <path d="M-40-61q13 7 26 0m29 11q12 0 17-6m3-34q9 2 13 7m-53 7q8 4 17-1" fill="none" stroke="#9fb463" stroke-opacity=".38" stroke-width="2" stroke-linecap="round"/>
          </g>
          <g id="chore-backlot">
            <path fill="#83a24f" d="M0 0h960v620H0z"/>
            <path fill="#759347" d="M0 149L356 56l302 61 302-55v115l-247 40-353-73L0 252zM0 437l168-52 219 77 273-36 300 112v82H0z"/>
            <path fill="url(#chore-turf)" d="M0 0h960v620H0z"/>
            <use href="#chore-oak-art" transform="translate(154 248) scale(1.2)"/>
            <use href="#chore-oak-art" transform="translate(241 181) scale(.92)"/>
            <use href="#chore-oak-art" transform="translate(320 147) scale(.85)"/>
            <use href="#chore-oak-art" transform="translate(404 135) scale(.8)"/>
            <use href="#chore-oak-art" transform="translate(503 153) scale(.88)"/>
            <use href="#chore-oak-art" transform="translate(618 142) scale(.94)"/>
            <use href="#chore-oak-art" transform="translate(711 173) scale(.83)"/>
            <use href="#chore-oak-art" transform="translate(805 227) scale(1.23)"/>
            <use href="#chore-oak-art" transform="translate(900 264) scale(.97)"/>
            <use href="#chore-oak-art" transform="translate(166 544) scale(1.28)"/>
            <use href="#chore-oak-art" transform="translate(837 543) scale(1.1)"/>
          </g>`;

const bucketPerson = `<g id="chore-bucket-person">
    <ellipse cx="4" cy="5" rx="28" ry="9" fill="#3d4228" opacity=".29"/>
    <path d="M-11-21l-2 20m21-20 3 19" fill="none" stroke="#395369" stroke-width="10" stroke-linecap="round"/>
    <path d="M-16 0h9m12 0h10" fill="none" stroke="#543629" stroke-width="7" stroke-linecap="round"/>
    <path d="M-20-44c9-9 25-10 36-2l6 28c-15 6-28 7-43 0z" fill="#b96937" stroke="#59382a" stroke-width="2.5"/>
    <path d="M-17-44l3 21 8 3-2-29m20 2-1 22" fill="none" stroke="#e7a157" stroke-width="3"/>
    <path d="M-11-46l7 5 7-7m-5 8 1 22" fill="none" stroke="#7c432d" stroke-width="2" stroke-linecap="round"/>
    <path d="M17-39l15 13m-49-14-9 15" fill="none" stroke="#c97a44" stroke-width="9" stroke-linecap="round"/>
    <path d="M27-30l6 5m-58-3-2 4" fill="none" stroke="#edb987" stroke-width="6" stroke-linecap="round"/>
    <path d="M-13-57q1-15 16-13 14 1 13 14-1 12-15 13-14 0-14-14z" fill="#e6ab77" stroke="#70462f" stroke-width="2"/>
    <path d="M-10-57q0 10 5 12l5-4-5-9z" fill="#e1d0ae"/>
    <path d="M-16-57q-3-17 14-20 16-1 21 12l9 4-5 6-24-3-14 2z" fill="#d6a151" stroke="#674627" stroke-width="2"/>
    <path d="M-11-66q4-8 16-7" fill="none" stroke="#f0c674" stroke-width="2" stroke-linecap="round"/>
    <path d="M24-18v-7q6-9 15 0l1 7" fill="none" stroke="#4b5247" stroke-width="3"/>
    <path d="M21-20h22l-3 21q-8 5-16 0z" fill="#b3bbab" stroke="#555d51" stroke-width="2"/>
    <path d="M23-16h18m-15 4 2 11" stroke="#e1debf" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;

const soil = `          <pattern id="chore-soil" width="40" height="31" patternUnits="userSpaceOnUse">
            <path d="M5 8l5-2m16 15 7 2m-23 2 4-1m21-17 4 2" fill="none" stroke="#7f532f" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 13l7-2m7 15 4-1" fill="none" stroke="#ffe5a2" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
          </pattern>`;

const penPost = `<g id="chore-post">
            <path d="M-4 1v-32l6-3 5 3V1L2 4z" fill="#6e3e25"/>
            <path d="M2-30v34l5-3v-32z" fill="#57311f"/>
            <path d="M-4-31l6-3 5 3-5 3z" fill="#e0ae67"/>
          </g>`;

function scene(definitions, attributes, content) {
  return `<svg viewBox="0 0 960 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" ${attributes}>
    <defs>${outdoors}${definitions}</defs>
    ${content}
  </svg>`;
}

export function renderBarnArt(grain, stage) {
  return scene(barnSymbol('chore-grain-barn'), `data-delivery-stage="${stage ?? 'idle'}" data-bin-stocked="${grain > 0}"`, `
          <use href="#chore-backlot"/>
          <path d="M980 438q-225-29-365-89-107-49-245-16t-270 85" fill="none" stroke="#b79e66" stroke-width="93"/>
          <path d="M980 438q-225-29-365-89-107-49-245-16t-270 85" fill="none" stroke="#d4bb83" stroke-width="79"/>
          <path d="M980 439q-225-30-365-90-107-49-245-16t-270 85" fill="none" stroke="#f4dca4" stroke-width="3" stroke-dasharray="16 23 4 21"/>
          <use href="#chore-grain-barn" transform="translate(299 256) scale(.88)"/>
          <g transform="translate(551 365)">
            <ellipse cx="5" cy="14" rx="45" ry="14" fill="#634d30" opacity=".33"/>
            <path d="M-34-8l24-12 52 9v23L13 30l-47-13z" fill="#946338" stroke="#513721" stroke-width="3"/>
            <path d="M-34-8l47 12v26l-47-13z" fill="#c48e51" stroke="#513721" stroke-width="3"/>
            <path d="M-34-8l24-12 52 9L13 4z" fill="#5b3d27" stroke="#f0bf7c" stroke-width="3"/>
            <path class="farm-bin-grain" d="M-25-8l16-9 40 7L12 0z" fill="#f4cb57"/>
            <path d="M-27 8l33 9m-33-3 33 9m15-5 15-9" fill="none" stroke="#e5b371" stroke-width="2"/>
          </g>
          <g class="farm-grain-truck">
            <ellipse cx="20" cy="22" rx="95" ry="18" fill="#5c462c" opacity=".37"/>
            <path d="M-63 6H97l-8 20H-57z" fill="#523b32"/>
            <path d="M47 8l5-51h39l19 28V9l-15 12H56z" fill="#477863" stroke="#263f3a" stroke-width="3"/>
            <path d="M58-37h28l14 22H57z" fill="#b3ded1" stroke="#35585a" stroke-width="3"/>
            <path d="M58-9h17m24 4h10" stroke="#edda8d" stroke-width="4" stroke-linecap="round"/>
            <g class="farm-grain-bed">
              <path d="M-56-21h101v31H-45z" fill="#ae742f" stroke="#563d28" stroke-width="3"/>
              <path d="M-57-21l15-11h98L45-21z" fill="#efba52" stroke="#644626" stroke-width="3"/>
              <path d="M-43-15h77m-72 6h70m-62 7h61" stroke="#edaf50" stroke-width="3"/>
            </g>
            <circle cx="-29" cy="22" r="16" fill="#39332d" stroke="#1f2525" stroke-width="3"/>
            <circle cx="79" cy="22" r="16" fill="#39332d" stroke="#1f2525" stroke-width="3"/>
            <circle cx="-29" cy="22" r="6" fill="#b4a883"/><circle cx="79" cy="22" r="6" fill="#b4a883"/>
          </g>
          <g class="farm-grain-fall" fill="#ffe17a" stroke="#ae7335" stroke-width="1">
            <circle cx="552" cy="328" r="3"/><circle cx="558" cy="335" r="3"/><circle cx="548" cy="343" r="3"/>
            <circle cx="554" cy="348" r="3.5"/><circle cx="544" cy="355" r="3"/><circle cx="549" cy="361" r="3"/>
          </g>
          <use href="#chore-oak-art" transform="translate(735 520) scale(.87)"/>
  `);
}

function routeTransform(lane, progress) {
  const x = 480 + (lane - 1) * (73 - 19 * progress);
  const y = 443 - 234 * progress;
  const scale = 1 - 0.3 * progress;
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(2)})`;
}

function snake(obstacle) {
  return `<g data-chore-obstacle="${obstacle.id}" transform="${routeTransform(obstacle.lane, obstacle.at)}">
    <ellipse cx="0" cy="1" rx="30" ry="7" fill="#543b29" opacity=".28"/>
    <path d="M-27-4q9-12 21-2t20-4l7-6" fill="none" stroke="#303826" stroke-width="8" stroke-linecap="round"/>
    <path d="M-27-4q9-12 21-2t20-4l7-6" fill="none" stroke="#737b43" stroke-width="4" stroke-linecap="round"/>
    <path d="M17-15l5-7 10 2-4 8-10 2z" fill="#8a9558" stroke="#303826" stroke-width="2"/>
    <circle cx="25" cy="-17" r="1.4" fill="#282219"/>
  </g>`;
}

export function renderRouteArt(route, motion) {
  const progress = route ? visibleProgress(route.progress, motion) : 0;
  const heroPosition = routeTransform(route?.lane ?? 1, progress);
  const obstacles = route?.obstacles ?? [{ id: 'rock', at: 0.5, lane: 1 }];
  const rock = obstacles.find(obstacle => obstacle.id === 'rock');
  const rockPosition = routeTransform(rock?.lane ?? 1, rock?.at ?? 0.5);
  const snakes = obstacles.filter(obstacle => obstacle.id !== 'rock').map(snake).join('');
  const segment = Math.min(route?.completedStops ?? 0, (route?.plan?.length ?? 1) - 1);
  const stop = route?.plan?.[segment];
  const farther = segment > 0;
  const destination = stop?.id === 'gate' ? 'Creek gate' : farther ? `Pen ${stop.id}` : 'Piglets';
  return scene(bucketPerson + soil, `data-route-stop="${stop?.id ?? 'litter'}"`, `
          <path fill="#83a24f" d="M-1800 0h4560v620h-4560z"/>
          <path fill="#759347" d="M-1800 80L0 149v103l-1800-82zM960 62l1800 38v105L960 177zM-1800 448 0 437v183h-1800zM960 548l1800-40v112H960z"/>
          <path fill="url(#chore-turf)" d="M-1800 0h4560v620h-4560z"/>
          <use href="#chore-backlot"/>
          <path d="M279 620q72-200 123-447h156q47 231 123 447z" fill="#a38c5b"/>
          <path d="M296 620q70-200 116-447h136q46 231 116 447z" fill="#d1b77a"/>
          <path d="M296 620q70-200 116-447h136q46 231 116 447z" fill="url(#chore-soil)" opacity=".72"/>
          <path d="M420 620q22-185 34-444m85 444q-20-185-33-444" fill="none"
            stroke="#ac9057" stroke-width="2.5" stroke-dasharray="15 21 5 24" stroke-linecap="round" opacity=".52"/>
          <path d="M312 494l19-6m285 3 15 8m-281-87 20-9m219 5 20 8" fill="none"
            stroke="#f1d595" stroke-width="3" stroke-linecap="round" opacity=".65"/>
          ${farther || stop?.id === 'gate' ? '' : pigletPen('translate(481 142)')}
          ${farther ? '' : `<path d="M-1800 298q1460 20 1800-59 196-48 480-4t480-15q259-66 1800-115" fill="none" stroke="#a1a271" stroke-width="72"/>
          <path d="M-1800 298q1460 20 1800-59 196-48 480-4t480-15q259-66 1800-115" fill="none" stroke="#599394" stroke-width="58"/>
          <path d="M-1800 299q1460 20 1800-59 199-44 474-6t486-14q259-66 1800-115" fill="none" stroke="#8cbdb1" stroke-width="5" stroke-dasharray="15 14 5 13" stroke-linecap="round"/>
          ${creekBridge('translate(480 238)')}`}
          ${farther ? `<path d="M282 192h396m-396 20h396" stroke="#d7a16b" stroke-width="8"/>
          <rect x="421" y="119" width="118" height="35" rx="4" fill="#f5deb0" stroke="#67482f" stroke-width="2"/>
          <text x="480" y="143" text-anchor="middle" fill="#362319" font-size="24" font-weight="bold">${destination}</text>` : ''}
          ${penGate('translate(480 178)')}
          ${rock ? `<g data-chore-obstacle="rock" transform="${rockPosition}">
            <ellipse cx="7" cy="2" rx="27" ry="9" fill="#594b39" opacity=".4"/>
            <path d="M-26 0l5-21 22-11 21 9 8 20-13 9-31 1z" fill="#77756a" stroke="#554e3e" stroke-width="3"/>
            <path d="M-21-21l22-11 21 9-10 11-22 2z" fill="#aaa38a"/>
            <path d="M12-12l10-11 8 20-13 9z" fill="#625f52"/>
          </g>` : ''}
          ${snakes}
          <g data-chore-hero="" transform="${heroPosition}"><use href="#chore-bucket-person"/></g>
  `);
}

function visibleProgress(progress, motion) {
  return motion ? progress : Math.floor(progress * 8) / 8;
}

const LANE_STEP_MS = 120;

export function createRouteCarrier(readProgress) {
  let sprite;
  let frame = null;
  let previousRoute;
  let previousMotion;
  let lane = 1;
  let progress = 0;
  let step;

  function draw() {
    sprite?.setAttribute('transform', routeTransform(lane, progress));
  }

  function animate(time) {
    if (step) {
      const fraction = Math.max(0, Math.min(1, (time - step.started) / LANE_STEP_MS));
      lane = step.from + (previousRoute.lane - step.from) * (1 - (1 - fraction) ** 3);
      if (fraction === 1) step = null;
    }
    // A pause can discard part of a scheduler tick. Hold the last frame until it catches up.
    progress = Math.max(progress, readProgress());
    draw();
    frame = requestAnimationFrame(animate);
  }

  return function syncCarrier(container, route, motion, active) {
    sprite = route ? container.querySelector('[data-chore-hero]') : null;
    const walking = route?.status === 'walking';
    const animateCarrier = active && walking && motion && sprite;
    if (!animateCarrier && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      step = null;
    }
    const retrying = walking && !route.assisted && previousRoute?.status === 'blocked';
    if (!motion || !previousMotion || !walking || !previousRoute || retrying || route.completedStops !== previousRoute.completedStops) {
      lane = route?.lane ?? 1;
      progress = visibleProgress(route?.progress ?? 0, motion);
      step = null;
    }
    if (animateCarrier) {
      if (!step || previousRoute?.lane !== route.lane) {
        step = lane === route.lane ? null : { from: lane, started: performance.now() };
      }
      if (frame === null) frame = requestAnimationFrame(animate);
    }
    previousRoute = route;
    previousMotion = motion;
    draw();
  };
}

export function paintChoreRoute(container, route, motion) {
  if (!motion) {
    const hero = container.querySelector('[data-chore-hero]');
    hero?.setAttribute('transform', routeTransform(route.lane, visibleProgress(route.progress, motion)));
  }
  for (const obstacle of route.obstacles) {
    const sprite = container.querySelector(`[data-chore-obstacle="${obstacle.id}"]`);
    const position = motion ? obstacle : { ...obstacle, lane: Math.round(obstacle.lane) };
    sprite?.setAttribute('transform', routeTransform(position.lane, position.at));
  }
  const meter = container.querySelector('[data-chore-progress]');
  if (meter) meter.value = Math.floor((route.tripProgress ?? route.progress) * 100);
}

const pigletPositions = [
  { x: 459, y: 284, facing: 1, moveX: 18, moveY: 22 },
  { x: 547, y: 259, facing: -1, moveX: -13, moveY: 32 },
  { x: 569, y: 310, facing: -1, moveX: 3, moveY: 12 }
];

export function renderPigletArt({ pigs, fedWeeks, fed, bucketAtPen }) {
  const size = (70 + Math.min(6, fedWeeks) * 9) / 100;
  const sprites = pigletPositions.slice(0, pigs).map(({ x, y, facing, moveX, moveY }) =>
    `<g transform="translate(${x} ${y})"><g data-piglet-sprite="" style="--feed-x:${moveX}px;--feed-y:${moveY}px"><g transform="scale(${size * facing} ${size})"><image href="game/art/pig.svg" x="-33" y="-32" width="66" height="42.26"/></g></g></g>`
  ).join('');
  return scene(soil + penPost + bucketPerson, `data-trough-stocked="${fed}"`, `
          <use href="#chore-backlot"/>
          <path d="M980 468q-265 4-469-66t-510-19" fill="none" stroke="#ccb07a" stroke-width="61"/>
          <path d="M284 312l238-127 206 109-233 145z" fill="#3e6035" opacity=".42"/>
          <path d="M299 306l223-117 196 105-221 134z" fill="#bd905a" stroke="#724c31" stroke-width="4"/>
          <path d="M299 306l223-117 196 105-221 134z" fill="url(#chore-soil)"/>
          <path d="M301 288l221-116 196 103m-417 25 221-116 196 103" fill="none" stroke="#79482c" stroke-width="8" stroke-linejoin="round"/>
          <path d="M301 286l221-116 196 103m-417 25 221-116 196 103" fill="none" stroke="#d7a16b" stroke-width="3" stroke-linejoin="round"/>
          <use href="#chore-post" x="301" y="307"/><use href="#chore-post" x="354" y="279"/><use href="#chore-post" x="410" y="250"/>
          <use href="#chore-post" x="465" y="221"/><use href="#chore-post" x="522" y="191"/><use href="#chore-post" x="575" y="220"/>
          <use href="#chore-post" x="625" y="246"/><use href="#chore-post" x="674" y="272"/><use href="#chore-post" x="718" y="295"/>
          ${sprites}
          <path d="M466 325l84 34 32-17v17l-30 21-84-38z" fill="#ac7746" stroke="#63432c" stroke-width="3"/>
          <path d="M466 325l35-16 81 33-32 17z" fill="#695239" stroke="#edbf7f" stroke-width="4"/>
          <path class="farm-trough-grain" d="M478 325l24-11 69 28-22 12z" fill="#f2c550"/>
          <path d="M301 288l196 122 221-135m-417 25 196 122 221-135" fill="none" stroke="#79482c" stroke-width="8" stroke-linejoin="round"/>
          <path d="M301 286l196 122 221-135m-417 25 196 122 221-135" fill="none" stroke="#d7a16b" stroke-width="3" stroke-linejoin="round"/>
          <use href="#chore-post" x="301" y="307"/><use href="#chore-post" x="349" y="337"/><use href="#chore-post" x="399" y="367"/>
          <use href="#chore-post" x="449" y="398"/><use href="#chore-post" x="497" y="429"/><use href="#chore-post" x="552" y="395"/>
          <use href="#chore-post" x="606" y="362"/><use href="#chore-post" x="662" y="329"/><use href="#chore-post" x="718" y="295"/>
          ${bucketAtPen || fed ? '<g transform="translate(600 385)"><g class="farm-trough-carrier"><use href="#chore-bucket-person" transform="scale(-.83 .83)"/></g></g>' : ''}
          <g class="farm-trough-fall" fill="#ffdf70" stroke="#a67833" stroke-width="1">
            <circle cx="574" cy="361" r="3"/><circle cx="570" cy="354" r="3"/><circle cx="565" cy="348" r="3"/><circle cx="559" cy="345" r="3"/>
          </g>
  `);
}
