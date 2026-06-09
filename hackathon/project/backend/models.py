"""
Pydantic models for OPC Agent Treasury Backend API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class HealthResponse(BaseModel):
    status: str
    caw_mode: str
    sdk_available: bool
    wallet_uuid: Optional[str] = None


class ConfigResponse(BaseModel):
    default_chain: str
    default_token: str
    caw_mode: str


class CreateCardRequest(BaseModel):
    agent_name: str
    monthly_budget: float = Field(..., gt=0)
    single_tx_limit: float = Field(..., gt=0)
    vendor_whitelist: List[Dict[str, str]]
    cooldown_hours: int = 12
    duration_days: int = 30


class CardResponse(BaseModel):
    card_id: str
    agent_id: str
    agent_name: str
    owner: str
    status: str
    budget: Dict[str, Any]
    vendor_whitelist: List[Dict[str, str]]
    cooldown_hours: int
    time_window: Optional[Dict[str, Any]] = None
    created_at: str
    expires_at: str
    api_key: Optional[str] = None


class ApproveResponse(BaseModel):
    card_id: str
    status: str
    api_key: Optional[str] = None


class PaymentRequest(BaseModel):
    card_id: str
    vendor: str
    amount: float = Field(..., gt=0)
    purpose: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = None


class PaymentResponse(BaseModel):
    status: str
    reason: str
    tx_id: Optional[str] = None
    amount: float
    vendor: str
    remaining_budget: float
    tx_hash: Optional[str] = None
    alert_level: str = "none"


class TransactionRecord(BaseModel):
    tx_id: str
    card_id: str
    agent_id: str
    timestamp: str
    vendor: str
    vendor_address: str
    amount: float
    currency: str
    status: str
    reason: str
    remaining_budget: float
    tx_hash: str
    metadata: Dict[str, Any]
    alert_level: str


class AuditSummaryResponse(BaseModel):
    month: str
    total_income_usd: float
    total_approved_usd: float
    total_denied_usd: float
    denied_count: int
    transaction_count: int
    by_agent: Dict[str, Any]
    anomalies: List[Dict[str, Any]]
    generated_at: str


class AttackRequest(BaseModel):
    card_id: str
    metadata: Optional[Dict[str, Any]] = None


class AttackResponse(BaseModel):
    attack: str
    status: str
    reason: str
    tx_id: Optional[str] = None
