"""
MockCAWClient — 模拟 Cobo Agentic Wallet (CAW) 服务端行为

基于 CAW 官方文档深度调研报告设计，接口与真实 CAW API 保持一致，
未来可无缝替换为真实 SDK（只需更换 import 和初始化）。

核心模拟：
- Identity / Wallets / Transactions / Delegations / Pact / Policy Engine / Audit Pipeline
- Policy Engine 三阶段评估：Permission → Policy Rule → Counter/Anomaly
- 端到端审计日志（append-only，不可篡改模拟）

运行：
    from mock_caw_client import MockCAWClient
    caw = MockCAWClient()
    card_id = caw.create_card_pact(...)
    caw.approve_card(card_id)
    result = caw.submit_payment(card_id, vendor="Midjourney", amount=30.0)
"""

import json
import uuid
import random
import hashlib
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any

from service_registry import get_vendor_registry, list_x402_providers


# ═══════════════════════════════════════════════════════════════
# Data Models
# ═══════════════════════════════════════════════════════════════

@dataclass
class Vendor:
    name: str
    address: str
    category: str  # ai, api, search, crypto, social, infra, ads, outsource
    x402_url: str = ""
    description: str = ""
    pricing_usdc: float = 0.0
    chain: str = "Base"
    source: str = ""
    erc8004_agent_id: str = ""
    erc8004_registry_url: str = ""


@dataclass
class Budget:
    currency: str = "USDC"
    monthly_max: float = 0.0
    spent: float = 0.0
    single_tx_limit: float = 0.0


@dataclass
class TimeWindow:
    start: str = ""  # ISO 8601
    end: str = ""    # ISO 8601
    allowed_hours_start: str = "00:00"
    allowed_hours_end: str = "23:59"


@dataclass
class CardPact:
    card_id: str
    agent_id: str
    agent_name: str
    owner: str
    status: str  # PENDING_APPROVAL | ACTIVE | REVOKED | EXPIRED | COMPLETED
    budget: Budget
    vendor_whitelist: List[Vendor]
    cooldown_hours: int
    time_window: TimeWindow
    created_at: str
    expires_at: str
    api_key: str = ""  # Pact-scoped API Key（激活后生成）


@dataclass
class Transaction:
    tx_id: str
    card_id: str
    agent_id: str
    timestamp: str
    vendor: str
    vendor_address: str
    amount: float
    currency: str
    status: str  # APPROVED | DENIED | PENDING_APPROVAL
    reason: str
    remaining_budget: float
    tx_hash: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    alert_level: str = "none"  # none | warn | blocked | human_review


@dataclass
class A2ATransferRecord:
    transfer_id: str
    source_card_id: str
    target_card_id: str
    source_agent_id: str
    target_agent_id: str
    amount: float
    currency: str
    status: str  # APPROVED | DENIED
    reason: str
    timestamp: str
    tx_hash: str
    metadata: Dict[str, Any] = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════
# MockCAWClient
# ═══════════════════════════════════════════════════════════════

class MockCAWClient:
    """
    模拟 CAW Service 的 6 个核心模块：
    Identity, Wallets, Transactions, Delegations, Pact, Policy Engine, Audit Pipeline
    """

    def __init__(self):
        self._cards: Dict[str, CardPact] = {}
        self._transactions: List[Transaction] = []
        self._audit_log: List[Dict[str, Any]] = []
        self._used_api_keys: set = set()
        self._owner = "0xOPCBossNe0001"
        self._a2a_transfers: List[A2ATransferRecord] = []

        # x402scan-grounded provider registry for agent-native pay-per-call services.
        self._x402_providers = {p["name"]: p for p in list_x402_providers()}
        self._vendor_registry = get_vendor_registry()
        self._vendor_registry.update({
            "OpenAI": "0xOpenAI0000000000000000000000000000000001",
            "Midjourney": "0xMidjourney0000000000000000000000000002",
            "Unsplash": "0xUnsplash00000000000000000000000000003",
            "Google Ads": "0xGoogleAds00000000000000000000000000004",
            "Twitter Ads": "0xTwitterAds0000000000000000000000000005",
            "Designer PH": "0xDesignerPH000000000000000000000000006",
            "Translator VN": "0xTranslatorVN00000000000000000000000007",
            "AWS": "0xAWS00000000000000000000000000000000008",
            "Vercel": "0xVercel00000000000000000000000000000009",
        })

    # ───────────────────────────────────────────
    # Identity & Pact Lifecycle
    # ───────────────────────────────────────────

    def create_card_pact(
        self,
        agent_name: str,
        monthly_budget: float,
        single_tx_limit: float,
        vendor_whitelist: List[Dict[str, Any]],
        cooldown_hours: int = 12,
        owner: Optional[str] = None,
        duration_days: int = 30,
    ) -> str:
        """
        模拟：Owner 在 CAW App 中为 Agent 创建 Card Pact
        对应真实 API: POST /v1/pacts
        """
        card_id = f"card-{uuid.uuid4().hex[:8]}"
        agent_id = f"agent-{agent_name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:4]}"
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=duration_days)

        vendors = [Vendor(**v) for v in vendor_whitelist]

        card = CardPact(
            card_id=card_id,
            agent_id=agent_id,
            agent_name=agent_name,
            owner=owner or self._owner,
            status="PENDING_APPROVAL",
            budget=Budget(
                currency="USDC",
                monthly_max=monthly_budget,
                spent=0.0,
                single_tx_limit=single_tx_limit,
            ),
            vendor_whitelist=vendors,
            cooldown_hours=cooldown_hours,
            time_window=TimeWindow(
                start=now.isoformat(),
                end=expires.isoformat(),
                allowed_hours_start="00:00",
                allowed_hours_end="23:59",
            ),
            created_at=now.isoformat(),
            expires_at=expires.isoformat(),
        )

        self._cards[card_id] = card
        self._log_audit("PACT_CREATED", card_id, {
            "agent_name": agent_name,
            "monthly_budget": monthly_budget,
            "vendor_count": len(vendors),
        })
        return card_id

    def approve_card(self, card_id: str, **kwargs) -> Dict[str, Any]:
        """
        模拟：用户在 CAW App 中点击 Approve
        真实流程：PactState PENDING_APPROVAL → ACTIVE
                  系统自动创建 Delegation + Pact-scoped API Key
        """
        card = self._get_card_or_raise(card_id)
        if card.status != "PENDING_APPROVAL":
            raise ValueError(f"Card {card_id} cannot be approved (status={card.status})")

        card.status = "ACTIVE"
        card.api_key = f"caw_sk_{uuid.uuid4().hex}"
        self._used_api_keys.add(card.api_key)

        self._log_audit("PACT_APPROVED", card_id, {"api_key_prefix": card.api_key[:12]})
        return {
            "card_id": card_id,
            "status": "ACTIVE",
            "api_key": card.api_key,
            "delegation_scope": "wallet:spend:limited",
        }

    def revoke_card(self, card_id: str) -> Dict[str, Any]:
        """
        模拟：用户在 CAW App 中一键吊销
        对应：PactState → REVOKED，Pact-scoped API Key 立即失效
        """
        card = self._get_card_or_raise(card_id)
        card.status = "REVOKED"
        if card.api_key:
            self._used_api_keys.discard(card.api_key)

        self._log_audit("PACT_REVOKED", card_id, {"reason": "owner_manual_revoke"})
        return {"card_id": card_id, "status": "REVOKED", "api_key_invalidated": True}

    def get_card(self, card_id: str) -> Dict[str, Any]:
        card = self._get_card_or_raise(card_id)
        return self._card_to_dict(card)

    def list_cards(self) -> List[Dict[str, Any]]:
        return [self._card_to_dict(c) for c in self._cards.values()]

    def get_wallet_balance(self) -> Dict[str, Any]:
        """
        模拟获取钱包余额。在 mock 模式下返回固定的演示余额。
        """
        now = datetime.now(timezone.utc)
        balances = [
            {
                "wallet_uuid": "mock-wallet-uuid",
                "chain_id": "BASE_ETH",
                "token_id": "BASE_USDC",
                "amount": 5000.0,
                "amount_formatted": "5000",
                "currency": "USDC",
                "address": "0xMockTreasury",
                "updated_at": now.isoformat(),
            }
        ]
        return {
            "wallet_uuid": "mock-wallet-uuid",
            "chain_id": "BASE_ETH",
            "token_id": "BASE_USDC",
            "balance": 5000.0,
            "balance_formatted": "5000",
            "currency": "USDC",
            "address": "0xMockTreasury",
            "updated_at": now.isoformat(),
            "balances": balances,
        }

    # ───────────────────────────────────────────
    # Policy Engine — 三阶段评估（核心）
    # ───────────────────────────────────────────

    def submit_payment(
        self,
        card_id: str,
        vendor: str,
        amount: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        模拟 Agent 向 CAW 提交支付请求
        经过 Policy Engine 三阶段评估：
            Stage 1: Permission Check
            Stage 2: Policy Rule Evaluation
            Stage 3: Counter / Anomaly Check
        """
        card = self._get_card_or_raise(card_id)
        meta = metadata or {}
        now = datetime.now(timezone.utc)
        tx_id = f"tx-{uuid.uuid4().hex[:10]}"
        vendor_addr = self._vendor_registry.get(vendor, "0xUnknown")

        # ── Stage 1: Permission Check ──
        if card.status != "ACTIVE":
            reason = f"PERMISSION_DENIED: card status is {card.status}"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason)
            return self._payment_result(tx, card, "DENIED", reason)

        if amount <= 0:
            reason = "PERMISSION_DENIED: amount must be positive"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason)
            return self._payment_result(tx, card, "DENIED", reason)

        # ── Stage 2: Policy Rule Evaluation ──
        checks = []

        # 2a. 预算检查
        budget_ok = (card.budget.spent + amount) <= card.budget.monthly_max
        checks.append("budget_ok" if budget_ok else "budget_exceeded")

        # 2b. 单笔限制
        per_tx_ok = amount <= card.budget.single_tx_limit
        checks.append("per_tx_ok" if per_tx_ok else "per_tx_exceeded")

        # 2c. 白名单检查
        whitelist_names = {v.name for v in card.vendor_whitelist}
        whitelist_addrs = {v.address for v in card.vendor_whitelist}
        scope_ok = vendor in whitelist_names or vendor_addr in whitelist_addrs
        checks.append("scope_ok" if scope_ok else "scope_denied")

        # 2d. 时间窗口检查
        time_ok = self._check_time_window(card.time_window, now)
        checks.append("time_ok" if time_ok else "time_denied")

        # 2e. 冷却期检查
        cooldown_ok = self._check_cooldown(card.card_id, vendor, card.cooldown_hours, now)
        checks.append("cooldown_ok" if cooldown_ok else "cooldown_violation")

        # 综合 Stage 2
        policy_passed = budget_ok and per_tx_ok and scope_ok and time_ok and cooldown_ok
        if not policy_passed:
            failed = [c for c in checks if not c.endswith("_ok")]
            reason = f"POLICY_DENIED: {', '.join(failed)}"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason)
            return self._payment_result(tx, card, "DENIED", reason)

        # ── Stage 3: Counter / Anomaly Check ──
        alert_level = "none"
        anomaly_reasons = []

        # 3a. 金额偏离历史均值
        hist = self._get_vendor_history(card.card_id, vendor)
        if hist:
            avg = sum(hist) / len(hist)
            if avg > 0 and amount > avg * 10:
                alert_level = "blocked"
                anomaly_reasons.append(f"AMOUNT_ANOMALY: {amount} vs avg {avg:.2f}")

        # 3b. 时间异常（凌晨 0-5 点）
        if 0 <= now.hour < 5:
            alert_level = max_alert(alert_level, "human_review")
            anomaly_reasons.append("OFF_HOURS: 00:00-05:00")

        # 3c. 未知地址（不在 registry）
        if vendor not in self._vendor_registry:
            alert_level = max_alert(alert_level, "blocked")
            anomaly_reasons.append("UNKNOWN_ADDRESS")

        # 3d. 频率异常（同一 vendor 1 小时内超过 2 次）
        recent_count = self._count_recent_tx(card.card_id, vendor, hours=1)
        if recent_count >= 2:
            alert_level = max_alert(alert_level, "human_review")
            anomaly_reasons.append(f"FREQ_ANOMALY: {recent_count} tx in 1h")

        # Anomaly 处理：blocked 立即拒绝；human_review 通过但标记
        if alert_level == "blocked":
            reason = f"ANOMALY_BLOCKED: {' | '.join(anomaly_reasons)}"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason, alert_level)
            return self._payment_result(tx, card, "DENIED", reason, alert_level)

        # ── 全部通过：MPC 签名模拟 ──
        card.budget.spent += amount
        tx_hash = self._mock_tx_hash(card_id, vendor, amount, now)
        reason = "All checks passed"
        if anomaly_reasons:
            reason += f" | WARN: {' | '.join(anomaly_reasons)}"

        tx = self._record_tx(
            tx_id, card, vendor, vendor_addr, amount, "APPROVED", reason,
            alert_level=alert_level, tx_hash=tx_hash, metadata=meta
        )

        self._log_audit("PAYMENT_APPROVED", card_id, {
            "tx_id": tx_id,
            "amount": amount,
            "vendor": vendor,
            "remaining": card.budget.monthly_max - card.budget.spent,
        })

        return self._payment_result(tx, card, "APPROVED", reason, alert_level, tx_hash)

    # ───────────────────────────────────────────
    # A2A Transfer — Agent-to-Agent 资金调度
    # ───────────────────────────────────────────

    def submit_transfer(
        self,
        source_card_id: str,
        target_card_id: str,
        amount: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        模拟 Agent-to-Agent 资金调拨请求。

        经过 Policy Engine 三阶段评估：
            Stage 1: Permission Check（双方卡片状态）
            Stage 2: Policy Rule Evaluation（余额、限额、冷却期）
            Stage 3: Counter / Anomaly Check（频率、金额异常）

        真实流程：Owner 或 Coordinator Agent 发起调拨，
        CAW 在链上执行预算重分配（无需实际转账，调整 monthly_max）。
        """
        source = self._get_card_or_raise(source_card_id)
        target = self._get_card_or_raise(target_card_id)
        meta = metadata or {}
        now = datetime.now(timezone.utc)
        transfer_id = f"a2a-{uuid.uuid4().hex[:10]}"

        # ── Stage 1: Permission Check ──
        if source.status != "ACTIVE":
            reason = f"PERMISSION_DENIED: source card status is {source.status}"
            rec = self._record_a2a_transfer(
                transfer_id, source, target, amount, "DENIED", reason, meta
            )
            return self._a2a_result(rec, "DENIED", reason)

        if target.status != "ACTIVE":
            reason = f"PERMISSION_DENIED: target card status is {target.status}"
            rec = self._record_a2a_transfer(
                transfer_id, source, target, amount, "DENIED", reason, meta
            )
            return self._a2a_result(rec, "DENIED", reason)

        if amount <= 0:
            reason = "PERMISSION_DENIED: amount must be positive"
            rec = self._record_a2a_transfer(
                transfer_id, source, target, amount, "DENIED", reason, meta
            )
            return self._a2a_result(rec, "DENIED", reason)

        # ── Stage 2: Policy Rule Evaluation ──
        checks = []

        # 2a. 源卡可用余额检查（monthly_max - spent >= amount）
        source_available = source.budget.monthly_max - source.budget.spent
        balance_ok = source_available >= amount
        checks.append("balance_ok" if balance_ok else "balance_exceeded")

        # 2b. 单笔调拨限额（不超过源卡单笔交易限额）
        per_tx_ok = amount <= source.budget.single_tx_limit
        checks.append("per_tx_ok" if per_tx_ok else "per_tx_exceeded")

        # 2c. 目标卡总预算上限检查（防止无限膨胀，mock 限制 5000）
        target_new_total = target.budget.monthly_max + amount
        target_cap_ok = target_new_total <= 5000.0
        checks.append("target_cap_ok" if target_cap_ok else "target_cap_exceeded")

        # 2d. 冷却期检查（同一对卡片 1 小时内只能调拨一次）
        cooldown_ok = self._check_a2a_cooldown(source_card_id, target_card_id, hours=1, now=now)
        checks.append("cooldown_ok" if cooldown_ok else "cooldown_violation")

        policy_passed = balance_ok and per_tx_ok and target_cap_ok and cooldown_ok
        if not policy_passed:
            failed = [c for c in checks if not c.endswith("_ok")]
            reason = f"POLICY_DENIED: {', '.join(failed)}"
            rec = self._record_a2a_transfer(
                transfer_id, source, target, amount, "DENIED", reason, meta
            )
            return self._a2a_result(rec, "DENIED", reason)

        # ── Stage 3: Counter / Anomaly Check ──
        alert_level = "none"
        anomaly_reasons = []

        # 3a. 金额偏离历史均值
        hist = self._get_a2a_history(source_card_id)
        if hist:
            avg = sum(hist) / len(hist)
            if avg > 0 and amount > avg * 5:
                alert_level = "blocked"
                anomaly_reasons.append(f"AMOUNT_ANOMALY: {amount} vs avg {avg:.2f}")

        # 3b. 频率异常（同一源卡 1 小时内超过 2 次调拨）
        recent_count = self._count_recent_a2a(source_card_id, hours=1)
        if recent_count >= 2:
            alert_level = max_alert(alert_level, "human_review")
            anomaly_reasons.append(f"FREQ_ANOMALY: {recent_count} transfers in 1h")

        # 3c. 凌晨 0-5 点异常
        if 0 <= now.hour < 5:
            alert_level = max_alert(alert_level, "human_review")
            anomaly_reasons.append("OFF_HOURS: 00:00-05:00")

        if alert_level == "blocked":
            reason = f"ANOMALY_BLOCKED: {' | '.join(anomaly_reasons)}"
            rec = self._record_a2a_transfer(
                transfer_id, source, target, amount, "DENIED", reason, meta, alert_level
            )
            return self._a2a_result(rec, "DENIED", reason, alert_level)

        # ── 全部通过：执行预算重分配 ──
        source.budget.monthly_max -= amount
        target.budget.monthly_max += amount

        tx_hash = self._mock_tx_hash(source_card_id, target_card_id, amount, now)
        reason = "A2A transfer approved"
        if anomaly_reasons:
            reason += f" | WARN: {' | '.join(anomaly_reasons)}"

        rec = self._record_a2a_transfer(
            transfer_id, source, target, amount, "APPROVED", reason, meta, alert_level, tx_hash
        )

        self._log_audit("A2A_TRANSFER_APPROVED", source_card_id, {
            "transfer_id": transfer_id,
            "target_card_id": target_card_id,
            "amount": amount,
            "source_remaining_budget": source.budget.monthly_max - source.budget.spent,
            "target_new_budget": target.budget.monthly_max,
        })

        return self._a2a_result(rec, "APPROVED", reason, alert_level, tx_hash)

    # ───────────────────────────────────────────
    # Audit Pipeline
    # ───────────────────────────────────────────

    def list_transaction_records(
        self,
        card_id: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """模拟 CAW 审计日志查询"""
        results = []
        for tx in self._transactions:
            if card_id and tx.card_id != card_id:
                continue
            if start_time and tx.timestamp < start_time:
                continue
            if end_time and tx.timestamp > end_time:
                continue
            results.append(self._tx_to_dict(tx))
        return results

    def get_monthly_summary(self, month: str = "2026-06") -> Dict[str, Any]:
        """
        生成月末审计报表
        month format: YYYY-MM
        """
        month_tx = [tx for tx in self._transactions if tx.timestamp.startswith(month)]

        total_income = 3200.0  # mock: OPC 本月收入
        total_approved = sum(t.amount for t in month_tx if t.status == "APPROVED")
        total_denied = sum(t.amount for t in month_tx if t.status == "DENIED")
        denied_count = len([t for t in month_tx if t.status == "DENIED"])

        by_agent: Dict[str, Dict[str, Any]] = {}
        for tx in month_tx:
            agent = tx.agent_id
            if agent not in by_agent:
                by_agent[agent] = {"spent": 0.0, "tx_count": 0, "vendors": set(), "denied": 0}
            if tx.status == "APPROVED":
                by_agent[agent]["spent"] += tx.amount
            by_agent[agent]["tx_count"] += 1
            by_agent[agent]["vendors"].add(tx.vendor)
            if tx.status == "DENIED":
                by_agent[agent]["denied"] += 1

        # 异常标记
        anomalies = [
            {
                "tx_id": tx.tx_id,
                "agent": tx.agent_id,
                "amount": tx.amount,
                "reason": tx.reason,
                "alert": tx.alert_level,
            }
            for tx in month_tx
            if tx.alert_level in ("blocked", "human_review") or tx.status == "DENIED"
        ]

        return {
            "month": month,
            "total_income_usd": total_income,
            "total_approved_usd": total_approved,
            "total_denied_usd": total_denied,
            "denied_count": denied_count,
            "transaction_count": len(month_tx),
            "by_agent": {
                k: {**v, "vendors": list(v["vendors"])}
                for k, v in by_agent.items()
            },
            "anomalies": anomalies,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def export_audit_log(self, filepath: str):
        """导出完整审计日志到 JSONL"""
        with open(filepath, "w", encoding="utf-8") as f:
            for entry in self._audit_log:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # ───────────────────────────────────────────
    # Helpers
    # ───────────────────────────────────────────

    def _get_card_or_raise(self, card_id: str) -> CardPact:
        if card_id not in self._cards:
            raise ValueError(f"Card {card_id} not found")
        return self._cards[card_id]

    def _check_time_window(self, tw: TimeWindow, now: datetime) -> bool:
        start = datetime.fromisoformat(tw.start.replace("Z", "+00:00"))
        end = datetime.fromisoformat(tw.end.replace("Z", "+00:00"))
        if not (start <= now <= end):
            return False
        # allowed_hours
        start_h, start_m = map(int, tw.allowed_hours_start.split(":"))
        end_h, end_m = map(int, tw.allowed_hours_end.split(":"))
        minutes = now.hour * 60 + now.minute
        return (start_h * 60 + start_m) <= minutes <= (end_h * 60 + end_m)

    def _check_cooldown(self, card_id: str, vendor: str, cooldown_hours: int, now: datetime) -> bool:
        cutoff = now - timedelta(hours=cooldown_hours)
        for tx in reversed(self._transactions):
            if tx.card_id == card_id and tx.vendor == vendor:
                tx_time = datetime.fromisoformat(tx.timestamp.replace("Z", "+00:00"))
                if tx_time > cutoff:
                    return False
                return True
        return True

    def _get_vendor_history(self, card_id: str, vendor: str) -> List[float]:
        return [
            tx.amount
            for tx in self._transactions
            if tx.card_id == card_id and tx.vendor == vendor and tx.status == "APPROVED"
        ]

    def _count_recent_tx(self, card_id: str, vendor: str, hours: int) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return sum(
            1 for tx in self._transactions
            if tx.card_id == card_id and tx.vendor == vendor
            and datetime.fromisoformat(tx.timestamp.replace("Z", "+00:00")) > cutoff
        )

    def _record_tx(
        self,
        tx_id: str,
        card: CardPact,
        vendor: str,
        vendor_addr: str,
        amount: float,
        status: str,
        reason: str,
        alert_level: str = "none",
        tx_hash: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Transaction:
        tx = Transaction(
            tx_id=tx_id,
            card_id=card.card_id,
            agent_id=card.agent_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            vendor=vendor,
            vendor_address=vendor_addr,
            amount=amount,
            currency=card.budget.currency,
            status=status,
            reason=reason,
            remaining_budget=card.budget.monthly_max - card.budget.spent,
            tx_hash=tx_hash,
            metadata=metadata or {},
            alert_level=alert_level,
        )
        self._transactions.append(tx)
        return tx

    def _payment_result(
        self,
        tx: Transaction,
        card: CardPact,
        status: str,
        reason: str,
        alert_level: str = "none",
        tx_hash: str = "",
    ) -> Dict[str, Any]:
        return {
            "status": status,
            "reason": reason,
            "tx_id": tx.tx_id,
            "amount": tx.amount,
            "vendor": tx.vendor,
            "remaining_budget": card.budget.monthly_max - card.budget.spent,
            "tx_hash": tx_hash,
            "alert_level": alert_level,
            "timestamp": tx.timestamp,
            "card_id": card.card_id,
            "agent_id": card.agent_id,
            "currency": card.budget.currency,
        }

    def _mock_tx_hash(self, card_id: str, vendor: str, amount: float, now: datetime) -> str:
        payload = f"{card_id}:{vendor}:{amount}:{now.isoformat()}:{random.randint(0, 999999)}"
        return "0x" + hashlib.sha256(payload.encode()).hexdigest()[:64]

    def _log_audit(self, action: str, card_id: str, details: Dict[str, Any]):
        self._audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "card_id": card_id,
            "details": details,
        })

    def _card_to_dict(self, card: CardPact) -> Dict[str, Any]:
        primary_provider = next(
            (self._x402_providers.get(v.name) for v in card.vendor_whitelist if v.name in self._x402_providers),
            None,
        )
        return {
            "card_id": card.card_id,
            "agent_id": card.agent_id,
            "agent_name": card.agent_name,
            "owner": card.owner,
            "status": card.status,
            "budget": asdict(card.budget),
            "vendor_whitelist": [asdict(v) for v in card.vendor_whitelist],
            "cooldown_hours": card.cooldown_hours,
            "time_window": asdict(card.time_window),
            "created_at": card.created_at,
            "expires_at": card.expires_at,
            "api_key": card.api_key[:12] + "..." if card.api_key else "",
            "x402_enabled": bool(primary_provider),
            "x402_url": primary_provider.get("x402_url") if primary_provider else None,
            "erc8004_agent_id": primary_provider.get("erc8004_agent_id") if primary_provider else None,
            "erc8004_registry_url": primary_provider.get("erc8004_registry_url") if primary_provider else None,
        }

    def _tx_to_dict(self, tx: Transaction) -> Dict[str, Any]:
        return asdict(tx)

    # ───────────────────────────────────────────
    # A2A Transfer Helpers
    # ───────────────────────────────────────────

    def _check_a2a_cooldown(
        self, source_card_id: str, target_card_id: str, hours: int, now: datetime
    ) -> bool:
        cutoff = now - timedelta(hours=hours)
        for rec in reversed(self._a2a_transfers):
            if rec.source_card_id == source_card_id and rec.target_card_id == target_card_id:
                rec_time = datetime.fromisoformat(rec.timestamp.replace("Z", "+00:00"))
                if rec_time > cutoff:
                    return False
                return True
        return True

    def _get_a2a_history(self, source_card_id: str) -> List[float]:
        return [
            rec.amount
            for rec in self._a2a_transfers
            if rec.source_card_id == source_card_id and rec.status == "APPROVED"
        ]

    def _count_recent_a2a(self, source_card_id: str, hours: int) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return sum(
            1 for rec in self._a2a_transfers
            if rec.source_card_id == source_card_id
            and datetime.fromisoformat(rec.timestamp.replace("Z", "+00:00")) > cutoff
        )

    def _record_a2a_transfer(
        self,
        transfer_id: str,
        source: CardPact,
        target: CardPact,
        amount: float,
        status: str,
        reason: str,
        metadata: Optional[Dict[str, Any]] = None,
        alert_level: str = "none",
        tx_hash: str = "",
    ) -> A2ATransferRecord:
        rec = A2ATransferRecord(
            transfer_id=transfer_id,
            source_card_id=source.card_id,
            target_card_id=target.card_id,
            source_agent_id=source.agent_id,
            target_agent_id=target.agent_id,
            amount=amount,
            currency=source.budget.currency,
            status=status,
            reason=reason,
            timestamp=datetime.now(timezone.utc).isoformat(),
            tx_hash=tx_hash,
            metadata=metadata or {},
        )
        self._a2a_transfers.append(rec)
        return rec

    def _a2a_result(
        self,
        rec: A2ATransferRecord,
        status: str,
        reason: str,
        alert_level: str = "none",
        tx_hash: str = "",
    ) -> Dict[str, Any]:
        return {
            "status": status,
            "reason": reason,
            "transfer_id": rec.transfer_id,
            "source_card_id": rec.source_card_id,
            "target_card_id": rec.target_card_id,
            "source_agent_id": rec.source_agent_id,
            "target_agent_id": rec.target_agent_id,
            "amount": rec.amount,
            "currency": rec.currency,
            "tx_hash": tx_hash,
            "alert_level": alert_level,
            "timestamp": rec.timestamp,
        }


def max_alert(a: str, b: str) -> str:
    """alert level 优先级：blocked > human_review > warn > none"""
    order = {"none": 0, "warn": 1, "human_review": 2, "blocked": 3}
    return a if order.get(a, 0) >= order.get(b, 0) else b


# ═══════════════════════════════════════════════════════════════
# Quick Test
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("MockCAWClient — Quick Self-Test")
    print("=" * 50)

    caw = MockCAWClient()

    # 1. 创建 Card
    card_id = caw.create_card_pact(
        agent_name="Content Agent",
        monthly_budget=200.0,
        single_tx_limit=50.0,
        vendor_whitelist=[
            {"name": "OpenAI", "address": "0xOpenAI...", "category": "api"},
            {"name": "Midjourney", "address": "0xMidjourney...", "category": "api"},
            {"name": "Unsplash", "address": "0xUnsplash...", "category": "api"},
        ],
        cooldown_hours=12,
    )
    print(f"[1] Created card: {card_id}")

    # 2. 审批
    caw.approve_card(card_id)
    print(f"[2] Card approved, status=ACTIVE")

    # 3. 正常支付
    r1 = caw.submit_payment(card_id, "Midjourney", 30.0, {"purpose": "monthly subscription"})
    print(f"[3] Payment 1: {r1['status']} | remaining={r1['remaining_budget']:.2f}")

    # 4. 白名单外支付（应拒绝）
    r2 = caw.submit_payment(card_id, "EvilHacker", 10.0)
    print(f"[4] Payment 2: {r2['status']} | reason={r2['reason']}")

    # 5. 审计
    summary = caw.get_monthly_summary("2026-06")
    print(f"[5] Monthly summary: {summary['transaction_count']} tx, {summary['denied_count']} denied")

    print("\nSelf-test passed. MockCAWClient is ready.")
