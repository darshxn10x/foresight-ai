"""FORESIGHT AI - Zidio model validation report.

Run from repository root:
    python reports/model_validation.py

Uses the supplied daily sales data to compare the production Random Forest
forecast against the required Seasonal Naive baseline using rolling-origin
one-step-ahead validation. Metrics: WAPE (primary), Bias and MAPE.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

ROOT = Path(__file__).resolve().parents[1]
SALES = ROOT / "data" / "raw" / "sales_daily.csv"
OUT = ROOT / "reports" / "model_validation.csv"


def wape(actual, pred):
    actual, pred = np.asarray(actual, float), np.asarray(pred, float)
    denom = np.abs(actual).sum()
    return float(np.abs(actual - pred).sum() / denom * 100) if denom else np.nan


def bias(actual, pred):
    actual, pred = np.asarray(actual, float), np.asarray(pred, float)
    denom = np.abs(actual).sum()
    return float((pred - actual).sum() / denom * 100) if denom else np.nan


def mape(actual, pred):
    actual, pred = np.asarray(actual, float), np.asarray(pred, float)
    mask = actual != 0
    return float(np.mean(np.abs((actual[mask] - pred[mask]) / actual[mask])) * 100) if mask.any() else np.nan


def rf_predict(history):
    if len(history) < 8:
        return None
    df = pd.DataFrame({"y": history})
    df["lag1"] = df.y.shift(1)
    df["lag2"] = df.y.shift(2)
    df["lag3"] = df.y.shift(3)
    df["roll3"] = df.y.shift(1).rolling(3).mean()
    df["trend"] = np.arange(len(df))
    df = df.dropna()
    if len(df) < 4:
        return None
    features = ["lag1", "lag2", "lag3", "roll3", "trend"]
    model = RandomForestRegressor(n_estimators=200, max_depth=6, random_state=42)
    model.fit(df[features], df.y)
    x = pd.DataFrame([{
        "lag1": history[-1], "lag2": history[-2], "lag3": history[-3],
        "roll3": np.mean(history[-3:]), "trend": len(history)
    }])
    return float(max(0, model.predict(x)[0]))


def seasonal_naive(history, season=4):
    if len(history) < season:
        return None
    return float(history[-season])


def main():
    if not SALES.exists():
        raise FileNotFoundError(SALES)
    df = pd.read_csv(SALES)
    required = {"date", "sku_id", "units_sold"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")
    df.date = pd.to_datetime(df.date)
    weekly = (df.set_index("date").groupby("sku_id")["units_sold"]
              .resample("W-SUN").sum().reset_index())

    rows = []
    for sku, g in weekly.groupby("sku_id"):
        y = g.sort_values("date").units_sold.astype(float).tolist()
        # Rolling-origin: evaluate the next observation at multiple origins.
        actuals, rf_preds, sn_preds = [], [], []
        for end in range(8, len(y)):
            history = y[:end]
            rf = rf_predict(history)
            sn = seasonal_naive(history)
            if rf is None or sn is None:
                continue
            actuals.append(y[end]); rf_preds.append(rf); sn_preds.append(sn)
        if not actuals:
            continue
        rows.append({
            "sku_id": sku,
            "folds": len(actuals),
            "production_model": "random_forest",
            "production_wape_pct": round(wape(actuals, rf_preds), 2),
            "seasonal_naive_wape_pct": round(wape(actuals, sn_preds), 2),
            "production_bias_pct": round(bias(actuals, rf_preds), 2),
            "production_mape_pct": round(mape(actuals, rf_preds), 2),
            "beats_baseline": wape(actuals, rf_preds) < wape(actuals, sn_preds),
        })
    report = pd.DataFrame(rows)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    report.to_csv(OUT, index=False)
    print(report.to_string(index=False))
    if not report.empty:
        print("\nPortfolio WAPE — Production:", round(wape(report.production_wape_pct, np.zeros(len(report))), 2))
        print("Report written to:", OUT)


if __name__ == "__main__":
    main()
