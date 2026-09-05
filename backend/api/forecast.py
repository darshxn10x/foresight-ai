from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

import pandas as pd
import numpy as np

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error


router = APIRouter(
    prefix="/forecast",
    tags=["Forecast"]
)


# ==========================================================
# Request Models
# ==========================================================

class DemandRecord(BaseModel):
    date: str
    sku_id: str
    units_sold: float


class ForecastRequest(BaseModel):
    data: List[DemandRecord]
    horizon_weeks: int = 6


# ==========================================================
# Weekly Demand
# ==========================================================

def weekly_demand(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert daily demand into weekly SKU demand.

    Weeks end on Sunday.
    """

    df = df.copy()

    df["date"] = pd.to_datetime(df["date"])

    weekly = (
        df.set_index("date")
        .groupby("sku_id")["units_sold"]
        .resample("W-SUN")
        .sum()
        .reset_index()
    )

    return weekly


# ==========================================================
# Remove Incomplete Current Week
# ==========================================================

def remove_incomplete_week(
    weekly: pd.DataFrame,
    original_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Prevent a partially recorded current week from
    contaminating the forecasting model.
    """

    weekly = weekly.copy()

    original_df = original_df.copy()
    original_df["date"] = pd.to_datetime(original_df["date"])

    last_date = original_df["date"].max()

    # Sunday = 6
    days_to_sunday = 6 - last_date.weekday()

    week_end = (
        last_date +
        pd.Timedelta(days=days_to_sunday)
    ).normalize()

    # If the supplied data does not reach Sunday,
    # remove that incomplete week.
    if last_date < week_end:
        weekly = weekly[
            weekly["date"] < week_end
        ]

    return weekly


# ==========================================================
# Feature Engineering
# ==========================================================

def create_features(values: List[float]) -> pd.DataFrame:
    """
    Create time-series features for ML forecasting.
    """

    df = pd.DataFrame({
        "demand": values
    })

    df["lag_1"] = df["demand"].shift(1)
    df["lag_2"] = df["demand"].shift(2)
    df["lag_3"] = df["demand"].shift(3)

    df["rolling_mean_3"] = (
        df["demand"]
        .shift(1)
        .rolling(3)
        .mean()
    )

    df["trend"] = np.arange(len(df))

    return df.dropna()


# ==========================================================
# Trend Forecast
# ==========================================================

def trend_forecast(
    history: List[float],
    horizon: int
) -> List[float]:

    if len(history) == 0:
        return [0.0] * horizon

    if len(history) == 1:
        return [
            max(0.0, round(history[0], 2))
            for _ in range(horizon)
        ]

    x = np.arange(len(history))
    y = np.array(history, dtype=float)

    slope, intercept = np.polyfit(x, y, 1)

    predictions = []

    for i in range(
        len(history),
        len(history) + horizon
    ):

        prediction = (
            intercept +
            slope * i
        )

        predictions.append(
            max(0.0, round(float(prediction), 2))
        )

    return predictions


# ==========================================================
# Seasonal Naive Forecast
# ==========================================================

def seasonal_naive_forecast(
    history: List[float],
    horizon: int,
    season_length: int = 4
) -> List[float]:

    if len(history) < season_length:
        return trend_forecast(
            history,
            horizon
        )

    predictions = []

    for i in range(horizon):

        index = (
            len(history)
            - season_length
            + (i % season_length)
        )

        prediction = history[index]

        predictions.append(
            max(
                0.0,
                round(float(prediction), 2)
            )
        )

    return predictions


# ==========================================================
# ML Forecast
# ==========================================================

def ml_forecast(
    history: List[float],
    horizon: int
):
    """
    Random Forest based demand forecasting.

    Requires enough historical observations to
    construct lag features reliably.
    """

    feature_data = create_features(history)

    if len(feature_data) < 4:
        return None

    feature_columns = [
        "lag_1",
        "lag_2",
        "lag_3",
        "rolling_mean_3",
        "trend"
    ]

    X = feature_data[feature_columns]
    y = feature_data["demand"]

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        max_depth=6
    )

    model.fit(X, y)

    working_history = list(history)
    predictions = []

    for _ in range(horizon):

        lag_1 = working_history[-1]
        lag_2 = working_history[-2]
        lag_3 = working_history[-3]

        rolling_mean = np.mean(
            working_history[-3:]
        )

        trend = len(working_history)

        X_future = pd.DataFrame([{
            "lag_1": lag_1,
            "lag_2": lag_2,
            "lag_3": lag_3,
            "rolling_mean_3": rolling_mean,
            "trend": trend
        }])

        prediction = model.predict(
            X_future
        )[0]

        prediction = max(
            0.0,
            round(float(prediction), 2)
        )

        predictions.append(prediction)

        working_history.append(prediction)

    return predictions


# ==========================================================
# Model Selection
# ==========================================================

def generate_forecast(
    history: List[float],
    horizon: int
):

    # Limited data → trend + seasonal approach
    if len(history) < 8:

        trend_predictions = trend_forecast(
            history,
            horizon
        )

        seasonal_predictions = seasonal_naive_forecast(
            history,
            horizon
        )

        # Blend both approaches
        predictions = [
            round(
                (
                    trend_predictions[i]
                    * 0.7
                ) +
                (
                    seasonal_predictions[i]
                    * 0.3
                ),
                2
            )
            for i in range(horizon)
        ]

        return predictions, "hybrid_trend_seasonal"

    # Sufficient history → ML
    ml_predictions = ml_forecast(
        history,
        horizon
    )

    if ml_predictions is not None:

        return (
            ml_predictions,
            "random_forest"
        )

    return (
        trend_forecast(
            history,
            horizon
        ),
        "trend_fallback"
    )

# ==========================================================
# Model Evaluation
# ==========================================================

def calculate_mape(actual, predicted):
    """
    Calculate Mean Absolute Percentage Error.

    Zero actual values are ignored because percentage
    error is undefined when actual demand is zero.
    """

    actual = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)

    mask = actual != 0

    if not np.any(mask):
        return None

    return float(
        np.mean(
            np.abs(
                (actual[mask] - predicted[mask])
                / actual[mask]
            )
        ) * 100
    )


MIN_EVALUATION_TRAINING_WEEKS = 2


def evaluate_forecast(
    history: List[float],
    current_model: str | None = None
):
    """Evaluate one-week forecasts with expanding-window validation.

    Each validation point is predicted using only the demand observed before it.
    Starting with two training weeks makes the evaluation available for the
    dashboard's four-week history while returning the number of out-of-sample
    folds used to calculate the metrics.
    """

    history = [float(value) for value in history]
    history_weeks = len(history)

    if history_weeks <= MIN_EVALUATION_TRAINING_WEEKS:
        return {
            "available": False,
            "method": "rolling_origin_one_step",
            "history_weeks": history_weeks,
            "required_weeks": MIN_EVALUATION_TRAINING_WEEKS + 1,
            "message": "At least three complete weekly observations are required for validation."
        }

    actual = []
    predicted = []
    evaluated_models = []

    for cutoff in range(MIN_EVALUATION_TRAINING_WEEKS, history_weeks):
        forecast, model_name = generate_forecast(history[:cutoff], 1)
        actual.append(history[cutoff])
        predicted.append(forecast[0])
        evaluated_models.append(model_name)

    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    mape = calculate_mape(actual, predicted)

    return {
        "available": True,
        "method": "rolling_origin_one_step",
        "model": current_model or evaluated_models[-1],
        "evaluated_models": sorted(set(evaluated_models)),
        "history_weeks": history_weeks,
        "validated_folds": len(actual),
        "limited_history": history_weeks < 8,
        "mae": round(float(mae), 2),
        "rmse": round(float(rmse), 2),
        "mape": round(float(mape), 2) if mape is not None else None
    }
# ==========================================================
# Forecast API
# ==========================================================

@router.get("/")
def forecast_status():

    return {
        "message": "Forecast API is ready",
        "status": "active"
    }


@router.post("/predict")
def predict_forecast(
    request: ForecastRequest
):

    if not request.data:

        return {
            "status": "error",
            "message": "No demand data provided"
        }

    if request.horizon_weeks <= 0:

        return {
            "status": "error",
            "message": "Horizon must be greater than zero"
        }

    # ------------------------------------------------------
    # Convert request into DataFrame
    # ------------------------------------------------------

    df = pd.DataFrame([
        record.model_dump()
        for record in request.data
    ])

    df["date"] = pd.to_datetime(
        df["date"]
    )

    # ------------------------------------------------------
    # Weekly aggregation
    # ------------------------------------------------------

    weekly = weekly_demand(df)

    # Remove incomplete latest week
    weekly = remove_incomplete_week(
        weekly,
        df
    )

    results = []
    evaluations = []

    # ------------------------------------------------------
    # Forecast each SKU
    # ------------------------------------------------------

    for sku_id, sku_data in weekly.groupby(
        "sku_id"
    ):

        sku_data = sku_data.sort_values(
            "date"
        )

        history = (
            sku_data["units_sold"]
            .astype(float)
            .tolist()
        )
        if not history:
            continue
        horizon = request.horizon_weeks

        predictions, model_name = generate_forecast(
            history,
            horizon
        )

        evaluation = evaluate_forecast(
            history,
            current_model=model_name
        )
        evaluations.append({
            "sku_id": sku_id,
            **evaluation
        })

        last_date = sku_data["date"].max()

        # --------------------------------------------------
        # Generate future weeks
        # --------------------------------------------------

        for i, prediction in enumerate(
            predictions,
            start=1
        ):

            forecast_date = (
                last_date +
                pd.Timedelta(weeks=i)
            )

            results.append({

                "sku_id": sku_id,

                "forecast_week":
                    forecast_date.strftime(
                        "%Y-%m-%d"
                    ),

                "predicted_demand":
                    round(
                        float(prediction),
                        2
                    ),

                "model":
                    model_name
            })

    # ------------------------------------------------------
    # Final response
    # ------------------------------------------------------

    return {

    "status": "success",

    "horizon_weeks":
        request.horizon_weeks,

    "forecast":
        results,

    "evaluation":
        evaluations
}
