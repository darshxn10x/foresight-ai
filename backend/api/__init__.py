from fastapi import APIRouter

router = APIRouter(
    prefix="/forecast",
    tags=["Forecast"]
)


@router.get("/")
def forecast_status():
    return {
        "message": "Forecast API is ready",
        "status": "active"
    }