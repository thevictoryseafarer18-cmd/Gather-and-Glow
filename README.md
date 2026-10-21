# Gather &amp; Glow

An AI-powered celebration and event planning assistant for weddings, birthdays and community events.
Go from a rough idea to an organised plan: budget, timeline, vendors, guest list and a tailored idea board.

Built as a self-contained front-end prototype (HTML + CSS + vanilla JS, no build step), with an
optional Node dev server that also acts as a secure AI proxy.

---

## Run it

### Option 1 — with the dev server (recommended)

```bash
cd gather-and-glow
npm start            # → http://localhost:4173
```

No dependencies to install. The server serves the static app and exposes `/api/ai`.
With no API key configured, the assistant runs in **clearly labelled demo mode**.

### Option 2 — open the file directly

Open `index.html` in a browser. Everything works (including local storage) except the AI proxy,
so the assistant stays in demo mode. No server needed.

### Option 3 — any static server

```bash
python3 -m http.server 4173
```

### Reset the demo

Sidebar → **Reset demo data**, or **Event details → Start over**. This restores the sample wedding.
Everything is stored in `localStorage` under the key `gather-glow:v1` — no account, no backend database.

---

## What's inside

| Section | What it does |
| --- | --- |
| **Guided setup** | 3 steps: event type → place, people, budget → priorities, dietary and access needs. Builds a budget with a suggested split, a timeline counted back from the date, and a personalised idea board. |
| **Overview** | Countdown, budget summary (total / planned / actual / remaining), progress for tasks, vendors, milestones and RSVPs, upcoming deadlines, a planning summary generated from live data, and a single "next best action". |
| **AI assistant** | Conversational planner grounded in the event. Quick prompts, loading / empty / error states, and every suggestion can become tasks or budget lines with one click. Always labels whether a reply is live or simulated. |
| **Budget planner** | 10 editable categories, planned vs actual, category progress bars, add / edit / remove items, over-budget warnings at item, category and total level, donut breakdown, "scale plan to total" and "suggested split" actions. |
| **Timeline & tasks** | Wedding, birthday and community templates generated from the event date; add, edit, complete, delete, search, filter by status and priority, sort; overdue and upcoming highlighting. |
| **Vendor checklist** | Category, contact, quote, deposit, notes, a five-stage status track (researching → paid), quote comparison table and a reusable question checklist per category. |
| **Guests & RSVPs** | Add / edit / remove, RSVP status, meal, dietary, accessibility, plus-ones, live seat counts, meal mix, a "needs to brief" list, CSV import (file, drag-drop or paste) and CSV export. |
| **Ideas** | Theme, décor, menu, activity and favour ideas scaled to budget, guest count, city and style. Save, dismiss, restore, or turn into a task or budget item. |
| **Event details** | Edit the whole brief, see what is stored, create a new event, load the sample wedding, reset. |

### Design & accessibility notes

- Editorial style: warm ivory paper, deep forest and plum accents, restrained gold, Fraunces serif headings with Inter body text, soft cards and a decorative sparkle icon set (inline SVG, no icon font).
- Responsive from 360 px up: sidebar collapses to a drawer, tables scroll, dialogs become bottom sheets.
- Semantic landmarks, skip link, keyboard-operable controls, visible focus rings, `aria-live` chat log, labelled form fields with inline error messages, and `role="progressbar"` with text values.
- Status is never colour-only: every badge carries a word and an icon, and bars are paired with numbers.
- Verified with axe-core: **0 WCAG 2.1 A/AA violations** across all nine routes.

---

## Demo data is fictional

The sample wedding ("Aarav & Meera", Chennai), its vendors, guests and quotes are invented for the
prototype. Vendor cards are marked **"Fictional sample record"**, the vendor screen carries a banner
saying they are not real, verified or recommended businesses, and phone numbers / emails use
`example` domains. Costs on the ideas board are rough estimates, not quotes.

---

## Where a real AI service plugs in

The UI never talks to a model directly. It calls **one endpoint** through `js/ai.js`:

```
GET  /api/ai/health   → { aiConfigured: boolean }   // decides live vs demo
POST /api/ai          → { text: string }            // { messages, context } in
```

`server.js` already implements both, keeping the provider key **server-side only**:

```bash
AI_PROVIDER_KEY=sk-...            # required to enable live replies
AI_BASE_URL=https://api.openai.com/v1   # any OpenAI-compatible endpoint
AI_MODEL=gpt-4o-mini
npm start
```

With a key set, the app detects it on load and switches to **live** mode (the top bar and the
assistant panel both say so). With no key, it stays in demo mode and says that instead — it never
pretends a model is connected.

**To use a different provider**, edit the `fetch` call in `handleAi()` in `server.js`
(Anthropic, Gemini, Bedrock, an internal gateway — anything reachable from the server). The browser
contract does not change.

**Force demo mode** even when a key exists: set `AI_MODE: 'demo'` in `js/config.js`.

Safeguards already in place: relative endpoint (no CORS/key exposure), 30 requests/minute per IP,
request body limit, 30-second upstream timeout, message trimming, no guest emails in the context
payload, and a graceful fallback to demo mode with a visible notice if the proxy fails.

**What the demo engine does:** `demoAnswer()` in `js/ai.js` reads the same compact event context the
live model would receive and answers from a deterministic, intent-matched planner (timeline, budget,
theme, food, vendors, guests, gaps, accessibility, activities, favours, logistics, risk). Answers quote
the real date, guest count, budget figures and vendor status, and attach actionable task/budget
suggestions.

---

## Project layout

```
index.html            app shell + script includes
css/app.css           design tokens, components, responsive rules
js/config.js          AI mode + storage keys (no secrets)
js/util.js            money, dates, CSV, escaping, markdown-lite
js/templates.js       event types, budget splits, task templates, vendor questions, sample data
js/store.js           state, localStorage persistence, mutations, derived selectors
js/ai.js              transport (live proxy + demo engine), digest generator
js/ui.js              toasts, modal form builder with validation, confirmations
js/eventform.js       shared event field definitions
js/views/*.js         one renderer + actions per section
js/app.js             routing, shell, event delegation
server.js             static server + secure AI proxy + rate limiting
test/smoke.mjs        jsdom smoke test of the main flows
test/proxy-test.mjs   verifies the live path against a stub provider
```

Adding a live model, a database or auth later only touches `server.js` and the transport function in
`js/ai.js` — the views stay as they are.

---

## Tests (optional, dev only)

```bash
npm i jsdom playwright-core      # not needed to run the app
node server.js &                 # app must be serving on :4173
node test/smoke.mjs              # 40+ checks across every route and flow
node test/proxy-test.mjs         # live path, key safety, rate limiting
```
