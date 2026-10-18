/* ========================================================
   StudySync — api.js
   Fetch wrapper for StudySync backend API with JWT auth,
   automatic baseURL detection, token management, error handling,
   and 401 redirect to login.
   ======================================================== */

window.StudySync = window.StudySync || {};

window.StudySync.api = (function () {

  var TOKEN_KEY = 'studysync:v1:token';
  var USER_KEY  = 'studysync:v1:user';

  // Base URL detection
  var isSameOrigin = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') && (location.port === '8000' || location.port === '');
  var BASE_URL = isSameOrigin ? '/api' : 'http://127.0.0.1:8000/api';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getSavedUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSavedUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  /* ── Core request wrapper ──────────────────────────── */
  async function request(endpoint, options) {
    options = options || {};
    var url = endpoint.startsWith('http') ? endpoint : (BASE_URL + (endpoint.startsWith('/') ? endpoint : '/' + endpoint));

    var headers = Object.assign({}, options.headers || {});
    var token = getToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;

    var response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      console.error('StudySync API network error:', networkError);
      var err = new Error('Cannot reach StudySync server. Please ensure the backend is running at http://127.0.0.1:8000 and click Retry.');
      err.isNetworkError = true;
      throw err;
    }

    if (response.status === 204) {
      return null;
    }

    var contentType = response.headers.get('content-type') || '';
    var data = null;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (parseErr) {
        data = null;
      }
    } else {
      data = await response.text();
    }

    // 401 Unauthorized handling
    if (response.status === 401) {
      // If this is a login attempt, 401 means wrong email/password
      if (endpoint.includes('/auth/login')) {
        var loginMsg = (data && data.detail) ? data.detail : 'Invalid email or password';
        var loginErr = new Error(loginMsg);
        loginErr.status = 401;
        throw loginErr;
      }

      // For all other protected endpoints, 401 means token expired or invalid
      clearAuth();
      if (window.StudySync && window.StudySync.auth && typeof window.StudySync.auth.showLogin === 'function') {
        window.StudySync.auth.showLogin('Session expired. Please log in again.');
      }
      var authErr = new Error('Session expired. Please log in again.');
      authErr.status = 401;
      throw authErr;
    }

    if (!response.ok) {
      var msg = 'An unexpected error occurred';
      if (data && typeof data === 'object') {
        if (typeof data.detail === 'string') {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map(function (d) { return d.msg || (d.loc ? d.loc.join('.') : ''); }).join(', ');
        } else if (data.message) {
          msg = data.message;
        }
      } else if (typeof data === 'string' && data.length < 200) {
        msg = data;
      }
      var apiErr = new Error(msg);
      apiErr.status = response.status;
      apiErr.data = data;
      throw apiErr;
    }

    return data;
  }

  /* ── API Endpoints ─────────────────────────────────── */
  var api = {
    BASE_URL: BASE_URL,
    getToken: getToken,
    setToken: setToken,
    clearAuth: clearAuth,
    getSavedUser: getSavedUser,
    setSavedUser: setSavedUser,
    request: request,

    // Health
    health: {
      check: function () {
        return request('/health', { method: 'GET' });
      }
    },

    // Auth
    auth: {
      register: function (email, password, displayName) {
        return request('/auth/register', {
          method: 'POST',
          body: { email: email, password: password, display_name: displayName }
        });
      },
      login: function (email, password) {
        return request('/auth/login', {
          method: 'POST',
          body: { email: email, password: password }
        });
      },
      me: function () {
        return request('/auth/me', { method: 'GET' });
      }
    },

    // Tasks
    tasks: {
      list: function (params) {
        var query = '';
        if (params) {
          var qs = Object.keys(params)
            .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
            .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
            .join('&');
          if (qs) query = '?' + qs;
        }
        return request('/tasks' + query, { method: 'GET' });
      },
      get: function (id) {
        return request('/tasks/' + encodeURIComponent(id), { method: 'GET' });
      },
      create: function (taskData) {
        return request('/tasks', { method: 'POST', body: taskData });
      },
      update: function (id, taskData) {
        return request('/tasks/' + encodeURIComponent(id), { method: 'PUT', body: taskData });
      },
      toggle: function (id) {
        return request('/tasks/' + encodeURIComponent(id) + '/toggle', { method: 'PATCH' });
      },
      delete: function (id) {
        return request('/tasks/' + encodeURIComponent(id), { method: 'DELETE' });
      }
    },

    // Study Sessions
    sessions: {
      list: function (fromDate, toDate) {
        var params = [];
        if (fromDate) params.push('from=' + encodeURIComponent(fromDate));
        if (toDate) params.push('to=' + encodeURIComponent(toDate));
        var qs = params.length ? '?' + params.join('&') : '';
        return request('/sessions' + qs, { method: 'GET' });
      },
      get: function (id) {
        return request('/sessions/' + encodeURIComponent(id), { method: 'GET' });
      },
      create: function (sessionData) {
        return request('/sessions', { method: 'POST', body: sessionData });
      },
      update: function (id, sessionData) {
        return request('/sessions/' + encodeURIComponent(id), { method: 'PUT', body: sessionData });
      },
      toggleComplete: function (id) {
        return request('/sessions/' + encodeURIComponent(id) + '/toggle-complete', { method: 'PATCH' });
      },
      delete: function (id) {
        return request('/sessions/' + encodeURIComponent(id), { method: 'DELETE' });
      }
    },

    // Focus Sessions
    focus: {
      getHistory: function () {
        return request('/focus', { method: 'GET' });
      },
      record: function (sessionData) {
        return request('/focus', { method: 'POST', body: sessionData });
      }
    },

    // Profile
    profile: {
      get: function () {
        return request('/profile', { method: 'GET' });
      },
      update: function (profileData) {
        return request('/profile', { method: 'PUT', body: profileData });
      }
    },

    // Data Export / Import / Reset
    data: {
      getExportUrl: function () {
        var token = getToken();
        return BASE_URL + '/export?token=' + encodeURIComponent(token || '');
      },
      exportJson: async function () {
        var token = getToken();
        var res = await fetch(BASE_URL + '/export', {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (!res.ok) throw new Error('Export failed with status ' + res.status);
        var blob = await res.blob();
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'studysync-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      importJson: function (payload) {
        return request('/import', { method: 'POST', body: payload });
      },
      resetData: function () {
        return request('/data', { method: 'DELETE', body: { confirm: true } });
      }
    },

    // Analytics
    analytics: {
      getSummary: function (todayStr) {
        return request('/analytics/summary?today=' + encodeURIComponent(todayStr), { method: 'GET' });
      }
    }
  };

  return api;
}());
