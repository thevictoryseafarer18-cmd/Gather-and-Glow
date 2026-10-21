/* Gather & Glow — inline SVG icon set (no network, no font dependency). */
(function () {
  'use strict';
  const GG = (window.GG = window.GG || {});

  const P = {
    rings: '<circle cx="9" cy="15" r="5"/><circle cx="15.5" cy="15" r="5"/><path d="M9 6.5 12 3l3 3.5"/>',
    cake: '<path d="M4 20.5h16"/><path d="M5.5 20.5v-6a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 2.5 2.5v6"/><path d="M9 12V9m3 3V9m3 3V9"/><path d="M9 6.2a1.2 1.2 0 1 1 1.6-1.1M12 6.2a1.2 1.2 0 1 1 1.6-1.1M15 6.2a1.2 1.2 0 1 1 1.6-1.1"/>',
    community: '<circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M3.5 19v-1.4A4.1 4.1 0 0 1 7.6 13.5h1.8a4.1 4.1 0 0 1 4.1 4.1V19"/><path d="M14.6 13.7h1.6a3.3 3.3 0 0 1 3.3 3.3V19"/>',
    sparkle: '<path d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9L5.2 10.3l4.9-1.9z"/><path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    store: '<path d="M3.5 9.5 5 4.5h14l1.5 5"/><path d="M4 9.5h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.7 0"/><path d="M9.5 20v-5h5v5"/>',
    cup: '<path d="M4.5 7h11v6.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z"/><path d="M15.5 8.5h2a2.75 2.75 0 0 1 0 5.5h-2"/><path d="M4 21h13"/>',
    flower: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6c0-2.4-1.4-4.6-3.6-4.6S5.3 6.4 6.7 8.2c1 1.3 3 1.6 5.3 1.4z"/><path d="M12 14.4c0 2.4 1.4 4.6 3.6 4.6s3.1-1.4 1.7-3.2c-1-1.3-3-1.6-5.3-1.4z"/><path d="M9.6 12c-2.4 0-4.6-1.4-4.6-3.6S6.4 5.3 8.2 6.7c1.3 1 1.6 3 1.4 5.3z" opacity=".55"/><path d="M14.4 12c2.4 0 4.6 1.4 4.6 3.6s-1.4 3.1-3.2 1.7c-1.3-1-1.6-3-1.4-5.3z" opacity=".55"/>',
    camera: '<path d="M3.5 8.5h3l1.5-2.5h8L17.5 8.5h3v11h-17z"/><circle cx="12" cy="13.5" r="3.6"/>',
    music: '<path d="M9 18V6.5l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    shirt: '<path d="M8 4.5 4 6.5l1.5 5 2-1V20h9V10.5l2 1 1.5-5-4-2-4 2z"/>',
    car: '<path d="M4 16.5v-3l1.8-5A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.5l1.8 5v3"/><path d="M4 13.5h16"/><circle cx="7.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>',
    envelope: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 7 8.4 6.2L20.4 7"/>',
    gift: '<path d="M3.5 9.5h17V14h-17z"/><path d="M5 14h14v6.5H5z"/><path d="M12 9.5v11"/><path d="M12 9.5S10.8 4 8 4a2.2 2.2 0 0 0 0 5.5zM12 9.5S13.2 4 16 4a2.2 2.2 0 0 1 0 5.5z"/>',
    shield: '<path d="M12 3.5 5 6v6c0 4 3 7 7 8.5 4-1.5 7-4.5 7-8.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="m14.5 5.5 4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5M13.5 11v5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    sliders: '<path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2"/><circle cx="10" cy="16" r="2"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>',
    pin: '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    users: '<circle cx="9.5" cy="8" r="3.5"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/><path d="M17 5.2a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.2a4.5 4.5 0 0 1 3 4.3V20"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.5" r="1.2"/><path d="M6 6V4.5h10"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
    alert: '<path d="M12 4 3 20h18z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8.2" r=".95" fill="currentColor" stroke="none"/>',
    download: '<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5L16.5 11"/><path d="M4 19.5h16"/>',
    upload: '<path d="M12 20V9"/><path d="m7.5 13 4.5-4.5L16.5 13"/><path d="M4 4.5h16"/>',
    send: '<path d="M4 12 20 4l-8 16-2-6z"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.7-6"/><path d="M20 4.5V10h-5.5"/>',
    bulb: '<path d="M9 17.5h6"/><path d="M10 21h4"/><path d="M12 3.5a6 6 0 0 1 3.4 10.9c-.5.4-.9 1-.9 1.6h-5c0-.6-.4-1.2-.9-1.6A6 6 0 0 1 12 3.5z"/>',
    list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.2" cy="6.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.2" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>',
    home: '<path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>',
    star: '<path d="m12 4 2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 17.1 6.8 19.9 8 14.1 3.6 10.1l5.9-.7z"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3C19.5 15.6 12 20 12 20z"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    leaf: '<path d="M20 4C10 4 4 8.5 4 15a5 5 0 0 0 5 5c6.5 0 11-6 11-16z"/><path d="M4.5 19.5C8 15 12 12 16 10"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.4 0 2-.9 2-1.9s-.8-1.8-.8-2.7c0-1 .8-1.9 1.9-1.9h1.4A4 4 0 0 0 20.5 10C20.5 6.2 16.7 3.5 12 3.5z"/><circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="9.5" r="1.2" fill="currentColor" stroke="none"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    book: '<path d="M4 5.5h6.5A2.5 2.5 0 0 1 13 8v12a2 2 0 0 0-2-2H4z"/><path d="M20 5.5h-4.5A2.5 2.5 0 0 0 13 8v12a2 2 0 0 1 2-2h5z"/>',
    save: '<path d="M5 4.5h11l3.5 3.5v11.5h-14.5z"/><path d="M8.5 4.5v5h7v-5"/><path d="M8.5 19.5v-5h7v5"/>',
    logout: '<path d="M14 5.5H19v13h-5"/><path d="M10 12h9"/><path d="m13.5 8.5 -3.5 3.5 3.5 3.5"/>',
    table: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M9.5 9.5v10M15 9.5v10"/>',
    wifi: '<path d="M4 9a12 12 0 0 1 16 0"/><path d="M7.5 12.5a7 7 0 0 1 9 0"/><path d="M10.5 16a3.5 3.5 0 0 1 3 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
  };

  GG.icon = function (name, opts) {
    const o = opts || {};
    const body = P[name] || P.sparkle;
    const cls = 'icon' + (o.cls ? ' ' + o.cls : '');
    const size = o.size || 20;
    return (
      '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + body + '</svg>'
    );
  };
  GG.iconNames = Object.keys(P);
})();
