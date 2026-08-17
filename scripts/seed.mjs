/* ============================================================
   Fills the Turso database with the generated property.

   It loads the *same* browser modules the front end uses
   (utils.js, offerings.js, seed.js) inside a tiny window shim,
   so the demo data can never drift from what the app expects.

     node scripts/seed.mjs             seed if empty
     node scripts/seed.mjs --force     wipe the data tables first
   ============================================================ */

import { db, run, all, json, bool } from '../lib/db.js';
import { hashPassword, newId } from '../lib/auth.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const force = process.argv.includes('--force');

/* ---------- run the browser generator under Node ---------- */

globalThis.window = globalThis;
for (const f of ['assets/js/core/utils.js', 'assets/js/core/offerings.js', 'assets/js/core/seed.js']) {
  vm.runInThisContext(readFileSync(join(root, f), 'utf8'), { filename: f });
}

const s = globalThis.Seed.generate();
console.log('generated: ' + s.rooms.length + ' rooms, ' + s.bookings.length + ' bookings, ' +
  s.guests.length + ' guests, ' + s.folios.length + ' folios');

/* ---------- guard against a double seed ---------- */

const existing = await all('select count(*) as n from rooms');
if (existing[0].n > 0 && !force) {
  console.log('\nDatabase already has ' + existing[0].n + ' rooms. Use --force to replace.');
  process.exit(0);
}

const DATA_TABLES = [
  'activity', 'sync_log', 'experience_bookings', 'spa_bookings', 'dining_reservations',
  'minibar_postings', 'minibar_stock', 'order_lines', 'orders', 'hk_tasks',
  'folio_items', 'folios', 'bookings', 'rooms', 'room_types', 'guests', 'staff',
  'menu_items', 'minibar_items', 'restaurants', 'spa_treatments', 'spa',
  'experiences', 'channels', 'hotel'
];

if (force) {
  await db.execute('PRAGMA foreign_keys = OFF');
  for (const t of DATA_TABLES) await db.execute(`delete from "${t}"`);
  await db.execute('PRAGMA foreign_keys = ON');
  console.log('cleared existing data');
}

/* ---------- batched writer ---------- */

let written = 0;
async function insertMany(label, sql, rows) {
  if (!rows.length) return;
  const CHUNK = 150;                     // keeps each round trip small
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.batch(rows.slice(i, i + CHUNK).map(args => ({ sql, args })), 'write');
  }
  written += rows.length;
  console.log('  ' + label.padEnd(22) + String(rows.length).padStart(6));
}

const now = new Date().toISOString();

/* ---------- the property ---------- */

const h = s.hotel;
await run(
  `insert into hotel (id, name, tagline, address, email, phone, currency, tax_rate, city_tax,
                      check_in_time, check_out_time, breakfast_price, updated_at)
   values (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [h.name, h.tagline, h.address, h.email, h.phone, h.currency, h.taxRate, h.cityTax,
    h.checkInTime, h.checkOutTime, h.breakfastPrice, now]
);
console.log('\ninserting:');

await insertMany('room_types', `insert into room_types
  (id, code, name, base_price, capacity, beds, size, amenities, art, view, blurb, highlights, sort_order)
  values (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.roomTypes.map((t, i) => [t.id, t.code, t.name, t.basePrice, t.capacity, t.beds, t.size,
  json(t.amenities), t.art, t.view, t.blurb, json(t.highlights), i]));

await insertMany('rooms', `insert into rooms
  (id, number, floor, type_id, status, notes, active, ooo_from, ooo_to, ooo_reason)
  values (?,?,?,?,?,?,?,?,?,?)`,
s.rooms.map(r => [r.id, r.number, r.floor, r.typeId, r.status, r.notes || null,
  bool(r.active), r.oooFrom, r.oooTo, r.oooReason || null]));

await insertMany('staff', 'insert into staff (id, name, role) values (?,?,?)',
  s.staff.map(m => [m.id, m.name, m.role]));

await insertMany('guests', `insert into guests
  (id, first_name, last_name, email, phone, country, vip, doc_type, doc_id, prefs, notes,
   marketing_opt_in, created_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.guests.map(g => [g.id, g.firstName, g.lastName, g.email, g.phone, g.country, bool(g.vip),
  g.docType, g.docId, g.prefs || null, g.notes || null, bool(g.marketingOptIn), g.createdAt]));

await insertMany('bookings', `insert into bookings
  (id, ref, guest_id, room_id, type_id, check_in, check_out, adults, children, rate, status,
   channel, channel_ref, breakfast, notes, payment_status, created_at, checked_in_at,
   checked_out_at, cancelled_at, cancel_reason) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.bookings.map(b => [b.id, b.ref, b.guestId, b.roomId, b.typeId, b.checkIn, b.checkOut,
  b.adults, b.children, b.rate, b.status, b.channel, b.channelRef, bool(b.breakfast),
  b.notes || null, b.paymentStatus, b.createdAt, b.checkedInAt, b.checkedOutAt,
  b.cancelledAt || null, b.cancelReason || null]));

await insertMany('folios', 'insert into folios (booking_id, closed, closed_at) values (?,?,?)',
  s.folios.map(f => [f.bookingId, bool(f.closed), f.closedAt]));

const folioItems = [];
s.folios.forEach(f => f.items.forEach(i =>
  folioItems.push([i.id, f.bookingId, i.ts, i.type, i.desc, i.qty, i.unitPrice, i.amount, i.sourceId || null])));
await insertMany('folio_items', `insert into folio_items
  (id, booking_id, ts, type, descr, qty, unit_price, amount, source_id) values (?,?,?,?,?,?,?,?,?)`,
folioItems);

await insertMany('hk_tasks', `insert into hk_tasks
  (id, room_id, date, type, assignee, status, priority, notes, minutes, started_at, completed_at)
  values (?,?,?,?,?,?,?,?,?,?,?)`,
s.hkTasks.map(t => [t.id, t.roomId, t.date, t.type, t.assignee, t.status, t.priority,
  t.notes || null, t.minutes, t.startedAt, t.completedAt]));

await insertMany('menu_items', `insert into menu_items
  (id, name, category, price, prep_mins, active) values (?,?,?,?,?,?)`,
s.menu.map(m => [m.id, m.name, m.category, m.price, m.prepMins, bool(m.active)]));

await insertMany('orders', `insert into orders
  (id, ref, room_id, booking_id, status, placed_at, delivered_at, assignee, notes,
   posted_to_folio, total) values (?,?,?,?,?,?,?,?,?,?,?)`,
s.orders.map(o => [o.id, o.ref, o.roomId, o.bookingId, o.status, o.placedAt, o.deliveredAt,
  o.assignee, o.notes || null, bool(o.postedToFolio), o.total]));

const orderLines = [];
s.orders.forEach(o => o.items.forEach(l =>
  orderLines.push([newId('ol'), o.id, l.menuId, l.qty])));
await insertMany('order_lines', 'insert into order_lines (id, order_id, menu_id, qty) values (?,?,?,?)', orderLines);

await insertMany('minibar_items', 'insert into minibar_items (id, name, price, cost, par) values (?,?,?,?,?)',
  s.minibarItems.map(i => [i.id, i.name, i.price, i.cost || 0, i.par]));

const stock = [];
Object.keys(s.minibarStock).forEach(roomId =>
  Object.keys(s.minibarStock[roomId]).forEach(itemId =>
    stock.push([roomId, itemId, s.minibarStock[roomId][itemId]])));
await insertMany('minibar_stock', 'insert into minibar_stock (room_id, item_id, qty) values (?,?,?)', stock);

await insertMany('minibar_postings', `insert into minibar_postings
  (id, room_id, booking_id, item_id, qty, amount, ts, posted_by, voided) values (?,?,?,?,?,?,?,?,?)`,
s.minibarPostings.map(p => [p.id, p.roomId, p.bookingId, p.itemId, p.qty, p.amount, p.ts,
  p.postedBy, bool(p.voided)]));

/* ---------- what else the hotel sells ---------- */

await insertMany('restaurants', `insert into restaurants
  (id, name, tagline, cuisine, art, descr, dress_code, price_range, avg_per_person, location,
   hours, slots, seats_per_slot, closed_days, highlights, signature, sort_order)
  values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.restaurants.map((r, i) => [r.id, r.name, r.tagline, r.cuisine, r.art, r.description,
  r.dressCode, r.priceRange, r.avgPerPerson, r.location, r.hours, json(r.slots),
  r.seatsPerSlot, json(r.closedDays), json(r.highlights), json(r.signature), i]));

await run(`insert into spa (id, name, tagline, descr, art, hours, rooms_available, slots, facilities)
           values (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
[s.spa.name, s.spa.tagline, s.spa.description, s.spa.art, s.spa.hours,
  s.spa.roomsAvailable, json(s.spa.slots), json(s.spa.facilities)]);
console.log('  spa                         1');

await insertMany('spa_treatments', `insert into spa_treatments
  (id, name, category, duration, price, descr, sort_order) values (?,?,?,?,?,?,?)`,
s.spa.treatments.map((t, i) => [t.id, t.name, t.category, t.duration, t.price, t.description, i]));

await insertMany('experiences', `insert into experiences
  (id, name, art, category, duration, price, capacity, days, time, meeting, summary, descr,
   includes, sort_order) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.experiences.map((e, i) => [e.id, e.name, e.art, e.category, e.duration, e.price, e.capacity,
  json(e.days), e.time, e.meeting, e.summary, e.description, json(e.includes), i]));

await insertMany('dining_reservations', `insert into dining_reservations
  (id, restaurant_id, booking_id, guest_id, guest_name, email, phone, date, time, party,
   notes, status, source, created_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.diningReservations.map(r => [r.id, r.restaurantId, r.bookingId, r.guestId, r.guestName || null,
  r.email || null, r.phone || null, r.date, r.time, r.party, r.notes || null, r.status,
  r.source, r.createdAt]));

await insertMany('spa_bookings', `insert into spa_bookings
  (id, treatment_id, booking_id, guest_id, guest_name, email, date, time, guests, notes,
   status, source, created_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.spaBookings.map(r => [r.id, r.treatmentId, r.bookingId, r.guestId, r.guestName || null,
  r.email || null, r.date, r.time, r.guests, r.notes || null, r.status, r.source, r.createdAt]));

await insertMany('experience_bookings', `insert into experience_bookings
  (id, experience_id, booking_id, guest_id, guest_name, email, date, people, notes,
   status, source, created_at) values (?,?,?,?,?,?,?,?,?,?,?,?)`,
s.experienceBookings.map(r => [r.id, r.experienceId, r.bookingId, r.guestId, r.guestName || null,
  r.email || null, r.date, r.people, r.notes || null, r.status, r.source, r.createdAt]));

await insertMany('channels', `insert into channels
  (id, name, connected, api_key, property_id, endpoint, commission_pct, auto_sync,
   sync_interval_min, pull_reservations, push_availability, push_rates, last_sync, health)
  values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
s.channels.map(c => [c.id, c.name, bool(c.connected), c.apiKey, c.propertyId, c.endpoint,
  c.commissionPct, bool(c.autoSync), c.syncIntervalMin, bool(c.pullReservations),
  bool(c.pushAvailability), bool(c.pushRates), c.lastSync, c.health]));

await insertMany('sync_log', 'insert into sync_log (id, ts, channel, level, message, direction) values (?,?,?,?,?,?)',
  s.syncLog.map(l => [l.id, l.ts, l.channel, l.level, l.message, l.direction]));

await insertMany('activity', 'insert into activity (id, ts, type, icon, text, link) values (?,?,?,?,?,?)',
  s.activity.map(a => [a.id, a.ts, a.type, a.icon, a.text, a.link]));

/* ---------- accounts ---------- */

const accounts = [
  { email: 'manager@magnoliahouse.example', password: 'manager1234', first: 'Nino',   last: 'Beridze',     role: 'manager' },
  { email: 'reception@magnoliahouse.example', password: 'reception1234', first: 'Sandro', last: 'Tavdgiridze', role: 'staff' },
  { email: 'guest@example.com', password: 'guest1234', first: 'Mariam', last: 'Kapanadze', role: 'guest' }
];

const rows = [];
for (const a of accounts) {
  rows.push([newId('u'), a.email, await hashPassword(a.password), a.first, a.last,
    null, 'GE', a.role, null, 1, now]);
}
await insertMany('users', `insert into users
  (id, email, password_hash, first_name, last_name, phone, country, role, guest_id, active, created_at)
  values (?,?,?,?,?,?,?,?,?,?,?)`, rows);

console.log('\nseeded ' + written + ' rows');
console.log('\naccounts:');
accounts.forEach(a => console.log('  ' + a.role.padEnd(8) + a.email.padEnd(36) + a.password));
