"""
RealCAWClient — Cobo Agentic Wallet (CAW) 真实 SDK 同步封装

基于 cobo-agentic-wallet Python SDK (v0.1.40) 封装，
提供与 MockCAWClient 兼容的同步接口，便于现有代码无缝切换。

安装依赖:
    pip install cobo-agentic-wallet nest-asyncio

环境变量:
    AGENT_WALLET_API_URL    (dev: https://api-core.agenticwallet.dev.cobo.com)
    AGENT_WALLET_API_KEY    (格式: caw_...)
    AGENT_WALLET_WALLET_ID  (Wallet UUID)
    CAW_DEFAULT_CHAIN       (默认: BASE_ETH)
    CAW_DEFAULT_TOKEN       (默认: BASE_USDC)
    VENDOR_*_ADDR           (各供应商真实链上地址)

使用:
    from real_caw_client import RealCAWClient
    caw = RealCAWClient()
    card_id = caw.create_card_pact(agent_name="Content Agent", ...)
    caw.approve_card(card_id)   # 轮询等待用户在 App 中批准
    result = caw.submit_payment(card_id, vendor="OpenAI", amount=10.0)

已验证的 SDK 方法签名 (v0.1.40):
    WalletAPIClient(base_url=..., api_key=...)
    submit_pact(wallet_id, intent, spec)
    get_pact(pact_id)
    list_pacts(wallet_id=...)
    revoke_pact(pact_id)
    transfer_tokens(wallet_uuid, *, src_addr, dst_addr, amount, token_id, chain_id, request_id)
    list_user_transactions(wallet_uuid, limit)
    list_audit_logs(wallet_id, action, limit)
"""

from __future__ import annotations

import os
import sys
import json
import uuid
import asyncio
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from service_registry import get_vendor_registry

logger = logging.getLogger(__name__)

# ── SDK 可用性检测 ──────────────────────────────────────────
try:
    from cobo_agentic_wallet import WalletAPIClient
    COBO_SDK_AVAILABLE = True
except ImportError:  # pragma: no cover
    COBO_SDK_AVAILABLE = False
    WalletAPIClient = None  # type: ignore


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════
def _sync(coro) -> Any:
    """在同步上下文中执行异步协程。
    如果 nest_asyncio 可用，则允许在已运行的 event loop 中嵌套执行；
    否则在普通同步上下文中直接 asyncio.run。"""
    try:
        import nest_asyncio  # type: ignore[import-not-found]
        nest_asyncio.apply()
    except ImportError:
        pass
    try:
        loop = asyncio.get_running_loop()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _default_chain() -> str:
    return os.getenv("CAW_DEFAULT_CHAIN", "BASE_ETH")


def _default_token() -> str:
    return os.getenv("CAW_DEFAULT_TOKEN", "BASE_USDC")


def _local_card_cache_path() -> str:
    """Path for non-secret local Pact metadata that CAW list_pacts may omit."""
    return os.getenv(
        "CAW_LOCAL_CARD_CACHE_FILE",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".local_state", "caw_cards.json"),
    )


ERC8004_IDENTITY_REGISTRY_MAINNET = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
ERC8004_IDENTITY_REGISTRY_TESTNET = "0x8004A818BFB912233c491871b3d84c89A494BD9e"


def _default_evm_chain_id(chain_id: Optional[str] = None) -> int:
    """Map CAW chain labels to EIP-155 IDs used by EIP-712 domains."""
    chain = (chain_id or _default_chain()).upper()
    known = {
        "ETH": 1,
        "BASE_ETH": 8453,
        "BASE": 8453,
        "SETH": 11155111,
        "BASE_SEPOLIA": 84532,
        "ARBITRUM_ETH": 42161,
        "OPTIMISM_ETH": 10,
        "POLYGON": 137,
    }
    if chain in known:
        return known[chain]
    return int(os.getenv("CAW_ERC8004_CHAIN_ID", "8453"))


def _erc8004_identity_registry_address(chain_id: Optional[str] = None) -> str:
    """Return the ERC-8004 Identity Registry verifying contract for EIP-712."""
    override = os.getenv("CAW_ERC8004_IDENTITY_REGISTRY_ADDR", "").strip()
    if override:
        return override
    chain = (chain_id or _default_chain()).upper()
    if chain in {"SETH", "BASE_SEPOLIA", "ETH_SEPOLIA", "ARBITRUM_TESTNET", "OPTIMISM_TESTNET"}:
        return ERC8004_IDENTITY_REGISTRY_TESTNET
    return ERC8004_IDENTITY_REGISTRY_MAINNET


def _extract_numeric_agent_ids(*values: Any) -> List[str]:
    """Extract numeric ERC-8004 token IDs from registry URLs or IDs when present."""
    agent_ids: List[str] = []
    for value in values:
        text = str(value or "").strip()
        if not text:
            continue
        url_match = re.search(r"/agents/(?:[^/]+)/([0-9]+)(?:$|[/?#])", text)
        colon_match = re.search(r"(?::|#)([0-9]+)$", text)
        raw = url_match.group(1) if url_match else colon_match.group(1) if colon_match else text if text.isdigit() else ""
        if raw and raw not in agent_ids:
            agent_ids.append(raw)
    return agent_ids


def _is_evm_address(value: Any) -> bool:
    return bool(re.fullmatch(r"0x[a-fA-F0-9]{40}", str(value or "").strip()))


def _build_erc8004_eip712_policy(
    agent_name: str,
    vendor_whitelist: List[Dict[str, Any]],
    erc8004_agent_id: Optional[str],
    erc8004_registry_url: Optional[str],
) -> Dict[str, Any]:
    """Build a CAW message_sign policy for ERC-8004 EIP-712 operations.

    The ERC-8004 Identity Registry uses EIP-712 domain
    name=ERC8004IdentityRegistry, version=1 and type AgentWalletSet for
    agent-wallet verification. CAW's message_sign policy lets us whitelist that
    typed-data domain and constrain message fields instead of treating the
    payload as opaque bytes.
    """
    chain = _default_chain()
    registry_addr = _erc8004_identity_registry_address(chain)
    agent_ids = _extract_numeric_agent_ids(
        erc8004_agent_id,
        erc8004_registry_url,
        *(v.get("erc8004_agent_id") for v in vendor_whitelist),
        *(v.get("erc8004_registry_url") for v in vendor_whitelist),
        *(v.get("token_id") for v in vendor_whitelist),
    )
    allowed_wallets = []
    for vendor in vendor_whitelist:
        address = str(vendor.get("address") or "").strip()
        if _is_evm_address(address) and address not in allowed_wallets:
            allowed_wallets.append(address)

    message_match: List[Dict[str, Any]] = []
    if agent_ids:
        message_match.append({"param_name": "agentId", "op": "in", "value": agent_ids})
    if allowed_wallets:
        message_match.append({"param_name": "newWallet", "op": "in", "value": allowed_wallets})

    when: Dict[str, Any] = {
        "chain_in": [chain],
        "primary_type_in": ["AgentWalletSet"],
        "domain_match": [
            {"param_name": "name", "op": "eq", "value": "ERC8004IdentityRegistry"},
            {"param_name": "version", "op": "eq", "value": "1"},
            {"param_name": "verifyingContract", "op": "eq", "value": registry_addr},
        ],
    }
    if message_match:
        when["message_match"] = message_match

    return {
        "name": f"{agent_name.lower().replace(' ', '-')}-erc8004-eip712-signature-policy",
        "type": "message_sign",
        "rules": {
            "effect": "allow",
            "when": when,
            "review_if": {
                "domain_match": [
                    {"param_name": "verifyingContract", "op": "eq", "value": registry_addr}
                ]
            },
            "deny_if": {
                "usage_limits": {
                    "rolling_1h": {"request_count_gt": 10},
                    "rolling_24h": {"request_count_gt": 50},
                }
            },
        },
    }


def _vendor_address(vendor_name: str) -> str:
    """从环境变量获取供应商真实链上地址；未配置时回退到 x402 demo registry。"""
    key = f"VENDOR_{vendor_name.upper().replace(' ', '_').replace('.', '_')}_ADDR"
    return os.getenv(
        key,
        get_vendor_registry().get(vendor_name, "0x0000000000000000000000000000000000000000"),
    )


# ═══════════════════════════════════════════════════════════════
# RealCAWClient
# ═══════════════════════════════════════════════════════════════

class RealCAWClient:
    """
    真实 CAW SDK 的同步封装，接口尽量与 MockCAWClient 保持一致。
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        wallet_uuid: Optional[str] = None,
    ):
        if not COBO_SDK_AVAILABLE:
            raise ImportError(
                "cobo-agentic-wallet SDK is not installed.\n"
                "Install it with: pip install cobo-agentic-wallet"
            )

        self.base_url = base_url or os.getenv(
            "AGENT_WALLET_API_URL",
            "https://api.agenticwallet.cobo.com",
        )
        self.api_key = api_key or os.getenv("AGENT_WALLET_API_KEY", "")
        self.wallet_uuid = wallet_uuid or os.getenv("AGENT_WALLET_WALLET_ID", "")

        if not self.api_key:
            raise ValueError(
                "CAW API key is required. Set AGENT_WALLET_API_KEY env var.\n"
                "Get it from: caw wallet current --show-api-key"
            )
        if not self.wallet_uuid:
            raise ValueError(
                "CAW Wallet UUID is required. Set AGENT_WALLET_WALLET_ID env var.\n"
                "Get it from: caw wallet current --show-api-key"
            )

        self._client = WalletAPIClient(
            base_url=self.base_url,
            api_key=self.api_key,
        )
        self._owner = os.getenv("CAW_OWNER", "OPC Owner")

        # 本地缓存（真实服务端是权威源，本地仅作辅助）。CAW list_pacts may omit
        # UI-selected provider names/x402 metadata, so persist non-secret metadata.
        self._card_cache_path = _local_card_cache_path()
        self._cards: Dict[str, Dict[str, Any]] = self._load_local_card_cache()
        self._transactions: List[Dict[str, Any]] = []
        self._audit_log: List[Dict[str, Any]] = []

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
        agent_id: Optional[str] = None,
        erc8004_agent_id: Optional[str] = None,
        erc8004_registry_url: Optional[str] = None,
    ) -> str:
        """
        为 Agent 创建一个 Transfer Pact，映射原有 Card 概念。

        策略映射 (基于 CAW Transfer Policy 文档):
        - single_tx_limit   → deny_if.amount_usd_gt (硬拒绝)
                          → review_if.amount_usd_gt (软阈值，触发审批)
        - monthly_budget    → deny_if.usage_limits.rolling_30d.amount_usd_gt (30天滚动窗口)
                          → completion_conditions.amount_spent_usd (硬终止)
        - vendor_whitelist  → when.destination_address_in
        - duration_days     → completion_conditions.time_elapsed (Pact 有效期)
        - cooldown_hours    → 本地 submit_payment 层实现 (CAW 不支持 per-vendor cooldown)
        """
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=duration_days)

        # 构建 destination_address_in
        dest_addrs = []
        for v in vendor_whitelist:
            addr = v.get("address") or _vendor_address(v["name"])
            if addr and addr != "0x0000000000000000000000000000000000000000":
                dest_addrs.append({"chain_id": _default_chain(), "address": addr})

        if not dest_addrs:
            raise ValueError("No valid vendor addresses provided. Set VENDOR_*_ADDR env vars.")

        policies = [
            {
                "name": f"{agent_name.lower().replace(' ', '-')}-transfer-policy",
                "type": "transfer",
                "rules": {
                    "effect": "allow",
                    "when": {
                        "chain_in": [_default_chain()],
                        "token_in": [
                            {"chain_id": _default_chain(), "token_id": _default_token()}
                        ],
                        "destination_address_in": dest_addrs,
                    },
                    "deny_if": {
                        "amount_usd_gt": str(single_tx_limit),
                        "usage_limits": {
                            "rolling_30d": {
                                "amount_usd_gt": str(monthly_budget),
                            }
                        },
                    },
                    "review_if": {
                        "amount_usd_gt": str(single_tx_limit * 0.8),
                    },
                },
            }
        ]
        policies.append(
            _build_erc8004_eip712_policy(
                agent_name=agent_name,
                vendor_whitelist=vendor_whitelist,
                erc8004_agent_id=erc8004_agent_id,
                erc8004_registry_url=erc8004_registry_url,
            )
        )
        erc8004_when = policies[-1]["rules"]["when"]
        erc8004_agent_ids = ", ".join(
            ", ".join(str(item) for item in rule["value"])
            for rule in erc8004_when.get("message_match", [])
            if rule.get("param_name") == "agentId"
        ) or "not constrained (no numeric token id supplied)"

        completion_conditions = [
            {"type": "time_elapsed", "threshold": str(int(duration_days * 86400))},
            {"type": "amount_spent_usd", "threshold": str(monthly_budget)},
        ]

        execution_plan = (
            f"# Summary\n"
            f"Agent card for {agent_name}. Monthly budget ${monthly_budget} USDC, "
            f"single-tx limit ${single_tx_limit}.\n\n"
            f"# Operations\n"
            f"- Transfer USDC to approved vendors on {_default_chain()}\n"
            f"- Vendors: {', '.join(v['name'] for v in vendor_whitelist)}\n"
            f"- ERC-8004 identity: {erc8004_agent_id or 'not provided'}\n"
            f"- ERC-8004 registry: {erc8004_registry_url or 'not provided'}\n\n"
            f"# ERC-8004 EIP-712 Signature Authorization\n"
            f"This Pact uses a CAW `message_sign` policy rather than an opaque ERC-8004 parser. "
            f"The agent may only request EIP-712 signatures for `AgentWalletSet` typed data on "
            f"the ERC-8004 Identity Registry domain.\n"
            f"- Domain name: ERC8004IdentityRegistry\n"
            f"- Domain version: 1\n"
            f"- Domain verifyingContract: {erc8004_when['domain_match'][2]['value']}\n"
            f"- Domain chainId: {_default_evm_chain_id()}\n"
            f"- Primary type: AgentWalletSet\n"
            f"- Allowed agentId values: {erc8004_agent_ids}\n"
            f"- Allowed newWallet values: {', '.join(d['address'] for d in dest_addrs)}\n\n"
            f"# Risk Controls\n"
            f"- Per-tx cap: ${single_tx_limit} (review above ${single_tx_limit * 0.8})\n"
            f"- Monthly cap: ${monthly_budget} (rolling 30d)\n"
            f"- EIP-712 rate limit: deny above 10 signatures/hour or 50 signatures/day\n"
            f"- EIP-712 chain check: CAW rejects domain.chainId mismatches\n"
            f"- Cooldown: {cooldown_hours}h between same-vendor payments (enforced locally)\n"
            f"- Expires: {expires.isoformat()}"
        )

        intent = (
            f"Issue spending card for {agent_name}: "
            f"budget ${monthly_budget}/month, tx limit ${single_tx_limit}"
        )

        pact_spec = {
            "policies": policies,
            "completion_conditions": completion_conditions,
            "execution_plan": execution_plan,
        }
        result = self._submit_pact_via_fresh_sdk(
            wallet_id=self.wallet_uuid,
            intent=intent,
            spec=pact_spec,
        )

        # 解析 pact_id（SDK 返回结构可能嵌套在 result 中）
        pact_id = result.get("pact_id") or result.get("result", {}).get("pact_id")
        if not pact_id:
            raise RuntimeError(f"submit_pact returned unexpected structure: {result}")

        # 保存本地映射
        self._cards[pact_id] = {
            "card_id": pact_id,
            "agent_name": agent_name,
            "card_name": agent_name,
            "agent_id": agent_id or f"agent-{agent_name.lower().replace(' ', '-')}-{uuid.uuid4().hex[:4]}",
            "assigned_agent_id": "",
            "assigned_agent_name": "",
            "assigned_at": "",
            "owner": owner or self._owner,
            "status": "PENDING_APPROVAL",
            "budget": {
                "currency": "USDC",
                "monthly_max": monthly_budget,
                "spent": 0.0,
                "single_tx_limit": single_tx_limit,
            },
            "vendor_whitelist": vendor_whitelist,
            "cooldown_hours": cooldown_hours,
            "time_window": {
                "start": now.isoformat(),
                "end": expires.isoformat(),
                "allowed_hours_start": "00:00",
                "allowed_hours_end": "23:59",
            },
            "created_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "api_key": "",
            "x402_enabled": any(bool(v.get("x402_url")) for v in vendor_whitelist),
            "x402_url": next((v.get("x402_url") for v in vendor_whitelist if v.get("x402_url")), None),
            "erc8004_agent_id": erc8004_agent_id or next((v.get("erc8004_agent_id") for v in vendor_whitelist if v.get("erc8004_agent_id")), None),
            "erc8004_registry_url": erc8004_registry_url or next((v.get("erc8004_registry_url") for v in vendor_whitelist if v.get("erc8004_registry_url")), None),
        }
        self._save_local_card_cache()

        self._log_audit("PACT_CREATED", pact_id, {
            "agent_name": agent_name,
            "monthly_budget": monthly_budget,
            "vendor_count": len(vendor_whitelist),
        })
        return pact_id

    def approve_card(self, card_id: str, poll_interval: int = 5, max_wait: int = 300) -> Dict[str, Any]:
        """
        轮询等待 Pact 状态变为 ACTIVE。

        真实流程中，用户需要在 Cobo Agentic Wallet App 中点击 Approve。
        本方法会每隔 poll_interval 秒查询一次状态，最多等待 max_wait 秒。

        如果在 max_wait 秒内未变为 ACTIVE，抛出 TimeoutError。
        """
        card = self._get_card_or_raise(card_id)
        if card["status"] == "ACTIVE":
            return {"card_id": card_id, "status": "ACTIVE", "api_key": card.get("api_key", "")}

        logger.info(
            "[CAW] Waiting for Pact %s approval. Please approve it in the Cobo Agentic Wallet App...",
            card_id,
        )

        waited = 0
        while waited < max_wait:
            try:
                pact = _sync(self._client.get_pact(card_id))
                status = self._extract_pact_status(pact)

                if status == "ACTIVE":
                    card["status"] = "ACTIVE"
                    # 注意：Pact-scoped API Key 理论上由 SDK/runtime 返回，
                    # 但文档说明它仅返回给 runtime。如果 get_pact 不返回 key，
                    # 则我们继续使用 Principal API Key（测试阶段可行）。
                    scoped_key = pact.get("pact_scoped_api_key") or ""
                    card["api_key"] = scoped_key
                    self._save_local_card_cache()

                    self._log_audit("PACT_APPROVED", card_id, {})
                    return {
                        "card_id": card_id,
                        "status": "ACTIVE",
                        "api_key": scoped_key or self.api_key[:12] + "...",
                        "delegation_scope": "wallet:spend:limited",
                    }

                if status in ("REJECTED", "REVOKED", "EXPIRED", "WITHDRAWN"):
                    card["status"] = status
                    raise RuntimeError(f"Pact {card_id} is {status} — cannot proceed")

            except Exception as exc:
                logger.warning("[CAW] Pact poll error: %s", exc)

            import time
            time.sleep(poll_interval)
            waited += poll_interval

        raise TimeoutError(
            f"Pact {card_id} was not approved within {max_wait}s. "
            "Please open the Cobo Agentic Wallet App and approve it manually, "
            "then call approve_card() again."
        )

    def assign_card(self, card_id: str, agent_id: str, agent_name: str) -> Dict[str, Any]:
        """Persist assignment locally; CAW remains lifecycle authority for the Pact."""
        card = self._get_card_or_raise(card_id)
        if card.get("status") != "ACTIVE":
            raise ValueError(f"Card {card_id} must be ACTIVE before assignment (status={card.get('status')})")
        if not agent_id.strip():
            raise ValueError("agent_id is required")
        if not agent_name.strip():
            raise ValueError("agent_name is required")

        now = datetime.now(timezone.utc).isoformat()
        next_card = dict(card)
        next_card["card_name"] = next_card.get("card_name") or next_card.get("agent_name") or card_id
        next_card["assigned_agent_id"] = agent_id
        next_card["assigned_agent_name"] = agent_name
        next_card["assigned_at"] = now
        self._cards[card_id] = next_card
        self._save_local_card_cache()
        self._log_audit("CARD_ASSIGNED", card_id, {
            "assigned_agent_id": agent_id,
            "assigned_agent_name": agent_name,
        })
        return {
            "card_id": card_id,
            "status": "ASSIGNED",
            "assigned_agent_id": agent_id,
            "assigned_agent_name": agent_name,
            "assigned_at": now,
        }

    def revoke_card(self, card_id: str) -> Dict[str, Any]:
        """吊销 Pact，立即失效。

        CAW revoke_pact 只允许 Owner API key 调用。当使用 Agent key 时，
        CAW 会返回 404 "Pact not found"（安全考虑伪装）。
        因此先验证 get_pact 能否读取，再尝试 revoke，以区分真正的
        "not found" 和 "权限不足"。
        """
        card = self._get_card_or_raise(card_id)

        # 先验证 pact 在 CAW 中是否真正存在
        try:
            _sync(self._client.get_pact(card_id))
        except Exception as exc:
            # 真正不存在 → 直接将本地状态标为 REVOKED
            logger.warning("[CAW] Pact %s not found on CAW (get_pact failed): %s", card_id, exc)
            card["status"] = "REVOKED"
            card["api_key"] = ""
            self._save_local_card_cache()
            self._log_audit("PACT_REVOKED", card_id, {"reason": "pact_not_found_on_caw", "note": "local_cleanup_only"})
            return {"card_id": card_id, "status": "REVOKED", "api_key_invalidated": True}

        # Pact 存在 → 尝试 revoke
        try:
            _sync(self._client.revoke_pact(card_id))
        except Exception as exc:
            # 如果 get_pact 能成功但 revoke_pact 返回 404，说明当前 API key
            # 是 Agent key 而非 Owner key。CAW 故意返回 404 伪装权限不足。
            err_str = str(exc).lower()
            if "not found" in err_str or "404" in err_str:
                raise PermissionError(
                    f"Revoke denied for pact {card_id}: current API key is an Agent key, "
                    f"but CAW revoke_pact requires an Owner API key. "
                    f"Get the Owner key with: caw wallet current --show-api-key "
                    f"and set AGENT_WALLET_OWNER_API_KEY env var."
                ) from exc
            logger.warning("[CAW] revoke_pact API call failed (may already be revoked): %s", exc)

        card["status"] = "REVOKED"
        card["api_key"] = ""
        self._save_local_card_cache()

        self._log_audit("PACT_REVOKED", card_id, {"reason": "owner_manual_revoke"})
        return {"card_id": card_id, "status": "REVOKED", "api_key_invalidated": True}

    def get_card(self, card_id: str) -> Dict[str, Any]:
        """获取 Card/Pact 详情（优先本地缓存，回退 API）。"""
        if card_id in self._cards:
            return dict(self._cards[card_id])
        # 如果本地没有，尝试从 API 获取
        try:
            pact = _sync(self._client.get_pact(card_id))
            card = self._merge_api_card_with_local(card_id, self._pact_to_card_dict(pact))
            self._cards[card_id] = card
            self._save_local_card_cache()
            return card
        except Exception as exc:
            raise ValueError(f"Card {card_id} not found: {exc}")

    def _is_junk_pact(self, card: Dict[str, Any]) -> bool:
        """Heuristic filter for demo / test pacts that clutter the Cards UI."""
        import re
        name = str(card.get("agent_name") or card.get("card_name") or "").strip()
        if not name:
            return False
        # All-caps gibberish like ZZZ, CCCC, AAAA, SSS, WWW, TTTT
        if re.match(r'^[A-Z]{3,4}$', name):
            return True
        # Known test / demo names and system default pacts
        junk_patterns = (
            "verification card",
            "neo test",
            "random-demo",
            "hackathon-seth",
            "demo-sepolia",
            "test transfer",
            "default",
        )
        lower = name.lower()
        for pat in junk_patterns:
            if pat in lower:
                return True
        return False

    def list_cards(self) -> List[Dict[str, Any]]:
        """列出所有 Pacts（本地缓存 + API 补充），过滤测试垃圾数据。"""
        try:
            pacts = self._fetch_pacts_via_http()
            for p in pacts:
                pid = p.get("pact_id") or p.get("id")
                if pid:
                    self._cards[pid] = self._merge_api_card_with_local(pid, self._pact_to_card_dict(p))
        except Exception as exc:
            logger.warning("[CAW] HTTP list_pacts failed (%s), falling back to SDK", exc)
            try:
                result = _sync(self._client.list_pacts(wallet_id=self.wallet_uuid))
                pacts = self._extract_list_items(result, preferred_key="pacts")
                for p in pacts:
                    pid = p.get("pact_id") or p.get("id")
                    if pid:
                        self._cards[pid] = self._merge_api_card_with_local(pid, self._pact_to_card_dict(p))
            except Exception as exc2:
                logger.warning("[CAW] SDK list_pacts also failed: %s", exc2)

        self._save_local_card_cache()

        cards = [dict(c) for c in self._cards.values()]
        cleaned = [c for c in cards if not self._is_junk_pact(c)]
        if len(cleaned) < len(cards):
            logger.info("[CAW] Filtered out %d junk/demo pacts", len(cards) - len(cleaned))
        return cleaned

    def _submit_pact_via_fresh_sdk(self, wallet_id: str, intent: str, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Pact via a fresh SDK client instance.

        The singleton SDK client's aiohttp session can hit "Future attached to a different loop"
        when reused across FastAPI sync endpoints. A fresh client per call ensures the
        aiohttp connector is bound to the current event loop only.
        """
        if WalletAPIClient is None:
            raise ImportError("cobo-agentic-wallet SDK is not installed. Run: pip install cobo-agentic-wallet")
        fresh_client = WalletAPIClient(base_url=self.base_url, api_key=self.api_key)
        return _sync(fresh_client.submit_pact(wallet_id=wallet_id, intent=intent, spec=spec))

    def _fetch_pacts_via_http(self) -> List[Dict[str, Any]]:
        """使用同步 urllib 调用 CAW REST API 获取 Pact 列表。"""
        data = self._http_get_json(
            "/api/v1/pacts",
            {
                "wallet_id": self.wallet_uuid,
                "limit": 100,
                "include_default": "true",
            },
        )
        return self._extract_list_items(data.get("result", data), preferred_key="pacts")

    @staticmethod
    def _extract_list_items(payload: Any, preferred_key: str = "items") -> List[Dict[str, Any]]:
        """Normalize CAW list responses that may be plain lists or nested dicts."""
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
        if not isinstance(payload, dict):
            return []
        for key in (preferred_key, "items", "records", "data", "results"):
            value = payload.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
        return []

    def get_wallet_balance(self) -> Dict[str, Any]:
        """获取钱包真实余额。

        CAW wallet 是多链、多资产钱包。`chain_id`/`token_id` 是过滤条件；如果只查
        `BASE_ETH + BASE_USDC`，而钱包实际持有 `SETH` / `SOLDEV_SOL_USDC`，API 会
        正确返回空列表，前端就会误显示 0。因此 dashboard 先拉取钱包所有资产，再
        选择一个有余额的主资产展示，同时把完整 balances 列表返回给前端。

        在 FastAPI 同步 endpoint 中反复用 SDK async client 时，aiohttp 连接可能绑定到
        上一次 asyncio.run() 创建的 event loop，导致 `Future attached to a different loop`。
        余额查询是简单 GET，因此优先用同步 HTTP，避免 event-loop 交叉污染。
        """
        try:
            return self._fetch_balance_via_http()
        except Exception as exc:
            logger.warning("[CAW] HTTP list_balances failed (%s), falling back to SDK", exc)

        try:
            result = _sync(
                self._client.list_balances(
                    wallet_uuid=self.wallet_uuid,
                    limit=50,
                )
            )
            balances = result if isinstance(result, list) else result.get("balances", [])
            return self._balance_response_from_records(balances)
        except Exception as exc2:
            logger.warning("[CAW] SDK list_balances also failed: %s", exc2)
            return self._build_balance_response(0.0, _default_token(), balances=[])

    def _fetch_balance_via_http(self) -> Dict[str, Any]:
        """使用同步 urllib 调用 CAW REST API 获取余额。"""
        data = self._http_get_json(
            "/api/v1/wallets/balances",
            {
                "wallet_uuid": self.wallet_uuid,
                "limit": 50,
            },
        )
        balances = data.get("result", [])
        return self._balance_response_from_records(balances)

    def _balance_response_from_records(self, balances: Any) -> Dict[str, Any]:
        """从 CAW balance records 构建统一响应。"""
        target_token = _default_token()
        if isinstance(balances, dict):
            balances = balances.get("items") or balances.get("balances") or []
        if not isinstance(balances, list):
            balances = []

        assets = [self._balance_asset_from_record(b) for b in balances]

        def is_positive(asset: Dict[str, Any]) -> bool:
            return float(asset.get("amount", 0) or 0) > 0

        # 首选：配置的目标 token 有余额；其次任意 USDC 有余额；再次任意有余额资产。
        # 如果都没有余额，再回退到目标 token 记录或第一条记录。
        selected = next((a for a in assets if a["token_id"] == target_token and is_positive(a)), None)
        selected = selected or next((a for a in assets if a["token_id"].endswith("USDC") and is_positive(a)), None)
        selected = selected or next((a for a in assets if is_positive(a)), None)
        selected = selected or next((a for a in assets if a["token_id"] == target_token), None)
        selected = selected or (assets[0] if assets else None)

        if selected:
            return self._build_balance_response(
                float(selected["amount"]),
                selected["token_id"],
                selected.get("updated_at"),
                chain_id=selected.get("chain_id"),
                address=selected.get("address"),
                balances=assets,
            )
        return self._build_balance_response(0.0, target_token, balances=[])

    def _balance_asset_from_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a CAW balance record for API/frontend consumption."""
        token_id = str(record.get("token_id") or record.get("token") or _default_token())
        amount = float(record.get("amount", record.get("balance", 0)) or 0)
        return {
            "wallet_uuid": record.get("wallet_uuid") or self.wallet_uuid,
            "chain_id": record.get("chain_id") or "",
            "token_id": token_id,
            "amount": amount,
            "amount_formatted": f"{amount:.6f}".rstrip("0").rstrip(".") or "0",
            "currency": token_id.split("_")[-1] if "_" in token_id else token_id,
            "address": record.get("address") or record.get("address_id") or "",
            "updated_at": record.get("updated_at") or record.get("balance_updated_at") or datetime.now(timezone.utc).isoformat(),
        }

    def _http_get_json(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """CAW REST GET helper. Keeps read-only dashboard calls off the SDK async loop."""
        import urllib.parse
        import urllib.request
        import json

        clean_params = {k: v for k, v in params.items() if v is not None}
        query = urllib.parse.urlencode(clean_params)
        url = f"{self.base_url.rstrip('/')}{path}?{query}" if query else f"{self.base_url.rstrip('/')}{path}"
        req = urllib.request.Request(url, headers={
            "X-API-Key": self.api_key,
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode())

    def _http_post_json(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """CAW REST POST helper. Avoids aiohttp event-loop reuse in FastAPI sync routes."""
        import urllib.error
        import urllib.request
        import json

        url = f"{self.base_url.rstrip('/')}{path}"
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "X-API-Key": self.api_key,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            raise RuntimeError(f"HTTP {exc.code} from CAW POST {path}: {detail}") from exc

    def _build_balance_response(
        self,
        balance: float,
        token_id: str,
        updated_at: Optional[str] = None,
        chain_id: Optional[str] = None,
        address: Optional[str] = None,
        balances: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """构建统一的余额响应格式。"""
        return {
            "wallet_uuid": self.wallet_uuid,
            "chain_id": chain_id or _default_chain(),
            "token_id": token_id,
            "balance": balance,
            "balance_formatted": f"{balance:.6f}".rstrip("0").rstrip(".") or "0",
            "currency": token_id.split("_")[-1] if "_" in token_id else token_id,
            "address": address or "",
            "updated_at": updated_at or datetime.now(timezone.utc).isoformat(),
            "balances": balances or [],
        }

    def _resolve_source_address(self, chain_id: str, token_id: str) -> str:
        """Return the on-chain source address required by CAW transfer_tokens.

        Newer CAW API versions require `src_addr` in addition to the wallet UUID.
        Prefer an explicit env override, then derive the active wallet address from
        the balances endpoint because each CAW balance record includes the chain
        address that owns the asset.
        """
        for env_name in (
            "CAW_SRC_ADDR",
            "CAW_SOURCE_ADDRESS",
            "AGENT_WALLET_SRC_ADDR",
            "AGENT_WALLET_ADDRESS",
        ):
            value = os.getenv(env_name, "").strip()
            if value:
                return value

        cache_key = f"{chain_id}:{token_id}"
        cached = getattr(self, "_src_addr_cache", {}).get(cache_key)
        if cached:
            return cached

        data = self._http_get_json(
            "/api/v1/wallets/balances",
            {"wallet_uuid": self.wallet_uuid, "limit": 50},
        )
        result = data.get("result", data)
        if isinstance(result, dict):
            balance_records = self._extract_list_items(result, preferred_key="balances")
        elif isinstance(result, list):
            balance_records = [item for item in result if isinstance(item, dict)]
        else:
            balance_records = []

        def record_address(record: Dict[str, Any]) -> str:
            return str(record.get("address") or record.get("address_id") or record.get("src_addr") or "").strip()

        candidates = [record for record in balance_records if record_address(record)]
        ordered = (
            [r for r in candidates if r.get("chain_id") == chain_id and r.get("token_id") == token_id]
            or [r for r in candidates if r.get("chain_id") == chain_id]
            or [r for r in candidates if r.get("token_id") == token_id]
            or candidates
        )
        if ordered:
            src_addr = record_address(ordered[0])
            cache = dict(getattr(self, "_src_addr_cache", {}))
            cache[cache_key] = src_addr
            self._src_addr_cache = cache
            return src_addr

        raise ValueError(
            "CAW transfer_tokens requires src_addr, but no wallet source address "
            "was found. Set CAW_SRC_ADDR/AGENT_WALLET_ADDRESS or ensure "
            "GET /api/v1/wallets/balances returns an address for the payment chain."
        )

    def _transfer_tokens_via_http(
        self,
        *,
        wallet_uuid: str,
        src_addr: str,
        dst_addr: str,
        amount: str,
        token_id: str,
        chain_id: str,
        request_id: str,
    ) -> Dict[str, Any]:
        """Initiate a token transfer through synchronous REST instead of the async SDK.

        The SDK transfer path uses aiohttp and can reuse a connector bound to a
        different FastAPI event loop. The generated REST client posts to this
        endpoint under the hood, so calling it synchronously avoids the loop bug.
        """
        import urllib.parse

        wallet_path = urllib.parse.quote(wallet_uuid, safe="")
        return self._http_post_json(
            f"/api/v1/wallets/{wallet_path}/transfer",
            {
                "src_addr": src_addr,
                "dst_addr": dst_addr,
                "amount": amount,
                "token_id": token_id,
                "chain_id": chain_id,
                "request_id": request_id,
            },
        )

    # ───────────────────────────────────────────
    # Policy Engine — Payment
    # ───────────────────────────────────────────

    def submit_payment(
        self,
        card_id: str,
        vendor: str,
        amount: float,
        agent_id: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        提交一笔转账请求。真实 CAW 中，这会经过 Policy Engine 三阶段评估，
        然后在 MPC TSS 签名后上链。
        """
        card = self._get_card_or_raise(card_id)
        meta = metadata or {}
        now = datetime.now(timezone.utc)
        tx_id = f"tx-{uuid.uuid4().hex[:10]}"
        vendor_addr = _vendor_address(vendor)

        # ── Stage 1: Permission Check（本地前置校验）──
        if card["status"] != "ACTIVE":
            reason = f"PERMISSION_DENIED: card status is {card['status']}"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason, metadata=meta)
            return self._payment_result(tx, card, "DENIED", reason)

        if not card.get("assigned_agent_id"):
            reason = "PERMISSION_DENIED: card_not_assigned"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason, metadata=meta)
            return self._payment_result(tx, card, "DENIED", reason)

        if agent_id != card.get("assigned_agent_id"):
            reason = f"PERMISSION_DENIED: agent_not_assigned ({agent_id} cannot use {card_id})"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason, metadata=meta)
            return self._payment_result(tx, card, "DENIED", reason)

        if amount <= 0:
            reason = "PERMISSION_DENIED: amount must be positive"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason)
            return self._payment_result(tx, card, "DENIED", reason)

        # ── Cooldown 检查（本地层实现，因为 Policy Engine 不支持动态时间窗口）──
        cooldown_hours = card.get("cooldown_hours", 0)
        if cooldown_hours > 0:
            cooldown_delta = timedelta(hours=cooldown_hours)
            for past_tx in reversed(self._transactions):
                if (
                    past_tx.get("card_id") == card_id
                    and past_tx.get("vendor") == vendor
                    and past_tx.get("status") == "APPROVED"
                ):
                    try:
                        tx_time = datetime.fromisoformat(past_tx["timestamp"].replace("Z", "+00:00"))
                        if now - tx_time < cooldown_delta:
                            reason = f"PERMISSION_DENIED: cooldown {cooldown_hours}h not elapsed since last payment to {vendor}"
                            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason)
                            return self._payment_result(tx, card, "DENIED", reason)
                    except (ValueError, KeyError):
                        pass
                    break
        request_id = meta.get("request_id") or f"pay-{now.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4]}"

        try:
            chain_id = _default_chain()
            token_id = _default_token()
            src_addr = self._resolve_source_address(chain_id, token_id)
            result = self._transfer_tokens_via_http(
                wallet_uuid=self.wallet_uuid,
                chain_id=chain_id,
                src_addr=src_addr,
                dst_addr=vendor_addr,
                token_id=token_id,
                amount=str(amount),
                request_id=request_id,
            )
            result_payload = result.get("result", result) if isinstance(result, dict) else {}

            # 解析结果
            tx_status = "APPROVED"
            reason = "All checks passed"
            tx_hash = result_payload.get("tx_hash") or result_payload.get("transaction_hash") or ""

            # 更新本地预算（真实服务端是权威源，此处仅作估算）
            card["budget"]["spent"] = card["budget"].get("spent", 0) + amount

            tx = self._record_tx(
                tx_id, card, vendor, vendor_addr, amount, "APPROVED", reason,
                tx_hash=tx_hash, metadata=meta
            )

            self._log_audit("PAYMENT_APPROVED", card_id, {
                "tx_id": tx_id,
                "amount": amount,
                "vendor": vendor,
                "request_id": request_id,
                "remaining": card["budget"]["monthly_max"] - card["budget"]["spent"],
            })

            return self._payment_result(tx, card, "APPROVED", reason, "none", tx_hash)

        except Exception as exc:
            err_str = str(exc)
            # 尝试解析 Policy Engine 拒绝原因
            if any(k in err_str.lower() for k in ("denied", "policy", "limit", "allowlist")):
                status = "DENIED"
                reason = f"POLICY_DENIED: {err_str}"
            else:
                status = "DENIED"
                reason = f"ERROR: {err_str}"

            tx = self._record_tx(
                tx_id, card, vendor, vendor_addr, amount, status, reason,
                metadata=meta
            )
            return self._payment_result(tx, card, status, reason)

    # ───────────────────────────────────────────
    # Audit Pipeline
    # ───────────────────────────────────────────

    def list_transaction_records(
        self,
        card_id: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """查询交易记录（优先同步 HTTP，失败回退 SDK / 本地缓存）。"""
        try:
            data = self._http_get_json(
                "/api/v1/wallets/transactions",
                {
                    "wallet_uuid": self.wallet_uuid,
                    "limit": 100,
                },
            )
            records = data.get("result", [])
            self._transactions = [self._api_tx_to_dict(r) for r in records]
        except Exception as exc:
            logger.warning("[CAW] HTTP list_user_transactions failed: %s", exc)
            try:
                result = _sync(
                    self._client.list_user_transactions(
                        wallet_uuid=self.wallet_uuid,
                        limit=100,
                        chain_id=_default_chain(),
                        token_id=_default_token(),
                    )
                )
                records = result if isinstance(result, list) else result.get("records", [])
                self._transactions = [self._api_tx_to_dict(r) for r in records]
            except Exception as exc2:
                logger.warning("[CAW] SDK list_user_transactions also failed: %s", exc2)

        # 过滤
        filtered = []
        for tx in self._transactions:
            if card_id and tx.get("card_id") != card_id:
                continue
            if start_time and tx.get("timestamp", "") < start_time:
                continue
            if end_time and tx.get("timestamp", "") > end_time:
                continue
            filtered.append(tx)
        return filtered

    def get_monthly_summary(self, month: str = "2026-06") -> Dict[str, Any]:
        """生成月末审计报表（结合 API 审计日志 + 本地缓存）。"""
        try:
            data = self._http_get_json(
                "/api/v1/audit-logs",
                {
                    "wallet_id": self.wallet_uuid,
                    "action": "transfer.initiate",
                    "limit": 200,
                },
            )
            result = data.get("result", [])
            api_logs = result if isinstance(result, list) else result.get("items", [])
        except Exception as exc:
            logger.warning("[CAW] HTTP list_audit_logs failed: %s", exc)
            api_logs = []

        # 合并本地与 API 记录（简单去重）
        month_tx = [
            tx for tx in self._transactions
            if tx.get("timestamp", "").startswith(month)
        ]

        total_income = 3200.0  # mock: OPC 本月收入
        total_approved = sum(t["amount"] for t in month_tx if t["status"] == "APPROVED")
        total_denied = sum(t["amount"] for t in month_tx if t["status"] == "DENIED")
        denied_count = len([t for t in month_tx if t["status"] == "DENIED"])

        by_agent: Dict[str, Dict[str, Any]] = {}
        for tx in month_tx:
            agent = tx.get("agent_id", "unknown")
            if agent not in by_agent:
                by_agent[agent] = {"spent": 0.0, "tx_count": 0, "vendors": set(), "denied": 0}
            if tx["status"] == "APPROVED":
                by_agent[agent]["spent"] += tx["amount"]
            by_agent[agent]["tx_count"] += 1
            by_agent[agent]["vendors"].add(tx["vendor"])
            if tx["status"] == "DENIED":
                by_agent[agent]["denied"] += 1

        anomalies = [
            {
                "tx_id": tx["tx_id"],
                "agent": tx["agent_id"],
                "amount": tx["amount"],
                "reason": tx["reason"],
                "alert": tx.get("alert_level", "none"),
            }
            for tx in month_tx
            if tx.get("alert_level") in ("blocked", "human_review") or tx["status"] == "DENIED"
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
        """导出完整审计日志到 JSONL。"""
        with open(filepath, "w", encoding="utf-8") as f:
            for entry in self._audit_log:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        logger.info("[CAW] Audit log exported to %s", filepath)

    # ───────────────────────────────────────────
    # Internal Helpers
    # ───────────────────────────────────────────
    def _merge_api_card_with_local(self, card_id: str, api_card: Dict[str, Any]) -> Dict[str, Any]:
        """Merge CAW API Pact data without losing local x402/vendor metadata.

        CAW list_pacts is the authority for lifecycle status, but it often returns
        policy destinations as bare addresses and may omit the exact provider names
        and x402/ERC-8004 fields selected in the UI at creation time. Preserve those
        local fields for newly-created cards so the Cards and Agent Console pages can
        show the selected suppliers after a refresh.
        """
        local = self._cards.get(card_id)
        if not local:
            return api_card

        merged = {**api_card}
        for key in (
            "agent_name",
            "card_name",
            "agent_id",
            "assigned_agent_id",
            "assigned_agent_name",
            "assigned_at",
            "budget",
            "vendor_whitelist",
            "cooldown_hours",
            "time_window",
            "created_at",
            "expires_at",
            "x402_enabled",
            "x402_url",
            "erc8004_agent_id",
            "erc8004_registry_url",
        ):
            local_value = local.get(key)
            api_value = merged.get(key)
            if key == "vendor_whitelist":
                if local_value and not api_value:
                    merged[key] = local_value
                elif local_value and api_value:
                    local_names = {str(v.get("name")) for v in local_value if isinstance(v, dict)}
                    api_names = {str(v.get("name")) for v in api_value if isinstance(v, dict)}
                    # CAW-derived names are usually truncated addresses; keep the UI-selected providers.
                    if local_names and all(name.endswith("...") for name in api_names if name):
                        merged[key] = local_value
                continue
            if key in (
                "agent_name",
                "card_name",
                "agent_id",
                "assigned_agent_id",
                "assigned_agent_name",
                "assigned_at",
                "cooldown_hours",
                "time_window",
                "created_at",
                "expires_at",
            ) and local_value not in (None, "", [], {}):
                merged[key] = local_value
                continue
            if local_value not in (None, "", [], {}) and api_value in (None, "", [], {}, 0, 0.0):
                merged[key] = local_value

        local_budget = local.get("budget") or {}
        api_budget = merged.get("budget") or {}
        if isinstance(local_budget, dict) and isinstance(api_budget, dict):
            merged["budget"] = {
                **api_budget,
                "monthly_max": api_budget.get("monthly_max") or local_budget.get("monthly_max", 0.0),
                "single_tx_limit": api_budget.get("single_tx_limit") or local_budget.get("single_tx_limit", 0.0),
                "currency": api_budget.get("currency") or local_budget.get("currency", "USDC"),
            }
        return merged

    def _get_card_or_raise(self, card_id: str) -> Dict[str, Any]:

        if card_id not in self._cards:
            # 尝试从 API 刷新
            try:
                pact = _sync(self._client.get_pact(card_id))
                self._cards[card_id] = self._merge_api_card_with_local(card_id, self._pact_to_card_dict(pact))
                self._save_local_card_cache()
            except Exception as exc:
                raise ValueError(f"Card {card_id} not found: {exc}")
        return self._cards[card_id]

    def _load_local_card_cache(self) -> Dict[str, Dict[str, Any]]:
        """Load non-secret local card metadata persisted across backend restarts."""
        path = getattr(self, "_card_cache_path", _local_card_cache_path())
        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = json.load(f)
        except FileNotFoundError:
            return {}
        except Exception as exc:
            logger.warning("[CAW] Failed to load local card metadata cache %s: %s", path, exc)
            return {}

        cards = payload.get("cards", payload) if isinstance(payload, dict) else {}
        if not isinstance(cards, dict):
            return {}
        return {str(card_id): card for card_id, card in cards.items() if isinstance(card, dict)}

    def _save_local_card_cache(self) -> None:
        """Persist non-secret card metadata so vendor whitelist survives CAW refreshes/restarts."""
        if not hasattr(self, "_card_cache_path"):
            return
        path = self._card_cache_path
        safe_cards: Dict[str, Dict[str, Any]] = {}
        for card_id, card in getattr(self, "_cards", {}).items():
            if not isinstance(card, dict):
                continue
            safe_card = dict(card)
            # Pact-scoped API keys are credentials; keep them in memory only.
            safe_card["api_key"] = ""
            safe_cards[str(card_id)] = safe_card
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"cards": safe_cards}, f, ensure_ascii=False, indent=2, sort_keys=True)
        except Exception as exc:
            logger.warning("[CAW] Failed to save local card metadata cache %s: %s", path, exc)

    def _log_audit(self, action: str, card_id: str, details: Dict[str, Any]):
        self._audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "card_id": card_id,
            "details": details,
        })

    def _record_tx(
        self,
        tx_id: str,
        card: Dict[str, Any],
        vendor: str,
        vendor_addr: str,
        amount: float,
        status: str,
        reason: str,
        alert_level: str = "none",
        tx_hash: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        tx = {
            "tx_id": tx_id,
            "card_id": card["card_id"],
            "agent_id": card.get("assigned_agent_id") or card["agent_id"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "vendor": vendor,
            "vendor_address": vendor_addr,
            "amount": amount,
            "currency": card["budget"]["currency"],
            "status": status,
            "reason": reason,
            "remaining_budget": card["budget"]["monthly_max"] - card["budget"].get("spent", 0),
            "tx_hash": tx_hash,
            "metadata": metadata or {},
            "alert_level": alert_level,
        }
        self._transactions.append(tx)
        return tx

    def _payment_result(
        self,
        tx: Dict[str, Any],
        card: Dict[str, Any],
        status: str,
        reason: str,
        alert_level: str = "none",
        tx_hash: str = "",
    ) -> Dict[str, Any]:
        return {
            "status": status,
            "reason": reason,
            "tx_id": tx["tx_id"],
            "amount": tx["amount"],
            "vendor": tx["vendor"],
            "remaining_budget": card["budget"]["monthly_max"] - card["budget"].get("spent", 0),
            "tx_hash": tx_hash or tx.get("tx_hash", ""),
            "alert_level": alert_level,
        }

    # ── SDK 响应解析适配 ──────────────────────────────

    def _extract_pact_status(self, pact: Dict[str, Any]) -> str:
        """从 SDK get_pact 响应中提取并归一化状态字符串。"""
        status = pact.get("status") or pact.get("state") or pact.get("pact_status", "")
        normalized = str(status or "").upper()
        status_map = {
            "APPROVED": "ACTIVE",
            "APPROVAL_PENDING": "PENDING_APPROVAL",
            "PENDING": "PENDING_APPROVAL",
            "PENDING_APPROVAL": "PENDING_APPROVAL",
            "ACTIVE": "ACTIVE",
            "COMPLETED": "COMPLETED",
            "REVOKED": "REVOKED",
            "REJECTED": "REVOKED",
            "EXPIRED": "EXPIRED",
            "WITHDRAWN": "REVOKED",
        }
        return status_map.get(normalized, normalized or "UNKNOWN")

    def _pact_to_card_dict(self, pact: Dict[str, Any]) -> Dict[str, Any]:
        """将 CAW Pact 对象转换为与 Mock 兼容的 Card dict。

        策略：
        1. 优先从 spec.policies 中解析 budget / limit / vendors（get_pact 详情）
        2. 如果 spec 为空（list_pacts 精简响应），从 name/intent 字段解析
        3. 从 progress_usd_spent 读取已花费金额
        4. 从 execution_plan 解析 vendor 名称（如果 spec 中没有）
        """
        import re

        pid = pact.get("pact_id") or pact.get("id") or "unknown"
        name = pact.get("name") or pact.get("intent", "Unknown Agent")
        spec = pact.get("spec") or {}
        policies = spec.get("policies", []) if isinstance(spec, dict) else []
        execution_plan = spec.get("execution_plan", "") if isinstance(spec, dict) else ""

        # ── Fallback 解析：从 name/intent 提取 budget/limit/agent_name ──
        parsed = {"agent_name": name, "monthly_max": 0.0, "single_tx_limit": 0.0}
        m = re.search(
            r'Issue spending card for\s+([^:]+):\s*budget\s+\$([\d.]+)/month,\s*tx limit\s+\$([\d.]+)',
            name,
            re.IGNORECASE,
        )
        if m:
            parsed["agent_name"] = m.group(1).strip()
            parsed["monthly_max"] = float(m.group(2))
            parsed["single_tx_limit"] = float(m.group(3))

        # 尝试从 policy 中恢复 budget / tx_limit
        single_tx_limit = 0.0
        if policies:
            rules = policies[0].get("rules", {})
            deny_if = rules.get("deny_if", {})
            try:
                single_tx_limit = float(deny_if.get("amount_usd_gt", 0))
            except (TypeError, ValueError):
                single_tx_limit = 0.0

        # monthly_max: 旧 Pact 可能从 usage_limits 读取，新 Pact 从 completion_conditions 读取
        monthly_max = 0.0
        if policies:
            deny_if = policies[0].get("rules", {}).get("deny_if", {})
            usage = deny_if.get("usage_limits", {})
            if usage:
                rolling_30d = usage.get("rolling_30d", {})
                try:
                    monthly_max = float(rolling_30d.get("amount_usd_gt", 0))
                except (TypeError, ValueError):
                    monthly_max = 0.0
        if not monthly_max and isinstance(spec, dict):
            for condition in spec.get("completion_conditions", []):
                if condition.get("type") == "amount_spent_usd":
                    try:
                        monthly_max = float(condition.get("threshold", 0))
                    except (TypeError, ValueError):
                        monthly_max = 0.0
                    break

        # 如果 policy 解析失败，使用 fallback
        if not monthly_max and parsed["monthly_max"]:
            monthly_max = parsed["monthly_max"]
        if not single_tx_limit and parsed["single_tx_limit"]:
            single_tx_limit = parsed["single_tx_limit"]

        # 已花费金额
        spent = 0.0
        try:
            spent = float(pact.get("progress_usd_spent", 0) or 0)
        except (TypeError, ValueError):
            spent = 0.0

        # vendor whitelist
        vendor_whitelist = []
        if policies:
            when = policies[0].get("rules", {}).get("when", {})
            for dest in when.get("destination_address_in", []):
                addr = dest.get("address", "")
                vendor_whitelist.append({
                    "name": addr[:8] + "..." if addr else "unknown",
                    "address": addr,
                    "category": "api",
                })
        # 如果 spec 没有提供地址，尝试从 execution_plan 提取 vendor 名称
        if not vendor_whitelist and execution_plan:
            vm = re.search(r'- Vendors:\s*([^\n]+)', execution_plan)
            if vm:
                names = [n.strip() for n in vm.group(1).split(',')]
                for n in names:
                    if n and n.lower() not in ('not provided', 'none', 'n/a'):
                        vendor_whitelist.append({
                            "name": n,
                            "address": "",
                            "category": "api",
                        })

        created_at = pact.get("created_at") or datetime.now(timezone.utc).isoformat()
        expires_at = pact.get("expires_at") or ""
        if not expires_at and isinstance(spec, dict):
            for condition in spec.get("completion_conditions", []):
                if condition.get("type") == "time_elapsed":
                    try:
                        expires_at = (
                            datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                            + timedelta(seconds=int(float(condition.get("threshold", 0))))
                        ).isoformat()
                    except (TypeError, ValueError):
                        expires_at = ""
                    break

        time_window = None
        if expires_at:
            time_window = {
                "start": created_at,
                "end": expires_at,
                "allowed_hours_start": "00:00",
                "allowed_hours_end": "23:59",
            }

        # 从 execution_plan 解析 cooldown
        cooldown_hours = 12
        if execution_plan:
            cm = re.search(r'Cooldown:\s*(\d+)h', execution_plan)
            if cm:
                try:
                    cooldown_hours = int(cm.group(1))
                except (TypeError, ValueError):
                    cooldown_hours = 12

        return {
            "card_id": pid,
            "agent_name": parsed["agent_name"],
            "card_name": parsed["agent_name"],
            "agent_id": f"agent-{pid}",
            "assigned_agent_id": "",
            "assigned_agent_name": "",
            "assigned_at": "",
            "owner": self._owner,
            "status": self._extract_pact_status(pact),
            "budget": {
                "currency": "USDC",
                "monthly_max": monthly_max,
                "spent": spent,
                "single_tx_limit": single_tx_limit,
            },
            "vendor_whitelist": vendor_whitelist,
            "cooldown_hours": cooldown_hours,
            "time_window": time_window,
            "created_at": created_at,
            "expires_at": expires_at,
            "api_key": "",
            "x402_enabled": any(bool(v.get("x402_url")) for v in vendor_whitelist),
            "x402_url": next((v.get("x402_url") for v in vendor_whitelist if v.get("x402_url")), None),
            "erc8004_agent_id": next((v.get("erc8004_agent_id") for v in vendor_whitelist if v.get("erc8004_agent_id")), None),
            "erc8004_registry_url": next((v.get("erc8004_registry_url") for v in vendor_whitelist if v.get("erc8004_registry_url")), None),
        }

    def _api_tx_to_dict(self, api_tx: Dict[str, Any]) -> Dict[str, Any]:
        """将 CAW transaction record 转换为本地 Transaction dict。"""
        raw_status = api_tx.get("status")
        status_display = str(api_tx.get("status_display") or "")
        status_label = self._normalize_tx_status(raw_status, status_display)
        dst_addr = api_tx.get("dst_addr") or api_tx.get("dst_address", "")
        return {
            "tx_id": api_tx.get("request_id") or api_tx.get("id") or "tx-unknown",
            "card_id": api_tx.get("pact_id") or api_tx.get("delegation_id", ""),
            "agent_id": api_tx.get("principal_id", "unknown"),
            "timestamp": api_tx.get("created_at", datetime.now(timezone.utc).isoformat()),
            "vendor": (dst_addr[:10] + "...") if dst_addr else "unknown",
            "vendor_address": dst_addr,
            "amount": float(api_tx.get("amount", 0) or 0),
            "currency": api_tx.get("token_id", "USDC"),
            "status": status_label,
            "reason": api_tx.get("result", "") or status_display or str(raw_status or ""),
            "remaining_budget": 0.0,
            "tx_hash": api_tx.get("tx_hash") or api_tx.get("transaction_hash") or "",
            "metadata": {},
            "alert_level": "none",
        }

    @staticmethod
    def _normalize_tx_status(raw_status: Any, status_display: str = "") -> str:
        """Normalize CAW transaction statuses; API may return integer enum codes."""
        if isinstance(raw_status, str):
            label = raw_status.upper()
        elif status_display:
            label = status_display.upper()
        else:
            # Known UserTransactionStatus examples from CAW API docs / responses:
            # 900=success, 901=failed, 902=rejected. Unknown numeric states remain pending.
            code_map = {
                900: "APPROVED",
                901: "DENIED",
                902: "DENIED",
            }
            label = code_map.get(raw_status, "PENDING_APPROVAL")

        if label in {"SUCCESS", "SUCCEEDED", "COMPLETED", "CONFIRMED"}:
            return "APPROVED"
        if label in {"FAILED", "FAILURE", "REJECTED", "DENIED", "CANCELLED", "CANCELED"}:
            return "DENIED"
        if label in {"APPROVED", "DENIED", "PENDING_APPROVAL"}:
            return label
        return "PENDING_APPROVAL"


# ═══════════════════════════════════════════════════════════════
# 自测入口
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    try:
        client = RealCAWClient()
        print(f"[OK] Connected to CAW at {client.base_url}")
        print(f"     Wallet: {client.wallet_uuid}")
        print(f"     SDK available: {COBO_SDK_AVAILABLE}")
    except Exception as exc:
        print(f"[ERROR] {exc}")
        sys.exit(1)
