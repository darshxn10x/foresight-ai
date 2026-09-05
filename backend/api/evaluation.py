"""Request-specific evaluation endpoints for the production forecaster."""

import pandas as pd
from fastapi import APIRouter

from .forecast import (
    ForecastRequest,
    evaluate_forecast,
    generate_forecast,
    remove_incomplete_week,
    weekly_demand,
)


router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.post("/rolling-origin")
def rolling_origin(request: ForecastRequest):
    """Return live expanding-window metrics for the submitted sales history."""

    df = pd.DataFrame([record.model_dump() for record in request.data])
    if df.empty:
        return {"status": "error", "message": "No demand data provided"}

    weekly = remove_incomplete_week(weekly_demand(df), df)
    evaluations = []
    for sku_id, sku_data in weekly.groupby("sku_id"):
        history = sku_data.sort_values("date")["units_sold"].astype(float).tolist()
        _, current_model = generate_forecast(history, request.horizon_weeks)
        evaluations.append({
            "sku_id": sku_id,
            **evaluate_forecast(history, current_model=current_model)
        })

    return {"status": "success", "evaluation": evaluations}


@router.get("/summary")
def evaluation_summary():
    """Avoid presenting static metrics as if they came from live dashboard data."""

    return {
        "status": "error",
        "available": False,
        "message": "Validation is calculated from the history submitted to /forecast/predict."
    }
