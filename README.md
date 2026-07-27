# NM Practical Exam Portal — GAFCONM

> Nursing & Midwifery Practical Examination Portal for the Ghana Armed Forces College of Nursing and Midwifery

## Tech Stack

| Layer      | Technology                                      |
|------------|------------------------------------------------|
| Frontend   | Next.js 16, React 19, TailwindCSS 4, shadcn/ui |
| Backend    | Fastify 5, Prisma 7, Node.js 20+               |
| Database   | PostgreSQL (Supabase)                           |
| Auth       | JWT + HTTP-only cookies                         |
| State      | Zustand (client), TanStack Query (server)       |

## Project Structure

```
nmApp/
├── frontend/          # Next.js application
│   ├── src/app/       # App router pages
│   │   ├── admin/     # Admin dashboard, users, tasks, sessions, results, settings
│   │   ├── examiner/  # Examiner dashboard, station scoring
│   │   ├── student/   # Student dashboard, results viewing
│   │   └── login/     # Authentication page
│   ├── src/components/  # UI + layout components
│   ├── src/lib/       # API client, utilities
│   ├── src/store/     # Zustand auth store
│   └── src/providers/ # React Query provider
│
├── backend/           # Fastify API server
│   ├── src/server.js  # App entry point
│   ├── src/routes/    # API route handlers
│   │   ├── auth.js    # Login, logout, password change
│   │   ├── users.js   # User CRUD
│   │   ├── programmes.js
│   │   ├── categories.js
│   │   ├── tasks.js   # Task bank management
│   │   ├── sessions.js # Exam session management
│   │   ├── stations.js
│   │   ├── assignments.js
│   │   ├── scorecards.js # Examiner scoring
│   │   └── results.js # Result computation & publishing
│   ├── src/db/        # Prisma client singleton + seed
│   ├── src/lib/       # PDF generation
│   └── prisma/        # Schema & migrations
│
└── docs/              # Project documentation
```

## Getting Started

### Prerequisites
- Node.js ≥ 20
- PostgreSQL database (or Supabase account)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env          # Edit with your database URL + JWT secret
npx prisma generate           # Generate Prisma client
npx prisma db push            # Push schema to database
npm run db:seed                # Seed initial data
npm run dev                    # Start dev server on :3001
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local    # Edit with your backend URL
npm run dev                    # Start dev server on :3000
```

### Default Credentials (after seeding)
| Role     | Email                                  | Password     |
|----------|---------------------------------------|-------------|
| Admin    | admin@nmportal.edu.gh                 | Admin123!   |
| Examiner | agnes.owusu@nmportal.edu.gh           | Exam123!    |
| Student  | abena.asante@student.nmportal.edu.gh  | Student123! |

## Deployment

- **Frontend**: Deployed to [Vercel](https://vercel.com)
- **Backend**: Deployed to [Railway](https://railway.app)
- **Database**: Hosted on [Supabase](https://supabase.com)

## License

Private — GAFCONM Internal Use
