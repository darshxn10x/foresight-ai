from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.forecast import router as forecast_router
from backend.api.inventory import router as inventory_router
from backend.api.insights import router as insights_router
from backend.api.evaluation import router as evaluation_router

BASE_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Foresight AI",
    description="AI-Powered Demand Forecasting & Inventory Intelligence Platform",
    version="1.0.2"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(forecast_router)
app.include_router(inventory_router)
app.include_router(insights_router)
app.include_router(evaluation_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "foresight-ai-api"}


@app.get("/")
def root():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Foresight AI API is running", "status": "healthy"}


# Serve the production dashboard from the same service as the API.
# API routes are registered above, so they continue to take precedence.
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
