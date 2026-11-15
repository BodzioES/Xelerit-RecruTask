from fastapi.testclient import TestClient

from tests.conftest import ProviderAccount


def test_login_returns_provider_token(
    client: TestClient, provider_account: ProviderAccount
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": provider_account.email, "password": provider_account.password},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["access_token"]
    assert body["user"]["email"] == provider_account.email
    assert body["user"]["role"] == "provider"


def test_login_rejects_wrong_password(
    client: TestClient, provider_account: ProviderAccount
) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": provider_account.email, "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_rejects_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@janusztrans.local", "password": "whatever"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_me_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_returns_current_provider(
    client: TestClient,
    auth_headers: dict[str, str],
    provider_account: ProviderAccount,
) -> None:
    response = client.get("/api/v1/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == provider_account.email
    assert response.json()["role"] == "provider"


def test_me_rejects_invalid_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})

    assert response.status_code == 401
