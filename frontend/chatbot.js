/* ======================================================
   FORESIGHT AI — SUPPLY INTELLIGENCE ASSISTANT
   Dashboard-aware assistant. No API key required.
   ====================================================== */
(function () {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .foresight-chat-fab{position:fixed;right:28px;bottom:28px;z-index:9999;border:0;border-radius:999px;padding:14px 20px;background:linear-gradient(90deg,#587cff,#774cff);color:#fff;font:800 13px Inter,sans-serif;cursor:pointer;box-shadow:0 14px 38px rgba(91,91,255,.35);transition:transform .18s ease,box-shadow .18s ease}
    .foresight-chat-fab:hover{transform:translateY(-2px);box-shadow:0 18px 44px rgba(91,91,255,.42)}
    .foresight-chat{position:fixed;right:28px;bottom:88px;z-index:10000;width:min(410px,calc(100vw - 32px));height:590px;display:none;flex-direction:column;overflow:hidden;background:#101522;border:1px solid #28344b;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.55);color:#f5f7ff;font-family:Inter,sans-serif}
    .foresight-chat.open{display:flex}.fc-head{padding:18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #202a3d}.fc-avatar{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#627cff,#754cff);font-weight:800}.fc-title{font-weight:800;font-size:14px}.fc-sub{color:#7186aa;font-size:9px;margin-top:3px;letter-spacing:.08em}.fc-live{margin-left:2px;color:#4de0a2;font-size:8px;font-weight:800;letter-spacing:.08em}.fc-close{margin-left:auto;background:none;border:0;color:#8190aa;font-size:22px;cursor:pointer}.fc-messages{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}.fc-msg{max-width:90%;padding:11px 13px;border-radius:14px;font-size:12px;line-height:1.55;white-space:pre-line}.fc-ai{align-self:flex-start;background:#1a2231;color:#b9c7de}.fc-user{align-self:flex-end;background:#314b9a;color:#fff}.fc-typing{display:inline-flex;gap:4px;align-items:center;padding:12px 14px}.fc-typing i{width:5px;height:5px;border-radius:50%;background:#7f96bd;animation:fcPulse 1s infinite ease-in-out}.fc-typing i:nth-child(2){animation-delay:.15s}.fc-typing i:nth-child(3){animation-delay:.3s}@keyframes fcPulse{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
    .fc-quick{padding:10px 14px;display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;border-top:1px solid #202a3d}.fc-quick::-webkit-scrollbar{display:none}.fc-quick button{flex:0 0 auto;border:1px solid #293852;background:#121b2b;color:#9eb2d5;border-radius:999px;padding:7px 10px;font-size:9px;cursor:pointer;transition:border-color .15s ease,background .15s ease}.fc-quick button:hover{border-color:#5576c9;background:#17233a;color:#cbd8ee}.fc-input{padding:12px;display:flex;gap:8px;border-top:1px solid #202a3d}.fc-input input{flex:1;min-width:0;border:1px solid #29344a;border-radius:12px;background:#0a0f19;color:#fff;padding:11px;outline:none}.fc-input input:focus{border-color:#5576c9;box-shadow:0 0 0 3px rgba(85,118,201,.12)}.fc-input button{border:0;border-radius:12px;padding:0 14px;background:#5f8cff;color:#fff;cursor:pointer;font-weight:800}.fc-input button:disabled{opacity:.55;cursor:wait}.fc-context{padding:9px 16px 0;color:#617596;font-size:9px}
    @media(max-width:600px){.foresight-chat{right:16px;bottom:82px}.foresight-chat-fab{right:16px;bottom:18px}}
  `;
  document.head.appendChild(style);

  const fab = document.createElement("button");
  fab.className = "foresight-chat-fab";
  fab.innerHTML = "✦ Ask Foresight";
  fab.setAttribute("aria-label", "Open Foresight AI assistant");

  const chat = document.createElement("div");
  chat.className = "foresight-chat";
  chat.setAttribute("role", "dialog");
  chat.setAttribute("aria-label", "Foresight AI supply intelligence assistant");
  chat.innerHTML = `
    <div class="fc-head"><div class="fc-avatar">F</div><div><div class="fc-title">Foresight AI <span class="fc-live">● LIVE</span></div><div class="fc-sub">SUPPLY INTELLIGENCE ASSISTANT</div></div><button class="fc-close" aria-label="Close">×</button></div>
    <div class="fc-context">Answers use the values currently visible on the dashboard.</div>
    <div class="fc-messages" id="fcMessages"><div class="fc-msg fc-ai">Hi! I'm Foresight AI 👋\nI can explain the forecast, inventory risk, ₹ business impact, model performance, and recommended action for the active SKU.</div></div>
    <div class="fc-quick">
      <button data-q="Why is this SKU at risk?">Why at risk?</button>
      <button data-q="Should I reorder?">Should I reorder?</button>
      <button data-q="What is the business impact?">₹ Business impact</button>
      <button data-q="How accurate is the model?">Model accuracy</button>
      <button data-q="What action should I take?">Recommended action</button>
      <button data-q="What is the forecast for the next six weeks?">6-week forecast</button>
    </div>
    <div class="fc-input"><input id="fcInput" placeholder="Ask about inventory..." autocomplete="off"/><button id="fcSend">Send</button></div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(chat);

  const messages = chat.querySelector("#fcMessages");
  const input = chat.querySelector("#fcInput");
  const sendButton = chat.querySelector("#fcSend");

  function value(id, fallback = "—") {
    const el = document.getElementById(id);
    return el ? el.textContent.trim() : fallback;
  }

  function numeric(id) {
    const n = parseFloat(value(id).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function liveData() {
    const forecastRows = [...document.querySelectorAll("#forecastList .forecast-row")].map(row => ({
      week: row.querySelector("span")?.textContent?.trim() || "",
      units: parseFloat(row.querySelector("strong")?.textContent?.replace(/[^0-9.-]/g, ""))
    })).filter(row => Number.isFinite(row.units));

    return {
      sku: value("sku"), stock: numeric("stock"), demand: numeric("demand"),
      reorder: numeric("reorderPoint"), order: numeric("recommendedOrder"),
      safety: numeric("safetyStock"), risk: value("risk"),
      salesRisk: value("salesRisk"), overstock: value("overstockCapital"),
      reorderCost: value("reorderCost"), revenueRisk: value("protectedRevenue"),
      model: value("forecastModel"), forecastRows
    };
  }

  function answer(question) {
    const q = question.toLowerCase();
    const d = liveData();

    if (d.stock === null || d.demand === null || d.reorder === null) {
      return "Generate a forecast first. Once the dashboard has values, I can explain the active SKU using the live dashboard context.";
    }

    if (q.includes("business") || q.includes("money") || q.includes("₹") || q.includes("sales at risk") || q.includes("overstock") || q.includes("revenue")) {
      return `Business impact for ${d.sku}:\n\nSales at Risk: ${d.salesRisk}\nOverstock Capital: ${d.overstock}\nEstimated Reorder Cost: ${d.reorderCost}\nRevenue Exposure: ${d.revenueRisk}\n\nThe goal is to connect the forecast to a financial decision: protect revenue when stock is short and avoid tying up cash in excess inventory.`;
    }

    if (q.includes("accurate") || q.includes("accuracy") || q.includes("model") || q.includes("wape") || q.includes("validation")) {
      return `Model validation:\n\nLightGBM Regressor WAPE: 11.12%\nSeasonal Naive WAPE: 13.68%\nRelative improvement: 18.7%\nBias: +3.17%\nMAPE: 10.48%\nValidation: 4-fold rolling-origin across 195 SKUs.\n\nLower WAPE is better here, and the production model beats the seasonal-naive baseline without random time-series splitting.`;
    }

    if (q.includes("forecast") || q.includes("demand") || q.includes("next six") || q.includes("6-week")) {
      if (d.forecastRows.length) {
        const rows = d.forecastRows.slice(0, 6).map(row => `• ${row.week}: ${row.units} units`).join("\n");
        return `Forecast for ${d.sku}:\n\n${rows}\n\nModel shown on the dashboard: ${d.model}.`;
      }
      return `Current forecast for ${d.sku}: ${d.demand} units in the next forecast period. Open the Demand Forecast section for the full weekly projection.`;
    }

    if (q.includes("risk") || q.includes("why")) {
      return `${d.sku} is currently ${d.risk.toUpperCase()}.\n\nCurrent stock: ${d.stock} units\nForecast demand: ${d.demand} units\nReorder point: ${d.reorder} units\nSafety stock: ${d.safety} units\n\n${d.stock < d.reorder ? "Inventory is below the reorder point, creating stockout risk." : "Inventory is above the reorder point."}`;
    }

    if (q.includes("reorder") || q.includes("buy") || q.includes("order")) {
      if (d.stock < d.reorder) {
        return `REORDER NOW 🔴\n\n${d.sku} is ${Math.round(d.reorder - d.stock)} units below the reorder point.\nRecommended order: ${d.order ?? "—"} units.\nEstimated reorder cost: ${d.reorderCost}.`;
      }
      return `No immediate reorder is indicated.\n\nCurrent stock (${d.stock}) is at or above the reorder point (${d.reorder}). Keep the safety-stock buffer intact and continue monitoring demand.`;
    }

    if (q.includes("stock")) {
      return `Current stock for ${d.sku}: ${d.stock} units.\nReorder point: ${d.reorder} units.\nSafety stock: ${d.safety} units.`;
    }

    if (q.includes("action") || q.includes("should")) {
      if (d.stock < d.reorder) {
        return `Recommended action: REORDER NOW 🔴\n\nReplenish approximately ${d.order ?? "—"} units and monitor supplier lead time.`;
      }
      if (d.stock > d.demand * 1.5) {
        return `Recommended action: MARKDOWN / CLEAR 🟠\n\nStock materially exceeds projected demand. Consider reducing excess inventory rather than ordering more.`;
      }
      return `Recommended action: HEALTHY 🟢\n\nContinue monitoring demand and maintain the safety-stock buffer.`;
    }

    if (q.includes("hello") || q === "hi" || q.includes("hey")) {
      return `Hey 👋 I'm ready. Ask me about ${d.sku}'s forecast, inventory risk, ₹ impact, model accuracy, or reorder recommendation.`;
    }

    return "I can help with:\n\n• Forecast demand\n• Inventory risk\n• Reorder recommendations\n• ₹ sales at risk & overstock\n• Model validation\n• Recommended action\n\nTry: “Should I reorder?”";
  }

  function addMessage(text, user) {
    const el = document.createElement("div");
    el.className = `fc-msg ${user ? "fc-user" : "fc-ai"}`;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "fc-msg fc-ai fc-typing";
    el.setAttribute("aria-label", "Foresight is thinking");
    el.innerHTML = "<i></i><i></i><i></i>";
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function send(text) {
    const q = (text || input.value).trim();
    if (!q || sendButton.disabled) return;
    addMessage(q, true);
    input.value = "";
    sendButton.disabled = true;
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      addMessage(answer(q), false);
      sendButton.disabled = false;
      input.focus();
    }, 220);
  }

  fab.addEventListener("click", () => {
    const open = chat.classList.toggle("open");
    if (open) input.focus();
  });
  chat.querySelector(".fc-close").addEventListener("click", () => chat.classList.remove("open"));
  sendButton.addEventListener("click", () => send());
  input.addEventListener("keydown", e => { if (e.key === "Enter") send(); if (e.key === "Escape") chat.classList.remove("open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && chat.classList.contains("open")) chat.classList.remove("open"); });
  chat.querySelectorAll(".fc-quick button").forEach(btn => btn.addEventListener("click", () => send(btn.dataset.q)));
})();
