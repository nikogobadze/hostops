/* ============================================================
   View — Availability calendar (rooms × dates timeline)
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  const COL = 46;       // px per day — must match --cal-col
  const SIDE = 186;     // px of the sticky room column — must match --cal-side

  const state = {
    start: null,        // first visible date
    days: null,         // visible span
    typeFilter: '',
    floorFilter: '',
    channelFilter: ''
  };

  Views.calendar = {
    title: 'Availability',
    subtitle: function () {
      const s = state.start || defaultStart();
      const d = state.days || Store.state.prefs.calendarDays || 21;
      return U.fmtDateLong(s) + ' → ' + U.fmtDateLong(U.addDays(s, d - 1)) + ' · ' + d + ' days';
    },

    render: function (host, params) {
      if (!state.start) state.start = defaultStart();
      if (!state.days) state.days = Store.state.prefs.calendarDays || 21;
      if (params && params.date) state.start = params.date;

      const start = state.start;
      const days = state.days;
      const dates = [];
      for (let i = 0; i < days; i++) dates.push(U.addDays(start, i));
      const today = U.today();

      const rooms = visibleRooms();
      const stats = dates.map(d => Domain.statsFor(d));

      host.innerHTML =
        '<div class="stack">' +
          summaryStrip(dates, stats) +
          '<div class="card card--flush">' +
            toolbar(start, days) +
            '<div class="cal" id="calScroll" style="--cal-col:' + COL + 'px;--cal-side:' + SIDE + 'px">' +
              '<div class="cal__inner">' +
                head(dates, stats, today) +
                body(rooms, dates, today) +
              '</div>' +
            '</div>' +
            legend() +
          '</div>' +
        '</div>';

      wire(host, dates);

      // bring today into view on first paint
      const scroll = host.querySelector('#calScroll');
      const idx = dates.indexOf(today);
      if (idx > 3) scroll.scrollLeft = (idx - 3) * COL;
    },

    /** Let other views jump the calendar to a date. */
    focusDate: function (date) {
      state.start = U.addDays(date, -2);
      location.hash = '#/calendar';
    }
  };

  /* ============================================================
     data
     ============================================================ */

  function defaultStart() {
    return U.addDays(U.today(), -2);
  }

  function visibleRooms() {
    return Store.state.rooms
      .filter(r => {
        if (state.typeFilter && r.typeId !== state.typeFilter) return false;
        if (state.floorFilter && String(r.floor) !== state.floorFilter) return false;
        return true;
      })
      .sort((a, b) => U.cmp(a.number, b.number));
  }

  /* ============================================================
     markup
     ============================================================ */

  function summaryStrip(dates, stats) {
    const today = U.today();
    const inWindow = stats.filter(s => s.date >= today);
    const avgOcc = inWindow.length ? U.sum(inWindow, s => s.occupancy) / inWindow.length : 0;
    const roomNights = U.sum(stats, s => s.occupied);
    const revenue = U.sum(stats, s => s.roomRevenue);
    const adr = roomNights ? revenue / roomNights : 0;
    const freeToday = Domain.sellableRoomsOn(today).length - Domain.statsFor(today).occupied;

    return '<div class="grid grid--kpi">' +
      UI.stat({ label: 'Average occupancy', icon: 'grid', valueHTML: Math.round(avgOcc) + '<small>%</small>', note: 'across the visible window' }) +
      UI.stat({ label: 'Room-nights on the books', icon: 'bed', valueHTML: U.num(roomNights), note: 'in this window' }) +
      UI.stat({ label: 'Forecast room revenue', icon: 'receipt', valueHTML: U.esc(U.moneyCompact(revenue)), note: 'ADR ' + U.money(adr, null, { decimals: 0 }) }) +
      UI.stat({ label: 'Free tonight', icon: 'door', valueHTML: U.num(freeToday), note: freeToday ? 'available to sell now' : 'sold out' }) +
    '</div>';
  }

  function toolbar(start, days) {
    const types = Store.state.roomTypes;
    const floors = U.unique(Store.state.rooms.map(r => r.floor)).sort();

    return '<div class="card__head" style="flex-wrap:wrap;gap:10px">' +
      '<div class="row gap-sm">' +
        '<button class="iconbtn" data-nav="-7" title="Previous week" data-icon="chevron-left"></button>' +
        '<button class="btn btn--sm" data-nav="today">Today</button>' +
        '<button class="iconbtn" data-nav="7" title="Next week" data-icon="chevron-right"></button>' +
      '</div>' +
      '<input class="input" type="date" id="calJump" value="' + U.esc(start) + '" style="width:150px;height:32px" aria-label="Jump to date">' +
      '<div class="seg" role="group" aria-label="Window length">' +
        [7, 14, 21, 30].map(n => '<button data-days="' + n + '"' + (days === n ? ' class="is-active"' : '') + '>' + n + 'd</button>').join('') +
      '</div>' +
      '<div class="spacer"></div>' +
      '<select class="select" id="calFloor" style="width:auto;height:32px" aria-label="Filter by floor">' +
        '<option value="">All floors</option>' +
        floors.map(f => '<option value="' + f + '"' + (state.floorFilter === String(f) ? ' selected' : '') + '>Floor ' + f + '</option>').join('') +
      '</select>' +
      '<select class="select" id="calType" style="width:auto;height:32px" aria-label="Filter by room type">' +
        '<option value="">All room types</option>' +
        types.map(t => '<option value="' + t.id + '"' + (state.typeFilter === t.id ? ' selected' : '') + '>' + U.esc(t.name) + '</option>').join('') +
      '</select>' +
      '<button class="btn btn--primary btn--sm" id="calNew"><span data-icon="plus"></span>New booking</button>' +
    '</div>';
  }

  function head(dates, stats, today) {
    let html = '<div class="cal__head">' +
      '<div class="cal__corner"><strong>Room</strong><span>' + Store.state.rooms.length + ' total</span></div>' +
      '<div class="cal__days">';

    dates.forEach((d, i) => {
      const s = stats[i];
      const cls = 'cal__day' + (U.isWeekend(d) ? ' is-weekend' : '') + (d === today ? ' is-today' : '');
      html += '<div class="' + cls + '" title="' + U.esc(U.fmtDate(d) + ' · ' + s.occupied + '/' + s.sellable + ' sold') + '">' +
        '<em>' + U.dowShort(d) + '</em>' +
        '<b>' + U.parse(d).getDate() + '</b>' +
        '<span class="cal__occ">' + s.occupied + '/' + s.sellable + '</span>' +
      '</div>';
    });

    return html + '</div></div>';
  }

  function body(rooms, dates, today) {
    const width = dates.length * COL;
    const byFloor = U.groupBy(rooms, r => r.floor);
    let html = '';

    byFloor.forEach((list, floor) => {
      const sold = list.filter(r => Domain.occupancyOn(today).some(b => b.roomId === r.id)).length;
      html += '<div class="cal__sectionrow">' +
        '<div class="cal__section">Floor ' + floor + '<span>' + sold + '/' + list.length + ' sold tonight</span></div>' +
        '<div class="cal__sectionfill" style="width:' + width + 'px"></div>' +
      '</div>';

      list.forEach(room => { html += roomRow(room, dates, today, width); });
    });

    if (!rooms.length) {
      html = '<div style="padding:8px">' + UI.empty({
        icon: 'door', title: 'No rooms match these filters',
        message: 'Clear the floor or room-type filter to see the full property.'
      }) + '</div>';
    }

    return html;
  }

  function roomRow(room, dates, today, width) {
    const type = Store.roomType(room.typeId);
    const from = dates[0];
    const to = U.addDays(dates[dates.length - 1], 1);

    let html = '<div class="cal__row" data-room="' + room.id + '">' +
      '<div class="cal__room" data-roominfo="' + room.id + '">' +
        '<span class="roomno">' + U.esc(room.number) + '</span>' +
        '<div class="cellstack"><strong>' + U.esc(type ? type.name : '—') + '</strong>' +
        '<span>' + (type ? type.capacity : '?') + ' guests · ' + U.esc(UI.ROOM_STATUS[room.status] ? UI.ROOM_STATUS[room.status].label : room.status) + '</span></div>' +
      '</div>' +
      '<div class="cal__track" style="width:' + width + 'px">' +
        '<div class="cal__cells">';

    dates.forEach(d => {
      const ooo = room.oooFrom && room.oooTo && room.oooFrom <= d && d < room.oooTo;
      const cls = 'cal__cell' + (U.isWeekend(d) ? ' is-weekend' : '') + (d === today ? ' is-today' : '') + (ooo ? ' is-ooo' : '');
      html += '<div class="' + cls + '" data-cell="' + room.id + '|' + d + '"' +
        (ooo ? ' title="Out of order: ' + U.esc(room.oooReason || 'maintenance') + '"' : '') + '></div>';
    });

    html += '</div>';

    // stay bars
    Domain.bookingsForRoom(room.id, from, to).forEach(b => {
      html += bar(b, dates, from, to);
    });

    return html + '</div></div>';
  }

  function bar(b, dates, from, to) {
    const startIdx = Math.max(0, U.nights(from, b.checkIn));
    const endIdx = Math.min(dates.length, U.nights(from, b.checkOut));
    const span = Math.max(1, endIdx - startIdx);
    const left = startIdx * COL + 1;
    const width = span * COL - 2;      // 2px of surface between touching stays

    const guest = Store.guest(b.guestId);
    const clipL = b.checkIn < from;
    const clipR = b.checkOut > to;

    const cls = ['calbar'];
    if (b.status === 'in_house') cls.push('is-in-house');
    if (b.status === 'checked_out') cls.push('is-checked-out');
    if (b.paymentStatus === 'guaranteed' && b.status === 'confirmed') cls.push('is-tentative');

    const icon = b.status === 'in_house' ? 'key' : b.status === 'checked_out' ? 'check' : '';
    const label = guest ? guest.lastName : 'Guest';
    const nights = U.nights(b.checkIn, b.checkOut);

    return '<div class="' + cls.join(' ') + '" data-ch="' + U.esc(b.channel) + '" data-bar="' + b.id + '" ' +
      'style="left:' + left + 'px;width:' + width + 'px' +
      (clipL ? ';border-top-left-radius:0;border-bottom-left-radius:0' : '') +
      (clipR ? ';border-top-right-radius:0;border-bottom-right-radius:0' : '') + '" ' +
      'title="' + U.esc(Store.guestName(b.guestId) + ' · ' + b.ref + ' · ' + U.stayLabel(b.checkIn, b.checkOut) +
        ' · ' + UI.CHANNEL_LABEL[b.channel] + ' · ' + U.money(b.rate) + '/night') + '">' +
      (icon ? '<span class="calbar__icon" data-icon="' + icon + '"></span>' : '') +
      '<span class="calbar__label">' + U.esc(width > 78 ? label : (width > 46 ? U.truncate(label, 6) : '')) + '</span>' +
      (width > 130 ? '<span style="margin-left:auto;opacity:.85;font-variant-numeric:tabular-nums">' + nights + 'n</span>' : '') +
    '</div>';
  }

  function legend() {
    return '<div class="cal__legendbar">' +
      Charts.legend([
        { label: 'Direct', color: 'var(--ch-direct)' },
        { label: 'Booking.com', color: 'var(--ch-booking)' },
        { label: 'Airbnb', color: 'var(--ch-airbnb)' }
      ]) +
      '<span class="small muted row gap-sm"><span data-icon="key" style="font-size:14px"></span>in house</span>' +
      '<span class="small muted row gap-sm"><span style="width:14px;height:10px;border-radius:3px;background:repeating-linear-gradient(45deg,var(--ink-400) 0 4px,transparent 4px 8px);display:inline-block"></span>not prepaid</span>' +
      '<span class="small muted row gap-sm"><span style="width:14px;height:10px;border-radius:3px;background:repeating-linear-gradient(45deg,var(--surface-sunk) 0 4px,var(--border) 4px 5px);display:inline-block;border:1px solid var(--border)"></span>out of order</span>' +
      '<span class="small muted" style="margin-left:auto">Click an empty cell to start a booking</span>' +
    '</div>';
  }

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host, dates) {
    U.on(host, 'click', '[data-nav]', function (e, el) {
      const v = el.dataset.nav;
      state.start = v === 'today' ? defaultStart() : U.addDays(state.start, Number(v));
      App.render();
    });

    U.on(host, 'change', '#calJump', function (e, el) {
      if (el.value) { state.start = el.value; App.render(); }
    });

    U.on(host, 'click', '[data-days]', function (e, el) {
      state.days = Number(el.dataset.days);
      Store.updateQuiet(s => { s.prefs.calendarDays = state.days; });
      App.render();
    });

    U.on(host, 'change', '#calFloor', function (e, el) { state.floorFilter = el.value; App.render(); });
    U.on(host, 'change', '#calType', function (e, el) { state.typeFilter = el.value; App.render(); });

    U.on(host, 'click', '#calNew', function () { Views.bookings.openEditor(null); });

    U.on(host, 'click', '[data-bar]', function (e, el) {
      e.stopPropagation();
      Views.bookings.openDetail(el.dataset.bar);
    });

    U.on(host, 'click', '[data-roominfo]', function (e, el) {
      Views.rooms.openDetail(el.dataset.roominfo);
    });

    U.on(host, 'click', '[data-cell]', function (e, el) {
      const [roomId, date] = el.dataset.cell.split('|');
      const room = Store.room(roomId);
      if (!room) return;

      if (room.oooFrom && room.oooTo && room.oooFrom <= date && date < room.oooTo) {
        UI.toast('Room ' + room.number + ' is out of order',
          (room.oooReason || 'Maintenance') + ' until ' + U.fmtDate(room.oooTo), 'warn');
        return;
      }

      // default to a one-night stay, stretched to the next free day
      let out = U.addDays(date, 1);
      while (U.nights(date, out) < 3 && Domain.isRoomFree(roomId, date, U.addDays(out, 1))) {
        out = U.addDays(out, 1);
      }
      if (!Domain.isRoomFree(roomId, date, U.addDays(date, 1))) {
        UI.toast('Not available', 'Room ' + room.number + ' is already sold on ' + U.fmtDate(date) + '.', 'warn');
        return;
      }

      Views.bookings.openEditor(null, { roomId: roomId, checkIn: date, checkOut: U.addDays(date, 1) });
    });
  }

})(window);
