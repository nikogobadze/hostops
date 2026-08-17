/* ============================================================
   View — Guest Services
   Tables, treatments and experiences booked from the public site
   or taken over the phone.
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  let tab = 'dining';
  let when = 'upcoming';

  Views.services = {
    title: 'Guest Services',
    subtitle: function () {
      const today = U.today();
      const d = (Store.state.diningReservations || []).filter(r => r.date === today && r.status !== 'cancelled');
      const s = (Store.state.spaBookings || []).filter(r => r.date === today && r.status !== 'cancelled');
      const e = (Store.state.experienceBookings || []).filter(r => r.date === today && r.status !== 'cancelled');
      return U.sum(d, x => x.party) + ' covers · ' + s.length + ' treatments · ' +
        U.sum(e, x => x.people) + ' on experiences today';
    },

    render: function (host) {
      const today = U.today();
      const dining = filterList(Store.state.diningReservations || []);
      const spa = filterList(Store.state.spaBookings || []);
      const exps = filterList(Store.state.experienceBookings || []);

      const coversToday = U.sum((Store.state.diningReservations || [])
        .filter(r => r.date === today && r.status !== 'cancelled'), r => r.party);
      const spaToday = (Store.state.spaBookings || []).filter(r => r.date === today && r.status !== 'cancelled').length;
      const expToday = U.sum((Store.state.experienceBookings || [])
        .filter(r => r.date === today && r.status !== 'cancelled'), r => r.people);
      const fromSite = (Store.state.diningReservations || []).filter(r => r.source === 'site').length +
        (Store.state.spaBookings || []).filter(r => r.source === 'site').length +
        (Store.state.experienceBookings || []).filter(r => r.source === 'site').length;

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Covers today', icon: 'tray', valueHTML: U.num(coversToday), note: 'across ' + Store.state.restaurants.length + ' restaurants' }) +
            UI.stat({ label: 'Treatments today', icon: 'sparkle', valueHTML: U.num(spaToday), note: Store.state.spa.roomsAvailable + ' rooms available' }) +
            UI.stat({ label: 'On experiences today', icon: 'users', valueHTML: U.num(expToday), note: 'guests out with a guide' }) +
            UI.stat({ label: 'Booked on the website', icon: 'link', valueHTML: U.num(fromSite), note: 'direct, commission-free' }) +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="tabs">' +
              '<button data-tab="dining"' + (tab === 'dining' ? ' class="is-active"' : '') + '>Restaurant tables <span class="muted">' + dining.length + '</span></button>' +
              '<button data-tab="spa"' + (tab === 'spa' ? ' class="is-active"' : '') + '>Spa <span class="muted">' + spa.length + '</span></button>' +
              '<button data-tab="experiences"' + (tab === 'experiences' ? ' class="is-active"' : '') + '>Experiences <span class="muted">' + exps.length + '</span></button>' +
            '</div>' +

            '<div class="card__head" style="border-top:0;flex-wrap:wrap;gap:10px">' +
              '<div class="seg" role="group" aria-label="Period">' +
                '<button data-when="today"' + (when === 'today' ? ' class="is-active"' : '') + '>Today</button>' +
                '<button data-when="upcoming"' + (when === 'upcoming' ? ' class="is-active"' : '') + '>Upcoming</button>' +
                '<button data-when="all"' + (when === 'all' ? ' class="is-active"' : '') + '>All</button>' +
              '</div>' +
              '<div class="spacer"></div>' +
              '<a class="btn btn--sm" href="site.html" target="_blank" rel="noopener">' +
                '<span data-icon="external"></span>Open guest site</a>' +
            '</div>' +

            '<div id="svcPanel">' +
              (tab === 'dining' ? diningPanel(dining)
                : tab === 'spa' ? spaPanel(spa)
                  : expPanel(exps)) +
            '</div>' +
          '</div>' +
        '</div>';

      wire(host);
    }
  };

  /* ============================================================
     helpers
     ============================================================ */

  function filterList(list) {
    const today = U.today();
    return list.filter(r => {
      if (when === 'today') return r.date === today;
      if (when === 'upcoming') return r.date >= today;
      return true;
    }).sort((a, b) => U.cmp(a.date, b.date) || U.cmp(a.time || '', b.time || ''));
  }

  function guestCell(r) {
    const name = Domain.serviceGuestName(r);
    const b = r.bookingId ? Store.booking(r.bookingId) : null;
    const room = b ? Store.room(b.roomId) : null;
    return '<div class="cellstack"><strong>' + U.esc(name) + '</strong>' +
      '<span>' + (b
        ? 'Room ' + U.esc(room ? room.number : '—') + ' · ' + U.esc(b.ref)
        : (r.email ? U.esc(r.email) : 'Not a resident')) + '</span></div>';
  }

  function sourceBadge(r) {
    return r.source === 'site'
      ? '<span class="badge badge--info"><span data-icon="globe"></span>Website</span>'
      : '<span class="badge">In house</span>';
  }

  function statusBadge(r) {
    if (r.status === 'cancelled') return '<span class="badge badge--danger">Cancelled</span>';
    if (r.status === 'seated' || r.status === 'done') return '<span class="badge badge--ok">Done</span>';
    return '<span class="badge badge--ok">Confirmed</span>';
  }

  /* ============================================================
     panels
     ============================================================ */

  function diningPanel(rows) {
    if (!rows.length) return UI.empty({ icon: 'tray', title: 'No table reservations', message: 'Nothing booked for this period.' });

    const byDate = U.groupBy(rows, r => r.date);
    let html = '';
    byDate.forEach((list, date) => {
      const covers = U.sum(list.filter(r => r.status !== 'cancelled'), r => r.party);
      html += '<div class="card__head" style="background:var(--surface-2);border-top:1px solid var(--border)">' +
        '<strong style="font-size:13px">' + U.esc(U.fmtDateLong(date)) + '</strong>' +
        '<span class="small muted">' + covers + ' covers · ' + list.length + ' tables</span></div>' +
        '<div class="tablewrap"><table class="table"><thead><tr>' +
        '<th>Time</th><th>Restaurant</th><th>Guest</th><th class="num">Covers</th><th>Notes</th><th>Source</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        list.map(r => {
          const rest = Domain.restaurant(r.restaurantId);
          return '<tr' + (r.status === 'cancelled' ? ' style="opacity:.5"' : '') + '>' +
            '<td class="strong tnum nowrap">' + U.esc(r.time) + '</td>' +
            '<td>' + U.esc(rest ? rest.name : '—') + '</td>' +
            '<td>' + guestCell(r) + '</td>' +
            '<td class="num strong">' + r.party + '</td>' +
            '<td class="small muted">' + U.esc(U.truncate(r.notes || '—', 34)) + '</td>' +
            '<td>' + sourceBadge(r) + '</td>' +
            '<td>' + statusBadge(r) + '</td>' +
            '<td><div class="rowactions">' +
              (r.status !== 'cancelled'
                ? '<button class="iconbtn iconbtn--bare" data-cancel="dining|' + r.id + '" title="Cancel" data-icon="x-circle"></button>' : '') +
            '</div></td>' +
          '</tr>';
        }).join('') + '</tbody></table></div>';
    });
    return html;
  }

  function spaPanel(rows) {
    if (!rows.length) return UI.empty({ icon: 'sparkle', title: 'No treatments booked', message: 'Nothing in the spa diary for this period.' });

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Date</th><th>Time</th><th>Treatment</th><th>Guest</th><th class="num">Minutes</th>' +
      '<th class="num">Price</th><th>Source</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(r => {
        const t = Domain.treatment(r.treatmentId);
        return '<tr' + (r.status === 'cancelled' ? ' style="opacity:.5"' : '') + '>' +
          '<td class="nowrap">' + U.esc(U.fmtDate(r.date)) + '</td>' +
          '<td class="strong tnum">' + U.esc(r.time) + '</td>' +
          '<td><div class="cellstack"><strong>' + U.esc(t ? t.name : '—') + '</strong>' +
            '<span>' + U.esc(t ? t.category : '') + '</span></div></td>' +
          '<td>' + guestCell(r) + '</td>' +
          '<td class="num">' + (t ? t.duration : '—') + '</td>' +
          '<td class="num strong">' + U.esc(t ? U.money(t.price, null, { decimals: 0 }) : '—') + '</td>' +
          '<td>' + sourceBadge(r) + '</td>' +
          '<td>' + statusBadge(r) + '</td>' +
          '<td><div class="rowactions">' +
            (r.status !== 'cancelled'
              ? '<button class="iconbtn iconbtn--bare" data-cancel="spa|' + r.id + '" title="Cancel" data-icon="x-circle"></button>' : '') +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function expPanel(rows) {
    if (!rows.length) return UI.empty({ icon: 'users', title: 'No experience bookings', message: 'Nothing scheduled for this period.' });

    const byExp = U.groupBy(rows, r => r.experienceId);
    let html = '';
    byExp.forEach((list, id) => {
      const e = Domain.experience(id);
      const people = U.sum(list.filter(r => r.status !== 'cancelled'), r => r.people);
      html += '<div class="card__head" style="background:var(--surface-2);border-top:1px solid var(--border)">' +
        '<strong style="font-size:13px">' + U.esc(e ? e.name : 'Experience') + '</strong>' +
        '<span class="small muted">' + people + ' guests booked · max ' + (e ? e.capacity : '?') + ' per departure</span></div>' +
        '<div class="tablewrap"><table class="table"><thead><tr>' +
        '<th>Date</th><th>Guest</th><th class="num">Places</th><th class="num">Value</th><th>Source</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        list.map(r => '<tr' + (r.status === 'cancelled' ? ' style="opacity:.5"' : '') + '>' +
          '<td class="nowrap"><div class="cellstack"><strong>' + U.esc(U.fmtDate(r.date)) + '</strong>' +
            '<span>' + U.esc(e ? e.time : '') + '</span></div></td>' +
          '<td>' + guestCell(r) + '</td>' +
          '<td class="num strong">' + r.people + '</td>' +
          '<td class="num">' + U.esc(e ? U.money(e.price * r.people, null, { decimals: 0 }) : '—') + '</td>' +
          '<td>' + sourceBadge(r) + '</td>' +
          '<td>' + statusBadge(r) + '</td>' +
          '<td><div class="rowactions">' +
            (r.status !== 'cancelled'
              ? '<button class="iconbtn iconbtn--bare" data-cancel="experience|' + r.id + '" title="Cancel" data-icon="x-circle"></button>' : '') +
          '</div></td>' +
        '</tr>').join('') + '</tbody></table></div>';
    });
    return html;
  }

  /* ============================================================
     wiring
     ============================================================ */

  function wire(host) {
    UI.tabs(host, function (t) { tab = t; App.render(); });
    U.on(host, 'click', '[data-when]', function (e, el) { when = el.dataset.when; App.render(); });

    U.on(host, 'click', '[data-cancel]', async function (e, el) {
      const [kind, id] = el.dataset.cancel.split('|');
      const ok = await UI.confirm({
        title: 'Cancel this reservation?',
        message: 'The slot is released immediately and the guest keeps their other bookings.',
        confirmLabel: 'Cancel it', tone: 'danger'
      });
      if (!ok) return;
      Store.update('services:cancel', () => {
        Domain.cancelService(kind, id);
        Store.log('Cancelled a ' + kind + ' reservation', 'x-circle', '#/services', 'service');
      });
      UI.toast('Cancelled', 'The slot is free again.', 'ok');
    });
  }

})(window);
