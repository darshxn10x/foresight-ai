# Project FORESIGHT: Data-Quality & Ingestion Memo (Deliverable D2)
**Client**: NorthBay Living — Direct-to-Consumer Home & Lifestyle Brand  
**Prepared by**: Data Science & Analytics Team  
**Date**: 2026-09-03 13:38:03  
**Milestone**: M1 — Data Foundation & Clean Ingestion  

---

## 1. Executive Summary & Data Maturity
This report documents the end-to-end ingestion, validation, and automated cleaning executed on NorthBay Living's client data extracts. Prior to this pipeline, NorthBay Living operated on ad-hoc spreadsheets subject to data entry errors, conflicting timestamps, orphaned product keys, and unrecorded return offsets.

The reproducible pipeline processed all **4 raw extracts** into an immutable, unified star schema. All raw extracts remain strictly untouched in `data/raw/`, and the pipeline produces a standardized, feature-engineered weekly dataset in `data/processed/analysis_ready.parquet` (15,405 weekly observations across 195 active SKUs).

---

## 2. Raw Extract Inventory & Grain

| Extract Table | Raw Rows | Raw Columns | Primary Key / Grain | Key Attributes |
| :--- | :--- | :--- | :--- | :--- |
| `sales_daily.csv` | 107,534 | 6 | (date, sku_id) | `units_sold`, `revenue`, `unit_price`, `promo_flag` |
| `sku_master.csv` | 201 | 6 | `sku_id` | `category`, `subcategory`, `unit_cost`, `list_price` |
| `calendar.csv` | 546 | 6 | `date` | `week`, `month`, `season`, `is_holiday`, `promo_event` |
| `inventory_snapshots.csv` | 1,173 | 6 | (date, sku_id) | `on_hand_units`, `on_order_units`, `lead_time_days`, `reorder_point` |

---

## 3. Data Quality Issues Catalog & Resolutions

The automated data pipeline explicitly identified, quarantined, and cleaned six classes of anomalies:

### 3.1 Identifier Inconsistencies & Normalization
* **Issue Found**: Mixed SKU casing (e.g., `sku-012`, `SKU_012`) and leading/trailing whitespace (`'  SKU-001 '`) occurred across transaction records and snapshot tables.
* **Resolution**: Deterministic normalization via regex transformation: stripped all outer whitespace, enforced uppercase formatting, and standardized internal separators to `SKU-XXX`.

### 3.2 Corrupt & Invalid Dates
* **Issue Found**: 150 records in `sales_daily`, 0 in `calendar`, and 0 in `inventory_snapshots` contained corrupt dates (e.g., leap-year violations like `2025-02-30`, invalid months `2025/13/45`, or text literals `INVALID_DATE`).
* **Resolution**: Mixed-format datetime parsing with error coercion (`errors='coerce'`). Non-recoverable corrupt dates were safely dropped to prevent time-series index misalignment.

### 3.3 Deduplication & Intra-Day Aggregations
* **Issue Found**: 
  * `sales_daily`: 991 exact duplicate rows and 65 multiple intra-day transactions for the same (date, sku_id).
  * `sku_master`: 1 duplicate catalog entries.
  * `inventory_snapshots`: 3 duplicate stock snapshots.
* **Resolution**: Primary key uniqueness enforced across dimensions. In `sales_daily`, intra-day multiple sales rows were aggregated deterministically (`units_sold` summed, `revenue` summed, `promo_flag` set to max).

### 3.4 Impossible & Outlier Values
* **Issue Found**: 
  * 95 records with negative `units_sold` (representing unhandled returns/data glitches).
  * 964 zero/negative unit prices.
  * 1 SKUs with negative unit cost, and 1 SKUs where unit cost exceeded list price.
  * 2 snapshot rows with negative warehouse on-hand stock.
* **Resolution**:
  * Negative demand records were isolated to prevent downward distortion of forward sales velocity.
  * Invalid unit prices and revenues were recomputed from catalog list prices and actual units sold.
  * Negative unit costs were imputed using the category median cost, and inverted margins were corrected to the standard category 40% margin.
  * Negative warehouse stock was clamped to `0`.

### 3.5 Missing Value Imputation
* **Issue Found**: 1705 missing revenue entries, 2146 missing promo flags, and 2 missing lead time values.
* **Resolution**:
  * `revenue = units_sold * unit_price` recomputed deterministically.
  * Missing promo flags imputed to default baseline (`0`).
  * Missing supplier lead times imputed using category median lead times.

### 3.6 Referential Integrity & Orphaned Keys
* **Issue Found**: 100 transaction records in `sales_daily` referenced SKUs (`SKU-998, SKU-999`) that do not exist in `sku_master`.
* **Resolution**: Quarantined orphaned records into audit log and excluded them from the analysis dataset to guarantee strict foreign key consistency.

---

## 4. Reconciliation Metrics (Pre vs. Post Pipeline)

| Table | Raw Input Count | Clean Output Count | Retention Rate | Status |
| :--- | :--- | :--- | :--- | :--- |
| `sales_daily` | 107,534 | 106,133 | 98.7% | Clean & Aggregated |
| `sku_master` | 201 | 200 | 99.5% | Validated Dimension |
| `calendar` | 546 | 545 | 99.82% | Clean Date Spine |
| `inventory_snapshots` | 1,173 | 1,170 | 99.74% | Verified Snapshots |
| **Analysis-Ready Weekly** | **N/A** | **15,405** | **100% Validated** | **Ready for M2/M3** |

---

## 5. Preliminary Business Insights & Demand Dynamics

1. **Volume Concentration (Top Movers)**:
   The top 5 performing SKUs account for significant turnover:
   * **SKU-008**: 48,369 units sold
   * **SKU-004**: 42,193 units sold
   * **SKU-003**: 42,011 units sold
   * **SKU-034**: 40,696 units sold
   * **SKU-009**: 36,603 units sold
2. **Category Revenue Distribution**:
   Total historical sales revenue reached **₹8,164,399,689.37** across 1,481,426 units:
   * **Kitchen & Dining**: ₹2,357,428,996.61 (28.9%)
   * **Bedding & Bath**: ₹1,738,932,812.59 (21.3%)
   * **Furnishings**: ₹1,666,712,756.37 (20.4%)
   * **Small Appliances**: ₹1,278,243,006.45 (15.7%)
   * **Home Décor**: ₹1,123,082,117.35 (13.8%)
3. **Dead Stock / Slow Movers Warning**:
   0 SKUs registered zero sales, while bottom performers (SKU-165, SKU-195, SKU-175, SKU-160, SKU-155) exhibit high risk of capital lockup and potential markdown requirements.
4. **Data Readiness for Forecasting**:
   Weekly time-series feature engineering succeeded with zero missing values across lags and rolling statistics. The dataset covers **2025-01-05** to **2026-07-05**, providing 78 continuous weekly observations per SKU—well exceeding the minimum 8-week requirement for seasonal baseline and machine learning modeling.

---

## 6. Verification & Run Instructions

To reproduce the data pipeline end-to-end with a single command:
```bash
python src/pipeline.py
```
Outputs generated:
* `data/processed/analysis_ready.parquet` (compressed binary format for fast model training)
* `data/processed/analysis_ready.csv` (human-inspectable tabular format)
* `reports/data_quality_report.md` (this audit memorandum)
