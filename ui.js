/* Gather & Glow — UI primitives: toasts, modal form builder, confirmations, small HTML helpers. */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, $ } = GG;

  const UI = {};

  /* ---------------- toasts ---------------- */
  function stack() {
    let el = $('.toast-stack');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast-stack';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  UI.toast = function (title, message, tone) {
    const host = stack();
    const node = document.createElement('div');
    node.className = 'toast toast--' + (tone || 'ok');
    const ic = tone === 'danger' ? 'alert' : tone === 'warn' ? 'alert' : 'check';
    node.innerHTML =
      '<span class="toast__icon">' + icon(ic, { size: 18 }) + '</span>' +
      '<div class="toast__body"><div class="toast__title">' + esc(title) + '</div>' +
      (message ? '<div class="toast__msg">' + esc(message) + '</div>' : '') + '</div>' +
      '<button class="toast__close" type="button" aria-label="Dismiss notification">' + icon('x', { size: 15 }) + '</button>';
    host.appendChild(node);
    const remove = () => node.remove();
    node.querySelector('.toast__close').addEventListener('click', remove);
    setTimeout(remove, tone === 'danger' ? 7000 : 4600);
  };

  /* ---------------- modal ---------------- */
  function dialogEl() {
    let d = $('#modal');
    if (!d) {
      d = document.createElement('dialog');
      d.id = 'modal';
      d.className = 'modal';
      d.setAttribute('aria-labelledby', 'modal-title');
      document.body.appendChild(d);
    }
    return d;
  }

  UI.closeModal = function () {
    const d = $('#modal');
    if (d && d.open) d.close();
  };

  /**
   * Form modal.
   * fields: [{ name, label, type, value, options, required, hint, placeholder, min, max, step, col, validate, prefix }]
   */
  UI.form = function (config) {
    const d = dialogEl();
    const fields = config.fields || [];
    const values = Object.assign({}, config.values || {});
    const formId = 'modal-form';

    const fieldHTML = (f) => {
      const id = 'f-' + f.name;
      const val = values[f.name] !== undefined && values[f.name] !== null ? values[f.name] : (f.value !== undefined ? f.value : '');
      const req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
      const col = f.col === 2 ? '' : ' class="field field--full"';
      const hint = f.hint ? '<div class="field__hint" id="' + id + '-hint">' + esc(f.hint) + '</div>' : '';
      const describedBy = f.hint ? ' aria-describedby="' + id + '-hint"' : '';
      const attrs = ' id="' + id + '" name="' + f.name + '"' + describedBy + (f.required ? ' required aria-required="true"' : '');
      let control = '';

      if (f.type === 'textarea') {
        control = '<textarea class="textarea"' + attrs + ' rows="' + (f.rows || 3) + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(val) + '</textarea>';
      } else if (f.type === 'select') {
        const opts = (f.options || []).map((o) => {
          const ov = typeof o === 'string' ? o : o.value;
          const ol = typeof o === 'string' ? o : o.label;
          return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>';
        }).join('');
        control = '<select class="select"' + attrs + '>' + (f.placeholder ? '<option value="">' + esc(f.placeholder) + '</option>' : '') + opts + '</select>';
      } else if (f.type === 'checks') {
        const selected = Array.isArray(val) ? val : [];
        control = '<div class="toggle-grid" role="group" aria-labelledby="' + id + '-group">' +
          '<span class="sr-only" id="' + id + '-group">' + esc(f.label) + '</span>' +
          (f.options || []).map((o, i) => {
            const ov = typeof o === 'string' ? o : o.value;
            const ol = typeof o === 'string' ? o : o.label;
            return '<label class="check check--card"><input type="checkbox" name="' + f.name + '" value="' + esc(ov) + '"' +
              (selected.indexOf(ov) >= 0 ? ' checked' : '') + '><span>' + esc(ol) + '</span></label>';
          }).join('') + '</div>';
      } else if (f.type === 'checkbox') {
        control = '<label class="check check--card"><input type="checkbox" id="' + id + '" name="' + f.name + '"' +
          (val ? ' checked' : '') + '><span>' + esc(f.checkboxLabel || f.label) + '</span></label>';
      } else if (f.type === 'static') {
        control = '<div>' + (f.html || '') + '</div>';
      } else {
        const type = f.type === 'money' || f.type === 'number' ? 'number' : (f.type || 'text');
        const extra = (f.type === 'money' || f.type === 'number')
          ? ' min="' + (f.min !== undefined ? f.min : 0) + '" step="' + (f.step || 1) + '"' + (f.max !== undefined ? ' max="' + f.max + '"' : '')
          : '';
        control = '<input class="input' + (f.type === 'money' ? ' input--money' : '') + '" type="' + type + '"' + attrs + extra +
          ' value="' + esc(val) + '" placeholder="' + esc(f.placeholder || '') + '"' +
          (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') + '>';
      }

      if (f.type === 'checkbox' || f.type === 'static') {
        return '<div class="field field--full">' + (f.type === 'static' ? (f.label ? '<div class="label">' + esc(f.label) + '</div>' : '') : '') + control + (hint || '') + '</div>';
      }
      return '<div class="field' + (f.col === 2 ? '' : ' field--full') + '">' +
        '<label for="' + id + '">' + esc(f.label) + req + '</label>' + control + (hint || '') +
        '<div class="field__error" id="' + id + '-error" hidden></div></div>';
    };

    d.className = 'modal' + (config.size === 'wide' ? ' modal--wide' : '');
    d.innerHTML =
      '<div class="modal__head"><div><h2 id="modal-title">' + esc(config.title) + '</h2>' +
      (config.description ? '<p>' + esc(config.description) + '</p>' : '') + '</div>' +
      '<button type="button" class="btn btn--quiet btn--icon modal__close" data-modal-close aria-label="Close dialog">' + icon('x', { size: 18 }) + '</button></div>' +
      '<form id="' + formId + '" novalidate>' +
      '<div class="modal__body">' + (config.intro || '') +
      '<div class="form-grid' + (config.columns === 3 ? ' form-grid--3' : '') + '">' + fields.map(fieldHTML).join('') + '</div>' +
      (config.extra || '') + '</div>' +
      '<div class="modal__foot">' + (config.footerStart || '') +
      '<button type="button" class="btn btn--ghost" data-modal-close>Cancel</button>' +
      '<button type="submit" class="btn ' + (config.danger ? 'btn--danger-solid' : '') + '">' + esc(config.submitLabel || 'Save') + '</button>' +
      '</div></form>';

    const form = d.querySelector('#' + formId);

    const collect = () => {
      const out = {};
      fields.forEach((f) => {
        if (f.type === 'static') return;
        if (f.type === 'checks') {
          out[f.name] = Array.prototype.slice.call(form.querySelectorAll('input[name="' + f.name + '"]:checked')).map((i) => i.value);
        } else if (f.type === 'checkbox') {
          const el = form.querySelector('[name="' + f.name + '"]');
          out[f.name] = !!(el && el.checked);
        } else if (f.type === 'money' || f.type === 'number') {
          const el = form.querySelector('[name="' + f.name + '"]');
          out[f.name] = el && el.value !== '' ? Number(el.value) : 0;
        } else {
          const el = form.querySelector('[name="' + f.name + '"]');
          out[f.name] = el ? el.value.trim() : '';
        }
      });
      return out;
    };

    const showError = (name, msg) => {
      const box = form.querySelector('#f-' + name + '-error');
      const input = form.querySelector('[name="' + name + '"]');
      if (box) {
        box.textContent = msg;
        box.hidden = false;
      }
      if (input) input.setAttribute('aria-invalid', 'true');
    };
    const clearErrors = () => {
      form.querySelectorAll('.field__error').forEach((e) => { e.hidden = true; e.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
    };

    const validate = (vals) => {
      let first = null;
      fields.forEach((f) => {
        if (f.type === 'static' || !f.required) {
          if (f.validate) {
            const msg = f.validate(vals[f.name], vals);
            if (msg) { showError(f.name, msg); first = first || f.name; }
          }
          return;
        }
        const v = vals[f.name];
        if (f.type === 'checks') {
          if (!v || !v.length) { showError(f.name, 'Choose at least one option.'); first = first || f.name; return; }
        } else if (f.type === 'checkbox') {
          if (!v) { showError(f.name, 'Please confirm to continue.'); first = first || f.name; return; }
        } else if (f.type === 'money' || f.type === 'number') {
          if (!(Number(v) > 0)) { showError(f.name, 'Enter a number greater than zero.'); first = first || f.name; return; }
        } else if (!String(v || '').trim()) {
          showError(f.name, 'This field is required.'); first = first || f.name; return;
        }
        if (f.validate) {
          const msg = f.validate(v, vals);
          if (msg) { showError(f.name, msg); first = first || f.name; }
        }
      });
      if (first) {
        const el = form.querySelector('[name="' + first + '"]');
        if (el && el.focus) el.focus();
        UI.toast('Check the form', 'Some fields need attention.', 'warn');
      }
      return !first;
    };

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      clearErrors();
      const vals = collect();
      if (!validate(vals)) return;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const result = await config.onSubmit(vals, form);
        if (result !== false) d.close();
      } catch (err) {
        console.error(err);
        UI.toast('Something went wrong', err.message || 'Please try again.', 'danger');
      } finally {
        submitBtn.disabled = false;
      }
    });

    d.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', () => d.close()));
    if (config.onMount) config.onMount(form, d);
    if (!d.open) d.showModal();
    const firstInput = d.querySelector('.modal__body input, .modal__body select, .modal__body textarea');
    if (firstInput) firstInput.focus();
    return d;
  };

  /** Confirmation for destructive actions. Resolves true/false. */
  UI.confirm = function ({ title, message, confirmLabel, cancelLabel, danger, extra }) {
    return new Promise((resolve) => {
      const d = dialogEl();
      d.className = 'modal';
      d.innerHTML =
        '<div class="modal__head"><div><h2 id="modal-title">' + esc(title) + '</h2>' +
        '<p>' + esc(message) + '</p></div></div>' +
        '<div class="modal__body">' + (extra ? '<div class="alert alert--warn">' + icon('alert', { size: 18 }) + '<div>' + extra + '</div></div>' : '<p class="muted small">This action cannot be undone.</p>') + '</div>' +
        '<div class="modal__foot"><button type="button" class="btn btn--ghost" data-cancel>' + esc(cancelLabel || 'Cancel') + '</button>' +
        '<button type="button" class="btn ' + (danger ? 'btn--danger-solid' : '') + '" data-ok>' + esc(confirmLabel || 'Delete') + '</button></div>';
      let settled = false;
      const onClose = () => { if (!settled) { settled = true; resolve(false); } };
      const done = (v) => {
        if (settled) return;
        settled = true;
        d.removeEventListener('close', onClose);
        if (d.open) d.close();
        resolve(v);
      };
      d.querySelector('[data-ok]').addEventListener('click', () => done(true));
      d.querySelector('[data-cancel]').addEventListener('click', () => done(false));
      d.addEventListener('close', onClose);
      d.showModal();
      d.querySelector('[data-cancel]').focus();
    });
  };

  /** Informational modal. */
  UI.info = function ({ title, description, body, footerLabel }) {
    const d = dialogEl();
    d.className = 'modal modal--wide';
    d.innerHTML =
      '<div class="modal__head"><div><h2 id="modal-title">' + esc(title) + '</h2>' +
      (description ? '<p>' + esc(description) + '</p>' : '') + '</div>' +
      '<button type="button" class="btn btn--quiet btn--icon modal__close" data-modal-close aria-label="Close dialog">' + icon('x', { size: 18 }) + '</button></div>' +
      '<div class="modal__body">' + body + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-modal-close>' + esc(footerLabel || 'Got it') + '</button></div>';
    d.querySelectorAll('[data-modal-close]').forEach((b) => b.addEventListener('click', () => d.close()));
    d.showModal();
  };

  /* ---------------- small HTML helpers ---------------- */
  UI.progress = function (percent, tone, label) {
    const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
    return '<div class="progress" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"' +
      (label ? ' aria-label="' + esc(label) + '"' : '') + '><div class="progress__fill' + (tone ? ' progress__fill--' + tone : '') + '" style="width:' + p + '%"></div></div>';
  };

  UI.badge = function (text, tone, iconName) {
    return '<span class="badge' + (tone ? ' badge--' + tone : '') + '">' +
      (iconName ? icon(iconName, { size: 13 }) : '') + esc(text) + '</span>';
  };

  UI.empty = function ({ iconName, title, message, action }) {
    return '<div class="empty"><div class="empty__icon">' + icon(iconName || 'sparkle', { size: 24 }) + '</div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(message) + '</p>' + (action || '') + '</div>';
  };

  UI.priorityBadge = function (p) {
    if (p === 'high') return '<span class="badge badge--danger">' + icon('alert', { size: 12 }) + 'High priority</span>';
    if (p === 'low') return '<span class="badge badge--outline">Low priority</span>';
    return '<span class="badge">Medium priority</span>';
  };

  UI.rsvpBadge = function (rsvp) {
    const map = {
      yes: ['Attending', 'ok', 'check'],
      maybe: ['Maybe', 'warn', 'info'],
      pending: ['Awaiting reply', 'outline', 'clock'],
      no: ['Declined', 'danger', 'x'],
    };
    const [label, tone, ic] = map[rsvp] || map.pending;
    return UI.badge(label, tone, ic);
  };

  UI.vendorStatusBadge = function (status) {
    const map = {
      researching: ['Researching', 'outline', 'search'],
      contacted: ['Contacted', 'info', 'mail'],
      shortlisted: ['Shortlisted', 'gold', 'star'],
      booked: ['Booked', 'ok', 'check'],
      paid: ['Paid in full', 'ok', 'check'],
    };
    const [label, tone, ic] = map[status] || map.researching;
    return UI.badge(label, tone, ic === 'mail' ? 'envelope' : ic);
  };

  GG.UI = UI;
})();
