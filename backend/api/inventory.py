from fastapi import APIRouter
from pydantic import BaseModel
import math


router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


class InventoryRequest(BaseModel):
    sku_id: str
    current_stock: int
    predicted_demand: int
    lead_time_days: int = 7
    safety_stock: int = 10


@router.post("/analyze")
def analyze_inventory(request: InventoryRequest):

    stock = request.current_stock
    weekly_demand = request.predicted_demand
    lead_time = request.lead_time_days
    safety = request.safety_stock

    # ---------------------------------------------
    # Demand calculations
    # ---------------------------------------------

    daily_demand = weekly_demand / 7

    lead_time_demand = (
        daily_demand * lead_time
    )

    reorder_point = math.ceil(
        lead_time_demand + safety
    )

    recommended_order = max(
        0,
        reorder_point - stock
    )

    # ---------------------------------------------
    # Risk analysis
    # ---------------------------------------------

    if stock < lead_time_demand:

        risk = "critical"

    elif stock < reorder_point:

        risk = "warning"

    else:

        risk = "healthy"

    # ---------------------------------------------
    # Recommendation
    # ---------------------------------------------

    if risk == "critical":

        recommendation = (
            "Immediate reorder recommended. "
            "Current stock may not cover demand "
            "during the supplier lead time."
        )

    elif risk == "warning":

        recommendation = (
            "Inventory is below the recommended "
            "reorder point. Consider replenishment."
        )

    else:

        recommendation = (
            "Inventory level is healthy. "
            "No immediate reorder is required."
        )

    # ---------------------------------------------
    # Response
    # ---------------------------------------------

    return {

        "status": "success",

        "sku_id": request.sku_id,

        "current_stock": stock,

        "predicted_demand": weekly_demand,

        "lead_time_days": lead_time,

        "daily_demand": round(
            daily_demand,
            2
        ),

        "lead_time_demand": round(
            lead_time_demand,
            2
        ),

        "safety_stock": safety,

        "reorder_point": reorder_point,

        "recommended_order": recommended_order,

        "risk": risk,

        "recommendation": recommendation
    }