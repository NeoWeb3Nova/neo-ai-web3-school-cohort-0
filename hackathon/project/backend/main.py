"""
OPC Agent Treasury Backend API

FastAPI wrapper around the CAW client (mock or real).
Provides REST endpoints for the React frontend and external integrations.

Run:
    cd backend
    uvicorn main:app --reload --port 8000

Or with the CAW real mode:
    CAW_MODE=real uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional

# Ensure src/ is on the path so we can import factory + mock/real clients
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_PROJECT_ROOT, "src"))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from caw_factory import get_caw_client
from mock_caw_client import MockCAWClient

# Load env from project root
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))

from models import (
    HealthResponse,
    ConfigResponse,
    CreateCardRequest,
    CardResponse,
    ApproveResponse,
    AssignCardRequest,
    AssignCardResponse,
    PaymentRequest,
    PaymentResponse,
    TransactionRecord,
    AuditSummaryResponse,
    AttackRequest,
    AttackResponse,
    WalletBalanceResponse,
    X402Provider,
    ERC8004Agent,
    MarketplaceContextResponse,
    DigitalEmployee,
)
from service_registry import (
    get_marketplace_context,
    list_digital_employees,
    list_erc8004_agents,
    list_x402_providers,
    search_erc8004_agents,
)

# ═══════════════════════════════════════════════════════════════
# App init
# ═══════════════════════════════════════════════════════════════

app = FastAPI(
    title="OPC Agent Treasury API",
    description="REST API for Cobo CAW-powered Agent Treasury",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton CAW client (lazily created)
_caw_instance: Optional[Any] = None


def _caw() -> Any:
    global _caw_instance
    if _caw_instance is None:
        _caw_instance = get_caw_client()
    return _caw_instance


def _is_mock() -> bool:
    return isinstance(_caw(), MockCAWClient)


def _cards_with_spend(cards: List[Dict[str, Any]], transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return card dicts with budget.spent recomputed from approved transactions."""
    spent_by_card: Dict[str, float] = {}
    for tx in transactions:
        if str(tx.get("status", "")).upper() != "APPROVED":
            continue
        card_id = tx.get("card_id")
        if not card_id:
            continue
        spent_by_card[str(card_id)] = spent_by_card.get(str(card_id), 0.0) + float(tx.get("amount", 0) or 0)

    enriched: List[Dict[str, Any]] = []
    for card in cards:
        next_card = dict(card)
        budget = dict(next_card.get("budget") or {})
        budget["spent"] = spent_by_card.get(str(next_card.get("card_id", "")), float(budget.get("spent", 0) or 0))
        next_card["budget"] = budget
        enriched.append(next_card)
    return enriched


# ═══════════════════════════════════════════════════════════════
# Health & Config
# ═══════════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse)
def health():
    mode = os.getenv("CAW_MODE", "mock")
    sdk_ok = False
    try:
        import cobo_agentic_wallet
        sdk_ok = True
    except Exception:
        pass
    return HealthResponse(
        status="ok",
        caw_mode=mode,
        sdk_available=sdk_ok,
        wallet_uuid=os.getenv("AGENT_WALLET_WALLET_ID") if mode == "real" else None,
    )


@app.get("/config", response_model=ConfigResponse)
def config():
    return ConfigResponse(
        default_chain=os.getenv("CAW_DEFAULT_CHAIN", "BASE_ETH"),
        default_token=os.getenv("CAW_DEFAULT_TOKEN", "BASE_USDC"),
        caw_mode=os.getenv("CAW_MODE", "mock"),
    )


@app.get("/providers/x402", response_model=List[X402Provider])
def x402_providers():
    """Curated real x402 service providers from x402scan resources."""
    return [X402Provider(**p) for p in list_x402_providers()]


@app.get("/erc8004/agents", response_model=List[ERC8004Agent])
def erc8004_agents():
    """Recent ERC-8004 agent examples from 8004scan for demo discovery."""
    return [ERC8004Agent(**a) for a in list_erc8004_agents()]


@app.get("/erc8004/agents/search", response_model=List[ERC8004Agent])
def erc8004_agent_search(q: str, limit: int = 5):
    """Live ERC-8004 agent search through the public 8004scan API."""
    capped_limit = max(1, min(limit, 10))
    return [ERC8004Agent(**a) for a in search_erc8004_agents(q, capped_limit)]


@app.get("/marketplace/context", response_model=MarketplaceContextResponse)
def marketplace_context():
    """Snapshot explaining why x402 + ERC-8004 are the right integration targets."""
    return MarketplaceContextResponse(**get_marketplace_context())


@app.get("/agents/digital-employees", response_model=List[DigitalEmployee])
def digital_employees():
    """OPC digital employees that can receive CAW policy cards."""
    return [DigitalEmployee(**agent) for agent in list_digital_employees()]


@app.get("/wallet/balance", response_model=WalletBalanceResponse)
def wallet_balance():

    """Return the real wallet balance from CAW."""
    try:
        result = _caw().get_wallet_balance()
        return WalletBalanceResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ═══════════════════════════════════════════════════════════════
# Cards (Pacts)
# ═══════════════════════════════════════════════════════════════

@app.post("/cards", response_model=CardResponse)
def create_card(req: CreateCardRequest):
    try:
        card_id = _caw().create_card_pact(
            agent_name=req.agent_name,
            monthly_budget=req.monthly_budget,
            single_tx_limit=req.single_tx_limit,
            vendor_whitelist=req.vendor_whitelist,
            cooldown_hours=req.cooldown_hours,
            duration_days=req.duration_days,
            agent_id=req.agent_id,
            erc8004_agent_id=req.erc8004_agent_id,
            erc8004_registry_url=req.erc8004_registry_url,
        )
        card = _caw().get_card(card_id)
        return CardResponse(**card)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/cards", response_model=List[CardResponse])
def list_cards():
    caw = _caw()
    cards = caw.list_cards()
    transactions = caw.list_transaction_records()
    return [CardResponse(**c) for c in _cards_with_spend(cards, transactions)]


@app.get("/cards/{card_id}", response_model=CardResponse)
def get_card(card_id: str):
    try:
        card = _caw().get_card(card_id)
        return CardResponse(**card)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/cards/{card_id}/approve", response_model=ApproveResponse)
def approve_card(card_id: str, max_wait: int = 300):
    """
    Wait for the Pact to become ACTIVE.
    In real mode the owner must tap Approve in the Cobo App within `max_wait` seconds.
    """
    try:
        result = _caw().approve_card(card_id, max_wait=max_wait)
        return ApproveResponse(**result)
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/cards/{card_id}/assign", response_model=AssignCardResponse)
def assign_card(card_id: str, req: AssignCardRequest):
    """Assign an ACTIVE permission card to one OPC digital employee."""
    try:
        result = _caw().assign_card(
            card_id=card_id,
            agent_id=req.agent_id,
            agent_name=req.agent_name,
        )
        return AssignCardResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/cards/{card_id}/revoke", response_model=ApproveResponse)
def revoke_card(card_id: str):
    try:
        result = _caw().revoke_card(card_id)
        return ApproveResponse(
            card_id=result["card_id"],
            status=result["status"],
            api_key=None,
        )
    except PermissionError as exc:
        # Agent key 无法 revoke，需要用户在 CAW App 中手动操作
        raise HTTPException(
            status_code=403,
            detail=str(exc) + " \u8bf7在 CAW App 中手动吊销此 Pact，前端将自动同步状态。",
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ═══════════════════════════════════════════════════════════════
# Payments
# ═══════════════════════════════════════════════════════════════

@app.post("/payments", response_model=PaymentResponse)
def submit_payment(req: PaymentRequest):
    try:
        meta = req.metadata or {}
        if req.purpose:
            meta["purpose"] = req.purpose
        meta["agent_id"] = req.agent_id
        result = _caw().submit_payment(
            card_id=req.card_id,
            agent_id=req.agent_id,
            vendor=req.vendor,
            amount=req.amount,
            metadata=meta,
        )
        return PaymentResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


# ═══════════════════════════════════════════════════════════════
# Transactions & Audit
# ═══════════════════════════════════════════════════════════════

@app.get("/transactions", response_model=List[TransactionRecord])
def list_transactions(card_id: Optional[str] = None):
    records = _caw().list_transaction_records(card_id=card_id)
    return [TransactionRecord(**r) for r in records]


@app.get("/audit/summary", response_model=AuditSummaryResponse)
def audit_summary(month: str = "2026-06"):
    summary = _caw().get_monthly_summary(month)
    return AuditSummaryResponse(**summary)


# ═══════════════════════════════════════════════════════════════
# Attack Scenarios
# ═══════════════════════════════════════════════════════════════

@app.post("/attacks/{attack_id}", response_model=PaymentResponse)
def run_attack(attack_id: str, req: AttackRequest):
    """
    Run a single attack scenario against the specified card.
    attack_id: a1 | a2 | a3 | a4 | a5
    """
    caw = _caw()
    card_id = req.card_id
    meta = req.metadata or {}
    meta["trigger"] = attack_id
    card = caw.get_card(card_id)
    attack_agent_id = card.get("assigned_agent_id") or card.get("agent_id") or "attack-agent"

    if attack_id == "a1":
        # Prompt injection -> unknown vendor address
        result = caw.submit_payment(card_id, "0xEvilHacker", 500.0, agent_id=attack_agent_id, metadata=meta)
    elif attack_id == "a2":
        # Overpriced request
        result = caw.submit_payment(card_id, "Midjourney", 500.0, agent_id=attack_agent_id, metadata=meta)
    elif attack_id == "a3":
        # Scope bypass -> unknown vendor
        result = caw.submit_payment(card_id, "FakeCloudService", 25.0, agent_id=attack_agent_id, metadata=meta)
    elif attack_id == "a4":
        # Budget exhaustion -> attempt to exceed budget
        # Fire multiple payments quickly; only the first few will pass
        results = []
        for i in range(10):
            r = caw.submit_payment(card_id, "Midjourney", 30.0, agent_id=attack_agent_id, metadata={**meta, "iteration": i + 1})
            results.append(r)
            if r["status"] != "APPROVED":
                break
        # Return the last (denied) result
        result = results[-1]
    elif attack_id == "a5":
        # Revoked card reuse
        caw.revoke_card(card_id)
        result = caw.submit_payment(card_id, "OpenAI", 10.0, agent_id=attack_agent_id, metadata=meta)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown attack_id: {attack_id}")

    return PaymentResponse(**result)


# ═══════════════════════════════════════════════════════════════
# Dashboard (aggregated)
# ═══════════════════════════════════════════════════════════════

@app.get("/dashboard")
def dashboard():
    """Return cards + transactions + summary in one call for the frontend."""
    caw = _caw()
    cards = caw.list_cards()
    transactions = caw.list_transaction_records()
    summary = caw.get_monthly_summary()
    return {
        "cards": _cards_with_spend(cards, transactions),
        "transactions": transactions,
        "summary": summary,
    }


# ═══════════════════════════════════════════════════════════════
# Demo / Reset
# ═══════════════════════════════════════════════════════════════

@app.post("/demo/reset")
def demo_reset():
    """Reset the CAW client instance (mock only; real mode has no reset)."""
    global _caw_instance
    if _is_mock():
        _caw_instance = None
        return {"status": "reset"}
    return {"status": "noop", "reason": "Real CAW mode does not support reset"}
