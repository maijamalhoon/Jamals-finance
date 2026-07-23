import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";

const vus = Number.parseInt(__ENV.VUS || "100", 10);
const targetUrl = __ENV.TARGET_URL || "http://127.0.0.1:3000";

export const options = {
  discardResponseBodies: false,
  scenarios: {
    dashboard_page_load: {
      executor: "per-vu-iterations",
      vus,
      iterations: 1,
      maxDuration: "3m",
      gracefulStop: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<5000"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const syntheticUser = ((exec.vu.idInTest - 1) % 1000) + 1;
  const response = http.get(
    `${targetUrl}/api/load-test/probe?user=${syntheticUser}`,
    {
      timeout: "30s",
      headers: {
        accept: "application/json",
        "x-jf-load-tier": String(vus),
      },
      tags: {
        tier: String(vus),
        route: "isolated-dashboard-probe",
      },
    },
  );

  let payload = null;
  try {
    payload = response.json();
  } catch {
    payload = null;
  }

  check(response, {
    "status is 200": (result) => result.status === 200,
    "response is isolated staging": () =>
      payload?.isolatedStaging === true,
    "dashboard query fanout succeeded": () => payload?.ok === true,
    "synthetic transaction rows returned": () =>
      Number(payload?.rows?.transactions) > 0,
  });
}

export function handleSummary(data) {
  const duration = data.metrics.http_req_duration?.values || {};
  const failed = data.metrics.http_req_failed?.values || {};
  const checks = data.metrics.checks?.values || {};
  const requests = data.metrics.http_reqs?.values || {};
  const summary = {
    tier: vus,
    generatedAt: new Date().toISOString(),
    requests: requests.count || 0,
    requestRate: requests.rate || 0,
    failedRate: failed.rate || 0,
    checkRate: checks.rate || 0,
    durationMs: {
      average: duration.avg || 0,
      median: duration.med || 0,
      p90: duration["p(90)"] || 0,
      p95: duration["p(95)"] || 0,
      max: duration.max || 0,
    },
  };

  return {
    stdout: `${JSON.stringify(summary, null, 2)}\n`,
    [`load-test-${vus}.json`]: `${JSON.stringify({ summary, raw: data }, null, 2)}\n`,
  };
}
