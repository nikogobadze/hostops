/* ============================================================
   HostOps — demo property generator
   Deterministic (seeded RNG) so the dashboard looks the same on
   every fresh install, but dates are always relative to "today".
   ============================================================ */
(function (global) {
  'use strict';

  const FIRST = ['Emma', 'Liam', 'Sofia', 'Noah', 'Elena', 'Lucas', 'Marta', 'Hugo', 'Anna', 'Mateo',
    'Chiara', 'Felix', 'Ines', 'Jonas', 'Clara', 'Tomas', 'Nora', 'Viktor', 'Alice', 'Sander',
    'Yuki', 'Rahul', 'Amara', 'Diego', 'Freya', 'Omar', 'Lina', 'Pieter', 'Sara', 'Gabriel',
    'Maja', 'Andres', 'Isabel', 'Kwame', 'Julia', 'Marco', 'Ayla', 'Henrik', 'Rosa', 'Daniel',
    'Camille', 'Stefan', 'Priya', 'Lars', 'Bianca', 'Ivan', 'Talia', 'Ruben', 'Greta', 'Milan'];

  const LAST = ['Bergström', 'Novak', 'Rossi', 'Fernández', 'Kowalski', 'Ahmed', 'Dubois', 'Silva',
    'Müller', 'Jansen', 'Okafor', 'Lindqvist', 'Moretti', 'Costa', 'Haddad', 'Petrov', 'Nakamura',
    'Weber', 'Álvarez', 'O\'Brien', 'Sørensen', 'Bakker', 'Marchetti', 'Halvorsen', 'Duarte',
    'Krause', 'Ferreira', 'Vasquez', 'Larsen', 'Brandt', 'Iversen', 'Moreau', 'Kaur', 'Schmitt',
    'Delgado', 'Andersson', 'Riva', 'Voss', 'Blanco', 'Nilsen'];

  const COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'GB', 'US', 'PL', 'DK', 'NO', 'PT', 'BE', 'CH', 'AT', 'IE', 'CZ', 'JP'];

  const HK_STAFF = ['Marisol Vega', 'Dario Petrov', 'Anouk Meijer', 'Teodora Ilić', 'Samir Haddad'];
  const FB_STAFF = ['Nico Bassi', 'Elise Fontaine', 'Ravi Menon'];

  const AMENITY_POOL = ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Nespresso', 'Safe', 'Rain shower',
    'Balcony', 'Sea view', 'Bathtub', 'Desk', 'Blackout blinds', 'Sofa bed'];

  /* -------------------------------------------------- */

  function buildRoomTypes() {
    const copy = global.Offerings ? Offerings.roomCopy() : {};
    return attachCopy([
      { id: 'rt_std', code: 'STD', name: 'Standard Double', basePrice: 118, capacity: 2, beds: '1 double', size: 22, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Safe', 'Desk'] },
      { id: 'rt_twn', code: 'TWN', name: 'Superior Twin', basePrice: 134, capacity: 2, beds: '2 singles', size: 26, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Safe', 'Rain shower', 'Desk'] },
      { id: 'rt_dlx', code: 'DLX', name: 'Deluxe King', basePrice: 172, capacity: 2, beds: '1 king', size: 32, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Nespresso', 'Safe', 'Rain shower', 'Balcony'] },
      { id: 'rt_jrs', code: 'JRS', name: 'Junior Suite', basePrice: 236, capacity: 3, beds: '1 king + sofa bed', size: 44, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Nespresso', 'Safe', 'Bathtub', 'Balcony', 'Sofa bed'] },
      { id: 'rt_fam', code: 'FAM', name: 'Family Room', basePrice: 205, capacity: 4, beds: '1 double + 2 singles', size: 40, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Safe', 'Bathtub', 'Sofa bed'] },
      { id: 'rt_pen', code: 'PEN', name: 'Penthouse Suite', basePrice: 415, capacity: 4, beds: '1 king + 1 double', size: 78, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Nespresso', 'Safe', 'Bathtub', 'Rain shower', 'Balcony', 'Sea view'] }
    ], copy);

    /** Fold the guest-facing blurb, artwork key and highlights onto each type. */
    function attachCopy(types, copyMap) {
      types.forEach(t => {
        const c = copyMap[t.code];
        if (!c) return;
        t.art = c.art;
        t.view = c.view;
        t.blurb = c.blurb;
        t.highlights = c.highlights;
      });
      return types;
    }
  }

  function buildRooms(rnd) {
    // floor 1–3: 8 rooms each · floor 4: 6 rooms incl. the suites
    const layout = [
      { floor: 1, count: 8, mix: ['rt_std', 'rt_std', 'rt_std', 'rt_twn', 'rt_twn', 'rt_std', 'rt_fam', 'rt_twn'] },
      { floor: 2, count: 8, mix: ['rt_std', 'rt_twn', 'rt_dlx', 'rt_dlx', 'rt_std', 'rt_twn', 'rt_fam', 'rt_dlx'] },
      { floor: 3, count: 8, mix: ['rt_dlx', 'rt_dlx', 'rt_twn', 'rt_jrs', 'rt_jrs', 'rt_dlx', 'rt_fam', 'rt_dlx'] },
      { floor: 4, count: 6, mix: ['rt_jrs', 'rt_jrs', 'rt_dlx', 'rt_pen', 'rt_pen', 'rt_jrs'] }
    ];
    const rooms = [];
    layout.forEach(fl => {
      for (let i = 0; i < fl.count; i++) {
        const number = String(fl.floor * 100 + i + 1);
        rooms.push({
          id: 'room_' + number,
          number: number,
          floor: fl.floor,
          typeId: fl.mix[i],
          status: 'clean',
          notes: '',
          active: true,
          oooFrom: null,
          oooTo: null,
          oooReason: ''
        });
      }
    });
    // one room out of order for maintenance, to exercise the OOO path
    const ooo = rooms.find(r => r.number === '206');
    if (ooo) {
      ooo.status = 'ooo';
      ooo.oooFrom = U.addDays(U.today(), -2);
      ooo.oooTo = U.addDays(U.today(), 4);
      ooo.oooReason = 'Bathroom re-grouting';
    }
    return rooms;
  }

  function buildGuests(rnd, n) {
    const guests = [];
    const used = new Set();
    for (let i = 0; i < n; i++) {
      let first, last, key, guard = 0;
      do {
        first = U.pick(rnd, FIRST);
        last = U.pick(rnd, LAST);
        key = first + last;
      } while (used.has(key) && guard++ < 50);
      used.add(key);
      const country = U.pick(rnd, COUNTRIES);
      guests.push({
        id: 'g_' + (1000 + i),
        firstName: first,
        lastName: last,
        email: (first + '.' + last).toLowerCase().normalize('NFD').replace(/[̀-ͯ']/g, '') +
          '@' + U.pick(rnd, ['mailbox.com', 'proton.me', 'gmail.com', 'outlook.com', 'fastmail.com']),
        phone: '+' + U.pickInt(rnd, 30, 49) + ' ' + U.pickInt(rnd, 600, 799) + ' ' + U.pickInt(rnd, 100000, 999999),
        country: country,
        vip: rnd() < 0.08,
        docType: U.pick(rnd, ['Passport', 'ID card', 'Driving licence']),
        docId: U.pick(rnd, ['P', 'ID', 'DL']) + U.pickInt(rnd, 1000000, 9999999),
        notes: '',
        prefs: rnd() < 0.25 ? U.pick(rnd, ['High floor', 'Quiet room', 'Late check-out if possible', 'Extra pillows', 'Allergy: feathers', 'Vegetarian breakfast']) : '',
        marketingOptIn: rnd() < 0.4,
        createdAt: new Date(Date.now() - U.pickInt(rnd, 5, 900) * 86400000).toISOString()
      });
    }
    return guests;
  }

  function ratePlanFor(rnd, type, date) {
    // weekend uplift + a little seasonal noise, rounded to whole units
    let r = type.basePrice;
    if (U.isWeekend(date)) r *= 1.18;
    r *= 0.92 + rnd() * 0.2;
    return Math.round(r);
  }

  function buildBookings(rnd, rooms, types, guests) {
    const typeById = U.indexBy(types, 'id');
    const today = U.today();
    const windowStart = U.addDays(today, -45);
    const windowEnd = U.addDays(today, 75);

    const bookings = [];
    const folios = [];
    let refSeq = 4820;

    const channels = ['direct', 'booking', 'booking', 'airbnb', 'airbnb', 'booking', 'direct'];

    rooms.forEach(room => {
      const type = typeById.get(room.typeId);
      let cursor = U.addDays(windowStart, U.pickInt(rnd, 0, 4));

      while (cursor < windowEnd) {
        // gap before the next stay — smaller gaps ⇒ higher occupancy
        const gap = rnd() < 0.62 ? 0 : U.pickInt(rnd, 1, 4);
        cursor = U.addDays(cursor, gap);
        if (cursor >= windowEnd) break;

        const nights = rnd() < 0.18 ? U.pickInt(rnd, 5, 9) : U.pickInt(rnd, 1, 4);
        const checkIn = cursor;
        const checkOut = U.addDays(checkIn, nights);
        cursor = checkOut;

        // leave the OOO window genuinely empty
        if (room.oooFrom && U.overlaps(checkIn, checkOut, room.oooFrom, room.oooTo)) continue;

        const guest = U.pick(rnd, guests);
        const channel = U.pick(rnd, channels);
        const rate = ratePlanFor(rnd, type, checkIn);
        const adults = Math.min(type.capacity, U.pickInt(rnd, 1, 2) + (type.capacity > 2 && rnd() < 0.4 ? 1 : 0));
        const children = type.capacity >= 3 && rnd() < 0.3 ? U.pickInt(rnd, 1, 2) : 0;

        // Statuses are relative to today. Crucially, stays that *start* or
        // *end* today are mostly left mid-flight so the front desk opens with
        // real arrivals to check in and departures to settle.
        let status;
        if (checkOut < today) status = 'checked_out';
        else if (checkOut === today) status = rnd() < 0.68 ? 'in_house' : 'checked_out';
        else if (checkIn < today) status = 'in_house';
        else if (checkIn === today) status = rnd() < 0.75 ? 'confirmed' : 'in_house';
        else status = 'confirmed';

        // a sprinkle of real-world mess
        if (status === 'checked_out' && rnd() < 0.045) status = 'no_show';
        if (status === 'confirmed' && rnd() < 0.05) status = 'cancelled';

        const id = U.uid('bk');
        const createdAt = new Date(U.parse(checkIn).getTime() - U.pickInt(rnd, 2, 70) * 86400000).toISOString();

        bookings.push({
          id: id,
          ref: 'HO-' + (refSeq++),
          guestId: guest.id,
          roomId: room.id,
          typeId: room.typeId,
          checkIn: checkIn,
          checkOut: checkOut,
          adults: adults,
          children: children,
          rate: rate,
          status: status,
          channel: channel,
          channelRef: channel === 'booking' ? 'BDC-' + U.pickInt(rnd, 3000000, 3999999)
            : channel === 'airbnb' ? 'HM' + U.pick(rnd, ['A', 'B', 'C', 'D', 'E']) + U.pickInt(rnd, 10000, 99999)
              : null,
          breakfast: rnd() < 0.45,
          notes: rnd() < 0.15 ? U.pick(rnd, ['Late arrival ~23:00', 'Honeymoon — sparkling on arrival', 'Requests high floor', 'Travelling with a small dog', 'Early check-in requested']) : '',
          paymentStatus: status === 'checked_out' ? 'paid'
            : status === 'in_house' ? (rnd() < 0.5 ? 'deposit' : 'guaranteed')
              : (rnd() < 0.35 ? 'prepaid' : 'guaranteed'),
          createdAt: createdAt,
          checkedInAt: (status === 'in_house' || status === 'checked_out')
            ? new Date(U.parse(checkIn).getTime() + (15 * 3600 + U.pickInt(rnd, 0, 21600)) * 1000).toISOString() : null,
          checkedOutAt: status === 'checked_out'
            ? new Date(U.parse(checkOut).getTime() + (9 * 3600 + U.pickInt(rnd, 0, 7200)) * 1000).toISOString() : null
        });
      }
    });

    return { bookings: bookings, folios: folios };
  }

  function buildMenu() {
    return [
      { id: 'm_1', name: 'Continental breakfast', category: 'Breakfast', price: 19, prepMins: 20, active: true },
      { id: 'm_2', name: 'Full English breakfast', category: 'Breakfast', price: 24, prepMins: 25, active: true },
      { id: 'm_3', name: 'Greek yoghurt & granola', category: 'Breakfast', price: 11, prepMins: 10, active: true },
      { id: 'm_4', name: 'Club sandwich & fries', category: 'All day', price: 21, prepMins: 22, active: true },
      { id: 'm_5', name: 'Caesar salad', category: 'All day', price: 18, prepMins: 15, active: true },
      { id: 'm_6', name: 'Margherita pizza', category: 'All day', price: 17, prepMins: 20, active: true },
      { id: 'm_7', name: 'Beef burger & fries', category: 'All day', price: 26, prepMins: 25, active: true },
      { id: 'm_8', name: 'Tomato soup', category: 'All day', price: 12, prepMins: 12, active: true },
      { id: 'm_9', name: 'Espresso', category: 'Drinks', price: 4, prepMins: 5, active: true },
      { id: 'm_10', name: 'Pot of tea', category: 'Drinks', price: 6, prepMins: 8, active: true },
      { id: 'm_11', name: 'Glass of house red', category: 'Drinks', price: 9, prepMins: 6, active: true },
      { id: 'm_12', name: 'Bottle of Prosecco', category: 'Drinks', price: 38, prepMins: 10, active: true },
      { id: 'm_13', name: 'Fresh orange juice', category: 'Drinks', price: 7, prepMins: 6, active: true },
      { id: 'm_14', name: 'Chocolate fondant', category: 'Desserts', price: 13, prepMins: 18, active: true },
      { id: 'm_15', name: 'Cheese board', category: 'Desserts', price: 22, prepMins: 12, active: true },
      { id: 'm_16', name: 'Seasonal fruit plate', category: 'Desserts', price: 10, prepMins: 10, active: true }
    ];
  }

  function buildMinibarItems() {
    return [
      { id: 'mb_1', name: 'Still water 500ml', price: 3.5, par: 2, cost: 0.6 },
      { id: 'mb_2', name: 'Sparkling water 500ml', price: 3.5, par: 2, cost: 0.6 },
      { id: 'mb_3', name: 'Coca-Cola 330ml', price: 4, par: 2, cost: 0.8 },
      { id: 'mb_4', name: 'Local craft beer', price: 6.5, par: 2, cost: 1.9 },
      { id: 'mb_5', name: 'Prosecco 200ml', price: 14, par: 1, cost: 4.5 },
      { id: 'mb_6', name: 'Pringles Original', price: 5, par: 1, cost: 1.4 },
      { id: 'mb_7', name: 'Toblerone 50g', price: 4.5, par: 2, cost: 1.2 },
      { id: 'mb_8', name: 'Salted cashews', price: 6, par: 1, cost: 1.8 },
      { id: 'mb_9', name: 'Espresso pod', price: 2.5, par: 4, cost: 0.4 },
      { id: 'mb_10', name: 'Orange juice 250ml', price: 4.5, par: 1, cost: 1.1 }
    ];
  }

  function buildChannels() {
    return [
      {
        id: 'booking', name: 'Booking.com', connected: true,
        apiKey: 'bdc_live_••••••••••••4f27', propertyId: '10428391',
        endpoint: 'https://supply-xml.booking.com/hotels/ota/OTA_HotelResNotif',
        autoSync: true, syncIntervalMin: 15, lastSync: null,
        commissionPct: 15,
        pushRates: true, pushAvailability: true, pullReservations: true,
        health: 'ok'
      },
      {
        id: 'airbnb', name: 'Airbnb', connected: true,
        apiKey: 'abnb_live_••••••••••••9c1a', propertyId: 'lst_88213774',
        endpoint: 'https://api.airbnb.com/v2/reservations',
        autoSync: true, syncIntervalMin: 30, lastSync: null,
        commissionPct: 3,
        pushRates: true, pushAvailability: true, pullReservations: true,
        health: 'ok'
      }
    ];
  }

  /* -------------------------------------------------- */

  function buildHousekeeping(rnd, rooms, bookings, today) {
    const tasks = [];
    const byRoom = U.groupBy(bookings.filter(b => b.status !== 'cancelled' && b.status !== 'no_show'), b => b.roomId);

    rooms.forEach(room => {
      if (room.status === 'ooo') return;
      const stays = byRoom.get(room.id) || [];
      const departingToday = stays.some(b => b.checkOut === today);
      const stayover = stays.some(b => b.checkIn < today && b.checkOut > today);
      if (!departingToday && !stayover) return;

      const type = departingToday ? 'departure' : 'stayover';
      const roll = rnd();
      // a departure room whose guest has not left yet cannot be serviced
      const stillOccupied = stays.some(b => b.status === 'in_house' && b.checkOut === today);
      const status = stillOccupied ? 'pending'
        : roll < 0.34 ? 'done' : roll < 0.55 ? 'in_progress' : 'pending';

      tasks.push({
        id: U.uid('hk'),
        roomId: room.id,
        date: today,
        type: type,
        assignee: U.pick(rnd, HK_STAFF),
        status: status,
        priority: departingToday && rnd() < 0.35 ? 'high' : 'normal',
        notes: rnd() < 0.14 ? U.pick(rnd, ['Guest requested extra towels', 'Stain on carpet — report', 'Mini bar needs full restock', 'Check A/C filter']) : '',
        minutes: departingToday ? U.pickInt(rnd, 35, 55) : U.pickInt(rnd, 15, 25),
        startedAt: null,
        completedAt: null
      });
    });

    // room status follows the task board
    const taskByRoom = U.indexBy(tasks, 'roomId');
    rooms.forEach(room => {
      if (room.status === 'ooo') return;
      const t = taskByRoom.get(room.id);
      if (!t) { room.status = 'clean'; return; }
      room.status = t.status === 'done' ? 'clean' : t.status === 'in_progress' ? 'cleaning' : 'dirty';
    });
    // a few inspected rooms
    rooms.filter(r => r.status === 'clean').slice(0, 6).forEach(r => { r.status = 'inspected'; });

    return tasks;
  }

  function buildOrders(rnd, menu, bookings, today) {
    const orders = [];
    const inHouse = bookings.filter(b => b.status === 'in_house');
    const menuById = U.indexBy(menu, 'id');

    inHouse.forEach(b => {
      if (rnd() > 0.42) return;
      const count = U.pickInt(rnd, 1, 3);
      for (let i = 0; i < count; i++) {
        const lines = [];
        const n = U.pickInt(rnd, 1, 3);
        for (let j = 0; j < n; j++) {
          const m = U.pick(rnd, menu);
          lines.push({ menuId: m.id, qty: U.pickInt(rnd, 1, 2) });
        }
        const hoursAgo = U.pickInt(rnd, 0, 30);
        const placedAt = new Date(Date.now() - hoursAgo * 3600000).toISOString();
        const roll = rnd();
        let status;
        if (hoursAgo > 6) status = 'delivered';
        else status = roll < 0.3 ? 'new' : roll < 0.62 ? 'preparing' : 'delivered';

        orders.push({
          id: U.uid('ord'),
          ref: 'RS-' + U.pickInt(rnd, 2000, 9999),
          roomId: b.roomId,
          bookingId: b.id,
          items: lines,
          status: status,
          placedAt: placedAt,
          deliveredAt: status === 'delivered' ? new Date(new Date(placedAt).getTime() + U.pickInt(rnd, 18, 46) * 60000).toISOString() : null,
          assignee: status === 'new' ? null : U.pick(rnd, FB_STAFF),
          notes: rnd() < 0.18 ? U.pick(rnd, ['No onions please', 'Deliver at 20:00', 'Extra napkins', 'Allergy: nuts']) : '',
          postedToFolio: status === 'delivered',
          total: U.round2(U.sum(lines, l => (menuById.get(l.menuId).price) * l.qty))
        });
      }
    });

    return orders.sort((a, b) => U.cmp(b.placedAt, a.placedAt));
  }

  function buildMinibar(rnd, rooms, items, bookings, today) {
    const stock = {};
    const postings = [];
    const inHouseByRoom = U.indexBy(bookings.filter(b => b.status === 'in_house'), 'roomId');

    rooms.forEach(room => {
      const s = {};
      items.forEach(it => { s[it.id] = it.par; });
      stock[room.id] = s;

      const b = inHouseByRoom.get(room.id);
      if (!b || rnd() > 0.45) return;

      const consumedCount = U.pickInt(rnd, 1, 3);
      for (let i = 0; i < consumedCount; i++) {
        const it = U.pick(rnd, items);
        const qty = Math.min(s[it.id], U.pickInt(rnd, 1, 2));
        if (qty <= 0) continue;
        s[it.id] -= qty;
        postings.push({
          id: U.uid('mbp'),
          roomId: room.id,
          bookingId: b.id,
          itemId: it.id,
          qty: qty,
          amount: U.round2(qty * it.price),
          ts: new Date(Date.now() - U.pickInt(rnd, 1, 40) * 3600000).toISOString(),
          postedBy: U.pick(rnd, HK_STAFF),
          voided: false
        });
      }
    });

    return { stock: stock, postings: postings.sort((a, b) => U.cmp(b.ts, a.ts)) };
  }

  /* -------------------------------------------------- */

  function buildFolios(rnd, bookings, orders, postings, menu, minibarItems, hotel) {
    const menuById = U.indexBy(menu, 'id');
    const mbById = U.indexBy(minibarItems, 'id');
    const today = U.today();
    const folios = [];

    const ordersByBooking = U.groupBy(orders.filter(o => o.postedToFolio), o => o.bookingId);
    const postingsByBooking = U.groupBy(postings.filter(p => !p.voided), p => p.bookingId);

    bookings.forEach(b => {
      if (b.status !== 'in_house' && b.status !== 'checked_out') return;

      const items = [];
      // Accommodation, one line per night. An in-house guest has already been
      // charged for tonight (posted on arrival), so the window runs through
      // today inclusive — otherwise "posted today" reports zero room revenue.
      const lastNight = b.status === 'checked_out'
        ? b.checkOut
        : (U.addDays(today, 1) < b.checkOut ? U.addDays(today, 1) : b.checkOut);
      U.range(b.checkIn, lastNight).forEach(d => {
        items.push({
          id: U.uid('fi'), ts: U.parse(d).toISOString(), type: 'room',
          desc: 'Room charge · ' + U.fmtDate(d), qty: 1, unitPrice: b.rate, amount: b.rate
        });
        if (b.breakfast) {
          items.push({
            id: U.uid('fi'), ts: U.parse(d).toISOString(), type: 'fnb',
            desc: 'Breakfast · ' + U.fmtDate(d), qty: b.adults, unitPrice: hotel.breakfastPrice,
            amount: U.round2(b.adults * hotel.breakfastPrice)
          });
        }
      });

      (ordersByBooking.get(b.id) || []).forEach(o => {
        o.items.forEach(l => {
          const m = menuById.get(l.menuId);
          if (!m) return;
          items.push({
            id: U.uid('fi'), ts: o.placedAt, type: 'service',
            desc: 'Room service · ' + m.name, qty: l.qty, unitPrice: m.price,
            amount: U.round2(l.qty * m.price), sourceId: o.id
          });
        });
      });

      (postingsByBooking.get(b.id) || []).forEach(p => {
        const it = mbById.get(p.itemId);
        if (!it) return;
        items.push({
          id: U.uid('fi'), ts: p.ts, type: 'minibar',
          desc: 'Mini bar · ' + it.name, qty: p.qty, unitPrice: it.price,
          amount: p.amount, sourceId: p.id
        });
      });

      items.sort((a, c) => U.cmp(a.ts, c.ts));

      const charges = U.sum(items, i => i.amount);
      const payments = [];
      if (b.status === 'checked_out') {
        payments.push({
          id: U.uid('fi'), ts: b.checkedOutAt, type: 'payment',
          desc: U.pick(rnd, ['Visa ••4821', 'Mastercard ••7715', 'Amex ••1003', 'Cash', 'Bank transfer']),
          qty: 1, unitPrice: -U.round2(charges), amount: -U.round2(charges)
        });
      } else if (b.paymentStatus === 'deposit') {
        const dep = Math.round(b.rate * 1);
        payments.push({
          id: U.uid('fi'), ts: b.checkedInAt, type: 'payment',
          desc: 'Deposit · Visa ••4821', qty: 1, unitPrice: -dep, amount: -dep
        });
      }

      folios.push({
        id: U.uid('fol'),
        bookingId: b.id,
        items: items.concat(payments),
        closed: b.status === 'checked_out',
        closedAt: b.status === 'checked_out' ? b.checkedOutAt : null
      });
    });

    return folios;
  }

  function buildActivity(rnd, bookings, orders) {
    const out = [];
    const recent = bookings.filter(b => b.status === 'in_house' || b.status === 'confirmed').slice(0, 40);

    recent.slice(0, 6).forEach((b, i) => {
      out.push({
        id: U.uid('act'),
        ts: new Date(Date.now() - (i * 37 + U.pickInt(rnd, 3, 25)) * 60000).toISOString(),
        type: b.channel === 'direct' ? 'booking' : 'sync',
        icon: b.channel === 'direct' ? 'book' : 'link',
        text: b.channel === 'direct'
          ? 'New direct reservation ' + b.ref
          : 'Imported ' + b.ref + ' from ' + (b.channel === 'booking' ? 'Booking.com' : 'Airbnb'),
        link: '#/bookings?id=' + b.id
      });
    });

    orders.slice(0, 4).forEach((o, i) => {
      out.push({
        id: U.uid('act'),
        ts: new Date(Date.now() - (i * 53 + 12) * 60000).toISOString(),
        type: 'service', icon: 'tray',
        text: 'Room service ' + o.ref + ' · ' + U.titleCase(o.status),
        link: '#/roomservice'
      });
    });

    return out.sort((a, b) => U.cmp(b.ts, a.ts)).slice(0, 14);
  }

  /* ============================================================
     Guest-service reservations (tables, treatments, experiences)
     Seeded from in-house and arriving guests so the boards open
     with something real on them.
     ============================================================ */

  function buildServiceReservations(rnd, bookings, restaurants, spa, experiences, today) {
    const dining = [], spaBookings = [], expBookings = [];
    const candidates = bookings.filter(b =>
      (b.status === 'in_house' || b.status === 'confirmed') &&
      b.checkIn <= U.addDays(today, 14) && b.checkOut >= today);

    candidates.forEach(b => {
      const nights = U.range(b.checkIn, b.checkOut).filter(d => d >= today);
      if (!nights.length) return;

      // a table, roughly half the time
      if (rnd() < 0.45) {
        const r = U.pick(rnd, restaurants);
        const date = U.pick(rnd, nights);
        if (r.closedDays.indexOf(U.parse(date).getDay()) === -1) {
          dining.push({
            id: U.uid('dr'),
            restaurantId: r.id,
            bookingId: b.id,
            guestId: b.guestId,
            date: date,
            time: U.pick(rnd, r.slots),
            party: Math.max(1, b.adults + (rnd() < 0.4 ? b.children : 0)),
            notes: rnd() < 0.2 ? U.pick(rnd, ['Window table if possible', 'One vegetarian', 'Celebrating an anniversary', 'Nut allergy']) : '',
            status: 'confirmed',
            source: 'guest',
            createdAt: new Date(Date.now() - U.pickInt(rnd, 1, 300) * 60000).toISOString()
          });
        }
      }

      // a treatment, less often
      if (rnd() < 0.22) {
        const t = U.pick(rnd, spa.treatments);
        spaBookings.push({
          id: U.uid('sb'),
          treatmentId: t.id,
          bookingId: b.id,
          guestId: b.guestId,
          date: U.pick(rnd, nights),
          time: U.pick(rnd, spa.slots),
          guests: t.category === 'Couples' ? 2 : 1,
          notes: '',
          status: 'confirmed',
          source: 'guest',
          createdAt: new Date(Date.now() - U.pickInt(rnd, 1, 400) * 60000).toISOString()
        });
      }

      // an experience, less often still
      if (rnd() < 0.18) {
        const e = U.pick(rnd, experiences);
        const fit = nights.filter(d => e.days.indexOf(U.parse(d).getDay()) > -1);
        if (fit.length) {
          expBookings.push({
            id: U.uid('eb'),
            experienceId: e.id,
            bookingId: b.id,
            guestId: b.guestId,
            date: U.pick(rnd, fit),
            people: Math.max(1, Math.min(e.capacity, b.adults)),
            notes: '',
            status: 'confirmed',
            source: 'guest',
            createdAt: new Date(Date.now() - U.pickInt(rnd, 1, 500) * 60000).toISOString()
          });
        }
      }
    });

    return { dining: dining, spa: spaBookings, experiences: expBookings };
  }

  /* -------------------------------------------------- */

  function generate() {
    const rnd = U.rng(20260810);
    const today = U.today();

    const hotel = {
      name: 'Casa Marea',
      tagline: 'Boutique seafront hotel',
      address: 'Passeig del Mar 42, 17300 Blanes, Spain',
      email: 'front.desk@casamarea.example',
      phone: '+34 972 550 118',
      currency: 'EUR',
      taxRate: 10,
      cityTax: 2.2,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      breakfastPrice: 16,
      totalFloors: 4,
      logoInitials: 'CM'
    };

    const roomTypes = buildRoomTypes();
    const rooms = buildRooms(rnd);
    const guests = buildGuests(rnd, 96);
    const built = buildBookings(rnd, rooms, roomTypes, guests);
    const bookings = built.bookings;
    const menu = buildMenu();
    const minibarItems = buildMinibarItems();

    const hkTasks = buildHousekeeping(rnd, rooms, bookings, today);
    const orders = buildOrders(rnd, menu, bookings, today);
    const mb = buildMinibar(rnd, rooms, minibarItems, bookings, today);
    const folios = buildFolios(rnd, bookings, orders, mb.postings, menu, minibarItems, hotel);
    const activity = buildActivity(rnd, bookings, orders);

    // what the property sells, shared with the public site
    const restaurants = Offerings.restaurants();
    const spa = Offerings.spa();
    const experiences = Offerings.experiences();
    const services = buildServiceReservations(rnd, bookings, restaurants, spa, experiences, today);

    const channels = buildChannels();
    channels.forEach((c, i) => {
      c.lastSync = new Date(Date.now() - (i === 0 ? 8 : 24) * 60000).toISOString();
    });

    const syncLog = [];
    [
      { ch: 'booking', level: 'ok', msg: 'Pulled 3 reservations, 1 modification · 0 errors' },
      { ch: 'airbnb', level: 'ok', msg: 'Pushed availability for 30 days · 30 room-types updated' },
      { ch: 'booking', level: 'ok', msg: 'Pushed rates for 30 days · 6 room-types updated' },
      { ch: 'airbnb', level: 'warn', msg: 'Rate parity warning on Deluxe King — Airbnb 4% below direct' },
      { ch: 'booking', level: 'ok', msg: 'Availability push acknowledged (HTTP 200)' }
    ].forEach((e, i) => {
      syncLog.push({
        id: U.uid('log'),
        ts: new Date(Date.now() - (i * 17 + 8) * 60000).toISOString(),
        channel: e.ch, level: e.level, message: e.msg,
        direction: e.msg.indexOf('Pulled') === 0 ? 'in' : 'out'
      });
    });

    return {
      version: 1,
      installedAt: new Date().toISOString(),
      hotel: hotel,
      staff: HK_STAFF.map((n, i) => ({ id: 'st_h' + i, name: n, role: 'Housekeeping' }))
        .concat(FB_STAFF.map((n, i) => ({ id: 'st_f' + i, name: n, role: 'Food & Beverage' })))
        .concat([{ id: 'st_admin', name: 'Administrator', role: 'Management' }]),
      roomTypes: roomTypes,
      rooms: rooms,
      guests: guests,
      bookings: bookings,
      folios: folios,
      hkTasks: hkTasks,
      menu: menu,
      orders: orders,
      minibarItems: minibarItems,
      minibarStock: mb.stock,
      minibarPostings: mb.postings,
      channels: channels,
      syncLog: syncLog,
      activity: activity,

      /* ---- what the property sells (shared with the public site) ---- */
      restaurants: restaurants,
      spa: spa,
      experiences: experiences,
      amenities: Offerings.amenities(),
      siteContent: Offerings.siteContent(),

      /* ---- guest-service reservations ---- */
      diningReservations: services.dining,
      spaBookings: services.spa,
      experienceBookings: services.experiences,

      prefs: { theme: null, calendarDays: 21, lastRoute: '#/dashboard' }
    };
  }

  global.Seed = { generate: generate, HK_STAFF: HK_STAFF, FB_STAFF: FB_STAFF, AMENITY_POOL: AMENITY_POOL, COUNTRIES: COUNTRIES };
})(window);
