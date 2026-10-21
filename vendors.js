/* Gather & Glow — Vendor checklist */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  const filters = { category: 'all', status: 'all', search: '' };
  GG.VendorFilters = filters;

  const catMeta = (id) => T.VENDOR_CATEGORIES.find((c) => c.id === id) || { label: id, icon: 'sparkle' };
  const statusOrder = (id) => (T.VENDOR_STATUSES.find((s) => s.id === id) || { order: 0 }).order;

  function statusTrack(status) {
    const step = statusOrder(status);
    return '<div class="status-track" aria-hidden="true">' +
      T.VENDOR_STATUSES.map((s, i) => '<span class="status-track__step' + (i <= step ? ' status-track__step--on' : '') + '"></span>').join('') +
      '</div>';
  }

  function vendorCard(v, cur) {
    const cat = catMeta(v.category);
    const questions = T.VENDOR_QUESTIONS[v.category] || T.VENDOR_QUESTIONS.catering_service;
    const answered = (v.checkedQuestions || []).length;
    const balance = Math.max(0, (Number(v.quote) || 0) - (Number(v.deposit) || 0));
    return '<article class="vendor-card">' +
      '<div class="vendor-card__top">' +
      '<span class="cat-row__icon" style="color:var(--forest)">' + icon(cat.icon, { size: 16 }) + '</span>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<span class="vendor-card__cat">' + esc(cat.label) + '</span>' +
      UI.vendorStatusBadge(v.status) + '</div>' +
      '<div class="vendor-card__name">' + esc(v.name || 'Untitled vendor') + '</div>' +
      (v.sample ? '<span class="sample-flag">' + icon('info', { size: 12 }) + 'Fictional sample record</span>' : '') +
      '</div>' +
      '<div class="task-actions">' +
      '<button type="button" class="btn btn--quiet btn--icon" data-action="vendor:edit" data-id="' + v.id + '" aria-label="Edit ' + esc(v.name) + '">' + icon('pencil', { size: 15 }) + '</button>' +
      '<button type="button" class="btn btn--quiet btn--icon" data-action="vendor:delete" data-id="' + v.id + '" aria-label="Delete ' + esc(v.name) + '">' + icon('trash', { size: 15 }) + '</button>' +
      '</div></div>' +

      statusTrack(v.status) +

      (v.phone || v.email
        ? '<div class="xsmall" style="display:flex;flex-direction:column;gap:2px">' +
        (v.phone ? '<span>' + icon('phone', { size: 12 }) + ' ' + esc(v.phone) + '</span>' : '') +
        (v.email ? '<span>' + esc(v.email) + '</span>' : '') + '</div>'
        : '') +

      '<div class="vendor-card__figs">' +
      '<span>Quote <b>' + esc(money(v.quote, cur)) + '</b></span>' +
      '<span>Deposit <b>' + esc(money(v.deposit, cur)) + '</b></span>' +
      '<span>Balance <b>' + esc(money(balance, cur)) + '</b></span>' +
      '</div>' +

      (v.notes ? '<div class="vendor-card__notes">' + esc(v.notes) + '</div>' : '') +

      '<div class="row row--wrap" style="gap:8px;justify-content:space-between">' +
      '<div class="field" style="flex:1;min-width:130px">' +
      '<label class="sr-only" for="vendor-status-' + v.id + '">Status for ' + esc(v.name) + '</label>' +
      '<select class="select" id="vendor-status-' + v.id + '" data-change="vendor:status" data-id="' + v.id + '">' +
      T.VENDOR_STATUSES.map((s) => '<option value="' + s.id + '"' + (v.status === s.id ? ' selected' : '') + '>' + s.label + '</option>').join('') +
      '</select></div>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-action="vendor:questions" data-id="' + v.id + '">' +
      icon('book', { size: 14 }) + 'Questions <span class="xsmall">' + answered + '/' + questions.length + '</span></button>' +
      '<button type="button" class="btn btn--quiet btn--sm" data-action="vendor:to-budget" data-id="' + v.id + '" title="Record this quote in the budget planner">' + icon('wallet', { size: 14 }) + 'To budget</button>' +
      '</div></article>';
  }

  function compareTable(list, cur) {
    if (!list.length) return '';
    const cats = T.VENDOR_CATEGORIES.filter((c) => list.some((v) => v.category === c.id && Number(v.quote) > 0));
    return '<section class="card" aria-labelledby="compare-title" style="margin-top:20px">' +
      '<div class="card__head"><div><h2 id="compare-title">Quote comparison</h2>' +
      '<div class="card__sub">Where you have more than one quote in a category, the lowest is named in words — never colour alone.</div></div></div>' +
      '<div class="table-wrap"><table class="table"><caption>Quotes and deposits by category. All figures are what you entered.</caption>' +
      '<thead><tr><th scope="col">Category</th><th scope="col">Vendor</th><th scope="col">Status</th><th scope="col" class="num">Quote</th><th scope="col" class="num">Deposit</th><th scope="col" class="num">Balance</th><th scope="col">Comparison</th></tr></thead><tbody>' +
      cats.map((cat) => {
        const rows = list.filter((v) => v.category === cat.id && Number(v.quote) > 0).sort((a, b) => a.quote - b.quote);
        const lowest = rows[0];
        return rows.map((v, i) => '<tr>' +
          (i === 0 ? '<td rowspan="' + rows.length + '"><strong>' + esc(cat.label) + '</strong></td>' : '') +
          '<td>' + esc(v.name || 'Untitled vendor') + '</td>' +
          '<td>' + UI.vendorStatusBadge(v.status) + '</td>' +
          '<td class="num">' + esc(money(v.quote, cur)) + '</td>' +
          '<td class="num">' + esc(money(v.deposit, cur)) + '</td>' +
          '<td class="num">' + esc(money(Math.max(0, v.quote - v.deposit), cur)) + '</td>' +
          '<td>' + (rows.length === 1
            ? '<span class="badge badge--outline">Only quote on file</span>'
            : v === lowest
              ? '<span class="badge badge--ok">' + icon('check', { size: 12 }) + 'Lowest quote</span>'
              : '<span class="badge badge--outline">+' + esc(money(v.quote - lowest.quote, cur)) + ' vs lowest</span>') + '</td></tr>').join('');
      }).join('') +
      '</tbody></table></div></section>';
  }

  GG.Views = GG.Views || {};
  GG.Views.vendors = {
    render() {
      const vendors = S().vendors();
      const budget = S().budget();
      const cur = S().currency();
      const typeLabel = (T.EVENT_TYPES.find((t) => t.id === S().event().type) || {}).label || 'event';

      const visible = vendors.all.filter((v) => {
        if (filters.category !== 'all' && v.category !== filters.category) return false;
        if (filters.status !== 'all' && v.status !== filters.status) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if ([v.name, v.person, v.notes, catMeta(v.category).label].join(' ').toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      });

      const uncovered = T.VENDOR_CATEGORIES.filter((c) => !vendors.all.some((v) => v.category === c.id));
      const hasSample = vendors.all.some((v) => v.sample);
      const catChips = '<div class="chip-set" role="group" aria-label="Filter vendors by category">' +
        '<button type="button" class="chip" data-action="vendor:filter-cat" data-value="all" aria-pressed="' + (filters.category === 'all') + '">All categories</button>' +
        T.VENDOR_CATEGORIES.filter((c) => vendors.all.some((v) => v.category === c.id)).map((c) =>
          '<button type="button" class="chip" data-action="vendor:filter-cat" data-value="' + c.id + '" aria-pressed="' + (filters.category === c.id) + '">' +
          icon(c.icon, { size: 13 }) + esc(c.label) + '</button>').join('') + '</div>';

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">Suppliers</div>' +
        '<h1>Vendor checklist</h1>' +
        '<p class="lede">Track conversations, quotes and bookings. Ask the same questions of every vendor so quotes are comparable.</p></div>' +
        '<div class="view-head__actions">' +
        '<button type="button" class="btn btn--ghost" data-action="vendor:suggestions">' + icon('book', { size: 16 }) + 'Questions to ask</button>' +
        '<button type="button" class="btn" data-action="vendor:add">' + icon('plus', { size: 16 }) + 'Add vendor</button>' +
        '</div></div>' +

        (hasSample ? '<div class="alert alert--demo" style="margin-bottom:18px">' + icon('info', { size: 18 }) +
          '<div><strong>Some of these are sample records.</strong> Fictional businesses created to demonstrate the workflow — not real, verified or recommended vendors. Phone numbers and emails use example domains. Replace them with your own contacts.</div></div>' : '') +

        '<section class="card" style="margin-bottom:18px" aria-label="Vendor summary">' +
        '<div class="grid grid--4" style="gap:14px">' +
        '<div><div class="stat__label">' + icon('store', { size: 13 }) + 'Vendors tracked</div><div class="stat__value" style="font-size:1.5rem">' + vendors.total + '</div>' +
        '<div class="xsmall muted">' + vendors.categoriesCovered + ' of ' + T.VENDOR_CATEGORIES.length + ' categories</div></div>' +
        '<div><div class="stat__label">' + icon('check', { size: 13 }) + 'Booked or paid</div><div class="stat__value" style="font-size:1.5rem">' + vendors.booked.length + '</div>' +
        UI.progress(vendors.pct, 'ok', 'Vendors booked') + '</div>' +
        '<div><div class="stat__label">' + icon('wallet', { size: 13 }) + 'Quotes on file</div><div class="stat__value" style="font-size:1.35rem">' + esc(money(vendors.quoteTotal, cur)) + '</div>' +
        '<div class="xsmall muted">Planned vendor spend ' + esc(money(budget.planned, cur)) + '</div></div>' +
        '<div><div class="stat__label">' + icon('wallet', { size: 13 }) + 'Deposits paid</div><div class="stat__value" style="font-size:1.35rem">' + esc(money(vendors.depositTotal, cur)) + '</div>' +
        '<div class="xsmall muted">Record these in the budget as actual spend</div></div>' +
        '</div></section>' +

        '<section class="card" aria-labelledby="vendors-title">' +
        '<div class="card__head"><div><h2 id="vendors-title">Your vendors</h2>' +
        '<div class="card__sub">' + visible.length + ' shown · ' + typeLabel + ' checklist</div></div>' +
        '</div>' +
        '<div class="filters" style="margin-bottom:12px"><div class="filters__row">' +
        '<div class="search-wrap">' + icon('search', { size: 15 }) +
        '<input class="input" type="search" placeholder="Search vendors by name, contact or note" aria-label="Search vendors" value="' + esc(filters.search) + '" data-input="vendor:search" data-focus-key="vendor-search">' +
        '</div>' +
        '<div class="field"><label class="sr-only" for="vendor-status-filter">Filter by status</label>' +
        '<select class="select" id="vendor-status-filter" data-change="vendor:filter-status" data-focus-key="vendor-status-filter">' +
        '<option value="all">All statuses</option>' +
        T.VENDOR_STATUSES.map((s) => '<option value="' + s.id + '"' + (filters.status === s.id ? ' selected' : '') + '>' + s.label + '</option>').join('') +
        '</select></div></div></div>' +
        '<div style="margin-bottom:16px">' + catChips + '</div>' +

        (visible.length
          ? '<div class="idea-grid">' + visible.map((v) => vendorCard(v, cur)).join('') + '</div>'
          : UI.empty({
            iconName: 'store',
            title: vendors.total ? 'No vendors match this filter' : 'No vendors yet',
            message: vendors.total ? 'Try a different category or status.' : 'Start with the venue, catering and photography — they decide your date and budget.',
            action: '<button class="btn btn--sm" data-action="vendor:add">Add your first vendor</button>',
          })) +
        (uncovered.length ? '<div style="margin-top:20px"><div class="rule-gold">Categories with no vendor yet</div>' +
          '<div class="chip-set" style="margin-top:12px">' + uncovered.map((c) =>
            '<button type="button" class="chip" data-action="vendor:add" data-cat="' + c.id + '">' + icon('plus', { size: 13 }) + esc(c.label) + '</button>').join('') +
          '</div></div>' : '') +
        '</section>' +

        compareTable(vendors.all, cur);
    },
  };

  /* ------------------------------------------------------------------ */
  function vendorForm(v, presetCat) {
    const cur = S().currency();
    const isEdit = !!v;
    UI.form({
      title: isEdit ? 'Edit vendor' : 'Add vendor',
      description: 'Only record what the vendor has actually told you — quotes change after a site visit.',
      columns: 2,
      values: v || { category: presetCat || 'venue', name: '', person: '', phone: '', email: '', quote: '', deposit: 0, status: 'researching', notes: '' },
      fields: [
        { name: 'category', label: 'Category', type: 'select', required: true, col: 1, options: T.VENDOR_CATEGORIES.map((c) => ({ value: c.id, label: c.label })) },
        { name: 'status', label: 'Status', type: 'select', col: 1, options: T.VENDOR_STATUSES.map((s) => ({ value: s.id, label: s.label })) },
        { name: 'name', label: 'Vendor name', type: 'text', required: true, col: 1, placeholder: 'Business or freelancer name' },
        { name: 'person', label: 'Contact person', type: 'text', col: 1, placeholder: 'Who you spoke to' },
        { name: 'phone', label: 'Phone', type: 'text', col: 1, placeholder: '+91 …' },
        { name: 'email', label: 'Email', type: 'text', col: 1, placeholder: 'name@example.com', validate: (v2) => (v2 && v2.indexOf('@') < 1 ? 'Enter a valid email address or leave it blank.' : null) },
        { name: 'quote', label: 'Quote (' + cur + ')', type: 'money', col: 1, step: 100, hint: 'Total landed cost, including taxes if you know it.' },
        { name: 'deposit', label: 'Deposit paid (' + cur + ')', type: 'money', col: 1, step: 100 },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, placeholder: 'What is included, what is extra, payment schedule…' },
      ],
      submitLabel: isEdit ? 'Save vendor' : 'Add vendor',
      onSubmit(vals) {
        if (isEdit) {
          GG.Store.updateVendor(v.id, vals);
          UI.toast('Vendor updated', vals.name + ' saved.');
        } else {
          GG.Store.addVendor(vals);
          UI.toast('Vendor added', vals.name + ' is now in your checklist.');
        }
      },
    });
  }

  ACTIONS['vendor:add'] = (el) => vendorForm(null, el.dataset.cat);
  ACTIONS['vendor:edit'] = (el) => {
    const v = GG.Store.state.vendors.find((x) => x.id === el.dataset.id);
    if (v) vendorForm(v);
  };
  ACTIONS['vendor:delete'] = async (el) => {
    const v = GG.Store.state.vendors.find((x) => x.id === el.dataset.id);
    if (!v) return;
    const ok = await UI.confirm({
      title: 'Remove this vendor?',
      message: '“' + (v.name || 'Untitled vendor') + '” and its notes will be deleted. Any budget item you created from its quote stays.',
      confirmLabel: 'Remove vendor',
      danger: true,
    });
    if (!ok) return;
    GG.Store.removeVendor(v.id);
    UI.toast('Vendor removed', 'The checklist has been updated.', 'ok');
  };
  ACTIONS['vendor:status'] = (el) => {
    const v = GG.Store.updateVendor(el.dataset.id, { status: el.value });
    if (!v) return;
    const label = (T.VENDOR_STATUSES.find((s) => s.id === el.value) || {}).label;
    UI.toast('Status updated', v.name + ' is now “' + label + '”.');
  };
  ACTIONS['vendor:filter-cat'] = (el) => { filters.category = el.dataset.value; GG.App.render(); };
  ACTIONS['vendor:filter-status'] = (el) => { filters.status = el.value; GG.App.render(); };
  ACTIONS['vendor:search'] = (el) => { filters.search = el.value; GG.App.render(); };

  ACTIONS['vendor:questions'] = (el) => {
    const v = GG.Store.state.vendors.find((x) => x.id === el.dataset.id);
    if (!v) return;
    const questions = T.VENDOR_QUESTIONS[v.category] || T.VENDOR_QUESTIONS.catering_service;
    const checked = v.checkedQuestions || [];
    const body = '<div class="alert alert--info" style="margin-bottom:16px">' + icon('info', { size: 18 }) +
      '<div>Ask these of every vendor in this category so their quotes are directly comparable. Tick each one as you get an answer.</div></div>' +
      '<fieldset class="qlist"><legend class="label" style="margin-bottom:8px">' + esc(catMeta(v.category).label) + ' questions</legend>' +
      questions.map((q, i) => '<label class="check"><input type="checkbox" data-q="' + i + '"' + (checked.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + esc(q) + '</span></label>').join('') +
      '</fieldset>';

    UI.info({
      title: 'Questions to ask — ' + (v.name || 'vendor'),
      description: (v.checkedQuestions || []).length + ' of ' + questions.length + ' answered so far.',
      body: body,
      footerLabel: 'Done',
    });
    const d = document.getElementById('modal');
    d.querySelectorAll('[data-q]').forEach((input) => {
      input.addEventListener('change', () => {
        GG.Store.toggleVendorQuestion(v.id, Number(input.dataset.q));
      });
    });
  };

  ACTIONS['vendor:to-budget'] = (el) => {
    const v = GG.Store.state.vendors.find((x) => x.id === el.dataset.id);
    if (!v) return;
    if (!Number(v.quote)) {
      UI.toast('No quote recorded', 'Add a quote to this vendor before sending it to the budget.', 'warn');
      return;
    }
    const cur = S().currency();
    GG.Store.addBudgetItem({
      category: v.category === 'catering_service' ? 'food' : v.category,
      label: (v.name || catMeta(v.category).label) + ' — vendor quote',
      planned: Number(v.quote) || 0,
      actual: Number(v.deposit) || 0,
      note: 'Created from the vendor checklist',
      source: 'vendor',
    });
    UI.toast('Added to budget', money(v.quote, cur) + ' planned; ' + money(v.deposit, cur) + ' recorded as paid.', 'ok');
  };

  ACTIONS['vendor:suggestions'] = () => {
    const body = '<p class="small muted" style="margin-bottom:16px">Use the same questions across vendors in a category. These are generic planning questions, not legal or financial advice.</p>' +
      T.VENDOR_CATEGORIES.filter((c) => (T.VENDOR_QUESTIONS[c.id] || []).length).map((c) =>
        '<div style="margin-bottom:18px"><div class="row" style="gap:8px;margin-bottom:6px">' +
        '<span class="cat-row__icon" style="color:var(--forest)">' + icon(c.icon, { size: 15 }) + '</span>' +
        '<h3 style="font-size:0.98rem">' + esc(c.label) + '</h3></div>' +
        '<ul class="small" style="margin:0;padding-left:20px;color:var(--ink-soft)">' +
        T.VENDOR_QUESTIONS[c.id].map((q) => '<li style="margin-bottom:4px">' + esc(q) + '</li>').join('') + '</ul></div>').join('');
    UI.info({ title: 'Questions to ask every vendor', description: 'A checklist you can reuse for each category.', body, footerLabel: 'Close' });
  };
})();
