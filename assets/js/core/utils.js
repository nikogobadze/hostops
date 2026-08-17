/* ============================================================
   HostOps — utilities
   Dates are handled as plain 'YYYY-MM-DD' strings throughout so
   nothing ever drifts across a timezone or a DST boundary.
   ============================================================ */
(function (global) {
  'use strict';

  const U = {};

  /* ---------------- ids & text ---------------- */

  let _seq = 0;
  U.uid = function (prefix) {
    _seq += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + _seq.toString(36) +
      Math.random().toString(36).slice(2, 6);
  };

  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.initials = function (first, last) {
    const a = (first || '').trim(), b = (last || '').trim();
    return ((a[0] || '') + (b[0] || '')).toUpperCase() || '??';
  };

  U.titleCase = function (s) {
    return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  U.truncate = function (s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  };

  U.slug = function (s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  /* ---------------- numbers & money ---------------- */

  U.clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  U.sum = (arr, fn) => arr.reduce((t, x, i) => t + (fn ? fn(x, i) : x), 0);
  U.round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  const CURRENCY_SYMBOL = {
    GEL: '₾', EUR: '€', USD: '$', GBP: '£',
    CHF: 'CHF ', SEK: 'kr ', PLN: 'zł ', TRY: '₺', AMD: '֏', AZN: '₼'
  };

  U.currencySymbol = code => CURRENCY_SYMBOL[code] || (code ? code + ' ' : '');

  /** Money for display. `cur` falls back to the store's configured currency. */
  U.money = function (n, cur, opts) {
    const o = opts || {};
    const code = cur || (global.Store && Store.state && Store.state.hotel.currency) || 'EUR';
    const sym = U.currencySymbol(code);
    const v = Number(n) || 0;
    const body = Math.abs(v).toLocaleString('en-GB', {
      minimumFractionDigits: o.decimals === 0 ? 0 : 2,
      maximumFractionDigits: o.decimals === 0 ? 0 : 2
    });
    return (v < 0 ? '−' : '') + sym + body;
  };

  /** Compact money for stat tiles: €4.2K / €1.1M */
  U.moneyCompact = function (n, cur) {
    const code = cur || (global.Store && Store.state && Store.state.hotel.currency) || 'EUR';
    const sym = U.currencySymbol(code);
    const v = Math.abs(Number(n) || 0);
    const sign = (Number(n) || 0) < 0 ? '−' : '';
    if (v >= 1e6) return sign + sym + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (v >= 1e4) return sign + sym + (v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return sign + sym + v.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  };

  U.num = function (n, dp) {
    return (Number(n) || 0).toLocaleString('en-GB', {
      minimumFractionDigits: dp || 0, maximumFractionDigits: dp === undefined ? 0 : dp
    });
  };

  U.pct = (n, dp) => (Number(n) || 0).toFixed(dp === undefined ? 0 : dp) + '%';

  /* ---------------- dates ('YYYY-MM-DD') ---------------- */

  const MS_DAY = 86400000;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  U.MONTHS = MONTHS;
  U.DAYS = DAYS;

  /** Local calendar date of a JS Date (or now) as YYYY-MM-DD. */
  U.today = function (d) {
    const dt = d ? new Date(d) : new Date();
    return U.iso(dt);
  };

  U.iso = function (dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /** Parse 'YYYY-MM-DD' into a *local* midnight Date (never UTC — avoids off-by-one). */
  U.parse = function (s) {
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const p = String(s || '').slice(0, 10).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  };

  U.addDays = function (s, n) {
    const d = U.parse(s);
    d.setDate(d.getDate() + n);
    return U.iso(d);
  };

  U.addMonths = function (s, n) {
    const d = U.parse(s);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    d.setDate(Math.min(day, U.daysInMonth(d.getFullYear(), d.getMonth())));
    return U.iso(d);
  };

  U.daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  /** Whole nights between two dates (b − a). */
  U.nights = function (a, b) {
    return Math.round((U.parse(b) - U.parse(a)) / MS_DAY);
  };

  U.cmp = function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };

  U.isBefore = (a, b) => a < b;
  U.isAfter = (a, b) => a > b;
  U.isSame = (a, b) => a === b;

  /** [from, to) — the half-open interval a stay occupies. */
  U.range = function (from, to) {
    const out = [];
    let d = from;
    let guard = 0;
    while (d < to && guard++ < 4000) { out.push(d); d = U.addDays(d, 1); }
    return out;
  };

  U.overlaps = function (aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;   // half-open: checkout day is free
  };

  U.isWeekend = function (s) {
    const w = U.parse(s).getDay();
    return w === 0 || w === 6;
  };

  U.dow = s => DAYS[U.parse(s).getDay()];
  U.dowShort = s => DAYS[U.parse(s).getDay()].slice(0, 3);
  U.monthName = s => MONTHS[U.parse(s).getMonth()];

  /** 'Mon 12 Aug' */
  U.fmtDate = function (s) {
    if (!s) return '—';
    const d = U.parse(s);
    return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  };

  /** '12 Aug 2026' */
  U.fmtDateLong = function (s) {
    if (!s) return '—';
    const d = U.parse(s);
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  };

  /** '12 Aug, 14:35' from an ISO timestamp */
  U.fmtDateTime = function (ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}, ${U.fmtTime(ts)}`;
  };

  U.fmtTime = function (ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  /** '3 min ago' / 'just now' / '2 days ago' */
  U.ago = function (ts) {
    if (!ts) return 'never';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 45000) return 'just now';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    const days = Math.round(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return U.fmtDateLong(U.today(new Date(ts)));
  };

  /** Human label for a stay: 'Mon 12 → Thu 15 Aug · 3 nights' */
  U.stayLabel = function (from, to) {
    return `${U.fmtDate(from)} → ${U.fmtDate(to)} · ${U.nights(from, to)}n`;
  };

  /* ---------------- collections ---------------- */

  U.by = function (key) {
    return (a, b) => U.cmp(a[key], b[key]);
  };

  U.byDesc = function (key) {
    return (a, b) => U.cmp(b[key], a[key]);
  };

  U.groupBy = function (arr, fn) {
    const out = new Map();
    arr.forEach(x => {
      const k = fn(x);
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(x);
    });
    return out;
  };

  U.indexBy = function (arr, key) {
    const m = new Map();
    arr.forEach(x => m.set(x[key], x));
    return m;
  };

  U.unique = arr => Array.from(new Set(arr));

  /* ---------------- DOM ---------------- */

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /** Delegated listener: U.on(root, 'click', '[data-act]', handler) */
  U.on = function (root, type, sel, handler) {
    root.addEventListener(type, function (e) {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) handler.call(t, e, t);
    });
  };

  U.html = function (strings) {
    // tagged template that escapes interpolations unless wrapped in U.raw()
    let out = strings[0];
    for (let i = 1; i < arguments.length; i++) {
      const v = arguments[i];
      out += (v && v.__raw ? v.value : U.esc(v)) + strings[i];
    }
    return out;
  };

  U.raw = v => ({ __raw: true, value: v === null || v === undefined ? '' : String(v) });

  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(self, args), ms || 200);
    };
  };

  U.download = function (filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };

  U.toCSV = function (rows) {
    return rows.map(r => r.map(c => {
      const s = c === null || c === undefined ? '' : String(c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
  };

  /* ---------------- deterministic pseudo-random (seeded demo data) ---------------- */

  U.rng = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  };

  U.pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
  U.pickInt = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  global.U = U;
})(window);
