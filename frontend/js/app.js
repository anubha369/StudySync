/* ========================================================
   StudySync — app.js
   Router, layout, icons, toasts, modals, init
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.app = (function () {

  var utils   = window.StudySync.utils;
  var storage = window.StudySync.storage;
  var state   = window.StudySync.state;

  /* ─────────────────────────────────────────────────────── */
  /* SVG Icon Library                                        */
  /* ─────────────────────────────────────────────────────── */
  var ICONS = {
    dashboard: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    tasks:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    planner:   '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    timer:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    analytics: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings:  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M19.07 4.93A10 10 0 0 1 22 12c0 5.52-4.48 10-10 10a10 10 0 0 1-6.93-2.78"/><path d="M12 2a10 10 0 0 1 7.07 2.93"/></svg>',
    menu:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    sun:       '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    plus:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>',
    check:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    x:         '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    'chevron-left':  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    'chevron-right': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    search:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    play:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    'refresh-cw':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
    'skip-forward':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
    book:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    'bar-chart': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    'pie-chart': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>',
    award:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    flame:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7c-1.93 0-3.68-.79-4.95-2.05"/></svg>',
    target:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    download:  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    info:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    'alert-triangle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'check-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'x-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    'alert-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    user:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    bell:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    coffee:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    palette:   '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
    'log-out': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    zap:       '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    calendar:  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clock:     '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    layers:    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    'more-vertical': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    star:      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  };

  function icon(name, size) {
    var svg = ICONS[name];
    if (!svg) return '';
    if (size) {
      svg = svg.replace(/width="24"/, 'width="' + size + '"').replace(/height="24"/, 'height="' + size + '"');
    }
    return svg;
  }

  /* ─────────────────────────────────────────────────────── */
  /* Toast notifications                                     */
  /* ─────────────────────────────────────────────────────── */
  var _toastContainer = null;

  function initToasts() {
    _toastContainer = document.getElementById('toast-container');
  }

  function toast(type, title, message, duration) {
    if (!_toastContainer) return;
    duration = duration || 3500;
    var icons = {
      success: icon('check-circle'),
      error:   icon('x-circle'),
      warning: icon('alert-triangle'),
      info:    icon('info')
    };
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML = [
      '<div class="toast-icon">', icons[type] || icons.info, '</div>',
      '<div class="toast-content">',
        '<div class="toast-title">', escapeHtml(title), '</div>',
        message ? '<div class="toast-message">' + escapeHtml(message) + '</div>' : '',
      '</div>',
      '<button class="btn btn-ghost btn-icon" onclick="this.closest(\'.toast\').remove()">', icon('x', 16), '</button>'
    ].join('');
    _toastContainer.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('show'); });
    });
    setTimeout(function () {
      el.classList.add('hide');
      setTimeout(function () { el.remove(); }, 400);
    }, duration);
  }

  /* ─────────────────────────────────────────────────────── */
  /* Modal                                                   */
  /* ─────────────────────────────────────────────────────── */
  var _modalOverlay = null;
  var _modalEl      = null;
  var _currentModalClose = null;

  function initModal() {
    _modalOverlay = document.getElementById('modal-overlay');
    _modalEl      = document.getElementById('modal');
    _modalOverlay.addEventListener('click', function (e) {
      if (e.target === _modalOverlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal(opts) {
    // opts: { title, body, footer, onClose, size }
    _currentModalClose = opts.onClose || null;
    var footer = opts.footer || '';
    _modalEl.className = 'modal animate-in' + (opts.size ? ' modal-' + opts.size : '');
    _modalEl.innerHTML = [
      '<div class="modal-header">',
        '<h2 class="modal-title">', escapeHtml(opts.title || ''), '</h2>',
        '<button class="modal-close btn" id="modal-close-btn">', icon('x'), '</button>',
      '</div>',
      '<div class="modal-body">', opts.body || '', '</div>',
      footer ? '<div class="modal-footer">' + footer + '</div>' : ''
    ].join('');
    _modalOverlay.classList.add('visible');
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    var firstInput = _modalEl.querySelector('input, select, textarea');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 100);
  }

  function closeModal() {
    _modalOverlay.classList.remove('visible');
    if (_currentModalClose) _currentModalClose();
    _currentModalClose = null;
  }

  function confirm(title, message, onConfirm, danger) {
    openModal({
      title: title,
      body: '<p style="color:var(--text-muted);font-size:var(--text-sm);line-height:var(--lh-loose)">' + escapeHtml(message) + '</p>',
      footer: [
        '<button class="btn btn-secondary" id="confirm-cancel">Cancel</button>',
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="confirm-ok">' + (danger ? 'Delete' : 'Confirm') + '</button>'
      ].join('')
    });
    document.getElementById('confirm-cancel').addEventListener('click', closeModal);
    document.getElementById('confirm-ok').addEventListener('click', function () {
      closeModal();
      if (onConfirm) onConfirm();
    });
  }

  function resetDemo() {
    confirm('Reset Demo Data', 'Restore the initial demonstration dataset? All custom edits will be replaced with fresh sample data.', function () {
      state.reset();
      renderSidebar();
      _activate(_currentRoute);
      toast('success', 'Demo data restored!', 'Pristine starting dataset is ready.');
    }, false);
  }

  /* ─────────────────────────────────────────────────────── */
  /* Router                                                  */
  /* ─────────────────────────────────────────────────────── */
  var ROUTES = {
    '#/dashboard':  { title: 'Dashboard',     section: 'dashboard' },
    '#/tasks':      { title: 'My Tasks',       section: 'tasks' },
    '#/planner':    { title: 'Study Planner',  section: 'planner' },
    '#/timer':      { title: 'Focus Timer',    section: 'timer' },
    '#/analytics':  { title: 'Analytics',      section: 'analytics' },
    '#/settings':   { title: 'Settings',       section: 'settings' }
  };

  var _currentRoute = '#/dashboard';

  function navigate(route) {
    if (!ROUTES[route]) route = '#/dashboard';
    if (location.hash !== route) {
      location.hash = route;
    } else {
      _activate(route);
    }
  }

  function _activate(route) {
    if (!ROUTES[route]) route = '#/dashboard';
    _currentRoute = route;
    var cfg = ROUTES[route];

    // Update sections
    document.querySelectorAll('.page-section').forEach(function (el) {
      el.classList.remove('active');
    });
    var section = document.getElementById('page-' + cfg.section);
    if (section) {
      section.classList.add('active');
      section.classList.add('animate-in');
      setTimeout(function () { section.classList.remove('animate-in'); }, 400);
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.remove('active');
      if (el.dataset.route === route) el.classList.add('active');
    });

    // Update page title
    var titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = cfg.title;

    // Update document title
    document.title = cfg.title + ' — StudySync';

    // Notify page modules
    state.emit('route:change', { route: route, section: cfg.section });

    // Call page render
    var renders = {
      dashboard: function () { if (window.StudySync.dashboard) window.StudySync.dashboard.render(); },
      tasks:     function () { if (window.StudySync.tasks) window.StudySync.tasks.render(); },
      planner:   function () { if (window.StudySync.planner) window.StudySync.planner.render(); },
      timer:     function () { if (window.StudySync.timer) window.StudySync.timer.onEnter(); },
      analytics: function () { if (window.StudySync.analytics) window.StudySync.analytics.render(); },
      settings:  function () { if (window.StudySync.settings) window.StudySync.settings.render(); }
    };
    if (renders[cfg.section]) renders[cfg.section]();

    // Close mobile sidebar
    closeMobileSidebar();
  }

  /* ─────────────────────────────────────────────────────── */
  /* Sidebar toggle                                          */
  /* ─────────────────────────────────────────────────────── */
  var _sidebarCollapsed = false;
  var _sidebar = null;
  var _mobileOverlay = null;

  function initSidebar() {
    _sidebar = document.getElementById('sidebar');
    _mobileOverlay = document.getElementById('mobile-overlay');

    var toggleBtn = document.getElementById('topbar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        if (window.innerWidth < 1024) {
          toggleMobileSidebar();
        } else {
          toggleSidebar();
        }
      });
    }

    if (_mobileOverlay) {
      _mobileOverlay.addEventListener('click', closeMobileSidebar);
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeMobileSidebar();
      }
    });

    // Restore collapsed state
    var saved = localStorage.getItem('ss_sidebar_collapsed');
    if (saved === 'true' && window.innerWidth >= 1024) {
      _sidebarCollapsed = true;
      _sidebar.classList.add('collapsed');
    }
  }

  function toggleSidebar() {
    _sidebarCollapsed = !_sidebarCollapsed;
    _sidebar.classList.toggle('collapsed', _sidebarCollapsed);
    localStorage.setItem('ss_sidebar_collapsed', String(_sidebarCollapsed));
  }

  function toggleMobileSidebar() {
    _sidebar.classList.toggle('mobile-open');
    _mobileOverlay.classList.toggle('visible');
  }

  function closeMobileSidebar() {
    if (_sidebar) _sidebar.classList.remove('mobile-open');
    if (_mobileOverlay) _mobileOverlay.classList.remove('visible');
  }

  /* ─────────────────────────────────────────────────────── */
  /* Theme toggle                                            */
  /* ─────────────────────────────────────────────────────── */
  function initTheme() {
    var settings = state.get('settings');
    applyTheme(settings.darkMode);

    var btn = document.getElementById('btn-theme');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = state.get('settings').darkMode;
        state.updateSettings({ darkMode: !current });
        applyTheme(!current);
        updateThemeIcon(!current);
      });
    }
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    updateThemeIcon(dark);
  }

  function updateThemeIcon(dark) {
    var btn = document.getElementById('btn-theme');
    if (btn) btn.innerHTML = dark ? icon('sun') : icon('moon');
  }

  /* ─────────────────────────────────────────────────────── */
  /* HTML escape                                             */
  /* ─────────────────────────────────────────────────────── */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ─────────────────────────────────────────────────────── */
  /* Build sidebar HTML                                      */
  /* ─────────────────────────────────────────────────────── */
  function renderSidebar() {
    var settings = state.get('settings');
    var name = settings.name || 'Student';
    var initials = name.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
    var tasks = state.get('tasks');
    var pendingCount = tasks.filter(function(t){ return t.status !== 'done'; }).length;

    var navItems = [
      { route: '#/dashboard', label: 'Dashboard',    iconName: 'dashboard' },
      { route: '#/tasks',     label: 'My Tasks',      iconName: 'tasks',    badge: pendingCount || 0 },
      { route: '#/planner',   label: 'Study Planner', iconName: 'planner' },
      { route: '#/timer',     label: 'Focus Timer',   iconName: 'timer' },
      { route: '#/analytics', label: 'Analytics',     iconName: 'analytics' }
    ];

    var navHtml = navItems.map(function (item) {
      var active = (location.hash === item.route || (!location.hash && item.route === '#/dashboard'));
      return [
        '<a class="nav-item', active ? ' active' : '', '" data-route="', item.route, '" href="', item.route, '">',
          icon(item.iconName),
          '<span class="nav-label">', escapeHtml(item.label), '</span>',
          (item.badge ? '<span class="nav-badge">' + item.badge + '</span>' : ''),
        '</a>'
      ].join('');
    }).join('');

    var userSubtext = 'Student';
    if (window.StudySync && window.StudySync.auth) {
      var uUser = window.StudySync.auth.getCurrentUser();
      if (uUser) {
        userSubtext = uUser.college || uUser.email || 'Student';
      }
    }

    var sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = [
      '<div class="sidebar-logo">',
        '<div class="logo-icon">', icon('layers', 18), '</div>',
        '<div class="logo-text">',
          '<h1>StudySync</h1>',
          '<p>Your Academic Life, Organized.</p>',
        '</div>',
      '</div>',
      '<nav class="sidebar-nav" role="navigation">',
        '<div class="nav-section-label">Main Menu</div>',
        navHtml,
        '<div class="nav-section-label" style="margin-top:8px">Preferences</div>',
        '<a class="nav-item" data-route="#/settings" href="#/settings">',
          icon('settings'),
          '<span class="nav-label">Settings</span>',
        '</a>',
      '</nav>',
      '<div class="sidebar-footer">',
        '<div class="sidebar-user">',
          '<div class="user-avatar">', escapeHtml(initials), '</div>',
          '<div class="user-info">',
            '<div class="user-name">', escapeHtml(name), '</div>',
            '<div class="user-role">', escapeHtml(userSubtext), '</div>',
          '</div>',
          '<button class="btn-logout" id="btn-sidebar-logout" title="Log out" aria-label="Log out">',
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
          '</button>',
        '</div>',
      '</div>'
    ].join('');

    // Attach logout click listener
    var logoutBtn = sidebar.querySelector('#btn-sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.StudySync && window.StudySync.auth) {
          window.StudySync.auth.logout();
        }
      });
    }

    // Attach nav click listeners
    sidebar.querySelectorAll('.nav-item').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        navigate(el.dataset.route);
      });
    });
  }

  /* ─────────────────────────────────────────────────────── */
  /* Init                                                    */
  /* ─────────────────────────────────────────────────────── */
  function init() {
    // Build sidebar and base layout
    renderSidebar();

    // Init subsystems
    initModal();
    initToasts();
    initSidebar();
    initTheme();

    // Init page modules
    if (window.StudySync.tasks)     window.StudySync.tasks.init();
    if (window.StudySync.planner)   window.StudySync.planner.init();
    if (window.StudySync.timer)     window.StudySync.timer.init();
    if (window.StudySync.analytics) window.StudySync.analytics.init();
    if (window.StudySync.dashboard) window.StudySync.dashboard.init();
    if (window.StudySync.settings)  window.StudySync.settings.init();

    // Connect to backend API
    if (window.StudySync.api && window.StudySync.auth) {
      window.StudySync.api.health.check().then(function () {
        if (window.StudySync.auth.isAuthenticated()) {
          window.StudySync.state.syncFromBackend().then(function () {
            renderSidebar();
            _activate(location.hash || '#/dashboard');
          }).catch(function (err) {
            console.warn('Backend sync failed, showing login:', err);
            window.StudySync.auth.showLogin();
          });
        } else {
          window.StudySync.auth.showLogin();
        }
      }).catch(function (err) {
        console.warn('Backend unreachable:', err);
        if (err && err.isNetworkError) {
          window.StudySync.auth.showServerUnreachableScreen(function () {
            init();
          });
        } else {
          window.StudySync.auth.showLogin();
        }
      });
    }

    // Re-render sidebar on tasks change (badge update)
    state.on('tasks:change', function () { renderSidebar(); });
    state.on('settings:change', function (s) {
      var n = s.name || 'Student';
      var initials = n.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);
      var userAvatar = document.querySelector('.user-avatar');
      var userName   = document.querySelector('.user-name');
      if (userAvatar) userAvatar.textContent = initials;
      if (userName)   userName.textContent   = n;
      applyTheme(s.darkMode);
    });

    // Global keyboard shortcut: N to open new task modal
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement || {}).tagName)) {
        if (_modalOverlay && !_modalOverlay.classList.contains('visible')) {
          if (window.StudySync && window.StudySync.tasks) {
            e.preventDefault();
            window.StudySync.tasks.openAddModal();
          }
        }
      }
    });

    state.on('reset', function () {
      renderSidebar();
      _activate(_currentRoute);
    });

    // Hash routing
    var handleRoute = function () {
      var hash = location.hash || '#/dashboard';
      _activate(hash);
    };
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);

    // Initial route
    var initialHash = location.hash || '#/dashboard';
    _activate(initialHash);
  }

  return {
    init,
    icon,
    escapeHtml,
    toast,
    openModal,
    closeModal,
    confirm,
    resetDemo,
    navigate,
    renderSidebar,
    applyTheme
  };

}());
