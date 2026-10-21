/* Gather & Glow — AI planning assistant */
(function () {
  'use strict';
  const GG = window.GG;
  const { esc, icon, money, mdLite } = GG;
  const UI = GG.UI;
  const T = GG.Templates;
  const S = () => GG.Selectors;
  const ACTIONS = (GG.Actions = GG.Actions || {});

  const state = { busy: false, error: null, draft: '', lastPrompt: '' };
  GG.AssistantState = state;

  const QUICK_PROMPTS = [
    { label: 'Create my planning timeline', prompt: 'Create my planning timeline' },
    { label: 'Suggest a theme', prompt: 'Suggest a theme that fits my event' },
    { label: 'Help me stay under budget', prompt: 'Help me stay under budget' },
    { label: 'What am I forgetting?', prompt: 'What am I forgetting?' },
    { label: 'Plan the food and dietary needs', prompt: 'Help me plan food, dietary needs and plate counts' },
    { label: 'Guest experience checklist', prompt: 'What should I do for a better guest experience?' },
  ];

  function scrollLog() {
    const log = document.getElementById('chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }

  /* keep the newest exchange in view after a re-render */
  function scrollChatIntoView() {
    if (!GG.Store.state.chat.length) return;
    requestAnimationFrame(() => {
      const log = document.getElementById('chat-log');
      if (log) log.scrollTop = log.scrollHeight;
    });
  }

  function messageHTML(msg, ctx, cur) {
    if (msg.role === 'user') {
      return '<div class="msg msg--user"><div class="msg__avatar" aria-hidden="true">You</div>' +
        '<div class="msg__bubble"><div>' + esc(msg.text).replace(/\n/g, '<br>') + '</div>' +
        '<div class="msg__foot"><span>' + esc(msg.time || '') + '</span></div></div></div>';
    }
    const applied = msg.applied || [];
    const suggestions = (msg.suggestions || []).map((s, idx) => {
      const isApplied = applied.indexOf(idx) >= 0;
      const action = s.kind === 'budget' ? 'ai:apply-budget' : 'ai:apply-tasks';
      return '<button type="button" class="btn btn--ghost btn--sm" data-action="' + action + '" data-msg="' + msg.id + '" data-idx="' + idx + '"' +
        (isApplied ? ' disabled aria-disabled="true"' : '') + '>' +
        icon(isApplied ? 'check' : 'plus', { size: 14 }) +
        (isApplied ? 'Added to ' + (s.kind === 'budget' ? 'budget' : 'timeline') : esc(s.label || 'Add to plan')) + '</button>';
    }).join('');
    return '<div class="msg msg--ai"><div class="msg__avatar" aria-hidden="true">' + icon('sparkle', { size: 15 }) + '</div>' +
      '<div class="msg__bubble"><div class="ai-summary__body">' + mdLite(msg.text) + '</div>' +
      (suggestions ? '<div class="msg__actions">' + suggestions + '</div>' : '') +
      '<div class="msg__foot">' +
      '<span>' + esc(msg.time || '') + '</span>' +
      (msg.source === 'live'
        ? '<span class="demo-pill demo-pill--live">' + icon('wifi', { size: 11 }) + 'Live model</span>'
        : '<span class="demo-pill">' + icon('sparkle', { size: 11 }) + 'Demo mode · simulated</span>') +
      (msg.switchedToDemo ? '<button type="button" class="btn btn--quiet btn--sm" data-action="ai:retry-live" data-msg="' + msg.id + '">' + icon('refresh', { size: 13 }) + 'Try the live model again</button>' : '') +
      '</div></div></div>';
  }

  function emptyState() {
    return '<div class="empty" style="border-style:solid">' +
      '<div class="empty__icon">' + icon('sparkle', { size: 24 }) + '</div>' +
      '<h3>Ask me anything about your ' + esc(S().event().type) + '</h3>' +
      '<p>I can see your date, guest count, budget, tasks and vendors. Try one of the prompts below, or ask in your own words.</p>' +
      '<div class="chip-set" style="justify-content:center">' +
      QUICK_PROMPTS.slice(0, 4).map((q) => '<button type="button" class="chip" data-action="ai:prompt" data-prompt="' + esc(q.prompt) + '">' + esc(q.label) + '</button>').join('') +
      '</div></div>';
  }

  GG.Views = GG.Views || {};
  GG.Views.assistant = {
    afterRender: scrollChatIntoView,
    render() {
      const ctx = S().aiContext();
      const cur = S().currency();
      const chat = GG.Store.state.chat;
      const isLive = GG.AI.mode === 'live';
      const b = ctx.budget;
      const guests = ctx.guests;

      const contextList = [
        '<strong>' + esc(ctx.event.name) + '</strong> · ' + esc((T.EVENT_TYPES.find((t) => t.id === ctx.event.type) || {}).label || '') ,
        esc(GG.fmtDate(ctx.event.date, 'long')) + ' · ' + (ctx.event.daysUntil >= 0 ? ctx.event.daysUntil + ' days away' : 'date has passed'),
        ctx.event.guestCount + ' guests' + (ctx.event.location ? ' · ' + esc(ctx.event.location) : ''),
        'Budget ' + esc(money(b.total, cur)) + ' · ' + esc(money(b.planned, cur)) + ' planned · ' + esc(money(b.actual, cur)) + ' spent',
        b.remaining >= 0 ? esc(money(b.remaining, cur)) + ' unallocated' : esc(money(Math.abs(b.remaining), cur)) + ' over budget',
        ctx.tasks.open + ' open tasks · ' + ctx.tasks.overdue.length + ' overdue',
        ctx.vendors.length + ' vendors · ' + ctx.vendors.filter((v) => v.status === 'booked' || v.status === 'paid').length + ' secured',
        guests.total + ' guests on the list · ' + guests.pending + ' seats awaiting reply',
      ].map((line) => '<li>' + line + '</li>').join('');

      return '' +
        '<div class="view-head"><div><div class="view-head__eyebrow">Assistant</div>' +
        '<h1>AI planning assistant</h1>' +
        '<p class="lede">Grounded in your own event details. Every suggestion can become a task or a budget line.</p></div>' +
        '<div class="view-head__actions">' +
        '<button type="button" class="btn btn--ghost" data-action="ai:clear">' + icon('trash', { size: 16 }) + 'Clear conversation</button>' +
        '</div></div>' +

        (isLive
          ? '<div class="alert alert--ok" style="margin-bottom:16px">' + icon('wifi', { size: 18 }) + '<div><strong>Live model connected.</strong> Replies come from the server proxy; your API key stays on the server and is never sent to the browser.</div></div>'
          : '<div class="alert alert--demo" style="margin-bottom:16px">' + icon('info', { size: 18 }) + '<div><strong>Demo mode — simulated responses.</strong> No AI service is connected in this prototype. Answers are generated locally from your event data by a deterministic planning engine, so they stay specific to your dates, budget and guests. Connect a model through the server proxy to switch this on for real — see README.md.</div></div>') +

        '<div class="chat-layout">' +
        '<section class="card chat-card" aria-labelledby="chat-title">' +
        '<div class="chat-head">' +
        '<span class="chat-head__avatar" aria-hidden="true">' + icon('sparkle', { size: 19 }) + '</span>' +
        '<div style="flex:1;min-width:0"><h2 id="chat-title" style="font-size:1.05rem">Gather &amp; Glow assistant</h2>' +
        '<div class="xsmall muted">' + (state.busy ? 'Thinking…' : (isLive ? 'Live model via secure proxy' : 'Demo engine · replies are simulated')) + '</div></div>' +
        '<span class="demo-pill' + (isLive ? ' demo-pill--live' : '') + '">' + icon(isLive ? 'wifi' : 'sparkle', { size: 12 }) + (isLive ? 'Live' : 'Demo mode') + '</span>' +
        '</div>' +

        '<div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0">' +
        (chat.length ? chat.map((m) => messageHTML(m, ctx, cur)).join('') : emptyState()) +
        (state.busy ? '<div class="msg msg--ai"><div class="msg__avatar" aria-hidden="true">' + icon('sparkle', { size: 15 }) + '</div>' +
          '<div class="msg__bubble"><span class="typing" aria-label="Assistant is writing a reply"><span></span><span></span><span></span></span></div></div>' : '') +
        (state.error ? '<div class="alert alert--danger">' + icon('alert', { size: 18 }) + '<div><strong>That did not work.</strong> ' + esc(state.error) +
          '<div class="btn-row" style="margin-top:8px"><button type="button" class="btn btn--ghost btn--sm" data-action="ai:retry">Try again</button>' +
          '<button type="button" class="btn btn--quiet btn--sm" data-action="ai:clear">Clear conversation</button></div></div></div>' : '') +
        '</div>' +

        '<div class="chat-quick" role="group" aria-label="Suggested prompts">' +
        QUICK_PROMPTS.map((q) => '<button type="button" class="chip" data-action="ai:prompt" data-prompt="' + esc(q.prompt) + '">' + esc(q.label) + '</button>').join('') +
        '</div>' +

        '<div class="chat-compose">' +
        '<form class="chat-compose__form" data-action="ai:send">' +
        '<div style="flex:1"><label class="sr-only" for="chat-input">Message the planning assistant</label>' +
        '<textarea class="textarea" id="chat-input" name="prompt" rows="1" placeholder="Ask about your timeline, budget, vendors or guests…"' +
        (state.busy ? ' disabled' : '') + ' data-input="ai:draft" data-focus-key="chat-input">' + esc(state.draft) + '</textarea></div>' +
        '<button type="submit" class="btn btn--plum" ' + (state.busy ? 'disabled aria-disabled="true"' : '') + '>' +
        icon('send', { size: 16 }) + '<span class="sr-only">Send message</span><span aria-hidden="true">Send</span></button>' +
        '</form>' +
        '<div class="chat-compose__hint">' + icon('lock', { size: 12 }) +
        'Your event data stays in this browser. ' + (isLive ? 'Only the message and a compact event summary are sent to the proxy.' : 'Demo mode makes no network requests.') +
        ' Enter to send, Shift + Enter for a new line.</div>' +
        '</div></section>' +

        '<aside class="chat-aside stack">' +
        '<div class="card aside-card"><h3>What I can see</h3>' +
        '<ul>' + contextList + '</ul>' +
        '<p class="xsmall muted" style="margin-top:10px">Responses are tailored to these figures. Update your event and they change.</p></div>' +

        '<div class="card aside-card"><h3>What I am good at</h3>' +
        '<ul>' +
        '<li>Turning your date into a working timeline</li>' +
        '<li>Finding where the budget is drifting</li>' +
        '<li>Naming the things people usually forget</li>' +
        '<li>Making ideas fit your guest count and city</li>' +
        '</ul>' +
        '<p class="xsmall muted" style="margin-top:10px">I do not book vendors, take payments or verify quotes.</p></div>' +

        '<div class="card card--tint aside-card"><h3>' + (isLive ? 'About this connection' : 'About demo mode') + '</h3>' +
        (isLive
          ? '<p class="small">Replies are generated by the model behind the server proxy. The browser never sees an API key, and the endpoint can be rate-limited or logged server-side.</p>'
          : '<p class="small">This prototype runs a local planning engine so every flow works without a key. To connect a real model, implement <code>POST /api/ai</code> in <code>server.js</code> — the UI needs no changes.</p>') +
        '<p class="xsmall muted" style="margin-top:8px">Never put an API key in browser code.</p></div>' +
        '</aside></div>';
    },
  };

  /* ------------------------------------------------------------------ */
  async function send(prompt) {
    const text = String(prompt || '').trim();
    if (!text || state.busy) return;
    state.draft = '';
    state.error = null;
    state.lastPrompt = text;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    GG.Store.pushChat({ id: GG.uid('msg'), role: 'user', text, time, source: 'user', suggestions: [] });
    state.busy = true;
    GG.App.render();
    scrollLog();

    try {
      const ctx = S().aiContext();
      const history = GG.Store.state.chat.slice(-8).map((m) => ({ role: m.role, text: m.text }));
      const res = await GG.AI.ask({ prompt: text, history, ctx });
      GG.Store.pushChat({
        id: GG.uid('msg'),
        role: 'assistant',
        text: res.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: res.source,
        suggestions: res.suggestions || [],
        applied: [],
        intent: res.intent || null,
        switchedToDemo: !!res.switchedToDemo,
      });
      if (res.switchedToDemo) {
        UI.toast('Switched to demo mode', 'The assistant service was unavailable, so replies are now simulated.', 'warn');
      }
    } catch (err) {
      console.error(err);
      state.error = err && err.message ? err.message : 'Unexpected error while generating a reply.';
      UI.toast('Assistant error', state.error, 'danger');
      GG.App.render();
    } finally {
      state.busy = false;
      GG.App.render();
      scrollLog();
      const input = document.getElementById('chat-input');
      if (input) input.focus();
    }
  }

  ACTIONS['ai:prompt'] = (el) => send(el.dataset.prompt);
  ACTIONS['ai:retry'] = () => send(state.lastPrompt || 'What should I focus on next?');
  ACTIONS['ai:retry-live'] = async (el) => {
    const btn = el;
    btn.disabled = true;
    GG.AI.probed = false;
    await GG.AI.probe();
    if (GG.AI.mode !== 'live') {
      GG.UI.toast('Still no live service', 'The proxy has no working model key, so replies stay simulated.', 'warn');
      btn.disabled = false;
      GG.App.render();
      return;
    }
    send(state.lastPrompt || 'What should I focus on next?');
  };
  ACTIONS['ai:send'] = (el) => {
    const form = el.closest('form') || el;
    const input = form.querySelector('#chat-input');
    send(input ? input.value : state.draft);
  };
  ACTIONS['ai:draft'] = (el) => { state.draft = el.value; };

  ACTIONS['ai:clear'] = async () => {
    if (!GG.Store.state.chat.length) { UI.toast('Nothing to clear', 'Your conversation is already empty.', 'warn'); return; }
    const ok = await UI.confirm({
      title: 'Clear this conversation?',
      message: 'All messages with the assistant will be removed. Tasks and budget items you already added are kept.',
      confirmLabel: 'Clear conversation',
      danger: true,
    });
    if (!ok) return;
    GG.Store.clearChat();
    state.error = null;
    UI.toast('Conversation cleared', 'You are starting with a clean slate.', 'ok');
  };

  function applySuggestion(msgId, idx) {
    const msg = GG.Store.state.chat.find((m) => m.id === msgId);
    if (!msg || !msg.suggestions || !msg.suggestions[idx]) return null;
    const suggestion = msg.suggestions[idx];
    const applied = (msg.applied || []).slice();
    if (applied.indexOf(idx) >= 0) return null;
    if (suggestion.kind === 'budget') {
      (suggestion.items || []).forEach((item) => {
        GG.Store.addBudgetItem({
          category: item.category || 'decor',
          label: item.label || 'Assistant suggestion',
          planned: Number(item.planned) || 0,
          actual: 0,
          note: 'Added from the assistant',
          source: 'ai',
        });
      });
    } else {
      const base = GG.parseISO(S().event().date) || GG.today();
      (suggestion.items || []).forEach((item) => {
        GG.Store.addTask({
          title: item.title,
          category: item.category || 'logistics',
          priority: item.priority || 'medium',
          due: item.due || GG.toISO(GG.addDays(base, -14)),
          notes: item.notes || '',
          status: 'todo',
          source: 'ai',
        });
      });
    }
    applied.push(idx);
    GG.Store.updateChat(msgId, { applied });
    return suggestion;
  }

  ACTIONS['ai:apply-tasks'] = (el) => {
    const s = applySuggestion(el.dataset.msg, Number(el.dataset.idx));
    if (!s) return;
    UI.toast('Added to your timeline', (s.items || []).length + ' task' + ((s.items || []).length === 1 ? '' : 's') + ' created.');
  };
  ACTIONS['ai:apply-budget'] = (el) => {
    const s = applySuggestion(el.dataset.msg, Number(el.dataset.idx));
    if (!s) return;
    const total = (s.items || []).reduce((sum, i) => sum + (Number(i.planned) || 0), 0);
    UI.toast('Added to your budget', money(total, S().currency()) + ' of planned spend created.');
    const b = S().budget();
    if (b.overTotal) UI.toast('Over total budget', 'You are now ' + money(b.overBy, S().currency()) + ' above your total budget.', 'warn');
  };
})();
