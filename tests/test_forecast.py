"""
Automated unit and integration tests for Foresight AI Demand Forecasting Pipeline.
"""

import os
import sys
import json
import pytest
import numpy as np
import pandas as pd

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.forecast_model import (
    calculate_wape,
    calculate_normalized_bias,
    calculate_metrics,
    ForesightForecaster
)


def test_wape_and_bias_calculation():
    actual = np.array([100.0, 200.0, 300.0, 400.0])
    predicted = np.array([110.0, 190.0, 330.0, 380.0])

    # sum(|y - y_hat|) = |100-110| + |200-190| + |300-330| + |400-380| = 10 + 10 + 30 + 20 = 70
    # sum(y) = 1000. WAPE = 70 / 1000 * 100 = 7.0%
    wape = calculate_wape(actual, predicted)
    assert round(wape, 2) == 7.00

    # sum(y_hat - y) = 10 - 10 + 30 - 20 = +10. Normalized Bias = 10 / 1000 * 100 = +1.0%
    bias = calculate_normalized_bias(actual, predicted)
    assert round(bias, 2) == 1.00

    metrics = calculate_metrics(actual, predicted)
    assert metrics["wape"] == 7.00
    assert metrics["bias"] == 1.00
    assert metrics["mae"] == 17.50


def test_wape_zero_actuals():
    actual = np.array([0.0, 0.0])
    predicted = np.array([0.0, 0.0])
    assert calculate_wape(actual, predicted) == 0.0
    assert calculate_normalized_bias(actual, predicted) == 0.0


def test_seasonal_naive_logic():
    history = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0])
    # Last 4 values are: 50, 60, 70, 80
    preds = ForesightForecaster.seasonal_naive_predict(history, horizon=6, season_length=4)
    expected = np.array([50.0, 60.0, 70.0, 80.0, 50.0, 60.0])
    np.testing.assert_array_equal(preds, expected)


def test_feature_engineering_no_leakage():
    # Construct small test DataFrame
    dates = pd.date_range("2025-01-05", periods=16, freq="W-SUN")
    test_df = pd.DataFrame({
        "sku_id": ["SKU-001"] * 16,
        "week_end_date": dates,
        "units_sold": [float(i * 10) for i in range(1, 17)],
        "promo_flag": [0] * 16,
        "is_holiday": [0] * 16,
        "category": ["Decor"] * 16,
        "subcategory": ["Vases"] * 16,
        "season": ["Winter"] * 16
    })

    forecaster = ForesightForecaster()
    feat_df = forecaster.engineer_features(test_df)

    # For any row i, lag_1 is the previous week's demand, and rolling_mean_4 is the mean of lag_1..lag_4
    for i in range(len(feat_df)):
        assert feat_df.loc[i, "lag_1"] != feat_df.loc[i, "units_sold"]  # No lookahead
        # rolling_mean_4 equals the average of the 4 prior lags
        expected_roll4 = np.mean([feat_df.loc[i, f"lag_{k}"] for k in range(1, 5)])
        assert abs(feat_df.loc[i, "rolling_mean_4"] - expected_roll4) < 1e-2


def test_forecast_pipeline_execution(tmp_path):
    # Integration test using actual analysis_ready.parquet
    data_path = "data/processed/analysis_ready.parquet"
    if not os.path.exists(data_path):
        pytest.skip("analysis_ready.parquet not found; run pipeline first.")

    models_dir = tmp_path / "models"
    reports_dir = tmp_path / "reports"

    forecaster = ForesightForecaster(
        data_path=data_path,
        models_dir=str(models_dir),
        reports_dir=str(reports_dir),
        horizon_weeks=6
    )

    forecast_df = forecaster.run()

    # 1. Assertions on output DataFrame
    assert len(forecast_df) > 0
    expected_cols = [
        "sku_id", "forecast_week", "horizon_step", "predicted_demand",
        "baseline_prediction", "lower_80", "upper_80", "model_used"
    ]
    for col in expected_cols:
        assert col in forecast_df.columns

    # 2. Non-negativity assertions
    assert (forecast_df["predicted_demand"] >= 0).all()
    assert (forecast_df["lower_80"] >= 0).all()
    assert (forecast_df["upper_80"] >= forecast_df["lower_80"]).all()

    # 3. Assertions on saved artifacts
    assert os.path.exists(models_dir / "lgb_forecast_model.pkl")
    assert os.path.exists(models_dir / "forecast_predictions.parquet")
    assert os.path.exists(models_dir / "forecast_predictions.csv")
    assert os.path.exists(models_dir / "forecast_metadata.json")
    assert os.path.exists(reports_dir / "model_evaluation_report.md")

    # 4. Check metadata JSON
    with open(models_dir / "forecast_metadata.json", "r") as f:
        meta = json.load(f)
    assert meta["horizon_weeks"] == 6
    assert meta["num_skus_forecasted"] == 195
    assert "baseline_overall" in meta["cross_validation"]
    assert "lgb_overall" in meta["cross_validation"]

    # 5. Check report content
    with open(reports_dir / "model_evaluation_report.md", "r", encoding="utf-8") as f:
        report_text = f.read()
    assert "Executive Readout" in report_text
    assert "Rolling-Origin CV" in report_text
    assert "WAPE" in report_text
