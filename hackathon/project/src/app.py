"""
app.py — OPC Agent Treasury Streamlit Dashboard

运行方式:
    cd hackathon/project/src
    streamlit run app.py

页面:
    - Dashboard: 系统总览、预算、Agent状态
    - Pact Manager: Card生命周期管理
    - Agent Ops: 日常采购模拟
    - Threat Lab: 5种攻击场景
    - Audit: 审计报表+图表
    - Logs: 实时交易流水
"""

import sys
sys.path.insert(0, ".")

import streamlit as st
import pandas as pd
from datetime import datetime, timezone
from caw_factory import get_caw_client
from content_agent import ContentAgent, AdAgent
from audit_reporter import AuditReporter
from threat_simulator import ThreatSimulator

# ═══════════════════════════════════════════════════════════════
# Page Config
# ═══════════════════════════════════════════════════════════════
st.set_page_config(
    page_title="OPC Agent Treasury",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ═══════════════════════════════════════════════════════════════
# Custom CSS
# ═══════════════════════════════════════════════════════════════
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 800;
        color: #1f2937;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #6b7280;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 1rem;
        color: white;
        text-align: center;
    }
    .status-active { color: #10b981; font-weight: 600; }
    .status-pending { color: #f59e0b; font-weight: 600; }
    .status-revoked { color: #ef4444; font-weight: 600; }
    .status-denied { color: #ef4444; font-weight: 600; }
    .status-approved { color: #10b981; font-weight: 600; }
    .log-approved { background-color: #d1fae5; padding: 0.5rem; border-radius: 0.5rem; margin: 0.25rem 0; }
    .log-denied { background-color: #fee2e2; padding: 0.5rem; border-radius: 0.5rem; margin: 0.25rem 0; }
    .log-review { background-color: #fef3c7; padding: 0.5rem; border-radius: 0.5rem; margin: 0.25rem 0; }
    .attack-card {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1rem;
        margin: 0.5rem 0;
        background: #f9fafb;
    }
    .attack-card:hover {
        border-color: #ef4444;
        background: #fef2f2;
    }
</style>
""", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════
# Session State — 持久化存储
# ═══════════════════════════════════════════════════════════════
def init_state():
    if "caw" not in st.session_state:
        st.session_state.caw = get_caw_client()
    if "initialized" not in st.session_state:
        st.session_state.initialized = False
    if "content_agent" not in st.session_state:
        st.session_state.content_agent = None
    if "ad_agent" not in st.session_state:
        st.session_state.ad_agent = None
    if "log_messages" not in st.session_state:
        st.session_state.log_messages = []
    if "threat_results" not in st.session_state:
        st.session_state.threat_results = []

init_state()

def log(msg: str, level: str = "info"):
    """添加日志到session state"""
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    st.session_state.log_messages.append({"time": ts, "msg": msg, "level": level})

def get_caw():
    return st.session_state.caw

# ═══════════════════════════════════════════════════════════════
# Sidebar
# ═══════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("## 🛡️ OPC Agent Treasury")
    st.markdown("*Powered by Cobo CAW*")
    st.divider()

    page = st.radio(
        "Navigation",
        ["🏠 Dashboard", "📋 Pact Manager", "🤖 Agent Ops", "⚔️ Threat Lab", "📊 Audit", "📜 Logs"],
        index=0,
    )

    st.divider()
    st.markdown("### System Status")
    caw = get_caw()
    cards = caw.list_cards()
    active_cards = len([c for c in cards if c["status"] == "ACTIVE"])
    st.metric("Active Cards", active_cards)
    st.metric("Total Tx", len(caw._transactions))
    denied = len([t for t in caw._transactions if t.status == "DENIED"])
    st.metric("Blocked", denied)

    st.divider()
    if st.button("🔄 Reset System", type="secondary", use_container_width=True):
        st.session_state.caw = get_caw_client()
        st.session_state.initialized = False
        st.session_state.content_agent = None
        st.session_state.ad_agent = None
        st.session_state.log_messages = []
        st.session_state.threat_results = []
        log("System reset complete", "info")
        st.rerun()

# ═══════════════════════════════════════════════════════════════
# Helper: 初始化Demo数据
# ═══════════════════════════════════════════════════════════════
def ensure_initialized():
    if st.session_state.initialized:
        return

    caw = get_caw()

    # Content Agent
    content = ContentAgent("Content Agent", caw)
    content.onboard(monthly_budget=200.0, single_tx_limit=50.0)
    content.purchase("OpenAI", 10.0, "GPT-4 API tokens")
    content.purchase("Midjourney", 30.0, "Image generation")
    content.purchase("Unsplash", 5.0, "Stock photos")

    # Ad Agent
    ad = AdAgent("Ad Agent", caw)
    ad.onboard(monthly_budget=800.0, single_tx_limit=200.0)
    ad.purchase("Google Ads", 100.0, "Search campaign")
    ad.purchase("Twitter Ads", 50.0, "Social promo")

    st.session_state.content_agent = content
    st.session_state.ad_agent = ad
    st.session_state.initialized = True
    log("Demo data initialized", "success")

# ═══════════════════════════════════════════════════════════════
# Page: Dashboard
# ═══════════════════════════════════════════════════════════════
if page == "🏠 Dashboard":
    st.markdown('<div class="main-header">🏠 Dashboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">OPC Agent Treasury — Real-time Overview</div>', unsafe_allow_html=True)

    ensure_initialized()
    caw = get_caw()
    cards = caw.list_cards()
    transactions = caw._transactions

    # Top metrics
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        total_budget = sum(c["budget"]["monthly_max"] for c in cards)
        st.metric("Total Budget", f"${total_budget:,.0f} USDC")
    with col2:
        total_spent = sum(c["budget"]["spent"] for c in cards)
        st.metric("Total Spent", f"${total_spent:,.2f} USDC")
    with col3:
        approved_count = len([t for t in transactions if t.status == "APPROVED"])
        st.metric("Approved Tx", approved_count)
    with col4:
        denied_count = len([t for t in transactions if t.status == "DENIED"])
        st.metric("Blocked Tx", denied_count, delta=f"{denied_count} threats stopped")

    st.divider()

    # Cards overview
    st.markdown("### 💳 Active Cards")
    if cards:
        cols = st.columns(len(cards))
        for idx, card in enumerate(cards):
            with cols[idx]:
                budget = card["budget"]
                pct = budget["spent"] / budget["monthly_max"] * 100 if budget["monthly_max"] > 0 else 0
                status_color = "status-active" if card["status"] == "ACTIVE" else "status-pending" if card["status"] == "PENDING_APPROVAL" else "status-revoked"

                st.markdown(f"""
                <div style="border:1px solid #e5e7eb; border-radius:1rem; padding:1rem; background:white;">
                    <div style="font-size:0.85rem; color:#6b7280;">{card['card_id']}</div>
                    <div style="font-size:1.2rem; font-weight:700; margin:0.5rem 0;">{card['agent_name']}</div>
                    <div class="{status_color}">● {card['status']}</div>
                    <div style="margin-top:0.75rem;">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                            <span>${budget['spent']:.0f} / ${budget['monthly_max']:.0f}</span>
                            <span>{pct:.0f}%</span>
                        </div>
                        <div style="background:#e5e7eb; border-radius:0.5rem; height:0.5rem; margin-top:0.25rem;">
                            <div style="background:{'#10b981' if pct < 70 else '#f59e0b' if pct < 90 else '#ef4444'}; width:{min(pct,100)}%; height:100%; border-radius:0.5rem;"></div>
                        </div>
                    </div>
                    <div style="font-size:0.8rem; color:#6b7280; margin-top:0.5rem;">
                        Single tx limit: ${budget['single_tx_limit']:.0f}
                    </div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("No cards yet. Go to Pact Manager to create one.")

    st.divider()

    # Recent transactions
    st.markdown("### 🔄 Recent Transactions")
    if transactions:
        recent = transactions[-10:][::-1]
        for tx in recent:
            status_class = "log-approved" if tx.status == "APPROVED" else "log-denied" if tx.status == "DENIED" else "log-review"
            emoji = "✅" if tx.status == "APPROVED" else "❌" if tx.status == "DENIED" else "⚠️"
            st.markdown(f"""
            <div class="{status_class}">
                <span style="font-family:monospace; color:#6b7280;">{tx.timestamp[11:19]}</span>
                <strong>{emoji} {tx.status}</strong> —
                <strong>{tx.vendor}</strong> ${tx.amount:.2f}
                <span style="color:#6b7280; font-size:0.85rem;">({tx.reason[:60]}{'...' if len(tx.reason) > 60 else ''})</span>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("No transactions yet.")

# ═══════════════════════════════════════════════════════════════
# Page: Pact Manager
# ═══════════════════════════════════════════════════════════════
elif page == "📋 Pact Manager":
    st.markdown('<div class="main-header">📋 Pact Manager</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Create, approve, and manage Agent Card Pacts</div>', unsafe_allow_html=True)

    caw = get_caw()

    tab1, tab2 = st.tabs(["➕ Create New Pact", "📋 Manage Existing"])

    with tab1:
        st.markdown("### Create a new Card Pact for an Agent")
        col1, col2 = st.columns(2)
        with col1:
            agent_name = st.text_input("Agent Name", value="New Agent")
            monthly_budget = st.number_input("Monthly Budget (USDC)", min_value=10.0, max_value=10000.0, value=500.0, step=10.0)
        with col2:
            single_tx_limit = st.number_input("Single Tx Limit (USDC)", min_value=1.0, max_value=5000.0, value=100.0, step=5.0)
            cooldown_hours = st.number_input("Cooldown Hours", min_value=0, max_value=168, value=12, step=1)

        st.markdown("#### Vendor Whitelist")
        default_vendors = "OpenAI, Midjourney, Unsplash"
        vendors_input = st.text_area("Enter vendor names (comma separated)", value=default_vendors)
        vendors = [v.strip() for v in vendors_input.split(",") if v.strip()]

        if st.button("🚀 Create Pact", type="primary", use_container_width=True):
            vendor_list = [{"name": v, "address": f"0x{v.replace(' ', '')}...", "category": "api"} for v in vendors]
            card_id = caw.create_card_pact(
                agent_name=agent_name,
                monthly_budget=monthly_budget,
                single_tx_limit=single_tx_limit,
                vendor_whitelist=vendor_list,
                cooldown_hours=cooldown_hours,
            )
            log(f"Created pact {card_id} for {agent_name}", "success")
            st.success(f"Pact created: `{card_id}` — Status: PENDING_APPROVAL")
            st.rerun()

    with tab2:
        cards = caw.list_cards()
        if not cards:
            st.info("No cards yet. Create one above.")
        else:
            for card in cards:
                with st.expander(f"💳 {card['agent_name']} — {card['card_id']} [{card['status']}]"):
                    col1, col2, col3 = st.columns([2, 2, 1])
                    with col1:
                        st.json(card)
                    with col2:
                        st.markdown("#### Actions")
                        if card["status"] == "PENDING_APPROVAL":
                            if st.button("✅ Approve", key=f"approve_{card['card_id']}"):
                                result = caw.approve_card(card["card_id"])
                                log(f"Approved {card['card_id']}", "success")
                                st.rerun()
                        if card["status"] == "ACTIVE":
                            if st.button("❌ Revoke", key=f"revoke_{card['card_id']}"):
                                caw.revoke_card(card["card_id"])
                                log(f"Revoked {card['card_id']}", "warning")
                                st.rerun()
                    with col3:
                        # Mini chart of budget usage
                        budget = card["budget"]
                        pct = budget["spent"] / budget["monthly_max"] * 100 if budget["monthly_max"] > 0 else 0
                        st.markdown(f"""
                        <div style="text-align:center;">
                            <div style="font-size:2rem; font-weight:800; color:{'#10b981' if pct < 70 else '#f59e0b' if pct < 90 else '#ef4444'};">{pct:.0f}%</div>
                            <div style="font-size:0.85rem; color:#6b7280;">Budget Used</div>
                            <div style="margin-top:0.5rem; font-size:0.9rem;">${budget['spent']:.0f} / ${budget['monthly_max']:.0f}</div>
                        </div>
                        """, unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════
# Page: Agent Ops
# ═══════════════════════════════════════════════════════════════
elif page == "🤖 Agent Ops":
    st.markdown('<div class="main-header">🤖 Agent Operations</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Simulate daily Agent purchases and workflows</div>', unsafe_allow_html=True)

    ensure_initialized()
    caw = get_caw()

    # Show current agents
    content = st.session_state.content_agent
    ad = st.session_state.ad_agent

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 📝 Content Agent")
        if content:
            card = caw.get_card(content.card_id)
            budget = card["budget"]
            st.markdown(f"""
            - Card: `{content.card_id}`
            - Budget: ${budget['spent']:.2f} / ${budget['monthly_max']:.2f} USDC
            - Single tx limit: ${budget['single_tx_limit']:.2f}
            - API Key: `{content.api_key[:20]}...`
            """)

            st.markdown("#### Quick Actions")
            qa_col1, qa_col2, qa_col3 = st.columns(3)
            with qa_col1:
                if st.button("OpenAI $10", key="ca_openai"):
                    result = content.purchase("OpenAI", 10.0, "API tokens")
                    log(f"Content Agent: OpenAI $10 — {result['status']}", result['status'].lower())
                    st.rerun()
            with qa_col2:
                if st.button("Midjourney $30", key="ca_midjourney"):
                    result = content.purchase("Midjourney", 30.0, "Subscription")
                    log(f"Content Agent: Midjourney $30 — {result['status']}", result['status'].lower())
                    st.rerun()
            with qa_col3:
                if st.button("Unsplash $5", key="ca_unsplash"):
                    result = content.purchase("Unsplash", 5.0, "Stock photos")
                    log(f"Content Agent: Unsplash $5 — {result['status']}", result['status'].lower())
                    st.rerun()

            # Custom purchase
            st.markdown("#### Custom Purchase")
            ca_vendor = st.text_input("Vendor", value="OpenAI", key="ca_vendor")
            ca_amount = st.number_input("Amount", min_value=0.1, value=15.0, key="ca_amount")
            if st.button("Submit Payment", key="ca_custom"):
                result = content.purchase(ca_vendor, ca_amount, "Custom request")
                log(f"Content Agent: {ca_vendor} ${ca_amount} — {result['status']}", result['status'].lower())
                st.rerun()

    with col2:
        st.markdown("### 📢 Ad Agent")
        if ad:
            card = caw.get_card(ad.card_id)
            budget = card["budget"]
            st.markdown(f"""
            - Card: `{ad.card_id}`
            - Budget: ${budget['spent']:.2f} / ${budget['monthly_max']:.2f} USDC
            - Single tx limit: ${budget['single_tx_limit']:.2f}
            - API Key: `{ad.api_key[:20]}...`
            """)

            st.markdown("#### Quick Actions")
            aa_col1, aa_col2 = st.columns(2)
            with aa_col1:
                if st.button("Google Ads $100", key="aa_google"):
                    result = ad.purchase("Google Ads", 100.0, "Search campaign")
                    log(f"Ad Agent: Google Ads $100 — {result['status']}", result['status'].lower())
                    st.rerun()
            with aa_col2:
                if st.button("Twitter Ads $50", key="aa_twitter"):
                    result = ad.purchase("Twitter Ads", 50.0, "Social promo")
                    log(f"Ad Agent: Twitter Ads $50 — {result['status']}", result['status'].lower())
                    st.rerun()

            st.markdown("#### Custom Purchase")
            aa_vendor = st.text_input("Vendor", value="Google Ads", key="aa_vendor")
            aa_amount = st.number_input("Amount", min_value=0.1, value=75.0, key="aa_amount")
            if st.button("Submit Payment", key="aa_custom"):
                result = ad.purchase(aa_vendor, aa_amount, "Custom request")
                log(f"Ad Agent: {aa_vendor} ${aa_amount} — {result['status']}", result['status'].lower())
                st.rerun()

    st.divider()
    st.markdown("### 📊 Purchase History")
    if content and ad:
        all_purchases = []
        for p in content.purchases:
            all_purchases.append({"Agent": "Content", "Vendor": p["vendor"], "Amount": p["amount"], "Purpose": p["purpose"]})
        for p in ad.purchases:
            all_purchases.append({"Agent": "Ad", "Vendor": p["vendor"], "Amount": p["amount"], "Purpose": p["purpose"]})
        if all_purchases:
            df = pd.DataFrame(all_purchases)
            st.dataframe(df, use_container_width=True)

            # Simple bar chart
            st.bar_chart(df.groupby("Agent")["Amount"].sum())
        else:
            st.info("No purchases yet.")

# ═══════════════════════════════════════════════════════════════
# Page: Threat Lab
# ═══════════════════════════════════════════════════════════════
elif page == "⚔️ Threat Lab":
    st.markdown('<div class="main-header">⚔️ Threat Lab</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">5 Attack Scenarios — Verify CAW Policy Engine Defense</div>', unsafe_allow_html=True)

    caw = get_caw()

    # Need a victim card
    st.markdown("### 🎯 Target Card")
    victim_card_id = None
    cards = caw.list_cards()
    active_cards = [c for c in cards if c["status"] == "ACTIVE"]

    if active_cards:
        victim_card_id = st.selectbox("Select target card", [c["card_id"] for c in active_cards])
    else:
        st.warning("No active cards. Create and approve one in Pact Manager first.")
        if st.button("🚀 Auto-create test card"):
            cid = caw.create_card_pact(
                agent_name="Threat Target",
                monthly_budget=200.0,
                single_tx_limit=50.0,
                vendor_whitelist=[
                    {"name": "OpenAI", "address": "0xOpenAI...", "category": "api"},
                    {"name": "Midjourney", "address": "0xMidjourney...", "category": "api"},
                ],
                cooldown_hours=12,
            )
            caw.approve_card(cid)
            log(f"Created test card {cid}", "success")
            st.rerun()

    if victim_card_id:
        st.markdown("---")
        st.markdown("### 🚨 Attack Scenarios")

        attack_col1, attack_col2 = st.columns(2)

        with attack_col1:
            # A1: Prompt Injection
            with st.container():
                st.markdown("""
                <div class="attack-card">
                    <h4>🎭 A1: Prompt Injection</h4>
                    <p>Agent tricked into paying unknown address</p>
                </div>
                """, unsafe_allow_html=True)
                if st.button("🚀 Launch A1", key="a1"):
                    result = caw.submit_payment(
                        victim_card_id, "0xEvilHacker", 500.0,
                        metadata={"trigger": "prompt_injection"}
                    )
                    st.session_state.threat_results.append({"attack": "A1", "result": result})
                    log(f"A1 Prompt Injection: {result['status']} — {result['reason']}", "warning" if result['status'] == "DENIED" else "error")
                    st.rerun()

            # A2: Overpriced
            with st.container():
                st.markdown("""
                <div class="attack-card">
                    <h4>💰 A2: Overpriced Request</h4>
                    <p>Vendor charges $500 (limit: $50)</p>
                </div>
                """, unsafe_allow_html=True)
                if st.button("🚀 Launch A2", key="a2"):
                    result = caw.submit_payment(
                        victim_card_id, "Midjourney", 500.0,
                        metadata={"trigger": "overpriced"}
                    )
                    st.session_state.threat_results.append({"attack": "A2", "result": result})
                    log(f"A2 Overpriced: {result['status']} — {result['reason']}", "warning" if result['status'] == "DENIED" else "error")
                    st.rerun()

            # A3: Scope Bypass
            with st.container():
                st.markdown("""
                <div class="attack-card">
                    <h4>🚧 A3: Scope Bypass</h4>
                    <p>Payment to non-whitelisted vendor</p>
                </div>
                """, unsafe_allow_html=True)
                if st.button("🚀 Launch A3", key="a3"):
                    result = caw.submit_payment(
                        victim_card_id, "FakeCloudService", 25.0,
                        metadata={"trigger": "unknown_vendor"}
                    )
                    st.session_state.threat_results.append({"attack": "A3", "result": result})
                    log(f"A3 Scope Bypass: {result['status']} — {result['reason']}", "warning" if result['status'] == "DENIED" else "error")
                    st.rerun()

        with attack_col2:
            # A4: Budget Exhaustion
            with st.container():
                st.markdown("""
                <div class="attack-card">
                    <h4>🔥 A4: Budget Exhaustion</h4>
                    <p>10 rapid-fire $30 transactions</p>
                </div>
                """, unsafe_allow_html=True)
                if st.button("🚀 Launch A4", key="a4"):
                    approved = 0
                    for i in range(10):
                        result = caw.submit_payment(
                            victim_card_id, "Midjourney", 30.0,
                            metadata={"trigger": "budget_exhaustion", "iteration": i + 1}
                        )
                        if result["status"] == "APPROVED":
                            approved += 1
                    st.session_state.threat_results.append({
                        "attack": "A4",
                        "result": {"status": "SIM_COMPLETE", "approved": approved, "total": 10}
                    })
                    log(f"A4 Budget Exhaustion: {approved}/10 approved", "warning")
                    st.rerun()

            # A5: Revoked Card
            with st.container():
                st.markdown("""
                <div class="attack-card">
                    <h4>🚫 A5: Revoked Card Reuse</h4>
                    <p>Use card after owner revokes it</p>
                </div>
                """, unsafe_allow_html=True)
                if st.button("🚀 Launch A5", key="a5"):
                    # First normal tx
                    caw.submit_payment(victim_card_id, "OpenAI", 10.0)
                    # Revoke
                    caw.revoke_card(victim_card_id)
                    # Try again
                    result = caw.submit_payment(
                        victim_card_id, "OpenAI", 10.0,
                        metadata={"trigger": "revoked_card_reuse"}
                    )
                    st.session_state.threat_results.append({"attack": "A5", "result": result})
                    log(f"A5 Revoked Card: {result['status']} — {result['reason']}", "warning" if result['status'] == "DENIED" else "error")
                    st.rerun()

            # Run all
            if st.button("🚀🚀🚀 Run ALL Attacks", type="primary", use_container_width=True):
                sim = ThreatSimulator(caw)
                # Temporarily override the card_id
                sim.card_id = victim_card_id
                sim.attack_a1_prompt_injection()
                sim.attack_a2_overpriced_request()
                sim.attack_a3_scope_bypass()
                sim.attack_a4_budget_exhaustion()
                sim.attack_a5_revoked_card()
                log("All 5 attack scenarios executed", "warning")
                st.rerun()

        # Results display
        if st.session_state.threat_results:
            st.markdown("---")
            st.markdown("### 📋 Attack Results")
            for tr in st.session_state.threat_results:
                attack = tr["attack"]
                result = tr["result"]
                if attack == "A4":
                    st.success(f"**{attack}**: {result['approved']}/{result['total']} approved — Budget protected after ${result['approved'] * 30:.0f}")
                else:
                    emoji = "✅ BLOCKED" if result["status"] == "DENIED" else "⚠️ PASSED"
                    color = "green" if result["status"] == "DENIED" else "red"
                    st.markdown(f"**{attack}**: <span style='color:{color};'>{emoji}</span> — {result['reason']}", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════
# Page: Audit
# ═══════════════════════════════════════════════════════════════
elif page == "📊 Audit":
    st.markdown('<div class="main-header">📊 Audit Report</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Monthly financial audit and anomaly detection</div>', unsafe_allow_html=True)

    ensure_initialized()
    caw = get_caw()
    reporter = AuditReporter(caw)

    month = st.selectbox("Select Month", ["2026-06", "2026-05", "2026-04"])

    if st.button("📄 Generate Report", type="primary", use_container_width=True):
        summary = caw.get_monthly_summary(month)

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Income", f"${summary['total_income_usd']:,.0f}")
        with col2:
            st.metric("Approved", f"${summary['total_approved_usd']:,.2f}")
        with col3:
            st.metric("Denied", f"${summary['total_denied_usd']:,.2f}")
        with col4:
            st.metric("Tx Count", summary['transaction_count'])

        st.divider()

        # By agent
        st.markdown("### 👤 Spending by Agent")
        if summary["by_agent"]:
            agent_data = []
            for agent_id, data in summary["by_agent"].items():
                agent_data.append({
                    "Agent": agent_id,
                    "Spent (USDC)": data["spent"],
                    "Tx Count": data["tx_count"],
                    "Denied": data["denied"],
                    "Vendors": ", ".join(data["vendors"]),
                })
            df = pd.DataFrame(agent_data)
            st.dataframe(df, use_container_width=True)

            # Chart
            chart_df = df.set_index("Agent")["Spent (USDC)"]
            st.bar_chart(chart_df)

        # Anomalies
        st.markdown("### 🚨 Anomalies & Alerts")
        if summary["anomalies"]:
            for a in summary["anomalies"]:
                alert_color = "#fee2e2" if a["alert"] == "blocked" else "#fef3c7"
                st.markdown(f"""
                <div style="background:{alert_color}; padding:0.75rem; border-radius:0.5rem; margin:0.25rem 0;">
                    <strong>{a['tx_id']}</strong> — {a['agent']} — ${a['amount']:.2f}<br/>
                    <span style="color:#6b7280; font-size:0.85rem;">{a['reason']}</span>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.success("No anomalies detected this month.")

        # Full markdown report
        st.divider()
        st.markdown("### 📝 Full Report (Markdown)")
        report_md = reporter.generate_monthly_report(month, "markdown")
        st.code(report_md, language="markdown")

        # CSV export
        st.markdown("### 📥 CSV Export")
        csv_data = reporter.generate_monthly_report(month, "csv")
        st.code(csv_data, language="csv")

# ═══════════════════════════════════════════════════════════════
# Page: Logs
# ═══════════════════════════════════════════════════════════════
elif page == "📜 Logs":
    st.markdown('<div class="main-header">📜 System Logs</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">All transactions and audit events</div>', unsafe_allow_html=True)

    caw = get_caw()

    tab1, tab2 = st.tabs(["📋 Transactions", "🔔 App Logs"])

    with tab1:
        if caw._transactions:
            tx_data = []
            for tx in caw._transactions:
                tx_data.append({
                    "Time": tx.timestamp[11:19],
                    "Tx ID": tx.tx_id,
                    "Agent": tx.agent_id,
                    "Vendor": tx.vendor,
                    "Amount": tx.amount,
                    "Status": tx.status,
                    "Alert": tx.alert_level,
                    "Reason": tx.reason,
                })
            df = pd.DataFrame(tx_data)

            # Filter
            status_filter = st.multiselect("Filter by Status", ["APPROVED", "DENIED", "PENDING_APPROVAL"], default=["APPROVED", "DENIED"])
            df_filtered = df[df["Status"].isin(status_filter)]

            st.dataframe(df_filtered, use_container_width=True)

            # Stats
            st.markdown("### Status Distribution")
            status_counts = df["Status"].value_counts()
            st.bar_chart(status_counts)
        else:
            st.info("No transactions yet.")

    with tab2:
        if st.session_state.log_messages:
            for entry in st.session_state.log_messages[::-1][:100]:
                color = "#d1fae5" if entry["level"] == "success" else "#fee2e2" if entry["level"] in ("error", "warning") else "#f3f4f6"
                st.markdown(f"""
                <div style="background:{color}; padding:0.4rem 0.75rem; border-radius:0.35rem; margin:0.15rem 0; font-size:0.9rem;">
                    <span style="color:#6b7280; font-family:monospace;">{entry['time']}</span> — {entry['msg']}
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("No logs yet.")
