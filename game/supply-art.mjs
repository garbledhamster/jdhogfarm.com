import { supplyShop } from './landmark-art.mjs';

export function renderSupplyArt() {
  return `<svg viewBox="0 40 960 510" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="supply-turf" width="69" height="58" patternUnits="userSpaceOnUse">
        <path d="M8 16l4-5m-4 5-3-3m29 27 5-6m-5 6-3-5m20-23 4-6m-4 6-4-2" fill="none" stroke="#53703a" stroke-opacity=".34" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 40l6 2m38 5 7-1m-39-32 6-1" fill="none" stroke="#ddcf80" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
      </pattern>
      <g id="supply-sack">
        <path d="M-18 9q-3-13 9-25l-3-8 11 2 10-2-2 8q12 12 12 25-4 7-18 7t-19-7z" fill="#ceae71" stroke="#705135" stroke-width="2.5"/>
        <path d="M-8-15H7m-16 9q-3 5-3 9m16-6 4 5" stroke="#e9ca8e" stroke-width="3" stroke-linecap="round"/>
      </g>
      <g id="supply-crate">
        <path d="M-28-17l43-13 18 11-44 14z" fill="#dfaa70" stroke="#6d4730" stroke-width="2.5"/>
        <path d="M-28-17l17 12v30l-17-13z" fill="#94603a" stroke="#6d4730" stroke-width="2.5"/>
        <path d="M-11-5l44-14v30L-11 25z" fill="#be8753" stroke="#6d4730" stroke-width="2.5"/>
        <path d="M-9 3l41-13M-9 13l41-13M-4-5v26m30-34V12" stroke="#704b32" stroke-width="2"/>
      </g>
    </defs>
    <path d="M0 0h960v620H0z" fill="#83a24f"/>
    <path d="M0 0h960v111l-253 37-284-46L0 202zm0 404 230-30 237 97 211-19 282 66v102H0z" fill="#749249"/>
    <path d="M0 0h960v620H0z" fill="url(#supply-turf)"/>
    <path d="M-10 530q124-156 291-149t358 14q183-21 329 54" fill="none" stroke="#b59d62" stroke-width="70"/>
    <path d="M-10 530q124-156 291-149t358 14q183-21 329 54" fill="none" stroke="#d5bb81" stroke-width="56"/>
    <path d="M-10 530q124-156 291-149t358 14q183-21 329 54" fill="none" stroke="#ebd69a" stroke-width="4" stroke-dasharray="17 22 6 25"/>
    <path d="M173 329v-69m57 47v-69m55 47v-69m52 50v-69m-164 87 164-61m-164 78 164-61" fill="none" stroke="#765235" stroke-width="7"/>
    <path d="M173 282l164-61m-164 78 164-61" stroke="#d4a76a" stroke-width="2.5"/>
    <path d="M299 367l61-44 274 21 47 51-229 37z" fill="#c4a16b"/>
    ${supplyShop('translate(464 321) scale(1.4)')}
    <g data-supply-sign="">
      <rect x="347" y="243" width="184" height="30" rx="2" fill="#47382a" stroke="#a67845" stroke-width="3"/>
      <text x="439" y="264" fill="#ffe1a2" text-anchor="middle" font-family="Silkscreen, monospace" font-size="17">Farm Supply</text>
    </g>
    <ellipse cx="343" cy="385" rx="55" ry="12" fill="#715639" opacity=".3"/>
    <use href="#supply-crate" transform="translate(327 366) scale(1.06)"/>
    <use href="#supply-crate" transform="translate(363 380) scale(.8)"/>
    <path d="M287 376l10-34 40 20m-37-17 3 30m-11-7 45 11m-37-33 37 33" fill="none" stroke="#906139" stroke-width="4"/>
    <ellipse cx="572" cy="394" rx="65" ry="13" fill="#715639" opacity=".3"/>
    <use href="#supply-sack" transform="translate(549 374) scale(1.1)"/>
    <use href="#supply-sack" transform="translate(585 369) scale(1.2)"/>
    <use href="#supply-sack" transform="translate(568 387) scale(.87)"/>
    <path d="M709 371v-54l45-20v49m-45-10 45-19m-45 35 45-20" fill="none" stroke="#6f4c34" stroke-width="7"/>
    <path d="M700 315l63-28v27l-63 29z" fill="#d29a62" stroke="#6f4c34" stroke-width="3"/>
    <path d="M709 323l44-20" stroke="#f3c383" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}
