"""Auth endpoint tests — register, login, bad credentials."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from api.index import app

client = TestClient(app)

# ── fixtures ──────────────────────────────────────────────────────────────────

TEST_EMAIL = "test_reelscream@example.com"
TEST_PASSWORD = "supersecret123"


def _mock_session(user=None):
    """Return a mock SQLAlchemy session."""
    session = MagicMock()
    query = session.query.return_value
    query.filter_by.return_value.first.return_value = user
    return session


# ── register ──────────────────────────────────────────────────────────────────

class TestRegister:
    def test_register_new_user(self):
        with patch("api.routes.auth.get_session", return_value=_mock_session(user=None)), \
             patch.dict("os.environ", {"JWT_SECRET": "testsecret"}):
            res = client.post("/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
            })
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_register_duplicate_email(self):
        fake_user = MagicMock()
        with patch("api.routes.auth.get_session", return_value=_mock_session(user=fake_user)):
            res = client.post("/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
            })
        assert res.status_code == 400
        assert "already registered" in res.json()["detail"]

    def test_register_invalid_email(self):
        res = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "password": TEST_PASSWORD,
        })
        assert res.status_code == 422


# ── login ─────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_valid_credentials(self):
        import bcrypt
        hashed = bcrypt.hashpw(TEST_PASSWORD.encode(), bcrypt.gensalt()).decode()
        fake_user = MagicMock()
        fake_user.id = "user-123"
        fake_user.hashed_password = hashed

        with patch("api.routes.auth.get_session", return_value=_mock_session(user=fake_user)), \
             patch.dict("os.environ", {"JWT_SECRET": "testsecret"}):
            res = client.post("/api/auth/login", data={
                "username": TEST_EMAIL,
                "password": TEST_PASSWORD,
            })
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_wrong_password(self):
        import bcrypt
        hashed = bcrypt.hashpw(b"correct_password", bcrypt.gensalt()).decode()
        fake_user = MagicMock()
        fake_user.id = "user-123"
        fake_user.hashed_password = hashed

        with patch("api.routes.auth.get_session", return_value=_mock_session(user=fake_user)), \
             patch.dict("os.environ", {"JWT_SECRET": "testsecret"}):
            res = client.post("/api/auth/login", data={
                "username": TEST_EMAIL,
                "password": "wrong_password",
            })
        assert res.status_code == 401

    def test_login_unknown_user(self):
        with patch("api.routes.auth.get_session", return_value=_mock_session(user=None)):
            res = client.post("/api/auth/login", data={
                "username": "nobody@example.com",
                "password": TEST_PASSWORD,
            })
        assert res.status_code == 401

    def test_login_missing_fields(self):
        res = client.post("/api/auth/login", data={})
        assert res.status_code == 422
