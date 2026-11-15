from fastapi import APIRouter

from app.api.v1 import health
from app.modules.assistant.router import router as assistant_router
from app.modules.auth.router import router as auth_router
from app.modules.availability.provider_router import router as provider_availability_router
from app.modules.availability.router import router as availability_router
from app.modules.bookings.provider_router import router as provider_bookings_router
from app.modules.bookings.router import router as bookings_router
from app.modules.employees.router import provider_router as provider_employees_router
from app.modules.handover.router import router as handover_router
from app.modules.locations.router import router as locations_router
from app.modules.pricing.provider_router import router as provider_pricing_router
from app.modules.pricing.router import router as pricing_router
from app.modules.vehicles.router import provider_router as provider_vehicles_router
from app.modules.vehicles.router import public_router as vehicles_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth_router)
api_router.include_router(vehicles_router)
api_router.include_router(provider_vehicles_router)
# Register availability routes before employee details so a future dynamic route
# (for example GET /provider/employees/{id}) cannot shadow /employees/availability.
api_router.include_router(provider_availability_router)
api_router.include_router(provider_employees_router)
api_router.include_router(availability_router)
api_router.include_router(pricing_router)
api_router.include_router(provider_pricing_router)
api_router.include_router(locations_router)
api_router.include_router(bookings_router)
api_router.include_router(provider_bookings_router)
api_router.include_router(handover_router)
api_router.include_router(assistant_router)
