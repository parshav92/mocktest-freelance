/**
 * Authenticated Load Test — Simulates Students Taking Tests
 *
 * Usage:
 *   npm run load-test                # 10 concurrent students, 500ms think time
 *   npm run load-test:heavy          # 100 concurrent students, 200ms think time
 *   npx tsx scripts/load-test-students.ts --students 50 --delay 300
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *   - At least 1 real student with active subscription in the DB
 *   - STUDENT_JWT_SECRET set in .env
 */

import { SignJWT } from "jose";
import { config } from "dotenv";

// Load .env
config();

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const JWT_SECRET = new TextEncoder().encode(process.env.STUDENT_JWT_SECRET);

const args = process.argv.slice(2);
const isHeavy = args.includes("--heavy");

function getArg(name: string, fallback: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1], 10);
  return fallback;
}

const NUM_STUDENTS = getArg("students", isHeavy ? 100 : 10);
const THINK_DELAY_MS = getArg("delay", isHeavy ? 200 : 500);
const ANSWERS_PER_TEST = getArg("answers", 10); // How many answers to save per test

// ─── Metrics Tracking ──────────────────────────────────────────────────────

interface StepMetrics {
  name: string;
  latencies: number[];
  successes: number;
  failures: number;
  errors: string[];
}

const metrics: Map<string, StepMetrics> = new Map();

function getOrCreateMetrics(name: string): StepMetrics {
  if (!metrics.has(name)) {
    metrics.set(name, { name, latencies: [], successes: 0, failures: 0, errors: [] });
  }
  return metrics.get(name)!;
}

function recordSuccess(name: string, latencyMs: number): void {
  const m = getOrCreateMetrics(name);
  m.latencies.push(latencyMs);
  m.successes++;
}

function recordFailure(name: string, latencyMs: number, error: string): void {
  const m = getOrCreateMetrics(name);
  m.latencies.push(latencyMs);
  m.failures++;
  if (m.errors.length < 5) m.errors.push(error); // Keep first 5 errors
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function generateStudentJWT(studentId: string, studentCode: string): Promise<string> {
  return new SignJWT({
    student_id: studentId,
    student_code: studentCode,
    parent_id: "00000000-0000-0000-0000-000000000000",
    full_name: `Load Test Student`,
    is_read_only: false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

async function timedFetch(
  stepName: string,
  url: string,
  opts: RequestInit = {}
): Promise<Response | null> {
  const start = performance.now();
  try {
    const res = await fetch(url, opts);
    const elapsed = performance.now() - start;

    if (res.ok) {
      recordSuccess(stepName, elapsed);
    } else {
      const body = await res.text().catch(() => "");
      const errMsg = `HTTP ${res.status}: ${body.slice(0, 100)}`;
      recordFailure(stepName, elapsed, errMsg);
    }
    return res;
  } catch (err) {
    const elapsed = performance.now() - start;
    recordFailure(stepName, elapsed, String(err));
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  // Add ±30% jitter to simulate realistic timing
  const jitter = ms * (0.7 + Math.random() * 0.6);
  return new Promise((r) => setTimeout(r, jitter));
}

// ─── Student Flow ───────────────────────────────────────────────────────────

interface StudentConfig {
  studentNum: number;
  studentId: string;
  jwt: string;
  subjectId: string;
}

async function runStudentFlow(config: StudentConfig): Promise<void> {
  const { studentNum, jwt, subjectId } = config;
  const cookie = `student_session=${jwt}`;
  const headers = {
    "Content-Type": "application/json",
    Cookie: cookie,
  };

  const tag = `[Student #${studentNum}]`;

  // ── Step 1: Create & Start Test ──
  const createRes = await timedFetch(
    "1. Create Test (POST /api/tests)",
    `${BASE_URL}/api/tests`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ subject_id: subjectId, start_immediately: true }),
    }
  );

  if (!createRes || !createRes.ok) {
    console.log(`  ${tag} ❌ Failed to create test, skipping rest of flow`);
    return;
  }

  const createData = await createRes.json();
  const testId = createData.test?.id;
  const questions = createData.questions || [];

  if (!testId) {
    console.log(`  ${tag} ❌ No test ID returned`);
    return;
  }

  console.log(`  ${tag} ✅ Test created: ${testId} (${questions.length} questions)`);

  // ── Step 2: Save Answers (simulate clicking through questions) ──
  const questionsToAnswer = questions.slice(0, ANSWERS_PER_TEST);

  for (let i = 0; i < questionsToAnswer.length; i++) {
    const q = questionsToAnswer[i];

    // Simulate think time
    await sleep(THINK_DELAY_MS);

    // Generate a random answer based on question type
    let selectedAnswer: string | Record<string, unknown> = "A";
    if (q.question_type === "mcq" || q.question_type === "passage_mcq" || q.question_type === "poem_mcq") {
      const options = ["A", "B", "C", "D"];
      selectedAnswer = options[Math.floor(Math.random() * options.length)];
    } else if (q.question_type === "fill_blank_dropdown") {
      selectedAnswer = { 1: 0 }; // First blank, first option
    } else if (q.question_type === "essay") {
      selectedAnswer = "This is a load test essay response for performance testing purposes.";
    }

    await timedFetch(
      "2. Save Answer (PATCH /api/tests/[id])",
      `${BASE_URL}/api/tests/${testId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          action: "save_answer",
          question_id: q.id,
          selected: selectedAnswer,
          time_spent_secs: Math.floor(Math.random() * 60) + 10,
        }),
      }
    );
  }

  // ── Step 3: Submit Test ──
  await sleep(THINK_DELAY_MS);

  const submitRes = await timedFetch(
    "3. Submit Test (POST /api/tests/[id]/submit)",
    `${BASE_URL}/api/tests/${testId}/submit`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    }
  );

  if (submitRes?.ok) {
    console.log(`  ${tag} ✅ Test submitted successfully`);
  } else {
    console.log(`  ${tag} ❌ Test submission failed`);
  }
}

// ─── Reporting ──────────────────────────────────────────────────────────────

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function formatMs(ms: number): string {
  return ms.toFixed(0).padStart(7);
}

function printReport(totalElapsed: number): void {
  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                           📊 LOAD TEST RESULTS                                         ║");
  console.log("╠═════════════════════════════════════════╦═══════╦═══════╦═══════╦═══════╦═══════╦═══════╣");
  console.log("║ Step                                    ║  Avg  ║  p50  ║  p95  ║  p99  ║  Max  ║ Err%  ║");
  console.log("╠═════════════════════════════════════════╬═══════╬═══════╬═══════╬═══════╬═══════╬═══════╣");

  const stepOrder = [
    "1. Create Test (POST /api/tests)",
    "2. Save Answer (PATCH /api/tests/[id])",
    "3. Submit Test (POST /api/tests/[id]/submit)",
  ];

  for (const stepName of stepOrder) {
    const m = metrics.get(stepName);
    if (!m || m.latencies.length === 0) continue;

    const total = m.successes + m.failures;
    const avg = m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length;
    const errPct = ((m.failures / total) * 100).toFixed(1);

    const shortName = stepName.length > 39 ? stepName.slice(0, 36) + "..." : stepName;

    console.log(
      `║ ${shortName.padEnd(39)} ║${formatMs(avg)} ║${formatMs(percentile(m.latencies, 50))} ║${formatMs(percentile(m.latencies, 95))} ║${formatMs(percentile(m.latencies, 99))} ║${formatMs(percentile(m.latencies, 100))} ║${errPct.padStart(5)}% ║`
    );

    // Print first few errors if any
    if (m.errors.length > 0) {
      for (const err of m.errors.slice(0, 2)) {
        console.log(`║   ⚠ ${err.slice(0, 79).padEnd(79)}     ║`);
      }
    }
  }

  console.log("╚═════════════════════════════════════════╩═══════╩═══════╩═══════╩═══════╩═══════╩═══════╝");

  // Summary
  const totalRequests = Array.from(metrics.values()).reduce(
    (sum, m) => sum + m.successes + m.failures, 0
  );
  const totalErrors = Array.from(metrics.values()).reduce(
    (sum, m) => sum + m.failures, 0
  );

  console.log("");
  console.log(`  ⏱  Total time:       ${(totalElapsed / 1000).toFixed(1)}s`);
  console.log(`  👥 Virtual students: ${NUM_STUDENTS}`);
  console.log(`  📨 Total requests:   ${totalRequests}`);
  console.log(`  ✅ Successful:       ${totalRequests - totalErrors}`);
  console.log(`  ❌ Failed:           ${totalErrors}`);
  console.log(`  🚀 Throughput:       ${(totalRequests / (totalElapsed / 1000)).toFixed(1)} req/s`);
  console.log("");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        🎓 Selectorial Authenticated Load Test 🎓               ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Target:          ${BASE_URL.padEnd(42)}║`);
  console.log(`║  Virtual Students: ${String(NUM_STUDENTS).padEnd(41)}║`);
  console.log(`║  Think Delay:     ${(THINK_DELAY_MS + "ms").padEnd(42)}║`);
  console.log(`║  Answers/Test:    ${String(ANSWERS_PER_TEST).padEnd(42)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  // ── Connectivity Check ──
  try {
    const res = await fetch(BASE_URL);
    console.log(`✅ Server reachable (status: ${res.status})`);
  } catch {
    console.error(`❌ Cannot reach ${BASE_URL}. Start the dev server: npm run dev`);
    process.exit(1);
  }

  // ── Discover a real student ──
  console.log("\n🔍 Looking for a student to impersonate...");
  console.log("   (Generating a test JWT to query the subjects API)\n");

  // We need a real student_id from the DB. First let's try to get subjects
  // to verify the API is working, then we'll need the user to provide
  // a student ID or we query for one.

  // Fetch subjects first (public endpoint)
  const subjectsRes = await fetch(`${BASE_URL}/api/subjects`);
  if (!subjectsRes.ok) {
    console.error("❌ Failed to fetch subjects. Is the database connected?");
    process.exit(1);
  }

  const subjectsData = await subjectsRes.json();

  const subjects = subjectsData?.subjects || [];

  if (subjects.length === 0) {
    console.error("❌ No subjects found in database. Add subjects first.");
    process.exit(1);
  }

  // Pick the first subject with questions
  const subject = subjects.find((s: { question_count: number }) => s.question_count > 0) || subjects[0];
  console.log(`📚 Using subject: ${subject.name} (${subject.question_count} questions)`);

  // ── Get student ID ──
  // Check if provided via CLI arg
  let studentId = "51cea676-ddfe-4edb-a949-b47a26182ed1";
  let studentCode = "STUWDJ8Z";

  if (studentId) {
    console.log(`👤 Using provided student ID: ${studentId}`);
  } else {
    // Try to discover a student by making a test JWT and hitting the tests API
    // The user can also provide --student-id flag
    console.log("");
    console.log("⚠️  No --student-id provided.");
    console.log("   Usage: npx tsx scripts/load-test-students.ts --student-id <UUID>");
    console.log("");
    console.log("   To find your student's UUID, check your Supabase dashboard:");
    console.log("   Table: students → column: id");
    console.log("");
    process.exit(1);
  }

  // ── Generate JWTs for all virtual students ──
  console.log(`\n🔑 Generating ${NUM_STUDENTS} JWTs...`);
  const students: StudentConfig[] = [];

  for (let i = 1; i <= NUM_STUDENTS; i++) {
    const jwt = await generateStudentJWT(studentId, studentCode);
    students.push({
      studentNum: i,
      studentId,
      jwt,
      subjectId: subject.id,
    });
  }
  console.log(`✅ ${NUM_STUDENTS} JWTs generated\n`);

  // ── Run all students concurrently ──
  console.log(`🏁 Launching ${NUM_STUDENTS} concurrent student flows...\n`);
  const startTime = performance.now();

  // Stagger start times slightly to avoid thundering herd
  const staggerMs = Math.min(100, 5000 / NUM_STUDENTS);

  const promises = students.map(async (student, idx) => {
    // Stagger each student's start
    await sleep(idx * staggerMs);
    try {
      await runStudentFlow(student);
    } catch (err) {
      console.error(`  [Student #${student.studentNum}] 💥 Unhandled error: ${err}`);
    }
  });

  await Promise.all(promises);

  const totalElapsed = performance.now() - startTime;

  // ── Print Report ──
  printReport(totalElapsed);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
