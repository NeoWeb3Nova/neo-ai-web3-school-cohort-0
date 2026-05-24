"""
模块 C 最小交叉实验 — Python 伪代码

核心链路: AI 生成提案 → Guard检查 → 人工复核 → 钱包签名 → 链上执行 → 收据生成
权限设计: Agent 只有「提案权」，没有「签名权」
Week 2 增强: 增加 Budget + Quote + AI Security 层
"""

from typing import Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Proposal:
    """Agent 生成的交易提案"""
    action: str           # 操作类型，如 "swap"、"transfer"、"call"
    target_contract: str  # 目标合约地址
    value_eth: float      # 涉及价值（ETH 计价）
    calldata: str         # 调用数据
    reasoning: str        # Agent 的推理过程
    risk_level: str       # "low" | "medium" | "high"


@dataclass
class Quote:
    """服务方报价（Machine Payment 概念）"""
    service: str
    amount: float
    token: str
    recipient: str
    valid_until: datetime
    quote_id: str


@dataclass
class Receipt:
    """支付收据（可验证凭证）"""
    quote_id: str
    tx_hash: Optional[str]
    timestamp: datetime
    status: str  # "success" | "failed"


class BudgetPolicy:
    """Agent 支付权限的最小策略检查器"""
    def __init__(self, daily_max_usdc: float = 10.0, per_call_max_usdc: float = 1.0):
        self.daily_max = daily_max_usdc
        self.per_call_max = per_call_max_usdc
        self.spent_today = 0.0
        self.logs: list = []

    def check_quote(self, quote: Quote) -> tuple[bool, str]:
        if quote.amount > self.per_call_max:
            return False, f"Amount {quote.amount} > per-call limit {self.per_call_max}"
        if self.spent_today + quote.amount > self.daily_max:
            return False, f"Daily budget exhausted"
        return True, "Quote approved"

    def record(self, quote: Quote, receipt: Receipt):
        self.spent_today += quote.amount
        self.logs.append({"quote": quote, "receipt": receipt, "time": datetime.utcnow()})


class Guard:
    """确定性拦截层 — 在交易出门前检查规则"""
    def __init__(self, whitelist: list[str] | None = None, max_value: float = 0.1):
        self.whitelist = whitelist or []
        self.max_value = max_value

    def check(self, proposal: Proposal) -> tuple[bool, str]:
        if proposal.target_contract not in self.whitelist:
            return False, f"Contract {proposal.target_contract} not in whitelist"
        if proposal.value_eth > self.max_value:
            return False, f"Value {proposal.value_eth} ETH exceeds limit {self.max_value}"
        if proposal.risk_level == "high":
            return False, "High-risk proposal requires explicit human confirmation"
        return True, "Guard passed"


class AgentModuleC:
    """
模块 C 主体: AI Agent 只负责生成提案，不触碰签名"""
    def __init__(self, guard: Guard, budget: BudgetPolicy):
        self.guard = guard
        self.budget = budget
        self.audit_log: list = []

    def read_untrusted_context(self, source: str, content: str) -> str:
        """AI Security: 所有外部内容标记为 untrusted"""
        # 实际中会在输入上加标注，这里用注释表示
        # prompt_prefix = "[UNTRUSTED CONTEXT from {source}]\n{content}\n[END UNTRUSTED CONTEXT]"
        return f"[UNTRUSTED from {source}] {content[:200]}..."

    def generate_proposal(self, user_goal: str, context: str) -> Proposal:
        """生成交易提案 — 模拟 LLM 输出"""
        # 实际中这里会调用 LLM，生成目标、合约、参数等
        proposal = Proposal(
            action="swap",
            target_contract="0xUniswapV2Router",  # 示例
            value_eth=0.05,
            calldata="0x...",
            reasoning=f"To achieve '{user_goal}', swapping on DEX is optimal.",
            risk_level="low"
        )
        self.audit_log.append({"step": "generate", "input": user_goal, "output": proposal})
        return proposal

    def get_service_quote(self, service_endpoint: str) -> Quote:
        """获取服务报价 — Machine Payment 概念"""
        # 模拟向服务方请求 quote
        quote = Quote(
            service="data-api",
            amount=0.5,
            token="USDC",
            recipient="0xServiceProvider",
            valid_until=datetime.utcnow(),
            quote_id="q-12345"
        )
        return quote

    def run(self, user_goal: str) -> dict:
        """完整流程伪代码"""
        # 1. 生成提案
        proposal = self.generate_proposal(user_goal, context="")

        # 2. Guard 检查
        ok, reason = self.guard.check(proposal)
        if not ok:
            self.audit_log.append({"step": "guard_reject", "reason": reason})
            return {"status": "rejected_by_guard", "reason": reason, "log": self.audit_log}

        # 3. 人工复核（模拟弹窗确认）
        human_approved = self._simulate_human_review(proposal)
        if not human_approved:
            self.audit_log.append({"step": "human_reject"})
            return {"status": "rejected_by_human", "log": self.audit_log}

        # 4. 如果需要调用付费 API，检查 Budget + Quote
        quote = self.get_service_quote("data-api")
        budget_ok, budget_reason = self.budget.check_quote(quote)
        if not budget_ok:
            return {"status": "rejected_by_budget", "reason": budget_reason, "log": self.audit_log}

        # 5. 钱包签名 — Agent 不执行，交给人类钱包
        tx_hash = self._simulate_wallet_sign(proposal, quote)

        # 6. 链上执行
        receipt = Receipt(quote_id=quote.quote_id, tx_hash=tx_hash, timestamp=datetime.utcnow(), status="success")
        self.budget.record(quote, receipt)
        self.audit_log.append({"step": "executed", "tx": tx_hash, "receipt": receipt})

        return {"status": "success", "tx_hash": tx_hash, "log": self.audit_log}

    def _simulate_human_review(self, proposal: Proposal) -> bool:
        # 实际中这里会是 UI 弹窗或非同步确认
        # 为了演示，默认同意低风险交易
        return proposal.risk_level == "low"

    def _simulate_wallet_sign(self, proposal: Proposal, quote: Quote) -> str:
        # 实际中这里会调用钱包工具（Metamask / WalletConnect / Smart Account）
        # Agent 永远不接触私钥
        return f"0xSimulatedTxHashFor_{proposal.action}_{quote.quote_id}"


# --- 演示运行 ---
if __name__ == "__main__":
    guard = Guard(whitelist=["0xUniswapV2Router", "0xSafeRouter"], max_value=0.1)
    budget = BudgetPolicy(daily_max_usdc=10.0, per_call_max_usdc=1.0)
    agent = AgentModuleC(guard=guard, budget=budget)

    result = agent.run("Swap 0.05 ETH to USDC on Base Sepolia")
    print("Result:", result["status"])
    for entry in result.get("log", []):
        print(" -", entry)
