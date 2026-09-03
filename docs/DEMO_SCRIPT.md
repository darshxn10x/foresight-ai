# Foresight AI — 3–5 Minute Demo Script

Use this script for the required unlisted ZIDIO demo video.

## 0:00–0:30 — Problem

> “Foresight AI is an AI-powered demand forecasting and inventory intelligence platform. It helps retail teams predict SKU-level demand, identify stockout or overstock risk, and decide what action to take next.”

Show the landing/dashboard screen.

## 0:30–1:10 — Forecast workflow

Show `SKU001`, current stock `15`, lead time `7` days and safety stock `10` units.

Click **Generate AI Forecast**.

Say:

> “The system combines historical demand with the forecasting model and returns the next forecast period. The dashboard then connects that prediction to inventory decisioning.”

## 1:10–1:50 — Model validation

Scroll to the model validation section.

Say:

> “We use leakage-free rolling-origin validation and compare LightGBM against a Seasonal Naive baseline. The reported WAPE is 11.12% for LightGBM versus 13.68% for the baseline, an 18.7% relative improvement.”

## 1:50–2:40 — Inventory decision

Show the inventory analysis cards.

Say:

> “For SKU001, forecast demand is 52 units, the reorder point is 62 units, and current stock is 15 units. The system therefore recommends reordering approximately 47 units.”

Show the risk and recommended action.

## 2:40–3:20 — Business impact

Show the ₹ sales-at-risk, replenishment and related business-impact cards.

Say:

> “Instead of stopping at a model prediction, Foresight translates the forecast into financial exposure and an operational action that a business stakeholder can understand.”

## 3:20–4:10 — AI assistant

Open **Ask Foresight** and ask:

- `Why is SKU001 at risk?`
- `Should I reorder?`
- `How accurate is the model?`

Say:

> “Ask Foresight acts as the explanation layer. It reads the active dashboard state and answers questions about forecast, risk, business impact and model performance.”

## 4:10–4:40 — Deployment and resilience

Show the runtime status.

Say:

> “The project is deployed as a public web application with a FastAPI scoring service. If the backend is temporarily unavailable, the interface switches to Demo Mode and keeps the core demonstration available while automatically checking for API recovery.”

## 4:40–5:00 — Close

> “Foresight AI closes the loop from forecast to decision: predict demand, understand inventory risk, quantify business impact, and explain what to do next.”

End on the dashboard or repository README.
