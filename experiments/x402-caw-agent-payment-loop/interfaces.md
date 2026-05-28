# 关键接口说明

## 1. x402 服务端接口

### `POST /generate-content`

受 x402 paywall 保护的 AI 内容生成端点。

#### Request Headers

| Header | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `Content-Type` | string | 是 | `application/json` |
| `Authorization` | string | 否 | `Payment <proof>` — 重试时必填 |
| `X-Idempotency-Key` | string | 否 | 防止重复扣款的唯一标识 |

#### Request Body

```json
{
  "brand": "Alice Coffee",
  "product": "Cold Brew",
  "audience": "Gen Z coffee lovers",
  "platform": "Instagram",
  "delivery_format": "7_posts_json"
}
```

#### Response (402 — 未付款时)

```http
HTTP/1.1 402 Payment Required
X-Payment-Required: {
  "scheme": "exact",
  "price": "$0.50",
  "network": "eip155:84532",
  "token": "USDC",
  "payTo": "0xProvider...",
  "expiresAt": "2026-05-28T12:00:00Z",
  "idempotencyKey": "ig-20260528-001"
}
```

#### Response (200 — 付款成功)

```http
HTTP/1.1 200 OK
Payment-Receipt: {
  "settled": true,
  "amount": "$0.50",
  "txHash": "0xabc123..."
}

{
  "jobId": "job-20260528-001",
  "deliverables": [...],
  "deliverableHash": "sha256:7a3f..."
}
```

## 2. CAW Pact 接口

### `checkPact(paymentRequirement)`

检查支付请求是否在 Pact 授权范围内。

#### Input

```typescript
interface PaymentRequirement {
  scheme: string;      // "exact" | "session"
  price: string;       // "$0.50"
  network: string;     // "eip155:84532"
  token: string;       // "USDC"
  payTo: string;       // 收款地址
  expiresAt: string;   // ISO 8601 时间戳
  idempotencyKey: string;
}
```

#### Output

```typescript
interface PactCheckResult {
  approved: boolean;
  reason: string;
  budgetRemainingBefore: number;
  budgetRemainingAfter: number;
  checksPassed: string[];  // ["budget", "scope", "network", "time", "frequency"]
}
```

### `signPayment(paymentRequirement)`

在 Pact 授权范围内签名支付。

#### 安全机制
- Agent 不持有私钥
- 签名通过 CAW 安全模块完成
- 可配置人工确认或自动签名

#### Output

```typescript
type PaymentProof = string;  // 经签名的 payment payload 或 raw tx
```

### `logAction(action, details)`

写入审计日志。

#### Input

```typescript
interface AuditEntry {
  timestamp: string;
  action: string;      // "PAYMENT_AUTHORIZED" | "PAYMENT_REJECTED" | "SERVICE_COMPLETED"
  details: object;     // 任意 JSON 结构化数据
}
```

## 3. ERC-8004 声誉查询接口

### `getReputation(agentId)`

查询 Agent 的链上声誉分数。

#### Input

```typescript
agentId: string;  // 格式: "eip155:84532:0xRegistryAddress:tokenId"
```

#### Output

```typescript
interface ReputationRecord {
  agentId: string;
  reputationScore: number;   // 0-5
  completedJobs: number;
  disputedJobs: number;
  completionRate: number;    // 0-1
  trustTier: "new" | "verified" | "premium";
  lastUpdated: string;       // ISO 8601
}
```

## 4. Facilitator 结算接口

### `verifyPayment(proof)`

验证链上支付是否有效并已结算。

#### Input

```typescript
interface PaymentProof {
  scheme: string;
  price: string;
  network: string;
  token: string;
  payTo: string;
  idempotencyKey: string;
  signedAt: string;
}
```

#### Output

```typescript
interface VerificationResult {
  valid: boolean;
  settled: boolean;
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  timestamp: string;
}
```

#### 失败情形
- `valid: false` — 签名无效或超时
- `settled: false` — 链上交易未确认（重试）
- `duplicate: true` — idempotency key 已被使用（直接返回之前的响应）

## 5. 审计日志导出接口

### `exportAuditLog(pactId, format)`

导出 Pact 下的完整审计记录。

#### 支持格式
- `json` — 机器可读
- `csv` — Excel 友好
- `pdf` — 人工审计

#### 示例输出

```json
{
  "pactId": "pact-alice-001",
  "entries": [
    {
      "timestamp": "2026-05-28T10:15:28Z",
      "action": "PAYMENT_AUTHORIZED",
      "details": {
        "idempotencyKey": "ig-20260528-001",
        "amount": "$0.50",
        "budgetBefore": 50.0,
        "budgetAfter": 49.5
      }
    },
    {
      "timestamp": "2026-05-28T10:15:30Z",
      "action": "SERVICE_COMPLETED",
      "details": {
        "jobId": "job-20260528-001",
        "txHash": "0xabc123...",
        "deliverableHash": "sha256:7a3f..."
      }
    }
  ]
}
```
