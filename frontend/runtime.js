/* Foresight AI — runtime polish for demos and evaluation */
(function () {
  "use strict";

  const API = "https://foresight-ai-6mlt.onrender.com";

  function addStyles() {
    if (document.getElementById("foresightRuntimeStyles")) return;
    const style = document.createElement("style");
    style.id = "foresightRuntimeStyles";
    style.textContent = `
      .api-status.runtime-offline { border-color:#4a3030; background:#241415; color:#ff9a9a; }
      .api-status.runtime-offline span { background:#ff6f78; box-shadow:0 0 10px rgba(255,111,120,.45); }
      .api-status.runtime-demo { border-color:#5a4622; background:#211b10; color:#ffc65f; }
      .api-status.runtime-demo span { background:#ffb83f; box-shadow:0 0 10px rgba(255,184,63,.4); }
      .system-status.runtime-offline .status-dot { background:#ff6f78; box-shadow:0 0 12px rgba(255,111,120,.45); }
      .system-status.runtime-demo .status-dot { background:#ffb83f; box-shadow:0 0 12px rgba(255,184,63,.4); }
      .ready-badge.runtime-demo { border-color:#5a4622; color:#ffc65f; background:#211b10; }
      .live-badge.runtime-demo { border-color:#5a4622; color:#ffc65f; background:#211b10; }
      .runtime-meta { margin-top:8px; color:#526582; font-size:9px; line-height:1.4; }
      .portfolio-table tbody tr[data-sku] { cursor:pointer; transition:background .15s ease; }
      .portfolio-table tbody tr[data-sku]:hover { background:rgba(95,140,255,.08); }
      .portfolio-table tbody tr[data-sku] td:first-child strong::after { content:"  ↗"; color:#5f8cff; font-size:10px; opacity:0; transition:opacity .15s ease; }
      .portfolio-table tbody tr[data-sku]:hover td:first-child strong::after { opacity:1; }
      .runtime-toast { position:fixed; left:50%; bottom:26px; transform:translate(-50%,12px); opacity:0; z-index:12000; padding:10px 15px; border:1px solid #2c3c5c; border-radius:999px; background:#111a2a; color:#d7e1f3; font:700 11px Inter,sans-serif; box-shadow:0 16px 44px rgba(0,0,0,.4); pointer-events:none; transition:opacity .18s ease,transform .18s ease; }
      .runtime-toast.show { opacity:1; transform:translate(-50%,0); }
    `;
    document.head.appendChild(style);
  }

  function toast(message) {
    let el = document.getElementById("runtimeToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "runtimeToast";
      el.className = "runtime-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__foresightToastTimer);
    window.__foresightToastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function updateModeBadges(mode) {
    const ready = document.querySelector(".ready-badge");
    const live = document.querySelector(".live-badge");
    if (ready) {
      ready.classList.toggle("runtime-demo", mode !== "online");
      ready.innerHTML = mode === "online" ? "<span></span>LIVE READY" : "<span></span>DEMO READY";
      ready.title = mode === "online" ? "Backend forecast engine is reachable." : "Demo calculations remain available while the backend is offline.";
    }
    if (live) {
      live.classList.toggle("runtime-demo", mode !== "online");
      live.textContent = mode === "online" ? "LIVE" : "DEMO ANALYSIS";
      live.title = mode === "online" ? "Inventory analysis is backed by the live API." : "Inventory analysis is running from deterministic demo logic.";
    }
  }

  function updateStatus(mode, detail) {
    const badge = document.querySelector(".api-status");
    const label = document.getElementById("apiStatus");
    const system = document.getElementById("systemStatus");
    const systemLabel = document.getElementById("systemStatusLabel");
    const systemDetail = document.getElementById("systemStatusDetail");
    if (!badge || !label) return;

    badge.classList.remove("runtime-offline", "runtime-demo");
    updateModeBadges(mode);

    if (mode === "online") {
      label.textContent = "API CONNECTED";
      badge.title = "Foresight backend is reachable.";
      if (systemLabel) systemLabel.textContent = "System Online";
      if (systemDetail) systemDetail.textContent = detail || "Live forecast engine connected";
      if (system) system.classList.remove("runtime-offline", "runtime-demo");
    } else if (mode === "demo") {
      label.textContent = "DEMO FALLBACK";
      badge.classList.add("runtime-demo");
      badge.title = "The dashboard is using its deterministic demo path.";
      if (systemLabel) systemLabel.textContent = "Demo Mode";
      if (systemDetail) systemDetail.textContent = "Using deterministic fallback data";
      if (system) { system.classList.remove("runtime-offline"); system.classList.add("runtime-demo"); }
    } else {
      label.textContent = "API OFFLINE";
      badge.classList.add("runtime-offline");
      badge.title = "Backend health check failed; demo fallback remains available.";
      if (systemLabel) systemLabel.textContent = "Backend Offline";
      if (systemDetail) systemDetail.textContent = "Demo fallback available";
      if (system) { system.classList.remove("runtime-demo"); system.classList.add("runtime-offline"); }
    }

    window.__foresightBackendMode = mode;
  }

  // Exposed for app.js so forecast failures do not overwrite the richer runtime status.
  window.__foresightSetMode = updateStatus;

  async function checkBackend() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${API}/health?v=${Date.now()}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      updateStatus("online", "Live forecast engine connected");
      return true;
    } catch (error) {
      updateStatus("offline");
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  function markPortfolioRows() {
    document.querySelectorAll("#portfolioSnapshot tbody tr").forEach(row => {
      if (row.dataset.sku) return;
      const sku = row.querySelector("td:first-child strong")?.textContent?.trim();
      if (!sku) return;
      row.dataset.sku = sku;
      row.title = `Analyze ${sku}`;
    });
  }

  function bindPortfolioInteraction() {
    const table = document.getElementById("portfolioSnapshot");
    if (!table || table.dataset.runtimeBound === "true") return;
    table.dataset.runtimeBound = "true";
    table.addEventListener("click", event => {
      const row = event.target.closest("tr[data-sku]");
      if (!row) return;
      const sku = row.dataset.sku;
      const source = [...row.children].map(cell => cell.textContent.trim());
      const stock = parseFloat(source[2]);
      const skuInput = document.getElementById("skuInput");
      const stockInput = document.getElementById("stockInput");
      if (skuInput) skuInput.value = sku;
      if (stockInput && Number.isFinite(stock)) stockInput.value = stock;
      document.getElementById("forecast")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast(`${sku} loaded — generating forecast`);
      setTimeout(() => document.getElementById("generateBtn")?.click(), 260);
    });
  }

  function observeEnhancements() {
    const observer = new MutationObserver(() => {
      markPortfolioRows();
      bindPortfolioInteraction();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    addStyles();
    markPortfolioRows();
    bindPortfolioInteraction();
    observeEnhancements();
    checkBackend();
    setInterval(checkBackend, 30000);

    const status = document.querySelector(".api-status");
    if (status && !document.getElementById("runtimeMeta")) {
      const meta = document.createElement("div");
      meta.id = "runtimeMeta";
      meta.className = "runtime-meta";
      meta.textContent = "Backend health is checked automatically · demo fallback remains available";
      status.parentElement?.appendChild(meta);
    }
  });
})();
