/* ========================================================
   StudySync — dashboard.js
   Welcome banner, stats, upcoming tasks, study sessions,
   weekly streak widget
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.dashboard = (function () {

  var u     = window.StudySync.utils;
  var state = window.StudySync.state;
  var app   = window.StudySync.app;

  var _productivityChart = null;

  function render() {
    var tasks    = state.get('tasks');
    var sessions = state.get('sessions');
    var timerLog = state.get('timerLog');
    var settings = state.get('settings');

    _renderWelcome(settings, tasks);
    _renderStats(tasks, sessions, timerLog);
    _renderProductivityChart(tasks, timerLog);
    _renderPriorities(tasks);
    _renderUpcoming(tasks);
    _renderTodaySessions(sessions);
    _renderStreak(timerLog);
    _renderRecentTasks(tasks);
  }

  /* ── Welcome banner ─────────────────────────────────── */
  function _renderWelcome(settings, tasks) {
    var el = document.getElementById('dash-welcome');
    if (!el) return;
    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var name = settings.name || 'Student';
    var pending   = tasks.filter(function(t){ return t.status !== 'done'; }).length;
    var overdue   = tasks.filter(function(t){ return t.status !== 'done' && u.isOverdue(t.dueDate); }).length;
    var dueToday  = tasks.filter(function(t){ return t.status !== 'done' && u.daysUntil(t.dueDate) === 0; }).length;

    var dateStr = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
    });

    var summary = pending > 0
      ? 'You have ' + pending + ' task' + (pending > 1 ? 's' : '') + ' pending' +
        (overdue > 0 ? ' (' + overdue + ' overdue)' : '') + '.'
      : 'All tasks completed! You are fully on track.';

    el.innerHTML = [
      '<div class="welcome-text">',
        '<div class="welcome-date">' + dateStr + '</div>',
        '<h2>' + greeting + ', ' + app.escapeHtml(name) + '</h2>',
        '<p class="welcome-summary">' + summary + '</p>',
      '</div>',
      '<div class="welcome-chips">',
        '<div class="welcome-chip chip-warning">',
          '<span class="chip-val">' + pending + '</span>',
          '<span class="chip-label">Pending</span>',
        '</div>',
        '<div class="welcome-chip chip-info">',
          '<span class="chip-val">' + dueToday + '</span>',
          '<span class="chip-label">Due Today</span>',
        '</div>',
        '<div class="welcome-chip chip-danger">',
          '<span class="chip-val">' + overdue + '</span>',
          '<span class="chip-label">Overdue</span>',
        '</div>',
      '</div>'
    ].join('');
  }

  /* ── Stats cards (5 in a row) ────────────────────────── */
  function _renderStats(tasks, sessions, timerLog) {
    var el = document.getElementById('dash-stats');
    if (!el) return;

    var total     = tasks.length;
    var done      = tasks.filter(function(t){ return t.status === 'done'; }).length;
    var pending   = tasks.filter(function(t){ return t.status !== 'done'; }).length;
    var overdue   = tasks.filter(function(t){ return u.isOverdue(t.dueDate); }).length;
    var pct       = total ? Math.round(done / total * 100) : 0;
    var todayLog  = timerLog.filter(function(e){ return e.date === u.today(); });
    var focusMins = u.sum(todayLog, function(e){ return e.duration || 0; });

    el.innerHTML = [
      _statCard('Total Tasks', total, 'layers', 'primary',
        '<div class="stat-progress-bar"><div class="stat-progress-fill" style="width:' + pct + '%;background:var(--primary)"></div></div><div class="stat-micro-caption">' + pct + '% completed</div>'),
      _statCard('Completed', done, 'check-circle', 'accent',
        '<div class="stat-micro-caption" style="color:var(--accent);font-weight:600">' + done + ' of ' + total + ' tasks finished</div>'),
      _statCard('Pending', pending, 'clock', 'warning',
        '<div class="stat-micro-caption" style="color:var(--warning-dark)">' + pending + ' tasks in queue</div>'),
      _statCard('Overdue', overdue, 'alert-circle', 'danger',
        '<div class="stat-micro-caption" style="color:' + (overdue > 0 ? 'var(--danger)' : 'var(--text-muted)') + '">' + (overdue > 0 ? 'Requires attention' : 'All deadlines met') + '</div>'),
      _statCard("Today's Study Time", u.formatDuration(focusMins), 'book', 'info',
        '<div class="stat-micro-caption" style="color:var(--info-dark)">' + todayLog.length + ' logged session' + (todayLog.length === 1 ? '' : 's') + '</div>')
    ].join('');
  }

  function _statCard(label, value, iconName, colorClass, extra) {
    return [
      '<div class="card stat-card">',
        '<div class="stat-card-header">',
          '<div class="stat-icon ' + colorClass + '">' + app.icon(iconName, 20) + '</div>',
        '</div>',
        '<div class="stat-value">' + app.escapeHtml(String(value)) + '</div>',
        '<div class="stat-label">' + app.escapeHtml(label) + '</div>',
        extra || '',
      '</div>'
    ].join('');
  }

  /* ── Weekly Productivity Chart (Chart.js) ───────────── */
  function _renderProductivityChart(tasks, timerLog) {
    var canvas = document.getElementById('dash-productivity-chart');
    if (!canvas || typeof window.Chart === 'undefined') return;

    var days = [];
    var labels = [];
    var focusHours = [];
    var tasksDone = [];

    var d = new Date();
    for (var i = 6; i >= 0; i--) {
      var date = new Date(d);
      date.setDate(d.getDate() - i);
      var dateStr = u.toDateStr(date);
      var dayName = date.toLocaleDateString(undefined, { weekday: 'short' });

      labels.push(dayName + ' ' + date.getDate());

      // Focus hours on this date
      var dayLog = timerLog.filter(function(e){ return e.date === dateStr; });
      var mins = u.sum(dayLog, function(e){ return e.duration || 0; });
      focusHours.push(Math.round((mins / 60) * 10) / 10);

      // Tasks completed on this date
      var doneCount = tasks.filter(function(t){
        return t.status === 'done' && t.completedAt && t.completedAt.startsWith(dateStr);
      }).length;
      tasksDone.push(doneCount);
    }

    if (_productivityChart) {
      _productivityChart.destroy();
      _productivityChart = null;
    }

    var ctx = canvas.getContext('2d');
    _productivityChart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Study Hours',
            data: focusHours,
            backgroundColor: '#4338CA',
            borderRadius: 4,
            maxBarThickness: 24
          },
          {
            label: 'Tasks Completed',
            data: tasksDone,
            backgroundColor: '#0D9488',
            borderRadius: 4,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              color: '#475467',
              font: { family: "'Inter', sans-serif", size: 12, weight: '500' }
            }
          },
          tooltip: {
            backgroundColor: '#101828',
            titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
            bodyFont: { family: "'Inter', sans-serif", size: 12 },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: {
              color: '#667085',
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#F2F4F7',
              drawBorder: false
            },
            ticks: {
              color: '#667085',
              font: { family: "'Inter', sans-serif", size: 11 },
              precision: 0
            }
          }
        }
      }
    });
  }

  /* ── Today's Priorities ──────────────────────────────── */
  function _renderPriorities(tasks) {
    var el = document.getElementById('dash-priorities');
    if (!el) return;

    var pending = tasks.filter(function(t){ return t.status !== 'done'; });
    var priorities = pending.filter(function(t){
      return t.priority === 'high' || u.daysUntil(t.dueDate) <= 1;
    });

    if (priorities.length < 4) {
      pending.forEach(function(t){
        if (priorities.length < 4 && priorities.indexOf(t) === -1) {
          priorities.push(t);
        }
      });
    }

    if (!priorities.length) {
      el.innerHTML = '<div class="empty-state" style="padding:24px 16px"><p style="color:var(--text-muted);font-size:var(--text-sm)">All caught up! No urgent tasks today.</p></div>';
      return;
    }

    var subjects = state.get('subjects');
    el.innerHTML = priorities.map(function(task) {
      var color = u.subjectColor(task.subject, subjects);
      var days = u.daysUntil(task.dueDate);
      var dueText = days === 0 ? 'Due today' : days < 0 ? Math.abs(days) + 'd overdue' : 'in ' + days + 'd';
      var dueClass = days < 0 ? 'overdue' : days <= 1 ? 'soon' : '';

      return [
        '<div class="priority-task-item">',
          '<div class="task-checkbox" onclick="StudySync.tasks._toggleDone(\'' + task.id + '\'); StudySync.dashboard.render();">',
            app.icon('check', 12),
          '</div>',
          '<div class="priority-task-info" onclick="StudySync.app.navigate(\'#/tasks\')">',
            '<div class="priority-task-title">' + app.escapeHtml(task.title) + '</div>',
            '<div class="priority-task-meta">',
              '<span class="priority-dot-chip" style="background:' + color + '"></span>',
              '<span>' + app.escapeHtml(task.subject || 'General') + '</span>',
              '<span class="badge badge-' + (task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success') + '">' + u.capitalize(task.priority) + '</span>',
            '</div>',
          '</div>',
          '<div class="upcoming-item-due ' + dueClass + '">' + dueText + '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  /* ── Upcoming tasks ─────────────────────────────────── */
  function _renderUpcoming(tasks) {
    var el = document.getElementById('dash-upcoming');
    if (!el) return;

    var upcoming = tasks
      .filter(function(t){ return t.status !== 'done' && t.dueDate; })
      .sort(function(a,b){ return a.dueDate.localeCompare(b.dueDate); })
      .slice(0, 6);

    if (!upcoming.length) {
      el.innerHTML = '<div class="empty-state" style="padding:32px 16px"><p style="color:var(--text-muted);font-size:var(--text-sm)">No upcoming tasks.</p></div>';
      return;
    }

    var subjects = state.get('subjects');
    el.innerHTML = upcoming.map(function(task) {
      var color  = u.subjectColor(task.subject, subjects);
      var days   = u.daysUntil(task.dueDate);
      var dueClass = days < 0 ? 'overdue' : days <= 2 ? 'soon' : '';
      var dueText = days === 0 ? 'Today' : days < 0 ? Math.abs(days) + 'd overdue' : 'in ' + days + 'd';
      return [
        '<div class="upcoming-item" onclick="StudySync.app.navigate(\'#/tasks\')">',
          '<span class="upcoming-item-dot" style="background:', color, '"></span>',
          '<div class="upcoming-item-info">',
            '<div class="upcoming-item-title">', app.escapeHtml(task.title), '</div>',
            '<div class="upcoming-item-meta">',
              app.escapeHtml(task.subject || 'No subject'), ' · ',
              '<span class="badge badge-', task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success', '">',
                u.capitalize(task.priority),
              '</span>',
            '</div>',
          '</div>',
          '<div class="upcoming-item-due ', dueClass, '">', dueText, '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  /* ── Today's sessions ───────────────────────────────── */
  function _renderTodaySessions(sessions) {
    var el = document.getElementById('dash-today-sessions');
    if (!el) return;

    var today = sessions.filter(function(s){ return s.date === u.today(); });
    if (!today.length) {
      el.innerHTML = [
        '<div class="empty-state" style="padding:24px 16px">',
          '<p style="color:var(--text-muted);font-size:var(--text-sm)">No study blocks today.</p>',
          '<button class="btn btn-primary btn-sm" onclick="StudySync.app.navigate(\'#/planner\')" style="margin-top:8px">',
            app.icon('plus', 13), ' Plan Session',
          '</button>',
        '</div>'
      ].join('');
      return;
    }

    var totalToday = u.sum(today, function(s){ return s.duration || 0; });

    el.innerHTML = [
      '<div style="padding:0 0 12px;font-size:var(--text-xs);color:var(--text-muted)">',
        today.length + ' block' + (today.length > 1 ? 's' : '') + ' · ' + u.formatDuration(totalToday) + ' total',
      '</div>'
    ].concat(today.map(function(s) {
      return [
        '<div class="upcoming-item">',
          '<span class="upcoming-item-dot" style="background:', s.color || '#4F46E5', '"></span>',
          '<div class="upcoming-item-info">',
            '<div class="upcoming-item-title">', app.escapeHtml(s.subject), '</div>',
            '<div class="upcoming-item-meta">', s.startTime, ' – ', s.endTime,
              s.notes ? ' · ' + app.escapeHtml(u.truncate(s.notes, 40)) : '',
            '</div>',
          '</div>',
          '<div class="upcoming-item-due">', u.formatDuration(s.duration), '</div>',
        '</div>'
      ].join('');
    })).join('');
  }

  /* ── Weekly streak ──────────────────────────────────── */
  function _calcStreak(timerLog) {
    var byDate = {};
    timerLog.forEach(function(e){ byDate[e.date] = true; });
    var streak = 0;
    var d = new Date();
    d.setHours(0,0,0,0);
    while (true) {
      var key = u.toDateStr(d);
      if (!byDate[key]) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function _renderStreak(timerLog) {
    var el = document.getElementById('dash-streak');
    if (!el) return;

    var byDate = {};
    timerLog.forEach(function(e){ byDate[e.date] = true; });
    var streak = _calcStreak(timerLog);
    var days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var week   = u.weekDates(new Date());
    var todayStr = u.today();

    el.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">',
        '<span style="font-size:var(--text-sm);color:var(--text-muted)">This week</span>',
        '<span style="font-size:var(--text-sm);font-weight:600;color:var(--primary)">', streak, ' day streak</span>',
      '</div>',
      '<div class="streak-row">',
      week.map(function(d, i) {
        var ds = u.toDateStr(d);
        var isToday   = ds === todayStr;
        var isActive  = !!byDate[ds] && !isToday;
        var cls = isToday ? 'today' : isActive ? 'active' : 'inactive';
        return [
          '<div class="streak-day">',
            '<div class="streak-day-dot ', cls, '">', isActive ? app.icon('check', 12) : (isToday ? '●' : ''), '</div>',
            '<div class="streak-day-label">', days[i], '</div>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>'
    ].join('');
  }

  /* ── Recent tasks ───────────────────────────────────── */
  function _renderRecentTasks(tasks) {
    var el = document.getElementById('dash-recent-tasks');
    if (!el) return;
    var recent = tasks
      .filter(function(t){ return t.status === 'done' && t.completedAt; })
      .sort(function(a,b){ return (b.completedAt || '').localeCompare(a.completedAt || ''); })
      .slice(0, 5);

    if (!recent.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-sm);padding:8px 0">Complete some tasks to see them here.</p>';
      return;
    }

    var subjects = state.get('subjects');
    el.innerHTML = recent.map(function(task) {
      var color = u.subjectColor(task.subject, subjects);
      return [
        '<div class="upcoming-item" style="border-color:var(--border)">',
          '<span class="upcoming-item-dot" style="background:', color, '"></span>',
          '<div class="upcoming-item-info">',
            '<div class="upcoming-item-title" style="text-decoration:line-through;color:var(--text-muted)">', app.escapeHtml(task.title), '</div>',
            '<div class="upcoming-item-meta">', app.escapeHtml(task.subject || '—'), '</div>',
          '</div>',
          '<div class="upcoming-item-due">', app.icon('check-circle', 14), '</div>',
        '</div>'
      ].join('');
    }).join('');
  }

  /* ── Init ────────────────────────────────────────────── */
  function init() {
    state.on('change', function() {
      if (document.getElementById('page-dashboard').classList.contains('active')) {
        render();
      }
    });
  }

  return { init, render };

}());
