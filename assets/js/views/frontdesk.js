/* ============================================================
   View — Front desk (arrivals, departures, in house)
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  let tab = 'arrivals';

  Views.frontdesk = {
    title: 'Front Desk',
    subtitle: function () {
      const t = U.today();
      const a = Domain.arrivals(t).filter(b => b.status === 'confirmed').length;
      const d = Domain.departures(t).filter(b => b.status === 'in_house').length;
      return a + ' still to arrive · ' + d + ' still to depart · ' + Domain.inHouse().length + ' in house';
    },

    render: function (host) {
      const today = U.today();
      const arrivals = Domain.arrivals(today);
      const departures = Domain.departures(today);
      const inHouse = Domain.inHouse();
      const dueIn = arrivals.filter(b => b.status === 'confirmed');
      const dueOut = departures.filter(b => b.status === 'in_house');
      const openBalances = inHouse.filter(b => Domain.folioTotals(b.id).balance > 0.01);

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Due to arrive', icon: 'log-in', valueHTML: U.num(dueIn.length), note: arrivals.length + ' arrivals today' }) +
            UI.stat({ label: 'Due to depart', icon: 'log-out', valueHTML: U.num(dueOut.length), note: departures.length + ' departures today' }) +
            UI.stat({ label: 'In house', icon: 'key', valueHTML: U.num(inHouse.length), note: U.num(U.sum(inHouse, b => b.adults + b.children)) + ' guests on property' }) +
            UI.stat({
              label: 'Open balances', icon: 'credit-card',
              valueHTML: U.esc(U.moneyCompact(U.sum(openBalances, b => Domain.folioTotals(b.id).balance))),
              note: openBalances.length + ' folios with money outstanding'
            }) +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="tabs">' +
              btn('arrivals', 'Arrivals', arrivals.length) +
              btn('departures', 'Departures', departures.length) +
              btn('inhouse', 'In house', inHouse.length) +
            '</div>' +
            '<div id="fdPanel"></div>' +
          '</div>' +
        '</div>';

      const panel = host.querySelector('#fdPanel');

      function paint() {
        if (tab === 'arrivals') panel.innerHTML = arrivalsPanel(arrivals);
        else if (tab === 'departures') panel.innerHTML = departuresPanel(departures);
        else panel.innerHTML = inHousePanel(inHouse);
        Icons.render(panel);
      }
      paint();

      UI.tabs(host, function (t) { tab = t; paint(); });

      U.on(host, 'click', '[data-checkin]', function (e, el) { e.stopPropagation(); Views.frontdesk.doCheckIn(el.dataset.checkin); });
      U.on(host, 'click', '[data-checkout]', function (e, el) { e.stopPropagation(); Views.frontdesk.doCheckOut(el.dataset.checkout); });
      U.on(host, 'click', '[data-open]', function (e, el) {
        if (e.target.closest('.rowactions') || e.target.closest('button')) return;
        Views.bookings.openDetail(el.dataset.open);
      });
      U.on(host, 'click', '[data-order]', function (e, el) { e.stopPropagation(); Views.roomservice.openOrder(el.dataset.order); });
    },

    doCheckIn: doCheckIn,
    doCheckOut: doCheckOut
  };

  function btn(id, label, count) {
    return '<button data-tab="' + id + '"' + (tab === id ? ' class="is-active"' : '') + '>' +
      U.esc(label) + ' <span class="muted">' + count + '</span></button>';
  }

  /* ============================================================
     panels
     ============================================================ */

  function arrivalsPanel(rows) {
    if (!rows.length) return UI.empty({ icon: 'log-in', title: 'No arrivals today', message: 'Nothing is scheduled to check in on ' + U.fmtDateLong(U.today()) + '.' });

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Room</th><th>Guest</th><th>Stay</th><th>Channel</th><th>Payment</th><th>Notes</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(b => {
        const g = Store.guest(b.guestId);
        const room = Store.room(b.roomId);
        const type = Store.roomType(b.typeId);
        const ready = room && (room.status === 'clean' || room.status === 'inspected');
        return '<tr class="is-clickable" data-open="' + b.id + '">' +
          '<td><div class="row gap-sm"><span class="roomno">' + U.esc(room ? room.number : '—') + '</span>' +
            (room ? (ready ? '<span class="badge badge--ok" title="Ready">Ready</span>'
              : '<span class="badge badge--warn" title="Not yet cleaned">' + U.esc(UI.ROOM_STATUS[room.status].label) + '</span>') : '') +
          '</div><span class="small muted">' + U.esc(type ? type.name : '') + '</span></td>' +
          '<td>' + UI.guestCell(g, g ? g.email : '') + '</td>' +
          '<td class="nowrap"><div class="cellstack"><strong>' + U.nights(b.checkIn, b.checkOut) + ' nights</strong>' +
            '<span>to ' + U.esc(U.fmtDate(b.checkOut)) + ' · ' + b.adults + (b.children ? '+' + b.children : '') + ' guests</span></div></td>' +
          '<td>' + UI.channelKey(b.channel) + '</td>' +
          '<td><span class="badge ' + (b.paymentStatus === 'prepaid' || b.paymentStatus === 'paid' ? 'badge--ok' : 'badge--outline') + '">' +
            U.esc(U.titleCase(b.paymentStatus)) + '</span></td>' +
          '<td class="small muted">' + U.esc(U.truncate(b.notes || (g && g.prefs) || '—', 34)) + '</td>' +
          '<td><div class="row gap-sm" style="justify-content:flex-end">' +
            (b.status === 'in_house'
              ? '<span class="badge badge--ok"><span data-icon="check"></span>Checked in</span>'
              : '<button class="btn btn--primary btn--sm" data-checkin="' + b.id + '"><span data-icon="log-in"></span>Check in</button>') +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function departuresPanel(rows) {
    if (!rows.length) return UI.empty({ icon: 'log-out', title: 'No departures today', message: 'Nobody is scheduled to leave on ' + U.fmtDateLong(U.today()) + '.' });

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Room</th><th>Guest</th><th>Stay</th><th class="num">Charges</th><th class="num">Balance</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(b => {
        const g = Store.guest(b.guestId);
        const room = Store.room(b.roomId);
        const t = Domain.folioTotals(b.id);
        return '<tr class="is-clickable" data-open="' + b.id + '">' +
          '<td><span class="roomno">' + U.esc(room ? room.number : '—') + '</span></td>' +
          '<td>' + UI.guestCell(g, U.stayLabel(b.checkIn, b.checkOut)) + '</td>' +
          '<td class="nowrap small muted">since ' + U.esc(U.fmtDate(b.checkIn)) + '</td>' +
          '<td class="num">' + U.esc(U.money(t.grossWithTax)) + '</td>' +
          '<td class="num strong">' + (t.balance > 0.01
            ? '<span class="badge badge--warn">' + U.esc(U.money(t.balance)) + '</span>'
            : '<span class="badge badge--ok">settled</span>') + '</td>' +
          '<td>' + UI.bookingBadge(b.status) + '</td>' +
          '<td><div class="row gap-sm" style="justify-content:flex-end">' +
            (b.status === 'checked_out'
              ? '<span class="badge"><span data-icon="check"></span>Departed</span>'
              : '<button class="btn btn--primary btn--sm" data-checkout="' + b.id + '"><span data-icon="log-out"></span>Check out</button>') +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function inHousePanel(rows) {
    if (!rows.length) return UI.empty({ icon: 'key', title: 'Nobody in house', message: 'Check a guest in to open their folio.' });

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Room</th><th>Guest</th><th>Departing</th><th>Open orders</th><th class="num">Balance</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(b => {
        const g = Store.guest(b.guestId);
        const room = Store.room(b.roomId);
        const t = Domain.folioTotals(b.id);
        const open = Store.state.orders.filter(o => o.bookingId === b.id && o.status !== 'delivered' && o.status !== 'cancelled');
        const leavesToday = b.checkOut === U.today();
        return '<tr class="is-clickable" data-open="' + b.id + '">' +
          '<td><span class="roomno">' + U.esc(room ? room.number : '—') + '</span></td>' +
          '<td>' + UI.guestCell(g, b.adults + (b.children ? '+' + b.children : '') + ' guests · ' + UI.CHANNEL_LABEL[b.channel]) + '</td>' +
          '<td class="nowrap">' + (leavesToday
            ? '<span class="badge badge--coral">today</span>'
            : '<span class="small">' + U.esc(U.fmtDate(b.checkOut)) + '<span class="muted"> · ' + U.nights(U.today(), b.checkOut) + 'n left</span></span>') + '</td>' +
          '<td>' + (open.length
            ? '<button class="btn btn--sm btn--soft" data-order="' + open[0].id + '"><span data-icon="tray"></span>' + open.length + ' open</button>'
            : '<span class="muted small">—</span>') + '</td>' +
          '<td class="num strong">' + U.esc(U.money(t.balance)) + '</td>' +
          '<td><div class="row gap-sm" style="justify-content:flex-end">' +
            (leavesToday ? '<button class="btn btn--sm" data-checkout="' + b.id + '">Check out</button>' : '') +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     check-in
     ============================================================ */

  function doCheckIn(bookingId) {
    const b = Store.booking(bookingId);
    if (!b) return;
    if (b.status !== 'confirmed') {
      UI.toast('Cannot check in', 'This reservation is ' + U.titleCase(b.status).toLowerCase() + '.', 'warn');
      return;
    }

    const g = Store.guest(b.guestId);
    const room = Store.room(b.roomId);
    const type = Store.roomType(b.typeId);
    const nights = U.nights(b.checkIn, b.checkOut);
    const roomReady = room && (room.status === 'clean' || room.status === 'inspected');
    const alternatives = Domain.availableRooms(b.checkIn, b.checkOut, { excludeBookingId: b.id });

    const m = UI.modal({
      title: 'Check in · ' + Store.guestName(b.guestId),
      subtitle: b.ref + ' · ' + U.stayLabel(b.checkIn, b.checkOut),
      size: 'lg',
      body:
        '<form id="ciForm">' +
          (!roomReady ? '<div class="notebox" style="margin-bottom:16px"><span data-icon="alert"></span>' +
            '<p>Room ' + U.esc(room ? room.number : '') + ' is marked <b>' +
            U.esc(room ? UI.ROOM_STATUS[room.status].label.toLowerCase() : 'unknown') + '</b>. ' +
            'Checking in will mark it clean — make sure housekeeping has finished, or move the guest to another room.</p></div>' : '') +

          '<fieldset class="fieldset" style="margin-bottom:16px"><legend>Registration</legend>' +
            '<div class="formgrid">' +
              UI.field({ label: 'First name', name: 'firstName', value: g ? g.firstName : '' }) +
              UI.field({ label: 'Last name', name: 'lastName', value: g ? g.lastName : '' }) +
              UI.field({ label: 'Email', name: 'email', type: 'email', value: g ? g.email : '' }) +
              UI.field({ label: 'Phone', name: 'phone', value: g ? g.phone : '' }) +
              UI.field({
                label: 'Document type', name: 'docType', type: 'select', value: g ? g.docType : 'Passport',
                options: ['Passport', 'ID card', 'Driving licence'].map(v => ({ value: v, label: v }))
              }) +
              UI.field({ label: 'Document number', name: 'docId', value: g ? g.docId : '', placeholder: 'P1234567' }) +
            '</div>' +
          '</fieldset>' +

          '<fieldset class="fieldset"><legend>Room &amp; stay</legend>' +
            '<div class="formgrid">' +
              '<div class="field"><label for="ciRoom">Room</label><select class="select" id="ciRoom" name="roomId">' +
                [room].concat(alternatives.filter(r => !room || r.id !== room.id))
                  .filter(Boolean)
                  .sort((x, y) => U.cmp(x.number, y.number))
                  .map(r => {
                    const t = Store.roomType(r.typeId);
                    return '<option value="' + r.id + '"' + (room && r.id === room.id ? ' selected' : '') + '>Room ' +
                      U.esc(r.number) + ' · ' + U.esc(t ? t.name : '') + ' · ' + U.esc(UI.ROOM_STATUS[r.status].label) + '</option>';
                  }).join('') +
              '</select><span class="hint">Rooms free for the whole stay</span></div>' +
              UI.field({ label: 'Nightly rate', name: 'rate', type: 'number', min: 0, value: b.rate }) +
              UI.field({ label: 'Key cards', name: 'keys', type: 'number', min: 1, max: 4, value: Math.min(2, Math.max(1, b.adults)) }) +
              UI.field({
                label: 'Arrival note', name: 'notes', value: b.notes,
                placeholder: 'Early arrival, luggage stored…'
              }) +
              '<div class="field span2" style="grid-column:1/-1">' +
                UI.switchField({ label: 'Breakfast included', name: 'breakfast', checked: b.breakfast, hint: U.money(Store.state.hotel.breakfastPrice) + ' per adult per night' }) +
              '</div>' +
            '</div>' +
            '<div class="quote">' +
              '<div class="quote__row"><span>' + nights + ' night' + (nights === 1 ? '' : 's') + ' · ' + U.esc(type ? type.name : '') + '</span><b>' + U.esc(U.money(b.rate * nights)) + '</b></div>' +
              '<div class="quote__row"><span>Payment terms</span><b>' + U.esc(U.titleCase(b.paymentStatus)) + '</b></div>' +
              '<div class="quote__row"><span>Check-out by</span><b>' + U.esc(U.fmtDate(b.checkOut)) + ', ' + U.esc(Store.state.hotel.checkOutTime) + '</b></div>' +
            '</div>' +
          '</fieldset>' +
        '</form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="ciGo"><span data-icon="log-in"></span>Complete check-in</button>'
    });

    m.el.querySelector('#ciGo').addEventListener('click', function () {
      const d = UI.formData(m.el.querySelector('#ciForm'));

      try {
        Store.update('frontdesk:checkin', function () {
          if (g) {
            g.firstName = d.firstName || g.firstName;
            g.lastName = d.lastName || g.lastName;
            g.email = d.email;
            g.phone = d.phone;
            g.docType = d.docType;
            g.docId = d.docId;
          }
          if (d.roomId && d.roomId !== b.roomId) Domain.moveBooking(b.id, d.roomId);
          b.rate = Number(d.rate) || b.rate;
          b.breakfast = !!d.breakfast;
          b.notes = d.notes || b.notes;
          b.keys = Number(d.keys) || 1;

          Domain.checkIn(b.id);

          const r = Store.room(b.roomId);
          Store.log('Checked in ' + Store.guestName(b.guestId) + ' · room ' + (r ? r.number : '—'),
            'log-in', '#/frontdesk', 'frontdesk');
        });

        m.close();
        const r = Store.room(b.roomId);
        UI.toast('Checked in', Store.guestName(b.guestId) + ' · room ' + (r ? r.number : '—') +
          ' · ' + (Number(d.keys) || 1) + ' key card' + ((Number(d.keys) || 1) === 1 ? '' : 's'), 'ok');
      } catch (e) {
        UI.toast('Check-in failed', e.message, 'error');
      }
    });
  }

  /* ============================================================
     check-out
     ============================================================ */

  function doCheckOut(bookingId) {
    const b = Store.booking(bookingId);
    if (!b) return;
    if (b.status !== 'in_house') {
      UI.toast('Cannot check out', 'This guest is not currently in house.', 'warn');
      return;
    }

    const room = Store.room(b.roomId);
    const totals = Domain.folioTotals(b.id);
    const openOrders = Store.state.orders.filter(o => o.bookingId === b.id && (o.status === 'new' || o.status === 'preparing'));
    const stock = Domain.stockFor(b.roomId);
    const consumed = Store.state.minibarItems.filter(i => (stock[i.id] || 0) < i.par);

    const m = UI.modal({
      title: 'Check out · ' + Store.guestName(b.guestId),
      subtitle: 'Room ' + (room ? room.number : '—') + ' · ' + U.stayLabel(b.checkIn, b.checkOut),
      size: 'lg',
      body:
        (openOrders.length ? '<div class="notebox" style="margin-bottom:14px"><span data-icon="alert"></span>' +
          '<p><b>' + openOrders.length + ' room-service order' + (openOrders.length === 1 ? '' : 's') + ' still open.</b> ' +
          'Deliver or cancel them first so the charges land on this folio.</p></div>' : '') +

        (consumed.length ? '<div class="notebox notebox--info" style="margin-bottom:14px"><span data-icon="bottle"></span>' +
          '<p><b>Mini bar not at par.</b> ' + consumed.map(i => U.esc(i.name)).join(', ') +
          ' — post any unrecorded consumption before settling.</p></div>' : '') +

        '<div class="tablewrap" style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--r-sm)">' +
          '<table class="folio">' +
            '<thead><tr><th>When</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>' +
            (totals.items.length
              ? totals.items.slice().sort((a, c) => U.cmp(a.ts, c.ts)).map(i =>
                '<tr><td class="muted small nowrap">' + U.esc(U.fmtDateTime(i.ts)) + '</td><td>' + U.esc(i.desc) + '</td>' +
                '<td class="num">' + U.esc(U.money(i.amount)) + '</td></tr>').join('')
              : '<tr><td colspan="3" class="muted" style="text-align:center;padding:16px">Nothing posted.</td></tr>') +
            '</tbody></table>' +
        '</div>' +

        '<div class="grid grid--2 mt" style="gap:16px">' +
          '<div>' +
            '<dl class="deflist">' +
              '<dt>Charges</dt><dd>' + U.esc(U.money(totals.charges)) + '</dd>' +
              '<dt>VAT ' + Store.state.hotel.taxRate + '%</dt><dd>' + U.esc(U.money(totals.tax)) + '</dd>' +
              '<dt>Payments</dt><dd>−' + U.esc(U.money(totals.payments)) + '</dd>' +
            '</dl>' +
          '</div>' +
          '<div>' +
            '<div class="balancebox ' + (totals.balance > 0.01 ? 'is-open' : 'is-clear') + '">' +
              '<span>' + (totals.balance > 0.01 ? 'To settle now' : 'Nothing to settle') + '</span>' +
              '<b>' + U.esc(U.money(totals.balance)) + '</b>' +
            '</div>' +
            (totals.balance > 0.01
              ? '<div class="field mt-sm"><label for="coMethod">Settle with</label>' +
                '<select class="select" id="coMethod">' +
                  '<option value="Card ••4821">Card</option>' +
                  '<option value="Cash">Cash</option>' +
                  '<option value="Bank transfer">Bank transfer</option>' +
                  '<option value="Channel collect">Collected by channel</option>' +
                '</select></div>'
              : '') +
            '<label class="check mt-sm"><input type="checkbox" id="coInvoice" checked><span>Open the invoice after checking out</span></label>' +
          '</div>' +
        '</div>',
      footer:
        '<button class="btn btn--sm" id="coCharge"><span data-icon="plus"></span>Add charge</button>' +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="coGo"><span data-icon="log-out"></span>' +
        (totals.balance > 0.01 ? 'Settle &amp; check out' : 'Check out') + '</button>'
    });

    m.el.querySelector('#coCharge').addEventListener('click', function () {
      m.close();
      Views.bookings.openDetail(b.id);
      UI.toast('Folio open', 'Add the charge, then check out from here.', 'info');
    });

    m.el.querySelector('#coGo').addEventListener('click', function () {
      const methodEl = m.el.querySelector('#coMethod');
      const wantInvoice = m.el.querySelector('#coInvoice').checked;

      try {
        Store.update('frontdesk:checkout', function () {
          Domain.checkOut(b.id, { settle: true, method: methodEl ? methodEl.value : undefined });
          Store.log('Checked out ' + Store.guestName(b.guestId) + ' · room ' + (room ? room.number : '—') +
            ' · ' + U.money(totals.grossWithTax), 'log-out', '#/frontdesk', 'frontdesk');
        });

        m.close();
        UI.toast('Checked out', Store.guestName(b.guestId) + ' · room ' + (room ? room.number : '—') +
          ' released for cleaning', 'ok');

        if (wantInvoice) setTimeout(() => Views.bookings.openDetail(b.id), 200);
      } catch (e) {
        UI.toast('Check-out failed', e.message, 'error');
      }
    });
  }

})(window);
