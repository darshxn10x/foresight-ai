# Foresight AI — ZIDIO Internship Project Report

## 1. Project Overview

Foresight AI is an AI-powered supply intelligence platform designed to help retail teams forecast SKU-level demand and make practical inventory decisions. The system combines machine-learning forecasting, time-series validation, inventory rules, financial impact analysis and a dashboard-aware AI assistant.

## 2. Problem Statement

Retail inventory teams need to balance two expensive outcomes:

- **Stockouts:** demand cannot be fulfilled because inventory is too low.
- **Overstock:** excess inventory ties up working capital and can require markdowns or clearance.

Traditional spreadsheet-based planning makes it difficult to consistently combine historical demand, supplier lead time, safety stock and forecast uncertainty. Foresight converts these inputs into an explainable operational recommendation.

## 3. Objectives

1. Forecast future demand at SKU level.
2. Compare the production model against a simple Seasonal Naive baseline.
3. Evaluate forecasting performance using leakage-free rolling-origin validation.
4. Convert forecasts into reorder and inventory-risk decisions.
5. Quantify business impact in Indian Rupees (₹).
6. Provide an interactive dashboard for decision makers.
7. Provide an AI assistant that explains the current forecast and recommendation.

## 4. System Workflow

```text
Historical Sales + SKU Master
        ↓
Cleaning & Feature Engineering
        ↓
LightGBM Demand Forecast
        ↓
Seasonal Naive Benchmark
        ↓
Rolling-Origin Validation
        ↓
Inventory Risk Engine
        ↓
Reorder Point + Order Quantity
        ↓
₹ Business Impact
        ↓
Dashboard + Ask Foresight Assistant
```

## 5. Machine Learning Approach

The production model is a LightGBM gradient-boosting regressor. Features include backward-looking demand lags, rolling statistics, momentum ratios, calendar/seasonal features, promotion and holiday indicators, and product-catalog attributes.

Time-series validation uses expanding-window rolling-origin evaluation. Random k-fold splitting is avoided because it can leak future observations into the training set.

## 6. Model Performance

Evaluation was performed across **4 rolling-origin folds and 195 active SKUs**.

| Metric | Seasonal Naive | LightGBM | Interpretation |
|---|---:|---:|---|
| WAPE | 13.68% | **11.12%** | **18.7% relative improvement** |
| Bias | +3.60% | **+3.17%** | Lower systematic error |
| RMSE | 28.46 | **26.44** | Lower error variance |
| MAE | 12.89 | **10.48** | More precise point forecasts |

**Model selection:** LightGBM is selected for production because it beats the Seasonal Naive baseline in the completed rolling-origin evaluation.

## 7. Inventory Intelligence

The inventory engine combines forecast demand, current stock, supplier lead time and safety stock.

The system calculates:

- **Reorder Point** = expected demand during supplier lead time + safety stock
- **Recommended Order** = replenishment needed to cover forecast demand and required safety buffer
- Inventory risk level
- Operational decision

The dashboard supports four decision states:

- 🔴 REORDER NOW
- 🟠 MARKDOWN / CLEAR
- 🟡 WATCH / VOLATILE
- 🟢 HEALTHY

## 8. Business Impact

Foresight translates technical forecasts into financial indicators:

- **Sales at Risk (₹):** list-price revenue exposed when forecast demand is higher than available stock.
- **Overstock Capital (₹):** unit-cost capital tied up above forecast demand.
- **Estimated Reorder Cost (₹):** unit cost multiplied by the recommended order quantity.
- **Revenue Exposure (₹):** potential revenue currently exposed by an inventory shortage.

This makes the system useful to both technical and business stakeholders.

## 9. AI Assistant

The **Ask Foresight** assistant is integrated directly into the dashboard and reads the current active-SKU state. It can explain:

- Forecast demand
- Current inventory
- Reorder point and safety stock
- Inventory risk
- Recommended order
- ₹ business impact
- Model validation metrics
- Recommended action

The assistant is designed as an explainability layer rather than a replacement for the forecasting engine.

## 10. User Flow

1. User enters or selects an SKU.
2. User enters current stock, supplier lead time and safety stock.
3. User clicks **Generate AI Forecast**.
4. System obtains the forecast from the backend.
5. Inventory engine evaluates stock against forecast and reorder point.
6. Dashboard displays the risk and recommended action.
7. Business-impact cards show ₹ exposure and replenishment cost.
8. User can ask **Foresight AI** for an explanation.

## 11. Technology Stack

- Python
- Pandas
- NumPy
- Scikit-learn
- LightGBM
- FastAPI
- Joblib
- HTML5 / CSS3 / JavaScript
- Chart.js
- Render
- GitHub

## 12. Limitations

1. New SKUs with limited history require fallback demand estimates.
2. Unexpected promotions or demand shocks can increase forecast error.
3. Inventory recommendations assume supplier lead time remains reasonably stable.
4. Financial impact estimates depend on the accuracy of SKU cost and list-price data.

## 13. Conclusion

Foresight AI demonstrates an end-to-end AI workflow: forecasting is validated against a baseline, converted into inventory decisions, translated into financial impact and exposed through an interactive interface. The system is designed to answer the practical question that matters most to an inventory planner:

> **What is likely to happen, what does it mean for inventory, and what should I do next?**

