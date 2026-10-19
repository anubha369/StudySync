/* ========================================================
   StudySync — settings.js
   Profile, timer settings, subjects CRUD, theme,
   data export / import / reset
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.settings = (function () {

  var u       = window.StudySync.utils;
  var state   = window.StudySync.state;
  var storage = window.StudySync.storage;
  var app     = window.StudySync.app;

  var _activePanel = 'profile';

  /* ─────────────────────────────────────────────────── */
  /* Render                                               */
  /* ─────────────────────────────────────────────────── */
  function render() {
    var settings = state.get('settings');
    _renderProfile(settings);
    _renderTimerSettings(settings);
    _renderSubjects();
    _renderAppearance(settings);
    _setActivePanel(_activePanel);
  }

  /* ── Profile ────────────────────────────────────────── */
  function _renderProfile(s) {
    var el = document.getElementById('settings-profile-content');
    if (!el) return;
    el.innerHTML = [
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Your Name</h4><p>Displayed in the dashboard greeting</p></div>',
        '<div style="display:flex;gap:8px;align-items:center">',
          '<input id="profile-name" class="form-control" style="width:200px" type="text" value="', app.escapeHtml(s.name || 'Student'), '" placeholder="Your name">',
          '<button class="btn btn-primary btn-sm" id="save-name">', app.icon('check', 13), ' Save</button>',
        '</div>',
      '</div>',
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Notifications</h4><p>Browser notifications when timer completes</p></div>',
        _toggle('notif-toggle', s.notifications, 'notifications'),
      '</div>'
    ].join('');

    document.getElementById('save-name').addEventListener('click', function() {
      var name = (document.getElementById('profile-name').value || '').trim();
      if (!name) return;
      state.updateSettings({ name: name });
      app.renderSidebar();
      app.toast('success', 'Name updated!');
    });

    _attachToggle('notif-toggle', 'notifications');
  }

  /* ── Timer settings ─────────────────────────────────── */
  function _renderTimerSettings(s) {
    var el = document.getElementById('settings-timer-content');
    if (!el) return;
    el.innerHTML = [
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Focus Duration</h4><p>Length of each focus session (minutes)</p></div>',
        _numberInput('pomo-duration', s.pomodoroDuration || 25, 5, 90, 5, 'pomodoroDuration'),
      '</div>',
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Short Break</h4><p>Short break between sessions (minutes)</p></div>',
        _numberInput('short-break', s.shortBreak || 5, 0, 30, 1, 'shortBreak'),
      '</div>',
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Long Break</h4><p>Long break after several sessions (minutes)</p></div>',
        _numberInput('long-break', s.longBreak || 15, 5, 60, 5, 'longBreak'),
      '</div>',
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Sessions Until Long Break</h4><p>Number of focus sessions before a long break</p></div>',
        _numberInput('pomos-per-long', s.pomodorosPerLong || 4, 1, 8, 1, 'pomodorosPerLong'),
      '</div>',
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Auto-Start Break</h4><p>Automatically start break timer after focus ends</p></div>',
        _toggle('auto-break-toggle', s.autoStartBreak, 'autoStartBreak'),
      '</div>'
    ].join('');

    _attachToggle('auto-break-toggle', 'autoStartBreak');
  }

  /* ── Number input helper ────────────────────────────── */
  function _numberInput(id, value, min, max, step, settingKey) {
    return [
      '<div class="number-input" id="', id, '-wrap">',
        '<button type="button" onclick="StudySync.settings._numChange(\'', id, '\',', -step, ',', min, ',', max, ',\'', settingKey, '\')">−</button>',
        '<span id="', id, '-val">', value, '</span>',
        '<button type="button" onclick="StudySync.settings._numChange(\'', id, '\',', step, ',', min, ',', max, ',\'', settingKey, '\')">+</button>',
      '</div>'
    ].join('');
  }

  function _numChange(id, delta, min, max, settingKey) {
    var el = document.getElementById(id + '-val');
    if (!el) return;
    var cur = parseInt(el.textContent, 10);
    var next = u.clamp(cur + delta, min, max);
    el.textContent = next;
    var change = {};
    change[settingKey] = next;
    state.updateSettings(change);
    app.toast('info', 'Setting saved', settingKey + ' → ' + next + 'min');
  }

  /* ── Toggle helper ──────────────────────────────────── */
  function _toggle(id, checked, key) {
    return [
      '<label class="toggle">',
        '<input type="checkbox" id="', id, '"', checked ? ' checked' : '', '>',
        '<span class="toggle-track"></span>',
      '</label>'
    ].join('');
  }

  function _attachToggle(id, settingKey) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function() {
      var change = {};
      change[settingKey] = el.checked;
      state.updateSettings(change);
    });
  }

  /* ── Subjects ────────────────────────────────────────── */
  function _renderSubjects() {
    var el = document.getElementById('settings-subjects-content');
    if (!el) return;
    var subjects = state.get('subjects');

    var rows = subjects.length ? subjects.map(function(s) {
      return [
        '<div class="settings-row" style="padding:12px 24px">',
          '<div style="display:flex;align-items:center;gap:12px;flex:1">',
            '<span style="width:18px;height:18px;border-radius:50%;background:', s.color, ';flex-shrink:0;display:inline-block"></span>',
            '<div>',
              '<div style="font-size:var(--text-sm);font-weight:500;color:var(--text)">', app.escapeHtml(s.name), '</div>',
              '<div style="font-size:var(--text-xs);color:var(--text-muted)">', s.creditHours || 0, ' credit hours</div>',
            '</div>',
          '</div>',
          '<div style="display:flex;gap:6px">',
            '<button class="btn btn-ghost btn-icon btn-sm" onclick="StudySync.settings.editSubject(\'', s.id, '\')">', app.icon('edit', 13), '</button>',
            '<button class="btn btn-ghost btn-icon btn-sm" style="color:var(--danger)" onclick="StudySync.settings.deleteSubject(\'', s.id, '\')">', app.icon('trash', 13), '</button>',
          '</div>',
        '</div>'
      ].join('');
    }).join('') : '<div style="padding:20px 24px;color:var(--text-muted);font-size:var(--text-sm)">No subjects yet. Add your first subject below.</div>';

    el.innerHTML = [
      rows,
      '<div style="padding:16px 24px;border-top:1px solid var(--border)">',
        '<button class="btn btn-primary btn-sm" id="add-subject-btn">', app.icon('plus', 13), ' Add Subject</button>',
      '</div>'
    ].join('');

    document.getElementById('add-subject-btn').addEventListener('click', function() {
      openSubjectModal(null);
    });
  }

  function openSubjectModal(subject) {
    var isEdit = !!subject;
    var colors = u.SUBJECT_COLORS;
    var curColor = isEdit ? subject.color : colors[state.get('subjects').length % colors.length];

    var swatches = colors.map(function(c) {
      return '<span class="color-swatch' + (c === curColor ? ' selected' : '') + '" style="background:' + c + '" data-color="' + c + '" onclick="StudySync.settings._selectColor(this)"></span>';
    }).join('');

    var body = [
      '<div class="form-group">',
        '<label class="form-label">Subject Name <span>*</span></label>',
        '<input id="subj-name" class="form-control" type="text" placeholder="e.g. Mathematics" maxlength="60"',
          isEdit ? ' value="' + app.escapeHtml(subject.name) + '"' : '',
        '>',
      '</div>',
      '<div class="form-group">',
        '<label class="form-label">Credit Hours</label>',
        '<input id="subj-credits" class="form-control" type="number" min="0" max="10" step="1"',
          ' value="', isEdit ? (subject.creditHours || 0) : 3, '"',
          ' style="width:100px">',
      '</div>',
      '<div class="form-group">',
        '<label class="form-label">Color</label>',
        '<div class="color-swatches" id="subj-color-swatches">', swatches, '</div>',
        '<input type="hidden" id="subj-color" value="', curColor, '">',
      '</div>'
    ].join('');

    var footer = [
      '<button class="btn btn-secondary" id="subj-cancel">Cancel</button>',
      '<button class="btn btn-primary" id="subj-save">', app.icon('check'), isEdit ? ' Save' : ' Add Subject', '</button>'
    ].join('');

    app.openModal({ title: isEdit ? 'Edit Subject' : 'New Subject', body: body, footer: footer });

    document.getElementById('subj-cancel').addEventListener('click', app.closeModal);
    document.getElementById('subj-save').addEventListener('click', function() {
      var nameEl = document.getElementById('subj-name');
      var name = (nameEl.value || '').trim();
      if (!name) {
        nameEl.classList.add('is-invalid');
        nameEl.focus();
        return;
      }
      nameEl.classList.remove('is-invalid');

      var exists = state.get('subjects').some(function(s) {
        return s.name.toLowerCase() === name.toLowerCase() && (!isEdit || s.id !== subject.id);
      });
      if (exists) {
        app.toast('warning', 'A subject with this name already exists');
        return;
      }

      var color   = document.getElementById('subj-color').value || '#4F46E5';
      var credits = parseInt(document.getElementById('subj-credits').value, 10);
      if (isNaN(credits) || credits < 0) credits = 0;

      if (isEdit) {
        state.updateSubject(subject.id, { name: name, color: color, creditHours: credits });
        app.toast('success', 'Subject updated');
      } else {
        state.addSubject({ id: u.generateId(), name: name, color: color, creditHours: credits });
        app.toast('success', 'Subject added!', name);
      }
      app.closeModal();
      _renderSubjects();
    });
  }

  function _selectColor(el) {
    document.querySelectorAll('.color-swatch').forEach(function(s){ s.classList.remove('selected'); });
    el.classList.add('selected');
    var colorInput = document.getElementById('subj-color');
    if (colorInput) colorInput.value = el.dataset.color;
  }

  function editSubject(id) {
    var subj = state.get('subjects').find(function(s){ return s.id === id; });
    if (subj) openSubjectModal(subj);
  }

  function deleteSubject(id) {
    var subj = state.get('subjects').find(function(s){ return s.id === id; });
    if (!subj) return;
    app.confirm('Delete Subject', 'Delete "' + subj.name + '"? This won\'t delete associated tasks.', function() {
      state.deleteSubject(id);
      _renderSubjects();
      app.toast('info', 'Subject deleted');
    }, true);
  }

  /* ── Appearance ─────────────────────────────────────── */
  function _renderAppearance(s) {
    var el = document.getElementById('settings-appearance-content');
    if (!el) return;
    el.innerHTML = [
      '<div class="settings-row">',
        '<div class="settings-row-label"><h4>Dark Mode</h4><p>Switch between light and dark theme</p></div>',
        _toggle('dark-mode-toggle', s.darkMode, 'darkMode'),
      '</div>'
    ].join('');

    var dmToggle = document.getElementById('dark-mode-toggle');
    if (dmToggle) {
      dmToggle.addEventListener('change', function() {
        state.updateSettings({ darkMode: dmToggle.checked });
        app.applyTheme(dmToggle.checked);
      });
    }
  }

  /* ── Data management ────────────────────────────────── */
  function _initDataButtons() {
    var exportBtn = document.getElementById('btn-export-data');
    var importBtn = document.getElementById('btn-import-data');
    var importInput = document.getElementById('import-file-input');
    var resetBtn  = document.getElementById('btn-reset-data');

    if (exportBtn) exportBtn.addEventListener('click', function() {
      storage.exportJSON();
      app.toast('success', 'Data exported!', 'Check your downloads folder.');
    });

    if (importBtn) importBtn.addEventListener('click', function() {
      if (importInput) importInput.click();
    });

    if (importInput) importInput.addEventListener('change', function() {
      var file = importInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          storage.importJSON(e.target.result);
          state.load();
          app.toast('success', 'Data imported!', 'Your data has been restored.');
          render();
        } catch (err) {
          app.toast('error', 'Import failed', 'Invalid file format.');
        }
      };
      reader.readAsText(file);
    });

    if (resetBtn) resetBtn.addEventListener('click', function() {
      app.confirm('Reset All Data', 'This will delete all tasks, sessions, and settings and reload sample data. This cannot be undone.', function() {
        state.reset();
        app.renderSidebar();
        render();
        app.toast('info', 'Data reset to defaults');
      }, true);
    });
  }

  /* ── Settings nav ────────────────────────────────────── */
  function _setActivePanel(panel) {
    _activePanel = panel;
    document.querySelectorAll('.settings-nav-item').forEach(function(item) {
      item.classList.toggle('active', item.dataset.panel === panel);
    });
    document.querySelectorAll('.settings-panel').forEach(function(el) {
      el.classList.toggle('active', el.id === 'settings-panel-' + panel);
    });
  }

  /* ─────────────────────────────────────────────────── */
  /* Init                                                  */
  /* ─────────────────────────────────────────────────── */
  function init() {
    document.querySelectorAll('.settings-nav-item').forEach(function(item) {
      item.addEventListener('click', function() {
        _setActivePanel(item.dataset.panel);
      });
    });

    _initDataButtons();

    state.on('subjects:change', function() {
      if (document.getElementById('page-settings').classList.contains('active')) {
        _renderSubjects();
      }
    });
  }

  return {
    init,
    render,
    editSubject,
    deleteSubject,
    openSubjectModal,
    _numChange,
    _selectColor
  };

}());
