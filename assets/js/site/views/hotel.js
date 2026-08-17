/* ============================================================
   Pages — The Hotel, and Getting Here
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  /* ============================================================
     The Hotel
     ============================================================ */

  Pages.hotel = {
    title: () => 'The Hotel',

    render: function (host) {
      const c = Store.state.siteContent;
      const h = Store.state.hotel;

      host.innerHTML =
        Parts.hero({
          art: 'hero-hotel', compact: true, scrim: 0.44,
          eyebrow: 'The house',
          title: c.story.title,
          sub: 'Thirty rooms, three kitchens, a spa in the rock and forty metres of path down to the water.',
          alt: 'The hotel garden looking out to sea'
        }) +

        '<section class="section">' +
          '<div class="wrap wrap--narrow">' +
            c.story.body.map(p => '<p class="lede" style="margin-bottom:1.1rem">' + U.esc(p) + '</p>').join('') +
            '<div class="statrow" style="margin-top:2.4rem;text-align:center">' +
              c.story.stats.map(s =>
                '<div><div class="stat__v">' + U.esc(s.value) + '</div>' +
                '<div class="stat__l">' + U.esc(s.label) + '</div></div>').join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--sand">' +
          '<div class="wrap">' +
            Parts.head({ eyebrow: 'Everything here', title: 'What is on the property', centre: true }) +
            '<div class="grid grid--3 reveal">' +
              Store.state.amenities.map(a =>
                '<div class="amenity" style="border-top:0"><span data-icon="' + U.esc(a.icon) + '"></span>' +
                '<div><strong>' + U.esc(a.name) + '</strong><span>' + U.esc(a.note) + '</span></div></div>').join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="feature reveal">' +
              '<div class="feature__art">' + Art.scene('pool', { scrim: 0.14, alt: 'The infinity pool above the beach' }) + '</div>' +
              '<div class="feature__body">' +
                '<span class="eyebrow">The day here</span>' +
                '<h2 class="h1" style="margin:.5rem 0 1rem">Nothing scheduled, unless you want it to be</h2>' +
                '<p style="color:var(--text-2);margin-bottom:.9rem">Breakfast runs until eleven because nobody should be rushed on holiday. ' +
                  'The pool is quiet before nine and after seven. Vermouth appears on the roof at six whether you asked for it or not.</p>' +
                '<p style="color:var(--text-2)">If you would rather fill the day, the concierge has a boat, a chef, a sommelier and a guide on speed dial.</p>' +
                '<a class="textlink" style="margin-top:1rem" href="#/experiences">See what is on<span data-icon="arrow-right"></span></a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--sand">' +
          '<div class="wrap wrap--narrow">' +
            Parts.head({ eyebrow: 'Questions', title: 'The things people ask' }) +
            '<div class="acc">' +
              c.faq.map((f, i) =>
                '<div class="acc__item' + (i === 0 ? ' is-open' : '') + '">' +
                  '<button class="acc__q" aria-expanded="' + (i === 0) + '">' + U.esc(f.q) + '</button>' +
                  '<div class="acc__a">' + U.esc(f.a) + '</div>' +
                '</div>').join('') +
            '</div>' +
            '<div class="notice" style="margin-top:1.6rem"><span data-icon="phone"></span>' +
              '<div>Still unsure? Call us on <strong>' + U.esc(h.phone) + '</strong> or write to ' +
              '<a class="textlink" href="mailto:' + U.esc(h.email) + '">' + U.esc(h.email) + '</a>. ' +
              'Somebody answers, at any hour.</div></div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--ink">' +
          '<div class="wrap wrap--narrow" style="text-align:center">' +
            '<h2 class="h1" style="margin-bottom:1rem">Come and see it</h2>' +
            '<p class="lede" style="margin-bottom:1.8rem">Check what is free for your dates.</p>' +
          '</div>' +
          '<div class="wrap" style="max-width:940px">' + Parts.searchbar({ summary: false }) + '</div>' +
        '</section>';

      Parts.accordion(host);
      Parts.wireSearch(host, () => Site.go('#/rooms'));
    }
  };

  /* ============================================================
     Getting here
     ============================================================ */

  Pages.contact = {
    title: () => 'Getting Here',

    render: function (host) {
      const h = Store.state.hotel;
      const loc = Store.state.siteContent.location;

      host.innerHTML =
        Parts.hero({
          art: 'hero-contact', compact: true, scrim: 0.46,
          eyebrow: 'Finding us',
          title: 'Sherif Khimshiashvili St 17',
          sub: 'Fifteen minutes from Batumi airport, two hours from Kutaisi, and ten from the station — where we will come and get you.',
          alt: 'The Adjaran mountains behind the town'
        }) +

        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="grid grid--2" style="gap:clamp(1.6rem,4vw,3.4rem);align-items:start">' +

              '<div class="reveal">' +
                Parts.head({ eyebrow: 'Travel', title: 'How to get here' }) +
                loc.getting.map(g =>
                  '<div class="linerow" style="padding:.85rem 0;border-bottom:1px solid var(--line-soft)">' +
                  '<span style="font-weight:600;color:var(--text)">' + U.esc(g.mode) + '</span>' +
                  '<b style="font-weight:500;color:var(--text-2);text-align:right">' + U.esc(g.detail) + '</b></div>').join('') +

                '<h3 class="h3" style="margin:2rem 0 .8rem">Worth walking to</h3>' +
                '<ul style="margin:0;padding-left:1.1rem;color:var(--text-2)">' +
                  loc.nearby.map(n => '<li style="margin-bottom:.4rem">' + U.esc(n) + '</li>').join('') +
                '</ul>' +
              '</div>' +

              '<div class="reveal">' +
                '<div class="panel">' +
                  '<div style="aspect-ratio:16/10;border-radius:var(--r);overflow:hidden;margin-bottom:1.2rem">' +
                    Art.scene('market', { scrim: 0.1, alt: 'Batumi old town at dusk' }) + '</div>' +
                  '<h3 class="h3" style="margin-bottom:.6rem">' + U.esc(h.name) + '</h3>' +
                  '<p style="color:var(--text-2);margin-bottom:1rem">' + U.esc(loc.address) + '</p>' +
                  '<div class="linerow"><span>Reception</span><b>Open 24 hours</b></div>' +
                  '<div class="linerow"><span>Check in</span><b>From ' + U.esc(h.checkInTime) + '</b></div>' +
                  '<div class="linerow"><span>Check out</span><b>By ' + U.esc(h.checkOutTime) + '</b></div>' +
                  '<div class="linerow"><span>Telephone</span><b>' + U.esc(h.phone) + '</b></div>' +
                  '<div class="linerow"><span>Email</span><b>' + U.esc(h.email) + '</b></div>' +
                  '<div class="row" style="margin-top:1.2rem;gap:.5rem;flex-wrap:wrap">' +
                    '<a class="btn btn--primary" href="tel:' + U.esc(h.phone.replace(/\s/g, '')) + '">' +
                      '<span data-icon="phone"></span>Call reception</a>' +
                    '<a class="btn" href="mailto:' + U.esc(h.email) + '"><span data-icon="mail"></span>Email us</a>' +
                  '</div>' +
                '</div>' +
              '</div>' +

            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="section section--sand">' +
          '<div class="wrap wrap--narrow">' +
            Parts.head({ eyebrow: 'Concierge', title: 'Ask us for anything', centre: true }) +
            '<form id="askForm" class="panel" novalidate>' +
              '<div class="formgrid">' +
                UI.field({ label: 'Your name', name: 'name', placeholder: 'Elena Moretti' }) +
                UI.field({ label: 'Email', name: 'email', type: 'email', placeholder: 'you@example.com' }) +
                UI.field({
                  label: 'What can we help with?', name: 'topic', type: 'select', span2: true,
                  options: [
                    { value: 'Airport transfer', label: 'Airport transfer' },
                    { value: 'A table in town', label: 'A table in town' },
                    { value: 'Boat charter', label: 'Boat charter' },
                    { value: 'A celebration', label: 'A celebration' },
                    { value: 'Accessibility', label: 'Accessibility' },
                    { value: 'Something else', label: 'Something else' }
                  ]
                }) +
                UI.field({ label: 'Your message', name: 'message', type: 'textarea', span2: true, placeholder: 'Tell us what you need and when…' }) +
              '</div>' +
              '<div class="row" style="margin-top:1.2rem">' +
                '<span class="small muted">We reply within a few hours, usually sooner.</span>' +
                '<span class="spacer"></span>' +
                '<button class="btn btn--primary" type="submit">Send<span data-icon="send"></span></button>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</section>';

      const form = host.querySelector('#askForm');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const d = UI.formData(form);
        const errors = {};
        if (!d.name) errors.name = 'Your name, please.';
        if (!d.email || d.email.indexOf('@') === -1) errors.email = 'A valid email so we can reply.';
        if (!d.message) errors.message = 'Tell us what you need.';
        if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }

        Store.update('site:enquiry', () => {
          Store.log('Concierge enquiry from ' + d.name + ' · ' + d.topic, 'mail', '#/services', 'enquiry');
        });
        form.reset();
        UI.setErrors(form, {});
        UI.toast('Message sent', 'Our concierge will come back to you shortly.', 'ok');
      });
    }
  };

})(window);
