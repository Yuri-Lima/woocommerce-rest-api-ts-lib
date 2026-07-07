/* woo-mcp-server dashboard — vanilla JS, keyboard accessible */

(async function boot() {
  const res = await fetch("./tools-catalog.json");
  if (!res.ok) {
    document.getElementById("tools-tbody").innerHTML =
      '<tr><td colspan="5">Failed to load tools-catalog.json</td></tr>';
    return;
  }
  const catalog = await res.json();
  init(catalog);
})();

function init(catalog) {
  const tools = catalog.tools || [];
  const domains = [...new Set(tools.map((t) => t.domain))].sort();

  document.getElementById("stat-tools").textContent = String(tools.length);
  document.getElementById("stat-domains").textContent = String(domains.length);

  // Domain filter options
  const domainFilter = document.getElementById("domain-filter");
  for (const d of domains) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    domainFilter.appendChild(opt);
  }

  const tbody = document.getElementById("tools-tbody");
  const search = document.getElementById("tool-search");
  const countEl = document.getElementById("tools-count");

  function renderTable() {
    const q = search.value.trim().toLowerCase();
    const domain = domainFilter.value;
    const filtered = tools.filter((t) => {
      if (domain && t.domain !== domain) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.domain} ${t.description}`.toLowerCase();
      return hay.includes(q);
    });

    tbody.replaceChildren();
    for (const t of filtered) {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.innerHTML = `
        <td class="tool-name">${escapeHtml(t.name)}</td>
        <td><span class="badge">${escapeHtml(t.domain)}</span></td>
        <td>${escapeHtml(t.description)}</td>
        <td class="param-list">${(t.required || []).map(escapeHtml).join(", ") || "—"}</td>
        <td class="param-list">${(t.optional || []).map(escapeHtml).join(", ") || "—"}</td>
      `;
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          document.getElementById("tester-tool").value = t.name;
          document.getElementById("tester-tool").dispatchEvent(new Event("change"));
          document.getElementById("tester").scrollIntoView({ behavior: "smooth" });
        }
      });
      tbody.appendChild(tr);
    }
    countEl.textContent = `Showing ${filtered.length} of ${tools.length} tools`;
  }

  search.addEventListener("input", renderTable);
  domainFilter.addEventListener("change", renderTable);
  renderTable();

  // / focuses search
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA" && document.activeElement?.tagName !== "SELECT") {
      e.preventDefault();
      search.focus();
    }
  });

  // Live tester
  const testerSelect = document.getElementById("tester-tool");
  const fieldsEl = document.getElementById("tester-fields");
  const callEl = document.getElementById("tester-call");
  const responseEl = document.getElementById("tester-response");

  for (const t of tools) {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.name;
    testerSelect.appendChild(opt);
  }

  function buildFields() {
    const tool = tools.find((t) => t.name === testerSelect.value);
    fieldsEl.replaceChildren();
    if (!tool) return;
    const params = [...(tool.required || []), ...(tool.optional || [])];
    for (const p of params) {
      const label = document.createElement("label");
      const required = (tool.required || []).includes(p);
      label.textContent = `${p}${required ? " *" : ""}`;
      const input = document.createElement("input");
      input.name = p;
      input.dataset.param = p;
      input.placeholder = exampleFor(p);
      if (required) input.required = true;
      label.appendChild(input);
      fieldsEl.appendChild(label);
    }
  }

  testerSelect.addEventListener("change", buildFields);
  buildFields();

  document.getElementById("tester-run").addEventListener("click", () => {
    const tool = tools.find((t) => t.name === testerSelect.value);
    if (!tool) return;
    const args = {};
    for (const input of fieldsEl.querySelectorAll("input")) {
      const raw = input.value.trim();
      if (!raw) continue;
      args[input.dataset.param] = coerce(raw);
    }
    const call = {
      method: "tools/call",
      params: { name: tool.name, arguments: args },
    };
    callEl.textContent = JSON.stringify(call, null, 2);

    const fixtures = catalog.fixtures || {};
    const mock =
      fixtures[tool.name] ||
      fixtures[tool.name.replace(/_get$/, "_list")] ||
      {
        note: "No dedicated fixture — illustrative mock",
        tool: tool.name,
        echo_arguments: args,
        item: { id: 1, status: "ok" },
      };
    responseEl.textContent = JSON.stringify(
      {
        content: [{ type: "text", text: JSON.stringify(mock, null, 2) }],
      },
      null,
      2,
    );
  });

  // Coverage chart
  const coverage = catalog.coverage || {};
  const labels = Object.keys(coverage);
  const values = Object.values(coverage);
  const covBody = document.getElementById("coverage-tbody");
  for (const [k, v] of Object.entries(coverage)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(k)}</td><td>${v}%</td>`;
    covBody.appendChild(tr);
  }

  function drawChart() {
    if (typeof Chart === "undefined") {
      setTimeout(drawChart, 50);
      return;
    }
    const ctx = document.getElementById("coverageChart");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Coverage %",
            data: values,
            backgroundColor: values.map((v) =>
              v >= 90 ? "rgba(61, 214, 198, 0.75)" : v >= 80 ? "rgba(91, 157, 255, 0.75)" : "rgba(240, 180, 41, 0.75)",
            ),
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
            ticks: { color: "#9aa8bc" },
            grid: { color: "rgba(36, 48, 65, 0.8)" },
          },
          x: {
            ticks: { color: "#9aa8bc", maxRotation: 45, minRotation: 0 },
            grid: { display: false },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }
  drawChart();

  // Config generator
  const form = document.getElementById("config-form");
  const out = document.getElementById("config-output");
  const copyBtn = document.getElementById("copy-config");
  let lastConfig = "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const config = {
      mcpServers: {
        woocommerce: {
          command: "npx",
          args: ["woo-mcp-server"],
          env: {
            WC_URL: String(fd.get("url") || ""),
            WC_KEY: String(fd.get("key") || ""),
            WC_SECRET: String(fd.get("secret") || ""),
            WC_RATE_LIMIT_PER_SECOND: String(fd.get("rate") || "5"),
          },
        },
      },
    };
    lastConfig = JSON.stringify(config, null, 2);
    out.textContent = lastConfig;
    copyBtn.disabled = false;
  });

  copyBtn.addEventListener("click", async () => {
    if (!lastConfig) return;
    try {
      await navigator.clipboard.writeText(lastConfig);
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy to clipboard";
      }, 1500);
    } catch {
      copyBtn.textContent = "Select & copy manually";
    }
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function coerce(raw) {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function exampleFor(param) {
  const map = {
    id: "1",
    product_id: "1",
    order_id: "101",
    zone_id: "1",
    query: "blue shirt",
    name: "Blue T-Shirt",
    email: "jane@example.com",
    code: "SAVE10",
    page: "1",
    per_page: "10",
    status: "publish",
    group: "general",
    value: "USD",
    topic: "order.created",
    delivery_url: "https://hooks.example/wc",
    rate: "8.5",
    slug: "standard",
    data: '{"name":"Updated"}',
  };
  return map[param] || param;
}
