/* ============================================================
   HostOps — domain logic
   Availability, occupancy maths, folios, the check-in/out flow
   and the channel-manager sync engine all live here so views
   stay presentational.
   ============================================================ */
(function (global) {
  'use strict';

  const D = {};

  /** Statuses that actually hold a room. */
  const HOLDING = ['confirmed', 'in_house', 'checked_out'];
  D.HOLDING = HOLDING;

  D.holdsRoom = b => HOLDING.indexOf(b.status) > -1;

  /* ============================================================
     Availability
     ============================================================ */

  /** Bookings occupying `roomId` at any point in [from, to). */
  D.bookingsForRoom = function (roomId, from, to, excludeId) {
    return Store.state.bookings.filter(b =>
      b.roomId === roomId && b.id !== excludeId && D.holdsRoom(b) && U.overlaps(b.checkIn, b.checkOut, from, to)
    );
  };

  /** Is a room blocked for maintenance over any part of the window? */
  D.roomOutOfOrder = function (room, from, to) {
    if (room.status === 'ooo' && !room.oooFrom) return true;
    if (!room.oooFrom || !room.oooTo) return false;
    return U.overlaps(room.oooFrom, room.oooTo, from, to);
  };

  D.isRoomFree = function (roomId, from, to, excludeId) {
    const room = Store.room(roomId);
    if (!room || !room.active) return false;
    if (D.roomOutOfOrder(room, from, to)) return false;
    return D.bookingsForRoom(roomId, from, to, excludeId).length === 0;
  };

  /** Rooms bookable for the whole window, optionally filtered by type. */
  D.availableRooms = function (from, to, opts) {
    const o = opts || {};
    return Store.state.rooms.filter(r => {
      if (!r.active) return false;
      if (o.typeId && r.typeId !== o.typeId) return false;
      return D.isRoomFree(r.id, from, to, o.excludeBookingId);
    });
  };

  /** Bookings in house on a given date (half-open: departure day is free). */
  D.occupancyOn = function (date) {
    return Store.state.bookings.filter(b => D.holdsRoom(b) && b.checkIn <= date && date < b.checkOut);
  };

  D.sellableRoomsOn = function (date) {
    return Store.state.rooms.filter(r => {
      if (!r.active) return false;
      if (r.oooFrom && r.oooTo && r.oooFrom <= date && date < r.oooTo) return false;
      if (r.status === 'ooo' && !r.oooFrom) return false;
      return true;
    });
  };

  D.arrivals = function (date) {
    return Store.state.bookings
      .filter(b => b.checkIn === date && (b.status === 'confirmed' || b.status === 'in_house'))
      .sort((a, b) => U.cmp(roomNo(a), roomNo(b)));
  };

  D.departures = function (date) {
    return Store.state.bookings
      .filter(b => b.checkOut === date && (b.status === 'in_house' || b.status === 'checked_out'))
      .sort((a, b) => U.cmp(roomNo(a), roomNo(b)));
  };

  D.inHouse = function () {
    return Store.state.bookings
      .filter(b => b.status === 'in_house')
      .sort((a, b) => U.cmp(roomNo(a), roomNo(b)));
  };

  function roomNo(b) {
    const r = Store.room(b.roomId);
    return r ? r.number : 'zzz';
  }
  D.roomNo = roomNo;

  /* ============================================================
     Rates & money
     ============================================================ */

  /** Nightly rate for a type on a date: base + weekend uplift. */
  D.rateFor = function (typeId, date) {
    const t = Store.roomType(typeId);
    if (!t) return 0;
    let r = t.basePrice;
    if (U.isWeekend(date)) r *= 1.18;
    return Math.round(r);
  };

  /** Average nightly rate across a stay. */
  D.quote = function (typeId, from, to) {
    const nights = U.range(from, to);
    if (!nights.length) return 0;
    return Math.round(U.sum(nights, d => D.rateFor(typeId, d)) / nights.length);
  };

  D.folioTotals = function (bookingId) {
    const f = Store.folioFor(bookingId);
    const items = f ? f.items : [];
    const charges = U.round2(U.sum(items.filter(i => i.type !== 'payment'), i => i.amount));
    const payments = U.round2(-U.sum(items.filter(i => i.type === 'payment'), i => i.amount));
    const hotel = Store.state.hotel;
    const tax = U.round2(charges * (hotel.taxRate / 100));
    return {
      items: items,
      charges: charges,
      tax: tax,
      grossWithTax: U.round2(charges + tax),
      payments: payments,
      balance: U.round2(charges + tax - payments)
    };
  };

  D.postCharge = function (bookingId, item) {
    const f = Store.folioForOrCreate(bookingId);
    if (f.closed) throw new Error('This folio is already closed.');
    const entry = Object.assign({
      id: U.uid('fi'),
      ts: new Date().toISOString(),
      type: 'service',
      qty: 1
    }, item);
    entry.amount = U.round2(entry.amount !== undefined ? entry.amount : entry.qty * entry.unitPrice);
    f.items.push(entry);
    return entry;
  };

  D.postPayment = function (bookingId, amount, method) {
    const f = Store.folioForOrCreate(bookingId);
    const entry = {
      id: U.uid('fi'),
      ts: new Date().toISOString(),
      type: 'payment',
      desc: method || 'Payment',
      qty: 1,
      unitPrice: -Math.abs(amount),
      amount: -Math.abs(amount)
    };
    f.items.push(entry);
    return entry;
  };

  /* ============================================================
     Statistics
     ============================================================ */

  /** Occupancy / ADR / RevPAR for a single date. */
  D.statsFor = function (date) {
    const sellable = D.sellableRoomsOn(date).length;
    const occ = D.occupancyOn(date);
    const roomRevenue = U.sum(occ, b => b.rate);
    return {
      date: date,
      sellable: sellable,
      occupied: occ.length,
      occupancy: sellable ? (occ.length / sellable) * 100 : 0,
      roomRevenue: roomRevenue,
      adr: occ.length ? roomRevenue / occ.length : 0,
      revpar: sellable ? roomRevenue / sellable : 0
    };
  };

  /** A run of daily stats, `days` long, starting at `from`. */
  D.statsSeries = function (from, days) {
    const out = [];
    for (let i = 0; i < days; i++) out.push(D.statsFor(U.addDays(from, i)));
    return out;
  };

  /** Revenue actually posted to folios within [from, to]. */
  D.postedRevenue = function (from, to) {
    const buckets = { room: 0, fnb: 0, service: 0, minibar: 0, other: 0 };
    Store.state.folios.forEach(f => {
      f.items.forEach(i => {
        if (i.type === 'payment') return;
        const d = U.today(new Date(i.ts));
        if (d < from || d > to) return;
        if (buckets[i.type] === undefined) buckets.other += i.amount;
        else buckets[i.type] += i.amount;
      });
    });
    Object.keys(buckets).forEach(k => { buckets[k] = U.round2(buckets[k]); });
    buckets.total = U.round2(buckets.room + buckets.fnb + buckets.service + buckets.minibar + buckets.other);
    return buckets;
  };

  /** Room-nights and revenue split by channel over a window. */
  D.channelMix = function (from, to) {
    const mix = { direct: { nights: 0, revenue: 0, bookings: 0 }, booking: { nights: 0, revenue: 0, bookings: 0 }, airbnb: { nights: 0, revenue: 0, bookings: 0 } };
    Store.state.bookings.forEach(b => {
      if (!D.holdsRoom(b)) return;
      const m = mix[b.channel];
      if (!m) return;
      const nights = U.range(b.checkIn, b.checkOut).filter(d => d >= from && d <= to).length;
      if (!nights) return;
      m.nights += nights;
      m.revenue += nights * b.rate;
      m.bookings += 1;
    });
    Object.keys(mix).forEach(k => { mix[k].revenue = U.round2(mix[k].revenue); });
    return mix;
  };

  D.housekeepingSummary = function () {
    const counts = { clean: 0, inspected: 0, dirty: 0, cleaning: 0, ooo: 0 };
    Store.state.rooms.forEach(r => {
      if (counts[r.status] === undefined) counts[r.status] = 0;
      counts[r.status]++;
    });
    return counts;
  };

  /* ============================================================
     Booking lifecycle
     ============================================================ */

  D.validateBooking = function (data, excludeId) {
    const errors = {};
    if (!data.guestId && !(data.firstName && data.lastName)) errors.firstName = 'A guest name is required.';
    if (!data.checkIn) errors.checkIn = 'Pick an arrival date.';
    if (!data.checkOut) errors.checkOut = 'Pick a departure date.';
    if (data.checkIn && data.checkOut && data.checkOut <= data.checkIn) {
      errors.checkOut = 'Departure must be after arrival.';
    }
    if (!data.roomId) errors.roomId = 'Assign a room.';
    if (data.roomId && data.checkIn && data.checkOut && data.checkOut > data.checkIn) {
      if (!D.isRoomFree(data.roomId, data.checkIn, data.checkOut, excludeId)) {
        const room = Store.room(data.roomId);
        errors.roomId = 'Room ' + (room ? room.number : '') + ' is not free for those dates.';
      }
    }
    if (data.rate !== undefined && data.rate !== null && Number(data.rate) < 0) errors.rate = 'Rate cannot be negative.';
    return errors;
  };

  D.createBooking = function (data) {
    const room = Store.room(data.roomId);
    const booking = {
      id: U.uid('bk'),
      ref: nextRef(),
      guestId: data.guestId,
      roomId: data.roomId,
      typeId: room ? room.typeId : data.typeId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: Number(data.adults) || 1,
      children: Number(data.children) || 0,
      rate: Number(data.rate) || D.quote(room ? room.typeId : data.typeId, data.checkIn, data.checkOut),
      status: data.status || 'confirmed',
      channel: data.channel || 'direct',
      channelRef: data.channelRef || null,
      breakfast: !!data.breakfast,
      notes: data.notes || '',
      paymentStatus: data.paymentStatus || 'guaranteed',
      createdAt: new Date().toISOString(),
      checkedInAt: null,
      checkedOutAt: null
    };
    Store.state.bookings.push(booking);
    return booking;
  };

  function nextRef() {
    let max = 4800;
    Store.state.bookings.forEach(b => {
      const n = Number(String(b.ref || '').replace(/\D/g, ''));
      if (n > max) max = n;
    });
    return 'HO-' + (max + 1);
  }
  D.nextRef = nextRef;

  /** Move a booking to another room, validating the new slot. */
  D.moveBooking = function (bookingId, roomId) {
    const b = Store.booking(bookingId);
    if (!b) throw new Error('Reservation not found.');
    if (!D.isRoomFree(roomId, b.checkIn, b.checkOut, b.id)) {
      const r = Store.room(roomId);
      throw new Error('Room ' + (r ? r.number : '') + ' is occupied for those dates.');
    }
    const room = Store.room(roomId);
    b.roomId = roomId;
    b.typeId = room.typeId;
    return b;
  };

  D.checkIn = function (bookingId) {
    const b = Store.booking(bookingId);
    if (!b) throw new Error('Reservation not found.');
    if (b.status === 'in_house') throw new Error('This guest is already checked in.');
    if (b.status !== 'confirmed') throw new Error('Only confirmed reservations can be checked in.');

    const room = Store.room(b.roomId);
    if (room && room.status === 'ooo') throw new Error('Room ' + room.number + ' is out of order.');

    b.status = 'in_house';
    b.checkedInAt = new Date().toISOString();

    // open the folio and post the accommodation for tonight
    const f = Store.folioForOrCreate(b.id);
    if (!f.items.some(i => i.type === 'room')) {
      f.items.push({
        id: U.uid('fi'), ts: new Date().toISOString(), type: 'room',
        desc: 'Room charge · ' + U.fmtDate(b.checkIn), qty: 1, unitPrice: b.rate, amount: b.rate
      });
      if (b.breakfast) {
        const p = Store.state.hotel.breakfastPrice;
        f.items.push({
          id: U.uid('fi'), ts: new Date().toISOString(), type: 'fnb',
          desc: 'Breakfast · ' + U.fmtDate(b.checkIn), qty: b.adults, unitPrice: p, amount: U.round2(b.adults * p)
        });
      }
    }

    if (room) room.status = 'clean';
    return b;
  };

  D.checkOut = function (bookingId, opts) {
    const o = opts || {};
    const b = Store.booking(bookingId);
    if (!b) throw new Error('Reservation not found.');
    if (b.status !== 'in_house') throw new Error('Only in-house guests can be checked out.');

    const totals = D.folioTotals(b.id);
    if (totals.balance > 0.01 && !o.settle && !o.allowOpenBalance) {
      const err = new Error('Outstanding balance of ' + U.money(totals.balance) + '.');
      err.code = 'BALANCE';
      err.balance = totals.balance;
      throw err;
    }
    if (o.settle && totals.balance > 0.01) {
      D.postPayment(b.id, totals.balance, o.method || 'Card ••4821');
    }

    b.status = 'checked_out';
    b.checkedOutAt = new Date().toISOString();
    b.paymentStatus = 'paid';

    const f = Store.folioForOrCreate(b.id);
    f.closed = true;
    f.closedAt = b.checkedOutAt;

    // the room becomes a departure clean
    const room = Store.room(b.roomId);
    if (room && room.status !== 'ooo') {
      room.status = 'dirty';
      const today = U.today();
      const exists = Store.state.hkTasks.some(t => t.roomId === room.id && t.date === today && t.status !== 'done');
      if (!exists) {
        Store.state.hkTasks.push({
          id: U.uid('hk'), roomId: room.id, date: today, type: 'departure',
          assignee: null, status: 'pending', priority: 'high',
          notes: 'Auto-created on check-out', minutes: 45,
          startedAt: null, completedAt: null
        });
      }
    }

    // reset the mini bar to par for the next guest
    D.restockMinibar(b.roomId);
    return b;
  };

  D.cancelBooking = function (bookingId, reason) {
    const b = Store.booking(bookingId);
    if (!b) throw new Error('Reservation not found.');
    if (b.status === 'in_house') throw new Error('Check the guest out before cancelling.');
    b.status = 'cancelled';
    b.cancelledAt = new Date().toISOString();
    b.cancelReason = reason || '';
    return b;
  };

  /* ============================================================
     Mini bar
     ============================================================ */

  D.stockFor = function (roomId) {
    if (!Store.state.minibarStock[roomId]) {
      const s = {};
      Store.state.minibarItems.forEach(i => { s[i.id] = i.par; });
      Store.state.minibarStock[roomId] = s;
    }
    return Store.state.minibarStock[roomId];
  };

  /** Post consumption to the in-house folio and decrement stock. */
  D.postMinibar = function (roomId, lines, postedBy) {
    const booking = Store.state.bookings.find(b => b.roomId === roomId && b.status === 'in_house');
    if (!booking) throw new Error('No guest is currently in this room.');
    const stock = D.stockFor(roomId);
    const posted = [];

    lines.forEach(l => {
      if (!l.qty) return;
      const item = Store.minibarItem(l.itemId);
      if (!item) return;
      const qty = Math.min(l.qty, stock[l.itemId] === undefined ? item.par : stock[l.itemId]);
      if (qty <= 0) return;
      stock[l.itemId] = (stock[l.itemId] || 0) - qty;

      const p = {
        id: U.uid('mbp'), roomId: roomId, bookingId: booking.id, itemId: item.id,
        qty: qty, amount: U.round2(qty * item.price),
        ts: new Date().toISOString(), postedBy: postedBy || 'Administrator', voided: false
      };
      Store.state.minibarPostings.unshift(p);
      D.postCharge(booking.id, {
        type: 'minibar', desc: 'Mini bar · ' + item.name,
        qty: qty, unitPrice: item.price, amount: p.amount, sourceId: p.id
      });
      posted.push(p);
    });

    return { booking: booking, posted: posted };
  };

  D.voidMinibarPosting = function (postingId) {
    const p = Store.state.minibarPostings.find(x => x.id === postingId);
    if (!p || p.voided) return null;
    p.voided = true;
    const stock = D.stockFor(p.roomId);
    stock[p.itemId] = (stock[p.itemId] || 0) + p.qty;
    const f = Store.folioFor(p.bookingId);
    if (f && !f.closed) {
      const idx = f.items.findIndex(i => i.sourceId === p.id);
      if (idx > -1) f.items.splice(idx, 1);
    }
    return p;
  };

  D.restockMinibar = function (roomId) {
    const s = {};
    Store.state.minibarItems.forEach(i => { s[i.id] = i.par; });
    Store.state.minibarStock[roomId] = s;
    return s;
  };

  D.minibarNeedsRestock = function (roomId) {
    const stock = D.stockFor(roomId);
    return Store.state.minibarItems.some(i => (stock[i.id] || 0) < i.par);
  };

  /* ============================================================
     Room service
     ============================================================ */

  D.orderTotal = function (order) {
    return U.round2(U.sum(order.items, l => {
      const m = Store.menuItem(l.menuId);
      return m ? m.price * l.qty : 0;
    }));
  };

  D.createOrder = function (data) {
    const booking = Store.state.bookings.find(b => b.roomId === data.roomId && b.status === 'in_house');
    const order = {
      id: U.uid('ord'),
      ref: 'RS-' + (2000 + Store.state.orders.length + 1),
      roomId: data.roomId,
      bookingId: booking ? booking.id : null,
      items: data.items,
      status: 'new',
      placedAt: new Date().toISOString(),
      deliveredAt: null,
      assignee: data.assignee || null,
      notes: data.notes || '',
      postedToFolio: false,
      total: 0
    };
    order.total = D.orderTotal(order);
    Store.state.orders.unshift(order);
    return order;
  };

  /** Advance an order; delivering it posts the lines to the folio. */
  D.setOrderStatus = function (orderId, status, assignee) {
    const o = Store.order(orderId);
    if (!o) throw new Error('Order not found.');
    o.status = status;
    if (assignee !== undefined) o.assignee = assignee;

    if (status === 'delivered') {
      o.deliveredAt = new Date().toISOString();
      if (!o.postedToFolio && o.bookingId) {
        const f = Store.folioFor(o.bookingId);
        if (f && !f.closed) {
          o.items.forEach(l => {
            const m = Store.menuItem(l.menuId);
            if (!m) return;
            D.postCharge(o.bookingId, {
              type: 'service', desc: 'Room service · ' + m.name,
              qty: l.qty, unitPrice: m.price, amount: U.round2(l.qty * m.price), sourceId: o.id
            });
          });
          o.postedToFolio = true;
        }
      }
    }
    return o;
  };

  /* ============================================================
     Housekeeping
     ============================================================ */

  D.setRoomStatus = function (roomId, status) {
    const room = Store.room(roomId);
    if (!room) return null;
    room.status = status;
    return room;
  };

  D.setTaskStatus = function (taskId, status) {
    const t = Store.state.hkTasks.find(x => x.id === taskId);
    if (!t) return null;
    t.status = status;
    if (status === 'in_progress' && !t.startedAt) t.startedAt = new Date().toISOString();
    if (status === 'done') t.completedAt = new Date().toISOString();

    const room = Store.room(t.roomId);
    if (room && room.status !== 'ooo') {
      room.status = status === 'done' ? 'clean' : status === 'in_progress' ? 'cleaning' : 'dirty';
    }
    return t;
  };

  /** Build today's board from arrivals/departures/stayovers. */
  D.generateHousekeeping = function (date) {
    const d = date || U.today();
    let made = 0;
    Store.state.rooms.forEach(room => {
      if (room.status === 'ooo') return;
      if (Store.state.hkTasks.some(t => t.roomId === room.id && t.date === d)) return;

      const departing = Store.state.bookings.some(b => b.roomId === room.id && b.checkOut === d && D.holdsRoom(b));
      const staying = Store.state.bookings.some(b => b.roomId === room.id && b.checkIn < d && b.checkOut > d && D.holdsRoom(b));
      if (!departing && !staying) return;

      Store.state.hkTasks.push({
        id: U.uid('hk'), roomId: room.id, date: d,
        type: departing ? 'departure' : 'stayover',
        assignee: null, status: 'pending',
        priority: departing ? 'high' : 'normal',
        notes: '', minutes: departing ? 45 : 20,
        startedAt: null, completedAt: null
      });
      made++;
    });
    return made;
  };

  /* ============================================================
     Channel manager — simulated two-way sync
     ============================================================ */

  const CHANNEL_NAMES = { booking: 'Booking.com', airbnb: 'Airbnb' };

  /**
   * Runs one sync cycle for a channel:
   *   push availability + rates  →  pull new/modified reservations
   * Returns a summary the UI can report.
   */
  D.syncChannel = function (channelId) {
    const ch = Store.channel(channelId);
    if (!ch) throw new Error('Unknown channel.');
    if (!ch.connected) throw new Error(CHANNEL_NAMES[channelId] + ' is not connected.');

    const name = CHANNEL_NAMES[channelId] || channelId;
    const today = U.today();
    const horizon = 30;
    const rnd = Math.random;
    const summary = { channel: channelId, pulled: 0, modified: 0, cancelled: 0, pushedDays: horizon, errors: 0 };

    if (ch.pushAvailability) {
      Store.logSync(channelId, 'ok', 'Pushed availability for ' + horizon + ' days · ' +
        Store.state.roomTypes.length + ' room types', 'out');
    }
    if (ch.pushRates) {
      Store.logSync(channelId, 'ok', 'Pushed rates for ' + horizon + ' days · ' +
        Store.state.roomTypes.length + ' room types', 'out');
    }

    if (ch.pullReservations) {
      const incoming = Math.random() < 0.25 ? 0 : 1 + Math.floor(rnd() * 2);
      for (let i = 0; i < incoming; i++) {
        const made = importReservation(channelId, rnd);
        if (made) summary.pulled++;
      }

      // occasionally an existing OTA booking is modified or cancelled upstream
      const otaBookings = Store.state.bookings.filter(b =>
        b.channel === channelId && b.status === 'confirmed' && b.checkIn > today);

      if (otaBookings.length && rnd() < 0.3) {
        const b = otaBookings[Math.floor(rnd() * otaBookings.length)];
        if (rnd() < 0.5) {
          b.status = 'cancelled';
          b.cancelledAt = new Date().toISOString();
          b.cancelReason = 'Cancelled by guest on ' + name;
          summary.cancelled++;
          Store.logSync(channelId, 'warn', 'Reservation ' + b.ref + ' cancelled by the guest', 'in');
          Store.log(name + ' cancellation · ' + b.ref + ' · room ' + roomNo(b), 'x-circle', '#/bookings', 'sync');
        } else {
          const extra = 1;
          const newOut = U.addDays(b.checkOut, extra);
          if (D.isRoomFree(b.roomId, b.checkIn, newOut, b.id)) {
            b.checkOut = newOut;
            summary.modified++;
            Store.logSync(channelId, 'ok', 'Reservation ' + b.ref + ' extended by ' + extra + ' night', 'in');
            Store.log(name + ' modification · ' + b.ref + ' extended to ' + U.fmtDate(newOut), 'edit', '#/bookings', 'sync');
          }
        }
      }

      if (summary.pulled) {
        Store.logSync(channelId, 'ok', 'Pulled ' + summary.pulled + ' new reservation' +
          (summary.pulled === 1 ? '' : 's') + ' · 0 errors', 'in');
      } else if (!summary.modified && !summary.cancelled) {
        Store.logSync(channelId, 'ok', 'No new reservations · property up to date', 'in');
      }
    }

    ch.lastSync = new Date().toISOString();
    ch.health = 'ok';
    return summary;
  };

  /** Fabricate a plausible OTA reservation and slot it into a free room. */
  function importReservation(channelId, rnd) {
    const today = U.today();
    const leadDays = 2 + Math.floor(rnd() * 40);
    const checkIn = U.addDays(today, leadDays);
    const nights = 1 + Math.floor(rnd() * 4);
    const checkOut = U.addDays(checkIn, nights);

    const free = D.availableRooms(checkIn, checkOut);
    if (!free.length) {
      Store.logSync(channelId, 'warn', 'Incoming reservation rejected — no availability for ' +
        U.fmtDate(checkIn) + ' (' + nights + 'n)', 'in');
      return null;
    }
    const room = free[Math.floor(rnd() * free.length)];

    // reuse a returning guest sometimes, otherwise invent one
    let guest;
    if (rnd() < 0.2 && Store.state.guests.length) {
      guest = Store.state.guests[Math.floor(rnd() * Store.state.guests.length)];
    } else {
      const first = pickFrom(rnd, ['Nina', 'Oscar', 'Leila', 'Bruno', 'Sanne', 'Kai', 'Vera', 'Tomasz', 'Mira', 'Aleks', 'Dana', 'Ilias']);
      const last = pickFrom(rnd, ['Sørensen', 'Lombardi', 'Neumann', 'Vidal', 'Karlsson', 'Dupont', 'Rahman', 'Popescu', 'Berger', 'Ferrari']);
      guest = {
        id: U.uid('g'),
        firstName: first, lastName: last,
        email: (first + '.' + last).toLowerCase().normalize('NFD').replace(/[^a-z.]/g, '') + '@guest.example',
        phone: '+' + (30 + Math.floor(rnd() * 20)) + ' ' + (600 + Math.floor(rnd() * 199)) + ' ' + (100000 + Math.floor(rnd() * 899999)),
        country: pickFrom(rnd, Seed.COUNTRIES),
        vip: false, docType: 'Passport', docId: '', notes: '', prefs: '',
        marketingOptIn: false,
        createdAt: new Date().toISOString()
      };
      Store.state.guests.push(guest);
    }

    const ch = Store.channel(channelId);
    const rate = D.quote(room.typeId, checkIn, checkOut);
    const b = D.createBooking({
      guestId: guest.id,
      roomId: room.id,
      checkIn: checkIn,
      checkOut: checkOut,
      adults: 1 + Math.floor(rnd() * 2),
      children: 0,
      rate: rate,
      channel: channelId,
      channelRef: channelId === 'booking'
        ? 'BDC-' + (3000000 + Math.floor(rnd() * 999999))
        : 'HM' + pickFrom(rnd, ['A', 'B', 'C', 'D']) + (10000 + Math.floor(rnd() * 89999)),
      breakfast: rnd() < 0.4,
      paymentStatus: rnd() < 0.6 ? 'prepaid' : 'guaranteed',
      notes: 'Imported from ' + (CHANNEL_NAMES[channelId] || channelId) +
        ' · commission ' + (ch ? ch.commissionPct : 0) + '%'
    });

    Store.log('New ' + (CHANNEL_NAMES[channelId] || channelId) + ' reservation ' + b.ref + ' · room ' + room.number,
      'link', '#/bookings', 'sync');
    return b;
  }

  function pickFrom(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

  /** Sync every connected channel. */
  D.syncAll = function () {
    const results = [];
    Store.state.channels.forEach(c => {
      if (!c.connected) return;
      try { results.push(D.syncChannel(c.id)); }
      catch (e) {
        c.health = 'error';
        Store.logSync(c.id, 'error', e.message, 'out');
        results.push({ channel: c.id, error: e.message });
      }
    });
    return results;
  };

  /** Rate-parity check across channels, surfaced on the channel screen. */
  D.parityIssues = function () {
    const issues = [];
    const today = U.today();
    Store.state.roomTypes.forEach(t => {
      const direct = D.rateFor(t.id, today);
      Store.state.channels.forEach(c => {
        if (!c.connected) return;
        // OTA net rate after commission — flags where the channel undercuts direct
        const net = Math.round(direct * (1 - c.commissionPct / 100));
        if (net < direct * 0.88) {
          issues.push({
            typeId: t.id, typeName: t.name, channel: c.id,
            direct: direct, net: net,
            gap: Math.round(((direct - net) / direct) * 100)
          });
        }
      });
    });
    return issues;
  };

  /* ============================================================
     Public booking engine — what the guest site sells
     ============================================================ */

  /**
   * Availability by room *type* (what a guest shops for), not by room.
   * Returns one row per type with free-room count and the price for the stay.
   */
  D.searchAvailability = function (from, to, guests, opts) {
    const o = opts || {};
    const people = Math.max(1, Number(guests) || 1);
    const nights = U.nights(from, to);

    return Store.state.roomTypes.map(t => {
      const free = D.availableRooms(from, to, { typeId: t.id });
      const nightly = D.quote(t.id, from, to);
      const perNight = U.range(from, to).map(d => ({ date: d, rate: D.rateFor(t.id, d) }));
      return {
        type: t,
        available: free.length,
        rooms: free,
        fits: t.capacity >= people,
        nightly: nightly,
        nights: nights,
        total: U.sum(perNight, p => p.rate),
        perNight: perNight
      };
    }).filter(row => {
      if (!o.includeUnavailable && row.available === 0) return false;
      if (!o.includeTooSmall && !row.fits) return false;
      return true;
    });
  };

  /** Cheapest nightly rate on offer for a stay — used for "from €X" copy. */
  D.priceFrom = function (from, to, guests) {
    const rows = D.searchAvailability(from, to, guests);
    if (!rows.length) return null;
    return Math.min.apply(null, rows.map(r => r.nightly));
  };

  /** The next date range with something free, when the requested one is full. */
  D.nextAvailableFrom = function (from, nights, guests) {
    for (let i = 1; i <= 60; i++) {
      const start = U.addDays(from, i);
      const end = U.addDays(start, nights);
      if (D.searchAvailability(start, end, guests).length) return { from: start, to: end };
    }
    return null;
  };

  /* ---------------- dining ---------------- */

  D.restaurant = id => (Store.state.restaurants || []).find(r => r.id === id) || null;

  D.restaurantOpenOn = function (restaurant, date) {
    if (!restaurant) return false;
    return (restaurant.closedDays || []).indexOf(U.parse(date).getDay()) === -1;
  };

  /** Seats already committed for a restaurant on a date/time. */
  D.seatsTaken = function (restaurantId, date, time) {
    return U.sum(
      (Store.state.diningReservations || []).filter(r =>
        r.restaurantId === restaurantId && r.date === date && r.time === time && r.status !== 'cancelled'),
      r => r.party);
  };

  /** The next date this restaurant is actually open, so a closed day is never a dead end. */
  D.nextRestaurantDate = function (restaurantId, from, within) {
    const r = D.restaurant(restaurantId);
    if (!r) return null;
    let d = U.addDays(from || U.today(), 1);
    for (let i = 0; i < (within || 14); i++) {
      if (D.restaurantOpenOn(r, d)) return d;
      d = U.addDays(d, 1);
    }
    return null;
  };

  /** Every slot for a date with the seats left in each. */
  D.diningAvailability = function (restaurantId, date, party) {
    const r = D.restaurant(restaurantId);
    if (!r || !D.restaurantOpenOn(r, date)) return [];
    const need = Math.max(1, Number(party) || 2);
    return r.slots.map(time => {
      const left = r.seatsPerSlot - D.seatsTaken(restaurantId, date, time);
      return { time: time, left: Math.max(0, left), canSeat: left >= need };
    });
  };

  D.bookTable = function (data) {
    const r = D.restaurant(data.restaurantId);
    if (!r) throw new Error('That restaurant is not on our list.');
    if (!D.restaurantOpenOn(r, data.date)) {
      throw new Error(r.name + ' is closed on ' + U.dow(data.date) + 's.');
    }
    const party = Math.max(1, Number(data.party) || 2);
    const left = r.seatsPerSlot - D.seatsTaken(r.id, data.date, data.time);
    if (left < party) {
      throw new Error(left > 0
        ? 'Only ' + left + ' seat' + (left === 1 ? '' : 's') + ' left at ' + data.time + '.'
        : 'That sitting is fully booked.');
    }

    const res = {
      id: U.uid('dr'),
      restaurantId: r.id,
      bookingId: data.bookingId || null,
      guestId: data.guestId || null,
      guestName: data.guestName || null,
      email: data.email || null,
      phone: data.phone || null,
      date: data.date,
      time: data.time,
      party: party,
      notes: data.notes || '',
      status: 'confirmed',
      source: data.source || 'site',
      createdAt: new Date().toISOString()
    };
    Store.state.diningReservations.unshift(res);
    return res;
  };

  /* ---------------- spa ---------------- */

  D.treatment = id => ((Store.state.spa || {}).treatments || []).find(t => t.id === id) || null;

  D.spaSlotsTaken = function (date, time) {
    return (Store.state.spaBookings || []).filter(b =>
      b.date === date && b.time === time && b.status !== 'cancelled').length;
  };

  D.spaAvailability = function (date) {
    const spa = Store.state.spa;
    if (!spa) return [];
    return spa.slots.map(time => {
      const left = spa.roomsAvailable - D.spaSlotsTaken(date, time);
      return { time: time, left: Math.max(0, left), canBook: left > 0 };
    });
  };

  D.bookTreatment = function (data) {
    const t = D.treatment(data.treatmentId);
    if (!t) throw new Error('That treatment is not on our menu.');
    const left = Store.state.spa.roomsAvailable - D.spaSlotsTaken(data.date, data.time);
    if (left <= 0) throw new Error('Every treatment room is taken at ' + data.time + '.');

    const res = {
      id: U.uid('sb'),
      treatmentId: t.id,
      bookingId: data.bookingId || null,
      guestId: data.guestId || null,
      guestName: data.guestName || null,
      email: data.email || null,
      phone: data.phone || null,
      date: data.date,
      time: data.time,
      guests: t.category === 'Couples' ? 2 : (Number(data.guests) || 1),
      notes: data.notes || '',
      status: 'confirmed',
      source: data.source || 'site',
      createdAt: new Date().toISOString()
    };
    Store.state.spaBookings.unshift(res);
    return res;
  };

  /* ---------------- experiences ---------------- */

  D.experience = id => (Store.state.experiences || []).find(e => e.id === id) || null;

  D.experienceRunsOn = function (exp, date) {
    return !!exp && exp.days.indexOf(U.parse(date).getDay()) > -1;
  };

  D.experienceTaken = function (experienceId, date) {
    return U.sum(
      (Store.state.experienceBookings || []).filter(b =>
        b.experienceId === experienceId && b.date === date && b.status !== 'cancelled'),
      b => b.people);
  };

  D.experiencePlacesLeft = function (experienceId, date) {
    const e = D.experience(experienceId);
    if (!e || !D.experienceRunsOn(e, date)) return 0;
    return Math.max(0, e.capacity - D.experienceTaken(experienceId, date));
  };

  /** The next `count` dates this experience actually runs, with places left. */
  D.experienceDates = function (experienceId, from, count) {
    const e = D.experience(experienceId);
    if (!e) return [];
    const out = [];
    let d = from || U.today();
    for (let i = 0; i < 60 && out.length < (count || 6); i++) {
      if (D.experienceRunsOn(e, d)) {
        out.push({ date: d, left: D.experiencePlacesLeft(experienceId, d) });
      }
      d = U.addDays(d, 1);
    }
    return out;
  };

  D.bookExperience = function (data) {
    const e = D.experience(data.experienceId);
    if (!e) throw new Error('That experience is not running.');
    if (!D.experienceRunsOn(e, data.date)) {
      throw new Error(e.name + ' does not run on ' + U.dow(data.date) + 's.');
    }
    const people = Math.max(1, Number(data.people) || 1);
    const left = D.experiencePlacesLeft(e.id, data.date);
    if (left < people) {
      throw new Error(left > 0
        ? 'Only ' + left + ' place' + (left === 1 ? '' : 's') + ' left on that date.'
        : 'That date is fully booked.');
    }

    const res = {
      id: U.uid('eb'),
      experienceId: e.id,
      bookingId: data.bookingId || null,
      guestId: data.guestId || null,
      guestName: data.guestName || null,
      email: data.email || null,
      phone: data.phone || null,
      date: data.date,
      people: people,
      notes: data.notes || '',
      status: 'confirmed',
      source: data.source || 'site',
      createdAt: new Date().toISOString()
    };
    Store.state.experienceBookings.unshift(res);
    return res;
  };

  /* ---------------- everything attached to one stay ---------------- */

  D.servicesForBooking = function (bookingId) {
    return {
      dining: (Store.state.diningReservations || []).filter(r => r.bookingId === bookingId && r.status !== 'cancelled'),
      spa: (Store.state.spaBookings || []).filter(r => r.bookingId === bookingId && r.status !== 'cancelled'),
      experiences: (Store.state.experienceBookings || []).filter(r => r.bookingId === bookingId && r.status !== 'cancelled')
    };
  };

  D.cancelService = function (kind, id) {
    const map = { dining: 'diningReservations', spa: 'spaBookings', experience: 'experienceBookings' };
    const list = Store.state[map[kind]];
    if (!list) return null;
    const r = list.find(x => x.id === id);
    if (r) { r.status = 'cancelled'; r.cancelledAt = new Date().toISOString(); }
    return r;
  };

  /** Guest-name resolution that works for both in-house guests and walk-ins. */
  D.serviceGuestName = function (res) {
    if (res.guestId) {
      const g = Store.guest(res.guestId);
      if (g) return g.firstName + ' ' + g.lastName;
    }
    return res.guestName || 'Guest';
  };

  /* ============================================================
     Reservation lookup for the public "manage my booking" screen
     ============================================================ */

  D.findByReference = function (ref, surname) {
    const r = String(ref || '').trim().toUpperCase();
    const s = String(surname || '').trim().toLowerCase();
    if (!r || !s) return null;
    return Store.state.bookings.find(b => {
      if (String(b.ref).toUpperCase() !== r) return false;
      const g = Store.guest(b.guestId);
      return g && g.lastName.toLowerCase() === s;
    }) || null;
  };

  global.Domain = D;
})(window);
