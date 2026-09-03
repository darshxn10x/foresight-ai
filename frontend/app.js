// ==========================================================
// FORESIGHT AI - FRONTEND APPLICATION
// ==========================================================

// Production FastAPI backend
const API_URL = "https://foresight-ai-6mlt.onrender.com";

let forecastChart = null;


// ==========================================================
// Sample Historical Demand Data
// ==========================================================

const demandData = [

    // Week 1
    { date: "2026-08-03", sku_id: "SKU001", units_sold: 3 },
    { date: "2026-08-04", sku_id: "SKU001", units_sold: 4 },
    { date: "2026-08-05", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-06", sku_id: "SKU001", units_sold: 3 },
    { date: "2026-08-07", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-08", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-09", sku_id: "SKU001", units_sold: 4 },

    // Week 2
    { date: "2026-08-10", sku_id: "SKU001", units_sold: 4 },
    { date: "2026-08-11", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-12", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-13", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-14", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-15", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-16", sku_id: "SKU001", units_sold: 5 },

    // Week 3
    { date: "2026-08-17", sku_id: "SKU001", units_sold: 5 },
    { date: "2026-08-18", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-19", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-20", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-21", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-22", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-23", sku_id: "SKU001", units_sold: 6 },

    // Week 4
    { date: "2026-08-24", sku_id: "SKU001", units_sold: 6 },
    { date: "2026-08-25", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-26", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-27", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-28", sku_id: "SKU001", units_sold: 9 },
    { date: "2026-08-29", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-30", sku_id: "SKU001", units_sold: 7 }
];


// ==========================================================
// Utility
// ==========================================================

function getElement(id) {
    return document.getElementById(id);
}


// ==========================================================
// Forecast API
// ==========================================================

async function getForecast() {

    const response = await fetch(
        `${API_URL}/forecast/predict`,
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

    if (!response.ok) {

        let message = "Forecast API request failed";

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                message = errorData.detail;
            }
        } catch (error) {
            // Ignore JSON parsing error
        }

        throw new Error(message);
    }

    return await response.json();
}


// ==========================================================
// Inventory API
// ==========================================================

async function getInventory(
    skuId,
    currentStock,
    predictedDemand,
    leadTimeDays,
    safetyStock
) {

    const response = await fetch(
        `${API_URL}/inventory/analyze`,
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

    if (!response.ok) {

        let message = "Inventory API request failed";

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                message = errorData.detail;
            }
        } catch (error) {
            // Ignore JSON parsing error
        }

        throw new Error(message);
    }

    return await response.json();
}


// ==========================================================
// AI Insights API
// ==========================================================

async function getInsights(inventory) {

    const response = await fetch(
        `${API_URL}/insights/generate`,
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

    if (!response.ok) {

        let message = "AI Insights API request failed";

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                message = errorData.detail;
            }
        } catch (error) {
            // Ignore JSON parsing error
        }

        throw new Error(message);
    }

    return await response.json();
}


// ==========================================================
// Update Dashboard
// ==========================================================

function updateDashboard(
    forecastData,
    inventoryData,
    insightData
) {

    // ------------------------------------------------------
    // SKU
    // ------------------------------------------------------

    const skuElement = getElement("sku");

    if (skuElement) {
        skuElement.textContent =
            inventoryData.sku_id || "SKU001";
    }


    // ------------------------------------------------------
    // Current Stock
    // ------------------------------------------------------

    const stockElement = getElement("stock");

    if (stockElement) {
        stockElement.textContent =
            inventoryData.current_stock ?? "--";
    }


    // ------------------------------------------------------
    // Predicted Demand
    // ------------------------------------------------------

    const demandElement = getElement("demand");

    if (demandElement) {
        demandElement.textContent =
            inventoryData.predicted_demand ?? "--";
    }


    // ------------------------------------------------------
    // Risk
    // ------------------------------------------------------

    const riskElement = getElement("risk");

    if (riskElement) {

        const rawRisk =
            inventoryData.risk || "healthy";

        const risk =
            String(rawRisk).toLowerCase();

        riskElement.textContent =
            risk.toUpperCase();

        riskElement.classList.remove(
            "risk-healthy",
            "risk-warning",
            "risk-critical"
        );

        if (risk === "healthy") {

            riskElement.classList.add(
                "risk-healthy"
            );

        } else if (
            risk === "warning" ||
            risk === "medium"
        ) {

            riskElement.classList.add(
                "risk-warning"
            );

        } else if (
            risk === "critical" ||
            risk === "high"
        ) {

            riskElement.classList.add(
                "risk-critical"
            );
        }
    }


    // ------------------------------------------------------
    // Inventory Analysis
    // ------------------------------------------------------

    const reorderPointElement =
        getElement("reorderPoint");

    if (reorderPointElement) {

        reorderPointElement.textContent =
            inventoryData.reorder_point ?? "--";
    }


    const recommendedOrderElement =
        getElement("recommendedOrder");

    if (recommendedOrderElement) {

        recommendedOrderElement.textContent =
            inventoryData.recommended_order ?? "--";
    }


    const safetyStockElement =
        getElement("safetyStock");

    if (safetyStockElement) {

        safetyStockElement.textContent =
            inventoryData.safety_stock ?? "--";
    }


    // ------------------------------------------------------
    // AI Insight
    // ------------------------------------------------------

    const insightElement =
        getElement("insight");

    if (insightElement) {

        insightElement.textContent =
            insightData.insight ||
            "AI analysis completed successfully.";
    }


    // ------------------------------------------------------
    // Recommended Action
    // ------------------------------------------------------

    const recommendationElement =
        getElement("recommendation");

    if (recommendationElement) {

        recommendationElement.textContent =
            insightData.recommended_action ||
            "Review inventory levels and replenishment requirements.";
    }


    // ------------------------------------------------------
    // Forecast Model
    // ------------------------------------------------------

    const forecastModelElement =
        getElement("forecastModel");

    if (forecastModelElement) {

        const model =
            forecastData.forecast?.[0]?.model ||
            "hybrid_trend_seasonal";

        forecastModelElement.textContent =
            `Model: ${model}`;
    }


    // ------------------------------------------------------
    // Forecast List
    // ------------------------------------------------------

    const forecastList =
        getElement("forecastList");

    if (!forecastList) {
        return;
    }

    forecastList.innerHTML = "";


    if (
        !forecastData.forecast ||
        forecastData.forecast.length === 0
    ) {

        forecastList.innerHTML =
            "<p>No forecast data available.</p>";

        return;
    }


    forecastData.forecast.forEach(item => {

        const row =
            document.createElement("div");

        row.className = "forecast-row";

        row.innerHTML = `
            <span>
                ${item.forecast_week}
            </span>

            <strong>
                ${item.predicted_demand} units
            </strong>
        `;

        forecastList.appendChild(row);
    });
}


// ==========================================================
// Convert Daily Demand → Weekly Demand
// ==========================================================

function getHistoricalWeeklyDemand() {

    const historicalMap = {};

    demandData.forEach(item => {

        const date =
            new Date(`${item.date}T00:00:00`);

        const day =
            date.getDay();

        // Sunday = 0
        const daysToSunday =
            day === 0 ? 0 : 7 - day;

        const weekEnd =
            new Date(date);

        weekEnd.setDate(
            date.getDate() + daysToSunday
        );

        const year =
            weekEnd.getFullYear();

        const month =
            String(
                weekEnd.getMonth() + 1
            ).padStart(2, "0");

        const dayNumber =
            String(
                weekEnd.getDate()
            ).padStart(2, "0");

        const weekLabel =
            `${year}-${month}-${dayNumber}`;

        if (!historicalMap[weekLabel]) {
            historicalMap[weekLabel] = 0;
        }

        historicalMap[weekLabel] +=
            Number(item.units_sold);
    });

    return historicalMap;
}


// ==========================================================
// Render Forecast Chart
// ==========================================================

function renderForecastChart(forecastData) {

    const canvas =
        getElement("forecastChart");

    if (!canvas) {
        return;
    }


    // Destroy old chart
    if (forecastChart) {

        forecastChart.destroy();

        forecastChart = null;
    }


    // ------------------------------------------------------
    // Historical weekly demand
    // ------------------------------------------------------

    const historicalMap =
        getHistoricalWeeklyDemand();

    const historicalLabels =
        Object.keys(historicalMap);

    const historicalValues =
        Object.values(historicalMap);


    // ------------------------------------------------------
    // Forecast
    // ------------------------------------------------------

    const forecastItems =
        forecastData.forecast || [];

    const forecastLabels =
        forecastItems.map(
            item => item.forecast_week
        );

    const forecastValues =
        forecastItems.map(
            item => Number(item.predicted_demand)
        );


    // ------------------------------------------------------
    // Combined labels
    // ------------------------------------------------------

    const labels = [
        ...historicalLabels,
        ...forecastLabels
    ];


    // ------------------------------------------------------
    // Historical line
    // ------------------------------------------------------

    const historicalData = [

        ...historicalValues,

        ...Array(
            forecastValues.length
        ).fill(null)
    ];


    // ------------------------------------------------------
    // Forecast line
    // ------------------------------------------------------

    const forecastDataPoints = [

        ...Array(
            historicalValues.length
        ).fill(null),

        ...forecastValues
    ];


    // ------------------------------------------------------
    // Create Chart
    // ------------------------------------------------------

    forecastChart =
        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Historical Demand",

                        data: historicalData,

                        tension: 0.35,

                        borderWidth: 3,

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        fill: false
                    },

                    {
                        label: "Predicted Demand",

                        data: forecastDataPoints,

                        tension: 0.35,

                        borderWidth: 3,

                        pointRadius: 4,

                        pointHoverRadius: 6,

                        borderDash: [7, 6],

                        fill: false
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

                        display: true,

                        position: "top"
                    },


                    tooltip: {

                        enabled: true
                    }
                },


                scales: {

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Units per Week"
                        }
                    },


                    x: {

                        title: {

                            display: true,

                            text: "Week"
                        }
                    }
                }
            }
        });
}


// ==========================================================
// Loading State
// ==========================================================

function setLoadingState(isLoading) {

    const button =
        getElement("generateBtn");

    if (!button) {
        return;
    }

    if (isLoading) {

        button.disabled = true;

        button.textContent =
            "Generating Forecast...";

    } else {

        button.disabled = false;

        button.textContent =
            "Generate Forecast";
    }
}


// ==========================================================
// Error State
// ==========================================================

function showError(message) {

    const insight =
        getElement("insight");

    const recommendation =
        getElement("recommendation");

    if (insight) {

        insight.textContent =
            message ||
            "Unable to connect to the Foresight AI backend.";
    }

    if (recommendation) {

        recommendation.textContent =
            "Please verify the backend service and try again.";
    }
}


// ==========================================================
// Main Dashboard Function
// ==========================================================

async function initializeDashboard() {

    setLoadingState(true);


    try {

        // --------------------------------------------------
        // Read user inputs
        // --------------------------------------------------

        const skuInput =
            getElement("skuInput");

        const stockInput =
            getElement("stockInput");

        const leadTimeInput =
            getElement("leadTimeInput");

        const safetyStockInput =
            getElement("safetyStockInput");


        const skuId =
            skuInput?.value.trim() || "SKU001";

        const currentStock =
            Number(
                stockInput?.value
            );

        const leadTimeDays =
            Number(
                leadTimeInput?.value
            );

        const safetyStock =
            Number(
                safetyStockInput?.value
            );


        // --------------------------------------------------
        // Validate inputs
        // --------------------------------------------------

        if (!skuId) {

            throw new Error(
                "SKU ID is required."
            );
        }


        if (!Number.isFinite(currentStock)) {

            throw new Error(
                "Please enter a valid current stock value."
            );
        }


        if (!Number.isFinite(leadTimeDays)) {

            throw new Error(
                "Please enter a valid lead time."
            );
        }


        if (!Number.isFinite(safetyStock)) {

            throw new Error(
                "Please enter a valid safety stock."
            );
        }


        if (
            currentStock < 0 ||
            leadTimeDays < 0 ||
            safetyStock < 0
        ) {

            throw new Error(
                "Input values cannot be negative."
            );
        }


        // --------------------------------------------------
        // Forecast
        // --------------------------------------------------

        const forecastData =
            await getForecast();


        if (
            !forecastData ||
            !forecastData.forecast ||
            forecastData.forecast.length === 0
        ) {

            throw new Error(
                "No forecast data was returned by the API."
            );
        }


        // --------------------------------------------------
        // Use first forecast week for inventory analysis
        // --------------------------------------------------

        const predictedDemand =
            Number(
                forecastData
                    .forecast[0]
                    .predicted_demand
            );


        // --------------------------------------------------
        // Inventory analysis
        // --------------------------------------------------

        const inventoryData =
            await getInventory(

                skuId,

                currentStock,

                predictedDemand,

                leadTimeDays,

                safetyStock
            );


        // --------------------------------------------------
        // AI insight
        // --------------------------------------------------

        const insightData =
            await getInsights(
                inventoryData
            );


        // --------------------------------------------------
        // Update UI
        // --------------------------------------------------

        updateDashboard(

            forecastData,

            inventoryData,

            insightData
        );


        // --------------------------------------------------
        // Render chart
        // --------------------------------------------------

        renderForecastChart(
            forecastData
        );


        console.log(
            "Foresight AI dashboard updated successfully."
        );


    } catch (error) {

        console.error(
            "Foresight AI Error:",
            error
        );

        showError(
            error.message ||
            "Unable to connect to the Foresight AI backend."
        );


    } finally {

        setLoadingState(false);
    }
}


// ==========================================================
// Generate Button
// ==========================================================

const generateButton =
    getElement("generateBtn");


if (generateButton) {

    generateButton.addEventListener(
        "click",
        initializeDashboard
    );
}


// ==========================================================
// Press Enter to Generate
// ==========================================================

const inputFields = document.querySelectorAll(
    "#skuInput, #stockInput, #leadTimeInput, #safetyStockInput"
);


inputFields.forEach(input => {

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                initializeDashboard();
            }
        }
    );
});


// ==========================================================
// Initial Dashboard Load
// ==========================================================

initializeDashboard();
