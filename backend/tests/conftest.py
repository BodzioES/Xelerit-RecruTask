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
from app.modules.employees.models import Employee
from app.modules.users.models import User
from app.modules.vehicles.models import Vehicle

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
    resources: dict[str, list[UUID]] = {"vehicles": [], "employees": []}
    yield resources
    with SessionLocal() as db:
        if resources["vehicles"]:
            db.execute(delete(Vehicle).where(Vehicle.id.in_(resources["vehicles"])))
        if resources["employees"]:
            db.execute(delete(Employee).where(Employee.id.in_(resources["employees"])))
        db.commit()
