import pytest
from fastapi.testclient import TestClient
from app.api import app

@pytest.fixture
def client():
    return TestClient(app)

test_data = {"group_id": None, "prep_id": None}

def test_1_get_groups(client):
    response = client.get("/api/groups")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_2_create_group(client):
    response = client.post("/api/groups", json={"name": "НОВАЯ-ГРУППА"})
    assert response.status_code == 200
    data = response.json()
    test_data["group_id"] = data["id"]
    assert data["name"] == "НОВАЯ-ГРУППА"

def test_3_create_prep(client):
    response = client.post("/api/preps", json={"fio": "Иванов Иван"})
    assert response.status_code == 200
    data = response.json()
    test_data["prep_id"] = data["id"]
    assert data["fio"] == "Иванов Иван"

def test_4_delete_group(client):
    gid = test_data["group_id"]
    response = client.delete(f"/api/groups/{gid}")
    assert response.status_code == 200

def test_5_delete_prep(client):
    pid = test_data["prep_id"]
    response = client.delete(f"/api/preps/{pid}")
    assert response.status_code == 200

def test_6_404_on_nonexistent(client):
    response = client.delete("/api/groups/999999")
    assert response.status_code == 404