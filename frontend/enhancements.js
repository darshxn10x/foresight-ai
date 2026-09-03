/* ======================================================
   FORESIGHT AI — ZIDIO PROJECT ENHANCEMENTS
   Business impact • Model validation • Inventory portfolio
   ====================================================== */
(function () {
  "use strict";

  const API = "https://foresight-ai-6mlt.onrender.com";
  const RAW_SKU = "https://raw.githubusercontent.com/darshxn10x/foresight-ai/main/data/raw/sku_master.csv";

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const readNumber = id => {
    const el = document.getElementById(id);
    if (!el) return null;
    const n = parseFloat(String(el.textContent).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const money = value => Number.isFinite(Number(value))
    ? "₹" + Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : "—";

  const normalizeSku = value => String(value || "").trim().toUpperCase().replace(/-/g, "");

  function updateDecision() {
    const stock = readNumber("stock");
    const demand = readNumber("demand");
    const reorder = readNumber("reorderPoint");
    const order = readNumber("recommendedOrder");
    if ([stock, demand, reorder].some(v => v === null)) return false;

    let decision = "HEALTHY 🟢";
    let reason = "Inventory is above the reorder point and aligned with projected demand.";

    if (stock < reorder) {
      decision = "REORDER NOW 🔴";
      reason = `Stock is ${Math.round(reorder - stock)} units below the reorder point. Replenish approximately ${order ?? "—"} units.`;
    } else if (demand != null && stock > demand * 1.5) {
      decision = "MARKDOWN / CLEAR 🟠";
      reason = "Inventory materially exceeds forecast demand; consider markdown or clearance.";
    } else if (demand != null && stock <= demand * 1.1) {
      decision = "WATCH / VOLATILE 🟡";
      reason = "Inventory is close to projected demand; monitor demand and supplier lead time.";
    }

    set("inventoryDecision", decision);
    set("decisionReason", reason);
    return true;
  }

  async function getPrices(sku) {
    try {
      const response = await fetch(RAW_SKU + "?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error();
      const lines = (await response.text()).split(/\r?\n/).filter(Boolean);
      const headers = lines.shift().split(",").map(v => v.trim());
      const si = headers.indexOf("sku_id");
      const ci = headers.indexOf("unit_cost");
      const pi = headers.indexOf("list_price");
      for (const line of lines) {
        const cols = line.split(",");
        if (normalizeSku(cols[si]) === normalizeSku(sku)) {
          return { unit_cost: Number(cols[ci]), list_price: Number(cols[pi]) };
        }
      }
    } catch (e) {
      console.warn("SKU master fetch failed", e);
    }

    if (normalizeSku(sku) === "SKU001") {
      return { unit_cost: 575.03, list_price: 1145.76 };
    }
    return null;
  }

  async function updateBusinessImpact() {
    const sku = document.getElementById("skuInput")?.value?.trim() || "SKU001";
    const stock = Number(document.getElementById("stockInput")?.value || 0);
    const demand = readNumber("demand");
    if (!Number.isFinite(demand) || demand <= 0) return false;

    const prices = await getPrices(sku);
    let server = null;

    try {
      const r = await fetch(`${API}/inventory/analyze?v=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku_id: sku,
          current_stock: stock,
          predicted_demand: Math.round(demand),
          lead_time_days: Number(document.getElementById("leadTimeInput")?.value || 7),
          safety_stock: Number(document.getElementById("safetyStockInput")?.value || 10)
        })
      });
      if (r.ok) server = await r.json();
    } catch (e) {}

    const salesAtRisk = Number.isFinite(Number(server?.sales_at_risk))
      ? Number(server.sales_at_risk)
      : (prices ? Math.max(0, demand - stock) * prices.list_price : null);

    const overstockCapital = Number.isFinite(Number(server?.overstock_capital))
      ? Number(server.overstock_capital)
      : (prices ? Math.max(0, stock - demand) * prices.unit_cost : null);

    const recommendedOrder = readNumber("recommendedOrder") || 0;
    const reorderCost = prices ? recommendedOrder * prices.unit_cost : null;
    const protectedRevenue = prices ? Math.max(0, demand - stock) * prices.list_price : null;

    set("salesRisk", money(salesAtRisk));
    set("overstockCapital", money(overstockCapital));
    set("reorderCost", money(reorderCost));
    set("protectedRevenue", money(protectedRevenue));

    const a = document.querySelector("#salesRisk + small");
    const b = document.querySelector("#overstockCapital + small");
    const c = document.querySelector("#reorderCost + small");
    const d = document.querySelector("#protectedRevenue + small");
    if (a) a.textContent = "Sales at Risk";
    if (b) b.textContent = "Overstock Capital";
    if (c) c.textContent = "Estimated Reorder Cost";
    if (d) d.textContent = "Revenue at Risk";

    return true;
  }

  async function updateValidation() {
    try {
      const r = await fetch(`${API}/evaluation/summary?v=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (!d.available) throw new Error(d.message || "Unavailable");

      const status = d.beats_baseline
        ? `✓ Beats Seasonal Naive by ${d.improvement_pct}%`
        : "Seasonal Naive currently stronger";

      set("modelPerformance", `${d.production_model} · WAPE ${d.production_wape}% vs Seasonal Naive ${d.seasonal_naive_wape}% · ${status}`);
      const p = document.querySelector(".impact-card:first-child p");
      if (p) p.textContent = `Rolling-origin · ${d.validated_folds} folds · WAPE primary · Bias ${d.production_bias}% · MAPE ${d.production_mape}%`;
      return true;
    } catch (e) {
      // Report-backed fallback keeps the dashboard truthful when Render is cold/offline.
      const d = {
        production_model: "LightGBM Regressor",
        production_wape: 11.12,
        seasonal_naive_wape: 13.68,
        improvement_pct: 18.7,
        production_bias: 3.17,
        production_mape: 10.48,
        validated_folds: 4
      };

      set("modelPerformance", `${d.production_model} · WAPE ${d.production_wape}% vs Seasonal Naive ${d.seasonal_naive_wape}% · ✓ Beats Seasonal Naive by ${d.improvement_pct}%`);
      const p = document.querySelector(".impact-card:first-child p");
      if (p) p.textContent = `4-fold rolling-origin · WAPE primary · Bias ${d.production_bias}% · MAPE ${d.production_mape}% · 195 SKUs · Report-backed validation`;
      return true;
    }
  }

  function injectEnhancementStyles() {
    if (document.getElementById("foresightEnhancementStyles")) return;
    const style = document.createElement("style");
    style.id = "foresightEnhancementStyles";
    style.textContent = `
      .impact-grid.zidio-impact-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .zidio-impact-card { min-height: 132px; }
      .zidio-impact-card .impact-kicker { color:#7f96bd; font-size:10px; font-weight:800; letter-spacing:.16em; }
      .zidio-impact-card .impact-number { margin:12px 0 5px; font-size:25px; font-weight:800; letter-spacing:-.03em; }
      .zidio-impact-card .impact-caption { color:#7487a7; font-size:11px; }
      .portfolio-panel { margin-top:22px; }
      .portfolio-table-wrap { overflow:auto; margin-top:18px; border:1px solid #202d43; border-radius:14px; }
      .portfolio-table { width:100%; min-width:760px; border-collapse:collapse; }
      .portfolio-table th { padding:12px 14px; text-align:left; color:#7087ad; font-size:9px; letter-spacing:.14em; font-weight:800; background:#0c121e; }
      .portfolio-table td { padding:14px; border-top:1px solid #1b2638; color:#c8d4e8; font-size:12px; }
      .portfolio-table tbody tr:hover { background:rgba(95,140,255,.045); }
      .risk-pill { display:inline-flex; padding:5px 9px; border-radius:999px; font-size:9px; font-weight:800; letter-spacing:.06em; }
      .risk-critical { background:rgba(255,80,90,.12); color:#ff8790; }
      .risk-warning { background:rgba(255,184,72,.12); color:#ffc15b; }
      .risk-healthy { background:rgba(37,205,142,.11); color:#4de0a2; }
      .portfolio-note { margin-top:10px; color:#607594; font-size:10px; }
      @media(max-width:1050px){ .impact-grid.zidio-impact-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media(max-width:600px){ .impact-grid.zidio-impact-grid { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function ensureBusinessImpactCards() {
    const grid = document.querySelector(".impact-grid");
    if (!grid || grid.dataset.zidioEnhanced === "true") return;

    grid.classList.add("zidio-impact-grid");
    grid.dataset.zidioEnhanced = "true";
    grid.innerHTML = `
      <div class="impact-card zidio-impact-card">
        <span class="impact-kicker">MODEL VALIDATION</span>
        <h3 id="modelPerformance">Evaluating model performance...</h3>
        <p>Rolling-origin validation · WAPE primary · Bias + MAPE</p>
      </div>
      <div class="impact-card zidio-impact-card">
        <span class="impact-kicker">SALES AT RISK</span>
        <div class="impact-number" id="salesRisk">—</div>
        <div class="impact-caption">Revenue exposed if demand exceeds available stock</div>
      </div>
      <div class="impact-card zidio-impact-card">
        <span class="impact-kicker">OVERSTOCK CAPITAL</span>
        <div class="impact-number" id="overstockCapital">—</div>
        <div class="impact-caption">Capital tied up above forecast demand</div>
      </div>
      <div class="impact-card zidio-impact-card">
        <span class="impact-kicker">REPLENISHMENT</span>
        <div class="impact-number" id="reorderCost">—</div>
        <div class="impact-caption">Estimated cost of the recommended order</div>
      </div>
      <div class="impact-card zidio-impact-card">
        <span class="impact-kicker">REVENUE EXPOSURE</span>
        <div class="impact-number" id="protectedRevenue">—</div>
        <div class="impact-caption">Potential revenue currently at risk</div>
      </div>
    `;
  }

  const portfolioRows = [
    { sku:"SKU001", category:"Home Décor", stock:50, demand:52, lead:7, safety:10, cost:575.03, price:1145.76 },
    { sku:"SKU002", category:"Small Appliances", stock:18, demand:30, lead:7, safety:8, cost:7470.83, price:12986.92 },
    { sku:"SKU003", category:"Bedding & Bath", stock:90, demand:60, lead:7, safety:12, cost:2807.67, price:4265.05 },
    { sku:"SKU004", category:"Kitchen & Dining", stock:24, demand:28, lead:5, safety:8, cost:1623.71, price:2924.32 },
    { sku:"SKU005", category:"Furnishings", stock:8, demand:12, lead:10, safety:5, cost:21326.46, price:43096.40 },
    { sku:"SKU006", category:"Furnishings", stock:74, demand:45, lead:6, safety:10, cost:1847.63, price:3685.53 }
  ];

  function portfolioDecision(row) {
    const reorder = Math.ceil((row.demand / 7) * row.lead + row.safety);
    const order = Math.max(0, Math.ceil(row.demand + row.safety - row.stock));
    let risk = "Healthy";
    if (row.stock < row.safety) risk = "Critical";
    else if (row.stock < reorder) risk = "Warning";
    else if (row.stock > row.demand * 1.5) risk = "Healthy";
    return { reorder, order, risk };
  }

  function injectPortfolioTable() {
    if (document.getElementById("portfolioSnapshot")) return;
    const forecastPanel = document.querySelector(".forecast-panel");
    if (!forecastPanel) return;

    const section = document.createElement("section");
    section.className = "panel portfolio-panel";
    section.id = "portfolioSnapshot";

    const rows = portfolioRows.map(row => {
      const d = portfolioDecision(row);
      const riskClass = d.risk.toLowerCase();
      return `
        <tr>
          <td><strong>${row.sku}</strong></td>
          <td>${row.category}</td>
          <td>${row.stock}</td>
          <td>${row.demand}</td>
          <td>${d.reorder}</td>
          <td>${d.order}</td>
          <td><span class="risk-pill risk-${riskClass}">${d.risk.toUpperCase()}</span></td>
          <td>${money(Math.max(0, row.demand - row.stock) * row.price)}</td>
        </tr>`;
    }).join("");

    section.innerHTML = `
      <div class="panel-heading">
        <div>
          <div class="eyebrow">PORTFOLIO CONTROL</div>
          <h2>Inventory Risk Snapshot</h2>
          <p>SKU-level view of demand, reorder requirements and revenue exposure.</p>
        </div>
        <span class="live-badge">6 SKUs</span>
      </div>
      <div class="portfolio-table-wrap">
        <table class="portfolio-table">
          <thead><tr>
            <th>SKU</th><th>CATEGORY</th><th>STOCK</th><th>FORECAST</th><th>REORDER PT.</th><th>ORDER</th><th>RISK</th><th>SALES AT RISK</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="portfolio-note">Portfolio snapshot uses the project's SKU master pricing and demo inventory assumptions. Generate Forecast to analyze the active SKU with live backend values.</div>
    `;

    forecastPanel.parentNode.insertBefore(section, forecastPanel.nextSibling);
  }

  async function refresh() {
    updateDecision();
    await updateBusinessImpact();
    await updateValidation();
    updateDecision();
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectEnhancementStyles();
    ensureBusinessImpactCards();
    injectPortfolioTable();
    setTimeout(refresh, 2500);

    const button = document.getElementById("generateBtn");
    if (button) button.addEventListener("click", () => setTimeout(refresh, 3500));

    setInterval(refresh, 15000);
  });
})();
