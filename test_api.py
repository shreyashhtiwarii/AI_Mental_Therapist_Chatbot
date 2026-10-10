import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.environ.pop("AI_API_KEY", None)
import pytest
from app import create_app
from services.emotion_service import analyze_emotion
from services.safety_service import assess_risk

@pytest.fixture
def client():
    return create_app("sqlite:///:memory:").test_client()

def reg(c, email="a@b.com"):
    r = c.post("/api/auth/register", json={"name": "A", "email": email, "password": "Passw0rdX"})
    return {"Authorization": "Bearer " + r.get_json()["token"]}

def test_register_duplicate_login(client):
    reg(client); assert client.post("/api/auth/register", json={"name": "A", "email": "a@b.com", "password": "Passw0rdX"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "a@b.com", "password": "Passw0rdX"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "a@b.com", "password": "bad"}).status_code == 401

def test_protected_and_admin(client):
    assert client.get("/api/conversations").status_code == 401
    assert client.get("/api/admin/stats", headers=reg(client)).status_code == 403

def test_chat_history_authorization(client):
    h = reg(client); r = client.post("/api/chat", json={"message": "I'm stressed about exams"}, headers=h).get_json()
    assert r["analysis"]["emotion"] == "stressed" and r["demo_mode"]
    cid = r["conversation_id"]
    assert len(client.get(f"/api/conversations/{cid}", headers=h).get_json()["messages"]) == 2
    h2 = reg(client, "x@y.com")
    assert client.get(f"/api/conversations/{cid}", headers=h2).status_code == 404
    assert client.delete(f"/api/conversations/{cid}", headers=h).status_code == 200
    assert client.post("/api/chat", json={"message": " "}, headers=h).status_code == 400

def test_high_risk_card(client):
    r = client.post("/api/chat", json={"message": "I want to kill myself"}, headers=reg(client)).get_json()
    assert r["show_help_card"] and r["analysis"]["risk_level"] == "high"

def test_services():
    assert analyze_emotion("I feel so alone")["emotion"] == "lonely"
    assert analyze_emotion("hello")["emotion"] == "neutral"
    assert assess_risk("I feel hopeless") == "medium" and assess_risk("nice day") == "low"
