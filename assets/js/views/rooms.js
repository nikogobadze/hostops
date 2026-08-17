/* ============================================================
   View — Rooms & room types
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  let tab = 'rooms';
  const filters = { floor: '', type: '', status: '' };

  Views.rooms = {
    title: 'Rooms & Types',
    subtitle: function () {
      const rooms = Store.state.rooms;
      const ooo = rooms.filter(r => r.status === 'ooo').length;
      return rooms.length + ' rooms · ' + Store.state.roomTypes.length + ' types' + (ooo ? ' · ' + ooo + ' out of order' : '');
    },

    render: function (host, params) {
      const rooms = Store.state.rooms;
      const today = U.today();
      const st = Domain.statsFor(today);
      const hk = Domain.housekeepingSummary();

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Sellable tonight', icon: 'door', valueHTML: U.num(st.sellable), note: rooms.length + ' rooms in total' }) +
            UI.stat({ label: 'Occupied', icon: 'bed', valueHTML: U.num(st.occupied), note: Math.round(st.occupancy) + '% occupancy' }) +
            UI.stat({ label: 'Ready to sell', icon: 'check-circle', valueHTML: U.num((hk.clean || 0) + (hk.inspected || 0)), note: 'clean or inspected' }) +
            UI.stat({ label: 'Out of order', icon: 'ban', valueHTML: U.num(hk.ooo || 0), note: (hk.ooo ? 'not sellable' : 'whole property sellable') }) +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="tabs">' +
              '<button data-tab="rooms"' + (tab === 'rooms' ? ' class="is-active"' : '') + '>Rooms <span class="muted">' + rooms.length + '</span></button>' +
              '<button data-tab="types"' + (tab === 'types' ? ' class="is-active"' : '') + '>Room types <span class="muted">' + Store.state.roomTypes.length + '</span></button>' +
            '</div>' +
            '<div id="roomPanel"></div>' +
          '</div>' +
        '</div>';

      const panel = host.querySelector('#roomPanel');
      function paint() {
        panel.innerHTML = tab === 'types' ? typesPanel() : roomsPanel();
        Icons.render(panel);
      }
      paint();

      UI.tabs(host, function (t) { tab = t; paint(); });

      U.on(host, 'change', '#rmFloor', (e, el) => { filters.floor = el.value; paint(); });
      U.on(host, 'change', '#rmType', (e, el) => { filters.type = el.value; paint(); });
      U.on(host, 'change', '#rmStatus', (e, el) => { filters.status = el.value; paint(); });

      U.on(host, 'click', '#rmNew', () => openEditor(null));
      U.on(host, 'click', '#rtNew', () => openTypeEditor(null));
      U.on(host, 'click', '[data-room]', function (e, el) {
        if (e.target.closest('button')) return;
        openDetail(el.dataset.room);
      });
      U.on(host, 'click', '[data-editroom]', function (e, el) { e.stopPropagation(); openEditor(el.dataset.editroom); });
      U.on(host, 'click', '[data-edittype]', function (e, el) { e.stopPropagation(); openTypeEditor(el.dataset.edittype); });

      if (params && params.id) {
        openDetail(params.id);
        history.replaceState(null, '', '#/rooms');
      }
    },

    openDetail: openDetail,
    openEditor: openEditor
  };

  /* ============================================================
     rooms panel
     ============================================================ */

  function visible() {
    return Store.state.rooms.filter(r => {
      if (filters.floor && String(r.floor) !== filters.floor) return false;
      if (filters.type && r.typeId !== filters.type) return false;
      if (filters.status && r.status !== filters.status) return false;
      return true;
    }).sort((a, b) => U.cmp(a.number, b.number));
  }

  function roomsPanel() {
    const rooms = visible();
    const floors = U.unique(Store.state.rooms.map(r => r.floor)).sort();
    const today = U.today();
    const occ = Domain.occupancyOn(today);
    const occByRoom = U.indexBy(occ, 'roomId');

    const bar = '<div class="card__head" style="flex-wrap:wrap;gap:10px;border-top:0">' +
      '<select class="select" id="rmFloor" style="width:auto;height:34px" aria-label="Floor">' +
        '<option value="">All floors</option>' +
        floors.map(f => '<option value="' + f + '"' + (filters.floor === String(f) ? ' selected' : '') + '>Floor ' + f + '</option>').join('') +
      '</select>' +
      '<select class="select" id="rmType" style="width:auto;height:34px" aria-label="Room type">' +
        '<option value="">All types</option>' +
        Store.state.roomTypes.map(t => '<option value="' + t.id + '"' + (filters.type === t.id ? ' selected' : '') + '>' + U.esc(t.name) + '</option>').join('') +
      '</select>' +
      '<select class="select" id="rmStatus" style="width:auto;height:34px" aria-label="Status">' +
        '<option value="">Any status</option>' +
        Object.keys(UI.ROOM_STATUS).map(k => '<option value="' + k + '"' + (filters.status === k ? ' selected' : '') + '>' + U.esc(UI.ROOM_STATUS[k].label) + '</option>').join('') +
      '</select>' +
      '<div class="spacer"></div>' +
      '<span class="small muted">' + rooms.length + ' shown</span>' +
      '<button class="btn btn--primary btn--sm" id="rmNew"><span data-icon="plus"></span>Add room</button>' +
    '</div>';

    if (!rooms.length) return bar + UI.empty({ icon: 'door', title: 'No rooms match', message: 'Clear a filter to see more.' });

    return bar + '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Room</th><th>Type</th><th>Floor</th><th class="num">Capacity</th><th class="num">Base rate</th>' +
      '<th>Status</th><th>Tonight</th><th></th>' +
      '</tr></thead><tbody>' +
      rooms.map(r => {
        const t = Store.roomType(r.typeId);
        const b = occByRoom.get(r.id);
        return '<tr class="is-clickable" data-room="' + r.id + '">' +
          '<td><span class="roomno">' + U.esc(r.number) + '</span></td>' +
          '<td><div class="cellstack"><strong>' + U.esc(t ? t.name : '—') + '</strong><span>' + U.esc(t ? t.beds : '') + '</span></div></td>' +
          '<td>' + r.floor + '</td>' +
          '<td class="num">' + (t ? t.capacity : '—') + '</td>' +
          '<td class="num">' + U.esc(t ? U.money(t.basePrice, null, { decimals: 0 }) : '—') + '</td>' +
          '<td>' + UI.roomBadge(r.status) +
            (r.status === 'ooo' && r.oooTo ? '<span class="small muted"> to ' + U.esc(U.fmtDate(r.oooTo)) + '</span>' : '') + '</td>' +
          '<td>' + (b
            ? '<div class="cellstack"><strong>' + U.esc(Store.guestName(b.guestId)) + '</strong><span>until ' + U.esc(U.fmtDate(b.checkOut)) + '</span></div>'
            : '<span class="muted small">vacant</span>') + '</td>' +
          '<td><div class="rowactions">' +
            '<button class="iconbtn iconbtn--bare" data-editroom="' + r.id + '" title="Edit room" data-icon="edit"></button>' +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     types panel
     ============================================================ */

  function typesPanel() {
    const types = Store.state.roomTypes;
    const today = U.today();

    const bar = '<div class="card__head" style="border-top:0">' +
      '<p class="small muted">Rates, capacity and amenities are inherited by every room of the type and pushed to connected channels.</p>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn--primary btn--sm" id="rtNew"><span data-icon="plus"></span>Add type</button>' +
    '</div>';

    if (!types.length) return bar + UI.empty({ icon: 'layers', title: 'No room types yet' });

    return bar + '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Type</th><th class="num">Rooms</th><th class="num">Sold tonight</th><th class="num">Capacity</th>' +
      '<th class="num">Size</th><th class="num">Base rate</th><th>Amenities</th><th></th>' +
      '</tr></thead><tbody>' +
      types.map(t => {
        const rooms = Store.state.rooms.filter(r => r.typeId === t.id);
        const sold = Domain.occupancyOn(today).filter(b => b.typeId === t.id).length;
        return '<tr>' +
          '<td><div class="cellstack"><strong>' + U.esc(t.name) + '</strong><span class="mono">' + U.esc(t.code) + '</span></div></td>' +
          '<td class="num">' + rooms.length + '</td>' +
          '<td class="num">' + sold + ' <span class="muted">/ ' + rooms.length + '</span></td>' +
          '<td class="num">' + t.capacity + '</td>' +
          '<td class="num">' + t.size + ' m²</td>' +
          '<td class="num strong">' + U.esc(U.money(t.basePrice, null, { decimals: 0 })) + '</td>' +
          '<td><div class="row row--wrap gap-sm">' +
            t.amenities.slice(0, 3).map(a => '<span class="chip">' + U.esc(a) + '</span>').join('') +
            (t.amenities.length > 3 ? '<span class="small muted">+' + (t.amenities.length - 3) + '</span>' : '') +
          '</div></td>' +
          '<td><div class="rowactions">' +
            '<button class="iconbtn iconbtn--bare" data-edittype="' + t.id + '" title="Edit type" data-icon="edit"></button>' +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     room detail
     ============================================================ */

  function openDetail(roomId) {
    const room = Store.room(roomId);
    if (!room) return;
    const type = Store.roomType(room.typeId);
    const today = U.today();

    const current = Store.state.bookings.find(b => b.roomId === room.id && b.status === 'in_house');
    const upcoming = Store.state.bookings
      .filter(b => b.roomId === room.id && b.checkIn >= today && (b.status === 'confirmed'))
      .sort((a, b) => U.cmp(a.checkIn, b.checkIn)).slice(0, 5);
    const recent = Store.state.bookings
      .filter(b => b.roomId === room.id && b.status === 'checked_out')
      .sort((a, b) => U.cmp(b.checkOut, a.checkOut)).slice(0, 5);

    const stock = Domain.stockFor(room.id);
    const lowItems = Store.state.minibarItems.filter(i => (stock[i.id] || 0) < i.par);
    const task = Store.state.hkTasks.find(t => t.roomId === room.id && t.date === today);

    const m = UI.modal({
      title: 'Room ' + room.number,
      subtitle: (type ? type.name : '') + ' · floor ' + room.floor + ' · ' + (type ? type.capacity + ' guests · ' + type.size + ' m²' : ''),
      size: 'lg',
      body:
        '<div class="row row--wrap" style="margin-bottom:16px">' +
          UI.roomBadge(room.status) +
          (current ? '<span class="badge badge--info"><span data-icon="key"></span>' + U.esc(Store.guestName(current.guestId)) + '</span>' : '<span class="badge">Vacant</span>') +
          (lowItems.length ? '<span class="badge badge--warn"><span data-icon="bottle"></span>Mini bar below par</span>' : '') +
          '<span class="spacer"></span>' +
          '<div class="seg" id="statusSeg" role="group" aria-label="Set room status">' +
            ['dirty', 'cleaning', 'clean', 'inspected'].map(s =>
              '<button data-status="' + s + '"' + (room.status === s ? ' class="is-active"' : '') + '>' +
              U.esc(UI.ROOM_STATUS[s].label) + '</button>').join('') +
          '</div>' +
        '</div>' +

        '<div class="grid grid--2" style="gap:20px">' +
          '<div>' +
            '<p class="label" style="margin-bottom:8px">Right now</p>' +
            (current
              ? '<div class="taskcard" data-booking="' + current.id + '">' +
                  '<div class="taskcard__top"><strong>' + U.esc(Store.guestName(current.guestId)) + '</strong>' +
                  '<span class="spacer"></span>' + UI.channelKey(current.channel) + '</div>' +
                  '<div class="taskcard__meta"><span>' + U.esc(U.stayLabel(current.checkIn, current.checkOut)) + '</span>' +
                  '<span>' + U.esc(U.money(current.rate)) + '/night</span>' +
                  '<span>Balance ' + U.esc(U.money(Domain.folioTotals(current.id).balance)) + '</span></div>' +
                '</div>'
              : '<p class="small muted">Nobody in the room.</p>') +

            '<p class="label mt-lg" style="margin-bottom:8px">Arriving next</p>' +
            (upcoming.length
              ? upcoming.map(b => '<div class="movrow" data-booking="' + b.id + '">' +
                  '<div class="cellstack"><strong>' + U.esc(Store.guestName(b.guestId)) + '</strong>' +
                  '<span>' + U.esc(U.stayLabel(b.checkIn, b.checkOut)) + '</span></div>' +
                  '<span class="spacer"></span>' + UI.channelKey(b.channel) + '</div>').join('')
              : '<p class="small muted">Nothing on the books.</p>') +
          '</div>' +

          '<div>' +
            '<p class="label" style="margin-bottom:8px">Housekeeping</p>' +
            (task
              ? '<dl class="deflist"><dt>Task</dt><dd>' + U.esc(U.titleCase(task.type)) + ' clean</dd>' +
                '<dt>Assigned</dt><dd>' + U.esc(task.assignee || 'Unassigned') + '</dd>' +
                '<dt>State</dt><dd>' + U.esc(U.titleCase(task.status)) + '</dd></dl>'
              : '<p class="small muted">No task scheduled for today.</p>') +

            '<p class="label mt-lg" style="margin-bottom:8px">Mini bar</p>' +
            '<div class="row row--wrap gap-sm">' +
              Store.state.minibarItems.map(i => {
                const q = stock[i.id] === undefined ? i.par : stock[i.id];
                return '<span class="chip"' + (q < i.par ? ' style="border-color:var(--warn)"' : '') + '>' +
                  U.esc(U.truncate(i.name, 16)) + ' <b>' + q + '/' + i.par + '</b></span>';
              }).join('') +
            '</div>' +
            (lowItems.length ? '<button class="btn btn--sm mt-sm" data-restock><span data-icon="refresh"></span>Restock to par</button>' : '') +

            '<p class="label mt-lg" style="margin-bottom:8px">Out of order</p>' +
            (room.oooFrom
              ? '<div class="notebox"><span data-icon="ban"></span><p><b>' + U.esc(room.oooReason || 'Maintenance') + '</b><br>' +
                U.esc(U.fmtDate(room.oooFrom)) + ' → ' + U.esc(U.fmtDate(room.oooTo)) +
                '</p></div><button class="btn btn--sm mt-sm" data-clearooo>Clear block</button>'
              : '<button class="btn btn--sm" data-setooo><span data-icon="ban"></span>Block for maintenance</button>') +

            '<p class="label mt-lg" style="margin-bottom:8px">Recent stays</p>' +
            (recent.length
              ? '<div class="small muted">' + recent.map(b =>
                U.esc(U.fmtDate(b.checkIn)) + ' – ' + U.esc(U.fmtDate(b.checkOut)) + ' · ' + U.esc(Store.guestName(b.guestId))
              ).join('<br>') + '</div>'
              : '<p class="small muted">No completed stays.</p>') +
          '</div>' +
        '</div>',
      footer: '<button class="btn btn--sm" data-editroom="' + room.id + '"><span data-icon="edit"></span>Edit room</button>' +
        '<span class="spacer"></span>' +
        '<button class="btn btn--soft" data-newbooking><span data-icon="plus"></span>Book this room</button>' +
        '<button class="btn" data-close>Close</button>'
    });

    U.on(m.el, 'click', '[data-status]', function (e, el) {
      Store.update('room:status', () => {
        Domain.setRoomStatus(room.id, el.dataset.status);
        const t = Store.state.hkTasks.find(x => x.roomId === room.id && x.date === today);
        if (t) t.status = el.dataset.status === 'clean' || el.dataset.status === 'inspected' ? 'done'
          : el.dataset.status === 'cleaning' ? 'in_progress' : 'pending';
      });
      m.close();
      UI.toast('Room ' + room.number + ' marked ' + UI.ROOM_STATUS[el.dataset.status].label.toLowerCase(), '', 'ok', 2200);
    });

    U.on(m.el, 'click', '[data-restock]', function () {
      Store.update('minibar:restock', () => {
        Domain.restockMinibar(room.id);
        Store.log('Mini bar restocked in room ' + room.number, 'bottle', '#/minibar', 'service');
      });
      m.close();
      UI.toast('Mini bar restocked', 'Room ' + room.number + ' is back at par.', 'ok');
    });

    U.on(m.el, 'click', '[data-booking]', function (e, el) {
      m.close();
      Views.bookings.openDetail(el.dataset.booking);
    });

    U.on(m.el, 'click', '[data-newbooking]', function () {
      m.close();
      Views.bookings.openEditor(null, { roomId: room.id, checkIn: today, checkOut: U.addDays(today, 1) });
    });

    U.on(m.el, 'click', '[data-editroom]', function () { m.close(); openEditor(room.id); });

    U.on(m.el, 'click', '[data-clearooo]', function () {
      Store.update('room:ooo', () => {
        room.oooFrom = null; room.oooTo = null; room.oooReason = '';
        if (room.status === 'ooo') room.status = 'dirty';
        Store.log('Room ' + room.number + ' returned to service', 'check-circle', '#/rooms', 'rooms');
      });
      m.close();
      UI.toast('Back in service', 'Room ' + room.number + ' is sellable again.', 'ok');
    });

    U.on(m.el, 'click', '[data-setooo]', function () { m.close(); openOOO(room.id); });
  }

  /* ============================================================
     editors
     ============================================================ */

  function openEditor(roomId) {
    const room = roomId ? Store.room(roomId) : null;
    const floors = U.unique(Store.state.rooms.map(r => r.floor)).sort();

    const m = UI.modal({
      title: room ? 'Edit room ' + room.number : 'Add a room',
      size: 'md',
      body: '<form id="rmForm"><div class="formgrid">' +
        UI.field({ label: 'Room number', name: 'number', value: room ? room.number : '', required: true, autofocus: !room }) +
        UI.field({
          label: 'Floor', name: 'floor', type: 'number', min: 0, max: 60,
          value: room ? room.floor : (floors[floors.length - 1] || 1)
        }) +
        UI.field({
          label: 'Room type', name: 'typeId', type: 'select', span2: true,
          value: room ? room.typeId : Store.state.roomTypes[0].id,
          options: Store.state.roomTypes.map(t => ({ value: t.id, label: t.name + ' · ' + U.money(t.basePrice, null, { decimals: 0 }) + '/night' }))
        }) +
        UI.field({
          label: 'Status', name: 'status', type: 'select',
          value: room ? room.status : 'clean',
          options: Object.keys(UI.ROOM_STATUS).filter(k => k !== 'ooo').map(k => ({ value: k, label: UI.ROOM_STATUS[k].label }))
        }) +
        '<div class="field" style="justify-content:flex-end;padding-bottom:8px">' +
          UI.switchField({ label: 'Sellable', name: 'active', checked: room ? room.active : true, hint: 'Turn off to hide from availability' }) +
        '</div>' +
        UI.field({ label: 'Internal notes', name: 'notes', type: 'textarea', value: room ? room.notes : '', span2: true, placeholder: 'Connecting door to 302, noisy A/C…' }) +
      '</div></form>',
      footer: (room ? '<button class="btn btn--danger btn--sm" id="rmDelete"><span data-icon="trash"></span>Delete</button>' : '') +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="rmSave">' + (room ? 'Save changes' : 'Add room') + '</button>'
    });

    m.el.querySelector('#rmSave').addEventListener('click', function () {
      const form = m.el.querySelector('#rmForm');
      const d = UI.formData(form);
      const errors = {};
      if (!d.number) errors.number = 'A room number is required.';
      else if (Store.state.rooms.some(r => r.number === String(d.number).trim() && r.id !== roomId)) {
        errors.number = 'Room ' + d.number + ' already exists.';
      }
      if (Object.keys(errors).length) { UI.setErrors(form, errors); return; }

      Store.update('room:save', function (s) {
        if (room) {
          Object.assign(room, {
            number: String(d.number).trim(), floor: Number(d.floor) || 1,
            typeId: d.typeId, status: d.status, active: !!d.active, notes: d.notes
          });
          // keep future reservations pointing at the right type
          s.bookings.forEach(b => { if (b.roomId === room.id) b.typeId = room.typeId; });
        } else {
          s.rooms.push({
            id: U.uid('room'), number: String(d.number).trim(), floor: Number(d.floor) || 1,
            typeId: d.typeId, status: d.status, notes: d.notes, active: !!d.active,
            oooFrom: null, oooTo: null, oooReason: ''
          });
        }
        Store.log((room ? 'Room ' + d.number + ' updated' : 'Room ' + d.number + ' added'), 'door', '#/rooms', 'rooms');
      });

      m.close();
      UI.toast(room ? 'Room updated' : 'Room added', 'Room ' + d.number, 'ok');
    });

    const del = m.el.querySelector('#rmDelete');
    if (del) del.addEventListener('click', async function () {
      const future = Store.state.bookings.filter(b => b.roomId === room.id && Domain.holdsRoom(b) && b.checkOut >= U.today());
      if (future.length) {
        UI.toast('Cannot delete', 'Room ' + room.number + ' has ' + future.length + ' current or future reservation(s). Move them first.', 'warn');
        return;
      }
      const ok = await UI.confirm({
        title: 'Delete room ' + room.number + '?',
        message: 'Past reservations keep their record but will no longer link to a room.',
        confirmLabel: 'Delete room', tone: 'danger'
      });
      if (!ok) return;
      Store.update('room:delete', s => {
        s.rooms = s.rooms.filter(r => r.id !== room.id);
        Store.log('Room ' + room.number + ' deleted', 'trash', '#/rooms', 'rooms');
      });
      m.close();
      UI.toast('Room deleted', 'Room ' + room.number, 'ok');
    });
  }

  function openTypeEditor(typeId) {
    const type = typeId ? Store.roomType(typeId) : null;
    const pool = Seed.AMENITY_POOL;
    const chosen = type ? type.amenities : ['Wi-Fi', 'Air conditioning'];

    const m = UI.modal({
      title: type ? 'Edit ' + type.name : 'Add a room type',
      size: 'md',
      body: '<form id="rtForm"><div class="formgrid">' +
        UI.field({ label: 'Name', name: 'name', value: type ? type.name : '', required: true, autofocus: !type }) +
        UI.field({ label: 'Code', name: 'code', value: type ? type.code : '', placeholder: 'DLX', hint: 'Sent to channels as the rate-plan code' }) +
        UI.field({ label: 'Base rate per night', name: 'basePrice', type: 'number', min: 0, value: type ? type.basePrice : 120 }) +
        UI.field({ label: 'Max guests', name: 'capacity', type: 'number', min: 1, max: 8, value: type ? type.capacity : 2 }) +
        UI.field({ label: 'Bed setup', name: 'beds', value: type ? type.beds : '1 double' }) +
        UI.field({ label: 'Size (m²)', name: 'size', type: 'number', min: 5, value: type ? type.size : 24 }) +
        '<div class="field span2" style="grid-column:1/-1"><label>Amenities</label>' +
          '<div class="row row--wrap gap-sm" style="margin-top:2px">' +
            pool.map(a => '<label class="chip" style="cursor:pointer">' +
              '<input type="checkbox" name="am_' + U.slug(a) + '"' + (chosen.indexOf(a) > -1 ? ' checked' : '') +
              ' style="width:14px;height:14px;accent-color:var(--coral-500)"> ' + U.esc(a) + '</label>').join('') +
          '</div>' +
        '</div>' +
      '</div></form>',
      footer: (type ? '<button class="btn btn--danger btn--sm" id="rtDelete"><span data-icon="trash"></span>Delete</button>' : '') +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="rtSave">' + (type ? 'Save changes' : 'Add type') + '</button>'
    });

    m.el.querySelector('#rtSave').addEventListener('click', function () {
      const form = m.el.querySelector('#rtForm');
      const d = UI.formData(form);
      if (!d.name) { UI.setErrors(form, { name: 'A name is required.' }); return; }

      const amenities = pool.filter(a => d['am_' + U.slug(a)]);

      Store.update('type:save', function (s) {
        if (type) {
          Object.assign(type, {
            name: d.name, code: (d.code || d.name.slice(0, 3)).toUpperCase(),
            basePrice: Number(d.basePrice) || 0, capacity: Number(d.capacity) || 2,
            beds: d.beds, size: Number(d.size) || 20, amenities: amenities
          });
        } else {
          s.roomTypes.push({
            id: U.uid('rt'), name: d.name, code: (d.code || d.name.slice(0, 3)).toUpperCase(),
            basePrice: Number(d.basePrice) || 0, capacity: Number(d.capacity) || 2,
            beds: d.beds || '1 double', size: Number(d.size) || 20, amenities: amenities
          });
        }
        Store.log('Room type "' + d.name + '" ' + (type ? 'updated' : 'created') + ' · rates queued for channel push', 'layers', '#/rooms', 'rooms');
      });

      m.close();
      UI.toast(type ? 'Room type updated' : 'Room type created', d.name + ' · rates will be pushed on the next sync', 'ok');
    });

    const del = m.el.querySelector('#rtDelete');
    if (del) del.addEventListener('click', async function () {
      const used = Store.state.rooms.filter(r => r.typeId === type.id);
      if (used.length) {
        UI.toast('Cannot delete', type.name + ' is assigned to ' + used.length + ' room(s).', 'warn');
        return;
      }
      const ok = await UI.confirm({ title: 'Delete ' + type.name + '?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
      if (!ok) return;
      Store.update('type:delete', s => { s.roomTypes = s.roomTypes.filter(t => t.id !== type.id); });
      m.close();
      UI.toast('Room type deleted', type.name, 'ok');
    });
  }

  function openOOO(roomId) {
    const room = Store.room(roomId);
    const today = U.today();

    const m = UI.modal({
      title: 'Block room ' + room.number,
      subtitle: 'The room is removed from availability and channel inventory',
      size: 'sm',
      body: '<form id="oooForm"><div class="formgrid">' +
        UI.field({ label: 'From', name: 'from', type: 'date', value: today }) +
        UI.field({ label: 'Until', name: 'to', type: 'date', value: U.addDays(today, 2) }) +
        UI.field({ label: 'Reason', name: 'reason', span2: true, placeholder: 'Bathroom re-grouting', autofocus: true }) +
      '</div></form>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="oooGo">Block room</button>'
    });

    m.el.querySelector('#oooGo').addEventListener('click', function () {
      const form = m.el.querySelector('#oooForm');
      const d = UI.formData(form);
      if (d.to <= d.from) { UI.setErrors(form, { to: 'The end date must be after the start.' }); return; }

      const clash = Domain.bookingsForRoom(room.id, d.from, d.to);
      if (clash.length) {
        UI.toast('Reservations in the way', clash.length + ' booking(s) overlap that window. Move them first.', 'warn');
        return;
      }

      Store.update('room:ooo', () => {
        room.oooFrom = d.from; room.oooTo = d.to;
        room.oooReason = d.reason || 'Maintenance';
        if (d.from <= today && today < d.to) room.status = 'ooo';
        Store.log('Room ' + room.number + ' blocked · ' + (d.reason || 'maintenance'), 'ban', '#/rooms', 'rooms');
      });

      m.close();
      UI.toast('Room blocked', 'Room ' + room.number + ' is out of order until ' + U.fmtDate(d.to), 'ok');
    });
  }

})(window);
