/* Gather & Glow — small shared utilities (no framework, no build step) */
(function () {
  'use strict';
  const GG = (window.GG = window.GG || {});

  const uid = (prefix = 'id') =>
    prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  const esc = (value) =>
    String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));

  /* ---------- money ---------- */
  const CURRENCIES = {
    INR: { symbol: '₹', locale: 'en-IN', label: 'Indian Rupee' },
    USD: { symbol: '$', locale: 'en-US', label: 'US Dollar' },
    EUR: { symbol: '€', locale: 'de-DE', label: 'Euro' },
    GBP: { symbol: '£', locale: 'en-GB', label: 'British Pound' },
    AED: { symbol: 'د.إ', locale: 'en-AE', label: 'UAE Dirham' },
  };

  function money(amount, currency) {
    const cur = CURRENCIES[currency] ? currency : 'INR';
    const n = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(CURRENCIES[cur].locale, {
        style: 'currency',
        currency: cur,
        maximumFractionDigits: 0,
      }).format(n);
    } catch (e) {
      return CURRENCIES[cur].symbol + Math.round(n).toLocaleString();
    }
  }

  /** Compact money for tight spaces: ₹18.0L / ₹2.4Cr (INR) or ₹18.0k (others). */
  function moneyShort(amount, currency) {
    const n = Number(amount) || 0;
    const cur = CURRENCIES[currency] ? currency : 'INR';
    const sym = CURRENCIES[cur].symbol;
    if (cur === 'INR') {
      if (Math.abs(n) >= 10000000) return sym + trim(n / 10000000) + 'Cr';
      if (Math.abs(n) >= 100000) return sym + trim(n / 100000) + 'L';
      if (Math.abs(n) >= 1000) return sym + trim(n / 1000) + 'k';
      return sym + Math.round(n);
    }
    if (Math.abs(n) >= 1000000) return sym + trim(n / 1000000) + 'M';
    if (Math.abs(n) >= 1000) return sym + trim(n / 1000) + 'k';
    return sym + Math.round(n);
  }
  function trim(n) {
    const v = Math.round(n * 10) / 10;
    return String(v);
  }

  function pct(part, whole) {
    if (!whole) return 0;
    return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
  }

  /* ---------- dates ---------- */
  function parseISO(iso) {
    if (!iso) return null;
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  function toISO(date) {
    const d = date instanceof Date ? date : new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }
  function today() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function daysBetween(from, to) {
    return Math.round((to - from) / 86400000);
  }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmtDate(iso, style) {
    const d = parseISO(iso);
    if (!d) return '—';
    if (style === 'long') return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (style === 'month') return MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
    if (style === 'day') return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
    return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
  }

  function daysUntil(iso) {
    const d = parseISO(iso);
    if (!d) return 0;
    return daysBetween(today(), d);
  }

  /** Human relative label for a due date. */
  function relativeDue(iso) {
    const n = daysUntil(iso);
    if (n === 0) return { label: 'Due today', tone: 'warn', days: 0 };
    if (n === 1) return { label: 'Due tomorrow', tone: 'warn', days: 1 };
    if (n < 0) return { label: 'Overdue by ' + Math.abs(n) + ' day' + (Math.abs(n) === 1 ? '' : 's'), tone: 'danger', days: n };
    if (n <= 7) return { label: 'Due in ' + n + ' days', tone: 'warn', days: n };
    return { label: 'Due in ' + n + ' days', tone: 'calm', days: n };
  }

  /* ---------- DOM ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function on(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (ev) {
      const target = ev.target.closest(selector);
      if (target && root.contains(target)) handler(ev, target);
    });
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 400);
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), ms || 180);
    };
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many || one + 's');
  }

  /** Very small markdown subset -> HTML (safe: escapes first). */
  function mdLite(text) {
    const lines = String(text || '').split('\n');
    let out = '';
    let list = null;
    const inline = (s) =>
      esc(s)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    const closeList = () => {
      if (list) { out += '</' + list + '>'; list = null; }
    };
    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) { closeList(); return; }
      let m;
      if ((m = line.match(/^([-•])\s+(.*)$/))) {
        if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
        out += '<li>' + inline(m[2]) + '</li>';
        return;
      }
      if ((m = line.match(/^(\d+)\.\s+(.*)$/))) {
        if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; }
        out += '<li>' + inline(m[2]) + '</li>';
        return;
      }
      closeList();
      if ((m = line.match(/^###\s+(.*)$/))) { out += '<h4>' + inline(m[1]) + '</h4>'; return; }
      if ((m = line.match(/^##\s+(.*)$/))) { out += '<h3>' + inline(m[1]) + '</h3>'; return; }
      out += '<p>' + inline(line) + '</p>';
    });
    closeList();
    return out;
  }

  /** Minimal CSV parser supporting quoted fields with commas / newlines. */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const src = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inQuotes) {
        if (c === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  }

  function toCSV(rows) {
    return rows
      .map((r) =>
        r.map((cell) => {
          const s = String(cell === null || cell === undefined ? '' : cell);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',')
      )
      .join('\n');
  }

  Object.assign(GG, {
    uid, esc, money, moneyShort, pct, CURRENCIES,
    parseISO, toISO, addDays, today, daysBetween, fmtDate, daysUntil, relativeDue,
    MONTHS, DAYS,
    $, $$, on, downloadFile, debounce, plural, mdLite, parseCSV, toCSV,
  });
})();
