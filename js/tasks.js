/* ========================================================
   StudySync — tasks.js
   Full CRUD: list, add, edit, delete, complete, filter,
   search, sort. Persisted to localStorage via state.
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.tasks = (function () {

  var u     = window.StudySync.utils;
  var state = window.StudySync.state;
  var app   = window.StudySync.app;

  /* ── Local UI state ────────────────────────────────── */
  var _filter = 'all';
  var _search = '';
  var _sort   = 'due';

  /* ── Container refs ────────────────────────────────── */
  var _listEl    = null;
  var _searchEl  = null;

  /* ─────────────────────────────────────────────────── */
  /* Render                                               */
  /* ─────────────────────────────────────────────────── */
  function render() {
    if (!_listEl) return;
    var tasks = _filtered();
    _updateFilterBadges();
    if (!tasks.length) {
      _listEl.innerHTML = _emptyState();
      return;
    }
    _listEl.innerHTML = tasks.map(_taskCard).join('');
    _attachTaskListeners();
  }

  function _filtered() {
    var tasks = state.get('tasks').slice();

    // Status filter
    if (_filter === 'todo')     tasks = tasks.filter(function(t){ return t.status === 'todo'; });
    if (_filter === 'in-progress') tasks = tasks.filter(function(t){ return t.status === 'in-progress'; });
    if (_filter === 'done')     tasks = tasks.filter(function(t){ return t.status === 'done'; });
    if (_filter === 'overdue')  tasks = tasks.filter(function(t){ return t.status !== 'done' && u.isOverdue(t.dueDate); });
    if (_filter === 'high')     tasks = tasks.filter(function(t){ return t.priority === 'high'; });

    // Search
    if (_search) {
      var q = _search;
      tasks = tasks.filter(function(t){
        return (t.title || '').includes(q) ||
               (t.subject || '').includes(q) ||
               (t.notes || '').includes(q);
      });
    }

    // Sort
    tasks.sort(function (a, b) {
      if (_sort === 'due') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (_sort === 'priority') {
        return u.priorityOrder(a.priority) - u.priorityOrder(b.priority);
      }
      if (_sort === 'subject') {
        return (a.subject || '').localeCompare(b.subject || '');
      }
      if (_sort === 'created') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return 0;
    });

    return tasks;
  }

  function _updateFilterBadges() {
    var tasks  = state.get('tasks');
    var counts = {
      all:         tasks.length,
      todo:        tasks.filter(function(t){ return t.status === 'todo'; }).length,
      'in-progress': tasks.filter(function(t){ return t.status === 'in-progress'; }).length,
      done:        tasks.filter(function(t){ return t.status === 'done'; }).length,
      overdue:     tasks.filter(function(t){ return t.status !== 'done' && u.isOverdue(t.dueDate); }).length,
      high:        tasks.filter(function(t){ return t.priority === 'high' && t.status !== 'done'; }).length
    };
    document.querySelectorAll('[data-filter]').forEach(function (btn) {
      var f = btn.dataset.filter;
      var count = counts[f] || 0;
      var badgeEl = btn.querySelector('.filter-badge');
      if (badgeEl) badgeEl.textContent = count;
    });
  }

  function _taskCard(task) {
    var isDone     = task.status === 'done';
    var isOverdue  = !isDone && u.isOverdue(task.dueDate);
    var days       = u.daysUntil(task.dueDate);
    var subjects   = state.get('subjects');
    var color      = u.subjectColor(task.subject, subjects);

    var dueLabel = '';
    if (task.dueDate) {
      if (isDone) {
        dueLabel = 'Done';
      } else if (days === 0) {
        dueLabel = '<span class="badge badge-warning">Due today</span>';
      } else if (days < 0) {
        dueLabel = '<span class="badge badge-danger">Overdue ' + Math.abs(days) + 'd</span>';
      } else if (days <= 3) {
        dueLabel = '<span class="badge badge-warning">In ' + days + 'd</span>';
      } else {
        dueLabel = '<span class="badge badge-muted">' + u.formatDateShort(task.dueDate) + '</span>';
      }
    }

    var statusBadge = {
      'todo':        '<span class="badge badge-muted">To Do</span>',
      'in-progress': '<span class="badge badge-primary">In Progress</span>',
      'done':        '<span class="badge badge-success">Done</span>'
    }[task.status] || '';

    var priorityBadge = {
      high:   '<span class="badge badge-danger"><span class="priority-dot high"></span> High</span>',
      medium: '<span class="badge badge-warning"><span class="priority-dot medium"></span> Medium</span>',
      low:    '<span class="badge badge-success"><span class="priority-dot low"></span> Low</span>'
    }[task.priority] || '';

    return [
      '<div class="task-item', isDone ? ' done' : '', isOverdue ? ' overdue' : '', '" data-id="', task.id, '">',
        '<div class="task-checkbox', isDone ? ' checked' : '', '" data-action="toggle" data-id="', task.id, '">',
          app.icon('check', 12),
        '</div>',
        '<div class="task-body">',
          '<div class="task-title">', app.escapeHtml(task.title), '</div>',
          '<div class="task-meta">',
            task.subject ? [
              '<span class="subject-chip" style="background:', color, '22;color:', color, '">',
                '<span style="width:6px;height:6px;border-radius:50%;background:', color, ';display:inline-block"></span>',
                app.escapeHtml(task.subject),
              '</span>'
            ].join('') : '',
            statusBadge,
            priorityBadge,
            dueLabel,
          '</div>',
          task.notes ? '<div class="task-notes">' + u.truncate(task.notes, 120) + '</div>' : '',
        '</div>',
        '<div class="task-actions">',
          '<button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="', task.id, '" title="Edit">',
            app.icon('edit', 14),
          '</button>',
          '<button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="', task.id, '" title="Delete" style="color:var(--danger)">',
            app.icon('trash', 14),
          '</button>',
        '</div>',
      '</div>'
    ].join('');
  }

  function _emptyState() {
    var msgs = {
      all:         { h: 'No tasks yet', p: 'Click "+ New Task" to add your first task.' },
      todo:        { h: 'Nothing to do!', p: 'All caught up, or add a new task.' },
      'in-progress': { h: 'None in progress', p: 'Mark a task as in-progress to see it here.' },
      done:        { h: 'Nothing done yet', p: 'Complete some tasks to see them here.' },
      overdue:     { h: 'No overdue tasks!', p: 'You\'re on top of your deadlines.' },
      high:        { h: 'No high-priority tasks', p: 'No urgent tasks right now.' }
    };
    var m = msgs[_filter] || msgs.all;
    return [
      '<div class="empty-state">',
        '<div class="empty-icon">', app.icon('tasks', 28), '</div>',
        '<h3>', m.h, '</h3>',
        '<p>', m.p, '</p>',
        _filter === 'all' ? '<button class="btn btn-primary" onclick="StudySync.tasks.openAddModal()">' + app.icon('plus') + ' New Task</button>' : '',
      '</div>'
    ].join('');
  }

  function _attachTaskListeners() {
    _listEl.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = el.dataset.action;
        var id     = el.dataset.id;
        if (action === 'toggle') _toggleDone(id);
        if (action === 'edit')   openEditModal(id);
        if (action === 'delete') _confirmDelete(id);
      });
    });
  }

  /* ─────────────────────────────────────────────────── */
  /* Actions                                              */
  /* ─────────────────────────────────────────────────── */
  function _toggleDone(id) {
    var task = state.get('tasks').find(function(t){ return t.id === id; });
    if (!task) return;
    if (task.status === 'done') {
      state.uncompleteTask(id);
    } else {
      state.completeTask(id);
      app.toast('success', 'Task completed!', task.title);
    }
    render();
  }

  function _confirmDelete(id) {
    var task = state.get('tasks').find(function(t){ return t.id === id; });
    if (!task) return;
    app.confirm('Delete Task', 'Are you sure you want to delete "' + task.title + '"? This cannot be undone.', function () {
      state.deleteTask(id);
      app.toast('info', 'Task deleted', task.title);
      render();
    }, true);
  }

  /* ─────────────────────────────────────────────────── */
  /* Add / Edit Modal                                     */
  /* ─────────────────────────────────────────────────── */
  function openAddModal() {
    _openTaskModal(null);
  }

  function openEditModal(id) {
    var task = state.get('tasks').find(function(t){ return t.id === id; });
    if (task) _openTaskModal(task);
  }

  function _openTaskModal(task) {
    var subjects  = state.get('subjects');
    var isEdit    = !!task;
    var subjectOptions = subjects.map(function(s){
      var sel = isEdit && task.subject === s.name ? ' selected' : '';
      return '<option value="' + app.escapeHtml(s.name) + '"' + sel + '>' + app.escapeHtml(s.name) + '</option>';
    }).join('');

    var statuses = [
      { v: 'todo',        l: 'To Do' },
      { v: 'in-progress', l: 'In Progress' },
      { v: 'done',        l: 'Done' }
    ];
    var statusOptions = statuses.map(function(s){
      var sel = isEdit && task.status === s.v ? ' selected' : ((!isEdit && s.v === 'todo') ? ' selected' : '');
      return '<option value="' + s.v + '"' + sel + '>' + s.l + '</option>';
    }).join('');

    var priorities = ['high', 'medium', 'low'];
    var prioOptions = priorities.map(function(p){
      var sel = isEdit && task.priority === p ? ' selected' : ((!isEdit && p === 'medium') ? ' selected' : '');
      return '<option value="' + p + '"' + sel + '>' + u.capitalize(p) + '</option>';
    }).join('');

    var body = [
      '<div class="form-group">',
        '<label class="form-label">Task Title <span>*</span></label>',
        '<input id="task-title" class="form-control" type="text" placeholder="e.g. Complete calculus problem set" maxlength="200"',
          isEdit ? ' value="' + app.escapeHtml(task.title) + '"' : '',
        '>',
      '</div>',
      '<div class="form-row">',
        '<div class="form-group">',
          '<label class="form-label">Subject</label>',
          '<select id="task-subject" class="form-control">',
            '<option value="">— None —</option>',
            subjectOptions,
          '</select>',
        '</div>',
        '<div class="form-group">',
          '<label class="form-label">Priority</label>',
          '<select id="task-priority" class="form-control">', prioOptions, '</select>',
        '</div>',
      '</div>',
      '<div class="form-row">',
        '<div class="form-group">',
          '<label class="form-label">Status</label>',
          '<select id="task-status" class="form-control">', statusOptions, '</select>',
        '</div>',
        '<div class="form-group">',
          '<label class="form-label">Due Date</label>',
          '<input id="task-due" class="form-control" type="date"',
            isEdit && task.dueDate ? ' value="' + task.dueDate + '"' : '',
          '>',
        '</div>',
      '</div>',
      '<div class="form-group">',
        '<label class="form-label">Notes</label>',
        '<textarea id="task-notes" class="form-control" rows="3" placeholder="Additional notes or details…">',
          isEdit ? app.escapeHtml(task.notes || '') : '',
        '</textarea>',
      '</div>'
    ].join('');

    var footer = [
      '<button class="btn btn-secondary" id="task-cancel">Cancel</button>',
      '<button class="btn btn-primary" id="task-save">',
        app.icon('check'), isEdit ? ' Save Changes' : ' Add Task',
      '</button>'
    ].join('');

    app.openModal({
      title: isEdit ? 'Edit Task' : 'New Task',
      body:  body,
      footer: footer
    });

    document.getElementById('task-cancel').addEventListener('click', app.closeModal);
    document.getElementById('task-save').addEventListener('click', function () {
      _saveTask(task ? task.id : null);
    });

    // Allow Enter to submit
    document.getElementById('task-title').addEventListener('keydown', function(e){
      if (e.key === 'Enter') _saveTask(task ? task.id : null);
    });
  }

  function _saveTask(editId) {
    var titleEl    = document.getElementById('task-title');
    var subjectEl  = document.getElementById('task-subject');
    var priorityEl = document.getElementById('task-priority');
    var statusEl   = document.getElementById('task-status');
    var dueEl      = document.getElementById('task-due');
    var notesEl    = document.getElementById('task-notes');

    var title = (titleEl.value || '').trim();
    if (!title) {
      titleEl.classList.add('is-invalid');
      titleEl.focus();
      return;
    }
    titleEl.classList.remove('is-invalid');

    var nowStr = new Date().toISOString();
    var status = statusEl.value;

    if (editId) {
      var existing = state.get('tasks').find(function(t){ return t.id === editId; });
      var wasNotDone = existing && existing.status !== 'done';
      var completedTimestamp = status === 'done' ? (wasNotDone ? nowStr : (existing && existing.completedAt ? existing.completedAt : nowStr)) : null;
      state.updateTask(editId, {
        title:       title,
        subject:     subjectEl.value,
        priority:    priorityEl.value,
        status:      status,
        dueDate:     dueEl.value,
        notes:       notesEl.value,
        completedAt: completedTimestamp
      });
      app.toast('success', 'Task updated', title);
    } else {
      state.addTask({
        id:          u.generateId(),
        title:       title,
        subject:     subjectEl.value,
        priority:    priorityEl.value,
        status:      status,
        dueDate:     dueEl.value,
        notes:       notesEl.value,
        createdAt:   nowStr,
        completedAt: status === 'done' ? nowStr : null
      });
      app.toast('success', 'Task added!', title);
    }

    app.closeModal();
    render();
  }

  /* ─────────────────────────────────────────────────── */
  /* Init                                                  */
  /* ─────────────────────────────────────────────────── */
  function init() {
    _listEl = document.getElementById('tasks-list');

    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _filter = btn.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        render();
      });
    });

    // Search
    _searchEl = document.getElementById('tasks-search');
    if (_searchEl) {
      _searchEl.addEventListener('input', function () {
        _search = _searchEl.value;
        render();
      });
    }

    // Sort
    var sortEl = document.getElementById('tasks-sort');
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        _sort = sortEl.value;
        render();
      });
    }

    // Add task button
    var addBtn = document.getElementById('btn-add-task');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    // Re-render on external state changes
    state.on('tasks:change', function () {
      if (document.getElementById('page-tasks').classList.contains('active')) {
        render();
      }
    });
  }

  return {
    init,
    render,
    openAddModal,
    openEditModal
  };

}());
