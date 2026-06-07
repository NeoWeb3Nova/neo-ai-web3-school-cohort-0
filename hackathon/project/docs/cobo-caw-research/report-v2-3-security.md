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
