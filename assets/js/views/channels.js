/* ============================================================
   View — Channel manager (Booking.com / Airbnb)
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  const LOGO = { booking: 'B.', airbnb: 'a', direct: 'D' };

  Views.channels = {
    title: 'Channel Manager',
    subtitle: function () {
      const on = Store.state.channels.filter(c => c.connected);
      if (!on.length) return 'No channels connected';
      const latest = on.map(c => c.lastSync).filter(Boolean).sort().pop();
      return on.length + ' connected · last sync ' + (latest ? U.ago(latest) : 'never');
    },

    render: function (host) {
      const today = U.today();
      const from = U.addDays(today, -29);
      const mix = Domain.channelMix(from, today);
      const parity = Domain.parityIssues();
      const otaBookings = Store.state.bookings.filter(b =>
        b.channel !== 'direct' && U.today(new Date(b.createdAt)) >= from);
      const commission = U.round2(mix.booking.revenue * 0.15 + mix.airbnb.revenue * 0.03);
      const connected = Store.state.channels.filter(c => c.connected);

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Connected channels', icon: 'link', valueHTML: U.num(connected.length) + ' <small>/ ' + Store.state.channels.length + '</small>', note: connected.filter(c => c.autoSync).length + ' syncing automatically' }) +
            UI.stat({ label: 'OTA reservations · 30d', icon: 'download', valueHTML: U.num(otaBookings.length), note: 'pulled from connected channels' }) +
            UI.stat({ label: 'Commission · 30d', icon: 'tag', valueHTML: U.esc(U.moneyCompact(commission)), note: 'payable to OTAs' }) +
            UI.stat({
              label: 'Direct share', icon: 'globe',
              valueHTML: (mix.direct.revenue + mix.booking.revenue + mix.airbnb.revenue
                ? Math.round((mix.direct.revenue / (mix.direct.revenue + mix.booking.revenue + mix.airbnb.revenue)) * 100)
                : 0) + '<small>%</small>',
              note: 'of room revenue, commission-free'
            }) +
          '</div>' +

          '<div class="grid grid--2">' +
            Store.state.channels.map(c => channelCard(c, mix[c.id])).join('') +
          '</div>' +

          '<div class="grid grid--main">' +
            '<div class="stack">' +
              mappingCard() +
              logCard() +
            '</div>' +
            '<div class="stack">' +
              parityCard(parity) +
              inventoryCard() +
            '</div>' +
          '</div>' +
        '</div>';

      wire(host);
    }
  };

  /* ============================================================
     channel card
     ============================================================ */

  function channelCard(c, mix) {
    const bookings = Store.state.bookings.filter(b => b.channel === c.id && Domain.holdsRoom(b));
    const upcoming = bookings.filter(b => b.checkIn >= U.today()).length;

    return '<div class="chcard" data-channel="' + c.id + '">' +
      '<div class="chcard__head">' +
        '<div class="chlogo" data-ch="' + c.id + '">' + U.esc(LOGO[c.id] || '?') + '</div>' +
        '<div><h3>' + U.esc(c.name) + '</h3>' +
          '<p>' + (c.connected
            ? 'Property ' + U.esc(c.propertyId) + ' · ' + c.commissionPct + '% commission'
            : 'Not connected') + '</p></div>' +
        '<span class="spacer"></span>' +
        (c.connected
          ? '<span class="badge ' + (c.health === 'error' ? 'badge--danger' : 'badge--ok') + ' badge--dot">' +
            (c.health === 'error' ? 'Error' : 'Live') + '</span>'
          : '<span class="badge">Offline</span>') +
      '</div>' +

      '<div class="chcard__body">' +
        '<div class="chcard__stats">' +
          '<div class="chcard__stat"><b>' + U.num(mix ? mix.bookings : 0) + '</b><span>bookings · 30d</span></div>' +
          '<div class="chcard__stat"><b>' + U.esc(U.moneyCompact(mix ? mix.revenue : 0)) + '</b><span>room revenue</span></div>' +
          '<div class="chcard__stat"><b>' + U.num(upcoming) + '</b><span>on the books</span></div>' +
        '</div>' +

        (c.connected
          ? '<div class="row row--wrap small muted" style="gap:14px;margin-bottom:12px">' +
              '<span class="row gap-sm"><span data-icon="clock" style="font-size:14px"></span>Last sync ' + U.esc(U.ago(c.lastSync)) + '</span>' +
              '<span class="row gap-sm"><span data-icon="refresh" style="font-size:14px"></span>' +
                (c.autoSync ? 'Every ' + c.syncIntervalMin + ' min' : 'Manual only') + '</span>' +
            '</div>' +
            '<div class="row row--wrap gap-sm" style="margin-bottom:12px">' +
              (c.pullReservations ? '<span class="chip"><span data-icon="download" style="font-size:13px"></span>Reservations in</span>' : '') +
              (c.pushAvailability ? '<span class="chip"><span data-icon="upload" style="font-size:13px"></span>Availability out</span>' : '') +
              (c.pushRates ? '<span class="chip"><span data-icon="tag" style="font-size:13px"></span>Rates out</span>' : '') +
            '</div>'
          : '<p class="small muted" style="margin-bottom:12px">Connect to pull reservations automatically and keep availability and rates in step across platforms.</p>') +

        '<div class="row gap-sm">' +
          (c.connected
            ? '<button class="btn btn--primary btn--sm" data-sync="' + c.id + '"><span data-icon="refresh"></span>Sync now</button>' +
              '<button class="btn btn--sm" data-settings="' + c.id + '"><span data-icon="cog"></span>Settings</button>' +
              '<span class="spacer"></span>' +
              '<button class="btn btn--ghost btn--sm" data-disconnect="' + c.id + '">Disconnect</button>'
            : '<button class="btn btn--primary btn--sm" data-settings="' + c.id + '"><span data-icon="link"></span>Connect ' + U.esc(c.name) + '</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     supporting cards
     ============================================================ */

  function mappingCard() {
    const types = Store.state.roomTypes;
    const channels = Store.state.channels.filter(c => c.connected);

    return '<div class="card card--flush">' +
      '<div class="card__head"><div><h2>Room-type mapping</h2>' +
      '<p>How each internal room type is published to every channel</p></div>' +
      '<button class="btn btn--sm spacer" id="chPushAll"><span data-icon="upload"></span>Push inventory now</button></div>' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
        '<th>Internal type</th><th class="num">Rooms</th><th class="num">Base rate</th>' +
        channels.map(c => '<th>' + U.esc(c.name) + '</th>').join('') +
      '</tr></thead><tbody>' +
      types.map(t => {
        const count = Store.state.rooms.filter(r => r.typeId === t.id).length;
        return '<tr>' +
          '<td><div class="cellstack"><strong>' + U.esc(t.name) + '</strong><span class="mono">' + U.esc(t.code) + '</span></div></td>' +
          '<td class="num">' + count + '</td>' +
          '<td class="num">' + U.esc(U.money(t.basePrice, null, { decimals: 0 })) + '</td>' +
          channels.map(c => {
            const map = c.mappings || {};
            const code = map[t.id] || (c.id === 'booking' ? c.propertyId + '-' + t.code : 'lst_' + U.slug(t.name));
            return '<td><span class="mono small">' + U.esc(code) + '</span> ' +
              '<span class="badge badge--ok" style="height:18px;font-size:10px">mapped</span></td>';
          }).join('') +
        '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      (channels.length ? '' : '<p class="small muted" style="padding:14px 18px">Connect a channel to publish inventory.</p>') +
    '</div>';
  }

  function parityCard(issues) {
    return '<div class="card">' +
      '<div class="card__head"><div><h2>Rate parity</h2><p>Net rate after commission vs your direct rate</p></div></div>' +
      '<div class="card__body">' +
        (issues.length
          ? issues.slice(0, 6).map(i =>
            '<div class="movrow" style="cursor:default">' +
              '<span data-icon="alert" style="color:var(--warn);font-size:17px"></span>' +
              '<div class="cellstack"><strong>' + U.esc(i.typeName) + '</strong>' +
              '<span>' + U.esc(UI.CHANNEL_LABEL[i.channel]) + ' nets ' + U.esc(U.money(i.net, null, { decimals: 0 })) +
              ' vs ' + U.esc(U.money(i.direct, null, { decimals: 0 })) + ' direct</span></div>' +
              '<span class="badge badge--warn">−' + i.gap + '%</span>' +
            '</div>').join('')
          : '<div class="row gap-sm small" style="color:var(--ok)"><span data-icon="check-circle"></span>' +
            'Every room type nets within 12% of the direct rate.</div>') +
        '<p class="small muted mt">Commission is the whole gap here — raising OTA rates to protect parity is a pricing decision, not a sync one.</p>' +
      '</div>' +
    '</div>';
  }

  function inventoryCard() {
    const today = U.today();
    const next7 = Domain.statsSeries(today, 7);

    return '<div class="card">' +
      '<div class="card__head"><div><h2>Inventory pushed</h2><p>Rooms offered to channels, next 7 days</p></div></div>' +
      '<div class="card__body">' +
        next7.map(s => {
          const free = s.sellable - s.occupied;
          const pct = s.sellable ? (free / s.sellable) * 100 : 0;
          return '<div class="row" style="gap:10px;padding:5px 0">' +
            '<span class="small muted nowrap" style="width:74px">' + U.esc(U.fmtDate(s.date)) + '</span>' +
            '<div class="meter" style="flex:1"><div class="meter__fill ' +
              (free === 0 ? 'is-danger' : free <= 2 ? 'is-warn' : '') +
              '" style="width:' + Math.max(3, pct) + '%"></div></div>' +
            '<span class="small tnum strong" style="width:52px;text-align:right">' + free + ' free</span>' +
          '</div>';
        }).join('') +
        '<p class="small muted mt">Availability is recalculated from confirmed stays and out-of-order blocks every time a channel syncs.</p>' +
      '</div>' +
    '</div>';
  }

  function logCard() {
    const log = Store.state.syncLog.slice(0, 25);
    return '<div class="card card--flush">' +
      '<div class="card__head"><div><h2>Sync log</h2><p>Most recent exchanges with connected channels</p></div>' +
      '<button class="btn btn--sm spacer" id="chClearLog">Clear</button></div>' +
      (log.length
        ? '<div>' + log.map(l =>
          '<div class="logline">' +
            '<time>' + U.esc(U.fmtTime(l.ts)) + '</time>' +
            '<span class="lvl"><span class="badge ' +
              (l.level === 'error' ? 'badge--danger' : l.level === 'warn' ? 'badge--warn' : 'badge--ok') +
              '" style="height:19px;font-size:10.5px">' +
              U.esc(UI.CHANNEL_LABEL[l.channel] || l.channel) + '</span></span>' +
            '<p>' + (l.direction === 'in' ? '↓ ' : '↑ ') + U.esc(l.message) + '</p>' +
          '</div>').join('') + '</div>'
        : UI.empty({ icon: 'list', title: 'No sync activity yet', message: 'Run a sync to see the exchange log.' })) +
    '</div>';
  }

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host) {
    U.on(host, 'click', '[data-sync]', function (e, el) {
      const c = Store.channel(el.dataset.sync);
      el.disabled = true;
      el.innerHTML = '<span data-icon="refresh"></span>Syncing…';
      Icons.render(el);

      setTimeout(function () {
        try {
          const r = Store.update('sync', () => Domain.syncChannel(c.id));
          const bits = [];
          if (r.pulled) bits.push(r.pulled + ' new');
          if (r.modified) bits.push(r.modified + ' modified');
          if (r.cancelled) bits.push(r.cancelled + ' cancelled');
          UI.toast(c.name + ' synced',
            bits.length ? bits.join(' · ') : 'Availability and rates pushed · no new reservations.',
            'ok');
        } catch (err) {
          UI.toast('Sync failed', err.message, 'error');
        }
      }, 650);
    });

    U.on(host, 'click', '[data-settings]', (e, el) => openSettings(el.dataset.settings));

    U.on(host, 'click', '[data-disconnect]', async function (e, el) {
      const c = Store.channel(el.dataset.disconnect);
      const ok = await UI.confirm({
        title: 'Disconnect ' + c.name + '?',
        message: 'Existing reservations stay in HostOps, but nothing new will be pulled and availability will stop being pushed.',
        confirmLabel: 'Disconnect', tone: 'danger'
      });
      if (!ok) return;
      Store.update('channel:disconnect', () => {
        c.connected = false;
        c.autoSync = false;
        Store.logSync(c.id, 'warn', 'Channel disconnected by the administrator', 'out');
        Store.log(c.name + ' disconnected', 'link', '#/channels', 'sync');
      });
      App.scheduleAutoSync();
      UI.toast(c.name + ' disconnected', 'Inventory is no longer published there.', 'ok');
    });

    U.on(host, 'click', '#chPushAll', function () {
      const connected = Store.state.channels.filter(c => c.connected);
      if (!connected.length) { UI.toast('No channels connected', 'Connect a channel first.', 'warn'); return; }
      Store.update('channel:push', function () {
        connected.forEach(c => {
          Store.logSync(c.id, 'ok', 'Manual inventory push · ' + Store.state.roomTypes.length +
            ' room types, ' + Store.state.rooms.length + ' rooms, 30 days', 'out');
          c.lastSync = new Date().toISOString();
        });
      });
      UI.toast('Inventory pushed', connected.length + ' channel(s) updated with current rates and availability.', 'ok');
    });

    U.on(host, 'click', '#chClearLog', function () {
      Store.update('channel:clearlog', s => { s.syncLog = []; });
      UI.toast('Log cleared', '', 'ok', 1800);
    });
  }

  /* ============================================================
     settings dialog
     ============================================================ */

  function openSettings(channelId) {
    const c = Store.channel(channelId);
    const connecting = !c.connected;

    const m = UI.modal({
      title: (connecting ? 'Connect ' : 'Settings · ') + c.name,
      subtitle: connecting
        ? 'Paste the credentials from your ' + c.name + ' extranet'
        : 'Credentials and what gets exchanged on every sync',
      size: 'md',
      body: '<form id="chForm">' +
        '<fieldset class="fieldset" style="margin-bottom:16px"><legend>Connection</legend>' +
          '<div class="formgrid">' +
            UI.field({
              label: 'API key', name: 'apiKey', value: c.apiKey, span2: true,
              placeholder: channelId === 'booking' ? 'bdc_live_…' : 'abnb_live_…',
              hint: 'Stored locally in this browser only'
            }) +
            UI.field({
              label: channelId === 'booking' ? 'Property ID' : 'Listing ID',
              name: 'propertyId', value: c.propertyId,
              placeholder: channelId === 'booking' ? '10428391' : 'lst_88213774'
            }) +
            UI.field({ label: 'Commission %', name: 'commissionPct', type: 'number', min: 0, max: 40, step: '0.5', value: c.commissionPct }) +
            UI.field({ label: 'Endpoint', name: 'endpoint', value: c.endpoint, span2: true }) +
          '</div>' +
        '</fieldset>' +

        '<fieldset class="fieldset"><legend>What syncs</legend>' +
          '<div class="col" style="gap:14px">' +
            UI.switchField({ label: 'Pull reservations', name: 'pullReservations', checked: c.pullReservations, hint: 'New bookings, modifications and cancellations come into HostOps' }) +
            UI.switchField({ label: 'Push availability', name: 'pushAvailability', checked: c.pushAvailability, hint: 'Free rooms are published so the channel cannot oversell' }) +
            UI.switchField({ label: 'Push rates', name: 'pushRates', checked: c.pushRates, hint: 'Room-type base rates and weekend uplifts' }) +
            '<hr class="divider">' +
            UI.switchField({ label: 'Sync automatically', name: 'autoSync', checked: c.autoSync }) +
          '</div>' +
          '<div class="formgrid mt">' +
            UI.field({
              label: 'Interval', name: 'syncIntervalMin', type: 'select', value: c.syncIntervalMin,
              options: [5, 15, 30, 60, 120].map(v => ({ value: v, label: 'Every ' + v + ' minutes' }))
            }) +
          '</div>' +
        '</fieldset>' +
      '</form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="chSave">' + (connecting ? 'Connect' : 'Save settings') + '</button>'
    });

    m.el.querySelector('#chSave').addEventListener('click', function () {
      const form = m.el.querySelector('#chForm');
      const d = UI.formData(form);

      if (!d.apiKey || !d.propertyId) {
        UI.setErrors(form, {
          apiKey: d.apiKey ? '' : 'An API key is required.',
          propertyId: d.propertyId ? '' : 'This is required.'
        });
        return;
      }

      Store.update('channel:save', function () {
        Object.assign(c, {
          apiKey: d.apiKey, propertyId: d.propertyId, endpoint: d.endpoint,
          commissionPct: Number(d.commissionPct) || 0,
          pullReservations: !!d.pullReservations,
          pushAvailability: !!d.pushAvailability,
          pushRates: !!d.pushRates,
          autoSync: !!d.autoSync,
          syncIntervalMin: Number(d.syncIntervalMin) || 15
        });
        if (connecting) {
          c.connected = true;
          c.health = 'ok';
          c.lastSync = new Date().toISOString();
          Store.logSync(c.id, 'ok', 'Handshake accepted · property ' + d.propertyId + ' linked', 'out');
          Store.log(c.name + ' connected', 'link', '#/channels', 'sync');
        } else {
          Store.logSync(c.id, 'ok', 'Connection settings updated', 'out');
        }
      });

      App.scheduleAutoSync();
      m.close();
      UI.toast(connecting ? c.name + ' connected' : 'Settings saved',
        connecting ? 'Inventory will be published on the next sync.' : c.name, 'ok');

      if (connecting) setTimeout(() => App.runSync(true), 400);
    });
  }

})(window);
