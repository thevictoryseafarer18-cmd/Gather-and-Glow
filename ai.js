/* Gather & Glow — AI layer.
 *
 * Two interchangeable transports behind one interface:
 *   1. LIVE  — POST to the server proxy (server.js) which holds the provider key.
 *   2. DEMO  — a local, deterministic planning engine. It is clearly labelled in the
 *              UI as simulated. It reads the real event context, so answers stay
 *              specific to the user's date, budget, guest count and preferences.
 *
 * To connect a real model you only need to implement the proxy route; nothing in the
 * UI has to change. See README.md → "Connecting a real AI service".
 */
(function () {
  'use strict';
  const GG = window.GG;
  const T = GG.Templates;
  const CFG = window.GG_CONFIG;

  const AI = {
    mode: 'demo',
    probed: false,
    liveAvailable: false,
    lastError: null,
  };

  /* ------------------------------------------------------------------ *
   * Transport
   * ------------------------------------------------------------------ */
  async function probe() {
    AI.probed = true;
    if (CFG.AI_MODE === 'demo') { AI.mode = 'demo'; return AI.mode; }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(CFG.AI_HEALTH_ENDPOINT, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(t);
      if (!res.ok) throw new Error('health ' + res.status);
      const data = await res.json();
      AI.liveAvailable = !!data.aiConfigured;
    } catch (e) {
      AI.liveAvailable = false;
    }
    AI.mode = AI.liveAvailable && CFG.AI_MODE !== 'demo' ? 'live' : 'demo';
    return AI.mode;
  }

  AI.probe = probe;
  AI.statusLabel = () =>
    AI.mode === 'live'
      ? 'Live model connected through the secure server proxy'
      : 'Demo mode — simulated planning engine, no AI service connected';

  function buildSystemPrompt(ctx) {
    return [
      'You are Gather & Glow, a warm, practical event-planning assistant.',
      'You help plan weddings, birthdays and community events.',
      'Always ground your answer in the EVENT CONTEXT below. Use the real date, guest count,',
      'budget figures and preferences. Be concise, specific and organised. Use short headings',
      'and bullet lists. Never invent vendor names as if they were real businesses; clearly',
      'mark any example as a place-holder. End with one clear next action.',
      '',
      'EVENT CONTEXT (JSON):',
      JSON.stringify(ctx, null, 2),
    ].join('\n');
  }

  async function askLive({ prompt, history, ctx }) {
    const messages = [{ role: 'system', content: buildSystemPrompt(ctx) }]
      .concat((history || []).slice(-10).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })))
      .concat([{ role: 'user', content: prompt }]);
    const res = await fetch(CFG.AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages, context: ctx }),
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error || ''; } catch (e) { /* ignore */ }
      throw new Error(detail || 'The assistant service returned ' + res.status + '.');
    }
    const data = await res.json();
    const text = (data.text || data.content || '').trim();
    if (!text) throw new Error('The assistant returned an empty reply.');
    return { text, suggestions: Array.isArray(data.suggestions) ? data.suggestions : [], source: 'live' };
  }

  /** Main entry point used by the chat UI. */
  AI.ask = async function ({ prompt, history, ctx }) {
    if (AI.mode === 'live') {
      try {
        return await askLive({ prompt, history, ctx });
      } catch (err) {
        AI.lastError = err.message;
        AI.mode = 'demo';
        const fallback = demoAnswer(prompt, ctx);
        return Object.assign({}, fallback, {
          text: '⚠️ ' + err.message + ' I have switched to demo mode for now.\n\n' + fallback.text,
          switchedToDemo: true,
        });
      }
    }
    await new Promise((r) => setTimeout(r, 520 + Math.random() * 600));
    return demoAnswer(prompt, ctx);
  };

  /* ------------------------------------------------------------------ *
   * Demo planning engine
   * ------------------------------------------------------------------ */
  const INTENT_RULES = [
    ['timeline', /timeline|schedule|when should|deadline|plan out|roadmap|countdown/i],
    ['budget', /budget|money|cost|cheaper|save|under|expensive|overspend|spend/i],
    ['theme', /theme|style|aesthetic|colour|color|vibe|mood|decor direction/i],
    ['food', /food|menu|catering|meal|diet|veg|vegan|jain|drink|cake/i],
    ['vendors', /vendor|quote|negotiat|contract|supplier|photographer|band/i],
    ['guests', /guest|rsvp|invite|seating|headcount|plus one|attend/i],
    ['forgot', /forget|forgot|missing|miss|overlook|what else|blind spot/i],
    ['access', /access|wheelchair|dietary|allerg|inclusive|hearing|quiet/i],
    ['activities', /entertain|music|activity|game|performance|programme|program/i],
    ['favors', /favor|favour|gift|thank you|token/i],
    ['logistics', /transport|parking|shuttle|logistic|rains?|weather|power|backup/i],
    ['risk', /risk|contingen|backup plan|rain|emergenc|disaster/i],
  ];

  function detectIntent(prompt) {
    const p = String(prompt || '');
    for (const [intent, re] of INTENT_RULES) if (re.test(p)) return intent;
    return 'general';
  }

  const CUR = () => (GG.Store.state.event.currency || 'INR');
  const m = (n) => GG.money(n, CUR());
  const ms = (n) => GG.moneyShort(n, CUR());
  const guestCount = (ctx) => ctx.event.guestCount || 0;

  function budgetTier(ctx) {
    const perGuest = guestCount(ctx) ? ctx.budget.total / guestCount(ctx) : 0;
    const t = { INR: [1500, 4000], USD: [20, 60], EUR: [20, 55], GBP: [18, 50], AED: [70, 220] };
    const [low, high] = t[ctx.event.currency] || t.INR;
    if (perGuest < low) return { id: 'lean', perGuest, phrase: 'a lean, DIY-friendly budget' };
    if (perGuest < high) return { id: 'mid', perGuest, phrase: 'a comfortable mid-range budget' };
    return { id: 'ample', perGuest, phrase: 'a generous per-guest budget' };
  }

  function taskSuggestions(ctx, defs) {
    const base = GG.parseISO(ctx.event.date) || GG.today();
    const items = defs.map((d) => {
      let due = GG.addDays(base, -(d.offset || 0));
      if (GG.daysBetween(GG.today(), due) < 0) due = GG.addDays(GG.today(), d.offset && d.offset > 45 ? 3 : 1);
      return { title: d.title, due: GG.toISO(due), category: d.category || 'logistics', priority: d.priority || 'medium' };
    });
    return items;
  }

  function existingTitles(ctx) {
    return (GG.Store.state.tasks || []).map((t) => t.title.toLowerCase());
  }

  function dedupe(defs) {
    const titles = existingTitles(GG.Store.state);
    return defs.filter((d) => !titles.some((t) => t.indexOf(d.title.toLowerCase().slice(0, 18)) >= 0));
  }

  function relDays(iso) {
    const n = GG.daysUntil(iso);
    if (n < 0) return Math.abs(n) + ' days ago';
    if (n === 0) return 'today';
    return 'in ' + n + ' days';
  }

  function header(ctx) {
    const e = ctx.event;
    return (
      '**' + (e.name || 'Your event') + '** · ' + T.EVENT_TYPES.find((t) => t.id === e.type).label +
      '\n' + GG.fmtDate(e.date, 'long') + (e.location ? ' · ' + e.location : '') +
      '\n' + guestCount(ctx) + ' guests · ' + m(ctx.budget.total) + ' budget · ' + relDays(e.date)
    );
  }

  const ANSWERS = {
    timeline(ctx) {
      const days = ctx.event.daysUntil;
      const type = ctx.event.type;
      const tpl = T.TASK_TEMPLATES[type] || T.TASK_TEMPLATES.other;
      const upcoming = tpl
        .filter((t) => {
          const due = GG.addDays(GG.parseISO(ctx.event.date) || GG.today(), -t.offset);
          return GG.daysBetween(GG.today(), due) <= 45;
        })
        .slice(0, 5);
      const overdue = ctx.tasks.overdue;
      let text = header(ctx) + '\n\n### Your next six weeks\n';
      if (days < 0) {
        text += 'This date has already passed — update the event date to regenerate a live timeline.\n';
      } else if (upcoming.length) {
        upcoming.forEach((t) => {
          const due = GG.toISO(GG.addDays(GG.parseISO(ctx.event.date), -t.offset));
          text += '- **' + GG.fmtDate(due, 'day') + '** (' + relDays(due) + ') — ' + t.title + '\n';
        });
      } else {
        text += '- Nothing is time-critical yet. Start with the venue and the budget split.\n';
      }
      text += '\n### Where you actually stand\n';
      text += '- ' + ctx.tasks.done + ' of ' + ctx.tasks.total + ' planning tasks are complete.\n';
      if (overdue.length) {
        text += '- **' + overdue.length + ' task' + (overdue.length === 1 ? ' is' : 's are') + ' overdue**: ' +
          overdue.slice(0, 3).map((t) => t.title + ' (' + relDays(t.due) + ')').join('; ') + '. Clear these first.\n';
      }
      if (ctx.event.type === 'wedding') {
        text += '- Book the caterer and photographer before invitations go out — both decide your date flexibility.\n';
        text += '- Aim to freeze the guest count 3 weeks out, and the seating plan 10 days out.\n';
      } else if (ctx.event.type === 'birthday') {
        text += '- Order the cake at least 3 weeks ahead; dietary versions usually need extra notice.\n';
        text += '- Confirm final headcount with the caterer 7–10 days before the party.\n';
      } else if (ctx.event.type === 'community') {
        text += '- Confirm permits, insurance and volunteer shifts at least a month ahead.\n';
        text += '- Open registrations early and print a run sheet for every volunteer.\n';
      }
      text += '\n**Next action:** add the tasks you are missing, then work top-down by due date.';

      /* Prefer template steps that are genuinely missing from the timeline. */
      let defs = dedupe(tpl.filter((t) => t.offset < (days > 0 ? days : 0)).slice(-6));
      if (!defs.length) {
        /* Everything template-shaped is already tracked — offer the next layer of detail. */
        const extra = {
          wedding: [
            { offset: 24, title: 'Build the seating plan from dietary and access needs', category: 'guests', priority: 'high' },
            { offset: 18, title: 'Send the run-of-show to every vendor and collect written confirmations', category: 'logistics', priority: 'high' },
            { offset: 12, title: 'Prepare the day-of kit and labelled cash envelopes for final payments', category: 'budget', priority: 'medium' },
          ],
          birthday: [
            { offset: 20, title: 'Confirm final plate and cake counts, including allergy-safe portions', category: 'food', priority: 'high' },
            { offset: 12, title: 'Write the party run sheet: cake time, games, photos, thank-yous', category: 'entertainment', priority: 'medium' },
            { offset: 5, title: 'Buy candles, batteries, serving supplies and trash bags', category: 'logistics', priority: 'medium' },
          ],
          community: [
            { offset: 24, title: 'Publish the volunteer roster with named shifts and a contact sheet', category: 'logistics', priority: 'high' },
            { offset: 16, title: 'Confirm permits, insurance and safety briefing with the venue', category: 'venue', priority: 'high' },
            { offset: 8, title: 'Print signage, badges and feedback forms', category: 'stationery', priority: 'medium' },
          ],
          other: [
            { offset: 21, title: 'Write the one-page run sheet with a named owner per item', category: 'logistics', priority: 'high' },
            { offset: 14, title: 'Confirm final supplier timings and payments in writing', category: 'budget', priority: 'high' },
            { offset: 6, title: 'Pack the day-of kit and share the contact sheet', category: 'logistics', priority: 'medium' },
          ],
        };
        defs = dedupe(extra[ctx.event.type] || extra.other);
      }
      return { text, suggestions: defs.length ? [{ kind: 'tasks', label: 'Add these ' + defs.length + ' tasks to the timeline', items: taskSuggestions(ctx, defs) }] : [] };
    },

    budget(ctx) {
      const b = ctx.budget;
      const over = b.categories.filter((c) => c.over);
      const biggest = b.categories.slice().sort((x, y) => y.planned - x.planned).slice(0, 3);
      const perGuest = guestCount(ctx) ? Math.round(b.total / guestCount(ctx)) : 0;
      let text = header(ctx) + '\n\n### Budget read-out\n';
      text += '- Total budget: **' + m(b.total) + '**\n';
      text += '- Planned across categories: **' + m(b.planned) + '**\n';
      text += '- Actually spent so far: **' + m(b.actual) + '**\n';
      text += '- ' + (b.remaining >= 0
        ? 'Headroom left in the plan: **' + m(b.remaining) + '**'
        : '**Over plan by ' + m(Math.abs(b.remaining)) + '**') + '\n';
      text += '- Works out to about **' + m(perGuest) + ' per guest** at ' + guestCount(ctx) + ' guests.\n';
      text += '\n### Where the money is going\n';
      biggest.forEach((c) => {
        text += '- ' + c.label + ': planned ' + m(c.planned) + ', spent ' + m(c.actual) + (c.over ? ' — **over plan**' : '') + '\n';
      });
      if (over.length) {
        text += '\n### Fix the overspend first\n';
        over.forEach((c) => { text += '- ' + c.label + ' is over by ' + m(c.actual - c.planned) + '. Ask for a revised quote with one line removed, or move the difference from a category you have not started.\n'; });
      }
      text += '\n### Three levers that actually move the number\n';
      if (ctx.event.type === 'wedding') {
        text += '- Move the day: Friday or Sunday venues in most cities cost 10–20% less than Saturday.\n';
        text += '- Trim the guest list by 20 people — catering and rentals fall together.\n';
        text += '- Reuse ceremony florals at the reception instead of ordering twice.\n';
      } else if (ctx.event.type === 'birthday') {
        text += '- Host at home or a community space; you can move a large venue line to food.\n';
        text += '- One larger cake plus a dessert table beats two cakes and a plated dessert.\n';
        text += '- Skip the entertainer and run one well-led game with a good playlist.\n';
      } else {
        text += '- Bring in one sponsor to cover printing or water instead of trimming the programme.\n';
        text += '- Charge a small registration fee to offset catering per head.\n';
        text += '- Reuse borrowed lighting and banners instead of buying décor.\n';
      }
      if (b.remaining > 0) {
        text += '\n**Next action:** you have ' + m(b.remaining) + ' unallocated. Put 5–10% into contingency before you spend it anywhere else.';
      } else {
        text += '\n**Next action:** nothing is unallocated. Add a contingency line, then decide what to cut — not just what to defer.';
      }
      const suggestions = [];
      if (b.remaining > 0) {
        suggestions.push({
          kind: 'budget',
          label: 'Add a contingency reserve',
          items: [
            { category: 'contingency', label: 'Contingency reserve (recommended)', planned: Math.round((b.total * 0.05) / 100) * 100 },
            { category: 'favors', label: 'Guest favors & thank-yous', planned: Math.round((b.total * 0.02) / 100) * 100 },
          ],
        });
      }
      return { text, suggestions };
    },

    theme(ctx) {
      const e = ctx.event;
      const tier = budgetTier(ctx);
      const presets = T.STYLE_PRESETS[e.type] || T.STYLE_PRESETS.other;
      const chosen = e.style || presets[0];
      const pool = (T.IDEA_POOL[e.type] || []).filter((i) => i.kind === 'theme' || i.kind === 'decor').slice(0, 3);
      const seed = pool[0] || { title: 'One colour, one material', desc: 'Repeat a single colour and material throughout.' };
      let text = header(ctx) + '\n\n';
      text += 'You already chose **' + chosen + '**.' + (e.style ? ' Building on that rather than starting again:' : ' Here is a direction to start from:') + '\n\n';
      text += '### Three directions that fit ' + (e.location || 'your city') + '\n';
      text += '1. **' + chosen + ', tightened.** Pick one hero colour, one neutral and one material (linen, brass, terracotta). Apply it only to three places: entrance, main table or stage, and one photo moment. At ' + guestCount(ctx) + ' guests that is enough to read as styled.\n';
      text += '2. **Local first.** Use what your city does well — ' +
        (/Chennai|Tamil|Madurai|Coimbatore|Pondicherry/i.test(e.location || '') ? 'jasmine, banana-leaf service, kanjeevaram silk and brass lamps' :
          /Mumbai|Pune|Goa/i.test(e.location || '') ? 'coastal whites, marigold, cane and warm wood' :
          /Delhi|Jaipur|Lucknow|Agra/i.test(e.location || '') ? 'sandstone tones, block print, marigold and mirrorwork' :
          /Bengaluru|Bangalore|Hyderabad/i.test(e.location || '') ? 'seasonal local flowers, terracotta, and garden greens' :
            'seasonal local flowers, natural textures and borrowed props') + '. Cheaper than imported décor and it photographs like it belongs there.\n';
      text += '3. **' + seed.title + '.** ' + seed.desc + '\n';
      text += '\n### Make it real at ' + tier.phrase + '\n';
      text += '- Décor plan: entrance + focal moment + tablescapes. Skip anything guests never touch.\n';
      text += '- Put lighting on the same quote as décor; warm light flatters a plain room better than extra flowers.\n';
      text += '- Agree a mood board with two reference photos per area — words alone always get misread.\n';
      text += (e.priorities || []).length
        ? '\nYour stated priorities (' + e.priorities.join(', ') + ') should decide the tie-breakers. ' +
          (e.priorities.indexOf('Beautiful photos') >= 0 ? 'Spend the first extra rupee on the photo moment, not on more centrepieces.' : 'Spend extra on the thing you listed first.')
        : '';
      text += '\n\n**Next action:** shortlist one direction and request a décor quote against it.';
      const suggestions = [{
        kind: 'tasks',
        label: 'Add theme tasks',
        items: taskSuggestions(ctx, [
          { offset: 76, title: 'Lock the visual direction: one hero colour, one material, one focal area', category: 'decor', priority: 'medium' },
          { offset: 62, title: 'Ask the décor vendor for a mood board with two reference photos per area', category: 'decor', priority: 'medium' },
          { offset: 40, title: 'Confirm lighting is included in the décor quote', category: 'decor', priority: 'low' },
        ]),
      }];
      const idea = pool.find((i) => i.cost && i.cost.pct);
      if (idea) {
        suggestions.push({
          kind: 'budget',
          label: 'Budget the décor idea',
          items: [{ category: 'decor', label: idea.title, planned: Math.round((ctx.budget.total * (idea.cost.pct || 0.02)) / 100) * 100 }],
        });
      }
      return { text, suggestions };
    },

    food(ctx) {
      const food = ctx.budget.categories.find((c) => c.id === 'food');
      const guests = GG.Store.state.guests;
      const mealCounts = {};
      guests.forEach((g) => {
        const key = g.meal || 'Not decided';
        mealCounts[key] = (mealCounts[key] || 0) + 1 + (Number(g.plusOnes) || 0);
      });
      const perPlate = guestCount(ctx) && food ? Math.round(food.planned / guestCount(ctx)) : 0;
      const dietNotes = ctx.guests.dietary;
      let text = header(ctx) + '\n\n### Numbers you can hand to a caterer\n';
      text += '- Planned food budget: **' + (food ? m(food.planned) : m(0)) + '**, which is about **' + m(perPlate) + ' per plate** at ' + guestCount(ctx) + ' guests.\n';
      const keys = Object.keys(mealCounts);
      if (keys.length) {
        text += '- RSVP meal mix: ' + keys.map((k) => k + ' × ' + mealCounts[k]).join(', ') + '.\n';
      } else {
        text += '- No guest meal preferences recorded yet — add them as RSVPs arrive.\n';
      }
      if (dietNotes.length) {
        text += '- Specific dietary needs on file: ' + dietNotes.slice(0, 6).join('; ') + (dietNotes.length > 6 ? ' and ' + (dietNotes.length - 6) + ' more' : '') + '.\n';
      } else {
        text += '- No unusual dietary needs recorded yet. Ask about allergies in the RSVP form, not at the door.\n';
      }
      text += '\n### What to ask before signing\n';
      text += '- Per-plate cost **including taxes and service** — quotes love to hide both.\n';
      text += '- How many staff per 50 guests, and whether serving equipment is included.\n';
      text += '- Whether you can hold a small buffer (typically 5%) above the confirmed count.\n';
      if (ctx.event.type === 'birthday') text += '- Cake: one larger cake cut after dinner removes a whole dessert course.\n';
      if (ctx.event.type === 'wedding') text += '- Live counters: two done well beat five done poorly, and they spread the queue.\n';
      text += '\n**Next action:** send these three questions to your shortlisted caterer and put the answers in the vendor notes.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add catering tasks',
          items: taskSuggestions(ctx, [
            { offset: 30, title: 'Confirm final plate count and dietary plates with the caterer', category: 'food', priority: 'high' },
            { offset: 21, title: 'Ask for a written quote with taxes, service and staff included', category: 'food', priority: 'high' },
          ]),
        }],
      };
    },

    vendors(ctx) {
      const unbooked = ctx.vendors.filter((v) => v.status !== 'booked' && v.status !== 'paid');
      const totalQuotes = ctx.vendors.reduce((s, v) => s + (v.quote || 0), 0);
      const cats = unbooked.map((v) => v.category);
      const missing = (T.VENDOR_CATEGORIES.map((c) => c.id))
        .filter((id) => !ctx.vendors.some((v) => v.category === id) && ['venue', 'food', 'photography', 'decor'].indexOf(id) >= 0);
      let text = header(ctx) + '\n\n### Where your vendors stand\n';
      text += '- ' + ctx.vendors.filter((v) => v.status === 'booked' || v.status === 'paid').length + ' of ' + ctx.vendors.length + ' vendor conversations are secured.\n';
      text += '- Quotes on file total **' + m(totalQuotes) + '**, against a planned spend of ' + m(ctx.budget.planned) + '.\n';
      if (unbooked.length) {
        text += '- Still open: ' + unbooked.slice(0, 6).map((v) => (v.name || v.category) + ' (' + v.status + ')').join(', ') + '.\n';
      }
      if (missing.length) {
        text += '- No conversation started yet for: ' + missing.map((id) => (T.VENDOR_CATEGORIES.find((c) => c.id === id) || {}).label).join(', ') + '.\n';
      }
      text += '\n### How to compare quotes fairly\n';
      text += '1. Normalise to one page: what is included, what is extra, delivery time, payment schedule.\n';
      text += '2. Ask every vendor the same five questions from the checklist in the vendor drawer.\n';
      text += '3. Compare the **total landed cost**, not the headline quote — setup, taxes, overtime and travel.\n';
      text += '4. Never pay more than 30–40% as a deposit, and get the date-change clause in writing.\n';
      text += '\n**Next action:** pick your two weakest categories and request one more quote in each this week.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add vendor follow-ups',
          items: taskSuggestions(ctx, [
            { offset: 20, title: 'Request a second quote for the highest-cost open vendor category', category: 'logistics', priority: 'high' },
            { offset: 12, title: 'Confirm each booked vendor in writing with timings and payment schedule', category: 'logistics', priority: 'high' },
          ]),
        }],
      };
    },

    guests(ctx) {
      const g = ctx.guests;
      const gap = (ctx.event.guestCount || 0) - g.invitedHeads;
      let text = header(ctx) + '\n\n### Guest numbers\n';
      text += '- ' + g.total + ' households/guests on the list, covering **' + g.invitedHeads + ' seats** with plus-ones.\n';
      text += '- Attending: **' + g.confirmed + ' seats** · maybe ' + g.pending + ' awaiting reply · ' + g.declined + ' declined.\n';
      text += '- Your planning headcount is ' + (ctx.event.guestCount || 0) + ', so you are ' + (gap > 0 ? gap + ' seats under' : Math.abs(gap) + ' seats over') + ' the working number.\n';
      if (g.dietary.length) text += '- ' + g.dietary.length + ' guest(s) flagged a dietary need — pass this list to the caterer, not just the meal counts.\n';
      if (g.access.length) text += '- Accessibility notes on file: ' + g.access.slice(0, 3).join('; ') + '. Walk the venue route with these in mind.\n';
      text += '\n### Three things guests notice most\n';
      text += '1. Whether they knew **when to arrive** and where to park.\n';
      text += '2. Whether someone greeted them by name and pointed them to a seat.\n';
      text += '3. Whether their food need was already handled without a conversation.\n';
      text += '\n### Practical next steps\n';
      text += '- Set an RSVP deadline 3 weeks out, then chase only the non-responders in one message.\n';
      text += '- Build the seating plan from restrictions outward: mobility first, then families, then friends.\n';
      text += '- Name one person as the guest point-of-contact on the day, with a printed list.\n';
      text += '\n**Next action:** ' + (gap > 0 ? 'invite or confirm ' + gap + ' more seats, or reduce your headcount to ' + g.invitedHeads + '.' : 'your list is at capacity — start the seating plan.');
      return { text, suggestions: [] };
    },

    forgot(ctx) {
      const e = ctx.event;
      const missing = [];
      const cats = new Set(ctx.vendors.map((v) => v.category));
      if (!cats.has('transport')) missing.push('**Transport and parking.** No transport vendor yet — for ' + guestCount(ctx) + ' guests that is usually the first thing to go wrong.');
      if (Object.keys(ctx.guests.dietary).length === 0 && ctx.guests.total > 0) missing.push('**Allergy-safe plates.** Meal preferences exist but no dietary restrictions are recorded; ask before finalising the menu.');
      if (!e.accessibility) missing.push('**Accessibility plan.** Nothing recorded about step-free access, seating or a quiet space.');
      if (!cats.has('stationery') && e.type !== 'community') missing.push('**Invitations and signage.** No stationery vendor or print plan on file — signage is what stops guests getting lost.');
      if (!(e.priorities || []).length) missing.push('**Stated priorities.** You have not chosen any. They are the tie-breaker for every budget argument later.');
      if (ctx.budget.categories.every((c) => c.id !== 'contingency')) missing.push('**Contingency.** No buffer category exists. Add 5–10% now, before it is needed.');
      if (ctx.tasks.total === 0) missing.push('**A timeline.** There are no tasks at all yet.');
      if (!e.location) missing.push('**Location.** Budget and vendor advice cannot be sharp without a city.');
      if (!missing.length) {
        missing.push('**A day-of run sheet.** Everything is planned, but nothing yet tells a helper what happens hour by hour.');
        missing.push('**A cash and documents envelope.** Final vendor payments, permits and contact numbers in one place.');
        missing.push('**A quiet moment for yourselves.** Ten minutes, off the floor, mid-event.');
      }
      let text = header(ctx) + '\n\n### What typically gets missed\n';
      missing.forEach((line) => { text += '- ' + line + '\n'; });
      text += '\n### Then these, in order\n';
      text += '- Who holds the timeline on the day, and who holds the money?\n';
      text += '- Who is the single contact for each vendor — name and number, written down?\n';
      text += '- What happens if it rains, if power fails, or if a vendor cancels 48 hours out?\n';
      text += '- Where do gifts, cards and leftover food go at the end of the night?\n';
      text += '\n**Next action:** turn the top two gaps above into tasks today.';
      const defs = [];
      if (!cats.has('transport')) defs.push({ offset: 18, title: 'Arrange guest transport and parking plan', category: 'transport', priority: 'medium' });
      if (!e.accessibility) defs.push({ offset: 25, title: 'Confirm step-free access, seating and quiet space with the venue', category: 'logistics', priority: 'high' });
      defs.push({ offset: 10, title: 'Write the day-of run sheet with a named point person per vendor', category: 'logistics', priority: 'high' });
      return {
        text,
        suggestions: defs.length ? [{ kind: 'tasks', label: 'Add these gaps as tasks', items: taskSuggestions(ctx, dedupe(defs)) }] : [],
      };
    },

    access(ctx) {
      const g = ctx.guests;
      let text = header(ctx) + '\n\n### Inclusion checklist for this event\n';
      text += '- Step-free entry, and a step-free route to seating, food and toilets.\n';
      text += '- Reserved seating near the front for anyone with mobility or hearing needs.\n';
      text += '- A quiet space away from speakers, with water and a chair.\n';
      text += '- Menu labels in plain language: veg, vegan, Jain, gluten-free, allergens.\n';
      text += '- One named host whose only job is accessibility questions on the day.\n';
      text += '- Invite text that asks for needs **before** the event, not at the door.\n';
      if (g.access.length) {
        text += '\n### Already on your list\n';
        g.access.slice(0, 6).forEach((a) => { text += '- ' + a + '\n'; });
      }
      if (g.dietary.length) {
        text += '\n### Dietary flags to hand to the caterer\n';
        text += g.dietary.slice(0, 8).map((d) => '- ' + d).join('\n') + '\n';
      }
      text += '\n**Next action:** send the venue the accessibility list and ask for written confirmation.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add inclusion tasks',
          items: taskSuggestions(ctx, [
            { offset: 21, title: 'Send the venue the accessibility list and get written confirmation', category: 'logistics', priority: 'high' },
            { offset: 14, title: 'Prepare labelled allergy-safe plates with the caterer', category: 'food', priority: 'high' },
          ]),
        }],
      };
    },

    activities(ctx) {
      const pool = (T.IDEA_POOL[ctx.event.type] || []).filter((i) => i.kind === 'activity');
      let text = header(ctx) + '\n\n### Programme shape that works\n';
      text += '- Keep the formal part under 25 minutes. Guests forgive a lot except waiting.\n';
      text += '- Place one activity early (while people arrive) and one late (when energy dips).\n';
      text += '- Cap every speech at three minutes, briefed in advance.\n';
      if (pool.length) {
        text += '\n### From your idea board\n';
        pool.slice(0, 4).forEach((i) => { text += '- **' + i.title + '.** ' + i.desc + '\n'; });
      }
      text += '\n**Next action:** write a one-line programme and time-box each item.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add programme tasks',
          items: taskSuggestions(ctx, [
            { offset: 24, title: 'Write the one-page programme with time-boxed items', category: 'entertainment', priority: 'medium' },
            { offset: 10, title: 'Brief every speaker and performer on their time limit', category: 'entertainment', priority: 'medium' },
          ]),
        }],
      };
    },

    favors(ctx) {
      const perGuestBudget = guestCount(ctx) ? Math.round((ctx.budget.total * 0.02) / guestCount(ctx)) : 0;
      let text = header(ctx) + '\n\n### Favors, sized honestly\n';
      text += '- At 2% of your ' + m(ctx.budget.total) + ' budget, that is about **' + m(perGuestBudget) + ' per guest** for ' + guestCount(ctx) + ' guests.\n';
      text += '- One thoughtful favor per **household** beats a trinket per person, and halves the spend.\n';
      const pool = (T.IDEA_POOL[ctx.event.type] || []).filter((i) => i.kind === 'favor');
      pool.forEach((i) => { text += '- **' + i.title + '.** ' + i.desc + '\n'; });
      text += '\n**Next action:** choose one favor idea and order a sample before committing to the full quantity.';
      return {
        text,
        suggestions: [{
          kind: 'budget',
          label: 'Budget favors',
          items: [{ category: 'favors', label: 'Guest favors (per household)', planned: Math.round((ctx.budget.total * 0.015) / 100) * 100 }],
        }],
      };
    },

    logistics(ctx) {
      let text = header(ctx) + '\n\n### Logistics that decide the day\n';
      text += '- **Arrival:** one clear entrance, one person greeting, signage from the road.\n';
      text += '- **Parking/transport:** a shuttle window for ' + guestCount(ctx) + ' guests, with a named coordinator.\n';
      text += '- **Timings:** vendor load-in before guests arrive; a 30-minute buffer on the ceremony start.\n';
      text += '- **Weather:** covered backup for the ceremony and for catering, decided 48 hours out.\n';
      text += '- **Power and sound:** test the full setup, not a partial one, at the venue.\n';
      text += '- **Exit:** gifts, leftovers, rentals and a final walkthrough with the venue.\n';
      text += '\n**Next action:** ask the venue for their vendor load-in sheet and their rain plan in writing.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add logistics tasks',
          items: taskSuggestions(ctx, [
            { offset: 16, title: 'Get the venue load-in sheet, curfew and rain plan in writing', category: 'logistics', priority: 'high' },
            { offset: 9, title: 'Build the day-of contact sheet for all vendors', category: 'logistics', priority: 'high' },
          ]),
        }],
      };
    },

    risk(ctx) {
      let text = header(ctx) + '\n\n### Your three most likely failure points\n';
      const over = ctx.budget.categories.filter((c) => c.over);
      const openHigh = ctx.tasks.next.filter((t) => t.priority === 'high').length;
      text += '1. **' + (over.length ? 'Budget drift in ' + over.map((c) => c.label).join(' and ') : 'Late vendor decisions') + '.** ' +
        (over.length ? 'Those categories are already over plan; fix them before adding anything new.' : 'Your highest-priority open tasks have not been closed yet.') + '\n';
      text += '2. **Headcount change.** ' + ctx.guests.pending + ' seats are awaiting reply. Set the RSVP deadline and confirm the plate buffer in writing.\n';
      text += '3. **Day-of coordination.** ' + (openHigh ? openHigh + ' high-priority tasks are still open.' : 'Nothing is assigned to a single owner for the day.') + '\n';
      text += '\n### Prep that takes an hour and saves the event\n';
      text += '- A printed run sheet with times, names and numbers.\n';
      text += '- A cash envelope with the final payments, individually labelled.\n';
      text += '- A small kit: pins, tape, stain remover, spare shoes, snacks, chargers.\n';
      text += '- A named deputy who can make decisions if you cannot be found.\n';
      text += '\n**Next action:** pick your day-of point person this week and tell them.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add risk tasks',
          items: taskSuggestions(ctx, [
            { offset: 14, title: 'Prepare the day-of kit and cash envelope', category: 'logistics', priority: 'medium' },
            { offset: 7, title: 'Brief the day-of point person and share the run sheet', category: 'logistics', priority: 'high' },
          ]),
        }],
      };
    },

    general(ctx) {
      const e = ctx.event;
      const tier = budgetTier(ctx);
      let text = header(ctx) + '\n\n';
      text += 'Here is where I would focus, given ' + relDays(e.date) + ', ' + guestCount(ctx) + ' guests and ' + tier.phrase + ':\n\n';
      text += '### Do these three first\n';
      text += '1. ' + (ctx.tasks.overdue.length ? 'Clear the ' + ctx.tasks.overdue.length + ' overdue task' + (ctx.tasks.overdue.length === 1 ? '' : 's') + ' — starting with "' + ctx.tasks.overdue[0].title + '".' : 'Lock the venue and the budget split so everything else has a container.') + '\n';
      text += '2. ' + (ctx.budget.remaining >= 0 ? 'Decide what the ' + m(ctx.budget.remaining) + ' unallocated budget is for before it disappears.' : 'Bring the plan back under budget — you are ' + m(Math.abs(ctx.budget.remaining)) + ' over.') + '\n';
      text += '3. ' + (ctx.guests.total ? 'Chase the ' + ctx.guests.pending + ' seats still awaiting an RSVP.' : 'Get the guest list started; every other number depends on it.') + '\n';
      text += '\n### Then, in order\n';
      text += '- Confirm vendors in writing with timings and payment schedule.\n';
      text += '- Hand the caterer the dietary and access notes, not just the count.\n';
      text += '- Write the day-of run sheet and name one person to hold it.\n';
      if ((e.priorities || []).length) text += '\nYou told me these matter most: **' + e.priorities.join(', ') + '**. Every trade-off should protect the first of those.\n';
      text += '\nAsk me for a timeline, a budget review, theme ideas, or "what am I forgetting" — I can turn any of it into tasks.';
      return {
        text,
        suggestions: [{
          kind: 'tasks',
          label: 'Add the three first steps',
          items: taskSuggestions(ctx, [
            { offset: 14, title: 'Confirm each vendor in writing with timings and payment schedule', category: 'logistics', priority: 'high' },
            { offset: 21, title: 'Set and share the RSVP deadline', category: 'guests', priority: 'medium' },
          ]),
        }],
      };
    },
  };

  function demoAnswer(prompt, ctx) {
    const intent = detectIntent(prompt);
    const fn = ANSWERS[intent] || ANSWERS.general;
    let result;
    try {
      result = fn(ctx);
    } catch (err) {
      console.error('Demo engine error', err);
      result = {
        text: 'I could not build that answer from the current event data. Try asking about the timeline, budget, vendors or guests.',
        suggestions: [],
      };
    }
    return {
      text: result.text,
      suggestions: (result.suggestions || []).filter((s) => s.items && s.items.length),
      source: 'demo',
      intent,
    };
  }

  /** Short, deterministic planning summary for the Overview card. */
  AI.digest = function (ctx) {
    const e = ctx.event;
    const b = ctx.budget;
    const days = e.daysUntil;
    const lines = [];
    const push = (s) => lines.push(s);

    if (days < 0) {
      push('The event date has passed. Update it in **Event details** to restart the countdown and timeline.');
    } else if (days <= 14) {
      push('**' + days + ' days out.** You are in the final stretch — confirm vendor timings, final counts and payments in writing, and keep one person holding the run sheet.');
    } else if (days <= 45) {
      push('**' + days + ' days out.** This is when confirmations matter more than ideas: lock booked vendors, freeze the guest count and send reminders.');
    } else {
      push('**' + days + ' days out.** You have room to choose well. Prioritise venue, catering and photography before anything decorative.');
    }

    if (b.overTotal) {
      push('The plan is **' + ms(b.planned - b.total) + ' over** your ' + ms(b.total) + ' budget. Trim a category before adding anything new.');
    } else if (b.remaining > 0) {
      push('**' + ms(b.remaining) + ' of your ' + ms(b.total) + ' budget is still unallocated.** Decide what it is for — a contingency reserve is usually the best answer.');
    } else {
      push('Your budget is fully allocated and balanced. Keep actual spend recorded as deposits go out.');
    }

    if (ctx.tasks.overdue.length) {
      push('**' + ctx.tasks.overdue.length + ' task' + (ctx.tasks.overdue.length === 1 ? ' is' : 's are') + ' overdue** — start with “' + ctx.tasks.overdue[0].title + '”.');
    } else if (ctx.tasks.open) {
      push(ctx.tasks.open + ' open tasks, next due ' + (ctx.tasks.next[0] ? GG.fmtDate(ctx.tasks.next[0].due, 'day') : 'soon') + '. Nothing is overdue.');
    } else {
      push('No open tasks. Generate a timeline to make sure nothing is missing.');
    }

    if (ctx.guests.total === 0) {
      push('No guests added yet — the guest list decides catering, seating and favors, so start it early.');
    } else if (ctx.guests.pending > 0) {
      push(ctx.guests.pending + ' seat' + (ctx.guests.pending === 1 ? '' : 's') + ' still awaiting an RSVP. One reminder usually clears most of them.');
    } else {
      push('Every guest has replied — you can finalise the seating plan and plate counts.');
    }

    const missingVendor = ['venue', 'food', 'photography'].filter((cat) => !ctx.vendors.some((v) => v.category === cat && (v.status === 'booked' || v.status === 'paid')));
    if (missingVendor.length) {
      const labels = missingVendor.map((id) => (T.VENDOR_CATEGORIES.find((c) => c.id === id) || { label: id }).label);
      push('Nothing booked yet for **' + labels.join(', ') + '**.');
    }

    return {
      label: 'Generated from your event data · simulated, not a live AI service',
      html: GG.mdLite(lines.join('\n')),
    };
  };

  AI.demoIntent = detectIntent;
  AI.buildSystemPrompt = buildSystemPrompt;
  GG.AI = AI;
})();
