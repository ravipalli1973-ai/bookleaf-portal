from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "BookLeaf Portal API"}

def test_auth_login_invalid():
    response = client.post(
        "/api/auth/login",
        json={"email": "wrong@bookleafpub.com", "password": "wrongpassword"}
    )
    assert response.status_code in [400, 401]
