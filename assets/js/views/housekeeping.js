/* ============================================================
   View — Housekeeping
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  let mode = 'board';       // board | floor
  let assigneeFilter = '';

  Views.housekeeping = {
    title: 'Housekeeping',
    subtitle: function () {
      const today = U.today();
      const tasks = Store.state.hkTasks.filter(t => t.date === today);
      const done = tasks.filter(t => t.status === 'done').length;
      return tasks.length ? done + ' of ' + tasks.length + ' rooms serviced today' : 'No tasks generated for today yet';
    },

    render: function (host) {
      const today = U.today();
      const tasks = Store.state.hkTasks
        .filter(t => t.date === today)
        .filter(t => !assigneeFilter || t.assignee === assigneeFilter);

      const counts = Domain.housekeepingSummary();
      const done = tasks.filter(t => t.status === 'done').length;
      const minutes = U.sum(tasks.filter(t => t.status !== 'done'), t => t.minutes || 30);
      const staff = Store.state.staff.filter(s => s.role === 'Housekeeping');
      const arrivalsNeedingRoom = Domain.arrivals(today).filter(b => {
        const r = Store.room(b.roomId);
        return b.status === 'confirmed' && r && r.status !== 'clean' && r.status !== 'inspected';
      });

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({
              label: 'Rooms to service', icon: 'sparkle',
              valueHTML: U.num(tasks.length - done),
              note: tasks.length + ' scheduled today'
            }) +
            UI.stat({
              label: 'Estimated workload', icon: 'clock',
              valueHTML: Math.floor(minutes / 60) + '<small>h ' + (minutes % 60) + 'm</small>',
              note: staff.length + ' attendants on shift'
            }) +
            UI.stat({
              label: 'Ready to sell', icon: 'check-circle',
              valueHTML: U.num((counts.clean || 0) + (counts.inspected || 0)),
              note: 'clean or inspected'
            }) +
            UI.stat({
              label: 'Blocking an arrival', icon: 'alert',
              valueHTML: U.num(arrivalsNeedingRoom.length),
              note: arrivalsNeedingRoom.length ? 'prioritise these rooms' : 'every arrival has a clean room'
            }) +
          '</div>' +

          (arrivalsNeedingRoom.length
            ? '<div class="notebox"><span data-icon="alert"></span><p><b>' + arrivalsNeedingRoom.length +
              ' arriving guest' + (arrivalsNeedingRoom.length === 1 ? '' : 's') + ' waiting on a clean room:</b> ' +
              arrivalsNeedingRoom.map(b => U.esc((Store.room(b.roomId) || {}).number)).join(', ') + '</p></div>'
            : '') +

          '<div class="card card--flush">' +
            '<div class="card__head" style="flex-wrap:wrap;gap:10px">' +
              '<div class="seg" role="group" aria-label="View">' +
                '<button data-mode="board"' + (mode === 'board' ? ' class="is-active"' : '') + '>Task board</button>' +
                '<button data-mode="floor"' + (mode === 'floor' ? ' class="is-active"' : '') + '>Room status</button>' +
              '</div>' +
              '<select class="select" id="hkWho" style="width:auto;height:34px" aria-label="Attendant">' +
                '<option value="">All attendants</option>' +
                staff.map(s => '<option value="' + U.esc(s.name) + '"' + (assigneeFilter === s.name ? ' selected' : '') + '>' + U.esc(s.name) + '</option>').join('') +
              '</select>' +
              '<div class="spacer"></div>' +
              '<button class="btn btn--sm" id="hkGenerate"><span data-icon="refresh"></span>Rebuild today&rsquo;s list</button>' +
              '<button class="btn btn--sm" id="hkAssign"><span data-icon="users"></span>Auto-assign</button>' +
              '<button class="btn btn--primary btn--sm" id="hkNew"><span data-icon="plus"></span>Add task</button>' +
            '</div>' +
            '<div class="card__body" id="hkPanel">' + (mode === 'board' ? board(tasks) : floorPlan()) + '</div>' +
          '</div>' +
        '</div>';

      wire(host);
    }
  };

  /* ============================================================
     board
     ============================================================ */

  const COLUMNS = [
    { key: 'pending', label: 'To do', color: 'var(--warn)' },
    { key: 'in_progress', label: 'In progress', color: 'var(--coral-500)' },
    { key: 'done', label: 'Serviced', color: 'var(--ok)' }
  ];

  function board(tasks) {
    if (!tasks.length) {
      return UI.empty({
        icon: 'sparkle',
        title: 'No housekeeping tasks today',
        message: 'Rebuild the list to create tasks from today’s departures and stayovers.',
        action: 'Rebuild today’s list',
        actionAttr: 'id="hkGenerate2"'
      });
    }

    return '<div class="board">' + COLUMNS.map(col => {
      const list = tasks.filter(t => t.status === col.key)
        .sort((a, b) => U.cmp(a.priority === 'high' ? 0 : 1, b.priority === 'high' ? 0 : 1) ||
          U.cmp(roomNumber(a), roomNumber(b)));
      return '<div class="board__col">' +
        '<div class="board__colhead"><span class="dot" style="background:' + col.color + '"></span>' +
          U.esc(col.label) + '<span class="count">' + list.length + '</span></div>' +
        '<div class="board__list">' +
          (list.length ? list.map(taskCard).join('') : '<p class="small muted" style="padding:6px 4px 12px">Nothing here.</p>') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function roomNumber(t) {
    const r = Store.room(t.roomId);
    return r ? r.number : 'zzz';
  }

  function taskCard(t) {
    const room = Store.room(t.roomId);
    const type = room ? Store.roomType(room.typeId) : null;
    const arriving = Store.state.bookings.find(b => b.roomId === t.roomId && b.checkIn === U.today() && b.status === 'confirmed');

    return '<div class="taskcard" data-task="' + t.id + '">' +
      '<div class="taskcard__top">' +
        '<span class="roomno">' + U.esc(room ? room.number : '—') + '</span>' +
        '<div class="cellstack"><strong style="font-size:12.5px">' + U.esc(U.titleCase(t.type)) + '</strong>' +
        '<span>' + U.esc(type ? type.name : '') + '</span></div>' +
        (t.priority === 'high' ? '<span class="badge badge--warn" style="margin-left:auto">Priority</span>' : '') +
      '</div>' +
      '<div class="taskcard__meta">' +
        '<span class="row gap-sm"><span data-icon="clock" style="font-size:13px"></span>' + (t.minutes || 30) + ' min</span>' +
        '<span class="row gap-sm"><span data-icon="user" style="font-size:13px"></span>' + U.esc(t.assignee || 'Unassigned') + '</span>' +
        (arriving ? '<span class="badge badge--coral">Arrival ' + U.esc(Store.guestName(arriving.guestId).split(' ').pop()) + '</span>' : '') +
      '</div>' +
      (t.notes ? '<p class="small muted" style="margin-top:7px">' + U.esc(t.notes) + '</p>' : '') +
      '<div class="taskcard__actions">' +
        (t.status !== 'in_progress' && t.status !== 'done'
          ? '<button class="btn btn--sm" data-advance="' + t.id + '|in_progress"><span data-icon="play"></span>Start</button>' : '') +
        (t.status !== 'done'
          ? '<button class="btn btn--sm btn--soft" data-advance="' + t.id + '|done"><span data-icon="check"></span>Serviced</button>'
          : '<button class="btn btn--sm" data-advance="' + t.id + '|pending"><span data-icon="refresh"></span>Reopen</button>') +
        (t.status === 'done'
          ? '<button class="btn btn--sm" data-inspect="' + t.roomId + '"><span data-icon="eye"></span>Inspect</button>' : '') +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     floor plan
     ============================================================ */

  function floorPlan() {
    const rooms = Store.state.rooms.slice().sort((a, b) => U.cmp(a.number, b.number));
    const byFloor = U.groupBy(rooms, r => r.floor);
    const today = U.today();
    const occ = U.indexBy(Domain.occupancyOn(today), 'roomId');
    let html = '';

    byFloor.forEach((list, floor) => {
      html += '<p class="label" style="margin:14px 0 8px">Floor ' + floor + '</p><div class="hkgrid">' +
        list.map(r => {
          const b = occ.get(r.id);
          const type = Store.roomType(r.typeId);
          const departing = Store.state.bookings.some(x => x.roomId === r.id && x.checkOut === today && Domain.holdsRoom(x));
          return '<div class="hktile" data-status="' + U.esc(r.status) + '" data-roomtile="' + r.id + '">' +
            '<div class="hktile__no">' + U.esc(r.number) + '</div>' +
            '<div class="hktile__type">' + U.esc(type ? type.code : '') + ' · ' + U.esc(UI.ROOM_STATUS[r.status].label) + '</div>' +
            '<div class="hktile__foot">' +
              (b ? '<span class="badge badge--info" style="height:19px;font-size:10.5px"><span data-icon="key"></span>occupied</span>'
                 : '<span class="badge" style="height:19px;font-size:10.5px">vacant</span>') +
              (departing ? '<span class="badge badge--coral" style="height:19px;font-size:10.5px">due out</span>' : '') +
            '</div>' +
          '</div>';
        }).join('') + '</div>';
    });

    html += '<div class="row row--wrap mt-lg" style="gap:16px">' +
      Object.keys(UI.ROOM_STATUS).map(k =>
        '<span class="legend__item"><span class="legend__swatch" style="background:' +
        ({ clean: 'var(--ok)', inspected: 'var(--series-1)', dirty: 'var(--warn)', cleaning: 'var(--coral-500)', ooo: 'var(--danger)' })[k] +
        '"></span>' + U.esc(UI.ROOM_STATUS[k].label) + '</span>').join('') +
      '</div>';

    return html;
  }

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host) {
    U.on(host, 'click', '[data-mode]', function (e, el) { mode = el.dataset.mode; App.render(); });
    U.on(host, 'change', '#hkWho', function (e, el) { assigneeFilter = el.value; App.render(); });

    U.on(host, 'click', '[data-advance]', function (e, el) {
      e.stopPropagation();
      const [id, status] = el.dataset.advance.split('|');
      const t = Store.state.hkTasks.find(x => x.id === id);
      const room = t ? Store.room(t.roomId) : null;
      Store.update('hk:advance', () => {
        Domain.setTaskStatus(id, status);
        if (status === 'done' && room) Store.log('Room ' + room.number + ' serviced', 'sparkle', '#/housekeeping', 'housekeeping');
      });
      if (status === 'done' && room) UI.toast('Room ' + room.number + ' serviced', 'Marked clean and ready to inspect.', 'ok', 2400);
    });

    U.on(host, 'click', '[data-inspect]', function (e, el) {
      e.stopPropagation();
      const room = Store.room(el.dataset.inspect);
      Store.update('hk:inspect', () => { Domain.setRoomStatus(room.id, 'inspected'); });
      UI.toast('Room ' + room.number + ' inspected', 'Released for sale.', 'ok', 2400);
    });

    U.on(host, 'click', '[data-task]', function (e, el) {
      if (e.target.closest('button')) return;
      openTask(el.dataset.task);
    });

    U.on(host, 'click', '[data-roomtile]', function (e, el) { Views.rooms.openDetail(el.dataset.roomtile); });

    U.on(host, 'click', '#hkGenerate, #hkGenerate2', function () {
      const made = Store.update('hk:generate', () => Domain.generateHousekeeping(U.today()));
      UI.toast(made ? 'List rebuilt' : 'Nothing to add',
        made ? made + ' task' + (made === 1 ? '' : 's') + ' created from today’s movements.' : 'Every room already has a task.',
        made ? 'ok' : 'info');
    });

    U.on(host, 'click', '#hkAssign', function () {
      const staff = Store.state.staff.filter(s => s.role === 'Housekeeping');
      if (!staff.length) { UI.toast('No attendants', 'Add housekeeping staff in Settings.', 'warn'); return; }
      let n = 0;
      Store.update('hk:assign', function (s) {
        const open = s.hkTasks.filter(t => t.date === U.today() && t.status !== 'done' && !t.assignee)
          .sort((a, b) => U.cmp(roomNumber(a), roomNumber(b)));
        open.forEach((t, i) => { t.assignee = staff[i % staff.length].name; n++; });
      });
      UI.toast(n ? 'Assigned' : 'Nothing to assign',
        n ? n + ' task' + (n === 1 ? '' : 's') + ' spread across ' + staff.length + ' attendants.' : 'Every open task already has an owner.',
        n ? 'ok' : 'info');
    });

    U.on(host, 'click', '#hkNew', () => openTask(null));
  }

  function openTask(taskId) {
    const t = taskId ? Store.state.hkTasks.find(x => x.id === taskId) : null;
    const staff = Store.state.staff.filter(s => s.role === 'Housekeeping');
    const rooms = Store.state.rooms.slice().sort((a, b) => U.cmp(a.number, b.number));

    const m = UI.modal({
      title: t ? 'Task · room ' + (Store.room(t.roomId) || {}).number : 'Add a housekeeping task',
      size: 'sm',
      body: '<form id="hkForm"><div class="formgrid">' +
        UI.field({
          label: 'Room', name: 'roomId', type: 'select', span2: true,
          value: t ? t.roomId : rooms[0].id,
          options: rooms.map(r => ({ value: r.id, label: 'Room ' + r.number + ' · ' + UI.ROOM_STATUS[r.status].label }))
        }) +
        UI.field({
          label: 'Type', name: 'type', type: 'select', value: t ? t.type : 'departure',
          options: [
            { value: 'departure', label: 'Departure clean' },
            { value: 'stayover', label: 'Stayover service' },
            { value: 'deep', label: 'Deep clean' },
            { value: 'inspection', label: 'Inspection' },
            { value: 'maintenance', label: 'Maintenance check' }
          ]
        }) +
        UI.field({
          label: 'Assigned to', name: 'assignee', type: 'select', value: t ? (t.assignee || '') : '',
          options: [{ value: '', label: 'Unassigned' }].concat(staff.map(s => ({ value: s.name, label: s.name })))
        }) +
        UI.field({ label: 'Minutes', name: 'minutes', type: 'number', min: 5, max: 240, value: t ? t.minutes : 45 }) +
        UI.field({
          label: 'Priority', name: 'priority', type: 'select', value: t ? t.priority : 'normal',
          options: [{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'Priority' }]
        }) +
        UI.field({ label: 'Notes', name: 'notes', type: 'textarea', value: t ? t.notes : '', span2: true, placeholder: 'Extra towels, stain on carpet…' }) +
      '</div></form>',
      footer: (t ? '<button class="btn btn--danger btn--sm" id="hkDelete"><span data-icon="trash"></span>Remove</button>' : '') +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="hkSave">' + (t ? 'Save' : 'Add task') + '</button>'
    });

    m.el.querySelector('#hkSave').addEventListener('click', function () {
      const d = UI.formData(m.el.querySelector('#hkForm'));
      Store.update('hk:save', function (s) {
        if (t) {
          Object.assign(t, {
            roomId: d.roomId, type: d.type, assignee: d.assignee || null,
            minutes: Number(d.minutes) || 30, priority: d.priority, notes: d.notes
          });
        } else {
          s.hkTasks.push({
            id: U.uid('hk'), roomId: d.roomId, date: U.today(), type: d.type,
            assignee: d.assignee || null, status: 'pending', priority: d.priority,
            notes: d.notes, minutes: Number(d.minutes) || 30, startedAt: null, completedAt: null
          });
        }
      });
      m.close();
      UI.toast(t ? 'Task updated' : 'Task added', 'Room ' + (Store.room(d.roomId) || {}).number, 'ok');
    });

    const del = m.el.querySelector('#hkDelete');
    if (del) del.addEventListener('click', function () {
      Store.update('hk:delete', s => { s.hkTasks = s.hkTasks.filter(x => x.id !== t.id); });
      m.close();
      UI.toast('Task removed', '', 'ok', 2000);
    });
  }

})(window);
