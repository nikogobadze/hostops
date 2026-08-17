/* ============================================================
   View — Reservations (list, editor, detail + folio)
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  // Default to current-and-future: an operator almost always wants what is
  // still ahead, and with hundreds of past stays on file an ascending "all
  // dates" list buries every new booking below the row cap.
  const filters = { q: '', status: 'active', channel: '', when: 'future', sort: 'checkIn' };

  Views.bookings = {
    title: 'Reservations',
    subtitle: function () {
      const n = Store.state.bookings.length;
      return n + ' reservation' + (n === 1 ? '' : 's') + ' on file · ' + Domain.inHouse().length + ' currently in house';
    },

    render: function (host, params) {
      const rows = query();

      host.innerHTML =
        '<div class="stack">' +
          '<div class="card card--flush">' +
            toolbar(rows.length) +
            (rows.length ? table(rows) : UI.empty({
              icon: 'book',
              title: 'No reservations match',
              message: 'Try a different status, channel or search term.'
            })) +
          '</div>' +
        '</div>';

      wire(host);

      if (params && params.id) {
        Views.bookings.openDetail(params.id);
        history.replaceState(null, '', '#/bookings');
      }
    },

    openEditor: openEditor,
    openDetail: openDetail
  };

  /* ============================================================
     list
     ============================================================ */

  function query() {
    const today = U.today();
    const q = filters.q.toLowerCase();

    let rows = Store.state.bookings.filter(b => {
      if (filters.status === 'active' && (b.status === 'cancelled' || b.status === 'no_show')) return false;
      if (filters.status !== 'active' && filters.status !== '' && b.status !== filters.status) return false;
      if (filters.channel && b.channel !== filters.channel) return false;

      if (filters.when === 'today' && !(b.checkIn === today || b.checkOut === today)) return false;
      if (filters.when === 'week' && !(b.checkIn >= today && b.checkIn <= U.addDays(today, 7))) return false;
      if (filters.when === 'future' && b.checkOut < today) return false;
      if (filters.when === 'past' && b.checkOut >= today) return false;

      if (q) {
        const g = Store.guest(b.guestId);
        const room = Store.room(b.roomId);
        const hay = [b.ref, b.channelRef, g ? g.firstName + ' ' + g.lastName : '', g ? g.email : '', room ? room.number : '']
          .join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    const dir = filters.sort === 'created' ? -1 : 1;
    rows.sort((a, b) => {
      if (filters.sort === 'created') return U.cmp(b.createdAt, a.createdAt);
      if (filters.sort === 'room') return U.cmp(Domain.roomNo(a), Domain.roomNo(b));
      if (filters.sort === 'guest') return U.cmp(Store.guestName(a.guestId), Store.guestName(b.guestId));
      return U.cmp(a.checkIn, b.checkIn) * dir;
    });

    return rows;
  }

  function toolbar(count) {
    return '<div class="card__head" style="flex-wrap:wrap;gap:10px">' +
      '<div class="searchbox" style="margin:0;width:250px">' +
        '<span class="searchbox__icon" data-icon="search"></span>' +
        '<input type="search" id="bkSearch" placeholder="Reference, guest, room…" value="' + U.esc(filters.q) + '">' +
      '</div>' +
      '<select class="select" id="bkStatus" style="width:auto;height:36px" aria-label="Status">' +
        opt('active', 'Active only', filters.status) +
        opt('', 'All statuses', filters.status) +
        opt('confirmed', 'Confirmed', filters.status) +
        opt('in_house', 'In house', filters.status) +
        opt('checked_out', 'Checked out', filters.status) +
        opt('cancelled', 'Cancelled', filters.status) +
        opt('no_show', 'No show', filters.status) +
      '</select>' +
      '<select class="select" id="bkChannel" style="width:auto;height:36px" aria-label="Channel">' +
        opt('', 'All channels', filters.channel) +
        opt('direct', 'Direct', filters.channel) +
        opt('booking', 'Booking.com', filters.channel) +
        opt('airbnb', 'Airbnb', filters.channel) +
      '</select>' +
      '<select class="select" id="bkWhen" style="width:auto;height:36px" aria-label="Period">' +
        opt('all', 'Any date', filters.when) +
        opt('today', 'Touching today', filters.when) +
        opt('week', 'Arriving in 7 days', filters.when) +
        opt('future', 'Current & future', filters.when) +
        opt('past', 'Past stays', filters.when) +
      '</select>' +
      '<div class="spacer"></div>' +
      '<span class="small muted">' + count + ' shown</span>' +
      '<button class="btn btn--sm" id="bkExport"><span data-icon="download"></span>CSV</button>' +
      '<button class="btn btn--primary btn--sm" id="bkNew"><span data-icon="plus"></span>New booking</button>' +
    '</div>';
  }

  function opt(value, label, current) {
    return '<option value="' + U.esc(value) + '"' + (String(current) === String(value) ? ' selected' : '') + '>' + U.esc(label) + '</option>';
  }

  function table(rows) {
    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Reference</th><th>Guest</th><th>Room</th><th>Stay</th><th>Channel</th>' +
      '<th class="num">Rate</th><th class="num">Total</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.slice(0, 300).map(b => {
        const g = Store.guest(b.guestId);
        const room = Store.room(b.roomId);
        const type = Store.roomType(b.typeId);
        const nights = U.nights(b.checkIn, b.checkOut);
        return '<tr class="is-clickable" data-open="' + b.id + '">' +
          '<td><div class="cellstack"><strong>' + U.esc(b.ref) + '</strong>' +
            (b.channelRef ? '<span class="mono">' + U.esc(b.channelRef) + '</span>' : '<span>' + U.esc(U.fmtDateLong(U.today(new Date(b.createdAt)))) + '</span>') +
          '</div></td>' +
          '<td>' + UI.guestCell(g, g ? g.country + (g.prefs ? ' · ' + U.truncate(g.prefs, 22) : '') : '') + '</td>' +
          '<td><div class="row gap-sm"><span class="roomno">' + U.esc(room ? room.number : '—') + '</span>' +
            '<span class="small muted quick-hide">' + U.esc(type ? type.code : '') + '</span></div></td>' +
          '<td class="nowrap"><div class="cellstack"><strong>' + U.esc(U.fmtDate(b.checkIn)) + ' → ' + U.esc(U.fmtDate(b.checkOut)) + '</strong>' +
            '<span>' + nights + ' night' + (nights === 1 ? '' : 's') + ' · ' + b.adults + ' adult' + (b.adults === 1 ? '' : 's') +
            (b.children ? ' + ' + b.children + ' child' : '') + '</span></div></td>' +
          '<td>' + UI.channelKey(b.channel) + '</td>' +
          '<td class="num nowrap">' + U.esc(U.money(b.rate, null, { decimals: 0 })) + '</td>' +
          '<td class="num nowrap strong">' + U.esc(U.money(b.rate * nights, null, { decimals: 0 })) + '</td>' +
          '<td>' + UI.bookingBadge(b.status) + '</td>' +
          '<td><div class="rowactions">' +
            (b.status === 'confirmed' ? '<button class="iconbtn iconbtn--bare" data-checkin="' + b.id + '" title="Check in" data-icon="log-in"></button>' : '') +
            (b.status === 'in_house' ? '<button class="iconbtn iconbtn--bare" data-checkout="' + b.id + '" title="Check out" data-icon="log-out"></button>' : '') +
            '<button class="iconbtn iconbtn--bare" data-edit="' + b.id + '" title="Edit" data-icon="edit"></button>' +
          '</div></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      (rows.length > 300 ? '<p class="small muted" style="padding:10px 16px">Showing the first 300 of ' + rows.length + '. Narrow the filters to see the rest.</p>' : '');
  }

  function wire(host) {
    const search = host.querySelector('#bkSearch');
    if (search) {
      search.addEventListener('input', U.debounce(function () {
        filters.q = search.value;
        App.render();
        const s = document.querySelector('#bkSearch');
        if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
      }, 260));
    }

    U.on(host, 'change', '#bkStatus', (e, el) => { filters.status = el.value; App.render(); });
    U.on(host, 'change', '#bkChannel', (e, el) => { filters.channel = el.value; App.render(); });
    U.on(host, 'change', '#bkWhen', (e, el) => { filters.when = el.value; App.render(); });

    U.on(host, 'click', '#bkNew', () => openEditor(null));
    U.on(host, 'click', '#bkExport', exportCSV);

    U.on(host, 'click', '[data-open]', function (e, el) {
      if (e.target.closest('.rowactions')) return;
      openDetail(el.dataset.open);
    });
    U.on(host, 'click', '[data-edit]', function (e, el) { e.stopPropagation(); openEditor(el.dataset.edit); });
    U.on(host, 'click', '[data-checkin]', function (e, el) { e.stopPropagation(); Views.frontdesk.doCheckIn(el.dataset.checkin); });
    U.on(host, 'click', '[data-checkout]', function (e, el) { e.stopPropagation(); Views.frontdesk.doCheckOut(el.dataset.checkout); });
  }

  function exportCSV() {
    const rows = query();
    const head = ['Reference', 'Channel ref', 'Guest', 'Email', 'Room', 'Type', 'Arrival', 'Departure', 'Nights',
      'Adults', 'Children', 'Rate', 'Total', 'Channel', 'Status', 'Payment'];
    const body = rows.map(b => {
      const g = Store.guest(b.guestId);
      const room = Store.room(b.roomId);
      const type = Store.roomType(b.typeId);
      const n = U.nights(b.checkIn, b.checkOut);
      return [b.ref, b.channelRef || '', g ? g.firstName + ' ' + g.lastName : '', g ? g.email : '',
        room ? room.number : '', type ? type.name : '', b.checkIn, b.checkOut, n, b.adults, b.children,
        b.rate, b.rate * n, UI.CHANNEL_LABEL[b.channel], b.status, b.paymentStatus];
    });
    U.download('hostops-reservations-' + U.today() + '.csv', U.toCSV([head].concat(body)), 'text/csv;charset=utf-8');
    UI.toast('Export ready', rows.length + ' reservations written to CSV.', 'ok');
  }

  /* ============================================================
     editor
     ============================================================ */

  function openEditor(bookingId, prefill) {
    const existing = bookingId ? Store.booking(bookingId) : null;
    const p = prefill || {};
    const today = U.today();

    const model = existing ? Object.assign({}, existing) : {
      guestId: '',
      roomId: p.roomId || '',
      checkIn: p.checkIn || today,
      checkOut: p.checkOut || U.addDays(today, 1),
      adults: 2, children: 0,
      rate: null,
      channel: 'direct',
      breakfast: false,
      paymentStatus: 'guaranteed',
      notes: ''
    };

    const guests = Store.state.guests.slice().sort((a, b) => U.cmp(a.lastName, b.lastName));

    const m = UI.modal({
      title: existing ? 'Edit ' + existing.ref : 'New reservation',
      subtitle: existing ? Store.guestName(existing.guestId) : 'Availability is checked as you pick dates',
      size: 'lg',
      body:
        '<form id="bkForm" novalidate>' +
          '<fieldset class="fieldset" style="margin-bottom:16px">' +
            '<legend>Guest</legend>' +
            '<div class="formgrid">' +
              UI.field({
                label: 'Existing guest', name: 'guestId', type: 'select', span2: true,
                value: model.guestId,
                options: [{ value: '', label: '— New guest —' }].concat(
                  guests.map(g => ({ value: g.id, label: g.lastName + ', ' + g.firstName + ' (' + g.country + ')' })))
              }) +
              '<div id="newGuestFields" class="formgrid span2" style="grid-column:1/-1' + (model.guestId ? ';display:none' : '') + '">' +
                UI.field({ label: 'First name', name: 'firstName', placeholder: 'Nino' }) +
                UI.field({ label: 'Last name', name: 'lastName', placeholder: 'Beridze' }) +
                UI.field({ label: 'Email', name: 'email', type: 'email', placeholder: 'guest@example.com' }) +
                UI.field({ label: 'Phone', name: 'phone', placeholder: '+995 555 12 34 56' }) +
              '</div>' +
            '</div>' +
          '</fieldset>' +

          '<fieldset class="fieldset" style="margin-bottom:16px">' +
            '<legend>Stay</legend>' +
            '<div class="formgrid">' +
              UI.field({ label: 'Arrival', name: 'checkIn', type: 'date', value: model.checkIn, required: true }) +
              UI.field({ label: 'Departure', name: 'checkOut', type: 'date', value: model.checkOut, required: true }) +
              '<div class="field span2" style="grid-column:1/-1">' +
                '<label for="roomSelect">Room</label>' +
                '<select class="select" id="roomSelect" name="roomId"></select>' +
                '<span class="hint" id="roomHint">Only rooms free for the whole stay are listed.</span>' +
                '<span class="err" data-err-for="roomId" hidden></span>' +
              '</div>' +
              UI.field({ label: 'Adults', name: 'adults', type: 'number', min: 1, max: 6, value: model.adults }) +
              UI.field({ label: 'Children', name: 'children', type: 'number', min: 0, max: 4, value: model.children }) +
            '</div>' +
          '</fieldset>' +

          '<fieldset class="fieldset">' +
            '<legend>Commercials</legend>' +
            '<div class="formgrid">' +
              UI.field({
                label: 'Nightly rate', name: 'rate', type: 'number', min: 0, step: 1,
                value: model.rate === null ? '' : model.rate,
                hint: 'Leave blank to use the rate plan'
              }) +
              UI.field({
                label: 'Channel', name: 'channel', type: 'select', value: model.channel,
                options: [
                  { value: 'direct', label: 'Direct' },
                  { value: 'booking', label: 'Booking.com' },
                  { value: 'airbnb', label: 'Airbnb' }
                ]
              }) +
              UI.field({
                label: 'Payment', name: 'paymentStatus', type: 'select', value: model.paymentStatus,
                options: [
                  { value: 'guaranteed', label: 'Guaranteed (pay at hotel)' },
                  { value: 'prepaid', label: 'Prepaid' },
                  { value: 'deposit', label: 'Deposit taken' },
                  { value: 'paid', label: 'Paid in full' }
                ]
              }) +
              '<div class="field" style="justify-content:flex-end;padding-bottom:8px">' +
                UI.switchField({ label: 'Breakfast included', name: 'breakfast', checked: model.breakfast }) +
              '</div>' +
              UI.field({ label: 'Notes', name: 'notes', type: 'textarea', value: model.notes, span2: true, placeholder: 'Late arrival, allergies, special requests…' }) +
            '</div>' +
            '<div id="quoteBox" class="quote"></div>' +
          '</fieldset>' +
        '</form>',
      footer:
        (existing ? '<button class="btn btn--danger btn--sm" id="bkDelete"><span data-icon="trash"></span>Delete</button>' : '') +
        '<span class="spacer"></span>' +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="bkSave">' + (existing ? 'Save changes' : 'Create reservation') + '</button>'
    });

    const form = m.el.querySelector('#bkForm');
    const roomSelect = m.el.querySelector('#roomSelect');
    const guestSelect = form.querySelector('[name=guestId]');
    const newGuestFields = m.el.querySelector('#newGuestFields');

    function refreshRooms() {
      const data = UI.formData(form);
      const from = data.checkIn, to = data.checkOut;
      const hint = m.el.querySelector('#roomHint');

      if (!from || !to || to <= from) {
        roomSelect.innerHTML = '<option value="">Pick valid dates first</option>';
        hint.textContent = 'Departure must be after arrival.';
        refreshQuote();
        return;
      }

      const free = Domain.availableRooms(from, to, { excludeBookingId: bookingId });
      const currentRoom = existing ? Store.room(existing.roomId) : null;
      const list = free.slice();
      if (currentRoom && !list.some(r => r.id === currentRoom.id)) list.unshift(currentRoom);

      const chosen = model.roomId && list.some(r => r.id === model.roomId) ? model.roomId
        : (roomSelect.value && list.some(r => r.id === roomSelect.value) ? roomSelect.value : (list[0] ? list[0].id : ''));

      roomSelect.innerHTML = list.length
        ? list.sort((a, b) => U.cmp(a.number, b.number)).map(r => {
          const t = Store.roomType(r.typeId);
          return '<option value="' + r.id + '"' + (r.id === chosen ? ' selected' : '') + '>' +
            'Room ' + U.esc(r.number) + ' · ' + U.esc(t ? t.name : '') + ' · ' + U.esc(U.money(Domain.quote(r.typeId, from, to), null, { decimals: 0 })) + '/night' +
            '</option>';
        }).join('')
        : '<option value="">No rooms free for these dates</option>';

      hint.textContent = list.length
        ? list.length + ' of ' + Store.state.rooms.length + ' rooms free for ' + U.nights(from, to) + ' night' + (U.nights(from, to) === 1 ? '' : 's')
        : 'Nothing available — try different dates.';

      refreshQuote();
    }

    function refreshQuote() {
      const data = UI.formData(form);
      const box = m.el.querySelector('#quoteBox');
      const room = Store.room(roomSelect.value);
      if (!room || !data.checkIn || !data.checkOut || data.checkOut <= data.checkIn) { box.innerHTML = ''; return; }

      const nights = U.nights(data.checkIn, data.checkOut);
      const rate = data.rate ? Number(data.rate) : Domain.quote(room.typeId, data.checkIn, data.checkOut);
      const accom = rate * nights;
      const bfast = data.breakfast ? Store.state.hotel.breakfastPrice * (Number(data.adults) || 1) * nights : 0;
      const tax = U.round2((accom + bfast) * (Store.state.hotel.taxRate / 100));
      const city = U.round2(Store.state.hotel.cityTax * ((Number(data.adults) || 1) + (Number(data.children) || 0)) * nights);

      box.innerHTML =
        '<div class="quote__row"><span>' + nights + ' night' + (nights === 1 ? '' : 's') + ' × ' + U.esc(U.money(rate, null, { decimals: 0 })) + '</span><b>' + U.esc(U.money(accom)) + '</b></div>' +
        (bfast ? '<div class="quote__row"><span>Breakfast</span><b>' + U.esc(U.money(bfast)) + '</b></div>' : '') +
        '<div class="quote__row"><span>VAT ' + Store.state.hotel.taxRate + '%</span><b>' + U.esc(U.money(tax)) + '</b></div>' +
        '<div class="quote__row"><span>City tax</span><b>' + U.esc(U.money(city)) + '</b></div>' +
        '<div class="quote__row quote__row--total"><span>Estimated total</span><b>' + U.esc(U.money(accom + bfast + tax + city)) + '</b></div>';
    }

    ['checkIn', 'checkOut'].forEach(n => {
      form.querySelector('[name=' + n + ']').addEventListener('change', function () {
        model.roomId = '';
        refreshRooms();
      });
    });
    roomSelect.addEventListener('change', refreshQuote);
    ['rate', 'adults', 'children'].forEach(n => form.querySelector('[name=' + n + ']').addEventListener('input', refreshQuote));
    form.querySelector('[name=breakfast]').addEventListener('change', refreshQuote);

    guestSelect.addEventListener('change', function () {
      newGuestFields.style.display = guestSelect.value ? 'none' : '';
    });

    refreshRooms();

    if (existing) {
      // make sure the currently-assigned room stays selected
      roomSelect.value = existing.roomId;
      refreshQuote();
    }

    m.el.querySelector('#bkSave').addEventListener('click', function () {
      const data = UI.formData(form);
      data.roomId = roomSelect.value;

      const errors = Domain.validateBooking(data, bookingId);
      if (!data.guestId) {
        if (!data.firstName) errors.firstName = 'First name is required.';
        if (!data.lastName) errors.lastName = 'Last name is required.';
      }
      if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }
      UI.setErrors(form, {});

      Store.update('booking:save', function (s) {
        let guestId = data.guestId;
        if (!guestId) {
          const g = {
            id: U.uid('g'),
            firstName: data.firstName.trim(), lastName: data.lastName.trim(),
            email: (data.email || '').trim(), phone: (data.phone || '').trim(),
            country: '—', vip: false, docType: 'Passport', docId: '', notes: '', prefs: '',
            marketingOptIn: false, createdAt: new Date().toISOString()
          };
          s.guests.push(g);
          guestId = g.id;
        }

        const room = Store.room(data.roomId);
        const rate = data.rate ? Number(data.rate) : Domain.quote(room.typeId, data.checkIn, data.checkOut);

        if (existing) {
          Object.assign(existing, {
            guestId: guestId, roomId: data.roomId, typeId: room.typeId,
            checkIn: data.checkIn, checkOut: data.checkOut,
            adults: Number(data.adults) || 1, children: Number(data.children) || 0,
            rate: rate, channel: data.channel, breakfast: !!data.breakfast,
            paymentStatus: data.paymentStatus, notes: data.notes
          });
          Store.log('Reservation ' + existing.ref + ' updated', 'edit', '#/bookings', 'booking');
        } else {
          const b = Domain.createBooking({
            guestId: guestId, roomId: data.roomId,
            checkIn: data.checkIn, checkOut: data.checkOut,
            adults: data.adults, children: data.children,
            rate: rate, channel: data.channel, breakfast: data.breakfast,
            paymentStatus: data.paymentStatus, notes: data.notes
          });
          Store.log('New ' + UI.CHANNEL_LABEL[b.channel] + ' reservation ' + b.ref + ' · room ' + room.number,
            'book', '#/bookings', 'booking');
        }
      });

      m.close();
      UI.toast(existing ? 'Reservation updated' : 'Reservation created',
        Store.guestName(existing ? existing.guestId : Store.state.bookings[Store.state.bookings.length - 1].guestId) +
        ' · ' + U.fmtDate(data.checkIn) + ' → ' + U.fmtDate(data.checkOut), 'ok');
    });

    const del = m.el.querySelector('#bkDelete');
    if (del) {
      del.addEventListener('click', async function () {
        const ok = await UI.confirm({
          title: 'Delete ' + existing.ref + '?',
          message: 'This removes the reservation and its folio permanently. Cancelling instead keeps the record for reporting.',
          confirmLabel: 'Delete permanently', tone: 'danger'
        });
        if (!ok) return;
        Store.update('booking:delete', function (s) {
          s.bookings = s.bookings.filter(b => b.id !== existing.id);
          s.folios = s.folios.filter(f => f.bookingId !== existing.id);
          Store.log('Reservation ' + existing.ref + ' deleted', 'trash', null, 'booking');
        });
        m.close();
        UI.toast('Reservation deleted', existing.ref, 'ok');
      });
    }
  }

  /* ============================================================
     detail
     ============================================================ */

  function openDetail(bookingId) {
    const b = Store.booking(bookingId);
    if (!b) { UI.toast('Not found', 'That reservation no longer exists.', 'warn'); return; }

    const g = Store.guest(b.guestId);
    const room = Store.room(b.roomId);
    const type = Store.roomType(b.typeId);
    const totals = Domain.folioTotals(b.id);
    const nights = U.nights(b.checkIn, b.checkOut);

    const m = UI.modal({
      title: b.ref + ' · ' + Store.guestName(b.guestId),
      subtitle: (room ? 'Room ' + room.number + ' · ' : '') + (type ? type.name : '') + ' · ' + U.stayLabel(b.checkIn, b.checkOut),
      size: 'lg',
      flush: true,
      body:
        '<div class="tabs">' +
          '<button class="is-active" data-tab="summary">Summary</button>' +
          '<button data-tab="folio">Folio' + (totals.balance > 0.01 ? ' · ' + U.money(totals.balance, null, { decimals: 0 }) : '') + '</button>' +
          '<button data-tab="guest">Guest</button>' +
        '</div>' +
        '<div id="bkTab" style="padding:20px"></div>',
      footer: footerFor(b)
    });

    const tabHost = m.el.querySelector('#bkTab');

    function paint(tab) {
      if (tab === 'folio') tabHost.innerHTML = folioPanel(b);
      else if (tab === 'guest') tabHost.innerHTML = guestPanel(g, b);
      else tabHost.innerHTML = summaryPanel(b, room, type, nights, totals);
      Icons.render(tabHost);
    }
    paint('summary');
    UI.tabs(m.el, paint);

    /* actions */
    U.on(m.el, 'click', '[data-act]', function (e, el) {
      const act = el.dataset.act;

      if (act === 'edit') { m.close(); openEditor(b.id); }

      if (act === 'checkin') { m.close(); Views.frontdesk.doCheckIn(b.id); }

      if (act === 'checkout') { m.close(); Views.frontdesk.doCheckOut(b.id); }

      if (act === 'move') { m.close(); openMove(b.id); }

      if (act === 'charge') { openCharge(b.id, () => paint('folio')); }

      if (act === 'payment') { openPayment(b.id, () => paint('folio')); }

      if (act === 'invoice') { printInvoice(b.id); }

      if (act === 'cancel') {
        UI.confirm({
          title: 'Cancel ' + b.ref + '?',
          message: 'The room is released back to availability immediately. The record is kept for reporting.',
          confirmLabel: 'Cancel reservation', tone: 'danger'
        }).then(ok => {
          if (!ok) return;
          Store.update('booking:cancel', () => {
            Domain.cancelBooking(b.id, 'Cancelled at the front desk');
            Store.log('Reservation ' + b.ref + ' cancelled', 'x-circle', '#/bookings', 'booking');
          });
          m.close();
          UI.toast('Reservation cancelled', b.ref + ' · room released', 'ok');
        });
      }

      if (act === 'calendar') {
        m.close();
        Views.calendar.focusDate(b.checkIn);
      }
    });
  }

  function footerFor(b) {
    let left = '';
    if (b.status === 'confirmed') left = '<button class="btn btn--primary" data-act="checkin"><span data-icon="log-in"></span>Check in</button>';
    else if (b.status === 'in_house') left = '<button class="btn btn--primary" data-act="checkout"><span data-icon="log-out"></span>Check out</button>';

    return left +
      (b.status === 'confirmed' || b.status === 'in_house'
        ? '<button class="btn" data-act="move"><span data-icon="arrow-right"></span>Move room</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn btn--ghost btn--sm" data-act="calendar"><span data-icon="calendar"></span>On calendar</button>' +
      (b.status !== 'cancelled' && b.status !== 'checked_out'
        ? '<button class="btn btn--ghost btn--sm" data-act="cancel">Cancel</button>' : '') +
      '<button class="btn" data-act="edit"><span data-icon="edit"></span>Edit</button>';
  }

  function summaryPanel(b, room, type, nights, totals) {
    const g = Store.guest(b.guestId);
    return '<div class="grid grid--2" style="gap:20px">' +
      '<div>' +
        '<p class="label" style="margin-bottom:10px">Reservation</p>' +
        '<dl class="deflist">' +
          '<dt>Status</dt><dd>' + UI.bookingBadge(b.status) + '</dd>' +
          '<dt>Channel</dt><dd>' + UI.channelKey(b.channel) + (b.channelRef ? ' <span class="mono muted">' + U.esc(b.channelRef) + '</span>' : '') + '</dd>' +
          '<dt>Arrival</dt><dd>' + U.esc(U.fmtDateLong(b.checkIn)) + ' <span class="muted small">from ' + U.esc(Store.state.hotel.checkInTime) + '</span></dd>' +
          '<dt>Departure</dt><dd>' + U.esc(U.fmtDateLong(b.checkOut)) + ' <span class="muted small">by ' + U.esc(Store.state.hotel.checkOutTime) + '</span></dd>' +
          '<dt>Nights</dt><dd>' + nights + '</dd>' +
          '<dt>Guests</dt><dd>' + b.adults + ' adult' + (b.adults === 1 ? '' : 's') + (b.children ? ' · ' + b.children + ' child' + (b.children === 1 ? '' : 'ren') : '') + '</dd>' +
          '<dt>Room</dt><dd>' + (room ? U.esc(room.number) + ' · ' + U.esc(type ? type.name : '') : '<span class="muted">unassigned</span>') + '</dd>' +
          '<dt>Breakfast</dt><dd>' + (b.breakfast ? 'Included' : 'Not included') + '</dd>' +
          '<dt>Booked</dt><dd>' + U.esc(U.fmtDateTime(b.createdAt)) + '</dd>' +
          (b.checkedInAt ? '<dt>Checked in</dt><dd>' + U.esc(U.fmtDateTime(b.checkedInAt)) + '</dd>' : '') +
          (b.checkedOutAt ? '<dt>Checked out</dt><dd>' + U.esc(U.fmtDateTime(b.checkedOutAt)) + '</dd>' : '') +
        '</dl>' +
        (b.notes ? '<div class="notebox mt"><span data-icon="info"></span><p>' + U.esc(b.notes) + '</p></div>' : '') +
      '</div>' +
      '<div>' +
        '<p class="label" style="margin-bottom:10px">Money</p>' +
        '<dl class="deflist">' +
          '<dt>Nightly rate</dt><dd>' + U.esc(U.money(b.rate)) + '</dd>' +
          '<dt>Accommodation</dt><dd>' + U.esc(U.money(b.rate * nights)) + '</dd>' +
          '<dt>Charges posted</dt><dd>' + U.esc(U.money(totals.charges)) + '</dd>' +
          '<dt>VAT ' + Store.state.hotel.taxRate + '%</dt><dd>' + U.esc(U.money(totals.tax)) + '</dd>' +
          '<dt>Paid</dt><dd>' + U.esc(U.money(totals.payments)) + '</dd>' +
          '<dt>Payment terms</dt><dd>' + U.esc(U.titleCase(b.paymentStatus)) + '</dd>' +
        '</dl>' +
        '<div class="balancebox mt ' + (totals.balance > 0.01 ? 'is-open' : 'is-clear') + '">' +
          '<span>' + (totals.balance > 0.01 ? 'Outstanding balance' : 'Balance settled') + '</span>' +
          '<b>' + U.esc(U.money(totals.balance)) + '</b>' +
        '</div>' +
        (g && g.prefs ? '<div class="notebox mt"><span data-icon="star"></span><p><b>Guest preference:</b> ' + U.esc(g.prefs) + '</p></div>' : '') +
      '</div>' +
    '</div>';
  }

  function folioPanel(b) {
    const totals = Domain.folioTotals(b.id);
    const f = Store.folioFor(b.id);
    const closed = f && f.closed;

    const rows = totals.items.length
      ? totals.items.slice().sort((a, c) => U.cmp(a.ts, c.ts)).map(i =>
        '<tr>' +
          '<td class="nowrap muted small">' + U.esc(U.fmtDateTime(i.ts)) + '</td>' +
          '<td>' + U.esc(i.desc) + '</td>' +
          '<td class="num">' + (i.type === 'payment' ? '' : i.qty) + '</td>' +
          '<td class="num">' + (i.type === 'payment' ? '' : U.esc(U.money(i.unitPrice))) + '</td>' +
          '<td class="num strong">' + U.esc(U.money(i.amount)) + '</td>' +
        '</tr>').join('')
      : '<tr><td colspan="5" class="muted" style="padding:18px;text-align:center">Nothing posted yet.</td></tr>';

    return '<div class="row" style="margin-bottom:12px">' +
        '<p class="label">Guest folio' + (closed ? ' · closed' : '') + '</p>' +
        '<span class="spacer"></span>' +
        (closed ? '' :
          '<button class="btn btn--sm" data-act="charge"><span data-icon="plus"></span>Add charge</button>' +
          '<button class="btn btn--sm btn--soft" data-act="payment"><span data-icon="credit-card"></span>Take payment</button>') +
        '<button class="btn btn--sm" data-act="invoice"><span data-icon="printer"></span>Invoice</button>' +
      '</div>' +
      '<div class="tablewrap"><table class="folio">' +
        '<thead><tr><th>When</th><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot>' +
          '<tr><td colspan="4" class="num">Charges</td><td class="num">' + U.esc(U.money(totals.charges)) + '</td></tr>' +
          '<tr><td colspan="4" class="num">VAT ' + Store.state.hotel.taxRate + '%</td><td class="num">' + U.esc(U.money(totals.tax)) + '</td></tr>' +
          '<tr><td colspan="4" class="num">Payments</td><td class="num">−' + U.esc(U.money(totals.payments)) + '</td></tr>' +
          '<tr class="total"><td colspan="4" class="num">Balance due</td><td class="num">' + U.esc(U.money(totals.balance)) + '</td></tr>' +
        '</tfoot>' +
      '</table></div>';
  }

  function guestPanel(g, b) {
    if (!g) return UI.empty({ icon: 'user', title: 'No guest record attached' });
    const history = Store.state.bookings
      .filter(x => x.guestId === g.id)
      .sort((a, c) => U.cmp(c.checkIn, a.checkIn));

    return '<div class="row" style="gap:14px;margin-bottom:16px">' +
        '<span class="who__av' + (g.vip ? ' is-vip' : '') + '" style="width:48px;height:48px;font-size:16px">' +
          U.esc(U.initials(g.firstName, g.lastName)) + '</span>' +
        '<div><h3 style="font-size:16px;font-weight:650">' + U.esc(g.firstName + ' ' + g.lastName) + '</h3>' +
        '<p class="small muted">' + U.esc(g.country) + ' · guest since ' + U.esc(U.fmtDateLong(U.today(new Date(g.createdAt)))) + '</p></div>' +
        '<span class="spacer"></span>' +
        (g.vip ? '<span class="badge badge--coral"><span data-icon="star"></span>VIP</span>' : '') +
      '</div>' +
      '<dl class="deflist">' +
        '<dt>Email</dt><dd>' + U.esc(g.email || '—') + '</dd>' +
        '<dt>Phone</dt><dd>' + U.esc(g.phone || '—') + '</dd>' +
        '<dt>Document</dt><dd>' + U.esc(g.docType || '—') + ' ' + U.esc(g.docId || '') + '</dd>' +
        '<dt>Preferences</dt><dd>' + U.esc(g.prefs || '—') + '</dd>' +
        '<dt>Marketing</dt><dd>' + (g.marketingOptIn ? 'Opted in' : 'Not opted in') + '</dd>' +
        '<dt>Stays</dt><dd>' + history.length + '</dd>' +
      '</dl>' +
      '<p class="label mt-lg" style="margin-bottom:8px">Stay history</p>' +
      '<div class="tablewrap"><table class="table">' +
        '<thead><tr><th>Reference</th><th>Stay</th><th>Room</th><th>Status</th></tr></thead><tbody>' +
        history.slice(0, 10).map(x => {
          const r = Store.room(x.roomId);
          return '<tr' + (x.id === b.id ? ' style="background:var(--sky-50)"' : '') + '>' +
            '<td class="strong">' + U.esc(x.ref) + '</td>' +
            '<td class="nowrap">' + U.esc(U.stayLabel(x.checkIn, x.checkOut)) + '</td>' +
            '<td>' + U.esc(r ? r.number : '—') + '</td>' +
            '<td>' + UI.bookingBadge(x.status) + '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>';
  }

  /* ============================================================
     small dialogs
     ============================================================ */

  function openMove(bookingId) {
    const b = Store.booking(bookingId);
    const free = Domain.availableRooms(b.checkIn, b.checkOut, { excludeBookingId: b.id });
    if (!free.length) {
      UI.toast('No alternative rooms', 'Nothing else is free for those dates.', 'warn');
      return;
    }

    const m = UI.modal({
      title: 'Move ' + b.ref,
      subtitle: 'Currently in room ' + (Store.room(b.roomId) || {}).number,
      size: 'sm',
      body: '<div class="field"><label for="moveTo">Move to</label><select class="select" id="moveTo">' +
        free.sort((x, y) => U.cmp(x.number, y.number)).map(r => {
          const t = Store.roomType(r.typeId);
          return '<option value="' + r.id + '">Room ' + U.esc(r.number) + ' · ' + U.esc(t ? t.name : '') + '</option>';
        }).join('') +
        '</select><span class="hint">Only rooms free for the whole stay are listed.</span></div>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="moveGo">Move room</button>'
    });

    m.el.querySelector('#moveGo').addEventListener('click', function () {
      const to = m.el.querySelector('#moveTo').value;
      try {
        Store.update('booking:move', () => {
          const room = Store.room(to);
          Domain.moveBooking(b.id, to);
          Store.log('Reservation ' + b.ref + ' moved to room ' + room.number, 'arrow-right', '#/bookings', 'booking');
        });
        m.close();
        UI.toast('Room changed', b.ref + ' is now in room ' + Store.room(to).number, 'ok');
      } catch (e) {
        UI.toast('Could not move', e.message, 'error');
      }
    });
  }

  function openCharge(bookingId, onDone) {
    const m = UI.modal({
      title: 'Add a charge',
      size: 'sm',
      body: '<form id="chForm"><div class="formgrid">' +
        UI.field({ label: 'Description', name: 'desc', placeholder: 'Laundry service', span2: true, autofocus: true }) +
        UI.field({ label: 'Quantity', name: 'qty', type: 'number', min: 1, value: 1 }) +
        UI.field({ label: 'Unit price', name: 'unitPrice', type: 'number', min: 0, step: '0.01', value: '' }) +
        UI.field({
          label: 'Category', name: 'type', type: 'select', span2: true, value: 'service',
          options: [
            { value: 'service', label: 'Service' },
            { value: 'fnb', label: 'Food & beverage' },
            { value: 'minibar', label: 'Mini bar' },
            { value: 'room', label: 'Accommodation' },
            { value: 'other', label: 'Other' }
          ]
        }) +
        '</div></form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="chGo">Post charge</button>'
    });

    m.el.querySelector('#chGo').addEventListener('click', function () {
      const form = m.el.querySelector('#chForm');
      const d = UI.formData(form);
      if (!d.desc || !d.unitPrice) {
        UI.setErrors(form, {
          desc: d.desc ? '' : 'Describe the charge.',
          unitPrice: d.unitPrice ? '' : 'Enter a price.'
        });
        return;
      }
      Store.update('folio:charge', () => {
        Domain.postCharge(bookingId, { type: d.type, desc: d.desc, qty: Number(d.qty) || 1, unitPrice: Number(d.unitPrice) });
      });
      m.close();
      UI.toast('Charge posted', d.desc + ' · ' + U.money((Number(d.qty) || 1) * Number(d.unitPrice)), 'ok');
      if (onDone) onDone();
    });
  }

  function openPayment(bookingId, onDone) {
    const totals = Domain.folioTotals(bookingId);
    const m = UI.modal({
      title: 'Take a payment',
      subtitle: 'Balance due ' + U.money(totals.balance),
      size: 'sm',
      body: '<form id="pyForm"><div class="formgrid">' +
        UI.field({ label: 'Amount', name: 'amount', type: 'number', min: 0, step: '0.01', value: Math.max(0, totals.balance).toFixed(2), autofocus: true }) +
        UI.field({
          label: 'Method', name: 'method', type: 'select', value: 'Card ••4821',
          options: [
            { value: 'Card ••4821', label: 'Card' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Bank transfer', label: 'Bank transfer' },
            { value: 'Channel collect', label: 'Collected by channel' }
          ]
        }) +
        '</div></form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="pyGo">Record payment</button>'
    });

    m.el.querySelector('#pyGo').addEventListener('click', function () {
      const d = UI.formData(m.el.querySelector('#pyForm'));
      const amt = Number(d.amount);
      if (!amt || amt <= 0) { UI.toast('Enter an amount', 'The payment must be greater than zero.', 'warn'); return; }
      Store.update('folio:payment', () => {
        Domain.postPayment(bookingId, amt, d.method);
        const b = Store.booking(bookingId);
        Store.log('Payment ' + U.money(amt) + ' received for ' + b.ref, 'credit-card', '#/bookings', 'money');
      });
      m.close();
      UI.toast('Payment recorded', U.money(amt) + ' · ' + d.method, 'ok');
      if (onDone) onDone();
    });
  }

  /** Opens a print-ready invoice in a new window. */
  function printInvoice(bookingId) {
    const b = Store.booking(bookingId);
    const g = Store.guest(b.guestId);
    const room = Store.room(b.roomId);
    const h = Store.state.hotel;
    const totals = Domain.folioTotals(b.id);

    const rows = totals.items.slice().sort((a, c) => U.cmp(a.ts, c.ts)).map(i =>
      '<tr><td>' + U.esc(U.fmtDateTime(i.ts)) + '</td><td>' + U.esc(i.desc) + '</td>' +
      '<td class="n">' + (i.type === 'payment' ? '' : i.qty) + '</td>' +
      '<td class="n">' + U.esc(U.money(i.amount)) + '</td></tr>').join('');

    const doc =
      '<!doctype html><html><head><meta charset="utf-8"><title>Invoice ' + U.esc(b.ref) + '</title>' +
      '<style>' +
      'body{font:13px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0F1E2B;margin:40px;max-width:720px}' +
      'h1{font-size:22px;margin:0 0 2px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#7690A3;margin:26px 0 8px}' +
      '.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #F0603F;padding-bottom:14px}' +
      '.muted{color:#7690A3}table{width:100%;border-collapse:collapse;margin-top:6px}' +
      'th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#7690A3;border-bottom:1px solid #DFE9F0;padding:7px 6px}' +
      'td{padding:7px 6px;border-bottom:1px solid #EEF4F8}.n{text-align:right;font-variant-numeric:tabular-nums}' +
      'tfoot td{border:0;font-weight:600}tfoot tr:last-child td{border-top:2px solid #0F1E2B;font-size:16px;padding-top:10px}' +
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px}' +
      '@media print{body{margin:0}}' +
      '</style></head><body>' +
      '<div class="head"><div><h1>' + U.esc(h.name) + '</h1><p class="muted">' + U.esc(h.address) + '<br>' + U.esc(h.email) + ' · ' + U.esc(h.phone) + '</p></div>' +
      '<div style="text-align:right"><h1>Invoice</h1><p class="muted">' + U.esc(b.ref) + '<br>' + U.esc(U.fmtDateLong(U.today())) + '</p></div></div>' +
      '<div class="grid"><div><h2>Billed to</h2><p><b>' + U.esc(Store.guestName(b.guestId)) + '</b><br>' +
        U.esc(g ? g.email : '') + '<br>' + U.esc(g ? g.phone : '') + '</p></div>' +
      '<div><h2>Stay</h2><p>Room ' + U.esc(room ? room.number : '—') + '<br>' +
        U.esc(U.fmtDateLong(b.checkIn)) + ' → ' + U.esc(U.fmtDateLong(b.checkOut)) + '<br>' +
        U.nights(b.checkIn, b.checkOut) + ' nights · ' + b.adults + ' adults</p></div></div>' +
      '<h2>Charges</h2><table><thead><tr><th>Date</th><th>Description</th><th class="n">Qty</th><th class="n">Amount</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot>' +
      '<tr><td colspan="3" class="n">Subtotal</td><td class="n">' + U.esc(U.money(totals.charges)) + '</td></tr>' +
      '<tr><td colspan="3" class="n">VAT ' + h.taxRate + '%</td><td class="n">' + U.esc(U.money(totals.tax)) + '</td></tr>' +
      '<tr><td colspan="3" class="n">Payments received</td><td class="n">−' + U.esc(U.money(totals.payments)) + '</td></tr>' +
      '<tr><td colspan="3" class="n">Balance due</td><td class="n">' + U.esc(U.money(totals.balance)) + '</td></tr>' +
      '</tfoot></table>' +
      '<p class="muted" style="margin-top:30px;font-size:11px">Generated by HostOps · ' + U.esc(new Date().toLocaleString()) + '</p>' +
      '</body></html>';

    const w = window.open('', '_blank');
    if (!w) { UI.toast('Pop-up blocked', 'Allow pop-ups to print the invoice.', 'warn'); return; }
    w.document.write(doc);
    w.document.close();
    setTimeout(() => w.print(), 260);
  }

})(window);
