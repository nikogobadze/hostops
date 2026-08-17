/* ============================================================
   Page — Experiences (scheduled, capacity-limited activities)
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  let category = 'All';

  Pages.experiences = {
    title: () => 'Experiences',

    render: function (host, params) {
      const all = Store.state.experiences;
      const cats = ['All'].concat(U.unique(all.map(e => e.category)));
      const list = category === 'All' ? all : all.filter(e => e.category === category);

      host.innerHTML =
        Parts.hero({
          art: 'hero-exp', compact: true, scrim: 0.48,
          eyebrow: 'Out there',
          title: 'The coast, properly',
          sub: 'Small groups, our own people, and things you would struggle to arrange yourself. Residents and visitors both welcome.',
          alt: 'A sailing boat at sunset off the the Black Sea coast'
        }) +

        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="filters">' +
              cats.map(c => '<button class="chip' + (category === c ? ' is-on' : '') + '" data-cat="' + U.esc(c) + '">' +
                U.esc(c) + '</button>').join('') +
              '<span class="spacer"></span>' +
              '<span class="small muted">Prices are per person</span>' +
            '</div>' +

            '<div class="grid grid--3 reveal">' +
              list.map(e => card(e)).join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--ink">' +
          '<div class="wrap wrap--narrow" style="text-align:center">' +
            '<span class="eyebrow eyebrow--light">Something else in mind?</span>' +
            '<h2 class="h1" style="margin:.7rem 0 1rem">Our concierge arranges the rest</h2>' +
            '<p class="lede" style="margin-bottom:1.6rem">Boat charters, restaurant tables in town, tickets, a car and driver, ' +
              'a babysitter, a table for twelve on the terrace for someone’s birthday. Ask, and it happens.</p>' +
            '<a class="btn btn--outline-light btn--lg" href="#/contact">Talk to the concierge<span data-icon="arrow-right"></span></a>' +
          '</div>' +
        '</section>';

      wire(host);

      if (params && params.id) {
        openExperience(params.id);
        history.replaceState(null, '', '#/experiences');
      }
    },

    openExperience: openExperience
  };

  /* ============================================================
     markup
     ============================================================ */

  function card(e) {
    const dates = Domain.experienceDates(e.id, U.today(), 3);
    const next = dates.find(d => d.left > 0);

    return '<article class="card card--hover" data-exp="' + e.id + '">' +
      '<div class="card__media">' + Art.scene(e.art, { scrim: 0.22, alt: e.name }) +
        '<span class="card__badge">' + U.esc(e.category) + '</span>' +
      '</div>' +
      '<div class="card__body">' +
        '<h3 class="h3">' + U.esc(e.name) + '</h3>' +
        '<div class="card__meta">' +
          '<span><span data-icon="clock"></span>' + fmtDur(e.duration) + '</span>' +
          '<span><span data-icon="users"></span>Max ' + e.capacity + '</span>' +
          '<span><span data-icon="pin"></span>' + U.esc(e.meeting) + '</span>' +
        '</div>' +
        '<p class="small muted">' + U.esc(e.summary) + '</p>' +
        (next
          ? '<span class="tag tag--ok"><span data-icon="calendar"></span>Next ' + U.esc(U.fmtDate(next.date)) +
            ' · ' + next.left + ' place' + (next.left === 1 ? '' : 's') + '</span>'
          : '<span class="tag tag--warn">Fully booked this fortnight</span>') +
        '<div class="row">' +
          '<div><span class="price">' + Parts.money(e.price) + '</span> <small class="muted">per person</small></div>' +
          '<span class="spacer"></span>' +
          '<button class="btn btn--sm btn--primary" data-bookexp="' + e.id + '">Book</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function fmtDur(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h ? h + 'h' : '') + (m ? (h ? ' ' : '') + m + 'm' : '');
  }

  function dayNames(days) {
    return days.length === 7 ? 'Daily' : days.map(d => U.DAYS[d].slice(0, 3)).join(', ');
  }

  /* ============================================================
     booking
     ============================================================ */

  function openExperience(experienceId, prefill) {
    const e = Domain.experience(experienceId);
    if (!e) return;
    const p = prefill || {};
    const dates = Domain.experienceDates(e.id, U.today(), 8);

    const state = {
      date: (dates.find(d => d.left > 0) || {}).date || null,
      people: Math.min(e.capacity, Math.max(1, Site.search.guests))
    };

    const m = UI.modal({
      title: e.name,
      subtitle: fmtDur(e.duration) + ' · ' + dayNames(e.days) + ' at ' + e.time + ' · from ' + U.esc(e.meeting),
      size: 'lg',
      flush: true,
      body:
        '<div style="aspect-ratio:2.6/1;overflow:hidden">' + Art.scene(e.art, { scrim: 0.16, alt: e.name }) + '</div>' +
        '<div style="padding:1.5rem">' +
          '<p class="lede">' + U.esc(e.description) + '</p>' +

          '<div class="grid grid--2" style="margin-top:1.4rem;gap:1.6rem">' +
            '<div>' +
              '<h4 class="h4" style="margin-bottom:.6rem">What is included</h4>' +
              '<div class="taglist">' + e.includes.map(i =>
                '<span class="tag"><span data-icon="check"></span>' + U.esc(i) + '</span>').join('') + '</div>' +
              '<p class="small muted" style="margin-top:1rem">Meet at ' + U.esc(e.meeting) + ' ten minutes before departure. ' +
                'Cancel free up to 24 hours ahead; we cancel and refund in full if the weather turns.</p>' +
            '</div>' +

            '<form id="expForm" novalidate>' +
              '<div class="field" style="margin-bottom:1rem">' +
                '<label>Choose a date</label>' +
                '<div class="slots" id="expDates"></div>' +
                '<span class="err" data-err-for="date" hidden></span>' +
              '</div>' +
              '<div class="field" style="margin-bottom:1rem">' +
                '<label for="exPeople">People</label>' +
                '<select class="select" id="exPeople" name="people">' +
                  Array.from({ length: Math.min(e.capacity, 10) }, (_, i) => i + 1).map(n =>
                    '<option value="' + n + '"' + (state.people === n ? ' selected' : '') + '>' +
                    n + ' ' + (n === 1 ? 'person' : 'people') + '</option>').join('') +
                '</select>' +
              '</div>' +
              '<div class="field" style="margin-bottom:1rem"><label for="exName">Name</label>' +
                '<input class="input" id="exName" name="guestName" placeholder="Nino Beridze" value="' + U.esc(p.guestName || '') + '">' +
                '<span class="err" data-err-for="guestName" hidden></span></div>' +
              '<div class="field" style="margin-bottom:1rem"><label for="exEmail">Email</label>' +
                '<input class="input" type="email" id="exEmail" name="email" placeholder="you@example.com" value="' + U.esc(p.email || '') + '">' +
                '<span class="err" data-err-for="email" hidden></span></div>' +
              '<div class="field"><label for="exRef">Booking reference</label>' +
                '<input class="input" id="exRef" name="ref" placeholder="HO-4820 (optional)" value="' + U.esc(p.ref || '') + '"></div>' +
            '</form>' +
          '</div>' +
        '</div>',
      footer: '<div id="expTotal"><span class="price">' + Parts.money(e.price) + '</span></div>' +
        '<span class="spacer"></span><button class="btn" data-close>Close</button>' +
        '<button class="btn btn--primary" id="exGo">Book places</button>'
    });

    const form = m.el.querySelector('#expForm');
    const dateHost = m.el.querySelector('#expDates');

    function paintDates() {
      const need = Number(UI.formData(form).people) || 1;
      state.people = need;
      dateHost.innerHTML = dates.length
        ? dates.map(d =>
          '<button type="button" class="slot' + (state.date === d.date ? ' is-on' : '') + '" data-d="' + d.date + '"' +
          (d.left >= need ? '' : ' disabled') + '>' +
          U.dowShort(d.date) + ' ' + U.parse(d.date).getDate() +
          '<small>' + (d.left >= need ? d.left + ' left' : (d.left ? 'only ' + d.left : 'full')) + '</small></button>').join('')
        : '<p class="small muted">No dates in the next two months.</p>';
      if (state.date) {
        const sel = dates.find(d => d.date === state.date);
        if (!sel || sel.left < need) state.date = null;
      }
      total();
    }

    function total() {
      m.el.querySelector('#expTotal').innerHTML =
        '<span class="price">' + Parts.money(e.price * state.people) + '</span> ' +
        '<small class="muted">' + state.people + ' × ' + Parts.money(e.price) + '</small>';
    }

    form.querySelector('#exPeople').addEventListener('change', paintDates);
    U.on(dateHost, 'click', '[data-d]', function (ev, el) {
      if (el.disabled) return;
      state.date = el.dataset.d;
      U.$$('.slot', dateHost).forEach(s => s.classList.toggle('is-on', s === el));
    });
    paintDates();

    m.el.querySelector('#exGo').addEventListener('click', function () {
      const d = UI.formData(form);
      const errors = {};
      if (!state.date) errors.date = 'Pick a date with room for your group.';
      if (!d.guestName) errors.guestName = 'We need a name.';
      if (!d.email || d.email.indexOf('@') === -1) errors.email = 'A valid email, please.';
      if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }

      let bookingId = null, guestId = null;
      if (d.ref) {
        const bk = Store.state.bookings.find(b => String(b.ref).toUpperCase() === d.ref.trim().toUpperCase());
        if (bk) { bookingId = bk.id; guestId = bk.guestId; }
      }

      try {
        const res = Store.update('site:experience', () => {
          const created = Domain.bookExperience({
            experienceId: e.id, date: state.date, people: state.people,
            guestName: d.guestName, email: d.email,
            bookingId: bookingId, guestId: guestId, source: 'site'
          });
          Store.log('Experience booked online · ' + e.name + ' · ' + U.fmtDate(state.date) +
            ' · ' + state.people + ' place(s)', 'ship', '#/services', 'experience');
          return created;
        });

        m.close();
        UI.modal({
          title: 'You are booked on',
          size: 'sm',
          body: '<div class="notice notice--ok" style="margin-bottom:1.1rem"><span data-icon="check-circle"></span>' +
            '<div>Confirmation sent to <strong>' + U.esc(d.email) + '</strong>.</div></div>' +
            '<div class="linerow"><span>Experience</span><b>' + U.esc(e.name) + '</b></div>' +
            '<div class="linerow"><span>Date</span><b>' + U.esc(U.fmtDateLong(res.date)) + ' at ' + U.esc(e.time) + '</b></div>' +
            '<div class="linerow"><span>Meet at</span><b>' + U.esc(e.meeting) + '</b></div>' +
            '<div class="linerow"><span>Places</span><b>' + res.people + '</b></div>' +
            '<div class="linerow linerow--total"><span>Total</span><b>' + Parts.money(e.price * res.people) + '</b></div>',
          footer: '<span class="spacer"></span><button class="btn btn--primary" data-close>Done</button>'
        });
        UI.toast('Booked', e.name + ' · ' + U.fmtDate(res.date), 'ok');
      } catch (err) {
        UI.toast('Could not book that date', err.message, 'error');
        paintDates();
      }
    });
  }

  function wire(host) {
    U.on(host, 'click', '[data-cat]', function (e, el) { category = el.dataset.cat; Site.render(); });
    U.on(host, 'click', '[data-bookexp]', function (e, el) { e.stopPropagation(); openExperience(el.dataset.bookexp); });
    U.on(host, 'click', '[data-exp]', function (e, el) {
      if (e.target.closest('button')) return;
      openExperience(el.dataset.exp);
    });
  }

})(window);
