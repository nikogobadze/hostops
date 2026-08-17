/* ============================================================
   Page — Manage my booking (lookup by reference + surname)
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  let found = null;

  Pages.booking = {
    title: () => 'My booking',

    render: function (host, params) {
      if (params && params.ref && !found) {
        found = Store.state.bookings.find(b => b.ref === params.ref) || null;
      }

      host.innerHTML =
        '<div class="section" style="padding-top:calc(var(--nav-h) + 2rem)">' +
          '<div class="wrap wrap--narrow">' +
            (found ? panel(found) : lookupForm()) +
          '</div>' +
        '</div>';

      wire(host);
    },

    reset: function () { found = null; }
  };

  /* ============================================================
     lookup
     ============================================================ */

  function lookupForm() {
    return '<div style="text-align:center;margin-bottom:2rem">' +
        '<span class="eyebrow">Already booked</span>' +
        '<h1 class="h1" style="margin:.6rem 0 .6rem">Find your booking</h1>' +
        '<p class="lede">Your reference is in the confirmation email — it looks like <strong>HO-4820</strong>.</p>' +
      '</div>' +
      '<form class="panel" id="lookupForm" novalidate>' +
        '<div class="formgrid">' +
          '<div class="field"><label for="lkRef">Booking reference</label>' +
            '<input class="input" id="lkRef" name="ref" placeholder="HO-4820" autocomplete="off">' +
            '<span class="err" data-err-for="ref" hidden></span></div>' +
          '<div class="field"><label for="lkName">Surname</label>' +
            '<input class="input" id="lkName" name="surname" placeholder="Beridze" autocomplete="family-name">' +
            '<span class="err" data-err-for="surname" hidden></span></div>' +
        '</div>' +
        '<button class="btn btn--primary btn--lg btn--block" type="submit" style="margin-top:1.2rem">' +
          'Find my booking<span data-icon="arrow-right"></span></button>' +
        '<p class="small muted" style="text-align:center;margin-top:.9rem">' +
          'Lost the reference? Call us on ' + U.esc(Store.state.hotel.phone) + ' and we will find you.</p>' +
      '</form>';
  }

  /* ============================================================
     the booking itself
     ============================================================ */

  function panel(b) {
    const g = Store.guest(b.guestId);
    const type = Store.roomType(b.typeId);
    const nights = U.nights(b.checkIn, b.checkOut);
    const svc = Domain.servicesForBooking(b.id);
    const today = U.today();
    const daysAway = U.nights(today, b.checkIn);
    const cancellable = b.status === 'confirmed' && b.paymentStatus !== 'prepaid' && daysAway >= 2;
    const past = b.status === 'checked_out' || b.checkOut < today;

    return '<div class="row row--wrap" style="margin-bottom:1.4rem">' +
        '<div>' +
          '<span class="eyebrow">' + U.esc(b.ref) + '</span>' +
          '<h1 class="h1" style="margin-top:.4rem">' +
            (past ? 'Thank you for staying' : daysAway <= 0 ? 'See you today' :
              daysAway === 1 ? 'See you tomorrow' : daysAway + ' days to go') + '</h1>' +
        '</div>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--ghost btn--sm" data-forget><span>Not you? Search again</span></button>' +
      '</div>' +

      (b.status === 'cancelled'
        ? '<div class="notice notice--warn" style="margin-bottom:1.4rem"><span data-icon="alert"></span>' +
          '<div>This booking was cancelled' + (b.cancelledAt ? ' on ' + U.esc(U.fmtDateLong(U.today(new Date(b.cancelledAt)))) : '') +
          '. Nothing is owed.</div></div>'
        : '') +

      '<div class="panel" style="margin-bottom:1.2rem">' +
        '<div class="row" style="gap:1rem;align-items:stretch;margin-bottom:1.2rem">' +
          '<div style="width:120px;flex:none;border-radius:var(--r);overflow:hidden">' +
            Art.scene(type ? type.art : 'room-standard', { scrim: 0.12, alt: type ? type.name : '' }) + '</div>' +
          '<div class="col" style="gap:.25rem;min-width:0">' +
            '<strong style="font-size:1.06rem">' + U.esc(type ? type.name : 'Your room') + '</strong>' +
            '<span class="small muted">' + U.esc(g ? g.firstName + ' ' + g.lastName : '') + '</span>' +
            '<span class="small">' + U.esc(U.fmtDateLong(b.checkIn)) + ' → ' + U.esc(U.fmtDateLong(b.checkOut)) + '</span>' +
            '<span class="small muted">' + Parts.nightsLabel(nights) + ' · ' + b.adults + ' adult' + (b.adults === 1 ? '' : 's') +
              (b.children ? ' · ' + b.children + ' children' : '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="linerow"><span>Arrival</span><b>from ' + U.esc(Store.state.hotel.checkInTime) + '</b></div>' +
        '<div class="linerow"><span>Departure</span><b>by ' + U.esc(Store.state.hotel.checkOutTime) + '</b></div>' +
        '<div class="linerow"><span>Breakfast</span><b>' + (b.breakfast ? 'Included' : 'Not included') + '</b></div>' +
        '<div class="linerow"><span>Payment</span><b>' +
          (b.paymentStatus === 'prepaid' ? 'Prepaid' : b.paymentStatus === 'paid' ? 'Settled' : 'At the hotel') + '</b></div>' +
        '<div class="linerow linerow--total"><span>Room total</span><b>' + Parts.money(b.rate * nights) + '</b></div>' +
        (b.notes ? '<p class="small muted" style="margin-top:.8rem">Your notes: ' + U.esc(b.notes) + '</p>' : '') +
      '</div>' +

      '<div class="panel" style="margin-bottom:1.2rem">' +
        '<div class="row" style="margin-bottom:.9rem">' +
          '<h2 class="h3">What you have booked</h2>' +
          '<span class="spacer"></span>' +
        '</div>' +
        (svc.dining.length + svc.spa.length + svc.experiences.length
          ? svc.dining.map(r => svcRow('dining', r)).join('') +
            svc.spa.map(r => svcRow('spa', r)).join('') +
            svc.experiences.map(r => svcRow('experience', r)).join('')
          : '<p class="small muted">Nothing else yet — the terrace, the spa and the boat are all still open to you.</p>') +

        (past ? '' :
          '<div class="row row--wrap" style="gap:.5rem;margin-top:1.1rem">' +
            '<a class="btn btn--sm" href="#/dining"><span data-icon="utensils"></span>Add a table</a>' +
            '<a class="btn btn--sm" href="#/spa"><span data-icon="sparkle"></span>Add a treatment</a>' +
            '<a class="btn btn--sm" href="#/experiences"><span data-icon="ship"></span>Add an experience</a>' +
          '</div>') +
      '</div>' +

      (past ? '' :
        '<div class="panel">' +
          '<h2 class="h3" style="margin-bottom:.8rem">Change something</h2>' +
          '<p class="small muted" style="margin-bottom:1rem">' +
            (cancellable
              ? 'You can cancel free of charge until 48 hours before you arrive. To change dates or rooms, call us — it is quicker.'
              : b.paymentStatus === 'prepaid'
                ? 'This is a prepaid rate, so it cannot be cancelled online. Call us and we will move it once, free, within twelve months.'
                : 'You are inside 48 hours of arrival, so changes are handled by reception. Call and we will sort it.') +
          '</p>' +
          '<div class="row row--wrap" style="gap:.5rem">' +
            '<a class="btn" href="tel:' + U.esc(Store.state.hotel.phone.replace(/\s/g, '')) + '">' +
              '<span data-icon="phone"></span>' + U.esc(Store.state.hotel.phone) + '</a>' +
            '<a class="btn" href="mailto:' + U.esc(Store.state.hotel.email) + '?subject=' + encodeURIComponent('Booking ' + b.ref) + '">' +
              '<span data-icon="mail"></span>Email us</a>' +
            '<span class="spacer"></span>' +
            (cancellable ? '<button class="btn btn--ghost" data-cancel="' + b.id + '"><span>Cancel booking</span></button>' : '') +
          '</div>' +
        '</div>');
  }

  function svcRow(kind, r) {
    let title = '', detail = '', icon = 'check';
    if (kind === 'dining') {
      const x = Domain.restaurant(r.restaurantId);
      title = 'Table at ' + (x ? x.name : 'the restaurant');
      detail = U.fmtDateLong(r.date) + ' at ' + r.time + ' · ' + r.party + ' covers';
      icon = 'utensils';
    } else if (kind === 'spa') {
      const x = Domain.treatment(r.treatmentId);
      title = x ? x.name : 'Spa treatment';
      detail = U.fmtDateLong(r.date) + ' at ' + r.time + (x ? ' · ' + x.duration + ' minutes' : '');
      icon = 'sparkle';
    } else {
      const x = Domain.experience(r.experienceId);
      title = x ? x.name : 'Experience';
      detail = U.fmtDateLong(r.date) + (x ? ' at ' + x.time : '') + ' · ' + r.people + ' place(s)';
      icon = 'ship';
    }

    return '<div class="notice" style="margin-bottom:.5rem;align-items:center">' +
      '<span data-icon="' + icon + '"></span>' +
      '<div style="flex:1"><strong style="font-size:.94rem;color:var(--text)">' + U.esc(title) + '</strong>' +
      '<div class="small muted">' + U.esc(detail) + '</div></div>' +
      '<button class="btn btn--ghost btn--sm" data-cancelsvc="' + kind + '|' + r.id + '"><span>Cancel</span></button>' +
      '</div>';
  }

  /* ============================================================
     wiring
     ============================================================ */

  function wire(host) {
    const form = host.querySelector('#lookupForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const d = UI.formData(form);
        const errors = {};
        if (!d.ref) errors.ref = 'Your booking reference.';
        if (!d.surname) errors.surname = 'The surname on the booking.';
        if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }

        const hit = Domain.findByReference(d.ref, d.surname);
        if (!hit) {
          UI.setErrors(form, { ref: 'No booking matches that reference and surname.' });
          return;
        }
        found = hit;
        Site.render();
      });
    }

    U.on(host, 'click', '[data-forget]', function () {
      found = null;
      Site.render();
    });

    U.on(host, 'click', '[data-cancelsvc]', async function (e, el) {
      const [kind, id] = el.dataset.cancelsvc.split('|');
      const ok = await UI.confirm({
        title: 'Cancel this?',
        message: 'We will free the slot for someone else. You can always book again.',
        confirmLabel: 'Yes, cancel it', tone: 'danger'
      });
      if (!ok) return;
      Store.update('site:cancelservice', () => {
        Domain.cancelService(kind, id);
        Store.log('Guest cancelled a ' + kind + ' reservation online', 'x-circle', '#/services', 'service');
      });
      UI.toast('Cancelled', 'That slot is released.', 'ok');
      Site.render();
    });

    U.on(host, 'click', '[data-cancel]', async function (e, el) {
      const b = Store.booking(el.dataset.cancel);
      const ok = await UI.confirm({
        title: 'Cancel booking ' + b.ref + '?',
        message: 'This releases the room and everything booked alongside it. Free of charge at this notice.',
        confirmLabel: 'Cancel my booking', tone: 'danger'
      });
      if (!ok) return;

      Store.update('site:cancelbooking', () => {
        Domain.cancelBooking(b.id, 'Cancelled by the guest online');
        const svc = Domain.servicesForBooking(b.id);
        svc.dining.forEach(r => Domain.cancelService('dining', r.id));
        svc.spa.forEach(r => Domain.cancelService('spa', r.id));
        svc.experiences.forEach(r => Domain.cancelService('experience', r.id));
        Store.log('Guest cancelled ' + b.ref + ' online · room released', 'x-circle', '#/bookings', 'booking');
      });

      UI.toast('Booking cancelled', b.ref + ' · nothing is owed', 'ok');
      Site.render();
    });
  }

})(window);
