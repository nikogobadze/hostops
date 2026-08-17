/* ============================================================
   Casa Marea — public site shell and router
   ============================================================ */
(function (global) {
  'use strict';

  const Pages = global.Pages || (global.Pages = {});
  const Site = {};
  const SEARCH_KEY = 'casamarea:search';

  /* ============================================================
     Search state — one set of dates carried across the whole site
     ============================================================ */

  Site.search = { checkIn: null, checkOut: null, guests: 2 };

  function loadSearch() {
    const today = U.today();
    let s = null;
    try { s = JSON.parse(sessionStorage.getItem(SEARCH_KEY) || 'null'); } catch (e) { /* ignore */ }

    // default to a Friday-to-Sunday two nights, a fortnight out
    const fallback = {
      checkIn: U.addDays(today, 14),
      checkOut: U.addDays(today, 16),
      guests: 2
    };
    s = s || fallback;

    // never let a stale session offer dates in the past
    if (!s.checkIn || s.checkIn < today) {
      const nights = s.checkIn && s.checkOut ? Math.max(1, U.nights(s.checkIn, s.checkOut)) : 2;
      s.checkIn = today;
      s.checkOut = U.addDays(today, nights);
    }
    if (!s.checkOut || s.checkOut <= s.checkIn) s.checkOut = U.addDays(s.checkIn, 1);
    s.guests = U.clamp(Number(s.guests) || 2, 1, 6);

    Site.search = s;
  }

  Site.setSearch = function (patch) {
    Object.assign(Site.search, patch);
    if (Site.search.checkOut <= Site.search.checkIn) {
      Site.search.checkOut = U.addDays(Site.search.checkIn, 1);
    }
    try { sessionStorage.setItem(SEARCH_KEY, JSON.stringify(Site.search)); } catch (e) { /* ignore */ }
  };

  Site.nights = function () {
    return Math.max(1, U.nights(Site.search.checkIn, Site.search.checkOut));
  };

  /* ============================================================
     Basket — what the guest is about to book
     ============================================================ */

  Site.basket = {
    typeId: null,
    breakfast: false,
    transfer: false,
    parking: false,
    services: []        // { kind, id, date, time, people, price, label }
  };

  Site.resetBasket = function () {
    Site.basket = { typeId: null, breakfast: false, transfer: false, parking: false, services: [] };
  };

  Site.addService = function (svc) {
    Site.basket.services.push(svc);
  };

  /* ============================================================
     Routing
     ============================================================ */

  const ROUTES = ['home', 'rooms', 'dining', 'spa', 'experiences', 'hotel', 'contact', 'checkout', 'booking', 'confirmation'];

  function parseHash() {
    const raw = (location.hash || '#/').replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const params = {};
    (qs || '').split('&').forEach(pair => {
      if (!pair) return;
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    const name = path || 'home';
    return { name: ROUTES.indexOf(name) > -1 ? name : 'home', params: params };
  }

  Site.go = function (hash, opts) {
    const o = opts || {};
    if (location.hash === hash) { render(); return; }
    if (o.replace) history.replaceState(null, '', hash);
    else location.hash = hash;
  };

  let currentRoute = null;

  function render() {
    const route = parseHash();
    const page = Pages[route.name] || Pages.home;
    const host = document.getElementById('view');
    const changed = currentRoute !== route.name;
    currentRoute = route.name;

    document.title = (page.title ? page.title(route.params) + ' · ' : '') + 'Casa Marea';

    host.innerHTML = '';
    try {
      page.render(host, route.params);
    } catch (e) {
      console.error('[Casa Marea] page failed', e);
      host.innerHTML = '<div class="section"><div class="wrap">' +
        Parts.empty({ icon: 'alert', title: 'Something went wrong on this page', text: e.message }) +
        '</div></div>';
    }

    document.getElementById('footerSlot').innerHTML = Parts.footer();
    Icons.render(document);
    Parts.revealAll(host);
    markNav(route.name);
    updateTopbar();

    if (changed) window.scrollTo({ top: 0, behavior: 'auto' });
    closeMobileNav();
  }

  Site.render = render;

  function markNav(name) {
    U.$$('.mainnav a').forEach(a => {
      const t = a.getAttribute('href').replace(/^#\/?/, '').split('?')[0];
      a.classList.toggle('is-active', t === name);
    });
  }

  /* ============================================================
     Top bar behaviour
     ============================================================ */

  function updateTopbar() {
    const bar = document.getElementById('topbar');
    const hero = document.querySelector('[data-hero]');
    const y = window.scrollY;

    bar.classList.toggle('is-stuck', y > 8);

    // the bar sits transparently over a hero until you scroll past it
    if (hero) {
      const overlap = hero.getBoundingClientRect().bottom > 90;
      bar.classList.toggle('is-over-hero', overlap);
    } else {
      bar.classList.remove('is-over-hero');
    }
  }

  /* ============================================================
     Mobile nav
     ============================================================ */

  function openMobileNav() {
    document.getElementById('mobilenav').classList.add('is-open');
    document.getElementById('navToggle').setAttribute('aria-expanded', 'true');
    document.getElementById('navToggle').setAttribute('data-icon', 'x');
    document.body.style.overflow = 'hidden';
    Icons.render(document.getElementById('navToggle').parentElement);
  }

  function closeMobileNav() {
    const nav = document.getElementById('mobilenav');
    if (!nav) return;
    nav.classList.remove('is-open');
    const t = document.getElementById('navToggle');
    t.setAttribute('aria-expanded', 'false');
    t.setAttribute('data-icon', 'menu');
    document.body.style.overflow = '';
    Icons.render(t.parentElement);
  }

  /* ============================================================
     Boot
     ============================================================ */

  function boot() {
    Store.init();
    loadSearch();

    Icons.render(document);

    document.getElementById('navToggle').addEventListener('click', function () {
      const open = document.getElementById('mobilenav').classList.contains('is-open');
      if (open) closeMobileNav(); else openMobileNav();
    });

    U.on(document.getElementById('mobilenav'), 'click', 'a', closeMobileNav);

    window.addEventListener('hashchange', render);
    window.addEventListener('scroll', updateTopbar, { passive: true });
    window.addEventListener('resize', U.debounce(updateTopbar, 120));

    // a booking made in the admin panel in another tab should show up here
    window.addEventListener('storage', function (e) {
      if (e.key === 'hostops:v1') {
        try { Store.init(); render(); } catch (err) { /* ignore */ }
      }
    });

    if (!location.hash) location.hash = '#/';
    render();

    console.info('%cCasa Marea', 'color:#E7623F;font-weight:700;font-size:13px',
      '· public site ready ·', Store.state.rooms.length, 'rooms ·',
      Store.state.restaurants.length, 'restaurants ·',
      Store.state.experiences.length, 'experiences');
  }

  global.Site = Site;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
