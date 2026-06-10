"""
Pydantic models for OPC Agent Treasury Backend API.
"""

from pydantic import BaseModel, Field, field_validator
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
    vendor_whitelist: List[Dict[str, Any]]
    cooldown_hours: int = 12
    duration_days: int = 30


class CardResponse(BaseModel):
    card_id: str
    agent_id: str
    agent_name: str
    owner: str
    status: str
    budget: Dict[str, Any]
    vendor_whitelist: List[Dict[str, Any]]
    cooldown_hours: int
    time_window: Optional[Dict[str, Any]] = None
    created_at: str
    expires_at: str
    api_key: Optional[str] = None
    x402_enabled: bool = True
    x402_url: Optional[str] = None
    erc8004_agent_id: Optional[str] = None
    erc8004_registry_url: Optional[str] = None

    @field_validator("created_at", "expires_at", mode="before")
    @classmethod
    def none_datetime_to_empty_string(cls, value: Any) -> str:
        """CAW may return null for optional Pact timestamps; keep frontend contract as string."""
        return "" if value is None else str(value)


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

    @field_validator(
        "tx_id",
        "card_id",
        "agent_id",
        "timestamp",
        "vendor",
        "vendor_address",
        "currency",
        "status",
        "reason",
        "tx_hash",
        "alert_level",
        mode="before",
    )
    @classmethod
    def none_string_fields_to_empty_string(cls, value: Any) -> str:
        """CAW may return null for optional transaction strings; keep frontend contract as string."""
        return "" if value is None else str(value)


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


class WalletBalanceAsset(BaseModel):
    wallet_uuid: str
    chain_id: str
    token_id: str
    amount: float
    amount_formatted: str
    currency: str
    address: str = ""
    updated_at: str


class WalletBalanceResponse(BaseModel):
    wallet_uuid: str
    chain_id: str
    token_id: str
    balance: float
    balance_formatted: str
    currency: str
    address: str = ""
    updated_at: str
    balances: List[WalletBalanceAsset] = []


class X402Provider(BaseModel):
    name: str
    address: str
    category: str
    x402_url: str
    description: str
    pricing_usdc: float
    chain: str
    source: str
    erc8004_agent_id: Optional[str] = None
    erc8004_registry_url: Optional[str] = None


class ERC8004Agent(BaseModel):
    agent_id: str
    name: str
    chain: str
    service: str
    owner: str
    score: int
    feedback: int
    stars: int
    x402_enabled: bool
    registry_url: str
    source: str


class MarketplaceContextResponse(BaseModel):
    x402scan: Dict[str, Any]
    erc8004: Dict[str, Any]
