/* ============================================================
   Magnolia House — generated scenery

   The site ships no photographs: a strict no-external-assets rule
   means every image here is drawn as SVG. Rather than fake photos,
   the visual language is deliberate — soft gradient light, a sea
   horizon, and arch-framed views — so the artwork reads as an
   intentional illustration style instead of a missing picture.

   Two composition families:
     · hero-*  wide, landscape only. Heroes crop hard top and bottom
               (a 3:1 band out of a 4:3 viewBox), which magnifies
               anything in the foreground, so heroes carry no props.
     · everything else — card-shaped, and free to hold a motif.
   ============================================================ */
(function (global) {
  'use strict';

  const Art = {};
  let seq = 0;

  /* ---------------- palettes ---------------- */

  const P = {
    dawn:    { sky: ['#FFEDE2', '#FFD6C4', '#F6B79C'], sea: ['#8FBBCB', '#3D7391'], sun: '#FFC5A6', land: '#C08A76', deep: '#2C5468', wall: '#F6E6D6' },
    morning: { sky: ['#E2F2FA', '#BFE3F1', '#93CFE6'], sea: ['#5AA6C4', '#256E90'], sun: '#FFF6E2', land: '#7E9E8E', deep: '#1B5470', wall: '#EFE7DA' },
    azure:   { sky: ['#D6EDF9', '#A2D9EF', '#6FC2E3'], sea: ['#3897BF', '#175E80'], sun: '#FFF8E6', land: '#6D9382', deep: '#10475F', wall: '#EDE6DB' },
    gold:    { sky: ['#FFE7CC', '#FFC391', '#F5906A'], sea: ['#C2704F', '#4B3355'], sun: '#FFDCA6', land: '#8A5560', deep: '#3E2C4C', wall: '#F3DFCC' },
    dusk:    { sky: ['#F7CDB8', '#D598A0', '#8A6A95'], sea: ['#5F5480', '#2E2C4C'], sun: '#FFC9A2', land: '#4A3D62', deep: '#221F3C', wall: '#EADCD6' },
    verdant: { sky: ['#EDF7E7', '#D2EACC', '#A8D3A2'], sea: ['#6DA98A', '#3C755E'], sun: '#FFF8DC', land: '#4B7355', deep: '#294B39', wall: '#F0EEDC' },
    stone:   { sky: ['#FCF3E7', '#F3E1CC', '#E2C6A6'], sea: ['#BC9E80', '#8B7057'], sun: '#FFF6E4', land: '#9A7A5D', deep: '#5B4430', wall: '#F7EADA' },
    deepsea: { sky: ['#C7EAF2', '#87CFE0', '#48ABC7'], sea: ['#2A87A6', '#0F506B'], sun: '#EEFCFF', land: '#1D6A80', deep: '#083647', wall: '#E4EFEF' }
  };

  /* ---------------- primitives ---------------- */

  function grad(id, stops) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      stops.map((c, i) => '<stop offset="' + (i / (stops.length - 1) * 100).toFixed(0) +
        '%" stop-color="' + c + '"/>').join('') + '</linearGradient>';
  }

  function sunDisc(cx, cy, r, colour, id) {
    return '<radialGradient id="' + id + '"><stop offset="30%" stop-color="' + colour + '" stop-opacity=".9"/>' +
      '<stop offset="100%" stop-color="' + colour + '" stop-opacity="0"/></radialGradient>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 3) + '" fill="url(#' + id + ')"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + colour + '" opacity=".95"/>';
  }

  function headland(y, colour) {
    return '<path d="M0 ' + y + ' C 90 ' + (y - 24) + ' 150 ' + (y - 7) + ' 250 ' + (y - 13) +
      ' C 330 ' + (y - 18) + ' 380 ' + (y - 4) + ' 470 ' + (y - 8) + ' L 470 ' + y + ' Z" fill="' + colour + '" opacity=".34"/>' +
      '<path d="M520 ' + y + ' C 610 ' + (y - 15) + ' 680 ' + (y - 27) + ' 800 ' + (y - 18) +
      ' L 800 ' + y + ' Z" fill="' + colour + '" opacity=".26"/>';
  }

  /** Sea, with a bright horizon seam and a glitter path under the sun. */
  function sea(y, id, sunX) {
    let s = '<rect x="0" y="' + y + '" width="800" height="' + (600 - y) + '" fill="url(#' + id + ')"/>' +
      '<rect x="0" y="' + (y - 1.5) + '" width="800" height="3" fill="#FFFFFF" opacity=".28"/>';

    if (sunX !== null && sunX !== undefined) {
      for (let i = 0; i < 12; i++) {
        const yy = y + 6 + i * i * 1.6 + i * 4;
        if (yy > 596) break;
        const w = 14 + i * 9;
        s += '<rect x="' + (sunX - w / 2) + '" y="' + yy + '" width="' + w + '" height="' + (2 + i * 0.35).toFixed(1) +
          '" rx="2" fill="#FFFFFF" opacity="' + (0.3 - i * 0.021).toFixed(3) + '"/>';
      }
    }
    for (let i = 0; i < 8; i++) {
      const yy = y + 16 + i * i * 2.1 + i * 6;
      if (yy > 596) break;
      s += '<path d="M' + (-40 + (i % 3) * 30) + ' ' + yy + ' q 100 ' + (i % 2 ? 5 : -5) +
        ' 200 0 t 200 0 t 200 0 t 200 0" fill="none" stroke="#FFFFFF" stroke-opacity="' +
        (0.05 + i * 0.018).toFixed(3) + '" stroke-width="' + (1 + i * 0.45).toFixed(1) + '" stroke-linecap="round"/>';
    }
    return s;
  }

  /** A single umbrella pine — broad, cloud-like crown on a leaning trunk. */
  function pineTree(x, baseY, h, spread, colour, opacity) {
    const topY = baseY - h;
    const o = opacity === undefined ? 0.9 : opacity;
    let s = '<path d="M' + x + ' ' + baseY + ' q ' + (spread * 0.08) + ' ' + (-h * 0.55) + ' ' +
      (spread * 0.03) + ' ' + (-h) + '" stroke="' + colour + '" stroke-width="' + (h * 0.05).toFixed(1) +
      '" fill="none" stroke-linecap="round" opacity="' + o + '"/>';

    const blobs = [
      [-0.44, 0.10, 0.30], [-0.20, -0.02, 0.32], [0.04, -0.09, 0.30],
      [0.28, -0.01, 0.31], [0.46, 0.11, 0.26], [-0.08, 0.13, 0.28], [0.18, 0.14, 0.26]
    ];
    blobs.forEach(function (bl) {
      s += '<ellipse cx="' + (x + spread * bl[0]).toFixed(1) + '" cy="' + (topY + h * bl[1] * 0.42).toFixed(1) +
        '" rx="' + (spread * bl[2]).toFixed(1) + '" ry="' + (spread * bl[2] * 0.46).toFixed(1) +
        '" fill="' + colour + '" opacity="' + o + '"/>';
    });
    return s;
  }

  function pines(colour) {
    return pineTree(88, 600, 300, 210, colour, 0.9) +
      pineTree(726, 600, 250, 176, colour, 0.78);
  }

  /** A vine-covered pergola beam across the top of the frame. */
  function pergola(colour) {
    let s = '<rect x="0" y="10" width="800" height="16" rx="3" fill="' + colour + '" opacity=".6"/>';
    for (let x = 12; x < 812; x += 58) {
      const len = 54 + ((x * 17) % 62);
      s += '<path d="M' + x + ' 26 q 13 ' + (len * 0.55).toFixed(0) + ' -3 ' + len +
        '" stroke="' + colour + '" stroke-width="3.4" fill="none" opacity=".5" stroke-linecap="round"/>';
      for (let k = 1; k <= 3; k++) {
        const ly = 26 + (len / 3.2) * k;
        const side = k % 2 ? 1 : -1;
        const lx = x + side * 10 + 4;
        s += '<ellipse cx="' + lx + '" cy="' + ly.toFixed(0) + '" rx="12" ry="7" fill="' + colour +
          '" opacity="' + (0.6 - k * 0.07).toFixed(2) + '" transform="rotate(' + (side * 30) + ' ' + lx + ' ' + ly.toFixed(0) + ')"/>';
      }
    }
    return s;
  }

  function parasols(y, colour) {
    let s = '';
    [[190, 1], [432, 0.88], [648, 0.76]].forEach(function (p) {
      const x = p[0], k = p[1];
      s += '<path d="M' + (x - 58 * k) + ' ' + y + ' q ' + (58 * k) + ' ' + (-40 * k) + ' ' + (116 * k) + ' 0 Z" fill="' + colour + '" opacity=".82"/>' +
        '<path d="M' + x + ' ' + y + ' l0 ' + (50 * k) + '" stroke="' + colour + '" stroke-width="' + (4.5 * k).toFixed(1) + '" opacity=".7" stroke-linecap="round"/>' +
        '<ellipse cx="' + (x - 44 * k) + '" cy="' + (y + 48 * k) + '" rx="' + (30 * k) + '" ry="' + (7 * k) + '" fill="' + colour + '" opacity=".55"/>';
    });
    return s;
  }

  function archMask(id) {
    return '<clipPath id="' + id + '">' +
      '<path d="M120 560 L120 250 A 280 280 0 0 1 680 250 L680 560 Z"/></clipPath>';
  }

  function archOutline(colour) {
    return '<path d="M120 560 L120 250 A 280 280 0 0 1 680 250 L680 560" fill="none" ' +
      'stroke="' + colour + '" stroke-opacity=".22" stroke-width="4"/>';
  }

  function rail(y, colour) {
    let s = '<rect x="0" y="' + y + '" width="800" height="6" rx="3" fill="' + colour + '" opacity=".72"/>';
    for (let x = 26; x < 800; x += 46) {
      s += '<rect x="' + x + '" y="' + y + '" width="4.5" height="80" fill="' + colour + '" opacity=".48"/>';
    }
    return s;
  }

  function bed(y, colour, accent) {
    return '<rect x="196" y="' + (y - 62) + '" width="408" height="70" rx="14" fill="' + accent + '" opacity=".5"/>' +
      '<rect x="196" y="' + y + '" width="408" height="98" rx="16" fill="' + colour + '" opacity=".92"/>' +
      '<rect x="228" y="' + (y - 36) + '" width="112" height="44" rx="13" fill="#FFF" opacity=".8"/>' +
      '<rect x="356" y="' + (y - 36) + '" width="112" height="44" rx="13" fill="#FFF" opacity=".66"/>' +
      '<rect x="196" y="' + (y + 54) + '" width="408" height="24" rx="9" fill="' + accent + '" opacity=".68"/>';
  }

  function steam(colour) {
    let s = '';
    [256, 400, 544].forEach(function (x, i) {
      s += '<path d="M' + x + ' 486 c -24 -42 24 -66 0 -108 c -22 -38 18 -60 2 -98" fill="none" stroke="' + colour +
        '" stroke-opacity="' + (0.32 - i * 0.06).toFixed(2) + '" stroke-width="13" stroke-linecap="round"/>';
    });
    return s;
  }

  function boat(x, y, colour, scale) {
    const k = scale || 1;
    return '<path d="M' + (x - 46 * k) + ' ' + y + ' l' + (92 * k) + ' 0 l' + (-14 * k) + ' ' + (20 * k) + ' l' + (-64 * k) + ' 0 Z" fill="' + colour + '" opacity=".92"/>' +
      '<path d="M' + x + ' ' + (y - 4 * k) + ' l0 ' + (-86 * k) + '" stroke="' + colour + '" stroke-width="' + (4 * k) + '" opacity=".9"/>' +
      '<path d="M' + (x + 4 * k) + ' ' + (y - 8 * k) + ' l0 ' + (-74 * k) + ' l' + (52 * k) + ' ' + (74 * k) + ' Z" fill="#FFF" opacity=".92"/>' +
      '<path d="M' + (x - 6 * k) + ' ' + (y - 8 * k) + ' l0 ' + (-58 * k) + ' l' + (-38 * k) + ' ' + (58 * k) + ' Z" fill="#FFF" opacity=".74"/>';
  }

  function hills(colour) {
    return '<path d="M0 470 C 140 360 240 430 360 380 C 470 334 560 400 700 350 L800 372 L800 600 L0 600 Z" fill="' + colour + '" opacity=".5"/>' +
      '<path d="M0 530 C 160 450 300 500 430 470 C 560 440 680 480 800 450 L800 600 L0 600 Z" fill="' + colour + '" opacity=".72"/>';
  }

  function terraces(colour) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const y = 430 + i * 34;
      s += '<path d="M0 ' + y + ' q 200 ' + (i % 2 ? -14 : 12) + ' 400 0 t 400 0 L800 600 L0 600 Z" fill="' + colour +
        '" opacity="' + (0.16 + i * 0.05).toFixed(2) + '"/>';
    }
    return s;
  }

  function town(colour) {
    let s = '';
    let x = 30;
    while (x < 790) {
      const w = 50 + ((x * 13) % 48);
      const h = 80 + ((x * 29) % 130);
      s += '<rect x="' + x + '" y="' + (525 - h) + '" width="' + w + '" height="' + h + '" rx="2" fill="' + colour +
        '" opacity="' + (0.45 + ((x % 3) * 0.15)).toFixed(2) + '"/>';
      for (let wx = x + 9; wx < x + w - 10; wx += 19) {
        for (let wy = 525 - h + 16; wy < 510; wy += 28) {
          s += '<rect x="' + wx + '" y="' + wy + '" width="7" height="11" rx="1" fill="#FFF" opacity=".38"/>';
        }
      }
      x += w + 9;
    }
    return s;
  }

  /* ---------------- scene definitions ---------------- */

  const SCENES = {
    /* --- heroes: landscape only, nothing in the foreground --- */
    hero:           { p: 'gold',    horizon: 344, sun: [566, 300, 44], headland: true, pine: true },
    'hero-rooms':   { p: 'dawn',    horizon: 350, sun: [232, 268, 40], headland: true },
    'hero-dining':  { p: 'dusk',    horizon: 356, sun: [600, 300, 38], headland: true, town: true },
    'hero-spa':     { p: 'deepsea', horizon: 330, sun: [400, 262, 46] },
    'hero-exp':     { p: 'azure',   horizon: 348, sun: [648, 214, 34], headland: true, pine: true },
    'hero-hotel':   { p: 'morning', horizon: 352, sun: [206, 208, 38], headland: true, pine: true },
    'hero-contact': { p: 'verdant', horizon: 400, sun: [640, 200, 34], hills: true },

    /* --- landscape cards --- */
    story:          { p: 'morning', horizon: 356, sun: [206, 214, 36], pine: true, headland: true },
    beach:          { p: 'azure',   horizon: 312, sun: [636, 128, 32], parasols: 520 },
    pool:           { p: 'azure',   horizon: 330, sun: [138, 140, 30], rail: 424, parasols: 548 },

    /* --- rooms: a view through an arch --- */
    'room-standard':  { p: 'stone',   horizon: 362, arch: true, bed: 432, sun: [400, 256, 30] },
    'room-twin':      { p: 'dawn',    horizon: 360, arch: true, bed: 434, sun: [400, 250, 30] },
    'room-deluxe':    { p: 'gold',    horizon: 352, arch: true, bed: 432, sun: [400, 266, 40], headland: true },
    'room-junior':    { p: 'dusk',    horizon: 346, arch: true, bed: 430, sun: [400, 256, 42], headland: true },
    'room-family':    { p: 'verdant', horizon: 384, arch: true, bed: 436, pergola: true },
    'room-penthouse': { p: 'dusk',    horizon: 338, rail: 462, sun: [400, 254, 54], headland: true, pine: true },

    /* --- dining --- */
    'dining-fine':    { p: 'dusk',    horizon: 330, rail: 448, sun: [612, 274, 36], headland: true },
    'dining-terrace': { p: 'verdant', horizon: 402, pergola: true, pine: true, parasols: 540 },
    'dining-rooftop': { p: 'gold',    horizon: 342, rail: 452, sun: [418, 296, 46], town: true },

    spa:              { p: 'deepsea', horizon: 306, arch: true, steam: true },

    /* --- experiences --- */
    sail:             { p: 'gold',    horizon: 330, sun: [566, 292, 44], boat: [318, 404, 0.9] },
    wine:             { p: 'stone',   horizon: 430, terraces: true, sun: [636, 190, 32], pergola: true },
    cook:             { p: 'verdant', horizon: 420, pergola: true, hills: true, parasols: 548 },
    hike:             { p: 'morning', horizon: 336, hills: true, sun: [186, 150, 30], headland: true },
    snorkel:          { p: 'deepsea', horizon: 214, sun: [604, 96, 26], boat: [524, 306, 0.62] },
    market:           { p: 'dawn',    horizon: 436, town: true, sun: [176, 158, 32] }
  };

  /* ---------------- renderer ---------------- */

  /**
   * Art.scene('room-deluxe') → an <svg> string that fills its container.
   * Ids are namespaced per call so many scenes can share one document.
   */
  Art.scene = function (key, opts) {
    const o = opts || {};
    const def = SCENES[key] || SCENES.hero;
    const pal = P[def.p] || P.azure;
    const n = ++seq;
    const id = s => 'a' + n + s;

    let defs = grad(id('sky'), pal.sky) + grad(id('sea'), pal.sea);
    if (def.arch) defs += archMask(id('arch'));

    /* the view — clipped by the arch when there is one */
    let view = '<rect width="800" height="600" fill="url(#' + id('sky') + ')"/>';
    if (def.sun) view += sunDisc(def.sun[0], def.sun[1], def.sun[2], pal.sun, id('sund'));
    if (def.headland) view += headland(def.horizon, pal.deep);
    if (def.terraces) view += terraces(pal.land);
    if (def.hills) view += hills(pal.land);
    if (def.town) view += town(pal.deep);
    if (!def.hills && !def.town && !def.terraces) {
      view += sea(def.horizon, id('sea'), def.sun ? def.sun[0] : null);
    }
    if (def.boat) view += boat(def.boat[0], def.boat[1], pal.deep, def.boat[2]);
    if (def.steam) view += steam('#FFFFFF');
    if (def.pine) view += pines(pal.deep);

    /* the room the view is seen from */
    let front = '';
    if (def.rail) front += rail(def.rail, pal.deep);
    if (def.parasols) front += parasols(def.parasols, pal.land);
    if (def.bed) front += bed(def.bed, pal.land, pal.deep);
    if (def.pergola) front += pergola(pal.deep);

    const inner = def.arch
      // a wall behind the arch, so the scene never lets the page show through
      ? '<rect width="800" height="600" fill="' + pal.wall + '"/>' +
        '<g clip-path="url(#' + id('arch') + ')">' + view + '</g>' +
        archOutline(pal.deep) + front
      : view + front;

    const scrim = o.scrim === undefined ? 0.34 : o.scrim;

    return '<svg class="art" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" ' +
      'role="img" aria-label="' + U.esc(o.alt || 'Illustration of ' + String(key).replace(/-/g, ' ')) + '" focusable="false">' +
      '<defs>' + defs + '</defs>' + inner +
      (scrim === false || scrim === 0 ? '' :
        '<linearGradient id="' + id('scrim') + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#0B1F2A" stop-opacity="' + (scrim * 0.55).toFixed(3) + '"/>' +
        '<stop offset="38%" stop-color="#0B1F2A" stop-opacity="0"/>' +
        '<stop offset="100%" stop-color="#0B1F2A" stop-opacity="' + scrim + '"/></linearGradient>' +
        '<rect width="800" height="600" fill="url(#' + id('scrim') + ')"/>') +
      '</svg>';
  };

  Art.wave = function () {
    return '<svg class="art-wave" viewBox="0 0 120 16" fill="none" aria-hidden="true" focusable="false">' +
      '<path d="M2 8 q 14 -8 28 0 t 28 0 t 28 0 t 28 0" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" opacity=".55"/></svg>';
  };

  Art.keys = () => Object.keys(SCENES);

  global.Art = Art;
})(window);
