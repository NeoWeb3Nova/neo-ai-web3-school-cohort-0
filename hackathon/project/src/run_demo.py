"""
run_demo.py — OPC Agent Treasury 一键 Demo 入口

运行：
    python3 run_demo.py normal    # 正常流：开卡 → 日常采购 → 审计报表
    python3 run_demo.py attack    # 异常流：5 种攻击场景演示
    python3 run_demo.py full      # 完整流：正常 + 异常 + 审计

每个 flow 都在 3 分钟内完成，适合 hackathon 评审观看。
"""

import sys
import argparse

sys.path.insert(0, ".")
from caw_factory import get_caw_client
from content_agent import ContentAgent, AdAgent
from audit_reporter import AuditReporter
from threat_simulator import ThreatSimulator
from a2a_agent import A2ACoordinatorAgent, SubTask


def demo_normal():
    """正常流：OPC 老板的一天"""
    print("\n" + "=" * 60)
    print("🟢 NORMAL FLOW: One Day in an OPC Boss's Life")
    print("=" * 60)

    caw = get_caw_client()
    now = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
    print(f"\n📅 {now.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"CAW mode: {caw.__class__.__name__}")
    print("Neo (OPC owner) is hiring Content Agent and Ad Agent...\n")

    # ── 开卡 ──
    print("━" * 40)
    print("STEP 1: Issue Cards to Agents")
    print("━" * 40)

    content = ContentAgent("Content Agent", caw)
    content.onboard(monthly_budget=200.0, single_tx_limit=50.0)

    ad = AdAgent("Ad Agent", caw)
    ad.onboard(monthly_budget=800.0, single_tx_limit=200.0)

    # ── 日常采购 ──
    print("\n" + "━" * 40)
    print("STEP 2: Daily Purchases")
    print("━" * 40)

    content.purchase("OpenAI", 10.0, "GPT-4 API tokens")
    content.purchase("Midjourney", 30.0, "Image generation subscription")
    content.purchase("Unsplash", 5.0, "Stock photos")

    ad.purchase("Google Ads", 100.0, "Search campaign")
    ad.purchase("Twitter Ads", 50.0, "Social media promo")

    # ── 月末审计 ──
    print("\n" + "━" * 40)
    print("STEP 3: Monthly Audit Report")
    print("━" * 40)

    reporter = AuditReporter(caw)
    report = reporter.generate_monthly_report("2026-06", "markdown")
    print(report)

    print("\n" + "=" * 60)
    print("✅ NORMAL FLOW COMPLETE")
    print("Agents spent within budget. Boss slept well.")
    print("=" * 60)


def demo_attack():
    """异常流：CAW 防御测试"""
    print("\n" + "=" * 60)
    print("🔴 ATTACK FLOW: CAW Defense Test")
    print("=" * 60)
    print("\nSimulating real-world attacks against OPC Agent Treasury...")

    caw = get_caw_client()
    sim = ThreatSimulator(caw)
    sim.run_all()


def demo_full():
    """完整流：正常 + 异常 + 审计"""
    demo_normal()
    print("\n" + "🔄" + "\n")
    demo_attack()

    print("\n" + "=" * 60)
    print("🎉 FULL DEMO COMPLETE")
    print("=" * 60)
    print("\"Normal flow\" proves the system works.")
    print("\"Attack flow\" proves the system protects.")
    print("Together, they show a complete closed loop.")


def demo_a2a():
    """A2A 流：Agent-to-Agent 资金调度"""
    print("\n" + "=" * 60)
    print("🔗 A2A FLOW: Agent-to-Agent Treasury Coordination")
    print("=" * 60)

    caw = get_caw_client()
    now = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
    print(f"\n📅 {now.strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"CAW mode: {caw.__class__.__name__}")
    print("Neo (OPC owner) deploys a Coordinator Agent to rebalance budgets...\n")

    # ── Step 1: 业务 Agent 日常采购 ──
    print("━" * 40)
    print("STEP 1: Business Agents Daily Operations")
    print("━" * 40)

    content = ContentAgent("Content Agent", caw)
    content.onboard(monthly_budget=200.0, single_tx_limit=100.0, cooldown_hours=0)
    content.purchase("OpenAI", 10.0, "GPT-4 API tokens")
    content.purchase("Midjourney", 30.0, "Image generation subscription")
    # Content: spent=40, remaining=160

    ad = AdAgent("Ad Agent", caw)
    ad.onboard(monthly_budget=300.0, single_tx_limit=200.0, cooldown_hours=0)
    ad.purchase("Google Ads", 100.0, "Search campaign")
    ad.purchase("Twitter Ads", 80.0, "Social media promo")
    # Ad: spent=180, remaining=120

    # ── Step 2: Coordinator 上线 ──
    print("\n" + "━" * 40)
    print("STEP 2: A2A Coordinator Onboarding")
    print("━" * 40)

    coordinator = A2ACoordinatorAgent("A2A Coordinator", caw)
    coordinator.onboard(monthly_budget=500.0, single_tx_limit=200.0)

    # ── Step 3: 场景 A — 正常调度 ──
    print("\n" + "━" * 40)
    print("STEP 3: Scenario A — Cross-Agent task dispatch with top-up")
    print("━" * 40)
    print("Ad Agent has a sudden campaign opportunity but only ~120 USDC left.")
    print("Content Agent only used 40 USDC, has 160 remaining.\n")

    task = [
        SubTask(
            agent_name="Content Agent",
            description="Write launch article and generate hero image",
            estimated_cost=60.0,
            vendor="Midjourney",
            purpose="Hero image for product launch",
        ),
        SubTask(
            agent_name="Ad Agent",
            description="Run paid ads for the launch article",
            estimated_cost=150.0,
            vendor="Google Ads",
            purpose="Launch campaign promotion",
        ),
    ]

    result = coordinator.dispatch_task("🚀 Product Launch Campaign", task)

    # ── Step 4: 场景 B — 资金归集 ──
    print("\n" + "━" * 40)
    print("STEP 4: Scenario B — Post-task fund rebalancing")
    print("━" * 40)
    print("After campaign, Content Agent has leftover budget. Rebalancing to Ad Agent.\n")

    rebalance = coordinator.rebalance_funds("Content Agent", "Ad Agent", 20.0)
    print(f"\n  📋 Rebalance result: {rebalance['status']}")
    if rebalance.get("reason"):
        print(f"     Reason: {rebalance['reason']}")

    # ── Step 5: 汇总 ──
    print("\n" + "━" * 40)
    print("STEP 5: A2A Coordination Summary")
    print("━" * 40)
    print(f"  Task: {result['task_name']}")
    print(f"  Sub-tasks: {result['total_sub_tasks']}")
    print(f"  Approved: {result['approved_count']} | Failed: {result['failed_count']}")
    print(f"  Total spent: ${result['total_spent']:.2f} USDC")

    print("\n" + "=" * 60)
    print("✅ A2A FLOW COMPLETE")
    print("=" * 60)
    print("Budget rebalanced autonomously between Agents.")
    print("Every transfer enforced by Policy Engine.")
    print("Every action recorded in the audit trail.")


def main():
    parser = argparse.ArgumentParser(
        description="OPC Agent Treasury — Hackathon Demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 run_demo.py normal     # Show daily operations
  python3 run_demo.py attack     # Show defense scenarios
  python3 run_demo.py full       # Show everything
        """
    )
    parser.add_argument(
        "flow",
        choices=["normal", "attack", "full", "a2a"],
        nargs="?",
        default="full",
        help="Which demo flow to run (default: full)",
    )
    args = parser.parse_args()

    flows = {
        "normal": demo_normal,
        "attack": demo_attack,
        "full": demo_full,
        "a2a": demo_a2a,
    }

    flows[args.flow]()


if __name__ == "__main__":
    main()
