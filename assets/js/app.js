/* ============================================================
   HostOps — boot, router and shell wiring
   ============================================================ */
(function (global) {
  'use strict';

  const Views = global.Views || (global.Views = {});
  const App = {};
  let current = null;
  let currentRoute = null;

  /* ---------------- theme ---------------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.setAttribute('data-icon', theme === 'dark' ? 'sun' : 'moon');
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      Icons.render(btn.parentElement);
    }
  }

  function initTheme() {
    const saved = Store.state.prefs.theme;
    const theme = saved || (global.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);

    document.getElementById('themeToggle').addEventListener('click', function () {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      Store.update('theme', s => { s.prefs.theme = next; });
    });

    if (global.matchMedia) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!Store.state.prefs.theme) applyTheme(e.matches ? 'dark' : 'light');
      });
    }
  }

  /* ---------------- routing ---------------- */

  function parseHash() {
    const raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const params = {};
    (qs || '').split('&').forEach(pair => {
      if (!pair) return;
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { name: path || 'dashboard', params: params };
  }

  App.go = function (hash) { location.hash = hash; };

  App.render = function (opts) {
    const o = opts || {};
    const route = parseHash();
    const view = Views[route.name] || Views.dashboard;
    const host = document.getElementById('view');

    const routeChanged = currentRoute !== route.name;
    currentRoute = route.name;
    current = { view: view, route: route };

    // let the outgoing view detach observers/timers
    if (o.soft !== true && host._teardown) { try { host._teardown(); } catch (e) { /* noop */ } }
    if (o.soft === true && host._teardown) { try { host._teardown(); } catch (e) { /* noop */ } }
    host._teardown = null;

    Charts.hideTip();

    document.getElementById('pageTitle').textContent =
      typeof view.title === 'function' ? view.title(route.params) : (view.title || 'HostOps');
    document.getElementById('pageSub').textContent =
      typeof view.subtitle === 'function' ? view.subtitle(route.params) : (view.subtitle || '');

    host.innerHTML = '';
    try {
      view.render(host, route.params);
    } catch (e) {
      console.error('[HostOps] view failed to render', e);
      host.innerHTML = UI.empty({
        icon: 'alert',
        title: 'This screen could not be drawn',
        message: e && e.message ? e.message : 'Unexpected error.'
      });
    }
    Icons.render(host);

    if (routeChanged) {
      host.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    markActiveNav(route.name);
    Store.state.prefs.lastRoute = location.hash;
    closeSidebar();
  };

  function markActiveNav(name) {
    U.$$('.nav__item').forEach(a => {
      const target = a.getAttribute('href').replace(/^#\/?/, '').split('?')[0];
      a.classList.toggle('is-active', target === name);
    });
  }

  /* ---------------- sidebar badges ---------------- */

  function refreshBadges() {
    const today = U.today();
    const arrivals = Domain.arrivals(today).filter(b => b.status === 'confirmed').length;
    const departures = Domain.departures(today).filter(b => b.status === 'in_house').length;
    const hkOpen = Store.state.hkTasks.filter(t => t.date === today && t.status !== 'done').length;
    const rsOpen = Store.state.orders.filter(o => o.status === 'new' || o.status === 'preparing').length;
    const mbRooms = Store.state.rooms.filter(r => Domain.minibarNeedsRestock(r.id)).length;
    const parity = Domain.parityIssues().length;

    setBadge('navFrontdesk', arrivals + departures, arrivals + departures > 0);
    setBadge('navHousekeeping', hkOpen, hkOpen > 6);
    setBadge('navRoomservice', rsOpen, rsOpen > 0);
    setBadge('navMinibar', mbRooms, false);
    setBadge('navChannels', parity, false);

    const svcToday =
      (Store.state.diningReservations || []).filter(r => r.date === today && r.status !== 'cancelled').length +
      (Store.state.spaBookings || []).filter(r => r.date === today && r.status !== 'cancelled').length +
      (Store.state.experienceBookings || []).filter(r => r.date === today && r.status !== 'cancelled').length;
    setBadge('navServices', svcToday, false);
    setBadge('navCalendar', '', false);

    document.getElementById('businessDate').textContent = U.fmtDateLong(today);
    document.getElementById('brandProperty').textContent = Store.state.hotel.name;
    refreshSyncBox();
  }

  function setBadge(id, value, hot) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ? String(value) : '';
    el.classList.toggle('is-hot', !!hot);
  }

  function refreshSyncBox() {
    const dot = document.getElementById('syncDot');
    const meta = document.getElementById('syncMeta');
    const connected = Store.state.channels.filter(c => c.connected);
    if (!connected.length) {
      dot.className = 'syncdot';
      meta.textContent = 'No channels connected';
      return;
    }
    const errored = connected.some(c => c.health === 'error');
    dot.className = 'syncdot ' + (errored ? 'is-error' : 'is-live');
    const latest = connected.map(c => c.lastSync).filter(Boolean).sort().pop();
    meta.textContent = connected.length + ' connected · ' + (latest ? U.ago(latest) : 'never synced');
  }

  /* ---------------- global search ---------------- */

  function initSearch() {
    const input = document.getElementById('globalSearch');
    const panel = document.getElementById('searchResults');
    if (!input) return;

    const run = U.debounce(function () {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { panel.hidden = true; panel.innerHTML = ''; return; }

      const out = [];

      Store.state.rooms.forEach(r => {
        if (out.length > 40) return;
        if (r.number.indexOf(q) === 0) {
          const t = Store.roomType(r.typeId);
          out.push({ group: 'Rooms', label: 'Room ' + r.number, meta: t ? t.name : '', href: '#/rooms?id=' + r.id });
        }
      });

      Store.state.guests.forEach(g => {
        if (out.length > 40) return;
        const name = (g.firstName + ' ' + g.lastName).toLowerCase();
        if (name.indexOf(q) > -1 || (g.email || '').toLowerCase().indexOf(q) > -1) {
          out.push({ group: 'Guests', label: g.firstName + ' ' + g.lastName, meta: g.country, href: '#/guests?id=' + g.id });
        }
      });

      Store.state.bookings.forEach(b => {
        if (out.length > 40) return;
        const ref = (b.ref || '').toLowerCase();
        const cref = (b.channelRef || '').toLowerCase();
        if (ref.indexOf(q) > -1 || cref.indexOf(q) > -1) {
          out.push({
            group: 'Reservations', label: b.ref + ' · ' + Store.guestName(b.guestId),
            meta: U.fmtDate(b.checkIn), href: '#/bookings?id=' + b.id
          });
        }
      });

      if (!out.length) {
        panel.innerHTML = '<div class="empty" style="padding:24px 12px"><p>No matches for “' + U.esc(input.value.trim()) + '”</p></div>';
        panel.hidden = false;
        return;
      }

      const groups = U.groupBy(out.slice(0, 18), x => x.group);
      let html = '';
      groups.forEach((rows, name) => {
        html += '<p class="sr-group">' + U.esc(name) + '</p>';
        rows.forEach(r => {
          html += '<div class="sr-item" data-href="' + U.esc(r.href) + '"><strong>' + U.esc(r.label) +
            '</strong><span>' + U.esc(r.meta || '') + '</span></div>';
        });
      });
      panel.innerHTML = html;
      panel.hidden = false;
    }, 140);

    input.addEventListener('input', run);
    input.addEventListener('focus', run);

    U.on(panel, 'click', '.sr-item', function (e, el) {
      location.hash = el.dataset.href;
      panel.hidden = true;
      input.value = '';
      input.blur();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.searchbox')) panel.hidden = true;
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { panel.hidden = true; input.blur(); }
      if (e.key === 'Enter') {
        const first = panel.querySelector('.sr-item');
        if (first && !panel.hidden) first.click();
      }
    });

    // "/" focuses search from anywhere
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* ---------------- sidebar (mobile) ---------------- */

  /** True only while the sidebar is an overlay drawer rather than a fixed column. */
  function sidebarIsDrawer() {
    return global.matchMedia && matchMedia('(max-width: 1024px)').matches;
  }

  function openSidebar() {
    // Never show the scrim when the sidebar is already a permanent column —
    // that would dim the screen with nothing to reveal behind it.
    if (!sidebarIsDrawer()) return;
    document.getElementById('sidebar').classList.add('is-open');
    document.getElementById('sidebarScrim').hidden = false;
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('sidebarScrim').hidden = true;
  }

  /* ---------------- auto sync ---------------- */

  let syncTimer = null;

  function runSync(manual) {
    const connected = Store.state.channels.filter(c => c.connected);
    if (!connected.length) {
      if (manual) UI.toast('No channels connected', 'Connect Booking.com or Airbnb in the Channel Manager.', 'warn');
      return;
    }
    const dot = document.getElementById('syncDot');
    dot.className = 'syncdot is-busy';
    document.getElementById('syncMeta').textContent = 'Syncing…';

    // a short delay so the state change is legible, like a real round-trip
    setTimeout(function () {
      let pulled = 0, cancelled = 0, modified = 0;
      Store.update('sync', function () {
        Domain.syncAll().forEach(r => {
          pulled += r.pulled || 0;
          cancelled += r.cancelled || 0;
          modified += r.modified || 0;
        });
      });

      if (manual || pulled || cancelled || modified) {
        const bits = [];
        if (pulled) bits.push(pulled + ' new');
        if (modified) bits.push(modified + ' modified');
        if (cancelled) bits.push(cancelled + ' cancelled');
        UI.toast(
          bits.length ? 'Sync complete' : 'Everything up to date',
          bits.length ? bits.join(' · ') + ' reservation' + (pulled + modified + cancelled === 1 ? '' : 's') : 'No changes from connected channels.',
          bits.length ? 'ok' : 'info'
        );
      }
    }, manual ? 700 : 300);
  }

  function scheduleAutoSync() {
    if (syncTimer) clearInterval(syncTimer);
    const on = Store.state.channels.some(c => c.connected && c.autoSync);
    if (!on) return;
    // demo cadence: every 90s rather than the configured minutes
    syncTimer = setInterval(() => runSync(false), 90000);
  }
  App.scheduleAutoSync = scheduleAutoSync;
  App.runSync = runSync;

  /* ---------------- boot ---------------- */

  function boot() {
    Store.init();
    initTheme();
    Icons.render(document);
    initSearch();

    document.getElementById('sidebarOpen').addEventListener('click', openSidebar);
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
    document.getElementById('sidebarScrim').addEventListener('click', closeSidebar);

    document.getElementById('quickBook').addEventListener('click', function () {
      Views.bookings.openEditor(null);
    });

    document.getElementById('syncNow').addEventListener('click', () => runSync(true));

    window.addEventListener('hashchange', () => App.render());

    // widening past the breakpoint turns the drawer back into a column —
    // drop the overlay state so no scrim is left stranded over the page
    if (global.matchMedia) {
      matchMedia('(max-width: 1024px)').addEventListener('change', e => {
        if (!e.matches) closeSidebar();
      });
    }

    // re-render on data change, but never fight an open dialog
    const rerender = U.debounce(function () {
      refreshBadges();
      if (document.getElementById('modalRoot').children.length) return;
      App.render({ soft: true });
    }, 60);

    Store.subscribe(function (reason) {
      if (reason === 'quiet') return;
      rerender();
    });

    if (!location.hash) location.hash = Store.state.prefs.lastRoute || '#/dashboard';

    refreshBadges();
    App.render();
    scheduleAutoSync();

    // keep relative timestamps honest
    setInterval(refreshSyncBox, 30000);

    console.info('%cHostOps', 'color:#F0603F;font-weight:700', 'ready ·',
      Store.state.rooms.length, 'rooms ·', Store.state.bookings.length, 'reservations');
  }

  App.refreshBadges = refreshBadges;
  global.App = App;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
