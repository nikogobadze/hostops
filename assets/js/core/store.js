/* ============================================================
   HostOps — state store
   Single source of truth, persisted to localStorage, with a
   tiny pub/sub so views re-render when data changes.
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'hostops:v2';
  const listeners = new Set();

  const Store = {
    state: null,
    ready: false,
    persistError: null
  };

  /* ---------------- persistence ---------------- */

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.rooms) return null;
      return parsed;
    } catch (e) {
      console.warn('[HostOps] Could not read saved data — starting fresh.', e);
      return null;
    }
  }

  const persist = U.debounce(function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(Store.state));
      if (Store.persistError) {
        Store.persistError = null;
      }
    } catch (e) {
      // quota, private mode, or file:// restrictions — keep running in memory
      Store.persistError = e;
      console.warn('[HostOps] Data could not be saved to this browser.', e);
      if (global.UI && !persist._warned) {
        persist._warned = true;
        UI.toast('Working in memory only', 'This browser blocked local storage, so changes will be lost when the tab closes.', 'warn');
      }
    }
  }, 120);

  Store.saveNow = function () {
    persist();
  };

  /* ---------------- lifecycle ---------------- */

  Store.init = function () {
    const saved = read();
    if (saved) {
      Store.state = migrate(saved);
      // A saved dataset ages: refresh derived "today" state so the demo
      // never opens with a stale board.
      rollForward(Store.state);
    } else {
      Store.state = Seed.generate();
    }
    Store.ready = true;
    persist();
    return Store.state;
  };

  Store.reset = function () {
    Store.state = Seed.generate();
    persist();
    emit('reset');
  };

  Store.exportJSON = function () {
    return JSON.stringify(Store.state, null, 2);
  };

  Store.importJSON = function (text) {
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.rooms || !parsed.bookings) {
      throw new Error('This file does not look like a HostOps backup.');
    }
    Store.state = migrate(parsed);
    persist();
    emit('import');
  };

  function migrate(s) {
    s.version = s.version || 1;
    s.prefs = s.prefs || { theme: null, calendarDays: 21, lastRoute: '#/dashboard' };
    s.activity = s.activity || [];
    s.syncLog = s.syncLog || [];
    s.folios = s.folios || [];
    s.minibarStock = s.minibarStock || {};
    s.minibarPostings = s.minibarPostings || [];
    s.orders = s.orders || [];
    s.hkTasks = s.hkTasks || [];

    // Catalogue content added after the first release. It is authored in
    // code rather than edited in the app, so a saved state simply adopts
    // whatever the current build ships.
    if (global.Offerings) {
      if (!s.restaurants || !s.restaurants.length) s.restaurants = Offerings.restaurants();
      if (!s.spa || !s.spa.treatments) s.spa = Offerings.spa();
      if (!s.experiences || !s.experiences.length) s.experiences = Offerings.experiences();
      if (!s.amenities || !s.amenities.length) s.amenities = Offerings.amenities();
      if (!s.siteContent || !s.siteContent.hero) s.siteContent = Offerings.siteContent();

      // guest-facing room copy may post-date a saved state
      const copy = Offerings.roomCopy();
      (s.roomTypes || []).forEach(t => {
        const c = copy[t.code];
        if (c && !t.blurb) {
          t.art = c.art; t.view = c.view; t.blurb = c.blurb; t.highlights = c.highlights;
        }
      });
    }

    s.diningReservations = s.diningReservations || [];
    s.spaBookings = s.spaBookings || [];
    s.experienceBookings = s.experienceBookings || [];

    return s;
  }

  /**
   * Advance booking statuses to match the real calendar date. Keeps a
   * dataset saved days ago consistent (arrivals become due, stays that
   * ended without a checkout are auto-closed).
   */
  function rollForward(s) {
    const today = U.today();
    let changed = 0;
    s.bookings.forEach(b => {
      if (b.status === 'cancelled' || b.status === 'no_show') return;
      if (b.status === 'confirmed' && b.checkOut <= today) {
        // never arrived and the window has passed
        b.status = 'no_show';
        changed++;
      } else if (b.status === 'in_house' && b.checkOut < today) {
        // strictly before today — a guest whose departure day *is* today is
        // still in house until the front desk checks them out
        b.status = 'checked_out';
        b.checkedOutAt = b.checkedOutAt || U.parse(b.checkOut).toISOString();
        changed++;
      }
    });
    if (changed) persist();
  }

  /* ---------------- pub/sub ---------------- */

  Store.subscribe = function (fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  function emit(reason) {
    listeners.forEach(fn => {
      try { fn(reason); } catch (e) { console.error('[HostOps] listener failed', e); }
    });
  }
  Store.emit = emit;

  /**
   * The only sanctioned way to change data:
   *   Store.update('booking:create', s => { s.bookings.push(...) })
   */
  Store.update = function (reason, mutator) {
    const result = mutator(Store.state);
    persist();
    emit(reason);
    return result;
  };

  /** Mutate + persist without re-rendering (for high-frequency updates). */
  Store.updateQuiet = function (mutator) {
    const result = mutator(Store.state);
    persist();
    return result;
  };

  /* ---------------- activity feed ---------------- */

  Store.log = function (text, icon, link, type) {
    Store.state.activity.unshift({
      id: U.uid('act'),
      ts: new Date().toISOString(),
      type: type || 'system',
      icon: icon || 'activity',
      text: text,
      link: link || null
    });
    if (Store.state.activity.length > 120) Store.state.activity.length = 120;
  };

  Store.logSync = function (channel, level, message, direction) {
    Store.state.syncLog.unshift({
      id: U.uid('log'),
      ts: new Date().toISOString(),
      channel: channel,
      level: level,
      message: message,
      direction: direction || 'out'
    });
    if (Store.state.syncLog.length > 200) Store.state.syncLog.length = 200;
  };

  /* ---------------- lookups ---------------- */

  Store.room = id => Store.state.rooms.find(r => r.id === id) || null;
  Store.roomByNumber = no => Store.state.rooms.find(r => r.number === String(no)) || null;
  Store.roomType = id => Store.state.roomTypes.find(t => t.id === id) || null;
  Store.guest = id => Store.state.guests.find(g => g.id === id) || null;
  Store.booking = id => Store.state.bookings.find(b => b.id === id) || null;
  Store.menuItem = id => Store.state.menu.find(m => m.id === id) || null;
  Store.minibarItem = id => Store.state.minibarItems.find(m => m.id === id) || null;
  Store.channel = id => Store.state.channels.find(c => c.id === id) || null;
  Store.order = id => Store.state.orders.find(o => o.id === id) || null;

  Store.folioFor = function (bookingId) {
    return Store.state.folios.find(f => f.bookingId === bookingId) || null;
  };

  Store.folioForOrCreate = function (bookingId) {
    let f = Store.folioFor(bookingId);
    if (!f) {
      f = { id: U.uid('fol'), bookingId: bookingId, items: [], closed: false, closedAt: null };
      Store.state.folios.push(f);
    }
    return f;
  };

  Store.guestName = function (id) {
    const g = Store.guest(id);
    return g ? g.firstName + ' ' + g.lastName : 'Unknown guest';
  };

  global.Store = Store;
})(window);
