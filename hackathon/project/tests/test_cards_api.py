import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

os.environ.setdefault("CAW_MODE", "mock")

from fastapi.testclient import TestClient

import main
from models import CardResponse
from real_caw_client import RealCAWClient


CARD_WITH_NULL_EXPIRY = {
    "card_id": "pact-null-expiry",
    "agent_id": "agent-null-expiry",
    "agent_name": "Null Expiry Agent",
    "owner": "0xOwner",
    "status": "ACTIVE",
    "budget": {
        "currency": "USDC",
        "monthly_max": 100.0,
        "spent": 0.0,
        "single_tx_limit": 10.0,
    },
    "vendor_whitelist": [],
    "cooldown_hours": 12,
    "time_window": None,
    "created_at": "2026-06-10T00:00:00+00:00",
    "expires_at": None,
    "api_key": "",
}


class FakeCAWClient:
    def list_cards(self):
        return [CARD_WITH_NULL_EXPIRY]

    def get_card(self, card_id: str):
        assert card_id == CARD_WITH_NULL_EXPIRY["card_id"]
        return CARD_WITH_NULL_EXPIRY

    def list_transaction_records(self, card_id: str | None = None):
        records = [
            {
                "tx_id": "tx-approved",
                "card_id": CARD_WITH_NULL_EXPIRY["card_id"],
                "agent_id": CARD_WITH_NULL_EXPIRY["agent_id"],
                "timestamp": "2026-06-10T00:01:00+00:00",
                "vendor": "OpenAI",
                "vendor_address": "0xVendor",
                "amount": 12.5,
                "currency": "USDC",
                "status": "APPROVED",
                "reason": "ok",
                "remaining_budget": 87.5,
                "tx_hash": "0xabc",
                "metadata": {},
                "alert_level": "none",
            },
            {
                "tx_id": "tx-denied",
                "card_id": CARD_WITH_NULL_EXPIRY["card_id"],
                "agent_id": CARD_WITH_NULL_EXPIRY["agent_id"],
                "timestamp": "2026-06-10T00:02:00+00:00",
                "vendor": "Evil",
                "vendor_address": "0xEvil",
                "amount": 99.0,
                "currency": "USDC",
                "status": "DENIED",
                "reason": "blocked",
                "remaining_budget": 87.5,
                "tx_hash": "",
                "metadata": {},
                "alert_level": "blocked",
            },
        ]
        if card_id:
            return [r for r in records if r["card_id"] == card_id]
        return records


def test_card_response_normalizes_null_expiry_to_empty_string():
    card = CardResponse(**CARD_WITH_NULL_EXPIRY)

    assert card.expires_at == ""


def test_list_cards_accepts_caw_pacts_with_null_expiry():
    main._caw_instance = FakeCAWClient()
    try:
        client = TestClient(main.app)
        response = client.get("/cards")
    finally:
        main._caw_instance = None

    assert response.status_code == 200
    assert response.json()[0]["expires_at"] == ""
    assert response.json()[0]["budget"]["spent"] == 12.5


def test_get_card_accepts_caw_pact_with_null_expiry():
    main._caw_instance = FakeCAWClient()
    try:
        client = TestClient(main.app)
        response = client.get(f"/cards/{CARD_WITH_NULL_EXPIRY['card_id']}")
    finally:
        main._caw_instance = None

    assert response.status_code == 200
    assert response.json()["expires_at"] == ""


def test_real_caw_statuses_are_normalized_for_frontend():
    client = RealCAWClient.__new__(RealCAWClient)

    assert client._extract_pact_status({"status": "APPROVED"}) == "ACTIVE"
    assert client._extract_pact_status({"status": "PENDING"}) == "PENDING_APPROVAL"
    assert client._extract_pact_status({"state": "approval_pending"}) == "PENDING_APPROVAL"
    assert client._extract_pact_status({"pact_status": "WITHDRAWN"}) == "REVOKED"
    assert client._extract_pact_status({"status": None}) == "UNKNOWN"
