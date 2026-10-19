# StudySync Bug Bounty Competition — Bug Registry 🎯

This document is the official master registry for the **15 intentional bugs** injected into the StudySync codebase.
It is intended for competition judges, organizers, and automated scoring systems.

---

## 🏆 Competition Scoring Overview

| Difficulty | Count | Points Each | Total Points |
| :--- | :---: | :---: | :---: |
| **Easy** | 5 | 50 pts | 250 pts |
| **Medium** | 5 | 100 pts | 500 pts |
| **Hard** | 5 | 200 pts | 1,000 pts |
| **Total** | **15** | — | **1,750 pts** |

---

## 📋 Master Bug Registry Table

| Bug # | Level | Page / Area | File | Line(s) | Description | Points |
| :---: | :---: | :--- | :--- | :---: | :--- | :---: |
| **#01** | `Easy` | Dashboard | `frontend/js/dashboard.js` | 84 | Overdue stat card counts completed tasks with past deadlines | 50 |
| **#02** | `Easy` | My Tasks | `frontend/js/tasks.js` | 51 | Task search is strictly case-sensitive | 50 |
| **#03** | `Easy` | Settings | `frontend/js/settings.js` | 70 | Short break input allows 0 minutes | 50 |
| **#04** | `Easy` | Focus Timer | `frontend/js/timer.js` | 204 | Reset button always defaults to 25m Focus mode | 50 |
| **#05** | `Easy` | Study Planner | `frontend/js/planner.js` | 152 | Subject duration sum uses string concatenation | 50 |
| **#06** | `Medium` | My Tasks | `frontend/js/tasks.js` | 47 | "High" priority filter tab includes completed tasks | 100 |
| **#07** | `Medium` | Analytics | `frontend/js/analytics.js` | 161 | Daily focus bar height uses hardcoded 60 instead of max | 100 |
| **#08** | `Medium` | Study Planner | `frontend/js/planner.js` | 259 | Delete session sends subject name instead of session UUID | 100 |
| **#09** | `Medium` | Focus Timer | `frontend/js/timer.js` | 165 | Session log duration recorded in seconds instead of minutes | 100 |
| **#10** | `Medium` | Backend API | `backend/app/schemas.py` | 79 | Task update accepts arbitrary invalid priority strings | 100 |
| **#11** | `Hard` | Backend / Security | `backend/app/routers/planner.py` | 111–113 | IDOR: Missing user ownership check on study session delete | 200 |
| **#12** | `Hard` | Security / UI | `frontend/js/tasks.js` | 152 | Stored XSS via unescaped task notes rendering | 200 |
| **#13** | `Hard` | Backend / Security | `backend/app/security.py` | 36 | JWT verification skips expiration check (`verify_exp: False`) | 200 |
| **#14** | `Hard` | Analytics | `frontend/js/analytics.js` | 232 | Activity heatmap 28-day loop skips today (`i > 0`) | 200 |
| **#15** | `Hard` | State Management | `frontend/js/state.js` | 162–168 | Stale localStorage overrides backend profile avatar & course | 200 |

---

## 🔍 Detailed Bug Breakdown & Fixes

---

### Bug #01: Overdue Stat Card Counts Completed Tasks
- **Level:** Easy (50 pts)
- **Component:** Dashboard
- **File:** `frontend/js/dashboard.js` (and `js/dashboard.js`), Line 84
- **How to Reproduce:**
  1. Go to **My Tasks** and create a task with a due date in the past (e.g. yesterday).
  2. Mark that task as **Done** (checked).
  3. Navigate to **Dashboard**.
  4. Compare the top welcome banner chip (*"Overdue"*) with the 4th stat card (*"Overdue"*).
- **Expected Behaviour:** The Overdue stat card should only count pending (uncompleted) tasks whose deadline has passed (`status !== 'done'`).
- **Actual Behaviour:** The Overdue stat card counts all tasks with a past due date, including completed tasks. The top banner shows `0 Overdue` while the stat card shows `1 Overdue`.
- **Root Cause:** Line 84 in `_renderStats` omitted `t.status !== 'done'` in the filter predicate.
- **The Fix:**
  ```javascript
  // Before:
  var overdue = tasks.filter(function(t){ return u.isOverdue(t.dueDate); }).length;

  // After:
  var overdue = tasks.filter(function(t){ return t.status !== 'done' && u.isOverdue(t.dueDate); }).length;
  ```

---

### Bug #02: Task Search Is Strictly Case-Sensitive
- **Level:** Easy (50 pts)
- **Component:** My Tasks
- **File:** `frontend/js/tasks.js` (and `js/tasks.js`), Line 51
- **How to Reproduce:**
  1. In the demo dataset, observe the task titled *"Review Calculus notes"*.
  2. In the search box on the Tasks page, type `"calculus"` (all lowercase).
- **Expected Behaviour:** The task *"Review Calculus notes"* should appear in the filtered results.
- **Actual Behaviour:** The task disappears and says *"No tasks match your search"*. Searching `"Calculus"` (with capital C) works, but lowercase fails.
- **Root Cause:** In `_filterAndSort`, `_search` is not normalized to lowercase before matching against task titles and subjects.
- **The Fix:**
  ```javascript
  // Before:
  if (_search) {
    var q = _search;
    tasks = tasks.filter(function(t){
      return (t.title || '').includes(q) ||
             (t.subject || '').includes(q) ||
             (t.notes || '').includes(q);
    });
  }

  // After:
  if (_search) {
    var q = _search.toLowerCase();
    tasks = tasks.filter(function(t){
      return (t.title || '').toLowerCase().includes(q) ||
             (t.subject || '').toLowerCase().includes(q) ||
             (t.notes || '').toLowerCase().includes(q);
    });
  }
  ```

---

### Bug #03: Short Break Setting Allows 0 Minutes
- **Level:** Easy (50 pts)
- **Component:** Settings -> Timer
- **File:** `frontend/js/settings.js` (and `js/settings.js`), Line 70
- **How to Reproduce:**
  1. Navigate to **Settings** -> **Timer**.
  2. Click the minus `(−)` button next to **Short Break** until it reaches `0`.
  3. Navigate to **Focus Timer** and switch to the **Short Break** tab.
- **Expected Behaviour:** Short break duration should have a minimum of at least `1` minute.
- **Actual Behaviour:** Duration displays `00:00`. Clicking the Play button immediately completes the break and triggers an alert.
- **Root Cause:** The `min` parameter for the `short-break` number input was set to `0` instead of `1`.
- **The Fix:**
  ```javascript
  // Before:
  _numberInput('short-break', s.shortBreak || 5, 0, 30, 1, 'shortBreak'),

  // After:
  _numberInput('short-break', s.shortBreak || 5, 1, 30, 1, 'shortBreak'),
  ```

---

### Bug #04: Timer Reset Button Always Defaults to 25m Focus Mode
- **Level:** Easy (50 pts)
- **Component:** Focus Timer
- **File:** `frontend/js/timer.js` (and `js/timer.js`), Line 204
- **How to Reproduce:**
  1. Open the **Focus Timer** page.
  2. Click the **Short Break** tab (display shows `05:00`).
  3. Click Play to start the timer, then click the **Reset** button (counter-clockwise arrow).
- **Expected Behaviour:** The timer should reset to `05:00` (the short break duration).
- **Actual Behaviour:** The timer resets to `25:00` and switches context back to Focus Time while the Short Break tab remains highlighted.
- **Root Cause:** The `_reset` handler calls `_resetTimer()` with no arguments instead of preserving `_mode`, causing `_resetTimer` to fallback to `'focus'`.
- **The Fix:**
  ```javascript
  // Before:
  function _reset() {
    clearInterval(_intervalId);
    _running = false;
    _resetTimer();
    _updatePlayPause();
  }

  // After:
  function _reset() {
    clearInterval(_intervalId);
    _running = false;
    _resetTimer(_mode);
    _updatePlayPause();
  }
  ```

---

### Bug #05: Subject Total Hours Sum Uses String Concatenation
- **Level:** Easy (50 pts)
- **Component:** Study Planner
- **File:** `frontend/js/planner.js` (and `js/planner.js`), Line 152
- **How to Reproduce:**
  1. Open the **Study Planner** page.
  2. Add two study sessions for the same subject (e.g. Mathematics: 60 mins and 45 mins).
  3. Look at the **Subjects** sidebar panel on the right.
- **Expected Behaviour:** Mathematics should show `1h 45m` (105 mins).
- **Actual Behaviour:** Mathematics displays an inflated time like `100h 45m` (because `"" + 60 + 45 = "6045"` minutes).
- **Root Cause:** The accumulator in the `reduce` function was initialized with an empty string `''` rather than `0`, causing JavaScript string coercion.
- **The Fix:**
  ```javascript
  // Before:
  var totalMins = weekSessions.reduce(function(acc, sess){ return acc + (sess.duration || 0); }, '');

  // After:
  var totalMins = weekSessions.reduce(function(acc, sess){ return acc + (sess.duration || 0); }, 0);
  ```

---

### Bug #06: "High" Filter Tab Includes Completed Tasks While Badge Does Not
- **Level:** Medium (100 pts)
- **Component:** My Tasks
- **File:** `frontend/js/tasks.js` (and `js/tasks.js`), Line 47
- **How to Reproduce:**
  1. Go to **My Tasks**. Observe the badge on the **High** filter tab (e.g. `1`).
  2. Complete that high priority task by checking its checkbox. The badge updates to `0`.
  3. Click the **High** filter tab.
- **Expected Behaviour:** The tab should show no active tasks, matching the badge count `0`.
- **Actual Behaviour:** The completed task is shown in the list with a strikethrough, creating a discrepancy between the badge count (`0`) and the visible rows (`1`).
- **Root Cause:** In `_filterAndSort`, the `_filter === 'high'` branch checks `t.priority === 'high'` but omits `t.status !== 'done'`.
- **The Fix:**
  ```javascript
  // Before:
  if (_filter === 'high') tasks = tasks.filter(function(t){ return t.priority === 'high'; });

  // After:
  if (_filter === 'high') tasks = tasks.filter(function(t){ return t.priority === 'high' && t.status !== 'done'; });
  ```

---

### Bug #07: Daily Focus Bar Chart Overflows Container
- **Level:** Medium (100 pts)
- **Component:** Analytics
- **File:** `frontend/js/analytics.js` (and `js/analytics.js`), Line 161
- **How to Reproduce:**
  1. Record focus sessions totaling 120 minutes in a single day.
  2. Navigate to **Progress Analytics**.
  3. Inspect the **Daily Focus Time (Last 7 days)** bar chart.
- **Expected Behaviour:** The tallest bar scales proportionally within the 150px height container using `maxMins`.
- **Actual Behaviour:** The bar is calculated as `(120 / 60) * 150 = 300px`, overflowing outside the chart card and overlapping other DOM elements.
- **Root Cause:** The formula hardcoded divisor `60` instead of the dynamic `maxMins` variable.
- **The Fix:**
  ```javascript
  // Before:
  var height = maxMins > 0 ? Math.round((d.mins / 60) * maxHeight) : 0;

  // After:
  var height = maxMins > 0 ? Math.round((d.mins / maxMins) * maxHeight) : 0;
  ```

---

### Bug #08: Delete Study Session Fails Silently (Sends Subject Instead of UUID)
- **Level:** Medium (100 pts)
- **Component:** Study Planner
- **File:** `frontend/js/planner.js` (and `js/planner.js`), Line 259
- **How to Reproduce:**
  1. Open the **Study Planner**. Click any existing session block to open the **Edit Study Session** modal.
  2. Click **Delete** at the bottom left and confirm the prompt.
- **Expected Behaviour:** The session is deleted and disappears from the week calendar grid.
- **Actual Behaviour:** A toast says *"Session removed"*, but the session remains on the calendar grid and is not removed.
- **Root Cause:** The delete button handler calls `state.deleteSession(session.subject)` instead of `state.deleteSession(session.id)`. Since `deleteSession` matches by UUID, subject string matching fails silently.
- **The Fix:**
  ```javascript
  // Before:
  state.deleteSession(session.subject);

  // After:
  state.deleteSession(session.id);
  ```

---

### Bug #09: Timer Log Records Duration in Seconds Instead of Minutes
- **Level:** Medium (100 pts)
- **Component:** Focus Timer
- **File:** `frontend/js/timer.js` (and `js/timer.js`), Line 165
- **How to Reproduce:**
  1. Open **Focus Timer**. Let a focus session complete (or fast-forward via `_onComplete()`).
  2. Inspect the **Today's Sessions** log list on the right sidebar.
- **Expected Behaviour:** The session log should read `25m`.
- **Actual Behaviour:** The session log reads `25h 0m` or `1500m` because duration stored `1500` (seconds) instead of `25` (minutes).
- **Root Cause:** Line 165 saves `d.focus` (which is in seconds: 1500) rather than dividing by 60 (`Math.round(d.focus / 60)`).
- **The Fix:**
  ```javascript
  // Before:
  duration: d.focus,

  // After:
  duration: Math.round(d.focus / 60),
  ```

---

### Bug #10: Task Update Endpoint Accepts Arbitrary Invalid Priorities
- **Level:** Medium (100 pts)
- **Component:** Backend API (`PUT /api/tasks/{task_id}`)
- **File:** `backend/app/schemas.py`, Line 79
- **How to Reproduce:**
  1. Authenticate and create a task. Note its `id`.
  2. Send a `PUT /api/tasks/{task_id}` request with body:
     ```json
     { "priority": "super-urgent" }
     ```
  3. Load the tasks page in the frontend.
- **Expected Behaviour:** The API should return `422 Unprocessable Entity` enforcing `pattern="^(low|medium|high)$"`.
- **Actual Behaviour:** The API returns `200 OK` and saves `"super-urgent"`. In the frontend, the priority badge renders completely blank because `priorityBadge['super-urgent']` is `undefined`.
- **Root Cause:** In `TaskUpdate` schema, regex validation was removed and replaced with a generic `max_length=20`.
- **The Fix:**
  ```python
  # Before:
  priority: Optional[str] = Field(None, max_length=20)

  # After:
  priority: Optional[str] = Field(None, pattern="^(low|medium|high)$")
  ```

---

### Bug #11: Insecure Direct Object Reference (IDOR) on Session Delete
- **Level:** Hard / Security (200 pts)
- **Component:** Backend API (`DELETE /api/sessions/{session_id}`)
- **File:** `backend/app/routers/planner.py`, Lines 111–113
- **How to Reproduce:**
  1. User A logs in and creates a study session. Note the `session_id`.
  2. User B logs in (different account) and sends a DELETE request:
     ```bash
     curl -X DELETE "http://127.0.0.1:8000/api/sessions/{session_id_of_user_a}" \
          -H "Authorization: Bearer <USER_B_TOKEN>"
     ```
- **Expected Behaviour:** The API should return `404 Not Found` (or `403 Forbidden`) because User B does not own User A's session.
- **Actual Behaviour:** The API returns `204 No Content` and permanently deletes User A's study session.
- **Root Cause:** The database query filters solely by `StudySession.id == session_id` and omits `StudySession.user_id == current_user.id`.
- **The Fix:**
  ```python
  # Before:
  session = db.query(StudySession).filter(
      StudySession.id == session_id
  ).first()

  # After:
  session = db.query(StudySession).filter(
      StudySession.id == session_id,
      StudySession.user_id == current_user.id
  ).first()
  ```

---

### Bug #12: Stored Cross-Site Scripting (XSS) in Task Notes
- **Level:** Hard / Security (200 pts)
- **Component:** My Tasks
- **File:** `frontend/js/tasks.js` (and `js/tasks.js`), Line 152
- **How to Reproduce:**
  1. Go to **My Tasks** and click **New Task**.
  2. Set title to *"Security Audit"* and in **Notes** input paste:
     ```html
     <img src="x" onerror="alert('StudySync XSS Vulnerability')">
     ```
  3. Save the task.
- **Expected Behaviour:** The note text should be sanitized/escaped and rendered literally as text.
- **Actual Behaviour:** An `alert` dialog pops up immediately because the note is injected directly into `innerHTML` without `app.escapeHtml()`.
- **Root Cause:** In `_taskCard`, `task.notes` is passed to `u.truncate()` but omits `app.escapeHtml()`.
- **The Fix:**
  ```javascript
  // Before:
  task.notes ? '<div class="task-notes">' + u.truncate(task.notes, 120) + '</div>' : '',

  // After:
  task.notes ? '<div class="task-notes">' + app.escapeHtml(u.truncate(task.notes, 120)) + '</div>' : '',
  ```

---

### Bug #13: JWT Expiration Check Disabled (`verify_exp: False`)
- **Level:** Hard / Security (200 pts)
- **Component:** Backend Security (`decode_access_token`)
- **File:** `backend/app/security.py`, Line 36
- **How to Reproduce:**
  1. Generate an expired JWT token (e.g. with `exp = current_time - 3600`).
  2. Call any protected endpoint (e.g. `GET /api/auth/me`) using the expired token:
     ```bash
     curl -H "Authorization: Bearer <EXPIRED_TOKEN>" http://127.0.0.1:8000/api/auth/me
     ```
- **Expected Behaviour:** The backend should reject the token with `401 Unauthorized` because the token is expired.
- **Actual Behaviour:** The backend accepts the expired token and returns `200 OK` with user details. Tokens remain valid indefinitely.
- **Root Cause:** `jwt.decode` was passed `options={"verify_exp": False}`, turning off PyJWT's expiration verification.
- **The Fix:**
  ```python
  # Before:
  payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})

  # After:
  payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
  ```

---

### Bug #14: Activity Heatmap Skips Today Due to Loop Boundary Flaw
- **Level:** Hard (200 pts)
- **Component:** Analytics
- **File:** `frontend/js/analytics.js` (and `js/analytics.js`), Line 232
- **How to Reproduce:**
  1. Complete a focus session today.
  2. Open **Progress Analytics** and scroll down to the **Activity Heatmap**.
  3. Hover over the last cell on the bottom right.
- **Expected Behaviour:** The last cell should correspond to today's date and show the focus time completed today.
- **Actual Behaviour:** The last cell corresponds to yesterday (`today - 1d`). Today's activity never appears on the heatmap until the next calendar day.
- **Root Cause:** The loop iterates `for (var i = 28; i > 0; i--)`. It terminates when `i === 1` and never executes `i === 0` (which is `today`).
- **The Fix:**
  ```javascript
  // Before:
  for (var i = 28; i > 0; i--) {

  // After:
  for (var i = 27; i >= 0; i--) {
  ```

---

### Bug #15: Stale LocalStorage Cache Overrides Backend Profile Course & Avatar
- **Level:** Hard (200 pts)
- **Component:** State Management
- **File:** `frontend/js/state.js` (and `js/state.js`), Lines 162–168
- **How to Reproduce:**
  1. User has existing profile data saved in browser localStorage (e.g. `course: "Electrical Engineering"`).
  2. In another tab or via API `PUT /api/profile`, update course to `"Computer Science"`.
  3. Refresh the app so `syncFromBackend()` executes.
- **Expected Behaviour:** The authoritative profile returned by the backend (`"Computer Science"`) should be displayed in the UI.
- **Actual Behaviour:** The UI still shows `"Electrical Engineering"` because `syncFromBackend()` checks `localSettings.course` before `profile.course`.
- **Root Cause:** `syncFromBackend()` prioritized stale local storage cache instead of treating the backend API response as the single source of truth.
- **The Fix:**
  ```javascript
  // Before:
  var localSettings = storage.getSettings();
  _state.settings.name = profile.display_name || 'Student';
  _state.settings.darkMode = (profile.theme === 'dark');
  _state.settings.college = profile.college || '';
  _state.settings.course = localSettings.course || profile.course || '';
  _state.settings.year = profile.year || '';
  _state.settings.avatar = localSettings.avatar || profile.avatar || null;

  // After:
  _state.settings.name = profile.display_name || 'Student';
  _state.settings.darkMode = (profile.theme === 'dark');
  _state.settings.college = profile.college || '';
  _state.settings.course = profile.course || '';
  _state.settings.year = profile.year || '';
  _state.settings.avatar = profile.avatar || null;
  ```

---

## 🛠️ Validation & Clean Startup Verification
- **App Startup:** The frontend and backend boot cleanly without any unhandled exceptions or syntax errors.
- **Code Discretion:** Zero comments (such as `// BUG`) or unnatural variable names were added. All bugs mimic realistic human developer oversights.
- **Backend Test Suite:** All 10 automated backend tests (`pytest backend/tests/test_api.py`) continue to pass 100%.
