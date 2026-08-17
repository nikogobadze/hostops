/* ============================================================
   Page — Home

   Paced the way the reference sites are: a full-screen hero, then
   alternating bands of air and image. Nothing competes; each screen
   holds one idea. The only thing that breaks the restraint is the
   search bar, which stays visible because that is what the guest
   actually came for.
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

        /* ---------- 1. the hero ---------- */
        Parts.hero({
          art: 'hero',
          eyebrow: c.hero.eyebrow,
          title: c.hero.headline,
          sub: c.hero.sub,
          search: true,
          cue: true,
          scrim: 0.52,
          alt: 'The Black Sea at sunset from the hotel terrace'
        }) +

        /* ---------- 2. a single held statement ---------- */
        '<section class="section">' +
          '<div class="wrap wrap--narrow" style="text-align:center">' +
            '<span class="eyebrow reveal" style="margin-bottom:2rem">Since 1974</span>' +
            '<p class="statement reveal">' + U.esc(c.story.title) +
              ' — thirty rooms on the Batumi boulevard, forty metres from the water ' +
              'and twenty minutes from the mountains.</p>' +
            '<hr class="rule rule--short reveal" style="margin:2.6rem auto 0">' +
          '</div>' +
        '</section>' +

        /* ---------- 3. the house ---------- */
        '<section class="section" style="padding-top:0">' +
          '<div class="wrap">' +
            Parts.editorial({
              art: 'story',
              eyebrow: 'The house',
              title: 'Between the sea and the mountains',
              body: c.story.body.join('|'),
              action: 'More about the house',
              href: '#/hotel',
              alt: 'The garden and the sea beyond'
            }) +
          '</div>' +
        '</section>' +

        /* ---------- 4. full-bleed pause ---------- */
        Parts.plate({
          art: 'beach',
          eyebrow: 'The boulevard',
          text: 'The sea is forty metres from the front door, and the day tends to arrange itself around it.',
          alt: 'The beach and the boulevard'
        }) +

        /* ---------- 5. rooms ---------- */
        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="section__head reveal">' +
              '<span class="eyebrow">Rooms &amp; suites</span>' +
              '<h2 class="h1">Thirty rooms, no two the same</h2>' +
              '<p class="lede">Every room looks at either the garden or the water.' +
                (from ? ' From ' + Parts.money(from) + ' a night for your dates.' : '') + '</p>' +
            '</div>' +
            '<div class="grid grid--3 reveal">' +
              types.slice(2, 5).map(t => Parts.roomCard(t)).join('') +
            '</div>' +
            '<div class="row reveal" style="justify-content:center;margin-top:clamp(2.4rem,5vw,4rem)">' +
              '<a class="btn" href="#/rooms"><span>View all rooms</span></a>' +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- 6. dining, spa, experiences ---------- */
        '<section class="section section--bone">' +
          '<div class="wrap">' +
            Parts.head({
              eyebrow: 'The property',
              title: 'Three kitchens, a spa in the slope, and a boat',
              sub: 'You never have to leave — though the mountains twenty minutes inland are the reason many people come.',
              centre: true
            }) +
            '<div class="grid grid--3 reveal">' +
              Parts.offerCard({
                art: 'dining-fine', title: 'Dining', eyebrow: 'Three restaurants',
                text: 'Black Sea fish at Zghva, all-day plates under the magnolias, and chacha on the roof at six.',
                action: 'Reserve a table', attr: 'data-goto="#/dining"'
              }) +
              Parts.offerCard({
                art: 'spa', title: 'Tsqaro Spa', eyebrow: 'Wellness',
                text: 'A sea-water pool, a steam room in the Georgian tradition, and salt from the water outside.',
                action: 'Book a treatment', attr: 'data-goto="#/spa"'
              }) +
              Parts.offerCard({
                art: 'sail', title: 'Experiences', eyebrow: 'Beyond the gate',
                text: 'Sail at sunset, fold khinkali with our chef, or drive up the valley to the waterfall.',
                action: 'See what is on', attr: 'data-goto="#/experiences"'
              }) +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- 7. what is included ---------- */
        '<section class="section">' +
          '<div class="wrap">' +
            '<div class="editorial editorial--reverse reveal">' +
              '<div class="editorial__art">' +
                Art.scene('pool', { scrim: 0.12, alt: 'The sea-view pool' }) + '</div>' +
              '<div class="editorial__body">' +
                '<span class="eyebrow">Included</span>' +
                '<h2 class="h1">The things you stop noticing, because they work</h2>' +
                '<div style="margin-top:1.6rem">' +
                  Store.state.amenities.slice(0, 6).map(a =>
                    '<div class="amenity"><span data-icon="' + U.esc(a.icon) + '"></span>' +
                    '<div><strong>' + U.esc(a.name) + '</strong>' +
                    '<span>' + U.esc(a.note) + '</span></div></div>').join('') +
                '</div>' +
                '<a class="textlink" style="margin-top:2rem" href="#/hotel">Everything on the property' +
                  '<span data-icon="arrow-right"></span></a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        /* ---------- 8. guests ---------- */
        '<section class="section section--bone">' +
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

        /* ---------- 9. the close ---------- */
        '<section class="section section--ink">' +
          '<div class="wrap wrap--narrow" style="text-align:center">' +
            '<span class="eyebrow eyebrow--light">Ready when you are</span>' +
            '<h2 class="h1" style="margin:1.6rem 0 1.2rem">Choose your dates</h2>' +
            '<p class="lede" style="margin-bottom:2.6rem">Free cancellation until 48 hours before you arrive.</p>' +
          '</div>' +
          '<div class="wrap" style="max-width:900px">' + Parts.searchbar({ summary: false }) + '</div>' +
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
