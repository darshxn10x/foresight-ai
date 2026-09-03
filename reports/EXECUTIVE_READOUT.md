# Foresight AI — Executive Readout

**ZIDIO Development — Project FORESIGHT**  
**Prepared by:** Priyadarshan S V  
**Project:** Demand & Inventory Intelligence

## 1. Executive summary

Foresight AI is an AI-powered demand forecasting and inventory decision-support platform. It turns historical sales into SKU-level forecasts, validates the forecast against a Seasonal Naive baseline, converts the result into stockout/overstock decisions, and quantifies the business impact in Indian Rupees.

**Decision workflow:** Historical Sales → ML Forecast → Validation → Inventory Risk → Reorder Decision → ₹ Business Impact → AI Explanation.

## 2. Business problem

Retail operations teams must balance two expensive outcomes:

- **Stockouts:** insufficient inventory can cause lost sales and poor service levels.
- **Overstock:** excess inventory ties up working capital and can lead to markdowns.

Foresight provides a single workflow for answering: **what is likely to happen, what does it mean for inventory, and what should we do next?**

## 3. Data foundation

The reproducible pipeline ingests four client-style extracts: `sales_daily`, `sku_master`, `calendar`, and `inventory_snapshots`.

The final data-quality memo reports **15,405 analysis-ready weekly observations across 195 active SKUs**, with automated handling of duplicates, invalid dates, missing values, inconsistent identifiers, invalid values and orphaned keys.

The pipeline can be reproduced from the repository root with:

```bash
python src/pipeline.py
```

## 4. Forecasting performance

Foresight uses LightGBM as the production forecasting model and compares it with a Seasonal Naive benchmark using leakage-free rolling-origin validation.

| Metric | Seasonal Naive | LightGBM |
|---|---:|---:|
| WAPE | 13.68% | **11.12%** |
| Bias | +3.60% | **+3.17%** |
| MAE | 12.89 | **10.48** |
| RMSE | 28.46 | **26.44** |

**Result:** LightGBM delivers an **18.7% relative WAPE improvement** over the Seasonal Naive baseline across the reported four rolling-origin folds and 195 active SKUs.

## 5. Inventory decisioning

The decision engine combines forecast demand, current stock, supplier lead time and safety stock.

It calculates:

- Reorder point
- Recommended order quantity
- Stockout / overstock risk
- Operational action
- Sales-at-risk and other ₹ business-impact indicators

The intended operational states are **REORDER NOW, MARKDOWN / CLEAR, WATCH / VOLATILE, and HEALTHY**.

## 6. Example: SKU001

Final demo scenario:

- Current stock: **15 units**
- Supplier lead time: **7 days**
- Safety stock: **10 units**
- Forecast demand: **52 units**
- Reorder point: **62 units**
- Recommended order: **47 units**

**Recommendation:** REORDER NOW, because available inventory is below the recommended reorder point.

## 7. Productization

The solution includes:

- Interactive Foresight AI web dashboard
- Forecast and inventory views
- AI Insights panel
- Ask Foresight dashboard-aware assistant
- FastAPI scoring service
- Graceful Demo Mode fallback when the live API is temporarily unavailable
- Public deployment for evaluation

## 8. Recommendation and handover

Use the LightGBM forecast for production planning, prioritize SKUs using transparent inventory risk, and use the dashboard plus Ask Foresight for stakeholder explanation.

### Submission package

The ZIDIO brief specifies the following final submission items:

1. Git repository containing pipeline, notebooks and model code.
2. Live dashboard URL and live scoring-service URL.
3. README covering problem, data, setup/run steps, WAPE vs baseline and assumptions.
4. Executive readout and data-quality/EDA memo.
5. 3–5 minute unlisted demo video.
6. Completed cohort submission form containing the required links.

See `docs/FINAL_SUBMISSION_CHECKLIST.md` and `docs/DEMO_GUIDE.md` for the handover checklist.
