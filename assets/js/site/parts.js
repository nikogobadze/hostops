/* ============================================================
   Casa Marea — shared markup pieces for the public site
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
   * The single most important control on the site — kept identical
   * everywhere so a guest never has to re-learn it.
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
      '<button class="btn btn--primary btn--lg" type="submit">' +
        '<span data-icon="search"></span>' + U.esc(o.label || 'Check availability') +
      '</button>' +
    '</form>' +
    (o.summary === false ? '' :
      '<p class="searchbar__summary">' +
        U.esc(U.fmtDate(s.checkIn) + ' → ' + U.fmtDate(s.checkOut)) + ' · ' +
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

  Parts.hero = function (o) {
    return '<header class="hero' + (o.compact ? ' hero--compact' : '') + '" data-hero>' +
      '<div class="hero__art">' + Art.scene(o.art || 'hero', { scrim: o.scrim === undefined ? 0.42 : o.scrim, alt: o.alt }) + '</div>' +
      '<div class="hero__inner"><div class="wrap">' +
        (o.eyebrow ? '<span class="eyebrow eyebrow--light">' + U.esc(o.eyebrow) + '</span>' : '') +
        '<h1 class="display">' + U.esc(o.title) + '</h1>' +
        (o.sub ? '<p class="lede">' + U.esc(o.sub) + '</p>' : '') +
        (o.search ? Parts.searchbar({ variant: 'hero', summary: false }) : '') +
        (o.cta || '') +
      '</div></div>' +
      (o.cue ? '<div class="scrollcue"><span></span>Scroll</div>' : '') +
    '</header>';
  };

  /* ---------------- section head ---------------- */

  Parts.head = function (o) {
    return '<div class="section__head' + (o.centre ? ' section__head--centre' : '') + '">' +
      (o.eyebrow ? '<span class="eyebrow">' + U.esc(o.eyebrow) + '</span>' : '') +
      '<h2 class="' + (o.level === 1 ? 'h1' : 'h1') + '">' + U.esc(o.title) + '</h2>' +
      (o.sub ? '<p class="lede">' + U.esc(o.sub) + '</p>' : '') +
    '</div>';
  };

  /* ---------------- room pieces ---------------- */

  /** Marketing card, used on the home page. */
  Parts.roomCard = function (type) {
    const from = D_rateFrom(type);
    return '<article class="card card--hover" data-roomtype="' + type.id + '">' +
      '<div class="card__media">' + Art.scene(type.art || 'room-standard', { scrim: 0.18, alt: type.name }) +
        '<span class="card__badge">' + U.esc(type.view || '') + '</span>' +
      '</div>' +
      '<div class="card__body">' +
        '<h3 class="h3">' + U.esc(type.name) + '</h3>' +
        '<div class="card__meta">' +
          '<span><span data-icon="users"></span>' + type.capacity + '</span>' +
          '<span><span data-icon="ruler"></span>' + type.size + ' m²</span>' +
          '<span><span data-icon="bed"></span>' + U.esc(type.beds) + '</span>' +
        '</div>' +
        '<p class="small muted">' + U.esc(U.truncate(type.blurb || '', 120)) + '</p>' +
        '<div class="row">' +
          '<div><span class="price">' + Parts.money(from) + '</span> <small class="muted">per night</small></div>' +
          '<span class="spacer"></span>' +
          '<span class="textlink">View<span data-icon="arrow-right"></span></span>' +
        '</div>' +
      '</div>' +
    '</article>';
  };

  function D_rateFrom(type) {
    const s = Site.search;
    return Domain.quote(type.id, s.checkIn, s.checkOut) || type.basePrice;
  }

  /* ---------------- generic offering card ---------------- */

  Parts.offerCard = function (o) {
    return '<article class="card card--hover" ' + (o.attr || '') + '>' +
      '<div class="card__media' + (o.wide ? ' card__media--wide' : '') + '">' +
        Art.scene(o.art, { scrim: 0.2, alt: o.title }) +
        (o.badge ? '<span class="card__badge ' + (o.badgeClass || '') + '">' + U.esc(o.badge) + '</span>' : '') +
      '</div>' +
      '<div class="card__body">' +
        (o.eyebrow ? '<span class="eyebrow">' + U.esc(o.eyebrow) + '</span>' : '') +
        '<h3 class="h3">' + U.esc(o.title) + '</h3>' +
        (o.meta ? '<div class="card__meta">' + o.meta + '</div>' : '') +
        (o.text ? '<p class="small muted">' + U.esc(o.text) + '</p>' : '') +
        '<div class="row">' +
          (o.price !== undefined
            ? '<div><span class="price">' + Parts.money(o.price) + '</span>' +
              (o.priceNote ? ' <small class="muted">' + U.esc(o.priceNote) + '</small>' : '') + '</div>'
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
          '<span>© ' + new Date().getFullYear() + ' ' + U.esc(h.name) + '. Every rate shown includes VAT.</span>' +
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
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    nodes.forEach((n, i) => {
      n.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
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
      '<span data-icon="' + (o.icon || 'info') + '" style="font-size:1.9rem;color:var(--sand-400)"></span>' +
      '<h3 class="h3">' + U.esc(o.title) + '</h3>' +
      (o.text ? '<p>' + U.esc(o.text) + '</p>' : '') +
      (o.action || '') +
    '</div>';
  };

  global.Parts = Parts;
})(window);
