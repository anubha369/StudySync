/* ========================================================
   StudySync — planner.js
   Weekly calendar view, add/edit/delete study sessions,
   subject management sidebar
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.planner = (function () {

  var u     = window.StudySync.utils;
  var state = window.StudySync.state;
  var app   = window.StudySync.app;

  var _weekAnchor = new Date();  // which week to show

  /* ─────────────────────────────────────────────────── */
  /* Render                                               */
  /* ─────────────────────────────────────────────────── */
  function render() {
    _renderWeekNav();
    _renderCalendar();
    _renderSubjectList();
    _renderWeekSummary();
  }

  /* ── Week navigation ────────────────────────────────── */
  function _renderWeekNav() {
    var el = document.getElementById('planner-week-label');
    if (!el) return;
    var week  = u.weekDates(_weekAnchor);
    var start = week[0];
    var end   = week[6];
    var same  = start.getMonth() === end.getMonth();
    var label = start.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) +
                ' – ' +
                end.toLocaleDateString(undefined, same ? { day: 'numeric' } : { month: 'long', day: 'numeric', year: 'numeric' });
    el.textContent = label;
  }

  /* ── Calendar grid ──────────────────────────────────── */
  function _renderCalendar() {
    var el = document.getElementById('planner-grid');
    if (!el) return;

    var sessions = state.get('sessions');
    var week     = u.weekDates(_weekAnchor);
    var todayStr = u.today();
    var days     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    // Hours to display: 07:00 – 22:00
    var startHour = 7;
    var endHour   = 22;
    var hours     = [];
    for (var h = startHour; h <= endHour; h++) hours.push(h);

    /* Column headers */
    var headerHtml = '<div class="time-col week-col-header" style="background:var(--surface-2);border-bottom:1px solid var(--border)"><span style="font-size:10px;color:var(--text-light)">GMT+5:30</span></div>';
    headerHtml += week.map(function(d, i) {
      var ds = u.toDateStr(d);
      var isToday = ds === todayStr;
      return [
        '<div class="week-col-header', isToday ? ' today' : '', '">',
          '<div class="day-name">', days[i], '</div>',
          '<div class="day-num">', d.getDate(), '</div>',
        '</div>'
      ].join('');
    }).join('');

    /* Time rows + day cells */
    var bodyRows = hours.map(function(h) {
      var timeLabel = (h < 10 ? '0' : '') + h + ':00';
      var row = '<div class="time-slot">' + timeLabel + '</div>';
      row += week.map(function(d) {
        var ds = u.toDateStr(d);
        // Find sessions that start in this hour
        var daySessions = sessions.filter(function(s) {
          return s.date === ds && parseInt(s.startTime, 10) === h;
        });
        var blocks = daySessions.map(function(s) {
          var startMins = _timeToMins(s.startTime);
          var endMins   = _timeToMins(s.endTime);
          var dur       = Math.max(endMins - startMins, 30);
          var topOffset = ((startMins - h * 60) / 60) * 60;
          var heightPx  = (dur / 60) * 60;
          return [
            '<div class="session-block" style="',
              'background:', s.color || '#4F46E5', ';',
              'top:', topOffset, 'px;',
              'height:', heightPx, 'px;',
            '" data-session-id="', s.id, '" title="', app.escapeHtml(s.subject), ' (', s.startTime, '–', s.endTime, ')">',
              '<div class="session-name">', app.escapeHtml(s.subject), '</div>',
              '<div class="session-time">', s.startTime, ' – ', s.endTime, '</div>',
            '</div>'
          ].join('');
        }).join('');

        return [
          '<div class="day-cell" data-date="', ds, '" data-hour="', h, '">',
            blocks,
          '</div>'
        ].join('');
      }).join('');
      return row;
    }).join('');

    el.innerHTML = [
      '<div class="week-grid-header">', headerHtml, '</div>',
      bodyRows
    ].join('');

    /* Attach click handlers */
    el.querySelectorAll('.day-cell').forEach(function(cell) {
      cell.addEventListener('click', function(e) {
        if (e.target.closest('.session-block')) return;
        openAddSessionModal(cell.dataset.date, cell.dataset.hour);
      });
    });

    el.querySelectorAll('.session-block').forEach(function(block) {
      block.addEventListener('click', function(e) {
        e.stopPropagation();
        openEditSessionModal(block.dataset.sessionId);
      });
    });
  }

  function _timeToMins(timeStr) {
    if (!timeStr) return 0;
    var parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
  }

  /* ── Subject list sidebar ────────────────────────────── */
  function _renderSubjectList() {
    var el = document.getElementById('planner-subjects');
    if (!el) return;
    var subjects = state.get('subjects');
    var sessions = state.get('sessions');
    var week     = u.weekDates(_weekAnchor);
    var weekDates = week.map(function(d){ return u.toDateStr(d); });

    if (!subjects.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-sm)">No subjects yet. Add one in Settings.</p>';
      return;
    }

    el.innerHTML = subjects.map(function(s) {
      var weekSessions = sessions.filter(function(sess) {
        return sess.subject === s.name && weekDates.includes(sess.date);
      });
      var totalMins = u.sum(weekSessions, function(sess){ return sess.duration || 0; });
      return [
        '<div class="subject-item">',
          '<span class="subject-dot" style="background:', s.color, '"></span>',
          '<span class="subject-name">', app.escapeHtml(s.name), '</span>',
          '<span class="subject-hours">', u.formatDuration(totalMins), '</span>',
        '</div>'
      ].join('');
    }).join('');
  }

  /* ── Week summary ────────────────────────────────────── */
  function _renderWeekSummary() {
    var el = document.getElementById('planner-week-summary');
    var cardEl = document.getElementById('planner-week-summary-card');
    var sessions = state.get('sessions');
    var week     = u.weekDates(_weekAnchor);
    var weekDates = week.map(function(d){ return u.toDateStr(d); });
    var weekSessions = sessions.filter(function(s){ return weekDates.includes(s.date); });
    var totalMins = u.sum(weekSessions, function(s){ return s.duration || 0; });
    var text = weekSessions.length + ' sessions · ' + u.formatDuration(totalMins) + ' this week';
    if (el) el.textContent = text;
    if (cardEl) cardEl.textContent = text;
  }

  /* ─────────────────────────────────────────────────── */
  /* Add / Edit Session Modal                             */
  /* ─────────────────────────────────────────────────── */
  function openAddSessionModal(date, hour) {
    var defaultHour = parseInt(hour, 10) || 9;
    var startTime = (defaultHour < 10 ? '0' : '') + defaultHour + ':00';
    var endHour   = defaultHour + 1;
    var endTime   = (endHour < 10 ? '0' : '') + endHour + ':00';
    _openSessionModal(null, { date: date, startTime: startTime, endTime: endTime });
  }

  function openEditSessionModal(id) {
    var session = state.get('sessions').find(function(s){ return s.id === id; });
    if (session) _openSessionModal(session, null);
  }

  function _openSessionModal(session, defaults) {
    var subjects = state.get('subjects');
    var isEdit   = !!session;
    var def = defaults || {};
    var curDate      = isEdit ? session.date      : (def.date || u.today());
    var curStart     = isEdit ? session.startTime : (def.startTime || '09:00');
    var curEnd       = isEdit ? session.endTime   : (def.endTime || '10:00');
    var curNotes     = isEdit ? (session.notes || '') : '';
    var curSubject   = isEdit ? session.subject   : (subjects[0] ? subjects[0].name : '');

    var subjectOptions = subjects.map(function(s) {
      var sel = curSubject === s.name ? ' selected' : '';
      return '<option value="' + app.escapeHtml(s.name) + '"' + sel + '>' + app.escapeHtml(s.name) + '</option>';
    }).join('');

    var body = [
      '<div class="form-group">',
        '<label class="form-label">Subject <span>*</span></label>',
        '<select id="sess-subject" class="form-control">',
          subjectOptions || '<option value="">— Add subjects in Settings —</option>',
        '</select>',
      '</div>',
      '<div class="form-group">',
        '<label class="form-label">Date <span>*</span></label>',
        '<input id="sess-date" type="date" class="form-control" value="', curDate, '">',
      '</div>',
      '<div class="form-row">',
        '<div class="form-group">',
          '<label class="form-label">Start Time</label>',
          '<input id="sess-start" type="time" class="form-control" value="', curStart, '">',
        '</div>',
        '<div class="form-group">',
          '<label class="form-label">End Time</label>',
          '<input id="sess-end" type="time" class="form-control" value="', curEnd, '">',
        '</div>',
      '</div>',
      '<div class="form-group">',
        '<label class="form-label">Notes</label>',
        '<input id="sess-notes" type="text" class="form-control" placeholder="e.g. Chapter 5 review" value="', app.escapeHtml(curNotes), '">',
      '</div>'
    ].join('');

    var footer = [
      isEdit ? '<button class="btn btn-danger btn-sm" id="sess-delete">Delete</button>' : '',
      '<button class="btn btn-secondary" id="sess-cancel">Cancel</button>',
      '<button class="btn btn-primary" id="sess-save">',
        app.icon('check'), isEdit ? ' Save' : ' Add Session',
      '</button>'
    ].join('');

    app.openModal({
      title: isEdit ? 'Edit Study Session' : 'New Study Session',
      body:  body,
      footer: footer
    });

    document.getElementById('sess-cancel').addEventListener('click', app.closeModal);

    document.getElementById('sess-save').addEventListener('click', function() {
      _saveSession(session ? session.id : null);
    });

    if (isEdit) {
      document.getElementById('sess-delete').addEventListener('click', function() {
        app.closeModal();
        app.confirm('Delete Session', 'Remove this study session?', function() {
          state.deleteSession(session.id);
          app.toast('info', 'Session removed');
          render();
        }, true);
      });
    }
  }

  function _saveSession(editId) {
    var subjectEl = document.getElementById('sess-subject');
    var dateEl    = document.getElementById('sess-date');
    var startEl   = document.getElementById('sess-start');
    var endEl     = document.getElementById('sess-end');
    var notesEl   = document.getElementById('sess-notes');

    var subject = subjectEl.value;
    var date    = dateEl.value;
    var start   = startEl.value;
    var end     = endEl.value;

    if (!subject || !date || !start || !end) {
      app.toast('warning', 'Please fill in all required fields');
      return;
    }
    if (isNaN(Date.parse(date))) {
      app.toast('warning', 'Please enter a valid date');
      return;
    }
    if (start >= end) {
      app.toast('warning', 'End time must be after start time');
      return;
    }

    var subjects = state.get('subjects');
    var subj     = subjects.find(function(s){ return s.name === subject; });
    var color    = subj ? subj.color : '#4F46E5';
    var startMins = _timeToMins(start);
    var endMins   = _timeToMins(end);
    var duration  = endMins - startMins;

    var data = {
      subject:   subject,
      date:      date,
      startTime: start,
      endTime:   end,
      duration:  duration,
      notes:     notesEl.value,
      color:     color
    };

    if (editId) {
      state.updateSession(editId, data);
      app.toast('success', 'Session updated');
    } else {
      state.addSession(Object.assign({ id: u.generateId() }, data));
      app.toast('success', 'Session added!', subject + ' · ' + start + '–' + end);
    }

    app.closeModal();
    render();
  }

  /* ─────────────────────────────────────────────────── */
  /* Init                                                  */
  /* ─────────────────────────────────────────────────── */
  function init() {
    var prevBtn = document.getElementById('planner-prev');
    var nextBtn = document.getElementById('planner-next');
    var todayBtn = document.getElementById('planner-today');
    var addBtn  = document.getElementById('btn-add-session');

    if (prevBtn) prevBtn.addEventListener('click', function() {
      _weekAnchor = u.addDays(_weekAnchor, -7);
      render();
    });
    if (nextBtn) nextBtn.addEventListener('click', function() {
      _weekAnchor = u.addDays(_weekAnchor, 7);
      render();
    });
    if (todayBtn) todayBtn.addEventListener('click', function() {
      _weekAnchor = new Date();
      render();
    });
    if (addBtn) addBtn.addEventListener('click', function() {
      openAddSessionModal(u.today(), 9);
    });

    state.on('sessions:change', function() {
      if (document.getElementById('page-planner').classList.contains('active')) render();
    });
  }

  return { init, render, openAddSessionModal };

}());
