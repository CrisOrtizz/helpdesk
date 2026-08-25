from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.api.v1.ws import router as ws_router
from app.core.config import settings
from app.core.scheduler import check_sla_breaches, scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        check_sla_breaches,
        "interval",
        minutes=15,
        id="sla_check",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="Helpdesk El Constructor",
    description="Sistema de tickets IT interno para Almacén El Constructor",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)
app.include_router(ws_router)


@app.get("/health", tags=["infra"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "helpdesk-el-constructor"}
