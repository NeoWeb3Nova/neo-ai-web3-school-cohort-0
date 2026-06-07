"""
audit_reporter.py — 月末审计报表生成器

模拟财务 Agent 在月底自动生成审计报表。
调用 CAW 审计日志 API，输出结构化报表。

运行：
    python3 audit_reporter.py
"""

import sys
import csv
import io
from datetime import datetime, timezone

sys.path.insert(0, ".")
from mock_caw_client import MockCAWClient


class AuditReporter:
    """
    财务 Agent — 专门负责数据汇总、异常检测、报表生成。
    """

    def __init__(self, caw_client: MockCAWClient):
        self.caw = caw_client

    def generate_monthly_report(self, month: str = "2026-06", output_format: str = "markdown") -> str:
        """
        生成月末审计报表。

        month: YYYY-MM
        output_format: markdown | csv | json
        """
        summary = self.caw.get_monthly_summary(month)

        if output_format == "markdown":
            return self._render_markdown(summary)
        elif output_format == "csv":
            return self._render_csv(summary)
        else:
            return str(summary)

    def _render_markdown(self, summary: dict) -> str:
        lines = []
        lines.append("# OPC Agent Treasury — Monthly Audit Report")
        lines.append(f"**Month**: {summary['month']}  ")
        lines.append(f"**Generated at**: {summary['generated_at']}  ")
        lines.append("")
        lines.append("---")
        lines.append("")

        # 财务概览
        lines.append("## Financial Overview")
        lines.append("")
        lines.append(f"| Metric | Value |")
        lines.append(f"|---|---|")
        lines.append(f"| Monthly Income | {summary['total_income_usd']:.2f} USDC |")
        lines.append(f"| Total Approved | {summary['total_approved_usd']:.2f} USDC |")
        lines.append(f"| Total Denied | {summary['total_denied_usd']:.2f} USDC |")
        lines.append(f"| Denied Count | {summary['denied_count']} |")
        lines.append(f"| Transaction Count | {summary['transaction_count']} |")
        lines.append("")

        # 按 Agent 分类
        lines.append("## Spending by Agent")
        lines.append("")
        lines.append(f"| Agent | Spent | Tx Count | Vendors | Denied |")
        lines.append(f"|---|---|---|---|---|")
        for agent_id, data in summary["by_agent"].items():
            vendors = ", ".join(data["vendors"])
            lines.append(f"| {agent_id} | {data['spent']:.2f} USDC | {data['tx_count']} | {vendors} | {data['denied']} |")
        lines.append("")

        # 异常标记
        lines.append("## Anomalies & Alerts")
        lines.append("")
        if summary["anomalies"]:
            lines.append(f"| Tx ID | Agent | Amount | Alert | Reason |")
            lines.append(f"|---|---|---|---|---|")
            for a in summary["anomalies"]:
                lines.append(f"| {a['tx_id']} | {a['agent']} | {a['amount']:.2f} | {a['alert']} | {a['reason']} |")
        else:
            lines.append("*No anomalies detected this month.*")
        lines.append("")

        # 结语
        lines.append("---")
        lines.append("")
        lines.append("> 报表由 CAW Audit Pipeline 自动生成，不可篡改。")
        lines.append("> 每笔支付均经 MPC 签名验证。")

        return "\n".join(lines)

    def _render_csv(self, summary: dict) -> str:
        """导出 CSV 格式交易明细"""
        records = self.caw.list_transaction_records()
        if not records:
            return "No transactions found."

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["tx_id", "agent_id", "vendor", "amount", "currency", "status", "reason", "timestamp", "tx_hash"])

        for r in records:
            writer.writerow([
                r["tx_id"], r["agent_id"], r["vendor"], r["amount"],
                r["currency"], r["status"], r["reason"],
                r["timestamp"], r["tx_hash"],
            ])

        return output.getvalue()

    def export_report(self, filepath: str, month: str = "2026-06"):
        """导出 Markdown 报表到文件"""
        report = self.generate_monthly_report(month, "markdown")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"Audit report exported to: {filepath}")


# ═══════════════════════════════════════════════════════════════
# Demo
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Audit Reporter Demo")
    print("=" * 50)

    # 复用 content_agent 的运行时数据
    from content_agent import ContentAgent, AdAgent

    caw = MockCAWClient()

    content = ContentAgent("Content Agent", caw)
    content.onboard()
    content.purchase("OpenAI", 10.0, "API tokens")
    content.purchase("Midjourney", 30.0, "Subscription")
    content.purchase("Unsplash", 5.0, "Stock photos")

    ad = AdAgent("Ad Agent", caw)
    ad.onboard()
    ad.purchase("Google Ads", 100.0, "Search campaign")
    ad.purchase("Twitter Ads", 50.0, "Social promo")

    # 模拟一次拒绝（白名单外）
    content.purchase("EvilVendor", 999.0, "Suspicious request")

    print("\n" + "=" * 50)
    print("Generating Monthly Audit Report...")
    print("=" * 50)

    reporter = AuditReporter(caw)
    report = reporter.generate_monthly_report("2026-06", "markdown")
    print(report)

    # 同时导出 CSV
    csv_data = reporter.generate_monthly_report("2026-06", "csv")
    print("\n--- CSV Export Preview ---")
    print(csv_data[:500] + "...")
