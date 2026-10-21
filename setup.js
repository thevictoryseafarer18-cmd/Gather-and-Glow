/* Gather & Glow — guided event setup (3 steps) */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money, fmtDate } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  const state = { step: 1, values: null };
  GG.SetupState = state;

  function reset() {
    state.step = 1;
    state.values = GG.EventForm.defaults();
  }
  if (!state.values) reset();

  const STEPS = [
    { n: 1, label: 'The celebration' },
    { n: 2, label: 'Place, people & budget' },
    { n: 3, label: 'Priorities & needs' },
  ];

  function readStep() {
    const form = document.getElementById('setup-form');
    if (!form) return;
    const val = (n) => {
      const el = form.querySelector('[name="' + n + '"]');
      return el ? el.value.trim() : undefined;
    };
    ['name', 'date', 'location', 'guestCount', 'currency', 'budgetTotal', 'style', 'dietary', 'accessibility', 'notes'].forEach((k) => {
      const v = val(k);
      if (v === undefined) return;
      state.values[k] = (k === 'guestCount' || k === 'budgetTotal') ? Number(v) || 0 : v;
    });
    const pri = form.querySelectorAll('[name="priorities"]:checked');
    if (form.querySelector('[name="priorities"]')) {
      state.values.priorities = Array.prototype.slice.call(pri).map((i) => i.value);
    }
  }

  function validateStep() {
    const form = document.getElementById('setup-form');
    const v = state.values;
    const errors = {};
    if (state.step === 1) {
      if (!v.name) errors.name = 'Give your event a name.';
      if (!v.date) errors.date = 'Choose the event date.';
      else if (!GG.parseISO(v.date)) errors.date = 'Enter a valid date.';
    }
    if (state.step === 2) {
      if (!(v.guestCount > 0)) errors.guestCount = 'Enter a guest count greater than zero.';
      if (!(v.budgetTotal > 0)) errors.budgetTotal = 'Enter a budget greater than zero.';
    }
    if (form) {
      form.querySelectorAll('.field__error').forEach((e) => { e.hidden = true; e.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
      Object.keys(errors).forEach((k) => {
        const box = form.querySelector('#ev-' + k + '-error');
        const input = form.querySelector('[name="' + k + '"]');
        if (box) { box.textContent = errors[k]; box.hidden = false; }
        if (input) input.setAttribute('aria-invalid', 'true');
      });
      const first = Object.keys(errors)[0];
      if (first) {
        const input = form.querySelector('[name="' + first + '"]');
        if (input) input.focus();
      }
    }
    if (Object.keys(errors).length) {
      UI.toast('Almost there', 'A couple of fields need your attention.', 'warn');
      return false;
    }
    return true;
  }

  function summaryHTML() {
    const v = state.values;
    const typeLabel = (T.EVENT_TYPES.find((t) => t.id === v.type) || {}).label || '—';
    const days = v.date ? GG.daysUntil(v.date) : 0;
    return '<div class="wizard-summary">' +
      '<div class="summary-cell"><div class="summary-cell__label">Type</div><div class="summary-cell__value">' + esc(typeLabel) + '</div></div>' +
      '<div class="summary-cell"><div class="summary-cell__label">Date</div><div class="summary-cell__value">' + (v.date ? esc(fmtDate(v.date, 'day')) : 'Not set') + '</div></div>' +
      '<div class="summary-cell"><div class="summary-cell__label">Countdown</div><div class="summary-cell__value">' + (v.date ? (days >= 0 ? days + ' days' : 'Date passed') : '—') + '</div></div>' +
      '<div class="summary-cell"><div class="summary-cell__label">Guests</div><div class="summary-cell__value">' + (v.guestCount || '—') + '</div></div>' +
      '<div class="summary-cell"><div class="summary-cell__label">Budget</div><div class="summary-cell__value">' + (v.budgetTotal ? esc(money(v.budgetTotal, v.currency)) : '—') + '</div></div>' +
      '<div class="summary-cell"><div class="summary-cell__label">Per guest</div><div class="summary-cell__value">' + (v.budgetTotal && v.guestCount ? esc(money(Math.round(v.budgetTotal / v.guestCount), v.currency)) : '—') + '</div></div>' +
      '</div>';
  }

  function stepContent() {
    const v = state.values;
    if (state.step === 1) {
      return '<div class="stack">' +
        GG.EventForm.typeCards(v.type) +
        '<div class="form-grid" style="margin-top:6px">' + GG.EventForm.fields(v, ['name', 'date']) + '</div>' +
        '</div>';
    }
    if (state.step === 2) {
      return '<div class="form-grid">' + GG.EventForm.fields(v, ['location', 'guestCount', 'currency', 'budgetTotal', 'style']) + '</div>' +
        (v.location ? '' : '<p class="xsmall muted" style="margin-top:12px">Tip: adding a city lets the assistant suggest local-style ideas and realistic vendor questions.</p>');
    }
    return '<div class="form-grid">' + GG.EventForm.fields(v, ['priorities', 'dietary', 'accessibility', 'notes']) + '</div>' +
      '<div class="divider"></div>' +
      '<h3 style="font-size:0.95rem;margin-bottom:10px">Review</h3>' +
      '<div id="setup-summary">' + summaryHTML() + '</div>' +
      '<div class="alert alert--info" style="margin-top:16px">' + icon('info', { size: 18 }) +
      '<div><strong>What happens next:</strong> we build a budget with a suggested split for your event type, generate a planning timeline from your date, and personalise the idea board. Everything stays editable.</div></div>';
  }

  GG.Views = GG.Views || {};
  GG.Views.setup = {
    reset,
    render() {
      const v = state.values;
      const typeLabel = (T.EVENT_TYPES.find((t) => t.id === v.type) || {}).label || '';

      return '<div class="wizard">' +
        '<header class="wizard__top">' +
        '<div class="brand" style="padding:0"><span class="brand__mark">' + icon('sparkle', { size: 20 }) + '</span>' +
        '<span><span class="brand__name">Gather &amp; Glow</span><br><span class="brand__tag">Event planning assistant</span></span></div>' +
        '<div class="spacer"></div>' +
        '<a class="btn btn--quiet btn--sm" href="#/overview">' + icon('arrow-left', { size: 15 }) + 'Back to workspace</a>' +
        '</header>' +

        '<main class="wizard__body" id="wizard-main"><div class="wizard__inner">' +
        '<div class="wizard__intro">' +
        '<div class="view-head__eyebrow">Guided setup · step ' + state.step + ' of 3</div>' +
        '<h1>' + (state.step === 1 ? 'What are we celebrating?' : state.step === 2 ? 'Where, how many, and how much?' : 'What matters most?') + '</h1>' +
        '<p>' + (state.step === 1
          ? 'Start with the shape of the day. You can change every answer later — nothing here is permanent.'
          : state.step === 2
            ? 'These three numbers decide most of your plan. Rough answers are fine; you can refine them once you have quotes.'
            : 'The details that separate a well-run event from a stressful one. All optional, all editable.') + '</p>' +
        '</div>' +

        '<div class="steps" role="list" aria-label="Setup progress" tabindex="0">' +
        STEPS.map((s) => '<div class="step-pill ' + (s.n === state.step ? 'step-pill--current' : s.n < state.step ? 'step-pill--done' : '') + '" role="listitem"' +
          (s.n === state.step ? ' aria-current="step"' : '') + '>' +
          '<span class="step-pill__num">' + (s.n < state.step ? icon('check', { size: 12 }) : s.n) + '</span>' + esc(s.label) + '</div>').join('') +
        '</div>' +

        '<div class="wizard-grid">' +
        '<form class="card" id="setup-form" data-action="setup:submit" novalidate aria-label="Event setup">' +
        stepContent() +
        '<div class="wizard-nav">' +
        (state.step > 1
          ? '<button type="button" class="btn btn--ghost" data-action="setup:back">' + icon('arrow-left', { size: 16 }) + 'Back</button>'
          : '<a class="btn btn--quiet" href="#/overview">Cancel</a>') +
        '<div class="btn-row">' +
        (state.step < 3
          ? '<button type="submit" class="btn btn--lg">Continue ' + icon('arrow-right', { size: 16 }) + '</button>'
          : '<button type="submit" class="btn btn--lg btn--plum">' + icon('sparkle', { size: 17 }) + 'Create my event workspace</button>') +
        '</div></div></form>' +

        '<aside class="stack">' +
        '<div class="card card--forest">' +
        '<div class="rule-gold" style="color:#e8cd9b">Your brief so far</div>' +
        '<div id="setup-summary-side" style="margin-top:14px">' + summaryHTML() + '</div>' +
        '<p class="small" style="margin-top:14px;color:rgba(242,236,224,0.78)">' + (typeLabel ? 'A ' + esc(typeLabel.toLowerCase()) + ' plan.' : 'Pick a type to begin.') +
        ' Everything is calculated live as you type.</p>' +
        '</div>' +
        '<div class="card card--tint aside-card">' +
        '<h2>Not sure yet?</h2>' +
        '<p class="small muted" style="margin-top:6px">Explore a complete, fictional wedding workspace first. You can start your own event afterwards.</p>' +
        '<button type="button" class="btn btn--ghost btn--block btn--sm" style="margin-top:12px" data-action="setup:demo">' + icon('star', { size: 15 }) + 'Explore the sample wedding</button>' +
        '</div>' +
        '<div class="card aside-card">' +
        '<h2>We will build for you</h2>' +
        '<ul>' +
        '<li>A budget with a suggested split for your event type</li>' +
        '<li>A planning timeline counted back from your date</li>' +
        '<li>A vendor checklist with the right questions</li>' +
        '<li>An idea board sized to your budget and guest count</li>' +
        '</ul></div>' +
        '</aside></div>' +
        '</div></div></main></div>';
    },
  };

  /* ------------------------------------------------------------------ */
  ACTIONS['setup:type'] = (el) => {
    readStep();
    state.values.type = el.dataset.value;
    GG.App.render();
  };
  ACTIONS['setup:style'] = (el) => {
    readStep();
    const value = el.dataset.value;
    state.values.style = state.values.style === value ? '' : value;
    GG.App.render();
  };
  ACTIONS['setup:back'] = () => {
    readStep();
    state.step = Math.max(1, state.step - 1);
    GG.App.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  ACTIONS['setup:next'] = () => {
    readStep();
    if (!validateStep()) return;
    state.step = Math.min(3, state.step + 1);
    GG.App.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  ACTIONS['setup:submit'] = (form) => {
    readStep();
    if (state.step < 3) {
      if (!validateStep()) return;
      state.step += 1;
      GG.App.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const errors = GG.EventForm.validate(state.values, form);
    if (Object.keys(errors).length) {
      // jump back to the step that owns the error
      if (errors.name || errors.date) state.step = 1;
      else if (errors.guestCount || errors.budgetTotal) state.step = 2;
      GG.App.render();
      UI.toast('Something is missing', 'Check the highlighted fields.', 'warn');
      return;
    }
    GG.Store.createEvent(Object.assign({}, state.values));
    const name = state.values.name;
    reset();
    location.hash = '#/overview';
    UI.toast('Your workspace is ready', name + ' · ' + GG.fmtDate(GG.Store.state.event.date, 'long') + '. Budget, timeline and ideas are set up.');
  };
  ACTIONS['setup:demo'] = async () => {
    const ok = await UI.confirm({
      title: 'Open the sample wedding?',
      message: 'This replaces the current workspace with a complete fictional wedding so you can explore every section.',
      confirmLabel: 'Open sample wedding',
      danger: false,
    });
    if (!ok) return;
    GG.Store.loadDemo();
    reset();
    location.hash = '#/overview';
    UI.toast('Sample wedding loaded', 'All data is fictional and clearly labelled.', 'ok');
  };

  /* live-update the side summary without re-rendering the whole wizard */
  document.addEventListener('input', (ev) => {
    const form = ev.target.closest && ev.target.closest('#setup-form');
    if (!form) return;
    readStep();
    const side = document.getElementById('setup-summary-side');
    const inline = document.getElementById('setup-summary');
    if (side) side.innerHTML = summaryHTML();
    if (inline) inline.innerHTML = summaryHTML();
  });
})();
