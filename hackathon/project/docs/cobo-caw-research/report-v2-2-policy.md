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
