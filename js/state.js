/* ========================================================
   StudySync — state.js
   Central app state with FastAPI backend as the source of truth,
   reactive pub/sub, normalized data models, optimistic UI updates,
   and robust offline/storage fallback.
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.state = (function () {

  function getApi() { return window.StudySync.api; }
  function getStorage() { return window.StudySync.storage; }

  /* ── Internal state ────────────────────────────────── */
  var _state = {
    tasks:    [],
    sessions: [],
    subjects: [
      { id: 'subj-1', name: 'Mathematics',      color: '#4F46E5', creditHours: 4 },
      { id: 'subj-2', name: 'Computer Science', color: '#7C3AED', creditHours: 3 },
      { id: 'subj-3', name: 'Physics',          color: '#0EA5E9', creditHours: 3 },
      { id: 'subj-4', name: 'Literature',       color: '#10B981', creditHours: 2 },
      { id: 'subj-5', name: 'History',          color: '#F59E0B', creditHours: 2 }
    ],
    timerLog: [],
    settings: {
      darkMode:         false,
      pomodoroDuration: 25,
      shortBreak:       5,
      longBreak:        15,
      pomodorosPerLong: 4,
      autoStartBreak:   false,
      notifications:    true,
      accent:           '#4F46E5',
      name:             'Student'
    },
    currentRoute: '#/dashboard',
    timerRunning: false
  };

  /* ── Listeners ─────────────────────────────────────── */
  var _listeners = {};

  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(function (f) { return f !== fn; });
  }

  function emit(event, data) {
    (_listeners[event] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.error('StudySync event error:', event, e); }
    });
  }

  /* ── Load from local storage ───────────────────────── */
  function load() {
    var stor = getStorage();
    if (stor) {
      _state.tasks    = (stor.getTasks() || []).map(_normalizeTask);
      _state.sessions = (stor.getSessions() || []).map(_normalizeSession);
      _state.subjects = stor.getSubjects() || _state.subjects;
      _state.timerLog = stor.getTimerLog() || [];
      _state.settings = stor.getSettings() || _state.settings;
    }
  }

  /* ── Getters ───────────────────────────────────────── */
  function get(key) { return _state[key]; }
  function getAll() { return Object.assign({}, _state); }

  /* ── Color / helper mapping ────────────────────────── */
  function getSubjectColor(subjName) {
    var s = _state.subjects.find(function (sub) { return sub.name === subjName; });
    return s ? s.color : '#4F46E5';
  }

  /* ── Normalize backend Task -> frontend Task ───────── */
  function _normalizeTask(t) {
    var isDone = (t.status === 'completed' || t.status === 'done');
    return {
      id:          t.id,
      title:       t.title,
      subject:     t.subject,
      description: t.description || t.notes || '',
      notes:       t.description || t.notes || '',
      dueDate:     t.due_date || t.dueDate,
      due_date:    t.due_date || t.dueDate,
      priority:    t.priority || 'medium',
      status:      isDone ? 'done' : 'todo',
      statusRaw:   t.status,
      completedAt: t.completed_at || t.completedAt || null,
      createdAt:   t.created_at || t.createdAt || new Date().toISOString(),
      updatedAt:   t.updated_at || t.updatedAt || new Date().toISOString()
    };
  }

  /* ── Normalize backend Session -> frontend Session ──── */
  function _normalizeSession(s) {
    var start = s.start_time || s.startTime || '09:00';
    var dur   = s.duration_minutes || s.duration || 45;
    
    // Compute end time if not given
    var parts = start.split(':');
    var h = parseInt(parts[0], 10) || 9;
    var m = parseInt(parts[1], 10) || 0;
    var totalEndMins = h * 60 + m + dur;
    var endH = Math.floor(totalEndMins / 60) % 24;
    var endM = totalEndMins % 60;
    var endStr = (endH < 10 ? '0' : '') + endH + ':' + (endM < 10 ? '0' : '') + endM;

    return {
      id:              s.id,
      title:           s.title || (s.subject + ' Study Session'),
      subject:         s.subject,
      date:            s.date,
      startTime:       start,
      endTime:         s.endTime || endStr,
      duration:        dur,
      durationMinutes: dur,
      completed:       !!s.completed,
      notes:           s.title || s.notes || '',
      color:           getSubjectColor(s.subject)
    };
  }

  /* ── Normalize Focus Session -> frontend Timer Log ─── */
  function _normalizeFocus(f) {
    var endTimeStr = '';
    if (f.completed_at) {
      try {
        var dt = new Date(f.completed_at);
        endTimeStr = dt.toTimeString().slice(0, 8);
      } catch (e) {
        endTimeStr = '12:00:00';
      }
    }
    return {
      id:       f.id,
      date:     f.local_date || (f.completed_at ? f.completed_at.slice(0, 10) : ''),
      subject:  f.mode === 'focus' ? 'Focus Session' : (f.mode === 'short_break' ? 'Short Break' : 'Long Break'),
      duration: f.duration_minutes || 25,
      type:     f.mode === 'focus' ? 'pomodoro' : f.mode,
      endTime:  endTimeStr
    };
  }

  /* ── Sync all data from backend ────────────────────── */
  async function syncFromBackend() {
    var api = getApi();
    if (!api || !api.getToken()) return;

    try {
      // 1. Load Profile & Settings
      var profile = await api.profile.get();
      if (profile) {
        _state.settings.name = profile.display_name || 'Student';
        _state.settings.darkMode = (profile.theme === 'dark');
        _state.settings.college = profile.college || '';
        _state.settings.course = profile.course || '';
        _state.settings.year = profile.year || '';
        _state.settings.avatar = profile.avatar || null;
      }

      // 2. Load Tasks
      var rawTasks = await api.tasks.list();
      _state.tasks = (rawTasks || []).map(_normalizeTask);

      // 3. Load Sessions
      var rawSessions = await api.sessions.list();
      _state.sessions = (rawSessions || []).map(_normalizeSession);

      // 4. Load Focus History
      var rawFocus = await api.focus.getHistory();
      _state.timerLog = (rawFocus || []).map(_normalizeFocus);

      // Dynamically extract distinct subjects
      var foundSubjects = {};
      _state.tasks.forEach(function (t) { if (t.subject) foundSubjects[t.subject] = true; });
      _state.sessions.forEach(function (s) { if (s.subject) foundSubjects[s.subject] = true; });

      var defaultColors = ['#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
      var colorIdx = 0;
      Object.keys(foundSubjects).forEach(function (name) {
        if (!_state.subjects.some(function (s) { return s.name === name; })) {
          _state.subjects.push({
            id: 'subj-' + Math.random().toString(36).substr(2, 6),
            name: name,
            color: defaultColors[colorIdx % defaultColors.length],
            creditHours: 3
          });
          colorIdx++;
        }
      });

      // Update storage cache
      var stor = getStorage();
      if (stor) {
        stor.saveTasks(_state.tasks);
        stor.saveSessions(_state.sessions);
        stor.saveSubjects(_state.subjects);
        stor.saveTimerLog(_state.timerLog);
        stor.saveSettings(_state.settings);
      }

      emit('tasks:change', _state.tasks);
      emit('sessions:change', _state.sessions);
      emit('timerLog:change', _state.timerLog);
      emit('settings:change', _state.settings);
      emit('change', _state);

    } catch (err) {
      console.error('Failed to sync state from backend:', err);
      throw err;
    }
  }

  /* ── Task mutations ────────────────────────────────── */
  async function addTask(taskData) {
    var tempId = taskData.id || ('tmp-' + Date.now());
    var normalized = _normalizeTask(Object.assign({}, taskData, { id: tempId }));
    _state.tasks.push(normalized);

    var stor = getStorage();
    if (stor) stor.saveTasks(_state.tasks);

    emit('tasks:change', _state.tasks);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        var backendPayload = {
          title:       taskData.title,
          subject:     taskData.subject,
          description: taskData.description || taskData.notes || '',
          due_date:    taskData.dueDate || taskData.due_date,
          priority:    taskData.priority || 'medium'
        };
        var created = await api.tasks.create(backendPayload);
        var idx = _state.tasks.findIndex(function (t) { return t.id === tempId; });
        if (idx !== -1) {
          _state.tasks[idx] = _normalizeTask(created);
          if (stor) stor.saveTasks(_state.tasks);
          emit('tasks:change', _state.tasks);
          emit('change', _state);
        }
        return created;
      } catch (err) {
        // Rollback optimistic update on error
        _state.tasks = _state.tasks.filter(function (t) { return t.id !== tempId; });
        if (stor) stor.saveTasks(_state.tasks);
        emit('tasks:change', _state.tasks);
        emit('change', _state);
        throw err;
      }
    }
    return normalized;
  }

  async function updateTask(id, changes) {
    var origTask = _state.tasks.find(function (t) { return t.id === id; });
    if (!origTask) return;

    _state.tasks = _state.tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, changes) : t;
    });

    var stor = getStorage();
    if (stor) stor.saveTasks(_state.tasks);

    emit('tasks:change', _state.tasks);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        var payload = {};
        if (changes.title !== undefined) payload.title = changes.title;
        if (changes.subject !== undefined) payload.subject = changes.subject;
        if (changes.description !== undefined || changes.notes !== undefined) {
          payload.description = changes.description !== undefined ? changes.description : changes.notes;
        }
        if (changes.dueDate !== undefined || changes.due_date !== undefined) {
          payload.due_date = changes.dueDate !== undefined ? changes.dueDate : changes.due_date;
        }
        if (changes.priority !== undefined) payload.priority = changes.priority;
        if (changes.status !== undefined) {
          payload.status = (changes.status === 'done' || changes.status === 'completed') ? 'completed' : 'pending';
        }

        var updated = await api.tasks.update(id, payload);
        var idx = _state.tasks.findIndex(function (t) { return t.id === id; });
        if (idx !== -1) {
          _state.tasks[idx] = _normalizeTask(updated);
          if (stor) stor.saveTasks(_state.tasks);
          emit('tasks:change', _state.tasks);
          emit('change', _state);
        }
        return updated;
      } catch (err) {
        _state.tasks = _state.tasks.map(function (t) { return t.id === id ? origTask : t; });
        if (stor) stor.saveTasks(_state.tasks);
        emit('tasks:change', _state.tasks);
        emit('change', _state);
        throw err;
      }
    }
  }

  async function completeTask(id) {
    var origTask = _state.tasks.find(function (t) { return t.id === id; });
    var nowIso = new Date().toISOString();
    _state.tasks = _state.tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { status: 'done', completedAt: nowIso }) : t;
    });

    var stor = getStorage();
    if (stor) stor.saveTasks(_state.tasks);

    emit('tasks:change', _state.tasks);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        var updated = await api.tasks.toggle(id);
        var idx = _state.tasks.findIndex(function (t) { return t.id === id; });
        if (idx !== -1) {
          _state.tasks[idx] = _normalizeTask(updated);
          if (stor) stor.saveTasks(_state.tasks);
          emit('tasks:change', _state.tasks);
          emit('change', _state);
        }
      } catch (err) {
        if (origTask) {
          _state.tasks = _state.tasks.map(function (t) { return t.id === id ? origTask : t; });
          if (stor) stor.saveTasks(_state.tasks);
          emit('tasks:change', _state.tasks);
          emit('change', _state);
        }
        throw err;
      }
    }
  }

  async function uncompleteTask(id) {
    var origTask = _state.tasks.find(function (t) { return t.id === id; });
    _state.tasks = _state.tasks.map(function (t) {
      return t.id === id ? Object.assign({}, t, { status: 'todo', completedAt: null }) : t;
    });

    var stor = getStorage();
    if (stor) stor.saveTasks(_state.tasks);

    emit('tasks:change', _state.tasks);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        var updated = await api.tasks.toggle(id);
        var idx = _state.tasks.findIndex(function (t) { return t.id === id; });
        if (idx !== -1) {
          _state.tasks[idx] = _normalizeTask(updated);
          if (stor) stor.saveTasks(_state.tasks);
          emit('tasks:change', _state.tasks);
          emit('change', _state);
        }
      } catch (err) {
        if (origTask) {
          _state.tasks = _state.tasks.map(function (t) { return t.id === id ? origTask : t; });
          if (stor) stor.saveTasks(_state.tasks);
          emit('tasks:change', _state.tasks);
          emit('change', _state);
        }
        throw err;
      }
    }
  }

  async function deleteTask(id) {
    var origList = _state.tasks.slice();
    _state.tasks = _state.tasks.filter(function (t) { return t.id !== id; });

    var stor = getStorage();
    if (stor) stor.saveTasks(_state.tasks);

    emit('tasks:change', _state.tasks);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        await api.tasks.delete(id);
      } catch (err) {
        _state.tasks = origList;
        if (stor) stor.saveTasks(_state.tasks);
        emit('tasks:change', _state.tasks);
        emit('change', _state);
        throw err;
      }
    }
  }

  /* ── Session mutations ─────────────────────────────── */
  async function addSession(sessionData) {
    var tempId = sessionData.id || ('tmp-sess-' + Date.now());
    var normalized = _normalizeSession(Object.assign({}, sessionData, { id: tempId }));
    _state.sessions.push(normalized);

    var stor = getStorage();
    if (stor) stor.saveSessions(_state.sessions);

    emit('sessions:change', _state.sessions);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        var backendPayload = {
          title:            sessionData.title || (sessionData.subject + ' Study Session'),
          subject:          sessionData.subject,
          date:             sessionData.date,
          start_time:       sessionData.startTime || '09:00',
          duration_minutes: sessionData.duration || sessionData.durationMinutes || 45,
          completed:        !!sessionData.completed
        };
        var created = await api.sessions.create(backendPayload);
        var idx = _state.sessions.findIndex(function (s) { return s.id === tempId; });
        if (idx !== -1) {
          _state.sessions[idx] = _normalizeSession(created);
          if (stor) stor.saveSessions(_state.sessions);
          emit('sessions:change', _state.sessions);
          emit('change', _state);
        }
        return created;
      } catch (err) {
        _state.sessions = _state.sessions.filter(function (s) { return s.id !== tempId; });
        if (stor) stor.saveSessions(_state.sessions);
        emit('sessions:change', _state.sessions);
        emit('change', _state);
        throw err;
      }
    }
    return normalized;
  }

  async function updateSession(id, changes) {
    var origSession = _state.sessions.find(function (s) { return s.id === id; });
    if (!origSession) return;

    _state.sessions = _state.sessions.map(function (s) {
      return s.id === id ? Object.assign({}, s, changes) : s;
    });

    var stor = getStorage();
    if (stor) stor.saveSessions(_state.sessions);

    emit('sessions:change', _state.sessions);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        var payload = {};
        if (changes.title !== undefined) payload.title = changes.title;
        if (changes.subject !== undefined) payload.subject = changes.subject;
        if (changes.date !== undefined) payload.date = changes.date;
        if (changes.startTime !== undefined) payload.start_time = changes.startTime;
        if (changes.duration !== undefined || changes.durationMinutes !== undefined) {
          payload.duration_minutes = changes.duration !== undefined ? changes.duration : changes.durationMinutes;
        }
        if (changes.completed !== undefined) payload.completed = changes.completed;

        var updated = await api.sessions.update(id, payload);
        var idx = _state.sessions.findIndex(function (s) { return s.id === id; });
        if (idx !== -1) {
          _state.sessions[idx] = _normalizeSession(updated);
          if (stor) stor.saveSessions(_state.sessions);
          emit('sessions:change', _state.sessions);
          emit('change', _state);
        }
        return updated;
      } catch (err) {
        _state.sessions = _state.sessions.map(function (s) { return s.id === id ? origSession : s; });
        if (stor) stor.saveSessions(_state.sessions);
        emit('sessions:change', _state.sessions);
        emit('change', _state);
        throw err;
      }
    }
  }

  async function deleteSession(id) {
    var origList = _state.sessions.slice();
    _state.sessions = _state.sessions.filter(function (s) { return s.id !== id; });

    var stor = getStorage();
    if (stor) stor.saveSessions(_state.sessions);

    emit('sessions:change', _state.sessions);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        await api.sessions.delete(id);
      } catch (err) {
        _state.sessions = origList;
        if (stor) stor.saveSessions(_state.sessions);
        emit('sessions:change', _state.sessions);
        emit('change', _state);
        throw err;
      }
    }
  }

  /* ── Subject mutations ─────────────────────────────── */
  function addSubject(subject) {
    _state.subjects.push(subject);
    var stor = getStorage();
    if (stor) stor.saveSubjects(_state.subjects);
    emit('subjects:change', _state.subjects);
    emit('change', _state);
  }

  function updateSubject(id, changes) {
    _state.subjects = _state.subjects.map(function (s) {
      return s.id === id ? Object.assign({}, s, changes) : s;
    });
    var stor = getStorage();
    if (stor) stor.saveSubjects(_state.subjects);
    emit('subjects:change', _state.subjects);
    emit('change', _state);
  }

  function deleteSubject(id) {
    _state.subjects = _state.subjects.filter(function (s) { return s.id !== id; });
    var stor = getStorage();
    if (stor) stor.saveSubjects(_state.subjects);
    emit('subjects:change', _state.subjects);
    emit('change', _state);
  }

  /* ── Timer log ─────────────────────────────────────── */
  async function addTimerEntry(entry) {
    var normalized = _normalizeFocus({
      id:               entry.id,
      local_date:       entry.date,
      duration_minutes: entry.duration || 25,
      mode:             entry.type === 'pomodoro' ? 'focus' : (entry.type || 'focus'),
      completed_at:     new Date().toISOString()
    });
    _state.timerLog.push(normalized);

    var stor = getStorage();
    if (stor) stor.saveTimerLog(_state.timerLog);

    emit('timerLog:change', _state.timerLog);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken()) {
      try {
        await api.focus.record({
          id:               entry.id,
          mode:             entry.type === 'pomodoro' ? 'focus' : (entry.type || 'focus'),
          duration_minutes: entry.duration || 25,
          local_date:       entry.date,
          completed_at:     new Date().toISOString()
        });
      } catch (err) {
        console.warn('Focus session post failed, will retry later:', err);
      }
    }
  }

  /* ── Settings ──────────────────────────────────────── */
  async function updateSettings(changes) {
    _state.settings = Object.assign({}, _state.settings, changes);

    var stor = getStorage();
    if (stor) stor.saveSettings(_state.settings);

    emit('settings:change', _state.settings);
    emit('change', _state);

    var api = getApi();
    if (api && api.getToken() && (changes.name !== undefined || changes.darkMode !== undefined || changes.college !== undefined || changes.course !== undefined || changes.year !== undefined || changes.avatar !== undefined)) {
      try {
        var profilePayload = {};
        if (changes.name !== undefined) profilePayload.display_name = changes.name;
        if (changes.darkMode !== undefined) profilePayload.theme = changes.darkMode ? 'dark' : 'light';
        if (changes.college !== undefined) profilePayload.college = changes.college;
        if (changes.course !== undefined) profilePayload.course = changes.course;
        if (changes.year !== undefined) profilePayload.year = changes.year;
        if (changes.avatar !== undefined) profilePayload.avatar = changes.avatar;
        await api.profile.update(profilePayload);
      } catch (err) {
        console.warn('Failed to update profile on backend:', err);
      }
    }
  }

  /* ── Clear state (Logout) ──────────────────────────── */
  function clear() {
    _state.tasks = [];
    _state.sessions = [];
    _state.timerLog = [];
    _state.settings.name = 'Student';
    emit('tasks:change', _state.tasks);
    emit('sessions:change', _state.sessions);
    emit('timerLog:change', _state.timerLog);
    emit('settings:change', _state.settings);
    emit('change', _state);
  }

  /* ── Reset all user data on backend ────────────────── */
  async function reset() {
    var api = getApi();
    if (api && api.getToken()) {
      try {
        await api.data.resetData();
        await syncFromBackend();
      } catch (err) {
        console.error('Failed to reset data on backend:', err);
      }
    } else {
      var stor = getStorage();
      if (stor) {
        stor.resetAll();
        stor.seedData();
      }
      load();
    }
    emit('reset', _state);
    emit('change', _state);
  }

  return {
    load,
    syncFromBackend,
    get, getAll,
    on, off, emit,
    addTask, updateTask, deleteTask, completeTask, uncompleteTask,
    addSession, updateSession, deleteSession,
    addSubject, updateSubject, deleteSubject,
    addTimerEntry,
    updateSettings,
    clear,
    reset
  };

}());
