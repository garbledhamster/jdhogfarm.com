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

const grainBarn = `          <g id="chore-grain-barn">
            <path d="M-16 112l139-68 148 55-135 75z" fill="#43572f" opacity=".36"/>
            <path d="M0 31l127 62v68L0 103z" fill="#9c4634" stroke="#593329" stroke-width="3"/>
            <path d="M127 93l113-57v71l-113 54z" fill="#c56b49" stroke="#593329" stroke-width="3"/>
            <path d="M0 31l53-74L178 8l-51 85z" fill="#593d32" stroke="#432b26" stroke-width="4"/>
            <path d="M53-43l117-48 82 118-74-19z" fill="#815a42" stroke="#432b26" stroke-width="4"/>
            <path d="M127 93l51-85 62 28z" fill="#cf7851" stroke="#593329" stroke-width="3"/>
            <path d="M15 53l20 9v57l-20-9zm25 11 19 9v57l-19-9zm25 12 19 9v55l-19-9zm25 12 19 9v54l-19-9z" fill="#b45940" opacity=".68"/>
            <path d="M149 101l50-24v48l-50 23z" fill="#4d2e25" stroke="#f4bd76" stroke-width="4"/>
            <path d="M154 102l40-20m-40 20 40 21m0-41-40 60" fill="none" stroke="#ab7147" stroke-width="3"/>
            <path d="M206 67l18-9v21l-18 8z" fill="#493126" stroke="#eeba77" stroke-width="3"/>
            <path d="M141 87l28-13v-9l-23 10z" fill="#f7cd87" stroke="#81442c" stroke-width="2"/>
            <path d="M19 33l39-62m-9 77 38-63m-8 77 40-63m-9 76 40-63" fill="none" stroke="#ac8060" stroke-opacity=".42" stroke-width="3"/>
          </g>`;

const bucketPerson = `          <g id="chore-bucket-person">
            <ellipse cx="0" cy="5" rx="26" ry="10" fill="#3f4b2e" opacity=".29"/>
            <path d="M-11-18v19m19-19v19" fill="none" stroke="#355268" stroke-width="10" stroke-linecap="round"/>
            <path d="M-16 0h9m11 0h10" fill="none" stroke="#51372a" stroke-width="7" stroke-linecap="round"/>
            <path d="M-19-45q18-9 36 0l4 28q-21 11-41 0z" fill="#8e4a32" stroke="#503229" stroke-width="2"/>
            <path d="M-12-40l2 19m19-22 3 18" fill="none" stroke="#c77949" stroke-width="3"/>
            <path d="M15-38l17 12M-16-39l-9 15" fill="none" stroke="#f0bb80" stroke-width="8" stroke-linecap="round"/>
            <path d="M-13-56q1-15 16-13 14 1 13 14-1 12-15 13-14 0-14-14z" fill="#edbb86" stroke="#70462f" stroke-width="2"/>
            <path d="M-15-56q-3-18 14-20 16-1 20 11l9 4-5 6-24-3-14 2z" fill="#e4ae51" stroke="#674627" stroke-width="2"/>
            <path d="M24-18v-7q6-9 15 0l1 7" fill="none" stroke="#3e4540" stroke-width="3"/>
            <path d="M21-20h22l-3 21q-8 5-16 0z" fill="#bfc3a9" stroke="#5b5e52" stroke-width="2"/>
            <path d="M23-16h18" stroke="#ece1b9" stroke-width="3"/>
          </g>`;

const pigletPen = `          <pattern id="chore-soil" width="40" height="31" patternUnits="userSpaceOnUse">
            <path d="M5 8l5-2m16 15 7 2m-23 2 4-1m21-17 4 2" fill="none" stroke="#7f532f" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 13l7-2m7 15 4-1" fill="none" stroke="#ffe5a2" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
          </pattern>
          <g id="chore-post">
            <path d="M-4 1v-32l6-3 5 3V1L2 4z" fill="#6e3e25"/>
            <path d="M2-30v34l5-3v-32z" fill="#57311f"/>
            <path d="M-4-31l6-3 5 3-5 3z" fill="#e0ae67"/>
          </g>
          <g id="chore-red-wattle">
            <ellipse cx="3" cy="9" rx="25" ry="8" fill="#45271a" opacity=".25"/>
            <path d="M-18 2v10m15-7v10m16-12v8m8-11v9" fill="none" stroke="#55281d" stroke-width="5" stroke-linecap="round"/>
            <path d="M-19-5q-7-3-6-10 3-3 6 0 2 2 0 4" fill="none" stroke="#6e3323" stroke-width="2.4" stroke-linecap="round"/>
            <path d="M-22-5q0-16 17-18 18-3 27 9l3 7-6 10Q5 10-13 3z" fill="#a64b30" stroke="#5c2b20" stroke-width="2"/>
            <path d="M-19-10q7-14 24-10 11 1 15 10-15-7-37 1z" fill="#c36c46"/>
            <path d="M19-10l8-2 8 7-2 6-11 2-7-6z" fill="#b56241" stroke="#5c2b20" stroke-width="1.5"/>
            <path d="M17-14l2-11 7 4-1 11m-4 11 2 5 4-5" fill="#883c2a" stroke="#602c20" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M28-4l6 1-1 5-6 1z" fill="#de9071"/>
            <circle cx="25" cy="-6" r="1.65" fill="#281610"/>
            <circle cx="32" cy="-1" r="1" fill="#693426"/>
          </g>`;

function scene(definitions, attributes, content) {
  return `<svg viewBox="0 0 960 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" ${attributes}>
    <defs>${outdoors}${definitions}</defs>
    ${content}
  </svg>`;
}

export function renderBarnArt(grain, stage) {
  return scene(grainBarn, `data-delivery-stage="${stage ?? 'idle'}" data-bin-stocked="${grain > 0}"`, `
          <use href="#chore-backlot"/>
          <path d="M980 438q-225-29-365-89-107-49-245-16t-270 85" fill="none" stroke="#b79e66" stroke-width="93"/>
          <path d="M980 438q-225-29-365-89-107-49-245-16t-270 85" fill="none" stroke="#d4bb83" stroke-width="79"/>
          <path d="M980 439q-225-30-365-90-107-49-245-16t-270 85" fill="none" stroke="#f4dca4" stroke-width="3" stroke-dasharray="16 23 4 21"/>
          <use href="#chore-grain-barn" transform="translate(299 207) scale(1.05)"/>
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
  const rockPosition = routeTransform(1, route?.obstacles[0].at ?? 0.5);
  const snakes = route?.obstacles.slice(1).map(snake).join('') ?? '';
  return scene(bucketPerson, '', `
          <use href="#chore-backlot"/>
          <path d="M281 620l124-444h150l124 444z" fill="#a38b5b"/>
          <path d="M298 620l115-444h134l115 444z" fill="#d5b578"/>
          <path d="M417 620l37-444m89 444-37-444" stroke="#aa8754" stroke-width="3" stroke-dasharray="16 15" opacity=".68"/>
          <path d="M0 239q196-48 480-4t480-15" fill="none" stroke="#a1a271" stroke-width="72"/>
          <path d="M0 239q196-48 480-4t480-15" fill="none" stroke="#599394" stroke-width="58"/>
          <path d="M13 238q199-44 461-4t470-12" fill="none" stroke="#8cbdb1" stroke-width="5" stroke-dasharray="15 14 5 13" stroke-linecap="round"/>
          <path d="M401 207h158l25 69H376z" fill="#976540" stroke="#523725" stroke-width="4" stroke-linejoin="round"/>
          <path d="M396 219h169m-175 11h178m-182 11h187m-191 11h195m-199 11h204" stroke="#d8a165" stroke-width="5"/>
          <path d="M401 204l-25 69m183-69 25 69" stroke="#5d3a28" stroke-width="6" stroke-linecap="round"/>
          <path d="M407 186h147l-4-25H410z" fill="#a67e4d" stroke="#5d3a28" stroke-width="3"/>
          <path d="M415 188v-38m20 38v-38m86 38v-38m26 38v-38" stroke="#6c462f" stroke-width="5"/>
          <path d="M414 160h24m84 0h27" stroke="#c69658" stroke-width="4"/>
          <g data-chore-obstacle="rock" transform="${rockPosition}">
            <ellipse cx="7" cy="2" rx="27" ry="9" fill="#594b39" opacity=".4"/>
            <path d="M-26 0l5-21 22-11 21 9 8 20-13 9-31 1z" fill="#77756a" stroke="#554e3e" stroke-width="3"/>
            <path d="M-21-21l22-11 21 9-10 11-22 2z" fill="#aaa38a"/>
            <path d="M12-12l10-11 8 20-13 9z" fill="#625f52"/>
          </g>
          ${snakes}
          <g data-chore-hero="" transform="${heroPosition}"><use href="#chore-bucket-person"/></g>
  `);
}

function visibleProgress(progress, motion) {
  return motion ? progress : Math.floor(progress * 8) / 8;
}

export function paintChoreRoute(container, route, motion) {
  const hero = container.querySelector('[data-chore-hero]');
  if (!hero || !route) return;
  const progress = visibleProgress(route.progress, motion);
  hero.setAttribute('transform', routeTransform(route.lane, progress));
  for (const obstacle of route.obstacles) {
    const sprite = container.querySelector(`[data-chore-obstacle="${obstacle.id}"]`);
    const position = motion ? obstacle : { ...obstacle, lane: Math.round(obstacle.lane) };
    sprite?.setAttribute('transform', routeTransform(position.lane, position.at));
  }
  const meter = container.querySelector('[data-chore-progress]');
  if (meter) meter.value = Math.floor(route.progress * 100);
}

const pigletPositions = [
  { x: 459, y: 284, facing: 1, moveX: 18, moveY: 22 },
  { x: 547, y: 259, facing: -1, moveX: -13, moveY: 32 },
  { x: 569, y: 310, facing: -1, moveX: 3, moveY: 12 }
];

export function renderPigletArt({ pigs, fedWeeks, fed, bucketAtPen }) {
  const size = (70 + Math.min(6, fedWeeks) * 9) / 100;
  const sprites = pigletPositions.slice(0, pigs).map(({ x, y, facing, moveX, moveY }) =>
    `<g transform="translate(${x} ${y})"><g data-piglet-sprite="" style="--feed-x:${moveX}px;--feed-y:${moveY}px"><use href="#chore-red-wattle" transform="scale(${size * facing} ${size})"/></g></g>`
  ).join('');
  return scene(pigletPen + bucketPerson, `data-trough-stocked="${fed}"`, `
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
