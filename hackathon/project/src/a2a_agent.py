"""
a2a_agent.py — Agent-to-Agent 资金调度与协作

模拟一个 Coordinator Agent 接收复杂任务，拆解后调度多个执行 Agent 的资金，
并在策略引擎的保护下完成 A2A 资金归集/分配。

运行：
    python3 a2a_agent.py
"""

import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

sys.path.insert(0, ".")
from mock_caw_client import MockCAWClient
from content_agent import ContentAgent, AdAgent


@dataclass
class SubTask:
    """子任务定义"""
    agent_name: str
    description: str
    estimated_cost: float
    vendor: str
    purpose: str


class A2ACoordinatorAgent:
    """
    A2A 协调器 Agent — 接收复杂任务，调度多 Agent 协作并管理跨 Agent 资金流动。
    
    核心能力：
    1. 任务拆解：将复杂任务拆分为多个子任务
    2. 预算估算：计算每个子任务所需资金
    3. 资金调度：检查各 Agent 卡片余额，必要时从其他 Agent 归集/补充
    4. 策略执行：所有资金操作经过 Policy Engine 检查
    """

    def __init__(self, name: str, caw_client: MockCAWClient):
        self.name = name
        self.caw = caw_client
        self.card_id: str = ""
        self.sub_tasks: List[SubTask] = []
        self.execution_log: List[Dict[str, Any]] = []

    def onboard(self, monthly_budget: float = 1000.0, single_tx_limit: float = 500.0):
        """
        为 Coordinator 创建一张主调度卡（Treasury Master Card）。
        这张卡用于接收各 Agent 的未使用返还，并向缺资金的 Agent 补充。
        """
        print(f"[{self.name}] Onboarding...")

        self.card_id = self.caw.create_card_pact(
            agent_name=self.name,
            monthly_budget=monthly_budget,
            single_tx_limit=single_tx_limit,
            vendor_whitelist=[
                {"name": "Content Agent", "address": "0xContentAgentInternal...", "category": "a2a"},
                {"name": "Ad Agent", "address": "0xAdAgentInternal...", "category": "a2a"},
                {"name": "Design Agent", "address": "0xDesignAgentInternal...", "category": "a2a"},
            ],
            cooldown_hours=0,  # Coordinator 需要快速调度
            duration_days=30,
        )

        result = self.caw.approve_card(self.card_id)
        print(f"  ✅ Coordinator card created: {self.card_id}")
        print(f"  ✅ Card approved, API key: {result['api_key'][:16]}...")
        print(f"  💰 Treasury budget: {monthly_budget} USDC/month, single tx limit: {single_tx_limit}")
        return self.card_id

    def dispatch_task(self, task_name: str, sub_tasks: List[SubTask]) -> Dict[str, Any]:
        """
        接收复杂任务，拆解并调度执行。

        流程：
        1. 估算总预算
        2. 检查各目标 Agent 的余额
        3. 对于预算不足的 Agent，尝试从 Coordinator Treasury 补充
        4. 执行各子任务的采购
        """
        print(f"\n{'='*60}")
        print(f"[{self.name}] Dispatching task: {task_name}")
        print(f"{'='*60}")

        total_required = sum(st.estimated_cost for st in sub_tasks)
        print(f"  📋 Task breakdown: {len(sub_tasks)} sub-tasks, total budget required: ${total_required:.2f}")

        # 检查各 Agent 卡片余额
        cards = {c["agent_name"]: c for c in self.caw.list_cards()}
        execution_plan: List[Dict[str, Any]] = []

        for st in sub_tasks:
            agent_card = cards.get(st.agent_name)
            if not agent_card:
                print(f"  ⚠️ Agent '{st.agent_name}' not found. Skipping.")
                continue

            budget = agent_card["budget"]
            remaining = budget["monthly_max"] - budget["spent"]

            print(f"\n  🤖 {st.agent_name}: {st.description}")
            print(f"     Required: ${st.estimated_cost:.2f} | Available: ${remaining:.2f}")

            if remaining < st.estimated_cost:
                # 需要补充
                shortage = st.estimated_cost - remaining
                print(f"     ⚠️ Shortage: ${shortage:.2f}. Requesting top-up from Coordinator Treasury...")

                top_up_result = self._top_up_agent(agent_card["card_id"], shortage, st.agent_name)
                if top_up_result["status"] != "APPROVED":
                    print(f"     ❌ Top-up failed: {top_up_result['reason']}")
                    execution_plan.append({
                        "sub_task": st,
                        "status": "FAILED",
                        "reason": f"Top-up failed: {top_up_result['reason']}",
                    })
                    continue
                print(f"     ✅ Top-up approved. New available: ${remaining + shortage:.2f}")

            # 执行子任务采购
            purchase_result = self._execute_subtask(agent_card["card_id"], st)
            execution_plan.append({
                "sub_task": st,
                "status": purchase_result["status"],
                "result": purchase_result,
            })

        # 生成执行报告
        summary = self._generate_summary(task_name, execution_plan)
        self.execution_log.append(summary)
        return summary

    def _top_up_agent(self, target_card_id: str, amount: float, agent_name: str) -> Dict[str, Any]:
        """
        从 Coordinator Treasury 向目标 Agent 卡片补充资金。

        这模拟了一个关键的 A2A 经济流程：
        - Coordinator 作为中央资金池，统筹各 Agent 的预算
        - 补充操作经过 Policy Engine 检查（单笔限额、总预算等）
        - 生成可追溯的审计日志
        """
        # 检查 Coordinator Treasury 余额
        treasury_card = self.caw.get_card(self.card_id)
        treasury_remaining = treasury_card["budget"]["monthly_max"] - treasury_card["budget"]["spent"]

        if treasury_remaining < amount:
            return {
                "status": "DENIED",
                "reason": f"TREASURY_INSUFFICIENT: Coordinator has ${treasury_remaining:.2f}, needs ${amount:.2f}",
            }

        # 检查单笔限额
        if amount > treasury_card["budget"]["single_tx_limit"]:
            return {
                "status": "DENIED",
                "reason": f"POLICY_DENIED: per_tx_exceeded ({amount} > {treasury_card['budget']['single_tx_limit']})",
            }

        # 执行补充：直接调整模拟预算（实际中这会是一笔链上转账）
        treasury = self.caw._cards.get(self.card_id)
        target = self.caw._cards.get(target_card_id)

        if treasury and target:
            treasury.budget.spent += amount
            target.budget.spent = max(0, target.budget.spent - amount)

        # 记录审计日志
        self.caw._log_audit("A2A_TOP_UP", self.card_id, {
            "target_agent": agent_name,
            "target_card_id": target_card_id,
            "amount": amount,
            "treasury_remaining": treasury.budget.monthly_max - treasury.budget.spent,
        })

        return {
            "status": "APPROVED",
            "reason": "Treasury disbursement approved",
            "remaining_budget": treasury.budget.monthly_max - treasury.budget.spent,
        }

    def _execute_subtask(self, card_id: str, sub_task: SubTask) -> Dict[str, Any]:
        """执行单个子任务的采购"""
        result = self.caw.submit_payment(
            card_id,
            sub_task.vendor,
            sub_task.estimated_cost,
            metadata={
                "purpose": sub_task.purpose,
                "coordinated_by": self.name,
                "a2a": True,
            },
        )

        status_emoji = "✅" if result["status"] == "APPROVED" else "❌"
        print(f"     {status_emoji} {result['status']} — {result['reason']}")
        if result["status"] == "APPROVED":
            print(f"     💳 Remaining budget: ${result['remaining_budget']:.2f}")

        return result

    def _generate_summary(self, task_name: str, execution_plan: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成任务执行摘要"""
        approved = [e for e in execution_plan if e["status"] == "APPROVED"]
        failed = [e for e in execution_plan if e["status"] != "APPROVED"]
        total_spent = sum(e["sub_task"].estimated_cost for e in approved)

        print(f"\n  {'='*50}")
        print(f"  📋 Task Summary: {task_name}")
        print(f"  {'='*50}")
        print(f"  Total sub-tasks: {len(execution_plan)}")
        print(f"  Approved: {len(approved)} | Failed: {len(failed)}")
        print(f"  Total spent: ${total_spent:.2f} USDC")

        if failed:
            print(f"\n  ⚠️ Failed operations:")
            for f in failed:
                reason = f.get('reason') or f.get('result', {}).get('reason', 'Unknown')
                print(f"    - {f['sub_task'].agent_name}: {reason}")

        return {
            "task_name": task_name,
            "total_sub_tasks": len(execution_plan),
            "approved_count": len(approved),
            "failed_count": len(failed),
            "total_spent": total_spent,
            "details": execution_plan,
        }

    def rebalance_funds(self, from_agent_name: str, to_agent_name: str, amount: float) -> Dict[str, Any]:
        """
        主动资金归集：从一个 Agent 向另一个 Agent 调拨资金。

        场景：Ad Agent 本月预算用完，Content Agent 还有剩余，
        老板决定将 Content Agent 的未使用余额调给 Ad Agent。
        """
        print(f"\n{'='*60}")
        print(f"[{self.name}] Rebalancing: {from_agent_name} -> {to_agent_name} (${amount:.2f})")
        print(f"{'='*60}")

        cards = {c["agent_name"]: c for c in self.caw.list_cards()}
        from_card = cards.get(from_agent_name)
        to_card = cards.get(to_agent_name)

        if not from_card or not to_card:
            return {"status": "DENIED", "reason": "AGENT_NOT_FOUND"}

        from_remaining = from_card["budget"]["monthly_max"] - from_card["budget"]["spent"]
        if from_remaining < amount:
            return {
                "status": "DENIED",
                "reason": f"INSUFFICIENT_FUNDS: {from_agent_name} has ${from_remaining:.2f}, needs ${amount:.2f}",
            }

        # 模拟归集：从来源 Agent 扣减，目标 Agent 增加
        # 实际中这会是两笔链上转账
        source = self.caw._cards.get(from_card["card_id"])
        target = self.caw._cards.get(to_card["card_id"])

        if source and target:
            source.budget.spent += amount
            target.budget.spent = max(0, target.budget.spent - amount)

        # 记录审计日志
        self.caw._log_audit("A2A_REBALANCE", self.card_id, {
            "from_agent": from_agent_name,
            "to_agent": to_agent_name,
            "amount": amount,
            "from_card": from_card["card_id"],
            "to_card": to_card["card_id"],
        })

        print(f"  ✅ Rebalance complete.")
        print(f"     {from_agent_name}: ${from_remaining - amount:.2f} remaining")
        print(f"     {to_agent_name}: ${to_card['budget']['monthly_max'] - to_card['budget']['spent'] + amount:.2f} available")

        return {
            "status": "APPROVED",
            "from_agent": from_agent_name,
            "to_agent": to_agent_name,
            "amount": amount,
        }


# ═════════════════════════════════════════════════════════════════════════
# Demo
# ═════════════════════════════════════════════════════════════════════════

def run_a2a_demo():
    """
    A2A 完整演示流程：
    1. 创建 Content Agent 和 Ad Agent，给 Content Agent 少量预算
    2. Coordinator 接收任务"发布推广活动"，需要两个 Agent 协作
    3. Content Agent 预算不足，Coordinator 从 Treasury 补充
    4. 任务完成后，Content Agent 有剩余，调拨给 Ad Agent
    """
    print("\n" + "🚀" * 25)
    print("A2A DEMO — Agent-to-Agent Treasury Coordination")
    print("🚀" * 25)

    from caw_factory import get_caw_client
    caw = get_caw_client()
    print(f"[Mode] Using {type(caw).__name__}\n")

    # 1. 创建各 Agent
    content = ContentAgent("Content Agent", caw)
    content.onboard(monthly_budget=30.0, single_tx_limit=20.0)
    content.purchase("OpenAI", 10.0, "Initial research")
    # 此时 Content Agent 剩余约 $20

    ad = AdAgent("Ad Agent", caw)
    ad.onboard(monthly_budget=50.0, single_tx_limit=25.0)
    ad.purchase("Google Ads", 30.0, "Pre-launch test")
    # 此时 Ad Agent 剩余约 $20

    # 2. 创建 Coordinator
    coordinator = A2ACoordinatorAgent("Coordinator", caw)
    coordinator.onboard(monthly_budget=500.0, single_tx_limit=200.0)

    # 3. 派发复杂任务
    task = [
        SubTask(
            agent_name="Content Agent",
            description="Write launch article and generate hero image",
            estimated_cost=35.0,
            vendor="Midjourney",
            purpose="Hero image for product launch",
        ),
        SubTask(
            agent_name="Ad Agent",
            description="Run paid ads for the launch article",
            estimated_cost=40.0,
            vendor="Google Ads",
            purpose="Launch campaign promotion",
        ),
    ]

    result = coordinator.dispatch_task("🚀 Product Launch Campaign", task)

    # 4. 资金归集：假设任务后 Content Agent 有剩余，调给 Ad Agent
    print("\n" + "-" * 50)
    print("Post-task rebalancing...")
    print("-" * 50)

    # 模拟 Content Agent 完成任务后有 $10 剩余，调给 Ad Agent
    rebalance = coordinator.rebalance_funds("Content Agent", "Ad Agent", 10.0)

    print("\n" + "=" * 50)
    print("A2A DEMO COMPLETE")
    print("=" * 50)
    print(f"Task approved: {result['approved_count']}/{result['total_sub_tasks']}")
    print(f"Total spent: ${result['total_spent']:.2f} USDC")
    print("\nKey A2A capabilities demonstrated:")
    print("  1. ✓ Cross-Agent budget coordination")
    print("  2. ✓ Treasury top-up when individual Agent underfunded")
    print("  3. ✓ Post-task fund rebalancing")
    print("  4. ✓ All operations logged with audit trail")


if __name__ == "__main__":
    run_a2a_demo()
