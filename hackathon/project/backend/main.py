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
    PaymentRequest,
    PaymentResponse,
    TransactionRecord,
    AuditSummaryResponse,
    AttackRequest,
    AttackResponse,
    WalletBalanceResponse,
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
        )
        card = _caw().get_card(card_id)
        return CardResponse(**card)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/cards", response_model=List[CardResponse])
def list_cards():
    cards = _caw().list_cards()
    return [CardResponse(**c) for c in cards]


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


@app.post("/cards/{card_id}/revoke", response_model=ApproveResponse)
def revoke_card(card_id: str):
    try:
        result = _caw().revoke_card(card_id)
        return ApproveResponse(
            card_id=result["card_id"],
            status=result["status"],
            api_key=None,
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
        result = _caw().submit_payment(
            card_id=req.card_id,
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

    if attack_id == "a1":
        # Prompt injection -> unknown vendor address
        result = caw.submit_payment(card_id, "0xEvilHacker", 500.0, metadata=meta)
    elif attack_id == "a2":
        # Overpriced request
        result = caw.submit_payment(card_id, "Midjourney", 500.0, metadata=meta)
    elif attack_id == "a3":
        # Scope bypass -> unknown vendor
        result = caw.submit_payment(card_id, "FakeCloudService", 25.0, metadata=meta)
    elif attack_id == "a4":
        # Budget exhaustion -> attempt to exceed budget
        # Fire multiple payments quickly; only the first few will pass
        results = []
        for i in range(10):
            r = caw.submit_payment(card_id, "Midjourney", 30.0, metadata={**meta, "iteration": i + 1})
            results.append(r)
            if r["status"] != "APPROVED":
                break
        # Return the last (denied) result
        result = results[-1]
    elif attack_id == "a5":
        # Revoked card reuse
        caw.revoke_card(card_id)
        result = caw.submit_payment(card_id, "OpenAI", 10.0, metadata=meta)
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
        "cards": cards,
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
