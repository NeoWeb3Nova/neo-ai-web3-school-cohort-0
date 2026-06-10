import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

os.environ.setdefault("CAW_MODE", "mock")

from fastapi.testclient import TestClient

import main
from models import CardResponse


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


def test_get_card_accepts_caw_pact_with_null_expiry():
    main._caw_instance = FakeCAWClient()
    try:
        client = TestClient(main.app)
        response = client.get(f"/cards/{CARD_WITH_NULL_EXPIRY['card_id']}")
    finally:
        main._caw_instance = None

    assert response.status_code == 200
    assert response.json()["expires_at"] == ""
