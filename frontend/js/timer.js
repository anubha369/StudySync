/* ========================================================
   StudySync — timer.js
   Pomodoro focus timer with SVG ring, break modes,
   subject tracking, session logging
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.timer = (function () {

  var u     = window.StudySync.utils;
  var state = window.StudySync.state;
  var app   = window.StudySync.app;

  /* ── Timer state ────────────────────────────────────── */
  var _mode         = 'focus';    // 'focus' | 'short' | 'long'
  var _running      = false;
  var _secondsLeft  = 0;
  var _totalSeconds = 0;
  var _intervalId   = null;
  var _pomodoroCount = 0;
  var _currentSubject = '';
  var _sessionStart  = null;

  var RING_CIRCUMFERENCE = 660; // 2π × r where r ≈ 105

  /* ── Get durations from settings ───────────────────── */
  function _durations() {
    var s = state.get('settings');
    return {
      focus: (s.pomodoroDuration || 25) * 60,
      short: (s.shortBreak || 5) * 60,
      long:  (s.longBreak || 15) * 60,
      pomosPerLong: s.pomodorosPerLong || 4
    };
  }

  /* ─────────────────────────────────────────────────── */
  /* Render (called when entering page)                   */
  /* ─────────────────────────────────────────────────── */
  function onEnter() {
    _renderSubjectSelect();
    _renderTimerLog();
    _renderPomoDots();
    // If timer isn't running, reset display for current mode
    if (!_running) {
      _resetTimer(_mode);
    }
    _updateDisplay();
    _updatePlayPause();
    _updateModeUI();
  }

  function _renderSubjectSelect() {
    var el = document.getElementById('timer-subject');
    if (!el) return;
    var subjects = state.get('subjects');
    var cur = _currentSubject;
    el.innerHTML = '<option value="">— No subject —</option>' +
      subjects.map(function(s) {
        var sel = cur === s.name ? ' selected' : '';
        return '<option value="' + app.escapeHtml(s.name) + '"' + sel + '>' + app.escapeHtml(s.name) + '</option>';
      }).join('');
    el.value = cur;
  }

  function _renderTimerLog() {
    var el = document.getElementById('timer-log-list');
    if (!el) return;
    var log      = state.get('timerLog');
    var todayLog = log.filter(function(e){ return e.date === u.today(); }).reverse();
    var subjects = state.get('subjects');

    if (!todayLog.length) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-xs);padding:8px 0">No sessions today yet.</div>';
      return;
    }

    el.innerHTML = todayLog.slice(0, 10).map(function(e) {
      var subj = subjects.find(function(s){ return s.name === e.subject; });
      var color = subj ? subj.color : '#4F46E5';
      var time  = e.endTime ? e.endTime.slice(0, 5) : '';
      return [
        '<div class="timer-log-item">',
          '<span class="log-dot" style="background:', color, '"></span>',
          '<span class="log-subject">', app.escapeHtml(e.subject || 'Focus'), '</span>',
          '<span class="log-duration">', u.formatDuration(e.duration || 25), '</span>',
          '<span class="log-time">', time, '</span>',
        '</div>'
      ].join('');
    }).join('');
  }

  function _renderPomoDots() {
    var el = document.getElementById('pomo-dots');
    if (!el) return;
    var d = _durations();
    var dots = '';
    for (var i = 0; i < d.pomosPerLong; i++) {
      dots += '<div class="pomodoro-dot' + (i < _pomodoroCount ? ' filled' : '') + '"></div>';
    }
    el.innerHTML = dots;
  }

  /* ─────────────────────────────────────────────────── */
  /* Timer logic                                          */
  /* ─────────────────────────────────────────────────── */
  function _resetTimer(mode) {
    _mode = mode || 'focus';
    var d = _durations();
    var secs = { focus: d.focus, short: d.short, long: d.long }[_mode] || d.focus;
    _secondsLeft  = secs;
    _totalSeconds = secs;
    _running = false;
    clearInterval(_intervalId);
    _updateDisplay();
    _updateModeUI();
  }

  function _startStop() {
    if (_running) {
      _pause();
    } else {
      _start();
    }
  }

  function _start() {
    clearInterval(_intervalId);
    if (_secondsLeft <= 0) _resetTimer(_mode);
    _running    = true;
    _sessionStart = new Date();
    _currentSubject = (document.getElementById('timer-subject') || {}).value || '';
    _updatePlayPause();
    _intervalId = setInterval(_tick, 1000);
  }

  function _pause() {
    _running = false;
    clearInterval(_intervalId);
    _updatePlayPause();
  }

  function _tick() {
    if (_secondsLeft > 0) {
      _secondsLeft--;
      _updateDisplay();
    } else {
      _onComplete();
    }
  }

  function _onComplete() {
    clearInterval(_intervalId);
    _running = false;

    // Log completed focus session
    if (_mode === 'focus') {
      _pomodoroCount++;
      var d = _durations();
      var logEntry = {
        id:       u.generateId(),
        date:     u.today(),
        subject:  _currentSubject || '',
        duration: d.focus,
        type:     'pomodoro',
        endTime:  new Date().toTimeString().slice(0, 8)
      };
      state.addTimerEntry(logEntry);
      _renderTimerLog();
      _renderPomoDots();

      // Auto-transition to break
      var nextMode = (_pomodoroCount % d.pomosPerLong === 0) ? 'long' : 'short';
      app.toast('success', 'Focus session done!', 'Time for a ' + (nextMode === 'long' ? 'long' : 'short') + ' break.');
      _resetTimer(nextMode);
      _setModeTab(nextMode);

      // Browser notification
      _notify('Focus Session Complete!', 'Great work! Take a ' + (nextMode === 'long' ? 'long' : 'short') + ' break.');

      var s = state.get('settings');
      if (s.autoStartBreak) {
        setTimeout(function(){ _start(); }, 1500);
      }
    } else {
      app.toast('info', 'Break over!', 'Ready to focus again?');
      _resetTimer('focus');
      _setModeTab('focus');
      _notify('Break Over!', 'Time to focus!');
    }
    _updatePlayPause();
  }

  function _skip() {
    clearInterval(_intervalId);
    _running = false;
    _onComplete();
  }

  function _reset() {
    clearInterval(_intervalId);
    _running = false;
    _resetTimer();
    _updatePlayPause();
  }

  /* ─────────────────────────────────────────────────── */
  /* Display update                                       */
  /* ─────────────────────────────────────────────────── */
  function _updateDisplay() {
    var timeEl  = document.getElementById('timer-time');
    var phaseEl = document.getElementById('timer-phase');
    var ringEl  = document.getElementById('timer-ring-progress');

    if (timeEl)  timeEl.textContent = u.formatTime(_secondsLeft);
    if (phaseEl) {
      var labels = { focus: 'Focus Time', short: 'Short Break', long: 'Long Break' };
      phaseEl.textContent = labels[_mode] || 'Focus Time';
    }

    if (ringEl) {
      var pct = _totalSeconds > 0 ? (1 - _secondsLeft / _totalSeconds) : 0;
      var dashOffset = RING_CIRCUMFERENCE * (1 - pct);
      ringEl.style.strokeDashoffset = dashOffset;
      ringEl.className = 'timer-ring-progress' +
        (_mode === 'short' ? ' break' : _mode === 'long' ? ' long-break' : '');
    }

    // Update page title while running
    if (_running) {
      document.title = u.formatTime(_secondsLeft) + ' · ' + (_mode === 'focus' ? 'Focus' : 'Break') + ' — StudySync';
    }
  }

  function _updatePlayPause() {
    var btn = document.getElementById('btn-timer-play');
    if (!btn) return;
    btn.innerHTML = _running ? app.icon('pause', 26) : app.icon('play', 26);
  }

  function _updateModeUI() {
    document.querySelectorAll('.timer-mode-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.mode === _mode);
    });
  }

  function _setModeTab(mode) {
    _mode = mode;
    _updateModeUI();
  }

  /* ─────────────────────────────────────────────────── */
  /* Browser notifications                                */
  /* ─────────────────────────────────────────────────── */
  function _notify(title, body) {
    var s = state.get('settings');
    if (!s.notifications) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body: body, icon: '' }); } catch(e) {}
    }
  }

  function _requestNotifPermission() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /* ─────────────────────────────────────────────────── */
  /* Init                                                  */
  /* ─────────────────────────────────────────────────── */
  function init() {
    var playBtn  = document.getElementById('btn-timer-play');
    var resetBtn = document.getElementById('btn-timer-reset');
    var skipBtn  = document.getElementById('btn-timer-skip');
    var subjectEl = document.getElementById('timer-subject');

    if (playBtn)   playBtn.addEventListener('click', _startStop);
    if (resetBtn)  resetBtn.addEventListener('click', _reset);
    if (skipBtn)   skipBtn.addEventListener('click', _skip);
    if (subjectEl) subjectEl.addEventListener('change', function() {
      _currentSubject = subjectEl.value;
    });

    // Mode tabs
    document.querySelectorAll('.timer-mode-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        if (_running) {
          app.toast('warning', 'Pause the timer first', 'Stop the current session before switching modes.');
          return;
        }
        _resetTimer(tab.dataset.mode);
        _setModeTab(tab.dataset.mode);
      });
    });

    // Init display
    _resetTimer('focus');
    _requestNotifPermission();

    // Update on settings change (duration may have changed)
    state.on('settings:change', function() {
      if (!_running) _resetTimer(_mode);
    });
  }

  return { init, onEnter };

}());
