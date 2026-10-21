/* Gather & Glow — Guests & RSVPs */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money, toCSV, parseCSV, downloadFile } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  const filters = { search: '', rsvp: 'all', group: 'all' };
  GG.GuestFilters = filters;

  const GROUPS = ['Family', 'Friends', 'Colleagues', 'Neighbours', 'Plus ones', 'Other'];
  const CSV_HEADER = ['name', 'email', 'group', 'rsvp', 'meal', 'dietary', 'access', 'plusOnes'];

  function rsvpOptions(current) {
    return T.RSVP_OPTIONS.map((o) => '<option value="' + o.id + '"' + (current === o.id ? ' selected' : '') + '>' + o.label + '</option>').join('');
  }

  function summarisePeople(list) {
    const meals = {};
    list.forEach((g) => {
      const key = g.meal || 'Not decided';
      meals[key] = (meals[key] || 0) + 1 + (Number(g.plusOnes) || 0);
    });
    return Object.keys(meals).sort((a, b) => meals[b] - meals[a]).map((k) => ({ meal: k, count: meals[k] }));
  }

  GG.Views = GG.Views || {};
  GG.Views.guests = {
    render() {
      const guests = S().guests();
      const e = S().event();
      const cur = S().currency();

      const groups = Array.from(new Set(guests.all.map((g) => g.group || 'Other')));
      const visible = guests.all.filter((g) => {
        if (filters.rsvp !== 'all' && g.rsvp !== filters.rsvp) return false;
        if (filters.group !== 'all' && (g.group || 'Other') !== filters.group) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if ([(g.name || ''), (g.email || ''), (g.dietary || ''), (g.access || '')].join(' ').toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      });

      const mealMix = guests.meals.length ? guests.meals : summarisePeople(guests.all);
      const gap = guests.capacityGap;

      const capacityAlert = guests.total === 0
        ? ''
        : gap > 0
          ? '<div class="alert alert--info">' + icon('info', { size: 18 }) + '<div><strong>' + Math.abs(gap) + ' seats unassigned.</strong> Your list covers ' + guests.invitedHeads + ' seats against a planning headcount of ' + e.guestCount + '. Invite more people, or update the headcount in Event details so catering quotes stay accurate.</div></div>'
          : gap < 0
            ? '<div class="alert alert--warn">' + icon('alert', { size: 18 }) + '<div><strong>Your list is ' + Math.abs(gap) + ' seats over the planning headcount of ' + e.guestCount + '.</strong> Either raise the headcount (and the catering budget that follows it), or trim the list.</div></div>'
            : '<div class="alert alert--ok">' + icon('check', { size: 18 }) + '<div><strong>Guest list matches your planning headcount of ' + e.guestCount + '.</strong> Keep it aligned as RSVPs change.</div></div>';

      const rows = visible.map((g) => {
        const initials = (g.name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
        return '<tr>' +
          '<td><div class="row" style="gap:9px"><span class="avatar-initial" aria-hidden="true">' + esc(initials) + '</span>' +
          '<div><div style="font-weight:600">' + esc(g.name || 'Unnamed guest') + '</div>' +
          '<div class="xsmall muted">' + esc(g.email || 'No email') + (Number(g.plusOnes) ? ' · +' + g.plusOnes + ' guest' + (Number(g.plusOnes) === 1 ? '' : 's') : '') + '</div></div></div></td>' +
          '<td><span class="badge badge--outline">' + esc(g.group || 'Other') + '</span></td>' +
          '<td><label class="sr-only" for="rsvp-' + g.id + '">RSVP for ' + esc(g.name) + '</label>' +
          '<select class="select" id="rsvp-' + g.id + '" data-change="guest:rsvp" data-id="' + g.id + '" style="min-width:140px;min-height:36px;padding:6px 30px 6px 10px;font-size:0.84rem">' + rsvpOptions(g.rsvp) + '</select></td>' +
          '<td>' + esc(g.meal || '—') + '</td>' +
          '<td>' + (g.dietary && g.dietary !== 'No restrictions'
            ? '<span class="badge badge--warn">' + icon('alert', { size: 12 }) + esc(g.dietary) + '</span>'
            : '<span class="muted xsmall">None</span>') + '</td>' +
          '<td>' + (g.access && g.access !== 'None'
            ? '<span class="badge badge--info">' + icon('users', { size: 12 }) + esc(g.access) + '</span>'
            : '<span class="muted xsmall">None</span>') + '</td>' +
          '<td class="num"><div class="row-actions">' +
          '<button type="button" class="btn btn--quiet btn--icon" data-action="guest:edit" data-id="' + g.id + '" aria-label="Edit ' + esc(g.name) + '">' + icon('pencil', { size: 15 }) + '</button>' +
          '<button type="button" class="btn btn--quiet btn--icon" data-action="guest:delete" data-id="' + g.id + '" aria-label="Remove ' + esc(g.name) + '">' + icon('trash', { size: 15 }) + '</button>' +
          '</div></td></tr>';
      }).join('');

      const mealBars = mealMix.map((m) => (
        '<div style="margin-bottom:10px"><div class="progress-row"><span>' + esc(m.meal) + '</span><strong>' + m.count + ' seats</strong></div>' +
        UI.progress((m.count / Math.max(1, guests.invitedHeads)) * 100, 'gold', m.meal + ' share of guests') + '</div>'
      )).join('');

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">People</div>' +
        '<h1>Guests &amp; event details</h1>' +
        '<p class="lede">RSVPs, meals, dietary needs and access requirements — the list your caterer and venue actually need.</p></div>' +
        '<div class="view-head__actions">' +
        '<button type="button" class="btn btn--ghost" data-action="guest:import">' + icon('upload', { size: 16 }) + 'Import CSV</button>' +
        '<button type="button" class="btn btn--ghost" data-action="guest:export">' + icon('download', { size: 16 }) + 'Export CSV</button>' +
        '<button type="button" class="btn" data-action="guest:add">' + icon('plus', { size: 16 }) + 'Add guest</button>' +
        '</div></div>' +

        '<div class="guest-summary" style="margin-bottom:18px">' +
        '<div class="guest-summary__cell"><div class="guest-summary__num">' + guests.total + '</div><div class="guest-summary__label">Guests listed</div></div>' +
        '<div class="guest-summary__cell"><div class="guest-summary__num">' + guests.invitedHeads + '</div><div class="guest-summary__label">Seats incl. plus-ones</div></div>' +
        '<div class="guest-summary__cell"><div class="guest-summary__num">' + guests.rsvpYes + '</div><div class="guest-summary__label">Attending</div></div>' +
        '<div class="guest-summary__cell"><div class="guest-summary__num">' + guests.rsvpPending + '</div><div class="guest-summary__label">Awaiting reply</div></div>' +
        '<div class="guest-summary__cell"><div class="guest-summary__num">' + guests.rsvpNo + '</div><div class="guest-summary__label">Declined</div></div>' +
        '<div class="guest-summary__cell"><div class="guest-summary__num">' + guests.restrictions.length + '</div><div class="guest-summary__label">Dietary flags</div></div>' +
        '</div>' +

        (capacityAlert ? '<div style="margin-bottom:18px">' + capacityAlert + '</div>' : '') +

        '<div class="grid grid--2" style="grid-template-columns:minmax(0,2.2fr) minmax(0,1fr);align-items:start" data-guest-layout>' +
        '<section class="card" aria-labelledby="guest-list-title">' +
        '<div class="card__head"><div><h2 id="guest-list-title">Guest list</h2>' +
        '<div class="card__sub">' + visible.length + ' of ' + guests.total + ' shown · ' + guests.respondedPct + '% have replied</div></div></div>' +

        '<div class="filters">' +
        '<div class="filters__row">' +
        '<div class="search-wrap">' + icon('search', { size: 15 }) +
        '<input class="input" type="search" placeholder="Search name, email, dietary, access…" aria-label="Search guests" value="' + esc(filters.search) + '" data-input="guest:search" data-focus-key="guest-search"></div>' +
        '<div class="field"><label class="sr-only" for="guest-group-filter">Filter by group</label>' +
        '<select class="select" id="guest-group-filter" data-change="guest:filter-group" data-focus-key="guest-group-filter">' +
        '<option value="all">All groups</option>' +
        groups.map((g) => '<option value="' + esc(g) + '"' + (filters.group === g ? ' selected' : '') + '>' + esc(g) + '</option>').join('') +
        '</select></div></div>' +
        '<div class="filters__row"><div class="segmented" role="group" aria-label="Filter by RSVP">' +
        [['all', 'All'], ['yes', 'Attending'], ['maybe', 'Maybe'], ['pending', 'Awaiting'], ['no', 'Declined']].map(([v, l]) =>
          '<button type="button" data-action="guest:filter-rsvp" data-value="' + v + '" aria-pressed="' + (filters.rsvp === v) + '">' + l + '</button>').join('') +
        '</div></div></div>' +

        (visible.length
          ? '<div class="table-wrap"><table class="table"><caption class="sr-only">Guest list with RSVP status, meal and access needs</caption>' +
            '<thead><tr><th scope="col">Guest</th><th scope="col">Group</th><th scope="col">RSVP</th><th scope="col">Meal</th><th scope="col">Dietary</th><th scope="col">Access</th><th scope="col" class="num">Actions</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>'
          : UI.empty({
            iconName: 'users',
            title: guests.total ? 'No guests match this filter' : 'Your guest list is empty',
            message: guests.total ? 'Try another RSVP status, group or search term.' : 'Add guests one by one, or import a CSV to bring in an existing list.',
            action: '<div class="btn-row" style="justify-content:center">' +
              '<button class="btn btn--sm" data-action="guest:add">Add a guest</button>' +
              '<button class="btn btn--ghost btn--sm" data-action="guest:import">Import CSV</button></div>',
          })) +
        '</section>' +

        '<div class="stack">' +
        '<section class="card" aria-labelledby="meal-title">' +
        '<div class="card__head"><div><h2 id="meal-title" style="font-size:1.05rem">Meal mix</h2>' +
        '<div class="card__sub">Seats by preference, plus-ones included.</div></div></div>' +
        (mealMix.length ? mealBars : '<p class="small muted">Add guests to see the meal split.</p>') +
        '</section>' +

        '<section class="card" aria-labelledby="needs-title">' +
        '<div class="card__head"><div><h2 id="needs-title" style="font-size:1.05rem">Needs to brief</h2>' +
        '<div class="card__sub">Hand this to the caterer and venue.</div></div></div>' +
        (guests.restrictions.length || guests.accessNeeds.length
          ? '<div class="stack stack--tight">' +
            guests.restrictions.map((g) => '<div class="row" style="gap:8px;align-items:flex-start">' + icon('cup', { size: 15 }) +
              '<div class="small"><strong>' + esc(g.name) + '</strong><div class="xsmall muted">' + esc(g.dietary) + ' · ' + esc(g.meal) + '</div></div></div>').join('') +
            guests.accessNeeds.map((g) => '<div class="row" style="gap:8px;align-items:flex-start">' + icon('users', { size: 15 }) +
              '<div class="small"><strong>' + esc(g.name) + '</strong><div class="xsmall muted">' + esc(g.access) + '</div></div></div>').join('') +
            '</div>'
          : '<p class="small muted">No dietary or access needs recorded yet. Ask in your RSVP form rather than at the door.</p>') +
        '<div class="divider"></div>' +
        '<button type="button" class="btn btn--ghost btn--sm btn--block" data-action="guest:export">' + icon('download', { size: 14 }) + 'Download guest CSV</button>' +
        '<button type="button" class="btn btn--quiet btn--sm btn--block" style="margin-top:6px" data-action="guest:sample-csv">' + icon('table', { size: 14 }) + 'Download sample CSV format</button>' +
        '</section>' +
        '</div></div>' +

        '<p class="xsmall muted" style="margin-top:16px">Guest data stays in this browser only. Nothing is uploaded or shared.</p>';
    },
  };

  /* ------------------------------------------------------------------ */
  function guestForm(g) {
    const isEdit = !!g;
    UI.form({
      title: isEdit ? 'Edit guest' : 'Add guest',
      description: 'Dietary and access notes are surfaced to you on the overview and in the guest summary.',
      columns: 2,
      values: g || { name: '', email: '', group: 'Friends', rsvp: 'pending', meal: 'Veg', dietary: 'No restrictions', access: 'None', plusOnes: 0 },
      fields: [
        { name: 'name', label: 'Guest name', type: 'text', required: true, col: 1, placeholder: 'Full name' },
        { name: 'email', label: 'Email', type: 'text', col: 1, placeholder: 'name@example.com', validate: (v) => (v && v.indexOf('@') < 1 ? 'Enter a valid email or leave blank.' : null) },
        { name: 'group', label: 'Group', type: 'select', col: 1, options: GROUPS },
        { name: 'rsvp', label: 'RSVP status', type: 'select', col: 1, options: T.RSVP_OPTIONS.map((o) => ({ value: o.id, label: o.label })) },
        { name: 'plusOnes', label: 'Plus-ones', type: 'number', col: 1, min: 0, max: 10, hint: 'Extra seats this guest is bringing.' },
        { name: 'meal', label: 'Meal preference', type: 'select', col: 1, options: T.MEAL_OPTIONS },
        { name: 'dietary', label: 'Dietary restrictions', type: 'select', col: 1, options: T.DIETARY_OPTIONS },
        { name: 'access', label: 'Accessibility needs', type: 'text', col: 1, placeholder: 'e.g. Wheelchair access, front seating' },
      ],
      submitLabel: isEdit ? 'Save guest' : 'Add guest',
      onSubmit(vals) {
        if (isEdit) {
          GG.Store.updateGuest(g.id, vals);
          UI.toast('Guest updated', vals.name + ' saved.');
        } else {
          GG.Store.addGuest(vals);
          UI.toast('Guest added', vals.name + ' is on the list.');
        }
      },
    });
  }

  ACTIONS['guest:add'] = () => guestForm(null);
  ACTIONS['guest:edit'] = (el) => {
    const g = GG.Store.state.guests.find((x) => x.id === el.dataset.id);
    if (g) guestForm(g);
  };
  ACTIONS['guest:delete'] = async (el) => {
    const g = GG.Store.state.guests.find((x) => x.id === el.dataset.id);
    if (!g) return;
    const ok = await UI.confirm({ title: 'Remove this guest?', message: '“' + g.name + '” will be removed from the list and all counts.', confirmLabel: 'Remove guest', danger: true });
    if (!ok) return;
    GG.Store.removeGuest(g.id);
    UI.toast('Guest removed', 'Totals and meal counts updated.', 'ok');
  };
  ACTIONS['guest:rsvp'] = (el) => {
    const g = GG.Store.updateGuest(el.dataset.id, { rsvp: el.value });
    if (g) {
      const label = (T.RSVP_OPTIONS.find((o) => o.id === el.value) || {}).label;
      UI.toast('RSVP updated', g.name + ' marked “' + label + '”.');
    }
  };
  ACTIONS['guest:filter-rsvp'] = (el) => { filters.rsvp = el.dataset.value; GG.App.render(); };
  ACTIONS['guest:filter-group'] = (el) => { filters.group = el.value; GG.App.render(); };
  ACTIONS['guest:search'] = (el) => { filters.search = el.value; GG.App.render(); };

  ACTIONS['guest:export'] = () => {
    const guests = GG.Store.state.guests;
    if (!guests.length) { UI.toast('Nothing to export', 'Add a guest first.', 'warn'); return; }
    const rows = [CSV_HEADER].concat(guests.map((g) => [g.name, g.email, g.group, g.rsvp, g.meal, g.dietary, g.access, g.plusOnes]));
    const name = (GG.Store.state.event.name || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    downloadFile('gather-glow-guests-' + name + '.csv', toCSV(rows), 'text/csv;charset=utf-8');
    UI.toast('Guest list exported', guests.length + ' guests written to CSV.');
  };

  ACTIONS['guest:sample-csv'] = () => {
    downloadFile('gather-glow-guest-import-sample.csv', T.GUEST_CSV_SAMPLE, 'text/csv;charset=utf-8');
    UI.toast('Sample CSV downloaded', 'Fill it in, then use Import CSV.');
  };

  ACTIONS['guest:import'] = () => {
    const body = '<div class="alert alert--info" style="margin-bottom:14px">' + icon('info', { size: 18 }) +
      '<div>Your CSV should have a <strong>name</strong> column. Optional columns: <code>email, group, rsvp, meal, dietary, access, plusOnes</code>. RSVP values are <code>yes</code>, <code>maybe</code>, <code>pending</code> or <code>no</code>.</div></div>' +
      '<div class="dropzone" id="csv-drop">' +
      '<p class="small" style="margin-bottom:10px"><strong>Drop a CSV here</strong> or choose a file.</p>' +
      '<label class="btn btn--ghost btn--sm" for="csv-file">Choose CSV file<input type="file" id="csv-file" accept=".csv,text/csv"></label>' +
      '<p class="xsmall muted" style="margin-top:8px">Files are read in your browser only — nothing is uploaded.</p></div>' +
      '<div class="field" style="margin-top:16px"><label for="csv-text">…or paste CSV content</label>' +
      '<textarea class="textarea" id="csv-text" rows="6" placeholder="' + esc(T.GUEST_CSV_SAMPLE.split('\n').slice(0, 2).join('\n')) + '"></textarea></div>' +
      '<div class="row row--between" style="margin-top:10px"><span class="xsmall muted">First row is treated as a header if it contains “name”.</span>' +
      '<button type="button" class="btn btn--quiet btn--sm" data-action="guest:sample-csv">' + icon('download', { size: 14 }) + 'Sample CSV</button></div>';

    UI.form({
      title: 'Import guests from CSV',
      description: 'Merge a guest list you already have. Existing guests are kept.',
      size: 'wide',
      fields: [{ name: '_import', label: 'Import', type: 'static', html: body }],
      submitLabel: 'Import guests',
      onMount(form) {
        const fileInput = form.querySelector('#csv-file');
        const textarea = form.querySelector('#csv-text');
        const drop = form.querySelector('#csv-drop');
        fileInput.addEventListener('change', () => {
          const file = fileInput.files && fileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            textarea.value = String(reader.result || '');
            GG.UI.toast('File loaded', file.name + ' is ready to import.');
          };
          reader.onerror = () => GG.UI.toast('Could not read the file', 'Try pasting the CSV content instead.', 'danger');
          reader.readAsText(file);
        });
        ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e2) => { e2.preventDefault(); drop.classList.add('dropzone--over'); }));
        ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e2) => { e2.preventDefault(); drop.classList.remove('dropzone--over'); }));
        drop.addEventListener('drop', (e2) => {
          const file = e2.dataTransfer && e2.dataTransfer.files && e2.dataTransfer.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            textarea.value = String(reader.result || '');
            GG.UI.toast('File loaded', file.name + ' is ready to import.');
          };
          reader.readAsText(file);
        });
      },
      onSubmit(vals, form) {
        const raw = form.querySelector('#csv-text').value;
        if (!raw.trim()) {
          UI.toast('Nothing to import', 'Choose a file or paste CSV content first.', 'warn');
          return false;
        }
        const rows = parseCSV(raw);
        if (rows.length < 1) { UI.toast('Could not read that CSV', 'Check the file and try again.', 'danger'); return false; }
        const header = rows[0].map((h) => h.trim().toLowerCase());
        const hasHeader = header.indexOf('name') >= 0;
        const idx = (key, fallback) => (hasHeader ? header.indexOf(key) : fallback);
        const iName = idx('name', 0);
        const iEmail = idx('email', 1);
        const iGroup = idx('group', 2);
        const iRsvp = idx('rsvp', 3);
        const iMeal = idx('meal', 4);
        const iDiet = idx('dietary', 5);
        const iAccess = idx('access', 6);
        const iPlus = idx('plusones', 7);
        const body = hasHeader ? rows.slice(1) : rows;
        const valid = [];
        let skipped = 0;
        body.forEach((r) => {
          const name = (r[iName] || '').trim();
          if (!name) { skipped++; return; }
          const rsvpRaw = String(r[iRsvp] || '').trim().toLowerCase();
          const rsvp = ['yes', 'no', 'maybe', 'pending'].indexOf(rsvpRaw) >= 0 ? rsvpRaw
            : /^(attend|y|true|1)/.test(rsvpRaw) ? 'yes'
              : /^(declin|n|false|0)/.test(rsvpRaw) ? 'no' : 'pending';
          valid.push({
            name,
            email: (r[iEmail] || '').trim(),
            group: (r[iGroup] || 'Other').trim() || 'Other',
            rsvp,
            meal: (r[iMeal] || 'Not decided').trim() || 'Not decided',
            dietary: (r[iDiet] || 'No restrictions').trim() || 'No restrictions',
            access: (r[iAccess] || 'None').trim() || 'None',
            plusOnes: Math.max(0, Math.min(10, parseInt(r[iPlus], 10) || 0)),
          });
        });
        if (!valid.length) {
          UI.toast('No valid rows found', 'Every row needs a name. ' + (skipped ? skipped + ' rows were skipped.' : ''), 'danger');
          return false;
        }
        GG.Store.addGuests(valid);
        UI.toast('Import complete', valid.length + ' guests added' + (skipped ? ', ' + skipped + ' rows skipped (missing name).' : '.'), skipped ? 'warn' : 'ok');
      },
    });
  };
})();
