/* ======================================================
   FORESIGHT AI — EVALUATION + DECISION UI
   Uses the real API response; never invents model metrics.
   ====================================================== */
(function () {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .decision-box{margin-top:18px;padding:16px 18px;border:1px solid #2b3850;border-radius:14px;background:linear-gradient(135deg,rgba(32,46,75,.55),rgba(15,21,34,.8));}
    .decision-box span,.impact-card>span{display:block;color:#6f86ad;font-size:9px;font-weight:800;letter-spacing:1.5px;margin-bottom:8px;}
    .decision-box strong{display:block;color:#fff;font-size:15px;letter-spacing:.3px;margin-bottom:6px;}
    .decision-box small{color:#8799b7;line-height:1.5;}
    .impact-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0;}
    .impact-card{padding:20px 22px;border:1px solid #202c42;border-radius:16px;background:#101622;min-height:112px;}
    .impact-card h3{margin:6px 0 8px;color:#eef3ff;font-size:16px;line-height:1.35;}
    .impact-card p{margin:0;color:#7185a7;font-size:11px;line-height:1.5;}
    .impact-values{display:flex;gap:45px;margin-top:10px;}
    .impact-values div{display:flex;flex-direction:column;gap:4px;}
    .impact-values b{font-size:23px;color:#f4f7ff;}.impact-values small{color:#7185a7;font-size:10px;}
    @media(max-width:760px){.impact-grid{grid-template-columns:1fr;}}
  `;
  document.head.appendChild(style);

  function num(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const n = parseFloat(el.textContent.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function set(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateDecision() {
    const stock = num("stock");
    const demand = num("demand");
    const reorder = num("reorderPoint");
    const order = num("recommendedOrder");
    if (stock === null || reorder === null) return;

    let decision = "HEALTHY 🟢";
    let reason = "Inventory is above the reorder point. Continue monitoring demand.";

    if (stock < reorder) {
      decision = "REORDER NOW 🔴";
      reason = `Stock is ${Math.max(0, reorder - stock)} units below the reorder point. Replenish approximately ${order ?? "—"} units.`;
    } else if (demand !== null && stock > demand * 1.75) {
      decision = "MARKDOWN / CLEAR 🟠";
      reason = "Inventory is substantially above forecast demand; consider reducing excess stock.";
    } else if (demand !== null && stock < demand) {
      decision = "WATCH / VOLATILE 🟡";
      reason = "Stock is below forecast demand but is not below the calculated reorder point.";
    }

    set("inventoryDecision", decision);
    set("decisionReason", reason);
  }

  function updateImpact() {
    const stock = num("stock");
    const demand = num("demand");
    if (stock === null || demand === null) return;
    const atRisk = Math.max(0, Math.ceil(demand - stock));
    const excess = Math.max(0, Math.ceil(stock - demand));
    set("salesRisk", `${atRisk} units`);
    set("overstockCapital", `${excess} units`);
  }

  function showEvaluation(data) {
    const evaluation = data && data.evaluation && data.evaluation[0];
    const model = data && data.forecast && data.forecast[0] ? data.forecast[0].model : null;
    if (model) set("forecastModel", `MODEL: ${model.replace(/_/g, " ").toUpperCase()}`);
    if (!evaluation) return;

    const modelName = String(evaluation.model || model || "Forecast Model").replace(/_/g, " ");
    const evalText = evaluation.available
      ? `Model: ${modelName} · MAE ${evaluation.mae} · RMSE ${evaluation.rmse} · MAPE ${evaluation.mape ?? "—"}%`
      : `Model: ${modelName} · ${evaluation.message || "Validation unavailable"}`;
    set("modelPerformance", evalText);

    const p = document.querySelector(".impact-card p");
    if (p) p.textContent = evaluation.available
      ? "Holdout evaluation · MAE / RMSE / MAPE · More history enables stronger rolling-origin validation"
      : "Validation unavailable for the current history length";
  }

  function hook() {
    if (typeof window.getForecast === "function" && !window.getForecast.__foresightHooked) {
      const original = window.getForecast;
      const wrapped = async function () {
        const data = await original.apply(this, arguments);
        showEvaluation(data);
        return data;
      };
      wrapped.__foresightHooked = true;
      window.getForecast = wrapped;
    }
    updateDecision();
    updateImpact();
  }

  let ticks = 0;
  const timer = setInterval(() => {
    hook();
    ticks++;
    if (ticks > 30) clearInterval(timer);
  }, 500);

  document.addEventListener("click", () => {
    setTimeout(() => { updateDecision(); updateImpact(); }, 150);
  });
})();
