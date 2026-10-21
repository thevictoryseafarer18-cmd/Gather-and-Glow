/**
 * Smoke test for Gather & Glow (development only, not shipped to the browser).
 * Loads index.html in jsdom, walks every route and exercises the main flows.
 *   node test/smoke.mjs
 */
import { JSDOM, VirtualConsole } from 'jsdom';

const BASE = process.env.BASE_URL || 'http://localhost:4173';

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  if (/Could not parse CSS|Not implemented: window.scrollTo/i.test(e.message)) return;
  errors.push('jsdomError: ' + e.message);
});
vc.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

const dom = await JSDOM.fromURL(BASE + '/#/overview', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.scrollTo = () => {};
    if (!window.HTMLDialogElement || !window.HTMLDialogElement.prototype.showModal) {
      const proto = (window.HTMLDialogElement || window.HTMLElement).prototype;
      proto.showModal = function () { this.open = true; this.setAttribute('open', ''); };
      proto.close = function () {
        this.open = false;
        this.removeAttribute('open');
        this.dispatchEvent(new window.Event('close'));
      };
    }
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  },
});

const { window } = dom;
const { document } = window;
let GG; // assigned once the app scripts have run

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(label, cond, extra) {
  if (cond) {
    console.log('  ✓ ' + label);
  } else {
    failures++;
    console.log('  ✗ ' + label + (extra ? ' — ' + extra : ''));
  }
}
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const text = () => document.getElementById('view') ? document.getElementById('view').textContent : document.body.textContent;

async function goto(route) {
  window.location.hash = '#/' + route;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  await wait(30);
}

async function main() {
  await wait(300);
  GG = window.GG;
  if (!GG || !GG.Store) throw new Error('App did not initialise (window.GG missing)');

  console.log('\n— boot & overview');
  check('app shell rendered', !!document.querySelector('.app'));
  check('overview heading present', /Your celebration, in one place/.test(text()));
  check('countdown rendered', !!document.querySelector('.hero__count-number'));
  check('nav has 8 workspace links', $$('.nav__item').length >= 8);
  check('demo mode labelled', /Demo mode/i.test(document.body.textContent));

  const budget = GG.Selectors.budget();
  check('seeded budget totals positive', budget.total > 0 && budget.planned > 0, JSON.stringify({ t: budget.total, p: budget.planned }));
  check('over budget flag detected', budget.overTotal === true);

  console.log('\n— routes render');
  for (const route of ['assistant', 'budget', 'timeline', 'vendors', 'guests', 'ideas', 'event']) {
    await goto(route);
    check('#' + route + ' rendered without error', document.getElementById('view').children.length > 0);
  }

  console.log('\n— tasks: add, toggle, filter');
  await goto('timeline');
  const openBefore = GG.Selectors.tasks().open.length;
  click($('[data-action="task:add"]'));
  await wait(20);
  check('task modal opened', !!$('#modal-form'));
  $('#modal-form [name="title"]').value = 'Smoke test task';
  $('#modal-form [name="due"]').value = GG.toISO(GG.addDays(GG.today(), 3));
  $('#modal-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(30);
  check('task added to store', GG.Store.state.tasks.some((t) => t.title === 'Smoke test task'));
  check('open task count increased', GG.Selectors.tasks().open.length === openBefore + 1);

  const newTask = GG.Store.state.tasks.find((t) => t.title === 'Smoke test task');
  click(document.querySelector('[data-action="task:toggle"][data-id="' + newTask.id + '"]'));
  await wait(20);
  check('task toggled to done', GG.Store.state.tasks.find((t) => t.id === newTask.id).status === 'done');

  const search = $('#task-search');
  search.value = 'caterer';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await wait(300);
  check('search filters tasks', !document.getElementById('view').textContent.includes('Smoke test task'));

  console.log('\n— budget: change total, add item');
  await goto('budget');
  const totalInput = $('#budget-total');
  totalInput.value = '1500000';
  totalInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(40);
  check('budget total updated', GG.Store.state.event.budgetTotal === 1500000);
  check('over-total warning after lowering budget', /above your total budget/.test(text()));
  check('planned unchanged by total edit', GG.Selectors.budget().planned === budget.planned);

  click($('[data-action="budget:add"]'));
  await wait(20);
  $('#modal-form [name="label"]').value = 'Smoke test line';
  $('#modal-form [name="planned"]').value = '5000';
  $('#modal-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(30);
  check('budget item added', GG.Store.state.budgetItems.some((b) => b.label === 'Smoke test line'));
  check('over-total warning shown', /above your total budget/.test(text()));

  const beforeDelete = GG.Selectors.budget().planned;
  const line = GG.Store.state.budgetItems.find((b) => b.label === 'Smoke test line');
  click(document.querySelector('[data-action="budget:delete"][data-id="' + line.id + '"]'));
  await wait(20);
  check('delete confirmation dialog shown', /Remove this budget item/.test(document.getElementById('modal').textContent));
  click(document.querySelector('#modal [data-ok]'));
  await wait(30);
  check('budget item deleted after confirm', GG.Selectors.budget().planned === beforeDelete - 5000);

  console.log('\n— vendors');
  await goto('vendors');
  check('sample vendor notice visible', /not real, verified or recommended/.test(text()));
  const vendor = GG.Store.state.vendors[0];
  const statusSelect = document.querySelector('[data-change="vendor:status"][data-id="' + vendor.id + '"]');
  statusSelect.value = 'paid';
  statusSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(30);
  check('vendor status updated', GG.Store.state.vendors[0].status === 'paid');
  click($('[data-action="vendor:questions"]'));
  await wait(20);
  const q = document.querySelector('#modal [data-q="0"]');
  q.checked = true;
  q.dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(20);
  check('vendor question ticked', GG.Store.state.vendors[0].checkedQuestions.includes(0));
  document.getElementById('modal').close();

  console.log('\n— guests: add, rsvp, csv export');
  await goto('guests');
  click($('[data-action="guest:add"]'));
  await wait(20);
  $('#modal-form [name="name"]').value = 'Smoke Guest';
  $('#modal-form [name="plusOnes"]').value = '2';
  $('#modal-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(30);
  check('guest added', GG.Store.state.guests.some((g) => g.name === 'Smoke Guest'));
  check('plus-ones counted in seats', GG.Selectors.guests().invitedHeads === GG.Store.state.guests.reduce((s, g) => s + 1 + (g.plusOnes || 0), 0));
  const guest = GG.Store.state.guests.find((g) => g.name === 'Smoke Guest');
  const rsvpSel = document.querySelector('[data-change="guest:rsvp"][data-id="' + guest.id + '"]');
  rsvpSel.value = 'yes';
  rsvpSel.dispatchEvent(new window.Event('change', { bubbles: true }));
  await wait(20);
  check('rsvp updated', GG.Store.state.guests.find((g) => g.id === guest.id).rsvp === 'yes');
  check('no uncaught errors so far', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('\n— assistant (demo engine)');
  await goto('assistant');
  check('assistant empty state shown', /Ask me anything/.test(text()));
  check('demo disclosure present', /Demo mode — simulated responses/.test(text()));
  click(document.querySelector('[data-action="ai:prompt"][data-prompt="Create my planning timeline"]'));
  await wait(1400);
  check('user message stored', GG.Store.state.chat.some((m) => m.role === 'user'));
  const reply = GG.Store.state.chat.filter((m) => m.role === 'assistant').pop();
  check('assistant replied with demo source', !!reply && reply.source === 'demo');
  check('reply references the event date', !!reply && (reply.text.includes(GG.fmtDate(GG.Store.state.event.date, 'day')) || /\d{4}/.test(reply.text)));
  check('reply suggests actionable items', !!reply && Array.isArray(reply.suggestions) && reply.suggestions.length > 0, reply ? reply.text.slice(0, 80) : 'no reply');

  const taskCount = GG.Store.state.tasks.length;
  const applyBtn = document.querySelector('[data-action="ai:apply-tasks"]');
  check('apply-tasks button rendered', !!applyBtn);
  if (applyBtn) {
    click(applyBtn);
    await wait(40);
    check('suggestions became tasks', GG.Store.state.tasks.length > taskCount);
  }

  console.log('\n— ideas');
  await goto('ideas');
  check('idea cards rendered', $$('.idea').length > 0);
  const saveBtn = $('[data-action="idea:save"]');
  const savedBefore = GG.Selectors.ideas().saved.length;
  click(saveBtn);
  await wait(30);
  check('idea saved', GG.Selectors.ideas().saved.length === savedBefore + 1);

  console.log('\n— persistence');
  const raw = window.localStorage.getItem('gather-glow:v1');
  check('state persisted to localStorage', !!raw && raw.length > 100);

  console.log('\n— new event via setup wizard');
  await goto('setup');
  check('wizard step 1 rendered', /What are we celebrating/.test(document.body.textContent));
  click(document.querySelector('[data-action="setup:type"][data-value="birthday"]'));
  await wait(20);
  $('#ev-name').value = 'Diya turns 6';
  $('#ev-date').value = GG.toISO(GG.addDays(GG.today(), 40));
  document.getElementById('setup-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(30);
  check('advanced to step 2', /Where, how many/.test(document.body.textContent));
  $('#ev-guests').value = '60';
  $('#ev-budget').value = '250000';
  document.getElementById('setup-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(30);
  check('advanced to step 3', /What matters most/.test(document.body.textContent));
  click(document.querySelector('[data-action="setup:submit"]') || document.getElementById('setup-form'));
  document.getElementById('setup-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(120);
  check('new event created', GG.Store.state.event.name === 'Diya turns 6', GG.Store.state.event.name);
  check('new event type birthday', GG.Store.state.event.type === 'birthday');
  check('budget seeded from split', GG.Store.state.budgetItems.length >= 8);
  check('timeline seeded from template', GG.Store.state.tasks.length >= 10);
  check('ideas personalised to type', GG.Store.state.ideas.length > 0);
  check('routed to overview', window.location.hash === '#/overview');

  console.log('\n— error and empty states');
  await goto('timeline');
  const emptyCheck = /No tasks match|Tasks complete|Open/.test(text());
  check('timeline view intact after new event', emptyCheck);

  console.log('\n— reset demo');
  GG.Store.resetDemo();
  await wait(50);
  check('demo restored', GG.Store.state.seeded === true && GG.Store.state.event.name === 'Aarav & Meera');

  console.log('\n— console errors: ' + errors.length);
  errors.slice(0, 8).forEach((e) => console.log('   ! ' + e));

  console.log('\n' + (failures === 0 && errors.length === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED, ' + errors.length + ' console error(s)'));
  process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nTest harness crashed:', err);
  process.exit(1);
});
