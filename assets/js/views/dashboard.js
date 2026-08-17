/* ============================================================
   View — Overview
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  Views.dashboard = {
    title: 'Overview',
    subtitle: function () {
      const t = U.today();
      return U.dow(t) + ' · ' + U.fmtDateLong(t) + ' · ' + Store.state.hotel.name;
    },

    render: function (host) {
      const today = U.today();
      const st = Domain.statsFor(today);
      const yst = Domain.statsFor(U.addDays(today, -1));
      const lastWeek = Domain.statsFor(U.addDays(today, -7));

      const arrivals = Domain.arrivals(today);
      const departures = Domain.departures(today);
      const inHouse = Domain.inHouse();
      const pendingArrivals = arrivals.filter(b => b.status === 'confirmed');
      const pendingDepartures = departures.filter(b => b.status === 'in_house');

      const past14 = Domain.statsSeries(U.addDays(today, -13), 14);
      const next14 = Domain.statsSeries(today, 14);
      const revToday = Domain.postedRevenue(today, today);
      const rev30 = Domain.postedRevenue(U.addDays(today, -29), today);
      const mix30 = Domain.channelMix(U.addDays(today, -29), today);
      const hk = Domain.housekeepingSummary();

      const vacant = st.sellable - st.occupied;

      host.innerHTML =
        '<div class="stack">' +

          /* ---------- hero + KPI strip ---------- */
          '<section class="dash-top">' +
            heroCard(st, past14, vacant) +
            '<div class="grid grid--kpi">' +
              UI.stat({
                label: 'Rooms sold', icon: 'bed',
                valueHTML: U.num(st.occupied) + ' <small>/ ' + U.num(st.sellable) + '</small>',
                delta: UI.deltaTag(st.occupied - lastWeek.occupied, { dp: 0, suffix: '' }),
                note: 'vs same day last week'
              }) +
              UI.stat({
                label: 'ADR', icon: 'tag',
                valueHTML: U.esc(U.money(st.adr, null, { decimals: 0 })),
                delta: UI.deltaTag(pctChange(st.adr, lastWeek.adr), { suffix: '%' }),
                note: 'average daily rate'
              }) +
              UI.stat({
                label: 'RevPAR', icon: 'activity',
                valueHTML: U.esc(U.money(st.revpar, null, { decimals: 0 })),
                delta: UI.deltaTag(pctChange(st.revpar, lastWeek.revpar), { suffix: '%' }),
                note: 'revenue per available room'
              }) +
              UI.stat({
                label: 'Posted today', icon: 'receipt',
                valueHTML: U.esc(U.moneyCompact(revToday.total)),
                note: 'rooms ' + U.money(revToday.room, null, { decimals: 0 }) +
                  ' · extras ' + U.money(revToday.fnb + revToday.service + revToday.minibar, null, { decimals: 0 })
              }) +
            '</div>' +
          '</section>' +

          /* ---------- charts + today panel ---------- */
          '<section class="grid grid--main">' +
            '<div class="stack">' +
              trendCard() +
              forecastCard() +
            '</div>' +
            '<div class="stack">' +
              movementsCard(pendingArrivals, pendingDepartures, inHouse.length) +
              housekeepingCard(hk) +
            '</div>' +
          '</section>' +

          /* ---------- distribution + activity ---------- */
          '<section class="grid grid--2">' +
            channelCard() +
            activityCard() +
          '</section>' +

        '</div>';

      /* ---------- charts ---------- */

      Charts.line(host.querySelector('#chOccTrend'), {
        labels: past14.map(s => U.parse(s.date).getDate() + ' ' + U.monthName(s.date).slice(0, 3)),
        tipLabels: past14.map(s => U.fmtDate(s.date)),
        series: [{ name: 'Occupancy', values: past14.map(s => Math.round(s.occupancy)), color: 'var(--series-1)' }],
        format: v => Math.round(v) + '%',
        yFormat: v => Math.round(v) + '%',
        max: 100,
        height: 210,
        caption: 'Occupancy over the last 14 days'
      });

      Charts.columns(host.querySelector('#chForecast'), {
        labels: next14.map(s => U.dowShort(s.date).slice(0, 2) + ' ' + U.parse(s.date).getDate()),
        tipLabels: next14.map(s => U.fmtDate(s.date)),
        values: next14.map(s => Math.round(s.occupancy)),
        // same measure as the trend chart above, so the same hue —
        // colour follows the entity, and coral marks only "today"
        color: 'var(--series-1)',
        highlight: 0,
        format: v => Math.round(v) + '%',
        yFormat: v => Math.round(v) + '%',
        max: 100,
        height: 190,
        seriesName: 'On the books',
        tipExtra: i => '<div style="opacity:.75;margin-top:2px">' + next14[i].occupied + ' of ' + next14[i].sellable + ' rooms</div>',
        caption: 'Occupancy already on the books for the next 14 days'
      });

      const chanItems = [
        { label: 'Direct', value: mix30.direct.revenue, color: 'var(--ch-direct)', sub: mix30.direct.nights + ' room-nights · no commission' },
        { label: 'Booking.com', value: mix30.booking.revenue, color: 'var(--ch-booking)', sub: mix30.booking.nights + ' room-nights · 15% commission' },
        { label: 'Airbnb', value: mix30.airbnb.revenue, color: 'var(--ch-airbnb)', sub: mix30.airbnb.nights + ' room-nights · 3% commission' }
      ].sort((a, b) => b.value - a.value);

      Charts.barsH(host.querySelector('#chChannels'), {
        items: chanItems,
        format: v => U.moneyCompact(v),
        seriesName: 'Room revenue',
        rowH: 38,
        caption: 'Room revenue by channel, last 30 days'
      });

      Charts.composition(host.querySelector('#chHk'), {
        segments: [
          { label: 'Inspected', value: hk.inspected || 0, color: 'var(--series-1)' },
          { label: 'Clean', value: hk.clean || 0, color: 'var(--ok)' },
          { label: 'Being cleaned', value: hk.cleaning || 0, color: 'var(--series-2)' },
          { label: 'Dirty', value: hk.dirty || 0, color: 'var(--warn)' },
          { label: 'Out of order', value: hk.ooo || 0, color: 'var(--danger)' }
        ],
        height: 14,
        format: v => v + (v === 1 ? ' room' : ' rooms'),
        caption: 'Room status right now'
      });

      /* ---------- interactions ---------- */

      U.on(host, 'click', '[data-checkin]', function (e, el) {
        e.stopPropagation();
        Views.frontdesk.doCheckIn(el.dataset.checkin);
      });

      U.on(host, 'click', '[data-checkout]', function (e, el) {
        e.stopPropagation();
        Views.frontdesk.doCheckOut(el.dataset.checkout);
      });

      U.on(host, 'click', '[data-booking]', function (e, el) {
        Views.bookings.openDetail(el.dataset.booking);
      });
    }
  };

  /* ============================================================
     pieces
     ============================================================ */

  function pctChange(now, before) {
    if (!before) return 0;
    return ((now - before) / before) * 100;
  }

  function heroCard(st, past14, vacant) {
    const pct = Math.round(st.occupancy);
    const tone = pct >= 85 ? 'is-ok' : pct >= 60 ? '' : pct >= 40 ? 'is-warn' : 'is-danger';
    const spark = Charts.sparkline(past14.map(s => s.occupancy), { w: 132, h: 40, color: 'var(--series-1)' });

    return '<div class="card hero">' +
      '<div class="card__body">' +
        '<div class="stat__label"><span data-icon="grid"></span>Occupancy today</div>' +
        '<div class="row" style="align-items:flex-end;gap:14px;margin-top:6px">' +
          '<div class="stat__hero">' + pct + '<span style="font-size:26px;font-weight:600">%</span></div>' +
          '<div style="margin-left:auto;margin-bottom:2px">' + spark + '</div>' +
        '</div>' +
        '<div class="meter mt-sm"><div class="meter__fill ' + tone + '" style="width:' + pct + '%"></div></div>' +
        '<div class="row small muted mt-sm" style="justify-content:space-between">' +
          '<span><b class="strong" style="color:var(--text)">' + st.occupied + '</b> sold</span>' +
          '<span><b class="strong" style="color:var(--text)">' + vacant + '</b> vacant</span>' +
          '<span><b class="strong" style="color:var(--text)">' + st.sellable + '</b> sellable</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function trendCard() {
    return '<div class="card">' +
      '<div class="card__head"><div><h2>Occupancy trend</h2><p>Last 14 days, rooms sold as a share of sellable rooms</p></div>' +
      '<a class="btn btn--ghost btn--sm spacer" href="#/calendar">Open calendar<span data-icon="arrow-right"></span></a></div>' +
      '<div class="card__body"><div id="chOccTrend"></div></div>' +
    '</div>';
  }

  function forecastCard() {
    const today = U.today();
    const next14 = Domain.statsSeries(today, 14);
    const rows = next14.map(s => [U.fmtDate(s.date), s.occupied + '/' + s.sellable, Math.round(s.occupancy) + '%', U.money(s.roomRevenue, null, { decimals: 0 })]);
    return '<div class="card">' +
      '<div class="card__head"><div><h2>On the books</h2><p>Confirmed occupancy for the next 14 days</p></div></div>' +
      '<div class="card__body">' +
        '<div id="chForecast"></div>' +
        Charts.tableView('View as table', ['Date', 'Sold', 'Occupancy', 'Room revenue'], rows) +
      '</div>' +
    '</div>';
  }

  function movementsCard(arrivals, departures, inHouseCount) {
    function row(b, action) {
      const g = Store.guest(b.guestId);
      const room = Store.room(b.roomId);
      return '<div class="movrow" data-booking="' + b.id + '">' +
        '<span class="roomno">' + U.esc(room ? room.number : '—') + '</span>' +
        '<div class="cellstack"><strong>' + U.esc(Store.guestName(b.guestId)) +
          (g && g.vip ? ' <span class="badge badge--coral" style="height:16px;padding:0 5px;font-size:9.5px">VIP</span>' : '') +
        '</strong><span>' + U.esc(U.stayLabel(b.checkIn, b.checkOut)) + ' · ' + U.esc(UI.CHANNEL_LABEL[b.channel]) + '</span></div>' +
        action +
      '</div>';
    }

    const arrHtml = arrivals.length
      ? arrivals.slice(0, 5).map(b => row(b,
        '<button class="btn btn--primary btn--sm" data-checkin="' + b.id + '"><span data-icon="log-in"></span>Check in</button>')).join('')
      : '<p class="small muted" style="padding:6px 2px">No arrivals left to process today.</p>';

    const depHtml = departures.length
      ? departures.slice(0, 5).map(b => row(b,
        '<button class="btn btn--soft btn--sm" data-checkout="' + b.id + '"><span data-icon="log-out"></span>Check out</button>')).join('')
      : '<p class="small muted" style="padding:6px 2px">All departures have been settled.</p>';

    return '<div class="card">' +
      '<div class="card__head"><div><h2>Today&rsquo;s movements</h2><p>' +
        arrivals.length + ' to arrive · ' + departures.length + ' to depart · ' + inHouseCount + ' in house</p></div>' +
        '<a class="btn btn--ghost btn--sm spacer" href="#/frontdesk">Front desk<span data-icon="arrow-right"></span></a>' +
      '</div>' +
      '<div class="card__body" style="padding-top:14px">' +
        '<p class="label" style="margin-bottom:8px">Arrivals</p>' + arrHtml +
        '<hr class="divider" style="margin:14px 0">' +
        '<p class="label" style="margin-bottom:8px">Departures</p>' + depHtml +
      '</div>' +
    '</div>';
  }

  function housekeepingCard(hk) {
    const today = U.today();
    const tasks = Store.state.hkTasks.filter(t => t.date === today);
    const done = tasks.filter(t => t.status === 'done').length;
    const segs = [
      { label: 'Inspected', value: hk.inspected || 0, color: 'var(--series-1)' },
      { label: 'Clean', value: hk.clean || 0, color: 'var(--ok)' },
      { label: 'Being cleaned', value: hk.cleaning || 0, color: 'var(--series-2)' },
      { label: 'Dirty', value: hk.dirty || 0, color: 'var(--warn)' },
      { label: 'Out of order', value: hk.ooo || 0, color: 'var(--danger)' }
    ].filter(s => s.value > 0);

    return '<div class="card">' +
      '<div class="card__head"><div><h2>Housekeeping</h2><p>' +
        (tasks.length ? done + ' of ' + tasks.length + ' rooms serviced today' : 'No tasks scheduled today') +
      '</p></div>' +
      '<a class="btn btn--ghost btn--sm spacer" href="#/housekeeping">Board<span data-icon="arrow-right"></span></a></div>' +
      '<div class="card__body">' +
        '<div id="chHk" style="margin-bottom:12px"></div>' +
        Charts.legend(segs.map(s => ({ label: s.label, color: s.color, value: s.value }))) +
      '</div>' +
    '</div>';
  }

  function channelCard() {
    const today = U.today();
    const mix = Domain.channelMix(U.addDays(today, -29), today);
    const total = mix.direct.revenue + mix.booking.revenue + mix.airbnb.revenue;
    const commission = U.round2(mix.booking.revenue * 0.15 + mix.airbnb.revenue * 0.03);

    const rows = [
      ['Direct', mix.direct.bookings, mix.direct.nights, U.money(mix.direct.revenue, null, { decimals: 0 })],
      ['Booking.com', mix.booking.bookings, mix.booking.nights, U.money(mix.booking.revenue, null, { decimals: 0 })],
      ['Airbnb', mix.airbnb.bookings, mix.airbnb.nights, U.money(mix.airbnb.revenue, null, { decimals: 0 })]
    ];

    return '<div class="card">' +
      '<div class="card__head"><div><h2>Distribution mix</h2><p>Room revenue by channel · last 30 days</p></div>' +
      '<a class="btn btn--ghost btn--sm spacer" href="#/channels">Channels<span data-icon="arrow-right"></span></a></div>' +
      '<div class="card__body">' +
        '<div id="chChannels"></div>' +
        '<hr class="divider" style="margin:14px 0 12px">' +
        '<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px">' +
          '<span class="small muted">Total <b class="strong tnum" style="color:var(--text)">' + U.esc(U.money(total, null, { decimals: 0 })) + '</b></span>' +
          '<span class="small muted">OTA commission <b class="strong tnum" style="color:var(--text)">' + U.esc(U.money(commission, null, { decimals: 0 })) + '</b></span>' +
          '<span class="small muted">Direct share <b class="strong tnum" style="color:var(--text)">' +
            (total ? Math.round((mix.direct.revenue / total) * 100) : 0) + '%</b></span>' +
        '</div>' +
        Charts.tableView('View as table', ['Channel', 'Bookings', 'Room-nights', 'Revenue'], rows) +
      '</div>' +
    '</div>';
  }

  function activityCard() {
    const items = Store.state.activity.slice(0, 8);
    const body = items.length
      ? '<div class="timeline">' + items.map(a =>
        '<div class="tl">' +
          '<div class="tl__dot ' + (a.type === 'sync' ? 'is-sky' : a.type === 'service' ? 'is-coral' : 'is-ok') + '">' +
            '<span data-icon="' + U.esc(a.icon || 'activity') + '"></span></div>' +
          '<div class="tl__body"><p>' + U.esc(a.text) + '</p><time>' + U.esc(U.ago(a.ts)) + '</time></div>' +
        '</div>').join('') + '</div>'
      : UI.empty({ icon: 'activity', title: 'Nothing has happened yet', message: 'New reservations, sync results and service events show up here.' });

    return '<div class="card">' +
      '<div class="card__head"><div><h2>Recent activity</h2><p>Live feed across every channel and service</p></div></div>' +
      '<div class="card__body">' + body + '</div>' +
    '</div>';
  }

})(window);
