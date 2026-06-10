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


def test_x402_provider_endpoint_returns_real_marketplace_shape():
    client = TestClient(main.app)

    response = client.get("/providers/x402")

    assert response.status_code == 200
    providers = response.json()
    assert len(providers) >= 5
    assert {"name", "x402_url", "address", "erc8004_agent_id"}.issubset(providers[0].keys())
    assert any(p["name"] == "BlockRun AI Gateway" for p in providers)


def test_erc8004_agents_endpoint_exposes_x402_enabled_agents():
    client = TestClient(main.app)

    response = client.get("/erc8004/agents")

    assert response.status_code == 200
    agents = response.json()
    assert agents
    assert all("registry_url" in a for a in agents)
    assert any(a["x402_enabled"] for a in agents)


def test_mock_card_preserves_x402_and_erc8004_vendor_metadata():
    caw = MockCAWClient()
    provider = TestClient(main.app).get("/providers/x402").json()[0]

    card_id = caw.create_card_pact(
        agent_name="Research Agent",
        monthly_budget=100,
        single_tx_limit=10,
        vendor_whitelist=[provider],
        cooldown_hours=0,
    )
    caw.approve_card(card_id)
    card = caw.get_card(card_id)

    assert card["x402_enabled"] is True
    assert card["x402_url"] == provider["x402_url"]
    assert card["erc8004_agent_id"] == provider["erc8004_agent_id"]
    assert card["vendor_whitelist"][0]["x402_url"] == provider["x402_url"]


def test_marketplace_context_documents_scanner_sources():
    client = TestClient(main.app)

    response = client.get("/marketplace/context")

    assert response.status_code == 200
    payload = response.json()
    assert payload["x402scan"]["source_url"] == "https://www.x402scan.com/resources"
    assert payload["erc8004"]["scan_url"] == "https://8004scan.io/agents"
    assert payload["erc8004"]["registry_total_agents"] > 300000
