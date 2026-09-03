// ======================================================
// FORESIGHT AI - FRONTEND ENGINE
// ======================================================

// IMPORTANT:
// Do NOT use markdown here.
// Do NOT write [https://...](https://...)

// Your FastAPI backend
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
// DEMO FORECAST
// ======================================================

function getDemoForecast() {

    return {
        forecast: [
            {
                forecast_week: "2026-W36",
                predicted_demand: 52,
                model: "Seasonal Naive"
            },
            {
                forecast_week: "2026-W37",
                predicted_demand: 55,
                model: "Seasonal Naive"
            },
            {
                forecast_week: "2026-W38",
                predicted_demand: 58,
                model: "Seasonal Naive"
            },
            {
                forecast_week: "2026-W39",
                predicted_demand: 61,
                model: "Seasonal Naive"
            },
            {
                forecast_week: "2026-W40",
                predicted_demand: 63,
                model: "Seasonal Naive"
            },
            {
                forecast_week: "2026-W41",
                predicted_demand: 66,
                model: "Seasonal Naive"
            }
        ]
    };

}


// ======================================================
// API HELPER
// ======================================================

async function apiRequest(endpoint, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 15000);

    try {

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                signal: controller.signal
            }
        );

        if (!response.ok) {
            throw new Error(
                `API error: ${response.status}`
            );
        }

        return await response.json();

    } finally {

        clearTimeout(timeout);

    }

}


// ======================================================
// FORECAST API
// ======================================================

async function getForecast() {

    return await apiRequest(
        "/forecast/predict",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                horizon_weeks: 6,
                data: demandData
            })
        }
    );

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

    return await apiRequest(
        "/inventory/analyze",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({

                sku_id: skuId,

                current_stock: currentStock,

                predicted_demand:
                    Math.round(predictedDemand),

                lead_time_days: leadTimeDays,

                safety_stock: safetyStock

            })
        }
    );

}


// ======================================================
// AI INSIGHTS API
// ======================================================

async function getInsights(inventory) {

    return await apiRequest(
        "/insights/generate",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({

                sku_id: inventory.sku_id,

                current_stock:
                    inventory.current_stock,

                predicted_demand:
                    inventory.predicted_demand,

                safety_stock:
                    inventory.safety_stock

            })
        }
    );

}


// ======================================================
// DEMO INVENTORY FALLBACK
// ======================================================

function getDemoInventory(
    skuId,
    currentStock,
    predictedDemand,
    leadTimeDays,
    safetyStock
) {

    const dailyDemand =
        predictedDemand / 7;

    const reorderPoint =
        Math.ceil(
            dailyDemand * leadTimeDays +
            safetyStock
        );

    const recommendedOrder =
        Math.max(
            0,
            Math.ceil(
                predictedDemand +
                safetyStock -
                currentStock
            )
        );

    let risk = "Healthy";

    if (currentStock < safetyStock) {

        risk = "Critical";

    } else if (currentStock < reorderPoint) {

        risk = "Warning";

    }

    return {

        sku_id: skuId,

        current_stock: currentStock,

        predicted_demand:
            Math.round(predictedDemand),

        reorder_point: reorderPoint,

        recommended_order:
            recommendedOrder,

        safety_stock: safetyStock,

        risk: risk

    };

}


// ======================================================
// DEMO INSIGHT
// ======================================================

function getDemoInsight(inventory) {

    let insight;
    let action;

    const stock =
        Number(inventory.current_stock);

    const demand =
        Number(inventory.predicted_demand);

    const reorder =
        Number(inventory.reorder_point);

    if (stock < reorder) {

        insight =
            `Inventory is below the recommended reorder point. ` +
            `Projected demand is ${demand} units while available ` +
            `stock is only ${stock} units.`;

        action =
            `Replenish approximately ${inventory.recommended_order} units ` +
            `to maintain the required inventory buffer.`;

    } else {

        insight =
            `Current inventory is sufficient for the upcoming forecast period. ` +
            `Demand is projected at ${demand} units.`;

        action =
            "Continue monitoring demand and maintain the current safety-stock buffer.";

    }

    return {

        insight: insight,

        recommended_action: action

    };

}


// ======================================================
// UPDATE API STATUS
// ======================================================

function setApiStatus(connected) {

    const status =
        document.getElementById("apiStatus");

    if (!status) return;

    status.textContent =
        connected
            ? "API CONNECTED"
            : "DEMO MODE";

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard(
    forecastData,
    inventoryData,
    insightData
) {

    document.getElementById("sku").textContent =
        inventoryData.sku_id;

    document.getElementById("stock").textContent =
        `${inventoryData.current_stock} units`;

    document.getElementById("demand").textContent =
        `${inventoryData.predicted_demand} units`;


    const riskElement =
        document.getElementById("risk");

    const risk =
        String(inventoryData.risk || "healthy")
            .toLowerCase();


    riskElement.textContent =
        risk.toUpperCase();


    riskElement.classList.remove(
        "risk-healthy",
        "risk-warning",
        "risk-critical"
    );


    if (risk.includes("critical")) {

        riskElement.classList.add(
            "risk-critical"
        );

        document.getElementById(
            "riskDescription"
        ).textContent =
            "Immediate replenishment required";

    } else if (risk.includes("warning")) {

        riskElement.classList.add(
            "risk-warning"
        );

        document.getElementById(
            "riskDescription"
        ).textContent =
            "Monitor inventory closely";

    } else {

        riskElement.classList.add(
            "risk-healthy"
        );

        document.getElementById(
            "riskDescription"
        ).textContent =
            "Inventory level is healthy";

    }


    document.getElementById(
        "reorderPoint"
    ).textContent =
        `${inventoryData.reorder_point} units`;


    document.getElementById(
        "recommendedOrder"
    ).textContent =
        `${inventoryData.recommended_order} units`;


    document.getElementById(
        "safetyStock"
    ).textContent =
        `${inventoryData.safety_stock} units`;


    document.getElementById(
        "insight"
    ).textContent =
        insightData.insight;


    document.getElementById(
        "recommendation"
    ).textContent =
        insightData.recommended_action;


    const model =
        forecastData.forecast?.[0]?.model ||
        "Seasonal Naive";


    document.getElementById(
        "forecastModel"
    ).textContent =
        `MODEL: ${model.toUpperCase()}`;


    renderForecastList(
        forecastData
    );

}


// ======================================================
// FORECAST LIST
// ======================================================

function renderForecastList(forecastData) {

    const list =
        document.getElementById(
            "forecastList"
        );

    list.innerHTML = "";


    forecastData.forecast.forEach(
        item => {

            const row =
                document.createElement("div");

            row.className =
                "forecast-row";


            row.innerHTML = `
                <span>${item.forecast_week}</span>
                <strong>${item.predicted_demand} units</strong>
            `;


            list.appendChild(row);

        }
    );

}


// ======================================================
// CHART
// ======================================================

function renderForecastChart(
    forecastData
) {

    const canvas =
        document.getElementById(
            "forecastChart"
        );

    if (!canvas) return;


    if (forecastChart) {

        forecastChart.destroy();

    }


    const historicalMap = {};


    demandData.forEach(item => {

        const date =
            new Date(item.date);

        const day =
            date.getDay();

        const diff =
            day === 0
                ? 0
                : 7 - day;

        const weekEnd =
            new Date(date);

        weekEnd.setDate(
            date.getDate() + diff
        );


        const label =
            weekEnd
                .toISOString()
                .split("T")[0];


        historicalMap[label] =
            (historicalMap[label] || 0) +
            Number(item.units_sold);

    });


    const historicalLabels =
        Object.keys(historicalMap);

    const historicalValues =
        Object.values(historicalMap);


    const forecastLabels =
        forecastData.forecast.map(
            item => item.forecast_week
        );


    const forecastValues =
        forecastData.forecast.map(
            item =>
                Number(item.predicted_demand)
        );


    const labels = [
        ...historicalLabels,
        ...forecastLabels
    ];


    const historicalPoints = [
        ...historicalValues,
        ...Array(
            forecastValues.length
        ).fill(null)
    ];


    const forecastPoints = [
        ...Array(
            historicalValues.length
        ).fill(null),
        ...forecastValues
    ];


    forecastChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label:
                                "Historical Demand",

                            data:
                                historicalPoints,

                            borderColor:
                                "#6e88bb",

                            backgroundColor:
                                "rgba(110,136,187,.08)",

                            borderWidth: 2,

                            pointRadius: 3,

                            tension: .35,

                            fill: true
                        },


                        {
                            label:
                                "AI Predicted Demand",

                            data:
                                forecastPoints,

                            borderColor:
                                "#6e8cff",

                            backgroundColor:
                                "rgba(110,140,255,.08)",

                            borderWidth: 3,

                            borderDash:
                                [7, 6],

                            pointRadius: 4,

                            tension: .35,

                            fill: true
                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },


                    plugins: {

                        legend: {

                            labels: {

                                color: "#899bb9",

                                font: {
                                    size: 11
                                },

                                usePointStyle: true

                            }

                        }

                    },


                    scales: {

                        x: {

                            grid: {
                                color:
                                    "rgba(120,140,180,.07)"
                            },

                            ticks: {
                                color: "#627493"
                            }

                        },


                        y: {

                            beginAtZero: true,

                            grid: {
                                color:
                                    "rgba(120,140,180,.07)"
                            },

                            ticks: {
                                color: "#627493"
                            },

                            title: {

                                display: true,

                                text:
                                    "Units per Week",

                                color: "#7184a4"

                            }

                        }

                    }

                }

            }
        );

}


// ======================================================
// MAIN GENERATE FUNCTION
// ======================================================

async function initializeDashboard() {

    const button =
        document.getElementById(
            "generateBtn"
        );


    button.disabled = true;

    button.innerHTML =
        "⟳ Generating AI Forecast...";


    try {

        const skuId =
            document
                .getElementById("skuInput")
                .value
                .trim();


        const currentStock =
            Number(
                document
                    .getElementById(
                        "stockInput"
                    )
                    .value
            );


        const leadTimeDays =
            Number(
                document
                    .getElementById(
                        "leadTimeInput"
                    )
                    .value
            );


        const safetyStock =
            Number(
                document
                    .getElementById(
                        "safetyStockInput"
                    )
                    .value
            );


        if (!skuId) {

            throw new Error(
                "SKU ID is required."
            );

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


        // ------------------------------------------------
        // TRY REAL FORECAST API
        // ------------------------------------------------

        let forecastData;
        let inventoryData;
        let insightData;

        let realApi = true;


        try {

            forecastData =
                await getForecast();


            if (
                !forecastData.forecast ||
                !forecastData.forecast.length
            ) {

                throw new Error(
                    "Empty forecast response"
                );

            }


            const predictedDemand =
                forecastData
                    .forecast[0]
                    .predicted_demand;


            inventoryData =
                await getInventory(
                    skuId,
                    currentStock,
                    predictedDemand,
                    leadTimeDays,
                    safetyStock
                );


            insightData =
                await getInsights(
                    inventoryData
                );


        } catch (apiError) {

            console.warn(
                "Backend unavailable. Using demo mode.",
                apiError
            );


            realApi = false;


            // --------------------------------------------
            // FALLBACK DEMO DATA
            // --------------------------------------------

            forecastData =
                getDemoForecast();


            const predictedDemand =
                forecastData
                    .forecast[0]
                    .predicted_demand;


            inventoryData =
                getDemoInventory(
                    skuId,
                    currentStock,
                    predictedDemand,
                    leadTimeDays,
                    safetyStock
                );


            insightData =
                getDemoInsight(
                    inventoryData
                );

        }


        setApiStatus(realApi);


        updateDashboard(
            forecastData,
            inventoryData,
            insightData
        );


        renderForecastChart(
            forecastData
        );


    } catch (error) {

        console.error(error);


        document.getElementById(
            "insight"
        ).textContent =
            error.message;


        document.getElementById(
            "recommendation"
        ).textContent =
            "Please check the inventory inputs.";


    } finally {

        button.disabled = false;

        button.innerHTML =
            `✦ Generate AI Forecast <span>→</span>`;

    }

}


// ======================================================
// BUTTON
// ======================================================

document
    .getElementById("generateBtn")
    .addEventListener(
        "click",
        initializeDashboard
    );


// ======================================================
// ENTER KEY
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.target.matches("input")
        ) {

            initializeDashboard();

        }

    }
);


// ======================================================
// INITIAL LOAD
// ======================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        // Don't immediately hammer the backend.
        // Show the dashboard first.

        setTimeout(
            initializeDashboard,
            500
        );

    }
);
