/* ============================================================
   Page — Sal & Onda spa (facilities + treatment booking)
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  let category = 'All';

  Pages.spa = {
    title: () => 'Spa & Wellness',

    render: function (host, params) {
      const spa = Store.state.spa;
      const cats = ['All'].concat(U.unique(spa.treatments.map(t => t.category)));
      const list = category === 'All' ? spa.treatments : spa.treatments.filter(t => t.category === category);

      host.innerHTML =
        Parts.hero({
          art: 'hero-spa', compact: true, scrim: 0.5,
          eyebrow: spa.tagline,
          title: spa.name,
          sub: spa.description,
          alt: 'The sea-water pool in the spa'
        }) +

        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="grid grid--2" style="gap:clamp(1.6rem,4vw,3.4rem);align-items:start">' +
              '<div class="reveal">' +
                Parts.head({ eyebrow: 'The rooms below the garden', title: 'Water first, everything else after' }) +
                '<p style="color:var(--text-2)">Entry to the pool, sauna, hammam and relaxation terrace is included for every resident, ' +
                  'every day, with no need to book. Treatments are separate and worth planning — the late slots go first.</p>' +
                '<div class="row row--wrap" style="margin-top:1.2rem">' +
                  '<span class="tag"><span data-icon="clock"></span>' + U.esc(spa.hours) + '</span>' +
                  '<span class="tag"><span data-icon="sparkle"></span>' + spa.roomsAvailable + ' treatment rooms</span>' +
                  '<span class="tag tag--sea"><span data-icon="wave"></span>Free for residents</span>' +
                '</div>' +
                '<a class="btn btn--primary" style="margin-top:1.4rem" href="#/spa" data-scrollto="#treatments">' +
                  'See the treatment menu<span data-icon="arrow-right"></span></a>' +
              '</div>' +
              '<div class="reveal">' +
                spa.facilities.map(f =>
                  '<div class="amenity"><span data-icon="' + U.esc(f.icon) + '"></span>' +
                  '<div><strong>' + U.esc(f.name) + '</strong><span>' + U.esc(f.note) + '</span></div></div>').join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--sand" id="treatments">' +
          '<div class="wrap">' +
            Parts.head({ eyebrow: 'Treatments', title: 'The menu', sub: 'Book ahead — we have ' + spa.roomsAvailable + ' rooms and they fill from four o\'clock onwards.' }) +

            '<div class="filters">' +
              cats.map(c => '<button class="chip' + (category === c ? ' is-on' : '') + '" data-cat="' + U.esc(c) + '">' +
                U.esc(c) + '</button>').join('') +
            '</div>' +

            '<div class="grid grid--3 reveal">' +
              list.map(t =>
                '<article class="card card--hover" data-treat="' + t.id + '">' +
                  '<div class="card__body">' +
                    '<span class="eyebrow">' + U.esc(t.category) + '</span>' +
                    '<h3 class="h3">' + U.esc(t.name) + '</h3>' +
                    '<div class="card__meta">' +
                      '<span><span data-icon="clock"></span>' + t.duration + ' min</span>' +
                      (t.category === 'Couples' ? '<span><span data-icon="users"></span>For two</span>' : '') +
                    '</div>' +
                    '<p class="small muted">' + U.esc(t.description) + '</p>' +
                    '<div class="row">' +
                      '<div><span class="price">' + Parts.money(t.price) + '</span></div>' +
                      '<span class="spacer"></span>' +
                      '<button class="btn btn--sm btn--primary" data-booktreat="' + t.id + '">Book</button>' +
                    '</div>' +
                  '</div>' +
                '</article>').join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="wrap wrap--narrow">' +
            '<div class="notice"><span data-icon="info"></span>' +
              '<div><strong>Before you come down.</strong> Arrive fifteen minutes early, leave your phone in the room, ' +
              'and tell us about pregnancy, injuries or allergies when you book so the therapist can plan. ' +
              'Treatments cancelled inside four hours are charged in full.</div></div>' +
          '</div>' +
        '</section>';

      wire(host);

      if (params && params.id) {
        openTreatment(params.id);
        history.replaceState(null, '', '#/spa');
      }
    },

    openTreatment: openTreatment
  };

  /* ============================================================
     booking
     ============================================================ */

  function openTreatment(treatmentId, prefill) {
    const t = Domain.treatment(treatmentId);
    if (!t) return;
    const p = prefill || {};

    const state = {
      date: p.date || (Site.search.checkIn >= U.today() ? Site.search.checkIn : U.today()),
      time: null
    };

    const m = UI.modal({
      title: t.name,
      subtitle: t.duration + ' minutes · ' + Parts.money(t.price) + (t.category === 'Couples' ? ' for two' : ''),
      size: 'md',
      body:
        '<p class="lede" style="margin-bottom:1.2rem">' + U.esc(t.description) + '</p>' +
        '<form id="spaForm" novalidate>' +
          '<div class="field" style="margin-bottom:1.1rem">' +
            '<label for="spDate">Date</label>' +
            '<input class="input" type="date" id="spDate" name="date" value="' + U.esc(state.date) + '" min="' + U.today() + '">' +
          '</div>' +
          '<div class="field" style="margin-bottom:1.1rem">' +
            '<label>Available times</label>' +
            '<div class="slots" id="spSlots"></div>' +
            '<span class="err" data-err-for="time" hidden></span>' +
          '</div>' +
          '<div class="formgrid">' +
            '<div class="field span2" style="grid-column:1/-1"><label for="spName">Name</label>' +
              '<input class="input" id="spName" name="guestName" placeholder="Elena Moretti" value="' + U.esc(p.guestName || '') + '">' +
              '<span class="err" data-err-for="guestName" hidden></span></div>' +
            '<div class="field"><label for="spEmail">Email</label>' +
              '<input class="input" type="email" id="spEmail" name="email" placeholder="you@example.com" value="' + U.esc(p.email || '') + '">' +
              '<span class="err" data-err-for="email" hidden></span></div>' +
            '<div class="field"><label for="spRef">Booking reference</label>' +
              '<input class="input" id="spRef" name="ref" placeholder="HO-4820 (optional)" value="' + U.esc(p.ref || '') + '"></div>' +
            '<div class="field span2" style="grid-column:1/-1"><label for="spNotes">Anything the therapist should know?</label>' +
              '<input class="input" id="spNotes" name="notes" placeholder="Pregnancy, injuries, allergies, pressure preference…"></div>' +
          '</div>' +
        '</form>',
      footer: '<span class="small muted" id="spSummary"></span><span class="spacer"></span>' +
        '<button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="spGo">Confirm · ' + Parts.money(t.price) + '</button>'
    });

    const form = m.el.querySelector('#spaForm');
    const slotHost = m.el.querySelector('#spSlots');

    function paint() {
      state.date = UI.formData(form).date;
      const avail = Domain.spaAvailability(state.date);
      slotHost.innerHTML = avail.map(a =>
        '<button type="button" class="slot' + (state.time === a.time ? ' is-on' : '') + '" data-slot="' + a.time + '"' +
        (a.canBook ? '' : ' disabled') + '>' + a.time +
        '<small>' + (a.canBook ? a.left + ' free' : 'full') + '</small></button>').join('');
      if (state.time && !avail.some(a => a.time === state.time && a.canBook)) state.time = null;
      summary();
    }

    function summary() {
      m.el.querySelector('#spSummary').textContent = state.time
        ? U.fmtDate(state.date) + ' at ' + state.time
        : 'Pick a time to continue';
    }

    form.querySelector('#spDate').addEventListener('change', paint);
    U.on(slotHost, 'click', '[data-slot]', function (e, el) {
      if (el.disabled) return;
      state.time = el.dataset.slot;
      U.$$('.slot', slotHost).forEach(s => s.classList.toggle('is-on', s === el));
      summary();
    });
    paint();

    m.el.querySelector('#spGo').addEventListener('click', function () {
      const d = UI.formData(form);
      const errors = {};
      if (!state.time) errors.time = 'Choose a time.';
      if (!d.guestName) errors.guestName = 'We need a name.';
      if (!d.email || d.email.indexOf('@') === -1) errors.email = 'A valid email, please.';
      if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }

      let bookingId = null, guestId = null;
      if (d.ref) {
        const bk = Store.state.bookings.find(b => String(b.ref).toUpperCase() === d.ref.trim().toUpperCase());
        if (bk) { bookingId = bk.id; guestId = bk.guestId; }
      }

      try {
        const res = Store.update('site:spa', () => {
          const created = Domain.bookTreatment({
            treatmentId: t.id, date: state.date, time: state.time,
            guestName: d.guestName, email: d.email, notes: d.notes,
            bookingId: bookingId, guestId: guestId, source: 'site'
          });
          Store.log('Spa treatment booked online · ' + t.name + ' · ' + U.fmtDate(state.date) + ' ' + state.time,
            'sparkle', '#/services', 'spa');
          return created;
        });

        m.close();
        UI.modal({
          title: 'Booked',
          size: 'sm',
          body: '<div class="notice notice--ok" style="margin-bottom:1.1rem"><span data-icon="check-circle"></span>' +
            '<div>We will see you in the spa. A confirmation is on its way to <strong>' + U.esc(d.email) + '</strong>.</div></div>' +
            '<div class="linerow"><span>Treatment</span><b>' + U.esc(t.name) + '</b></div>' +
            '<div class="linerow"><span>When</span><b>' + U.esc(U.fmtDateLong(res.date)) + ' at ' + U.esc(res.time) + '</b></div>' +
            '<div class="linerow"><span>Length</span><b>' + t.duration + ' minutes</b></div>' +
            '<div class="linerow linerow--total"><span>Charged</span><b>' + Parts.money(t.price) + '</b></div>' +
            '<p class="small muted" style="margin-top:.9rem">Added to your room account if you are staying with us, otherwise payable at the spa. ' +
            'Arrive fifteen minutes early.</p>',
          footer: '<span class="spacer"></span><button class="btn btn--primary" data-close>Done</button>'
        });
        UI.toast('Treatment booked', t.name + ' · ' + U.fmtDate(res.date) + ' at ' + res.time, 'ok');
      } catch (err) {
        UI.toast('Could not book that slot', err.message, 'error');
        paint();
      }
    });
  }

  function wire(host) {
    U.on(host, 'click', '[data-cat]', function (e, el) { category = el.dataset.cat; Site.render(); });
    U.on(host, 'click', '[data-booktreat]', function (e, el) { e.stopPropagation(); openTreatment(el.dataset.booktreat); });
    U.on(host, 'click', '[data-treat]', function (e, el) {
      if (e.target.closest('button')) return;
      openTreatment(el.dataset.treat);
    });
    U.on(host, 'click', '[data-scrollto]', function (e, el) {
      e.preventDefault();
      const target = document.querySelector(el.dataset.scrollto);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

})(window);
