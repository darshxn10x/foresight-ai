const API_URL = "https://foresight-ai-backend.onrender.com";
let forecastChart = null;


// --------------------------------------------------
// Sample historical demand data
// --------------------------------------------------

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
    { date: "2026-08-25", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-26", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-27", sku_id: "SKU001", units_sold: 7 },
    { date: "2026-08-28", sku_id: "SKU001", units_sold: 9 },
    { date: "2026-08-29", sku_id: "SKU001", units_sold: 8 },
    { date: "2026-08-30", sku_id: "SKU001", units_sold: 7 }
];


// --------------------------------------------------
// Call Forecast API
// --------------------------------------------------

async function getForecast() {

    const response = await fetch(
        `${API_BASE_URL}/forecast/predict`,
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
        throw new Error("Forecast API request failed");
    }

    return await response.json();
}


// --------------------------------------------------
// Call Inventory API
// --------------------------------------------------

async function getInventory(
    skuId,
    currentStock,
    predictedDemand,
    leadTimeDays,
    safetyStock
) {

    const response = await fetch(
        `${API_BASE_URL}/inventory/analyze`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sku_id: skuId,
                current_stock: currentStock,
                predicted_demand: Math.round(predictedDemand),
                lead_time_days: leadTimeDays,
                safety_stock: safetyStock
            })
        }
    );

    if (!response.ok) {
        throw new Error("Inventory API request failed");
    }

    return await response.json();
}

// --------------------------------------------------
// Call AI Insights API
// --------------------------------------------------

async function getInsights(inventory) {

    const response = await fetch(
        `${API_BASE_URL}/insights/generate`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sku_id: inventory.sku_id,
                current_stock: inventory.current_stock,
                predicted_demand: inventory.predicted_demand,
                safety_stock: inventory.safety_stock
            })
     

        }
    );

    if (!response.ok) {
        throw new Error("Insights API request failed");
    }

    return await response.json();
}


// --------------------------------------------------
// Update Dashboard
// --------------------------------------------------

function updateDashboard(forecastData, inventoryData, insightData) {

    document.getElementById("sku").textContent =
        inventoryData.sku_id;

    document.getElementById("stock").textContent =
        inventoryData.current_stock;

    document.getElementById("demand").textContent =
        inventoryData.predicted_demand;


    const riskElement = document.getElementById("risk");

    const risk = inventoryData.risk.toLowerCase();

    riskElement.textContent = risk.toUpperCase();

    riskElement.classList.remove(
       "risk-healthy",
       "risk-warning",
       "risk-critical"
   );

    if (risk === "healthy") {
       riskElement.classList.add("risk-healthy");
    } else if (risk === "warning") {
       riskElement.classList.add("risk-warning");
    } else if (risk === "critical") {
       riskElement.classList.add("risk-critical");
    }

    document.getElementById("reorderPoint").textContent =
        inventoryData.reorder_point;

    document.getElementById("recommendedOrder").textContent =
        inventoryData.recommended_order;

    document.getElementById("safetyStock").textContent =
        inventoryData.safety_stock;

    document.getElementById("insight").textContent =
        insightData.insight;

    document.getElementById("recommendation").textContent =
        insightData.recommended_action;

    document.getElementById("forecastModel").textContent =
        `Model: ${forecastData.forecast[0]?.model || "seasonal_naive"}`;


    const forecastList =
        document.getElementById("forecastList");

    forecastList.innerHTML = "";


    forecastData.forecast.forEach(item => {

        const row = document.createElement("div");

        row.className = "forecast-row";

        row.innerHTML = `
            <span>${item.forecast_week}</span>
            <strong>${item.predicted_demand} units</strong>
        `;

        forecastList.appendChild(row);
    });
}

// --------------------------------------------------
// Render Forecast Chart
// --------------------------------------------------

function renderForecastChart(forecastData) {

    const canvas = document.getElementById("forecastChart");

    if (!canvas) {
        return;
    }

    // Destroy previous chart before creating a new one
    if (forecastChart) {
        forecastChart.destroy();
    }

    // --------------------------------------------------
    // Convert historical daily demand into weekly demand
    // --------------------------------------------------

    const historicalMap = {};

    demandData.forEach(item => {

        const date = new Date(item.date);

        // Get Sunday as the end of the week
        const day = date.getDay();

       // Sunday should remain the end of the current week
       const diff = day === 0 ? 0 : 7 - day;

       const weekEnd = new Date(date);
       weekEnd.setDate(date.getDate() + diff);


        const weekLabel =
            weekEnd.toISOString().split("T")[0];

        if (!historicalMap[weekLabel]) {
            historicalMap[weekLabel] = 0;
        }

        historicalMap[weekLabel] += Number(item.units_sold);
    });


    const historicalLabels =
        Object.keys(historicalMap);

    const historicalValues =
        Object.values(historicalMap);


    // --------------------------------------------------
    // Forecast data
    // --------------------------------------------------

    const forecastLabels =
        forecastData.forecast.map(
            item => item.forecast_week
        );

    const forecastValues =
        forecastData.forecast.map(
            item => item.predicted_demand
        );


    // --------------------------------------------------
    // Combine labels
    // --------------------------------------------------

    const labels = [
        ...historicalLabels,
        ...forecastLabels
    ];


    // --------------------------------------------------
    // Historical dataset
    // --------------------------------------------------

    const historicalData = [
        ...historicalValues,
        ...Array(forecastValues.length).fill(null)
    ];


    // --------------------------------------------------
    // Forecast dataset
    // --------------------------------------------------

    const forecastDataPoints = [
        ...Array(historicalValues.length).fill(null),
        ...forecastValues
    ];


    // --------------------------------------------------
    // Create chart
    // --------------------------------------------------

    forecastChart = new Chart(canvas, {

        type: "line",

        data: {

            labels: labels,

            datasets: [

                {
                    label: "Historical Demand",
                    data: historicalData,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 5,
                    fill: false
                },

                {
                    label: "Predicted Demand",
                    data: forecastDataPoints,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 5,
                    borderDash: [6, 6],
                    fill: false
                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: true
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
// --------------------------------------------------
// Initialize Dashboard
// --------------------------------------------------

async function initializeDashboard() {
    const generateBtn = document.getElementById("generateBtn");

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating Forecast...";

    try {

        const skuId =
            document.getElementById("skuInput").value.trim();

        const currentStock =
            Number(document.getElementById("stockInput").value);

        const leadTimeDays =
            Number(document.getElementById("leadTimeInput").value);

        const safetyStock =
            Number(document.getElementById("safetyStockInput").value);


        if (!skuId) {
            throw new Error("SKU ID is required");
        }

        if (
            currentStock < 0 ||
            leadTimeDays < 0 ||
            safetyStock < 0
        ) {
            throw new Error("Input values cannot be negative");
        }


        const forecastData =
            await getForecast();


        if (
            !forecastData.forecast ||
            !forecastData.forecast.length
        ) {
            throw new Error("No forecast returned");
        }


        const predictedDemand =
            forecastData.forecast[0].predicted_demand;


        const inventoryData =
            await getInventory(
                skuId,
                currentStock,
                predictedDemand,
                leadTimeDays,
                safetyStock
            );


        const insightData =
            await getInsights(inventoryData);


        updateDashboard(
            forecastData,
            inventoryData,
            insightData
        );


        renderForecastChart(forecastData);


    } catch (error) {

        console.error(error);

        document.getElementById("insight").textContent =
            error.message ||
            "Unable to connect to the Foresight AI backend.";

        document.getElementById("recommendation").textContent =
            "Please check your inputs and make sure the FastAPI server is running.";

     } finally {

        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Forecast";

    }
}


// Start application

document
    .getElementById("generateBtn")
    .addEventListener("click", initializeDashboard);


// Start application
initializeDashboard();
