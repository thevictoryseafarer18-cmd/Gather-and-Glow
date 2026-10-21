/* Gather & Glow — Event details & data controls */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  GG.Views = GG.Views || {};
  GG.Views.event = {
    render() {
      const e = S().event();
      const values = Object.assign({}, e);
      const updated = GG.Store.state.meta && GG.Store.state.meta.updatedAt
        ? new Date(GG.Store.state.meta.updatedAt).toLocaleString()
        : 'just now';

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">Settings</div>' +
        '<h1>Event details</h1>' +
        '<p class="lede">Change the brief and everything else — timeline, budget suggestions, ideas — adapts.</p></div>' +
        '<div class="view-head__actions"><a class="btn btn--ghost" href="#/overview">' + icon('arrow-left', { size: 16 }) + 'Back to overview</a></div></div>' +

        '<div class="grid grid--2" style="grid-template-columns:minmax(0,1.9fr) minmax(0,1fr);align-items:start">' +
        '<form class="card" data-action="event:save" novalidate aria-labelledby="details-title">' +
        '<div class="card__head"><div><h2 id="details-title">The brief</h2>' +
        '<div class="card__sub">Everything here feeds the assistant, budget and templates.</div></div></div>' +

        '<div class="field field--full" style="margin-bottom:16px"><label for="ev-type">Event type</label>' +
        '<select class="select" id="ev-type" name="type">' +
        T.EVENT_TYPES.map((t) => '<option value="' + t.id + '"' + (e.type === t.id ? ' selected' : '') + '>' + esc(t.label) + '</option>').join('') +
        '</select><div class="field__hint">Changing this updates the suggested budget split and planning templates — nothing is deleted.</div></div>' +

        '<div class="form-grid">' + GG.EventForm.fields(values, ['name', 'date', 'location', 'guestCount', 'currency', 'budgetTotal', 'style', 'priorities', 'dietary', 'accessibility', 'notes']) + '</div>' +

        '<div class="btn-row" style="margin-top:20px;justify-content:flex-end">' +
        '<a class="btn btn--ghost" href="#/overview">Cancel</a>' +
        '<button type="submit" class="btn">' + icon('save', { size: 16 }) + 'Save event details</button>' +
        '</div></form>' +

        '<div class="stack">' +
        '<div class="card card--tint">' +
        '<h3 style="font-size:1rem">Your data</h3>' +
        '<p class="small muted" style="margin-top:6px">This prototype stores everything in your browser’s local storage. No account, no server, nothing uploaded.</p>' +
        '<div class="stack stack--tight" style="margin-top:14px">' +
        '<div class="row row--between small"><span class="muted">Last saved</span><span class="tabular">' + esc(updated) + '</span></div>' +
        '<div class="row row--between small"><span class="muted">Guests</span><span class="tabular">' + S().guests().total + '</span></div>' +
        '<div class="row row--between small"><span class="muted">Tasks</span><span class="tabular">' + S().tasks().total + '</span></div>' +
        '<div class="row row--between small"><span class="muted">Vendors</span><span class="tabular">' + S().vendors().total + '</span></div>' +
        '<div class="row row--between small"><span class="muted">Budget items</span><span class="tabular">' + S().budget().itemCount + '</span></div>' +
        '</div></div>' +

        '<div class="card">' +
        '<h3 style="font-size:1rem">Start over</h3>' +
        '<p class="small muted" style="margin-top:6px">Create a new event, or return to the sample wedding used for the demo.</p>' +
        '<div class="stack stack--tight" style="margin-top:14px">' +
        '<a class="btn btn--ghost btn--block" href="#/setup">' + icon('plus', { size: 16 }) + 'Plan a new event</a>' +
        '<button type="button" class="btn btn--ghost btn--block" data-action="data:load-demo">' + icon('refresh', { size: 16 }) + 'Load the sample wedding</button>' +
        '<button type="button" class="btn btn--danger btn--block" data-action="data:reset">' + icon('trash', { size: 16 }) + 'Reset demo data</button>' +
        '</div>' +
        '<p class="xsmall muted" style="margin-top:10px">Reset clears this browser’s saved event and restores the sample wedding. It cannot be undone.</p>' +
        '</div></div></div>';
    },
  };

  ACTIONS['event:save'] = (form) => {
    const values = GG.EventForm.read(form);
    const typeEl = form.querySelector('[name="type"]');
    values.type = typeEl ? typeEl.value : S().event().type;
    const errors = GG.EventForm.validate(values, form);
    if (Object.keys(errors).length) {
      UI.toast('Check the form', 'Some required fields need attention.', 'warn');
      return;
    }
    const previousType = S().event().type;
    GG.Store.updateEvent(values);
    UI.toast('Event details saved', values.name + ' · ' + GG.fmtDate(values.date, 'long'));
    if (values.type !== previousType) {
      UI.toast('Event type changed', 'Suggested splits and templates now follow a ' + values.type + ' plan. Existing data is untouched.', 'warn');
    }
  };

  ACTIONS['data:load-demo'] = async () => {
    const ok = await UI.confirm({
      title: 'Load the sample wedding?',
      message: 'This replaces your current event with the demo wedding — budgets, tasks, vendors, guests and ideas.',
      confirmLabel: 'Load sample data',
      danger: true,
      extra: 'Use this to explore the prototype with a full set of fictional data.',
    });
    if (!ok) return;
    GG.Store.loadDemo();
    location.hash = '#/overview';
    UI.toast('Sample wedding loaded', 'You are exploring fictional demo data.', 'ok');
  };

  ACTIONS['data:reset'] = async () => {
    const ok = await UI.confirm({
      title: 'Reset all demo data?',
      message: 'Everything you have added or edited in this browser will be replaced by the original sample wedding.',
      confirmLabel: 'Reset everything',
      danger: true,
      extra: 'This cannot be undone. Export your guest list first if you need to keep it.',
    });
    if (!ok) return;
    GG.Store.resetDemo();
    location.hash = '#/overview';
    UI.toast('Demo data reset', 'The sample wedding has been restored.', 'ok');
  };
})();
