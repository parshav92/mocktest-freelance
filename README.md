# Selectoial Platform

An adaptive mock test platform for competitive exam prep — built for parents, students, and admins.

> **Stack:** Next.js 16 · Supabase · Sanity CMS · Tailwind CSS v4 · KaTeX · Framer Motion

---

## Features

- 🎯 **Adaptive difficulty** — question selection adjusts based on per-subject accuracy
- 👨‍👩‍👧 **Three-role system** — Parent, Student, Admin with separate auth flows
- 📝 **Rich question types** — MCQ, fill-in-the-blank, drag-drop, passage/poem-based, and essays
- 🔢 **Math rendering** — KaTeX for inline/display math in questions and options
- ✍️ **AI essay evaluation** — Gemini-powered rubric scoring (in progress)
- 📊 **SWOT analytics** — Strength/weakness reporting with peer comparison
- 🔒 **Hybrid auth** — Supabase Auth for parents · Custom JWT for students (`STU*****` ID + 6-digit PIN)
- 📦 **Bulk upload** — Admin CSV/Excel upload with image support

---

## Installation

```bash
git clone <repo-url>
cd mocktest-freelance
npm install
cp .env.local.example .env.local   # fill in values below
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
STUDENT_JWT_SECRET=          # min 32 chars
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
```

Apply Supabase migrations: `supabase db push` (or run files in `supabase/` manually).

---

## Project Structure

```
app/                  # Next.js App Router pages & API routes
├── (public)/         # Landing page
├── auth/             # Login for all roles
├── api/              # REST endpoints (tests, students, admin)
├── dashboard/        # Role-aware dashboard
└── katex/            # Admin-only formula tester

lib/
├── auth/student.ts   # JWT verification for students
├── services/         # Business logic (test, essay, analytics)
└── supabase/         # Client / server / middleware helpers

supabase/             # SQL migrations & RLS policies
sanity/               # CMS schema
```

---

## Roles & Auth

| Role | Login | Session |
|------|-------|---------|
| Parent / Admin | Email + Google OAuth (Supabase) | Supabase cookie |
| Student | `STU*****` ID + 6-digit PIN | JWT in `httpOnly` cookie |

Students can't use email — their credentials are created and managed by their parent.

---

## Scripts

```bash
npm run stress-test          # API stress test
npm run load-test            # Multi-student load test
npm run seed-analytics       # Generate analytics seed data
```