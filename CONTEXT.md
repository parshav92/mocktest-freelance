# MockTest - Developer Context

## Project Overview

This is a mock test platform with three user roles: **Student**, **Parent**, and **Admin**.

- **Parents** manage students and subscriptions
- **Students** take tests (created by parents, linked via subscription)
- **Admins** have full system access (created directly in Supabase)

---

## Authentication Architecture

### Two Authentication Systems

| User Type | Auth Method | Session Storage |
|-----------|-------------|-----------------|
| **Parent/Admin** | Supabase Auth (email/password + Google OAuth) | Supabase cookies (automatic) |
| **Student** | Custom auth (Student ID + 6-digit password) | JWT in httpOnly cookie |

### Why Hybrid Auth?

Students don't use email - they login with a unique `STU*****` ID and 6-digit numeric password set by their parent. This is incompatible with Supabase Auth, so we use custom JWT-based authentication for students.

---

## Database Schema

### Tables

```
profiles          → Parents & Admins (linked to auth.users)
students          → Student accounts (custom auth)
subscriptions     → One per student, tracks expiry
student_login_attempts → Rate limiting for student login
```

### Key Relationships

```
auth.users (Supabase) 
    ↓ (trigger creates profile)
profiles (parent_id)
    ↓
students (linked to parent)
    ↓
subscriptions (one per student)
```

### Enums

```sql
user_role: 'parent' | 'admin'
subscription_plan: 'half_yearly' | 'yearly'
subscription_status: 'active' | 'expired' | 'grace_period'
```

---

## File Structure

```
app/
├── (public)/              # Public pages (landing, etc.)
├── auth/
│   ├── page.tsx           # Main auth page (role selection → forms)
│   └── callback/
│       └── route.ts       # OAuth callback handler
├── api/
│   ├── auth/student/
│   │   ├── login/route.ts   # Student login (returns JWT)
│   │   ├── logout/route.ts  # Student logout (clears cookie)
│   │   └── verify/route.ts  # Verify student session
│   ├── subscriptions/
│   │   └── route.ts       # GET list / POST create subscription
│   └── students/
│       └── route.ts       # GET list / POST create student
├── dashboard/
│   ├── page.tsx           # Dashboard (server component, detects user type)
│   ├── parent-dashboard.tsx   # Parent dashboard UI
│   ├── student-dashboard.tsx  # Student dashboard UI
│   ├── subscribe/
│   │   └── page.tsx       # Subscription pricing page (dummy Stripe)
│   └── students/
│       └── new/
│           └── page.tsx   # Create student profile form

lib/
├── supabase/
│   ├── client.ts          # Browser Supabase client
│   ├── server.ts          # Server Supabase client  
│   └── middleware.ts      # Session refresh utility
├── auth/
│   └── student.ts         # Student JWT verification utility

proxy.ts                   # Next.js 16 proxy (replaces middleware)
```

---

## Authentication Flows

### Parent Login (Supabase Auth)

```
1. User selects "Parent" on /auth
2. Enters email/password OR clicks Google OAuth
3. Supabase handles authentication
4. On success → redirect to /dashboard
5. Supabase session stored in cookies (automatic refresh via proxy.ts)
```

### Parent Signup

```
1. User fills: Full Name, Email, Password
2. Supabase creates user in auth.users
3. Trigger `handle_new_user()` creates row in `profiles` table
4. User receives confirmation email
5. After confirming → can login
```

### Student Login (Custom JWT)

```
1. User selects "Student" on /auth
2. Enters Student ID (STU*****) + 6-digit password
3. POST /api/auth/student/login
   ├── Check rate limiting (5 attempts / 15 min)
   ├── Find student in database
   ├── Verify bcrypt password hash
   ├── Check subscription status
   ├── Generate JWT (30-day expiry)
   └── Set httpOnly cookie "student_session"
4. Redirect to /dashboard
```

### Session Verification

**Parent/Admin (Server Component):**
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Student (Server Component):**
```typescript
import { getStudentSession } from "@/lib/auth/student";
const session = await getStudentSession(); // Returns null if invalid/expired
```

---

## Subscription Model

### Business Rules

- **Pay-per-student**: Each student needs their own subscription
- **Plans**: Half-yearly (6 months) or Yearly (12 months)
- **Grace period**: 1 month after expiry (read-only access)
- **Renewal**: Remaining time carries over

### Subscription States

| Status | Student Can Login | Can Take Tests | Can View Scores |
|--------|-------------------|----------------|-----------------|
| `active` | ✅ | ✅ | ✅ |
| `grace_period` | ✅ | ❌ | ✅ |
| `expired` | ❌ | ❌ | ❌ |

### Database Functions

```sql
-- Check subscription status (handles grace period logic)
get_student_subscription_status(p_student_id UUID)
  → Returns: status, is_read_only, expires_at, grace_period_ends_at

-- Update statuses (run via cron job)
update_subscription_statuses()
  → Moves active → grace_period when expired
  → Moves grace_period → expired after 1 month
```

---

## Security Measures

### Student Auth Security

1. **Password hashing**: bcrypt (even for 6-digit passwords)
2. **Rate limiting**: 5 failed attempts = 15-minute lockout
3. **JWT**: Signed with `STUDENT_JWT_SECRET`, 30-day expiry
4. **httpOnly cookies**: Prevents XSS token theft

### Row Level Security (RLS)

All tables have RLS enabled:

- Parents can only see their own students/subscriptions
- Students cannot access database directly (JWT contains needed data)
- Admins can access everything
- `student_login_attempts` and sessions only accessible via service role

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Student JWT (CHANGE IN PRODUCTION!)
STUDENT_JWT_SECRET=your-super-secret-key-min-32-chars-long
```

---

## Student ID Format

- Pattern: `STU` + 5 alphanumeric characters
- Example: `STUA7K2X`
- Excluded characters: `I`, `O`, `0`, `1` (avoid confusion)
- Generated by: `generate_student_id()` SQL function

---

## Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "jose": "^6.x",        // JWT signing/verification
  "bcryptjs": "^3.x",    // Password hashing
  "framer-motion": "^11.x" // Auth page animations
}
```

---

## TODO / Future Work

- [ ] Implement actual Stripe payment integration
- [ ] Parent can reset student password
- [ ] Password reset flow for parents
- [ ] Cron job: Run `update_subscription_statuses()` daily
- [ ] Cron job: Run `cleanup_old_login_attempts()` daily
- [x] Student dashboard: Take mock tests (schema ready)
- [ ] Student dashboard: View scores history
- [ ] Admin dashboard: Manage all users
- [ ] Subscription renewal flow
- [ ] Admin question upload UI
- [ ] Test-taking UI (timer, navigation)
- [ ] Essay evaluation with Gemini API

---

## Test Platform Architecture

### Subscription Enforcement

Tests are protected by subscription status at the database level:

| Subscription Status | Start New Test | Continue Test | View Results |
|---------------------|----------------|---------------|--------------|
| `active` | ✅ Yes | ✅ Yes | ✅ Yes |
| `grace_period` | ❌ No | ✅ Yes (existing only) | ✅ Yes (read-only) |
| `expired` | ❌ No | ❌ No | ❌ No |

**Key Functions:**
```sql
-- Check if student can start NEW tests
can_student_take_test(student_id) → BOOLEAN

-- Check access to specific test (returns can_access, is_read_only, reason)
can_student_access_test(student_id, test_id) → TABLE

-- Get subscription status for UI display
get_student_test_access_status(student_id) → TABLE
```

**Triggers:**
- `enforce_subscription_on_test_create` - Prevents INSERT on tests without active subscription
- `enforce_subscription_on_test_start` - Prevents starting not_started test in grace period

### Database Tables (Test Platform)

| Table | Purpose |
|-------|---------|
| `subjects` | Reading, Writing, Math, Thinking Skills |
| `subject_templates` | Difficulty distribution per subject |
| `passages` | Reading passages, poems, extracts |
| `questions` | All questions (JSONB for flexibility) |
| `tests` | Student test instances with answers |
| `student_question_history` | Track seen/answered questions |
| `student_subject_stats` | Per-subject performance for adaptive algo |
| `question_upload_batches` | Track admin bulk uploads |

### Question Types

| Type | Format | Subjects |
|------|--------|----------|
| `mcq` | Standard multiple choice | Math, Thinking Skills |
| `passage_mcq` | MCQ based on passage | Reading |
| `poem_mcq` | MCQ based on poem | Reading |
| `fill_blank_dropdown` | Fill blanks with dropdown | Reading |
| `fill_missing_sentence` | Drag-drop sentences | Reading |
| `essay` | Free-form writing | Writing |

### Question Content Structure (JSONB)

```typescript
// MCQ
{
  question_text: string;
  question_image?: string;  // Storage path
  options: Array<{
    key: "A" | "B" | "C" | "D";
    text?: string;
    image?: string;
  }>;
}

// Fill Blank Dropdown
{
  passage_text: string;  // Use ___ for blanks
  blanks: Array<{
    position: number;
    options: string[];
    correct_index: number;
  }>;
}

// Fill Missing Sentence
{
  passage_with_gaps: string;  // Use [GAP_1], [GAP_2] etc
  sentences: string[];
  correct_mapping: Record<string, number>;  // {"GAP_1": 0, "GAP_2": 2}
}

// Essay
{
  prompt: string;
  word_limit: number;
  time_limit_mins: number;
  rubric: Record<string, number>;  // {"content": 10, "structure": 5}
}
```

### Adaptive Algorithm

```
Difficulty distribution based on overall_accuracy:
- accuracy < 40%  → 30 easy, 8 medium, 2 hard   (Struggling)
- accuracy < 60%  → 25 easy, 12 medium, 3 hard  (Below average)
- accuracy < 75%  → 20 easy, 15 medium, 5 hard  (Average)
- accuracy < 85%  → 15 easy, 17 medium, 8 hard  (Good)
- accuracy >= 85% → 10 easy, 18 medium, 12 hard (Excellent)

First 2 tests use default: 25 easy, 10 medium, 5 hard
```

### Question Selection Priority

1. **Never seen** questions (highest priority)
2. **Previously incorrect** questions
3. **Never show** correctly answered questions (until pool exhausted)

### Test States

```
NOT_STARTED → IN_PROGRESS → SUBMITTED
                ↓              ↓
           ENDED_EARLY    ABANDONED
```

- `ended_early`: Student clicked "End Test" within grace period (2-3 mins)
- `abandoned`: Browser closed, test never resumed, all answers marked wrong (0 marks)

### Storage Structure

```
supabase-storage/
├── questions/
│   ├── {subject_slug}/
│   │   ├── {question_code}_q.png     # Question image
│   │   ├── {question_code}_a.png     # Option A image
│   │   ├── {question_code}_b.png     # Option B image
│   │   └── ...
├── passages/
│   └── {passage_code}.png
└── uploads/
    └── {batch_id}/
        └── original_file.xlsx
```

### CSV Upload Format

**MCQ Questions:**
```csv
code,subject,type,difficulty,question_text,option_a,option_b,option_c,option_d,correct,question_image,solution
MR_001,mathematical-reasoning,mcq,easy,What is 5+3?,6,7,8,9,C,,Add the numbers
```

**Fill Blank Dropdown:**
```csv
code,subject,type,difficulty,passage_text,blanks_json,solution
RD_FIB_001,reading,fill_blank_dropdown,easy,"The cat ___ on the mat.","[{""position"":1,""options"":[""sat"",""sit""],""correct_index"":0}]",
```

### Key Database Functions

```sql
-- Get questions for a test (adaptive selection)
get_test_questions(p_student_id, p_subject_id, p_easy_count, p_medium_count, p_hard_count)

-- Get difficulty distribution based on student performance
get_adaptive_distribution(p_student_id, p_subject_id, p_total_questions)
```

### Triggers (Auto-execute)

| Trigger | When | Action |
|---------|------|--------|
| `on_test_abandoned` | status → 'abandoned' | Mark all answers as wrong (0 marks) |
| `on_test_completed` | status → 'submitted'/'abandoned' | Update student_subject_stats |
| `on_test_completed_history` | status → 'submitted'/'abandoned' | Update student_question_history |

### Essay Evaluation (Gemini - To Be Implemented)

```typescript
// Called immediately after essay submission
const evaluation = await evaluateEssay({
  prompt: question.content.prompt,
  essay: studentAnswer,
  rubric: question.content.rubric,
  wordLimit: question.content.word_limit,
});

// Returns
{
  score: 15,
  maxScore: 20,
  feedback: "Good structure but...",
  rubricScores: { content: 8, structure: 4, grammar: 3 }
}
```

### Test API Endpoints ✅ IMPLEMENTED

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subjects` | GET | List active subjects |
| `/api/tests` | GET | List student's tests (with filters) |
| `/api/tests` | POST | Create & start a new test |
| `/api/tests/access-status` | GET | Get subscription access status |
| `/api/tests/[id]` | GET | Get test with questions |
| `/api/tests/[id]` | PATCH | Update test (start, save_answer, end_early) |
| `/api/tests/[id]/submit` | POST | Submit test for grading |
| `/api/tests/[id]/review` | GET | Get completed test with solutions |
| `/api/admin/questions/upload` | POST | Bulk upload questions |
| `/api/admin/questions` | GET/POST | Manage questions |

---

## Parent Flow (Implemented)

```
1. Parent signs up/logs in via Supabase Auth
2. Dashboard shows "No Active Subscriptions" → CTA to "Add Student"
3. Parent clicks "Add Student" → /dashboard/subscribe
4. Selects plan (Half-yearly ₹2999 / Yearly ₹4999)
5. Clicks "Subscribe Now" → Dummy Stripe creates subscription
6. Redirected to /dashboard/students/new?subscription=<id>
7. Enters student name + sets 6-digit password
8. Student created with unique ID (STU*****)
9. Success page shows credentials to share
10. Dashboard now shows student card with subscription status
```

### Subscription States in Dashboard

- **Unassigned** (student_id is null): Shows "Action Required" card with CTA to create student
- **Active**: Shows student card with green "active" badge
- **Grace Period**: Shows amber warning, student has read-only access
- **Expired**: Shows red badge, student cannot log in

---

## Common Patterns

### Checking User Type in Dashboard

```typescript
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  // Check parent/admin first (Supabase Auth)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Render parent dashboard
  }

  // Check student (Custom JWT)
  const studentSession = await getStudentSession();
  
  if (studentSession) {
    // Render student dashboard
  }

  // No session
  redirect("/auth");
}
```

### Making Authenticated API Calls (Student)

```typescript
// The JWT cookie is automatically sent with requests
const res = await fetch("/api/some-endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

### Verifying Student in API Route

```typescript
import { getStudentSession } from "@/lib/auth/student";

export async function GET() {
  const session = await getStudentSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // session.student_id, session.is_read_only, etc.
}
```

---

## Question Access Security (Migration: 20260210000000)

### Problem

The original schema only had admin RLS policy on `questions` table. Students couldn't read questions directly, but the system uses custom JWT auth (not Supabase Auth), so RLS policies based on `auth.uid()` don't work for students.

### Solution: SECURITY DEFINER Functions

All student question access goes through these secure functions:

| Function | Purpose | Validates Subscription |
|----------|---------|------------------------|
| `get_questions_for_student(student_id, question_ids, include_answers)` | Fetch questions with optional answers | ✅ Yes |
| `calculate_total_marks(question_ids)` | Get total marks for questions | ❌ No (doesn't expose content) |

### Subscription Enforcement for Questions

```sql
-- Only returns questions if:
-- 1. Subscription expires_at > NOW() (active)
-- 2. OR grace_period_ends_at > NOW() (grace period)
-- Returns empty array if expired beyond grace period
```

| User Type | Can View Questions |
|-----------|-------------------|
| Student (active subscription) | ✅ Yes |
| Student (grace period) | ✅ Yes (review only) |
| Student (expired) | ❌ No |
| Parent | ❌ No (no student_id in context) |

### Service Method Signature

```typescript
// OLD (before migration)
getQuestionsForTest(questionIds: string[], includeAnswers?: boolean)

// NEW (after migration)
getQuestionsForTest(studentId: string, questionIds: string[], includeAnswers?: boolean)
```

### API Calls Updated

All test API routes now pass `student_id` to validate subscription:

```typescript
// GET /api/tests/[id]
await testService.getQuestionsForTest(auth.session.student_id, test.questions_order, isCompleted);

// PATCH /api/tests/[id] (action: start)
await testService.getQuestionsForTest(auth.session.student_id, test.questions_order, false);

// GET /api/tests/[id]/review
await testService.getQuestionsForTest(auth.session.student_id, test.questions_order, true);
```
