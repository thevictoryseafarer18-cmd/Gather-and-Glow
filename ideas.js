/* Gather & Glow — Ideas & inspiration */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  const filters = { kind: 'all', savedOnly: false };
  GG.IdeaFilters = filters;

  const KIND_TO_CATEGORY = { theme: 'decor', decor: 'decor', menu: 'food', activity: 'entertainment', favor: 'favors' };
  const KIND_ICONS = { theme: 'palette', decor: 'flower', menu: 'cup', activity: 'music', favor: 'gift' };

  function costLabel(idea, cur) {
    const est = S().ideaCost(idea);
    if (!est) return 'No added cost';
    return 'About ' + money(est, cur) + (idea.cost && idea.cost.perGuest ? ' (' + money(idea.cost.perGuest, cur) + ' per guest)' : '');
  }

  function ideaCard(idea, cur) {
    const saved = idea.state === 'saved';
    return '<article class="idea' + (saved ? ' idea--saved' : '') + '">' +
      '<div class="row row--between" style="gap:8px">' +
      '<div class="idea__kind">' + icon(KIND_ICONS[idea.kind] || 'sparkle', { size: 13 }) + esc(T.IDEA_KIND_LABELS[idea.kind] || 'Idea') + '</div>' +
      (saved ? '<span class="badge badge--gold">' + icon('star', { size: 12 }) + 'Saved</span>' : '') +
      '</div>' +
      '<h3 class="idea__title">' + esc(idea.title) + '</h3>' +
      '<p class="idea__desc">' + esc(idea.desc) + '</p>' +
      '<div class="idea__cost">' + icon('wallet', { size: 13 }) + esc(costLabel(idea, cur)) + '</div>' +
      (idea.tags && idea.tags.length ? '<div class="chip-set">' + idea.tags.map((t) => '<span class="badge badge--outline">' + esc(t) + '</span>').join('') + '</div>' : '') +
      '<div class="idea__actions">' +
      (saved
        ? '<button type="button" class="btn btn--ghost btn--sm" data-action="idea:unsave" data-id="' + idea.id + '">' + icon('x', { size: 14 }) + 'Unsave</button>'
        : '<button type="button" class="btn btn--gold btn--sm" data-action="idea:save" data-id="' + idea.id + '">' + icon('star', { size: 14 }) + 'Save</button>') +
      '<button type="button" class="btn btn--quiet btn--sm" data-action="idea:task" data-id="' + idea.id + '">' + icon('plus', { size: 14 }) + 'Task</button>' +
      '<button type="button" class="btn btn--quiet btn--sm" data-action="idea:budget" data-id="' + idea.id + '">' + icon('wallet', { size: 14 }) + 'Budget</button>' +
      '<button type="button" class="btn btn--quiet btn--sm" data-action="idea:dismiss" data-id="' + idea.id + '">' + icon('trash', { size: 14 }) + 'Dismiss</button>' +
      '</div></article>';
  }

  GG.Views = GG.Views || {};
  GG.Views.ideas = {
    render() {
      const ideas = S().ideas();
      const cur = S().currency();
      const e = S().event();
      const budget = S().budget();

      let pool = ideas.visible;
      if (filters.kind !== 'all') pool = pool.filter((i) => i.kind === filters.kind);
      if (filters.savedOnly) pool = pool.filter((i) => i.state === 'saved');

      const groups = filters.savedOnly || filters.kind !== 'all'
        ? [{ kind: 'filtered', label: filters.savedOnly ? 'Saved ideas' : (T.IDEA_KIND_LABELS[filters.kind] || 'Ideas'), ideas: pool }]
        : ideas.groups.map((g) => ({ kind: g.kind, label: g.label, ideas: g.ideas.filter((i) => pool.indexOf(i) >= 0) })).filter((g) => g.ideas.length);

      const perGuest = e.guestCount ? Math.round(budget.total / e.guestCount) : 0;

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">Inspiration</div>' +
        '<h1>Ideas &amp; inspiration</h1>' +
        '<p class="lede">Tailored to a ' + esc(e.type) + ' for ' + e.guestCount + ' guests' +
        (e.style ? ' in a ' + esc(e.style) + ' style' : '') + (e.location ? ' near ' + esc(e.location) : '') + '. Save what fits, dismiss the rest.</p></div>' +
        '<div class="view-head__actions">' +
        '<button type="button" class="btn btn--ghost" data-action="idea:ask">' + icon('sparkle', { size: 16 }) + 'Ask for more ideas</button>' +
        '<button type="button" class="btn btn--ghost" data-action="idea:restore">' + icon('refresh', { size: 16 }) + 'Restore dismissed' + (ideas.dismissed.length ? ' (' + ideas.dismissed.length + ')' : '') + '</button>' +
        '</div></div>' +

        '<section class="card" style="margin-bottom:18px" aria-label="How these ideas are chosen">' +
        '<div class="row row--wrap" style="gap:16px;align-items:flex-start">' +
        '<div style="flex:1;min-width:220px"><div class="stat__label">' + icon('sparkle', { size: 13 }) + 'Chosen for your brief</div>' +
        '<p class="small muted" style="margin-top:5px">Costs are estimated from your ' + esc(money(budget.total, cur)) + ' budget (' + esc(money(perGuest, cur)) + ' per guest) and scaled to ' + e.guestCount + ' guests. Your priorities — ' +
        (e.priorities && e.priorities.length ? esc(e.priorities.join(', ')) : 'none set yet') + ' — decide what is worth spending on.</p></div>' +
        '<div class="chip-set">' +
        '<button type="button" class="chip" data-action="idea:filter-kind" data-value="all" aria-pressed="' + (filters.kind === 'all') + '">All ideas</button>' +
        Object.keys(T.IDEA_KIND_LABELS).map((k) => '<button type="button" class="chip" data-action="idea:filter-kind" data-value="' + k + '" aria-pressed="' + (filters.kind === k) + '">' + icon(KIND_ICONS[k], { size: 13 }) + T.IDEA_KIND_LABELS[k] + '</button>').join('') +
        '<button type="button" class="chip" data-action="idea:filter-saved" aria-pressed="' + filters.savedOnly + '">' + icon('star', { size: 13 }) + 'Saved only (' + ideas.saved.length + ')</button>' +
        '</div></div></section>' +

        (pool.length
          ? groups.map((g) => '<section style="margin-bottom:22px" aria-label="' + esc(g.label) + ' ideas">' +
            '<div class="group-head"><h2>' + esc(g.label) + '</h2><span class="group-head__line"></span>' +
            '<span class="group-head__count">' + g.ideas.length + '</span></div>' +
            '<div class="idea-grid">' + g.ideas.map((i) => ideaCard(i, cur)).join('') + '</div></section>').join('')
          : UI.empty({
            iconName: 'bulb',
            title: filters.savedOnly ? 'No saved ideas yet' : 'Nothing here right now',
            message: filters.savedOnly ? 'Tap Save on any idea to keep it in this list.' : 'You have dismissed or filtered all ideas. Restore them, or ask the assistant for something different.',
            action: '<div class="btn-row" style="justify-content:center">' +
              '<button class="btn btn--ghost btn--sm" data-action="idea:restore">Restore dismissed ideas</button>' +
              '<button class="btn btn--sm" data-action="idea:ask">Ask the assistant</button></div>',
          })) +

        '<div class="alert alert--info" style="margin-top:8px">' + icon('info', { size: 18 }) +
        '<div><strong>These are planning suggestions, not vendor recommendations.</strong> Costs are rough estimates based on your budget and guest count, not quotes. Ideas marked “save” are usually the cheapest way to get the same effect.</div></div>';
    },
  };

  /* ------------------------------------------------------------------ */
  const findIdea = (id) => GG.Store.state.ideas.find((i) => i.id === id);

  ACTIONS['idea:save'] = (el) => {
    const idea = GG.Store.setIdeaState(el.dataset.id, 'saved');
    if (idea) UI.toast('Idea saved', '“' + idea.title + '” is now saved to your board.');
  };
  ACTIONS['idea:unsave'] = (el) => {
    const idea = GG.Store.setIdeaState(el.dataset.id, 'new');
    if (idea) UI.toast('Removed from saved', '“' + idea.title + '” is still in your list.');
  };
  ACTIONS['idea:dismiss'] = (el) => {
    const idea = GG.Store.setIdeaState(el.dataset.id, 'dismissed');
    if (idea) UI.toast('Idea dismissed', 'You can restore dismissed ideas at any time.');
  };
  ACTIONS['idea:restore'] = () => {
    const dismissed = GG.Store.state.ideas.filter((i) => i.state === 'dismissed');
    if (!dismissed.length) { UI.toast('Nothing to restore', 'No ideas have been dismissed.', 'warn'); return; }
    dismissed.forEach((i) => { i.state = 'new'; });
    GG.Store.save();
    GG.Store.emit('ideas:restore');
    UI.toast('Ideas restored', dismissed.length + ' idea' + (dismissed.length === 1 ? '' : 's') + ' back on the board.');
  };
  ACTIONS['idea:filter-kind'] = (el) => { filters.kind = el.dataset.value; filters.savedOnly = false; GG.App.render(); };
  ACTIONS['idea:filter-saved'] = () => { filters.savedOnly = !filters.savedOnly; GG.App.render(); };
  ACTIONS['idea:ask'] = () => { location.hash = '#/assistant'; };

  ACTIONS['idea:task'] = (el) => {
    const idea = findIdea(el.dataset.id);
    if (!idea) return;
    GG.Store.addTask({
      title: 'Decide on: ' + idea.title,
      category: KIND_TO_CATEGORY[idea.kind] || 'logistics',
      priority: 'medium',
      due: GG.toISO(GG.addDays(GG.today(), 14)),
      notes: idea.desc,
      source: 'ai',
    });
    UI.toast('Task created', '“' + idea.title + '” is on your timeline, due in two weeks.');
  };

  ACTIONS['idea:budget'] = (el) => {
    const idea = findIdea(el.dataset.id);
    if (!idea) return;
    const est = S().ideaCost(idea);
    const cur = S().currency();
    UI.form({
      title: 'Add this idea to the budget',
      description: idea.title,
      columns: 2,
      values: {
        category: KIND_TO_CATEGORY[idea.kind] || 'decor',
        label: idea.title,
        planned: est,
        note: 'From your ideas board',
      },
      fields: [
        { name: 'category', label: 'Category', type: 'select', col: 1, options: T.BUDGET_CATEGORIES.map((c) => ({ value: c.id, label: c.label })) },
        { name: 'label', label: 'Item description', type: 'text', required: true, col: 1 },
        { name: 'planned', label: 'Planned amount (' + cur + ')', type: 'money', col: 1, step: 100 },
        { name: 'note', label: 'Note', type: 'textarea', rows: 2 },
      ],
      submitLabel: 'Add to budget',
      onSubmit(vals) {
        GG.Store.addBudgetItem(Object.assign({ actual: 0, source: 'idea' }, vals));
        const b = S().budget();
        UI.toast('Added to budget', money(vals.planned, cur) + ' planned for “' + vals.label + '”.');
        if (b.overTotal) UI.toast('Over total budget', 'The plan is now ' + money(b.overBy, cur) + ' over. Review the budget planner.', 'warn');
      },
    });
  };
})();
