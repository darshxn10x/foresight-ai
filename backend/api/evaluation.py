from fastapi import APIRouter
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from .forecast import ForecastRequest, seasonal_naive_forecast, ml_forecast

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


def wape(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    denom = np.abs(actual).sum()
    return round(float(np.abs(actual - predicted).sum() / denom * 100), 2) if denom else None


def bias(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    denom = np.abs(actual).sum()
    return round(float((predicted - actual).sum() / denom * 100), 2) if denom else None


def mape(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)
    mask = actual != 0
    return round(float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100), 2) if mask.any() else None


def production_one_step(history):
    pred = ml_forecast(history, 1)
    if pred is not None:
        return float(pred[0]), "random_forest"
    return None, "insufficient_history"


@router.post("/rolling-origin")
def rolling_origin(request: ForecastRequest):
    df = pd.DataFrame([r.model_dump() for r in request.data])
    if df.empty:
        return {"status": "error", "message": "No demand data provided"}
    df["date"] = pd.to_datetime(df["date"])
    weekly = (df.set_index("date").groupby("sku_id")["units_sold"]
              .resample("W-SUN").sum().reset_index())

    results = []
    for sku, group in weekly.groupby("sku_id"):
        history = group.sort_values("date")["units_sold"].astype(float).tolist()
        actuals, prod, baseline = [], [], []
        # Multiple expanding-window origins; never random split.
        for end in range(8, len(history)):
            train = history[:end]
            p, _ = production_one_step(train)
            b = seasonal_naive_forecast(train, 1, season_length=4)
            if p is None or not b:
                continue
            actuals.append(history[end]); prod.append(p); baseline.append(b[0])
        if not actuals:
            results.append({"sku_id": sku, "available": False,
                            "message": "Need at least 9 weekly observations for rolling-origin validation."})
            continue
        pw, bw = wape(actuals, prod), wape(actuals, baseline)
        results.append({
            "sku_id": sku, "available": True, "folds": len(actuals),
            "production_model": "random_forest",
            "production_wape": pw, "seasonal_naive_wape": bw,
            "production_bias": bias(actuals, prod),
            "production_mape": mape(actuals, prod),
            "beats_baseline": pw < bw,
            "improvement_pct": round((bw - pw) / bw * 100, 2) if bw else None,
        })
    return {"status": "success", "method": "rolling_origin", "primary_metric": "WAPE", "results": results}
