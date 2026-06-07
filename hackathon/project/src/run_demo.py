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
from mock_caw_client import MockCAWClient
from content_agent import ContentAgent, AdAgent
from audit_reporter import AuditReporter
from threat_simulator import ThreatSimulator


def demo_normal():
    """正常流：OPC 老板的一天"""
    print("\n" + "=" * 60)
    print("🟢 NORMAL FLOW: One Day in an OPC Boss's Life")
    print("=" * 60)

    caw = MockCAWClient()
    now = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)
    print(f"\n📅 {now.strftime('%Y-%m-%d %H:%M UTC')}")
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

    caw = MockCAWClient()
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
        choices=["normal", "attack", "full"],
        nargs="?",
        default="full",
        help="Which demo flow to run (default: full)",
    )
    args = parser.parse_args()

    flows = {
        "normal": demo_normal,
        "attack": demo_attack,
        "full": demo_full,
    }

    flows[args.flow]()


if __name__ == "__main__":
    main()
