"""
PactGuard x402 Client — 基于 x402 Python SDK 2.x 的买方 Agent 客户端

核心逻辑:
1. 发现服务
2. 检查声誉
3. 发起请求
4. 处理 402 响应 (通过 x402 SDK 自动完成)
5. CAW Pact 预检查 (v1/v2)
6. 签名支付
7. 重试并获取结果
8. 审计记录

运行:
  source venv/bin/activate
  python x402-client.py --pact-version v2

环境变量:
  EVM_PRIVATE_KEY — 买方钱包私钥 (Base Sepolia 测试网)
"""

import os
import json
import argparse
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta

import requests

from eth_account import Account
from x402 import x402Client
from x402.mechanisms.evm.exact import ExactEvmClientScheme
from x402.mechanisms.evm.signers import EthAccountSigner


@dataclass
class PaymentRequirement:
    """解析自 x402 402 响应的支付要求"""
    scheme: str
    price: str
    network: str
    token: str
    pay_to: str
    expires_at: str
    idempotency_key: str
    function_name: str = "transfer"


@dataclass
class PactCheckResult:
    """CAW Pact 检查结果"""
    approved: bool
    reason: str
    budget_remaining_before: float
    budget_remaining_after: float
    checks_passed: list
    alert_level: str = "none"


class CoboCAWWallet:
    """
    CAW Agent Wallet 模拟（v1 + v2 安全增强）

    实际生产环境中，将是 Cobo 提供的 SDK 客户端。
    """

    def __init__(self, pact_config: Dict[str, Any]):
        self.pact = pact_config
        self.audit_log = []
        self.session_spent = 0.0
        self.hourly_tx_count = 0
        self.consecutive_failures = 0

    def reset_session(self):
        self.session_spent = 0.0
        self.hourly_tx_count = 0
        self.consecutive_failures = 0

    def check_pact(self, payment_req: PaymentRequirement, version: str = "v1") -> PactCheckResult:
        checks = []
        alerts = []
        alert_level = "none"

        price_usd = float(payment_req.price.replace("$", ""))
        budget = self.pact["budget"]["max_usd"]
        spent = self.pact["budget"].get("spent_usd", 0.0)
        remaining = budget - spent

        budget_ok = remaining >= price_usd
        checks.append("budget" if budget_ok else "budget_insufficient")

        allowed_contracts = self.pact["scope"]["allowed_contracts"]
        scope_ok = payment_req.pay_to in allowed_contracts
        checks.append("scope" if scope_ok else "scope_denied")

        allowed_networks = self.pact["scope"]["allowed_networks"]
        network_ok = payment_req.network in allowed_networks
        checks.append("network" if network_ok else "network_denied")

        now = datetime.now(timezone.utc)
        expires = datetime.fromisoformat(self.pact["time_window"]["expires_at"].replace("Z", "+00:00"))
        time_ok = now < expires
        checks.append("time" if time_ok else "time_expired")

        pay_expires = datetime.fromisoformat(payment_req.expires_at.replace("Z", "+00:00"))
        pay_time_ok = now < pay_expires
        checks.append("pay_time" if pay_time_ok else "pay_time_expired")

        deny_functions = self.pact["scope"].get("deny_functions", [])
        func_ok = payment_req.function_name not in deny_functions
        checks.append("function_ok" if func_ok else "function_denied")

        if version == "v2":
            exec_cfg = self.pact.get("execution", {})
            auto_cond = exec_cfg.get("auto_approve_conditions", {})

            per_tx_max = self.pact["budget"].get("per_transaction_max", float("inf"))
            if price_usd > per_tx_max:
                checks.append("per_tx_max_exceeded")
                budget_ok = False
            else:
                checks.append("per_tx_max_ok")

            daily_limit = auto_cond.get("max_daily_accumulated", float("inf"))
            if self.session_spent + price_usd > daily_limit:
                checks.append("daily_accumulated_exceeded")
                budget_ok = False
                alert_level = "human_review"
            else:
                checks.append("daily_accumulated_ok")

            max_hourly = auto_cond.get("max_hourly_frequency", float("inf"))
            if self.hourly_tx_count + 1 > max_hourly:
                checks.append("hourly_freq_exceeded")
                budget_ok = False
                alert_level = "human_review"
            else:
                checks.append("hourly_freq_ok")

            if payment_req.pay_to not in allowed_contracts:
                alert_level = "human_review"
            if payment_req.function_name == "approve":
                alert_level = "human_review"
                alerts.append("approve operation requires human confirm")

            if time_ok and (expires - now) < timedelta(hours=2):
                alert_level = "human_review"
                alerts.append("Pact expires within 2h")

            if not func_ok:
                alert_level = "blocked"
                budget_ok = False

            if self.consecutive_failures >= exec_cfg.get("pause_on_consecutive_failures", 3):
                checks.append("paused_consecutive_failures")
                budget_ok = False
                alert_level = "blocked"

        approved = budget_ok and scope_ok and network_ok and time_ok and pay_time_ok and func_ok

        reason = "All checks passed" if approved else (
            f"Failed: {[c for c in checks if any(x in c for x in ['insufficient', 'denied', 'exceeded', 'paused', 'expired'])]}"
            + (f" | Alerts: {alerts}" if alerts else "")
        )

        return PactCheckResult(
            approved=approved,
            reason=reason,
            budget_remaining_before=remaining,
            budget_remaining_after=remaining - price_usd if approved else remaining,
            checks_passed=checks,
            alert_level=alert_level,
        )

    def log_action(self, action: str, details: Dict[str, Any]):
        self.audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "details": details,
        })


class BuyerAgent:
    """自主支付 Agent 客户端（支持 mock / real 双模式）"""

    def __init__(self, caw_wallet: CoboCAWWallet, private_key: str):
        self.wallet = caw_wallet
        self.session = requests.Session()
        self.private_key = private_key

        # 初始化 x402 客户端
        self.x402_client = x402Client()
        account = Account.from_key(private_key)
        signer = EthAccountSigner(account)
        self.x402_client.register("eip155:84532", ExactEvmClientScheme(signer=signer))

    def discover_service(self, endpoint: str) -> bool:
        try:
            resp = self.session.get(f"{endpoint}/health", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False

    def verify_provider_reputation(self, agent_id: str) -> Dict[str, Any]:
        return {
            "agent_id": agent_id,
            "reputation_score": 4.5,
            "completed_jobs": 128,
            "disputed_jobs": 3,
            "completion_rate": 0.977,
            "trust_tier": "verified",
        }

    def request_service(self, endpoint: str, params: Dict[str, Any], pact_version: str = "v1") -> Dict[str, Any]:
        """
        向受 x402 保护的服务发起请求。

        流程:
        1. 发起请求
        2. 如果 402 → 使用 x402 SDK 创建支付 payload
        3. CAW Pact 预检查
        4. 重试并返回结果
        """

        # Step 1: 首次请求
        resp = self.session.post(
            f"{endpoint}/generate-content",
            json=params,
            timeout=10,
        )

        # Step 2: 处理 402 Payment Required
        if resp.status_code == 402:
            # 解析 402 响应
            payment_req = self._parse_402_response(resp)

            # CAW Pact 预检查
            pact_check = self.wallet.check_pact(payment_req, version=pact_version)
            if not pact_check.approved:
                self.wallet.log_action("PAYMENT_REJECTED", {
                    "reason": pact_check.reason,
                    "payment_req": payment_req.__dict__,
                    "alert_level": pact_check.alert_level,
                })
                self.wallet.consecutive_failures += 1
                raise PermissionError(f"Payment rejected by Pact: {pact_check.reason}")

            # 使用 x402 SDK 创建支付 payload
            x402_payment_required = self._extract_x402_payment_required(resp)
            payment_payload = self.x402_client.create_payment_payload(x402_payment_required)

            # 更新会话状态
            self.wallet.session_spent += float(payment_req.price.replace("$", ""))
            self.wallet.hourly_tx_count += 1
            self.wallet.consecutive_failures = 0

            self.wallet.log_action("PAYMENT_AUTHORIZED", {
                "idempotency_key": payment_req.idempotency_key,
                "amount": payment_req.price,
                "pay_to": payment_req.pay_to,
                "budget_before": pact_check.budget_remaining_before,
                "budget_after": pact_check.budget_remaining_after,
                "alert_level": pact_check.alert_level,
            })

            # Step 3: 重试带 Payment Proof
            resp = self.session.post(
                f"{endpoint}/generate-content",
                json=params,
                headers={
                    "payment-signature": payment_payload,
                    "x-idempotency-key": payment_req.idempotency_key,
                },
                timeout=30,
            )

            self.wallet.pact["budget"]["spent_usd"] += float(payment_req.price.replace("$", ""))

        if resp.status_code != 200:
            self.wallet.consecutive_failures += 1
            raise RuntimeError(f"Service request failed: {resp.status_code} {resp.text}")

        result = resp.json()

        self.wallet.log_action("SERVICE_COMPLETED", {
            "job_id": result.get("jobId"),
            "deliverable_hash": result.get("deliverableHash"),
        })

        return result

    def _parse_402_response(self, resp: requests.Response) -> PaymentRequirement:
        """解析 402 响应中的支付要求"""
        # x402 v2 使用 payment-required header
        header_data = resp.headers.get("payment-required", "{}")
        data = json.loads(header_data)
        return PaymentRequirement(
            scheme=data.get("scheme", "exact"),
            price=data.get("price", "$0.50"),
            network=data.get("network", "eip155:84532"),
            token=data.get("token", "USDC"),
            pay_to=data.get("payTo", ""),
            expires_at=data.get("expiresAt", "2026-07-31T00:00:00Z"),
            idempotency_key=data.get("idempotencyKey", ""),
            function_name="transfer",
        )

    def _extract_x402_payment_required(self, resp: requests.Response):
        """从 402 响应中提取 x402 PaymentRequired 对象"""
        from x402 import parse_payment_required
        header_data = resp.headers.get("payment-required", "{}")
        data = json.loads(header_data)
        # 转换为 x402 格式
        return parse_payment_required(data)


# 【使用示例】
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PactGuard x402 Client")
    parser.add_argument("--pact-version", default="v2", choices=["v1", "v2"], help="Pact 检查版本")
    parser.add_argument("--endpoint", default="http://localhost:8000", help="服务端点")
    args = parser.parse_args()

    private_key = os.getenv("EVM_PRIVATE_KEY")
    if not private_key:
        print("❌ 请设置环境变量 EVM_PRIVATE_KEY")
        print("   例如: export EVM_PRIVATE_KEY=0x...")
        print("   测试网钱包可从 Base Sepolia Faucet 获取: https://www.alchemy.com/faucets/base-sepolia")
        exit(1)

    # 加载 Pact 配置
    pact_config = {
        "pact_id": "pact-alice-commerce-001",
        "budget": {
            "max_usd": 50.0,
            "spent_usd": 0.0,
            "per_transaction_max": 5.0,
            "per_transaction_min": 0.01,
            "daily_limit": 20.0,
            "total_transactions_max": 10,
        },
        "scope": {
            "allowed_contracts": ["0x728A427FB55f9d5997c50a98c8034E955A0fC4BD"],
            "allowed_networks": ["eip155:84532"],
            "allowed_functions": ["transfer", "approve"],
            "deny_contracts": [],
            "deny_functions": ["withdraw", "transfer_ownership", "self_destruct"],
        },
        "time_window": {
            "created_at": "2026-05-28T00:00:00Z",
            "expires_at": "2026-07-31T00:00:00Z",
            "timezone": "UTC",
            "allowed_hours": {"start": "08:00", "end": "22:00"},
        },
        "execution": {
            "mode": "hybrid",
            "approval_threshold": 0,
            "require_human_confirm": False,
            "max_retries": 3,
            "retry_backoff": "exponential",
            "auto_approve_conditions": {
                "max_single_amount": 5.0,
                "max_daily_accumulated": 10.0,
                "max_hourly_frequency": 2,
                "only_previously_interacted_contracts": True,
                "allowed_hours_only": True,
                "reputation_min_score": 4.5,
            },
            "human_confirm_triggers": [
                "amount_exceeds_threshold",
                "new_contract_first_interaction",
                "frequency_anomaly",
                "approve_operation_any_amount",
                "near_pact_expiration",
            ],
            "auto_reject_conditions": {
                "deny_functions": ["self_destruct", "transfer_ownership", "withdraw", "set_guard", "upgrade"],
                "max_slippage": 2.0,
                "max_gas_ratio": 0.20,
            },
            "pause_on_consecutive_failures": 2,
            "auto_revoke_session_on_timeout": True,
        },
        "audit": {
            "log_level": "verbose",
            "retention_days": 90,
            "export_format": "json",
            "include_tx_hash": True,
            "include_gas_details": True,
            "alert_on_anomaly": True,
        },
        "metadata": {
            "campaign_id": "campaign-2026-spring",
            "tags": ["marketing", "social-media", "ai-content"],
            "notes": "Week 2 Module B experiment for AI x Web3 School",
        },
    }

    wallet = CoboCAWWallet(pact_config)
    agent = BuyerAgent(wallet, private_key)

    version_label = args.pact_version.upper()
    print(f"\n{'='*60}")
    print(f"PactGuard x402 Client — Pact {version_label}")
    print(f"{'='*60}")

    endpoint = args.endpoint
    if agent.discover_service(endpoint):
        print("✅ Service discovered and available")

        reputation = agent.verify_provider_reputation("agent-contentgen-042")
        if reputation["reputation_score"] >= 4.0:
            print(f"✅ Provider reputation OK: {reputation['reputation_score']}/5")

            try:
                result = agent.request_service(endpoint, {
                    "brand": "Alice Coffee",
                    "product": "Cold Brew",
                    "audience": "Gen Z coffee lovers",
                    "platform": "Instagram",
                }, pact_version=args.pact_version)
                print(f"✅ Content generated: {result['jobId']}")
                print(f"   Deliverable hash: {result['deliverableHash']}")
                remaining = wallet.pact['budget']['max_usd'] - wallet.pact['budget']['spent_usd']
                print(f"   Budget remaining: ${remaining:.2f}")
                print(f"   Session spent: ${wallet.session_spent:.2f}")
                print(f"   Hourly tx count: {wallet.hourly_tx_count}")
            except PermissionError as e:
                print(f"❌ Payment rejected: {e}")
            except RuntimeError as e:
                print(f"❌ Service failed: {e}")
        else:
            print(f"❌ Provider reputation too low: {reputation['reputation_score']}")
    else:
        print("❌ Service unavailable")

    print("\n--- Audit Log ---")
    for entry in wallet.audit_log:
        alert = entry['details'].get('alert_level', '')
        alert_tag = f" [{alert.upper()}]" if alert and alert != "none" else ""
        print(f"[{entry['timestamp']}] {entry['action']}{alert_tag}")
        if 'reason' in entry['details']:
            print(f"    Reason: {entry['details']['reason']}")
