/* Gather & Glow — Budget planner */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money, moneyShort } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  function donut(byCategory, plannedTotal, cur) {
    const r = 54;
    const c = 2 * Math.PI * r;
    const cats = byCategory.filter((x) => x.planned > 0);
    let offset = 0;
    const arcs = cats.map((cat) => {
      const len = c * (cat.planned / plannedTotal);
      const seg = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + cat.tone + '" stroke-width="17" ' +
        'stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" />';
      offset += len;
      return seg;
    }).join('');
    const legend = cats.map((cat) => (
      '<div class="legend__item"><span class="swatch" style="background:' + cat.tone + '"></span>' +
      '<span class="legend__label">' + esc(cat.label) + '</span>' +
      '<span class="legend__value">' + esc(moneyShort(cat.planned, cur)) + '</span></div>'
    )).join('');
    return '<div class="donut-wrap"><svg class="donut" width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Planned spend by category">' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="#F2EBDF" stroke-width="17" />' +
      '<g transform="rotate(-90 70 70)">' + arcs + '</g>' +
      '<text x="70" y="66" text-anchor="middle" class="donut__center" font-size="15" fill="#153329">' + esc(moneyShort(plannedTotal, cur)) + '</text>' +
      '<text x="70" y="84" text-anchor="middle" font-size="9" letter-spacing="1.4" fill="#6b6157">PLANNED</text>' +
      '</svg><div class="legend">' + legend + '</div></div>';
  }

  function catRows(budget, cur) {
    return budget.byCategory.map((cat) => {
      const overBy = cat.actual - cat.planned;
      const itemRows = cat.items.map((item) => (
        '<div class="cat-item' + (item.actual > item.planned && item.planned > 0 ? ' cat-item--over' : '') + '">' +
        '<span class="cat-item__label">' + esc(item.label) +
        (item.source === 'vendor' ? ' <span class="badge badge--outline">vendor quote</span>' : '') +
        (item.source === 'suggested' ? ' <span class="badge badge--outline">suggested</span>' : '') +
        (item.note ? '<span class="xsmall muted"> — ' + esc(item.note) + '</span>' : '') + '</span>' +
        '<span class="cat-item__fig">plan <b>' + esc(money(item.planned, cur)) + '</b></span>' +
        '<span class="cat-item__fig">spent <b>' + esc(money(item.actual, cur)) + '</b></span>' +
        '<span class="cat-item__actions">' +
        '<button type="button" class="btn btn--quiet btn--icon" data-action="budget:edit" data-id="' + item.id + '" aria-label="Edit ' + esc(item.label) + '">' + icon('pencil', { size: 15 }) + '</button>' +
        '<button type="button" class="btn btn--quiet btn--icon" data-action="budget:delete" data-id="' + item.id + '" data-label="' + esc(item.label) + '" aria-label="Delete ' + esc(item.label) + '">' + icon('trash', { size: 15 }) + '</button>' +
        '</span></div>'
      )).join('');

      return '<div class="cat-row">' +
        '<div class="cat-row__head">' +
        '<span class="cat-row__icon" style="color:' + cat.tone + '">' + icon(cat.icon, { size: 17 }) + '</span>' +
        '<div><div class="cat-row__title">' + esc(cat.label) + '</div>' +
        '<div class="xsmall muted">' + (cat.items.length ? cat.items.length + ' item' + (cat.items.length === 1 ? '' : 's') : 'No items yet · suggested ' + esc(money(cat.suggested, cur))) + '</div></div>' +
        '<div class="cat-row__figures">' +
        '<span>plan <b>' + esc(money(cat.planned, cur)) + '</b></span>' +
        '<span>spent <b>' + esc(money(cat.actual, cur)) + '</b></span>' +
        '<span>left <b>' + esc(money(cat.planned - cat.actual, cur)) + '</b></span>' +
        (cat.over ? '<span class="badge badge--danger">' + icon('alert', { size: 12 }) + 'Over by ' + esc(money(overBy, cur)) + '</span>' : '') +
        '</div>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-action="budget:add" data-cat="' + cat.id + '">' + icon('plus', { size: 14 }) + 'Add</button>' +
        '</div>' +
        '<div style="margin:10px 0 0 42px">' +
        '<div class="progress-row xsmall"><span>Actual against planned</span><strong>' + GG.pct(cat.actual, cat.planned || 1) + '%</strong></div>' +
        UI.progress(cat.planned ? (cat.actual / cat.planned) * 100 : 0, cat.over ? 'danger' : cat.actual > 0 ? 'gold' : 'ok', cat.label + ' spend progress') +
        '</div>' +
        (itemRows ? '<div class="cat-row__items">' + itemRows + '</div>' : '') +
        '</div>';
    }).join('');
  }

  GG.Views = GG.Views || {};
  GG.Views.budget = {
    render() {
      const budget = S().budget();
      const cur = S().currency();
      const e = S().event();

      const overCats = budget.overCategories;
      const alerts = [];
      if (budget.overTotal) {
        alerts.push('<div class="alert alert--danger">' + icon('alert', { size: 18 }) + '<div><strong>Your plan is ' + esc(money(budget.overBy, cur)) + ' above your total budget.</strong> ' +
          'Either trim ' + esc(money(budget.overBy, cur)) + ' from categories, or raise the total budget in Event details. The plan is not blocked — but nothing else should be added until this is resolved.</div></div>');
      } else if (budget.remaining > 0) {
        alerts.push('<div class="alert alert--ok">' + icon('check', { size: 18 }) + '<div><strong>' + esc(money(budget.remaining, cur)) + ' is still unallocated.</strong> ' +
          'A contingency reserve of 5–10% is the safest place for it.</div></div>');
      }
      if (overCats.length) {
        alerts.push('<div class="alert alert--warn">' + icon('alert', { size: 18 }) + '<div><strong>Above plan:</strong> ' +
          esc(overCats.map((c) => c.label + ' (+' + money(c.actual - c.planned, cur) + ')').join(', ')) + '. Check whether these are deposits or genuine overspend.</div></div>');
      }

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">Money</div>' +
        '<h1>Budget planner</h1>' +
        '<p class="lede">Plan by category, record what you have actually paid, and see the difference immediately.</p></div>' +
        '<div class="view-head__actions">' +
        '<button type="button" class="btn btn--ghost" data-action="budget:split">' + icon('sparkle', { size: 16 }) + 'Use suggested split</button>' +
        '<button type="button" class="btn" data-action="budget:add">' + icon('plus', { size: 16 }) + 'Add budget item</button>' +
        '</div></div>' +

        (alerts.length ? '<div class="stack stack--tight" style="margin-bottom:18px">' + alerts.join('') + '</div>' : '') +

        '<section class="card" style="margin-bottom:20px" aria-labelledby="budget-total-title">' +
        '<div class="budget-hero">' +
        '<div>' +
        '<h2 id="budget-total-title">Total budget</h2>' +
        '<div class="row row--wrap" style="align-items:flex-end;gap:12px;margin-top:10px">' +
        '<div class="field" style="max-width:240px">' +
        '<label for="budget-total">Budget amount (' + esc(cur) + ')</label>' +
        '<input class="input input--money" id="budget-total" type="number" min="0" step="1000" value="' + (budget.total || 0) + '" data-change="budget:setTotal">' +
        '</div>' +
        '<button type="button" class="btn btn--ghost" data-action="budget:rebalance">' + icon('refresh', { size: 15 }) + 'Scale plan to this total</button>' +
        '</div>' +
        '<div class="budget-key">' +
        '<span><span class="swatch" style="background:#1F4A3A"></span>Planned ' + esc(money(budget.planned, cur)) + '</span>' +
        '<span><span class="swatch" style="background:#c6a15b"></span>Actual ' + esc(money(budget.actual, cur)) + '</span>' +
        '<span><span class="swatch" style="background:#e6dccb"></span>Remaining ' + esc(money(budget.remaining, cur)) + '</span>' +
        '</div>' +
        '<div style="margin-top:16px">' +
        '<div class="progress-row"><span>Planned against total</span><strong>' + budget.pctPlanned + '% · ' + esc(money(budget.planned, cur)) + '</strong></div>' +
        UI.progress(budget.pctPlanned, budget.overTotal ? 'danger' : 'ok', 'Planned spend against total budget') +
        '<div class="progress-row" style="margin-top:12px"><span>Actually spent</span><strong>' + budget.pctActual + '% · ' + esc(money(budget.actual, cur)) + '</strong></div>' +
        UI.progress(budget.pctActual, 'gold', 'Actual spend against total budget') +
        '</div>' +
        '<div class="grid grid--3" style="margin-top:18px;gap:10px">' +
        '<div class="stat"><div class="stat__label">' + icon('wallet', { size: 13 }) + 'Planned</div><div class="stat__value" style="font-size:1.2rem">' + esc(money(budget.planned, cur)) + '</div></div>' +
        '<div class="stat"><div class="stat__label">' + icon('check', { size: 13 }) + 'Actual</div><div class="stat__value" style="font-size:1.2rem">' + esc(money(budget.actual, cur)) + '</div></div>' +
        '<div class="stat ' + (budget.remaining >= 0 ? 'stat--ok' : 'stat--danger') + '"><div class="stat__label">' + icon('wallet', { size: 13 }) + 'Remaining</div><div class="stat__value" style="font-size:1.2rem">' + esc(money(budget.remaining, cur)) + '</div></div>' +
        '</div>' +
        '</div>' +
        '<div>' +
        '<h3 style="font-size:0.95rem;margin-bottom:12px">Where the money is planned to go</h3>' +
        (budget.planned ? donut(budget.byCategory, budget.planned, cur) : UI.empty({ iconName: 'wallet', title: 'Nothing allocated yet', message: 'Add your first budget item, or apply the suggested split for a ' + esc(e.type) + '.', action: '<button class="btn btn--ghost btn--sm" data-action="budget:split">Use suggested split</button>' })) +
        '</div></div></section>' +

        '<section class="card" aria-labelledby="cats-title">' +
        '<div class="card__head"><div><h2 id="cats-title">Categories</h2>' +
        '<div class="card__sub">' + budget.itemCount + ' items across ' + budget.byCategory.filter((c) => c.items.length).length + ' categories. Suggested amounts follow a typical ' + esc(e.type) + ' split.</div></div>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-action="budget:add">' + icon('plus', { size: 14 }) + 'New item</button></div>' +
        catRows(budget, cur) +
        '</section>';
    },
  };

  /* ------------------------------------------------------------------ */
  function itemForm(existing, presetCategory) {
    const cur = S().currency();
    const isEdit = !!existing;
    UI.form({
      title: isEdit ? 'Edit budget item' : 'Add budget item',
      description: 'Planned is what you expect to spend; actual is what you have already paid.',
      columns: 2,
      values: existing || { category: presetCategory || 'venue', label: '', planned: '', actual: 0, note: '' },
      fields: [
        { name: 'category', label: 'Category', type: 'select', required: true, col: 1, options: T.BUDGET_CATEGORIES.map((c) => ({ value: c.id, label: c.label })) },
        { name: 'label', label: 'Item description', type: 'text', required: true, col: 1, placeholder: 'e.g. Catering — 180 plates', hint: 'Be specific so you can match it to a quote.' },
        { name: 'planned', label: 'Planned amount (' + cur + ')', type: 'money', required: true, col: 1, step: 100, hint: 'What you expect to spend.' },
        { name: 'actual', label: 'Actual paid (' + cur + ')', type: 'money', col: 1, step: 100, hint: 'Leave at 0 if nothing is paid yet.' },
        { name: 'note', label: 'Note', type: 'textarea', rows: 2, placeholder: 'Payment schedule, quote reference, who to ask…' },
      ],
      submitLabel: isEdit ? 'Save changes' : 'Add item',
      onSubmit(vals) {
        if (isEdit) {
          GG.Store.updateBudgetItem(existing.id, vals);
          UI.toast('Budget updated', vals.label + ' saved.');
        } else {
          GG.Store.addBudgetItem(vals);
          UI.toast('Budget item added', money(vals.planned, cur) + ' planned for ' + vals.label + '.');
        }
        const summary = S().budget();
        if (summary.overTotal) {
          UI.toast('Over total budget', 'The plan is now ' + money(summary.overBy, cur) + ' above your budget.', 'warn');
        }
      },
    });
  }

  ACTIONS['budget:add'] = (el) => itemForm(null, el.dataset.cat);
  ACTIONS['budget:edit'] = (el) => {
    const item = GG.Store.state.budgetItems.find((b) => b.id === el.dataset.id);
    if (item) itemForm(item);
  };
  ACTIONS['budget:delete'] = async (el) => {
    const item = GG.Store.state.budgetItems.find((b) => b.id === el.dataset.id);
    if (!item) return;
    const ok = await UI.confirm({
      title: 'Remove this budget item?',
      message: '“' + item.label + '” · ' + money(item.planned, S().currency()) + ' planned',
      confirmLabel: 'Remove item',
      danger: true,
    });
    if (!ok) return;
    GG.Store.removeBudgetItem(item.id);
    UI.toast('Item removed', 'Totals and progress have been recalculated.', 'ok');
  };
  ACTIONS['budget:setTotal'] = (el) => {
    const value = Number(el.value) || 0;
    if (value === Number(GG.Store.state.event.budgetTotal)) return;
    GG.Store.updateEvent({ budgetTotal: value });
    UI.toast('Budget updated', 'Total budget is now ' + money(value, S().currency()) + '.');
  };
  ACTIONS['budget:rebalance'] = async () => {
    const b = S().budget();
    if (!b.planned) {
      UI.toast('Nothing to scale', 'Add budget items first, or use the suggested split.', 'warn');
      return;
    }
    const ok = await UI.confirm({
      title: 'Scale every planned amount?',
      message: 'Every category will be scaled proportionally so planned spend equals ' + money(b.total, S().currency()) + '. Actual payments are never changed.',
      confirmLabel: 'Scale plan',
      danger: false,
    });
    if (!ok) return;
    GG.Store.rebalanceBudget(GG.Store.state.event.budgetTotal);
    UI.toast('Plan scaled', 'Planned spend now matches your total budget.');
  };
  ACTIONS['budget:split'] = async () => {
    const b = S().budget();
    if (!b.total) {
      UI.toast('Set a budget first', 'Add a total budget in Event details or above.', 'warn');
      return;
    }
    const ok = await UI.confirm({
      title: 'Apply the suggested split?',
      message: 'Planned amounts will be reset to a typical ' + GG.Store.state.event.type + ' split of your ' + money(b.total, S().currency()) + ' budget.',
      confirmLabel: 'Apply suggested split',
      extra: 'Your actual payments and item notes are kept. Planned amounts are recalculated — this will overwrite any manual planning you have done.',
    });
    if (!ok) return;
    GG.Store.applySplit();
    UI.toast('Suggested split applied', 'Adjust any category you disagree with.');
  };
})();
