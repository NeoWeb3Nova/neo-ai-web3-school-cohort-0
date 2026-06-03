"""
CAW Agent Client -- 自主支付的 Agent 消费端

核心逻辑:
1. 发现服务
2. 检查声誉（ERC-8004）
3. 发起请求
4. 处理 402 响应
5. CAW Pact 预算检查 (v1/v2)
6. 签名支付
7. 重试并获取结果
8. 审计记录

运行:
  python pseudo-agent-client.py              # Mock 模式（无 Server）
  python pseudo-agent-client.py --real       # 真实模式（需启动 pseudo-server.py）
"""

import requests
import json
import argparse
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta


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
    function_name: str = "transfer"  # v2 增强：函数级越权检查


@dataclass
class PactCheckResult:
    """CAW Pact 检查结果"""
    approved: bool
    reason: str
    budget_remaining_before: float
    budget_remaining_after: float
    checks_passed: list
    alert_level: str = "none"  # none / warn / human_review / blocked


class CoboCAWWallet:
    """
    CAW Agent Wallet 模拟（v1 + v2 安全增强）
    
    实际生产环境中，这将是 Cobo 提供的 SDK 客户端:
    - pip install cobo-agentic-wallet
    - 或通过 npx skills add CoboGlobal/cobo-agentic-wallet 安装
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
        """
        检查当前支付请求是否在 Pact 授权范围内。
        
        v1 检查项：
        1. 预算足够？
        2. 合约地址在白名单？
        3. 网络在允许列表？
        4. 时间窗口内？
        5. 函数不在黑名单？
        
        v2 增强检查项：
        6. 单笔限额
        7. 累计日限额
        8. 小时频率
        9. 声誉阈值
        10. 人工确认触发
        11. 临近过期警告
        12. 自动拒绝黑名单函数
        13. 连续失败暂停
        """
        checks = []
        alerts = []
        alert_level = "none"
        
        price_usd = float(payment_req.price.replace("$", ""))
        budget = self.pact["budget"]["max_usd"]
        spent = self.pact["budget"].get("spent_usd", 0.0)
        remaining = budget - spent
        
        # 1. 预算检查
        budget_ok = remaining >= price_usd
        checks.append("budget" if budget_ok else "budget_insufficient")
        
        # 2. 范围检查（合约白名单）
        allowed_contracts = self.pact["scope"]["allowed_contracts"]
        scope_ok = payment_req.pay_to in allowed_contracts
        checks.append("scope" if scope_ok else "scope_denied")
        
        # 3. 网络检查
        allowed_networks = self.pact["scope"]["allowed_networks"]
        network_ok = payment_req.network in allowed_networks
        checks.append("network" if network_ok else "network_denied")
        
        # 4. 时间检查 (pact-level)
        now = datetime.now(timezone.utc)
        expires = datetime.fromisoformat(self.pact["time_window"]["expires_at"].replace("Z", "+00:00"))
        time_ok = now < expires
        checks.append("time" if time_ok else "time_expired")
        
        # 4b. Payment-level expiration (x402 header)
        pay_expires = datetime.fromisoformat(payment_req.expires_at.replace("Z", "+00:00"))
        pay_time_ok = now < pay_expires
        checks.append("pay_time" if pay_time_ok else "pay_time_expired")
        
        # 5. 函数黑名单
        deny_functions = self.pact["scope"].get("deny_functions", [])
        func_ok = payment_req.function_name not in deny_functions
        checks.append("function_ok" if func_ok else "function_denied")
        
        # v2 增强检查
        if version == "v2":
            exec_cfg = self.pact.get("execution", {})
            auto_cond = exec_cfg.get("auto_approve_conditions", {})
            
            # 6. per_transaction_max
            per_tx_max = self.pact["budget"].get("per_transaction_max", float("inf"))
            if price_usd > per_tx_max:
                checks.append("per_tx_max_exceeded")
                budget_ok = False
            else:
                checks.append("per_tx_max_ok")
            
            # 7. daily_limit / accumulated check
            daily_limit = auto_cond.get("max_daily_accumulated", float("inf"))
            if self.session_spent + price_usd > daily_limit:
                checks.append("daily_accumulated_exceeded")
                budget_ok = False
                alerts.append("Daily accumulated limit exceeded")
                alert_level = "human_review"
            else:
                checks.append("daily_accumulated_ok")
            
            # 8. Hourly frequency
            max_hourly = auto_cond.get("max_hourly_frequency", float("inf"))
            if self.hourly_tx_count + 1 > max_hourly:
                checks.append("hourly_freq_exceeded")
                budget_ok = False
                alerts.append(f"Hourly tx count {self.hourly_tx_count + 1} > {max_hourly}")
                alert_level = "human_review"
            else:
                checks.append("hourly_freq_ok")
            
            # 9. Reputation threshold (simulated)
            # reputation_min = auto_cond.get("reputation_min_score", 0.0)
            # 实际生产环境查询 ERC-8004 Registry
            
            # 10. Human confirm triggers
            if payment_req.pay_to not in allowed_contracts:
                alert_level = "human_review"
            if payment_req.function_name == "approve":
                alert_level = "human_review"
                alerts.append("approve operation requires human confirm")
            
            # 11. Near expiration (< 2h)
            if time_ok and (expires - now) < timedelta(hours=2):
                alert_level = "human_review"
                alerts.append("Pact expires within 2h")
            
            # 12. Auto reject deny functions
            if not func_ok:
                alert_level = "blocked"
                budget_ok = False
            
            # 13. Pause on consecutive failures
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
    
    def sign_payment(self, payment_req: PaymentRequirement) -> str:
        """
        【伪代码】在 Pact 授权范围内签名支付交易。
        
        实际生产环境中:
        - CAW 提供安全的签名机制，Agent 不持有私钥
        - 用户通过手机 App 确认后，CAW 代理签名
        - 或在预先授权的 Pact 范围内自动签名
        """
        proof_payload = {
            "scheme": payment_req.scheme,
            "price": payment_req.price,
            "network": payment_req.network,
            "token": payment_req.token,
            "payTo": payment_req.pay_to,
            "idempotencyKey": payment_req.idempotency_key,
            "signedAt": datetime.now(timezone.utc).isoformat(),
        }
        return f"signed_{json.dumps(proof_payload)}"
    
    def log_action(self, action: str, details: Dict[str, Any]):
        """写入 CAW 审计日志 — 可追责、可复盘"""
        self.audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "details": details,
        })


class MockServer:
    """
    本地 Mock Server — 在无真实 Server 时模拟 x402 402 响应和服务返回。
    
    运行方式：作为 BuyerAgent 的内部 mock 使用，无需启动 FastAPI。
    """
    
    _used_keys: set = set()
    
    @classmethod
    def health(cls, endpoint: str) -> bool:
        return True  # mock 模式下始终可用
    
    @classmethod
    def post_generate_content(cls, endpoint: str, payload: dict, headers: dict = None) -> dict:
        """模拟 POST /generate-content 端点"""
        headers = headers or {}
        auth = headers.get("Authorization", "")
        
        # 无 Authorization 头 → 返回 402
        if not auth.startswith("Payment "):
            idempotency_key = f"mock-{datetime.now(timezone.utc).timestamp()}"
            return {
                "status_code": 402,
                "headers": {
                    "X-Payment-Required": json.dumps({
                        "scheme": "exact",
                        "price": "$0.50",
                        "network": "eip155:84532",
                        "token": "USDC",
                        "payTo": "0xProviderWalletAddressHere",
                        "expiresAt": "2026-07-31T00:00:00Z",
                        "idempotencyKey": idempotency_key,
                    })
                },
                "body": {"error": "Payment required"},
            }
        
        # 有 Authorization 头 → 验证 idempotency key 并返回结果
        idem_key = headers.get("X-Idempotency-Key", "")
        if idem_key in cls._used_keys:
            return {
                "status_code": 409,
                "headers": {},
                "body": {"error": "Duplicate idempotency key"},
            }
        cls._used_keys.add(idem_key)
        
        return {
            "status_code": 200,
            "headers": {
                "Payment-Receipt": f"receipt-{idem_key}",
            },
            "body": {
                "jobId": f"job-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
                "deliverables": [
                    {
                        "id": i,
                        "title": f"Post {i}: {payload.get('brand', 'Brand')} {payload.get('product', 'Product')} Highlight",
                        "caption": f"Chill vibes only with {payload.get('brand', 'Brand')} {payload.get('product', 'Product')}.",
                    }
                    for i in range(1, 8)
                ],
                "deliverableHash": "sha256:mockcontenthash1234",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "modelVersion": "mock-gpt-4o",
            },
        }


class BuyerAgent:
    """
    自主支付 Agent 客户端（支持 mock / real 双模式）
    
    责任:
    1. 发现服务
    2. 见证服务提供方声誉
    3. 发起请求并处理支付
    4. 在 Pact 约束下完成交易
    5. 保留可审计记录
    """
    
    def __init__(self, caw_wallet: CoboCAWWallet, mock_mode: bool = False):
        self.wallet = caw_wallet
        self.session = requests.Session()
        self.mock_mode = mock_mode
        
    def discover_service(self, endpoint: str) -> bool:
        """
        发现服务并检查其可用性。
        
        实际生产环境中，可通过：
        - 服务市场目录 (Bazaar)
        - ERC-8004 Agent 注册表
        - MCP / A2A 协议的能力广告
        """
        if self.mock_mode:
            return MockServer.health(endpoint)
        try:
            resp = self.session.get(f"{endpoint}/health", timeout=5)
            return resp.status_code == 200
        except Exception:
            return False
    
    def verify_provider_reputation(self, agent_id: str) -> Dict[str, Any]:
        """
        检查服务提供方的声誉（ERC-8004 Reputation Registry）。
        
        返回：
        - 声誉分数
        - 历史完成率
        - 负面评价比例
        """
        # 伪代码: 查询 ERC-8004 Reputation Registry
        # 实际为调用合约 read 函数
        return {
            "agent_id": agent_id,
            "reputation_score": 4.5,  # 5 分制
            "completed_jobs": 128,
            "disputed_jobs": 3,
            "completion_rate": 0.977,
            "trust_tier": "verified",
        }
    
    def request_service(self, endpoint: str, params: Dict[str, Any], pact_version: str = "v1") -> Dict[str, Any]:
        """
        向受 x402 保护的服务发起请求。
        
        完整流程:
        1. 发起请求
        2. 如果 402 → 处理支付
        3. 重试并返回结果
        """
        
        # Step 1: 首次请求（不带 payment proof）
        if self.mock_mode:
            mock_resp = MockServer.post_generate_content(endpoint, params)
            resp = MockResponse(mock_resp)
        else:
            resp = self.session.post(
                f"{endpoint}/generate-content",
                json=params,
                timeout=10,
            )
        
        # Step 2: 处理 402 Payment Required
        if resp.status_code == 402:
            payment_req = self._parse_402_response(resp)
            
            # 检查 Pact 约束（v1/v2）
            pact_check = self.wallet.check_pact(payment_req, version=pact_version)
            if not pact_check.approved:
                # 超出授权范围 — 拒绝支付并记录
                self.wallet.log_action("PAYMENT_REJECTED", {
                    "reason": pact_check.reason,
                    "payment_req": payment_req.__dict__,
                    "alert_level": pact_check.alert_level,
                })
                self.wallet.consecutive_failures += 1
                raise PermissionError(
                    f"Payment rejected by Pact: {pact_check.reason}"
                )
            
            # Pact 通过 — 签名支付
            payment_proof = self.wallet.sign_payment(payment_req)
            
            # 更新会话状态（v2 增强）
            self.wallet.session_spent += float(payment_req.price.replace("$", ""))
            self.wallet.hourly_tx_count += 1
            self.wallet.consecutive_failures = 0  # 成功后重置
            
            # 记录授权执行
            self.wallet.log_action("PAYMENT_AUTHORIZED", {
                "idempotency_key": payment_req.idempotency_key,
                "amount": payment_req.price,
                "pay_to": payment_req.pay_to,
                "budget_before": pact_check.budget_remaining_before,
                "budget_after": pact_check.budget_remaining_after,
                "alert_level": pact_check.alert_level,
            })
            
            # Step 3: 重试带 Payment Proof
            if self.mock_mode:
                mock_resp = MockServer.post_generate_content(
                    endpoint, params,
                    headers={
                        "Authorization": f"Payment {payment_proof}",
                        "X-Idempotency-Key": payment_req.idempotency_key,
                    }
                )
                resp = MockResponse(mock_resp)
            else:
                resp = self.session.post(
                    f"{endpoint}/generate-content",
                    json=params,
                    headers={
                        "Authorization": f"Payment {payment_proof}",
                        "X-Idempotency-Key": payment_req.idempotency_key,
                    },
                    timeout=30,
                )
            
            # 更新 Pact 余额（简化处理，实际应通过 CAW API 同步）
            self.wallet.pact["budget"]["spent_usd"] += float(payment_req.price.replace("$", ""))
        
        if resp.status_code != 200:
            self.wallet.consecutive_failures += 1
            raise RuntimeError(f"Service request failed: {resp.status_code} {resp.text}")
        
        result = resp.json()
        receipt = resp.headers.get("Payment-Receipt")
        
        # 记录完成
        self.wallet.log_action("SERVICE_COMPLETED", {
            "job_id": result.get("jobId"),
            "tx_hash": receipt,
            "deliverable_hash": result.get("deliverableHash"),
        })
        
        return result
    
    def _parse_402_response(self, resp) -> PaymentRequirement:
        """解析 402 响应中的支付要求"""
        header_data = resp.headers.get("X-Payment-Required", "{}")
        data = json.loads(header_data)
        return PaymentRequirement(
            scheme=data["scheme"],
            price=data["price"],
            network=data["network"],
            token=data["token"],
            pay_to=data["payTo"],
            expires_at=data["expiresAt"],
            idempotency_key=data["idempotencyKey"],
            function_name="transfer",  # mock 中默认 transfer
        )


class MockResponse:
    """将 mock_resp dict 包装成类 requests.Response 对象（有限类型兼容）"""
    def __init__(self, mock_resp: dict):
        self.status_code = mock_resp["status_code"]
        self.headers = mock_resp.get("headers", {})
        self._body = mock_resp.get("body", {})

    def json(self):
        return self._body

    @property
    def text(self):
        return json.dumps(self._body)


# 【使用示例】
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CAW Agent Client")
    parser.add_argument("--real", action="store_true", help="真实模式（需启动 pseudo-server.py）")
    parser.add_argument("--pact-version", default="v2", choices=["v1", "v2"], help="Pact 检查版本")
    args = parser.parse_args()

    # 加载 Pact 配置（完整版 — 参考 pact-config.json 结构）
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
            "allowed_contracts": ["0xProviderWalletAddressHere"],
            "allowed_networks": ["eip155:84532"],  # Base Sepolia
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
    
    # 初始化 CAW 钱包
    wallet = CoboCAWWallet(pact_config)
    
    # 初始化 Buyer Agent（mock / real 模式）
    mock_mode = not args.real
    agent = BuyerAgent(wallet, mock_mode=mock_mode)
    
    mode_label = "MOCK" if mock_mode else "REAL"
    version_label = args.pact_version.upper()
    print(f"\n{'='*60}")
    print(f"CAW Agent Client — {mode_label} MODE | Pact {version_label}")
    print(f"{'='*60}")
    
    # 发现服务
    endpoint = "http://localhost:8000"
    if agent.discover_service(endpoint):
        print("✅ Service discovered and available")
        
        # 验证声誉
        reputation = agent.verify_provider_reputation("agent-contentgen-042")
        if reputation["reputation_score"] >= 4.0:
            print(f"✅ Provider reputation OK: {reputation['reputation_score']}/5")
            
            try:
                # 发起服务请求（含自动支付）
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
    
    # 打印审计日志
    print("\n--- Audit Log ---")
    for entry in wallet.audit_log:
        alert = entry['details'].get('alert_level', '')
        alert_tag = f" [{alert.upper()}]" if alert and alert != "none" else ""
        print(f"[{entry['timestamp']}] {entry['action']}{alert_tag}")
        if 'reason' in entry['details']:
            print(f"    Reason: {entry['details']['reason']}")
