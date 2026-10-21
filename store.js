/* Gather & Glow — state store: persistence, mutations and derived selectors. */
(function () {
  'use strict';
  const GG = window.GG;
  const T = GG.Templates;
  const CFG = window.GG_CONFIG;
  const KEY = CFG.STORAGE_KEY;

  let listeners = [];
  let state = null;

  const nowISO = () => new Date().toISOString();

  /* ------------------------------------------------------------------ *
   * Seeding
   * ------------------------------------------------------------------ */
  function tasksFromTemplate(type, eventDateISO) {
    const base = GG.parseISO(eventDateISO) || GG.today();
    const tpl = T.TASK_TEMPLATES[type] || T.TASK_TEMPLATES.other;
    return tpl.map((t) => ({
      id: GG.uid('task'),
      title: t.title,
      category: t.category,
      priority: t.priority,
      due: GG.toISO(eventDateISO ? GG.addDays(base, -t.offset) : GG.addDays(GG.today(), -t.offset + 30)),
      status: 'todo',
      notes: '',
      source: 'template',
    }));
  }

  function ideasFromPool(type, source) {
    const pool = T.IDEA_POOL[type] || T.IDEA_POOL.other;
    return pool.map((idea) => ({
      id: GG.uid('idea'),
      kind: idea.kind,
      title: idea.title,
      desc: idea.desc,
      cost: idea.cost,
      tags: idea.tags || [],
      state: 'new', // new | saved | dismissed
      source: source || 'personalised',
    }));
  }

  function vendorsFromSeed(type) {
    const seed = T.SAMPLE_VENDORS[type] || [];
    return seed.map((v) => ({
      id: GG.uid('vendor'),
      category: v.category,
      name: v.name,
      person: v.person || '',
      phone: v.phone || '',
      email: v.email || '',
      quote: v.quote || 0,
      deposit: v.deposit || 0,
      status: v.status || 'researching',
      notes: v.notes || '',
      checkedQuestions: [],
      sample: true,
    }));
  }

  function budgetFromSplit(type, total) {
    const split = T.BUDGET_SPLIT[type] || T.BUDGET_SPLIT.other;
    return T.BUDGET_CATEGORIES.map((c) => ({
      id: GG.uid('bud'),
      category: c.id,
      label: c.label,
      planned: Math.round(((total || 0) * (split[c.id] || 0)) / 100),
      actual: 0,
      source: 'suggested',
      note: '',
    }));
  }

  function buildDemoState() {
    const seed = T.seededWedding();
    const base = GG.parseISO(seed.event.date);
    const tasks = tasksFromTemplate(seed.event.type, seed.event.date).map((task) => {
      /* how many days before the event this task was scheduled */
      const daysBefore = GG.daysBetween(GG.parseISO(task.due), base);
      const done = daysBefore >= 125;
      return Object.assign({}, task, {
        status: done ? 'done' : 'todo',
        completedAt: done ? new Date().toISOString() : null,
      });
    });
    const ideas = ideasFromPool('wedding', 'sample').map((idea) => {
      if (idea.title === 'Seed-paper place cards') return Object.assign({}, idea, { state: 'saved' });
      if (idea.title === 'Family-photo wall instead of a flower wall') return Object.assign({}, idea, { state: 'saved' });
      return idea;
    });
    return {
      schemaVersion: CFG.SCHEMA_VERSION,
      seeded: true,
      event: seed.event,
      budgetItems: seed.budget.map((b) => Object.assign({ id: GG.uid('bud'), note: '', source: 'manual' }, b)),
      tasks,
      vendors: vendorsFromSeed('wedding'),
      guests: seed.guests.map((g) => Object.assign({ id: GG.uid('guest') }, g)),
      ideas,
      chat: [],
      meta: { createdAt: nowISO(), updatedAt: nowISO(), demoSeededAt: nowISO() },
    };
  }

  function buildFreshState(setup) {
    const type = setup.type || 'other';
    const budgetTotal = Number(setup.budgetTotal) || 0;
    return {
      schemaVersion: CFG.SCHEMA_VERSION,
      seeded: false,
      event: {
        type,
        name: setup.name,
        date: setup.date,
        location: setup.location || '',
        guestCount: Number(setup.guestCount) || 0,
        currency: setup.currency || 'INR',
        budgetTotal,
        style: setup.style || '',
        priorities: setup.priorities || [],
        dietary: setup.dietary || '',
        accessibility: setup.accessibility || '',
        notes: setup.notes || '',
      },
      budgetItems: budgetFromSplit(type, budgetTotal),
      tasks: tasksFromTemplate(type, setup.date),
      vendors: [],
      guests: [],
      ideas: ideasFromPool(type, 'personalised'),
      chat: [],
      meta: { createdAt: nowISO(), updatedAt: nowISO() },
    };
  }

  /* ------------------------------------------------------------------ *
   * Persistence
   * ------------------------------------------------------------------ */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.event && parsed.schemaVersion === CFG.SCHEMA_VERSION) {
          state = normalize(parsed);
          return state;
        }
      }
    } catch (e) {
      console.warn('Could not read saved data; starting fresh.', e);
    }
    state = buildDemoState();
    save();
    return state;
  }

  function normalize(s) {
    s.budgetItems = Array.isArray(s.budgetItems) ? s.budgetItems : [];
    s.tasks = Array.isArray(s.tasks) ? s.tasks : [];
    s.vendors = Array.isArray(s.vendors) ? s.vendors : [];
    s.guests = Array.isArray(s.guests) ? s.guests : [];
    s.ideas = Array.isArray(s.ideas) ? s.ideas : [];
    s.chat = Array.isArray(s.chat) ? s.chat : [];
    s.meta = s.meta || { createdAt: nowISO() };
    s.event = s.event || {};
    return s;
  }

  function save() {
    try {
      state.meta.updatedAt = nowISO();
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to local storage', e);
    }
  }

  function emit(reason) {
    listeners.forEach((fn) => {
      try { fn(state, reason); } catch (e) { console.error(e); }
    });
  }

  function commit(reason) {
    save();
    emit(reason);
  }

  /* ------------------------------------------------------------------ *
   * Mutations
   * ------------------------------------------------------------------ */
  const Store = {
    get state() { return state; },
    load,
    subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter((f) => f !== fn); }; },
    save, emit,

    /** Replace everything with a brand new event built from wizard input. */
    createEvent(setup) {
      state = buildFreshState(setup);
      commit('event:create');
      return state;
    },

    loadDemo() {
      state = buildDemoState();
      commit('event:demo');
      return state;
    },

    resetDemo() {
      state = buildDemoState();
      commit('event:reset');
      return state;
    },

    clearAll() {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      state = buildDemoState();
      commit('event:reset');
    },

    updateEvent(patch) {
      Object.assign(state.event, patch);
      commit('event:update');
    },

    /* ----- budget ----- */
    addBudgetItem(item) {
      const record = Object.assign(
        { id: GG.uid('bud'), category: 'venue', label: 'New budget item', planned: 0, actual: 0, note: '', source: 'manual' },
        item
      );
      state.budgetItems.push(record);
      commit('budget:add');
      return record;
    },
    updateBudgetItem(id, patch) {
      const item = state.budgetItems.find((b) => b.id === id);
      if (!item) return null;
      Object.assign(item, patch);
      commit('budget:update');
      return item;
    },
    removeBudgetItem(id) {
      state.budgetItems = state.budgetItems.filter((b) => b.id !== id);
      commit('budget:remove');
    },
    /** Scale every planned amount so the plan matches a new total budget. */
    rebalanceBudget(newTotal) {
      const summary = Selectors.budget();
      state.event.budgetTotal = Number(newTotal) || 0;
      const currentPlanned = summary.planned;
      if (currentPlanned > 0) {
        const factor = (Number(newTotal) || 0) / currentPlanned;
        state.budgetItems.forEach((b) => { b.planned = Math.round((b.planned * factor) / 100) * 100; });
      }
      commit('budget:rebalance');
    },

    /** Reset planned amounts to the event type's suggested percentage split. */
    applySplit() {
      const type = state.event.type;
      const total = Number(state.event.budgetTotal) || 0;
      const split = T.BUDGET_SPLIT[type] || T.BUDGET_SPLIT.other;
      T.BUDGET_CATEGORIES.forEach((cat) => {
        const target = Math.round(((total * (split[cat.id] || 0)) / 100) / 100) * 100;
        const items = state.budgetItems.filter((b) => b.category === cat.id);
        const current = items.reduce((s, i) => s + (Number(i.planned) || 0), 0);
        if (!items.length) {
          state.budgetItems.push({
            id: GG.uid('bud'), category: cat.id, label: cat.label + ' — suggested allocation',
            planned: target, actual: 0, note: '', source: 'suggested',
          });
        } else if (current > 0) {
          const factor = target / current;
          items.forEach((i) => { i.planned = Math.round((i.planned * factor) / 100) * 100; });
        } else {
          items[0].planned = target;
        }
      });
      commit('budget:split');
    },

    /* ----- tasks ----- */
    addTask(task) {
      const record = Object.assign(
        { id: GG.uid('task'), title: 'New task', category: 'logistics', priority: 'medium', due: GG.toISO(GG.addDays(GG.today(), 7)), status: 'todo', notes: '', source: 'manual' },
        task
      );
      state.tasks.push(record);
      commit('tasks:add');
      return record;
    },
    addTasks(list, reason) {
      const added = (list || []).map((t) => {
        const record = Object.assign(
          { id: GG.uid('task'), category: 'logistics', priority: 'medium', due: GG.toISO(GG.addDays(GG.today(), 14)), status: 'todo', notes: '', source: 'ai' },
          t
        );
        state.tasks.push(record);
        return record;
      });
      commit(reason || 'tasks:add-many');
      return added;
    },
    updateTask(id, patch) {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return null;
      Object.assign(task, patch);
      commit('tasks:update');
      return task;
    },
    toggleTask(id) {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return null;
      task.status = task.status === 'done' ? 'todo' : 'done';
      task.completedAt = task.status === 'done' ? nowISO() : null;
      commit('tasks:toggle');
      return task;
    },
    removeTask(id) {
      state.tasks = state.tasks.filter((t) => t.id !== id);
      commit('tasks:remove');
    },

    /* ----- vendors ----- */
    addVendor(vendor) {
      const record = Object.assign(
        { id: GG.uid('vendor'), category: 'venue', name: '', person: '', phone: '', email: '', quote: 0, deposit: 0, status: 'researching', notes: '', checkedQuestions: [], sample: false },
        vendor
      );
      state.vendors.push(record);
      commit('vendors:add');
      return record;
    },
    updateVendor(id, patch) {
      const v = state.vendors.find((x) => x.id === id);
      if (!v) return null;
      Object.assign(v, patch);
      commit('vendors:update');
      return v;
    },
    removeVendor(id) {
      state.vendors = state.vendors.filter((v) => v.id !== id);
      commit('vendors:remove');
    },
    toggleVendorQuestion(id, index) {
      const v = state.vendors.find((x) => x.id === id);
      if (!v) return;
      v.checkedQuestions = v.checkedQuestions || [];
      const at = v.checkedQuestions.indexOf(index);
      if (at >= 0) v.checkedQuestions.splice(at, 1);
      else v.checkedQuestions.push(index);
      commit('vendors:question');
    },

    /* ----- guests ----- */
    addGuest(guest) {
      const record = Object.assign(
        { id: GG.uid('guest'), name: '', email: '', group: 'Friends', rsvp: 'pending', meal: 'Veg', dietary: 'No restrictions', access: 'None', plusOnes: 0 },
        guest
      );
      state.guests.push(record);
      commit('guests:add');
      return record;
    },
    addGuests(list) {
      const added = (list || []).map((g) => Object.assign(
        { id: GG.uid('guest'), name: '', email: '', group: 'Friends', rsvp: 'pending', meal: 'Veg', dietary: 'No restrictions', access: 'None', plusOnes: 0 },
        g
      ));
      state.guests = state.guests.concat(added);
      commit('guests:import');
      return added;
    },
    updateGuest(id, patch) {
      const g = state.guests.find((x) => x.id === id);
      if (!g) return null;
      Object.assign(g, patch);
      commit('guests:update');
      return g;
    },
    removeGuest(id) {
      state.guests = state.guests.filter((g) => g.id !== id);
      commit('guests:remove');
    },

    /* ----- ideas ----- */
    setIdeaState(id, next) {
      const idea = state.ideas.find((i) => i.id === id);
      if (!idea) return null;
      idea.state = next;
      commit('ideas:state');
      return idea;
    },

    /* ----- chat ----- */
    pushChat(message) {
      state.chat.push(message);
      commit('chat:push');
      return message;
    },
    updateChat(id, patch) {
      const msg = state.chat.find((m) => m.id === id);
      if (!msg) return null;
      Object.assign(msg, patch);
      commit('chat:update');
      return msg;
    },
    clearChat() {
      state.chat = [];
      commit('chat:clear');
    },
  };

  /* ------------------------------------------------------------------ *
   * Selectors — everything derived, so all totals stay in sync
   * ------------------------------------------------------------------ */
  const Selectors = {
    event() { return state.event; },
    currency() { return state.event.currency || 'INR'; },

    budget() {
      const event = state.event;
      const total = Number(event.budgetTotal) || 0;
      const items = state.budgetItems;
      const planned = items.reduce((sum, i) => sum + (Number(i.planned) || 0), 0);
      const actual = items.reduce((sum, i) => sum + (Number(i.actual) || 0), 0);
      const byCategory = T.BUDGET_CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.id);
        const p = catItems.reduce((s, i) => s + (Number(i.planned) || 0), 0);
        const a = catItems.reduce((s, i) => s + (Number(i.actual) || 0), 0);
        return {
          id: cat.id, label: cat.label, icon: cat.icon, tone: cat.tone,
          planned: p, actual: a, items: catItems,
          remaining: p - a,
          over: a > p && p > 0,
          share: planned > 0 ? Math.round((p / planned) * 100) : 0,
          suggested: Math.round((total * ((T.BUDGET_SPLIT[event.type] || {})[cat.id] || 0)) / 100),
        };
      });
      const overCategories = byCategory.filter((c) => c.over);
      return {
        total, planned, actual,
        remaining: total - planned,
        unallocated: total - planned,
        spentRemaining: total - actual,
        overTotal: planned > total,
        overBy: planned - total,
        byCategory,
        overCategories,
        pctPlanned: GG.pct(planned, total),
        pctActual: GG.pct(actual, total),
        itemCount: items.length,
      };
    },

    tasks() {
      const tasks = state.tasks.slice();
      const open = tasks.filter((t) => t.status !== 'done');
      const done = tasks.filter((t) => t.status === 'done');
      const withDue = open.filter((t) => t.due).sort((a, b) => (a.due < b.due ? -1 : 1));
      const overdue = withDue.filter((t) => GG.daysUntil(t.due) < 0);
      const dueSoon = withDue.filter((t) => GG.daysUntil(t.due) >= 0 && GG.daysUntil(t.due) <= 14);
      return {
        all: tasks, open, done, overdue, dueSoon,
        total: tasks.length,
        pct: GG.pct(done.length, tasks.length),
        next: withDue.slice(0, 6),
        byId: (id) => tasks.find((t) => t.id === id),
      };
    },

    vendors() {
      const list = state.vendors;
      const rank = (v) => (T.VENDOR_STATUSES.find((s) => s.id === v.status) || { order: 0 }).order;
      const booked = list.filter((v) => v.status === 'booked' || v.status === 'paid');
      const paid = list.filter((v) => v.status === 'paid');
      const quotes = list.filter((v) => Number(v.quote) > 0);
      const quoteTotal = quotes.reduce((s, v) => s + Number(v.quote), 0);
      const depositTotal = list.reduce((s, v) => s + (Number(v.deposit) || 0), 0);
      const byCategory = T.VENDOR_CATEGORIES.map((c) => ({
        id: c.id, label: c.label, icon: c.icon,
        vendors: list.filter((v) => v.category === c.id).sort((a, b) => rank(b) - rank(a)),
      }));
      return {
        all: list.slice().sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name)),
        booked, paid, quoteTotal, depositTotal,
        total: list.length,
        pct: GG.pct(booked.length, list.length),
        byCategory,
        categoriesCovered: byCategory.filter((c) => c.vendors.length > 0).length,
      };
    },

    guests() {
      const list = state.guests;
      const count = (fn) => list.filter(fn).length;
      const heads = (arr) => arr.reduce((s, g) => s + 1 + (Number(g.plusOnes) || 0), 0);
      const yes = list.filter((g) => g.rsvp === 'yes');
      const maybe = list.filter((g) => g.rsvp === 'maybe');
      const no = list.filter((g) => g.rsvp === 'no');
      const pending = list.filter((g) => g.rsvp === 'pending');
      const meals = {};
      list.forEach((g) => { meals[g.meal || 'Not decided'] = (meals[g.meal || 'Not decided'] || 0) + 1 + (Number(g.plusOnes) || 0); });
      const restrictions = list.filter((g) => g.dietary && g.dietary !== 'No restrictions');
      const accessNeeds = list.filter((g) => g.access && g.access !== 'None');
      const invitedHeads = heads(list);
      return {
        all: list, yes, maybe, no, pending,
        total: list.length,
        invitedHeads,
        rsvpYes: heads(yes), rsvpMaybe: heads(maybe), rsvpNo: heads(no), rsvpPending: heads(pending),
        confirmedSeats: heads(yes),
        meals: Object.keys(meals).sort((a, b) => meals[b] - meals[a]).map((k) => ({ meal: k, count: meals[k] })),
        restrictions, accessNeeds,
        respondedPct: GG.pct(yes.length + no.length + maybe.length, list.length),
        capacityGap: (Number(state.event.guestCount) || 0) - invitedHeads,
      };
    },

    milestones() {
      const type = state.event.type || 'other';
      const list = T.MILESTONES[type] || T.MILESTONES.other;
      const vendors = Selectors.vendors();
      const tasks = Selectors.tasks();
      const guests = Selectors.guests();
      const budget = Selectors.budget();
      const done = (check) => {
        if (!check) return false;
        const [kind, arg] = check.split(':');
        if (kind === 'vendorBooked') {
          return vendors.all.some((v) => v.category === arg && (v.status === 'booked' || v.status === 'paid'));
        }
        if (kind === 'taskDone') {
          const needle = arg.toLowerCase();
          return tasks.all.some((t) => t.status === 'done' && t.title.toLowerCase().indexOf(needle) >= 0);
        }
        if (kind === 'taskMatch') {
          const needle = arg.toLowerCase();
          return tasks.all.some((t) => t.status === 'done' && t.title.toLowerCase().indexOf(needle) >= 0);
        }
        if (kind === 'rsvpQuorum') return guests.total > 0 && guests.respondedPct >= 60;
        if (kind === 'budgetOk') return !budget.overTotal && budget.total > 0;
        return false;
      };
      const items = list.map((m) => ({ id: m.id, label: m.label, done: done(m.check) }));
      return { items, pct: GG.pct(items.filter((i) => i.done).length, items.length), doneCount: items.filter((i) => i.done).length, total: items.length };
    },

    ideas() {
      const all = state.ideas;
      const visible = all.filter((i) => i.state !== 'dismissed');
      return {
        all,
        visible,
        saved: all.filter((i) => i.state === 'saved'),
        dismissed: all.filter((i) => i.state === 'dismissed'),
        groups: Object.keys(T.IDEA_KIND_LABELS).map((kind) => ({
          kind, label: T.IDEA_KIND_LABELS[kind],
          ideas: visible.filter((i) => i.kind === kind),
        })).filter((g) => g.ideas.length),
      };
    },

    ideaCost(idea) {
      const cost = idea.cost || {};
      if (cost.pct) return Math.round(((Number(state.event.budgetTotal) || 0) * cost.pct) / 100) * 100;
      if (cost.perGuest) return Math.round((Number(state.event.guestCount) || 0) * cost.perGuest);
      return 0;
    },

    countdown() {
      const days = GG.daysUntil(state.event.date);
      const eventDate = GG.parseISO(state.event.date);
      return { days, isPast: days < 0, weeks: Math.floor(Math.abs(days) / 7) };
    },

    /** Compact, factual snapshot passed to the AI layer (demo engine or proxy). */
    aiContext() {
      const e = state.event;
      const budget = Selectors.budget();
      const tasks = Selectors.tasks();
      const vendors = Selectors.vendors();
      const guests = Selectors.guests();
      const milestones = Selectors.milestones();
      return {
        event: {
          type: e.type, name: e.name, date: e.date, location: e.location,
          guestCount: Number(e.guestCount) || 0, currency: e.currency || 'INR',
          budgetTotal: Number(e.budgetTotal) || 0, style: e.style,
          priorities: e.priorities || [], dietary: e.dietary, accessibility: e.accessibility, notes: e.notes,
          daysUntil: GG.daysUntil(e.date),
        },
        budget: {
          total: budget.total, planned: budget.planned, actual: budget.actual,
          remaining: budget.remaining, overTotal: budget.overTotal,
          categories: budget.byCategory.filter((c) => c.planned > 0).map((c) => ({
            id: c.id, label: c.label, planned: c.planned, actual: c.actual, over: c.over,
          })),
        },
        tasks: {
          total: tasks.total, open: tasks.open.length, done: tasks.done.length,
          overdue: tasks.overdue.map((t) => ({ title: t.title, due: t.due })),
          next: tasks.next.map((t) => ({ title: t.title, due: t.due, priority: t.priority })),
        },
        vendors: vendors.all.map((v) => ({ category: v.category, name: v.name, status: v.status, quote: Number(v.quote) || 0 })),
        guests: {
          total: guests.total, invitedHeads: guests.invitedHeads, confirmed: guests.confirmedSeats,
          pending: guests.rsvpPending, declined: guests.rsvpNo,
          dietary: guests.restrictions.map((g) => g.dietary),
          access: guests.accessNeeds.map((g) => g.access),
        },
        milestones: milestones.items,
        ideasSaved: Selectors.ideas().saved.length,
      };
    },
  };

  GG.Store = Store;
  GG.Selectors = Selectors;
})();
