"""Tests for live forecast validation returned by the FastAPI forecast path."""

from datetime import date, timedelta

from backend.api.forecast import (
    DemandRecord,
    ForecastRequest,
    evaluate_forecast,
    predict_forecast,
)


def test_four_week_history_returns_honest_rolling_origin_metrics():
    evaluation = evaluate_forecast([30.0, 35.0, 40.0, 45.0])

    assert evaluation["available"] is True
    assert evaluation["method"] == "rolling_origin_one_step"
    assert evaluation["history_weeks"] == 4
    assert evaluation["validated_folds"] == 2
    assert evaluation["limited_history"] is True
    assert evaluation["model"] == "hybrid_trend_seasonal"
    assert isinstance(evaluation["mae"], float)
    assert isinstance(evaluation["rmse"], float)
    assert isinstance(evaluation["mape"], float)


def test_dashboard_twenty_eight_day_input_returns_validation_metrics():
    start = date(2026, 8, 3)
    request = ForecastRequest(
        data=[
            DemandRecord(
                date=(start + timedelta(days=offset)).isoformat(),
                sku_id="SKU001",
                units_sold=float(3 + (offset % 5)),
            )
            for offset in range(28)
        ]
    )

    response = predict_forecast(request)
    evaluation = response["evaluation"][0]

    assert response["status"] == "success"
    assert len(response["forecast"]) == 6
    assert evaluation["available"] is True
    assert evaluation["history_weeks"] == 4
    assert evaluation["validated_folds"] == 2
    assert {"mae", "rmse", "mape"}.issubset(evaluation)
