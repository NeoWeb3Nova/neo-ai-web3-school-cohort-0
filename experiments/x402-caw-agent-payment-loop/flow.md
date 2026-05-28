# 完整交互流程

## 流程总览

```┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│  步骤 1  │   商户 Alice 确认预算 & 需求                │
│          │   │   │                                     │
│          │   │   │  “我需要 7 条社媒营销内容，最高 $50"     │
│          │   │   │                                     │
│          │   │   │  • 确认品牌调性                      │
│          │   │   │  • 确认目标受众和平台                  │
│          │   │   │  • 确认交付周期（72h）                 │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 2  │   CAW Wallet 创建 Pact（授权与约束）               │
│          │   │   │                                     │
│          │   │   │  Pact 内容：                          │
│          │   │   │  • 最高支出 $50 USDC               │
│          │   │   │  • 仅允许调用指定合约地址          │
│          │   │   │  • 仅允许在 Base Sepolia          │
│          │   │   │  • 有效期 72h，过期自动失效        │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 3  │   Buyer Agent 发现服务 & 见证                    │
│          │   │   │                                     │
│          │   │   │  • 从服务市场发现 ContentGen Agent   │
│          │   │   │  • 查询 ERC-8004 声誉分数（> 4.2）   │
│          │   │   │  • 确认能力匹配（营销文案生成）    │
│          │   │   │  • 检查历史交付成功率              │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 4  │   Buyer Agent → x402 Server：发起请求            │
│          │   │   │                                     │
│          │   │   │  POST /generate-content            │
│          │   │   │  Content-Type: application/json     │
│          │   │   │  Body: {                             │
│          │   │   │    "brand": "Alice Coffee",          │
│          │   │   │    "product": "Cold Brew",           │
│          │   │   │    "audience": "Gen Z coffee lovers", │
│          │   │   │    "platform": "Instagram"          │
│          │   │   │  }                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 5  │   x402 Server 返回 402 + 支付要求              │
│          │   │   │                                     │
│          │   │   │  HTTP/1.1 402 Payment Required       │
│          │   │   │  X-Payment-Required: {              │
│          │   │   │    "scheme": "exact",               │
│          │   │   │    "price": "$0.50",               │
│          │   │   │    "network": "eip155:84532",       │
│          │   │   │    "token": "USDC",                │
│          │   │   │    "payTo": "0xProvider..."         │
│          │   │   │  }                                   │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 6  │   Buyer Agent 处理 402：预算检查 + 支付           │
│          │   │   │                                     │
│          │   │   │  1. 解析 402 响应，提取支付要求        │
│          │   │   │  2. 查询 CAW Pact：余额足够？           │
│          │   │   │  3. 检查 Pact 范围：该合约/链是否允许 │
│          │   │   │  4. 检查时间窗口：是否过期？         │
│          │   │   │  5. 若通过检查 → 签名支付交易       │
│          │   │   │  6. 生成 Payment Proof                │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 7  │   Buyer Agent 重试：带 Payment Proof             │
│          │   │   │                                     │
│          │   │   │  POST /generate-content            │
│          │   │   │  Authorization: Payment <proof>   │
│          │   │   │  Content-Type: application/json     │
│          │   │   │  Body: { same as step 4 }           │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 8  │   x402 Server 验证支付 + 执行服务          │
│          │   │   │                                     │
│          │   │   │  1. Facilitator 验证支付是否有效   │
│          │   │   │  2. 检查 Idempotency Key 防重复    │
│          │   │   │  3. 调用 AI 推理服务生成内容    │
│          │   │   │  4. 返回结果 + Payment-Receipt    │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 9  │   Buyer Agent 接收结果 & 记录                 │
│          │   │   │                                     │
│          │   │   │  • 保存响应结果（文案 + 配图描述） │
│          │   │   │  • 记录链上结算 hash                  │
│          │   │   │  • 记录 CAW Pact 执行动作日志        │
│          │   │   │  • 交付给 Alice 验收               │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│  步骤 10 │   商户 Alice 验收 & 最终决策                   │
│          │   │   │                                     │
│          │   │   │  • 自动层：Reviewer Agent 过检    │
│          │   │   │  • 人工层：Alice 审查调性、创意   │
│          │   │   │  • 通过 → 交易完成，声誉更新    │
│          │   │   │  • 失败 → reject，退款          │
│          │   │   │  • 争议 → Evaluator 仲裁      │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## HTTP 交互完整流程

### Round 1：未付款请求 → 402 响应

**Request**
```http
POST /generate-content HTTP/1.1
Host: api.contentgen-agent.com
Content-Type: application/json

{
  "brand": "Alice Coffee",
  "product": "Cold Brew",
  "audience": "Gen Z coffee lovers",
  "platform": "Instagram",
  "delivery_format": "7_posts_json"
}
```

**Response**
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: {
  "scheme": "exact",
  "price": "$0.50",
  "network": "eip155:84532",
  "token": "USDC",
  "payTo": "0xProviderWalletAddress",
  "expiresAt": "2026-05-28T12:00:00Z",
  "idempotencyKey": "ig-20260528-alice-coffee-001"
}
Payment-Receipt: null

{
  "error": "Payment Required",
  "message": "This endpoint requires $0.50 USDC on Base Sepolia. Please include a valid payment proof."
}
```

### Round 2：带 Payment Proof 重试 → 200 响应

**Request**
```http
POST /generate-content HTTP/1.1
Host: api.contentgen-agent.com
Content-Type: application/json
Authorization: Payment eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ...
X-Idempotency-Key: ig-20260528-alice-coffee-001

{
  "brand": "Alice Coffee",
  "product": "Cold Brew",
  "audience": "Gen Z coffee lovers",
  "platform": "Instagram",
  "delivery_format": "7_posts_json"
}
```

**Response**
```http
HTTP/1.1 200 OK
Content-Type: application/json
Payment-Receipt: {
  "settled": true,
  "amount": "$0.50",
  "token": "USDC",
  "network": "eip155:84532",
  "txHash": "0xabc123...",
  "facilitator": "https://x402.org/facilitator",
  "timestamp": "2026-05-28T10:15:30Z"
}

{
  "jobId": "job-20260528-001",
  "deliverables": [
    {
      "id": 1,
      "title": "Cold Brew Morning Vibes",
      "caption": "Start your day with a chill...",
      "hashtags": ["#ColdBrew", "#AliceCoffee", "#MorningVibes"],
      "image_prompt": "Iced coffee in a glass with condensation..."
    },
    ...
  ],
  "deliverableHash": "sha256:7a3f...",
  "generatedAt": "2026-05-28T10:15:28Z",
  "modelVersion": "gpt-4o-2026-05"
}
```

## CAW Pact 执行检查流程

```
Buyer's CAW Wallet
     │
     ↓  收到支付请求
     │
  ┌───────────────────────┐
  │  Pact 检查层              │
  │                           │
  │  1. 预算检查              │
  │     │ 余额 $50 ≥ $0.50?   │
  │     └───→ 否 → REJECT   │
  │                           │
  │  2. 范围检查              │
  │     │ 目标合约在白名单?   │
  │     └───→ 否 → REJECT   │
  │                           │
  │  3. 网络检查              │
  │     │ eip155:84532?      │
  │     └───→ 否 → REJECT   │
  │                           │
  │  4. 时间检查              │
  │     │ 在 72h 窗口内?      │
  │     └───→ 否 → REJECT   │
  │                           │
  │  5. 频率检查              │
  │     │ 已消耗 $0.50→剩余  │
  │     │ $49.50              │
  │     └───→ 是 → APPROVE  │
  └───────────────────────┘
     │
     ↓  APPROVE
     │
  ┌───────────────────────┐
  │  执行层                │
  │  • 签名支付交易          │
  │  • 更新 Pact 余额记录   │
  │  • 写入执行日志         │
  │  • 返回 Payment Proof   │
  └───────────────────────┘
```

## 审计层记录

每次交易完成后，以下记录同步生成：

```json
{
  "auditId": "audit-20260528-001",
  "timestamp": "2026-05-28T10:15:30Z",
  "pactId": "pact-alice-001",
  "buyerAgentId": "agent-buyer-alice-001",
  "providerAgentId": "agent-contentgen-042",
  "transaction": {
    "type": "x402_payment",
    "network": "eip155:84532",
    "txHash": "0xabc123...",
    "amount": "0.50",
    "token": "USDC",
    "payTo": "0xProviderWalletAddress",
    "gasUsed": 45231,
    "gasPrice": "0.001 gwei"
  },
  "pactCheck": {
    "budgetRemainingBefore": "50.00",
    "budgetRemainingAfter": "49.50",
    "operationAllowed": true,
    "networkAllowed": true,
    "timeWindowValid": true,
    "checks": ["budget", "scope", "network", "time", "frequency"]
  },
  "service": {
    "endpoint": "POST /generate-content",
    "price": "$0.50",
    "delivered": true,
    "deliverableHash": "sha256:7a3f...",
    "receiptId": "rec-20260528-001"
  },
  "riskFlags": []
}
```
