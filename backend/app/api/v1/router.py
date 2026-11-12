from fastapi import APIRouter

from app.api.v1 import health
from app.modules.auth.router import router as auth_router
from app.modules.employees.router import provider_router as provider_employees_router
from app.modules.vehicles.router import provider_router as provider_vehicles_router
from app.modules.vehicles.router import public_router as vehicles_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router)
api_router.include_router(vehicles_router)
api_router.include_router(provider_vehicles_router)
api_router.include_router(provider_employees_router)
