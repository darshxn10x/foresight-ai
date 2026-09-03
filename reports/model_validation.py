"""Zidio FORESIGHT rolling-origin model validation.

Run from repository root: python reports/model_validation.py
Compares production Random Forest with Seasonal Naive using WAPE (primary),
Bias and MAPE. No random train/test split is used.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

ROOT = Path(__file__).resolve().parents[1]
SALES = ROOT / "data/raw/sales_daily.csv"
OUT = ROOT / "reports/model_validation.csv"


def wape(a, p):
    a, p = np.asarray(a, float), np.asarray(p, float); d = np.abs(a).sum()
    return float(np.abs(a-p).sum()/d*100) if d else np.nan

def bias(a, p):
    a, p = np.asarray(a, float), np.asarray(p, float); d = np.abs(a).sum()
    return float((p-a).sum()/d*100) if d else np.nan

def mape(a, p):
    a, p = np.asarray(a, float), np.asarray(p, float); mask = a != 0
    return float(np.mean(np.abs((a[mask]-p[mask])/a[mask]))*100) if mask.any() else np.nan

def rf_one_step(h):
    if len(h) < 8: return None
    d = pd.DataFrame({"y":h}); d["lag1"]=d.y.shift(1); d["lag2"]=d.y.shift(2); d["lag3"]=d.y.shift(3)
    d["roll3"]=d.y.shift(1).rolling(3).mean(); d["trend"]=np.arange(len(d)); d=d.dropna()
    cols=["lag1","lag2","lag3","roll3","trend"]
    model=RandomForestRegressor(n_estimators=200,max_depth=6,random_state=42).fit(d[cols],d.y)
    x=pd.DataFrame([{"lag1":h[-1],"lag2":h[-2],"lag3":h[-3],"roll3":np.mean(h[-3:]),"trend":len(h)}])
    return float(max(0,model.predict(x)[0]))

def seasonal_one_step(h, season=4):
    return float(h[-season]) if len(h)>=season else None

def main():
    df=pd.read_csv(SALES); df["date"]=pd.to_datetime(df["date"])
    weekly=(df.set_index("date").groupby("sku_id")["units_sold"].resample("W-SUN").sum().reset_index())
    rows=[]
    for sku,g in weekly.groupby("sku_id"):
        y=g.sort_values("date")["units_sold"].astype(float).tolist(); actual=[]; prod=[]; base=[]
        for end in range(8,len(y)):
            h=y[:end]; p=rf_one_step(h); b=seasonal_one_step(h)
            if p is not None and b is not None: actual.append(y[end]); prod.append(p); base.append(b)
        if actual:
            pw,bw=wape(actual,prod),wape(actual,base)
            rows.append({"sku_id":sku,"folds":len(actual),"production_model":"random_forest","production_wape_pct":round(pw,2),"seasonal_naive_wape_pct":round(bw,2),"production_bias_pct":round(bias(actual,prod),2),"production_mape_pct":round(mape(actual,prod),2),"beats_baseline":pw<bw,"improvement_pct":round((bw-pw)/bw*100,2) if bw else np.nan})
    report=pd.DataFrame(rows); OUT.parent.mkdir(exist_ok=True); report.to_csv(OUT,index=False)
    print(report.to_string(index=False)); print(f"\nReport written to: {OUT}")

if __name__ == "__main__": main()
