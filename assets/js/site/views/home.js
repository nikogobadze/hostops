/* ============================================================
   Page — Home
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  Pages.home = {
    title: () => null,

    render: function (host) {
      const c = Store.state.siteContent;
      const s = Site.search;
      const types = Store.state.roomTypes;
      const from = Domain.priceFrom(s.checkIn, s.checkOut, 1);

      host.innerHTML =
        Parts.hero({
          art: 'hero',
          eyebrow: c.hero.eyebrow,
          title: c.hero.headline,
          sub: c.hero.sub,
          search: true,
          cue: true,
          alt: 'The sea at sunset from the hotel terrace'
        }) +

        /* ---------- story ---------- */
        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="feature reveal">' +
              '<div class="feature__art">' + Art.scene('story', { scrim: 0.12, alt: 'The hotel garden and the sea beyond' }) + '</div>' +
              '<div class="feature__body">' +
                '<span class="eyebrow">Since 1961</span>' +
                '<h2 class="h1" style="margin:.6rem 0 1rem">' + U.esc(c.story.title) + '</h2>' +
                c.story.body.map(p => '<p class="lede" style="margin-bottom:.9rem">' + U.esc(p) + '</p>').join('') +
                '<a class="textlink" href="#/hotel">More about the house<span data-icon="arrow-right"></span></a>' +
              '</div>' +
            '</div>' +

            '<div class="statrow reveal" style="margin-top:clamp(2.4rem,5vw,4rem);text-align:center">' +
              c.story.stats.map(st =>
                '<div><div class="stat__v">' + U.esc(st.value) + '</div>' +
                '<div class="stat__l">' + U.esc(st.label) + '</div></div>').join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- rooms ---------- */
        '<section class="section section--sand">' +
          '<div class="wrap">' +
            '<div class="row row--wrap reveal" style="align-items:flex-end;margin-bottom:2rem">' +
              '<div class="section__head" style="margin-bottom:0">' +
                '<span class="eyebrow">Where you sleep</span>' +
                '<h2 class="h1">Thirty rooms, no two the same</h2>' +
                '<p class="lede">Every room looks at either the garden or the water. ' +
                  (from ? 'From ' + Parts.money(from) + ' a night for your dates.' : '') + '</p>' +
              '</div>' +
              '<span class="spacer"></span>' +
              '<a class="btn" href="#/rooms">See all rooms<span data-icon="arrow-right"></span></a>' +
            '</div>' +
            '<div class="grid grid--3 reveal">' +
              types.slice(2, 5).map(t => Parts.roomCard(t)).join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- what's here ---------- */
        '<section class="section">' +
          '<div class="wrap">' +
            Parts.head({
              eyebrow: 'What is here',
              title: 'Three kitchens, a spa in the rock, and a boat',
              sub: 'You never have to leave the property — though the coastal path outside the gate is the reason many people come.',
              centre: true
            }) +
            '<div class="grid grid--3 reveal">' +
              Parts.offerCard({
                art: 'dining-fine', title: 'Dining', eyebrow: 'Three restaurants',
                text: 'Seafood on the water at Marea, all-day plates under the pines, and vermouth on the roof at six.',
                action: 'Reserve a table', attr: 'data-goto="#/dining"',
                meta: '<span><span data-icon="utensils"></span>3 restaurants</span><span><span data-icon="clock"></span>07:00 – 01:00</span>'
              }) +
              Parts.offerCard({
                art: 'spa', title: 'Sal & Onda Spa', eyebrow: 'Wellness',
                text: 'A sea-water pool, a proper hammam and treatments built on salt, seaweed and olive oil.',
                action: 'Book a treatment', attr: 'data-goto="#/spa"',
                meta: '<span><span data-icon="steam"></span>Hammam &amp; sauna</span><span><span data-icon="sparkle"></span>8 treatments</span>'
              }) +
              Parts.offerCard({
                art: 'sail', title: 'Experiences', eyebrow: 'Out there',
                text: 'Sail at sunset, cook paella with our chef, or walk the smugglers’ path before the heat.',
                action: 'See what is on', attr: 'data-goto="#/experiences"',
                meta: '<span><span data-icon="ship"></span>' + Store.state.experiences.length + ' experiences</span><span><span data-icon="users"></span>Small groups</span>'
              }) +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- amenities ---------- */
        '<section class="section section--sand">' +
          '<div class="wrap">' +
            '<div class="grid grid--2" style="gap:clamp(1.6rem,4vw,3.4rem);align-items:start">' +
              '<div class="reveal">' +
                Parts.head({ eyebrow: 'Included', title: 'The things you stop noticing, because they simply work' }) +
                '<a class="btn btn--ink" href="#/rooms">Check availability<span data-icon="arrow-right"></span></a>' +
              '</div>' +
              '<div class="reveal">' +
                Store.state.amenities.slice(0, 8).map(a =>
                  '<div class="amenity"><span data-icon="' + U.esc(a.icon) + '"></span>' +
                  '<div><strong>' + U.esc(a.name) + '</strong><span>' + U.esc(a.note) + '</span></div></div>').join('') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- guests ---------- */
        '<section class="section">' +
          '<div class="wrap">' +
            Parts.head({ eyebrow: 'What guests say', title: 'A 9.4 average, across 1,240 stays', centre: true }) +
            '<div class="grid grid--3 reveal">' +
              c.testimonials.map(t =>
                '<figure class="quote">' +
                  Parts.stars(5) +
                  '<blockquote>' + U.esc(t.quote) + '</blockquote>' +
                  '<figcaption><strong>' + U.esc(t.name) + '</strong>' +
                    U.esc(t.from + ' · ' + t.stayed) + '</figcaption>' +
                '</figure>').join('') +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- closing booking prompt ---------- */
        '<section class="section section--ink">' +
          '<div class="wrap wrap--narrow" style="text-align:center">' +
            '<span class="eyebrow eyebrow--light">Ready when you are</span>' +
            '<h2 class="h1" style="margin:.7rem 0 1rem">Pick your dates. We will keep the terrace free.</h2>' +
            '<p class="lede" style="margin-bottom:1.8rem">Free cancellation up to 48 hours before you arrive on standard rates.</p>' +
          '</div>' +
          '<div class="wrap" style="max-width:940px">' + Parts.searchbar({ summary: false }) + '</div>' +
        '</section>';

      /* ---------- wiring ---------- */

      Parts.wireSearch(host, () => Site.go('#/rooms'));

      U.on(host, 'click', '[data-goto]', function (e, el) { Site.go(el.dataset.goto); });
      U.on(host, 'click', '[data-roomtype]', function (e, el) {
        Site.go('#/rooms?type=' + el.dataset.roomtype);
      });
    }
  };
})(window);
