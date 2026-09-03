# Foresight AI — Supply Intelligence

AI-powered demand forecasting and inventory decision-support system for SKU-level retail operations.

## Core Features

- Weekly SKU-level demand forecasting
- Seasonal-naive baseline comparison
- Rolling-origin time-series validation
- WAPE primary metric, with Bias and MAPE
- Stockout and overstock risk detection
- REORDER NOW / MARKDOWN-CLEAR / WATCH / HEALTHY decisions
- Reorder-point and recommended-order calculation
- Sales-at-risk and overstock capital impact
- Interactive Forecast, Inventory and AI Insights dashboards
- Flask scoring API

## Architecture

Historical Sales + Inventory Data
↓
Data Cleaning & Feature Engineering
↓
Forecasting Model + Seasonal Naive Baseline
↓
Rolling-Origin Validation
↓
WAPE / Bias / MAPE
↓
Inventory Risk Engine
↓
Business Impact & Recommended Action
↓
Scoring API
↓
Foresight AI Dashboard

## Validation

The forecasting system uses rolling-origin time-series backtesting rather than random train/test splitting.

The Seasonal Naive model is used as the baseline. The production forecasting model should demonstrate lower WAPE before being considered the preferred model.

## Inventory Decisions

The system converts forecasts into operational actions:

- 🔴 REORDER NOW
- 🟠 MARKDOWN / CLEAR
- 🟡 WATCH / VOLATILE
- 🟢 HEALTHY

## Demo

Example SKU001:

- Current Stock: 15 units
- Supplier Lead Time: 7 days
- Safety Stock: 10 units
- Forecast Demand: 52 units
- Reorder Point: 62 units
- Recommended Order: 47 units

The dashboard identifies the inventory shortage and recommends replenishment.

## Tech Stack

- Python
- Pandas
- NumPy
- Scikit-learn
- Flask
- Joblib
- Flutter
- REST API

## Project Structure

python_api/ → forecasting and scoring service  
lib/ → dashboard application  
README.md → documentation
