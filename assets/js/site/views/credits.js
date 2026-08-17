/* ============================================================
   Page — Image credits

   Several photographs are CC BY / CC BY-SA, which carry a real
   attribution obligation. This page discharges it: every image is
   listed with its author, licence and a link back to the source.
   ============================================================ */
(function (global) {
  'use strict';
  const Pages = global.Pages || (global.Pages = {});

  let credits = null;

  Pages.credits = {
    title: () => 'Image credits',

    render: function (host) {
      host.innerHTML =
        '<div class="section" style="padding-top:calc(var(--nav-h) + var(--s-6))">' +
          '<div class="wrap wrap--narrow">' +
            '<span class="eyebrow">Colophon</span>' +
            '<h1 class="h1" style="margin:var(--s-3) 0 var(--s-4)">Image credits</h1>' +
            '<p class="lede" style="margin-bottom:var(--s-4)">Magnolia House is a fictional hotel. ' +
              'The setting is not: Batumi, Adjara and everything around them are real, and so are the ' +
              'photographs below. Every one is used under a licence that permits reuse, and each is ' +
              'credited to its author.</p>' +
            '<p class="small muted" style="margin-bottom:var(--s-6)">Sourced through the Openverse and ' +
              'Wikimedia Commons public APIs. Images marked CC0 or Public Domain carry no attribution ' +
              'requirement; the rest are attributed here as their licences require. ' +
              'Interiors are generic stock and do not depict a real property in Batumi.</p>' +
            '<div id="creditList"><p class="muted">Loading…</p></div>' +
          '</div>' +
        '</div>';

      const list = host.querySelector('#creditList');

      const paint = () => {
        const keys = Object.keys(credits || {}).sort();
        if (!keys.length) {
          list.innerHTML = '<p class="muted">No photographs are in use — the site is running on its ' +
            'generated artwork.</p>';
          return;
        }
        list.innerHTML =
          '<p class="eyebrow eyebrow--stone" style="margin-bottom:var(--s-3)">' + keys.length + ' photographs</p>' +
          keys.map(k => {
            const c = credits[k];
            return '<div class="linerow" style="align-items:flex-start;padding:var(--s-3) 0;' +
              'border-bottom:1px solid var(--line-fine)">' +
              '<div style="min-width:0">' +
                '<strong style="display:block;font-weight:560">' + U.esc(c.title || k) + '</strong>' +
                '<span class="small muted">' + U.esc(c.author || 'Unknown') +
                  ' · ' + U.esc(c.provider || '') + '</span>' +
              '</div>' +
              '<div style="text-align:right;white-space:nowrap">' +
                '<span class="tag">' + U.esc(c.licence || '') + '</span>' +
                (c.page ? '<a class="small" style="display:block;margin-top:.3rem;color:var(--red-text)" ' +
                  'href="' + U.esc(c.page) + '" target="_blank" rel="noopener noreferrer">Source</a>' : '') +
              '</div>' +
            '</div>';
          }).join('');
      };

      if (credits) { paint(); return; }

      fetch('assets/img/credits.json')
        .then(r => (r.ok ? r.json() : {}))
        .then(j => { credits = j; paint(); })
        .catch(() => { credits = {}; paint(); });
    }
  };
})(window);
