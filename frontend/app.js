// ======================================================
// FORESIGHT AI - FRONTEND ENGINE
// ======================================================

// IMPORTANT:
// Your Render backend URL
const API_BASE_URL = "https://foresight-ai-6mlt.onrender.com";

let forecastChart = null;


// ======================================================
// DEMO HISTORICAL DATA
// ======================================================

const demandData = [

    { date: "2026-08-03", sku_id: "SKU001", units_sold: 3 },
    { date: "2026-08-04", sku_id: "SKU001", units_sold: 4 },
    { date: "2026-08-05", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-06", sku_id: "SKU001", units_sold: 3 },
    { date: "2026-08-07", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-08", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-09", sku_id: "SKU001", units_sold: 4 },

    { date: "2026-08-10", sku_id: "SKU001", units_sold: 4 },
    { date: "2026-08-11", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-12", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-13", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-14", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-15", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-16", sku_id: "SKU001", units_sold: 5 },

    { date: "2026-08-17", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-18", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-19", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-20", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-21", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-22", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-23", sku_id: "SKU001", units_sold: 6 },

    { date: "2026-08-24", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-25", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-26", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-27", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-28", sku_id: "SKU001", units_sold: 9 },
    { date: "2026-08-29", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-30", sku_id: "SKU001", units_sold: 7 }

];


// ======================================================
// API REQUEST HELPER
// ======================================================

async function apiRequest(endpoint, options = {}) {

    const url = `${API_BASE_URL}${endpoint}`;

    console.log("API REQUEST:", url);

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {

        let message = `API Error ${response.status}`;

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                message += `: ${errorData.detail}`;
            }

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


// ======================================================
// FORECAST API
// ======================================================

async function getForecast() {

    return apiRequest("/forecast/predict", {

        method: "POST",

        body: JSON.stringify({
            horizon_weeks: 6,
            data: demandData
        })

    });

}


// ======================================================
// INVENTORY API
// ======================================================

async function getInventory(
    skuId,
    currentStock,
    predictedDemand,
    leadTimeDays,
    safetyStock
) {

    return apiRequest("/inventory/analyze", {

        method: "POST",

        body: JSON.stringify({

            sku_id: skuId,

            current_stock: currentStock,

            predicted_demand: Math.round(predictedDemand),

            lead_time_days: leadTimeDays,

            safety_stock: safetyStock

        })

    });

}


// ======================================================
// AI INSIGHTS API
// ======================================================

async function getInsights(inventory) {

    return apiRequest("/insights/generate", {

        method: "POST",

        body: JSON.stringify({

            sku_id: inventory.sku_id,

            current_stock: inventory.current_stock,

            predicted_demand: inventory.predicted_demand,

            safety_stock: inventory.safety_stock

        })

    });

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard(
    forecastData,
    inventoryData,
    insightData
) {

    // SKU
    document.getElementById("sku").textContent =
        inventoryData.sku_id || "SKU001";


    // STOCK
    document.getElementById("stock").textContent =
        inventoryData.current_stock ?? "--";


    // DEMAND
    document.getElementById("demand").textContent =
        inventoryData.predicted_demand ?? "--";


    // RISK
    const riskElement = document.getElementById("risk");

    const risk =
        String(inventoryData.risk || "unknown").toLowerCase();

    riskElement.textContent =
        risk.toUpperCase();

    riskElement.classList.remove(
        "risk-healthy",
        "risk-warning",
        "risk-critical"
    );

    if (risk === "healthy") {

        riskElement.classList.add("risk-healthy");

        document.getElementById("riskDescription").textContent =
            "Inventory level is healthy";

    }

    else if (risk === "warning") {

        riskElement.classList.add("risk-warning");

        document.getElementById("riskDescription").textContent =
            "Replenishment may be required";

    }

    else if (risk === "critical") {

        riskElement.classList.add("risk-critical");

        document.getElementById("riskDescription").textContent =
            "Immediate replenishment recommended";

    }

    else {

        document.getElementById("riskDescription").textContent =
            "Risk assessment unavailable";

    }


    // INVENTORY METRICS
    document.getElementById("reorderPoint").textContent =
        inventoryData.reorder_point ?? "--";

    document.getElementById("recommendedOrder").textContent =
        inventoryData.recommended_order ?? "--";

    document.getElementById("safetyStock").textContent =
        inventoryData.safety_stock ?? "--";


    // AI INSIGHT
    document.getElementById("insight").textContent =
        insightData.insight ||
        "AI analysis completed successfully.";


    // RECOMMENDATION
    document.getElementById("recommendation").textContent =
        insightData.recommended_action ||
        "Review the forecast and inventory position.";


    // MODEL
    const model =
        forecastData.forecast?.[0]?.model ||
        "Seasonal Naive";

    document.getElementById("forecastModel").textContent =
        `MODEL: ${model}`;


    // FORECAST LIST
    const forecastList =
        document.getElementById("forecastList");

    forecastList.innerHTML = "";

    if (
        forecastData.forecast &&
        forecastData.forecast.length
    ) {

        forecastData.forecast.forEach(item => {

            const row =
                document.createElement("div");

            row.className = "forecast-row";

            row.innerHTML = `
                <span>${item.forecast_week}</span>
                <strong>${item.predicted_demand} units</strong>
            `;

            forecastList.appendChild(row);

        });

    }

}


// ======================================================
// CHART
// ======================================================

function renderForecastChart(forecastData) {

    const canvas =
        document.getElementById("forecastChart");

    if (!canvas) return;


    if (forecastChart) {

        forecastChart.destroy();

    }


    // ------------------------------
    // HISTORICAL WEEKLY DATA
    // ------------------------------

    const weeklyMap = {};

    demandData.forEach(item => {

        const date = new Date(item.date);

        const day = date.getDay();

        const diff =
            day === 0 ? 0 : 7 - day;

        const weekEnd =
            new Date(date);

        weekEnd.setDate(
            date.getDate() + diff
        );

        const label =
            weekEnd.toISOString().split("T")[0];

        if (!weeklyMap[label]) {
            weeklyMap[label] = 0;
        }

        weeklyMap[label] +=
            Number(item.units_sold);

    });


    const historicalLabels =
        Object.keys(weeklyMap);

    const historicalValues =
        Object.values(weeklyMap);


    // ------------------------------
    // FORECAST
    // ------------------------------

    const forecast =
        forecastData.forecast || [];

    const forecastLabels =
        forecast.map(
            item => item.forecast_week
        );

    const forecastValues =
        forecast.map(
            item => Number(item.predicted_demand)
        );


    const labels = [
        ...historicalLabels,
        ...forecastLabels
    ];


    const historicalDataset = [

        ...historicalValues,

        ...Array(
            forecastValues.length
        ).fill(null)

    ];


    const forecastDataset = [

        ...Array(
            historicalValues.length
        ).fill(null),

        ...forecastValues

    ];


    // ------------------------------
    // CREATE CHART
    // ------------------------------

    forecastChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [

                    {
                        label: "Historical Demand",

                        data: historicalDataset,

                        borderColor: "#647cff",

                        backgroundColor:
                            "rgba(100,124,255,.08)",

                        borderWidth: 3,

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        tension: .35,

                        fill: true
                    },


                    {
                        label: "AI Forecast",

                        data: forecastDataset,

                        borderColor: "#45d7ff",

                        backgroundColor:
                            "rgba(69,215,255,.05)",

                        borderWidth: 3,

                        borderDash: [7, 6],

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        tension: .35,

                        fill: false
                    }

                ]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                plugins: {

                    legend: {

                        labels: {

                            color: "#8994ab",

                            font: {
                                size: 10
                            },

                            usePointStyle: true

                        }

                    }

                },


                scales: {

                    x: {

                        grid: {
                            color: "rgba(255,255,255,.04)"
                        },

                        ticks: {
                            color: "#68738a",
                            font: {
                                size: 9
                            }
                        }

                    },

                    y: {

                        beginAtZero: true,

                        grid: {
                            color: "rgba(255,255,255,.05)"
                        },

                        ticks: {
                            color: "#68738a",
                            font: {
                                size: 9
                            }
                        },

                        title: {

                            display: true,

                            text: "UNITS / WEEK",

                            color: "#68738a",

                            font: {
                                size: 9,
                                weight: "700"
                            }

                        }

                    }

                }

            }

        });

}


// ======================================================
// MAIN GENERATION FUNCTION
// ======================================================

async function initializeDashboard() {

    const button =
        document.getElementById("generateBtn");

    const originalText =
        button.innerHTML;


    button.disabled = true;

    button.innerHTML =
        "⟳  Analyzing demand...";


    try {

        const skuId =
            document.getElementById("skuInput")
                .value
                .trim();

        const currentStock =
            Number(
                document.getElementById("stockInput")
                    .value
            );

        const leadTimeDays =
            Number(
                document.getElementById("leadTimeInput")
                    .value
            );

        const safetyStock =
            Number(
                document.getElementById("safetyStockInput")
                    .value
            );


        // ------------------------------
        // VALIDATION
        // ------------------------------

        if (!skuId) {
            throw new Error("Please enter a SKU ID.");
        }

        if (
            currentStock < 0 ||
            leadTimeDays < 0 ||
            safetyStock < 0
        ) {

            throw new Error(
                "Inventory values cannot be negative."
            );

        }


        // ------------------------------
        // FORECAST
        // ------------------------------

        const forecastData =
            await getForecast();


        if (
            !forecastData.forecast ||
            !forecastData.forecast.length
        ) {

            throw new Error(
                "Forecast engine returned no predictions."
            );

        }


        const predictedDemand =
            Number(
                forecastData
                    .forecast[0]
                    .predicted_demand
            );


        // ------------------------------
        // INVENTORY
        // ------------------------------

        const inventoryData =
            await getInventory(

                skuId,

                currentStock,

                predictedDemand,

                leadTimeDays,

                safetyStock

            );


        // ------------------------------
        // AI INSIGHTS
        // ------------------------------

        const insightData =
            await getInsights(
                inventoryData
            );


        // ------------------------------
        // UI
        // ------------------------------

        updateDashboard(
            forecastData,
            inventoryData,
            insightData
        );


        renderForecastChart(
            forecastData
        );


        console.log(
            "FORESIGHT AI SUCCESS",
            {
                forecastData,
                inventoryData,
                insightData
            }
        );


    }

    catch (error) {

        console.error(
            "FORESIGHT AI ERROR:",
            error
        );


        document.getElementById("insight").textContent =
            `Unable to complete analysis: ${error.message}`;


        document.getElementById("recommendation").textContent =
            "Check that the Render API is running and that CORS is enabled on the FastAPI backend.";

    }


    finally {

        button.disabled = false;

        button.innerHTML =
            originalText;

    }

}


// ======================================================
// EVENTS
// ======================================================

document
    .getElementById("generateBtn")
    .addEventListener(
        "click",
        initializeDashboard
    );


document
    .querySelectorAll("input")
    .forEach(input => {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    initializeDashboard();

                }

            }
        );

    });


// ======================================================
// INITIAL STATE
// ======================================================

// Don't automatically spam the backend on page load.
// User clicks Generate Forecast.

console.log(
    "Foresight AI frontend loaded."
);

console.log(
    "Backend:",
    API_BASE_URL
);
