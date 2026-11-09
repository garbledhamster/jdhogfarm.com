// Front gable and right wall share a corner. The roof ridge and eave
// extend along the same depth axis as the right wall.
export function barnSymbol(id) {
  return `<g id="${id}">
    <path d="M-18 129l118 69 140-68-114-64z" fill="#43572f" opacity=".34"/>
    <path d="M0 52l52-44 52 104v76L0 128z" fill="#bd6244" stroke="#593329" stroke-width="3" stroke-linejoin="round"/>
    <path d="M104 112l112-58v76l-112 58z" fill="#9d4634" stroke="#593329" stroke-width="3" stroke-linejoin="round"/>
    <path d="M13 66v66m17-56v66m18-55v65m18-55v65m18-55v65m111-99v58m-13-52v59m-70-23v59"
      fill="none" stroke="#6c3428" stroke-width="3" opacity=".36"/>
    <path d="M128 123l48-25v52l-48 25z" fill="#512f25" stroke="#ebaf71" stroke-width="4"/>
    <path d="M131 125l42 23m0-47-42 70" fill="none" stroke="#ba7949" stroke-width="3"/>
    <path d="M188 81l17-9v21l-17 9z" fill="#4b3028" stroke="#e8b178" stroke-width="3"/>
    <path d="M45 54l16 9v17l-16-9z" fill="#58372a" stroke="#e8b178" stroke-width="3"/>
    <path d="M52 5l112-58 60 110-112 58z" fill="#795444" stroke="#493026" stroke-width="4" stroke-linejoin="round"/>
    <path d="M73-6l60 110m-38-121 60 110m-38-122 60 110m-38-121 60 110"
      fill="none" stroke="#a77a5c" stroke-width="3" opacity=".7"/>
    <path d="M88 69l110-57" fill="none" stroke="#91664d" stroke-width="2" opacity=".5"/>
    <path d="M-8 49 52 5l60 110m-60-110 112-58m-52 168 112-58" fill="none"
      stroke="#4b3127" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-6 49 52 7l58 106" fill="none" stroke="#d1a16c" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}
