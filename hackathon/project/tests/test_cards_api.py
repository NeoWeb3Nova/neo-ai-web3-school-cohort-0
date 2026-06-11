import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

os.environ.setdefault("CAW_MODE", "mock")

from fastapi.testclient import TestClient

import main
import pytest
from pydantic import ValidationError

from models import CardResponse, CreateCardRequest, TransactionRecord
from real_caw_client import RealCAWClient


def test_create_card_request_accepts_manual_x402_provider_with_optional_metadata():
    req = CreateCardRequest(
        agent_name="Manual Provider Policy",
        monthly_budget=100.0,
        single_tx_limit=10.0,
        vendor_whitelist=[
            {
                "name": "Manual Weather API",
                "address": "0x1234567890abcdef1234567890abcdef12345678",
                "chain": "BASE_ETH",
                "x402_url": "https://weather.example.com/x402",
                "category": "data",
                "pricing_usdc": 0.02,
                "description": "Optional operator note",
                "source": "manual",
            }
        ],
    )

    provider = req.vendor_whitelist[0]
    assert provider["source"] == "manual"
    assert provider["category"] == "data"
    assert provider["description"] == "Optional operator note"
    assert provider["x402_url"] == "https://weather.example.com/x402"


def test_create_card_request_accepts_manual_provider_without_x402_url():
    req = CreateCardRequest(
        agent_name="Address Only Policy",
        monthly_budget=100.0,
        single_tx_limit=10.0,
        vendor_whitelist=[
            {
                "name": "Address Only Agent",
                "address": "0x1234567890abcdef1234567890abcdef12345678",
                "chain": "BASE_ETH",
            }
        ],
    )

    provider = req.vendor_whitelist[0]
    assert provider["address"] == "0x1234567890abcdef1234567890abcdef12345678"
    assert provider["chain"] == "BASE_ETH"
    assert provider["source"] == "manual"


def test_create_card_request_rejects_manual_x402_provider_without_caw_core_fields():
    base_payload = {
        "agent_name": "Manual Provider Policy",
        "monthly_budget": 100.0,
        "single_tx_limit": 10.0,
    }

    for missing_field in ("name", "address", "chain"):
        provider = {
            "name": "Manual Weather API",
            "address": "0x1234567890abcdef1234567890abcdef12345678",
            "x402_url": "https://weather.example.com/x402",
            "chain": "BASE_ETH",
        }
        provider.pop(missing_field)
        with pytest.raises(ValidationError):
            CreateCardRequest(**base_payload, vendor_whitelist=[provider])


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


def test_real_caw_submit_pact_uses_fresh_sdk_client_only():
    """After removing HTTP fallback, _submit_pact_via_fresh_sdk must instantiate a new
    WalletAPIClient per call and call submit_pact on it."""
    import unittest.mock

    client = RealCAWClient.__new__(RealCAWClient)
    client.wallet_uuid = "wallet-123"
    client.base_url = "https://api.example"
    client.api_key = "caw_test"
    client._client = None

    captured = {}

    class FakeFreshSDK:
        async def submit_pact(self, wallet_id, intent, spec):
            captured["args"] = {"wallet_id": wallet_id, "intent": intent, "spec": spec}
            return {"pact_id": "pact-fresh-sdk"}

    with unittest.mock.patch("real_caw_client.WalletAPIClient", side_effect=lambda base_url, api_key: FakeFreshSDK()):
        result = client._submit_pact_via_fresh_sdk(
            wallet_id="wallet-123",
            intent="Issue spending card",
            spec={"policies": [], "completion_conditions": []},
        )

    assert result["pact_id"] == "pact-fresh-sdk"
    assert captured["args"]["wallet_id"] == "wallet-123"
    assert captured["args"]["intent"] == "Issue spending card"
    assert captured["args"]["spec"] == {"policies": [], "completion_conditions": []}


def test_real_caw_list_cards_prefers_sync_http_and_avoids_sdk_loop():
    client = RealCAWClient.__new__(RealCAWClient)
    client.wallet_uuid = "wallet-123"
    client._owner = "OPC Owner"
    client._cards = {}

    class LoopPoisonedSDK:
        def list_pacts(self, **kwargs):  # pragma: no cover - must not be called
            raise AssertionError("SDK list_pacts should not be called when HTTP succeeds")

    client._client = LoopPoisonedSDK()

    def fake_http_get_json(path, params):
        assert path == "/api/v1/pacts"
        assert params["wallet_id"] == "wallet-123"
        return {
            "result": {
                "pacts": [
                    {
                        "pact_id": "pact-http-1",
                        "intent": "HTTP Pact",
                        "status": "APPROVED",
                        "spec": {
                            "policies": [
                                {
                                    "rules": {
                                        "deny_if": {
                                            "amount_usd_gt": "25",
                                            "usage_limits": {"rolling_30d": {"amount_usd_gt": "100"}},
                                        },
                                        "when": {"destination_address_in": []},
                                    }
                                }
                            ]
                        },
                        "created_at": "2026-06-10T00:00:00+00:00",
                        "expires_at": None,
                    }
                ]
            }
        }

    client._http_get_json = fake_http_get_json

    cards = client.list_cards()

    assert len(cards) == 1
    assert cards[0]["card_id"] == "pact-http-1"
    assert cards[0]["status"] == "ACTIVE"
    assert cards[0]["budget"]["monthly_max"] == 100.0


def test_real_caw_list_cards_preserves_local_x402_vendor_metadata_after_api_refresh():
    client = RealCAWClient.__new__(RealCAWClient)
    client.wallet_uuid = "wallet-123"
    client._owner = "OPC Owner"
    client._cards = {
        "pact-http-1": {
            "card_id": "pact-http-1",
            "agent_name": "Research Agent",
            "agent_id": "agent-research",
            "owner": "OPC Owner",
            "status": "PENDING_APPROVAL",
            "budget": {"currency": "USDC", "monthly_max": 200.0, "spent": 0.0, "single_tx_limit": 50.0},
            "vendor_whitelist": [
                {
                    "name": "BlockRun AI Gateway",
                    "address": "0x4020000000000000000000000000000000000001",
                    "category": "ai",
                    "x402_url": "https://blockrun.ai",
                    "erc8004_agent_id": "base:blockrun-ai-gateway",
                }
            ],
            "cooldown_hours": 6,
            "time_window": {
                "start": "2026-06-10T00:00:00+00:00",
                "end": "2026-07-10T00:00:00+00:00",
                "allowed_hours_start": "00:00",
                "allowed_hours_end": "23:59",
            },
            "created_at": "2026-06-10T00:00:00+00:00",
            "expires_at": "2026-07-10T00:00:00+00:00",
            "api_key": "",
            "x402_enabled": True,
            "x402_url": "https://blockrun.ai",
            "erc8004_agent_id": "base:blockrun-ai-gateway",
            "erc8004_registry_url": "https://8004scan.io/agents?search=BlockRun",
        }
    }

    class LoopPoisonedSDK:
        def list_pacts(self, **kwargs):  # pragma: no cover - must not be called
            raise AssertionError("SDK list_pacts should not be called when HTTP succeeds")

    client._client = LoopPoisonedSDK()

    def fake_http_get_json(path, params):
        return {
            "result": {
                "pacts": [
                    {
                        "pact_id": "pact-http-1",
                        "intent": "Issue spending card for Research Agent",
                        "status": "APPROVED",
                        "spec": {
                            "policies": [
                                {
                                    "rules": {
                                        "deny_if": {"amount_usd_gt": "0", "usage_limits": {"rolling_30d": {"amount_usd_gt": "0"}}},
                                        "when": {
                                            "destination_address_in": [
                                                {"chain_id": "BASE_ETH", "address": "0x4020000000000000000000000000000000000001"}
                                            ]
                                        },
                                    }
                                }
                            ]
                        },
                    }
                ]
            }
        }

    client._http_get_json = fake_http_get_json

    cards = client.list_cards()

    assert cards[0]["status"] == "ACTIVE"
    assert cards[0]["agent_name"] == "Research Agent"
    assert cards[0]["vendor_whitelist"][0]["name"] == "BlockRun AI Gateway"
    assert cards[0]["x402_url"] == "https://blockrun.ai"
    assert cards[0]["erc8004_agent_id"] == "base:blockrun-ai-gateway"
    assert cards[0]["budget"]["monthly_max"] == 200.0
    assert cards[0]["cooldown_hours"] == 6
    assert cards[0]["expires_at"] == "2026-07-10T00:00:00+00:00"
    assert cards[0]["time_window"]["end"] == "2026-07-10T00:00:00+00:00"


def test_extract_list_items_accepts_caw_list_shapes():
    assert RealCAWClient._extract_list_items([{"id": "a"}, "bad"], "pacts") == [{"id": "a"}]
    assert RealCAWClient._extract_list_items({"pacts": [{"id": "b"}]}, "pacts") == [{"id": "b"}]
    assert RealCAWClient._extract_list_items({"items": [{"id": "c"}]}, "pacts") == [{"id": "c"}]


def test_real_caw_pact_to_card_recovers_time_window_from_completion_condition():
    client = RealCAWClient.__new__(RealCAWClient)
    client._owner = "OPC Owner"

    card = client._pact_to_card_dict(
        {
            "pact_id": "pact-time-1",
            "intent": "Timed Agent",
            "status": "APPROVED",
            "created_at": "2026-06-10T00:00:00+00:00",
            "spec": {
                "completion_conditions": [{"type": "time_elapsed", "threshold": str(30 * 86400)}],
                "policies": [
                    {
                        "rules": {
                            "deny_if": {
                                "amount_usd_gt": "25",
                                "usage_limits": {"rolling_30d": {"amount_usd_gt": "100"}},
                            },
                            "when": {"destination_address_in": []},
                        }
                    }
                ],
            },
        }
    )

    assert card["expires_at"] == "2026-07-10T00:00:00+00:00"
    assert card["time_window"]["start"] == "2026-06-10T00:00:00+00:00"
    assert card["time_window"]["end"] == "2026-07-10T00:00:00+00:00"


def test_real_caw_transaction_hash_none_normalizes_to_empty_string():
    client = RealCAWClient.__new__(RealCAWClient)
    client.wallet_uuid = "wallet-123"

    tx = client._api_tx_to_dict(
        {
            "request_id": "tx-null-hash",
            "pact_id": "pact-1",
            "principal_id": "agent-1",
            "created_at": "2026-06-10T00:00:00Z",
            "dst_addr": "0xVendor",
            "amount": "0.0001",
            "token_id": "BASE_USDC",
            "status": 902,
            "status_display": "Rejected",
            "tx_hash": None,
            "transaction_hash": None,
        }
    )

    assert tx["status"] == "DENIED"
    assert tx["tx_hash"] == ""
    assert TransactionRecord(**tx).tx_hash == ""


def test_transaction_record_normalizes_null_string_fields():
    tx = TransactionRecord(
        tx_id="tx-1",
        card_id="card-1",
        agent_id="agent-1",
        timestamp="2026-06-10T00:00:00Z",
        vendor="Vendor",
        vendor_address=None,
        amount=1.0,
        currency="USDC",
        status="APPROVED",
        reason=None,
        remaining_budget=0.0,
        tx_hash=None,
        metadata={},
        alert_level="none",
    )

    assert tx.vendor_address == ""
    assert tx.reason == ""
    assert tx.tx_hash == ""
