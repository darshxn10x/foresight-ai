// ======================================================
// FORESIGHT AI - FRONTEND ENGINE
// ======================================================

// Production dashboard and FastAPI service share the same origin.
// Keeping API traffic same-origin avoids stale Render host dependencies.
const PRODUCTION_ORIGIN = "https://foresight.priyadarshan.tech";
const API_TIMEOUT_MS = 60000;
const API_RETRIES = 2;
let forecastChart = null;

function getApiCandidates() {
    const candidates = [];
    const sameOrigin = window.location.origin;
    if (sameOrigin && sameOrigin !== "null") candidates.push(sameOrigin);
    candidates.push(PRODUCTION_ORIGIN);
    return [...new Set(candidates.filter(Boolean).map(url => url.replace(/\/$/, "")))];
}

// Project sales history used as input to the forecasting service.
const salesHistory = [
    { date: "2026-08-03", sku_id: "SKU001", units_sold: 3 }, { date: "2026-08-04", sku_id: "SKU001", units_sold: 4 },
    { date: "2026-08-05", sku_id: "SKU001", units_sold: 5 }, { date: "2026-08-06", sku_id: "SKU001", units_sold: 3 },
    { date: "2026-08-07", sku_id: "SKU001", units_sold: 6 }, { date: "2026-08-08", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-09", sku_id: "SKU001", units_sold: 4 }, { date: "2026-08-10", sku_id: "SKU001", units_sold: 4 },
    { date: "2026-08-11", sku_id: "SKU001", units_sold: 5 }, { date: "2026-08-12", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-13", sku_id: "SKU001", units_sold: 5 }, { date: "2026-08-14", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-15", sku_id: "SKU001", units_sold: 6 }, { date: "2026-08-16", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-17", sku_id: "SKU001", units_sold: 5 }, { date: "2026-08-18", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-19", sku_id: "SKU001", units_sold: 7 }, { date: "2026-08-20", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-21", sku_id: "SKU001", units_sold: 8 }, { date: "2026-08-22", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-23", sku_id: "SKU001", units_sold: 6 }, { date: "2026-08-24", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-25", sku_id: "SKU001", units_sold: 7 }, { date: "2026-08-26", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-27", sku_id: "SKU001", units_sold: 7 }, { date: "2026-08-28", sku_id: "SKU001", units_sold: 9 },
    { date: "2026-08-29", sku_id: "SKU001", units_sold: 8 }, { date: "2026-08-30", sku_id: "SKU001", units_sold: 7 }
];

async function apiRequest(endpoint, options = {}) {
    const candidates = getApiCandidates();
    let lastError = new Error("Unable to reach the forecast service.");

    for (const baseUrl of candidates) {
        for (let attempt = 0; attempt < API_RETRIES; attempt += 1) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    ...options,
                    signal: controller.signal,
                    cache: "no-store"
                });
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                return await response.json();
            } catch (error) {
                lastError = error;
                console.warn(`API request failed (${baseUrl}, attempt ${attempt + 1}):`, error);
            } finally {
                clearTimeout(timeout);
            }
        }
    }
    throw lastError;
}

async function getForecast() {
    return apiRequest("/forecast/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horizon_weeks: 6, data: salesHistory })
    });
}

async function getInventory(skuId, currentStock, predictedDemand, leadTimeDays, safetyStock) {
    return apiRequest("/inventory/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_id: skuId, current_stock: currentStock, predicted_demand: Math.round(predictedDemand), lead_time_days: leadTimeDays, safety_stock: safetyStock })
    });
}

async function getInsights(inventory) {
    return apiRequest("/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku_id: inventory.sku_id, current_stock: inventory.current_stock, predicted_demand: inventory.predicted_demand, safety_stock: inventory.safety_stock })
    });
}

function setApiStatus(state) {
    const status = document.getElementById("apiStatus");
    const systemLabel = document.getElementById("systemStatusLabel");
    const systemDetail = document.getElementById("systemStatusDetail");
    if (state === "connected") {
        if (status) status.textContent = "API CONNECTED";
        if (systemLabel) systemLabel.textContent = "System Online";
        if (systemDetail) systemDetail.textContent = "Forecast engine connected";
    } else if (state === "unavailable") {
        if (status) status.textContent = "API UNAVAILABLE";
        if (systemLabel) systemLabel.textContent = "Service Unavailable";
        if (systemDetail) systemDetail.textContent = "Unable to reach forecast engine";
    } else {
        if (status) status.textContent = "CHECKING API";
        if (systemLabel) systemLabel.textContent = "Checking system…";
        if (systemDetail) systemDetail.textContent = "Connecting to forecast engine";
    }
}

function updateDashboard(forecastData, inventoryData, insightData) {
    document.getElementById("sku").textContent = inventoryData.sku_id;
    document.getElementById("stock").textContent = `${inventoryData.current_stock} units`;
    document.getElementById("demand").textContent = `${inventoryData.predicted_demand} units`;
    const riskElement = document.getElementById("risk");
    const risk = String(inventoryData.risk || "healthy").toLowerCase();
    riskElement.textContent = risk.toUpperCase();
    riskElement.classList.remove("risk-healthy", "risk-warning", "risk-critical");
    if (risk.includes("critical")) {
        riskElement.classList.add("risk-critical");
        document.getElementById("riskDescription").textContent = "Immediate replenishment required";
    } else if (risk.includes("warning")) {
        riskElement.classList.add("risk-warning");
        document.getElementById("riskDescription").textContent = "Monitor inventory closely";
    } else {
        riskElement.classList.add("risk-healthy");
        document.getElementById("riskDescription").textContent = "Inventory level is healthy";
    }
    document.getElementById("reorderPoint").textContent = `${inventoryData.reorder_point} units`;
    document.getElementById("recommendedOrder").textContent = `${inventoryData.recommended_order} units`;
    document.getElementById("safetyStock").textContent = `${inventoryData.safety_stock} units`;
    document.getElementById("insight").textContent = insightData.insight;
    document.getElementById("recommendation").textContent = insightData.recommended_action;
    const decision = document.getElementById("inventoryDecision");
    const decisionReason = document.getElementById("decisionReason");
    if (decision) decision.textContent = String(inventoryData.decision || risk).toUpperCase();
    if (decisionReason) decisionReason.textContent = inventoryData.recommendation || "Analysis completed.";
    const model = forecastData.forecast?.[0]?.model || "—";
    document.getElementById("forecastModel").textContent = `MODEL: ${model.toUpperCase()}`;
    const evaluation = forecastData.evaluation?.[0];
    const modelPerformance = document.getElementById("modelPerformance");
    if (modelPerformance && evaluation?.available) modelPerformance.textContent = `${evaluation.model} · MAE ${evaluation.mae} · RMSE ${evaluation.rmse} · MAPE ${evaluation.mape ?? "—"}%`;
    const salesRisk = document.getElementById("salesRisk");
    const overstockCapital = document.getElementById("overstockCapital");
    if (salesRisk) salesRisk.textContent = inventoryData.shortage_units ?? 0;
    if (overstockCapital) overstockCapital.textContent = inventoryData.excess_units ?? 0;
    renderForecastList(forecastData);
}

function renderForecastList(forecastData) {
    const list = document.getElementById("forecastList");
    list.innerHTML = "";
    forecastData.forecast.forEach(item => {
        const row = document.createElement("div");
        row.className = "forecast-row";
        row.innerHTML = `<span>${item.forecast_week}</span><strong>${item.predicted_demand} units</strong>`;
        list.appendChild(row);
    });
}

function renderForecastChart(forecastData) {
    const canvas = document.getElementById("forecastChart");
    if (!canvas || typeof Chart === "undefined") return;
    if (forecastChart) forecastChart.destroy();
    const historicalMap = {};
    salesHistory.forEach(item => {
        const date = new Date(item.date);
        const day = date.getDay();
        const diff = day === 0 ? 0 : 7 - day;
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + diff);
        const label = weekEnd.toISOString().split("T")[0];
        historicalMap[label] = (historicalMap[label] || 0) + Number(item.units_sold);
    });
    const historicalValues = Object.values(historicalMap);
    const historicalLabels = Object.keys(historicalMap);
    const forecastLabels = forecastData.forecast.map(item => item.forecast_week);
    const forecastValues = forecastData.forecast.map(item => Number(item.predicted_demand));
    forecastChart = new Chart(canvas, {
        type: "line",
        data: { labels: [...historicalLabels, ...forecastLabels], datasets: [
            { label: "Historical Demand", data: [...historicalValues, ...Array(forecastValues.length).fill(null)], borderColor: "#6e88bb", backgroundColor: "rgba(110,136,187,.08)", borderWidth: 2, pointRadius: 3, tension: .35, fill: true },
            { label: "Predicted Demand", data: [...Array(historicalValues.length).fill(null), ...forecastValues], borderColor: "#6e8cff", backgroundColor: "rgba(110,140,255,.08)", borderWidth: 3, borderDash: [7, 6], pointRadius: 4, tension: .35, fill: true }
        ]},
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { labels: { color: "#899bb9", font: { size: 11 }, usePointStyle: true } } }, scales: { x: { grid: { color: "rgba(120,140,180,.07)" }, ticks: { color: "#627493" } }, y: { beginAtZero: true, grid: { color: "rgba(120,140,180,.07)" }, ticks: { color: "#627493" }, title: { display: true, text: "Units per Week", color: "#7184a4" } } } }
    });
}

async function initializeDashboard() {
    const button = document.getElementById("generateBtn");
    button.disabled = true;
    button.innerHTML = "⟳ Connecting to Forecast Engine...";
    setApiStatus("checking");
    try {
        const skuId = document.getElementById("skuInput").value.trim();
        const currentStock = Number(document.getElementById("stockInput").value);
        const leadTimeDays = Number(document.getElementById("leadTimeInput").value);
        const safetyStock = Number(document.getElementById("safetyStockInput").value);
        if (!skuId) throw new Error("SKU ID is required.");
        if ([currentStock, leadTimeDays, safetyStock].some(value => value < 0)) throw new Error("Inventory values cannot be negative.");
        const forecastData = await getForecast();
        if (!forecastData.forecast?.length) throw new Error("The forecast service returned no forecast data.");
        const predictedDemand = forecastData.forecast[0].predicted_demand;
        const inventoryData = await getInventory(skuId, currentStock, predictedDemand, leadTimeDays, safetyStock);
        const insightData = await getInsights(inventoryData);
        setApiStatus("connected");
        updateDashboard(forecastData, inventoryData, insightData);
        renderForecastChart(forecastData);
    } catch (error) {
        console.error(error);
        setApiStatus("unavailable");
        document.getElementById("insight").textContent = error.name === "AbortError" ? "The forecast service is waking up or taking longer than expected. Please try again." : error.message || "Unable to complete the analysis.";
        document.getElementById("recommendation").textContent = "The dashboard will retry the service connection automatically when you generate again.";
    } finally {
        button.disabled = false;
        button.innerHTML = `✦ Generate AI Forecast <span>→</span>`;
    }
}

document.getElementById("generateBtn").addEventListener("click", initializeDashboard);
document.addEventListener("keydown", event => { if (event.key === "Enter" && !event.target.matches("input")) initializeDashboard(); });
window.addEventListener("DOMContentLoaded", () => { setApiStatus("checking"); setTimeout(initializeDashboard, 500); });
