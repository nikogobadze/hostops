# Magnolia House — hotel website + HostOps management panel

Two front doors onto **one hotel**, sharing one dataset:

| | |
|---|---|
| **`site.html`** | The **public website**. Guests browse rooms, dining, spa and experiences, and book — rooms, restaurant tables, treatments and activities |
| **`index.html`** | **HostOps**, the staff panel. Rooms, reservations, front desk, housekeeping, room service, mini bar, availability calendar, channel sync |

A booking made on the website appears in the staff panel **immediately** — as a `direct`
reservation on the calendar, with its table and spa bookings on the Guest Services board.
Nothing is duplicated: both halves read and write the same store.

**No build step, no server, no dependencies.** Open either file in a browser and it runs.

---

## Getting started

Double-click **`site.html`** (guest side) or **`index.html`** (staff side), or serve the folder:

```bash
npx serve .          # or: python -m http.server 8080
```

The first run generates a demo property — *Magnolia House*, a 30-room seafront hotel in Blanes on
the the Black Sea coast, with ~800 reservations spanning 45 days back to 75 days forward — built around
**today's date**, so the board always opens with real arrivals to check in and departures to
settle. Everything after that is your data, saved to `localStorage`.

> Opening straight from `file://` works, but some browsers block `localStorage` there. The app
> detects this, warns once, and keeps running in memory for the session. Serving over `http://`
> avoids it entirely.

### Local development

Use the bundled server rather than `python -m http.server`:

```bash
python serve.py          # http://localhost:8080
```

Python's stock server sends only `Last-Modified` with no `Cache-Control`, which lets Chrome
apply *heuristic caching* and keep serving a stale `.js` after you edit it — which shows up as
`Domain.<something> is not a function`. `serve.py` sends `no-store`, so a plain refresh always
picks up the latest files. Assets are also versioned (`?v=…` in the HTML), so a cached copy can
never be paired with newer code. **Bump that token in `index.html` and `site.html` whenever you
ship a change.**

---

## Deploying

The project is pure static files — no build step — so any static host works.

```bash
vercel login     # once
vercel --prod    # deploy
```

`vercel.json` sets the routing and caching:

| Path | Serves |
|---|---|
| `/` | the guest website |
| `/admin` | the staff panel |
| everything | `Cache-Control: public, max-age=0, must-revalidate` |

That cache header is deliberate. These are small files behind a CDN, and always revalidating
costs almost nothing — while a stale asset paired with fresh HTML breaks the app outright.

---

## The guest website

| Page | What a guest can do |
|---|---|
| **Home** | The hotel's story, room highlights, what is on the property, guest reviews — with the date/guest search bar in the hero and again at the foot |
| **Rooms & Suites** | Live availability for chosen dates, filters (sea view, balcony, bathtub, sofa bed, coffee machine), sort by price/size/capacity, per-night price breakdown, and a room detail sheet. Sold-out dates offer the next available window rather than a dead end |
| **Dining** | Three restaurants with menus, hours, dress code and average spend. Table booking checks real seat capacity per sitting; a closed night offers the next open one |
| **Spa** | Facilities plus a treatment menu filtered by category. Booking respects the four treatment rooms, so slots genuinely run out |
| **Experiences** | Sailing, wine tasting, a paella class, coastal walks, snorkelling, a market morning — each with its own running days and group cap |
| **Checkout** | One page, not a wizard: room, extras (breakfast, parking, dog, late check-out, airport transfer), optional table/treatment/experience, guest details, pay-at-hotel or prepay-and-save-10%. A running total updates with every change |
| **My booking** | Look up by reference + surname; see the stay and everything booked alongside it; add more; cancel a service or the whole booking within policy |

**The search dates follow you** across every page in `sessionStorage`, so a guest sets them once.

### Imagery

26 photographs, sourced through the **Openverse** and **Wikimedia Commons** public APIs and
committed to `assets/img`. Batumi-specific shots — the seaside park, the boulevard, Makhuntseti
falls, khachapuri, the botanical garden, a qvevri — come from Commons; generic interiors come
from Openverse filtered to CC0 and public domain.

Nothing is scraped. Results are scored against the query before being accepted, and the whole
set was reviewed as a contact sheet, because a relevance score cannot tell you whether a
photograph is any good. CC BY and CC BY-SA images carry a real attribution obligation, so every
one is listed at **/credits**, linked from the footer.

```bash
npm run photos            # fetch anything missing
node scripts/fetch-photos.mjs --force   # re-fetch everything
```

`Art.scene(key)` serves the photo when one exists and falls back to a **generated SVG scene**
(`assets/js/site/art.js`) when it does not, so a missing file degrades quietly instead of
leaving a hole.

---

## The staff panel

| Screen | What you can do |
|---|---|
| **Overview** | Occupancy, ADR, RevPAR and posted revenue with week-on-week deltas · 14-day occupancy trend · 14-day on-the-books forecast · today's arrivals and departures with one-click check-in/out · housekeeping status · distribution mix · live activity feed |
| **Availability** | Rooms × dates timeline, 7–30 day window, grouped by floor. Stay bars coloured by channel; click one to open the reservation, click an empty cell to start a booking on that room and date. Out-of-order blocks are hatched out |
| **Front Desk** | Arrivals / Departures / In-house. Check-in captures registration details, lets you switch rooms, sets key-card count and opens the folio. Check-out shows the full folio, warns about open room-service orders and a mini bar below par, settles the balance and releases the room for cleaning |
| **Reservations** | Full CRUD with live availability checking, a running price quote (nights + breakfast + VAT + city tax), guest folio with charges and payments, room moves, cancellation, CSV export and a print-ready invoice |
| **Rooms & Types** | Room CRUD, status control, out-of-order scheduling with clash detection, per-room detail (current guest, arrivals next, mini bar, housekeeping). Room types carry rate, capacity, size and amenities, and are what gets published to channels |
| **Housekeeping** | Task board (to do / in progress / serviced) plus a room-status floor plan. Auto-assign spreads open tasks across attendants; rebuilding the list generates tasks from today's departures and stayovers. Flags rooms that are blocking an arriving guest |
| **Room Service** | Kanban from received → kitchen → delivered. Delivering an order posts every line to the guest's folio automatically. Menu management with prices and prep times |
| **Mini Bar** | Per-room stock against par levels, consumption posting straight to the folio, voiding (which returns stock), bulk restock of vacant rooms, and product margin/velocity reporting |
| **Guest Services** | Every table, treatment and experience booked — from the website or in house — grouped by date, with a source badge so you can see what the site is bringing in, and one-click cancellation |
| **Guests** | Directory with segments (in house, arriving, VIP, repeat, marketing opt-in), lifetime value, stay history, preferences and CSV export |
| **Channel Manager** | Booking.com and Airbnb connections with credentials, commission, and per-direction toggles (pull reservations / push availability / push rates). Manual and automatic sync, room-type mapping, rate-parity checks, 7-day inventory view and a full sync log |
| **Settings** | Property details, check-in/out times, VAT, city tax, breakfast price, currency, team roster, theme, and JSON backup/import/reset |

---

## How the pieces fit

```
index.html                   staff panel
site.html                    guest website
└── assets/
    ├── css/
    │   ├── tokens.css       staff design tokens — brand ramps, chart slots, dark theme
    │   ├── app.css          staff layout and components
    │   └── site.css         guest design system (warm sand, serif display)
    └── js/
        ├── core/            shared by both front doors
        │   ├── utils.js     dates, money, DOM and collection helpers
        │   ├── icons.js     inline SVG icon set
        │   ├── offerings.js what the hotel sells — restaurants, spa, experiences, copy
        │   ├── seed.js      deterministic demo-property generator
        │   ├── store.js     state, localStorage persistence, pub/sub
        │   ├── ui.js        modals, toasts, confirms, form helpers
        │   ├── charts.js    dependency-free SVG charts (staff panel only)
        │   └── domain.js    availability, occupancy maths, folios, check-in/out,
        │                    channel sync, and the public booking engines
        ├── views/           one file per staff screen
        ├── app.js           staff boot, hash router, auto-sync
        └── site/
            ├── art.js       generated SVG scenery
            ├── parts.js     shared guest-site markup (search bar, hero, cards, footer)
            ├── views/       one file per guest page
            └── app.js       guest boot, hash router, search state, basket
```

Both halves share `core/`. `ui.js` emits the same class names in both, and `site.css`
restyles them for the guest register — so the modal, toast and form code is written once.

**Views are presentational.** Anything that changes data goes through `Store.update(reason, fn)`,
which mutates, persists and notifies — so every open screen re-renders from one source of truth.
Business rules live in `domain.js`, never in a view.

### Dates

Every date is a plain `'YYYY-MM-DD'` string, parsed to **local** midnight. Nothing is ever run
through UTC, so no stay shifts by a day across a timezone or DST boundary. Stays are
**half-open** `[checkIn, checkOut)` — the departure day is immediately sellable, which is what
makes same-day turnovers work correctly everywhere.

### Money

Charges accumulate on a folio (accommodation per night, breakfast, room service, mini bar,
manual charges), payments post as negatives, and VAT is applied on top of net charges.
`Domain.folioTotals()` is the single place the balance is computed — check-out, the departures
list, the invoice and the dashboard all read from it, so they cannot disagree.

---

## Channel integration

The Booking.com and Airbnb connections are **fully simulated in the browser** — there is no
network call, because a real integration needs server-side credentials and signed requests
that cannot live in a public page.

What *is* real is the shape of it. `Domain.syncChannel()` runs a genuine cycle: push
availability, push rates, pull reservations, then apply upstream modifications and
cancellations. Pulled reservations are validated against live availability and rejected with a
logged warning when the property is full, new guest profiles are created, commission is
recorded, and everything lands in the sync log. Auto-sync runs on a timer while the app is open.

To connect a real channel, replace the body of `Domain.syncChannel()` with calls to your
backend. The seam is deliberately narrow — everything else in the app already treats OTA
reservations as first-class.

---

## Design notes

The two halves are deliberately different registers of the same brand. The **guest site** is
warm sand, a serif display face, generous air and soft depth — it is selling rest. The **staff
panel** is a cool, dense, information-first grey. Coral and sea blue run through both, so they
read as one company.

The palette is **coral** (action, occupancy, anything the administrator does) and **sky blue**
(information, flow, anything the system reports), on a cool neutral base.

Dark mode is a **selected** palette, not an inverted one: every chart slot has its own step
chosen for the dark surface. Both sets were checked with the data-viz validator for
colour-vision separation and contrast against the surface they actually render on:

| Slot | Light (`#FFFFFF`) | Dark (`#131C25`) |
|---|---|---|
| 1 · sky | `#1583C9` | `#2A8FCC` |
| 2 · coral | `#F2603F` | `#E45E3F` |
| 3 · aqua | `#12A594` | `#0E9C8B` |
| 4 · violet | `#6B4FD8` | `#7C6BDD` |
| 5 · amber | `#D98B00` | `#C08616` |

Both pass the lightness band, chroma floor, adjacent-pair CVD separation and normal-vision
floor. Amber sits below 3:1 on the light surface, so any chart using it ships visible labels
and a table view rather than relying on the colour alone. Channel identity (Direct / Booking.com
/ Airbnb) is carried by a coloured swatch **beside** text, never by colouring the text itself,
and every chart has a hover tooltip plus a legend.

Charts are hand-rolled SVG: ≤24px marks with a 4px rounded data-end, 2px lines, hairline
gridlines, and a 2px surface gap between touching fills — including between adjacent stay bars
on the calendar.

---

## Keyboard

| Key | Action |
|---|---|
| <kbd>/</kbd> | Focus the global search (guests, rooms, reservation references) |
| <kbd>Esc</kbd> | Close the open dialog |
| <kbd>Enter</kbd> | Open the first search result |

---

## Data

Everything lives in `localStorage` under `hostops:v1`. **Settings → Data** exports a JSON
backup, imports one back, regenerates the demo property around today, or erases everything.
There is no account, no server and nothing leaves the browser.

If a saved dataset is opened days later, HostOps rolls it forward on load — stays whose window
has fully passed are closed out, and confirmed reservations that never arrived become no-shows —
so the board is never stale. A guest whose departure day *is* today stays in house until the
front desk actually checks them out.

---

## Known limits

- Single administrator; there are no user accounts, roles or an audit trail.
- Channel sync is simulated (see above). Rate-parity figures are derived from commission, not
  from scraped live OTA rates.
- Rate management is a base rate plus a weekend uplift — no seasons, length-of-stay pricing or
  yield rules.
- Storage is per-browser and capped by the `localStorage` quota (a few MB), which is far more
  than this dataset needs but is not a database.
