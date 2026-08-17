/* ============================================================
   Magnolia House — shared markup pieces for the public site
   ============================================================ */
(function (global) {
  'use strict';

  const Parts = {};

  /* ---------------- formatting ---------------- */

  Parts.money = function (n, decimals) {
    return U.money(n, Store.state.hotel.currency, { decimals: decimals === undefined ? 0 : decimals });
  };

  Parts.nightsLabel = function (n) {
    return n + ' night' + (n === 1 ? '' : 's');
  };

  Parts.guestLabel = function (n) {
    return n + ' guest' + (n === 1 ? '' : 's');
  };

  /* ---------------- the booking search bar ---------------- */

  /**
   * The single most important control on the site. The reference sites
   * all bury booking behind a small "Reserve" link; this stays on the
   * first screen and is identical everywhere it appears.
   */
  Parts.searchbar = function (opts) {
    const o = opts || {};
    const s = Site.search;
    const today = U.today();

    return '<form class="searchbar ' + (o.variant ? 'searchbar--' + o.variant : '') + '" id="siteSearch" novalidate>' +
      '<div class="searchbar__field">' +
        '<label for="sIn">Arrive</label>' +
        '<input type="date" id="sIn" name="checkIn" value="' + U.esc(s.checkIn) + '" min="' + today + '" required>' +
      '</div>' +
      '<div class="searchbar__field">' +
        '<label for="sOut">Depart</label>' +
        '<input type="date" id="sOut" name="checkOut" value="' + U.esc(s.checkOut) + '" min="' + U.addDays(today, 1) + '" required>' +
      '</div>' +
      '<div class="searchbar__field">' +
        '<label for="sGuests">Guests</label>' +
        '<select id="sGuests" name="guests">' +
          [1, 2, 3, 4, 5, 6].map(n =>
            '<option value="' + n + '"' + (s.guests === n ? ' selected' : '') + '>' +
            n + ' guest' + (n === 1 ? '' : 's') + '</option>').join('') +
        '</select>' +
      '</div>' +
      '<button class="btn" type="submit"><span>' + U.esc(o.label || 'Check availability') + '</span></button>' +
    '</form>' +
    (o.summary === false ? '' :
      '<p class="searchbar__summary">' +
        U.esc(U.fmtDate(s.checkIn) + ' — ' + U.fmtDate(s.checkOut)) + ' · ' +
        Parts.nightsLabel(Site.nights()) + ' · ' + Parts.guestLabel(s.guests) +
      '</p>');
  };

  /** Wire a rendered search bar. `onSearch` receives the new search state. */
  Parts.wireSearch = function (root, onSearch) {
    const form = root.querySelector('#siteSearch');
    if (!form) return;

    const inEl = form.querySelector('[name=checkIn]');
    const outEl = form.querySelector('[name=checkOut]');

    // keep departure strictly after arrival, the way every booking engine does
    inEl.addEventListener('change', function () {
      const min = U.addDays(inEl.value || U.today(), 1);
      outEl.min = min;
      if (!outEl.value || outEl.value <= inEl.value) outEl.value = min;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const d = UI.formData(form);
      if (!d.checkIn || !d.checkOut || d.checkOut <= d.checkIn) {
        UI.toast('Check those dates', 'Departure needs to be after arrival.', 'warn');
        return;
      }
      Site.setSearch({ checkIn: d.checkIn, checkOut: d.checkOut, guests: Number(d.guests) || 2 });
      if (onSearch) onSearch(Site.search);
      else Site.go('#/rooms');
    });
  };

  /* ---------------- hero ---------------- */

  /**
   * Full-viewport and image-led. Direct children of the inner wrap are
   * animated in sequence by CSS, so they must stay siblings.
   */
  Parts.hero = function (o) {
    return '<header class="hero' + (o.compact ? ' hero--compact' : '') + '" data-hero>' +
      '<div class="hero__art">' + Art.scene(o.art || 'hero', { scrim: o.scrim === undefined ? 0.5 : o.scrim, alt: o.alt }) + '</div>' +
      '<div class="hero__inner"><div class="wrap">' +
        (o.eyebrow ? '<span class="eyebrow eyebrow--light">' + U.esc(o.eyebrow) + '</span>' : '') +
        '<h1 class="display">' + U.esc(o.title) + '</h1>' +
        (o.sub ? '<p class="lede">' + U.esc(o.sub) + '</p>' : '') +
        (o.search ? Parts.searchbar({ variant: 'hero' }) : '') +
        (o.cta || '') +
      '</div></div>' +
      (o.cue ? '<div class="scrollcue"><span></span>Scroll</div>' : '') +
    '</header>';
  };

  /* ---------------- section head ---------------- */

  Parts.head = function (o) {
    return '<div class="section__head' + (o.centre ? ' section__head--centre' : '') + '">' +
      (o.eyebrow ? '<span class="eyebrow">' + U.esc(o.eyebrow) + '</span>' : '') +
      '<h2 class="h1">' + U.esc(o.title) + '</h2>' +
      (o.sub ? '<p class="lede">' + U.esc(o.sub) + '</p>' : '') +
    '</div>';
  };

  /* ---------------- editorial block ---------------- */

  /** Image one side, a short column of type the other. Alternate with `reverse`. */
  Parts.editorial = function (o) {
    const paras = (o.body || '').split('|').filter(Boolean)
      .map(p => '<p class="lede" style="margin-bottom:1rem">' + U.esc(p) + '</p>').join('');

    return '<article class="editorial reveal' + (o.reverse ? ' editorial--reverse' : '') + '" ' +
      (o.attr || '') + '>' +
      '<div class="editorial__art">' + Art.scene(o.art, { scrim: 0.12, alt: o.alt || o.title }) + '</div>' +
      '<div class="editorial__body">' +
        (o.eyebrow ? '<span class="eyebrow">' + U.esc(o.eyebrow) + '</span>' : '') +
        '<h2 class="h1">' + U.esc(o.title) + '</h2>' +
        paras +
        (o.extra || '') +
        (o.action ? '<a class="textlink" href="' + U.esc(o.href || '#') + '">' +
          U.esc(o.action) + '<span data-icon="arrow-right"></span></a>' : '') +
      '</div>' +
    '</article>';
  };

  /* ---------------- full-bleed plate ---------------- */

  /** One line of type over a full-width image, used to pace the page. */
  Parts.plate = function (o) {
    return '<section class="plate">' +
      '<div class="plate__art">' + Art.scene(o.art, { scrim: o.scrim === undefined ? 0.52 : o.scrim, alt: o.alt || '' }) + '</div>' +
      '<div class="plate__body">' +
        (o.eyebrow ? '<span class="eyebrow eyebrow--light">' + U.esc(o.eyebrow) + '</span>' : '') +
        '<p class="statement">' + U.esc(o.text) + '</p>' +
        (o.action ? '<a class="btn btn--light" href="' + U.esc(o.href || '#') + '"><span>' +
          U.esc(o.action) + '</span></a>' : '') +
      '</div>' +
    '</section>';
  };

  /* ---------------- room pieces ---------------- */

  Parts.roomCard = function (type) {
    const from = rateFrom(type);
    return '<article class="card card--hover" data-roomtype="' + type.id + '">' +
      '<div class="card__media">' + Art.scene(type.art || 'room-standard', { scrim: 0.16, alt: type.name }) + '</div>' +
      '<div class="card__body">' +
        '<span class="eyebrow eyebrow--stone">' + U.esc(type.view || '') + '</span>' +
        '<h3 class="h3">' + U.esc(type.name) + '</h3>' +
        '<div class="card__meta">' +
          '<span>' + type.capacity + ' guests</span>' +
          '<span>' + type.size + ' m&sup2;</span>' +
          '<span>' + U.esc(type.beds) + '</span>' +
        '</div>' +
        '<div class="row">' +
          '<div><span class="price">' + Parts.money(from) + '</span> <small>per night</small></div>' +
          '<span class="spacer"></span>' +
          '<span class="textlink">Discover<span data-icon="arrow-right"></span></span>' +
        '</div>' +
      '</div>' +
    '</article>';
  };

  function rateFrom(type) {
    const s = Site.search;
    return Domain.quote(type.id, s.checkIn, s.checkOut) || type.basePrice;
  }

  /* ---------------- generic offering card ---------------- */

  Parts.offerCard = function (o) {
    return '<article class="card card--hover" ' + (o.attr || '') + '>' +
      '<div class="card__media' + (o.wide ? ' card__media--wide' : '') + '">' +
        Art.scene(o.art, { scrim: 0.18, alt: o.title }) +
        (o.badge ? '<span class="card__badge ' + (o.badgeClass || '') + '">' + U.esc(o.badge) + '</span>' : '') +
      '</div>' +
      '<div class="card__body">' +
        (o.eyebrow ? '<span class="eyebrow eyebrow--stone">' + U.esc(o.eyebrow) + '</span>' : '') +
        '<h3 class="h3">' + U.esc(o.title) + '</h3>' +
        (o.meta ? '<div class="card__meta">' + o.meta + '</div>' : '') +
        (o.text ? '<p class="small muted">' + U.esc(o.text) + '</p>' : '') +
        '<div class="row">' +
          (o.price !== undefined
            ? '<div><span class="price">' + Parts.money(o.price) + '</span>' +
              (o.priceNote ? ' <small>' + U.esc(o.priceNote) + '</small>' : '') + '</div>'
            : '') +
          '<span class="spacer"></span>' +
          '<span class="textlink">' + U.esc(o.action || 'View') + '<span data-icon="arrow-right"></span></span>' +
        '</div>' +
      '</div>' +
    '</article>';
  };

  /* ---------------- footer ---------------- */

  Parts.footer = function () {
    const h = Store.state.hotel;
    const c = Store.state.siteContent;
    return '<footer class="footer">' +
      '<div class="wrap">' +
        '<div class="footer__grid">' +
          '<div class="footer__brand">' +
            '<strong>' + U.esc(h.name) + '</strong>' +
            '<p>' + U.esc(c.hero.sub) + '</p>' +
          '</div>' +
          '<div><h4>Stay</h4><ul>' +
            '<li><a href="#/rooms">Rooms &amp; suites</a></li>' +
            '<li><a href="#/experiences">Experiences</a></li>' +
            '<li><a href="#/spa">Spa &amp; wellness</a></li>' +
            '<li><a href="#/booking">Manage a booking</a></li>' +
          '</ul></div>' +
          '<div><h4>Eat &amp; drink</h4><ul>' +
            Store.state.restaurants.map(r =>
              '<li><a href="#/dining?id=' + r.id + '">' + U.esc(r.name) + '</a></li>').join('') +
            '<li><a href="#/dining">Reserve a table</a></li>' +
          '</ul></div>' +
          '<div><h4>Find us</h4><ul>' +
            '<li>' + U.esc(h.address) + '</li>' +
            '<li><a href="tel:' + U.esc(h.phone.replace(/\s/g, '')) + '">' + U.esc(h.phone) + '</a></li>' +
            '<li><a href="mailto:' + U.esc(h.email) + '">' + U.esc(h.email) + '</a></li>' +
            '<li><a href="#/contact">Getting here</a></li>' +
          '</ul></div>' +
        '</div>' +
        '<div class="footer__base">' +
          '<span>&copy; ' + new Date().getFullYear() + ' ' + U.esc(h.name) + '</span>' +
          '<span>All rates include VAT</span>' +
          '<span class="spacer"></span>' +
          '<a href="index.html" title="Staff only">Staff sign in</a>' +
        '</div>' +
      '</div>' +
    '</footer>';
  };

  /* ---------------- behaviour helpers ---------------- */

  /** Fade sections in as they enter the viewport. */
  Parts.revealAll = function (root) {
    const nodes = U.$$('.reveal', root);
    if (!nodes.length) return;
    if (!global.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      nodes.forEach(n => n.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });
    nodes.forEach((n, i) => {
      n.style.transitionDelay = Math.min(i % 3, 2) * 110 + 'ms';
      io.observe(n);
    });
  };

  Parts.accordion = function (root) {
    U.on(root, 'click', '.acc__q', function (e, btn) {
      const item = btn.closest('.acc__item');
      const open = item.classList.contains('is-open');
      U.$$('.acc__item', root).forEach(i => i.classList.remove('is-open'));
      if (!open) item.classList.add('is-open');
      btn.setAttribute('aria-expanded', String(!open));
    });
  };

  Parts.stars = function (n) {
    let s = '<span class="stars" aria-label="' + (n || 5) + ' out of 5">';
    for (let i = 0; i < (n || 5); i++) s += '<span data-icon="star"></span>';
    return s + '</span>';
  };

  Parts.empty = function (o) {
    return '<div class="emptystate">' +
      '<span data-icon="' + (o.icon || 'info') + '" style="color:var(--stone-pale)"></span>' +
      '<h3 class="h3">' + U.esc(o.title) + '</h3>' +
      (o.text ? '<p>' + U.esc(o.text) + '</p>' : '') +
      (o.action || '') +
    '</div>';
  };

  global.Parts = Parts;
})(window);
