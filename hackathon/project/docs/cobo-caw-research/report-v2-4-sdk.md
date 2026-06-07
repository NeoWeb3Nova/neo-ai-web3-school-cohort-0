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
