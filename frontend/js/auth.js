/* ========================================================
   StudySync — auth.js
   Authentication view, login, registration, validation,
   demo account access, and server status handling.
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.auth = (function () {

  var api = window.StudySync.api;

  // Safe dynamic proxies to ensure app and state are never undefined regardless of script evaluation order
  var app = new Proxy({}, {
    get: function (target, prop) {
      if (window.StudySync && window.StudySync.app && typeof window.StudySync.app[prop] !== 'undefined') {
        return window.StudySync.app[prop];
      }
      if (prop === 'toast') {
        return function (type, title, msg) {
          if (window.StudySync && window.StudySync.app && typeof window.StudySync.app.toast === 'function') {
            return window.StudySync.app.toast(type, title, msg);
          }
          console.log('[Toast ' + type + ']', title, msg);
        };
      }
      if (prop === 'escapeHtml') {
        return function (s) {
          if (window.StudySync && window.StudySync.app && typeof window.StudySync.app.escapeHtml === 'function') {
            return window.StudySync.app.escapeHtml(s);
          }
          return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        };
      }
      if (prop === 'renderSidebar') {
        return function () {
          if (window.StudySync && window.StudySync.app && typeof window.StudySync.app.renderSidebar === 'function') {
            return window.StudySync.app.renderSidebar();
          }
        };
      }
      if (prop === 'navigate') {
        return function (route) {
          if (window.StudySync && window.StudySync.app && typeof window.StudySync.app.navigate === 'function') {
            return window.StudySync.app.navigate(route);
          }
          location.hash = route;
        };
      }
      return undefined;
    }
  });

  var state = new Proxy({}, {
    get: function (target, prop) {
      if (window.StudySync && window.StudySync.state && typeof window.StudySync.state[prop] !== 'undefined') {
        return window.StudySync.state[prop];
      }
      return undefined;
    }
  });

  var _currentTab = 'login'; // 'login' | 'register'
  var _currentUser = null;

  /* ── Standalone HTML Escaper ───────────────────────── */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── Get / Set Current User ────────────────────────── */
  function getCurrentUser() {
    return _currentUser || api.getSavedUser();
  }

  function setCurrentUser(user) {
    _currentUser = user;
    api.setSavedUser(user);
  }

  function isAuthenticated() {
    return !!api.getToken();
  }

  /* ── Render Fullscreen Auth View ───────────────────── */
  function showAuthScreen(initialMessage) {
    var overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-overlay';
      overlay.className = 'auth-overlay';
      document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    _renderAuthContent(initialMessage);
  }

  function hideAuthScreen() {
    var overlay = document.getElementById('auth-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  function _renderAuthContent(message) {
    var overlay = document.getElementById('auth-overlay');
    if (!overlay) return;

    var isLogin = _currentTab === 'login';

    overlay.innerHTML = [
      '<div class="auth-card">',
        '<div class="auth-header">',
          '<div class="auth-logo">',
            '<div class="logo-icon">',
              '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
            '</div>',
            '<div class="logo-title">StudySync</div>',
          '</div>',
          '<h2 class="auth-title">', isLogin ? 'Welcome back' : 'Create an account', '</h2>',
          '<p class="auth-subtitle">', isLogin ? 'Sign in to access your study planner and tasks' : 'Start organizing your academic journey today', '</p>',
          message ? '<div class="auth-banner-msg">' + escapeHtml(message) + '</div>' : '',
        '</div>',

        '<div class="auth-tabs">',
          '<button type="button" class="auth-tab-btn' + (isLogin ? ' active' : '') + '" id="tab-btn-login">Sign In</button>',
          '<button type="button" class="auth-tab-btn' + (!isLogin ? ' active' : '') + '" id="tab-btn-register">Register</button>',
        '</div>',

        '<form id="auth-form" class="auth-form" novalidate>',
          !isLogin ? [
            '<div class="form-group">',
              '<label class="form-label" for="auth-name">Full Name</label>',
              '<input id="auth-name" type="text" class="form-control" placeholder="e.g. Alex Chen" required maxlength="100">',
              '<div id="err-name" class="auth-field-error"></div>',
            '</div>'
          ].join('') : '',

          '<div class="form-group">',
            '<label class="form-label" for="auth-email">Email Address</label>',
            '<input id="auth-email" type="email" class="form-control" placeholder="student@university.edu" required autocomplete="email">',
            '<div id="err-email" class="auth-field-error"></div>',
          '</div>',

          '<div class="form-group">',
            '<label class="form-label" for="auth-password">Password</label>',
            '<div class="auth-password-wrapper">',
              '<input id="auth-password" type="password" class="form-control" placeholder="' + (isLogin ? 'Enter your password' : 'Min. 8 characters') + '" required autocomplete="' + (isLogin ? 'current-password' : 'new-password') + '">',
              '<button type="button" id="btn-toggle-pw" class="btn-toggle-pw" aria-label="Toggle password visibility">',
                '<svg id="pw-eye-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
              '</button>',
            '</div>',
            '<div id="err-password" class="auth-field-error"></div>',
          '</div>',

          '<button type="submit" id="btn-auth-submit" class="btn btn-primary btn-block">',
            '<span class="btn-text">', isLogin ? 'Sign In' : 'Create Account', '</span>',
            '<span class="btn-spinner" style="display:none;"></span>',
          '</button>',
        '</form>',

        '<div class="auth-divider"><span>or</span></div>',

        '<button type="button" id="btn-demo-login" class="btn btn-secondary btn-block btn-demo-auth">',
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
          ' Continue with Demo Data (Alex Chen)',
        '</button>',

        '<div class="auth-footer-note">',
          '<p>Live College Demo Ready · Data saved permanently in SQLite</p>',
        '</div>',
      '</div>'
    ].join('');

    _attachAuthListeners();
  }

  function _attachAuthListeners() {
    var tabLogin = document.getElementById('tab-btn-login');
    var tabRegister = document.getElementById('tab-btn-register');
    var form = document.getElementById('auth-form');
    var btnTogglePw = document.getElementById('btn-toggle-pw');
    var btnDemo = document.getElementById('btn-demo-login');

    if (tabLogin) {
      tabLogin.addEventListener('click', function () {
        _currentTab = 'login';
        _renderAuthContent();
      });
    }

    if (tabRegister) {
      tabRegister.addEventListener('click', function () {
        _currentTab = 'register';
        _renderAuthContent();
      });
    }

    if (btnTogglePw) {
      btnTogglePw.addEventListener('click', function () {
        var pwInput = document.getElementById('auth-password');
        if (!pwInput) return;
        var isPw = pwInput.type === 'password';
        pwInput.type = isPw ? 'text' : 'password';
        btnTogglePw.innerHTML = isPw ?
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' :
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
    }

    if (btnDemo) {
      btnDemo.addEventListener('click', function () {
        _handleLogin('demo@studysync.app', 'demo123456', true);
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        _handleSubmit();
      });
    }
  }

  /* ── Form Submit Handler ───────────────────────────── */
  async function _handleSubmit() {
    var emailEl = document.getElementById('auth-email');
    var pwEl    = document.getElementById('auth-password');
    var nameEl  = document.getElementById('auth-name');

    var email = (emailEl ? emailEl.value : '').trim().toLowerCase();
    var pw    = (pwEl ? pwEl.value : '').trim();
    var name  = nameEl ? nameEl.value.trim() : '';

    // Clear previous inline errors
    _clearErrors();

    var hasError = false;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      _showFieldError('err-email', 'Email address is required');
      hasError = true;
    } else if (!emailRegex.test(email)) {
      _showFieldError('err-email', 'Please enter a valid email address');
      hasError = true;
    }

    if (!pw) {
      _showFieldError('err-password', 'Password is required');
      hasError = true;
    } else if (_currentTab === 'register' && pw.length < 8) {
      _showFieldError('err-password', 'Password must be at least 8 characters');
      hasError = true;
    }

    if (_currentTab === 'register' && !name) {
      _showFieldError('err-name', 'Full name is required');
      hasError = true;
    }

    if (hasError) return;

    if (_currentTab === 'login') {
      await _handleLogin(email, pw, false);
    } else {
      await _handleRegister(email, pw, name);
    }
  }

  function _setLoading(loading) {
    var submitBtn = document.getElementById('btn-auth-submit');
    var demoBtn   = document.getElementById('btn-demo-login');
    if (!submitBtn) return;

    var btnText    = submitBtn.querySelector('.btn-text');
    var btnSpinner = submitBtn.querySelector('.btn-spinner');

    submitBtn.disabled = loading;
    if (demoBtn) demoBtn.disabled = loading;

    if (loading) {
      if (btnText) btnText.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
    } else {
      if (btnText) btnText.style.display = 'inline';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }
  }

  async function _handleLogin(email, password, isDemo) {
    _setLoading(true);
    try {
      var res = await api.auth.login(email, password);
      api.setToken(res.access_token);

      var user = await api.auth.me();
      setCurrentUser(user);

      hideAuthScreen();
      app.toast('success', isDemo ? 'Demo account loaded!' : 'Welcome back, ' + (user.profile ? user.profile.display_name : 'Student') + '!');

      // Synchronize backend data into state
      await state.syncFromBackend();
      app.renderSidebar();
      app.navigate(location.hash || '#/dashboard');

      // Check for legacy localStorage data to offer one-time migration
      _checkLegacyDataMigration();

    } catch (err) {
      console.error('Login error:', err);
      _setLoading(false);
      var msg = err.message || 'Invalid email or password';
      if (err.status === 429) {
        _showFieldError('err-password', 'Too many failed login attempts. Please wait 5 minutes and try again.');
      } else if (msg.toLowerCase().includes('invalid email or password')) {
        _showFieldError('err-password', 'Invalid email or password. If you haven\'t registered yet, click "Register" above to create your account!');
      } else {
        _showFieldError('err-password', msg);
      }
      app.toast('danger', 'Login failed', msg);
    }
  }

  async function _handleRegister(email, password, displayName) {
    _setLoading(true);
    try {
      var res = await api.auth.register(email, password, displayName);
      api.setToken(res.access_token);

      var user = await api.auth.me();
      setCurrentUser(user);

      hideAuthScreen();
      app.toast('success', 'Account created successfully!', 'Welcome to StudySync, ' + displayName + '!');

      // Load initial state
      await state.syncFromBackend();
      app.renderSidebar();
      app.navigate('#/dashboard');

      // Check for legacy localStorage data
      _checkLegacyDataMigration();

    } catch (err) {
      console.error('Registration error:', err);
      _setLoading(false);
      var msg = err.message || 'Registration failed';
      _showFieldError('err-email', msg);
      app.toast('danger', 'Registration error', msg);
    }
  }

  function _clearErrors() {
    ['err-name', 'err-email', 'err-password'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

  function _showFieldError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  /* ── Legacy Data Migration (localStorage -> Backend) ─ */
  function _checkLegacyDataMigration() {
    var rawTasks = localStorage.getItem('ss_tasks');
    var rawSessions = localStorage.getItem('ss_sessions');
    if (!rawTasks && !rawSessions) return;

    try {
      var tasks = rawTasks ? JSON.parse(rawTasks) : [];
      var sessions = rawSessions ? JSON.parse(rawSessions) : [];
      if (!tasks.length && !sessions.length) return;

      var banner = document.createElement('div');
      banner.id = 'legacy-data-banner';
      banner.className = 'legacy-data-banner';
      banner.innerHTML = [
        '<div class="banner-content">',
          '<strong>Found offline browser data:</strong> We detected ' + (tasks.length + sessions.length) + ' items in your browser storage. Would you like to import them to your account?',
        '</div>',
        '<div class="banner-actions">',
          '<button id="btn-import-legacy" class="btn btn-primary btn-sm">Import to Account</button>',
          '<button id="btn-dismiss-legacy" class="btn btn-ghost btn-sm">Dismiss</button>',
        '</div>'
      ].join('');

      document.body.prepend(banner);

      document.getElementById('btn-import-legacy').addEventListener('click', async function () {
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'Importing...';
        try {
          var payload = {
            tasks: tasks,
            sessions: sessions,
            timer: localStorage.getItem('ss_timerLog') ? JSON.parse(localStorage.getItem('ss_timerLog')) : [],
            settings: localStorage.getItem('ss_settings') ? JSON.parse(localStorage.getItem('ss_settings')) : {}
          };
          await api.data.importJson(payload);
          // Clean legacy keys
          localStorage.removeItem('ss_tasks');
          localStorage.removeItem('ss_sessions');
          localStorage.removeItem('ss_timerLog');
          banner.remove();
          app.toast('success', 'Data imported successfully!', 'Your tasks and sessions are now stored on the server.');
          await state.syncFromBackend();
          app.renderSidebar();
        } catch (e) {
          app.toast('danger', 'Import failed', e.message);
          btn.disabled = false;
          btn.textContent = 'Retry Import';
        }
      });

      document.getElementById('btn-dismiss-legacy').addEventListener('click', function () {
        banner.remove();
      });

    } catch (e) {
      console.warn('Failed checking legacy data:', e);
    }
  }

  /* ── Server Unreachable View ───────────────────────── */
  function showServerUnreachableScreen(onRetry) {
    var overlay = document.getElementById('server-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'server-error-overlay';
      overlay.className = 'auth-overlay';
      document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    overlay.innerHTML = [
      '<div class="auth-card server-error-card">',
        '<div class="server-error-icon">',
          '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        '</div>',
        '<h2 class="auth-title">Cannot reach StudySync server</h2>',
        '<p class="auth-subtitle" style="margin-bottom:var(--space-6);">',
          'Please ensure the FastAPI backend is running at <code>http://127.0.0.1:8000</code> by running:<br>',
          '<strong style="display:block;margin-top:8px;font-family:var(--font-mono);background:var(--surface-2);padding:8px 12px;border-radius:var(--radius-md);">uvicorn app.main:app --reload</strong>',
        '</p>',
        '<button type="button" id="btn-server-retry" class="btn btn-primary btn-block">',
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>',
          ' Retry Connection',
        '</button>',
      '</div>'
    ].join('');

    document.getElementById('btn-server-retry').addEventListener('click', function () {
      overlay.style.display = 'none';
      if (onRetry) onRetry();
    });
  }

  /* ── Logout ────────────────────────────────────────── */
  function logout() {
    api.clearAuth();
    _currentUser = null;
    state.clear();
    showAuthScreen('You have been logged out.');
    app.toast('info', 'Logged out', 'You have been safely signed out.');
  }

  return {
    getCurrentUser,
    setCurrentUser,
    isAuthenticated,
    showAuthScreen,
    hideAuthScreen,
    showLogin: function (msg) {
      _currentTab = 'login';
      showAuthScreen(msg);
    },
    showServerUnreachableScreen,
    logout
  };

}());
