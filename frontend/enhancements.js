/* Foresight AI — business impact and inventory portfolio */
(function () {
  "use strict";

  const API = window.location.origin;
  const SKU_MASTER = "https://raw.githubusercontent.com/darshxn10x/foresight-ai/main/data/raw/sku_master.csv";

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const readNumber = id => {
    const el = document.getElementById(id);
    if (!el) return null;
    const value = parseFloat(String(el.textContent).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? value : null;
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
    if ([stock, demand, reorder].some(value => value === null)) return false;

    let decision = "HEALTHY";
    let reason = "Inventory is above the reorder point and aligned with projected demand.";

    if (stock < reorder) {
      decision = "REORDER NOW";
      reason = `Stock is ${Math.round(reorder - stock)} units below the reorder point. Replenish approximately ${order ?? "—"} units.`;
    } else if (demand != null && stock > demand * 1.5) {
      decision = "MARKDOWN / CLEAR";
      reason = "Inventory materially exceeds forecast demand; consider markdown or clearance.";
    } else if (demand != null && stock <= demand * 1.1) {
      decision = "WATCH / VOLATILE";
      reason = "Inventory is close to projected demand; monitor demand and supplier lead time.";
    }

    set("inventoryDecision", decision);
    set("decisionReason", reason);
    return true;
  }

  async function getPrices(sku) {
    try {
      const response = await fetch(`${SKU_MASTER}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const lines = (await response.text()).split(/\r?\n/).filter(Boolean);
      const headers = lines.shift().split(",").map(value => value.trim());
      const skuIndex = headers.indexOf("sku_id");
      const costIndex = headers.indexOf("unit_cost");
      const priceIndex = headers.indexOf("list_price");
      for (const line of lines) {
        const columns = line.split(",");
        if (normalizeSku(columns[skuIndex]) === normalizeSku(sku)) {
          return { unit_cost: Number(columns[costIndex]), list_price: Number(columns[priceIndex]) };
        }
      }
    } catch (error) {
      console.warn("Unable to load SKU pricing", error);
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
      const response = await fetch(`${API}/inventory/analyze?v=${Date.now()}`, {
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
      if (response.ok) server = await response.json();
    } catch (error) {}

    const salesAtRisk = Number.isFinite(Number(server?.sales_at_risk))
      ? Number(server.sales_at_risk)
      : (prices ? Math.max(0, demand - stock) * prices.list_price : null);

    const overstockCapital = Number.isFinite(Number(server?.overstock_capital))
      ? Number(server.overstock_capital)
      : (prices ? Math.max(0, stock - demand) * prices.unit_cost : null);

    const recommendedOrder = readNumber("recommendedOrder") || 0;
    const reorderCost = prices ? recommendedOrder * prices.unit_cost : null;
    const revenueExposure = prices ? Math.max(0, demand - stock) * prices.list_price : null;

    set("salesRisk", money(salesAtRisk));
    set("overstockCapital", money(overstockCapital));
    set("reorderCost", money(reorderCost));
    set("protectedRevenue", money(revenueExposure));

    return true;
  }

  function injectStyles() {
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
    if (!grid || grid.dataset.enhanced === "true") return;

    grid.classList.add("zidio-impact-grid");
    grid.dataset.enhanced = "true";
    grid.innerHTML = `
      <div class="impact-card zidio-impact-card">
        <span class="impact-kicker">MODEL VALIDATION</span>
        <h3 id="modelPerformance">Evaluating model performance...</h3>
        <p id="modelPerformanceDetail">Rolling-origin, one-step-ahead validation · MAE / RMSE / MAPE</p>
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
    { sku:"SKU001", category:"Home Décor", stock:50, demand:52, lead:7, safety:10 },
    { sku:"SKU002", category:"Small Appliances", stock:18, demand:30, lead:7, safety:8 },
    { sku:"SKU003", category:"Bedding & Bath", stock:90, demand:60, lead:7, safety:12 },
    { sku:"SKU004", category:"Kitchen & Dining", stock:24, demand:28, lead:5, safety:8 },
    { sku:"SKU005", category:"Furnishings", stock:8, demand:12, lead:10, safety:5 },
    { sku:"SKU006", category:"Furnishings", stock:74, demand:45, lead:6, safety:10 }
  ];

  function portfolioDecision(row) {
    const reorder = Math.ceil((row.demand / 7) * row.lead + row.safety);
    const order = Math.max(0, Math.ceil(row.demand + row.safety - row.stock));
    let risk = "Healthy";
    if (row.stock < row.safety) risk = "Critical";
    else if (row.stock < reorder) risk = "Warning";
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
      const decision = portfolioDecision(row);
      return `
        <tr>
          <td><strong>${row.sku}</strong></td>
          <td>${row.category}</td>
          <td>${row.stock}</td>
          <td>${row.demand}</td>
          <td>${decision.reorder}</td>
          <td>${decision.order}</td>
          <td><span class="risk-pill risk-${decision.risk.toLowerCase()}">${decision.risk.toUpperCase()}</span></td>
        </tr>`;
    }).join("");

    section.innerHTML = `
      <div class="panel-heading">
        <div>
          <div class="eyebrow">PORTFOLIO CONTROL</div>
          <h2>Inventory Risk Snapshot</h2>
          <p>SKU-level view of demand, reorder requirements and risk exposure.</p>
        </div>
        <span class="live-badge">6 SKUs</span>
      </div>
      <div class="portfolio-table-wrap">
        <table class="portfolio-table">
          <thead><tr>
            <th>SKU</th><th>CATEGORY</th><th>STOCK</th><th>FORECAST</th><th>REORDER PT.</th><th>ORDER</th><th>RISK</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="portfolio-note">Portfolio snapshot from the project inventory dataset. Select a SKU to run the active analysis.</div>
    `;

    forecastPanel.parentNode.insertBefore(section, forecastPanel.nextSibling);
  }

  async function refresh() {
    updateDecision();
    await updateBusinessImpact();
    updateDecision();
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    ensureBusinessImpactCards();
    injectPortfolioTable();
    setTimeout(refresh, 2500);

    const button = document.getElementById("generateBtn");
    if (button) button.addEventListener("click", () => setTimeout(refresh, 3500));

    setInterval(refresh, 30000);
  });
})();
