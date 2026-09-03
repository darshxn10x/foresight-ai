# Foresight AI — Supply Intelligence

**Foresight AI** is an AI-powered demand forecasting and inventory decision-support platform for SKU-level retail operations. It turns historical sales into forecasts, converts forecasts into replenishment decisions, and translates inventory risk into business impact in Indian Rupees (₹).

## Why Foresight?

Retail teams often have to decide **how much stock to hold, when to reorder, and how much revenue is exposed** using spreadsheets and intuition. Foresight connects those decisions in one workflow:

**Historical Sales → ML Forecast → Validation → Inventory Risk → Reorder Decision → ₹ Business Impact → AI Explanation**

## Core Features

- Weekly SKU-level demand forecasting
- LightGBM production model with Seasonal Naive benchmark
- Leakage-free 4-fold rolling-origin time-series validation
- WAPE as the primary forecasting metric, with Bias, MAPE, MAE and RMSE
- 80% prediction intervals for uncertainty-aware planning
- Stockout and overstock risk detection
- **REORDER NOW / MARKDOWN-CLEAR / WATCH / HEALTHY** operational decisions
- Reorder-point and recommended-order calculation using lead time and safety stock
- **₹ Sales at Risk** and **₹ Overstock Capital**
- Estimated replenishment cost and revenue exposure
- SKU-level inventory risk portfolio snapshot
- Interactive Forecast, Inventory and AI Insights dashboard
- **Ask Foresight** dashboard-aware chatbot for forecasts, inventory and business-impact questions
- FastAPI scoring/evaluation backend with a static web frontend

## Model Validation

Foresight uses rolling-origin backtesting rather than random train/test splitting because future observations must never leak into historical training windows.

| Metric | Seasonal Naive | LightGBM | Result |
|---|---:|---:|---|
| WAPE | 13.68% | **11.12%** | **18.7% relative improvement** |
| Bias | +3.60% | **+3.17%** | Lower systematic error |
| RMSE | 28.46 | **26.44** | Lower error variance |
| MAE | 12.89 | **10.48** | More precise forecasts |

**Selection verdict:** LightGBM Regressor is the production model because it outperformed the Seasonal Naive baseline across the 4 rolling-origin evaluation folds and 195 active SKUs.

## Inventory Decision Engine

Forecasts are converted into actions instead of stopping at a prediction number:

- 🔴 **REORDER NOW** — stock is below the reorder point
- 🟠 **MARKDOWN / CLEAR** — inventory materially exceeds forecast demand
- 🟡 **WATCH / VOLATILE** — stock is close to projected demand
- 🟢 **HEALTHY** — inventory is aligned with the forecast and buffer

## Business Impact

For the active SKU, the dashboard calculates financial consequences such as:

- **Sales at Risk:** estimated list-price revenue exposed when forecast demand exceeds available stock
- **Overstock Capital:** unit-cost capital tied up above forecast demand
- **Estimated Reorder Cost:** unit cost × recommended replenishment quantity
- **Revenue Exposure:** potential revenue currently exposed to a stock shortage

The dashboard displays these values using **₹ / Indian number formatting** so the model output is directly understandable to business users.

## AI Assistant

**Ask Foresight** is a no-API-key dashboard assistant. It reads the current dashboard state and can explain:

- Why the active SKU is at risk
- Whether to reorder
- Current stock and forecast demand
- Reorder point and safety stock
- ₹ business impact
- Model WAPE and validation results
- Recommended operational action

## Example Demo Scenario

For `SKU001`:

- Current Stock: 15 units
- Supplier Lead Time: 7 days
- Safety Stock: 10 units
- Forecast Demand: 52 units
- Reorder Point: 62 units
- Recommended Order: 47 units

The dashboard identifies the shortage, recommends replenishment, and explains the decision through the AI Insight and chatbot.

## Architecture

```text
Historical Sales + SKU Master
            ↓
Data Cleaning & Feature Engineering
            ↓
LightGBM Forecast + Seasonal Naive Baseline
            ↓
4-Fold Rolling-Origin Validation
            ↓
WAPE / Bias / MAPE / MAE / RMSE
            ↓
Inventory Risk Engine
            ↓
Reorder Point + Recommended Order
            ↓
₹ Business Impact
            ↓
FastAPI Backend
            ↓
Foresight AI Web Dashboard + AI Assistant
```

## Tech Stack

- Python
- Pandas / NumPy
- Scikit-learn
- LightGBM
- FastAPI
- Joblib
- HTML / CSS / JavaScript
- Chart.js
- Render deployment

## Project Structure

```text
foresight-ai/
├── backend/        # FastAPI prediction, inventory and evaluation services
├── frontend/       # Foresight AI dashboard and chatbot
├── data/           # Sales and SKU master data
├── models/         # Trained forecasting artifacts
├── reports/        # Validation and project reports
├── src/            # Data science / forecasting source code
└── tests/          # Automated tests
```

## Live Demo

The project is deployed as a public web application and the repository contains the complete source code required for review.
