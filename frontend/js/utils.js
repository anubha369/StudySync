/* ========================================================
   StudySync — utils.js
   Date helpers, ID generator, formatters
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.utils = (function () {

  /* ── ID generator ──────────────────────────────────── */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Date helpers ──────────────────────────────────── */
  function today() {
    const d = new Date();
    return toDateStr(d);
  }

  function toDateStr(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDate(str) {
    if (!str || typeof str !== 'string') return new Date();
    // Returns a local-timezone Date for "YYYY-MM-DD" strings
    const parts = str.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return new Date();
    }
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(str, opts) {
    if (!str) return '—';
    const d = parseDate(str);
    const defaults = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString(undefined, opts || defaults);
  }

  function formatDateShort(str) {
    if (!str) return '—';
    const d = parseDate(str);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function daysUntil(str) {
    if (!str) return null;
    const d = parseDate(str);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    return diff;
  }

  function isOverdue(str) {
    if (!str) return false;
    return daysUntil(str) < 0;
  }

  function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();      // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Mon
    return new Date(d.setDate(diff));
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function weekDates(anchorDate) {
    const mon = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }

  function sameDay(a, b) {
    return toDateStr(a) === toDateStr(b);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function formatHours(minutes) {
    return (minutes / 60).toFixed(1) + 'h';
  }

  /* ── String helpers ────────────────────────────────── */
  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function truncate(s, n) {
    if (!s || s.length <= n) return s || '';
    return s.slice(0, n) + '…';
  }

  /* ── Priority helpers ──────────────────────────────── */
  function priorityOrder(p) {
    return { high: 0, medium: 1, low: 2 }[p] ?? 3;
  }

  function priorityLabel(p) {
    return capitalize(p || 'low');
  }

  /* ── Color by subject ──────────────────────────────── */
  const SUBJECT_COLORS = [
    '#4F46E5', '#7C3AED', '#0EA5E9', '#10B981',
    '#F59E0B', '#EF4444', '#EC4899', '#06B6D4',
    '#84CC16', '#F97316'
  ];

  function subjectColor(name, subjects) {
    if (!subjects || !subjects.length) return SUBJECT_COLORS[0];
    const idx = subjects.findIndex(s => s.name === name);
    if (idx === -1) return SUBJECT_COLORS[0];
    return subjects[idx].color || SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
  }

  /* ── Clamp ─────────────────────────────────────────── */
  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  /* ── Group array by key ────────────────────────────── */
  function groupBy(arr, keyFn) {
    return arr.reduce(function (acc, item) {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  /* ── Sum array of numbers ──────────────────────────── */
  function sum(arr, fn) {
    return arr.reduce(function (acc, item) { return acc + (fn ? fn(item) : item); }, 0);
  }

  return {
    generateId,
    today,
    toDateStr,
    parseDate,
    formatDate,
    formatDateShort,
    daysUntil,
    isOverdue,
    startOfWeek,
    addDays,
    weekDates,
    sameDay,
    formatTime,
    formatDuration,
    formatHours,
    capitalize,
    truncate,
    priorityOrder,
    priorityLabel,
    subjectColor,
    SUBJECT_COLORS,
    clamp,
    groupBy,
    sum
  };

}());
