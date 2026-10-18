/* ========================================================
   StudySync — storage.js
   Safe localStorage read/write, sample data, reset, export
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.storage = (function () {

  var u = window.StudySync.utils;

  var KEYS = {
    tasks:    'ss_tasks',
    sessions: 'ss_sessions',
    subjects: 'ss_subjects',
    settings: 'ss_settings',
    timerLog: 'ss_timerLog',
    seeded:   'ss_seeded'
  };

  /* ── Safe read/write ───────────────────────────────── */
  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('StudySync storage read error:', key, e);
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('StudySync storage write error:', key, e);
      return false;
    }
  }

  /* ── Typed accessors ───────────────────────────────── */
  function getTasks()    { return read(KEYS.tasks)    || []; }
  function getSessions() { return read(KEYS.sessions) || []; }
  function getSubjects() { return read(KEYS.subjects) || []; }
  function getTimerLog() { return read(KEYS.timerLog) || []; }

  function getSettings() {
    var defaults = {
      darkMode:         false,
      pomodoroDuration: 25,
      shortBreak:       5,
      longBreak:        15,
      pomodorosPerLong: 4,
      autoStartBreak:   false,
      notifications:    true,
      accent:           '#4F46E5',
      name:             'Student'
    };
    var saved = read(KEYS.settings) || {};
    return Object.assign({}, defaults, saved);
  }

  function saveTasks(tasks)       { write(KEYS.tasks,    tasks); }
  function saveSessions(sessions) { write(KEYS.sessions, sessions); }
  function saveSubjects(subjects) { write(KEYS.subjects, subjects); }
  function saveSettings(s)        { write(KEYS.settings, s); }
  function saveTimerLog(log)      { write(KEYS.timerLog, log); }

  /* ── Sample / seed data ────────────────────────────── */
  function seedData() {
    var t = u.today;
    var tid = u.generateId;
    var add = u.addDays;
    var fmt = u.toDateStr;

    var subjects = [
      { id: tid(), name: 'Mathematics',      color: '#4F46E5', creditHours: 4 },
      { id: tid(), name: 'Computer Science', color: '#7C3AED', creditHours: 3 },
      { id: tid(), name: 'Physics',          color: '#0EA5E9', creditHours: 3 },
      { id: tid(), name: 'Literature',       color: '#10B981', creditHours: 2 },
      { id: tid(), name: 'History',          color: '#F59E0B', creditHours: 2 }
    ];

    var now = new Date();

    var tasks = [
      {
        id: tid(), title: 'Complete calculus problem set',
        subject: 'Mathematics', priority: 'high',
        dueDate: fmt(add(now, 2)), status: 'in-progress',
        notes: 'Chapters 5–7, integration by parts.',
        createdAt: new Date().toISOString(), completedAt: null
      },
      {
        id: tid(), title: 'Read Ch. 3 of "1984"',
        subject: 'Literature', priority: 'medium',
        dueDate: fmt(add(now, 4)), status: 'todo',
        notes: 'Focus on dystopian themes.',
        createdAt: new Date().toISOString(), completedAt: null
      },
      {
        id: tid(), title: 'Data structures assignment',
        subject: 'Computer Science', priority: 'high',
        dueDate: fmt(add(now, 1)), status: 'todo',
        notes: 'Implement a balanced BST.',
        createdAt: new Date().toISOString(), completedAt: null
      },
      {
        id: tid(), title: 'Physics lab report',
        subject: 'Physics', priority: 'high',
        dueDate: fmt(add(now, -1)), status: 'todo',
        notes: 'Pendulum experiment analysis.',
        createdAt: new Date().toISOString(), completedAt: null
      },
      {
        id: tid(), title: 'History essay outline',
        subject: 'History', priority: 'low',
        dueDate: fmt(add(now, 7)), status: 'todo',
        notes: 'Causes of WWI.',
        createdAt: new Date().toISOString(), completedAt: null
      },
      {
        id: tid(), title: 'Review lecture notes — Week 5',
        subject: 'Computer Science', priority: 'medium',
        dueDate: fmt(add(now, 3)), status: 'done',
        notes: '',
        createdAt: new Date().toISOString(), completedAt: new Date().toISOString()
      },
      {
        id: tid(), title: 'Solve practice exam problems',
        subject: 'Mathematics', priority: 'medium',
        dueDate: fmt(add(now, 5)), status: 'done',
        notes: 'Use past 3 years\' papers.',
        createdAt: new Date().toISOString(), completedAt: new Date().toISOString()
      },
      {
        id: tid(), title: 'Watch supplemental physics videos',
        subject: 'Physics', priority: 'low',
        dueDate: fmt(add(now, 6)), status: 'todo',
        notes: '3Blue1Brown series on waves.',
        createdAt: new Date().toISOString(), completedAt: null
      }
    ];

    /* Planner sessions: anchored to current week so calendar is always full */
    var week = u.weekDates(now);
    var mon = week[0];
    var tue = week[1];
    var wed = week[2];
    var thu = week[3];
    var fri = week[4];
    var sat = week[5];
    var sun = week[6];

    var sessions = [
      {
        id: tid(), subject: 'Mathematics',
        date: fmt(mon), startTime: '09:00', endTime: '11:00',
        duration: 120, notes: 'Calculus review & problem set', color: '#4F46E5'
      },
      {
        id: tid(), subject: 'Computer Science',
        date: fmt(mon), startTime: '14:00', endTime: '15:30',
        duration: 90, notes: 'Data structures & algorithm practice', color: '#7C3AED'
      },
      {
        id: tid(), subject: 'Physics',
        date: fmt(tue), startTime: '10:00', endTime: '11:30',
        duration: 90, notes: 'Wave motion & pendulum experiment', color: '#0EA5E9'
      },
      {
        id: tid(), subject: 'Literature',
        date: fmt(tue), startTime: '15:00', endTime: '16:30',
        duration: 90, notes: 'Critical essay annotations', color: '#10B981'
      },
      {
        id: tid(), subject: 'Mathematics',
        date: fmt(wed), startTime: '09:00', endTime: '10:30',
        duration: 90, notes: 'Integration techniques & theorems', color: '#4F46E5'
      },
      {
        id: tid(), subject: 'Computer Science',
        date: fmt(wed), startTime: '13:00', endTime: '15:00',
        duration: 120, notes: 'BST implementation & code review', color: '#7C3AED'
      },
      {
        id: tid(), subject: 'History',
        date: fmt(thu), startTime: '11:00', endTime: '12:30',
        duration: 90, notes: 'Primary sources document analysis', color: '#F59E0B'
      },
      {
        id: tid(), subject: 'Physics',
        date: fmt(thu), startTime: '14:00', endTime: '15:30',
        duration: 90, notes: 'Electromagnetism problem solving', color: '#0EA5E9'
      },
      {
        id: tid(), subject: 'Literature',
        date: fmt(fri), startTime: '10:00', endTime: '11:30',
        duration: 90, notes: 'Dystopian themes seminar prep', color: '#10B981'
      },
      {
        id: tid(), subject: 'Mathematics',
        date: fmt(fri), startTime: '14:00', endTime: '15:30',
        duration: 90, notes: 'Weekly review & practice test', color: '#4F46E5'
      }
    ];

    // If today is a weekend, add a weekend study block so today's block list isn't empty
    if (now.getDay() === 6) {
      sessions.push({
        id: tid(), subject: 'Computer Science',
        date: fmt(sat), startTime: '10:00', endTime: '11:30',
        duration: 90, notes: 'Weekend coding project', color: '#7C3AED'
      });
    } else if (now.getDay() === 0) {
      sessions.push({
        id: tid(), subject: 'Mathematics',
        date: fmt(sun), startTime: '14:00', endTime: '15:30',
        duration: 90, notes: 'Weekly recap', color: '#4F46E5'
      });
    }

    /* Timer log: rich 28-day history for activity heatmap + today's sessions */
    var timerLog = [
      {
        id:       tid(),
        date:     fmt(now),
        subject:  'Computer Science',
        duration: 25,
        type:     'pomodoro',
        endTime:  '09:45:00'
      },
      {
        id:       tid(),
        date:     fmt(now),
        subject:  'Mathematics',
        duration: 25,
        type:     'pomodoro',
        endTime:  '10:30:00'
      }
    ];

    for (var i = 1; i < 28; i++) {
      var d = add(now, -i);
      var dayOfWeek = d.getDay();
      var sessionCount = (dayOfWeek === 0 || dayOfWeek === 6)
        ? (i % 2 === 0 ? 1 : 0)
        : (i % 3 === 0 ? 3 : (i % 2 === 0 ? 2 : 1));

      for (var j = 0; j < sessionCount; j++) {
        timerLog.push({
          id:       tid(),
          date:     fmt(d),
          subject:  subjects[(i + j) % subjects.length].name,
          duration: 25,
          type:     'pomodoro',
          endTime:  (13 + j) + ':30:00'
        });
      }
    }

    write(KEYS.subjects, subjects);
    write(KEYS.tasks,    tasks);
    write(KEYS.sessions, sessions);
    write(KEYS.timerLog, timerLog);
    write(KEYS.seeded,   true);
  }

  function isSeeded() {
    return !!read(KEYS.seeded);
  }

  /* ── Reset all data ────────────────────────────────── */
  function resetAll() {
    Object.values(KEYS).forEach(function (k) {
      localStorage.removeItem(k);
    });
  }

  /* ── Export JSON ───────────────────────────────────── */
  function exportJSON() {
    var data = {
      exportedAt: new Date().toISOString(),
      tasks:      getTasks(),
      sessions:   getSessions(),
      subjects:   getSubjects(),
      timerLog:   getTimerLog(),
      settings:   getSettings()
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'studysync-export-' + u.today() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ── Import JSON ───────────────────────────────────── */
  function importJSON(jsonStr) {
    var data = JSON.parse(jsonStr);
    if (data.tasks)    write(KEYS.tasks,    data.tasks);
    if (data.sessions) write(KEYS.sessions, data.sessions);
    if (data.subjects) write(KEYS.subjects, data.subjects);
    if (data.timerLog) write(KEYS.timerLog, data.timerLog);
    if (data.settings) write(KEYS.settings, data.settings);
    write(KEYS.seeded, true);
  }

  return {
    KEYS,
    read, write,
    getTasks, getSessions, getSubjects, getTimerLog, getSettings,
    saveTasks, saveSessions, saveSubjects, saveSettings, saveTimerLog,
    seedData, isSeeded,
    resetAll, exportJSON, importJSON
  };

}());
