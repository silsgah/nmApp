# NM Practical Exam Portal — Implementation Plan
> GAFCONM Nursing & Midwifery Practical Examination System

---

## How the GAFCONM Examination System Works

### Two Programmes
- **RGN** — Registered General Nurse (~50+ clinical tasks)
- **RM** — Registered Midwife (~12+ midwifery tasks)
- **Health Assessment** — Shared clinical assessment tasks (treated as independent category)

### Component Tasks (Practical Stations)
Each task has 8–26 sequential steps. The examiner rates each step:
- **0–4 scale** (RGN/RM tasks): 0=Omitted, 1=Poor, 2=Hesitant-correct, 3=Correct, 4=Excellent
- **0–2 scale** (Health Assessment): 0=Omitted, 1=Hesitant, 2=Correct

### Score Flow
```
Programme (RGN / RM)
  → Assessment Category (Basic / Major / Minor — CONFIGURABLE)
    → Station (one practical task)
      → Examiner Scores (configurable count, default 3 per station)
        → Category Total
          → Overall Practical Score
            → Pass / Fail (configurable threshold)
```

---

## Assessment Categories Explained

Practical tasks are grouped by clinical complexity and importance:

| Category | Description | Examples |
|----------|-------------|---------|
| **Basic** | Foundational nursing/midwifery skills every student must master | Bed-making, Vital signs, Hand hygiene, Admission procedure |
| **Major** | Complex, high-stakes clinical procedures requiring precision | IV infusion, Catheterisation, Wound dressing, Lumbar puncture prep, Newborn examination |
| **Minor** | Supportive clinical activities and patient communication | Health education sessions, Patient orientation, Social history-taking, Discharge planning |

These categories are **fully configurable** — the admin can rename, add, or remove categories and assign tasks accordingly. Each category can have its own **weight** and **minimum pass threshold**.

---

## Design Decisions (User-Confirmed)

| Parameter | Decision |
|-----------|----------|
| Scoring/Pass-Fail | **Configurable** — admin sets thresholds per category and overall |
| Examiner Count | **Configurable**, defaults to 3 examiners per station |
| Assessment Categories | **Configurable** — admin can create/edit/weight categories |
| Student Station Assignment | **Configurable** — admin assigns students to stations |
| Examination Sessions | **Semester-based** — one major practical exam per semester |
| Score Entry | **Per task total** — examiner enters the total score per task, not per step |
| Health Assessment Tasks | **Independent category** — separate from RGN/RM component tasks |
| Report Format | **PDF exportable** |
| UI/UX | **Modern, premium design** |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + shadcn/ui + Tailwind CSS |
| Backend | Fastify (Node.js) REST API |
| Database | PostgreSQL with Prisma ORM |
| Auth | JWT + HTTP-only cookies |
| PDF Export | react-pdf or puppeteer |
| State | Zustand + TanStack Query |

---

## Database Schema

### Core Configuration Tables
```sql
programmes           -- RGN, RM
assessment_categories -- Basic, Major, Minor (configurable per session)
tasks                -- each practical skill/station task
task_steps           -- individual steps within a task (for display reference)
```

### User & Role Tables
```sql
users                -- id, name, email, password_hash, role, programme_id
roles                -- student | examiner | admin
```

### Exam Session Tables
```sql
exam_sessions        -- id, name, semester, year, programme_id, status, config (JSON)
stations             -- id, session_id, task_id, category_id, station_code
session_config       -- pass_mark, examiner_count, category_weights (JSON)
```

### Assignment Tables
```sql
student_assignments  -- student_id, station_id, candidate_number
examiner_assignments -- examiner_id, station_id
```

### Scoring Tables
```sql
scorecards           -- id, student_assignment_id, examiner_id, task_id, total_score, max_score, submitted_at
```

### Results Tables
```sql
student_results      -- student_id, session_id, category_scores (JSON), overall_score, pass_fail, published_at
```

---

## Application Modules

### 🔐 Auth Module
- Login page (role-based redirect)
- JWT with HTTP-only cookies
- Middleware role guards

### 👑 Admin Portal
- Dashboard with session overview and statistics
- Exam Session Management (create, configure, activate, close)
- Task Bank (full CRUD for all nursing/midwifery tasks with steps)
- User Management (students, examiners)
- Station Assignment (assign students and examiners to stations)
- Assessment Category Configuration (weights, pass marks)
- Results Management (review, publish, export PDF)

### 📋 Examiner Portal
- Dashboard showing assigned stations and pending/completed scorecards
- Marking Interface — list of candidates at their station, enter total score per task
- View submitted scorecards (read-only)
- Confirmation workflow before final submission

### 🎓 Student Portal
- Dashboard showing exam schedule and station assignment
- Results page (visible only after admin publishes)
- Download result certificate (PDF)

### 📊 Grading Engine (Backend)
- Aggregate examiner scores per student per task
- Calculate category totals using configured weights
- Apply configurable pass/fail thresholds
- Generate result objects for all students in a session

---

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Project scaffolding, DB schema, Fastify API, Next.js + shadcn/ui, Auth | ⏳ In Progress |
| **Phase 2** | Admin module — session management, task bank, user management | ⏳ Pending |
| **Phase 3** | Examiner module — marking interface, scorecard submission | ⏳ Pending |
| **Phase 4** | Student module — results dashboard, PDF certificate | ⏳ Pending |
| **Phase 5** | Grading engine, PDF reports, polish and deploy | ⏳ Pending |
