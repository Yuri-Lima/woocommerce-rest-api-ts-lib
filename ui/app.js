/* Coverage & bug dashboard data + Chart.js rendering */

const COVERAGE = [
  { module: "ErrorNormalizer", before: 0, after: 100 },
  { module: "PaginationHelper", before: 0, after: 100 },
  { module: "Throttler", before: 0, after: 100 },
  { module: "RetryStrategy", before: 0, after: 98.9 },
  { module: "Convenience methods", before: 0, after: 100 },
  { module: "sanitize", before: 74.6, after: 93.8 },
  { module: "index (client)", before: 86, after: 89.7 },
];

const BUGS = [
  {
    id: "BUG-1",
    root: "jest.config.ts setupFiles pointed at setEnvVars.js which was missing (and gitignored). Suite never started.",
    fix: "Committed setEnvVars.js with hermetic URL/keys matching nock TEST_BASE; stopped gitignoring it.",
    sha: "59b1133",
  },
  {
    id: "BUG-2",
    root: "wc.test.ts had @ts-nocheck — entire test suite bypassed TypeScript.",
    fix: "Removed @ts-nocheck; fixed nock ReplyHeaders, response generics (WcEntity), and header comparisons.",
    sha: "42d928d",
  },
  {
    id: "BUG-3",
    root: "classVersion hardcoded to 0.0.2 while package is 8.0.0 — wrong User-Agent reporting.",
    fix: "Default classVersion to 8.0.0; allow opt.classVersion override.",
    sha: "d50aa6c",
  },
  {
    id: "BUG-4",
    root: "ShippingZonesMethods public type used misspelled instace_id.",
    fix: "Added instance_id; kept instace_id as @deprecated alias for backward compatibility.",
    sha: "0b4242b",
  },
  {
    id: "BUG-5",
    root: "Stale tsc build/ directory committed; real artifacts live in dist/ via esbuild.",
    fix: "Removed build/ from git and added build to .gitignore.",
    sha: "cce92a5",
  },
  {
    id: "BUG-6",
    root: "WooRestApiVersion defined in both sanitize.ts and types/options.",
    fix: "Single source of truth in options; sanitize re-exports the type.",
    sha: "b8c0c98",
  },
  {
    id: "BUG-7",
    root: "_parseParamsObject fully commented out but left in index.ts as dead code.",
    fix: "Deleted the commented block and obsolete references in _normalizeQueryString docs.",
    sha: "f24b4fd",
  },
];

const TYPE_TIMELINE = [
  { phase: "With @ts-nocheck", errors: 0, note: "All type errors suppressed (unsafe)" },
  { phase: "Removed @ts-nocheck", errors: 48, note: "nock overloads, unknown data, header comparisons" },
  { phase: "Nock + headers typed", errors: 28, note: "ReplyHeaders + body overload fixed" },
  { phase: "Response generics", errors: 9, note: "WcEntity / WcEntityList helpers" },
  { phase: "Fully fixed", errors: 0, note: "Suite typechecks under ts-jest" },
];

const DIFF_BEFORE = `// @ts-nocheck
// Test file intentionally loose: exercises the strict library types via real usage patterns + nock.
// Production src/ has zero \`any\` and full strictness.

const commonHeaders: Record<string, string | string[] | number> = {
  "x-wp-total": "5",
  "x-wp-totalpages": "1",
  "content-type": "application/json",
};

nock(TEST_BASE)
  .persist()
  .get(/\\/wp-json\\/wc\\/v3\\/coupons\\/\\d+$/)
  .reply(200, (couponsJson[0] || { id: 1 }), commonHeaders);

const coupons = await wooCommerce.get("coupons");
const keys = Object.keys(coupons.data[0]); // data is unknown — unchecked`;

const DIFF_AFTER = `// Type-checked test suite: exercises the library via real usage patterns + nock.

type WcEntity = { id: number; code?: string; [key: string]: unknown };
type WcEntityList = WcEntity[];

const commonHeaders = {
  "x-wp-total": "5",
  "x-wp-totalpages": "1",
  "content-type": "application/json",
};

nock(TEST_BASE)
  .persist()
  .get(/\\/wp-json\\/wc\\/v3\\/coupons\\/\\d+$/)
  .reply(200, couponsJson[0] ?? { id: 1 }, commonHeaders);

const coupons = await wooCommerce.get<WcEntityList>("coupons");
const keys = Object.keys(asList(coupons.data)[0] ?? {});`;

function fillCoverageTable() {
  const tbody = document.getElementById("coverage-tbody");
  tbody.innerHTML = COVERAGE.map(
    (row) =>
      `<tr><th scope="row">${row.module}</th><td>${row.before}%</td><td>${row.after}%</td></tr>`,
  ).join("");
}

function fillBugs() {
  const tbody = document.getElementById("bugs-tbody");
  tbody.innerHTML = BUGS.map(
    (b) => `<tr>
      <th scope="row">${b.id}</th>
      <td>${b.root}</td>
      <td>${b.fix}</td>
      <td><a class="commit" href="https://github.com/Yuri-Lima/woocommerce-rest-api-ts-lib/commit/${b.sha}" target="_blank" rel="noopener noreferrer"><code>${b.sha}</code></a></td>
    </tr>`,
  ).join("");
}

function fillTimeline() {
  const ol = document.getElementById("type-timeline");
  ol.innerHTML = TYPE_TIMELINE.map(
    (t) =>
      `<li><span class="count">${t.errors}</span> <strong>${t.phase}</strong> — ${t.note}</li>`,
  ).join("");
}

function fillDiff() {
  document.getElementById("diff-before").textContent = DIFF_BEFORE;
  document.getElementById("diff-after").textContent = DIFF_AFTER;
}

function charts() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded");
    return;
  }

  const labels = COVERAGE.map((c) => c.module);
  new Chart(document.getElementById("coverageChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Before %",
          data: COVERAGE.map((c) => c.before),
          backgroundColor: "rgba(255, 107, 122, 0.75)",
          borderRadius: 6,
        },
        {
          label: "After %",
          data: COVERAGE.map((c) => c.after),
          backgroundColor: "rgba(61, 214, 140, 0.8)",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { color: "#9aadc2" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        x: {
          ticks: { color: "#9aadc2", maxRotation: 40, minRotation: 0 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { labels: { color: "#e7eef8" } },
        title: { display: false },
      },
    },
  });

  new Chart(document.getElementById("typeChart"), {
    type: "line",
    data: {
      labels: TYPE_TIMELINE.map((t) => t.phase),
      datasets: [
        {
          label: "Type errors in wc.test.ts",
          data: TYPE_TIMELINE.map((t) => t.errors),
          borderColor: "#ffc857",
          backgroundColor: "rgba(255, 200, 87, 0.15)",
          fill: true,
          tension: 0.25,
          pointRadius: 5,
          pointBackgroundColor: "#ffc857",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#9aadc2", stepSize: 10 },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        x: {
          ticks: { color: "#9aadc2", maxRotation: 30 },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { labels: { color: "#e7eef8" } },
      },
    },
  });
}

function init() {
  fillCoverageTable();
  fillBugs();
  fillTimeline();
  fillDiff();
  charts();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
