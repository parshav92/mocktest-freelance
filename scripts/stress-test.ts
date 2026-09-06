/**
 * Stress Test Script using Autocannon
 *
 * Usage:
 *   npm run stress-test              # Default: 10s, 10 connections
 *   npm run stress-test:heavy        # Heavy: 30s, 100 connections
 *
 * Requires the dev server running on http://localhost:3000
 */

import autocannon, { Result } from "autocannon";

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
const isHeavy = process.argv.includes("--heavy");

const DEFAULT_OPTS = {
  duration: isHeavy ? 30 : 10,
  connections: isHeavy ? 100 : 10,
  pipelining: 1,
};

// ─── Test Scenarios ─────────────────────────────────────────────────────────

interface TestScenario {
  name: string;
  url: string;
  method?: "GET" | "POST" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  /** Override default duration/connections */
  overrides?: Partial<typeof DEFAULT_OPTS>;
}

const scenarios: TestScenario[] = [
  // ── Public Endpoints (no auth) ──
  {
    name: "Landing Page (GET /)",
    url: "/",
  },
  {
    name: "Subjects API (GET /api/subjects)",
    url: "/api/subjects",
  },
  {
    name: "Auth Page (GET /auth)",
    url: "/auth",
  },

  // ── Auth Endpoint ──
  {
    name: "Student Login (POST /api/auth/student/login)",
    url: "/api/auth/student/login",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Uses a dummy payload — will get 401s, but tests server throughput
    body: JSON.stringify({
      student_id: "STUXXXXX",
      password: "123456",
    }),
    // Fewer connections to avoid rate-limit lockout
    overrides: { connections: 3 },
  },

  // ── Protected Endpoints (will return 401 without auth — tests error handling throughput) ──
  {
    name: "Tests List (GET /api/tests) [unauthed]",
    url: "/api/tests",
  },
  {
    name: "Access Status (GET /api/tests/access-status) [unauthed]",
    url: "/api/tests/access-status",
  },
  {
    name: "Students API (GET /api/students) [unauthed]",
    url: "/api/students",
  },
  {
    name: "Subscriptions API (GET /api/subscriptions) [unauthed]",
    url: "/api/subscriptions",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function printResult(name: string, result: Result): void {
  const { latency, requests, throughput, errors, timeouts, non2xx } = result;

  console.log("");
  console.log("━".repeat(70));
  console.log(`  📊 ${name}`);
  console.log("━".repeat(70));
  console.log("");

  // Latency table
  console.log("  ┌──────────────────────────────────────────────────┐");
  console.log("  │  LATENCY (ms)                                    │");
  console.log("  ├────────────┬────────┬────────┬────────┬──────────┤");
  console.log("  │    Avg     │  p50   │  p90   │  p99   │   Max    │");
  console.log("  ├────────────┼────────┼────────┼────────┼──────────┤");
  console.log(
    `  │ ${String(formatNum(latency.average)).padStart(8)}   │ ${String(formatNum(latency.p50)).padStart(6)} │ ${String(formatNum(latency.p90)).padStart(6)} │ ${String(formatNum(latency.p99)).padStart(6)} │ ${String(formatNum(latency.max)).padStart(8)} │`
  );
  console.log("  └────────────┴────────┴────────┴────────┴──────────┘");
  console.log("");

  // Throughput
  console.log(
    `  🚀 Requests/sec:  ${formatNum(requests.average)} avg  (total: ${formatNum(requests.total)})`
  );
  console.log(
    `  📦 Throughput:     ${formatBytes(throughput.average)}/sec  (total: ${formatBytes(throughput.total)})`
  );

  // Errors
  const totalErrors = (errors || 0) + (timeouts || 0);
  const nonSuccess = non2xx || 0;
  if (totalErrors > 0 || nonSuccess > 0) {
    console.log("");
    console.log(
      `  ⚠️  Errors: ${totalErrors}  |  Non-2xx: ${nonSuccess}  |  Timeouts: ${timeouts || 0}`
    );
  } else {
    console.log("");
    console.log(`  ✅ No errors or timeouts`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function runScenario(scenario: TestScenario): Promise<Result> {
  const opts = { ...DEFAULT_OPTS, ...scenario.overrides };

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${BASE_URL}${scenario.url}`,
        method: scenario.method || "GET",
        headers: scenario.headers,
        body: scenario.body,
        duration: opts.duration,
        connections: opts.connections,
        pipelining: opts.pipelining,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );

    // Show live progress
    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main(): Promise<void> {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           🔥 Selectorial Stress Test Suite 🔥              ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Target:       ${BASE_URL.padEnd(41)}║`);
  console.log(`║  Mode:         ${isHeavy ? "HEAVY (30s, 100 conn)" : "DEFAULT (10s, 10 conn)".padEnd(41)}║`);
  console.log(
    `║  Scenarios:    ${String(scenarios.length).padEnd(41)}║`
  );
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  // Quick connectivity check
  try {
    const res = await fetch(BASE_URL);
    console.log(`✅ Server is reachable (status: ${res.status})`);
  } catch {
    console.error(`❌ Cannot reach ${BASE_URL}`);
    console.error(`   Make sure the dev server is running: npm run dev`);
    process.exit(1);
  }

  const results: { name: string; result: Result }[] = [];

  for (const scenario of scenarios) {
    console.log("");
    console.log(`\n⏳ Running: ${scenario.name}...`);
    console.log(
      `   ${scenario.method || "GET"} ${BASE_URL}${scenario.url}`
    );

    try {
      const result = await runScenario(scenario);
      results.push({ name: scenario.name, result });
      printResult(scenario.name, result);
    } catch (err) {
      console.error(`   ❌ Failed: ${err}`);
    }
  }

  // ── Summary Table ──
  console.log("");
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                         📋 SUMMARY TABLE                                   ║");
  console.log("╠══════════════════════════════════════════╦═══════════╦════════╦══════╦═══════╣");
  console.log("║ Endpoint                                 ║  Req/sec  ║ Avg ms ║ p99  ║ Errs  ║");
  console.log("╠══════════════════════════════════════════╬═══════════╬════════╬══════╬═══════╣");

  for (const { name, result } of results) {
    const shortName = name.length > 40 ? name.slice(0, 37) + "..." : name;
    const reqSec = formatNum(result.requests.average);
    const avgMs = formatNum(result.latency.average);
    const p99 = formatNum(result.latency.p99);
    const errs = String((result.errors || 0) + (result.timeouts || 0));

    console.log(
      `║ ${shortName.padEnd(40)} ║ ${reqSec.padStart(9)} ║ ${avgMs.padStart(6)} ║ ${p99.padStart(4)} ║ ${errs.padStart(5)} ║`
    );
  }

  console.log("╚══════════════════════════════════════════╩═══════════╩════════╩══════╩═══════╝");
  console.log("");
}

main().catch(console.error);
