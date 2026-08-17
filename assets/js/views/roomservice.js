/* ============================================================
   View — Room service (orders + menu)
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  let tab = 'orders';

  Views.roomservice = {
    title: 'Room Service',
    subtitle: function () {
      const open = Store.state.orders.filter(o => o.status === 'new' || o.status === 'preparing').length;
      return open ? open + ' order' + (open === 1 ? '' : 's') + ' in the pass' : 'Nothing in the pass right now';
    },

    render: function (host) {
      const today = U.today();
      const orders = Store.state.orders;
      const todays = orders.filter(o => U.today(new Date(o.placedAt)) === today);
      const openOrders = orders.filter(o => o.status === 'new' || o.status === 'preparing');
      const revenueToday = U.sum(todays.filter(o => o.status !== 'cancelled'), o => o.total);
      const avgPrep = averagePrep(orders);

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Open orders', icon: 'tray', valueHTML: U.num(openOrders.length), note: openOrders.filter(o => o.status === 'new').length + ' not yet started' }) +
            UI.stat({ label: 'Orders today', icon: 'receipt', valueHTML: U.num(todays.length), note: 'across ' + U.unique(todays.map(o => o.roomId)).length + ' rooms' }) +
            UI.stat({ label: 'Revenue today', icon: 'tag', valueHTML: U.esc(U.moneyCompact(revenueToday)), note: 'posted to guest folios' }) +
            UI.stat({ label: 'Average delivery', icon: 'clock', valueHTML: avgPrep ? avgPrep + '<small> min</small>' : '—', note: 'from order to door' }) +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="tabs">' +
              '<button data-tab="orders"' + (tab === 'orders' ? ' class="is-active"' : '') + '>Orders <span class="muted">' + openOrders.length + '</span></button>' +
              '<button data-tab="menu"' + (tab === 'menu' ? ' class="is-active"' : '') + '>Menu <span class="muted">' + Store.state.menu.length + '</span></button>' +
            '</div>' +
            '<div class="card__head" style="border-top:0">' +
              '<p class="small muted">' + (tab === 'orders'
                ? 'Delivering an order posts it straight to the guest folio.'
                : 'Menu prices flow through to every new order.') + '</p>' +
              '<div class="spacer"></div>' +
              (tab === 'orders'
                ? '<button class="btn btn--primary btn--sm" id="rsNew"><span data-icon="plus"></span>New order</button>'
                : '<button class="btn btn--primary btn--sm" id="mnNew"><span data-icon="plus"></span>Add dish</button>') +
            '</div>' +
            '<div class="card__body" id="rsPanel">' + (tab === 'menu' ? menuPanel() : ordersPanel()) + '</div>' +
          '</div>' +
        '</div>';

      wire(host);
    },

    openOrder: openOrder,
    openNew: openNew
  };

  function averagePrep(orders) {
    const done = orders.filter(o => o.deliveredAt && o.placedAt);
    if (!done.length) return 0;
    const mins = U.sum(done, o => (new Date(o.deliveredAt) - new Date(o.placedAt)) / 60000);
    return Math.round(mins / done.length);
  }

  /* ============================================================
     orders board
     ============================================================ */

  const COLUMNS = [
    { key: 'new', label: 'Received', color: 'var(--warn)' },
    { key: 'preparing', label: 'In the kitchen', color: 'var(--coral-500)' },
    { key: 'delivered', label: 'Delivered', color: 'var(--ok)' }
  ];

  function ordersPanel() {
    const today = U.today();
    const orders = Store.state.orders.filter(o =>
      o.status !== 'cancelled' &&
      (o.status !== 'delivered' || U.today(new Date(o.placedAt)) === today));

    if (!orders.length) {
      return UI.empty({
        icon: 'tray', title: 'No orders yet today',
        message: 'Take an order for any in-house guest and it lands on their folio when delivered.',
        action: 'New order', actionAttr: 'id="rsNew2"'
      });
    }

    return '<div class="board">' + COLUMNS.map(col => {
      const list = orders.filter(o => o.status === col.key).sort((a, b) => U.cmp(b.placedAt, a.placedAt));
      return '<div class="board__col">' +
        '<div class="board__colhead"><span class="dot" style="background:' + col.color + '"></span>' +
          U.esc(col.label) + '<span class="count">' + list.length + '</span></div>' +
        '<div class="board__list">' +
          (list.length ? list.map(orderCard).join('') : '<p class="small muted" style="padding:6px 4px 12px">Nothing here.</p>') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function orderCard(o) {
    const room = Store.room(o.roomId);
    const guest = o.bookingId ? Store.guestName((Store.booking(o.bookingId) || {}).guestId) : null;
    const age = Math.round((Date.now() - new Date(o.placedAt)) / 60000);
    const late = o.status !== 'delivered' && age > 40;

    return '<div class="taskcard" data-orderopen="' + o.id + '">' +
      '<div class="taskcard__top">' +
        '<span class="roomno">' + U.esc(room ? room.number : '—') + '</span>' +
        '<div class="cellstack"><strong style="font-size:12.5px">' + U.esc(o.ref) + '</strong>' +
        '<span>' + U.esc(guest || 'No guest in room') + '</span></div>' +
        '<span class="spacer"></span>' +
        '<strong style="font-variant-numeric:tabular-nums">' + U.esc(U.money(o.total, null, { decimals: 0 })) + '</strong>' +
      '</div>' +
      '<p class="small muted" style="margin-top:8px">' +
        o.items.map(l => {
          const m = Store.menuItem(l.menuId);
          return U.esc((l.qty > 1 ? l.qty + '× ' : '') + (m ? m.name : 'Item'));
        }).join(', ') +
      '</p>' +
      (o.notes ? '<p class="small" style="margin-top:6px;color:var(--warn)">“' + U.esc(o.notes) + '”</p>' : '') +
      '<div class="taskcard__meta">' +
        '<span class="row gap-sm"><span data-icon="clock" style="font-size:13px"></span>' +
          (o.status === 'delivered' && o.deliveredAt
            ? 'delivered ' + U.esc(U.fmtTime(o.deliveredAt))
            : age + ' min ago') + '</span>' +
        (o.assignee ? '<span class="row gap-sm"><span data-icon="user" style="font-size:13px"></span>' + U.esc(o.assignee) + '</span>' : '') +
        (late ? '<span class="badge badge--warn">Running late</span>' : '') +
      '</div>' +
      '<div class="taskcard__actions">' +
        (o.status === 'new' ? '<button class="btn btn--sm" data-rsadv="' + o.id + '|preparing"><span data-icon="play"></span>Start</button>' : '') +
        (o.status !== 'delivered' ? '<button class="btn btn--sm btn--soft" data-rsadv="' + o.id + '|delivered"><span data-icon="check"></span>Delivered</button>' : '') +
        (o.status !== 'delivered' ? '<button class="btn btn--sm btn--ghost" data-rscancel="' + o.id + '">Cancel</button>' : '') +
      '</div>' +
    '</div>';
  }

  /* ============================================================
     menu
     ============================================================ */

  function menuPanel() {
    const cats = U.groupBy(Store.state.menu, m => m.category);
    let html = '';
    cats.forEach((items, cat) => {
      html += '<p class="label" style="margin:12px 0 8px">' + U.esc(cat) + '</p>' +
        '<div class="tablewrap"><table class="table"><thead><tr>' +
        '<th>Dish</th><th class="num">Prep time</th><th class="num">Price</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        items.map(m => '<tr>' +
          '<td class="strong">' + U.esc(m.name) + '</td>' +
          '<td class="num">' + m.prepMins + ' min</td>' +
          '<td class="num strong">' + U.esc(U.money(m.price)) + '</td>' +
          '<td>' + (m.active ? '<span class="badge badge--ok">On the menu</span>' : '<span class="badge">Hidden</span>') + '</td>' +
          '<td><div class="rowactions"><button class="iconbtn iconbtn--bare" data-menuedit="' + m.id + '" title="Edit" data-icon="edit"></button></div></td>' +
        '</tr>').join('') +
        '</tbody></table></div>';
    });
    return html;
  }

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host) {
    UI.tabs(host, function (t) { tab = t; App.render(); });

    U.on(host, 'click', '#rsNew, #rsNew2', () => openNew());
    U.on(host, 'click', '#mnNew', () => openMenuItem(null));
    U.on(host, 'click', '[data-menuedit]', (e, el) => openMenuItem(el.dataset.menuedit));

    U.on(host, 'click', '[data-rsadv]', function (e, el) {
      e.stopPropagation();
      const [id, status] = el.dataset.rsadv.split('|');
      const o = Store.order(id);
      const room = Store.room(o.roomId);
      Store.update('rs:advance', () => {
        Domain.setOrderStatus(id, status);
        if (status === 'delivered') {
          Store.log('Room service ' + o.ref + ' delivered to room ' + (room ? room.number : '—') +
            ' · ' + U.money(o.total), 'tray', '#/roomservice', 'service');
        }
      });
      if (status === 'delivered') {
        UI.toast('Delivered', o.ref + ' · ' + U.money(o.total) +
          (o.bookingId ? ' posted to the folio' : ' (no folio — no guest in room)'), 'ok');
      }
    });

    U.on(host, 'click', '[data-rscancel]', async function (e, el) {
      e.stopPropagation();
      const o = Store.order(el.dataset.rscancel);
      const ok = await UI.confirm({
        title: 'Cancel ' + o.ref + '?',
        message: 'The order is dropped and nothing is charged to the guest.',
        confirmLabel: 'Cancel order', tone: 'danger'
      });
      if (!ok) return;
      Store.update('rs:cancel', () => { o.status = 'cancelled'; });
      UI.toast('Order cancelled', o.ref, 'ok', 2400);
    });

    U.on(host, 'click', '[data-orderopen]', function (e, el) {
      if (e.target.closest('button')) return;
      openOrder(el.dataset.orderopen);
    });
  }

  /* ============================================================
     dialogs
     ============================================================ */

  function openNew(prefillRoomId) {
    const inHouse = Domain.inHouse();
    if (!inHouse.length) {
      UI.toast('Nobody in house', 'Check a guest in before taking a room-service order.', 'warn');
      return;
    }

    const menu = Store.state.menu.filter(m => m.active);
    const cats = U.groupBy(menu, m => m.category);
    let menuHtml = '';
    cats.forEach((items, cat) => {
      menuHtml += '<p class="label" style="margin:14px 0 6px">' + U.esc(cat) + '</p>' +
        items.map(m => '<div class="orderline" data-menu="' + m.id + '">' +
          '<div class="cellstack"><strong>' + U.esc(m.name) + '</strong>' +
          '<span>' + U.esc(U.money(m.price)) + ' · ' + m.prepMins + ' min</span></div>' +
          '<div class="stepper">' +
            '<button type="button" data-step="-1" aria-label="Remove one">−</button>' +
            '<input type="number" value="0" min="0" max="9" data-qty="' + m.id + '" aria-label="' + U.esc(m.name) + ' quantity">' +
            '<button type="button" data-step="1" aria-label="Add one">+</button>' +
          '</div>' +
        '</div>').join('');
    });

    const m = UI.modal({
      title: 'New room-service order',
      subtitle: 'Charges post to the folio when the order is delivered',
      size: 'lg',
      body:
        '<div class="formgrid" style="margin-bottom:6px">' +
          '<div class="field"><label for="rsRoom">Room</label><select class="select" id="rsRoom">' +
            inHouse.map(b => {
              const r = Store.room(b.roomId);
              return '<option value="' + b.roomId + '"' + (prefillRoomId === b.roomId ? ' selected' : '') + '>Room ' +
                U.esc(r ? r.number : '') + ' · ' + U.esc(Store.guestName(b.guestId)) + '</option>';
            }).join('') +
          '</select></div>' +
          '<div class="field"><label for="rsWho">Assign to</label><select class="select" id="rsWho">' +
            '<option value="">Unassigned</option>' +
            Store.state.staff.filter(s => s.role === 'Food & Beverage')
              .map(s => '<option value="' + U.esc(s.name) + '">' + U.esc(s.name) + '</option>').join('') +
          '</select></div>' +
        '</div>' +
        '<div class="field"><label for="rsNotes">Notes for the kitchen</label>' +
          '<input class="input" id="rsNotes" placeholder="No onions, deliver at 20:00…"></div>' +
        '<div style="max-height:44vh;overflow-y:auto;margin-top:4px">' + menuHtml + '</div>',
      footer: '<div id="rsTotal" class="row" style="font-weight:650">Total <span class="tnum" style="margin-left:8px">' +
        U.esc(U.money(0)) + '</span></div>' +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="rsGo">Send to kitchen</button>'
    });

    function total() {
      let t = 0;
      U.$$('[data-qty]', m.el).forEach(inp => {
        const item = Store.menuItem(inp.dataset.qty);
        t += (Number(inp.value) || 0) * (item ? item.price : 0);
      });
      m.el.querySelector('#rsTotal span').textContent = U.money(t);
      return t;
    }

    U.on(m.el, 'click', '[data-step]', function (e, el) {
      const input = el.parentElement.querySelector('input');
      input.value = U.clamp((Number(input.value) || 0) + Number(el.dataset.step), 0, 9);
      total();
    });
    U.on(m.el, 'input', '[data-qty]', total);

    m.el.querySelector('#rsGo').addEventListener('click', function () {
      const lines = [];
      U.$$('[data-qty]', m.el).forEach(inp => {
        const qty = Number(inp.value) || 0;
        if (qty > 0) lines.push({ menuId: inp.dataset.qty, qty: qty });
      });
      if (!lines.length) { UI.toast('Nothing selected', 'Add at least one item to the order.', 'warn'); return; }

      const roomId = m.el.querySelector('#rsRoom').value;
      const order = Store.update('rs:create', () => Domain.createOrder({
        roomId: roomId,
        items: lines,
        assignee: m.el.querySelector('#rsWho').value || null,
        notes: m.el.querySelector('#rsNotes').value.trim()
      }));

      const room = Store.room(roomId);
      Store.updateQuiet(() => Store.log('Room service ' + order.ref + ' taken for room ' + (room ? room.number : '—'), 'tray', '#/roomservice', 'service'));

      m.close();
      UI.toast('Order sent', order.ref + ' · room ' + (room ? room.number : '—') + ' · ' + U.money(order.total), 'ok');
    });
  }

  function openOrder(orderId) {
    const o = Store.order(orderId);
    if (!o) return;
    const room = Store.room(o.roomId);
    const booking = o.bookingId ? Store.booking(o.bookingId) : null;

    UI.modal({
      title: o.ref + ' · room ' + (room ? room.number : '—'),
      subtitle: (booking ? Store.guestName(booking.guestId) + ' · ' : '') + U.fmtDateTime(o.placedAt),
      size: 'sm',
      body:
        '<div class="tablewrap"><table class="folio"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>' +
        o.items.map(l => {
          const mi = Store.menuItem(l.menuId);
          return '<tr><td>' + U.esc(mi ? mi.name : 'Item') + '</td><td class="num">' + l.qty + '</td>' +
            '<td class="num">' + U.esc(U.money((mi ? mi.price : 0) * l.qty)) + '</td></tr>';
        }).join('') +
        '</tbody><tfoot><tr class="total"><td colspan="2" class="num">Total</td><td class="num">' +
        U.esc(U.money(o.total)) + '</td></tr></tfoot></table></div>' +
        (o.notes ? '<div class="notebox mt"><span data-icon="info"></span><p>' + U.esc(o.notes) + '</p></div>' : '') +
        '<dl class="deflist mt">' +
          '<dt>Status</dt><dd>' + U.esc(U.titleCase(o.status)) + '</dd>' +
          '<dt>Taken</dt><dd>' + U.esc(U.fmtDateTime(o.placedAt)) + '</dd>' +
          (o.deliveredAt ? '<dt>Delivered</dt><dd>' + U.esc(U.fmtDateTime(o.deliveredAt)) + '</dd>' : '') +
          '<dt>Runner</dt><dd>' + U.esc(o.assignee || 'Unassigned') + '</dd>' +
          '<dt>Folio</dt><dd>' + (o.postedToFolio ? 'Posted' : booking ? 'Posts on delivery' : 'No guest in room') + '</dd>' +
        '</dl>',
      footer: '<span class="spacer"></span><button class="btn" data-close>Close</button>' +
        (booking ? '<button class="btn btn--soft" id="rsFolio">Open folio</button>' : '')
    });

    const btn = document.querySelector('#rsFolio');
    if (btn) btn.addEventListener('click', function () {
      document.querySelector('.modal-scrim [data-close]').click();
      Views.bookings.openDetail(booking.id);
    });
  }

  function openMenuItem(menuId) {
    const item = menuId ? Store.menuItem(menuId) : null;
    const cats = U.unique(Store.state.menu.map(m => m.category));

    const m = UI.modal({
      title: item ? 'Edit ' + item.name : 'Add a dish',
      size: 'sm',
      body: '<form id="mnForm"><div class="formgrid">' +
        UI.field({ label: 'Name', name: 'name', value: item ? item.name : '', span2: true, required: true, autofocus: !item }) +
        UI.field({
          label: 'Category', name: 'category', type: 'select', value: item ? item.category : cats[0],
          options: cats.map(c => ({ value: c, label: c }))
        }) +
        UI.field({ label: 'Price', name: 'price', type: 'number', min: 0, step: '0.5', value: item ? item.price : 12 }) +
        UI.field({ label: 'Prep time (min)', name: 'prepMins', type: 'number', min: 1, max: 120, value: item ? item.prepMins : 20 }) +
        '<div class="field" style="justify-content:flex-end;padding-bottom:8px">' +
          UI.switchField({ label: 'On the menu', name: 'active', checked: item ? item.active : true }) +
        '</div>' +
      '</div></form>',
      footer: (item ? '<button class="btn btn--danger btn--sm" id="mnDelete"><span data-icon="trash"></span>Delete</button>' : '') +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="mnSave">' + (item ? 'Save' : 'Add dish') + '</button>'
    });

    m.el.querySelector('#mnSave').addEventListener('click', function () {
      const form = m.el.querySelector('#mnForm');
      const d = UI.formData(form);
      if (!d.name) { UI.setErrors(form, { name: 'A name is required.' }); return; }
      Store.update('menu:save', function (s) {
        if (item) Object.assign(item, { name: d.name, category: d.category, price: Number(d.price) || 0, prepMins: Number(d.prepMins) || 15, active: !!d.active });
        else s.menu.push({ id: U.uid('m'), name: d.name, category: d.category, price: Number(d.price) || 0, prepMins: Number(d.prepMins) || 15, active: !!d.active });
      });
      m.close();
      UI.toast(item ? 'Dish updated' : 'Dish added', d.name, 'ok');
    });

    const del = m.el.querySelector('#mnDelete');
    if (del) del.addEventListener('click', function () {
      Store.update('menu:delete', s => { s.menu = s.menu.filter(x => x.id !== item.id); });
      m.close();
      UI.toast('Dish removed', item.name, 'ok', 2200);
    });
  }

})(window);
