"""
Automated unit and integration tests for Foresight AI Data Pipeline.
"""

import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import pandas as pd
import numpy as np

from src.pipeline import ForesightDataPipeline


def test_normalize_sku_id():
    test_series = pd.Series([" sku-001 ", "SKU_002", "sku-003", " SKU-004 "])
    normalized = ForesightDataPipeline.normalize_sku_id(test_series)
    expected = pd.Series(["SKU-001", "SKU-002", "SKU-003", "SKU-004"])
    pd.testing.assert_series_equal(normalized, expected)


def test_clean_sku_master():
    pipeline = ForesightDataPipeline()
    raw_sku = pd.DataFrame([
        {"sku_id": "sku-001", "category": "furnishings", "subcategory": "living room", "launch_date": "2024-01-01", "unit_cost": 500.0, "list_price": 1000.0},
        {"sku_id": "SKU-001", "category": "Furnishings", "subcategory": "Living Room", "launch_date": "2024-01-01", "unit_cost": 500.0, "list_price": 1000.0},  # Dupe
        {"sku_id": "SKU-002", "category": "HOME DÉCOR", "subcategory": "RUGS", "launch_date": "2024-02-01", "unit_cost": -50.0, "list_price": 600.0},  # Negative cost
        {"sku_id": "SKU-003", "category": "Decor", "subcategory": "Vases", "launch_date": "2024-03-01", "unit_cost": 1500.0, "list_price": 1000.0},  # Cost > price
    ])

    cleaned = pipeline.clean_sku_master(raw_sku)

    assert len(cleaned) == 3  # Duplicate dropped
    assert cleaned.loc[cleaned["sku_id"] == "SKU-001", "category"].iloc[0] == "Furnishings"
    assert cleaned.loc[cleaned["sku_id"] == "SKU-002", "unit_cost"].iloc[0] > 0
    assert cleaned.loc[cleaned["sku_id"] == "SKU-003", "unit_cost"].iloc[0] < 1000.0


def test_clean_inventory_snapshots():
    pipeline = ForesightDataPipeline()
    dummy_sku_master = pd.DataFrame([{"sku_id": "SKU-001", "category": "Furnishings"}])

    raw_inv = pd.DataFrame([
        {"date": "2026-01-01", "sku_id": "sku-001", "on_hand_units": -5, "on_order_units": 10, "lead_time_days": 14, "reorder_point": 20},
        {"date": "2026-01-01", "sku_id": "SKU-001", "on_hand_units": 15, "on_order_units": 0, "lead_time_days": np.nan, "reorder_point": 20},  # Dupe & nan lead time
        {"date": "INVALID", "sku_id": "SKU-001", "on_hand_units": 10, "on_order_units": 0, "lead_time_days": 7, "reorder_point": 20}  # Invalid date
    ])

    cleaned = pipeline.clean_inventory_snapshots(raw_inv, dummy_sku_master)

    assert len(cleaned) == 1
    assert cleaned.iloc[0]["on_hand_units"] == 0  # Clamped to 0
    assert not pd.isna(cleaned.iloc[0]["lead_time_days"])


def test_clean_sales_daily():
    pipeline = ForesightDataPipeline()
    dummy_sku_master = pd.DataFrame([
        {"sku_id": "SKU-001", "category": "Furnishings", "list_price": 1000.0}
    ])

    raw_sales = pd.DataFrame([
        # Valid sale
        {"date": "2026-01-01", "sku_id": "SKU-001", "units_sold": 5, "revenue": 5000.0, "unit_price": 1000.0, "promo_flag": 0},
        # Missing revenue & promo flag
        {"date": "2026-01-02", "sku_id": "sku-001", "units_sold": 3, "revenue": np.nan, "unit_price": 900.0, "promo_flag": np.nan},
        # Negative units (return)
        {"date": "2026-01-03", "sku_id": "SKU-001", "units_sold": -2, "revenue": -2000.0, "unit_price": 1000.0, "promo_flag": 0},
        # Orphan SKU
        {"date": "2026-01-04", "sku_id": "SKU-999", "units_sold": 10, "revenue": 5000.0, "unit_price": 500.0, "promo_flag": 0},
        # Invalid date
        {"date": "2026-02-30", "sku_id": "SKU-001", "units_sold": 4, "revenue": 4000.0, "unit_price": 1000.0, "promo_flag": 0},
    ])

    cleaned = pipeline.clean_sales_daily(raw_sales, dummy_sku_master)

    # Only 2026-01-01 and 2026-01-02 should remain
    assert len(cleaned) == 2
    assert "SKU-999" not in cleaned["sku_id"].values
    assert (cleaned["units_sold"] >= 0).all()
    # Missing revenue recalculated
    row2 = cleaned[cleaned["date"] == "2026-01-02"].iloc[0]
    assert row2["revenue"] == 2700.0
    assert row2["promo_flag"] == 0


def test_end_to_end_pipeline(tmp_path):
    # Setup temporary directories
    raw_dir = tmp_path / "raw"
    processed_dir = tmp_path / "processed"
    reports_dir = tmp_path / "reports"

    # Generate test raw datasets in tmp_path
    from src.generate_raw_data import generate_all_raw_data
    generate_all_raw_data(output_dir=str(raw_dir))

    # Run pipeline
    pipeline = ForesightDataPipeline(
        raw_dir=str(raw_dir),
        processed_dir=str(processed_dir),
        reports_dir=str(reports_dir)
    )
    analysis_ready = pipeline.run()

    # Assertions on pipeline outputs
    assert len(analysis_ready) > 0
    assert os.path.exists(processed_dir / "analysis_ready.parquet")
    assert os.path.exists(processed_dir / "analysis_ready.csv")
    assert os.path.exists(reports_dir / "data_quality_report.md")

    # Verify key columns exist
    required_cols = [
        "week_end_date", "sku_id", "units_sold", "revenue", "category",
        "lag_1", "lag_2", "rolling_mean_4", "unit_cost", "list_price"
    ]
    for col in required_cols:
        assert col in analysis_ready.columns

    # Verify no negative units
    assert (analysis_ready["units_sold"] >= 0).all()

    # Verify data quality report is non-empty
    with open(reports_dir / "data_quality_report.md", "r", encoding="utf-8") as f:
        report_text = f.read()
    assert "Executive Summary" in report_text
    assert "Data Quality Issues Catalog" in report_text
