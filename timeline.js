/* Gather & Glow — Timeline & tasks */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, fmtDate, daysUntil, parseISO, toISO, addDays } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  const filters = { search: '', status: 'open', priority: 'all', sort: 'due' };
  GG.TimelineFilters = filters;

  const CATEGORY_LABELS = {
    venue: 'Venue', food: 'Food', decor: 'Décor', photography: 'Photography', entertainment: 'Entertainment',
    attire: 'Attire', transport: 'Transport', stationery: 'Stationery', favors: 'Favors',
    guests: 'Guests', budget: 'Budget', logistics: 'Logistics',
  };

  function matches(task) {
    const f = filters;
    if (f.status === 'open' && task.status === 'done') return false;
    if (f.status === 'done' && task.status !== 'done') return false;
    if (f.status === 'overdue' && !(task.status !== 'done' && task.due && daysUntil(task.due) < 0)) return false;
    if (f.status === 'week' && !(task.status !== 'done' && task.due && daysUntil(task.due) >= 0 && daysUntil(task.due) <= 7)) return false;
    if (f.priority !== 'all' && task.priority !== f.priority) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = [task.title, task.notes, task.category, CATEGORY_LABELS[task.category] || ''].join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  function taskRow(task) {
    const done = task.status === 'done';
    const due = task.due ? GG.relativeDue(task.due) : null;
    const overdue = !done && due && due.tone === 'danger';
    return '<div class="list__item' + (overdue ? ' list__item--overdue' : '') + '">' +
      '<button type="button" class="task-check" role="checkbox" aria-checked="' + (done ? 'true' : 'false') + '" ' +
      'aria-label="Mark “' + esc(task.title) + '” as ' + (done ? 'not done' : 'done') + '" data-action="task:toggle" data-id="' + task.id + '">' +
      icon('check', { size: 14 }) + '</button>' +
      '<div class="task-main">' +
      '<div class="task-title' + (done ? ' task-title--done' : '') + '">' + esc(task.title) + '</div>' +
      '<div class="task-meta">' +
      (task.due ? '<span class="badge ' + (overdue ? 'badge--danger' : due.tone === 'warn' ? 'badge--warn' : 'badge--outline') + '">' +
        icon(overdue ? 'alert' : 'calendar', { size: 12 }) + esc(fmtDate(task.due, 'day')) + (done ? '' : ' · ' + esc(due.label)) + '</span>' : '<span class="badge badge--outline">No date</span>') +
      UI.priorityBadge(task.priority) +
      '<span class="xsmall">' + esc(CATEGORY_LABELS[task.category] || task.category) + '</span>' +
      (task.source === 'ai' ? '<span class="badge badge--plum">' + icon('sparkle', { size: 11 }) + 'From assistant</span>' : '') +
      (task.notes ? '<span class="xsmall muted">' + esc(task.notes) + '</span>' : '') +
      '</div></div>' +
      '<div class="task-actions">' +
      '<button type="button" class="btn btn--quiet btn--icon" data-action="task:edit" data-id="' + task.id + '" aria-label="Edit ' + esc(task.title) + '">' + icon('pencil', { size: 15 }) + '</button>' +
      '<button type="button" class="btn btn--quiet btn--icon" data-action="task:delete" data-id="' + task.id + '" aria-label="Delete ' + esc(task.title) + '">' + icon('trash', { size: 15 }) + '</button>' +
      '</div></div>';
  }

  function group(title, tasks, tone) {
    if (!tasks.length) return '';
    return '<div class="group-head"><h3' + (tone === 'danger' ? ' style="color:#8a2f26"' : '') + '>' + esc(title) + '</h3>' +
      '<span class="group-head__line"></span><span class="group-head__count">' + tasks.length + '</span></div>' +
      '<div class="list">' + tasks.map(taskRow).join('') + '</div>';
  }

  function sorted(list) {
    const arr = list.slice();
    if (filters.sort === 'priority') {
      const rank = { high: 0, medium: 1, low: 2 };
      arr.sort((a, b) => {
        const diff = (rank[a.priority] || 1) - (rank[b.priority] || 1);
        if (diff) return diff;
        return (a.due || '9999') < (b.due || '9999') ? -1 : 1;
      });
    } else if (filters.sort === 'title') {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      arr.sort((a, b) => {
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
      });
    }
    return arr;
  }

  GG.Views = GG.Views || {};
  GG.Views.timeline = {
    render() {
      const tasks = S().tasks();
      const typeLabel = (T.EVENT_TYPES.find((t) => t.id === S().event().type) || {}).label || 'event';
      const visible = tasks.all.filter(matches);
      const v = (pred) => sorted(visible.filter(pred));

      const overdue = v((t) => t.status !== 'done' && t.due && daysUntil(t.due) < 0);
      const week = v((t) => t.status !== 'done' && t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 7);
      const month = v((t) => t.status !== 'done' && t.due && daysUntil(t.due) > 7 && daysUntil(t.due) <= 30);
      const later = v((t) => t.status !== 'done' && (!t.due || daysUntil(t.due) > 30));
      const doneList = v((t) => t.status === 'done');
      const noDate = v((t) => t.status !== 'done' && !t.due);

      const segBtn = (value, label, count, current, action) =>
        '<button type="button" data-action="' + action + '" data-value="' + value + '" aria-pressed="' + (current === value) + '">' +
        esc(label) + (count !== undefined ? ' <span class="xsmall">(' + count + ')</span>' : '') + '</button>';

      const activeFilterCount = (filters.priority !== 'all' ? 1 : 0) + (filters.search ? 1 : 0) + (filters.status !== 'open' ? 1 : 0);

      const templatesCard = (() => {
        const types = ['wedding', 'birthday', 'community'];
        return '<section class="card" aria-labelledby="templates-title" style="margin-top:20px">' +
          '<div class="card__head"><div><h2 id="templates-title">Planning templates</h2>' +
          '<div class="card__sub">Ready-made checklists based on your event date. Only missing tasks are added.</div></div></div>' +
          '<div class="stack stack--tight">' +
          types.map((type) => {
            const meta = T.EVENT_TYPES.find((t) => t.id === type);
            const tpl = T.TASK_TEMPLATES[type];
            const current = S().event().type === type;
            return '<div class="suggest-cat" style="border-style:solid;background:' + (current ? 'var(--forest-soft)' : 'var(--paper-2)') + '">' +
              '<span class="cat-row__icon" style="color:var(--forest)">' + icon(meta.icon, { size: 16 }) + '</span>' +
              '<div style="flex:1"><strong>' + esc(meta.label) + ' template</strong>' + (current ? ' <span class="badge badge--ok">Your event type</span>' : '') +
              '<div class="xsmall muted">' + tpl.length + ' tasks, from ' + Math.max.apply(null, tpl.map((t) => t.offset)) + ' days out to the event day</div></div>' +
              '<button type="button" class="btn btn--ghost btn--sm" data-action="tasks:generate" data-type="' + type + '">Add missing tasks</button>' +
              '</div>';
          }).join('') +
          '</div></section>';
      })();

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">Schedule</div>' +
        '<h1>Timeline &amp; tasks</h1>' +
        '<p class="lede">Everything to do, ordered by when it matters. Generate a timeline from your date, then adapt it.</p></div>' +
        '<div class="view-head__actions">' +
        '<button type="button" class="btn btn--ghost" data-action="tasks:generate" data-type="' + esc(S().event().type) + '">' + icon('sparkle', { size: 16 }) + 'Generate timeline</button>' +
        '<button type="button" class="btn" data-action="task:add">' + icon('plus', { size: 16 }) + 'Add task</button>' +
        '</div></div>' +

        '<section class="card" style="margin-bottom:18px" aria-label="Task progress">' +
        '<div class="grid grid--4" style="gap:14px">' +
        '<div><div class="stat__label">' + icon('list', { size: 13 }) + 'Tasks complete</div>' +
        '<div class="stat__value" style="font-size:1.5rem">' + tasks.done.length + ' / ' + tasks.total + '</div>' +
        UI.progress(tasks.pct, 'ok', 'Tasks complete') + '</div>' +
        '<div><div class="stat__label">' + icon('clock', { size: 13 }) + 'Overdue</div>' +
        '<div class="stat__value ' + (tasks.overdue.length ? 'stat--danger' : '') + '" style="font-size:1.5rem">' + tasks.overdue.length + '</div>' +
        '<div class="xsmall muted">' + (tasks.overdue.length ? 'Address these first' : 'Nothing overdue') + '</div></div>' +
        '<div><div class="stat__label">' + icon('calendar', { size: 13 }) + 'Next 14 days</div>' +
        '<div class="stat__value" style="font-size:1.5rem">' + tasks.dueSoon.length + '</div>' +
        '<div class="xsmall muted">Due soon</div></div>' +
        '<div><div class="stat__label">' + icon('sparkle', { size: 13 }) + 'From the assistant</div>' +
        '<div class="stat__value" style="font-size:1.5rem">' + tasks.all.filter((t) => t.source === 'ai').length + '</div>' +
        '<div class="xsmall muted">AI suggestions you kept</div></div>' +
        '</div></section>' +

        '<section class="card" aria-labelledby="tasks-title">' +
        '<div class="card__head"><div><h2 id="tasks-title">Tasks</h2>' +
        '<div class="card__sub">' + (filters.search ? 'Filtered by “' + esc(filters.search) + '”' : visible.length + ' matching your filters') + '</div></div>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-action="tasks:clear-completed">' + icon('trash', { size: 14 }) + 'Clear completed</button></div>' +

        '<div class="filters">' +
        '<div class="filters__row">' +
        '<div class="field"><label for="task-search" class="sr-only">Search tasks</label>' +
        '<div class="search-wrap">' + icon('search', { size: 16 }) +
        '<input class="input" id="task-search" type="search" placeholder="Search tasks, notes, categories…" value="' + esc(filters.search) + '" data-input="task:search" data-focus-key="task-search">' +
        '</div></div>' +
        (activeFilterCount ? '<button type="button" class="btn btn--quiet btn--sm" data-action="task:reset">' + icon('x', { size: 14 }) + 'Reset filters</button>' : '') +
        '</div>' +
        '<div class="filters__row">' +
        '<div class="segmented" role="group" aria-label="Filter by status">' +
        segBtn('all', 'All', tasks.total, filters.status, 'task:status') +
        segBtn('open', 'Open', tasks.open.length, filters.status, 'task:status') +
        segBtn('overdue', 'Overdue', tasks.overdue.length, filters.status, 'task:status') +
        segBtn('week', 'This week', undefined, filters.status, 'task:status') +
        segBtn('done', 'Done', tasks.done.length, filters.status, 'task:status') +
        '</div>' +
        '<div class="field"><label for="task-priority" class="xsmall">Priority</label>' +
        '<select class="select" id="task-priority" data-change="task:priority" data-focus-key="task-priority">' +
        ['all', 'high', 'medium', 'low'].map((p) => '<option value="' + p + '"' + (filters.priority === p ? ' selected' : '') + '>' + (p === 'all' ? 'All priorities' : p.charAt(0).toUpperCase() + p.slice(1)) + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label for="task-sort" class="xsmall">Sort by</label>' +
        '<select class="select" id="task-sort" data-change="task:sort" data-focus-key="task-sort">' +
        [['due', 'Due date'], ['priority', 'Priority'], ['title', 'Title A–Z']].map(([v2, l]) => '<option value="' + v2 + '"' + (filters.sort === v2 ? ' selected' : '') + '>' + l + '</option>').join('') +
        '</select></div>' +
        '</div></div>' +

        (visible.length
          ? (group('Overdue', overdue, 'danger') + group('Next 7 days', week) + group('Next 30 days', month) +
            group('Later', later.filter((t) => t.due)) + group('No date', noDate) + group('Completed', doneList))
          : UI.empty({
            iconName: filters.status === 'done' ? 'check' : 'list',
            title: tasks.total ? 'No tasks match these filters' : 'No tasks yet',
            message: tasks.total ? 'Try a different status, priority or search term.' : 'Generate a timeline from your event date, or add your first task.',
            action: tasks.total
              ? '<button class="btn btn--ghost btn--sm" data-action="task:reset">Reset filters</button>'
              : '<button class="btn btn--sm" data-action="tasks:generate" data-type="' + esc(S().event().type) + '">Generate timeline</button>',
          })) +
        '</section>' + templatesCard +
        '<p class="xsmall muted" style="margin-top:16px">Planning tasks are suggestions from Gather &amp; Glow templates — adjust any dates to match your venue and vendor availability.</p>';
    },
  };

  /* ------------------------------------------------------------------ */
  function taskForm(task) {
    const isEdit = !!task;
    UI.form({
      title: isEdit ? 'Edit task' : 'Add task',
      description: isEdit ? 'Update the details or move the due date.' : 'A clear task with a due date is easier to finish.',
      columns: 2,
      values: task || { title: '', due: toISO(addDays(GG.today(), 7)), priority: 'medium', category: 'logistics', notes: '' },
      fields: [
        { name: 'title', label: 'Task', type: 'text', required: true, placeholder: 'e.g. Confirm final plate count with caterer' },
        { name: 'due', label: 'Due date', type: 'date', required: true, col: 1, validate: (v) => (!parseISO(v) ? 'Enter a valid date.' : null) },
        { name: 'priority', label: 'Priority', type: 'select', col: 1, options: [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
        { name: 'category', label: 'Category', type: 'select', col: 1, options: Object.keys(CATEGORY_LABELS).map((k) => ({ value: k, label: CATEGORY_LABELS[k] })) },
        { name: 'status', label: 'Status', type: 'select', col: 1, options: [{ value: 'todo', label: 'Not started' }, { value: 'done', label: 'Complete' }] },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, placeholder: 'Who to ask, what “done” looks like…' },
      ],
      submitLabel: isEdit ? 'Save task' : 'Add task',
      onSubmit(vals) {
        if (isEdit) {
          GG.Store.updateTask(task.id, vals);
          UI.toast('Task updated', vals.title);
        } else {
          GG.Store.addTask(Object.assign({ source: 'manual' }, vals));
          UI.toast('Task added', 'Due ' + fmtDate(vals.due, 'day') + '.');
        }
      },
    });
  }

  ACTIONS['task:add'] = () => taskForm(null);
  ACTIONS['task:edit'] = (el) => {
    const task = GG.Store.state.tasks.find((t) => t.id === el.dataset.id);
    if (task) taskForm(task);
  };
  ACTIONS['task:toggle'] = (el) => {
    const task = GG.Store.toggleTask(el.dataset.id);
    if (task && task.status === 'done') UI.toast('Task complete', '“' + task.title + '” marked done.');
  };
  ACTIONS['task:delete'] = async (el) => {
    const task = GG.Store.state.tasks.find((t) => t.id === el.dataset.id);
    if (!task) return;
    const ok = await UI.confirm({ title: 'Delete this task?', message: '“' + task.title + '” will be removed from your timeline.', confirmLabel: 'Delete task', danger: true });
    if (!ok) return;
    GG.Store.removeTask(task.id);
    UI.toast('Task deleted', 'You can regenerate it from a template at any time.', 'ok');
  };
  ACTIONS['task:status'] = (el) => { filters.status = el.dataset.value; GG.App.render(); };
  ACTIONS['task:priority'] = (el) => { filters.priority = el.value; GG.App.render(); };
  ACTIONS['task:sort'] = (el) => { filters.sort = el.value; GG.App.render(); };
  ACTIONS['task:search'] = (el) => { filters.search = el.value; GG.App.render(); };
  ACTIONS['task:reset'] = () => { Object.assign(filters, { search: '', status: 'open', priority: 'all', sort: 'due' }); GG.App.render(); };

  ACTIONS['tasks:generate'] = async (el) => {
    const type = el.dataset.type || GG.Store.state.event.type;
    const eventDate = GG.Store.state.event.date;
    const base = parseISO(eventDate) || GG.today();
    const tpl = T.TASK_TEMPLATES[type] || T.TASK_TEMPLATES.other;
    const existing = GG.Store.state.tasks.map((t) => t.title.toLowerCase());
    const missing = tpl.filter((t) => existing.indexOf(t.title.toLowerCase()) < 0);
    const meta = T.EVENT_TYPES.find((t) => t.id === type);

    if (!missing.length) {
      UI.toast('Already up to date', 'Every ' + (meta ? meta.label.toLowerCase() : '') + ' template task is already on your timeline.', 'warn');
      return;
    }
    const ok = await UI.confirm({
      title: 'Add ' + missing.length + ' template tasks?',
      message: 'Based on your event on ' + fmtDate(eventDate) + '. Tasks whose ideal date has passed will be scheduled for the next few days.',
      confirmLabel: 'Add tasks',
      danger: false,
      extra: 'Template dates assume a ' + (meta ? meta.label.toLowerCase() : 'similar event') + ' timeline. Adjust any task that does not suit your vendors.',
    });
    if (!ok) return;
    const items = missing.map((t) => {
      let due = addDays(base, -t.offset);
      if (daysUntil(toISO(due)) < 0) {
        due = addDays(GG.today(), t.offset > 60 ? 5 : t.offset > 20 ? 3 : 1);
      }
      return { title: t.title, category: t.category, priority: t.priority, due: toISO(due), status: 'todo', source: 'template', notes: '' };
    });
    GG.Store.addTasks(items, 'tasks:template');
    UI.toast('Timeline generated', items.length + ' tasks added from the ' + (meta ? meta.label.toLowerCase() : '') + ' template.');
  };

  ACTIONS['tasks:clear-completed'] = async () => {
    const done = GG.Store.state.tasks.filter((t) => t.status === 'done');
    if (!done.length) { UI.toast('Nothing to clear', 'You have no completed tasks yet.', 'warn'); return; }
    const ok = await UI.confirm({
      title: 'Clear ' + done.length + ' completed task' + (done.length === 1 ? '' : 's') + '?',
      message: 'These will be removed from your timeline. Your progress percentage will recalculate.',
      confirmLabel: 'Clear completed',
      danger: true,
    });
    if (!ok) return;
    GG.Store.state.tasks = GG.Store.state.tasks.filter((t) => t.status !== 'done');
    GG.Store.save();
    GG.Store.emit('tasks:clear-completed');
    UI.toast('Completed tasks cleared', done.length + ' removed.', 'ok');
  };
})();
