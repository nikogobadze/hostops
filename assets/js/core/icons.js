/* ============================================================
   HostOps — icon set
   24×24 stroke icons, injected into any [data-icon] element.
   Icons.svg(name) returns markup for use inside template strings.
   ============================================================ */
(function (global) {
  'use strict';

  const P = {
    /* navigation */
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 8-8M16 7l2.5 2.5M18.5 4.5 21 7"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
    door: '<path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21M3 21h18"/><circle cx="15" cy="12.5" r="1" fill="currentColor" stroke="none"/>',
    sparkle: '<path d="M9 3.5 10.6 8 15 9.6 10.6 11.2 9 15.7 7.4 11.2 3 9.6 7.4 8z"/><path d="M17.5 13.5 18.4 16l2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
    tray: '<path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5"/><path d="M5.2 4.8A2 2 0 0 1 7.1 3.5h9.8a2 2 0 0 1 1.9 1.3L21 13.5v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z"/>',
    bottle: '<path d="M10 2.5h4v3.2c0 .9.4 1.7 1.1 2.3l.8.7c.7.6 1.1 1.5 1.1 2.4v8.4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8.4c0-.9.4-1.8 1.1-2.4l.8-.7A3 3 0 0 0 10 5.7z"/><path d="M7 13.5h10"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.5M17.5 14.6a6.5 6.5 0 0 1 4 5.9"/>',
    link: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7"/>',
    cog: '<circle cx="12" cy="12" r="3.2"/><path d="M19.6 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',

    /* chrome */
    menu: '<path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/>',
    moon: '<path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5a8.5 8.5 0 1 0 10.9 10.9z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.3M12 19.7V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.3M19.7 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    'chevron-left': '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
    'chevron-right': '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    'chevron-down': '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
    'chevron-up': '<path d="m5.5 15 6.5-6.5 6.5 6.5"/>',
    'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
    'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
    'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    external: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18.5 14v4.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2H10"/>',

    /* actions */
    edit: '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z"/><path d="m14.5 6.5 3.5 3.5"/>',
    trash: '<path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/><path d="M6.5 6.5 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.5"/><path d="M10.5 10.5v6M13.5 10.5v6"/>',
    more: '<circle cx="12" cy="5.5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none"/>',
    download: '<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2"/>',
    upload: '<path d="M12 15.5v-11M7.5 8.5 12 4l4.5 4.5"/><path d="M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4v5h-5"/>',
    save: '<path d="M5.5 3.5h10L20.5 8.5v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z"/><path d="M8 3.5v6h7v-6M8 20.5v-5.5h8v5.5"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5v-.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5"/>',
    filter: '<path d="M3.5 5.5h17l-6.5 7.6v5.6l-4 2.3v-7.9z"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.8 18-3.7-7.5L3 9.8z"/>',
    play: '<path d="M6.5 4.3 19 12 6.5 19.7z"/>',
    pause: '<path d="M8.5 4.5v15M15.5 4.5v15"/>',
    lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
    list: '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.2" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="17.5" r="1.2" fill="currentColor" stroke="none"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3.5 12.5 8.5 4.7 8.5-4.7"/><path d="m3.5 16.8 8.5 4.7 8.5-4.7"/>',

    /* status & feedback */
    'check-circle': '<circle cx="12" cy="12" r="8.8"/><path d="m8 12.2 2.8 2.8L16 9.5"/>',
    'x-circle': '<circle cx="12" cy="12" r="8.8"/><path d="m9 9 6 6M15 9l-6 6"/>',
    alert: '<path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5"/><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11.2v5"/><circle cx="12" cy="8.1" r="1.1" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.3l3.4 2"/>',
    activity: '<path d="M2.5 12h4l3-7.5 4.5 15 3-7.5h4.5"/>',
    star: '<path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z"/>',

    /* hospitality */
    bed: '<path d="M3 19v-8.5M3 14h18M21 19v-5"/><path d="M3 10.5h7.5V14"/><circle cx="7.2" cy="7.8" r="2.3"/><path d="M12 10.5h6.5a2.5 2.5 0 0 1 2.5 2.5v1"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    'log-in': '<path d="M14.5 3.5h3a2.5 2.5 0 0 1 2.5 2.5v12a2.5 2.5 0 0 1-2.5 2.5h-3"/><path d="M10 16.5 14.5 12 10 7.5M14.5 12H3.5"/>',
    'log-out': '<path d="M9.5 3.5h-3A2.5 2.5 0 0 0 4 6v12a2.5 2.5 0 0 0 2.5 2.5h3"/><path d="M16 16.5 20.5 12 16 7.5M20.5 12H9"/>',
    'credit-card': '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h3"/>',
    receipt: '<path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-2.3-1.5-2.3 1.5-2.4-1.5L9.6 21l-2.3-1.5z"/><path d="M9 8h6M9 12h6"/>',
    coffee: '<path d="M3.5 8.5h13v6a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5z"/><path d="M16.5 10h1.8a2.8 2.8 0 0 1 0 5.5h-1.8"/><path d="M6.5 2.5v3M10 2.5v3M13.5 2.5v3"/>',
    package: '<path d="m12 2.8 8.5 4.6v9.2L12 21.2 3.5 16.6V7.4z"/><path d="M3.7 7.3 12 12l8.3-4.7M12 12v9.2"/>',
    wifi: '<path d="M4.5 9.5a12 12 0 0 1 15 0M7.5 13a7.5 7.5 0 0 1 9 0"/><circle cx="12" cy="17.5" r="1.4" fill="currentColor" stroke="none"/>',
    tv: '<rect x="2.5" y="6.5" width="19" height="12.5" rx="2.5"/><path d="m8 2.8 4 3.7 4-3.7"/>',
    snow: '<path d="M12 2.5v19M4 7l16 10M20 7 4 17"/><path d="m9 4.5 3 2.5 3-2.5M9 19.5l3-2.5 3 2.5"/>',
    tag: '<path d="M11.6 3.5H20v8.4l-9 9a2 2 0 0 1-2.8 0l-5.6-5.6a2 2 0 0 1 0-2.8z"/><circle cx="16.2" cy="7.8" r="1.4"/>',
    printer: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    phone: '<path d="M8.4 3.5H5.6A2.1 2.1 0 0 0 3.5 5.8c0 8.1 6.6 14.7 14.7 14.7a2.1 2.1 0 0 0 2.3-2.1v-2.8l-4.4-1.6-1.9 2.3a14.6 14.6 0 0 1-6.3-6.3l2.3-1.9z"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    globe: '<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6M12 3.2a13 13 0 0 1 0 17.6 13 13 0 0 1 0-17.6z"/>',

    /* hospitality — shared by the admin panel and the public site */
    wave: '<path d="M2 9.5c2.6 0 2.6 2.4 5.2 2.4S9.8 9.5 12.4 9.5s2.6 2.4 5.2 2.4S20.2 9.5 22 9.5"/><path d="M2 15.5c2.6 0 2.6 2.4 5.2 2.4s2.6-2.4 5.2-2.4 2.6 2.4 5.2 2.4 2.4-2.4 4.4-2.4"/>',
    steam: '<path d="M8 20.5c-2-3.5 2-5 0-8.5M12 20.5c-2.2-4 2.2-5.6 0-9.6M16 20.5c-2-3.5 2-5 0-8.5"/><path d="M4 4.5h16"/>',
    car: '<path d="M4.5 16.5v2.2a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1v-2.2M22.2 16.5v2.2a1 1 0 0 1-1 1h-.7a1 1 0 0 1-1-1v-2.2"/><path d="M2.4 16.5v-4l2-5.2A2 2 0 0 1 6.3 6h11.4a2 2 0 0 1 1.9 1.3l2 5.2v4z"/><path d="M2.4 12.5h19.2M6.5 15h2M15.5 15h2"/>',
    paw: '<ellipse cx="7" cy="8" rx="2" ry="2.6"/><ellipse cx="12" cy="6.2" rx="2" ry="2.8"/><ellipse cx="17" cy="8" rx="2" ry="2.6"/><path d="M12 21c-3.2 0-5.4-1.7-5.4-4 0-2 2-3.2 3.1-4.6.9-1.1 1.3-2 2.3-2s1.4.9 2.3 2c1.1 1.4 3.1 2.6 3.1 4.6 0 2.3-2.2 4-5.4 4z"/>',
    utensils: '<path d="M6 2.5v8a2.5 2.5 0 0 0 5 0v-8M8.5 12.5V21.5"/><path d="M6 2.5v5M11 2.5v5"/><path d="M17.5 2.5c-1.6 1.4-2.4 3.4-2.4 5.6 0 1.8.8 3 2.4 3.4V21.5"/>',
    pin: '<path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10.2" r="2.6"/>',
    ship: '<path d="M3 17.5c1.6 0 1.6 1.6 3.2 1.6s1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6 1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6"/><path d="M4.5 14.5 6 9.5h12l1.5 5"/><path d="M12 9.5V3.5l5 3-5 2"/>',
    mountain: '<path d="M2 20.5 9 7l4.2 7.4L15.6 11l6.4 9.5z"/><path d="m7.2 10.4 3.6 2.2"/>',
    grape: '<circle cx="12" cy="8.5" r="2"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><circle cx="12" cy="15.5" r="2"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/><path d="M12 6.5V3.5M12 3.5c1.6 0 3-1 3-1"/>',
    goggles: '<path d="M4.5 9.5h15a1.5 1.5 0 0 1 1.5 1.5v2.4a3 3 0 0 1-3 3h-1.6a3 3 0 0 1-2.7-1.7l-.7-1.4-.7 1.4a3 3 0 0 1-2.7 1.7H6a3 3 0 0 1-3-3V11a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M4.5 9.5V7a2.5 2.5 0 0 1 2.5-2.5h10A2.5 2.5 0 0 1 19.5 7v2.5"/>',
    basket: '<path d="M3 9.5h18l-1.6 9a2 2 0 0 1-2 1.7H6.6a2 2 0 0 1-2-1.7z"/><path d="m8 9.5 2.2-5.6M16 9.5l-2.2-5.6M9.6 13.5v3M14.4 13.5v3"/>',
    ruler: '<rect x="2.5" y="8" width="19" height="8" rx="1.6"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/>',
    heart: '<path d="M12 20.5S3.5 15.2 3.5 9.4A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8.5 2.1c0 5.8-8.5 11.1-8.5 11.1z"/>',
    shield: '<path d="M12 2.8 4.5 6v6c0 4.6 3.2 8.2 7.5 9.2 4.3-1 7.5-4.6 7.5-9.2V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>'
  };

  const Icons = {};

  Icons.has = name => Object.prototype.hasOwnProperty.call(P, name);

  /** Register extra icons (the public site adds its own hospitality set). */
  Icons.add = function (map) {
    Object.keys(map || {}).forEach(k => { P[k] = map[k]; });
  };

  Icons.svg = function (name, cls) {
    const body = P[name];
    if (!body) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (cls ? ' class="' + cls + '"' : '') + '>' + body + '</svg>';
  };

  /** Wrap an icon in a span, for use inside template literals. */
  Icons.el = function (name, cls) {
    return '<span data-icon="' + name + '"' + (cls ? ' class="' + cls + '"' : '') +
      ' aria-hidden="true">' + Icons.svg(name) + '</span>';
  };

  /** Fill every [data-icon] under root that has not been rendered yet. */
  Icons.render = function (root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-icon]');
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const want = n.getAttribute('data-icon');
      if (n.getAttribute('data-icon-done') === want) continue;
      const markup = Icons.svg(want);
      if (!markup) continue;
      // Insert rather than replace: an element may legitimately carry both an
      // icon and its own label text (nav items, buttons), and clobbering
      // innerHTML would silently delete the label.
      const prev = n.querySelector(':scope > svg');
      if (prev) prev.remove();
      n.insertAdjacentHTML('afterbegin', markup);
      n.setAttribute('data-icon-done', want);
      if (!n.hasAttribute('aria-hidden') && !n.hasAttribute('aria-label')) {
        n.setAttribute('aria-hidden', 'true');
      }
    }
  };

  global.Icons = Icons;
})(window);
