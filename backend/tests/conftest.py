from collections.abc import Iterator
from dataclasses import dataclass
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.enums import UserRole
from app.db.session import SessionLocal
from app.main import app
from app.modules.bookings.models import Booking
from app.modules.employees.models import Employee
from app.modules.pricing.models import PricingRule
from app.modules.users.models import User
from app.modules.vehicles.models import Vehicle
from tests.pricing_helpers import PRICING_FIELDS, RULE_VALUES

PROVIDER_EMAIL = "pytest-provider@moveit.local"
PROVIDER_PASSWORD = "pytest-provider-password"


@dataclass(frozen=True)
class ProviderAccount:
    id: UUID
    email: str
    password: str


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def provider_account() -> Iterator[ProviderAccount]:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == PROVIDER_EMAIL))
        if user is None:
            user = User(
                first_name="Pytest",
                last_name="Provider",
                email=PROVIDER_EMAIL,
                password_hash=hash_password(PROVIDER_PASSWORD),
                role=UserRole.PROVIDER,
            )
            db.add(user)
        else:
            user.password_hash = hash_password(PROVIDER_PASSWORD)
            user.role = UserRole.PROVIDER
        db.commit()
        db.refresh(user)
        account = ProviderAccount(id=user.id, email=user.email, password=PROVIDER_PASSWORD)

    yield account

    with SessionLocal() as db:
        db.execute(delete(User).where(User.id == account.id))
        db.commit()


@pytest.fixture(scope="session")
def auth_headers(client: TestClient, provider_account: ProviderAccount) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": provider_account.email, "password": provider_account.password},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def created_resources() -> Iterator[dict[str, list[UUID]]]:
    resources: dict[str, list[UUID]] = {"vehicles": [], "employees": [], "bookings": []}
    yield resources
    with SessionLocal() as db:
        # Assignments disappear with their booking (ON DELETE CASCADE), so remove
        # bookings before employees and vehicles.
        if resources["bookings"]:
            db.execute(delete(Booking).where(Booking.id.in_(resources["bookings"])))
        if resources["employees"]:
            db.execute(delete(Employee).where(Employee.id.in_(resources["employees"])))
        if resources["vehicles"]:
            db.execute(delete(Vehicle).where(Vehicle.id.in_(resources["vehicles"])))
        db.commit()


@pytest.fixture
def pricing_rules() -> Iterator[None]:
    """Install deterministic rules and restore the previous configuration afterwards."""
    with SessionLocal() as db:
        existing = {rule.service_type: rule for rule in db.scalars(select(PricingRule))}
        snapshots = {
            service_type: {field: getattr(rule, field) for field in PRICING_FIELDS}
            for service_type, rule in existing.items()
        }
        created: list[PricingRule] = []
        for service_type, values in RULE_VALUES.items():
            rule = existing.get(service_type)
            if rule is None:
                rule = PricingRule(service_type=service_type, **values)
                db.add(rule)
                created.append(rule)
                continue
            for field, value in values.items():
                setattr(rule, field, value)
        db.flush()
        created_ids = [rule.id for rule in created]
        db.commit()

    yield

    with SessionLocal() as db:
        if created_ids:
            db.execute(delete(PricingRule).where(PricingRule.id.in_(created_ids)))
        for service_type, values in snapshots.items():
            rule = db.scalar(select(PricingRule).where(PricingRule.service_type == service_type))
            if rule is None:
                db.add(PricingRule(service_type=service_type, **values))
                continue
            for field, value in values.items():
                setattr(rule, field, value)
        db.commit()
