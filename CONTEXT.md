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
- [ ] Student dashboard: Take mock tests
- [ ] Student dashboard: View scores history
- [ ] Admin dashboard: Manage all users
- [ ] Subscription renewal flow

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
