/* ============================================================
   Page — Rooms & Suites (browse, filter, book)
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  const filters = { sort: 'price', features: [], onlyAvailable: true };

  const FEATURES = [
    { key: 'Sea view', icon: 'wave', label: 'Sea view' },
    { key: 'Balcony', icon: 'sun', label: 'Balcony' },
    { key: 'Bathtub', icon: 'steam', label: 'Bathtub' },
    { key: 'Sofa bed', icon: 'bed', label: 'Sofa bed' },
    { key: 'Nespresso', icon: 'coffee', label: 'Coffee machine' }
  ];

  Pages.rooms = {
    title: () => 'Rooms & Suites',

    render: function (host, params) {
      const s = Site.search;
      const nights = Site.nights();

      const all = Domain.searchAvailability(s.checkIn, s.checkOut, s.guests, {
        includeUnavailable: true, includeTooSmall: true
      });
      const rows = applyFilters(all);
      const anyAvailable = all.some(r => r.available > 0 && r.fits);

      host.innerHTML =
        Parts.hero({
          art: 'hero-rooms', compact: true, scrim: 0.46,
          eyebrow: 'Rooms & Suites',
          title: 'Wake up to the water',
          sub: 'Thirty rooms across four floors. Sea-facing balconies on the upper levels, garden terraces at ground level, and quiet in all of them.',
          alt: 'A sea-view room at sunrise'
        }) +

        '<section class="section section--tight">' +
          '<div class="wrap">' +
            Parts.searchbar({ variant: 'inline', summary: false }) +

            '<div class="row row--wrap" style="justify-content:space-between;gap:1rem">' +
              '<p class="small muted">' +
                U.esc(U.fmtDateLong(s.checkIn)) + ' → ' + U.esc(U.fmtDateLong(s.checkOut)) +
                ' · ' + Parts.nightsLabel(nights) + ' · ' + Parts.guestLabel(s.guests) +
              '</p>' +
              '<p class="small muted">' + rows.length + ' of ' + all.length + ' room types shown</p>' +
            '</div>' +

            '<div class="filters">' +
              FEATURES.map(f =>
                '<button class="chip' + (filters.features.indexOf(f.key) > -1 ? ' is-on' : '') + '" data-feat="' + U.esc(f.key) + '">' +
                '<span data-icon="' + f.icon + '"></span>' + U.esc(f.label) + '</button>').join('') +
              '<button class="chip' + (filters.onlyAvailable ? ' is-on' : '') + '" data-avail>' +
                '<span data-icon="check"></span>Available only</button>' +
              '<span class="spacer"></span>' +
              '<select class="selectbox" id="roomSort" aria-label="Sort rooms">' +
                '<option value="price"' + sel('price') + '>Price · low to high</option>' +
                '<option value="price-desc"' + sel('price-desc') + '>Price · high to low</option>' +
                '<option value="size"' + sel('size') + '>Largest first</option>' +
                '<option value="capacity"' + sel('capacity') + '>Sleeps most</option>' +
              '</select>' +
            '</div>' +

            (!anyAvailable ? soldOutNotice(s, nights) : '') +

            (rows.length
              ? '<div class="col" style="gap:1.1rem">' + rows.map(row => roomRow(row, nights)).join('') + '</div>'
              : Parts.empty({
                icon: 'search',
                title: 'Nothing matches those filters',
                text: 'Try clearing a filter, or widening your dates.',
                action: '<button class="btn btn--primary" style="margin-top:1.2rem" data-clear>Clear filters</button>'
              })) +
          '</div>' +
        '</section>' +

        '<section class="section section--sand">' +
          '<div class="wrap">' +
            Parts.head({ eyebrow: 'In every room', title: 'What you get, whichever you choose', centre: true }) +
            '<div class="grid grid--4 reveal">' +
              [
                { i: 'wifi', t: 'Fast Wi-Fi', d: 'Free throughout, and it reaches the balcony' },
                { i: 'snow', t: 'Air conditioning', d: 'Individually controlled, silent at night' },
                { i: 'coffee', t: 'Breakfast option', d: 'Add it for ' + Parts.money(Store.state.hotel.breakfastPrice) + ' per adult per night' },
                { i: 'paw', t: 'Dogs welcome', d: '₾70 per stay, bed and bowls provided' },
                { i: 'shield', t: 'Free cancellation', d: 'Until 48 hours before you arrive' },
                { i: 'key', t: '24-hour reception', d: 'Arrive at any hour, someone is up' },
                { i: 'wave', t: 'Beach and pool', d: 'Towels, loungers and service included' },
                { i: 'sparkle', t: 'Daily housekeeping', d: 'Turndown on request each evening' }
              ].map(x =>
                '<div class="amenity" style="border-top:0"><span data-icon="' + x.i + '"></span>' +
                '<div><strong>' + U.esc(x.t) + '</strong><span>' + U.esc(x.d) + '</span></div></div>').join('') +
            '</div>' +
          '</div>' +
        '</section>';

      wire(host);

      if (params && params.type) {
        const row = all.find(r => r.type.id === params.type);
        if (row) openRoom(row, nights);
        history.replaceState(null, '', '#/rooms');
      }

      function sel(v) { return filters.sort === v ? ' selected' : ''; }
    },

    openRoomType: function (typeId) {
      const s = Site.search;
      const all = Domain.searchAvailability(s.checkIn, s.checkOut, s.guests, { includeUnavailable: true, includeTooSmall: true });
      const row = all.find(r => r.type.id === typeId);
      if (row) openRoom(row, Site.nights());
    }
  };

  /* ============================================================
     filtering
     ============================================================ */

  function applyFilters(rows) {
    let out = rows.filter(r => {
      if (filters.onlyAvailable && (r.available === 0 || !r.fits)) return false;
      if (filters.features.length) {
        const has = filters.features.every(f =>
          (r.type.amenities || []).indexOf(f) > -1 ||
          (f === 'Sea view' && /sea/i.test(r.type.view || '')));
        if (!has) return false;
      }
      return true;
    });

    out.sort((a, b) => {
      if (filters.sort === 'price-desc') return b.nightly - a.nightly;
      if (filters.sort === 'size') return b.type.size - a.type.size;
      if (filters.sort === 'capacity') return b.type.capacity - a.type.capacity;
      return a.nightly - b.nightly;
    });
    return out;
  }

  /* ============================================================
     markup
     ============================================================ */

  function soldOutNotice(s, nights) {
    const next = Domain.nextAvailableFrom(s.checkIn, nights, s.guests);
    return '<div class="notice notice--warn" style="margin-bottom:1.2rem">' +
      '<span data-icon="alert"></span>' +
      '<div><strong>We are full for ' + U.esc(U.fmtDate(s.checkIn)) + ' → ' + U.esc(U.fmtDate(s.checkOut)) + '.</strong> ' +
      (next
        ? 'The next ' + Parts.nightsLabel(nights) + ' we can offer ' + Parts.guestLabel(s.guests) + ' start ' +
          U.esc(U.fmtDateLong(next.from)) + '. ' +
          '<button class="textlink" data-usenext="' + next.from + '|' + next.to + '" style="background:none;border:0;padding:0;cursor:pointer;font:inherit">' +
          'Use those dates<span data-icon="arrow-right"></span></button>'
        : 'Try a different month, or call us on ' + U.esc(Store.state.hotel.phone) + ' — we sometimes have a release.') +
      '</div></div>';
  }

  function roomRow(row, nights) {
    const t = row.type;
    const sold = row.available === 0;
    const tooSmall = !row.fits;
    const scarce = row.available > 0 && row.available <= 2;

    return '<article class="roomrow reveal" data-type="' + t.id + '">' +
      '<div class="roomrow__art">' +
        Art.scene(t.art || 'room-standard', { scrim: 0.16, alt: t.name }) +
        (scarce ? '<span class="card__badge card__badge--coral">Only ' + row.available + ' left</span>' : '') +
        (sold ? '<span class="card__badge">Sold out</span>' : '') +
      '</div>' +

      '<div class="roomrow__body">' +
        '<div class="row row--wrap" style="gap:.5rem">' +
          '<h3 class="h3">' + U.esc(t.name) + '</h3>' +
          (/sea/i.test(t.view || '') ? '<span class="tag tag--sea"><span data-icon="wave"></span>Sea view</span>' : '') +
        '</div>' +
        '<div class="card__meta">' +
          '<span><span data-icon="users"></span>Sleeps ' + t.capacity + '</span>' +
          '<span><span data-icon="ruler"></span>' + t.size + ' m²</span>' +
          '<span><span data-icon="bed"></span>' + U.esc(t.beds) + '</span>' +
          '<span><span data-icon="eye"></span>' + U.esc(t.view || '') + '</span>' +
        '</div>' +
        '<p class="small" style="color:var(--text-2)">' + U.esc(t.blurb || '') + '</p>' +
        '<div class="taglist">' +
          (t.amenities || []).slice(0, 5).map(a => '<span class="tag">' + U.esc(a) + '</span>').join('') +
          ((t.amenities || []).length > 5 ? '<span class="tag">+' + (t.amenities.length - 5) + ' more</span>' : '') +
        '</div>' +
        (tooSmall
          ? '<p class="small" style="color:var(--warn)">Sleeps ' + t.capacity + ' — too small for ' + Parts.guestLabel(Site.search.guests) + '.</p>'
          : '') +
      '</div>' +

      '<div class="roomrow__buy">' +
        '<div>' +
          '<span class="price">' + Parts.money(row.nightly) + '</span> <small class="muted">per night</small>' +
          '<div class="small muted tnum">' + Parts.money(row.total) + ' for ' + Parts.nightsLabel(nights) + '</div>' +
        '</div>' +
        (sold
          ? '<span class="tag tag--warn">Not available</span>'
          : tooSmall
            ? '<span class="tag tag--warn">Too small</span>'
            : '<span class="tag tag--ok"><span data-icon="check"></span>' + row.available + ' available</span>') +
        '<div class="col" style="gap:.45rem;width:100%;align-items:stretch">' +
          '<button class="btn btn--primary" data-book="' + t.id + '"' + (sold || tooSmall ? ' disabled' : '') + '>' +
            (sold ? 'Sold out' : 'Book this room') + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-detail="' + t.id + '">Full details</button>' +
        '</div>' +
        '<span class="small muted">Free cancellation · pay at the hotel</span>' +
      '</div>' +
    '</article>';
  }

  /* ============================================================
     detail
     ============================================================ */

  function openRoom(row, nights) {
    const t = row.type;
    const s = Site.search;

    const m = UI.modal({
      title: t.name,
      subtitle: t.view + ' · sleeps ' + t.capacity + ' · ' + t.size + ' m²',
      size: 'lg',
      flush: true,
      body:
        '<div style="aspect-ratio:2/1;overflow:hidden">' + Art.scene(t.art, { scrim: 0.14, alt: t.name }) + '</div>' +
        '<div style="padding:1.5rem">' +
          '<p class="lede">' + U.esc(t.blurb || '') + '</p>' +

          '<div class="grid grid--2" style="margin-top:1.4rem;gap:1.6rem">' +
            '<div>' +
              '<h4 class="h4" style="margin-bottom:.6rem">The room</h4>' +
              '<ul style="margin:0;padding-left:1.1rem;color:var(--text-2);font-size:.93rem">' +
                (t.highlights || []).map(h => '<li style="margin-bottom:.35rem">' + U.esc(h) + '</li>').join('') +
              '</ul>' +
              '<h4 class="h4" style="margin:1.2rem 0 .6rem">In this room</h4>' +
              '<div class="taglist">' + (t.amenities || []).map(a => '<span class="tag">' + U.esc(a) + '</span>').join('') + '</div>' +
            '</div>' +

            '<div>' +
              '<div class="panel">' +
                '<h4 class="h4" style="margin-bottom:.6rem">Your dates</h4>' +
                '<p class="small muted" style="margin-bottom:.8rem">' +
                  U.esc(U.fmtDate(s.checkIn)) + ' → ' + U.esc(U.fmtDate(s.checkOut)) + ' · ' + Parts.guestLabel(s.guests) +
                '</p>' +
                row.perNight.map(p =>
                  '<div class="linerow"><span>' + U.esc(U.fmtDate(p.date)) +
                  (U.isWeekend(p.date) ? ' <span class="muted">· weekend</span>' : '') + '</span>' +
                  '<b>' + Parts.money(p.rate) + '</b></div>').join('') +
                '<div class="linerow linerow--total"><span>' + Parts.nightsLabel(nights) + '</span>' +
                  '<b>' + Parts.money(row.total) + '</b></div>' +
                '<p class="small muted" style="margin-top:.6rem">Includes VAT. City tax of ' +
                  Parts.money(Store.state.hotel.cityTax, 2) + ' per guest per night is added at checkout.</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>',
      footer:
        '<div><span class="price">' + Parts.money(row.nightly) + '</span> <small class="muted">per night</small></div>' +
        '<span class="spacer"></span>' +
        '<button class="btn" data-close>Close</button>' +
        '<button class="btn btn--primary" id="bookIt"' +
          (row.available === 0 || !row.fits ? ' disabled' : '') + '>' +
          (row.available === 0 ? 'Sold out for these dates' : 'Book this room') + '</button>'
    });

    const go = m.el.querySelector('#bookIt');
    if (go) go.addEventListener('click', function () {
      m.close();
      startBooking(t.id);
    });
  }

  function startBooking(typeId) {
    Site.resetBasket();
    Site.basket.typeId = typeId;
    Site.go('#/checkout');
  }

  /* ============================================================
     wiring
     ============================================================ */

  function wire(host) {
    Parts.wireSearch(host, () => Site.render());

    U.on(host, 'click', '[data-feat]', function (e, el) {
      const k = el.dataset.feat;
      const i = filters.features.indexOf(k);
      if (i > -1) filters.features.splice(i, 1); else filters.features.push(k);
      Site.render();
    });

    U.on(host, 'click', '[data-avail]', function () {
      filters.onlyAvailable = !filters.onlyAvailable;
      Site.render();
    });

    U.on(host, 'change', '#roomSort', function (e, el) {
      filters.sort = el.value;
      Site.render();
    });

    U.on(host, 'click', '[data-clear]', function () {
      filters.features = [];
      filters.onlyAvailable = true;
      Site.render();
    });

    U.on(host, 'click', '[data-usenext]', function (e, el) {
      const [from, to] = el.dataset.usenext.split('|');
      Site.setSearch({ checkIn: from, checkOut: to });
      Site.render();
      UI.toast('Dates updated', U.fmtDateLong(from) + ' → ' + U.fmtDateLong(to), 'ok');
    });

    U.on(host, 'click', '[data-book]', function (e, el) {
      e.stopPropagation();
      if (el.disabled) return;
      startBooking(el.dataset.book);
    });

    U.on(host, 'click', '[data-detail]', function (e, el) {
      e.stopPropagation();
      openDetailById(el.dataset.detail);
    });

    U.on(host, 'click', '.roomrow__art', function (e, el) {
      openDetailById(el.closest('[data-type]').dataset.type);
    });
  }

  function openDetailById(typeId) {
    const s = Site.search;
    const all = Domain.searchAvailability(s.checkIn, s.checkOut, s.guests, { includeUnavailable: true, includeTooSmall: true });
    const row = all.find(r => r.type.id === typeId);
    if (row) openRoom(row, Site.nights());
  }

})(window);
