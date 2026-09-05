# Foresight AI — Supply Intelligence

Foresight AI is a demand forecasting and inventory decision-support platform for SKU-level retail operations. It combines time-series forecasting with inventory rules to turn sales history into practical replenishment decisions and business-impact metrics.

**Live application:** https://priyadarshan.tech  
**Repository:** https://github.com/darshxn10x/foresight-ai

## Overview

Foresight connects the planning workflow:

**Historical Sales → Forecast → Validation → Inventory Risk → Reorder Decision → Business Impact**

## Features

- SKU-level weekly demand forecasting
- Random Forest forecasting with trend and lag features
- Seasonal Naive and trend fallback methods for limited data
- Rolling-origin, one-step-ahead evaluation with MAE, RMSE and MAPE
- Reorder-point and replenishment recommendations
- Stockout, overstock and watch-state detection
- Sales-at-risk and excess-inventory calculations
- Interactive demand forecast visualization
- Dashboard-aware inventory assistant
- FastAPI backend with a lightweight production web dashboard
- Unified deployment option for frontend and API on one Render web service

## Forecasting

The forecasting service aggregates daily sales into weekly demand, removes incomplete current weeks, creates lag/rolling features and selects an appropriate forecasting approach based on available history.

For sufficient history, the current implementation uses a `RandomForestRegressor`. With limited history it falls back to a hybrid trend/seasonal approach so the dashboard remains usable without pretending that insufficient data supports a complex model.

The API also returns live rolling-origin, out-of-sample evaluation for the active SKU. It reports the number of validation folds and available MAE, RMSE, and MAPE so short histories are represented honestly rather than replaced with static metrics.

## Inventory Decision Engine

Forecast output is translated into an operational recommendation using projected demand, available stock, supplier lead time and safety stock.

- **REORDER NOW** — stock is below the required reorder level
- **MARKDOWN / CLEAR** — inventory materially exceeds projected demand
- **WATCH / VOLATILE** — inventory is close to projected demand
- **HEALTHY** — inventory is aligned with demand and buffer requirements

The platform estimates the financial exposure associated with shortages and excess stock when SKU pricing data is available.

## AI Assistant

**Ask Foresight** uses the current dashboard state to explain forecasts, inventory risk, reorder recommendations, model performance and business impact in plain language.

## Architecture

```text
Sales History
     ↓
Weekly Aggregation & Data Preparation
     ↓
Feature Engineering
     ↓
Forecast Model / Baseline Fallback
     ↓
Forecast Evaluation
     ↓
Inventory Risk & Replenishment Engine
     ↓
Business Impact Calculations
     ↓
FastAPI
     ↓
Foresight AI Dashboard + Assistant
```

## Tech Stack

- Python
- Pandas / NumPy
- Scikit-learn
- FastAPI
- Pydantic
- Joblib
- HTML / CSS / JavaScript
- Chart.js
- Render

## Project Structure

```text
foresight-ai/
├── backend/        # FastAPI application and API routes
├── frontend/       # Production dashboard and assistant
├── data/           # Source and processed datasets
├── models/         # Forecasting artifacts
├── src/             # Data and forecasting utilities
├── reports/         # Validation utilities
├── tests/           # Automated tests
├── render.yaml      # Production Render service configuration
├── LICENSE
├── COPYRIGHT.md
├── .gitignore
└── README.md
```

## Running Locally

### Backend

From the repository root:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

The API is available at `http://localhost:8000` and the dashboard is served from the same FastAPI application.

### Production

The repository includes a Render Blueprint configuration with:

```text
Build: pip install -r backend/requirements.txt
Start: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
Health check: /health
```

The application serves both the dashboard and API from one web service, which removes the frontend/API deployment split that can otherwise cause connection and chart failures.

## License

This project is distributed under the MIT License. See `LICENSE` for the full license text.

## Copyright

Copyright © 2026 Priyadarshan. All rights reserved except where permissions are expressly granted by the project license.

---

**Foresight AI** — AI-powered demand forecasting and inventory intelligence.
