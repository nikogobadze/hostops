/* ============================================================
   HostOps — UI primitives: modals, toasts, confirms, chrome bits
   ============================================================ */
(function (global) {
  'use strict';

  const UI = {};
  const root = () => document.getElementById('modalRoot');

  /* ---------------- toasts ---------------- */

  const TOAST_ICON = { ok: 'check-circle', warn: 'alert', error: 'x-circle', info: 'info' };

  UI.toast = function (title, message, tone, ms) {
    const host = document.getElementById('toaster');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'toast' + (tone ? ' toast--' + tone : '');
    t.innerHTML =
      '<span data-icon="' + (TOAST_ICON[tone] || 'info') + '"></span>' +
      '<div><strong>' + U.esc(title) + '</strong>' +
      (message ? '<p>' + U.esc(message) + '</p>' : '') + '</div>';
    host.appendChild(t);
    Icons.render(t);

    const life = ms || (tone === 'error' ? 6500 : 4000);
    const kill = () => {
      t.classList.add('is-out');
      setTimeout(() => t.remove(), 220);
    };
    const timer = setTimeout(kill, life);
    t.addEventListener('click', () => { clearTimeout(timer); kill(); });
    return kill;
  };

  /* ---------------- modal ---------------- */

  let openModals = 0;

  /**
   * UI.modal({ title, subtitle, size:'sm|md|lg|xl', body, footer,
   *            onMount(bodyEl, api), closeOnBackdrop })
   * Returns { close, el }.
   */
  UI.modal = function (opts) {
    const o = opts || {};
    const scrim = document.createElement('div');
    scrim.className = 'modal-scrim';

    const sizeCls = o.size && o.size !== 'md' ? ' modal--' + o.size : '';
    scrim.innerHTML =
      '<div class="modal' + sizeCls + '" role="dialog" aria-modal="true" aria-label="' + U.esc(o.title || 'Dialog') + '">' +
        (o.title === null ? '' :
          '<div class="modal__head">' +
            '<div><h2>' + U.esc(o.title || '') + '</h2>' +
            (o.subtitle ? '<p>' + U.esc(o.subtitle) + '</p>' : '') + '</div>' +
            '<button class="iconbtn iconbtn--bare" data-close aria-label="Close" data-icon="x"></button>' +
          '</div>') +
        '<div class="modal__body' + (o.flush ? ' modal__body--flush' : '') + '" data-modal-body>' + (o.body || '') + '</div>' +
        (o.footer ? '<div class="modal__foot">' + o.footer + '</div>' : '') +
      '</div>';

    root().appendChild(scrim);
    Icons.render(scrim);
    openModals++;
    document.body.style.overflow = 'hidden';

    const api = {
      el: scrim,
      body: scrim.querySelector('[data-modal-body]'),
      close: function () {
        if (!scrim.isConnected) return;
        scrim.remove();
        openModals = Math.max(0, openModals - 1);
        if (!openModals) document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        if (typeof o.onClose === 'function') o.onClose();
      }
    };

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); }
    }
    document.addEventListener('keydown', onKey);

    scrim.addEventListener('click', function (e) {
      if (e.target === scrim && o.closeOnBackdrop !== false) api.close();
      if (e.target.closest('[data-close]')) api.close();
    });

    if (typeof o.onMount === 'function') o.onMount(api.body, api);

    // focus the first meaningful control
    const first = scrim.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button.btn--primary');
    if (first) setTimeout(() => first.focus(), 40);

    return api;
  };

  /** Promise-based confirm. Resolves true/false. */
  UI.confirm = function (opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      let settled = false;
      const done = v => { if (!settled) { settled = true; resolve(v); } };

      const m = UI.modal({
        title: o.title || 'Are you sure?',
        size: 'sm',
        body: '<p style="font-size:13.5px;color:var(--text-2);line-height:1.55">' + U.esc(o.message || '') + '</p>',
        footer:
          '<span class="spacer"></span>' +
          '<button class="btn" data-no>' + U.esc(o.cancelLabel || 'Cancel') + '</button>' +
          '<button class="btn ' + (o.tone === 'danger' ? 'btn--danger' : 'btn--primary') + '" data-yes>' +
          U.esc(o.confirmLabel || 'Confirm') + '</button>',
        onClose: () => done(false)
      });

      m.el.querySelector('[data-yes]').addEventListener('click', () => { done(true); m.close(); });
      m.el.querySelector('[data-no]').addEventListener('click', () => { done(false); m.close(); });
    });
  };

  /** Small prompt for a single line of text. Resolves string | null. */
  UI.prompt = function (opts) {
    const o = opts || {};
    return new Promise(function (resolve) {
      let settled = false;
      const done = v => { if (!settled) { settled = true; resolve(v); } };

      const m = UI.modal({
        title: o.title || 'Enter a value',
        size: 'sm',
        body: '<div class="field"><label for="promptInput">' + U.esc(o.label || '') + '</label>' +
          (o.multiline
            ? '<textarea class="textarea" id="promptInput">' + U.esc(o.value || '') + '</textarea>'
            : '<input class="input" id="promptInput" value="' + U.esc(o.value || '') + '" placeholder="' + U.esc(o.placeholder || '') + '">') +
          (o.hint ? '<span class="hint">' + U.esc(o.hint) + '</span>' : '') + '</div>',
        footer: '<span class="spacer"></span>' +
          '<button class="btn" data-no>Cancel</button>' +
          '<button class="btn btn--primary" data-yes>' + U.esc(o.confirmLabel || 'Save') + '</button>',
        onClose: () => done(null)
      });

      const input = m.el.querySelector('#promptInput');
      const submit = () => { done(input.value.trim()); m.close(); };
      m.el.querySelector('[data-yes]').addEventListener('click', submit);
      m.el.querySelector('[data-no]').addEventListener('click', () => { done(null); m.close(); });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !o.multiline) { e.preventDefault(); submit(); }
      });
    });
  };

  /* ---------------- markup helpers ---------------- */

  UI.empty = function (o) {
    return '<div class="empty">' +
      '<span data-icon="' + (o.icon || 'info') + '"></span>' +
      '<h3>' + U.esc(o.title || 'Nothing here yet') + '</h3>' +
      (o.message ? '<p>' + U.esc(o.message) + '</p>' : '') +
      (o.action ? '<button class="btn btn--primary" ' + (o.actionAttr || '') + '>' + U.esc(o.action) + '</button>' : '') +
      '</div>';
  };

  const BOOKING_STATUS = {
    confirmed:   { label: 'Confirmed',   cls: 'badge--info',   icon: 'check' },
    in_house:    { label: 'In house',    cls: 'badge--ok',     icon: 'key' },
    checked_out: { label: 'Checked out', cls: '',              icon: 'log-out' },
    cancelled:   { label: 'Cancelled',   cls: 'badge--danger', icon: 'x-circle' },
    no_show:     { label: 'No show',     cls: 'badge--warn',   icon: 'alert' }
  };
  UI.BOOKING_STATUS = BOOKING_STATUS;

  UI.bookingBadge = function (status) {
    const s = BOOKING_STATUS[status] || { label: U.titleCase(status), cls: '', icon: 'info' };
    return '<span class="badge ' + s.cls + '"><span data-icon="' + s.icon + '"></span>' + s.label + '</span>';
  };

  const ROOM_STATUS = {
    clean:     { label: 'Clean',     cls: 'badge--ok',      icon: 'check' },
    inspected: { label: 'Inspected', cls: 'badge--info',    icon: 'eye' },
    dirty:     { label: 'Dirty',     cls: 'badge--warn',    icon: 'alert' },
    cleaning:  { label: 'Cleaning',  cls: 'badge--coral',   icon: 'sparkle' },
    ooo:       { label: 'Out of order', cls: 'badge--danger', icon: 'ban' }
  };
  UI.ROOM_STATUS = ROOM_STATUS;

  UI.roomBadge = function (status) {
    const s = ROOM_STATUS[status] || { label: U.titleCase(status), cls: '', icon: 'info' };
    return '<span class="badge ' + s.cls + '"><span data-icon="' + s.icon + '"></span>' + s.label + '</span>';
  };

  const CHANNEL_LABEL = { direct: 'Direct', booking: 'Booking.com', airbnb: 'Airbnb' };
  UI.CHANNEL_LABEL = CHANNEL_LABEL;

  UI.channelKey = function (ch) {
    return '<span class="chkey" data-ch="' + U.esc(ch) + '">' + U.esc(CHANNEL_LABEL[ch] || ch) + '</span>';
  };

  UI.guestCell = function (guest, sub) {
    if (!guest) return '<span class="muted">Unknown guest</span>';
    return '<div class="who">' +
      '<span class="who__av' + (guest.vip ? ' is-vip' : '') + '">' + U.esc(U.initials(guest.firstName, guest.lastName)) + '</span>' +
      '<div class="cellstack"><strong>' + U.esc(guest.firstName + ' ' + guest.lastName) +
      (guest.vip ? ' <span class="badge badge--coral" style="height:17px;padding:0 6px;font-size:10px">VIP</span>' : '') +
      '</strong>' + (sub ? '<span>' + U.esc(sub) + '</span>' : '') + '</div></div>';
  };

  UI.deltaTag = function (value, opts) {
    const o = opts || {};
    const v = Number(value) || 0;
    const goodWhenUp = o.goodWhenUp !== false;
    const dir = v > 0.05 ? 'up' : v < -0.05 ? 'down' : 'flat';
    const good = dir === 'flat' ? 'flat' : (dir === 'up') === goodWhenUp ? 'up' : 'down';
    const icon = dir === 'up' ? 'arrow-up' : dir === 'down' ? 'arrow-down' : 'minus';
    const txt = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(o.dp === undefined ? 1 : o.dp) + (o.suffix || '');
    return '<span class="stat__delta is-' + good + '"><span data-icon="' + icon + '"></span>' + txt + '</span>';
  };

  /** A stat tile. `spark` is optional pre-rendered SVG. */
  UI.stat = function (o) {
    return '<div class="stat">' +
      '<div class="stat__label">' + (o.icon ? '<span data-icon="' + o.icon + '"></span>' : '') + U.esc(o.label) + '</div>' +
      '<div class="stat__value">' + (o.valueHTML || U.esc(o.value)) + '</div>' +
      '<div class="stat__foot">' + (o.delta || '') + (o.note ? '<span class="stat__note">' + U.esc(o.note) + '</span>' : '') + '</div>' +
      (o.spark ? '<div class="stat__spark">' + o.spark + '</div>' : '') +
      '</div>';
  };

  /* ---------------- forms ---------------- */

  UI.field = function (o) {
    const id = o.id || U.uid('f');
    let control;
    if (o.type === 'select') {
      control = '<select class="select" id="' + id + '" name="' + U.esc(o.name || id) + '"' + (o.required ? ' required' : '') + (o.disabled ? ' disabled' : '') + '>' +
        (o.options || []).map(op =>
          '<option value="' + U.esc(op.value) + '"' + (String(op.value) === String(o.value) ? ' selected' : '') + '>' + U.esc(op.label) + '</option>'
        ).join('') + '</select>';
    } else if (o.type === 'textarea') {
      control = '<textarea class="textarea" id="' + id + '" name="' + U.esc(o.name || id) + '" placeholder="' + U.esc(o.placeholder || '') + '"' +
        (o.rows ? ' rows="' + o.rows + '"' : '') + '>' + U.esc(o.value || '') + '</textarea>';
    } else {
      control = '<input class="input" type="' + (o.type || 'text') + '" id="' + id + '" name="' + U.esc(o.name || id) + '"' +
        ' value="' + U.esc(o.value === undefined || o.value === null ? '' : o.value) + '"' +
        (o.placeholder ? ' placeholder="' + U.esc(o.placeholder) + '"' : '') +
        (o.min !== undefined ? ' min="' + U.esc(o.min) + '"' : '') +
        (o.max !== undefined ? ' max="' + U.esc(o.max) + '"' : '') +
        (o.step !== undefined ? ' step="' + U.esc(o.step) + '"' : '') +
        (o.required ? ' required' : '') + (o.disabled ? ' disabled' : '') +
        (o.autofocus ? ' autofocus' : '') + '>';
    }
    return '<div class="field' + (o.span2 ? ' span2' : '') + '"' + (o.span2 ? ' style="grid-column:1/-1"' : '') + '>' +
      '<label for="' + id + '">' + U.esc(o.label) + '</label>' + control +
      (o.hint ? '<span class="hint">' + U.esc(o.hint) + '</span>' : '') +
      '<span class="err" data-err-for="' + U.esc(o.name || id) + '" hidden></span>' +
      '</div>';
  };

  UI.switchField = function (o) {
    return '<label class="switch">' +
      '<input type="checkbox" name="' + U.esc(o.name) + '"' + (o.checked ? ' checked' : '') + '>' +
      '<span class="switch__track"></span>' +
      '<span><strong style="font-size:13px;font-weight:600">' + U.esc(o.label) + '</strong>' +
      (o.hint ? '<br><span class="hint" style="font-size:11.5px;color:var(--text-muted)">' + U.esc(o.hint) + '</span>' : '') +
      '</span></label>';
  };

  /** Read a <form> into a plain object (checkboxes → boolean, number inputs → Number). */
  UI.formData = function (form) {
    const out = {};
    U.$$('input, select, textarea', form).forEach(el => {
      if (!el.name) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'number') out[el.name] = el.value === '' ? null : Number(el.value);
      else out[el.name] = el.value;
    });
    return out;
  };

  UI.setErrors = function (form, errors) {
    U.$$('[data-err-for]', form).forEach(e => { e.hidden = true; e.textContent = ''; });
    U.$$('[aria-invalid]', form).forEach(e => e.removeAttribute('aria-invalid'));
    let first = null;
    Object.keys(errors || {}).forEach(name => {
      const slot = form.querySelector('[data-err-for="' + name + '"]');
      const input = form.querySelector('[name="' + name + '"]');
      if (slot) { slot.textContent = errors[name]; slot.hidden = false; }
      if (input) { input.setAttribute('aria-invalid', 'true'); if (!first) first = input; }
    });
    if (first) first.focus();
    return !Object.keys(errors || {}).length;
  };

  /* ---------------- tabs ---------------- */

  UI.tabs = function (container, onChange) {
    U.on(container, 'click', '.tabs button', function (e, btn) {
      U.$$('.tabs button', container).forEach(b => b.classList.toggle('is-active', b === btn));
      onChange(btn.dataset.tab, btn);
    });
  };

  /* ---------------- misc ---------------- */

  UI.copy = function (text, label) {
    const done = () => UI.toast('Copied', label || text, 'ok', 2000);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
    } else fallback();

    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { UI.toast('Could not copy', text, 'warn'); }
      ta.remove();
    }
  };

  global.UI = UI;
})(window);
