# StudySync 🎓

> **"Your Academic Life, Organized."**

StudySync is a modern student productivity dashboard built with a **FastAPI (Python 3.11+) backend, SQLite database, JWT authentication with bcrypt**, and a responsive vanilla HTML/CSS/JavaScript frontend with zero build step.

---

## ⚡ Single-Command Quick Start (Full-Stack Mode)

To run the complete application with permanent database storage and real user accounts:

1. Open your terminal in the `backend/` directory:
   ```bash
   cd backend
   ./venv/bin/uvicorn app.main:app --reload
   ```
2. Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.
3. Click **"Continue with Demo Data"** to immediately sign into the pre-seeded demo account (`demo@studysync.app` / `demo123456`) with realistic sample tasks and schedules!
4. Explore the interactive API documentation at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

> 📖 **College Viva & Learning Guide:** See the complete beginner-friendly backend walkthrough in [`backend/BACKEND_GUIDE.md`](backend/BACKEND_GUIDE.md).

---

### Alternative: VS Code Live Server Mode
If you prefer running the frontend via VS Code Live Server at `http://127.0.0.1:5500`, StudySync has full CORS support configured. Just start the backend at port 8000, and open `frontend/index.html` with Live Server!

---

## 🧪 In-Browser Test Suite
StudySync includes an automated unit & integration test runner:
1. Open **`frontend/tests.html`** in your browser.
2. The automated runner will execute tests across:
   - Date calculations, time formatters, unique ID generation (`utils.js`)
   - `localStorage` safe reads, writes, and data seeding (`storage.js`)
   - Event pub/sub and state mutations (`state.js`)
   - Offline vendor availability (`Chart.js`)
3. Results, execution timing, and status badges are presented live on screen.

---

## 📂 Project Structure

```text
StudySync/
├── frontend/             # Single-Page Application (HTML, CSS, JS)
│   ├── index.html        # Main dashboard and application shell
│   ├── tests.html        # In-browser automated unit test runner
│   ├── css/
│   │   └── styles.css    # Design tokens, components, responsive layout
│   ├── js/               # Application logic, router, views, state, api
│   └── images/           # Brand icons and visual assets
│
├── backend/              # Python FastAPI REST API & Database
│   ├── app/              # FastAPI application, SQLAlchemy models, routers
│   ├── tests/            # Automated pytest backend test suite
│   ├── BACKEND_GUIDE.md  # Comprehensive College Viva & Architecture Guide
│   ├── requirements.txt  # Pinned Python dependencies
│   ├── pytest.ini        # Pytest configuration
│   └── .env.example      # Environment variables configuration template
│
└── README.md             # Project overview, setup, and demo presentation script
```

---

## 🎨 Design System & Visual Tokens

The user interface follows a modern SaaS dashboard aesthetic:
- **Background**: `#F8FAFC` (Slate 50)
- **Surfaces / Cards**: `#FFFFFF` (White)
- **Borders**: `#E5E7EB` (Slate 200)
- **Primary Brand**: `#4F46E5` (Indigo 600)
- **Accent**: `#7C3AED` (Violet 600)
- **Light Tints**: `#EEF2FF` (Indigo 50)
- **Typography**: Inter with safe native fallbacks (`system-ui`, `-apple-system`, `sans-serif`)
- **Theme**: Light theme default, with full **Dark Mode** toggle.

---

## 🌟 Core Features Breakdown

### 1. 📊 Dashboard (`#/dashboard`)
- Dynamic greeting based on the time of day ("Good morning", "Good afternoon", "Good evening").
- At-a-glance summary cards: Total tasks completed with progress bar, study hours logged today, study blocks scheduled, and current study streak.
- Quick view of upcoming deadlines within the next 7 days, categorized by priority and overdue status.
- Weekly study streak tracker showing active days with visual dots.

### 2. ✅ My Tasks (`#/tasks`)
- **Full CRUD**: Create new tasks, edit existing tasks, delete with confirmation modal, and mark done.
- **Filters**: Quickly filter by *All*, *To Do*, *In Progress*, *Done*, *Overdue*, and *High Priority*.
- **Live Search**: Instant keyword search matching titles, subjects, and notes.
- **Sorting**: Sort by due date, priority level, subject name, or creation date.
- **Color Coding**: Each task is tagged with its subject badge and color.

### 3. 📅 Study Planner (`#/planner`)
- Interactive 7-day weekly schedule (Monday to Sunday, 07:00 to 22:00).
- Visual blocks representing scheduled study sessions color-coded by subject.
- Click any empty time cell to quickly schedule a study block.
- Click an existing session to edit start/end times or delete it.
- Week navigation with previous/next week controls and a "Today" jump button.

### 4. ⏱️ Focus Timer (`#/timer`)
- Built-in Pomodoro timer with three modes: **Focus (25m)**, **Short Break (5m)**, and **Long Break (15m)**.
- Smooth SVG circular progress ring that animates as time elapses.
- Pomodoro counter tracking completed rounds toward a long break.
- Subject selector allowing students to log focus time against specific courses.
- Historical log of sessions completed today.
- Browser notifications when a session concludes (permission requested gracefully).

### 5. 📈 Analytics (`#/analytics`)
- High-performance data visualizations built using pure SVG and CSS (with local Chart.js available).
- **Tasks by Subject**: Donut breakdown displaying distribution of academic workload.
- **Daily Focus Time**: Bar chart comparing hours studied each day over the past 7 days.
- **Completion by Priority**: Progress metrics for high, medium, and low priority tasks.
- **Activity Heatmap**: 28-day GitHub-style consistency grid highlighting active study days.
- **Top Subjects Ranking**: Leaderboard of subjects by total focus time invested.

### 6. ⚙️ Settings (`#/settings`)
- **Profile Customization**: Change your student name displayed across the dashboard.
- **Pomodoro Configuration**: Adjust session and break durations with interactive stepper controls.
- **Subject Management**: Add custom academic subjects, configure credit hours, and assign custom color swatches.
- **Appearance**: Toggle dark/light theme.
- **Data Management**:
  - Export all data to a portable `.json` backup file.
  - Import and restore data from any previous backup.
  - One-click reset to restore default demo dataset.

---

## 🎤 College Event Demo Script (Step-by-Step)

If presenting StudySync to judges, professors, or students at an event, follow this 3-minute pitch flow:

1. **Quick Reset Before Each Pitch**:
   - In the top bar, click **"Reset Demo"** at any time. This instantly restores the pristine demonstration state (clean tasks, full timetable, and 28-day study history) so every evaluator gets a fresh, perfect experience.

2. **The Hook (Dashboard — `#/dashboard`)**:
   - Point out the modern, premium SaaS aesthetic: clean typography, dark/light theme, and dynamic greeting.
   - Highlight the summary metrics: pending deadlines, today's 50m of focus time, scheduled study blocks, and the 4-day study streak widget.

3. **Task Management & Quick Creation (My Tasks — `#/tasks`)**:
   - Navigate to **"My Tasks"** (or press the **`N`** key anywhere on screen to trigger the New Task modal).
   - Create a task: *"Prepare Pitch Presentation"*, select *Computer Science*, set priority to *High*, and click Save.
   - Filter by **"⚡ High"** or type *"calculus"* into the live search bar.
   - Check off a task to show the smooth strike-through, progress bar update, and completion celebration toast.

4. **Weekly Timetable (Study Planner — `#/planner`)**:
   - Switch to **"Study Planner"**.
   - Show the interactive 7-day schedule (07:00–22:00) populated for the current week.
   - Click an open slot (e.g. Wednesday 2:00 PM) to schedule an *"Exam Prep"* session, color-coded to its subject.

5. **Focus Timer & The Presentation Shortcut (Focus Timer — `#/timer`)**:
   - Switch to **"Focus Timer"**.
   - Select *Mathematics*, hit the big circular **Play** button, and watch the smooth SVG countdown ring animate.
   - **Demo Shortcut**: Click the **Skip (⏭)** button to instantly complete a session without waiting 25 minutes! Show how it logs the session to today's log, fills the Pomodoro cycle dot, and triggers a congratulatory toast.

6. **Actionable Insights (Analytics — `#/analytics`)**:
   - Switch to **"Analytics"**.
   - Show the tasks-by-subject SVG donut chart, the 7-day daily study hours bar chart, and the 28-day GitHub-style Activity Heatmap.

7. **Privacy, Dark Mode & Offline Architecture (Settings — `#/settings`)**:
   - Click the theme toggle icon in the top right to switch into **Dark Mode**.
   - Emphasize to judges: *"StudySync runs 100% on the student's browser with zero cloud tracking, zero external dependencies, and complete data ownership. Everything works offline and can be exported as a JSON backup with one click."*

8. **Automated QA & Code Quality Proof**:
   - Open `tests.html` in a second tab to show the 100% passing automated test suite validating the code architecture.

---

## 💻 Technical Details

- **Strict Vanilla JS**: Classic script tags loaded in sequential dependency order. No ES6 `import`/`export` syntax, avoiding CORS issues when running via `file://`.
- **Zero CDN Dependencies**: All assets (icons, SVGs, Chart.js vendor script) are bundled locally so the site runs completely offline without Wi-Fi.
- **Cross-Platform Responsive**: CSS grid and flexbox layout with custom media queries adapting from 320px mobile screens to wide monitors.
- **Semantic HTML5**: Full accessibility attributes (`aria-label`, `role="navigation"`, semantic `<header>`, `<main>`, `<aside>`).
