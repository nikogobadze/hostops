/* Sanity-checks the seeded database and the auth primitives. */
import { all, one } from '../lib/db.js';
import { verifyPassword } from '../lib/auth.js';

const today = new Date().toISOString().slice(0, 10);

const h = await one('select name, currency, tax_rate from hotel where id = 1');
console.log('hotel        ', h.name, '·', h.currency, '· VAT', h.tax_rate + '%');

// availability: rooms with no overlapping stay. Half-open [check_in, check_out)
const from = today, to = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const free = await all(
  `select rt.name, count(*) as n, min(rt.base_price) as price
     from rooms r join room_types rt on rt.id = r.type_id
    where r.active = 1
      and not exists (
        select 1 from bookings b
         where b.room_id = r.id
           and b.status in ('confirmed','in_house','checked_out')
           and b.check_in < ? and ? < b.check_out)
      and not (r.ooo_from is not null and r.ooo_from < ? and ? < r.ooo_to)
    group by rt.id order by price`, [to, from, to, from]);
console.log('free ' + from + ' → ' + to + ':',
  free.length ? free.map(r => r.name + ' ×' + r.n).join(', ') : 'sold out');

const occ = await one(
  `select count(*) as n from bookings
    where status in ('confirmed','in_house','checked_out') and check_in <= ? and ? < check_out`, [today, today]);
const sellable = await one("select count(*) as n from rooms where active = 1 and status != 'ooo'");
console.log('tonight      ', occ.n + '/' + sellable.n + ' sold (' + Math.round(occ.n / sellable.n * 100) + '%)');

const mgr = await one("select email, password_hash, role from users where role = 'manager'");
console.log('manager      ', mgr.email);
console.log('  correct pw ', await verifyPassword('manager1234', mgr.password_hash) ? 'accepted ✓' : 'REJECTED ✗');
console.log('  wrong pw   ', await verifyPassword('hunter2', mgr.password_hash) ? 'ACCEPTED ✗' : 'rejected ✓');

const svc = await one(`select
  (select count(*) from dining_reservations where status='confirmed') as tables,
  (select count(*) from spa_bookings where status='confirmed') as spa,
  (select count(*) from experience_bookings where status='confirmed') as exp`);
console.log('services     ', svc.tables + ' tables, ' + svc.spa + ' treatments, ' + svc.exp + ' experiences');
