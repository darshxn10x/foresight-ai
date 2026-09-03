from fastapi import APIRouter
from pydantic import BaseModel
from pathlib import Path
import math
import pandas as pd

router = APIRouter(prefix="/inventory", tags=["Inventory"])

SKU_MASTER = Path(__file__).resolve().parents[2] / "data" / "raw" / "sku_master.csv"

class InventoryRequest(BaseModel):
    sku_id: str
    current_stock: int
    predicted_demand: int
    lead_time_days: int = 7
    safety_stock: int = 10


def _sku_prices(sku_id: str):
    """Read cost/list price from the supplied SKU master when available."""
    if not SKU_MASTER.exists():
        return None, None
    try:
        df = pd.read_csv(SKU_MASTER)
        wanted = str(sku_id).strip().upper().replace("-", "")
        df["norm"] = df["sku_id"].astype(str).str.upper().str.replace("-", "", regex=False)
        row = df[df["norm"] == wanted]
        if row.empty:
            return None, None
        return float(row.iloc[0]["unit_cost"]), float(row.iloc[0]["list_price"])
    except Exception:
        return None, None


@router.post("/analyze")
def analyze_inventory(request: InventoryRequest):
    stock = max(0, request.current_stock)
    weekly_demand = max(0, request.predicted_demand)
    lead_time = max(0, request.lead_time_days)
    safety = max(0, request.safety_stock)

    daily_demand = weekly_demand / 7
    lead_time_demand = daily_demand * lead_time
    reorder_point = math.ceil(lead_time_demand + safety)
    recommended_order = max(0, reorder_point - stock)

    # Four operational decisions required by the FORESIGHT brief.
    if stock < lead_time_demand:
        risk = "critical"
        decision = "REORDER NOW"
    elif stock < reorder_point:
        risk = "warning"
        decision = "REORDER NOW"
    elif stock > weekly_demand * 1.5 and weekly_demand > 0:
        risk = "overstock"
        decision = "MARKDOWN / CLEAR"
    elif weekly_demand > 0 and stock <= weekly_demand * 1.1:
        risk = "watch"
        decision = "WATCH / VOLATILE"
    else:
        risk = "healthy"
        decision = "HEALTHY"

    if decision == "REORDER NOW":
        recommendation = "Immediate replenishment recommended because inventory is below the required reorder level."
    elif decision == "MARKDOWN / CLEAR":
        recommendation = "Inventory materially exceeds projected demand. Consider markdown or clearance to reduce locked capital."
    elif decision == "WATCH / VOLATILE":
        recommendation = "Inventory is close to projected demand. Monitor demand volatility and supplier lead time closely."
    else:
        recommendation = "Inventory level is healthy. No immediate reorder or markdown is required."

    unit_cost, list_price = _sku_prices(request.sku_id)
    shortage_units = max(0, weekly_demand - stock)
    excess_units = max(0, stock - weekly_demand)
    sales_at_risk = shortage_units * list_price if list_price is not None else None
    overstock_capital = excess_units * unit_cost if unit_cost is not None else None

    return {
        "status": "success",
        "sku_id": request.sku_id,
        "current_stock": stock,
        "predicted_demand": weekly_demand,
        "lead_time_days": lead_time,
        "daily_demand": round(daily_demand, 2),
        "lead_time_demand": round(lead_time_demand, 2),
        "safety_stock": safety,
        "reorder_point": reorder_point,
        "recommended_order": recommended_order,
        "risk": risk,
        "decision": decision,
        "recommendation": recommendation,
        "unit_cost": round(unit_cost, 2) if unit_cost is not None else None,
        "list_price": round(list_price, 2) if list_price is not None else None,
        "shortage_units": shortage_units,
        "excess_units": excess_units,
        "sales_at_risk": round(sales_at_risk, 2) if sales_at_risk is not None else None,
        "overstock_capital": round(overstock_capital, 2) if overstock_capital is not None else None,
    }
