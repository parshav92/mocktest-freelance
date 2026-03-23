/**
 * Performance Logger for Next.js Middleware
 * Logs request method, path, status, and response time.
 * Works as a drop-in replacement for Morgan in non-Express environments.
 */

const COLORS = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
} as const;

function getStatusColor(status: number): string {
  if (status < 300) return COLORS.green;
  if (status < 400) return COLORS.cyan;
  if (status < 500) return COLORS.yellow;
  return COLORS.red;
}

function getLatencyColor(ms: number): string {
  if (ms < 100) return COLORS.green;
  if (ms < 500) return COLORS.yellow;
  return COLORS.red;
}

export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  // Skip static assets and internal Next.js routes
  if (
    path.startsWith("/_next/") ||
    path.startsWith("/favicon.ico") ||
    /\.(svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$/i.test(path)
  ) {
    return;
  }

  const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
  const statusColor = getStatusColor(status);
  const latencyColor = getLatencyColor(durationMs);

  const line = [
    `${COLORS.dim}${timestamp}${COLORS.reset}`,
    `${COLORS.bold}[PERF]${COLORS.reset}`,
    `${COLORS.bold}${method.padEnd(6)}${COLORS.reset}`,
    path,
    `→ ${statusColor}${status}${COLORS.reset}`,
    `${latencyColor}(${durationMs.toFixed(1)}ms)${COLORS.reset}`,
  ].join(" ");

  console.log(line);
}

/**
 * Create a timer for measuring request duration.
 * Call start() at the beginning and stop() to log the result.
 */
export function createRequestTimer(method: string, path: string) {
  const start = performance.now();

  return {
    /** Log the request with the given response status */
    stop(status: number) {
      const duration = performance.now() - start;
      logRequest(method, path, status, duration);
    },
  };
}
