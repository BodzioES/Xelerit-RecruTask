"""Idempotent demo seed for the MoveIt MVP."""

import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.enums import (
    BookingActor,
    BookingStatus,
    EmployeeRole,
    LocationType,
    PropertyType,
    ServiceType,
    UserRole,
)
from app.db.session import SessionLocal
from app.modules.bookings.models import (
    Booking,
    BookingEmployee,
    BookingEvent,
    BookingItem,
    BookingLocation,
    BookingMovingDetails,
)
from app.modules.employees.models import Employee
from app.modules.handover.models import HandoverRecord
from app.modules.pricing.models import PricingRule
from app.modules.users.models import User
from app.modules.vehicles.models import Vehicle

logger = logging.getLogger(__name__)


def _at(day_offset: int, hour: int) -> datetime:
    moment = datetime.now(UTC) + timedelta(days=day_offset)
    return moment.replace(hour=hour, minute=0, second=0, microsecond=0)


def _next_booking_number(db: Session, starts_at: datetime) -> str:
    value = db.execute(text("SELECT nextval('booking_number_seq')")).scalar_one()
    return f"MV-{starts_at.year}-{int(value):06d}"


def _seed_provider(db: Session) -> User:
    provider = db.scalar(select(User).where(User.email == settings.provider_email.lower()))
    if provider is not None:
        return provider

    provider = User(
        first_name="MoveIt",
        last_name="Provider",
        email=settings.provider_email.lower(),
        password_hash=hash_password(settings.provider_password),
        role=UserRole.PROVIDER,
    )
    db.add(provider)
    db.flush()
    logger.info("Seeded provider account %s", provider.email)
    return provider


def _seed_pricing_rules(db: Session) -> None:
    rules = [
        {
            "service_type": ServiceType.SELF_DRIVE,
            "base_price": Decimal("0.00"),
            "hourly_rate": Decimal("60.00"),
            "daily_rate": Decimal("349.00"),
            "price_per_km": Decimal("0.00"),
            "helper_rate": Decimal("0.00"),
            "floor_surcharge": Decimal("0.00"),
            "no_elevator_surcharge": Decimal("0.00"),
            "additional_service_price": Decimal("0.00"),
            "min_duration_hours": 3,
        },
        {
            "service_type": ServiceType.VAN_DRIVER,
            "base_price": Decimal("149.00"),
            "hourly_rate": Decimal("90.00"),
            "daily_rate": Decimal("0.00"),
            "price_per_km": Decimal("3.50"),
            "helper_rate": Decimal("0.00"),
            "floor_surcharge": Decimal("0.00"),
            "no_elevator_surcharge": Decimal("0.00"),
            "additional_service_price": Decimal("0.00"),
            "min_duration_hours": 4,
        },
        {
            "service_type": ServiceType.FULL_MOVING,
            "base_price": Decimal("299.00"),
            "hourly_rate": Decimal("120.00"),
            "daily_rate": Decimal("0.00"),
            "price_per_km": Decimal("3.50"),
            "helper_rate": Decimal("80.00"),
            "floor_surcharge": Decimal("50.00"),
            "no_elevator_surcharge": Decimal("100.00"),
            "additional_service_price": Decimal("150.00"),
            "min_duration_hours": 6,
        },
    ]

    for payload in rules:
        exists = db.scalar(
            select(PricingRule.id).where(PricingRule.service_type == payload["service_type"])
        )
        if exists is None:
            db.add(PricingRule(**payload))
    db.flush()


def _seed_vehicles(db: Session) -> None:
    if db.scalar(select(func.count(Vehicle.id))) > 0:
        return

    db.add_all(
        [
            Vehicle(
                brand="Renault",
                model="Master",
                year=2023,
                category="L3H2",
                cargo_volume=Decimal("13.00"),
                payload=1400,
                seats=3,
                description="Long wheelbase panel van with a high roof and a rear step.",
                image_url="/vehicles/renault-master.svg",
                hourly_price=Decimal("60.00"),
                daily_price=Decimal("349.00"),
            ),
            Vehicle(
                brand="Fiat",
                model="Ducato",
                year=2022,
                category="L2H2",
                cargo_volume=Decimal("11.50"),
                payload=1250,
                seats=3,
                description="Comfortable mid-size van, easy to drive in the city.",
                image_url="/vehicles/fiat-ducato.svg",
                hourly_price=Decimal("55.00"),
                daily_price=Decimal("319.00"),
            ),
            Vehicle(
                brand="Ford",
                model="Transit",
                year=2024,
                category="L3H3",
                cargo_volume=Decimal("15.00"),
                payload=1500,
                seats=3,
                description="Extra-high roof for tall loads and bulky furniture.",
                image_url="/vehicles/ford-transit.svg",
                hourly_price=Decimal("65.00"),
                daily_price=Decimal("379.00"),
            ),
            Vehicle(
                brand="Iveco",
                model="Daily",
                year=2021,
                category="L4H2",
                cargo_volume=Decimal("18.00"),
                payload=1800,
                seats=3,
                description="The largest van in the fleet, ideal for full moves.",
                image_url="/vehicles/iveco-daily.svg",
                hourly_price=Decimal("70.00"),
                daily_price=Decimal("419.00"),
            ),
        ]
    )
    db.flush()
    logger.info("Seeded demo vehicles")


def _seed_employees(db: Session) -> None:
    if db.scalar(select(func.count(Employee.id))) > 0:
        return

    db.add_all(
        [
            Employee(first_name="Adam", last_name="Nowak", role=EmployeeRole.DRIVER),
            Employee(first_name="Piotr", last_name="Wiśniewski", role=EmployeeRole.DRIVER),
            Employee(first_name="Bartosz", last_name="Wójcik", role=EmployeeRole.DRIVER),
            Employee(first_name="Michał", last_name="Lewandowski", role=EmployeeRole.MOVER),
            Employee(first_name="Tomasz", last_name="Zieliński", role=EmployeeRole.MOVER),
            Employee(first_name="Kamil", last_name="Szymański", role=EmployeeRole.MOVER),
        ]
    )
    db.flush()
    logger.info("Seeded demo employees")


def _get_vehicle(db: Session, model: str) -> Vehicle:
    vehicle = db.scalar(select(Vehicle).where(Vehicle.model == model))
    if vehicle is None:  # pragma: no cover - guards inconsistent seed state
        raise RuntimeError(f"Seed vehicle {model} is missing")
    return vehicle


def _get_employee(db: Session, last_name: str) -> Employee:
    employee = db.scalar(select(Employee).where(Employee.last_name == last_name))
    if employee is None:  # pragma: no cover - guards inconsistent seed state
        raise RuntimeError(f"Seed employee {last_name} is missing")
    return employee


def _event(
    previous: BookingStatus | None,
    new: BookingStatus,
    actor: BookingActor,
    provider_id: UUID,
    note: str | None = None,
) -> BookingEvent:
    return BookingEvent(
        previous_status=previous,
        new_status=new,
        changed_by=actor,
        changed_by_user_id=provider_id if actor == BookingActor.PROVIDER else None,
        note=note,
    )


def _seed_demo_bookings(db: Session, provider: User) -> None:
    if db.scalar(select(func.count(Booking.id))) > 0:
        return

    moving_start = _at(3, 8)
    moving = Booking(
        booking_number=_next_booking_number(db, moving_start),
        customer_first_name="Jan",
        customer_last_name="Kowalski",
        customer_email="jan.kowalski@example.com",
        customer_phone="+48 501 234 567",
        vehicle_id=_get_vehicle(db, "Master").id,
        service_type=ServiceType.FULL_MOVING,
        start_datetime=moving_start,
        end_datetime=moving_start + timedelta(hours=8),
        status=BookingStatus.PENDING,
        base_price=Decimal("299.00"),
        extras_price=Decimal("1580.00"),
        total_price=Decimal("1879.00"),
        distance_km=Decimal("18.40"),
        duration_minutes=480,
        customer_notes="Please call 15 minutes before arrival. Breakable items are marked.",
    )
    moving.locations = [
        BookingLocation(
            location_type=LocationType.LOADING,
            address="ul. Wyspiańskiego 12, Gdańsk Wrzeszcz",
            latitude=Decimal("54.380100"),
            longitude=Decimal("18.618500"),
            instructions="Second staircase, courtyard entrance.",
        ),
        BookingLocation(
            location_type=LocationType.UNLOADING,
            address="ul. Bohaterów Monte Cassino 40, Sopot",
            latitude=Decimal("54.441600"),
            longitude=Decimal("18.560100"),
        ),
    ]
    moving.items = [
        BookingItem(item_name="Three-seat sofa", quantity=1),
        BookingItem(item_name="Dining table", quantity=1),
        BookingItem(item_name="Cardboard boxes", quantity=20),
    ]
    moving.moving_details = BookingMovingDetails(
        property_type=PropertyType.APARTMENT,
        floor=2,
        has_elevator=False,
        needs_carry_in=True,
        needs_carry_out=True,
        boxes_count=20,
        items_description="Two wardrobes, a sofa, a table and kitchen accessories.",
    )
    moving.assignments = [
        BookingEmployee(employee_id=_get_employee(db, "Nowak").id),
        BookingEmployee(employee_id=_get_employee(db, "Lewandowski").id),
        BookingEmployee(employee_id=_get_employee(db, "Zieliński").id),
    ]
    moving.events = [
        _event(
            None,
            BookingStatus.PENDING,
            BookingActor.CUSTOMER,
            provider.id,
            "Booking created",
        )
    ]

    rental_start = _at(1, 10)
    rental = Booking(
        booking_number=_next_booking_number(db, rental_start),
        customer_first_name="Anna",
        customer_last_name="Nowak",
        customer_email="anna.nowak@example.com",
        customer_phone="+48 502 345 678",
        vehicle_id=_get_vehicle(db, "Ducato").id,
        service_type=ServiceType.SELF_DRIVE,
        start_datetime=rental_start,
        end_datetime=rental_start + timedelta(days=2),
        status=BookingStatus.CONFIRMED,
        base_price=Decimal("598.00"),
        extras_price=Decimal("0.00"),
        total_price=Decimal("598.00"),
        duration_minutes=2880,
        customer_notes="Returning with a full tank.",
    )
    rental.locations = [
        BookingLocation(
            location_type=LocationType.PICKUP,
            address="al. Grunwaldzka 210, Gdańsk Oliwa",
            latitude=Decimal("54.409200"),
            longitude=Decimal("18.570000"),
        ),
        BookingLocation(
            location_type=LocationType.RETURN,
            address="al. Grunwaldzka 472, Gdańsk Oliwa",
            latitude=Decimal("54.402800"),
            longitude=Decimal("18.569500"),
        ),
    ]
    rental.handover = HandoverRecord(
        pickup_instructions=(
            "The vehicle is parked in the covered car park on level -1. The lockbox is mounted "
            "next to the driver's door handle."
        ),
        return_instructions=(
            "Return the vehicle to the same car park and leave the keys in the lockbox. "
            "Remember to close all windows and take your belongings."
        ),
    )
    rental.events = [
        _event(
            None,
            BookingStatus.PENDING,
            BookingActor.CUSTOMER,
            provider.id,
            "Booking created",
        ),
        _event(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingActor.PROVIDER,
            provider.id,
            "Confirmed by the provider",
        ),
    ]

    transport_start = _at(-8, 9)
    transport = Booking(
        booking_number=_next_booking_number(db, transport_start),
        customer_first_name="Marek",
        customer_last_name="Wiśniewski",
        customer_email="marek.wisniewski@example.com",
        customer_phone="+48 503 456 789",
        vehicle_id=_get_vehicle(db, "Transit").id,
        service_type=ServiceType.VAN_DRIVER,
        start_datetime=transport_start,
        end_datetime=transport_start + timedelta(hours=4),
        status=BookingStatus.COMPLETED,
        base_price=Decimal("509.00"),
        extras_price=Decimal("87.50"),
        total_price=Decimal("596.50"),
        distance_km=Decimal("25.00"),
        duration_minutes=240,
        customer_notes="Washing machine to be carried to the first floor.",
    )
    transport.locations = [
        BookingLocation(
            location_type=LocationType.LOADING,
            address="ul. Świętojańska 88, Gdynia",
            latitude=Decimal("54.518900"),
            longitude=Decimal("18.530500"),
        ),
        BookingLocation(
            location_type=LocationType.UNLOADING,
            address="ul. Kartuska 15, Gdańsk",
            latitude=Decimal("54.352000"),
            longitude=Decimal("18.612000"),
        ),
    ]
    transport.items = [BookingItem(item_name="Washing machine", quantity=1)]
    transport.assignments = [BookingEmployee(employee_id=_get_employee(db, "Wiśniewski").id)]
    transport.events = [
        _event(
            None,
            BookingStatus.PENDING,
            BookingActor.CUSTOMER,
            provider.id,
            "Booking created",
        ),
        _event(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingActor.PROVIDER,
            provider.id,
            "Confirmed by the provider",
        ),
        _event(
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingActor.PROVIDER,
            provider.id,
            "Driver arrived at the loading address",
        ),
        _event(
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED,
            BookingActor.PROVIDER,
            provider.id,
            "Delivered and unloaded",
        ),
    ]

    db.add_all([moving, rental, transport])
    db.flush()
    logger.info("Seeded demo bookings")


def seed_database() -> None:
    with SessionLocal() as db:
        provider = _seed_provider(db)
        _seed_pricing_rules(db)
        _seed_vehicles(db)
        _seed_employees(db)
        _seed_demo_bookings(db, provider)
        db.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    seed_database()
