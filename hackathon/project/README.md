# OPC Agent Treasury — 一人企业的 AI 员工财务卡包

> **Hackathon**: AI × Web3 School Cohort-0  
> **Track**: Cobo × Agentic Economy × Cobo Agentic Wallet  
> **Status**: MVP Ready ✅  
> **Demo Video**: [Link TBD]  

---

## 痛点：OPC 老板的午夜惨剧

Neo 是一个 **One-Person Company (OPC)** 老板。他雇了 5-10 个 AI Agent 员工：
- **Content Agent** 每天买 OpenAI API、订 Midjourney、买 Unsplash 图片
- **Ad Agent** 每周充 Google Ads、Twitter Ads
- **Design Agent** 给澳洲/东南亚外包付钱

问题是：**每次 Agent 需要花钱，都要把 Neo 从睡梦中拉醒。**

给私钥？Agent 被 Prompt Injection 攻击 = 全盘归零。  
不给？Agent 停工，业务断更。  
月底对账？200 箔 0.5-50 USDC 的转账，不知道花哪了。

**Brex/Ramp**？需要美国公司实体、SSN、人类员工 — Neo 什么都没有。  
**Safe 多签**？每次小额支付都要签名 — Neo 只有一个人，签不过来。

---

## 方案：基于 CAW 的"虚拟员工卡"

我们基于 **Cobo Agentic Wallet (CAW)** 为每个 Agent 发行一张公司卡：
- 有月度预算，有单笔上限，有供应商白名单
- 有冷却期，有时间窗口，有异常检测
- Agent 能自主花钱，老板能睡安稳觉，月底自动出报表

一句话：**"把企业支付卡的能力，下放给一人企业的 AI Agent"。**

---

## 最小 Demo（3 分钟内完成）

### 正常流：开卡 → 采购 → 审计

```bash
python src/run_demo.py normal
```

1. **开卡**：为 Content Agent 和 Ad Agent 各创建一张 CAW Card
2. **采购**：Agent 自主向 OpenAI、Midjourney、Google Ads 付款
3. **审计**：自动生成 Markdown 月末报表

### 异常流：5 种攻击拦截

```bash
python src/run_demo.py attack
```

- A1: Prompt Injection → 未知地址支付 → **DENIED**
- A2: 恶意抬价 → 单笔超限 → **DENIED**
- A3: 范围绕过 → 非白名单供应商 → **DENIED**
- A4: 快速耗尽 → 10次连续支付 → **DENIED**
- A5: 已吊销卡 → API Key 重复使用 → **DENIED**

### 完整流

```bash
python src/run_demo.py full
```

---

## 技术架构

```
┌──────────────────────────────────────────┐
│  OPC Owner (Neo) — CAW App 中审批/吊销              │
├──────────────────────────────────────────┤
│                CAW Service (Mock / Real SDK)                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Pact / Card    │  │ Policy Engine  │  │ Audit Pipeline │ │
│  │  生命周期管理 │  │ 三阶段评估   │  │ 不可篡改日志 │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
├──────────────────────────────────────────┤
│  Content Agent ──────────────────────────────────────────  │
│  → OpenAI / Midjourney / Unsplash                          │
│  Ad Agent     ————————————————————————————————————————————  │
│  → Google Ads / Twitter Ads                                 │
└──────────────────────────────────────────┘
```

---

## 文件结构

```
project/
├── src/
│   ├── mock_caw_client.py    # 模拟 CAW Service: Pact、Policy Engine、Audit
│   ├── content_agent.py      # Content Agent 运行时
│   ├── audit_reporter.py     # 月末审计报表生成器
│   ├── threat_simulator.py   # 5 种攻击场景演示
│   └── run_demo.py           # 一键 Demo 入口 (normal / attack / full)
├── tests/                  # 单元测试
├── docs/                   # 技术文档、规则对照、Sprint Tracker
├── demo/
│   ├── screenshots/          # 运行截图
│   └── video/                # Demo 视频
└── submission/             # 提交物清单
```

---

## 快速开始

```bash
# 1. 进入项目
cd hackathon/project/src

# 2. 运行 Demo（无需任何外部依赖，纯标准库 Python）
python3 run_demo.py full

# 单独运行各模块
python3 mock_caw_client.py        # CAW 客户端自检
python3 content_agent.py          # Agent 日常流程
python3 audit_reporter.py         # 审计报表
python3 threat_simulator.py       # 异常拦截
```

---

## 为什么是 CAW？

| 能力 | 没有 CAW | 有 CAW |
|---|---|---|
| 给 Agent 发预算 | 给私钥 = 全盘风险 | 给 Pact API Key = 策略切片，泄露可吊销 |
| 预算控制 | 客户端 if-else，可绕过 | 服务端 MPC 签名前强制校验 |
| 供应商白名单 | Agent 被黑后乱转 | CAW 服务端只放行白名单地址 |
| 审计日志 | 客户端日志可删除 | CAW 服务端 append-only，不可篡改 |
| 异常拦截 | 事后发现 | 签名前实时拒绝 |

**去掉 CAW，整个系统崩溃。** Agent 只能持有私钥自行支付，没有权限边界、没有审计、没有应急吊销。

---

## 回答 Cobo 三问

| 问题 | 回答 |
|---|---|
| **为什么一定需要 Agent？** | OPC 只有 1 个人，但有 5-10 个 Agent 7×24 运行。老板不可能每次 Agent 要买 API 时都手动转账。 |
| **为什么一定是 Web3？** | OPC 的收入来自全球客户的 USDC，支出是全球 API 和外包 — 传统银行账户无法覆盖这种无许可、7×24 的微观跨境经济。 |
| **为什么中心化系统做不到？** | Brex/Ramp 需要美国公司实体、SSN/EIN、人类员工 — OPC 什么都没有。CAW 允许"个人身份"运行企业级财务控制，是唯一可行路径。 |

---

## 开发者

- **Neo** (GitHub: NeoWeb3Nova) — 单人参赚
- AI × Web3 School Cohort-0 学员
- 联系：通过 GitHub Issues 或 Cobo Hackathon 官方群

---

> 提案文件: `../../submissions/hackathon-proposal-cobo-opc-treasury.md`  
> Sprint Plan: `../sprint-plan.md`  
> 旧方案存档: `../../submissions/hackathon-proposal-cobo-agentic-payment.md`
