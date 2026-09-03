/* ======================================================
   FORESIGHT AI — EVALUATION + DECISION UI
   Uses the real API response; never invents model metrics.
   ====================================================== */
(function () {
  "use strict";

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

    const impactCards = document.querySelectorAll(".impact-card small");
    if (impactCards.length >= 2) {
      impactCards[0].textContent = "Units potentially at risk";
      impactCards[1].textContent = "Units above forecast";
    }
  }

  function showEvaluation(data) {
    const evaluation = data && data.evaluation && data.evaluation[0];
    const model = data && data.forecast && data.forecast[0]
      ? data.forecast[0].model
      : null;

    if (model) {
      set("forecastModel", `MODEL: ${model.replace(/_/g, " ").toUpperCase()}`);
    }

    if (!evaluation) return;

    const modelName = String(evaluation.model || model || "Forecast Model")
      .replace(/_/g, " ");

    const evalText = evaluation.available
      ? `Model: ${modelName} · MAE ${evaluation.mae} · RMSE ${evaluation.rmse} · MAPE ${evaluation.mape ?? "—"}%`
      : `Model: ${modelName} · ${evaluation.message || "Validation unavailable"}`;

    set("modelPerformance", evalText);

    const p = document.querySelector(".impact-card p");
    if (p) p.textContent = evaluation.available
      ? "Holdout evaluation · MAE / RMSE / MAPE · Use more history for rolling-origin validation"
      : "Validation unavailable for the current history length";
  }

  // Wrap the existing forecast API call so the UI receives the backend's
  // real evaluation object without changing the existing engine.
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

  // Existing dashboard code renders asynchronously; poll briefly after load.
  let ticks = 0;
  const timer = setInterval(() => {
    hook();
    ticks++;
    if (ticks > 30) clearInterval(timer);
  }, 500);

  document.addEventListener("click", () => {
    setTimeout(() => {
      updateDecision();
      updateImpact();
    }, 150);
  });
})();
