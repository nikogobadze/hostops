/* ============================================================
   Page — Checkout (room + extras + details + confirmation)

   Deliberately one page rather than a multi-step wizard: the
   guest can see the whole commitment and the running total at
   once, and there is only ever one button to press.
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  const EXTRAS = {
    breakfast: { label: 'Breakfast at Magnolia Terrace', note: 'Served 07:00 – 11:00, nadughi, honey and hot shotis puri', per: 'adult-night', icon: 'coffee' },
    parking:   { label: 'Valet parking', note: 'Underground, with EV charging', per: 'night', price: 45, icon: 'car' },
    dog:       { label: 'Bringing a dog', note: 'Bed, bowls and a towel for sandy paws', per: 'stay', price: 70, icon: 'paw' },
    latecheck: { label: 'Late check-out until 15:00', note: 'Subject to the house being free that day', per: 'stay', price: 90, icon: 'clock' }
  };

  const TRANSFERS = [
    { value: '', label: 'No transfer needed', price: 0 },
    { value: 'bus', label: 'Batumi airport (BUS) · 15 min', price: 60 },
    { value: 'kut', label: 'Kutaisi airport (KUT) · 2 hours', price: 280 },
    { value: 'train', label: 'Batumi Central station · 10 min', price: 35 }
  ];

  Pages.checkout = {
    title: () => 'Complete your booking',

    render: function (host) {
      const s = Site.search;
      const b = Site.basket;

      if (!b.typeId) {
        host.innerHTML = '<section class="section" style="padding-top:calc(var(--nav-h) + 2rem)"><div class="wrap">' +
          Parts.empty({
            icon: 'bed',
            title: 'Choose a room first',
            text: 'Pick the room you would like and we will bring you back here.',
            action: '<a class="btn btn--primary" style="margin-top:1.2rem" href="#/rooms">See available rooms</a>'
          }) + '</div></section>';
        return;
      }

      const type = Store.roomType(b.typeId);
      const rows = Domain.searchAvailability(s.checkIn, s.checkOut, s.guests, { includeUnavailable: true, includeTooSmall: true });
      const row = rows.find(r => r.type.id === b.typeId);

      if (!row || row.available === 0) {
        host.innerHTML = '<section class="section" style="padding-top:calc(var(--nav-h) + 2rem)"><div class="wrap">' +
          Parts.empty({
            icon: 'alert',
            title: 'That room has just gone',
            text: 'Somebody booked the last ' + (type ? type.name : 'room') + ' for these dates while you were deciding. Here is what is still free.',
            action: '<a class="btn btn--primary" style="margin-top:1.2rem" href="#/rooms">Back to rooms</a>'
          }) + '</div></section>';
        return;
      }

      const nights = Site.nights();
      const adults = Math.min(type.capacity, Math.max(1, s.guests));

      host.innerHTML =
        '<div class="section" style="padding-top:calc(var(--nav-h) + 2rem)">' +
          '<div class="wrap">' +

            '<div class="steps">' +
              '<span class="steps__i is-done"><i>✓</i>Dates</span><span class="steps__sep"></span>' +
              '<span class="steps__i is-done"><i>✓</i>Room</span><span class="steps__sep"></span>' +
              '<span class="steps__i is-on"><i>3</i>Your details</span><span class="steps__sep"></span>' +
              '<span class="steps__i"><i>4</i>Confirmed</span>' +
            '</div>' +

            '<h1 class="h1" style="margin-bottom:.4rem">Almost there</h1>' +
            '<p class="lede" style="margin-bottom:2rem">No payment is taken now unless you choose to prepay. ' +
              'Free cancellation until 48 hours before you arrive.</p>' +

            '<div class="grid" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:clamp(1.4rem,3vw,2.4rem);align-items:start" id="coGrid">' +

              '<div class="col" style="gap:1.4rem">' +

                /* ---- 1. the stay ---- */
                '<section class="panel">' +
                  '<div class="row" style="margin-bottom:1rem">' +
                    '<h2 class="h3">1 · Your stay</h2>' +
                    '<span class="spacer"></span>' +
                    '<a class="textlink small" href="#/rooms">Change<span data-icon="arrow-right"></span></a>' +
                  '</div>' +
                  '<div class="row" style="gap:1rem;align-items:stretch">' +
                    '<div style="width:132px;flex:none;border-radius:var(--r);overflow:hidden">' +
                      Art.scene(type.art, { scrim: 0.12, alt: type.name }) + '</div>' +
                    '<div class="col" style="gap:.3rem;min-width:0">' +
                      '<strong style="font-size:1.05rem">' + U.esc(type.name) + '</strong>' +
                      '<span class="small muted">' + U.esc(type.view) + ' · ' + U.esc(type.beds) + ' · ' + type.size + ' m²</span>' +
                      '<span class="small">' + U.esc(U.fmtDateLong(s.checkIn)) + ' → ' + U.esc(U.fmtDateLong(s.checkOut)) + '</span>' +
                      '<span class="small muted">' + Parts.nightsLabel(nights) + ' · arrive from ' +
                        U.esc(Store.state.hotel.checkInTime) + ' · leave by ' + U.esc(Store.state.hotel.checkOutTime) + '</span>' +
                      (row.available <= 2 ? '<span class="tag tag--coral" style="align-self:flex-start;margin-top:.3rem">' +
                        'Only ' + row.available + ' left at this price</span>' : '') +
                    '</div>' +
                  '</div>' +
                  '<div class="formgrid" style="margin-top:1.2rem">' +
                    '<div class="field"><label for="coAdults">Adults</label>' +
                      '<select class="select" id="coAdults" name="adults">' +
                        Array.from({ length: type.capacity }, (_, i) => i + 1).map(n =>
                          '<option value="' + n + '"' + (n === adults ? ' selected' : '') + '>' + n + '</option>').join('') +
                      '</select></div>' +
                    '<div class="field"><label for="coChildren">Children</label>' +
                      '<select class="select" id="coChildren" name="children">' +
                        Array.from({ length: Math.max(1, type.capacity) }, (_, i) => i).map(n =>
                          '<option value="' + n + '">' + n + '</option>').join('') +
                      '</select>' +
                      '<span class="hint">Under sixes eat free at Magnolia Terrace</span></div>' +
                  '</div>' +
                '</section>' +

                /* ---- 2. extras ---- */
                '<section class="panel">' +
                  '<h2 class="h3" style="margin-bottom:.4rem">2 · Make it yours</h2>' +
                  '<p class="small muted" style="margin-bottom:1rem">All optional, all removable later.</p>' +
                  '<div class="col" style="gap:.6rem">' +
                    extraCard('breakfast', breakfastPrice(adults, nights), 'per adult, per night') +
                    extraCard('parking', EXTRAS.parking.price * nights, Parts.money(EXTRAS.parking.price) + ' × ' + Parts.nightsLabel(nights)) +
                    extraCard('dog', EXTRAS.dog.price, 'one-off') +
                    extraCard('latecheck', EXTRAS.latecheck.price, 'one-off') +
                  '</div>' +

                  '<div class="field" style="margin-top:1.1rem">' +
                    '<label for="coTransfer">Airport transfer</label>' +
                    '<select class="select" id="coTransfer" name="transfer">' +
                      TRANSFERS.map(t => '<option value="' + t.value + '">' + U.esc(t.label) +
                        (t.price ? ' · ' + Parts.money(t.price) + ' each way' : '') + '</option>').join('') +
                    '</select>' +
                  '</div>' +

                  '<hr class="divider" style="margin:1.3rem 0 1.1rem">' +
                  '<h3 class="h4" style="margin-bottom:.5rem">Book something while you are here</h3>' +
                  '<p class="small muted" style="margin-bottom:.8rem">Optional — you can also do this any time before you arrive.</p>' +
                  '<div class="row row--wrap" style="gap:.5rem">' +
                    '<button class="btn btn--sm" data-add="table"><span data-icon="utensils"></span>A table</button>' +
                    '<button class="btn btn--sm" data-add="spa"><span data-icon="sparkle"></span>A treatment</button>' +
                    '<button class="btn btn--sm" data-add="exp"><span data-icon="ship"></span>An experience</button>' +
                  '</div>' +
                  '<div id="coServices" class="col" style="gap:.5rem;margin-top:.9rem"></div>' +
                '</section>' +

                /* ---- 3. guest ---- */
                '<section class="panel">' +
                  '<h2 class="h3" style="margin-bottom:1rem">3 · Who is staying</h2>' +
                  '<form id="coForm" novalidate>' +
                    '<div class="formgrid">' +
                      UI.field({ label: 'First name', name: 'firstName', placeholder: 'Nino' }) +
                      UI.field({ label: 'Last name', name: 'lastName', placeholder: 'Beridze' }) +
                      UI.field({ label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com', hint: 'Your confirmation goes here' }) +
                      UI.field({ label: 'Phone', name: 'phone', placeholder: '+995 555 12 34 56' }) +
                      UI.field({
                        label: 'Country', name: 'country', type: 'select', value: 'ES',
                        options: Seed.COUNTRIES.map(c => ({ value: c, label: c }))
                      }) +
                      UI.field({
                        label: 'Estimated arrival', name: 'eta', type: 'select', value: '15:00 – 18:00',
                        options: ['Before 15:00', '15:00 – 18:00', '18:00 – 21:00', '21:00 – 24:00', 'After midnight']
                          .map(v => ({ value: v, label: v }))
                      }) +
                      UI.field({
                        label: 'Anything else we should know?', name: 'notes', type: 'textarea', span2: true,
                        placeholder: 'A quiet room, a high floor, an anniversary, a cot, an allergy…'
                      }) +
                    '</div>' +
                  '</form>' +
                '</section>' +

                /* ---- 4. payment ---- */
                '<section class="panel">' +
                  '<h2 class="h3" style="margin-bottom:1rem">4 · How you would like to pay</h2>' +
                  '<div class="col" style="gap:.6rem">' +
                    '<label class="optioncard is-on" data-rate="guaranteed">' +
                      '<input type="radio" name="rateplan" value="guaranteed" checked>' +
                      '<div><strong>Pay at the hotel</strong>' +
                      '<span>Nothing taken now. Free cancellation until 48 hours before arrival.</span></div>' +
                      '<span class="price-tag">Flexible</span>' +
                    '</label>' +
                    '<label class="optioncard" data-rate="prepaid">' +
                      '<input type="radio" name="rateplan" value="prepaid">' +
                      '<div><strong>Prepay and save 10%</strong>' +
                      '<span>Charged today. Non-refundable, but movable once within twelve months.</span></div>' +
                      '<span class="price-tag" id="prepaySave"></span>' +
                    '</label>' +
                  '</div>' +
                  '<div id="cardBox" style="display:none;margin-top:1rem">' +
                    '<div class="notice" style="margin-bottom:1rem"><span data-icon="lock"></span>' +
                      '<div>This is a demonstration site — do not enter a real card. Nothing is transmitted anywhere.</div></div>' +
                    '<div class="formgrid">' +
                      UI.field({ label: 'Card number', name: 'card', placeholder: '4242 4242 4242 4242', span2: true }) +
                      UI.field({ label: 'Expiry', name: 'exp', placeholder: 'MM/YY' }) +
                      UI.field({ label: 'CVC', name: 'cvc', placeholder: '123' }) +
                    '</div>' +
                  '</div>' +
                '</section>' +

              '</div>' +

              /* ---- summary ---- */
              '<aside class="panel panel--sticky" id="coSummary"></aside>' +

            '</div>' +
          '</div>' +
        '</div>';

      wire(host, type, row);
      repaint();

      /* ---------- helpers bound to this render ---------- */

      function breakfastPrice(a, n) {
        return Store.state.hotel.breakfastPrice * a * n;
      }

      function extraCard(key, price, note) {
        const e = EXTRAS[key];
        return '<label class="optioncard' + (Site.basket[key] ? ' is-on' : '') + '" data-extra="' + key + '">' +
          '<input type="checkbox"' + (Site.basket[key] ? ' checked' : '') + '>' +
          '<div><strong>' + U.esc(e.label) + '</strong><span>' + U.esc(e.note) + '</span></div>' +
          '<span class="price-tag">' + Parts.money(price) + '<br><small class="muted" style="font-weight:400">' + U.esc(note) + '</small></span>' +
          '</label>';
      }

      /* ---------- pricing ---------- */

      function currentAdults() {
        const el = host.querySelector('#coAdults');
        return el ? Number(el.value) : adults;
      }
      function currentChildren() {
        const el = host.querySelector('#coChildren');
        return el ? Number(el.value) : 0;
      }

      function quote() {
        const a = currentAdults(), ch = currentChildren();
        const people = a + ch;
        const lines = [];

        lines.push({ label: Parts.nightsLabel(nights) + ' × ' + Parts.money(row.nightly), amount: row.total });

        if (Site.basket.breakfast) {
          lines.push({ label: 'Breakfast · ' + a + ' adult' + (a === 1 ? '' : 's') + ' × ' + nights, amount: breakfastPrice(a, nights) });
        }
        if (Site.basket.parking) lines.push({ label: 'Valet parking × ' + nights, amount: EXTRAS.parking.price * nights });
        if (Site.basket.dog) lines.push({ label: 'Dog', amount: EXTRAS.dog.price });
        if (Site.basket.latecheck) lines.push({ label: 'Late check-out', amount: EXTRAS.latecheck.price });

        const tr = TRANSFERS.find(t => t.value === (host.querySelector('#coTransfer') || {}).value) || TRANSFERS[0];
        if (tr.price) lines.push({ label: 'Transfer · ' + tr.label.split(' ·')[0], amount: tr.price });

        Site.basket.services.forEach(sv => lines.push({ label: sv.label, amount: sv.price, service: true }));

        const cityTax = U.round2(Store.state.hotel.cityTax * people * nights);
        const subtotal = U.sum(lines, l => l.amount);

        const plan = (host.querySelector('[name=rateplan]:checked') || {}).value || 'guaranteed';
        const discount = plan === 'prepaid' ? U.round2(row.total * 0.1) : 0;

        return {
          lines: lines, cityTax: cityTax, subtotal: subtotal,
          discount: discount, plan: plan, people: people, adults: a, children: ch,
          transfer: tr,
          total: U.round2(subtotal + cityTax - discount)
        };
      }

      function repaint() {
        const q = quote();

        host.querySelector('#coSummary').innerHTML =
          '<h2 class="h3" style="margin-bottom:.2rem">' + U.esc(type.name) + '</h2>' +
          '<p class="small muted" style="margin-bottom:1rem">' +
            U.esc(U.fmtDate(s.checkIn)) + ' → ' + U.esc(U.fmtDate(s.checkOut)) + ' · ' +
            q.people + (q.people === 1 ? ' guest' : ' guests') + '</p>' +
          q.lines.map(l =>
            '<div class="linerow"><span>' + U.esc(l.label) + '</span><b>' + Parts.money(l.amount) + '</b></div>').join('') +
          '<div class="linerow"><span>City tax · ' + q.people + ' × ' + nights + '</span><b>' + Parts.money(q.cityTax, 2) + '</b></div>' +
          (q.discount ? '<div class="linerow" style="color:var(--ok)"><span>Prepay discount</span><b>−' + Parts.money(q.discount) + '</b></div>' : '') +
          '<div class="linerow linerow--total"><span>Total</span><b>' + Parts.money(q.total) + '</b></div>' +
          '<p class="small muted" style="margin:.5rem 0 1rem">Includes VAT at ' + Store.state.hotel.taxRate + '%.</p>' +
          '<button class="btn btn--primary btn--lg btn--block" id="coConfirm">' +
            (q.plan === 'prepaid' ? 'Pay ' + Parts.money(q.total) + ' & confirm' : 'Confirm booking') +
          '</button>' +
          '<p class="small muted" style="text-align:center;margin-top:.7rem">' +
            (q.plan === 'prepaid' ? 'Charged today · non-refundable' : 'Nothing charged now · free cancellation for 48h') + '</p>';

        const save = host.querySelector('#prepaySave');
        if (save) save.textContent = '−' + Parts.money(U.round2(row.total * 0.1));

        host.querySelector('#cardBox').style.display = q.plan === 'prepaid' ? 'block' : 'none';

        // services list
        const sv = host.querySelector('#coServices');
        sv.innerHTML = Site.basket.services.length
          ? Site.basket.services.map((x, i) =>
            '<div class="notice" style="padding:.6rem .8rem"><span data-icon="' + U.esc(x.icon) + '"></span>' +
            '<div style="flex:1"><strong style="font-size:.9rem">' + U.esc(x.label) + '</strong>' +
            '<div class="small muted">' + U.esc(x.detail) + '</div></div>' +
            '<button class="iconbtn" data-rmsvc="' + i + '" title="Remove" data-icon="x" style="width:30px;height:30px"></button></div>').join('')
          : '';

        Icons.render(host);
      }

      Pages.checkout._repaint = repaint;

      function wire(root, type, row) {
        U.on(root, 'change', '#coAdults, #coChildren, #coTransfer', repaint);

        U.on(root, 'click', '[data-extra]', function (e, el) {
          // let the label's own checkbox toggle, then read it
          setTimeout(function () {
            const key = el.dataset.extra;
            Site.basket[key] = el.querySelector('input').checked;
            el.classList.toggle('is-on', Site.basket[key]);
            repaint();
          }, 0);
        });

        U.on(root, 'change', '[name=rateplan]', function () {
          U.$$('[data-rate]', root).forEach(l =>
            l.classList.toggle('is-on', l.querySelector('input').checked));
          repaint();
        });

        U.on(root, 'click', '[data-rmsvc]', function (e, el) {
          Site.basket.services.splice(Number(el.dataset.rmsvc), 1);
          repaint();
        });

        U.on(root, 'click', '[data-add]', function (e, el) {
          addService(el.dataset.add, repaint);
        });

        U.on(root, 'click', '#coConfirm', function () {
          confirmBooking(type, row, quote());
        });
      }

      function confirmBooking(type, row, q) {
        const form = host.querySelector('#coForm');
        const d = UI.formData(form);
        const errors = {};
        if (!d.firstName) errors.firstName = 'Your first name.';
        if (!d.lastName) errors.lastName = 'Your last name.';
        if (!d.email || d.email.indexOf('@') === -1) errors.email = 'A valid email for your confirmation.';
        if (!d.phone) errors.phone = 'A number, in case we need to reach you on the day.';
        if (Object.keys(errors).length) {
          UI.setErrors(form, errors);
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        UI.setErrors(form, {});

        let ref = null;
        try {
          ref = Store.update('site:booking', function (state) {
            // reuse a profile if this guest has stayed before
            let guest = state.guests.find(g =>
              (g.email || '').toLowerCase() === d.email.trim().toLowerCase());
            if (!guest) {
              guest = {
                id: U.uid('g'),
                firstName: d.firstName.trim(), lastName: d.lastName.trim(),
                email: d.email.trim(), phone: d.phone.trim(),
                country: d.country, vip: false,
                docType: 'Passport', docId: '', notes: '',
                prefs: d.notes || '', marketingOptIn: false,
                createdAt: new Date().toISOString()
              };
              state.guests.push(guest);
            } else {
              guest.phone = d.phone.trim() || guest.phone;
              guest.country = d.country || guest.country;
            }

            const free = Domain.availableRooms(s.checkIn, s.checkOut, { typeId: type.id });
            if (!free.length) throw new Error('That room type has just sold out.');

            const notes = [
              d.notes,
              'Arrival ' + d.eta,
              q.transfer.price ? 'Transfer: ' + q.transfer.label : '',
              Site.basket.parking ? 'Valet parking booked' : '',
              Site.basket.dog ? 'Travelling with a dog' : '',
              Site.basket.latecheck ? 'Late check-out purchased' : ''
            ].filter(Boolean).join(' · ');

            const booking = Domain.createBooking({
              guestId: guest.id,
              roomId: free[0].id,
              checkIn: s.checkIn,
              checkOut: s.checkOut,
              adults: q.adults,
              children: q.children,
              rate: row.nightly,
              channel: 'direct',
              breakfast: !!Site.basket.breakfast,
              paymentStatus: q.plan === 'prepaid' ? 'prepaid' : 'guaranteed',
              notes: notes
            });

            // attach anything booked alongside the room
            Site.basket.services.forEach(function (svc) {
              try {
                if (svc.kind === 'table') {
                  Domain.bookTable(Object.assign({}, svc.payload, {
                    bookingId: booking.id, guestId: guest.id,
                    guestName: guest.firstName + ' ' + guest.lastName, email: guest.email
                  }));
                } else if (svc.kind === 'spa') {
                  Domain.bookTreatment(Object.assign({}, svc.payload, {
                    bookingId: booking.id, guestId: guest.id,
                    guestName: guest.firstName + ' ' + guest.lastName, email: guest.email
                  }));
                } else if (svc.kind === 'exp') {
                  Domain.bookExperience(Object.assign({}, svc.payload, {
                    bookingId: booking.id, guestId: guest.id,
                    guestName: guest.firstName + ' ' + guest.lastName, email: guest.email
                  }));
                }
              } catch (err) {
                console.warn('[Magnolia House] could not attach a service', err);
              }
            });

            if (q.plan === 'prepaid') {
              Domain.postPayment(booking.id, q.total, 'Card ••4242 · prepaid online');
            }

            Store.log('Direct booking from the website · ' + booking.ref + ' · ' +
              guest.firstName + ' ' + guest.lastName + ' · ' + type.name,
              'globe', '#/bookings', 'booking');

            return booking.ref;
          });
        } catch (err) {
          UI.toast('We could not complete that', err.message, 'error');
          return;
        }

        Site.resetBasket();
        try { sessionStorage.setItem('magnoliahouse:lastRef', ref); } catch (e) { /* ignore */ }
        Site.go('#/confirmation?ref=' + encodeURIComponent(ref));
      }
    }
  };

  /* ============================================================
     add-on pickers — reuse the same booking modals, but stage the
     result in the basket instead of committing it immediately
     ============================================================ */

  function addService(kind, done) {
    const s = Site.search;

    if (kind === 'table') {
      const r = Store.state.restaurants[0];
      pickTable(r, done);
    } else if (kind === 'spa') {
      pickSpa(done);
    } else {
      pickExperience(done);
    }
  }

  function pickTable(defaultRestaurant, done) {
    const s = Site.search;
    const state = { restaurantId: defaultRestaurant.id, date: s.checkIn, time: null, party: Math.max(2, s.guests) };

    const m = UI.modal({
      title: 'Add a table',
      subtitle: 'Held against your booking — nothing is charged now',
      size: 'md',
      body:
        '<form id="atForm">' +
          '<div class="formgrid" style="margin-bottom:1rem">' +
            '<div class="field"><label for="atR">Restaurant</label><select class="select" id="atR" name="restaurantId">' +
              Store.state.restaurants.map(r => '<option value="' + r.id + '">' + U.esc(r.name) + ' · ' + U.esc(r.cuisine) + '</option>').join('') +
            '</select></div>' +
            '<div class="field"><label for="atP">People</label><select class="select" id="atP" name="party">' +
              [1, 2, 3, 4, 5, 6, 8].map(n => '<option value="' + n + '"' + (n === state.party ? ' selected' : '') + '>' + n + '</option>').join('') +
            '</select></div>' +
            '<div class="field span2" style="grid-column:1/-1"><label for="atD">Date</label>' +
              '<input class="input" type="date" id="atD" name="date" value="' + U.esc(state.date) + '" min="' + U.esc(s.checkIn) + '" max="' + U.esc(s.checkOut) + '">' +
              '<span class="hint">During your stay</span></div>' +
          '</div>' +
          '<div class="field"><label>Sitting</label><div class="slots" id="atSlots"></div></div>' +
        '</form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="atGo">Add to booking</button>'
    });

    const form = m.el.querySelector('#atForm');
    const slots = m.el.querySelector('#atSlots');

    function paint() {
      const d = UI.formData(form);
      state.restaurantId = d.restaurantId; state.date = d.date; state.party = Number(d.party);
      const r = Domain.restaurant(state.restaurantId);
      if (!Domain.restaurantOpenOn(r, state.date)) {
        // suggest another night, but only one that falls inside the stay
        const next = Domain.nextRestaurantDate(r.id, state.date);
        const inStay = next && next < s.checkOut ? next : null;
        slots.innerHTML = '<p class="small" style="color:var(--warn)">' + U.esc(r.name) + ' is closed on ' +
          U.esc(U.dow(state.date)) + 's.' +
          (inStay
            ? ' <button type="button" class="textlink" data-nextopen="' + inStay + '" ' +
              'style="background:none;border:0;padding:0;cursor:pointer;font:inherit">Try ' +
              U.esc(U.fmtDate(inStay)) + '</button>'
            : ' Try another restaurant or date.') + '</p>';
        state.time = null;
        Icons.render(slots);
        return;
      }
      const av = Domain.diningAvailability(state.restaurantId, state.date, state.party);
      slots.innerHTML = av.map(a => '<button type="button" class="slot' + (state.time === a.time ? ' is-on' : '') +
        '" data-s="' + a.time + '"' + (a.canSeat ? '' : ' disabled') + '>' + a.time + '</button>').join('');
    }
    U.on(form, 'change', 'select, input', paint);
    U.on(slots, 'click', '[data-s]', function (e, el) {
      if (el.disabled) return;
      state.time = el.dataset.s;
      U.$$('.slot', slots).forEach(x => x.classList.toggle('is-on', x === el));
    });
    U.on(slots, 'click', '[data-nextopen]', function (e, el) {
      form.querySelector('#atD').value = el.dataset.nextopen;
      paint();
    });
    paint();

    m.el.querySelector('#atGo').addEventListener('click', function () {
      if (!state.time) { UI.toast('Pick a sitting', 'Choose a time for the table.', 'warn'); return; }
      const r = Domain.restaurant(state.restaurantId);
      Site.addService({
        kind: 'table', icon: 'utensils', price: 0,
        label: 'Table at ' + r.name,
        detail: U.fmtDate(state.date) + ' at ' + state.time + ' · ' + state.party + ' covers · pay at the restaurant',
        payload: { restaurantId: state.restaurantId, date: state.date, time: state.time, party: state.party, source: 'site' }
      });
      m.close();
      done();
      UI.toast('Table added', r.name + ' · ' + U.fmtDate(state.date) + ' at ' + state.time, 'ok');
    });
  }

  function pickSpa(done) {
    const s = Site.search;
    const spa = Store.state.spa;
    const state = { treatmentId: spa.treatments[0].id, date: s.checkIn, time: null };

    const m = UI.modal({
      title: 'Add a treatment',
      subtitle: 'Charged to your room on the day',
      size: 'md',
      body:
        '<form id="asForm">' +
          '<div class="formgrid" style="margin-bottom:1rem">' +
            '<div class="field span2" style="grid-column:1/-1"><label for="asT">Treatment</label>' +
              '<select class="select" id="asT" name="treatmentId">' +
                spa.treatments.map(t => '<option value="' + t.id + '">' + U.esc(t.name) + ' · ' + t.duration +
                  ' min · ' + U.money(t.price, null, { decimals: 0 }) + '</option>').join('') +
              '</select></div>' +
            '<div class="field span2" style="grid-column:1/-1"><label for="asD">Date</label>' +
              '<input class="input" type="date" id="asD" name="date" value="' + U.esc(state.date) + '" min="' + U.esc(s.checkIn) + '" max="' + U.esc(s.checkOut) + '"></div>' +
          '</div>' +
          '<div class="field"><label>Time</label><div class="slots" id="asSlots"></div></div>' +
        '</form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="asGo">Add to booking</button>'
    });

    const form = m.el.querySelector('#asForm');
    const slots = m.el.querySelector('#asSlots');

    function paint() {
      const d = UI.formData(form);
      state.treatmentId = d.treatmentId; state.date = d.date;
      slots.innerHTML = Domain.spaAvailability(state.date).map(a =>
        '<button type="button" class="slot' + (state.time === a.time ? ' is-on' : '') + '" data-s="' + a.time + '"' +
        (a.canBook ? '' : ' disabled') + '>' + a.time + '</button>').join('');
    }
    U.on(form, 'change', 'select, input', paint);
    U.on(slots, 'click', '[data-s]', function (e, el) {
      if (el.disabled) return;
      state.time = el.dataset.s;
      U.$$('.slot', slots).forEach(x => x.classList.toggle('is-on', x === el));
    });
    paint();

    m.el.querySelector('#asGo').addEventListener('click', function () {
      if (!state.time) { UI.toast('Pick a time', 'Choose a slot for the treatment.', 'warn'); return; }
      const t = Domain.treatment(state.treatmentId);
      Site.addService({
        kind: 'spa', icon: 'sparkle', price: t.price,
        label: t.name,
        detail: U.fmtDate(state.date) + ' at ' + state.time + ' · ' + t.duration + ' minutes',
        payload: { treatmentId: t.id, date: state.date, time: state.time, source: 'site' }
      });
      m.close();
      done();
      UI.toast('Treatment added', t.name + ' · ' + U.fmtDate(state.date), 'ok');
    });
  }

  function pickExperience(done) {
    const s = Site.search;
    const state = { experienceId: Store.state.experiences[0].id, date: null, people: Math.max(1, s.guests) };

    const m = UI.modal({
      title: 'Add an experience',
      subtitle: 'Charged to your room on the day',
      size: 'md',
      body:
        '<form id="aeForm">' +
          '<div class="formgrid" style="margin-bottom:1rem">' +
            '<div class="field span2" style="grid-column:1/-1"><label for="aeE">Experience</label>' +
              '<select class="select" id="aeE" name="experienceId">' +
                Store.state.experiences.map(e => '<option value="' + e.id + '">' + U.esc(e.name) + ' · ' +
                  U.money(e.price, null, { decimals: 0 }) + ' pp</option>').join('') +
              '</select></div>' +
            '<div class="field"><label for="aeP">People</label><select class="select" id="aeP" name="people">' +
              [1, 2, 3, 4, 5, 6].map(n => '<option value="' + n + '"' + (n === state.people ? ' selected' : '') + '>' + n + '</option>').join('') +
            '</select></div>' +
          '</div>' +
          '<div class="field"><label>Dates during your stay</label><div class="slots" id="aeDates"></div></div>' +
        '</form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="aeGo">Add to booking</button>'
    });

    const form = m.el.querySelector('#aeForm');
    const host = m.el.querySelector('#aeDates');

    function paint() {
      const d = UI.formData(form);
      state.experienceId = d.experienceId; state.people = Number(d.people);
      const within = Domain.experienceDates(state.experienceId, s.checkIn, 20)
        .filter(x => x.date >= s.checkIn && x.date < s.checkOut);
      host.innerHTML = within.length
        ? within.map(x => '<button type="button" class="slot' + (state.date === x.date ? ' is-on' : '') +
          '" data-s="' + x.date + '"' + (x.left >= state.people ? '' : ' disabled') + '>' +
          U.dowShort(x.date) + ' ' + U.parse(x.date).getDate() +
          '<small>' + (x.left >= state.people ? x.left + ' left' : 'full') + '</small></button>').join('')
        : '<p class="small muted">This one does not run during your stay. Try another.</p>';
      if (state.date && !within.some(x => x.date === state.date && x.left >= state.people)) state.date = null;
    }
    U.on(form, 'change', 'select', paint);
    U.on(host, 'click', '[data-s]', function (e, el) {
      if (el.disabled) return;
      state.date = el.dataset.s;
      U.$$('.slot', host).forEach(x => x.classList.toggle('is-on', x === el));
    });
    paint();

    m.el.querySelector('#aeGo').addEventListener('click', function () {
      if (!state.date) { UI.toast('Pick a date', 'Choose a date during your stay.', 'warn'); return; }
      const e = Domain.experience(state.experienceId);
      Site.addService({
        kind: 'exp', icon: 'ship', price: e.price * state.people,
        label: e.name,
        detail: U.fmtDate(state.date) + ' at ' + e.time + ' · ' + state.people + ' place(s)',
        payload: { experienceId: e.id, date: state.date, people: state.people, source: 'site' }
      });
      m.close();
      done();
      UI.toast('Experience added', e.name + ' · ' + U.fmtDate(state.date), 'ok');
    });
  }

  /* ============================================================
     Confirmation
     ============================================================ */

  Pages.confirmation = {
    title: () => 'Booking confirmed',

    render: function (host, params) {
      let ref = params.ref;
      if (!ref) { try { ref = sessionStorage.getItem('magnoliahouse:lastRef'); } catch (e) { /* ignore */ } }
      const booking = ref ? Store.state.bookings.find(b => b.ref === ref) : null;

      if (!booking) {
        host.innerHTML = '<section class="section" style="padding-top:calc(var(--nav-h) + 2rem)"><div class="wrap">' +
          Parts.empty({
            icon: 'search', title: 'We cannot find that booking',
            text: 'Look it up with your reference and surname instead.',
            action: '<a class="btn btn--primary" style="margin-top:1.2rem" href="#/booking">Find my booking</a>'
          }) + '</div></section>';
        return;
      }

      const g = Store.guest(booking.guestId);
      const type = Store.roomType(booking.typeId);
      const nights = U.nights(booking.checkIn, booking.checkOut);
      const totals = Domain.folioTotals(booking.id);
      const svc = Domain.servicesForBooking(booking.id);

      host.innerHTML =
        '<div class="section" style="padding-top:calc(var(--nav-h) + 2rem)">' +
          '<div class="wrap wrap--narrow">' +

            '<div class="steps" style="justify-content:center">' +
              '<span class="steps__i is-done"><i>✓</i>Dates</span><span class="steps__sep"></span>' +
              '<span class="steps__i is-done"><i>✓</i>Room</span><span class="steps__sep"></span>' +
              '<span class="steps__i is-done"><i>✓</i>Details</span><span class="steps__sep"></span>' +
              '<span class="steps__i is-on"><i>4</i>Confirmed</span>' +
            '</div>' +

            '<div style="text-align:center;margin-bottom:2rem">' +
              '<div style="width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;background:var(--ok-bg);' +
                'color:var(--ok);display:grid;place-items:center"><span data-icon="check-circle" style="font-size:1.9rem"></span></div>' +
              '<h1 class="h1" style="margin-bottom:.5rem">You are booked, ' + U.esc(g ? g.firstName : 'thank you') + '</h1>' +
              '<p class="lede">We have sent everything to ' + U.esc(g ? g.email : 'your email') + '. ' +
                'The whole house is looking forward to it.</p>' +
            '</div>' +

            '<div class="panel" style="text-align:center;margin-bottom:1.4rem">' +
              '<p class="small muted" style="letter-spacing:.14em;text-transform:uppercase">Your reference</p>' +
              '<p class="display" style="font-size:2.6rem;margin:.2rem 0">' + U.esc(booking.ref) + '</p>' +
              '<p class="small muted">Quote this for anything — a table, a treatment, a question.</p>' +
            '</div>' +

            '<div class="panel" style="margin-bottom:1.4rem">' +
              '<h2 class="h3" style="margin-bottom:1rem">Your stay</h2>' +
              '<div class="linerow"><span>Room</span><b>' + U.esc(type ? type.name : '') + '</b></div>' +
              '<div class="linerow"><span>Arrive</span><b>' + U.esc(U.fmtDateLong(booking.checkIn)) + ' from ' + U.esc(Store.state.hotel.checkInTime) + '</b></div>' +
              '<div class="linerow"><span>Depart</span><b>' + U.esc(U.fmtDateLong(booking.checkOut)) + ' by ' + U.esc(Store.state.hotel.checkOutTime) + '</b></div>' +
              '<div class="linerow"><span>Nights</span><b>' + nights + '</b></div>' +
              '<div class="linerow"><span>Guests</span><b>' + booking.adults + ' adult' + (booking.adults === 1 ? '' : 's') +
                (booking.children ? ' · ' + booking.children + ' child' + (booking.children === 1 ? '' : 'ren') : '') + '</b></div>' +
              '<div class="linerow"><span>Breakfast</span><b>' + (booking.breakfast ? 'Included' : 'Not included') + '</b></div>' +
              '<div class="linerow"><span>Payment</span><b>' +
                (booking.paymentStatus === 'prepaid' ? 'Prepaid online' : 'Pay at the hotel') + '</b></div>' +
              '<div class="linerow linerow--total"><span>' +
                (booking.paymentStatus === 'prepaid' ? 'Paid' : 'Due on departure') + '</span>' +
                '<b>' + Parts.money(booking.paymentStatus === 'prepaid' ? totals.payments : booking.rate * nights) + '</b></div>' +
            '</div>' +

            (svc.dining.length || svc.spa.length || svc.experiences.length
              ? '<div class="panel" style="margin-bottom:1.4rem">' +
                '<h2 class="h3" style="margin-bottom:1rem">Also booked</h2>' +
                svc.dining.map(r => {
                  const rest = Domain.restaurant(r.restaurantId);
                  return '<div class="linerow"><span><span data-icon="utensils"></span> ' +
                    U.esc(rest ? rest.name : 'Table') + '</span><b>' + U.esc(U.fmtDate(r.date)) + ' · ' + U.esc(r.time) + '</b></div>';
                }).join('') +
                svc.spa.map(r => {
                  const t = Domain.treatment(r.treatmentId);
                  return '<div class="linerow"><span><span data-icon="sparkle"></span> ' +
                    U.esc(t ? t.name : 'Treatment') + '</span><b>' + U.esc(U.fmtDate(r.date)) + ' · ' + U.esc(r.time) + '</b></div>';
                }).join('') +
                svc.experiences.map(r => {
                  const e = Domain.experience(r.experienceId);
                  return '<div class="linerow"><span><span data-icon="ship"></span> ' +
                    U.esc(e ? e.name : 'Experience') + '</span><b>' + U.esc(U.fmtDate(r.date)) + ' · ' + r.people + ' place(s)</b></div>';
                }).join('') +
              '</div>'
              : '') +

            '<div class="panel" style="margin-bottom:1.4rem">' +
              '<h2 class="h3" style="margin-bottom:.6rem">While you wait</h2>' +
              '<p class="small muted" style="margin-bottom:1rem">Everything below can be added to your reference right up until you arrive.</p>' +
              '<div class="row row--wrap" style="gap:.5rem">' +
                '<a class="btn" href="#/dining"><span data-icon="utensils"></span>Reserve a table</a>' +
                '<a class="btn" href="#/spa"><span data-icon="sparkle"></span>Book a treatment</a>' +
                '<a class="btn" href="#/experiences"><span data-icon="ship"></span>Find an experience</a>' +
              '</div>' +
            '</div>' +

            '<div class="row row--wrap" style="justify-content:center;gap:.6rem">' +
              '<button class="btn btn--ink" id="printIt"><span data-icon="printer"></span>Print this</button>' +
              '<a class="btn" href="#/booking">Manage my booking</a>' +
              '<a class="btn btn--ghost" href="#/">Back to the hotel</a>' +
            '</div>' +

          '</div>' +
        '</div>';

      host.querySelector('#printIt').addEventListener('click', () => window.print());
    }
  };

})(window);
