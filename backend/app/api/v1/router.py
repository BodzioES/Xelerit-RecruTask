from fastapi import APIRouter

from app.api.v1 import health

api_router = APIRouter()
api_router.include_router(health.router)

# Domain routers (vehicles, employees, locations, availability, pricing,
# bookings, provider, handover) will be registered here in later milestones.
