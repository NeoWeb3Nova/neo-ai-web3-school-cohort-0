# Cobo Agentic Wallet (CAW) 深度调研报告 V2

> 基于官方手册深度解读 + 本地开发文档 + skill 参考文件
> 日期：2026-06-06 | 目的：直接支撑生产部署

---

## 执行摘要（核心结论）

- **CAW 是 MPC 非托管钱包**，不是 TEE 方案。私钥被切片为多个 key share，任何单方都不持有完整私钥。签名需要多方协同，是数学保证而非软件/硬件承诺。
- **配对前：1 个 key group（Agent + Cobo）；配对后：2 个独立 key group（Agent Group + Mobile Group）**，手机端 key share 永不离开设备。
- **Pact 是任务级授权协议**，不是静态策略。每个任务动态生成、动态终止，包含 intent + execution_plan + policies + completion_conditions。
- **Policy Engine 三阶段评估**：Permission check → Policy rule evaluation → Counter check，任何阶段失败都立即拒绝，不存在绕过可能。
- **端到端审计**：每个决策（allow/deny/pending）都写入 append-only audit log，支持 SSE 实时事件流。
- **Cobo Gasless 即将上线**：将自动覆盖 gas 费，Agent 无需持有 gas token。

---

## 1. 技术架构深度解读

### 1.1 MPC Key Group 架构

官方文档明确定义了 key group 的分阶段构建：

**配对前（Agent Group 单一组）：**

| Group | 门陗方案 | Party | Share |
|---|---|---|---|
| Agent Group | 2-of-2 | Agent machine | Share 1 |
| | | Cobo | Share 2 |

**配对后（双独立组）：**

| Group | 门陗方案 | Party | Share |
|---|---|---|---|
| Agent Group | 2-of-2 | Agent machine | Share 1 |
| | | Cobo | Share 2 |
| Mobile Group | 2-of-2 | Your phone | Share 1 |
| | | Cobo | Share 2 |

关键特性：
- 两个 group 独立运作，Agent Group 签 Agent 发起的交易，Mobile Group 签用户在 App 直接发起的交易
- 手机端 key share 永不离开设备，Cobo 也无法访问
- 即使 Cobo 被攻破，没有 Agent machine 或用户手机的 share 配合也无法签名

### 1.2 TSS 签名仪式

当交易通过 policy engine 后，触发 TSS 签名仪式：

1. **Signing request distributed** → 交易数据发送到每个参与方的 MPC node
2. **Partial signatures computed** → 每个 node 用自己的 key share 计算 partial signature，不暴露 share 本身
3. **Partial signatures combined** → 通过 TSS 协议组合成有效的链上签名
4. **Signature broadcast** → 广播到区块链网络

私钥在任何时候都不会被重构，只在逻辑上存在。

### 1.3 服务模块架构

Cobo Agentic Wallet Service 包含 6 个核心模块：

| 模块 | 职责 |
|---|---|
| **Identity** | Principal CRUD、API key 发行与验证、scope enforcement |
| **Wallets** | 钱包 + 地址生命周期管理；执行链上交易 |
| **Transactions** | 转账/合约调用提交；费用估算；WaaS webhook 处理 |
| **Delegations** | Owner → Operator 的范围授权，含 expiry 和 freeze/unfreeze |
| **Pact** | Pact 生命周期管理；审批后自动创建 delegation 和 API key |
| **Policy Engine** | 三阶段门户：permission → policy → counter |
| **Audit Pipeline** | 记录每个 allow/deny/approval 决策；通过 webhook outbox 交付事件 |

### 1.4 认证与权限范围

所有业务操作通过 `X-API-Key` Header 认证。两种 API key：

- **Principal API Key**：Agent/Owner 的主密钥，用于通用操作
- **Pact-scoped API Key**：Pact 批准后生成，仅能在该 Pact 的 policy 范围内执行，Pact 终止后立即失效（无 grace period）

---

## 2. Pact 协议深度解读

### 2.1 Pact 五阶段生命周期

```
用户意图
    ↓
Agent 草拟 PactSpec（intent + execution_plan + policies + completion_conditions）
    ↓
提交到 CAW Service → 状态 PENDING_APPROVAL
    ↓
用户 App 收到推送 → 审查四要素 → Approve / Adjust / Reject
    ↓
APPROVED → 生成 Delegation + Pact-scoped API Key → 状态 ACTIVE
    ↓
Agent 在范围内执行交易
    ↓
完成条件满足 / 过期 / 用户撤销 → 状态终止 → API Key 立即失效
```

### 2.2 PactState 状态机

| 状态 | 含义 | 可逆？ |
|---|---|---|
| `PENDING_APPROVAL` | Agent 已提交，等待用户审批 | 是（Agent 可 withdraw） |
| `ACTIVE` | 用户已批准，delegation 和 API key 生效 | — |
| `REJECTED` | 用户拒绝 | 否，可重新提交新 Pact |
| `COMPLETED` | 完成条件达成，自动结束 | 否 |
| `EXPIRED` | `expires_at` 时间到达或 time_elapsed 满足 | 否 |
| `REVOKED` | 用户手动撤销 | 否 |
| `WITHDRAWN` | Agent 在用户审批前撤回 | 否 |

状态转换图：
```
PENDING_APPROVAL
    ├─ approved → ACTIVE
    │                 ├─ completion condition met → COMPLETED
    │                 ├─ expires_at reached → EXPIRED
    │                 └─ owner revokes → REVOKED
    ├─ rejected → REJECTED
    └─ agent withdraws → WITHDRAWN
```

### 2.3 Pact 与 Delegation 的关系

Pact 批准后系统自动创建以下结构：

```
Pact (user-facing 协议)
    ├─ Delegation (范围授权凭证)
    │     └─ scope + wallet + operator + expiry
    ├─ Inline policies (花费规则)
    │     └─ transfer limits / contract allowlists / rolling budgets
    └─ Pact-scoped API Key (运行时凭证)
          └─ bound to delegation，仅返回给 runtime
```

重点：你不需要手动创建 delegation 或 policies，Pact 全自动处理。

### 2.4 Completion Conditions（必须至少一个）

| Type | Threshold 格式 | 说明 | 示例 |
|---|---|---|---|
| `tx_count` | 字符串整数 | N 笔成功交易后完成 | `"1"` 一次性操作 |
| `amount_spent` | 字符串小数 | 累计 token 数量达标后完成 | `"1000"` 1000 USDC |
| `amount_spent_usd` | 字符串小数 | 累计 USD 花费达标后完成 | `"500"` |
| `time_elapsed` | 字符串秒数 | N 秒后完成 | `"2592000"` 30天 |

多个 completion conditions 是 "OR"关系：任何一个满足即终止 Pact。同一 Pact 中不能重复 type。
