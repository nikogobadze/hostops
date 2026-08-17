/* ============================================================
   Page — Dining (restaurants + table reservations)
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  Pages.dining = {
    title: () => 'Dining',

    render: function (host, params) {
      const list = Store.state.restaurants;

      host.innerHTML =
        Parts.hero({
          art: 'hero-dining', compact: true, scrim: 0.5,
          eyebrow: 'Eat & drink',
          title: 'Whatever came off the boats this morning',
          sub: 'Three kitchens and a rooftop bar. Guests and non-residents are both welcome — a table is never more than a tap away.',
          alt: 'A table set on the seafront terrace at dusk'
        }) +

        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="col" style="gap:clamp(2rem,4vw,3.4rem)">' +
              list.map((r, i) => restaurantBlock(r, i)).join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--sand">' +
          '<div class="wrap wrap--narrow" style="text-align:center">' +
            Parts.head({
              eyebrow: 'Good to know', title: 'Eating with us', centre: true
            }) +
            '<div class="grid grid--3" style="text-align:left">' +
              [
                { i: 'clock', t: 'Book ahead in summer', d: 'Zghva fills a week out from June to September. We hold a few tables for residents each night.' },
                { i: 'heart', t: 'Tell us anything', d: 'Allergies, a birthday, a proposal, a fussy six-year-old. Put it in the notes and we will handle it.' },
                { i: 'utensils', t: 'Children and dogs', d: 'Both welcome at Magnolia Terrace and Sal. Under-sixes eat free from the children’s menu.' }
              ].map(x =>
                '<div class="amenity" style="border-top:0"><span data-icon="' + x.i + '"></span>' +
                '<div><strong>' + U.esc(x.t) + '</strong><span>' + U.esc(x.d) + '</span></div></div>').join('') +
            '</div>' +
          '</div>' +
        '</section>';

      wire(host);

      if (params && params.id) {
        const r = Domain.restaurant(params.id);
        if (r) openRestaurant(r.id);
        history.replaceState(null, '', '#/dining');
      }
    },

    openTable: openTable
  };

  /* ============================================================
     markup
     ============================================================ */

  function restaurantBlock(r, i) {
    const today = U.today();
    const openToday = Domain.restaurantOpenOn(r, today);

    return '<article class="feature reveal" data-rest="' + r.id + '">' +
      '<div class="feature__art">' + Art.scene(r.art, { scrim: 0.18, alt: r.name }) + '</div>' +
      '<div class="feature__body">' +
        '<span class="eyebrow">' + U.esc(r.cuisine) + '</span>' +
        '<h2 class="h1" style="margin:.5rem 0 .35rem">' + U.esc(r.name) + '</h2>' +
        '<p class="h3" style="color:var(--text-3);font-size:1.06rem;margin-bottom:.9rem">' + U.esc(r.tagline) + '</p>' +
        '<p style="color:var(--text-2);margin-bottom:1rem">' + U.esc(r.description) + '</p>' +

        '<div class="card__meta" style="margin-bottom:1rem">' +
          '<span><span data-icon="clock"></span>' + U.esc(r.hours) + '</span>' +
          '<span><span data-icon="pin"></span>' + U.esc(r.location) + '</span>' +
          '<span><span data-icon="tag"></span>' + U.esc(r.priceRange) + ' · about ' + Parts.money(r.avgPerPerson) + ' a head</span>' +
          '<span><span data-icon="users"></span>' + U.esc(r.dressCode) + '</span>' +
        '</div>' +

        '<ul style="margin:0 0 1.2rem;padding-left:1.1rem;color:var(--text-2);font-size:.93rem">' +
          r.highlights.map(h => '<li style="margin-bottom:.3rem">' + U.esc(h) + '</li>').join('') +
        '</ul>' +

        '<div class="row row--wrap">' +
          '<button class="btn btn--primary" data-booktable="' + r.id + '">' +
            '<span data-icon="utensils"></span>Reserve a table</button>' +
          '<button class="btn" data-menu="' + r.id + '">See the menu</button>' +
          (openToday
            ? '<span class="tag tag--ok"><span data-icon="check"></span>Open today</span>'
            : '<span class="tag tag--warn">Closed today</span>') +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function openRestaurant(id) {
    const r = Domain.restaurant(id);
    if (!r) return;

    UI.modal({
      title: r.name,
      subtitle: r.cuisine + ' · ' + r.hours,
      size: 'lg',
      flush: true,
      body:
        '<div style="aspect-ratio:2.4/1;overflow:hidden">' + Art.scene(r.art, { scrim: 0.16, alt: r.name }) + '</div>' +
        '<div style="padding:1.5rem">' +
          '<p class="lede">' + U.esc(r.description) + '</p>' +
          '<div class="grid grid--2" style="margin-top:1.4rem;gap:1.6rem">' +
            '<div>' +
              '<h4 class="h4" style="margin-bottom:.7rem">Signature plates</h4>' +
              r.signature.map(d =>
                '<div class="linerow"><span>' + U.esc(d.name) + '</span><b>' + Parts.money(d.price) + '</b></div>').join('') +
              '<p class="small muted" style="margin-top:.7rem">A full menu is presented at the table and changes with the catch.</p>' +
            '</div>' +
            '<div>' +
              '<h4 class="h4" style="margin-bottom:.7rem">The detail</h4>' +
              '<div class="linerow"><span>Hours</span><b>' + U.esc(r.hours) + '</b></div>' +
              '<div class="linerow"><span>Where</span><b>' + U.esc(r.location) + '</b></div>' +
              '<div class="linerow"><span>Dress</span><b>' + U.esc(r.dressCode) + '</b></div>' +
              '<div class="linerow"><span>Average spend</span><b>' + Parts.money(r.avgPerPerson) + '</b></div>' +
              '<div class="linerow"><span>Seats per sitting</span><b>' + r.seatsPerSlot + '</b></div>' +
            '</div>' +
          '</div>' +
        '</div>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Close</button>' +
        '<button class="btn btn--primary" id="toTable"><span data-icon="utensils"></span>Reserve a table</button>'
    }).el.querySelector('#toTable').addEventListener('click', function () {
      document.querySelector('.modal-scrim [data-close]').click();
      setTimeout(() => openTable(id), 180);
    });
  }

  /* ============================================================
     table booking
     ============================================================ */

  function openTable(restaurantId, prefill) {
    const r = Domain.restaurant(restaurantId);
    if (!r) return;
    const p = prefill || {};

    // default to the first night of the stay if the guest has dates in mind
    const state = {
      date: p.date || (Site.search.checkIn >= U.today() ? Site.search.checkIn : U.today()),
      party: p.party || Math.min(Math.max(2, Site.search.guests), 8),
      time: null
    };

    const m = UI.modal({
      title: 'Reserve a table · ' + r.name,
      subtitle: r.hours,
      size: 'md',
      body:
        '<form id="tblForm" novalidate>' +
          '<div class="formgrid" style="margin-bottom:1.1rem">' +
            '<div class="field"><label for="tDate">Date</label>' +
              '<input class="input" type="date" id="tDate" name="date" value="' + U.esc(state.date) + '" min="' + U.today() + '"></div>' +
            '<div class="field"><label for="tParty">Party size</label>' +
              '<select class="select" id="tParty" name="party">' +
                [1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n =>
                  '<option value="' + n + '"' + (state.party === n ? ' selected' : '') + '>' +
                  n + ' ' + (n === 1 ? 'person' : 'people') + '</option>').join('') +
              '</select></div>' +
          '</div>' +

          '<div class="field" style="margin-bottom:1.1rem">' +
            '<label>Choose a sitting</label>' +
            '<div class="slots" id="tSlots"></div>' +
            '<span class="err" data-err-for="time" hidden></span>' +
          '</div>' +

          '<div class="formgrid">' +
            '<div class="field span2" style="grid-column:1/-1">' +
              '<label for="tName">Name the table is under</label>' +
              '<input class="input" id="tName" name="guestName" placeholder="Nino Beridze" value="' + U.esc(p.guestName || '') + '">' +
              '<span class="err" data-err-for="guestName" hidden></span>' +
            '</div>' +
            '<div class="field"><label for="tEmail">Email</label>' +
              '<input class="input" type="email" id="tEmail" name="email" placeholder="you@example.com" value="' + U.esc(p.email || '') + '">' +
              '<span class="err" data-err-for="email" hidden></span></div>' +
            '<div class="field"><label for="tPhone">Phone</label>' +
              '<input class="input" id="tPhone" name="phone" placeholder="+995 555 12 34 56" value="' + U.esc(p.phone || '') + '"></div>' +
            '<div class="field span2" style="grid-column:1/-1">' +
              '<label for="tNotes">Anything we should know?</label>' +
              '<input class="input" id="tNotes" name="notes" placeholder="Allergies, a birthday, a window table…">' +
            '</div>' +
            '<div class="field span2" style="grid-column:1/-1">' +
              '<label for="tRef">Staying with us? Add your booking reference</label>' +
              '<input class="input" id="tRef" name="ref" placeholder="HO-4820" value="' + U.esc(p.ref || '') + '">' +
              '<span class="hint">Optional — it links the table to your stay so we know who you are.</span>' +
            '</div>' +
          '</div>' +
        '</form>',
      footer: '<span class="small muted" id="tSummary"></span><span class="spacer"></span>' +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="tGo">Confirm table</button>'
    });

    const form = m.el.querySelector('#tblForm');
    const slotHost = m.el.querySelector('#tSlots');

    function paintSlots() {
      const d = UI.formData(form);
      state.date = d.date;
      state.party = Number(d.party) || 2;

      if (!Domain.restaurantOpenOn(r, state.date)) {
        // never leave the guest at a dead end — offer the next night we open
        const next = Domain.nextRestaurantDate(r.id, state.date);
        slotHost.innerHTML = '<div class="notice notice--warn" style="width:100%"><span data-icon="alert"></span>' +
          '<div>' + U.esc(r.name) + ' is closed on ' + U.esc(U.dow(state.date)) + 's.' +
          (next
            ? ' The next evening we are open is <strong>' + U.esc(U.fmtDateLong(next)) + '</strong>. ' +
              '<button type="button" class="textlink" data-nextopen="' + next + '" ' +
              'style="background:none;border:0;padding:0;cursor:pointer;font:inherit">Use that date' +
              '<span data-icon="arrow-right"></span></button>'
            : ' Please pick another date.') +
          '</div></div>';
        state.time = null;
        summary();
        Icons.render(slotHost);
        return;
      }

      const avail = Domain.diningAvailability(r.id, state.date, state.party);
      slotHost.innerHTML = avail.map(a =>
        '<button type="button" class="slot' + (state.time === a.time ? ' is-on' : '') + '" ' +
        'data-slot="' + a.time + '"' + (a.canSeat ? '' : ' disabled') + '>' +
        a.time + '<small>' + (a.canSeat ? a.left + ' seats' : 'full') + '</small></button>').join('');
      if (state.time && !avail.some(a => a.time === state.time && a.canSeat)) state.time = null;
      summary();
    }

    function summary() {
      m.el.querySelector('#tSummary').textContent = state.time
        ? U.fmtDate(state.date) + ' at ' + state.time + ' · ' + state.party + (state.party === 1 ? ' person' : ' people')
        : 'Pick a sitting to continue';
    }

    form.querySelector('#tDate').addEventListener('change', paintSlots);
    form.querySelector('#tParty').addEventListener('change', paintSlots);

    U.on(slotHost, 'click', '[data-slot]', function (e, el) {
      if (el.disabled) return;
      state.time = el.dataset.slot;
      U.$$('.slot', slotHost).forEach(s => s.classList.toggle('is-on', s === el));
      summary();
    });

    U.on(slotHost, 'click', '[data-nextopen]', function (e, el) {
      form.querySelector('#tDate').value = el.dataset.nextopen;
      paintSlots();
    });

    paintSlots();

    m.el.querySelector('#tGo').addEventListener('click', function () {
      const d = UI.formData(form);
      const errors = {};
      if (!state.time) errors.time = 'Choose a sitting.';
      if (!d.guestName) errors.guestName = 'We need a name for the table.';
      if (!d.email || d.email.indexOf('@') === -1) errors.email = 'A valid email, so we can confirm it.';
      if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }
      UI.setErrors(form, {});

      // link to an existing stay when a reference is given
      let bookingId = null, guestId = null;
      if (d.ref) {
        const bk = Store.state.bookings.find(b => String(b.ref).toUpperCase() === d.ref.trim().toUpperCase());
        if (bk) { bookingId = bk.id; guestId = bk.guestId; }
      }

      try {
        const res = Store.update('site:table', () => {
          const created = Domain.bookTable({
            restaurantId: r.id, date: state.date, time: state.time, party: state.party,
            guestName: d.guestName, email: d.email, phone: d.phone, notes: d.notes,
            bookingId: bookingId, guestId: guestId, source: 'site'
          });
          Store.log('Table booked online · ' + r.name + ' · ' + U.fmtDate(state.date) + ' ' + state.time +
            ' · ' + state.party + ' covers', 'utensils', '#/services', 'dining');
          return created;
        });

        m.close();
        confirmTable(r, res);
      } catch (err) {
        UI.toast('Could not book that table', err.message, 'error');
        paintSlots();
      }
    });
  }

  function confirmTable(r, res) {
    UI.modal({
      title: 'Your table is booked',
      size: 'sm',
      body:
        '<div class="notice notice--ok" style="margin-bottom:1.1rem"><span data-icon="check-circle"></span>' +
          '<div>A confirmation is on its way to <strong>' + U.esc(res.email || 'your email') + '</strong>.</div></div>' +
        '<div class="linerow"><span>Restaurant</span><b>' + U.esc(r.name) + '</b></div>' +
        '<div class="linerow"><span>Date</span><b>' + U.esc(U.fmtDateLong(res.date)) + '</b></div>' +
        '<div class="linerow"><span>Time</span><b>' + U.esc(res.time) + '</b></div>' +
        '<div class="linerow"><span>Covers</span><b>' + res.party + '</b></div>' +
        '<div class="linerow"><span>Under</span><b>' + U.esc(res.guestName || Domain.serviceGuestName(res)) + '</b></div>' +
        (res.notes ? '<div class="linerow"><span>Note</span><b>' + U.esc(res.notes) + '</b></div>' : '') +
        '<p class="small muted" style="margin-top:1rem">Tables are held for 15 minutes. To change or cancel, call ' +
          U.esc(Store.state.hotel.phone) + '.</p>',
      footer: '<span class="spacer"></span><button class="btn btn--primary" data-close>Done</button>'
    });
    UI.toast('Table confirmed', r.name + ' · ' + U.fmtDate(res.date) + ' at ' + res.time, 'ok');
  }

  /* ============================================================
     wiring
     ============================================================ */

  function wire(host) {
    U.on(host, 'click', '[data-booktable]', (e, el) => openTable(el.dataset.booktable));
    U.on(host, 'click', '[data-menu]', (e, el) => openRestaurant(el.dataset.menu));
    U.on(host, 'click', '.feature__art', function (e, el) {
      const block = el.closest('[data-rest]');
      if (block) openRestaurant(block.dataset.rest);
    });
  }

})(window);
