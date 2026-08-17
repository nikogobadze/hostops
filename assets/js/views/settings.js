/* ============================================================
   View — Settings
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  Views.settings = {
    title: 'Settings',
    subtitle: function () { return Store.state.hotel.name + ' · data stored in this browser'; },

    render: function (host) {
      const h = Store.state.hotel;
      const s = Store.state;

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--main">' +
            '<div class="stack">' +

              '<div class="card">' +
                '<div class="card__head"><div><h2>Property</h2><p>Shown on invoices and pushed to connected channels</p></div></div>' +
                '<div class="card__body"><form id="propForm"><div class="formgrid">' +
                  UI.field({ label: 'Property name', name: 'name', value: h.name, span2: true }) +
                  UI.field({ label: 'Tagline', name: 'tagline', value: h.tagline, span2: true }) +
                  UI.field({ label: 'Address', name: 'address', value: h.address, span2: true }) +
                  UI.field({ label: 'Email', name: 'email', type: 'email', value: h.email }) +
                  UI.field({ label: 'Phone', name: 'phone', value: h.phone }) +
                '</div>' +
                '<div class="row mt"><span class="spacer"></span><button type="button" class="btn btn--primary btn--sm" id="propSave">Save property</button></div>' +
                '</form></div>' +
              '</div>' +

              '<div class="card">' +
                '<div class="card__head"><div><h2>Operations</h2><p>Times, taxes and default pricing</p></div></div>' +
                '<div class="card__body"><form id="opsForm"><div class="formgrid">' +
                  UI.field({ label: 'Check-in from', name: 'checkInTime', type: 'time', value: h.checkInTime }) +
                  UI.field({ label: 'Check-out by', name: 'checkOutTime', type: 'time', value: h.checkOutTime }) +
                  UI.field({
                    label: 'Currency', name: 'currency', type: 'select', value: h.currency,
                    options: ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'PLN', 'TRY'].map(c => ({ value: c, label: c }))
                  }) +
                  UI.field({ label: 'VAT %', name: 'taxRate', type: 'number', min: 0, max: 30, step: '0.5', value: h.taxRate }) +
                  UI.field({ label: 'City tax per guest / night', name: 'cityTax', type: 'number', min: 0, step: '0.1', value: h.cityTax }) +
                  UI.field({ label: 'Breakfast per adult / night', name: 'breakfastPrice', type: 'number', min: 0, value: h.breakfastPrice }) +
                '</div>' +
                '<div class="row mt"><span class="spacer"></span><button type="button" class="btn btn--primary btn--sm" id="opsSave">Save operations</button></div>' +
                '</form></div>' +
              '</div>' +

              '<div class="card card--flush">' +
                '<div class="card__head"><div><h2>Team</h2><p>Who housekeeping tasks and orders can be assigned to</p></div>' +
                '<button class="btn btn--sm spacer" id="stNew"><span data-icon="plus"></span>Add member</button></div>' +
                '<div class="tablewrap"><table class="table"><thead><tr><th>Name</th><th>Role</th><th class="num">Open tasks</th><th></th></tr></thead><tbody>' +
                  s.staff.map(m => {
                    const open = s.hkTasks.filter(t => t.assignee === m.name && t.status !== 'done').length +
                      s.orders.filter(o => o.assignee === m.name && o.status !== 'delivered' && o.status !== 'cancelled').length;
                    return '<tr>' +
                      '<td><div class="who"><span class="who__av">' + U.esc(U.initials.apply(null, m.name.split(' '))) + '</span>' +
                        '<strong>' + U.esc(m.name) + '</strong></div></td>' +
                      '<td>' + U.esc(m.role) + '</td>' +
                      '<td class="num">' + (open || '—') + '</td>' +
                      '<td><div class="rowactions">' +
                        (m.id === 'st_admin' ? '' : '<button class="iconbtn iconbtn--bare" data-stdel="' + m.id + '" title="Remove" data-icon="trash"></button>') +
                      '</div></td>' +
                    '</tr>';
                  }).join('') +
                '</tbody></table></div>' +
              '</div>' +

            '</div>' +

            '<div class="stack">' +

              '<div class="card">' +
                '<div class="card__head"><div><h2>Appearance</h2></div></div>' +
                '<div class="card__body col">' +
                  '<div class="seg" style="width:100%" role="group" aria-label="Theme">' +
                    '<button data-theme="light" style="flex:1">Light</button>' +
                    '<button data-theme="dark" style="flex:1">Dark</button>' +
                    '<button data-theme="system" style="flex:1">System</button>' +
                  '</div>' +
                  '<p class="small muted">The dark palette is a separate set of steps chosen for a dark surface, not an inverted copy — charts stay readable in both.</p>' +
                '</div>' +
              '</div>' +

              '<div class="card">' +
                '<div class="card__head"><div><h2>Data</h2><p>Everything lives in this browser&rsquo;s local storage</p></div></div>' +
                '<div class="card__body col">' +
                  '<div class="row row--wrap gap-sm">' +
                    '<button class="btn btn--sm" id="dataExport"><span data-icon="download"></span>Export backup</button>' +
                    '<button class="btn btn--sm" id="dataImport"><span data-icon="upload"></span>Import backup</button>' +
                    '<input type="file" id="dataFile" accept="application/json" hidden>' +
                  '</div>' +
                  '<hr class="divider">' +
                  '<div class="row row--wrap gap-sm">' +
                    '<button class="btn btn--sm" id="dataRoll"><span data-icon="refresh"></span>Regenerate demo data</button>' +
                    '<button class="btn btn--danger btn--sm" id="dataWipe"><span data-icon="trash"></span>Erase everything</button>' +
                  '</div>' +
                  (Store.persistError
                    ? '<div class="notebox"><span data-icon="alert"></span><p>This browser is blocking local storage, so changes are kept in memory only and will be lost when the tab closes.</p></div>'
                    : '') +
                '</div>' +
              '</div>' +

              '<div class="card">' +
                '<div class="card__head"><div><h2>At a glance</h2></div></div>' +
                '<div class="card__body">' +
                  '<dl class="deflist">' +
                    '<dt>Rooms</dt><dd>' + s.rooms.length + ' across ' + U.unique(s.rooms.map(r => r.floor)).length + ' floors</dd>' +
                    '<dt>Room types</dt><dd>' + s.roomTypes.length + '</dd>' +
                    '<dt>Reservations</dt><dd>' + s.bookings.length + '</dd>' +
                    '<dt>Guest profiles</dt><dd>' + s.guests.length + '</dd>' +
                    '<dt>Folios</dt><dd>' + s.folios.length + '</dd>' +
                    '<dt>Menu items</dt><dd>' + s.menu.length + '</dd>' +
                    '<dt>Mini bar SKUs</dt><dd>' + s.minibarItems.length + '</dd>' +
                    '<dt>Installed</dt><dd>' + U.esc(U.fmtDateLong(U.today(new Date(s.installedAt)))) + '</dd>' +
                  '</dl>' +
                '</div>' +
              '</div>' +

              '<div class="card">' +
                '<div class="card__head"><div><h2>Keyboard</h2></div></div>' +
                '<div class="card__body">' +
                  '<dl class="deflist">' +
                    '<dt><kbd>/</kbd></dt><dd>Focus the global search</dd>' +
                    '<dt><kbd>Esc</kbd></dt><dd>Close a dialog</dd>' +
                    '<dt><kbd>Enter</kbd></dt><dd>Open the first search result</dd>' +
                  '</dl>' +
                '</div>' +
              '</div>' +

            '</div>' +
          '</div>' +
        '</div>';

      // reflect the active theme in the segmented control
      const saved = Store.state.prefs.theme || 'system';
      U.$$('[data-theme]', host).forEach(b => b.classList.toggle('is-active', b.dataset.theme === saved));

      wire(host);
    }
  };

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host) {
    U.on(host, 'click', '#propSave', function () {
      const d = UI.formData(host.querySelector('#propForm'));
      Store.update('settings:property', s => { Object.assign(s.hotel, d); });
      UI.toast('Property saved', d.name, 'ok');
    });

    U.on(host, 'click', '#opsSave', function () {
      const d = UI.formData(host.querySelector('#opsForm'));
      Store.update('settings:ops', s => {
        Object.assign(s.hotel, {
          checkInTime: d.checkInTime, checkOutTime: d.checkOutTime, currency: d.currency,
          taxRate: Number(d.taxRate) || 0, cityTax: Number(d.cityTax) || 0,
          breakfastPrice: Number(d.breakfastPrice) || 0
        });
      });
      UI.toast('Operations saved', 'Taxes and times updated across the property.', 'ok');
    });

    U.on(host, 'click', '[data-theme]', function (e, el) {
      const choice = el.dataset.theme;
      const resolved = choice === 'system'
        ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : choice;
      document.documentElement.setAttribute('data-theme', resolved);
      Store.update('settings:theme', s => { s.prefs.theme = choice === 'system' ? null : choice; });
    });

    U.on(host, 'click', '#stNew', function () {
      const m = UI.modal({
        title: 'Add a team member',
        size: 'sm',
        body: '<form id="stForm"><div class="formgrid">' +
          UI.field({ label: 'Name', name: 'name', span2: true, required: true, autofocus: true, placeholder: 'Marisol Vega' }) +
          UI.field({
            label: 'Role', name: 'role', type: 'select', span2: true, value: 'Housekeeping',
            options: ['Housekeeping', 'Food & Beverage', 'Front Office', 'Maintenance', 'Management']
              .map(r => ({ value: r, label: r }))
          }) +
        '</div></form>',
        footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
          '<button class="btn btn--primary" id="stSave">Add member</button>'
      });

      m.el.querySelector('#stSave').addEventListener('click', function () {
        const form = m.el.querySelector('#stForm');
        const d = UI.formData(form);
        if (!d.name) { UI.setErrors(form, { name: 'A name is required.' }); return; }
        Store.update('staff:add', s => { s.staff.push({ id: U.uid('st'), name: d.name, role: d.role }); });
        m.close();
        UI.toast('Team member added', d.name + ' · ' + d.role, 'ok');
      });
    });

    U.on(host, 'click', '[data-stdel]', async function (e, el) {
      const member = Store.state.staff.find(x => x.id === el.dataset.stdel);
      const ok = await UI.confirm({
        title: 'Remove ' + member.name + '?',
        message: 'Their open tasks become unassigned.', confirmLabel: 'Remove', tone: 'danger'
      });
      if (!ok) return;
      Store.update('staff:remove', s => {
        s.staff = s.staff.filter(x => x.id !== member.id);
        s.hkTasks.forEach(t => { if (t.assignee === member.name) t.assignee = null; });
        s.orders.forEach(o => { if (o.assignee === member.name) o.assignee = null; });
      });
      UI.toast('Removed', member.name, 'ok', 2000);
    });

    /* ---------- data ---------- */

    U.on(host, 'click', '#dataExport', function () {
      U.download('hostops-backup-' + U.today() + '.json', Store.exportJSON(), 'application/json');
      UI.toast('Backup downloaded', 'Keep it somewhere safe — it restores the whole property.', 'ok');
    });

    U.on(host, 'click', '#dataImport', function () { host.querySelector('#dataFile').click(); });

    U.on(host, 'change', '#dataFile', function (e, el) {
      const file = el.files && el.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          Store.importJSON(String(reader.result));
          UI.toast('Backup restored', Store.state.hotel.name + ' · ' + Store.state.bookings.length + ' reservations', 'ok');
        } catch (err) {
          UI.toast('Import failed', err.message, 'error');
        }
        el.value = '';
      };
      reader.readAsText(file);
    });

    U.on(host, 'click', '#dataRoll', async function () {
      const ok = await UI.confirm({
        title: 'Regenerate the demo property?',
        message: 'Everything currently in HostOps is replaced with a freshly generated property built around today’s date.',
        confirmLabel: 'Regenerate'
      });
      if (!ok) return;
      Store.reset();
      UI.toast('Demo data regenerated', Store.state.rooms.length + ' rooms · ' + Store.state.bookings.length + ' reservations', 'ok');
    });

    U.on(host, 'click', '#dataWipe', async function () {
      const ok = await UI.confirm({
        title: 'Erase everything?',
        message: 'All rooms, reservations, guests and folios are deleted from this browser. Export a backup first if you might want them back.',
        confirmLabel: 'Erase everything', tone: 'danger'
      });
      if (!ok) return;
      const sure = await UI.confirm({
        title: 'Really erase?',
        message: 'This cannot be undone.',
        confirmLabel: 'Yes, erase', tone: 'danger'
      });
      if (!sure) return;
      try { localStorage.removeItem('hostops:v1'); } catch (err) { /* ignore */ }
      Store.reset();
      UI.toast('Storage cleared', 'A fresh demo property has been generated.', 'ok');
    });
  }

})(window);
