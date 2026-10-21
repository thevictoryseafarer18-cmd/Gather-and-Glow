/* Gather & Glow — shared event field definitions used by the setup wizard and Event details. */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon } = GG;
  const T = GG.Templates;

  const EventForm = {};

  EventForm.defaults = function () {
    return {
      type: 'wedding',
      name: '',
      date: GG.toISO(GG.addDays(GG.today(), 120)),
      location: '',
      guestCount: 120,
      currency: 'INR',
      budgetTotal: 500000,
      style: '',
      priorities: [],
      dietary: '',
      accessibility: '',
      notes: '',
    };
  };

  EventForm.typeCards = function (selected) {
    return '<div class="type-grid" role="group" aria-label="Event type">' +
      T.EVENT_TYPES.map((t) =>
        '<button type="button" class="type-card" data-action="setup:type" data-value="' + t.id + '" data-selected="' + (selected === t.id) + '" aria-pressed="' + (selected === t.id) + '">' +
        '<span class="type-card__check">' + icon('check', { size: 18 }) + '</span>' +
        '<span class="type-card__icon">' + icon(t.icon, { size: 20 }) + '</span>' +
        '<span class="type-card__title">' + esc(t.label) + '</span>' +
        '<span class="type-card__blurb">' + esc(t.blurb) + '</span></button>').join('') + '</div>';
  };

  EventForm.styleChips = function (type, current) {
    const presets = T.STYLE_PRESETS[type] || T.STYLE_PRESETS.other;
    return '<div class="chip-set" role="group" aria-label="Suggested styles">' +
      presets.map((p) => '<button type="button" class="chip" data-action="setup:style" data-value="' + esc(p) + '" aria-pressed="' + (current === p) + '">' + esc(p) + '</button>').join('') +
      '</div>';
  };

  EventForm.fields = function (values, keys) {
    const v = Object.assign(EventForm.defaults(), values);
    const f = {
      name: '<div class="field field--full"><label for="ev-name">Event name <span class="req" aria-hidden="true">*</span></label>' +
        '<input class="input" id="ev-name" name="name" type="text" required value="' + esc(v.name) + '" placeholder="e.g. Aarav &amp; Meera, Diya turns 5, Ward 12 Diwali Mela">' +
        '<div class="field__hint">Used throughout your workspace — it can be anything.</div>' +
        '<div class="field__error" id="ev-name-error" hidden></div></div>',

      date: '<div class="field"><label for="ev-date">Event date <span class="req" aria-hidden="true">*</span></label>' +
        '<input class="input" id="ev-date" name="date" type="date" required value="' + esc(v.date) + '">' +
        '<div class="field__hint">Timeline tasks are scheduled backwards from this date.</div>' +
        '<div class="field__error" id="ev-date-error" hidden></div></div>',

      location: '<div class="field"><label for="ev-location">Location or city</label>' +
        '<input class="input" id="ev-location" name="location" type="text" value="' + esc(v.location) + '" placeholder="e.g. Chennai, Tamil Nadu">' +
        '<div class="field__hint">Used to tailor vendor and style suggestions.</div></div>',

      guestCount: '<div class="field"><label for="ev-guests">Guest count <span class="req" aria-hidden="true">*</span></label>' +
        '<input class="input" id="ev-guests" name="guestCount" type="number" min="1" max="20000" step="1" required value="' + esc(v.guestCount) + '">' +
        '<div class="field__hint">A working number — RSVPs will refine it.</div>' +
        '<div class="field__error" id="ev-guestCount-error" hidden></div></div>',

      currency: '<div class="field"><label for="ev-currency">Currency</label>' +
        '<select class="select" id="ev-currency" name="currency">' +
        Object.keys(GG.CURRENCIES).map((c) => '<option value="' + c + '"' + (v.currency === c ? ' selected' : '') + '>' + c + ' · ' + esc(GG.CURRENCIES[c].label) + '</option>').join('') +
        '</select></div>',

      budgetTotal: '<div class="field"><label for="ev-budget">Total budget <span class="req" aria-hidden="true">*</span></label>' +
        '<input class="input input--money" id="ev-budget" name="budgetTotal" type="number" min="0" step="1000" required value="' + esc(v.budgetTotal) + '">' +
        '<div class="field__hint">A starting allocation will be suggested for your event type.</div>' +
        '<div class="field__error" id="ev-budgetTotal-error" hidden></div></div>',

      style: '<div class="field field--full"><label for="ev-style">Style or theme</label>' +
        '<input class="input" id="ev-style" name="style" type="text" value="' + esc(v.style) + '" placeholder="e.g. Carnatic garden, colour-block party, cultural night">' +
        '<div class="field__hint">Pick a suggestion below or write your own.</div></div>' +
        '<div class="field field--full" style="margin-top:-8px">' + EventForm.styleChips(v.type, v.style) + '</div>',

      priorities: '<div class="field field--full"><span class="label" id="ev-priorities-label">What matters most?</span>' +
        '<div class="toggle-grid" role="group" aria-labelledby="ev-priorities-label">' +
        T.PRIORITIES.map((p) => '<label class="check check--card"><input type="checkbox" name="priorities" value="' + esc(p) + '"' +
          ((v.priorities || []).indexOf(p) >= 0 ? ' checked' : '') + '><span>' + esc(p) + '</span></label>').join('') +
        '</div><div class="field__hint">These decide recommendations and trade-offs later.</div></div>',

      dietary: '<div class="field"><label for="ev-dietary">Dietary needs</label>' +
        '<textarea class="textarea" id="ev-dietary" name="dietary" rows="3" placeholder="e.g. 12 vegetarian, 2 Jain, 1 shellfish allergy">' + esc(v.dietary) + '</textarea>' +
        '<div class="field__hint">Also tracked per guest in the guest list.</div></div>',

      accessibility: '<div class="field"><label for="ev-access">Accessibility needs</label>' +
        '<textarea class="textarea" id="ev-access" name="accessibility" rows="3" placeholder="e.g. Step-free entry, reserved seating, quiet room">' + esc(v.accessibility) + '</textarea></div>',

      notes: '<div class="field field--full"><label for="ev-notes">Special requests or notes</label>' +
        '<textarea class="textarea" id="ev-notes" name="notes" rows="3" placeholder="Anything the plan should remember — rituals, must-haves, family constraints">' + esc(v.notes) + '</textarea></div>',
    };
    return (keys || Object.keys(f)).map((k) => f[k] || '').join('');
  };

  EventForm.read = function (form) {
    const val = (n) => {
      const el = form.querySelector('[name="' + n + '"]');
      return el ? el.value.trim() : '';
    };
    return {
      name: val('name'),
      date: val('date'),
      location: val('location'),
      guestCount: Number(val('guestCount')) || 0,
      currency: val('currency') || 'INR',
      budgetTotal: Number(val('budgetTotal')) || 0,
      style: val('style'),
      priorities: Array.prototype.slice.call(form.querySelectorAll('[name="priorities"]:checked')).map((i) => i.value),
      dietary: val('dietary'),
      accessibility: val('accessibility'),
      notes: val('notes'),
    };
  };

  EventForm.validate = function (values, form) {
    const errors = {};
    if (!values.name) errors.name = 'Give your event a name.';
    if (!values.date) errors.date = 'Choose the event date.';
    else if (!GG.parseISO(values.date)) errors.date = 'Enter a valid date.';
    if (!(values.guestCount > 0)) errors.guestCount = 'Enter a guest count greater than zero.';
    if (!(values.budgetTotal > 0)) errors.budgetTotal = 'Enter a budget greater than zero.';

    if (form) {
      form.querySelectorAll('.field__error').forEach((e) => { e.hidden = true; e.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
      Object.keys(errors).forEach((key) => {
        const box = form.querySelector('#ev-' + key + '-error');
        const input = form.querySelector('[name="' + key + '"]');
        if (box) { box.textContent = errors[key]; box.hidden = false; }
        if (input) input.setAttribute('aria-invalid', 'true');
      });
      const first = Object.keys(errors)[0];
      if (first) {
        const input = form.querySelector('[name="' + first + '"]');
        if (input) input.focus();
      }
    }
    return errors;
  };

  GG.EventForm = EventForm;
})();
