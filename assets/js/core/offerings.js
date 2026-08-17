/* ============================================================
   HostOps — what the property actually sells
   Restaurants, spa, experiences, amenities and the guest-facing
   copy. Shared by the admin panel and the public site so both
   always describe the same hotel.
   ============================================================ */
(function (global) {
  'use strict';

  const O = {};

  /* ============================================================
     Restaurants
     `seatsPerSlot` is what the table-booking engine sells.
     ============================================================ */

  O.restaurants = function () {
    return [
      {
        id: 'r_marea',
        name: 'Marea',
        tagline: 'Seafood, salt air and a long sunset',
        cuisine: 'Mediterranean seafood',
        art: 'dining-fine',
        description: 'Our flagship dining room sits right on the water, so close that the terrace rail is the only thing between you and the sea. ' +
          'Chef Nuria Bassols cooks what the Blanes boats land that morning — grilled turbot, red prawns from Palamós, rice cooked over embers.',
        dressCode: 'Smart casual',
        priceRange: '€€€€',
        avgPerPerson: 78,
        location: 'Seafront terrace, ground floor',
        slots: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
        seatsPerSlot: 26,
        hours: 'Dinner · 19:00 – 23:00, Tuesday to Sunday',
        closedDays: [1],
        highlights: [
          'Seven-course tasting menu with wine pairing',
          'Whole fish carved at the table',
          'Empordà and Priorat cellar, 240 references'
        ],
        signature: [
          { name: 'Palamós red prawn, embers, its own juices', price: 34 },
          { name: 'Turbot with sea fennel and burnt butter', price: 42 },
          { name: 'Arròs a la marinera for two', price: 58 },
          { name: 'Tasting menu · seven courses', price: 115 }
        ]
      },
      {
        id: 'r_terrassa',
        name: 'La Terrassa',
        tagline: 'All day, under the pines',
        cuisine: 'Mediterranean, all-day dining',
        art: 'dining-terrace',
        description: 'Breakfast until late lunch, then small plates into the evening. Shaded by the old pines in the garden, ' +
          'this is where the day starts slowly and where you come back in salt-stiff hair after a swim.',
        dressCode: 'Come as you are',
        priceRange: '€€',
        avgPerPerson: 34,
        location: 'Garden, pool level',
        slots: ['07:30', '08:30', '09:30', '12:30', '13:30', '14:30', '19:30', '20:30'],
        seatsPerSlot: 38,
        hours: 'Daily · 07:00 – 22:00',
        closedDays: [],
        highlights: [
          'Breakfast buffet with local pastries and cava',
          'Wood-fired flatbreads from noon',
          'Children eat free under six'
        ],
        signature: [
          { name: 'Pa amb tomàquet, Ibérico, aged manchego', price: 16 },
          { name: 'Flatbread, burrata, sun tomato, basil', price: 18 },
          { name: 'Catch of the day, grilled, lemon', price: 26 },
          { name: 'Crema catalana', price: 9 }
        ]
      },
      {
        id: 'r_sal',
        name: 'Sal',
        tagline: 'Rooftop, vermouth hour, the whole bay',
        cuisine: 'Cocktails & tapas',
        art: 'dining-rooftop',
        description: 'Four floors up, the coast opens out in both directions. Vermouth and olives at six, ' +
          'proper cocktails after dark, and a short menu of things worth eating with your hands.',
        dressCode: 'Come as you are',
        priceRange: '€€',
        avgPerPerson: 28,
        location: 'Rooftop, fourth floor',
        slots: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
        seatsPerSlot: 20,
        hours: 'Daily · 17:00 – 01:00',
        closedDays: [],
        highlights: [
          'Best sunset seat on this stretch of coast',
          'Vermut de la casa, poured from the barrel',
          'Live duo on Friday and Saturday'
        ],
        signature: [
          { name: 'Vermut de la casa, orange, olive', price: 7 },
          { name: 'Gilda skewers, three ways', price: 9 },
          { name: 'Gin tonic, rosemary and juniper', price: 13 },
          { name: 'Padrón peppers, sea salt', price: 8 }
        ]
      }
    ];
  };

  /* ============================================================
     Spa — Sal & Onda
     Four treatment rooms, so `roomsAvailable` caps each slot.
     ============================================================ */

  O.spa = function () {
    return {
      name: 'Sal & Onda',
      tagline: 'Salt, water, quiet',
      art: 'spa',
      description: 'A low, cool set of rooms beneath the garden, built around a sea-water pool and a proper hammam. ' +
        'Treatments use salt, seaweed and cold-pressed olive oil from twenty kilometres inland.',
      hours: 'Daily · 09:00 – 21:00',
      roomsAvailable: 4,
      slots: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'],
      facilities: [
        { name: 'Sea-water indoor pool', icon: 'wave', note: 'Heated to 32°C, open to all guests' },
        { name: 'Traditional hammam', icon: 'steam', note: 'Steam and scrub, sessions on the hour' },
        { name: 'Finnish sauna', icon: 'steam', note: 'Dry heat, 85°C' },
        { name: 'Relaxation terrace', icon: 'sun', note: 'Loungers, herbal tea, no phones' },
        { name: 'Fitness studio', icon: 'activity', note: 'Open 24 hours to residents' }
      ],
      treatments: [
        { id: 'sp_1', name: 'Mediterranean Deep Tissue', category: 'Massage', duration: 60, price: 95, description: 'Firm, methodical work through the back and shoulders with warm olive oil.' },
        { id: 'sp_2', name: 'Mediterranean Deep Tissue · extended', category: 'Massage', duration: 90, price: 135, description: 'The full ninety minutes, taking in legs and feet.' },
        { id: 'sp_3', name: 'Aromatherapy Unwind', category: 'Massage', duration: 60, price: 85, description: 'Slow, light pressure with rosemary, lavender and bitter orange.' },
        { id: 'sp_4', name: 'Sea Salt Body Ritual', category: 'Body', duration: 75, price: 110, description: 'Salt scrub, seaweed wrap and a long rinse under warm rain.' },
        { id: 'sp_5', name: 'Marine Hydrating Facial', category: 'Face', duration: 50, price: 90, description: 'Algae and hyaluronic treatment for skin that has had too much sun.' },
        { id: 'sp_6', name: 'Sunset Ritual for Two', category: 'Couples', duration: 90, price: 240, description: 'Side-by-side massage in the west room, cava afterwards on the terrace.' },
        { id: 'sp_7', name: 'Traditional Hammam', category: 'Thermal', duration: 45, price: 70, description: 'Steam, black soap, kessa glove and cold water. Bracing.' },
        { id: 'sp_8', name: 'Sleep Ritual', category: 'Body', duration: 80, price: 125, description: 'Warm compresses, scalp work and weighted blanket. Book it late.' }
      ]
    };
  };

  /* ============================================================
     Experiences — scheduled, capacity-limited
     `days` uses JS day numbers (0 = Sunday).
     ============================================================ */

  O.experiences = function () {
    return [
      {
        id: 'ex_sail', name: 'Sunset Sailing on the Costa Brava', art: 'sail',
        category: 'On the water', duration: 150, price: 65, capacity: 10,
        days: [2, 4, 6], time: '18:00', meeting: 'Hotel jetty',
        summary: 'Two and a half hours out on a classic wooden sloop as the light goes gold.',
        description: 'We leave from the hotel jetty and sail north along the cove line, drop anchor for a swim if the water is kind, ' +
          'and come back in as the sun goes down behind the headland. Cava and olives aboard. No experience needed — but you can take the helm.',
        includes: ['Skipper and crew', 'Cava and tapas aboard', 'Swim stop', 'Towels']
      },
      {
        id: 'ex_wine', name: 'Empordà Wine Tasting', art: 'wine',
        category: 'Food & drink', duration: 120, price: 48, capacity: 14,
        days: [3, 5], time: '17:00', meeting: 'Library lounge',
        summary: 'Six wines from the coast and the hills behind it, poured by our sommelier.',
        description: 'The Empordà has been making wine since the Greeks landed. Marc, our head sommelier, pours six — ' +
          'a sea-facing white, two garnatxa reds, an old-vine carinyena and a sweet garnatxa to finish — with cheese and anchovies from L\'Escala.',
        includes: ['Six tasting pours', 'Cheese and charcuterie', 'Tasting notes to take home']
      },
      {
        id: 'ex_paella', name: 'Paella Class with Chef Nuria', art: 'cook',
        category: 'Food & drink', duration: 180, price: 75, capacity: 8,
        days: [1, 4], time: '11:00', meeting: 'Kitchen garden',
        summary: 'Shop the market, build the sofrito, cook rice over fire, then eat it.',
        description: 'Start at the Blanes market picking out what is good that morning, walk back along the front, ' +
          'then cook a proper arròs over wood with Nuria. You eat what you make, at a long table, with wine.',
        includes: ['Market walk', 'All ingredients', 'Lunch and wine', 'Recipe cards']
      },
      {
        id: 'ex_hike', name: 'Camí de Ronda Coastal Walk', art: 'hike',
        category: 'Outdoors', duration: 180, price: 35, capacity: 12,
        days: [0, 1, 2, 3, 4, 5, 6], time: '08:00', meeting: 'Reception',
        summary: 'The old smugglers\' path along the cliffs, before the heat arrives.',
        description: 'An easy-to-moderate walk on the coastal path that links the coves, with two swimming stops. ' +
          'Roughly eight kilometres, some steps, good shoes needed. Back at the hotel for a late breakfast.',
        includes: ['Guide', 'Water and fruit', 'Swim stops', 'Transfer back']
      },
      {
        id: 'ex_snorkel', name: 'Snorkelling the Marine Reserve', art: 'snorkel',
        category: 'On the water', duration: 120, price: 55, capacity: 8,
        days: [2, 5, 0], time: '10:00', meeting: 'Hotel jetty',
        summary: 'Protected water, posidonia meadows, octopus if you are lucky.',
        description: 'A short boat ride to the protected stretch off Santa Cristina, where the sea grass is intact and the fish know it. ' +
          'Guided by a marine biologist who will tell you exactly what you just swam over.',
        includes: ['Boat transfer', 'Mask, snorkel and fins', 'Wetsuit if wanted', 'Marine guide']
      },
      {
        id: 'ex_market', name: 'Old Town & Market Morning', art: 'market',
        category: 'Culture', duration: 120, price: 30, capacity: 16,
        days: [6], time: '09:30', meeting: 'Reception',
        summary: 'The Saturday market, the botanical garden and the best coffee in town.',
        description: 'A gentle wander through Blanes as it wakes up — the fish auction, the Saturday market, ' +
          'the Marimurtra botanical garden on the cliff, and a stop for coffee and a xuixo where the locals go.',
        includes: ['Guide', 'Market tastings', 'Garden entry', 'Coffee stop']
      }
    ];
  };

  /* ============================================================
     Hotel-wide amenities
     ============================================================ */

  O.amenities = function () {
    return [
      { name: 'Direct beach access', icon: 'wave', note: 'Private stretch with loungers and service' },
      { name: 'Infinity pool', icon: 'wave', note: 'Sea-facing, heated, open 07:00 – 21:00' },
      { name: 'Sal & Onda spa', icon: 'sparkle', note: 'Sea-water pool, hammam, five treatment rooms' },
      { name: 'Three restaurants & a rooftop bar', icon: 'coffee', note: 'From breakfast to the last drink' },
      { name: 'Fast Wi-Fi throughout', icon: 'wifi', note: 'Free, and it actually works on the terrace' },
      { name: 'Valet parking & EV charging', icon: 'car', note: '€22 per night, four charge points' },
      { name: 'Airport transfer', icon: 'car', note: 'Barcelona or Girona, arranged by concierge' },
      { name: 'Concierge', icon: 'key', note: 'Tables, tickets, boats and babysitters' },
      { name: '24-hour reception', icon: 'clock', note: 'Someone is always awake' },
      { name: 'Fitness studio', icon: 'activity', note: 'Open around the clock to residents' },
      { name: 'Library lounge', icon: 'book', note: 'Fireplace, honesty bar, no screens' },
      { name: 'Dogs welcome', icon: 'paw', note: '€25 per stay, beds and bowls provided' }
    ];
  };

  /* ============================================================
     Guest-facing copy for each room type, keyed by type code
     ============================================================ */

  O.roomCopy = function () {
    return {
      STD: {
        art: 'room-standard',
        view: 'Garden or courtyard',
        blurb: 'Calm, uncluttered and quiet, with a deep bed and a proper desk. Our smallest room, and the one repeat guests keep asking for.',
        highlights: ['Queen bed with linen sheets', 'Walk-in rain shower', 'Garden or courtyard outlook']
      },
      TWN: {
        art: 'room-twin',
        view: 'Garden, some with sea glimpse',
        blurb: 'Two full singles that can be pushed together, a little more floor space, and a reading chair by the window.',
        highlights: ['Two single beds, joinable', 'Reading chair and lamp', 'Extra wardrobe space']
      },
      DLX: {
        art: 'room-deluxe',
        view: 'Sea view with balcony',
        blurb: 'A king bed facing the water and a balcony wide enough to actually sit on. The room most people mean when they picture this hotel.',
        highlights: ['King bed facing the sea', 'Private balcony with two chairs', 'Nespresso and a stocked mini bar']
      },
      JRS: {
        art: 'room-junior',
        view: 'Sea view, corner balcony',
        blurb: 'A corner suite with a separate sitting area and a bath you can see the sea from. Good for long stays and slow mornings.',
        highlights: ['Separate lounge with sofa bed', 'Freestanding bath with sea view', 'Wraparound corner balcony']
      },
      FAM: {
        art: 'room-family',
        view: 'Garden, pool side',
        blurb: 'Two connected sleeping areas so nobody has to whisper. Steps from the pool, with a terrace that takes a pram and a pile of towels.',
        highlights: ['Sleeps four comfortably', 'Two bathrooms', 'Ground-floor terrace by the pool']
      },
      PEN: {
        art: 'room-penthouse',
        view: 'Panoramic sea view, private terrace',
        blurb: 'The whole top floor corner, with a terrace that runs the length of it and a view that takes in the bay end to end. Breakfast comes up here.',
        highlights: ['78 m² with a 30 m² private terrace', 'Outdoor bath and day bed', 'Breakfast served in the suite']
      }
    };
  };

  /* ============================================================
     Marketing copy
     ============================================================ */

  O.siteContent = function () {
    return {
      hero: {
        eyebrow: 'Blanes · Costa Brava',
        headline: 'Salt on your skin,\nnowhere to be',
        sub: 'A thirty-room house on the water, where the day is shaped by the tide, the long lunch and the walk back up from the beach.'
      },
      story: {
        title: 'A small house on a big sea',
        body: [
          'Casa Marea has been a hotel since 1961, when the Ferrer family opened eight rooms above a fisherman\'s bar. ' +
          'It is bigger now, but only just — thirty rooms, three restaurants, a spa cut into the rock below the garden, and the same stretch of beach.',
          'We are close enough to Barcelona for a long weekend and far enough that nobody finds you. The pine shade, the sea-water pool ' +
          'and a kitchen that cooks whatever came off the boats that morning do most of the work. The rest is up to you.'
        ],
        stats: [
          { value: '30', label: 'rooms and suites' },
          { value: '1961', label: 'welcoming guests since' },
          { value: '40 m', label: 'to the water' },
          { value: '9.4', label: 'guest rating' }
        ]
      },
      testimonials: [
        { quote: 'We came for three nights and moved things around at work to stay for six. The balcony, the light in the morning, the fish at Marea — all of it.', name: 'Hannah & Piet', from: 'Amsterdam', stayed: 'Deluxe King, June' },
        { quote: 'Staff who remember your name by the second morning without making a performance of it. Our two kids lived in the pool. Faultless.', name: 'The Okonkwo family', from: 'London', stayed: 'Family Room, August' },
        { quote: 'The hammam and then a cold plunge and then a vermouth on the roof at six. I have thought about that sequence most weeks since.', name: 'Clara Roig', from: 'Girona', stayed: 'Junior Suite, September' }
      ],
      faq: [
        { q: 'What time can I check in and out?', a: 'Rooms are ready from 15:00 and we ask you to check out by 11:00. Both are flexible when the house allows — just ask, and we will do what we can.' },
        { q: 'Is breakfast included?', a: 'It is an optional extra you can add when booking, served at La Terrassa from 07:00 to 11:00. Penthouse suites include breakfast in the room.' },
        { q: 'How do I get there?', a: 'Ninety minutes from Barcelona airport, forty from Girona. Our concierge arranges a car for either, or take the train to Blanes and we will meet you at the station.' },
        { q: 'Can I cancel?', a: 'Free cancellation until 48 hours before arrival on standard rates. Prepaid rates are non-refundable but can be moved once to any date within twelve months.' },
        { q: 'Are dogs allowed?', a: 'Yes, in every room type except the penthouse suites, for €25 per stay. Beds, bowls and a towel for sandy paws are provided.' },
        { q: 'Do you have family rooms?', a: 'Our Family Rooms sleep four across two connected sleeping areas and sit at ground level beside the pool. Cots are free, and under-sixes eat free at La Terrassa.' }
      ],
      location: {
        address: 'Passeig del Mar 42, 17300 Blanes, Girona, Spain',
        getting: [
          { mode: 'Barcelona (BCN)', detail: '90 minutes by car · transfer from €120' },
          { mode: 'Girona (GRO)', detail: '40 minutes by car · transfer from €75' },
          { mode: 'By train', detail: 'Blanes station, then 6 minutes — we collect you' },
          { mode: 'By car', detail: 'Valet parking €22 per night, four EV charge points' }
        ],
        nearby: [
          'Marimurtra Botanical Garden — 12 min walk',
          'Blanes Saturday market — 8 min walk',
          'Santa Cristina cove — 25 min on the coastal path',
          'Tossa de Mar old town — 20 min by car'
        ]
      }
    };
  };

  global.Offerings = O;
})(window);
