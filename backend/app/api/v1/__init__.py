from fastapi import APIRouter

from app.api.v1.assets import router as assets_router
from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.users import router as users_router

router = APIRouter()
router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(users_router, prefix="/users", tags=["users"])
router.include_router(tickets_router, prefix="/tickets", tags=["tickets"])
router.include_router(categories_router, prefix="/categories", tags=["categories"])
router.include_router(assets_router, prefix="/assets", tags=["assets"])
