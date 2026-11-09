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
          <g id="jd-backlot">
            <path fill="#83a24f" d="M0 0h960v620H0z"/>
            <path fill="#759347" d="M0 149L356 56l302 61 302-55v115l-247 40-353-73L0 252zM0 437l168-52 219 77 273-36 300 112v82H0z"/>
            <path fill="url(#jd-turf)" d="M0 0h960v620H0z"/>
            <use href="#jd-oak-art" transform="translate(154 248) scale(1.2)"/>
            <use href="#jd-oak-art" transform="translate(241 181) scale(.92)"/>
            <use href="#jd-oak-art" transform="translate(320 147) scale(.85)"/>
            <use href="#jd-oak-art" transform="translate(404 135) scale(.8)"/>
            <use href="#jd-oak-art" transform="translate(503 153) scale(.88)"/>
            <use href="#jd-oak-art" transform="translate(618 142) scale(.94)"/>
            <use href="#jd-oak-art" transform="translate(711 173) scale(.83)"/>
            <use href="#jd-oak-art" transform="translate(805 227) scale(1.23)"/>
            <use href="#jd-oak-art" transform="translate(900 264) scale(.97)"/>
            <use href="#jd-oak-art" transform="translate(166 544) scale(1.28)"/>
            <use href="#jd-oak-art" transform="translate(837 543) scale(1.1)"/>
          </g>
          <g id="jd-grain-barn">
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
          </g>
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

        <g transform="translate(52 184)">
          <path d="M-18 64l108-49 105 53-103 56z" fill="#415432" opacity=".4"/>
          <path d="M0 8l92 44v57L0 64z" fill="#923e31" stroke="#623328" stroke-width="3"/>
          <path d="M92 52l70-35v56l-70 36z" fill="#ba583b" stroke="#623328" stroke-width="3"/>
          <path d="M-9 9l42-55 100 47-39 54z" fill="#593a2b" stroke="#482a22" stroke-width="3"/>
          <path d="M33-46l82-36 58 97-40-14z" fill="#76513a" stroke="#482a22" stroke-width="3"/>
          <path d="M92 52l41-51 29 16z" fill="#d67d51" stroke="#623328" stroke-width="2"/>
          <path d="M20 36l39 19v41L20 77z" fill="#492a22" stroke="#df9c60" stroke-width="3"/>
          <path d="M22 40l34 53m0-35L22 75" fill="none" stroke="#be8354" stroke-width="3"/>
          <path d="M118 56l18-9v18l-18 9z" fill="#402d24" stroke="#e8ae72" stroke-width="3"/>
          <path d="M12 9l29-39m-5 54 29-39m-7 50 29-39m-7 50 29-39" fill="none" stroke="#93705b" stroke-opacity=".55" stroke-width="2"/>
        </g>
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
          <use href="#jd-backlot"/>
          <path d="M786 111q-86 101-37 191t-83 231q-32 37-29 97" fill="none" stroke="#a29e6e" stroke-width="59"/>
          <path d="M786 111q-86 101-37 191t-83 231q-32 37-29 97" fill="none" stroke="#559292" stroke-width="46"/>
          <path d="M780 127q-75 88-30 168t-77 232" fill="none" stroke="#90baa1" stroke-width="5" stroke-dasharray="16 15 5 14" stroke-linecap="round"/>
          <path d="M370 246q17 71 109 67t124-66m-124 66q35 19 43 68" fill="none" stroke="#b19b64" stroke-width="26" stroke-linecap="round"/>
          <path d="M370 246q17 71 109 67t124-66m-124 66q35 19 43 68" fill="none" stroke="#dbbf82" stroke-width="19" stroke-linecap="round"/>
          <path d="M389 278q44 42 90 35 63 1 103-39m-103 39q29 20 36 49" fill="none" stroke="#f5da9d" stroke-width="2.5" stroke-dasharray="8 8" stroke-linecap="round"/>
          <use href="#jd-grain-barn" transform="translate(321 208) scale(.43)"/>
          <path d="M544 222l66-40 67 35-69 44z" fill="#a9b858" stroke="#e9ce77" stroke-width="3"/>
          <g class="map-wooded">
            <use href="#jd-oak-art" transform="translate(589 222) scale(.39)"/>
            <use href="#jd-oak-art" transform="translate(626 218) scale(.34)"/>
          </g>
          <path class="map-cleared" d="M551 222l59-35 59 30-61 38z" fill="#c4945f"/>
          <path class="map-fenced" d="M551 214l59-35 59 30-61 38z" fill="none" stroke="#7d4f31" stroke-width="5" stroke-linejoin="round"/>
          <path d="M470 371l61-31 70 35-60 34z" fill="#c4945f" stroke="#6d462d" stroke-width="5"/>
          <path d="M470 360l61-31 70 35-60 34z" fill="none" stroke="#c38751" stroke-width="4" stroke-linejoin="round"/>
          <!-- map activity -->
          <use href="#jd-oak-art" transform="translate(425 462) scale(.66)"/>
          <use href="#jd-oak-art" transform="translate(629 446) scale(.62)"/>
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

function mapActivity(plots, deliveryStage) {
  const grass = plots.some(plot => plot.status === 'grazing');
  const extra = plots.slice(1).filter(plot => plot.status !== 'locked').map(plot => {
    const fill = plot.status === 'grazing' ? '#8aa64f' : plot.status === 'available' ? '#a1ac58' : '#c28f57';
    const fence = plot.status === 'fenced' ? '#704426' : '#d8bb76';
    return `<path data-map-plot="${plot.id}" data-stage="${plot.status}" transform="translate(${plot.id === '2' ? '575 265' : '655 300'})"
      d="M0 23l54-23 42 25-57 30z" fill="${fill}" stroke="${fence}" stroke-width="5"/>`;
  }).join('');
  const truck = deliveryStage ? `<g class="farm-map-truck" data-map-truck="${deliveryStage}"
    transform="translate(${deliveryStage === 'unloading' ? '374 264' : '402 270'}) scale(-1 1)">
    <path d="M-31-19h35v24h-35zm35 6h19l10 13v5H4z" fill="#d79753" stroke="#603a2b" stroke-width="3"/>
    <path d="M10-9h11l6 8H10z" fill="#cde2d3"/>
    <path d="M-25-14h23" fill="none" stroke="#f5cf85" stroke-width="3"/>
    <circle cx="-19" cy="6" r="6" fill="#412e23"/><circle cx="23" cy="6" r="6" fill="#412e23"/>
  </g>` : '';
  return `<g${grass ? ' data-map-spare-grass="true"' : ''}>${extra}${truck}</g>`;
}

export function openingArt(place, stage, { pigs = 0, fedWeeks = 0, breeders, plots = [], deliveryStage, arriving = false } = {}) {
  const scene = place === 'map' ? map.replace('<!-- map activity -->', mapActivity(plots, deliveryStage)) : plot
    .replace('<!-- growers -->', pigs ? growerArt(pigs, fedWeeks, arriving) : '')
    .replace('<!-- breeders -->', breeders ? breedingArt() : '');
  return `<svg viewBox="0 0 960 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-plot-art="${stage}">
    ${definitions}${scene}
  </svg>`;
}
