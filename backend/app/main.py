from fastapi import FastAPI

app = FastAPI(
    title="Helpdesk El Constructor",
    description="Sistema de tickets IT interno para Almacén El Constructor",
    version="1.0.0",
)


@app.get("/health", tags=["infra"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "helpdesk-el-constructor"}
