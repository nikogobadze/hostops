/* ============================================================
   HostOps — what the property actually sells
   Restaurants, spa, experiences, amenities and the guest-facing
   copy. Shared by the admin panel and the public site so both
   always describe the same hotel.

   Magnolia House is a FICTIONAL hotel. The setting — Batumi, the
   Black Sea coast of Adjara — and the food, drink, landmarks and
   day trips around it are real, so the content reads true without
   standing in for any actual business.
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
        id: 'r_zghva',
        name: 'Zghva',
        tagline: 'The Black Sea, cooked simply',
        cuisine: 'Black Sea fish & Adjaran',
        art: 'dining-fine',
        description: 'Our sea-facing dining room takes whatever the Batumi boats land that morning — kefal, barabulka, black sea turbot — ' +
          'and does very little to it. Chef Nino Beridze grew up in Kobuleti and cooks the Adjaran way: butter, sulguni, smoke, and a long table.',
        dressCode: 'Smart casual',
        priceRange: '₾₾₾₾',
        avgPerPerson: 145,
        location: 'Seafront terrace, ground floor',
        slots: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
        seatsPerSlot: 26,
        hours: 'Dinner · 19:00 – 23:30, Tuesday to Sunday',
        closedDays: [1],
        highlights: [
          'Seven-course Colchian tasting menu with qvevri wine pairing',
          'Whole grilled fish carved at the table',
          'Cellar of 180 Georgian wines, most of them amber'
        ],
        signature: [
          { name: 'Grilled kefal, tkemali, wild herbs', price: 62 },
          { name: 'Black Sea turbot, walnut and pomegranate', price: 84 },
          { name: 'Acharuli khachapuri, the proper boat', price: 34 },
          { name: 'Tasting menu · seven courses', price: 210 }
        ]
      },
      {
        id: 'r_magnolia',
        name: 'Magnolia Terrace',
        tagline: 'All day, under the trees the hotel is named for',
        cuisine: 'Georgian, all-day dining',
        art: 'dining-terrace',
        description: 'Breakfast that runs long, lunch in the shade, and small plates into the evening. ' +
          'The magnolias here are older than the hotel, and in May the whole terrace smells of them.',
        dressCode: 'Come as you are',
        priceRange: '₾₾',
        avgPerPerson: 65,
        location: 'Garden, pool level',
        slots: ['07:30', '08:30', '09:30', '12:30', '13:30', '14:30', '19:30', '20:30'],
        seatsPerSlot: 38,
        hours: 'Daily · 07:00 – 22:30',
        closedDays: [],
        highlights: [
          'Breakfast with fresh nadughi, honey from Keda and hot shotis puri',
          'Khinkali folded to order from noon',
          'Children under six eat free'
        ],
        signature: [
          { name: 'Pkhali plate — spinach, beetroot, walnut', price: 26 },
          { name: 'Khinkali, beef and pork, per five', price: 24 },
          { name: 'Badrijani nigvzit', price: 22 },
          { name: 'Churchkhela and Kakhetian coffee', price: 16 }
        ]
      },
      {
        id: 'r_chacha',
        name: 'Chacha',
        tagline: 'Rooftop, sunset, and something strong',
        cuisine: 'Bar & Georgian small plates',
        art: 'dining-rooftop',
        description: 'Six floors up, with the Alphabet Tower to one side and the Lesser Caucasus behind. ' +
          'Chacha from Adjaran villages, amber wine by the glass, and a short list of things worth eating with your hands.',
        dressCode: 'Come as you are',
        priceRange: '₾₾',
        avgPerPerson: 55,
        location: 'Rooftop, sixth floor',
        slots: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
        seatsPerSlot: 20,
        hours: 'Daily · 17:00 – 01:00',
        closedDays: [],
        highlights: [
          'The best sunset on the Batumi boulevard',
          'Village chacha flight — five distillates from Adjara',
          'Live duduk and guitar on Friday and Saturday'
        ],
        signature: [
          { name: 'Village chacha flight, five pours', price: 45 },
          { name: 'Amber wine by the glass, rkatsiteli', price: 18 },
          { name: 'Sulguni fried in cornmeal', price: 21 },
          { name: 'Adjaran corn bread, mchadi, with cheese', price: 16 }
        ]
      }
    ];
  };

  /* ============================================================
     Spa — Tsqaro ("the spring")
     Four treatment rooms, so `roomsAvailable` caps each slot.
     ============================================================ */

  O.spa = function () {
    return {
      name: 'Tsqaro',
      tagline: 'Water, warmth, quiet',
      art: 'spa',
      description: 'A low, cool set of rooms beneath the garden, built around a heated sea-water pool and a proper steam room. ' +
        'Treatments use Black Sea salt, Adjaran honey, walnut oil and mountain herbs picked above Keda.',
      hours: 'Daily · 09:00 – 21:00',
      roomsAvailable: 4,
      slots: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'],
      facilities: [
        { name: 'Sea-water indoor pool', icon: 'wave', note: 'Heated to 32°C, open to all guests' },
        { name: 'Steam room & hot stone', icon: 'steam', note: 'In the Georgian bathhouse tradition' },
        { name: 'Finnish sauna', icon: 'steam', note: 'Dry heat, 85°C' },
        { name: 'Relaxation terrace', icon: 'sun', note: 'Loungers, mountain tea, no phones' },
        { name: 'Fitness studio', icon: 'activity', note: 'Open 24 hours to residents' }
      ],
      treatments: [
        { id: 'sp_1', name: 'Black Sea Deep Tissue', category: 'Massage', duration: 60, price: 250, description: 'Firm, methodical work through the back and shoulders with warm walnut oil.' },
        { id: 'sp_2', name: 'Black Sea Deep Tissue · extended', category: 'Massage', duration: 90, price: 350, description: 'The full ninety minutes, taking in legs and feet.' },
        { id: 'sp_3', name: 'Mountain Herb Unwind', category: 'Massage', duration: 60, price: 220, description: 'Slow, light pressure with thyme, wild mint and bay from the Adjaran hills.' },
        { id: 'sp_4', name: 'Sea Salt & Honey Ritual', category: 'Body', duration: 75, price: 290, description: 'Salt scrub, Keda honey wrap and a long rinse under warm rain.' },
        { id: 'sp_5', name: 'Pomegranate Renewing Facial', category: 'Face', duration: 50, price: 240, description: 'Pomegranate and walnut treatment for skin that has had too much sun and sea.' },
        { id: 'sp_6', name: 'Sunset Ritual for Two', category: 'Couples', duration: 90, price: 620, description: 'Side-by-side massage in the west room, sparkling Georgian wine afterwards on the terrace.' },
        { id: 'sp_7', name: 'Georgian Steam & Scrub', category: 'Thermal', duration: 45, price: 180, description: 'Steam, honey soap, a kisa mitt and cold water. Bracing, and exactly right after a mountain day.' },
        { id: 'sp_8', name: 'Sleep Ritual', category: 'Body', duration: 80, price: 320, description: 'Warm compresses, scalp work and a weighted blanket. Book it late.' }
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
        id: 'ex_sail', name: 'Sunset Sail on the Black Sea', art: 'sail',
        category: 'On the water', duration: 150, price: 170, capacity: 10,
        days: [2, 4, 6], time: '18:00', meeting: 'Batumi marina, 8 min walk',
        summary: 'Two and a half hours out past the lighthouse as the light goes gold.',
        description: 'We leave from the marina and sail south along the coast toward Gonio, drop anchor for a swim if the sea is kind, ' +
          'and come back in as the sun goes down behind the water. Sparkling wine and snacks aboard. No experience needed — but you can take the helm.',
        includes: ['Skipper and crew', 'Georgian sparkling wine and snacks', 'Swim stop', 'Towels']
      },
      {
        id: 'ex_wine', name: 'Qvevri Wine Tasting', art: 'wine',
        category: 'Food & drink', duration: 120, price: 130, capacity: 14,
        days: [3, 5], time: '17:00', meeting: 'The library lounge',
        summary: 'Six Georgian wines, most of them amber, poured by our sommelier.',
        description: 'Georgia has been making wine in buried clay qvevri for eight thousand years, and the amber wines that come out of them ' +
          'taste like nothing else. Levan pours six — a Kakhetian rkatsiteli, two saperavi reds, a skin-contact mtsvane and a sweet khvanchkara ' +
          'to finish — with sulguni, nadughi and walnut bread.',
        includes: ['Six tasting pours', 'Cheese and walnut bread', 'Tasting notes to take home']
      },
      {
        id: 'ex_cook', name: 'Khachapuri & Khinkali Class', art: 'cook',
        category: 'Food & drink', duration: 180, price: 200, capacity: 8,
        days: [1, 4], time: '11:00', meeting: 'Kitchen garden',
        summary: 'Shop the bazaar, fold the khinkali properly, build an Acharuli boat, then eat it.',
        description: 'Start at the Batumi bazaar picking out sulguni and herbs, walk back along the boulevard, then cook with Nino. ' +
          'You will learn to fold khinkali with the right number of pleats and to build the Acharuli boat so the egg sits properly. ' +
          'You eat what you make, at a long table, with wine.',
        includes: ['Bazaar walk', 'All ingredients', 'Lunch and wine', 'Recipe cards']
      },
      {
        id: 'ex_garden', name: 'Botanical Garden Morning', art: 'hike',
        category: 'Outdoors', duration: 180, price: 95, capacity: 12,
        days: [0, 1, 2, 3, 4, 5, 6], time: '08:00', meeting: 'Reception',
        summary: 'One of the great subtropical gardens, on the cliffs at Mtsvane Kontskhi, before the heat.',
        description: 'A short drive north to the Batumi Botanical Garden, where bamboo, eucalyptus and Japanese maple grow on cliffs ' +
          'above the sea. An easy walk with long views, ending at the beach below Green Cape. Back at the hotel for a late breakfast.',
        includes: ['Transfer both ways', 'Garden entry', 'Guide', 'Water and fruit']
      },
      {
        id: 'ex_mountain', name: 'Makhuntseti Falls & Adjaran Villages', art: 'snorkel',
        category: 'Outdoors', duration: 300, price: 240, capacity: 8,
        days: [2, 5, 0], time: '09:30', meeting: 'Reception',
        summary: 'Up the Adjaristsqali valley to the arched stone bridge, the waterfall, and lunch with a family.',
        description: 'An hour inland the coast turns into steep green mountains. We stop at the Makhuntseti waterfall and the ' +
          'Queen Tamar arch bridge, taste chacha at a village still, and eat lunch on a family balcony above the river.',
        includes: ['Transfer both ways', 'Guide', 'Village lunch', 'Chacha tasting']
      },
      {
        id: 'ex_town', name: 'Old Batumi & Piazza Evening', art: 'market',
        category: 'Culture', duration: 120, price: 80, capacity: 16,
        days: [6], time: '18:30', meeting: 'Reception',
        summary: 'The old town, the Piazza, the Alphabet Tower and the moving statue at dusk.',
        description: 'A gentle wander through the old quarter as the lights come on — the Astronomical Clock, the Piazza mosaics, ' +
          'the Alphabet Tower, and down the boulevard to watch Ali and Nino slide through one another at sunset. Coffee where the locals go.',
        includes: ['Guide', 'Coffee stop', 'Boulevard walk']
      }
    ];
  };

  /* ============================================================
     Hotel-wide amenities
     ============================================================ */

  O.amenities = function () {
    return [
      { name: 'On the boulevard', icon: 'wave', note: 'Private beach platform with loungers and service' },
      { name: 'Sea-view infinity pool', icon: 'wave', note: 'Heated, open 07:00 – 21:00' },
      { name: 'Tsqaro spa', icon: 'sparkle', note: 'Sea-water pool, steam room, four treatment rooms' },
      { name: 'Three kitchens and a rooftop bar', icon: 'coffee', note: 'From breakfast to the last chacha' },
      { name: 'Fast Wi-Fi throughout', icon: 'wifi', note: 'Free, and it works on the terrace' },
      { name: 'Valet parking & EV charging', icon: 'car', note: '₾45 per night, four charge points' },
      { name: 'Airport transfer', icon: 'car', note: 'Batumi is 15 minutes; Kutaisi 2 hours' },
      { name: 'Concierge', icon: 'key', note: 'Tables, tickets, drivers, mountain guides' },
      { name: '24-hour reception', icon: 'clock', note: 'Someone is always awake' },
      { name: 'Fitness studio', icon: 'activity', note: 'Open around the clock to residents' },
      { name: 'Library lounge', icon: 'book', note: 'Fireplace, honesty bar, no screens' },
      { name: 'Dogs welcome', icon: 'paw', note: '₾70 per stay, beds and bowls provided' }
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
        view: 'Black Sea view with balcony',
        blurb: 'A king bed facing the water and a balcony wide enough to actually sit on. The room most people mean when they picture this hotel.',
        highlights: ['King bed facing the sea', 'Private balcony with two chairs', 'Coffee machine and stocked mini bar']
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
        view: 'Panoramic sea and mountain view, private terrace',
        blurb: 'The whole top corner, with a terrace running its length and a view that takes in the bay one way and the Lesser Caucasus the other. Breakfast comes up here.',
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
        eyebrow: 'Batumi · Adjara · Georgia',
        headline: 'Salt on your skin,\nmountains behind you',
        sub: 'A thirty-room house on the Batumi boulevard, where the Black Sea is forty metres one way and the Caucasus starts twenty minutes the other.'
      },
      story: {
        title: 'Between the sea and the mountains',
        body: [
          'Magnolia House has been a hotel since 1974, when it opened as a nine-room guesthouse behind the magnolias that give it its name. ' +
          'It is bigger now, but only just — thirty rooms, three kitchens, a spa cut into the slope below the garden, and the same stretch of boulevard.',
          'Batumi is a strange and wonderful town: subtropical, half Soviet and half brand new, with palm trees, a bazaar, an opera house ' +
          'and mountains that start where the streets end. We are close enough to walk to all of it and far enough down the boulevard to sleep.'
        ],
        stats: [
          { value: '30', label: 'rooms and suites' },
          { value: '1974', label: 'welcoming guests since' },
          { value: '40 m', label: 'to the water' },
          { value: '9.4', label: 'guest rating' }
        ]
      },
      testimonials: [
        { quote: 'We came for three nights and moved things around at work to stay for six. The balcony, the light off the sea in the morning, the fish at Zghva — all of it.', name: 'Hanna & Piet', from: 'Amsterdam', stayed: 'Deluxe King, June' },
        { quote: 'Staff who remember your name by the second morning without making a performance of it. Our two kids lived in the pool. Faultless.', name: 'The Okonkwo family', from: 'London', stayed: 'Family Room, August' },
        { quote: 'Steam room, then a cold plunge, then chacha on the roof at six while the sun went down. I have thought about that sequence most weeks since.', name: 'Ketevan Abashidze', from: 'Tbilisi', stayed: 'Junior Suite, September' }
      ],
      faq: [
        { q: 'What time can I check in and out?', a: 'Rooms are ready from 15:00 and we ask you to check out by 11:00. Both are flexible when the house allows — just ask, and we will do what we can.' },
        { q: 'Is breakfast included?', a: 'It is an optional extra you can add when booking, served at Magnolia Terrace from 07:00 to 11:00. Penthouse suites include breakfast in the room.' },
        { q: 'How do I get there?', a: 'Batumi International is fifteen minutes by car and we will meet you there. Kutaisi is two hours, Tbilisi about six by road or an hour by air. The train from Tbilisi takes five hours and is genuinely pleasant.' },
        { q: 'Can I cancel?', a: 'Free cancellation until 48 hours before arrival on standard rates. Prepaid rates are non-refundable but can be moved once to any date within twelve months.' },
        { q: 'Are dogs allowed?', a: 'Yes, in every room type except the penthouse suites, for ₾70 per stay. Beds, bowls and a towel for sandy paws are provided.' },
        { q: 'When is the best time to come?', a: 'May and June for the magnolias and an empty beach, September for warm sea and no crowds. July and August are hot and busy. Winter is quiet, green and surprisingly mild — and the mountains have snow.' }
      ],
      location: {
        address: 'Sherif Khimshiashvili St 17, Batumi 6010, Adjara, Georgia',
        getting: [
          { mode: 'Batumi (BUS)', detail: '15 minutes by car · transfer from ₾60' },
          { mode: 'Kutaisi (KUT)', detail: '2 hours by car · transfer from ₾280' },
          { mode: 'By train', detail: 'Batumi Central from Tbilisi, 5 hours — we collect you' },
          { mode: 'By car', detail: 'Valet parking ₾45 per night, four EV charge points' }
        ],
        nearby: [
          'Batumi Boulevard and the beach — at the door',
          'Ali and Nino moving sculpture — 10 min walk',
          'The Piazza and old town — 15 min walk',
          'Batumi Botanical Garden, Green Cape — 20 min by car'
        ]
      }
    };
  };

  global.Offerings = O;
})(window);
