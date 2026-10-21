/* Gather & Glow — event templates, category config and demo content.
 * Everything here is fictional demo content. Vendor records are explicitly marked
 * `sample: true` and are never presented as real or verified businesses. */
(function () {
  'use strict';
  const GG = window.GG;
  const { addDays, today, toISO } = GG;

  const EVENT_TYPES = [
    {
      id: 'wedding',
      label: 'Wedding',
      icon: 'rings',
      blurb: 'Ceremony, reception and the many moving parts between.',
      accent: 'plum',
      defaultGuestCount: 180,
    },
    {
      id: 'birthday',
      label: 'Birthday',
      icon: 'cake',
      blurb: 'Milestone parties, surprise dinners and kid-friendly chaos.',
      accent: 'gold',
      defaultGuestCount: 45,
    },
    {
      id: 'community',
      label: 'Community event',
      icon: 'community',
      blurb: 'Festivals, fundraisers, cultural nights and neighbourhood gatherings.',
      accent: 'forest',
      defaultGuestCount: 250,
    },
    {
      id: 'other',
      label: 'Other celebration',
      icon: 'sparkle',
      blurb: 'Anniversaries, showers, reunions — anything worth gathering for.',
      accent: 'forest',
      defaultGuestCount: 60,
    },
  ];

  const BUDGET_CATEGORIES = [
    { id: 'venue', label: 'Venue & rentals', icon: 'store', tone: '#1F4A3A' },
    { id: 'food', label: 'Food & catering', icon: 'cup', tone: '#8C4A2F' },
    { id: 'decor', label: 'Décor & flowers', icon: 'flower', tone: '#B08A4F' },
    { id: 'photography', label: 'Photography & video', icon: 'camera', tone: '#3B5D72' },
    { id: 'entertainment', label: 'Entertainment & music', icon: 'music', tone: '#6B3F63' },
    { id: 'attire', label: 'Attire & beauty', icon: 'shirt', tone: '#9A5B63' },
    { id: 'transport', label: 'Transport & stay', icon: 'car', tone: '#5C6B4A' },
    { id: 'stationery', label: 'Invitations & print', icon: 'envelope', tone: '#7A6A55' },
    { id: 'favors', label: 'Gifts & favors', icon: 'gift', tone: '#A9722F' },
    { id: 'contingency', label: 'Contingency', icon: 'shield', tone: '#6E6459' },
  ];

  /** Suggested split of the total budget, by event type (sums to 100). */
  const BUDGET_SPLIT = {
    wedding: { venue: 25, food: 30, decor: 12, photography: 9, entertainment: 6, attire: 6, transport: 3, stationery: 2, favors: 2, contingency: 5 },
    birthday: { venue: 20, food: 26, decor: 14, photography: 8, entertainment: 12, attire: 4, transport: 3, stationery: 3, favors: 5, contingency: 5 },
    community: { venue: 22, food: 28, decor: 10, photography: 6, entertainment: 14, attire: 2, transport: 5, stationery: 4, favors: 4, contingency: 5 },
    other: { venue: 22, food: 28, decor: 12, photography: 8, entertainment: 8, attire: 5, transport: 4, stationery: 3, favors: 5, contingency: 5 },
  };

  /* ---------------- planning timeline templates ---------------- */
  /* offset = days BEFORE the event date */
  const TASK_TEMPLATES = {
    wedding: [
      { offset: 210, title: 'Shortlist and book the venue, pay the holding deposit', category: 'venue', priority: 'high' },
      { offset: 195, title: 'Agree the total budget and open a tracking sheet', category: 'budget', priority: 'high' },
      { offset: 180, title: 'Draft the guest list with family and confirm headcount estimate', category: 'guests', priority: 'high' },
      { offset: 165, title: 'Hire photographer and videographer, sign the contract', category: 'photography', priority: 'high' },
      { offset: 150, title: 'Book caterer and schedule the menu tasting', category: 'food', priority: 'high' },
      { offset: 140, title: 'Finalise décor theme and mood board with the florist', category: 'decor', priority: 'medium' },
      { offset: 125, title: 'Order invitations and save-the-dates', category: 'stationery', priority: 'medium' },
      { offset: 118, title: 'Start attire shopping and book first fittings', category: 'attire', priority: 'medium' },
      { offset: 100, title: 'Send save-the-dates to out-of-town guests', category: 'stationery', priority: 'low' },
      { offset: 85, title: 'Book entertainment — band, DJ or traditional musicians', category: 'entertainment', priority: 'medium' },
      { offset: 70, title: 'Mail invitations and open the RSVP form', category: 'stationery', priority: 'high' },
      { offset: 55, title: 'Arrange guest transport, valet and hotel blocks', category: 'transport', priority: 'medium' },
      { offset: 45, title: 'Chase RSVPs and build the seating plan', category: 'guests', priority: 'high' },
      { offset: 35, title: 'Confirm final headcount and meal counts with caterer', category: 'food', priority: 'high' },
      { offset: 28, title: 'Final fittings, makeup trial and beauty appointments', category: 'attire', priority: 'low' },
      { offset: 21, title: 'Share the run-of-show with every vendor', category: 'logistics', priority: 'high' },
      { offset: 14, title: 'Agree the final payment schedule and keep cash envelopes ready', category: 'budget', priority: 'high' },
      { offset: 7, title: 'Pack the day-of emergency kit (pins, tape, spare shoes, snacks)', category: 'logistics', priority: 'low' },
      { offset: 2, title: 'Décor walkthrough and ceremony rehearsal', category: 'decor', priority: 'high' },
      { offset: 0, title: 'Event day — hand the timeline to a trusted point person', category: 'logistics', priority: 'high' },
    ],
    birthday: [
      { offset: 120, title: 'Pick a date and lock the venue or home-setup plan', category: 'venue', priority: 'high' },
      { offset: 110, title: 'Set the budget and decide guest count', category: 'budget', priority: 'high' },
      { offset: 95, title: 'Send a "save the date" to close friends and family', category: 'stationery', priority: 'low' },
      { offset: 80, title: 'Book the cake — confirm flavours and dietary options', category: 'food', priority: 'high' },
      { offset: 75, title: 'Plan the menu and book caterer or restaurant', category: 'food', priority: 'high' },
      { offset: 65, title: 'Choose a theme and order décor', category: 'decor', priority: 'medium' },
      { offset: 55, title: 'Book entertainment — magician, DJ, games host or craft corner', category: 'entertainment', priority: 'medium' },
      { offset: 45, title: 'Send invitations with RSVP deadline', category: 'stationery', priority: 'high' },
      { offset: 35, title: 'Order outfit and confirm it fits', category: 'attire', priority: 'low' },
      { offset: 28, title: 'Plan party games, music playlist and photo moments', category: 'entertainment', priority: 'medium' },
      { offset: 21, title: 'Collect RSVPs and note allergies or access needs', category: 'guests', priority: 'high' },
      { offset: 14, title: 'Order return gifts or party favours', category: 'favors', priority: 'low' },
      { offset: 10, title: 'Confirm final numbers with caterer and cake baker', category: 'food', priority: 'high' },
      { offset: 5, title: 'Buy candles, batteries, serving supplies and trash bags', category: 'logistics', priority: 'medium' },
      { offset: 2, title: 'Set up décor and test the playlist and speaker', category: 'decor', priority: 'medium' },
      { offset: 0, title: 'Party day — assign a photo-taker and a cake-cutter', category: 'logistics', priority: 'high' },
    ],
    community: [
      { offset: 150, title: 'Form a small organising committee with clear roles', category: 'logistics', priority: 'high' },
      { offset: 135, title: 'Define the purpose, audience and success measure', category: 'logistics', priority: 'high' },
      { offset: 120, title: 'Set budget, confirm funding and sponsorship plan', category: 'budget', priority: 'high' },
      { offset: 110, title: 'Book venue and check permits, insurance and safety norms', category: 'venue', priority: 'high' },
      { offset: 95, title: 'Recruit and brief volunteers', category: 'logistics', priority: 'high' },
      { offset: 85, title: 'Plan the programme schedule and confirm performers', category: 'entertainment', priority: 'high' },
      { offset: 75, title: 'Arrange catering with dietary and accessibility options', category: 'food', priority: 'high' },
      { offset: 60, title: 'Design posters, sign-up page and social announcements', category: 'stationery', priority: 'medium' },
      { offset: 45, title: 'Open registrations and track sign-ups', category: 'guests', priority: 'high' },
      { offset: 35, title: 'Confirm AV, sound, lighting and power backup', category: 'entertainment', priority: 'medium' },
      { offset: 28, title: 'Plan accessibility, parking, transport and signage', category: 'transport', priority: 'high' },
      { offset: 21, title: 'Confirm photographer or documentation volunteer', category: 'photography', priority: 'low' },
      { offset: 14, title: 'Run a full programme rehearsal and safety walkthrough', category: 'logistics', priority: 'high' },
      { offset: 7, title: 'Print signage, name badges and feedback forms', category: 'stationery', priority: 'medium' },
      { offset: 2, title: 'Brief volunteers with the day-of run sheet', category: 'logistics', priority: 'high' },
      { offset: 0, title: 'Event day — delegate, do not do everything yourself', category: 'logistics', priority: 'high' },
    ],
    other: [
      { offset: 120, title: 'Agree the date, guest count and budget', category: 'budget', priority: 'high' },
      { offset: 100, title: 'Book the venue and confirm timings', category: 'venue', priority: 'high' },
      { offset: 85, title: 'Plan food and drinks, including dietary options', category: 'food', priority: 'high' },
      { offset: 70, title: 'Choose a theme or décor direction', category: 'decor', priority: 'medium' },
      { offset: 55, title: 'Send invitations with RSVP details', category: 'stationery', priority: 'high' },
      { offset: 40, title: 'Book photography or ask a friend to document', category: 'photography', priority: 'medium' },
      { offset: 28, title: 'Confirm headcount and dietary needs', category: 'guests', priority: 'high' },
      { offset: 14, title: 'Confirm all vendor timings and payments', category: 'logistics', priority: 'high' },
      { offset: 3, title: 'Set up and do a final walkthrough', category: 'logistics', priority: 'medium' },
      { offset: 0, title: 'Enjoy the day — keep the plan light', category: 'logistics', priority: 'low' },
    ],
  };

  /** Planning milestones shown on the Overview — each has a predicate key resolved in store.js */
  const MILESTONES = {
    wedding: [
      { id: 'venue', label: 'Venue secured', check: 'vendorBooked:venue' },
      { id: 'food', label: 'Menu & caterer set', check: 'vendorBooked:food' },
      { id: 'photo', label: 'Photographer booked', check: 'vendorBooked:photography' },
      { id: 'invites', label: 'Invitations sent', check: 'taskDone:Mail invitations' },
      { id: 'guests', label: 'RSVPs collected', check: 'rsvpQuorum' },
      { id: 'budget', label: 'Budget on track', check: 'budgetOk' },
    ],
    birthday: [
      { id: 'venue', label: 'Venue or home plan set', check: 'vendorBooked:venue' },
      { id: 'cake', label: 'Cake ordered', check: 'taskMatch:cake' },
      { id: 'food', label: 'Menu confirmed', check: 'vendorBooked:food' },
      { id: 'invites', label: 'Invitations sent', check: 'taskMatch:Invitations' },
      { id: 'guests', label: 'RSVPs collected', check: 'rsvpQuorum' },
      { id: 'budget', label: 'Budget on track', check: 'budgetOk' },
    ],
    community: [
      { id: 'committee', label: 'Committee formed', check: 'taskMatch:committee' },
      { id: 'venue', label: 'Venue & permits', check: 'vendorBooked:venue' },
      { id: 'programme', label: 'Programme confirmed', check: 'taskMatch:programme' },
      { id: 'volunteers', label: 'Volunteers briefed', check: 'taskMatch:volunteers' },
      { id: 'guests', label: 'Registrations tracked', check: 'rsvpQuorum' },
      { id: 'budget', label: 'Budget on track', check: 'budgetOk' },
    ],
    other: [
      { id: 'venue', label: 'Venue confirmed', check: 'vendorBooked:venue' },
      { id: 'food', label: 'Food planned', check: 'vendorBooked:food' },
      { id: 'invites', label: 'Guests invited', check: 'taskMatch:invitation' },
      { id: 'guests', label: 'RSVPs collected', check: 'rsvpQuorum' },
      { id: 'budget', label: 'Budget on track', check: 'budgetOk' },
    ],
  };

  /* ---------------- vendor categories & question checklists ---------------- */
  const VENDOR_CATEGORIES = [
    { id: 'venue', label: 'Venue', icon: 'store' },
    { id: 'food', label: 'Catering', icon: 'cup' },
    { id: 'decor', label: 'Décor & flowers', icon: 'flower' },
    { id: 'photography', label: 'Photography', icon: 'camera' },
    { id: 'entertainment', label: 'Entertainment', icon: 'music' },
    { id: 'attire', label: 'Attire & beauty', icon: 'shirt' },
    { id: 'transport', label: 'Transport', icon: 'car' },
    { id: 'stationery', label: 'Stationery', icon: 'envelope' },
    { id: 'favors', label: 'Favors & gifts', icon: 'gift' },
    { id: 'catering_service', label: 'Other services', icon: 'sparkle' },
  ];

  const VENDOR_QUESTIONS = {
    venue: [
      'What is the total capacity, and how does it change for a seated dinner?',
      'Is there a backup space if it rains?',
      'What are the load-in and load-out timings for vendors?',
      'Is parking or valet included? Is the entrance step-free?',
      'What is the cancellation and date-change policy?',
      'Are there restrictions on outside catering, décor or alcohol?',
    ],
    food: [
      'What is the per-plate cost for each menu tier, including taxes?',
      'Can you handle Jain, vegan, gluten-free and allergy-safe plates?',
      'Is the tasting included, and when must the final count be confirmed?',
      'How many service staff will be assigned per 50 guests?',
      'Do you provide serving equipment, chafing dishes and crockery?',
      'What is the payment schedule and the deposit amount?',
    ],
    decor: [
      'Can you share a mood board and photos of setups at this exact venue?',
      'What is included — florals, lighting, drapery, furniture, installation?',
      'How much of the quote is fresh flowers versus rentals?',
      'When do you set up, and who dismantles afterwards?',
      'What happens if flowers of a certain variety are unavailable?',
    ],
    photography: [
      'How many photographers and videographers will cover the event?',
      'Can I see two full event galleries, not just highlights?',
      'How many hours are included, and what is the overtime rate?',
      'When will the edited gallery and film be delivered?',
      'Who owns the raw files, and how long are they archived?',
      'Is a second-shooter or drone add-on available?',
    ],
    entertainment: [
      'How long is each set, and how many breaks are included?',
      'Do you provide sound, lighting and a stage plot?',
      'Is there a sound limit or curfew at this venue?',
      'Can we share a must-play and do-not-play list?',
      'What is the travel and accommodation arrangement?',
    ],
    attire: [
      'What is the timeline for first fitting and final pickup?',
      'Are alterations included, and how many rounds?',
      'What is the cancellation or refund policy?',
      'Can you work with a style reference and fabric we bring?',
      'Do you offer trial sessions for hair and makeup?',
    ],
    transport: [
      'How many vehicles and seats are available, and at what hourly rate?',
      'Are drivers and fuel included?',
      'Can you handle multiple pickup points and out-of-town guests?',
      'Is there a wheelchair-accessible vehicle available?',
      'What is the waiting-time policy?',
    ],
    stationery: [
      'What is the minimum order quantity and turnaround time?',
      'Can you do bilingual or regional-language invites?',
      'Do you offer digital invites alongside printed ones?',
      'What are the paper and print options, and can I see proofs?',
      'Is delivery or courier included?',
    ],
    favors: [
      'What is the cost per unit at our quantity?',
      'What is the lead time, and can you personalise each item?',
      'Are the materials ethically sourced and food-safe where relevant?',
      'Can you ship directly to the venue?',
    ],
    catering_service: [
      'What exactly is included in the quote, and what is billed extra?',
      'What is your cancellation and rescheduling policy?',
      'Can you provide references from a similar event?',
      'Who is our single point of contact on the day?',
    ],
  };

  /* ---------------- fictional sample vendors (clearly labelled in the UI) ---------------- */
  const SAMPLE_VENDORS = {
    wedding: [
      { category: 'venue', name: 'Marina Bloom Banquet', person: 'Sample contact', phone: '+91 00000 00001', email: 'hello@marinabloom.example', quote: 350000, deposit: 200000, status: 'booked', notes: 'Garden lawn + indoor hall. Sample record for the demo — not a real venue.' },
      { category: 'food', name: 'Saffron Leaf Catering', person: 'Sample contact', phone: '+91 00000 00002', email: 'events@saffronleaf.example', quote: 465000, deposit: 0, status: 'shortlisted', notes: 'Veg + non-veg, 180 plates, two live counters. Sample record.' },
      { category: 'decor', name: 'Marigold & Moss Décor', person: 'Sample contact', phone: '+91 00000 00003', email: 'studio@marigoldmoss.example', quote: 235000, deposit: 0, status: 'contacted', notes: 'Quoted higher than planned — ask about rental swaps. Sample record.' },
      { category: 'photography', name: 'Amberlight Studio', person: 'Sample contact', phone: '+91 00000 00004', email: 'book@amberlight.example', quote: 160000, deposit: 40000, status: 'booked', notes: 'Two shooters, two days, film + gallery. Sample record.' },
      { category: 'entertainment', name: 'Sunday Static (live band)', person: 'Sample contact', phone: '+91 00000 00005', email: 'hello@sundaystatic.example', quote: 80000, deposit: 0, status: 'researching', notes: 'Four-piece band, 2 x 45 min sets. Sample record.' },
      { category: 'attire', name: 'Aria Couture', person: 'Sample contact', phone: '+91 00000 00006', email: 'appointments@ariacouture.example', quote: 90000, deposit: 35000, status: 'shortlisted', notes: 'Two outfits plus one alteration round. Sample record.' },
      { category: 'transport', name: 'Coastal Cabs & Shuttles', person: 'Sample contact', phone: '+91 00000 00007', email: 'ops@coastalcabs.example', quote: 62000, deposit: 0, status: 'contacted', notes: 'Two shuttles, 8-hour blocks. Sample record.' },
      { category: 'stationery', name: 'Paper Petal Press', person: 'Sample contact', phone: '+91 00000 00008', email: 'print@paperpetal.example', quote: 35000, deposit: 28000, status: 'paid', notes: '180 invites, bilingual, letterpress. Sample record.' },
    ],
    birthday: [
      { category: 'venue', name: 'The Terrace Room (sample)', person: 'Sample contact', phone: '+91 00000 00011', email: 'hello@terraceroom.example', quote: 90000, deposit: 30000, status: 'booked', notes: 'Rooftop with rain cover. Sample record.' },
      { category: 'food', name: 'Little Feast Kitchen (sample)', person: 'Sample contact', phone: '+91 00000 00012', email: 'hello@littlefeast.example', quote: 78000, deposit: 0, status: 'shortlisted', notes: 'Kid-friendly menu, cake add-on. Sample record.' },
      { category: 'decor', name: 'Confetti & Co (sample)', person: 'Sample contact', phone: '+91 00000 00013', email: 'hello@confetti.example', quote: 42000, deposit: 0, status: 'contacted', notes: 'Balloon arch + table styling. Sample record.' },
      { category: 'entertainment', name: 'The Magic Hour (sample)', person: 'Sample contact', phone: '+91 00000 00014', email: 'hello@magichour.example', quote: 25000, deposit: 0, status: 'researching', notes: '45-min magic show + games host. Sample record.' },
      { category: 'photography', name: 'Golden Hour Kids (sample)', person: 'Sample contact', phone: '+91 00000 00015', email: 'hello@goldenhourkids.example', quote: 22000, deposit: 0, status: 'shortlisted', notes: '2-hour candid coverage. Sample record.' },
    ],
    community: [
      { category: 'venue', name: 'Civic Hall Annexe (sample)', person: 'Sample contact', phone: '+91 00000 00021', email: 'bookings@civichall.example', quote: 120000, deposit: 40000, status: 'booked', notes: 'Hall plus foyer, permits advised. Sample record.' },
      { category: 'food', name: 'Community Kitchen Collective (sample)', person: 'Sample contact', phone: '+91 00000 00022', email: 'hello@communitykitchen.example', quote: 210000, deposit: 0, status: 'shortlisted', notes: 'Buffet for 250, veg default. Sample record.' },
      { category: 'entertainment', name: 'Roots & Rhythm Troupe (sample)', person: 'Sample contact', phone: '+91 00000 00023', email: 'hello@rootsrhythm.example', quote: 65000, deposit: 0, status: 'contacted', notes: 'Folk performance + workshop. Sample record.' },
      { category: 'decor', name: 'Lantern Street Décor (sample)', person: 'Sample contact', phone: '+91 00000 00024', email: 'hello@lanternstreet.example', quote: 55000, deposit: 0, status: 'researching', notes: 'Reusable lighting and banners. Sample record.' },
    ],
    other: [],
  };

  /* ---------------- ideas ---------------- */
  /* estCost: { pct: 0.05 } of total budget, or { perGuest: 120 } */
  const IDEA_POOL = {
    wedding: [
      { kind: 'theme', title: 'Garden of two languages', desc: 'Pair a bilingual invite with signage in both your families\' scripts. Keeps the day personal without extra cost.', cost: { pct: 0.01 }, tags: ['style', 'personal'] },
      { kind: 'theme', title: 'Golden hour ceremony', desc: 'Time the ceremony 45 minutes before sunset so the natural light does the décor work for you.', cost: { pct: 0 }, tags: ['style', 'photos'] },
      { kind: 'decor', title: 'One hero flower, repeated', desc: 'Choose a single seasonal bloom and repeat it in the mandap, tables and buttonholes. Cheaper than five flower types, and it photographs beautifully.', cost: { pct: 0.04 }, tags: ['décor', 'save'] },
      { kind: 'decor', title: 'Family-photo wall instead of a flower wall', desc: 'Print 20 black-and-white family photographs on a fabric panel. Guests linger, and it costs far less than a fresh-flower wall.', cost: { pct: 0.012 }, tags: ['décor', 'personal'] },
      { kind: 'decor', title: 'Reuse the ceremony florals at the reception', desc: 'Ask the florist to plan for a 90-minute move. Same flowers, two looks — usually a 10–15% saving.', cost: { pct: 0 }, tags: ['décor', 'save'] },
      { kind: 'menu', title: 'Two live counters instead of a larger buffet', desc: 'Guests queue less and remember more. Pick one regional favourite and one crowd-pleaser.', cost: { perGuest: 180 }, tags: ['food'] },
      { kind: 'menu', title: 'A documented allergy-safe plate', desc: 'One labelled, sealed plate per guest with restrictions, handed over by name. Worth more than any signage.', cost: { perGuest: 40 }, tags: ['food', 'access'] },
      { kind: 'activity', title: 'A blessing jar, not a guest book', desc: 'Guests drop handwritten wishes into a jar that you open on your first anniversary.', cost: { pct: 0.002 }, tags: ['activity', 'personal'] },
      { kind: 'activity', title: 'Shuttle window with a song request form', desc: 'Guest transport feels considered when the RSVP form asks for a song request for the ride.', cost: { pct: 0 }, tags: ['activity', 'save'] },
      { kind: 'favor', title: 'Seed-paper place cards', desc: 'Plantable place cards double as favors and table assignments. Around ₹60 each at 180 guests.', cost: { perGuest: 60 }, tags: ['favor'] },
      { kind: 'favor', title: 'One shared favor per family', desc: 'A small brass diya or a jar of homemade sweets per household. Cuts favor cost by half without feeling cheap.', cost: { perGuest: 35 }, tags: ['favor', 'save'] },
      { kind: 'activity', title: 'A quiet room with water and seating', desc: 'Elders, nursing parents and anyone overwhelmed will thank you. Costs nothing but planning.', cost: { pct: 0 }, tags: ['access'] },
    ],
    birthday: [
      { kind: 'theme', title: 'A colour, not a character', desc: 'Pick one strong colour plus a neutral, and let balloons, cake and tableware follow it. Looks styled for very little money.', cost: { pct: 0.02 }, tags: ['style', 'save'] },
      { kind: 'theme', title: 'Through the decades', desc: 'For a milestone birthday: a photo timeline wall and a playlist with one song from each decade of their life.', cost: { pct: 0.015 }, tags: ['style', 'personal'] },
      { kind: 'decor', title: 'Fabric backdrop instead of an arch', desc: 'A draped sheet and two plants photograph just as well as a balloon arch and cost a fraction.', cost: { pct: 0.008 }, tags: ['décor', 'save'] },
      { kind: 'decor', title: 'Numbered candle table', desc: 'Number candles, one per guest, on a single cake so everyone gets a wish.', cost: { perGuest: 45 }, tags: ['décor', 'activity'] },
      { kind: 'menu', title: 'Grazing table over plated courses', desc: 'Less staff, more mingling. Add two labelled allergy-safe plates.', cost: { perGuest: 320 }, tags: ['food'] },
      { kind: 'menu', title: 'A cake that doubles as dessert', desc: 'One larger cake cut after dinner removes the need for a separate dessert course.', cost: { pct: 0.03 }, tags: ['food', 'save'] },
      { kind: 'activity', title: 'A craft corner for younger guests', desc: 'Paper, crayons and one adult supervisor keeps kids happy while adults talk.', cost: { perGuest: 90 }, tags: ['activity', 'kids'] },
      { kind: 'activity', title: 'One shared game, not five', desc: 'A single well-run game beats a bumpy programme. Ask the host to run it with a mic.', cost: { pct: 0 }, tags: ['activity'] },
      { kind: 'favor', title: 'Take-home dessert boxes', desc: 'Guests pack their own sweets at the end — favors and dessert waste disappear together.', cost: { perGuest: 70 }, tags: ['favor', 'save'] },
      { kind: 'favor', title: 'Polaroid place cards', desc: 'One instant photo per guest, taken on arrival, becomes the favor and the seating card.', cost: { perGuest: 110 }, tags: ['favor', 'personal'] },
    ],
    community: [
      { kind: 'theme', title: 'One shared visual identity', desc: 'A single poster style, repeated across signage, badges and social posts, makes a volunteer-run event look professional.', cost: { pct: 0.01 }, tags: ['style'] },
      { kind: 'theme', title: 'Local language first', desc: 'Host the programme bilingually. It widens attendance more than any paid promotion.', cost: { pct: 0 }, tags: ['style', 'access'] },
      { kind: 'decor', title: 'Reusable lanterns and fabric banners', desc: 'Borrow from a local group or buy once and reuse next year. Also cuts waste.', cost: { pct: 0.02 }, tags: ['décor', 'save'] },
      { kind: 'decor', title: 'Volunteer-made signage', desc: 'A sign-painting afternoon with volunteers creates ownership and décor in one go.', cost: { pct: 0.005 }, tags: ['décor', 'save'] },
      { kind: 'menu', title: 'One shared meal, two windows', desc: 'Staggered serving windows reduce queueing and staffing peaks at bigger counts.', cost: { perGuest: 210 }, tags: ['food'] },
      { kind: 'menu', title: 'Water stations at every entrance', desc: 'Cheap, and the single most appreciated thing at an outdoor community event.', cost: { pct: 0.005 }, tags: ['food', 'access'] },
      { kind: 'activity', title: 'A 10-minute open mic', desc: 'Three pre-briefed community voices, strictly time-boxed. The most memorable part of the evening.', cost: { pct: 0 }, tags: ['activity'] },
      { kind: 'activity', title: 'Accessibility host at the gate', desc: 'One volunteer whose only job is step-free routing, seating and quiet space.', cost: { pct: 0 }, tags: ['access'] },
      { kind: 'favor', title: 'A take-home seedling', desc: 'Locally sourced saplings as a thank-you — memorable, on-message and low cost.', cost: { perGuest: 55 }, tags: ['favor'] },
      { kind: 'activity', title: 'Volunteer t-shirts in two colours', desc: 'Guests can find help instantly. Buy plain shirts and screen-print them locally.', cost: { pct: 0.03 }, tags: ['logistics'] },
    ],
    other: [
      { kind: 'theme', title: 'Name the feeling, not the theme', desc: 'Choose three words for how the room should feel, then filter every decision through them.', cost: { pct: 0 }, tags: ['style'] },
      { kind: 'decor', title: 'Candlelight over spotlights', desc: 'Warm, forgiving light flatters everyone and needs no lighting technician.', cost: { pct: 0.02 }, tags: ['décor'] },
      { kind: 'menu', title: 'A short menu, done well', desc: 'Two starters, one main, one dessert. Fewer dishes at higher quality always reads better.', cost: { perGuest: 280 }, tags: ['food', 'save'] },
      { kind: 'activity', title: 'A five-minute toast window', desc: 'Pre-brief two speakers and cap each at five minutes. The room stays warm.', cost: { pct: 0 }, tags: ['activity'] },
      { kind: 'favor', title: 'A photo, printed before they leave', desc: 'One instant print per household at the door, with a handwritten thank-you.', cost: { perGuest: 65 }, tags: ['favor'] },
      { kind: 'activity', title: 'A step-free route and a quiet corner', desc: 'Plan both before booking the venue — it changes which venue works.', cost: { pct: 0 }, tags: ['access'] },
    ],
  };

  const IDEA_KIND_LABELS = {
    theme: 'Theme', decor: 'Décor', menu: 'Menu', activity: 'Activity', favor: 'Favor',
  };

  const PRIORITIES = [
    'Great food', 'Beautiful photos', 'Guest comfort', 'Entertainment', 'Staying under budget',
    'Meaningful rituals', 'Sustainability', 'Accessibility for all', 'Intimate feel', 'On-time schedule',
  ];

  const DIETARY_OPTIONS = ['No restrictions', 'Vegetarian', 'Vegan', 'Jain', 'Gluten-free', 'Nut allergy', 'Shellfish allergy', 'Lactose-free', 'Diabetic-friendly'];
  const MEAL_OPTIONS = ['Veg', 'Non-veg', 'Vegan', 'Jain', 'Kids meal', 'Not decided'];
  const RSVP_OPTIONS = [
    { id: 'yes', label: 'Attending' },
    { id: 'maybe', label: 'Maybe' },
    { id: 'pending', label: 'Awaiting reply' },
    { id: 'no', label: 'Declined' },
  ];
  const VENDOR_STATUSES = [
    { id: 'researching', label: 'Researching', order: 0 },
    { id: 'contacted', label: 'Contacted', order: 1 },
    { id: 'shortlisted', label: 'Shortlisted', order: 2 },
    { id: 'booked', label: 'Booked', order: 3 },
    { id: 'paid', label: 'Paid in full', order: 4 },
  ];

  const STYLE_PRESETS = {
    wedding: ['Carnatic garden', 'Modern minimal', 'Coastal ivory', 'Royal heritage', 'Pastel romance', 'Bold & joyful'],
    birthday: ['Colour-block party', 'Garden picnic', 'Retro disco', 'Storybook', 'Elegant dinner', 'Superheroes'],
    community: ['Neighbourhood fair', 'Cultural night', 'Green & local', 'Fundraiser gala', 'Open-air festival', 'Heritage walk'],
    other: ['Warm minimal', 'Golden hour', 'Backyard ease', 'Black tie', 'Candlelit', 'Playful'],
  };

  /* ---------------- seed data ---------------- */
  function seededWedding() {
    const eventDate = toISO(addDays(today(), 116)); // always ~4 months out so the demo stays sensible
    return {
      event: {
        type: 'wedding',
        name: 'Aarav & Meera',
        date: eventDate,
        location: 'Chennai, Tamil Nadu',
        guestCount: 180,
        currency: 'INR',
        budgetTotal: 1800000,
        style: 'Carnatic garden',
        priorities: ['Great food', 'Beautiful photos', 'Guest comfort', 'Meaningful rituals'],
        dietary: 'Both veg and non-veg guests; 4 Jain plates and 2 shellfish allergies',
        accessibility: 'Step-free entry and reserved front-row seating for two guests using mobility aids',
        notes: 'Two families, one long weekend. The ceremony matters most; the reception should feel like a warm party.',
      },
      budget: [
        { category: 'venue', label: 'Garden lawn & banquet hall (sample hold)', planned: 350000, actual: 200000, source: 'vendor' },
        { category: 'venue', label: 'Tables, chairs & shamiana', planned: 100000, actual: 0, source: 'manual' },
        { category: 'food', label: 'Catering — 180 plates, veg + non-veg', planned: 450000, actual: 100000, source: 'vendor' },
        { category: 'food', label: 'Live counters & welcome drinks', planned: 90000, actual: 0, source: 'manual' },
        { category: 'decor', label: 'Mandap & stage florals', planned: 120000, actual: 139000, source: 'vendor' },
        { category: 'decor', label: 'Lighting & lounge seating', planned: 115000, actual: 96000, source: 'manual' },
        { category: 'photography', label: 'Photo + video team (2 days)', planned: 140000, actual: 40000, source: 'vendor' },
        { category: 'photography', label: 'Pre-wedding shoot & album', planned: 20000, actual: 0, source: 'manual' },
        { category: 'entertainment', label: 'Live band & DJ', planned: 80000, actual: 0, source: 'manual' },
        { category: 'entertainment', label: 'Nadaswaram & mridangam', planned: 30000, actual: 0, source: 'manual' },
        { category: 'attire', label: 'Bride & groom outfits', planned: 90000, actual: 35000, source: 'vendor' },
        { category: 'attire', label: 'Makeup & hair trials', planned: 30000, actual: 0, source: 'manual' },
        { category: 'transport', label: 'Guest shuttle & valet', planned: 60000, actual: 0, source: 'manual' },
        { category: 'stationery', label: 'Invitations & save-the-dates', planned: 35000, actual: 28000, source: 'vendor' },
        { category: 'favors', label: 'Return gifts (180)', planned: 65000, actual: 0, source: 'manual' },
        { category: 'contingency', label: 'Buffer for surprises', planned: 60000, actual: 0, source: 'manual' },
      ],
      guests: [
        { name: 'Lakshmi Narayanan', group: 'Family', rsvp: 'yes', meal: 'Veg', dietary: 'No restrictions', access: 'None', plusOnes: 2, email: 'guest1@example.com' },
        { name: 'Rohan Mehta', group: 'Friends', rsvp: 'yes', meal: 'Non-veg', dietary: 'Shellfish allergy', access: 'None', plusOnes: 1, email: 'guest2@example.com' },
        { name: 'Ananya Iyer', group: 'Family', rsvp: 'yes', meal: 'Jain', dietary: 'Jain — no onion or garlic', access: 'Wheelchair access along the aisle', plusOnes: 0, email: 'guest3@example.com' },
        { name: 'Kabir Shah', group: 'Colleagues', rsvp: 'pending', meal: 'Veg', dietary: 'No restrictions', access: 'None', plusOnes: 0, email: 'guest4@example.com' },
        { name: 'Sneha Rao', group: 'Friends', rsvp: 'maybe', meal: 'Non-veg', dietary: 'Lactose intolerant', access: 'None', plusOnes: 2, email: 'guest5@example.com' },
        { name: 'Fatima Sheikh', group: 'Family', rsvp: 'yes', meal: 'Non-veg', dietary: 'No restrictions', access: 'Hearing aid — front seating preferred', plusOnes: 1, email: 'guest6@example.com' },
        { name: 'Vikram Krishnan', group: 'Friends', rsvp: 'no', meal: 'Non-veg', dietary: 'No restrictions', access: 'None', plusOnes: 0, email: 'guest7@example.com' },
        { name: 'Priya Raman', group: 'Colleagues', rsvp: 'pending', meal: 'Vegan', dietary: 'Vegan, gluten-free', access: 'None', plusOnes: 0, email: 'guest8@example.com' },
        { name: 'Meenakshi Sundaram', group: 'Family', rsvp: 'yes', meal: 'Veg', dietary: 'Diabetic-friendly, no egg', access: 'None', plusOnes: 1, email: 'guest9@example.com' },
        { name: 'Deepak Sharma', group: 'Colleagues', rsvp: 'yes', meal: 'Non-veg', dietary: 'No restrictions', access: 'None', plusOnes: 0, email: 'guest10@example.com' },
        { name: 'Aishwarya Nair', group: 'Friends', rsvp: 'pending', meal: 'Veg', dietary: 'No restrictions', access: 'Step-free entry needed', plusOnes: 1, email: 'guest11@example.com' },
        { name: 'Harish Balaji', group: 'Family', rsvp: 'yes', meal: 'Non-veg', dietary: 'No restrictions', access: 'None', plusOnes: 2, email: 'guest12@example.com' },
      ],
    };
  }

  const GUEST_CSV_SAMPLE =
    'name,email,group,rsvp,meal,dietary,access,plusOnes\n' +
    'Sample Guest,guest@example.com,Family,yes,Veg,No restrictions,None,1\n' +
    'Another Guest,another@example.com,Friends,pending,Non-veg,Nut allergy,Wheelchair access,0\n';

  GG.Templates = {
    EVENT_TYPES, BUDGET_CATEGORIES, BUDGET_SPLIT, TASK_TEMPLATES, MILESTONES,
    VENDOR_CATEGORIES, VENDOR_QUESTIONS, SAMPLE_VENDORS, IDEA_POOL, IDEA_KIND_LABELS,
    PRIORITIES, DIETARY_OPTIONS, MEAL_OPTIONS, RSVP_OPTIONS, VENDOR_STATUSES, STYLE_PRESETS,
    seededWedding, GUEST_CSV_SAMPLE,
  };
})();
