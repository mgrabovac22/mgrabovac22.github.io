const sleeve = 'M-16 9C110 30 192 52 264 55q42 2 84 19l15 66q-62 18-120 16C151 155 75 184-16 184Z';
const cuff = 'M324 67q21 2 51 9l8 62q-27 11-54 8Z';
const carrying = 'M375 82c20-2 37-6 52-15 10-6 24-6 36-2l37 11 37 17c10 4 10 13 1 16l-43-11 54 24c10 4 9 14-1 16l-54-18 36 22c9 5 6 13-3 14l-46-18 23 15c7 5 4 12-5 11l-51-18c-11-4-20-3-31-4-20-3-30-11-42-13Z';
const gripping = 'M373 81q29-1 53-12c13-7 25-6 45 0l34 11 41 3q10 2 9 10-1 7-10 8l-45 1-23 5 11 10 44-1q10 0 10 8 0 7-10 9l-29 4q-10 9-29 10l-37-5q-24 1-62-12Z';
const waving = 'M41 126c-4-14-13-24-20-34L8 74c-7-9-2-17 5-16 5 0 9 4 15 10l11 12-7-51c-2-11 3-17 9-16 5 0 8 4 9 10l7 35-2-44C55 4 60 0 66 1c5 1 7 5 7 11l2 44 7-37c2-8 7-11 12-9 5 1 7 6 5 13l-6 40 11-22c4-7 9-9 14-6 4 3 4 7 1 13l-12 31c-3 12-1 21-12 33-5 5-9 9-11 16Z';

function materialPath(shape, material, grain, stroke) {
  return `<path d="${shape}" fill="url(#${material})" stroke="${stroke}" stroke-width="1.35" stroke-linejoin="round"/>
      <path d="${shape}" fill="url(#${grain})"/>`;
}

export function studioArtwork() {
  return `<svg class="studio-art" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="studio-twill" x2=".19" y2="1">
        <stop stop-color="#6a8378"/><stop offset=".32" stop-color="#466b5d"/><stop offset=".67" stop-color="#34574a"/><stop offset="1" stop-color="#1b392f"/>
      </linearGradient>
      <linearGradient id="studio-cuff" x2=".35" y2="1">
        <stop stop-color="#456a5a"/><stop offset=".58" stop-color="#2a4c3d"/><stop offset="1" stop-color="#19392f"/>
      </linearGradient>
      <radialGradient id="studio-skin" cx=".48" cy=".23" r=".82" gradientTransform="translate(-.09 .02) scale(1.19 .96)">
        <stop stop-color="#efc59c"/><stop offset=".47" stop-color="#d7a17a"/><stop offset=".81" stop-color="#b77f60"/><stop offset="1" stop-color="#97624f"/>
      </radialGradient>
      <pattern id="studio-fabric" patternUnits="userSpaceOnUse" width="6" height="6">
        <path d="M-1 3 3-1m-2 8L7 1M5 7l2-2" fill="none" stroke="#d7efda" stroke-width=".6" opacity=".24"/>
        <path d="m0 0 6 6M-3 3l6 6m0-12 6 6" fill="none" stroke="#101f1b" stroke-width=".6" opacity=".28"/>
      </pattern>
      <pattern id="studio-pores" patternUnits="userSpaceOnUse" width="19" height="17">
        <path d="M2 3h.3m10 1h.4m3 5h.2m-10 2h.3m-4 3h.2m10 1h.25" stroke="#774c43" stroke-width=".7" stroke-linecap="round" opacity=".33"/>
        <path d="M7 3h.35m7 8h.4m-7 4h.24" stroke="#fbe0bf" stroke-width=".7" stroke-linecap="round" opacity=".4"/>
      </pattern>
      <g id="studio-sleeve">
        ${materialPath(sleeve, 'studio-twill', 'studio-fabric', '#233f34')}
        <path d="M-4 29c106 16 178 40 256 42q45 1 80 14m-343 79c102-14 186-38 265-33q43 0 77-9" fill="none" stroke="#b6c7ad" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="3 2.4"/>
        <path d="M119 71c60 12 86 31 131 25m-62 43c58-14 92-11 119-31m-11-33 18 17" fill="none" stroke="#233b31" stroke-width="3.2" opacity=".31"/>
        ${materialPath(cuff, 'studio-cuff', 'studio-fabric', '#263d32')}
        <path d="m332 72 8 69m1-67 8 65m-13-54 34 3" fill="none" stroke="#95b19c" stroke-opacity=".67" stroke-width="1.15" stroke-dasharray="2.5 1.5"/>
        <circle cx="359" cy="125" r="4.8" fill="#22362c"/>
        <circle cx="359" cy="124" r="3.4" fill="#c9b18c"/>
        <path d="m358 123 2 2m0-2-2 2" fill="none" stroke="#584c39" stroke-width=".65"/>
      </g>
      <g id="studio-carry">
        <use href="#studio-sleeve"/>
        ${materialPath(carrying, 'studio-skin', 'studio-pores', '#99604d')}
        <path d="M413 109c18-8 29-14 47-13l24 2c11 1 11 10 3 13l-28 4-19 12c-9 6-21 3-27-2" fill="#dbab85" stroke="#ad745b" stroke-width="1.45"/>
        <path d="m472 99 11 1q5 2 2 6l-11 2q-4-3-2-9m52-9 12 5q3 2 1 6l-10-3m8 24 13 5q2 2 0 5l-11-3m-14 15 7 3q2 2 0 4l-7-2" fill="#efd0b5" stroke="#ac755e" stroke-width=".72"/>
        <path d="M395 92q-6 14-2 28m6-26q-4 10-3 20m31-34q16-10 34-6m29 9-4 8m17 18-4 8m-12 6-3 8m-34-4 20 7" fill="none" stroke="#a96c55" stroke-linecap="round" opacity=".59"/>
      </g>
      <g id="studio-grip">
        <use href="#studio-sleeve"/>
        ${materialPath(gripping, 'studio-skin', 'studio-pores', '#99604d')}
        <path d="M422 97q17-15 37-9l40 5 22 2q9 2 8 9-1 6-11 7l-40-2-22 13q-16 9-31 0" fill="#dca781" stroke="#a56e56" stroke-width="1.2"/>
        <path d="m516 96 8 2q4 3 0 8l-10 1q-4-4 2-11m20-11 13 1q3 2 1 6l-12 2" fill="#efd0b5" stroke="#ac755e" stroke-width=".75"/>
        <path d="M395 90q-6 13-1 27m48-39q17-6 32 0m11 47 23 1m-57 7 15 4" fill="none" stroke="#a96c55" opacity=".65" stroke-linecap="round"/>
      </g>
      <g id="studio-wave">
        ${materialPath(waving, 'studio-skin', 'studio-pores', '#99604d')}
        <path d="M37 80q23 4 26 25m-20-27q25-15 50-5m-44 41q13-8 25-7m-39-64 12-2m10-9 14-1m14 4 12 2m4 17 11 5m-51 64q9-3 19-2" fill="none" stroke="#a76d55" stroke-width="1.35" stroke-linecap="round" opacity=".72"/>
        ${materialPath('M34 125q27 4 54-2l5 28H33Z', 'studio-cuff', 'studio-fabric', '#263d32')}
        <path d="M36 130q24 4 51-2" fill="none" stroke="#a8bfab" stroke-width="1.3" stroke-dasharray="2.5 1.6"/>
      </g>
    </defs>
  </svg>`;
}

export function deliveryHand(side) {
  return `<svg class="delivery-hand ${side}-hand" viewBox="0 0 570 195" aria-hidden="true" focusable="false"><use href="#studio-carry"/></svg>`;
}

function pass(style, label, note, serial) {
  return `<div class="studio-pass ${style}">
    <div class="studio-prop"><b>${label}</b><small>${note}</small><span>${serial}</span></div>
    <svg class="studio-grip grip-left" viewBox="0 35 570 150" preserveAspectRatio="xMaxYMid slice" focusable="false"><use href="#studio-grip"/></svg>
    <svg class="studio-grip grip-right" viewBox="0 35 570 150" preserveAspectRatio="xMaxYMid slice" focusable="false"><use href="#studio-grip"/></svg>
  </div>`;
}

export function studioDispatch(language) {
  const hr = language === 'hr';
  return `<div class="studio-dispatch" aria-hidden="true">
    <div class="studio-track">
      <div class="studio-welcome"><span></span>${hr ? 'Dobro došli' : 'Welcome'}<span></span></div>
      <svg class="studio-wave" viewBox="0 0 125 150" focusable="false"><use href="#studio-wave"/></svg>
      ${pass('studio-paper', hr ? 'Primopredaja' : 'Project handoff', hr ? 'Projektni sažetak' : 'Project brief', 'MG / 01')}
      ${pass('studio-card', 'Studio', hr ? 'Propusnica' : 'Access pass', 'MG / 02')}
    </div>
  </div>`;
}
