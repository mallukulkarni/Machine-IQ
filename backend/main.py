from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.ml.anomaly_detector import detector
from app.core.auth import require_authenticated_user
from app.api import routes_materials, routes_sensors, routes_ai, routes_factory, routes_maintenance, routes_reports, routes_overview, routes_alerts

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    detector.train()
    yield

is_production = settings.ENVIRONMENT.lower() == "production"
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    debug=settings.DEBUG and not is_production,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

api_dependencies = [Depends(require_authenticated_user)]
app.include_router(routes_overview.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_materials.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_sensors.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_sensors.websocket_router, prefix="/api/v1")
app.include_router(routes_ai.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_factory.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_maintenance.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_reports.router, prefix="/api/v1", dependencies=api_dependencies)
app.include_router(routes_alerts.router, prefix="/api/v1", dependencies=api_dependencies)

@app.get("/health")
@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
