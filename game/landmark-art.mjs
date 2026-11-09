// Shared shapes keep the map's landmarks recognizable from the feed path.
export function creekBridge(transform) {
  return `<g data-farm-landmark="creek-bridge" transform="${transform}">
    <path d="M-79-31H79l25 69h-208z" fill="#976540" stroke="#523725" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-84-19H84M-88-8H88M-92 3H92M-96 14H96m-196 11h200" stroke="#d8a165" stroke-width="5"/>
    <path d="M-79-34l-25 69m183-69 25 69" stroke="#5d3a28" stroke-width="6" stroke-linecap="round"/>
  </g>`;
}

export function penGate(transform) {
  return `<g data-farm-landmark="pen-gate" transform="${transform}">
    <path d="M-73 8H74l-4-25H-70z" fill="#a67e4d" stroke="#5d3a28" stroke-width="3"/>
    <path d="M-66 3v-37m25 37v-37M41 3v-37M66 3v-37" stroke="#6c462f" stroke-width="7"/>
    <path d="M-67-29h28m-28 15h28M39-29h29m-29 15h29" stroke="#416d61" stroke-width="9"/>
    <path d="M-65-32h25m80 0h25m-130 15h25m80 0h25" stroke="#91b29a" stroke-width="3"/>
    <path d="M-70-34h8m17 0h8m74 0h8m17 0h8" stroke="#e0ae67" stroke-width="4"/>
  </g>`;
}

export function pigletPen(transform) {
  return `<g data-farm-landmark="piglet-pen" transform="${transform}">
    <path d="M-86 0l82-42 103 46-87 49z" fill="#b88750" stroke="#795234" stroke-width="3"/>
    <path d="M-86-12l82-42 103 46m-185 9 82-41 103 45" fill="none" stroke="#906139" stroke-width="5"/>
    <path d="M-86-13l82-42 103 46" fill="none" stroke="#e2af70" stroke-width="2.5"/>
    <path d="M-86 4v-24m82-18v-24M99 8v-24" stroke="#6e3e25" stroke-width="7"/>
    <path d="M-89-19h6m76-43h6m97 46h6" stroke="#e0ae67" stroke-width="4"/>
    <path d="M32-17l19-9 29 13-19 10z" fill="#624531" stroke="#e3aa6a" stroke-width="3"/>
    <path d="M-86 0l98 48 87-44m-185 9 98 48 87-44" fill="none" stroke="#795234" stroke-width="5"/>
    <path d="M-86-1l98 48 87-44" fill="none" stroke="#d9a66c" stroke-width="2.5"/>
    <path d="M12 65V40" stroke="#6e3e25" stroke-width="7"/>
    <path d="M9 41h6" stroke="#e0ae67" stroke-width="4"/>
  </g>`;
}

export function supplyShop(transform) {
  return `<g data-supply-shop="" transform="${transform}">
    <path d="M-108 42l131 44 124-34-108-40z" fill="#456038" opacity=".35"/>
    <path d="M-98-46H63V54H-98z" fill="#ebc089" stroke="#634531" stroke-width="4"/>
    <path d="M63-46l57-23V30L63 54z" fill="#b98155" stroke="#634531" stroke-width="4"/>
    <path d="M-112-43l37-61H87L70-43z" fill="#635e47" stroke="#423b2a" stroke-width="4"/>
    <path d="M87-104l47 31L70-43z" fill="#3b5244" stroke="#423b2a" stroke-width="4"/>
    <path d="M-69-95H82m-159 12H78M-86-71H75m-169 12H71" stroke="#97845e" stroke-width="3"/>
    <path d="M-29 53V-14H8v67" fill="#544331" stroke="#946640" stroke-width="4"/>
    <path d="M-83-4h38v33h-38zm105 0h28v33H22z" fill="#566f61" stroke="#a36a44" stroke-width="4"/>
    <path d="M-80 11h33m-18-14v30m89-16h24m-12-14v30" stroke="#d5e0b8" stroke-width="2"/>
    <path d="M-102-28H65l12 21h-192z" fill="#fff0bf" stroke="#483d2d" stroke-width="3"/>
    <path d="M-95-27h24l-8 19h-25zm42 0h24l-3 19h-26zm42 0h24l3 19h-27zm42 0h24l9 19H37z" fill="#477a67"/>
    <path d="M-114-8H77v8h-191z" fill="#c58a52" stroke="#483d2d" stroke-width="3"/>
    <path d="M-10 34v14m76-78 52-21M72-4l42-17m-42 35 42-17" fill="none" stroke="#634531" stroke-width="2.5"/>
  </g>`;
}
