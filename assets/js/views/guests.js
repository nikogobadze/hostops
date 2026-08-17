/* ============================================================
   View — Guest directory
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  const filters = { q: '', segment: 'all', sort: 'recent' };

  Views.guests = {
    title: 'Guests',
    subtitle: function () {
      const n = Store.state.guests.length;
      const vip = Store.state.guests.filter(g => g.vip).length;
      return n + ' profiles · ' + vip + ' VIP · ' + Domain.inHouse().length + ' on property now';
    },

    render: function (host, params) {
      const rows = query();
      const all = Store.state.guests;
      const repeat = all.filter(g => stays(g.id).length > 1).length;
      const revenue = U.sum(all, g => lifetimeValue(g.id));

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Guest profiles', icon: 'users', valueHTML: U.num(all.length), note: 'in the directory' }) +
            UI.stat({ label: 'Repeat guests', icon: 'refresh', valueHTML: U.num(repeat), note: all.length ? Math.round((repeat / all.length) * 100) + '% of the base' : '—' }) +
            UI.stat({ label: 'VIPs', icon: 'star', valueHTML: U.num(all.filter(g => g.vip).length), note: 'flagged for special handling' }) +
            UI.stat({ label: 'Lifetime value', icon: 'tag', valueHTML: U.esc(U.moneyCompact(revenue)), note: 'accommodation booked to date' }) +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="card__head" style="flex-wrap:wrap;gap:10px">' +
              '<div class="searchbox" style="margin:0;width:250px">' +
                '<span class="searchbox__icon" data-icon="search"></span>' +
                '<input type="search" id="gSearch" placeholder="Name, email, country…" value="' + U.esc(filters.q) + '">' +
              '</div>' +
              '<select class="select" id="gSegment" style="width:auto;height:36px" aria-label="Segment">' +
                '<option value="all"' + (filters.segment === 'all' ? ' selected' : '') + '>Everyone</option>' +
                '<option value="inhouse"' + (filters.segment === 'inhouse' ? ' selected' : '') + '>In house now</option>' +
                '<option value="arriving"' + (filters.segment === 'arriving' ? ' selected' : '') + '>Arriving soon</option>' +
                '<option value="vip"' + (filters.segment === 'vip' ? ' selected' : '') + '>VIP only</option>' +
                '<option value="repeat"' + (filters.segment === 'repeat' ? ' selected' : '') + '>Repeat guests</option>' +
                '<option value="marketing"' + (filters.segment === 'marketing' ? ' selected' : '') + '>Marketing opt-in</option>' +
              '</select>' +
              '<select class="select" id="gSort" style="width:auto;height:36px" aria-label="Sort">' +
                '<option value="recent"' + (filters.sort === 'recent' ? ' selected' : '') + '>Most recent stay</option>' +
                '<option value="name"' + (filters.sort === 'name' ? ' selected' : '') + '>Name A–Z</option>' +
                '<option value="value"' + (filters.sort === 'value' ? ' selected' : '') + '>Lifetime value</option>' +
                '<option value="stays"' + (filters.sort === 'stays' ? ' selected' : '') + '>Number of stays</option>' +
              '</select>' +
              '<div class="spacer"></div>' +
              '<span class="small muted">' + rows.length + ' shown</span>' +
              '<button class="btn btn--sm" id="gExport"><span data-icon="download"></span>CSV</button>' +
              '<button class="btn btn--primary btn--sm" id="gNew"><span data-icon="plus"></span>Add guest</button>' +
            '</div>' +
            (rows.length ? table(rows) : UI.empty({ icon: 'users', title: 'No guests match', message: 'Try a different search or segment.' })) +
          '</div>' +
        '</div>';

      wire(host);

      if (params && params.id) {
        openDetail(params.id);
        history.replaceState(null, '', '#/guests');
      }
    },

    openDetail: openDetail
  };

  /* ============================================================
     helpers
     ============================================================ */

  function stays(guestId) {
    return Store.state.bookings
      .filter(b => b.guestId === guestId && Domain.holdsRoom(b))
      .sort((a, b) => U.cmp(b.checkIn, a.checkIn));
  }

  function lifetimeValue(guestId) {
    return U.sum(stays(guestId), b => b.rate * U.nights(b.checkIn, b.checkOut));
  }

  function lastStay(guestId) {
    const s = stays(guestId);
    return s.length ? s[0] : null;
  }

  function query() {
    const q = filters.q.toLowerCase();
    const today = U.today();
    const inHouseIds = new Set(Domain.inHouse().map(b => b.guestId));
    const arrivingIds = new Set(Store.state.bookings
      .filter(b => b.status === 'confirmed' && b.checkIn >= today && b.checkIn <= U.addDays(today, 7))
      .map(b => b.guestId));

    let rows = Store.state.guests.filter(g => {
      if (filters.segment === 'vip' && !g.vip) return false;
      if (filters.segment === 'inhouse' && !inHouseIds.has(g.id)) return false;
      if (filters.segment === 'arriving' && !arrivingIds.has(g.id)) return false;
      if (filters.segment === 'repeat' && stays(g.id).length < 2) return false;
      if (filters.segment === 'marketing' && !g.marketingOptIn) return false;
      if (q) {
        const hay = (g.firstName + ' ' + g.lastName + ' ' + (g.email || '') + ' ' + (g.country || '') + ' ' + (g.phone || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      if (filters.sort === 'name') return U.cmp(a.lastName + a.firstName, b.lastName + b.firstName);
      if (filters.sort === 'value') return lifetimeValue(b.id) - lifetimeValue(a.id);
      if (filters.sort === 'stays') return stays(b.id).length - stays(a.id).length;
      const la = lastStay(a.id), lb = lastStay(b.id);
      return U.cmp(lb ? lb.checkIn : '', la ? la.checkIn : '');
    });

    return rows;
  }

  function table(rows) {
    const today = U.today();
    const inHouseIds = new Set(Domain.inHouse().map(b => b.guestId));

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Guest</th><th>Contact</th><th>Country</th><th class="num">Stays</th>' +
      '<th class="num">Lifetime value</th><th>Last / next stay</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.slice(0, 300).map(g => {
        const s = stays(g.id);
        const last = s[0];
        const next = Store.state.bookings
          .filter(b => b.guestId === g.id && b.status === 'confirmed' && b.checkIn >= today)
          .sort((a, b) => U.cmp(a.checkIn, b.checkIn))[0];
        return '<tr class="is-clickable" data-guest="' + g.id + '">' +
          '<td>' + UI.guestCell(g, inHouseIds.has(g.id) ? 'In house now' : '') + '</td>' +
          '<td><div class="cellstack"><strong style="font-weight:500">' + U.esc(g.email || '—') + '</strong>' +
            '<span>' + U.esc(g.phone || '') + '</span></div></td>' +
          '<td>' + U.esc(g.country || '—') + '</td>' +
          '<td class="num">' + s.length + '</td>' +
          '<td class="num strong">' + U.esc(U.money(lifetimeValue(g.id), null, { decimals: 0 })) + '</td>' +
          '<td class="nowrap">' + (next
            ? '<span class="badge badge--info">arrives ' + U.esc(U.fmtDate(next.checkIn)) + '</span>'
            : last ? '<span class="small muted">' + U.esc(U.fmtDate(last.checkIn)) + '</span>' : '<span class="muted small">—</span>') + '</td>' +
          '<td><div class="rowactions">' +
            '<button class="iconbtn iconbtn--bare" data-gedit="' + g.id + '" title="Edit" data-icon="edit"></button>' +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host) {
    const search = host.querySelector('#gSearch');
    if (search) search.addEventListener('input', U.debounce(function () {
      filters.q = search.value;
      App.render();
      const s = document.querySelector('#gSearch');
      if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    }, 260));

    U.on(host, 'change', '#gSegment', (e, el) => { filters.segment = el.value; App.render(); });
    U.on(host, 'change', '#gSort', (e, el) => { filters.sort = el.value; App.render(); });

    U.on(host, 'click', '[data-guest]', function (e, el) {
      if (e.target.closest('.rowactions')) return;
      openDetail(el.dataset.guest);
    });
    U.on(host, 'click', '[data-gedit]', (e, el) => { e.stopPropagation(); openEditor(el.dataset.gedit); });
    U.on(host, 'click', '#gNew', () => openEditor(null));

    U.on(host, 'click', '#gExport', function () {
      const rows = query();
      const head = ['First name', 'Last name', 'Email', 'Phone', 'Country', 'VIP', 'Stays', 'Lifetime value', 'Marketing opt-in', 'Preferences'];
      const body = rows.map(g => [g.firstName, g.lastName, g.email, g.phone, g.country,
        g.vip ? 'yes' : 'no', stays(g.id).length, lifetimeValue(g.id), g.marketingOptIn ? 'yes' : 'no', g.prefs]);
      U.download('hostops-guests-' + U.today() + '.csv', U.toCSV([head].concat(body)), 'text/csv;charset=utf-8');
      UI.toast('Export ready', rows.length + ' guest profiles written to CSV.', 'ok');
    });
  }

  /* ============================================================
     detail
     ============================================================ */

  function openDetail(guestId) {
    const g = Store.guest(guestId);
    if (!g) return;
    const s = stays(g.id);
    const all = Store.state.bookings.filter(b => b.guestId === g.id).sort((a, b) => U.cmp(b.checkIn, a.checkIn));
    const nights = U.sum(s, b => U.nights(b.checkIn, b.checkOut));
    const inHouse = Domain.inHouse().find(b => b.guestId === g.id);

    const m = UI.modal({
      title: g.firstName + ' ' + g.lastName,
      subtitle: (g.country || '—') + ' · ' + s.length + ' stay' + (s.length === 1 ? '' : 's') + ' · ' + nights + ' room-nights',
      size: 'lg',
      body:
        '<div class="row row--wrap" style="margin-bottom:16px">' +
          (g.vip ? '<span class="badge badge--coral"><span data-icon="star"></span>VIP</span>' : '') +
          (inHouse ? '<span class="badge badge--ok"><span data-icon="key"></span>In room ' +
            U.esc((Store.room(inHouse.roomId) || {}).number) + '</span>' : '') +
          (s.length > 1 ? '<span class="badge badge--info"><span data-icon="refresh"></span>Repeat guest</span>' : '') +
          (g.marketingOptIn ? '<span class="badge"><span data-icon="mail"></span>Marketing opt-in</span>' : '') +
          '<span class="spacer"></span>' +
          '<button class="btn btn--sm" data-gedit="' + g.id + '"><span data-icon="edit"></span>Edit profile</button>' +
        '</div>' +

        '<div class="grid grid--2" style="gap:20px">' +
          '<div>' +
            '<p class="label" style="margin-bottom:8px">Contact</p>' +
            '<dl class="deflist">' +
              '<dt>Email</dt><dd>' + U.esc(g.email || '—') + '</dd>' +
              '<dt>Phone</dt><dd>' + U.esc(g.phone || '—') + '</dd>' +
              '<dt>Country</dt><dd>' + U.esc(g.country || '—') + '</dd>' +
              '<dt>Document</dt><dd>' + U.esc(g.docType || '—') + ' ' + U.esc(g.docId || '') + '</dd>' +
              '<dt>Guest since</dt><dd>' + U.esc(U.fmtDateLong(U.today(new Date(g.createdAt)))) + '</dd>' +
            '</dl>' +
            (g.prefs ? '<div class="notebox mt"><span data-icon="star"></span><p>' + U.esc(g.prefs) + '</p></div>' : '') +
            (g.notes ? '<div class="notebox notebox--info mt"><span data-icon="info"></span><p>' + U.esc(g.notes) + '</p></div>' : '') +
          '</div>' +
          '<div>' +
            '<p class="label" style="margin-bottom:8px">Value</p>' +
            '<dl class="deflist">' +
              '<dt>Stays</dt><dd>' + s.length + '</dd>' +
              '<dt>Room-nights</dt><dd>' + nights + '</dd>' +
              '<dt>Accommodation</dt><dd>' + U.esc(U.money(lifetimeValue(g.id))) + '</dd>' +
              '<dt>Average rate</dt><dd>' + U.esc(nights ? U.money(lifetimeValue(g.id) / nights) : '—') + '</dd>' +
              '<dt>Favourite channel</dt><dd>' + (s.length ? UI.channelKey(favouriteChannel(s)) : '—') + '</dd>' +
            '</dl>' +
          '</div>' +
        '</div>' +

        '<p class="label mt-lg" style="margin-bottom:8px">Stay history</p>' +
        (all.length
          ? '<div class="tablewrap"><table class="table"><thead><tr>' +
            '<th>Reference</th><th>Stay</th><th>Room</th><th>Channel</th><th class="num">Value</th><th>Status</th>' +
            '</tr></thead><tbody>' +
            all.slice(0, 12).map(b => {
              const r = Store.room(b.roomId);
              return '<tr class="is-clickable" data-bk="' + b.id + '">' +
                '<td class="strong">' + U.esc(b.ref) + '</td>' +
                '<td class="nowrap">' + U.esc(U.stayLabel(b.checkIn, b.checkOut)) + '</td>' +
                '<td>' + U.esc(r ? r.number : '—') + '</td>' +
                '<td>' + UI.channelKey(b.channel) + '</td>' +
                '<td class="num">' + U.esc(U.money(b.rate * U.nights(b.checkIn, b.checkOut), null, { decimals: 0 })) + '</td>' +
                '<td>' + UI.bookingBadge(b.status) + '</td>' +
              '</tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="small muted">No reservations yet.</p>'),
      footer: '<span class="spacer"></span>' +
        '<button class="btn btn--soft" data-gbook="' + g.id + '"><span data-icon="plus"></span>New booking</button>' +
        '<button class="btn" data-close>Close</button>'
    });

    U.on(m.el, 'click', '[data-bk]', function (e, el) { m.close(); Views.bookings.openDetail(el.dataset.bk); });
    U.on(m.el, 'click', '[data-gedit]', function () { m.close(); openEditor(g.id); });
    U.on(m.el, 'click', '[data-gbook]', function () {
      m.close();
      Views.bookings.openEditor(null);
      setTimeout(function () {
        const sel = document.querySelector('[name=guestId]');
        if (sel) { sel.value = g.id; sel.dispatchEvent(new Event('change')); }
      }, 60);
    });
  }

  function favouriteChannel(s) {
    const tally = {};
    s.forEach(b => { tally[b.channel] = (tally[b.channel] || 0) + 1; });
    return Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  }

  /* ============================================================
     editor
     ============================================================ */

  function openEditor(guestId) {
    const g = guestId ? Store.guest(guestId) : null;

    const m = UI.modal({
      title: g ? 'Edit ' + g.firstName + ' ' + g.lastName : 'Add a guest',
      size: 'md',
      body: '<form id="gForm"><div class="formgrid">' +
        UI.field({ label: 'First name', name: 'firstName', value: g ? g.firstName : '', required: true, autofocus: !g }) +
        UI.field({ label: 'Last name', name: 'lastName', value: g ? g.lastName : '', required: true }) +
        UI.field({ label: 'Email', name: 'email', type: 'email', value: g ? g.email : '' }) +
        UI.field({ label: 'Phone', name: 'phone', value: g ? g.phone : '' }) +
        UI.field({
          label: 'Country', name: 'country', type: 'select', value: g ? g.country : 'ES',
          options: Seed.COUNTRIES.concat(['—']).map(c => ({ value: c, label: c }))
        }) +
        UI.field({
          label: 'Document type', name: 'docType', type: 'select', value: g ? g.docType : 'Passport',
          options: ['Passport', 'ID card', 'Driving licence'].map(v => ({ value: v, label: v }))
        }) +
        UI.field({ label: 'Document number', name: 'docId', value: g ? g.docId : '' }) +
        '<div class="field" style="justify-content:flex-end;padding-bottom:8px">' +
          UI.switchField({ label: 'VIP', name: 'vip', checked: g ? g.vip : false, hint: 'Flag for special handling' }) +
        '</div>' +
        UI.field({ label: 'Preferences', name: 'prefs', value: g ? g.prefs : '', span2: true, placeholder: 'High floor, quiet room, extra pillows…' }) +
        UI.field({ label: 'Internal notes', name: 'notes', type: 'textarea', value: g ? g.notes : '', span2: true }) +
        '<div class="field span2" style="grid-column:1/-1">' +
          UI.switchField({ label: 'Marketing opt-in', name: 'marketingOptIn', checked: g ? g.marketingOptIn : false, hint: 'Consented to receive offers' }) +
        '</div>' +
      '</div></form>',
      footer: (g ? '<button class="btn btn--danger btn--sm" id="gDelete"><span data-icon="trash"></span>Delete</button>' : '') +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="gSave">' + (g ? 'Save changes' : 'Add guest') + '</button>'
    });

    m.el.querySelector('#gSave').addEventListener('click', function () {
      const form = m.el.querySelector('#gForm');
      const d = UI.formData(form);
      const errors = {};
      if (!d.firstName) errors.firstName = 'First name is required.';
      if (!d.lastName) errors.lastName = 'Last name is required.';
      if (d.email && d.email.indexOf('@') === -1) errors.email = 'That does not look like an email address.';
      if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }

      Store.update('guest:save', function (s) {
        if (g) Object.assign(g, d);
        else s.guests.push(Object.assign({
          id: U.uid('g'), createdAt: new Date().toISOString()
        }, d));
      });

      m.close();
      UI.toast(g ? 'Profile updated' : 'Guest added', d.firstName + ' ' + d.lastName, 'ok');
    });

    const del = m.el.querySelector('#gDelete');
    if (del) del.addEventListener('click', async function () {
      const linked = Store.state.bookings.filter(b => b.guestId === g.id);
      if (linked.length) {
        UI.toast('Cannot delete', 'This guest has ' + linked.length + ' reservation(s) on file.', 'warn');
        return;
      }
      const ok = await UI.confirm({
        title: 'Delete ' + g.firstName + ' ' + g.lastName + '?',
        message: 'The profile is removed permanently.', confirmLabel: 'Delete', tone: 'danger'
      });
      if (!ok) return;
      Store.update('guest:delete', s => { s.guests = s.guests.filter(x => x.id !== g.id); });
      m.close();
      UI.toast('Guest deleted', '', 'ok', 2000);
    });
  }

})(window);
