/* ======================================================
   FORESIGHT AI — SUPPLY INTELLIGENCE ASSISTANT
   No API key required. Reads live dashboard values.
   ====================================================== */

(function () {
    const style = document.createElement("style");
    style.textContent = `
        .foresight-chat-fab {
            position: fixed; right: 28px; bottom: 28px; z-index: 9999;
            border: 0; border-radius: 999px; padding: 14px 20px;
            background: linear-gradient(90deg,#587cff,#774cff); color:#fff;
            font: 800 13px Inter, sans-serif; cursor:pointer;
            box-shadow:0 14px 38px rgba(91,91,255,.35);
        }
        .foresight-chat-fab:hover { transform:translateY(-2px); }
        .foresight-chat {
            position:fixed; right:28px; bottom:88px; z-index:10000;
            width:min(390px,calc(100vw - 32px)); height:560px;
            display:none; flex-direction:column; overflow:hidden;
            background:#101522; border:1px solid #28344b; border-radius:20px;
            box-shadow:0 24px 80px rgba(0,0,0,.55); color:#f5f7ff;
            font-family:Inter,sans-serif;
        }
        .foresight-chat.open { display:flex; }
        .fc-head { padding:18px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #202a3d; }
        .fc-avatar { width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#627cff,#754cff);font-weight:800; }
        .fc-title { font-weight:800;font-size:14px; }.fc-sub { color:#7186aa;font-size:9px;margin-top:3px; }
        .fc-close { margin-left:auto;background:none;border:0;color:#8190aa;font-size:22px;cursor:pointer; }
        .fc-messages { flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px; }
        .fc-msg { max-width:88%;padding:11px 13px;border-radius:14px;font-size:12px;line-height:1.55;white-space:pre-line; }
        .fc-ai { align-self:flex-start;background:#1a2231;color:#b9c7de; }.fc-user { align-self:flex-end;background:#314b9a;color:#fff; }
        .fc-quick { padding:10px 14px;display:flex;gap:7px;overflow-x:auto;border-top:1px solid #202a3d; }
        .fc-quick button { flex:0 0 auto;border:1px solid #293852;background:#121b2b;color:#9eb2d5;border-radius:999px;padding:7px 10px;font-size:9px;cursor:pointer; }
        .fc-input { padding:12px;display:flex;gap:8px;border-top:1px solid #202a3d; }
        .fc-input input { flex:1;min-width:0;border:1px solid #29344a;border-radius:12px;background:#0a0f19;color:#fff;padding:11px;outline:none; }
        .fc-input button { border:0;border-radius:12px;padding:0 14px;background:#5f8cff;color:#fff;cursor:pointer;font-weight:800; }
        @media(max-width:600px){.foresight-chat{right:16px;bottom:82px}.foresight-chat-fab{right:16px;bottom:18px}}
    `;
    document.head.appendChild(style);

    const fab = document.createElement("button");
    fab.className = "foresight-chat-fab";
    fab.innerHTML = "✦ Ask Foresight";

    const chat = document.createElement("div");
    chat.className = "foresight-chat";
    chat.innerHTML = `
        <div class="fc-head">
            <div class="fc-avatar">F</div>
            <div><div class="fc-title">Foresight AI</div><div class="fc-sub">SUPPLY INTELLIGENCE ASSISTANT</div></div>
            <button class="fc-close" aria-label="Close">×</button>
        </div>
        <div class="fc-messages" id="fcMessages">
            <div class="fc-msg fc-ai">Hi! I'm Foresight AI 👋\nAsk me about forecasts, inventory risk, or recommended actions.</div>
        </div>
        <div class="fc-quick">
            <button data-q="Why is this SKU at risk?">Why at risk?</button>
            <button data-q="Should I reorder?">Should I reorder?</button>
            <button data-q="What is the forecast?">Forecast</button>
            <button data-q="What action should I take?">Recommended action</button>
        </div>
        <div class="fc-input">
            <input id="fcInput" placeholder="Ask about inventory..." />
            <button id="fcSend">Send</button>
        </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(chat);

    const messages = chat.querySelector("#fcMessages");
    const input = chat.querySelector("#fcInput");

    function value(id, fallback = "—") {
        const el = document.getElementById(id);
        return el ? el.textContent.trim() : fallback;
    }

    function numeric(id) {
        const n = parseFloat(value(id).replace(/[^0-9.-]/g, ""));
        return Number.isFinite(n) ? n : null;
    }

    function liveData() {
        const stock = numeric("stock");
        const demand = numeric("demand");
        const reorder = numeric("reorderPoint");
        const order = numeric("recommendedOrder");
        const safety = numeric("safetyStock");
        return {
            sku: value("sku"), stock, demand, reorder, order, safety,
            risk: value("risk"), riskDescription: value("riskDescription")
        };
    }

    function answer(question) {
        const q = question.toLowerCase();
        const d = liveData();

        if (q.includes("risk") || q.includes("why")) {
            if (d.stock !== null && d.demand !== null && d.reorder !== null) {
                return `${d.sku} is currently ${d.risk.toUpperCase()}.\n\nCurrent stock: ${d.stock} units\nForecast demand: ${d.demand} units\nReorder point: ${d.reorder} units\n\n${d.stock < d.reorder ? "Inventory is below the reorder point, creating stockout risk." : "Inventory is above the reorder point."}`;
            }
            return "Generate a forecast first so I can analyze the current SKU risk.";
        }

        if (q.includes("reorder") || q.includes("buy") || q.includes("order")) {
            if (d.stock !== null && d.reorder !== null && d.stock < d.reorder) {
                return `REORDER NOW 🔴\n\n${d.sku} is below the reorder point.\nRecommended order: ${d.order ?? "—"} units.`;
            }
            return "No immediate reorder is indicated from the current dashboard values.";
        }

        if (q.includes("forecast") || q.includes("demand")) {
            return `Current forecast for ${d.sku}: ${d.demand ?? "—"} units.\n\nThe Forecasts section contains the full upcoming weekly demand projection.`;
        }

        if (q.includes("stock")) {
            return `Current stock for ${d.sku}: ${d.stock ?? "—"} units.\nReorder point: ${d.reorder ?? "—"} units.\nSafety stock: ${d.safety ?? "—"} units.`;
        }

        if (q.includes("action") || q.includes("should")) {
            if (d.stock !== null && d.reorder !== null && d.stock < d.reorder) {
                return `Recommended action: REORDER NOW 🔴\n\nReplenish approximately ${d.order ?? "—"} units.`;
            }
            return `Recommended action: HEALTHY 🟢\n\nContinue monitoring demand and maintain the safety-stock buffer.`;
        }

        if (q.includes("hello") || q === "hi" || q.includes("hey")) {
            return `Hey 👋 I'm ready. Ask me about ${d.sku}'s forecast, inventory risk, or reorder recommendation.`;
        }

        return "I can help with:\n\n• Forecast demand\n• Inventory risk\n• Reorder recommendations\n• Current stock\n• Recommended action\n\nTry: “Should I reorder?”";
    }

    function addMessage(text, user) {
        const el = document.createElement("div");
        el.className = `fc-msg ${user ? "fc-user" : "fc-ai"}`;
        el.textContent = text;
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
    }

    function send(text) {
        const q = (text || input.value).trim();
        if (!q) return;
        addMessage(q, true);
        input.value = "";
        setTimeout(() => addMessage(answer(q), false), 180);
    }

    fab.addEventListener("click", () => chat.classList.toggle("open"));
    chat.querySelector(".fc-close").addEventListener("click", () => chat.classList.remove("open"));
    chat.querySelector("#fcSend").addEventListener("click", () => send());
    input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });
    chat.querySelectorAll(".fc-quick button").forEach(btn => btn.addEventListener("click", () => send(btn.dataset.q)));
})();
