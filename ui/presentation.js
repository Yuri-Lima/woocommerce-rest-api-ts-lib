/**
 * woo-mcp-server developer presentation — keyboard/hash/overview navigation.
 */
(function () {
  "use strict";

  const slides = Array.from(document.querySelectorAll(".slide"));
  const counter = document.getElementById("slide-counter");
  const progressBar = document.getElementById("progress-bar");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnOverview = document.getElementById("btn-overview");
  const overviewEl = document.getElementById("overview");
  const viewport = document.getElementById("slide-viewport");

  if (!slides.length) return;

  let index = 0;
  let overviewOpen = false;
  let touchStartX = 0;
  let touchStartY = 0;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function parseHash() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return null;
    const asNum = Number.parseInt(raw, 10);
    if (Number.isFinite(asNum) && asNum >= 1 && asNum <= slides.length) {
      return asNum - 1;
    }
    const byTitle = slides.findIndex(
      (s) => (s.dataset.title || "").toLowerCase().replace(/\s+/g, "-") === raw.toLowerCase()
    );
    return byTitle >= 0 ? byTitle : null;
  }

  function titleSlug(slide) {
    return (slide.dataset.title || "slide")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function goTo(next, { pushHash = true } = {}) {
    const target = clamp(next, 0, slides.length - 1);
    if (target === index && slides[target].classList.contains("active")) {
      updateChrome();
      return;
    }

    slides[index]?.classList.remove("active");
    index = target;
    slides[index].classList.add("active");
    slides[index].scrollTop = 0;
    updateChrome();

    if (pushHash) {
      const slug = titleSlug(slides[index]);
      const hash = `#${index + 1}-${slug}`;
      if (location.hash !== hash) {
        history.replaceState(null, "", hash);
      }
    }

    // Announce for screen readers
    const title = slides[index].dataset.title || `Slide ${index + 1}`;
    document.title = `${title} · woo-mcp-server presentation`;
  }

  function updateChrome() {
    if (counter) {
      counter.textContent = `${index + 1} / ${slides.length}`;
    }
    if (progressBar) {
      const pct = slides.length <= 1 ? 100 : (index / (slides.length - 1)) * 100;
      progressBar.style.width = `${pct}%`;
    }
    if (btnPrev) btnPrev.disabled = index <= 0;
    if (btnNext) btnNext.disabled = index >= slides.length - 1;

    // Mark current overview card
    if (overviewEl && !overviewEl.classList.contains("hidden")) {
      overviewEl.querySelectorAll(".overview-card").forEach((card, i) => {
        card.setAttribute("aria-current", i === index ? "true" : "false");
        card.classList.toggle("current", i === index);
      });
    }
  }

  function next() {
    if (overviewOpen) return;
    goTo(index + 1);
  }

  function prev() {
    if (overviewOpen) return;
    goTo(index - 1);
  }

  function buildOverview() {
    if (!overviewEl) return;
    overviewEl.innerHTML = "";
    slides.forEach((slide, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "overview-card" + (i === index ? " current" : "");
      btn.setAttribute("aria-current", i === index ? "true" : "false");
      btn.innerHTML =
        `<span class="num">${String(i + 1).padStart(2, "0")}</span>` +
        `<span class="ttl">${escapeHtml(slide.dataset.title || `Slide ${i + 1}`)}</span>`;
      btn.addEventListener("click", () => {
        closeOverview();
        goTo(i);
      });
      overviewEl.appendChild(btn);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openOverview() {
    if (!overviewEl) return;
    overviewOpen = true;
    buildOverview();
    overviewEl.hidden = false;
    overviewEl.classList.remove("hidden");
    overviewEl.querySelector(".overview-card.current, .overview-card")?.focus();
  }

  function closeOverview() {
    if (!overviewEl) return;
    overviewOpen = false;
    overviewEl.classList.add("hidden");
    overviewEl.hidden = true;
    viewport?.focus({ preventScroll: true });
  }

  function toggleOverview() {
    if (overviewOpen) closeOverview();
    else openOverview();
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  // Buttons
  btnPrev?.addEventListener("click", prev);
  btnNext?.addEventListener("click", next);
  btnOverview?.addEventListener("click", toggleOverview);

  // Keyboard
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;

    if (overviewOpen) {
      if (e.key === "Escape" || e.key === "o" || e.key === "O") {
        e.preventDefault();
        closeOverview();
      }
      return;
    }

    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        e.preventDefault();
        next();
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        prev();
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(slides.length - 1);
        break;
      case "Escape":
      case "o":
      case "O":
        e.preventDefault();
        openOverview();
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
      default:
        // number keys 1-9 jump to that slide (1-indexed)
        if (e.key >= "1" && e.key <= "9" && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const n = Number(e.key) - 1;
          if (n < slides.length) {
            e.preventDefault();
            goTo(n);
          }
        }
        break;
    }
  });

  // Touch swipe (horizontal)
  viewport?.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    },
    { passive: true }
  );

  viewport?.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) next();
      else prev();
    },
    { passive: true }
  );

  // Click left/right thirds of slide for nav (skip interactive elements)
  viewport?.addEventListener("click", (e) => {
    if (overviewOpen) return;
    const interactive = e.target.closest("a, button, input, select, textarea, pre, code");
    if (interactive) return;
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) prev();
    else if (x > rect.width - third) next();
  });

  // Init from hash or first slide
  const fromHash = parseHash();
  slides.forEach((s) => s.classList.remove("active"));
  index = fromHash ?? 0;
  slides[index].classList.add("active");
  updateChrome();
  if (fromHash == null) {
    history.replaceState(null, "", `#1-${titleSlug(slides[0])}`);
  }

  window.addEventListener("hashchange", () => {
    const h = parseHash();
    if (h != null && h !== index) goTo(h, { pushHash: false });
  });

  // Syntax-color all presentation code blocks
  highlightAllCodeBlocks();
})();

/**
 * Lightweight syntax highlighter for shell / JSON / TS / agent plans / trees.
 * Colors tools, env vars, strings, keywords and marks important lines.
 */
function highlightAllCodeBlocks() {
  const blocks = document.querySelectorAll("pre.code-block, pre.code-sm");
  blocks.forEach((pre) => {
    if (pre.dataset.hl === "1") return;
    const codeEl = pre.querySelector("code") || pre;
    const raw = codeEl.textContent || "";
    if (!raw.trim()) return;

    const isTree = pre.classList.contains("tree");
    const lang = detectLang(raw, isTree);
    pre.setAttribute("data-lang", lang);

    const lines = raw.replace(/\n$/, "").split("\n");
    const wrap = document.createElement("span");
    wrap.className = "code-lines";

    lines.forEach((line, i) => {
      const row = document.createElement("div");
      row.className = "code-line" + lineClass(line, isTree);
      row.innerHTML =
        `<span class="ln" aria-hidden="true">${i + 1}</span>` +
        `<span class="lx">${tokenizeLine(line, isTree)}</span>`;
      wrap.appendChild(row);
    });

    // Replace content
    if (codeEl === pre) {
      pre.textContent = "";
      pre.appendChild(wrap);
      pre.classList.add("hl-ready");
    } else {
      codeEl.textContent = "";
      codeEl.appendChild(wrap);
    }
    pre.dataset.hl = "1";
  });
}

function detectLang(src, isTree) {
  if (isTree) return "tree";
  if (/^\s*(import|export|const|await|function)\b/m.test(src)) return "typescript";
  if (/^\s*\{[\s\S]*"method"\s*:/m.test(src) || /^\s*\{\s*"name"\s*:/m.test(src)) return "json";
  if (/^\s*(export|pnpm|git|docker|cd|npx|node)\b/m.test(src) || /^#\s/m.test(src)) return "shell";
  if (/^\s*(User:|Agent plan:|prompts\/get|LIVE\s)/m.test(src)) return "agent";
  if (/^\s*woo_[a-z_]+\s*\{/m.test(src)) return "mcp";
  if (/"mcpServers"|claude_desktop/i.test(src)) return "json";
  return "code";
}

function lineClass(line, isTree) {
  const t = line.trim();
  if (!t) return "";
  if (isTree && /#\s*(STDIO|hermetic|real WC|rate limit|env validation)/i.test(line)) return " hi";
  if (/^\s*LIVE\b/.test(t)) return " ok-line";
  if (/\b(delete|force)\b/i.test(t) && /batch|permanent/i.test(t)) return " warn-line";
  // Important: tool invocations, await calls, env exports, agent replies
  if (/\bwoo_[a-z0-9_]+\b/.test(t)) return " hi";
  if (/\bawait\s+client\.(callTool|connect|listTools)\b/.test(t)) return " hi";
  if (/^\s*export\s+WC_/.test(t)) return " hi";
  if (/^\s*"name"\s*:\s*"woo_/.test(t)) return " hi";
  if (/^\s*→/.test(t) || /^\s*->/.test(t)) return " ok-line";
  if (/^\s*User:/.test(t)) return " hi";
  if (/prompts\/get|tools\/call/.test(t)) return " hi";
  return "";
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function span(cls, text) {
  return `<span class="${cls}">${esc(text)}</span>`;
}

function tokenizeLine(line, isTree) {
  if (!line) return "";

  // Full-line comments
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);

  if (isTree) {
    return tokenizeTreeLine(line);
  }

  if (trimmed.startsWith("//") || (trimmed.startsWith("#") && !trimmed.startsWith("#!"))) {
    return (indent ? esc(indent) : "") + span("tok-comment", trimmed);
  }

  // User / agent dialogue lines
  if (/^User:/.test(trimmed)) {
    return (
      (indent ? esc(indent) : "") +
      span("tok-user", "User:") +
      tokenizeInline(trimmed.slice(5))
    );
  }
  if (/^Agent plan:/.test(trimmed)) {
    return (
      (indent ? esc(indent) : "") +
      span("tok-keyword", "Agent plan:") +
      tokenizeInline(trimmed.slice(11))
    );
  }
  if (/^LIVE\b/.test(trimmed)) {
    const m = trimmed.match(/^(LIVE\s+\w+:)(.*)$/);
    if (m) {
      return (
        (indent ? esc(indent) : "") +
        span("tok-live", m[1]) +
        tokenizeInline(m[2])
      );
    }
  }

  // Arrow result lines
  if (/^→/.test(trimmed) || /^->/.test(trimmed)) {
    const arrow = trimmed.startsWith("→") ? "→" : "->";
    return (
      (indent ? esc(indent) : "") +
      span("tok-arrow", arrow) +
      tokenizeInline(trimmed.slice(arrow.length))
    );
  }

  return tokenizeInline(line);
}

function tokenizeTreeLine(line) {
  // Split tree glyphs from path + comment
  const m = line.match(/^([│├└─\s|\\/`*]+)(.*)$/);
  if (!m) return tokenizeInline(line);
  const glyphs = m[1];
  let rest = m[2];
  let comment = "";
  const cIdx = rest.indexOf("#");
  if (cIdx >= 0) {
    comment = rest.slice(cIdx);
    rest = rest.slice(0, cIdx);
  }
  let out = span("tok-tree", glyphs);
  // Highlight important paths
  if (/mcp-server|live-wc|presentation|cli\.ts|server\.ts|live-store/.test(rest)) {
    out += span("tok-tool", rest);
  } else if (rest.trim()) {
    out += span("tok-path", rest);
  } else {
    out += esc(rest);
  }
  if (comment) out += span("tok-comment", comment);
  return out;
}

function tokenizeInline(text) {
  if (!text) return "";

  // Ordered token patterns (most specific first; JSON keys before strings)
  const rules = [
    { re: /\/\/[^\n]*/, cls: "tok-comment" },
    // JSON keys must beat generic strings
    { re: /"(?:\\.|[^"\\])*"(?=\s*:)/, cls: "tok-key" },
    { re: /'(?:\\.|[^'\\])*'(?=\s*:)/, cls: "tok-key" },
    // strings (matched before bare # so '#' inside quotes stays a string)
    { re: /"(?:\\.|[^"\\])*"/, cls: "tok-string" },
    { re: /'(?:\\.|[^'\\])*'/, cls: "tok-string" },
    { re: /`(?:\\.|[^`\\])*`/, cls: "tok-string" },
    // shell / hash comments
    { re: /#[^\n]*/, cls: "tok-comment" },
    // URIs / resources
    { re: /woo:\/\/[a-zA-Z0-9_./-]+/, cls: "tok-uri" },
    { re: /https?:\/\/[^\s"'`,}]+/, cls: "tok-uri" },
    // MCP tools
    { re: /\bwoo_[a-z0-9_]+\b/, cls: "tok-tool" },
    // env vars
    { re: /\bWC_[A-Z0-9_]+\b/, cls: "tok-env" },
    { re: /\bLIVE_WC\b/, cls: "tok-env" },
    // shell builtins / package managers (export is both shell + keyword — shell color is fine)
    {
      re: /\b(pnpm|npm|npx|git|docker|compose|cd|node|chmod|make|curl|grep|xargs|export)\b/,
      cls: "tok-shell",
    },
    // TS / JS keywords
    {
      re: /\b(import|from|const|let|var|await|async|new|return|function|class|extends|typeof|instanceof|if|else|try|catch|throw|of|in|as|type|interface)\b/,
      cls: "tok-keyword",
    },
    { re: /\b(true|false)\b/, cls: "tok-bool" },
    { re: /\b(null|undefined)\b/, cls: "tok-null" },
    // methods
    { re: /\b(callTool|listTools|connect)\b/, cls: "tok-method" },
    // bare property keys prop:
    { re: /\b[A-Za-z_][A-Za-z0-9_]*(?=\s*:)/, cls: "tok-prop" },
    // numbers
    { re: /\b\d+\.?\d*\b/, cls: "tok-number" },
    // paths
    { re: /(?:\.\/|\/)[A-Za-z0-9_./@+-]+/, cls: "tok-path" },
    // punctuation
    { re: /[{}\[\](),;.=!?<>+\-*/%&|^~:]+/, cls: "tok-punct" },
  ];

  let i = 0;
  let out = "";
  while (i < text.length) {
    let matched = false;
    const slice = text.slice(i);
    for (const rule of rules) {
      const m = slice.match(rule.re);
      if (m && m.index === 0) {
        let cls = rule.cls;
        // Tool names inside string literals still light up as tools
        if (cls === "tok-string") {
          const inner = m[0].slice(1, -1);
          if (/^woo_[a-z0-9_]+$/.test(inner)) cls = "tok-tool";
          else if (/^WC_[A-Z0-9_]+$/.test(inner) || inner === "LIVE_WC") cls = "tok-env";
          else if (/^https?:\/\//.test(inner) || /^woo:\/\//.test(inner)) cls = "tok-uri";
        }
        out += span(cls, m[0]);
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // consume plain run until next possible token
      let j = i + 1;
      while (j < text.length) {
        const rest = text.slice(j);
        let hit = false;
        for (const rule of rules) {
          const m = rest.match(rule.re);
          if (m && m.index === 0) {
            hit = true;
            break;
          }
        }
        if (hit) break;
        j++;
      }
      out += esc(text.slice(i, j));
      i = j;
    }
  }
  return out;
}
