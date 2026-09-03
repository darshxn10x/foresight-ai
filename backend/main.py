from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.forecast import router as forecast_router
from api.inventory import router as inventory_router
from api.insights import router as insights_router
from api.evaluation import router as evaluation_router

app = FastAPI(
    title="Foresight AI",
    description="AI-Powered Demand Forecasting & Inventory Intelligence Platform",
    version="1.0.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(forecast_router)
app.include_router(inventory_router)
app.include_router(insights_router)
app.include_router(evaluation_router)

@app.get("/")
def root():
    return {"message": "Foresight AI API is running", "status": "healthy"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
