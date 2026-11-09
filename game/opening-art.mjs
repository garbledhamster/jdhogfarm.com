import { barnSymbol } from './barn-art.mjs';

// Still scenery adapted from the approved farm morning prototype.
const definitions = `
        <defs>
          <pattern id="jd-turf" width="69" height="58" patternUnits="userSpaceOnUse">
            <path d="M8 16l4-5m-4 5-3-3m29 27 5-6m-5 6-3-5m20-23 4-6m-4 6-4-2" fill="none" stroke="#466b37" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 40l6 2m38 5 7-1m-39-32 6-1" fill="none" stroke="#e6da82" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
          </pattern>
          <pattern id="jd-soil" width="40" height="31" patternUnits="userSpaceOnUse">
            <path d="M5 8l5-2m16 15 7 2m-23 2 4-1m21-17 4 2" fill="none" stroke="#7f532f" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 13l7-2m7 15 4-1" fill="none" stroke="#ffe5a2" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
          </pattern>
          <g id="jd-oak-art">
            <ellipse cx="13" cy="2" rx="42" ry="12" fill="#2c4a2a" opacity=".28"/>
            <path d="M-8 0l6-42-13-12 5-5 12 10 9-19 7 3-9 27 5 38z" fill="#69402a"/>
            <path d="M0-3l6-37 4-7-1 15 4 29z" fill="#976036"/>
            <path d="M-48-53q-9-13 2-29 3-19 20-26 12-21 33-16 21-7 36 13 17 4 20 23 14 15 1 30-10 17-33 17-21 12-40-1-23 6-39-11z" fill="#355831"/>
            <path d="M-48-73q1-18 18-27 14-21 33-16 20-7 35 11 16 4 21 17-12 12-23 9-8 17-27 12-19 10-32-3-15 8-25-3z" fill="#598343"/>
            <path d="M-34-93q10-14 27-11 14-10 31 2 5 3 7 7-14-3-24 5-12-5-27 1z" fill="#7e9d50"/>
            <path d="M-40-61q13 7 26 0m29 11q12 0 17-6m3-34q9 2 13 7m-53 7q8 4 17-1" fill="none" stroke="#9fb463" stroke-opacity=".38" stroke-width="2" stroke-linecap="round"/>
          </g>
          <g id="jd-post">
            <path d="M-4 1v-32l6-3 5 3V1L2 4z" fill="#6e3e25"/>
            <path d="M2-30v34l5-3v-32z" fill="#57311f"/>
            <path d="M-4-31l6-3 5 3-5 3z" fill="#e0ae67"/>
          </g>
          <g id="jd-stump">
            <ellipse cx="6" cy="3" rx="21" ry="7" fill="#724729" opacity=".3"/>
            <path d="M-11 2l3-16 17 1 4 16-5 3-3-3-10 2-3-2z" fill="#8a512d"/>
            <ellipse cy="-13" rx="10" ry="5" fill="#e5b777" stroke="#6c4229" stroke-width="2"/>
            <ellipse cy="-13" rx="5" ry="2" fill="none" stroke="#bd8754" stroke-width="1"/>
          </g>
          ${barnSymbol('jd-grain-barn')}
        </defs>
`;

const plot = `
        <g data-scene-art="plot">
        <path fill="#78994b" d="M0 0h960v620H0z"/>
        <path fill="#85a653" d="M0 180L331 41l202 69 427-62v390l-164 62-255-72L178 595 0 526z"/>
        <path fill="#8da654" d="M0 452l172-57 149 79-77 146H0z"/>
        <path fill="#688940" d="M0 0h960v112L683 84 499 143 218 103 0 209z"/>
        <path fill="url(#jd-turf)" d="M0 0h960v620H0z"/>
        <path d="M1010 157q-98 67-85 164t-136 159q-119 41-133 154" fill="none" stroke="#627f44" stroke-width="106"/>
        <path d="M1010 157q-98 67-85 164t-136 159q-119 41-133 154" fill="none" stroke="#a9a67b" stroke-width="76"/>
        <path d="M1010 157q-98 67-85 164t-136 159q-119 41-133 154" fill="none" stroke="#508b8b" stroke-width="62"/>
        <path d="M1005 161q-92 69-80 152t-129 158q-117 41-129 163" fill="none" stroke="#81b5a4" stroke-width="7" stroke-dasharray="25 22 5 26" stroke-linecap="round"/>
        <path d="M-19 285q130-28 221 13 72 30 134 99t188 78q106 7 142-84" fill="none" stroke="#b19960" stroke-width="51"/>
        <path d="M-19 285q130-28 221 13 72 30 134 99t188 78q106 7 142-84" fill="none" stroke="#d1b77a" stroke-width="40"/>
        <path d="M-10 282q140-17 210 15 84 40 133 96t192 82q86 4 129-57" fill="none" stroke="#e5ce96" stroke-width="3" stroke-dasharray="16 20 4 21" opacity=".85"/>

        <use href="#jd-oak-art" transform="translate(36 149) scale(1.2)"/>
        <use href="#jd-oak-art" transform="translate(115 136) scale(.88)"/>
        <use href="#jd-oak-art" transform="translate(182 125) scale(.81)"/>
        <use href="#jd-oak-art" transform="translate(251 121) scale(.84)"/>
        <use href="#jd-oak-art" transform="translate(321 127) scale(.77)"/>
        <use href="#jd-oak-art" transform="translate(392 132) scale(.63)"/>
        <use href="#jd-oak-art" transform="translate(463 137) scale(.75)"/>
        <use href="#jd-oak-art" transform="translate(548 131) scale(.77)"/>
        <use href="#jd-oak-art" transform="translate(615 130) scale(.82)"/>
        <use href="#jd-oak-art" transform="translate(697 120) scale(.72)"/>
        <use href="#jd-oak-art" transform="translate(764 142) scale(1.02)"/>
        <use href="#jd-oak-art" transform="translate(850 159) scale(.96)"/>
        <use href="#jd-oak-art" transform="translate(943 154) scale(.83)"/>
        <use href="#jd-oak-art" transform="translate(737 198) scale(.83)"/>

        <use href="#jd-grain-barn" transform="translate(52 178) scale(.73)"/>
        <use href="#jd-oak-art" transform="translate(176 416) scale(.96)"/>
        <use href="#jd-oak-art" transform="translate(224 536) scale(1.17)"/>
        <use href="#jd-oak-art" transform="translate(900 564) scale(1.08)"/>
        <path d="M287 539l12-8 12 4-4 10-14 3zM752 266l10-7 12 4-4 8-10 2zM793 372l11-5 10 5-5 8-11-1z" fill="#a29d78" stroke="#676746" stroke-width="2"/>
        <path d="M288 506q38-17 77-11m391-152q29-16 71-12M247 178q23-10 49-10m325 10q26 0 51-12" fill="none" stroke="#c4ca76" stroke-width="4" stroke-linecap="round" opacity=".55"/>

        <path d="M292 337l237-112 184 104-226 138z" fill="#3c6539" opacity=".45"/>
        <path class="plot-outline" d="M303 329l226-106 176 101-219 130z" fill="#9cac52" fill-opacity=".75" stroke="#e9ce77" stroke-width="2" stroke-linejoin="round"/>
        <g class="cleared-earth">
          <path d="M311 329l218-100 168 96-211 121z" fill="#bc8e55" stroke="#6c4e2c" stroke-width="2" stroke-linejoin="round"/>
          <path d="M311 329l218-100 168 96-211 121z" fill="url(#jd-soil)"/>
          <path d="M340 335l190-92m-165 108 189-94m-165 110 189-96m-164 112 188-98m-162 114 185-101m-160 116 185-104" fill="none" stroke="#8a6038" stroke-width="3" opacity=".37"/>
          <g class="stumps">
            <use href="#jd-stump" transform="translate(375 313) scale(.78)"/>
            <use href="#jd-stump" transform="translate(569 271) scale(.85)"/>
            <use href="#jd-stump" transform="translate(466 416) scale(.75)"/>
          </g>
        </g>
        <g transform="translate(406 328)"><g class="plot-tree"><use href="#jd-oak-art" transform="scale(.91)"/></g></g>
        <g transform="translate(533 285)"><g class="plot-tree"><use href="#jd-oak-art" transform="scale(.83)"/></g></g>
        <g transform="translate(507 398)"><g class="plot-tree"><use href="#jd-oak-art" transform="scale(1.02)"/></g></g>
        <g transform="translate(609 332)"><g class="plot-tree"><use href="#jd-oak-art" transform="scale(.73)"/></g></g>

        <!-- growers -->
        <g class="plot-fence">
          <g class="fence-run">
            <path d="M326 322l200-91 151 87m-351 15 200-91 151 87" fill="none" stroke="#653f28" stroke-width="7" stroke-linejoin="round"/>
            <path d="M326 320l200-91 151 87m-351 15 200-91 151 87" fill="none" stroke="#c38b54" stroke-width="3" stroke-linejoin="round"/>
            <use href="#jd-post" x="326" y="339"/><use href="#jd-post" x="374" y="317"/>
            <use href="#jd-post" x="424" y="294"/><use href="#jd-post" x="476" y="270"/>
            <use href="#jd-post" x="526" y="247"/><use href="#jd-post" x="578" y="277"/>
            <use href="#jd-post" x="627" y="306"/><use href="#jd-post" x="677" y="335"/>
          </g>
          <g class="fence-run">
            <path d="M326 322l160 99m-160-88 160 99" fill="none" stroke="#6e4228" stroke-width="8"/>
            <path d="M326 320l160 99m-160-88 160 99" fill="none" stroke="#d69e61" stroke-width="3"/>
            <use href="#jd-post" x="326" y="339"/><use href="#jd-post" x="379" y="372"/>
            <use href="#jd-post" x="432" y="405"/><use href="#jd-post" x="486" y="438"/>
          </g>
          <g class="fence-run">
            <path d="M486 421l78-42m-78 53 78-42m55-43 58-29m-58 40 58-29" fill="none" stroke="#6e4228" stroke-width="8"/>
            <path d="M486 419l78-42m-78 53 78-42m55-43 58-29m-58 40 58-29" fill="none" stroke="#d69e61" stroke-width="3"/>
            <path class="closed-gate" d="M564 377l55-32v17l-55 32zm0 17 55-49" fill="none" stroke="#885b36" stroke-width="4"/>
            <use href="#jd-post" x="486" y="438"/><use href="#jd-post" x="523" y="418"/>
            <use href="#jd-post" x="564" y="396"/><use href="#jd-post" x="619" y="365"/>
            <use href="#jd-post" x="677" y="335"/>
          </g>
        </g>
        <!-- breeders -->
        </g>
`;

const map = `
        <g data-scene-art="map">
          <path d="M0 0h960v620H0z" fill="#87a559"/>
          <path d="M0 0h960v108l-311 35L412 89 188 134 0 98zm0 448 184-31 202 50 270-69 304 64v158H0z" fill="#749249"/>
          <path d="M0 0h960v620H0z" fill="url(#jd-turf)"/>
          <path class="farm-map-road" d="M158 151q150-26 321 2t322-4M160 353q47-93 193-111t127-89m318 184-55 137-97 39M507 527q118-20 282-21" fill="none" stroke="#bfab6f" stroke-width="21" stroke-linecap="round"/>
          <path class="farm-map-road" d="M158 151q150-26 321 2t322-4M160 353q47-93 193-111t127-89m318 184-55 137-97 39M507 527q118-20 282-21" fill="none" stroke="#dfc789" stroke-width="13" stroke-linecap="round"/>
          <path class="farm-map-road" d="M465 150q-1 97 22 156t24 215l284-11" fill="none" stroke="#d4ad67" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M966 231q-173-48-323 3T398 340 0 371" fill="none" stroke="#a0ab75" stroke-width="76"/>
          <path d="M966 231q-173-48-323 3T398 340 0 371" fill="none" stroke="#609590" stroke-width="60"/>
          <path d="M960 230q-170-45-317 4T398 340 4 371" fill="none" stroke="#9cc1a7" stroke-width="5" stroke-dasharray="16 15 5 14" stroke-linecap="round"/>
          <path class="farm-map-road" d="M460 190q6 38 15 61m14 114q21 34 21 140l258 7" fill="none" stroke="#f4d398" stroke-width="6" stroke-dasharray="10 13" stroke-linecap="round" stroke-linejoin="round"/>
          <use href="#jd-oak-art" transform="translate(26 115) scale(.72)"/>
          <use href="#jd-oak-art" transform="translate(324 109) scale(.69)"/>
          <use href="#jd-oak-art" transform="translate(634 119) scale(.7)"/>
          <use href="#jd-oak-art" transform="translate(933 149) scale(.77)"/>
          <use href="#jd-oak-art" transform="translate(332 504) scale(.86)"/>
          <use href="#jd-oak-art" transform="translate(915 590) scale(.75)"/>
        </g>
`;

const penSpots = [[454, 344], [529, 322], [509, 381], [579, 353]];

function pig(x, y, width, role, flipped = false) {
  const height = width * 105 / 164;
  const flip = flipped ? ` transform="translate(${x * 2} 0) scale(-1 1)"` : '';
  return `<image class="farm-field-pig farm-field-pig--${role}" href="game/art/pig.svg" x="${x - width / 2}" y="${y - height}"
    width="${width}" height="${height}"${flip}/>`;
}

function growerArt(pigs, weeks, arriving) {
  const width = weeks >= 6 ? 91 : 45 + weeks * 7;
  return `<g class="farm-growers" data-fed-weeks="${weeks}"${arriving ? ' data-growers-arriving' : ''}>
    ${penSpots.slice(0, pigs).sort(([, a], [, b]) => a - b)
      .map(([x, y], index) => pig(x, y, width, 'grower', index % 2 === 0)).join('')}
  </g>`;
}

function breedingArt() {
  return `<g class="farm-breeding-art" aria-hidden="true">
    ${pig(356, 454, 82, 'boar')}${pig(425, 478, 65, 'sow', true)}
  </g>`;
}

export function openingArt(place, stage, { pigs = 0, fedWeeks = 0, breeders, arriving = false } = {}) {
  const scene = place === 'map' ? map : plot
    .replace('<!-- growers -->', pigs ? growerArt(pigs, fedWeeks, arriving) : '')
    .replace('<!-- breeders -->', breeders ? breedingArt() : '');
  return `<svg viewBox="0 0 960 620" preserveAspectRatio="${place === 'map' ? 'none' : 'xMidYMid slice'}" aria-hidden="true" data-plot-art="${stage}">
    ${definitions}${scene}
  </svg>`;
}
