"""
CAW Agent Client -- 自主支付的 Agent 消费端

核心逻辑:
1. 发现服务
2. 检查声誉（ERC-8004）
3. 发起请求
4. 处理 402 响应
5. CAW Pact 预算检查
6. 签名支付
7. 重试并获取结果
8. 审计记录
"""

import requests
import json
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime, timezone


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


@dataclass
class PactCheckResult:
    """CAW Pact 检查结果"""
    approved: bool
    reason: str
    budget_remaining_before: float
    budget_remaining_after: float
    checks_passed: list


class CoboCAWWallet:
    """
    CAW Agent Wallet 模拟
    
    实际生产环境中，这将是 Cobo 提供的 SDK 客户端:
    - pip install cobo-agentic-wallet
    - 或通过 npx skills add CoboGlobal/cobo-agentic-wallet 安装
    """
    
    def __init__(self, pact_config: Dict[str, Any]):
        self.pact = pact_config
        self.audit_log = []
        
    def check_pact(self, payment_req: PaymentRequirement) -> PactCheckResult:
        """
        检查当前支付请求是否在 Pact 授权范围内。
        
        检查项：
        1. 预算足够？
        2. 合约地址在白名单？
        3. 网络在允许列表？
        4. 时间窗口内？
        5. 频率未超限？
        """
        checks = []
        
        # 1. 预算检查
        price_usd = float(payment_req.price.replace("$", ""))
        budget = self.pact["budget"]["max_usd"]
        spent = self.pact["budget"]["spent_usd"]
        remaining = budget - spent
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
        
        # 4. 时间检查
        now = datetime.now(timezone.utc)
        expires = datetime.fromisoformat(payment_req.expires_at.replace("Z", "+00:00"))
        time_ok = now < expires
        checks.append("time" if time_ok else "time_expired")
        
        # 5. 频率检查 (简化版：单次交易不检查，可扩展)
        checks.append("frequency")
        
        approved = budget_ok and scope_ok and network_ok and time_ok
        
        reason = "All checks passed" if approved else (
            f"Failed: {[c for c in checks if 'insufficient' in c or 'denied' in c or 'expired' in c]}"
        )
        
        return PactCheckResult(
            approved=approved,
            reason=reason,
            budget_remaining_before=remaining,
            budget_remaining_after=remaining - price_usd if approved else remaining,
            checks_passed=checks,
        )
    
    def sign_payment(self, payment_req: PaymentRequirement) -> str:
        """
        【伪代码】在 Pact 授权范围内签名支付交易。
        
        实际生产环境中:
        - CAW 提供安全的签名机制，Agent 不持有私钥
        - 用户通过手机 App 确认后，CAW 代理签名
        - 或在预先授权的 Pact 范围内自动签名
        """
        # 模拟生成 payment proof (实际为经过签名的链上交易数据)
        proof_payload = {
            "scheme": payment_req.scheme,
            "price": payment_req.price,
            "network": payment_req.network,
            "token": payment_req.token,
            "payTo": payment_req.pay_to,
            "idempotencyKey": payment_req.idempotency_key,
            "signedAt": datetime.now(timezone.utc).isoformat(),
        }
        # 实际为 EIP-712 结构化签名或链上原子交易的 raw tx
        return f"signed_{json.dumps(proof_payload)}"
    
    def log_action(self, action: str, details: Dict[str, Any]):
        """写入 CAW 审计日志 — 可追责、可复盘"""
        self.audit_log.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "details": details,
        })


class BuyerAgent:
    """
    自主支付 Agent 客户端
    
    责任:
    1. 发现服务
    2. 见证服务提供方声誉
    3. 发起请求并处理支付
    4. 在 Pact 约束下完成交易
    5. 保留可审计记录
    """
    
    def __init__(self, caw_wallet: CoboCAWWallet):
        self.wallet = caw_wallet
        self.session = requests.Session()
        
    def discover_service(self, endpoint: str) -> bool:
        """
        发现服务并检查其可用性。
        
        实际生产环境中，可通过：
        - 服务市场目录 (Bazaar)
        - ERC-8004 Agent 注册表
        - MCP / A2A 协议的能力广告
        """
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
            "agentId": agent_id,
            "reputationScore": 4.5,  # 5 分制
            "completedJobs": 128,
            "disputedJobs": 3,
            "completionRate": 0.977,
            "trustTier": "verified",
        }
    
    def request_service(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        向受 x402 保护的服务发起请求。
        
        完整流程:
        1. 发起请求
        2. 如果 402 → 处理支付
        3. 重试并返回结果
        """
        
        # Step 1: 首次请求（不带 payment proof）
        resp = self.session.post(
            f"{endpoint}/generate-content",
            json=params,
            timeout=10,
        )
        
        # Step 2: 处理 402 Payment Required
        if resp.status_code == 402:
            payment_req = self._parse_402_response(resp)
            
            # 检查 Pact 约束
            pact_check = self.wallet.check_pact(payment_req)
            if not pact_check.approved:
                # 超出授权范围 — 拒绝支付并记录
                self.wallet.log_action("PAYMENT_REJECTED", {
                    "reason": pact_check.reason,
                    "paymentReq": payment_req.__dict__,
                })
                raise PermissionError(
                    f"Payment rejected by Pact: {pact_check.reason}"
                )
            
            # Pact 通过 — 签名支付
            payment_proof = self.wallet.sign_payment(payment_req)
            
            # 记录授权执行
            self.wallet.log_action("PAYMENT_AUTHORIZED", {
                "idempotencyKey": payment_req.idempotency_key,
                "amount": payment_req.price,
                "payTo": payment_req.pay_to,
                "budgetBefore": pact_check.budget_remaining_before,
                "budgetAfter": pact_check.budget_remaining_after,
            })
            
            # Step 3: 重试带 Payment Proof
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
            raise RuntimeError(f"Service request failed: {resp.status_code} {resp.text}")
        
        result = resp.json()
        receipt = resp.headers.get("Payment-Receipt")
        
        # 记录完成
        self.wallet.log_action("SERVICE_COMPLETED", {
            "jobId": result.get("jobId"),
            "txHash": receipt,
            "deliverableHash": result.get("deliverableHash"),
        })
        
        return result
    
    def _parse_402_response(self, resp: requests.Response) -> PaymentRequirement:
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
        )


# 【使用示例】
if __name__ == "__main__":
    # 加载 Pact 配置
    pact_config = {
        "budget": {"max_usd": 50.0, "spent_usd": 0.0},
        "scope": {
            "allowed_contracts": ["0xProviderWalletAddressHere"],
            "allowed_networks": ["eip155:84532"],  # Base Sepolia
        },
        "timeWindow": {"createdAt": "2026-05-28T00:00:00Z", "expiresAt": "2026-05-31T00:00:00Z"},
        "owner": "alice-human-operator",
    }
    
    # 初始化 CAW 钱包
    wallet = CoboCAWWallet(pact_config)
    
    # 初始化 Buyer Agent
    agent = BuyerAgent(wallet)
    
    # 发现服务
    endpoint = "http://localhost:8000"
    if agent.discover_service(endpoint):
        print("✅ Service discovered and available")
        
        # 验证声誉
        reputation = agent.verify_provider_reputation("agent-contentgen-042")
        if reputation["reputationScore"] >= 4.0:
            print(f"✅ Provider reputation OK: {reputation['reputationScore']}/5")
            
            # 发起服务请求（含自动支付）
            result = agent.request_service(endpoint, {
                "brand": "Alice Coffee",
                "product": "Cold Brew",
                "audience": "Gen Z coffee lovers",
                "platform": "Instagram",
            })
            print(f"✅ Content generated: {result['jobId']}")
            print(f"   Deliverable hash: {result['deliverableHash']}")
            print(f"   Budget remaining: {wallet.pact['budget']['max_usd'] - wallet.pact['budget']['spent_usd']}")
        else:
            print(f"❌ Provider reputation too low: {reputation['reputationScore']}")
    else:
        print("❌ Service unavailable")
    
    # 打印审计日志
    print("\n--- Audit Log ---")
    for entry in wallet.audit_log:
        print(f"[{entry['timestamp']}] {entry['action']}")
