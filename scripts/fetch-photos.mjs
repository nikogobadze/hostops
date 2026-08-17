/* ============================================================
   Sources the site photography from licence-clear providers.

     node scripts/fetch-photos.mjs          fetch anything missing
     node scripts/fetch-photos.mjs --force  re-fetch everything

   Two providers, chosen for licence rather than convenience:
     · Openverse, filtered to CC0 / public domain — no attribution
       obligation, which suits generic interiors
     · Wikimedia Commons for Batumi-specific shots that exist
       nowhere else. Those are usually CC BY / CC BY-SA, so each is
       recorded in credits.json and shown on the credits page

   Nothing is scraped: both are public APIs serving images whose
   licences permit reuse. Results are scored against the query
   before being accepted — taking the first hit that is merely
   big enough puts a coastguard exercise on the rooms page.
   ============================================================ */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'assets', 'img');
const force = process.argv.includes('--force');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const UA = 'MagnoliaHouseDemo/1.0 (portfolio project; github.com/nikogobadze/hostops)';

mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- what each slot needs ----------
   `q` is a list of attempts, best first. `must` are words at least
   one of which has to appear in the result title, which is what
   keeps the subject honest.                                        */

const SLOTS = [
  { key: 'hero', wide: true, commons: true, must: ['batumi', 'sea', 'coast', 'black sea'],
    q: ['Batumi seaside evening', 'Batumi boulevard sea', 'Black Sea Georgia coast'] },
  { key: 'hero-rooms', wide: true, must: ['room', 'bed', 'suite', 'hotel', 'bedroom'],
    q: ['hotel room bed window', 'bedroom interior light', 'hotel suite bed'] },
  { key: 'hero-dining', wide: true, commons: true, must: ['supra', 'table', 'georgian', 'feast', 'khachapuri', 'wine'],
    q: ['Georgian supra table food', 'Georgian feast table', 'Georgian food table wine'] },
  { key: 'hero-spa', wide: true, must: ['spa', 'pool', 'sauna', 'bath', 'wellness'],
    q: ['spa pool interior', 'indoor swimming pool', 'wellness spa room'] },
  { key: 'hero-exp', wide: true, must: ['sail', 'boat', 'yacht', 'sea', 'ship'],
    q: ['sailboat sea horizon', 'yacht white sails', 'sailing boat water'] },
  { key: 'hero-hotel', wide: true, commons: true, must: ['batumi', 'boulevard', 'palm', 'georgia'],
    q: ['Batumi boulevard', 'Batumi park palm', 'Batumi seafront'] },
  { key: 'hero-contact', wide: true, commons: true, must: ['batumi', 'city', 'georgia'],
    q: ['Batumi view', 'Batumi Georgia', 'Batumi city'] },

  { key: 'story', commons: true, must: ['batumi', 'architecture', 'building', 'georgia'],
    q: ['Batumi architecture building', 'Batumi old town', 'Batumi street'] },
  { key: 'beach', wide: true, commons: true, must: ['beach', 'sea', 'batumi', 'coast'],
    q: ['Batumi beach', 'Black Sea beach pebble', 'Georgia sea beach'] },
  { key: 'pool', wide: true, must: ['pool', 'swimming'],
    q: ['swimming pool outdoor', 'infinity pool', 'hotel pool'] },

  { key: 'room-standard', must: ['room', 'bed', 'bedroom', 'hotel'],
    q: ['bedroom interior bed', 'hotel bedroom', 'bed room interior design'] },
  { key: 'room-twin', must: ['room', 'bed', 'twin', 'hotel'],
    q: ['hotel room twin beds', 'two beds hotel room', 'bedroom two beds'] },
  { key: 'room-deluxe', must: ['room', 'suite', 'bed', 'hotel', 'luxury'],
    q: ['luxury hotel room', 'hotel room window view', 'elegant bedroom'] },
  { key: 'room-junior', must: ['suite', 'room', 'living', 'sofa', 'hotel'],
    q: ['modern living room interior', 'hotel suite interior', 'apartment living room'] },
  { key: 'room-family', must: ['room', 'bed', 'hotel', 'family'],
    q: ['hotel room interior beds', 'guest room interior', 'bedroom interior modern'] },
  { key: 'room-penthouse', must: ['terrace', 'balcony', 'view'],
    q: ['balcony sea view chairs', 'terrace view railing', 'roof terrace view'] },

  { key: 'dining-fine', must: ['food', 'plate', 'dish', 'seafood', 'fish', 'restaurant'],
    q: ['plated seafood dish', 'gourmet plate restaurant', 'grilled fish plate'] },
  { key: 'dining-terrace', must: ['terrace', 'patio', 'veranda'],
    q: ['terrace chairs table view', 'patio furniture garden', 'veranda table chairs'] },
  { key: 'dining-rooftop', must: ['bar', 'cocktail', 'rooftop', 'drink', 'sunset'],
    q: ['bar interior wooden counter', 'cocktail glass bar', 'bar stools interior'] },
  { key: 'spa', must: ['spa', 'massage', 'towel', 'wellness', 'treatment'],
    q: ['spa massage room', 'spa treatment table', 'massage towels candle'] },

  { key: 'sail', must: ['sail', 'boat', 'yacht', 'sunset', 'sea'],
    q: ['sailboat sunset sea', 'yacht sunset water', 'sailing sunset'] },
  { key: 'wine', commons: true, must: ['wine', 'qvevri', 'vineyard', 'grape', 'cellar'],
    q: ['Georgian wine qvevri', 'wine glasses cellar', 'vineyard grapes Georgia'] },
  { key: 'cook', commons: true, must: ['khachapuri', 'khinkali', 'food', 'georgian', 'bread'],
    q: ['khachapuri Adjaruli', 'khinkali Georgian food', 'Georgian cuisine table'] },
  { key: 'hike', commons: true, must: ['garden', 'botanical', 'green', 'batumi', 'park'],
    q: ['Batumi botanical garden', 'Green Cape Batumi', 'Adjara green mountains'] },
  { key: 'snorkel', commons: true, must: ['waterfall', 'makhuntseti', 'bridge', 'river', 'adjara'],
    q: ['Makhuntseti waterfall', 'Adjara waterfall', 'Queen Tamar bridge Adjara'] },
  { key: 'market', commons: true, must: ['batumi', 'night', 'square', 'piazza', 'street'],
    q: ['Batumi Piazza night', 'Batumi night lights', 'Batumi square evening'] }
];

/* ---------- helpers ---------- */

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      // providers throttle hard; back off rather than hammer them
      await sleep(6000 * (i + 1));
      continue;
    }
    return null;
  }
  return null;
}

/** How well a title answers the query. Rejects anything unrelated. */
function score(title, must) {
  const t = (title || '').toLowerCase();
  let n = 0;
  for (const w of must) if (t.includes(w)) n++;
  return n;
}

async function fromOpenverse(q, must) {
  const url = 'https://api.openverse.org/v1/images/?' + new URLSearchParams({
    q, license: 'cc0,pdm', size: 'large', page_size: '20', mature: 'false'
  });
  const data = await getJSON(url);
  if (!data) return null;

  const scored = (data.results || [])
    .filter(r => r.url && (r.width || 0) >= 1300)
    .map(r => ({ r, s: score(r.title, must) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.r.width || 0) - (a.r.width || 0));

  if (!scored.length) return null;
  const r = scored[0].r;
  return {
    src: r.url, title: r.title || q, author: r.creator || 'Unknown',
    licence: (r.license || 'cc0').toUpperCase(),
    page: r.foreign_landing_url || r.url,
    provider: 'Openverse'
  };
}

async function fromCommons(q, must) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: q,
    gsrnamespace: '6', gsrlimit: '24', prop: 'imageinfo',
    iiprop: 'url|size|extmetadata', iiurlwidth: '2000'
  });
  const data = await getJSON(url);
  if (!data) return null;

  const cands = [];
  for (const p of Object.values(data.query?.pages || {})) {
    const ii = p.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    if ((ii.width || 0) < 1300) continue;
    if (!/\.(jpe?g|png)$/i.test(p.title)) continue;
    const m = ii.extmetadata || {};
    const lic = (m.LicenseShortName?.value || 'CC BY').replace(/<[^>]+>/g, '');
    if (/NC|ND/i.test(lic)) continue;              // not safe for commercial use
    const name = p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '');
    const s = score(name, must);
    if (!s) continue;
    cands.push({ s, w: ii.width, hit: {
      src: ii.thumburl, title: name,
      author: (m.Artist?.value || 'Unknown').replace(/<[^>]+>/g, '').trim().slice(0, 90),
      licence: lic, page: ii.descriptionurl || '', provider: 'Wikimedia Commons'
    } });
  }
  cands.sort((a, b) => b.s - a.s || b.w - a.w);
  return cands.length ? cands[0].hit : null;
}

/* ---------- run ---------- */

const credits = existsSync(join(OUT, 'credits.json'))
  ? JSON.parse(readFileSync(join(OUT, 'credits.json'), 'utf8'))
  : {};

let got = 0, skipped = 0;
const failed = [];

for (const slot of SLOTS) {
  if (only && slot.key !== only) continue;
  const file = join(OUT, slot.key + '.jpg');
  if (existsSync(file) && !force) { skipped++; continue; }

  const order = slot.commons ? [fromCommons, fromOpenverse] : [fromOpenverse, fromCommons];
  let hit = null;

  outer:
  for (const query of slot.q) {
    for (const provider of order) {
      try {
        hit = await provider(query, slot.must);
        await sleep(2000);
        if (hit) break outer;
      } catch { await sleep(900); }
    }
  }

  if (!hit) { failed.push(slot.key); console.log('  x ' + slot.key + '  (no relevant match)'); continue; }

  try {
    // Wikimedia throttles rapid file downloads harder than its API;
    // the fetch needs its own backoff, not just the search above.
    let buf = null, lastStatus = 0;
    for (let attempt = 0; attempt < 5 && !buf; attempt++) {
      if (attempt) await sleep(8000 * attempt);
      const res = await fetch(hit.src, {
        headers: { 'User-Agent': UA, 'Accept': 'image/*', 'Referer': 'https://commons.wikimedia.org/' }
      });
      lastStatus = res.status;
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    }
    if (!buf) throw new Error('HTTP ' + lastStatus + ' after 5 attempts');

    const w = slot.wide ? 1920 : 1400;
    const h = slot.wide ? 1080 : 1050;

    await sharp(buf).rotate()
      .resize(w, h, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 74, mozjpeg: true, progressive: true })
      .toFile(file);

    credits[slot.key] = {
      title: hit.title, author: hit.author, licence: hit.licence,
      page: hit.page, provider: hit.provider
    };
    got++;
    console.log('  + ' + slot.key.padEnd(16) + hit.licence.padEnd(14) + hit.title.slice(0, 44));
  } catch (e) {
    failed.push(slot.key);
    console.log('  x ' + slot.key + '  ' + e.message);
  }
  await sleep(500);
}

writeFileSync(join(OUT, 'credits.json'), JSON.stringify(credits, null, 2));
console.log('\nfetched ' + got + ', kept ' + skipped + ', failed ' + failed.length +
  (failed.length ? '\nstill missing: ' + failed.join(', ') : ''));
