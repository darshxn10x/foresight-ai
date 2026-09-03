from fastapi import APIRouter
import numpy as np
import pandas as pd
from pathlib import Path
from .forecast import ForecastRequest, seasonal_naive_forecast, ml_forecast

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "raw" / "sales_daily.csv"

def wape(actual, predicted):
    a=np.asarray(actual,float); p=np.asarray(predicted,float); d=np.abs(a).sum()
    return round(float(np.abs(a-p).sum()/d*100),2) if d else None

def bias(actual, predicted):
    a=np.asarray(actual,float); p=np.asarray(predicted,float); d=np.abs(a).sum()
    return round(float((p-a).sum()/d*100),2) if d else None

def mape(actual, predicted):
    a=np.asarray(actual,float); p=np.asarray(predicted,float); mask=a!=0
    return round(float(np.mean(np.abs((a[mask]-p[mask])/a[mask]))*100),2) if mask.any() else None

def production_one_step(history):
    pred=ml_forecast(history,1)
    return (float(pred[0]),"random_forest") if pred is not None else (None,"insufficient_history")

def evaluate_frame(df):
    df=df.copy(); df["date"]=pd.to_datetime(df["date"])
    weekly=(df.set_index("date").groupby("sku_id")["units_sold"].resample("W-SUN").sum().reset_index())
    aa=[]; pp=[]; bb=[]; results=[]
    for sku,g in weekly.groupby("sku_id"):
        h=g.sort_values("date")["units_sold"].astype(float).tolist(); actual=[]; prod=[]; base=[]
        for end in range(8,len(h)):
            p,_=production_one_step(h[:end]); b=seasonal_naive_forecast(h[:end],1,season_length=4)
            if p is not None and b: actual.append(h[end]); prod.append(p); base.append(b[0])
        if actual:
            aa+=actual; pp+=prod; bb+=base
            pw,bw=wape(actual,prod),wape(actual,base)
            results.append({"sku_id":sku,"folds":len(actual),"production_wape":pw,"seasonal_naive_wape":bw,"production_bias":bias(actual,prod),"production_mape":mape(actual,prod),"beats_baseline":pw<bw,"improvement_pct":round((bw-pw)/bw*100,2) if bw else None})
    if not aa: return {"available":False,"message":"Insufficient weekly history for rolling-origin validation."}
    pw,bw=wape(aa,pp),wape(aa,bb)
    return {"available":True,"method":"rolling-origin","primary_metric":"WAPE","production_model":"Random Forest","production_wape":pw,"seasonal_naive_wape":bw,"production_bias":bias(aa,pp),"production_mape":mape(aa,pp),"beats_baseline":pw<bw,"improvement_pct":round((bw-pw)/bw*100,2) if bw else None,"validated_folds":len(aa),"sku_results":results}

@router.post("/rolling-origin")
def rolling_origin(request: ForecastRequest):
    df=pd.DataFrame([r.model_dump() for r in request.data])
    if df.empty: return {"status":"error","message":"No demand data provided"}
    return {"status":"success",**evaluate_frame(df)}

@router.get("/summary")
def evaluation_summary():
    if not DATA_PATH.exists(): return {"status":"error","available":False,"message":"sales_daily.csv not found"}
    try:
        df=pd.read_csv(DATA_PATH); required={"date","sku_id","units_sold"}
        if not required.issubset(df.columns): return {"status":"error","available":False,"message":"sales_daily.csv has unexpected columns"}
        return {"status":"success",**evaluate_frame(df)}
    except Exception as exc: return {"status":"error","available":False,"message":str(exc)}
