# OPC Agent Treasury — 一人企业的 AI 员工财务卡包

Neo 雇了 5 个 AI Agent 7×24 运转，但每到半夜，Content Agent 要买 OpenAI API、Ad Agent 要充 Google Ads、Design Agent 要给外包付款——每一次都要把 Neo 从睡梦中拉醒。

给私钥？Agent 被 Prompt Injection 攻击一次，全盘归零。不给？业务断更，客户流失。Brex/Ramp 需要美国实体和 SSN，Safe 多签需要人类合伙人签字——Neo 什么都没有。

这就是全球数百万 One-Person Company 老板的困境：**AI 员工已经入职，财务授权却还没有跟上。**

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

## 为什么是我们 (Why Us)

我们不是把支付实现包装成 AI 概念——我们深入 Agent 经济的基础设施层，从协议诞生第一天就开始跟踪，并用真实代码验证了全链路。

### 1. 对 Agent 经济的深度理解

- 跟踪 **x402 协议**从诞生到发布（Coinbase 提出的 Agent 原生支付标准），理解 Agent 需要成为互联网的"一等支付公民"
- 识别出核心断层：x402 解决的是"Agent 如何付费给服务方"，但 OPC 老板的真正痛点是"如何给 Agent 发预算而不给私钥"——这正是 CAW Pact 的切入点

### 2. 对 CAW 钱包与 Pact 机制的深度研究

- 完成 **Cobo Agentic Wallet 深度调研报告**（`docs/cobo-caw-research/report.md`），覆盖 MPC-TSS 架构、Agent-Owner 配对模型、Pact 生命周期四层接入架构
- 对比 5 家竞品（Coinbase、Crossmint、Privy、Turnkey、Dynamic），明确 CAW 在"策略强制上链"和"单点撤销"上的唯一性
- 基于真实 SDK（`cobo-agentic-wallet==0.1.40`）封装 `RealCAWClient`，完整跑通 Wallet 创建 → Pact 提交 → 策略绑定 → 链上转账

### 3. 8 种攻击场景的完整威胁模型

构建了行业级的 Agent 支付威胁模型（`docs/03-attack-matrix.md`），覆盖：

| ID | 攻击类型 | 防御机制 |
|---|---|---|
| A1 | 重放攻击（Replay） | nonce 唯一性 + 时间窗口校验 |
| A2 | 中间人攻击（MITM） | 端到端签名 + 地址白名单 |
| A3 | 预算耗尽（Budget Exhaustion） | 每日/单次上限 + 频率限制 |
| A4 | 恶意服务方（Rogue Server） | 资源哈希校验 + 声誉评分 |
| A5 | 权限提升（Privilege Escalation） | 能力列表（Capability List）校验 |
| A6 | 时间窗口绕过（Time Bypass） | 区块时间戳/链上时间戳校验 |
| A7 | 签名伪造（Signature Forgery） | ECDSA + 链上签名验证 |
| A8 | 审计日志篡改（Log Tampering） | 链上不可变日志 + 本地 Merkle 树 |

### 4. 真实 CAW SDK 测试网交互证据

所有交互均为 Production API 真实调用，非 Mock：

- **Wallet**: `ad7f3253-4a3b-48a0-9d09-9bb59d334390`（MPC，ETH + SOL 双地址）
- **ETH 地址**: `0x0abd808e6df088b9b97179a091582618586d0bdc`
- **成功转账 Tx**: `0x1a119f1b1bf5ffdb9f2dc4bea392d5d489807aa97925c1949199f7ea91c9dddd`（0.001 SETH）
- **Pact 实例**: `13328473-3868-4f45-a35e-ae2a8a1e1ea4`（Content Agent spending card，策略：BASE_USDC，$50/tx，$500/month）

完整验证报告：`demo/CAW-REAL-TEST-RESULT.md`

---

## 开发者

- **Neo** (GitHub: NeoWeb3Nova) — 单人参赚
- AI × Web3 School Cohort-0 学员
- 联系：通过 GitHub Issues 或 Cobo Hackathon 官方群

---

> 提案文件: `../../submissions/hackathon-proposal-cobo-opc-treasury.md`  
> Sprint Plan: `../sprint-plan.md`  
> 旧方案存档: `../../submissions/hackathon-proposal-cobo-agentic-payment.md`
