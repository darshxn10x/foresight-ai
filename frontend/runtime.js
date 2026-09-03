/* Foresight AI — runtime status and portfolio interactions */
(function () {
  "use strict";

  const CONFIGURED_API_URL = "https://foresight-ai-6mlt.onrender.com";
  const HEALTH_TIMEOUT_MS = 20000;

  function getApiCandidates() {
    const candidates = [];
    const sameOrigin = window.location.origin;
    if (sameOrigin && sameOrigin !== "null") candidates.push(sameOrigin);
    candidates.push(CONFIGURED_API_URL);
    return [...new Set(candidates.filter(Boolean).map(url => url.replace(/\/$/, "")))];
  }

  function addStyles() {
    if (document.getElementById("foresightRuntimeStyles")) return;
    const style = document.createElement("style");
    style.id = "foresightRuntimeStyles";
    style.textContent = `
      .api-status.runtime-unavailable { border-color:#5a4622; background:#211b10; color:#ffc65f; }
      .api-status.runtime-unavailable span { background:#ffb83f; box-shadow:0 0 10px rgba(255,184,63,.4); }
      .system-status.runtime-unavailable .status-dot { background:#ffb83f; box-shadow:0 0 12px rgba(255,184,63,.4); }
      .ready-badge.runtime-unavailable { border-color:#5a4622; color:#ffc65f; background:#211b10; }
      .live-badge.runtime-unavailable { border-color:#5a4622; color:#ffc65f; background:#211b10; }
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
    const online = mode === "online";
    if (ready) {
      ready.classList.toggle("runtime-unavailable", !online);
      ready.innerHTML = online ? "<span></span>READY" : "<span></span>UNAVAILABLE";
      ready.title = online ? "Forecast backend connected." : "Forecast backend is unavailable.";
    }
    if (live) {
      live.classList.toggle("runtime-unavailable", !online);
      live.textContent = online ? "LIVE" : "UNAVAILABLE";
      live.title = online ? "Inventory analysis is backed by the API." : "Inventory analysis is unavailable until the API reconnects.";
    }
  }

  function updateStatus(mode, detail) {
    const badge = document.querySelector(".api-status");
    const label = document.getElementById("apiStatus");
    const system = document.getElementById("systemStatus");
    const systemLabel = document.getElementById("systemStatusLabel");
    const systemDetail = document.getElementById("systemStatusDetail");
    if (!badge || !label) return;

    const normalized = mode === "online" ? "online" : mode === "unavailable" ? "unavailable" : "checking";
    badge.classList.remove("runtime-unavailable");
    updateModeBadges(normalized);

    if (normalized === "online") {
      label.textContent = "API CONNECTED";
      badge.title = "Foresight backend is reachable.";
      if (systemLabel) systemLabel.textContent = "System Online";
      if (systemDetail) systemDetail.textContent = detail || "Forecast engine connected";
      if (system) system.classList.remove("runtime-unavailable");
    } else if (normalized === "unavailable") {
      label.textContent = "API UNAVAILABLE";
      badge.classList.add("runtime-unavailable");
      badge.title = "Foresight backend is currently unavailable.";
      if (systemLabel) systemLabel.textContent = "Service Unavailable";
      if (systemDetail) systemDetail.textContent = detail || "Unable to reach forecast engine";
      if (system) system.classList.add("runtime-unavailable");
    } else {
      label.textContent = "CHECKING API";
      if (systemLabel) systemLabel.textContent = "Checking system…";
      if (systemDetail) systemDetail.textContent = "Connecting to forecast engine";
    }
  }

  window.__foresightSetMode = updateStatus;

  async function checkBackend() {
    for (const api of getApiCandidates()) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      try {
        const response = await fetch(`${api}/health?v=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        updateStatus("online", "Forecast engine connected");
        return true;
      } catch (error) {
        // Try the next API candidate. The production service may be waking up.
      } finally {
        clearTimeout(timer);
      }
    }

    updateStatus("unavailable", "Unable to reach forecast engine");
    return false;
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
      const cells = [...row.children];
      const stock = parseFloat(cells[2]?.textContent || "");
      const skuInput = document.getElementById("skuInput");
      const stockInput = document.getElementById("stockInput");
      if (skuInput) skuInput.value = sku;
      if (stockInput && Number.isFinite(stock)) stockInput.value = stock;
      document.getElementById("forecast")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast(`${sku} loaded`);
      setTimeout(() => document.getElementById("generateBtn")?.click(), 260);
    });
  }

  function observe() {
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
    observe();
    checkBackend();
    setInterval(checkBackend, 30000);

    const status = document.querySelector(".api-status");
    if (status && !document.getElementById("runtimeMeta")) {
      const meta = document.createElement("div");
      meta.id = "runtimeMeta";
      meta.className = "runtime-meta";
      meta.textContent = "Backend health checked automatically";
      status.parentElement?.appendChild(meta);
    }
  });
})();
