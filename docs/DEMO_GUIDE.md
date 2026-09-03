# Foresight AI — Final Demo Guide

## Live application

Primary deployment:

`https://foresight-ai-6mlt.onrender.com`

Custom domain target:

`https://priyadarshan.tech`

> The custom domain should only be presented as the final URL after DNS and hosting configuration have been verified.

## Recommended demo flow

### 1. Dashboard

Start on the Dashboard and introduce the business problem:

> Foresight AI turns historical sales data into SKU-level demand forecasts and actionable inventory decisions.

### 2. Generate a forecast

Use:

- SKU: `SKU001`
- Current stock: `15`
- Supplier lead time: `7` days
- Safety stock: `10` units

Click **Generate AI Forecast**.

### 3. Explain the decision

Show the resulting forecast, reorder point, recommended order, inventory risk and business-impact cards.

### 4. Inventory portfolio

Scroll to **Inventory Risk Snapshot** to show SKU-level stock, forecast, reorder point, order quantity, risk and sales-at-risk values.

### 5. AI assistant

Open **Ask Foresight** and ask:

- `Why is SKU001 at risk?`
- `Should I reorder?`
- `What is the business impact?`
- `How accurate is the model?`

### 6. Runtime status

If the backend is temporarily unavailable, the UI intentionally switches to **DEMO MODE** and continues with deterministic demo analysis. This is a graceful fallback, not a fabricated live-API status.

## Submission links

- Repository: `https://github.com/darshxn10x/foresight-ai`
- Live deployment: `https://foresight-ai-6mlt.onrender.com`
- Custom domain: `https://priyadarshan.tech` 

## Demo rule

Do not modify the application immediately before a final evaluation unless a real defect is found. Keep the submitted repository, deployed build, screenshots, report and presentation aligned to the same final version.
