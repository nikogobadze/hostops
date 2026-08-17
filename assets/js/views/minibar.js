/* ============================================================
   View — Mini bar (stock, posting, restock, product list)
   ============================================================ */
(function (global) {
  'use strict';
  const Views = global.Views || (global.Views = {});

  let tab = 'rooms';
  let onlyBelowPar = false;

  Views.minibar = {
    title: 'Mini Bar',
    subtitle: function () {
      const low = Store.state.rooms.filter(r => Domain.minibarNeedsRestock(r.id)).length;
      return low ? low + ' room' + (low === 1 ? '' : 's') + ' below par' : 'Every room is stocked to par';
    },

    render: function (host) {
      const today = U.today();
      const postings = Store.state.minibarPostings.filter(p => !p.voided);
      const todays = postings.filter(p => U.today(new Date(p.ts)) === today);
      const revenue30 = U.sum(postings.filter(p => U.today(new Date(p.ts)) >= U.addDays(today, -29)), p => p.amount);
      const low = Store.state.rooms.filter(r => Domain.minibarNeedsRestock(r.id));
      const items = Store.state.minibarItems;

      const unitsToRestock = U.sum(low, r => {
        const stock = Domain.stockFor(r.id);
        return U.sum(items, i => Math.max(0, i.par - (stock[i.id] || 0)));
      });

      host.innerHTML =
        '<div class="stack">' +
          '<div class="grid grid--kpi">' +
            UI.stat({ label: 'Posted today', icon: 'receipt', valueHTML: U.esc(U.money(U.sum(todays, p => p.amount), null, { decimals: 0 })), note: todays.length + ' postings' }) +
            UI.stat({ label: 'Revenue · 30 days', icon: 'tag', valueHTML: U.esc(U.moneyCompact(revenue30)), note: 'across the whole property' }) +
            UI.stat({ label: 'Rooms below par', icon: 'bottle', valueHTML: U.num(low.length), note: unitsToRestock + ' units to replace' }) +
            UI.stat({
              label: 'Best seller', icon: 'star',
              valueHTML: U.esc(bestSeller(postings) || '—'),
              note: 'by units consumed'
            }) +
          '</div>' +

          '<div class="card card--flush">' +
            '<div class="tabs">' +
              '<button data-tab="rooms"' + (tab === 'rooms' ? ' class="is-active"' : '') + '>Room stock</button>' +
              '<button data-tab="postings"' + (tab === 'postings' ? ' class="is-active"' : '') + '>Postings <span class="muted">' + postings.length + '</span></button>' +
              '<button data-tab="products"' + (tab === 'products' ? ' class="is-active"' : '') + '>Products <span class="muted">' + items.length + '</span></button>' +
            '</div>' +
            '<div class="card__head" style="border-top:0;flex-wrap:wrap;gap:10px">' +
              (tab === 'rooms'
                ? '<label class="check"><input type="checkbox" id="mbLow"' + (onlyBelowPar ? ' checked' : '') + '><span>Only rooms below par</span></label>'
                : '<p class="small muted">' + (tab === 'postings'
                  ? 'Every posting lands on the guest folio. Voiding one puts the stock back.'
                  : 'Prices and par levels apply to every room.') + '</p>') +
              '<div class="spacer"></div>' +
              (tab === 'rooms'
                ? '<button class="btn btn--sm" id="mbRestockAll"><span data-icon="refresh"></span>Restock all vacant</button>' +
                  '<button class="btn btn--primary btn--sm" id="mbPost"><span data-icon="plus"></span>Post consumption</button>'
                : tab === 'products'
                  ? '<button class="btn btn--primary btn--sm" id="mbNewItem"><span data-icon="plus"></span>Add product</button>'
                  : '') +
            '</div>' +
            '<div class="card__body" id="mbPanel">' +
              (tab === 'postings' ? postingsPanel(postings) : tab === 'products' ? productsPanel(postings) : roomsPanel()) +
            '</div>' +
          '</div>' +
        '</div>';

      wire(host);
    },

    openPost: openPost
  };

  function bestSeller(postings) {
    const tally = new Map();
    postings.forEach(p => tally.set(p.itemId, (tally.get(p.itemId) || 0) + p.qty));
    let best = null, bestQty = 0;
    tally.forEach((qty, id) => { if (qty > bestQty) { bestQty = qty; best = id; } });
    const item = best ? Store.minibarItem(best) : null;
    return item ? U.truncate(item.name.replace(/ \d+ml$/, ''), 16) : null;
  }

  /* ============================================================
     room stock
     ============================================================ */

  function roomsPanel() {
    const items = Store.state.minibarItems;
    let rooms = Store.state.rooms.slice().sort((a, b) => U.cmp(a.number, b.number));
    if (onlyBelowPar) rooms = rooms.filter(r => Domain.minibarNeedsRestock(r.id));

    if (!rooms.length) {
      return UI.empty({ icon: 'check-circle', title: 'Every room is at par', message: 'Nothing needs restocking right now.' });
    }

    const inHouse = U.indexBy(Domain.inHouse(), 'roomId');

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Room</th><th>Occupancy</th>' +
      items.map(i => '<th class="num" title="' + U.esc(i.name) + '">' + U.esc(U.truncate(i.name.split(' ')[0], 8)) + '</th>').join('') +
      '<th class="num">Missing</th><th></th>' +
      '</tr></thead><tbody>' +
      rooms.map(r => {
        const stock = Domain.stockFor(r.id);
        const b = inHouse.get(r.id);
        const missing = U.sum(items, i => Math.max(0, i.par - (stock[i.id] || 0)));
        return '<tr>' +
          '<td><span class="roomno">' + U.esc(r.number) + '</span></td>' +
          '<td>' + (b
            ? '<span class="badge badge--info"><span data-icon="key"></span>' + U.esc(U.truncate(Store.guestName(b.guestId), 18)) + '</span>'
            : '<span class="badge">vacant</span>') + '</td>' +
          items.map(i => {
            const q = stock[i.id] === undefined ? i.par : stock[i.id];
            const cls = q === 0 ? 'style="color:var(--danger);font-weight:650"' : q < i.par ? 'style="color:var(--warn);font-weight:650"' : '';
            return '<td class="num" ' + cls + '>' + q + '</td>';
          }).join('') +
          '<td class="num strong">' + (missing || '—') + '</td>' +
          '<td><div class="rowactions">' +
            (b ? '<button class="iconbtn iconbtn--bare" data-post="' + r.id + '" title="Post consumption" data-icon="plus"></button>' : '') +
            (missing ? '<button class="iconbtn iconbtn--bare" data-restock="' + r.id + '" title="Restock to par" data-icon="refresh"></button>' : '') +
          '</div></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     postings
     ============================================================ */

  function postingsPanel(postings) {
    const all = Store.state.minibarPostings.slice(0, 120);
    if (!all.length) return UI.empty({ icon: 'bottle', title: 'Nothing posted yet' });

    return '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>When</th><th>Room</th><th>Guest</th><th>Item</th><th class="num">Qty</th><th class="num">Amount</th><th>Posted by</th><th></th>' +
      '</tr></thead><tbody>' +
      all.map(p => {
        const room = Store.room(p.roomId);
        const item = Store.minibarItem(p.itemId);
        const b = Store.booking(p.bookingId);
        return '<tr' + (p.voided ? ' style="opacity:.5"' : '') + '>' +
          '<td class="nowrap small muted">' + U.esc(U.fmtDateTime(p.ts)) + '</td>' +
          '<td><span class="roomno">' + U.esc(room ? room.number : '—') + '</span></td>' +
          '<td>' + U.esc(b ? Store.guestName(b.guestId) : '—') + '</td>' +
          '<td>' + U.esc(item ? item.name : '—') + '</td>' +
          '<td class="num">' + p.qty + '</td>' +
          '<td class="num strong">' + U.esc(U.money(p.amount)) + '</td>' +
          '<td class="small muted">' + U.esc(p.postedBy || '—') + '</td>' +
          '<td>' + (p.voided
            ? '<span class="badge">voided</span>'
            : '<div class="rowactions"><button class="iconbtn iconbtn--bare" data-void="' + p.id + '" title="Void posting" data-icon="ban"></button></div>') + '</td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ============================================================
     products
     ============================================================ */

  function productsPanel(postings) {
    const items = Store.state.minibarItems;
    const today = U.today();
    const window30 = postings.filter(p => U.today(new Date(p.ts)) >= U.addDays(today, -29));

    const rows = items.map(i => {
      const sold = U.sum(window30.filter(p => p.itemId === i.id), p => p.qty);
      const revenue = U.sum(window30.filter(p => p.itemId === i.id), p => p.amount);
      const margin = i.price - (i.cost || 0);
      return { item: i, sold: sold, revenue: revenue, margin: margin };
    }).sort((a, b) => b.sold - a.sold);

    return '<div class="grid grid--main" style="gap:18px">' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
        '<th>Product</th><th class="num">Par</th><th class="num">Cost</th><th class="num">Price</th>' +
        '<th class="num">Margin</th><th class="num">Sold · 30d</th><th class="num">Revenue</th><th></th>' +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr>' +
        '<td class="strong">' + U.esc(r.item.name) + '</td>' +
        '<td class="num">' + r.item.par + '</td>' +
        '<td class="num muted">' + U.esc(U.money(r.item.cost || 0)) + '</td>' +
        '<td class="num">' + U.esc(U.money(r.item.price)) + '</td>' +
        '<td class="num">' + U.esc(U.money(r.margin)) + ' <span class="muted small">' +
          Math.round((r.margin / r.item.price) * 100) + '%</span></td>' +
        '<td class="num strong">' + r.sold + '</td>' +
        '<td class="num">' + U.esc(U.money(r.revenue, null, { decimals: 0 })) + '</td>' +
        '<td><div class="rowactions"><button class="iconbtn iconbtn--bare" data-itemedit="' + r.item.id + '" title="Edit" data-icon="edit"></button></div></td>' +
      '</tr>').join('') +
      '</tbody></table></div>' +

      '<div class="card"><div class="card__head"><div><h2>Units sold</h2><p>Last 30 days</p></div></div>' +
        '<div class="card__body"><div id="chMb"></div></div></div>' +
    '</div>';
  }

  /* ============================================================
     interactions
     ============================================================ */

  function wire(host) {
    UI.tabs(host, function (t) { tab = t; App.render(); });

    U.on(host, 'change', '#mbLow', function (e, el) { onlyBelowPar = el.checked; App.render(); });

    U.on(host, 'click', '#mbPost', () => openPost(null));
    U.on(host, 'click', '[data-post]', (e, el) => openPost(el.dataset.post));

    U.on(host, 'click', '[data-restock]', function (e, el) {
      const room = Store.room(el.dataset.restock);
      Store.update('minibar:restock', () => {
        Domain.restockMinibar(room.id);
        Store.log('Mini bar restocked in room ' + room.number, 'bottle', '#/minibar', 'service');
      });
      UI.toast('Restocked', 'Room ' + room.number + ' is back at par.', 'ok', 2400);
    });

    U.on(host, 'click', '#mbRestockAll', async function () {
      const occupied = new Set(Domain.inHouse().map(b => b.roomId));
      const targets = Store.state.rooms.filter(r => !occupied.has(r.id) && Domain.minibarNeedsRestock(r.id));
      if (!targets.length) { UI.toast('Nothing to do', 'Every vacant room is already at par.', 'info'); return; }

      const ok = await UI.confirm({
        title: 'Restock ' + targets.length + ' vacant room' + (targets.length === 1 ? '' : 's') + '?',
        message: 'Occupied rooms are skipped so live consumption is not wiped out.',
        confirmLabel: 'Restock'
      });
      if (!ok) return;

      Store.update('minibar:restockall', () => {
        targets.forEach(r => Domain.restockMinibar(r.id));
        Store.log(targets.length + ' vacant rooms restocked to par', 'bottle', '#/minibar', 'service');
      });
      UI.toast('Restocked', targets.length + ' rooms brought back to par.', 'ok');
    });

    U.on(host, 'click', '[data-void]', async function (e, el) {
      const p = Store.state.minibarPostings.find(x => x.id === el.dataset.void);
      const item = Store.minibarItem(p.itemId);
      const ok = await UI.confirm({
        title: 'Void this posting?',
        message: p.qty + '× ' + (item ? item.name : 'item') + ' will be removed from the folio and returned to stock.',
        confirmLabel: 'Void posting', tone: 'danger'
      });
      if (!ok) return;
      Store.update('minibar:void', () => Domain.voidMinibarPosting(p.id));
      UI.toast('Posting voided', U.money(p.amount) + ' removed from the folio.', 'ok');
    });

    U.on(host, 'click', '#mbNewItem', () => openItem(null));
    U.on(host, 'click', '[data-itemedit]', (e, el) => openItem(el.dataset.itemedit));

    // products chart
    const chart = host.querySelector('#chMb');
    if (chart) {
      const today = U.today();
      const postings = Store.state.minibarPostings.filter(p => !p.voided && U.today(new Date(p.ts)) >= U.addDays(today, -29));
      const items = Store.state.minibarItems.map(i => ({
        label: i.name.replace(/ \d+(ml|g)$/, ''),
        value: U.sum(postings.filter(p => p.itemId === i.id), p => p.qty)
      })).sort((a, b) => b.value - a.value).slice(0, 8);

      Charts.barsH(chart, {
        items: items.map((it, idx) => ({ label: it.label, value: it.value, color: idx === 0 ? 'var(--series-2)' : 'var(--series-1)' })),
        format: v => U.num(v),
        seriesName: 'Units',
        rowH: 30,
        caption: 'Mini bar units sold in the last 30 days'
      });
    }
  }

  /* ============================================================
     dialogs
     ============================================================ */

  function openPost(roomId) {
    const inHouse = Domain.inHouse();
    if (!inHouse.length) {
      UI.toast('Nobody in house', 'Mini bar consumption is posted to an in-house folio.', 'warn');
      return;
    }

    const items = Store.state.minibarItems;

    const m = UI.modal({
      title: 'Post mini bar consumption',
      subtitle: 'Charges go straight onto the guest folio',
      size: 'md',
      body:
        '<div class="formgrid" style="margin-bottom:12px">' +
          '<div class="field span2" style="grid-column:1/-1"><label for="mbRoom">Room</label>' +
            '<select class="select" id="mbRoom">' +
            inHouse.map(b => {
              const r = Store.room(b.roomId);
              return '<option value="' + b.roomId + '"' + (roomId === b.roomId ? ' selected' : '') + '>Room ' +
                U.esc(r ? r.number : '') + ' · ' + U.esc(Store.guestName(b.guestId)) + '</option>';
            }).join('') +
            '</select></div>' +
        '</div>' +
        '<div id="mbLines"></div>',
      footer: '<div class="row" style="font-weight:650">Total <span id="mbTotal" class="tnum" style="margin-left:8px">' + U.esc(U.money(0)) + '</span></div>' +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="mbGo">Post to folio</button>'
    });

    const roomSelect = m.el.querySelector('#mbRoom');

    function paintLines() {
      const stock = Domain.stockFor(roomSelect.value);
      m.el.querySelector('#mbLines').innerHTML = items.map(i => {
        const have = stock[i.id] === undefined ? i.par : stock[i.id];
        return '<div class="orderline"' + (have <= 0 ? ' style="opacity:.45"' : '') + '>' +
          '<div class="cellstack"><strong>' + U.esc(i.name) + '</strong>' +
          '<span>' + U.esc(U.money(i.price)) + ' · ' + have + ' of ' + i.par + ' in the fridge</span></div>' +
          '<div class="stepper">' +
            '<button type="button" data-step="-1" aria-label="Remove one">−</button>' +
            '<input type="number" value="0" min="0" max="' + have + '" data-mb="' + i.id + '" ' +
              (have <= 0 ? 'disabled ' : '') + 'aria-label="' + U.esc(i.name) + ' quantity">' +
            '<button type="button" data-step="1" aria-label="Add one">+</button>' +
          '</div>' +
        '</div>';
      }).join('');
      total();
    }

    function total() {
      let t = 0;
      U.$$('[data-mb]', m.el).forEach(inp => {
        const item = Store.minibarItem(inp.dataset.mb);
        t += (Number(inp.value) || 0) * (item ? item.price : 0);
      });
      m.el.querySelector('#mbTotal').textContent = U.money(t);
      return t;
    }

    roomSelect.addEventListener('change', paintLines);
    U.on(m.el, 'click', '[data-step]', function (e, el) {
      const input = el.parentElement.querySelector('input');
      if (input.disabled) return;
      input.value = U.clamp((Number(input.value) || 0) + Number(el.dataset.step), 0, Number(input.max) || 9);
      total();
    });
    U.on(m.el, 'input', '[data-mb]', total);

    paintLines();

    m.el.querySelector('#mbGo').addEventListener('click', function () {
      const lines = [];
      U.$$('[data-mb]', m.el).forEach(inp => {
        const qty = Number(inp.value) || 0;
        if (qty > 0) lines.push({ itemId: inp.dataset.mb, qty: qty });
      });
      if (!lines.length) { UI.toast('Nothing selected', 'Add at least one item.', 'warn'); return; }

      try {
        const room = Store.room(roomSelect.value);
        const res = Store.update('minibar:post', () => {
          const out = Domain.postMinibar(roomSelect.value, lines, 'Administrator');
          Store.log('Mini bar posted in room ' + room.number + ' · ' +
            U.money(U.sum(out.posted, p => p.amount)), 'bottle', '#/minibar', 'service');
          return out;
        });
        m.close();
        UI.toast('Posted to folio', 'Room ' + room.number + ' · ' +
          U.money(U.sum(res.posted, p => p.amount)), 'ok');
      } catch (e) {
        UI.toast('Could not post', e.message, 'error');
      }
    });
  }

  function openItem(itemId) {
    const item = itemId ? Store.minibarItem(itemId) : null;

    const m = UI.modal({
      title: item ? 'Edit ' + item.name : 'Add a mini bar product',
      size: 'sm',
      body: '<form id="miForm"><div class="formgrid">' +
        UI.field({ label: 'Name', name: 'name', value: item ? item.name : '', span2: true, required: true, autofocus: !item }) +
        UI.field({ label: 'Selling price', name: 'price', type: 'number', min: 0, step: '0.5', value: item ? item.price : 4 }) +
        UI.field({ label: 'Unit cost', name: 'cost', type: 'number', min: 0, step: '0.1', value: item ? (item.cost || 0) : 1 }) +
        UI.field({ label: 'Par level per room', name: 'par', type: 'number', min: 0, max: 12, value: item ? item.par : 2, span2: true, hint: 'How many are kept in every fridge' }) +
      '</div></form>',
      footer: (item ? '<button class="btn btn--danger btn--sm" id="miDelete"><span data-icon="trash"></span>Delete</button>' : '') +
        '<span class="spacer"></span><button class="btn" data-close>Cancel</button>' +
        '<button class="btn btn--primary" id="miSave">' + (item ? 'Save' : 'Add product') + '</button>'
    });

    m.el.querySelector('#miSave').addEventListener('click', function () {
      const form = m.el.querySelector('#miForm');
      const d = UI.formData(form);
      if (!d.name) { UI.setErrors(form, { name: 'A name is required.' }); return; }

      Store.update('minibar:item', function (s) {
        if (item) {
          Object.assign(item, { name: d.name, price: Number(d.price) || 0, cost: Number(d.cost) || 0, par: Number(d.par) || 0 });
        } else {
          const created = { id: U.uid('mb'), name: d.name, price: Number(d.price) || 0, cost: Number(d.cost) || 0, par: Number(d.par) || 0 };
          s.minibarItems.push(created);
          Object.keys(s.minibarStock).forEach(rid => { s.minibarStock[rid][created.id] = created.par; });
        }
      });

      m.close();
      UI.toast(item ? 'Product updated' : 'Product added', d.name, 'ok');
    });

    const del = m.el.querySelector('#miDelete');
    if (del) del.addEventListener('click', function () {
      Store.update('minibar:itemdelete', function (s) {
        s.minibarItems = s.minibarItems.filter(x => x.id !== item.id);
        Object.keys(s.minibarStock).forEach(rid => { delete s.minibarStock[rid][item.id]; });
      });
      m.close();
      UI.toast('Product removed', item.name, 'ok', 2200);
    });
  }

})(window);
