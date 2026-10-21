/* Gather & Glow — Overview */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money, fmtDate, daysUntil } = GG;
  const UI = GG.UI;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  function nextBestAction() {
    const budget = S().budget();
    const tasks = S().tasks();
    const vendors = S().vendors();
    const guests = S().guests();
    if (budget.overTotal) return { href: '#/budget', label: 'Bring the budget back in line' };
    if (tasks.overdue.length) return { href: '#/timeline', label: 'Clear ' + tasks.overdue.length + ' overdue task' + (tasks.overdue.length === 1 ? '' : 's') };
    if (!vendors.total) return { href: '#/vendors', label: 'Start your vendor checklist' };
    if (!guests.total) return { href: '#/guests', label: 'Build your guest list' };
    if (vendors.booked.length < Math.max(2, Math.ceil(vendors.total / 2))) return { href: '#/vendors', label: 'Move vendors to booked' };
    if (tasks.next.length) return { href: '#/timeline', label: 'Continue your timeline' };
    return { href: '#/assistant', label: 'Ask what to do next' };
  }

  function statCard({ label, value, meta, tone, iconName, bar }) {
    return '<div class="stat' + (tone ? ' stat--' + tone : '') + '">' +
      '<div class="stat__label">' + icon(iconName || 'wallet', { size: 13 }) + esc(label) + '</div>' +
      '<div class="stat__value">' + esc(value) + '</div>' +
      (bar ? '<div class="stat__bar">' + bar + '</div>' : '') +
      (meta ? '<div class="stat__meta">' + meta + '</div>' : '') +
      '</div>';
  }

  GG.Views = GG.Views || {};
  GG.Views.overview = {
    render() {
      const e = S().event();
      const cur = S().currency();
      const budget = S().budget();
      const tasks = S().tasks();
      const vendors = S().vendors();
      const guests = S().guests();
      const milestones = S().milestones();
      const countdown = S().countdown();
      const next = nextBestAction();
      const typeMeta = GG.Templates.EVENT_TYPES.find((t) => t.id === e.type) || GG.Templates.EVENT_TYPES[3];

      const alerts = [];
      if (budget.overTotal) {
        alerts.push('<div class="alert alert--danger">' + icon('alert', { size: 18 }) + '<div><strong>Plan exceeds budget by ' + esc(money(budget.overBy, cur)) + '.</strong> ' +
          'Planned spend is ' + esc(money(budget.planned, cur)) + ' against a ' + esc(money(budget.total, cur)) + ' total. ' +
          '<a href="#/budget">Review the budget planner</a>.</div></div>');
      }
      if (tasks.overdue.length) {
        alerts.push('<div class="alert alert--warn">' + icon('clock', { size: 18 }) + '<div><strong>' + tasks.overdue.length + ' task' + (tasks.overdue.length === 1 ? ' is' : 's are') + ' overdue.</strong> ' +
          'Start with “' + esc(tasks.overdue[0].title) + '”. <a href="#/timeline">Open the timeline</a>.</div></div>');
      }
      if (budget.overCategories.length) {
        const names = budget.overCategories.map((c) => c.label).join(', ');
        alerts.push('<div class="alert alert--info">' + icon('info', { size: 18 }) + '<div>Actual spend is above the plan in <strong>' + esc(names) + '</strong>. Some of this can be deposits rather than overspend — check the category rows.</div></div>');
      }

      const topCats = budget.byCategory.slice().sort((a, b) => b.planned - a.planned).slice(0, 5);

      const budgetBars = topCats.map((c) => (
        '<div style="margin-bottom:12px">' +
        '<div class="progress-row"><span>' + esc(c.label) + '</span><strong>' + esc(money(c.planned, cur)) + '</strong></div>' +
        UI.progress(c.planned ? (c.actual / c.planned) * 100 : 0, c.over ? 'danger' : 'gold', c.label + ' actual spend against plan') +
        '<div class="xsmall muted" style="margin-top:4px">Spent ' + esc(money(c.actual, cur)) + ' of ' + esc(money(c.planned, cur)) + (c.over ? ' — over plan' : '') + '</div>' +
        '</div>'
      )).join('');

      const milestoneItems = milestones.items.map((m) => (
        '<div class="milestone ' + (m.done ? 'milestone--done' : 'milestone--open') + '">' +
        '<span class="milestone__mark" aria-hidden="true">' + icon('check', { size: 13 }) + '</span>' +
        '<span class="milestone__label">' + esc(m.label) + '</span>' +
        '<span class="milestone__status">' + (m.done ? 'Done' : 'Not yet') + '</span></div>'
      )).join('');

      const deadlines = tasks.next.length
        ? tasks.next.map((t) => {
          const due = GG.relativeDue(t.due);
          const d = GG.parseISO(t.due);
          return '<div class="deadline' + (due.tone === 'danger' ? ' deadline--danger' : '') + '">' +
            '<div class="deadline__date"><span class="deadline__day">' + (d ? d.getDate() : '–') + '</span>' +
            '<span class="deadline__mon">' + (d ? GG.MONTHS[d.getMonth()].slice(0, 3) : '') + '</span></div>' +
            '<div class="deadline__body"><div class="deadline__title">' + esc(t.title) + '</div>' +
            '<div class="xsmall muted">' + esc(due.label) + ' · ' + esc(t.category) + (t.priority === 'high' ? ' · high priority' : '') + '</div></div></div>';
        }).join('')
        : UI.empty({ iconName: 'calendar', title: 'No deadlines yet', message: 'Generate a planning timeline to see what is due next.', action: '<a class="btn btn--ghost btn--sm" href="#/timeline">Open timeline</a>' });

      const digest = GG.AI.digest(S().aiContext());

      const progressRows = [
        { label: 'Tasks complete', value: tasks.done.length + ' / ' + tasks.total, pct: tasks.pct, tone: 'ok', href: '#/timeline' },
        { label: 'Vendors secured', value: vendors.booked.length + ' / ' + vendors.total, pct: vendors.pct, tone: 'plum', href: '#/vendors' },
        { label: 'Planning milestones', value: milestones.doneCount + ' / ' + milestones.total, pct: milestones.pct, tone: 'gold', href: '#/overview' },
        { label: 'RSVPs received', value: guests.total ? guests.respondedPct + '%' : 'No guests yet', pct: guests.total ? guests.respondedPct : 0, tone: 'ok', href: '#/guests' },
      ].map((r) => (
        '<div style="margin-bottom:14px">' +
        '<div class="progress-row"><span>' + esc(r.label) + '</span><strong>' + esc(r.value) + '</strong></div>' +
        UI.progress(r.pct, r.tone, r.label) + '</div>'
      )).join('');

      return '' +
        '<div class="view-head">' +
        '<div><div class="view-head__eyebrow">Overview</div>' +
        '<h1>Your celebration, in one place</h1>' +
        '<p class="lede">Everything below is calculated live from your budget, tasks, vendors and guest list.</p></div>' +
        '<div class="view-head__actions">' +
        '<a class="btn btn--ghost" href="#/event">' + icon('pencil', { size: 16 }) + 'Edit event details</a>' +
        '<a class="btn btn--ghost" href="#/assistant">' + icon('sparkle', { size: 16 }) + 'Ask the assistant</a>' +
        '</div></div>' +

        '<section class="hero" aria-labelledby="hero-title">' +
        '<div class="hero__grid">' +
        '<div>' +
        '<div class="hero__eyebrow">' + icon(typeMeta.icon, { size: 15 }) + esc(typeMeta.label) +
        (countdown.isPast ? ' · <span class="badge badge--warn">Date has passed</span>' : '') + '</div>' +
        '<h1 class="hero__title" id="hero-title">' + esc(e.name || 'Untitled celebration') + '</h1>' +
        (e.style ? '<div class="hero__style">' + esc(e.style) + ' style</div>' : '') +
        '<div class="hero__meta">' +
        '<span>' + icon('calendar', { size: 16 }) + esc(fmtDate(e.date, 'long')) + '</span>' +
        (e.location ? '<span>' + icon('pin', { size: 16 }) + esc(e.location) + '</span>' : '') +
        '<span>' + icon('users', { size: 16 }) + esc(e.guestCount + ' guests planned') + '</span>' +
        '<span>' + icon('wallet', { size: 16 }) + esc(money(e.budgetTotal, cur)) + ' budget</span>' +
        '</div>' +
        '<div class="hero__actions">' +
        '<a class="btn btn--gold btn--lg" href="' + next.href + '">' + esc(next.label) + icon('arrow-right', { size: 17 }) + '</a>' +
        '<a class="btn btn--ghost" href="#/timeline">' + icon('list', { size: 16 }) + 'Timeline</a>' +
        '<a class="btn btn--ghost" href="#/budget">' + icon('wallet', { size: 16 }) + 'Budget</a>' +
        '</div></div>' +
        '<div class="hero__countdown">' +
        '<div><div class="hero__count-number">' + (countdown.isPast ? '—' : Math.abs(countdown.days)) + '</div>' +
        '<div class="hero__count-label">' + (countdown.isPast ? 'days since the event' : 'days to go') + '</div></div>' +
        '<div class="hero__count-date">' + esc(fmtDate(e.date, 'long')) + '<br><span class="xsmall">' +
        (countdown.isPast ? 'Update the date to restart the countdown' : 'That is about ' + Math.max(1, Math.round(countdown.days / 7)) + ' weeks') + '</span></div>' +
        '</div></div></section>' +

        (alerts.length ? '<div class="stack stack--tight" style="margin-bottom:18px">' + alerts.join('') + '</div>' : '') +

        '<section class="grid grid--4" aria-label="Budget summary" style="margin-bottom:20px">' +
        statCard({ label: 'Total budget', value: money(budget.total, cur), meta: 'Set in event details', iconName: 'wallet' }) +
        statCard({
          label: 'Planned spend', value: money(budget.planned, cur), tone: budget.overTotal ? 'danger' : '',
          meta: budget.pctPlanned + '% of total budget allocated',
          bar: UI.progress(budget.pctPlanned, budget.overTotal ? 'danger' : 'ok', 'Planned spend share of budget'),
        }) +
        statCard({
          label: 'Actual spend', value: money(budget.actual, cur),
          meta: 'Deposits and payments recorded',
          bar: UI.progress(budget.pctActual, 'gold', 'Actual spend share of budget'),
        }) +
        statCard({
          label: budget.remaining >= 0 ? 'Remaining to allocate' : 'Over budget by',
          value: money(Math.abs(budget.remaining), cur),
          tone: budget.remaining >= 0 ? 'ok' : 'danger',
          meta: budget.remaining >= 0 ? 'Unallocated in the plan' : 'Reduce a category or add budget',
          iconName: budget.remaining >= 0 ? 'check' : 'alert',
        }) +
        '</section>' +

        '<div class="grid grid--2" style="align-items:start">' +

        '<div class="stack">' +
        '<section class="card" aria-labelledby="budget-glance">' +
        '<div class="card__head"><div><h2 id="budget-glance">Budget at a glance</h2>' +
        '<div class="card__sub">Your five largest categories, actual against planned.</div></div>' +
        '<a class="btn btn--quiet btn--sm" href="#/budget">Open planner ' + icon('chevron-right', { size: 15 }) + '</a></div>' +
        (topCats.length ? budgetBars : UI.empty({ iconName: 'wallet', title: 'No budget items yet', message: 'Add categories and amounts to start tracking spend.', action: '<a class="btn btn--ghost btn--sm" href="#/budget">Add budget items</a>' })) +
        '</section>' +

        '<section class="card" aria-labelledby="milestones-title">' +
        '<div class="card__head"><div><h2 id="milestones-title">Planning milestones</h2>' +
        '<div class="card__sub">' + milestones.doneCount + ' of ' + milestones.total + ' milestones reached.</div></div>' +
        '<div style="min-width:120px">' + UI.progress(milestones.pct, 'gold', 'Milestones reached') + '</div></div>' +
        '<div class="milestones">' + milestoneItems + '</div>' +
        '</section>' +

        '<section class="card" aria-labelledby="progress-title">' +
        '<div class="card__head"><div><h2 id="progress-title">Where you stand</h2>' +
        '<div class="card__sub">Progress across tasks, vendors and guests.</div></div></div>' +
        progressRows +
        '<div class="btn-row" style="margin-top:6px">' +
        '<a class="btn btn--ghost btn--sm" href="#/timeline">Timeline</a>' +
        '<a class="btn btn--ghost btn--sm" href="#/vendors">Vendors</a>' +
        '<a class="btn btn--ghost btn--sm" href="#/guests">Guests</a>' +
        '</div></section>' +
        '</div>' +

        '<div class="stack">' +
        '<section class="card ai-summary" aria-labelledby="digest-title">' +
        '<div class="card__head"><div><h2 id="digest-title">Planning summary</h2>' +
        '<div class="card__sub">' + esc(digest.label) + '</div></div>' +
        '<span class="demo-pill">' + icon('sparkle', { size: 12 }) + 'Demo engine</span></div>' +
        '<div class="ai-summary__body">' + digest.html + '</div>' +
        '<div class="btn-row" style="margin-top:14px">' +
        '<a class="btn btn--ghost btn--sm" href="#/assistant">Open assistant ' + icon('arrow-right', { size: 14 }) + '</a>' +
        '<button type="button" class="btn btn--quiet btn--sm" data-action="overview:tasks-from-digest">' + icon('plus', { size: 14 }) + 'Add suggested tasks</button>' +
        '</div></section>' +

        '<section class="card" aria-labelledby="deadlines-title">' +
        '<div class="card__head"><div><h2 id="deadlines-title">Upcoming deadlines</h2>' +
        '<div class="card__sub">' + (tasks.open.length ? tasks.open.length + ' open tasks · ' + tasks.overdue.length + ' overdue' : 'All tasks complete') + '</div></div>' +
        '<a class="btn btn--quiet btn--sm" href="#/timeline">All tasks</a></div>' +
        deadlines +
        '</section>' +

        '<section class="card card--tint" aria-labelledby="continue-title">' +
        '<h2 id="continue-title" style="font-size:1.1rem">Continue planning</h2>' +
        '<p class="small muted" style="margin-top:6px">Three ways forward from here.</p>' +
        '<div class="stack stack--tight" style="margin-top:14px">' +
        '<a class="btn btn--plum btn--block" href="' + next.href + '">' + esc(next.label) + '</a>' +
        '<a class="btn btn--ghost btn--block" href="#/assistant">Ask the planning assistant</a>' +
        '<a class="btn btn--ghost btn--block" href="#/ideas">Browse personalised ideas</a>' +
        '</div></section>' +
        '</div></div>';
    },
  };

  ACTIONS['overview:tasks-from-digest'] = () => {
    const ctx = S().aiContext();
    const tasks = S().tasks();
    const suggestions = [];
    if (ctx.budget.overTotal) {
      suggestions.push({ title: 'Rebalance the budget: cut one category back under plan', category: 'budget', priority: 'high', due: GG.toISO(GG.addDays(GG.today(), 3)) });
    }
    suggestions.push({ title: 'Confirm the next vendor booking in writing', category: 'logistics', priority: 'high', due: GG.toISO(GG.addDays(GG.today(), 5)) });
    if (ctx.guests.pending) suggestions.push({ title: 'Chase the ' + ctx.guests.pending + ' seats awaiting an RSVP', category: 'guests', priority: 'medium', due: GG.toISO(GG.addDays(GG.today(), 7)) });
    const existing = tasks.all.map((t) => t.title.toLowerCase());
    const fresh = suggestions.filter((s) => !existing.some((t) => t.indexOf(s.title.toLowerCase().slice(0, 16)) >= 0));
    if (!fresh.length) {
      GG.UI.toast('Already covered', 'Those suggestions are already on your timeline.', 'warn');
      return;
    }
    GG.Store.addTasks(fresh);
    GG.UI.toast('Added ' + fresh.length + ' task' + (fresh.length === 1 ? '' : 's'), 'They are waiting on your timeline.');
  };
})();
