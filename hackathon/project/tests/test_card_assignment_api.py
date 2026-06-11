import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

os.environ.setdefault("CAW_MODE", "mock")

from fastapi.testclient import TestClient

import main
from mock_caw_client import MockCAWClient
from models import CardResponse, PaymentRequest
from service_registry import list_x402_providers


def base_card_payload():
    return {
        "card_id": "card-test",
        "agent_id": "legacy-card-agent",
        "agent_name": "Research API Card",
        "card_name": "Research API Card",
        "owner": "0xOwner",
        "status": "ACTIVE",
        "budget": {"currency": "USDC", "monthly_max": 100.0, "spent": 0.0, "single_tx_limit": 10.0},
        "vendor_whitelist": [],
        "cooldown_hours": 6,
        "time_window": None,
        "created_at": "2026-06-11T00:00:00+00:00",
        "expires_at": "2026-07-11T00:00:00+00:00",
        "api_key": "",
        "assigned_agent_id": "agent-alpha-research",
        "assigned_agent_name": "Alpha Research Agent",
        "assigned_at": "2026-06-11T01:00:00+00:00",
    }


def test_card_response_exposes_assignment_fields():
    card = CardResponse(**base_card_payload())

    assert card.card_name == "Research API Card"
    assert card.assigned_agent_id == "agent-alpha-research"
    assert card.assigned_agent_name == "Alpha Research Agent"
    assert card.assigned_at == "2026-06-11T01:00:00+00:00"


def test_payment_request_requires_agent_id():
    req = PaymentRequest(
        agent_id="agent-alpha-research",
        card_id="card-test",
        vendor="BlockRun AI Gateway",
        amount=1.5,
        purpose="x402 paid API call",
    )

    assert req.agent_id == "agent-alpha-research"


def first_provider():
    return list_x402_providers()[0]


def create_active_card(caw: MockCAWClient) -> str:
    card_id = caw.create_card_pact(
        agent_name="Research API Card",
        monthly_budget=100,
        single_tx_limit=10,
        vendor_whitelist=[first_provider()],
        cooldown_hours=0,
    )
    caw.approve_card(card_id)
    return card_id


def test_mock_assign_card_persists_employee_assignment():
    caw = MockCAWClient()
    card_id = create_active_card(caw)

    result = caw.assign_card(card_id, "agent-alpha-research", "Alpha Research Agent")
    card = caw.get_card(card_id)

    assert result["status"] == "ASSIGNED"
    assert card["assigned_agent_id"] == "agent-alpha-research"
    assert card["assigned_agent_name"] == "Alpha Research Agent"
    assert card["assigned_at"]


def test_mock_payment_rejects_unassigned_agent():
    caw = MockCAWClient()
    card_id = create_active_card(caw)
    caw.assign_card(card_id, "agent-alpha-research", "Alpha Research Agent")

    response = caw.submit_payment(
        card_id=card_id,
        agent_id="agent-beta-growth",
        vendor=first_provider()["name"],
        amount=1.0,
        metadata={"purpose": "wrong employee tries card"},
    )

    assert response["status"] == "DENIED"
    assert "agent_not_assigned" in response["reason"]


def test_mock_payment_approves_assigned_agent():
    caw = MockCAWClient()
    card_id = create_active_card(caw)
    caw.assign_card(card_id, "agent-alpha-research", "Alpha Research Agent")

    response = caw.submit_payment(
        card_id=card_id,
        agent_id="agent-alpha-research",
        vendor=first_provider()["name"],
        amount=1.0,
        metadata={"purpose": "assigned employee paid API call"},
    )

    assert response["status"] == "APPROVED"


def test_assign_card_endpoint_persists_assignment():
    main._caw_instance = None
    client = TestClient(main.app)
    provider = client.get("/providers/x402").json()[0]
    created = client.post("/cards", json={
        "agent_name": "Research API Card",
        "monthly_budget": 100,
        "single_tx_limit": 10,
        "vendor_whitelist": [provider],
        "cooldown_hours": 0,
    }).json()
    client.post(f"/cards/{created['card_id']}/approve")

    response = client.post(f"/cards/{created['card_id']}/assign", json={
        "agent_id": "agent-alpha-research",
        "agent_name": "Alpha Research Agent",
    })

    assert response.status_code == 200
    payload = response.json()
    assert payload["assigned_agent_id"] == "agent-alpha-research"

    card = client.get(f"/cards/{created['card_id']}").json()
    assert card["assigned_agent_id"] == "agent-alpha-research"
    assert card["assigned_agent_name"] == "Alpha Research Agent"


def test_payments_endpoint_rejects_unassigned_employee():
    main._caw_instance = None
    client = TestClient(main.app)
    provider = client.get("/providers/x402").json()[0]
    created = client.post("/cards", json={
        "agent_name": "Research API Card",
        "monthly_budget": 100,
        "single_tx_limit": 10,
        "vendor_whitelist": [provider],
        "cooldown_hours": 0,
    }).json()
    client.post(f"/cards/{created['card_id']}/approve")
    client.post(f"/cards/{created['card_id']}/assign", json={
        "agent_id": "agent-alpha-research",
        "agent_name": "Alpha Research Agent",
    })

    response = client.post("/payments", json={
        "agent_id": "agent-beta-growth",
        "card_id": created["card_id"],
        "vendor": provider["name"],
        "amount": 1.0,
        "purpose": "wrong employee tries payment",
    })

    assert response.status_code == 200
    assert response.json()["status"] == "DENIED"
    assert "agent_not_assigned" in response.json()["reason"]


def test_payments_endpoint_approves_assigned_employee():
    main._caw_instance = None
    client = TestClient(main.app)
    provider = client.get("/providers/x402").json()[0]
    created = client.post("/cards", json={
        "agent_name": "Research API Card",
        "monthly_budget": 100,
        "single_tx_limit": 10,
        "vendor_whitelist": [provider],
        "cooldown_hours": 0,
    }).json()
    client.post(f"/cards/{created['card_id']}/approve")
    client.post(f"/cards/{created['card_id']}/assign", json={
        "agent_id": "agent-alpha-research",
        "agent_name": "Alpha Research Agent",
    })

    response = client.post("/payments", json={
        "agent_id": "agent-alpha-research",
        "card_id": created["card_id"],
        "vendor": provider["name"],
        "amount": 1.0,
        "purpose": "assigned employee payment",
    })

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"
