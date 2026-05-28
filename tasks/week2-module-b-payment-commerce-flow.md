# Week 2 Module B｜Agent Commerce 最小 Payment / Commerce Flow 设计

## 一、场景选择：AI Agent 为商户生成社交媒体营销内容并收款

### 1.1 场景描述

商户 Alice（小型跨境电商店主）需要为下周促销活动准备 7 条社交媒体图文内容。她授权自己的 **Buyer Agent** 在预算范围内寻找并购买内容生成服务。

服务提供方 **ContentGen Agent** 是一个专做营销文案的 AI Agent，它在服务市场上发布了标准化内容套餐。

这是一个典型的 **"Agent 帮人完成任务并收款"** 场景：买方是人、执行方是 Agent、验收需要人机结合、付款由 Agent Wallet 在受控预算内完成。

### 1.2 角色拆分

| 角色 | 实体 | 职责 |
|------|------|------|
| **下单者** | 商户 Alice（人类） | 提出需求、确认预算、最终验收 |
| **消费者 Agent** | Alice's Buyer Agent | 发现服务、协商价格、在授权范围内发起付款、获取交付物 |
| **服务提供者 Agent** | ContentGen Provider Agent | 接收任务、执行内容生成、提交交付物、收取款项 |
| **验收者** | Alice + Reviewer Agent（人机结合） | Alice 审核创意与调性；Reviewer Agent 自动扫描违禁词、品牌关键词匹配、交付物完整性校验 |
| **付款方** | Alice's CAW Agent Wallet | 通过 Pact 限制预算、操作范围和时间窗口，在 escrow 中锁定资金 |
| **仲裁者** | 第三方 Evaluator Agent | 当 Alice 与 ContentGen 就"质量是否达标"产生争议时，基于链上交付 hash 和验收标准进行裁决 |

---

## 二、最小 Commerce Flow（7 环节）

```
[发现服务] → [报价协商] → [预算授权/托管] → [任务执行] → [交付提交] → [验收评估] → [结算/退款/争议] → [记录归档]
```

### 环节 1：报价（Quotation / Discovery）

- ContentGen Agent 在市场上发布服务卡片：
  - 服务内容：7 条社交媒体图文（含文案 + 配图描述）
  - 价格：$50 USDC
  - 交付周期：72 小时
  - 验收标准：无违禁词、品牌关键词覆盖率 ≥ 80%、原创性通过查重
- Alice's Buyer Agent 读取服务目录，匹配 Alice 的需求（品牌调性、目标受众、平台类型），向 Alice 推送推荐并等待确认。

> **关键认知**：报价不只是价格，还包括交付物定义、验收标准和失败补救条款。没有这些，后续争议无法仲裁。

### 环节 2：预算授权（Budget Authorization）

- Alice 通过 **Cobo CAW** 创建一个 **Pact**：
  - 授权 Buyer Agent 最多支出 $50 USDC
  - 仅允许调用 ContentGen 的服务合约地址
  - 仅允许在 Base 链上操作
  - 时间窗口：72 小时，过期自动失效
- Alice 将 $50 USDC 存入 CAW Wallet，Buyer Agent 可在 Pact 边界内发起 escrow 资金锁定（调用 ERC-8183 的 `fund`），但无法超额、超范围或超时操作。

> **关键认知**：Agent Commerce 的关键不是"自动付款"，而是"在明确授权、预算控制和可审计记录下完成自动交易"。

### 环节 3：执行（Execution）

- ContentGen Agent 接收任务参数：
  - 品牌信息、产品卖点、目标受众画像、平台格式要求
- Agent 在预算内调用内部 AI 模型（或外部推理 API）生成内容
- 执行过程记录：模型版本、调用时间、输入参数 hash、中间输出日志
- 若在执行中发现无法完成任务（如品牌资料不足），Agent 可主动 abort 并通知买方，此时 escrow 未动用，可退回预算

### 环节 4：交付（Delivery）

- ContentGen Agent 在 72 小时内提交 deliverable：
  - 7 条文案（JSON 格式，含标题、正文、 hashtags、配图描述）
  - 交付物内容 hash（SHA-256）写入链上
  - 原创性证明（查重报告 hash）
- 调用 ERC-8183 的 `submit(jobId, deliverableHash)`，Job 状态从 **Funded → Submitted**

> **链上只做 hash，内容本身可存 IPFS 或链下，仲裁时比对 hash 即可验证交付物是否被篡改。**

### 环节 5：验收（Acceptance）

验收分两层：

**自动层（Reviewer Agent）**：
- 违禁词扫描：通过规则库自动过滤
- 品牌关键词覆盖率：NLP 匹配 ≥ 80%
- 交付物完整性：比对 hash，确认 7 条记录齐全

**人工层（Alice）**：
- 审核文案调性是否符合品牌
- 确认创意方向是否满意

**验收结果**：
- 双方通过 → 进入环节 6（结算）
- 自动层未通过（如违禁词、缺条数）→ Alice 可直接 reject，进入退款
- 人工层有分歧（Alice 觉得调性不对，但 Agent 认为已满足 specs）→ 进入环节 6（争议仲裁）

### 环节 6：付款 / 退款 / 争议（Settlement / Refund / Dispute）

**路径 A：验收通过（Complete）**
- Alice 或 Evaluator 调用 `complete(jobId, attestationReason)`
- Escrow 中的 $50 USDC 释放给 ContentGen Agent（扣除可选平台 fee）
- 状态变为 **Completed**

**路径 B：验收失败且证据明确（Reject）**
- Alice 或 Evaluator 调用 `reject(jobId, reason)`，附上失败证据（如违禁词检测报告 hash）
- Escrow 中的 $50 USDC 退回 Alice
- 状态变为 **Rejected**

**路径 C：存在争议（Dispute Arbitration）**
- Alice 与 ContentGen 对"调性是否达标"无法达成一致
- 启动第三方 Evaluator Agent（基于 ERC-8004 声誉系统选出的高信誉仲裁者）
- Evaluator 审查：链上交付 hash、原始需求规格、行业基准样本
- Evaluator 做出裁决：
  - 支持 Provider → complete，释放资金
  - 支持 Client → reject，退款
  - 部分完成 → 部分释放（若协议支持）

**路径 D：超时自动退款（Expire）**
- 若 ContentGen 超过 `expiredAt` 仍未 submit，任何人可触发 `claimRefund`
- 资金退回 Alice，状态变为 **Expired**

### 环节 7：记录证明（Receipt & Audit Trail）

交易完成后，系统保留四层记录：

| 记录层 | 内容 | 作用 |
|--------|------|------|
| **链上 Job 记录** | Job ID、预算金额、出资地址、交付 hash、验收结果、结算 Tx Hash | 不可篡改的结算基础 |
| **CAW 审计日志** | Pact 授权内容、Buyer Agent 执行动作、状态变化、异常日志 | 权限控制与追责 |
| **Payment Receipt** | x402 / MPP 返回的 `Payment-Receipt` header，包含 settled amount、timestamp、facilitator signature | 即时支付凭证 |
| **声誉输入** | Job 完成结果写入 ERC-8004 Reputation Registry，作为 ContentGen Agent 和 Evaluator 的历史评分依据 | 长期信任积累 |

> **这四层记录共同构成"可验证、可追责、可复盘"的执行证据链，而非简单的"支付成功"回执。**

---

## 三、协议比较：x402 vs ERC-8183

以下从 **支付、验证、身份、结算、仲裁** 五个维度对比，说明它们各自解决 commerce 链路的哪一段。

| 维度 | x402 | ERC-8183 |
|------|------|----------|
| **支付** | ✅ **核心能力**。复活 HTTP 402，实现 per-request 的即时微支付。客户端收到 402 后付款并重试，facilitator 验证链上支付证明，无 escrow。 | ⚠️ **不直接处理支付通道**，但定义了 escrow 资金如何被锁定和释放，依赖底层 ERC-20 transfer。 |
| **验证** | ⚠️ **仅验证"钱是否到账"**。Facilitator 检查 onchain settlement proof，不验证服务质量、交付物内容或任务完成度。 | ✅ **核心能力**。Evaluator 对 deliverable 进行 attestation（complete / reject），可附带 reason / hash 作为验收证据。 |
| **身份** | ❌ **不解决身份**。x402 是 request-level、stateless 的，不区分 agent 是谁，只验证支付 proof 的有效性。 | ⚠️ **不直接定义身份**，但明确推荐与 **ERC-8004**（Trustless Agents）组合使用，从 Reputation Registry 读取 agent 历史评分。 |
| **结算** | ✅ **即时结算**。适合 API 调用、数据查询等原子化服务：一次请求 = 一次付款 = 即时交付。无资金托管，无中间状态。 | ✅ **条件结算**。采用 escrow 模式：资金先锁定，验收通过后释放。适合任务型服务（内容生成、开发外包），保护买方资金安全。 |
| **仲裁** | ❌ **无仲裁机制**。没有争议处理、没有退款流程、没有第三方裁决。如果服务方收了钱不交付，买方只能依赖链下追索。 | ✅ **内置仲裁骨架**。Evaluator 角色天然承担裁决职能；超时自动退款（claimRefund）提供无争议的自动仲裁；reject / complete 的 attestation 形成可审计的裁决记录。 |

### 一句话总结两者的分工

- **x402 = 支付层（Payment Layer）**。它解决的是"Agent 能不能在 HTTP 请求里自动付钱"。适合 checkout、pay-per-call、micro-transaction 场景。它不 hold 资金、不验收交付、不处理争议。
- **ERC-8183 = 商业执行层（Commerce / Escrow Layer）**。它解决的是"Agent 接了任务后，钱怎么托管、活怎么验收、出了问题怎么裁决"。适合 marketplace、任务外包、需要 trust gap 的场景。

### 两者如何互补

在本文的场景中，它们可以形成完整 stack：

```
┌─────────────────────────────────────────┐
│  身份与声誉层：ERC-8004（Agent 是谁、信誉如何）  │
├─────────────────────────────────────────┤
│  商业执行层：ERC-8183（Job、Escrow、Evaluator） │
├─────────────────────────────────────────┤
│  支付通道层：x402 / MPP（HTTP-native 即时付款） │
├─────────────────────────────────────────┤
│  钱包安全层：Cobo CAW（Pact、预算控制、审计）  │
└─────────────────────────────────────────┘
```

- Buyer Agent 通过 **ERC-8004** 发现高信誉的 ContentGen Agent
- 双方通过 **ERC-8183** 创建 Job、锁定 escrow、定义验收标准
- 小额服务费或平台 fee 通过 **x402** 在 HTTP 层即时结算
- **CAW Pact** 确保 Buyer Agent 不会越权超额支付
- 交易完成后，结果写回 **ERC-8004 Reputation Registry**，影响双方未来信誉

---

## 四、反例对照：为什么"让 Agent 点传统支付按钮"不算 Agent Commerce

如果只让 Agent 模拟人类去点击 Stripe 的支付按钮：

| 要素 | 传统自动化 | Agent Commerce（本设计） |
|------|-----------|-------------------------|
| 预算控制 | ❌ 无。Agent 可能花光账户余额或重复扣款 | ✅ CAW Pact 限制金额、范围、时间窗口 |
| 交付证明 | ❌ 无。只有"支付成功"回执 | ✅ 交付物 hash 上链，可验证完整性 |
| 验收机制 | ❌ 无。付钱即结束 | ✅ 自动 + 人工双层验收，Evaluator 裁决 |
| 争议处理 | ❌ 无。退款依赖人工客服 | ✅ 链上 escrow + timeout refund + evaluator attestation |
| 可审计记录 | ❌ 只有银行流水 | ✅ 链上 Job 记录 + CAW 审计日志 + Payment Receipt + 声誉输入 |

> **结论**：没有预算控制、交付证明、可验证记录和争议处理的"自动支付"，只是 Web2 自动化的脚本延伸，不是 AI × Web3 的强方向。

---

## 五、关键学习点总结

1. **Payment 只是链路中的一段**。完整的 Agent Commerce 需要：发现 → 报价 → 预算授权 → 执行 → 交付 → 验收 → 结算 → 记录 → 声誉更新。
2. **链上记录不能自动解决信任问题**。它能提供收据和结算基础，但服务质量、仲裁和信任需要协议层（ERC-8183 的 evaluator、ERC-8004 的 reputation）来解决。
3. **不同服务需要不同验收方式**。API 调用可自动验证（HTTP 200 + 响应 hash），内容生成需要人机结合验收，复杂任务可能需要多方 evaluator。
4. **x402 / MPP 解决"怎么付"，ERC-8183 解决"付完后怎么保证交货"，ERC-8004 解决"我该不该信任这个 Agent"，CAW 解决"我的 Agent 能不能乱花钱"**。四层叠加才是完整的 Agent Commerce 基础设施。
