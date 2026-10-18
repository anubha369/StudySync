/* ========================================================
   StudySync — analytics.js
   Charts: tasks by subject (donut), study hours per day
   (bar chart), task completion over time, heatmap.
   Pure SVG/CSS – no external charting library needed.
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.analytics = (function () {

  var u     = window.StudySync.utils;
  var state = window.StudySync.state;
  var app   = window.StudySync.app;

  /* ─────────────────────────────────────────────────── */
  /* Render                                               */
  /* ─────────────────────────────────────────────────── */
  function render() {
    var tasks    = state.get('tasks');
    var timerLog = state.get('timerLog');
    var sessions = state.get('sessions');
    var subjects = state.get('subjects');

    _renderSummaryStats(tasks, timerLog);
    _renderTasksBySubject(tasks, subjects);
    _renderStudyHoursBar(timerLog);
    _renderCompletionRate(tasks);
    _renderHeatmap(timerLog);
    _renderTopSubjects(timerLog, subjects);
  }

  /* ── Summary stats row ──────────────────────────────── */
  function _renderSummaryStats(tasks, timerLog) {
    var el = document.getElementById('analytics-stats');
    if (!el) return;

    var done      = tasks.filter(function(t){ return t.status === 'done'; }).length;
    var total     = tasks.length;
    var pct       = total ? Math.round(done / total * 100) : 0;
    var totalFocus = u.sum(timerLog, function(e){ return e.duration || 0; });
    var sessions7  = timerLog.filter(function(e){
      return u.daysUntil(e.date) >= -7 && u.daysUntil(e.date) <= 0;
    });
    var focusThisWeek = u.sum(sessions7, function(e){ return e.duration || 0; });

    el.innerHTML = [
      _anStat(done + '/' + total, 'Tasks Completed', 'tasks', 'primary'),
      _anStat(pct + '%',           'Completion Rate',  'target', 'accent'),
      _anStat(u.formatHours(totalFocus), 'Total Focus Time', 'timer', 'success'),
      _anStat(u.formatHours(focusThisWeek), 'This Week',    'flame', 'warning')
    ].join('');
  }

  function _anStat(value, label, iconName, cls) {
    return [
      '<div class="card stat-card">',
        '<div class="stat-card-header">',
          '<div class="stat-icon ', cls, '">', app.icon(iconName, 22), '</div>',
        '</div>',
        '<div class="stat-value">', app.escapeHtml(String(value)), '</div>',
        '<div class="stat-label">', app.escapeHtml(label), '</div>',
      '</div>'
    ].join('');
  }

  /* ── Donut chart: tasks by subject ─────────────────── */
  function _renderTasksBySubject(tasks, subjects) {
    var el = document.getElementById('chart-tasks-subject');
    if (!el) return;

    var counts = {};
    tasks.forEach(function(t) {
      if (t.subject) counts[t.subject] = (counts[t.subject] || 0) + 1;
    });
    var entries = Object.keys(counts).map(function(name) {
      var subj  = subjects.find(function(s){ return s.name === name; });
      return { name: name, count: counts[name], color: subj ? subj.color : '#4F46E5' };
    }).sort(function(a,b){ return b.count - a.count; });

    var total = u.sum(entries, function(e){ return e.count; });

    if (!total) {
      el.innerHTML = '<div class="empty-state" style="padding:32px"><p>No tasks with subjects yet.</p></div>';
      return;
    }

    // Build SVG donut (scaled cleanly within 180x180 viewBox)
    var r = 68; var cx = 90; var cy = 90;
    var circumference = 2 * Math.PI * r;
    var offset = 0;
    var slices = entries.map(function(e) {
      var pct  = e.count / total;
      var len  = pct * circumference;
      var gap  = 2;
      var slice = [
        '<circle cx="', cx, '" cy="', cy, '" r="', r, '"',
          ' fill="none"',
          ' stroke="', e.color, '"',
          ' stroke-width="24"',
          ' stroke-dasharray="', Math.max(len - gap, 0), ' ', circumference - Math.max(len - gap, 0), '"',
          ' stroke-dashoffset="', -(offset * circumference) + (circumference * 0.25), '"',
          ' style="transition:stroke-dasharray 0.6s ease"',
        '/>'
      ].join('');
      offset += pct;
      return slice;
    }).join('');

    var legend = entries.map(function(e) {
      var pct = Math.round(e.count / total * 100);
      return [
        '<div class="legend-item">',
          '<span class="legend-dot" style="background:', e.color, '"></span>',
          '<span class="legend-label">', app.escapeHtml(e.name), '</span>',
          '<span class="legend-value">', e.count, ' (', pct, '%)</span>',
        '</div>'
      ].join('');
    }).join('');

    el.innerHTML = [
      '<div class="chart-row">',
        '<div class="donut-chart">',
          '<svg class="donut-svg" viewBox="0 0 180 180">',
            '<circle cx="', cx, '" cy="', cy, '" r="', r, '" fill="none" stroke="var(--surface-2)" stroke-width="24"/>',
            slices,
          '</svg>',
          '<div class="donut-center">',
            '<div class="donut-center-value">', total, '</div>',
            '<div class="donut-center-label">Tasks</div>',
          '</div>',
        '</div>',
        '<div class="chart-legend">', legend, '</div>',
      '</div>'
    ].join('');
  }

  /* ── Bar chart: study hours per day (last 7 days) ──── */
  function _renderStudyHoursBar(timerLog) {
    var el = document.getElementById('chart-study-hours');
    if (!el) return;

    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = u.addDays(new Date(), -i);
      days.push({ date: u.toDateStr(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }) });
    }

    var maxMins = 0;
    var data = days.map(function(day) {
      var dayLog = timerLog.filter(function(e){ return e.date === day.date; });
      var mins   = u.sum(dayLog, function(e){ return e.duration || 0; });
      if (mins > maxMins) maxMins = mins;
      return { label: day.label, mins: mins };
    });

    maxMins = Math.max(maxMins, 60);
    var maxHeight = 150;

    var bars = data.map(function(d) {
      var height = maxMins > 0 ? Math.round((d.mins / maxMins) * maxHeight) : 0;
      var hrs    = d.mins >= 60 ? Math.floor(d.mins / 60) + 'h' + (d.mins % 60 ? (d.mins % 60) + 'm' : '') : (d.mins + 'm');
      return [
        '<div class="bar-group">',
          '<div class="bar-value">', d.mins > 0 ? hrs : '', '</div>',
          '<div class="bar-wrap">',
            '<div class="bar" style="height:', height, 'px" title="', d.label, ': ', hrs || '0m', '"></div>',
          '</div>',
          '<div class="bar-label">', app.escapeHtml(d.label), '</div>',
        '</div>'
      ].join('');
    }).join('');

    el.innerHTML = [
      '<div class="bar-chart">', bars, '</div>',
      '<div style="text-align:center;font-size:var(--text-xs);color:var(--text-muted);margin-top:8px">Study hours (last 7 days)</div>'
    ].join('');
  }

  /* ── Completion rate card ────────────────────────────── */
  function _renderCompletionRate(tasks) {
    var el = document.getElementById('chart-completion');
    if (!el) return;

    var byPriority = {
      high:   { done: 0, total: 0 },
      medium: { done: 0, total: 0 },
      low:    { done: 0, total: 0 }
    };

    tasks.forEach(function(t) {
      var p = t.priority || 'low';
      if (!byPriority[p]) byPriority[p] = { done: 0, total: 0 };
      byPriority[p].total++;
      if (t.status === 'done') byPriority[p].done++;
    });

    var colors   = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
    var rows = ['high', 'medium', 'low'].map(function(p) {
      var data = byPriority[p];
      var pct  = data.total ? Math.round(data.done / data.total * 100) : 0;
      return [
        '<div style="margin-bottom:16px">',
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px">',
            '<span style="font-size:var(--text-sm);font-weight:500;color:var(--text)">', u.capitalize(p), ' Priority</span>',
            '<span style="font-size:var(--text-sm);color:var(--text-muted)">', data.done, '/', data.total, ' · ', pct, '%</span>',
          '</div>',
          '<div class="progress-bar">',
            '<div class="progress-fill" style="width:', pct, '%;background:', colors[p], '"></div>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');

    el.innerHTML = rows || '<p style="color:var(--text-muted);font-size:var(--text-sm)">No tasks yet.</p>';
  }

  /* ── Heatmap: last 4 weeks ─────────────────────────── */
  function _renderHeatmap(timerLog) {
    var el = document.getElementById('chart-heatmap');
    if (!el) return;

    var byDate = {};
    timerLog.forEach(function(e) {
      if (!byDate[e.date]) byDate[e.date] = 0;
      byDate[e.date] += (e.duration || 0);
    });

    // Last 28 days
    var cells = '';
    var months = [];
    for (var i = 27; i >= 0; i--) {
      var d    = u.addDays(new Date(), -i);
      var ds   = u.toDateStr(d);
      var mins = byDate[ds] || 0;
      var level = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4;
      cells += '<div class="heatmap-cell" data-level="' + level + '" title="' + ds + ': ' + u.formatDuration(mins) + '"></div>';
    }

    var legend = [
      '<div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:var(--text-xs);color:var(--text-muted)">',
        'Less',
        '<div class="heatmap-cell" data-level="0" style="width:16px;height:16px"></div>',
        '<div class="heatmap-cell" data-level="1" style="width:16px;height:16px"></div>',
        '<div class="heatmap-cell" data-level="2" style="width:16px;height:16px"></div>',
        '<div class="heatmap-cell" data-level="3" style="width:16px;height:16px"></div>',
        '<div class="heatmap-cell" data-level="4" style="width:16px;height:16px"></div>',
        'More',
      '</div>'
    ].join('');

    el.innerHTML = '<div class="heatmap-grid">' + cells + '</div>' + legend;
  }

  /* ── Top subjects by focus time ─────────────────────── */
  function _renderTopSubjects(timerLog, subjects) {
    var el = document.getElementById('analytics-top-subjects');
    if (!el) return;

    var bySubject = {};
    timerLog.forEach(function(e) {
      if (!e.subject) return;
      if (!bySubject[e.subject]) bySubject[e.subject] = 0;
      bySubject[e.subject] += (e.duration || 0);
    });

    var entries = Object.keys(bySubject).map(function(name) {
      var subj  = subjects.find(function(s){ return s.name === name; });
      return { name: name, mins: bySubject[name], color: subj ? subj.color : '#4F46E5' };
    }).sort(function(a,b){ return b.mins - a.mins; });

    var maxMins = entries.length ? entries[0].mins : 1;

    if (!entries.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-sm);padding:8px 0">Complete focus sessions to see data here.</p>';
      return;
    }

    el.innerHTML = entries.slice(0, 6).map(function(e) {
      var pct = Math.round(e.mins / maxMins * 100);
      return [
        '<div style="margin-bottom:14px">',
          '<div style="display:flex;justify-content:space-between;margin-bottom:5px">',
            '<span style="font-size:var(--text-sm);font-weight:500;color:var(--text)">', app.escapeHtml(e.name), '</span>',
            '<span style="font-size:var(--text-xs);color:var(--text-muted)">', u.formatDuration(e.mins), '</span>',
          '</div>',
          '<div class="progress-bar">',
            '<div class="progress-fill" style="width:', pct, '%;background:', e.color, '"></div>',
          '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  /* ─────────────────────────────────────────────────── */
  /* Init                                                  */
  /* ─────────────────────────────────────────────────── */
  function init() {
    state.on('change', function() {
      if (document.getElementById('page-analytics').classList.contains('active')) {
        render();
      }
    });
  }

  return { init, render };

}());
