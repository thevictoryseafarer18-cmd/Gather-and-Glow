/* Gather & Glow — app shell, routing and event delegation. */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money, fmtDate } = GG;
  const UI = GG.UI;
  const S = () => GG.Selectors;

  const NAV = [
    { route: 'overview', label: 'Overview', icon: 'home' },
    { route: 'assistant', label: 'AI assistant', icon: 'sparkle' },
    { route: 'budget', label: 'Budget', icon: 'wallet' },
    { route: 'timeline', label: 'Timeline & tasks', icon: 'list' },
    { route: 'vendors', label: 'Vendors', icon: 'store' },
    { route: 'guests', label: 'Guests & RSVPs', icon: 'users' },
    { route: 'ideas', label: 'Ideas', icon: 'bulb' },
    { route: 'event', label: 'Event details', icon: 'pencil' },
  ];

  const TITLES = {
    overview: 'Overview',
    assistant: 'AI assistant',
    budget: 'Budget planner',
    timeline: 'Timeline & tasks',
    vendors: 'Vendor checklist',
    guests: 'Guests & RSVPs',
    ideas: 'Ideas & inspiration',
    event: 'Event details',
    setup: 'New event',
  };

  const App = { route: 'overview', shellBuilt: false, menuOpen: false };
  GG.App = App;

  function currentRoute() {
    const raw = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    if (!raw) return 'overview';
    if (raw === 'setup') return 'setup';
    return NAV.some((n) => n.route === raw) ? raw : 'overview';
  }

  /* ------------------------------------------------------------------ *
   * Shell
   * ------------------------------------------------------------------ */
  function navCounts() {
    const tasks = S().tasks();
    const vendors = S().vendors();
    const guests = S().guests();
    const ideas = S().ideas();
    return {
      overview: '',
      assistant: '',
      budget: '',
      timeline: { count: tasks.open.length, alert: tasks.overdue.length > 0, title: tasks.overdue.length + ' overdue' },
      vendors: { count: vendors.all.filter((v) => v.status !== 'booked' && v.status !== 'paid').length, alert: false },
      guests: { count: guests.rsvpPending, alert: false },
      ideas: { count: ideas.saved.length, alert: false },
      event: '',
    };
  }

  function buildShell() {
    const root = document.getElementById('app');
    root.innerHTML =
      '<a class="skip-link" href="#view">Skip to main content</a>' +
      '<div class="app">' +
      '<aside class="sidebar" id="sidebar" aria-label="Section navigation">' +
      '<div class="brand"><span class="brand__mark">' + icon('sparkle', { size: 20 }) + '</span>' +
      '<span><span class="brand__name">Gather &amp; Glow</span><br><span class="brand__tag">Celebration planner</span></span></div>' +
      '<div id="sidebar-inner"></div>' +
      '<div class="sidebar__footer" id="sidebar-footer"></div>' +
      '</aside>' +
      '<div class="scrim" id="scrim" hidden></div>' +
      '<div class="main">' +
      '<header class="topbar">' +
      '<button type="button" class="btn btn--quiet btn--icon menu-toggle" id="menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">' + icon('menu', { size: 20 }) + '</button>' +
      '<div class="topbar__title"><span class="topbar__eyebrow" id="topbar-eyebrow">Event workspace</span>' +
      '<span class="topbar__event" id="topbar-event">—</span></div>' +
      '<div class="topbar__spacer"></div>' +
      '<div class="topbar__actions" id="topbar-actions"></div>' +
      '</header>' +
      '<main class="content" id="view" tabindex="-1"></main>' +
      '</div></div>';
    App.shellBuilt = true;

    document.getElementById('menu-toggle').addEventListener('click', () => toggleMenu());
    document.getElementById('scrim').addEventListener('click', () => toggleMenu(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && App.menuOpen) toggleMenu(false);
    });
  }

  function toggleMenu(force) {
    App.menuOpen = force === undefined ? !App.menuOpen : force;
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('scrim');
    const btn = document.getElementById('menu-toggle');
    if (!sidebar) return;
    sidebar.classList.toggle('sidebar--open', App.menuOpen);
    if (scrim) scrim.hidden = !App.menuOpen;
    if (btn) btn.setAttribute('aria-expanded', String(App.menuOpen));
    if (App.menuOpen) {
      const first = sidebar.querySelector('a, button');
      if (first) first.focus();
    }
  }

  function renderSidebar() {
    const inner = document.getElementById('sidebar-inner');
    const footer = document.getElementById('sidebar-footer');
    if (!inner) return;
    const e = S().event();
    const counts = navCounts();
    const typeMeta = GG.Templates.EVENT_TYPES.find((t) => t.id === e.type) || GG.Templates.EVENT_TYPES[3];

    inner.innerHTML =
      '<div class="side-event"><div class="side-event__label">' + esc(typeMeta.label) + '</div>' +
      '<div class="side-event__name">' + esc(e.name || 'Untitled event') + '</div>' +
      '<div class="side-event__meta">' + esc(fmtDate(e.date, 'day')) + ' · ' + e.guestCount + ' guests</div></div>' +
      '<nav class="nav" aria-label="Workspace sections">' +
      '<div class="nav__label">Workspace</div>' +
      NAV.slice(0, 7).map((n) => {
        const c = counts[n.route];
        const badge = c && c.count !== undefined && c.count > 0
          ? '<span class="nav__count' + (c.alert ? ' nav__count--alert' : '') + '" title="' + esc(c.title || c.count + ' items') + '">' + c.count + '</span>' : '';
        return '<a class="nav__item" href="#/' + n.route + '"' + (App.route === n.route ? ' aria-current="page"' : '') + '>' +
          icon(n.icon, { size: 17 }) + '<span>' + esc(n.label) + '</span>' + badge + '</a>';
      }).join('') +
      '<div class="nav__label">Manage</div>' +
      NAV.slice(7).map((n) => '<a class="nav__item" href="#/' + n.route + '"' + (App.route === n.route ? ' aria-current="page"' : '') + '>' +
        icon(n.icon, { size: 17 }) + '<span>' + esc(n.label) + '</span></a>').join('') +
      '<a class="nav__item" href="#/setup">' + icon('plus', { size: 17 }) + '<span>Plan a new event</span></a>' +
      '</nav>';

    const isLive = GG.AI.mode === 'live';
    footer.innerHTML =
      '<div class="mode-card">' +
      '<div class="mode-card__title">' + icon(isLive ? 'wifi' : 'sparkle', { size: 14 }) + (isLive ? 'Live model connected' : 'Demo mode') + '</div>' +
      '<div class="mode-card__text">' + (isLive
        ? 'Assistant replies come from the server proxy. Keys stay server-side.'
        : 'Assistant replies are simulated locally. No AI service is connected.') + '</div>' +
      '<div class="sidebar__actions">' +
      '<button type="button" class="link-btn" data-action="app:ai-info">' + icon('info', { size: 14 }) + 'How AI is wired</button>' +
      '<button type="button" class="link-btn" data-action="data:reset">' + icon('refresh', { size: 14 }) + 'Reset demo data</button>' +
      '</div></div>';
  }

  function renderTopbar() {
    const e = S().event();
    const el = document.getElementById('topbar-event');
    const eyebrow = document.getElementById('topbar-eyebrow');
    const actions = document.getElementById('topbar-actions');
    if (el) el.textContent = e.name || 'Untitled event';
    if (eyebrow) eyebrow.textContent = TITLES[App.route] || 'Workspace';
    if (actions) {
      const isLive = GG.AI.mode === 'live';
      actions.innerHTML =
        '<span class="demo-pill' + (isLive ? ' demo-pill--live' : '') + '" title="' + esc(GG.AI.statusLabel()) + '">' +
        icon(isLive ? 'wifi' : 'sparkle', { size: 12 }) + (isLive ? 'Live AI' : 'Demo mode') + '</span>' +
        (GG.Store.state.seeded ? '<span class="badge badge--gold nowrap">Sample data</span>' : '') +
        '<a class="btn btn--ghost btn--sm" href="#/overview" aria-label="Back to event overview" title="Back to event overview">' + icon('home', { size: 15 }) + '<span class="nowrap" aria-hidden="true">Overview</span></a>';
    }
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */
  function captureFocus() {
    const a = document.activeElement;
    if (!a || !a.dataset || !a.dataset.focusKey) return null;
    return { key: a.dataset.focusKey, start: a.selectionStart, end: a.selectionEnd };
  }

  function restoreFocus(state) {
    if (!state) return;
    const el = document.querySelector('[data-focus-key="' + state.key + '"]');
    if (!el) return;
    el.focus();
    if (state.start !== null && state.start !== undefined && el.setSelectionRange) {
      try { el.setSelectionRange(state.start, state.end); } catch (err) { /* not a text input */ }
    }
  }

  App.render = function () {
    App.route = currentRoute();
    const focus = captureFocus();
    const root = document.getElementById('app');

    if (App.route === 'setup') {
      App.shellBuilt = false;
      root.innerHTML = GG.Views.setup.render();
      restoreFocus(focus);
      return;
    }

    if (!App.shellBuilt) buildShell();
    renderSidebar();
    renderTopbar();

    const view = document.getElementById('view');
    const renderer = GG.Views[App.route] && GG.Views[App.route].render;
    view.innerHTML = renderer ? renderer() : '<div class="alert alert--danger">Section not found.</div>';

    if (App.route !== 'overview') window.scrollTo({ top: 0, behavior: 'auto' });
    restoreFocus(focus);
    const after = GG.Views[App.route] && GG.Views[App.route].afterRender;
    if (after) after();
  };

  /* ------------------------------------------------------------------ *
   * Global delegation
   * ------------------------------------------------------------------ */
  function run(action, el, ev) {
    const fn = GG.Actions && GG.Actions[action];
    if (!fn) {
      console.warn('No action registered for', action);
      return;
    }
    try {
      fn(el, ev);
    } catch (err) {
      console.error('Action failed:', action, err);
      UI.toast('Something went wrong', err.message || 'Please try again.', 'danger');
    }
  }

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    if (el.tagName === 'FORM') return;
    if (el.hasAttribute('disabled')) return;
    ev.preventDefault();
    if (el.closest('.nav__item') || el.classList.contains('nav__item')) toggleMenu(false);
    run(el.dataset.action, el, ev);
  });

  document.addEventListener('submit', (ev) => {
    const form = ev.target.closest('[data-action]');
    if (!form) return;
    ev.preventDefault();
    run(form.dataset.action, form, ev);
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-change]');
    if (!el) return;
    run(el.dataset.change, el, ev);
  });

  const debounced = {};
  document.addEventListener('input', (ev) => {
    const el = ev.target.closest('[data-input]');
    if (!el) return;
    const action = el.dataset.input;
    if (action === 'ai:draft') { run(action, el, ev); return; }
    debounced[action] = debounced[action] || GG.debounce(() => run(action, el, ev), 220);
    debounced[action]();
  });

  document.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if (t && t.id === 'chat-input' && ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      const form = t.closest('form');
      if (form) run('ai:send', form, ev);
    }
    if (t && t.closest('.nav__item') && ev.key === 'Enter' && App.menuOpen) toggleMenu(false);
  });

  /* clicking a nav link on mobile should close the drawer */
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('.nav__item') && App.menuOpen) toggleMenu(false);
  });

  ACTIONS_INFO();
  function ACTIONS_INFO() {
    GG.Actions['app:ai-info'] = () => {
      const isLive = GG.AI.mode === 'live';
      UI.info({
        title: isLive ? 'AI is connected' : 'How the AI layer works',
        description: 'Gather & Glow is built so a real model can be dropped in without touching the UI.',
        body:
          '<div class="stack">' +
          '<div class="alert ' + (isLive ? 'alert--ok' : 'alert--demo') + '">' + icon('info', { size: 18 }) +
          '<div><strong>' + (isLive ? 'Live model connected through the server proxy.' : 'Currently in demo mode — responses are simulated.') + '</strong> ' +
          (isLive ? 'The browser calls a relative endpoint; the provider key lives only in the server environment.' : 'No network request is made for assistant replies. A deterministic planning engine generates them from your event data.') +
          '</div></div>' +
          '<div><h3 style="font-size:0.95rem;margin-bottom:6px">Where a real service plugs in</h3>' +
          '<p class="small muted"><code>js/ai.js</code> talks to one endpoint: <code>POST /api/ai</code> (plus <code>GET /api/ai/health</code> to detect whether a key is configured). Implement that route in <code>server.js</code> and set <code>AI_PROVIDER_KEY</code> in the server environment. Nothing in the interface changes.</p></div>' +
          '<div><h3 style="font-size:0.95rem;margin-bottom:6px">What is sent</h3>' +
          '<p class="small muted">Only the conversation text and a compact JSON summary of your event (date, guest count, budget totals, task and vendor status). No API key is ever exposed to browser code, and guest email addresses are not included.</p></div>' +
          '<div><h3 style="font-size:0.95rem;margin-bottom:6px">Force demo mode</h3>' +
          '<p class="small muted">Set <code>AI_MODE: \'demo\'</code> in <code>js/config.js</code> to keep the deterministic engine even when a key exists.</p></div>' +
          '</div>',
        footerLabel: 'Close',
      });
    };
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function boot() {
    GG.Store.load();
    GG.Store.subscribe(() => App.render());
    window.addEventListener('hashchange', () => {
      if (currentRoute() === 'setup') GG.SetupState && GG.SetupState.values && null;
      App.render();
    });
    App.render();
    GG.AI.probe().then(() => {
      renderSidebar();
      renderTopbar();
      if (location.hash.indexOf('assistant') >= 0) App.render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
