"""
content_agent.py — 内容 Agent 运行时（Mock 版）

模拟一个"内容 Agent"对员工卡的操作：
- 向 OpenAI 购买 API tokens
- 向 Midjourney 订阅
- 向 Unsplash 买图片

运行：
    python3 content_agent.py
"""

import sys
import json
from datetime import datetime, timezone

# 将 src 加入路径（以便导入 mock_caw_client）
sys.path.insert(0, ".")
from mock_caw_client import MockCAWClient


class ContentAgent:
    """
    模拟一个专门负责内容生产的 AI Agent。
    它持有自己的 Card，在预算范围内自主采购工具和服务。
    """

    def __init__(self, name: str, caw_client: MockCAWClient):
        self.name = name
        self.caw = caw_client
        self.card_id: str = ""
        self.api_key: str = ""
        self.purchases: list = []

    def onboard(self, monthly_budget: float = 200.0, single_tx_limit: float = 50.0):
        """
        OPC 老板为内容 Agent 开卡。
        对应提案中的 Demo 场景 1：为 Content Agent 创建 Card Pact
        """
        print(f"[{self.name}] Onboarding...")

        self.card_id = self.caw.create_card_pact(
            agent_name=self.name,
            monthly_budget=monthly_budget,
            single_tx_limit=single_tx_limit,
            vendor_whitelist=[
                {"name": "OpenAI", "address": "0xOpenAI...", "category": "api"},
                {"name": "Midjourney", "address": "0xMidjourney...", "category": "api"},
                {"name": "Unsplash", "address": "0xUnsplash...", "category": "api"},
            ],
            cooldown_hours=12,
        )

        result = self.caw.approve_card(self.card_id)
        self.api_key = result["api_key"]

        print(f"  ✅ Card created: {self.card_id}")
        print(f"  ✅ Card approved, API key: {self.api_key[:16]}...")
        print(f"  💰 Budget: {monthly_budget} USDC/month, single tx limit: {single_tx_limit}")
        return self.card_id

    def purchase(self, vendor: str, amount: float, purpose: str = ""):
        """
        Agent 自主发起采购请求。
        实际运行中，这会由 Agent 的 workflow 自动触发。
        """
        print(f"  [{self.name}] Request: {vendor} ${amount:.2f} ({purpose})")

        result = self.caw.submit_payment(
            card_id=self.card_id,
            vendor=vendor,
            amount=amount,
            metadata={"purpose": purpose, "agent": self.name},
        )

        status_emoji = "✅" if result["status"] == "APPROVED" else "❌"
        print(f"    {status_emoji} {result['status']} — {result['reason']}")
        if result["status"] == "APPROVED":
            print(f"    💳 Remaining: {result['remaining_budget']:.2f} USDC")
            self.purchases.append({
                "vendor": vendor,
                "amount": amount,
                "purpose": purpose,
                "tx_hash": result.get("tx_hash", ""),
            })
        else:
            print(f"    🚫 BLOCKED: {result['reason']}")

        return result

    def run_daily(self):
        """
        模拟一天的工作流程。
        """
        print(f"\n{'='*50}")
        print(f"[{self.name}] Daily Workflow — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
        print(f"{'='*50}")

        # 1. OpenAI GPT-4 API 调用
        self.purchase("OpenAI", 10.0, "GPT-4 API tokens for blog generation")

        # 2. Midjourney 订阅
        self.purchase("Midjourney", 30.0, "Monthly image generation subscription")

        # 3. Unsplash 图片
        self.purchase("Unsplash", 5.0, "Stock photos for social media")

        print(f"\n  [{self.name}] Daily total: {sum(p['amount'] for p in self.purchases)} USDC")


class AdAgent:
    """
    模拟一个负责广告投放的 AI Agent。
    持有独立卡片，预算更大，供应商不同。
    """

    def __init__(self, name: str, caw_client: MockCAWClient):
        self.name = name
        self.caw = caw_client
        self.card_id: str = ""
        self.api_key: str = ""
        self.purchases: list = []

    def onboard(self, monthly_budget: float = 800.0, single_tx_limit: float = 200.0):
        print(f"[{self.name}] Onboarding...")

        self.card_id = self.caw.create_card_pact(
            agent_name=self.name,
            monthly_budget=monthly_budget,
            single_tx_limit=single_tx_limit,
            vendor_whitelist=[
                {"name": "Google Ads", "address": "0xGoogleAds...", "category": "ads"},
                {"name": "Twitter Ads", "address": "0xTwitterAds...", "category": "ads"},
            ],
            cooldown_hours=6,  # 广告投放更频繁
        )

        result = self.caw.approve_card(self.card_id)
        self.api_key = result["api_key"]

        print(f"  ✅ Card created: {self.card_id}")
        print(f"  ✅ Card approved, API key: {self.api_key[:16]}...")
        print(f"  💰 Budget: {monthly_budget} USDC/month, single tx limit: {single_tx_limit}")
        return self.card_id

    def purchase(self, vendor: str, amount: float, purpose: str = ""):
        print(f"  [{self.name}] Request: {vendor} ${amount:.2f} ({purpose})")

        result = self.caw.submit_payment(
            card_id=self.card_id,
            vendor=vendor,
            amount=amount,
            metadata={"purpose": purpose, "agent": self.name},
        )

        status_emoji = "✅" if result["status"] == "APPROVED" else "❌"
        print(f"    {status_emoji} {result['status']} — {result['reason']}")
        if result["status"] == "APPROVED":
            print(f"    💳 Remaining: {result['remaining_budget']:.2f} USDC")
            self.purchases.append({
                "vendor": vendor,
                "amount": amount,
                "purpose": purpose,
                "tx_hash": result.get("tx_hash", ""),
            })
        else:
            print(f"    🚫 BLOCKED: {result['reason']}")

        return result

    def run_daily(self):
        print(f"\n{'='*50}")
        print(f"[{self.name}] Daily Workflow — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
        print(f"{'='*50}")

        self.purchase("Google Ads", 100.0, "Search campaign for product launch")
        self.purchase("Twitter Ads", 50.0, "Social media promotion")

        print(f"\n  [{self.name}] Daily total: {sum(p['amount'] for p in self.purchases)} USDC")


# ═══════════════════════════════════════════════════════════════
# Demo
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("OPC Agent Treasury — Agent Runtime Demo")
    print("=" * 60)

    import sys
    sys.path.insert(0, ".")
    from caw_factory import get_caw_client

    caw = get_caw_client()
    print(f"[Mode] Using {type(caw).__name__}")

    # ── Agent 1: Content Agent ──
    content = ContentAgent("Content Agent", caw)
    content.onboard(monthly_budget=200.0, single_tx_limit=50.0)
    content.run_daily()

    # ── Agent 2: Ad Agent ──
    ad = AdAgent("Ad Agent", caw)
    ad.onboard(monthly_budget=800.0, single_tx_limit=200.0)
    ad.run_daily()

    print("\n" + "=" * 60)
    print("Demo complete. Both agents have independent budget cards.")
    print(f"Content Agent spent: {sum(p['amount'] for p in content.purchases)} USDC")
    print(f"Ad Agent spent: {sum(p['amount'] for p in ad.purchases)} USDC")
