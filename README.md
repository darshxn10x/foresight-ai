# Foresight AI — Supply Intelligence

Foresight AI is a demand forecasting and inventory decision-support platform for SKU-level retail operations. It combines machine-learning forecasts with inventory rules to turn sales history into practical replenishment decisions and business-impact metrics.

**Live application:** https://foresight-ai-6mlt.onrender.com  
**Custom domain:** https://priyadarshan.tech

## Overview

Foresight connects the complete planning workflow:

**Historical Sales → Forecast → Validation → Inventory Risk → Reorder Decision → Business Impact**

## Features

- SKU-level weekly demand forecasting
- LightGBM forecasting model with Seasonal Naive benchmark
- Rolling-origin time-series validation
- WAPE, Bias, MAPE, MAE and RMSE evaluation
- Prediction intervals for uncertainty-aware planning
- Reorder-point and replenishment recommendations
- Stockout and overstock risk detection
- Operational states: **REORDER NOW, MARKDOWN / CLEAR, WATCH / VOLATILE, HEALTHY**
- Sales-at-risk, overstock capital and replenishment-cost calculations
- Interactive forecasting and inventory dashboard
- Dashboard-aware AI assistant for operational questions
- FastAPI backend with a lightweight web frontend

## Model

The forecasting pipeline uses time-aware validation to avoid future-data leakage. LightGBM is evaluated against a Seasonal Naive baseline and selected based on out-of-sample performance.

Current validation snapshot:

| Metric | Seasonal Naive | LightGBM |
|---|---:|---:|
| WAPE | 13.68% | **11.12%** |
| Bias | +3.60% | **+3.17%** |
| RMSE | 28.46 | **26.44** |
| MAE | 12.89 | **10.48** |

## Inventory Decision Engine

Forecast output is translated into an operational recommendation using projected demand, available stock, supplier lead time and safety stock.

- **REORDER NOW** — stock is below the reorder point
- **MARKDOWN / CLEAR** — inventory materially exceeds projected demand
- **WATCH / VOLATILE** — inventory is close to projected demand
- **HEALTHY** — inventory is aligned with demand and buffer requirements

The platform also estimates the financial exposure associated with inventory shortages, excess stock and recommended replenishment.

## AI Assistant

**Ask Foresight** uses the current dashboard state to explain forecasts, inventory risk, reorder recommendations, model performance and business impact in plain language.

## Architecture

```text
Sales Data + SKU Master
        ↓
Data Preparation & Feature Engineering
        ↓
LightGBM Forecast + Seasonal Naive Benchmark
        ↓
Time-Series Validation
        ↓
Inventory Risk & Replenishment Engine
        ↓
Business Impact Calculations
        ↓
FastAPI Backend
        ↓
Foresight AI Web Dashboard + Assistant
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
- Render

## Project Structure

```text
foresight-ai/
├── backend/        # FastAPI services
├── frontend/       # Web dashboard and assistant
├── data/            # Source and processed datasets
├── models/          # Forecasting artifacts
├── src/             # Forecasting and data pipeline code
├── reports/         # Model validation utility
├── tests/           # Automated tests
├── .gitignore
└── README.md
```

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

Serve the `frontend` directory with any static web server and configure the frontend API endpoint to point to the FastAPI service.

## Repository

https://github.com/darshxn10x/foresight-ai

---

**Foresight AI** — AI-powered demand forecasting and inventory intelligence.
