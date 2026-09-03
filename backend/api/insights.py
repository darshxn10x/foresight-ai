from fastapi import APIRouter
from pydantic import BaseModel
import math


router = APIRouter(
    prefix="/insights",
    tags=["AI Insights"]
)


class InsightRequest(BaseModel):
    sku_id: str
    current_stock: int
    predicted_demand: int
    lead_time_days: int = 7
    safety_stock: int = 10


@router.post("/generate")
def generate_insight(request: InsightRequest):

    stock = request.current_stock
    weekly_demand = request.predicted_demand
    lead_time = request.lead_time_days
    safety = request.safety_stock

    # ---------------------------------------------
    # Demand calculations
    # ---------------------------------------------

    daily_demand = weekly_demand / 7

    lead_time_demand = daily_demand * lead_time

    reorder_point = math.ceil(
        lead_time_demand + safety
    )

    stock_gap = reorder_point - stock

    # ---------------------------------------------
    # Risk analysis
    # ---------------------------------------------

    if stock < lead_time_demand:

        risk = "critical"

        message = (
            f"{request.sku_id} is at critical stockout risk. "
            f"Current stock is {stock} units, while approximately "
            f"{math.ceil(lead_time_demand)} units are expected to be "
            f"needed during the {lead_time}-day supplier lead time."
        )

        action = (
            f"Immediate reorder recommended. "
            f"Order at least {max(0, stock_gap)} additional units "
            f"to reach the reorder point of {reorder_point} units."
        )

    elif stock < reorder_point:

        risk = "warning"

        message = (
            f"{request.sku_id} has a potential inventory shortage. "
            f"Current stock is {stock} units, while the calculated "
            f"reorder point is {reorder_point} units based on "
            f"{lead_time}-day lead time and {safety} units of safety stock."
        )

        action = (
            f"Consider ordering {max(0, stock_gap)} additional units "
            f"to restore the recommended inventory level."
        )

    else:

        risk = "healthy"

        message = (
            f"{request.sku_id} has sufficient inventory. "
            f"Current stock of {stock} units is above the calculated "
            f"reorder point of {reorder_point} units."
        )

        action = (
            "No immediate reorder required. "
            "Continue monitoring demand and inventory levels."
        )

    return {
        "status": "success",
        "sku_id": request.sku_id,
        "risk": risk,
        "current_stock": stock,
        "predicted_demand": weekly_demand,
        "lead_time_days": lead_time,
        "daily_demand": round(daily_demand, 2),
        "lead_time_demand": round(lead_time_demand, 2),
        "safety_stock": safety,
        "reorder_point": reorder_point,
        "stock_gap": max(0, stock_gap),
        "insight": message,
        "recommended_action": action
    }