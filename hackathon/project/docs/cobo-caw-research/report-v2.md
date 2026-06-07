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
## 3. Policy Engine 深度解读

### 3.1 三阶段评估流水线

每个操作请求（transfer / contract_call / message_sign）必须通过以下三阶段，任何阶段失败立即停止评估：

**Stage 1 — Permission Check**
- 检查操作类型是否在 Pact 范围内
- 例：转账请求在仅覆盖 contract_call 的 Pact 下会在此阶段被拒绝

**Stage 2 — Policy Rule Evaluation**
- 评估适用的 policy rules
- Policies 按 scope 优先级执行：global → wallet → delegation（active pact）
- 单个 policy 内部的评估顺序：when 匹配 → deny_if → review_if / always_review

**Stage 3 — Counter Check**
- 检查滚动窗口计数器（rolling window counters）
- 支持窗口：1h / 24h / 7d / 30d
- 每个窗口可限制：累计 USD 价值、累计 token 数量、交易次数

### 3.2 单个 Policy 内部评估顺序

```
1. Match when conditions → 不匹配则跳过该 policy
2. Check deny_if → 触发则立即 DENY
3. Check review_if / always_review → 触发则暂停等待用户审批
4. 否则 ALLOW
```

### 3.3 多 Policy 综合决策

| 情况 | 结果 |
|---|---|
| 任意 policy 触发 deny | **DENY** |
| 无 deny，但任意 policy 触发 review | **REQUIRE_APPROVAL** |
| 既无 deny 也无 review | **ALLOW** |

### 3.4 Default-Deny 语义

Pact-level policies 采用 **fail-closed**（故障关闭）语义：
- 如果操作不匹配任何 policy 的 when 条件，自动 DENY
- Agent 需要的每个操作必须被明确覆盖
- 不存在 "隐式通过"

### 3.5 Policy 结构模板

```json
{
  "name": "<human-readable-name>",
  "type": "transfer | contract_call | message_sign",
  "rules": {
    "effect": "allow",
    "when": { ... },
    "deny_if": { ... },
    "review_if": { ... },
    "always_review": true | false
  }
}
```

约束条件：
- `deny_if` 优先级高于 `review_if` / `always_review`
- `deny` effect 的 policy 不能有 `review_if` 或 `always_review`
- `allow + review_if` 需要非空的 `when`
- `allow` 需要非空的 `when` 或 `always_review: true`

---

## 4. 三种 Policy 类型详解

### 4.1 Transfer Policy

**when — allowlist conditions（全部为 AND 关系）**

| 字段 | 类型 | 说明 |
|---|---|---|
| `chain_in` | string[] | 限制链，如 `["BASE_ETH", "ETH"]` |
| `token_in` | ChainTokenRef[] | 限制代币，如 `[{"chain_id": "BASE_ETH", "token_id": "BASE_USDC"}]` |
| `destination_address_in` | ChainAddressRef[] | 限制目标地址，如 `[{"chain_id": "BASE_ETH", "address": "0x..."}]` |

**deny_if — 硬性限制**

| 字段 | 类型 | 说明 |
|---|---|---|
| `amount_gt` | 字符串 | 单次转账 token 数量上限 |
| `amount_usd_gt` | 字符串 | 单次转账 USD 价值上限 |
| `usage_limits.rolling_1h/24h/7d/30d` | object | 滚动窗口限制，含 `amount_gt` / `amount_usd_gt` / `tx_count_gt` |

**review_if — 审批阈值**
- 支持与 when 相同的字段 + `amount_gt` / `amount_usd_gt`
- 触发后操作进入 pending 状态，用户收到 App 推送

**示例：USDC Base 转账 + 阈值**
```json
{
  "name": "usdc-on-base",
  "type": "transfer",
  "rules": {
    "effect": "allow",
    "when": {
      "chain_in": ["BASE_ETH"],
      "token_in": [{"chain_id": "BASE_ETH", "token_id": "BASE_USDC"}],
      "destination_address_in": [{"chain_id": "BASE_ETH", "address": "0xfd65955567d69f97d6a0c5985a819a9a220c55f9"}]
    },
    "deny_if": {
      "amount_usd_gt": "101",
      "usage_limits": { "rolling_24h": { "tx_count_gt": 5, "amount_usd_gt": "500" } }
    },
    "review_if": {
      "amount_usd_gt": "50"
    }
  }
}
```

### 4.2 Contract Call Policy

**EVM when 条件**

| 字段 | 类型 | 说明 |
|---|---|---|
| `chain_in` | string[] | 限制链 |
| `target_in` | ContractTargetRef[] | 合约白名单，含 `chain_id` + `contract_addr` + 可选 `function_id` |
| `params_match` | ParamMatchRule[] | 解码后的 calldata 参数匹配（需要 function_abis） |

**function_abis 格式**
```json
"function_abis": [
  {
    "type": "function",
    "selector": "0x38ed1739",
    "inputs": [
      {"name": "amountIn", "type": "uint256"},
      {"name": "recipient", "type": "address"}
    ]
  }
]
```

**params_match 规则**
- `param_name`: ABI 中定义的参数名
- `op`: `eq`, `neq`, `in`, `not_in`, `gt`, `gte`, `lt`, `lte`
- `value`: 比较值
- 多个 rules 为 AND 关系
- 仅支持 EVM

**Solana when 条件**

| 字段 | 类型 | 说明 |
|---|---|---|
| `chain_in` | string[] | 限制链 |
| `program_in` | ProgramRef[] | 允许涉及的 program |
| `program_all_in` | ProgramRef[] | 必须同时涉及的所有 programs |

**示例：Uniswap V3 兑换 + 滚动限制**
```json
{
  "name": "uniswap-swap",
  "type": "contract_call",
  "rules": {
    "effect": "allow",
    "when": {
      "chain_in": ["BASE_ETH"],
      "target_in": [
        {"chain_id": "BASE_ETH", "contract_addr": "0x2626664c2603336E57B271c5C0b26F421741e481"}
      ]
    },
    "deny_if": {
      "usage_limits": {"rolling_24h": {"tx_count_gt": 5, "amount_usd_gt": "1000"}}
    }
  }
}
```

### 4.3 Message Sign Policy（EIP-712）

**when 条件**

| 字段 | 类型 | 说明 |
|---|---|---|
| `chain_in` | string[] | 限制链 |
| `primary_type_in` | string[] | 匹配 EIP-712 primaryType，如 `["PermitSingle", "PermitBatch"]` |
| `source_address_in` | ChainAddressRef[] | 限制签名地址 |
| `domain_match` | MatchRule[] | 匹配 EIP-712 domain 字段 |
| `message_match` | MatchRule[] | 匹配 EIP-712 message 字段 |

**Path 语法（domain_match / message_match）**

| 语法 | 含义 | 示例 |
|---|---|---|
| `.` | 嵌套字段 | `details.spender` |
| `[N]` | 数组索引（0开始） | `path[0].tokenIn` |
| `*` | 所有数组元素 | `items.*.token` |
| `.length` | 数组长度 | `transfers.length` |

**Wildcard 匹配规则**
- `eq`/`in`/`gt`/`gte`/`lt`/`lte`: 任意元素满足即匹配
- `neq`/`not_in`: 必须所有元素满足才匹配

**示例：Permit2 限制 spender + token**
```json
{
  "name": "permit2-allowlist",
  "type": "message_sign",
  "rules": {
    "effect": "allow",
    "when": {
      "chain_in": ["SETH"],
      "primary_type_in": ["PermitSingle", "PermitBatch"],
      "domain_match": [
        {"param_name": "name", "op": "eq", "value": "Permit2"},
        {"param_name": "verifyingContract", "op": "eq", "value": "0x000000000022d473030f116ddee9f6b43ac78ba3"}
      ],
      "message_match": [
        {"param_name": "details.spender", "op": "in", "value": ["0xabc...", "0xdef..."]},
        {"param_name": "details.token", "op": "in", "value": ["0x111...", "0x222..."]}
      ]
    },
    "review_if": {
      "message_match": [
        {"param_name": "details.amount", "op": "gt", "value": "1000000000000000000"}
      ]
    },
    "deny_if": {
      "usage_limits": {
        "rolling_1h": {"request_count_gt": 10},
        "rolling_24h": {"request_count_gt": 100}
      }
    }
  }
}
```

---

## 5. 金额单位规范

| 字段 | 单位说明 | 示例 |
|---|---|---|
| `amount_gt` | token 的转账单位，不是最小精度 | `"1.5"` USDC = 1.5 USDC（不是 1500000） |
| `amount_usd_gt` | 美元价值，仅适用于有价格数据的 token | `"500"` = $500 |

重要提醒：
- 对于无价格数据的 token，USD 限额不会被评估，必须使用 token-denominated limit
- BSC 上的 USDC/USDT 使用 18 位小数（其他链通常 6 位）
## 6. 安全机制与紧急控制

### 6.1 Freeze vs Revoke

| 维度 | Freeze（冻结） | Revoke（撤销） |
|---|---|---|
| 目标 | Agent 对钱包的访问 | 单个 Pact |
| 效果 | 暂时悬停访问 | 永久终止 Pact |
| 可逆？ | 是 — unfreeze 恢复 | 否 |
| 作用后 | Agent 在同一 Pact 下恢复 | Agent 必须提交新 Pact |
| 适用场景 | 调查/临时阻止 | 确认威胁、任务取消 |

两者都立即生效，Agent 的下一个 API 调用将被拒绝。

### 6.2 Key Share 备份与恢复

**备份选项**

| 方式 | 机制 | 最适合 |
|---|---|---|
| **Cloud backup** | 加密后存入 Google Drive / iCloud | 便捷性、快速恢复 |
| **Local backup** | 导出加密文件，用户自己保管 | 完全自主控制 |

官方建议：两种方式都完成。

**重要警告**
- 备份时需要设置 **recovery passphrase**，忘记密码或丢失备份文件 = key share 永久不可恢复
- Key share 在设备上加密，离开设备前已加密 — Cobo 永远看不到明文 share
- Agent 机器上的 key share 也必须备份（通过 profile 目录备份）

### 6.3 审计与实时事件

**Audit Log 结构**

```json
{
  "id": "...",
  "created_at": "2026-02-24T10:01:00Z",
  "principal_id": "agent-uuid",
  "principal_type": "agent",
  "wallet_id": "wallet-uuid",
  "action": "transfer.initiate",
  "result": "denied",
  "authz_details": {
    "denial_code": "TRANSFER_LIMIT_EXCEEDED",
    "policy_id": "policy-uuid",
    "limit_value": "100",
    "requested_amount": "500"
  },
  "request": {
    "chain_id": "SETH",
    "token_id": "SETH_USDC",
    "amount": "500",
    "dst_addr": "0x..."
  }
}
```

**Action Types**

| Action | 触发时机 |
|---|---|
| `transfer.initiate` | Agent 提交转账 |
| `contract_call.initiate` | Agent 提交合约调用 |
| `approval.requested` | 进入 pending 状态 |
| `approval.approved` | 用户批准 |
| `approval.rejected` | 用户拒绝 |
| `approval.executed` | 已批准操作执行上链 |
| `approval.expired` | Pending 超时 |
| `delegation.freeze` | 用户冻结 delegation |
| `delegation.unfreeze` | 用户解冻 delegation |

**SSE 实时事件流**

订阅端点：`GET /api/v1/events/stream`，含以下事件类型：

| 事件类型 | 触发时机 | 关键字段 |
|---|---|---|
| `approval.requested` | 进入 pending | `resource_id` (pending_operation_id) |
| `transaction.status_changed` | 交易状态变更 | `resource_id` (cobo_transaction_id), `details.status` |
| `policy.violated` | 被拒绝 | `resource_id` (wallet_id), `details.denial_code` |
| `delegation.created` | 新 delegation | `resource_id` (delegation_id) |
| `delegation.revoked` | 撤销 delegation | `resource_id` (delegation_id) |
| `heartbeat` | 保活（每 30s） | `timestamp` |

SSE 范围：Owner 收到所有自己钱包的事件；Operator 收到有效 delegation 的钱包事件。

### 6.4 提示注入防御

Policy Engine 提供结构性保护：
- 即使攻击者成功注入指令，结果的请求必须通过 spending limits + allowlists + contract controls
- 强化保护：限制外部数据来源，保持花费限额和地址白名单尺量最紧

---

## 7. 生产部署操作手册

### 7.1 环境初始化

```bash
# 1. 安装 caw CLI
curl -fsSL https://raw.githubusercontent.com/CoboGlobal/cobo-agentic-wallet/master/install.sh | bash

# 2. 加入 PATH
export PATH="$HOME/.cobo-agentic-wallet/bin:$PATH"

# 3. 验证安装
caw --version
```

### 7.2 钱包创建与配对

```bash
# 交互式 onboard（含 TSS Node 自动下载）
caw onboard --wait

# 查看钱包状态
caw wallet current

# 显示 API key（记下 api_url + api_key + wallet_uuid）
caw wallet current --show-api-key

# 生成配对码（有效期 30 分钟）
caw wallet pair --code-only

# 查看配对状态
caw wallet pair-status
```

### 7.3 测试网领水

```bash
# 列出地址
caw address list

# 申请 Sepolia 测试代币
caw faucet deposit --token-id SETH --address <your-seth-address>

# 查看余额
caw wallet balance
```

### 7.4 Pact 操作流程

**提交 Pact**
```bash
caw pact submit \
  --intent "Transfer 100 USDC to 0xRecipient on Base" \
  --original-intent "Send 100 USDC to 0xRecipient on Base" \
  --execution-plan "# Summary
Transfer 100 USDC to 0xRecipient on Base.

# Operations
- Transfer 100 USDC to 0xRecipient on BASE_ETH

# Risk Controls
- Per-tx cap: $101
- One-time transfer only" \
  --policies '[
    {
      "name": "usdc-transfer",
      "type": "transfer",
      "rules": {
        "effect": "allow",
        "when": {
          "chain_in": ["BASE_ETH"],
          "token_in": [{"chain_id": "BASE_ETH", "token_id": "BASE_USDC"}],
          "destination_address_in": [{"chain_id": "BASE_ETH", "address": "0xRecipient..."}]
        },
        "deny_if": {
          "amount_usd_gt": "101"
        }
      }
    }
  ]' \
  --completion-conditions '[{"type": "tx_count", "threshold": "1"}]'
```

**等待审批**
```bash
caw pact status --pact-id <PACT_ID>
```

**列出所有 Pact**
```bash
caw pact list
caw pact list --status active
```

**撤销 Pact**
```bash
caw pact revoke --pact-id <PACT_ID>
```

### 7.5 交易执行

**转账**
```bash
caw tx transfer \
  --pact-id "$PACT_ID" \
  --dst-address "0x..." \
  --token-id SETH \
  --amount 1 \
  --chain-id SETH \
  --request-id "pay-20260606-001"
```

**合约调用**
```bash
caw tx call \
  --pact-id "$PACT_ID" \
  --chain-id BASE_ETH \
  --contract "0x2626664c2603336E57B271c5C0b26F421741e481" \
  --calldata "$CALLDATA" \
  --request-id "swap-20260606-001"
```

**查询交易状态**
```bash
caw tx get --request-id "pay-20260606-001"
```

**加速/取消**
```bash
caw tx speedup --tx-id <TRANSACTION_UUID>
caw tx drop --tx-id <TRANSACTION_UUID>
```

### 7.6 Recipe 查询

```bash
# 搜索 recipe
caw recipe search --keywords "uniswap,usdc,eth,base"

# EVM 状态查询
caw util eth-call \
  --chain-id BASE_ETH \
  --to "0x..." \
  --abi erc20 \
  --method balanceOf \
  --args '["0x..."]'

# 编码 calldata
caw util abi encode \
  --method "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))" \
  --args '[["0x...","0x...","500","0x...","500000000000000","994208","0"]]'
```

### 7.7 常用查询命令

```bash
# 列出支持的链
caw meta chains

# 列出链上代币
caw meta tokens --chain-ids BASE_ETH

# 查看钱包余额
caw wallet balance --chain-id BASE_ETH

# 列出地址
caw address list

# 查看 Pact 事件
caw pact events --pact-id <PACT_ID>
```
## 8. SDK 开发指南

### 8.1 Python SDK 快速启动

**安装**
```bash
pip install cobo-agentic-wallet
```

**创建客户端**
```python
from cobo_agentic_wallet import WalletAPIClient

API_URL = "https://api-core.agenticwallet.dev.cobo.com"
AGENT_API_KEY = "caw_..."
WALLET_UUID = "..."

client = WalletAPIClient(base_url=API_URL, api_key=AGENT_API_KEY)
```

**提交 Pact**
```python
result = await client.submit_pact(
    wallet_id=WALLET_UUID,
    intent="Transfer 100 USDC to 0xRecipient on Base",
    spec={
        "policies": [
            {
                "name": "usdc-transfer",
                "type": "transfer",
                "rules": {
                    "effect": "allow",
                    "when": {
                        "chain_in": ["BASE_ETH"],
                        "token_in": [{"chain_id": "BASE_ETH", "token_id": "BASE_USDC"}],
                        "destination_address_in": [{"chain_id": "BASE_ETH", "address": "0xRecipient..."}],
                    },
                    "deny_if": {"amount_usd_gt": "101"},
                },
            }
        ],
        "completion_conditions": [{"type": "tx_count", "threshold": "1"}],
        "execution_plan": (
            "# Summary\n"
            "Transfer 100 USDC to 0xRecipient on Base.\n\n"
            "# Operations\n"
            "- Transfer 100 USDC to 0xRecipient on BASE_ETH\n\n"
            "# Risk Controls\n"
            "- Per-tx cap: $101\n"
            "- One-time transfer only"
        ),
    },
)
pact_id = result["pact_id"]
```

**等待审批**
```python
import asyncio

while True:
    pact = await client.get_pact(pact_id)
    status = pact["status"]
    if status == "active":
        break
    if status in ("rejected", "revoked", "expired"):
        raise RuntimeError(f"Pact {status} — cannot proceed")
    await asyncio.sleep(3)
```

**执行转账**
```python
result = await client.transfer_tokens(
    wallet_uuid=WALLET_UUID,
    chain_id="BASE_ETH",
    dst_addr="0xRecipient...",
    token_id="BASE_USDC",
    amount="100",
    request_id="pay-20260606-001",
)
```

**查询审计日志**
```python
logs = await client.list_audit_logs(
    wallet_id=WALLET_UUID,
    action="transfer.initiate",
    result="denied",
    limit=50,
)
```

**批量转账**
```python
import asyncio

transfers = [
    {"dst_addr": "0xAddr1...", "amount": "10", "request_id": "batch-001"},
    {"dst_addr": "0xAddr2...", "amount": "15", "request_id": "batch-002"},
]

results = await asyncio.gather(
    *[
        client.transfer_tokens(
            wallet_uuid=WALLET_UUID,
            chain_id="SETH",
            dst_addr=item["dst_addr"],
            token_id="SETH_USDC",
            amount=item["amount"],
            request_id=item["request_id"],
        )
        for item in transfers
    ],
    return_exceptions=True,
)
```

### 8.2 TypeScript SDK 快速启动

**安装**
```bash
npm install @cobo/agentic-wallet
```

**创建客户端**
```typescript
import { PactsApi, TransactionsApi, Configuration } from '@cobo/agentic-wallet';

const config = new Configuration({
  apiKey: AGENT_API_KEY,
  basePath: API_URL,
});

const pactsApi = new PactsApi(config);
const txApi = new TransactionsApi(config);
```

**提交 Pact**
```typescript
const pactResp = await pactsApi.submitPact({
  wallet_id: WALLET_UUID,
  intent: 'Transfer 100 USDC to 0xRecipient on Base',
  spec: {
    policies: [
      {
        name: 'usdc-transfer',
        type: 'transfer',
        rules: {
          effect: 'allow',
          when: {
            chain_in: ['BASE_ETH'],
            token_in: [{ chain_id: 'BASE_ETH', token_id: 'BASE_USDC' }],
            destination_address_in: [{ chain_id: 'BASE_ETH', address: '0xRecipient...' }],
          },
          deny_if: { amount_usd_gt: '101' },
        },
      },
    ],
    completion_conditions: [{ type: 'tx_count', threshold: '1' }],
    execution_plan:
      '# Summary\nTransfer 100 USDC to 0xRecipient on Base.\n\n' +
      '# Operations\n- Transfer 100 USDC to 0xRecipient on BASE_ETH\n\n' +
      '# Risk Controls\n- Per-tx cap: $101\n- One-time transfer only',
  },
});
const pactId = pactResp.data.result.pact_id;
```

**等待审批**
```typescript
const poll = async (): Promise<void> => {
  while (true) {
    const pact = (await pactsApi.getPact(pactId)).data.result;
    if (pact.status === 'active') break;
    if (['rejected', 'revoked', 'expired'].includes(pact.status ?? '')) {
      throw new Error(`Pact ${pact.status} — cannot proceed`);
    }
    await new Promise(res => setTimeout(res, 3000));
  }
};
await poll();
```

**批量转账**
```typescript
const transfers = [
  { dst_addr: '0xAddr1...', amount: '10', request_id: 'batch-001' },
  { dst_addr: '0xAddr2...', amount: '15', request_id: 'batch-002' },
];

const results = await Promise.allSettled(
  transfers.map((item) =>
    txApi.transferTokens(walletId, {
      chain_id: 'SETH',
      dst_addr: item.dst_addr,
      token_id: 'SETH_USDC',
      amount: item.amount,
      request_id: item.request_id,
    })
  )
);
```

**加速交易**
```typescript
const result = (await txApi.speedupTransaction(walletId, transactionUuid, {
  fee: {
    fee_type: 'EVM_EIP_1559',
    max_fee_per_gas: '50000000000',
    max_priority_fee_per_gas: '2000000000',
  },
})).data.result;
```

### 8.3 SSE 实时事件监听

```python
import httpx
import json

async def stream_events():
    headers = {
        "X-API-Key": OWNER_API_KEY,
        "Accept": "text/event-stream",
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "GET", f"{API_URL}/api/v1/events/stream", headers=headers
        ) as response:
            current_event_type = None
            async for line in response.aiter_lines():
                if line.startswith("event:"):
                    current_event_type = line[7:].strip()
                elif line.startswith("data:"):
                    data = json.loads(line[5:].strip())
                    await handle_event(current_event_type, data)
                elif line == "":
                    current_event_type = None
```

---

## 9. 产品更新与路线图

### 9.1 已发布功能

**初始发布（2026-04-20）**
- Skills、Recipes、CLI、Python/TypeScript SDK、完整 REST API
- Cobo Agentic Wallet app：配对、Pact 审批、超限交易审批、活动审查

**二次更新（2026-04-30）**
- Toolkit 扩展 14 个工具（contract_call、submit_pact、list_pacts、payment、fee estimation 等）
- Pact 支持链接 recipe（`--recipe-slugs`），支持人类可读名称
- Policies 和 completion conditions 批准后可更新
- Pending operations API（列表/批准/拒绝）
- Wallet restore 流程（新设备重新配对）
- App 支持 speedup/drop transactions

**三次更新（2026-05-14）**
- Recipe search 支持 `wallet_id` 参数，结果包含已关联的 active pacts（避免重复创建）
- Pact detail 返回最近 5 笔交易和剩余配额（TX count、USD budget、time）
- `caw onboard` 移除 `--invitation-code`，`next_action` 明确传递 `--session-id`
- `caw pact list` 增加 `--status` 过滤参数

### 9.2 即将上线

| 功能 | 说明 | 影响 |
|---|---|---|
| **Cobo Gasless** | 自动覆盖 gas 费 | Agent 无需持有 gas token，大幅简化操作 |
| **Custodial Mode** | 高频低延迟场景 | 微支付、DCA 等高频场景的性能优化 |
| **更多 Recipes** | 扩展 DeFi 协议支持 | 更多池子、桥、游戏等领域 |

---

## 10. 生产部署建议

### 10.1 部署架构图

```
┌────────────────────────────────────────────┐
│          AI Agent Runtime (Your Server)          │
│  ┌────────────┐  ┌────────────────┐ │
│  │  Agent Code   │  │  TSS Node (cobo-tss-node) │ │
│  │  (SDK/CLI)    │  │  --caw 模式               │ │
│  └────────────┘  └────────────────┘ │
│            │                          │           │
│            └────────────────────────┘           │
│                      │                                │
│            REST API (X-API-Key)                       │
└────────────────────────────────────────────┘
                      │
┌────────────────────────────────────────────┐
│         Cobo Agentic Wallet Service                  │
│  Identity │ Wallets │ Pact │ Policy Engine │ Audit   │
└────────────────────────────────────────────┘
                      │
            ┌──────────────────────┐
            │  Cobo Agentic Wallet App    │
            │  (iOS / Android)            │
            └──────────────────────┘
```

### 10.2 关键部署决策

| 决策点 | 建议 |
|---|---|
| **TSS Node 部署** | 生产环境必须在私有云/专用服务器运行，确保高可用性和网络稳定性 |
| **是否配对** | 生产环境必须配对；测试环境可先不配对加快迭代 |
| **Skills vs API** | POC 用 Skills；生产用 API+SDK 以便于管理、复现、CI/CD |
| **Pact 设计** | 最小权限原则：每个任务独立 Pact，避免长期授权 |
| **备份策略** | Agent 机器 profile + 手机 key share 双重备份，存放在独立介质 |
| **监控** | 必须实施 SSE 事件监听，尤其关注 `policy.violated` 和 `approval.requested` |
| **审计** | 定期自动化审计日志抽取，保留永久归档 |

### 10.3 危险检查清单

**部署前必须确认**
- [ ] TSS Node 密码 ≥ 16 位，存储在密钥管理系统
- [ ] Agent 机器上的 `~/.cobo-agentic-wallet/profiles/` 已备份
- [ ] 手机 App 完成云备份和/或本地备份
- [ ] recovery passphrase 存储在独立介质（如密码管理器）
- [ ] 生产环境使用 `agenticwallet.cobo.com`，非 dev 环境
- [ ] 所有 API key 存储在环境变量/密钥管理系统，非硬编码
- [ ] SSE 流已建立并有健壮重连机制
- [ ] 有冻结/撤销的紧急操作 Runbook
## 11. 竞品对比（2026 年 Q2 最新实验）

### 11.1 安全模型对比

| 维度 | Cobo CAW | Coinbase CDP | Crossmint AA |
|---|---|---|---|
| **密钥保护** | MPC TSS 分片 | MPC TSS + TEE | 智能合约钱包 |
| **签名方式** | 多方 MPC 协议 | TEE 内签名 | EOA/AA 批量交易 |
| **信任依赖** | 仅依赖数学 | 依赖 Intel SGX | 依赖合约审计 |
| **Agent 签名** | 直接协同签名 | TEE 中签名后上链 | Owner 通过 keeper 签名 |
| **单点失败** | 单方被破不能签名 | TEE 硬件漏洞风险 | keeper 被攻击风险 |
| **用户控制** | 手机 App 审批/撤销 | 仅自然语言提示 | 若用 MPC 则类似 CAW |

### 11.2 功能对比

| 维度 | Cobo CAW | Coinbase CDP | Crossmint AA |
|---|---|---|---|
| **策略精度** | 任务级 Pact 协议 | 钱包级静态策略 | 钱包级静态策略 |
| **审批流程** | App 推送 → Approve/Reject/Adjust | 自然语言确认 | 可能无级别性审批（取决于 keeper） |
| **支付格式** | 仅 crypto 支付 | x402 原生 + gasless | 多链 AA + gasless |
| **多链支持** | 9 条主网（EVM + Solana） | 多链（Base 重点） | 多链（含 Tron） |
| **代币交换** | 需要手动编写合约调用 | Base 生态原生 | 若支持则导于 DEX 合约 |
| **协议级操作** | 完整支持（可编程获取 calldata） | 部分支持 | 取决于 DEX/bridge 接入 |
| **公开程度** | 公开 API 文档，可自主部署 | 公开文档，部分功能需许可 | 公开文档 |
| **开发者友好度** | CLI + SDK + Skills + Recipes + MCP | 只有 API + SDK | SDK + REST API |
| **审计日志** | 每个决策都有结构化日志 | 可能有 | 可能有 |

### 11.3 技术架构对比

| 维度 | Cobo CAW | Coinbase CDP | Crossmint AA |
|---|---|---|---|
| **钱包模型** | MPC 非托管 | MPC + TEE 托管 | AA 智能合约（可能为托管或 non-custodial） |
| **策略引擎** | 基础设施层 Pact | 钱包级静态规则 | 钱包级规则/验证器 |
| **执行模式** | 每个任务单独授权 | 钱包级获得权限 | 钱包级授权 |
| **重用性** | Pact 终止后权限立即失效 | 改变策略后才生效 | 依赖 keeper 执行 |
| **Agent 信任** | 最小化（任务级） | 中等（钱包级） | 中高（钱包级） |

### 11.4 选型建议

**选 Cobo CAW 当**
- 你需要任务级精细控制，每个任务的权限独立管理
- 你需要完整的人工审批流程（App 推送、Approve/Reject/Adjust）
- 你重视 MPC TSS 的数学安全保证
- 你需要支持 EVM + Solana 多链环境
- 你需要充分的审计和合规
- 你需要从 POC 到生产的全栈工具（Skills → CLI → SDK → API）
- 你需要自定义 calldata 编码和任意 EVM/Solana 协议交互

**选 Coinbase CDP 当**
- 你的 Agent 已在 Base 生态内
- 你需要 x402 格式的原生支付
- 你对 TEE 方案有信任
- 你需要 gasless 支付现在就上线

**选 Crossmint AA 当**
- 你主要在 EVM + Solana + Tron 上
- 你已经是 AA 钱包用户
- 你对 keeper 模式有信任
- 你不需要任务级的授权精度

---

## 12. 技术实现细节

### 12.1 Pact-scoped API Key 的生命周期

此设计是 CAW 安全架构的核心之一：

```
PactState 状态变化
    │
    └─→ 自动创建/Revoke Pact-scoped API Key
              │
              └─→ 仅返回给 runtime（不在 Pact detail 中暴露）
                        │
                        └─→ Pact 终止后立即失效（无 grace period）
```

意味着：
- 即使 Pact-scoped key 泄露，它也只能在 Pact active 期间使用
- Pact 终止（完成/过期/撤销）后 key 立即无效
- 不需要手动清理 key，系统自动处理

### 12.2 Execution Plan 格式规范

必须包含以下 4 个标题之一：
- `# Intent`
- `# Summary`
- `# Plan`
- `# Execution Plan`

内容建议结构：
```markdown
# Summary
用一句话描述任务。

# Operations
- 步骤 1
- 步骤 2

# Risk Controls
- 费用限制：每次交易上限 $X
- 频率限制：每天最多 Y 次交易
- 滞留风险：无（执行完成后资金不留在中间帐户）
```

### 12.3 API 错误处理

预期错误状态码：

| 状态码 | 场景 | 建议 |
|---|---|---|
| 400 | 请求格式错误，如无效的 chain_id | 检查参数格式，参考文档 |
| 401 | 认证失败 | 检查 API key 是否有效、是否在正确的 header 中 |
| 403 | 权限不足 | 检查 delegation 是否有效、操作是否在范围内 |
| 404 | 资源不存在 | 检查 wallet_id、pact_id 等 UUID 是否正确 |
| 409 | 冲突，如重复提交或状态不匹配 | 检查当前 Pact 状态，避免重复提交 |
| 429 | 请求过频 | 实施退避策略，增加重试间隔 |
| 500 | 服务器错误 | 检查 Cobo 状态页，重试或联系支持 |

### 12.4 Recipe 资源

Recipe 是 CAW 的预构建 DeFi 组件，包含已编译并验证的合约交互逻辑。Agent 可以：
- 通过 `search_recipes` 查找适用的 recipe
- 通过 `attach_recipes_to_pact` 将 recipe 关联到 Pact，自动设置相关 policy
- 用户在 App 中审批时可以看到关联的 recipe 名称

Recipe 查找时可过滤 `wallet_id`，返回结果会标记已关联到该钱包主动 Pact 的 recipe，避免重复创建。

---

## 13. 常见问题与排错

### 13.1 初始化问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `caw onboard` 卡在 "Waiting for admin..." | 需要管理员确认 | 联系 Cobo 支持完成申请审批 |
| TSS Node 启动失败 | 网络不通 / 端口被占用 | 检查 443 端口通信，确保没有其他 TSS Node 实例在运行 |
| 加密成功后出现错误 | 密码过短或文件权限问题 | 确保密码 ≥ 16 位，检查目录权限 |

### 13.2 Pact 相关问题

| 问题 | 原因 | 解决 |
|---|---|---|
| Pact 提交后用户没收到推送 | App 通知权限未开启 | 检查 App 通知设置 |
| Pact 一直显示 PENDING_APPROVAL | 用户尚未审批 | 让用户检查 App，或者检查是否进入了 `requires_review` 状态 |
| `REJECTED` 后不能重新提交 | REJECTED 状态不可恢复 | 创建新 Pact，不是重试 |
| 策略拒绝（`denied` 而非 `pending`） | 策略触发 deny 条件 | 检查 policy 的 `deny_if` 条件和计数器 |
| API key 突然失效 | Pact 终止了 | Pact-scoped key 在 Pact 终止后立即失效，需要新的 active Pact |

### 13.3 交易相关问题

| 问题 | 原因 | 解决 |
|---|---|---|
| 交易被拒绝 | Policy 拒绝 / gas 不足 / nonce 错误 | 检查 SSE 事件中的 `policy.violated`，检查 gas 和 nonce |
| 交易一直 pending | gas 费用太低 | 使用 `tx speedup` 提高 gas |
| 交易状态不一致 | 链上确认时间差异 | 等待链上确认，使用 `tx get` 查询 |
| 交易被取消 | 用户拒绝 pending 交易 | 检查 `approval.rejected` 事件 |

### 13.4 交互式问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `caw login` 无响应 | TSS Node 未运行或启动超时 | 检查 TSS Node 状态，重启服务 |
| `caw wallet balance` 显示过期地址 | 地址未再次生成 | 调用 `caw address create` 或 `caw address list --chain-id ...` |
| `‘▲‘ 符号问题 | 终端字体不支持箭头 | 使用 Unicode 兼容的终端，或等待 CLI 更新 |

---

## 14. 参考资料

### 官方文档
- Cobo Agentic Wallet 官方手册（完整版）
- Pact policies 完整参考
- Cobo TSS Node 指南

### 代码资源
- GitHub: CoboGlobal/cobo-agentic-wallet
- PyPI: `cobo-agentic-wallet`
- npm: `@cobo/agentic-wallet`

### 常用命令速查表
```
caw onboard                    # 初始化钱包 + TSS Node
caw wallet current             # 显示钱包信息
caw wallet pair --code-only    # 生成配对码
caw address list               # 列出所有地址
caw wallet balance             # 查询余额
caw pact submit ...            # 提交新协议
caw pact status --pact-id ID   # 查看协议状态
caw pact list                  # 列出所有协议
caw pact revoke --pact-id ID   # 撤销协议
caw tx transfer ...            # 发送转账
caw tx call ...                # 执行合约调用
caw tx get --request-id ID     # 查询交易状态
caw tx speedup --tx-id UUID    # 加速交易
caw tx drop --tx-id UUID       # 取消交易
caw recipe search ...          # 搜索预构建组件
caw meta chains                # 列出支持链
caw meta tokens                # 列出代币
caw util eth-call ...          # EVM 状态查询
caw util abi encode ...        # 编码 calldata
caw version                    # 显示版本
caw --help                     # 查看所有命令
```

---

> 报告版本：V2.0 深化版
> 生成时间：2026-06-06
> 基于：Cobo Agentic Wallet 官方手册 + 本地开发文档 + LLM 解读 + 实验测试
