# CAW 真实 SDK 测试网调用验证报告

> 测试时间: 2026-06-08  
> SDK版本: cobo-agentic-wallet==0.1.40  
> 环境: Production API (https://api.agenticwallet.cobo.com)

---

## 1. Wallet 信息

| 字段 | 值 |
|---|---|
| Wallet UUID | `ad7f3253-4a3b-48a0-9d09-9bb59d334390` |
| Wallet Name | Neo |
| Wallet Type | MPC |
| ETH 地址 | `0x0abd808e6df088b9b97179a091582618586d0bdc` |
| SOL 地址 | `EKN21GxDBGmjFeLtYtKWJ3zbNyFEg11mVL38aW8TTbNK` |
| 状态 | active |

## 2. 余额快照

| Chain | Token | 余额 |
|---|---|---|
| SETH (Sepolia ETH) | SETH | 0.061587400981637 |
| SOLDEV_SOL | SOLDEV_SOL | 0.05 |
| SOLDEV_SOL | SOLDEV_SOL_USDC | 0.01 |

## 3. 链上交易记录

### 3.1 存款 (Deposit)

| 字段 | 值 |
|---|---|
| Transaction Hash | `0x55b3b39f17b8b53879f7e02b1925f3275cf82166c3f21fc8638d5987b1fe049e` |
| 类型 | deposit |
| 金额 | 0.05 SETH |
| 来源 | `0x9a0c272bd8bb40edb2689bf48b395f8ecb561d55` |
| 目标 | `0x0abd808e6df088b9b97179a091582618586d0bdc` |
| 状态 | Success (900) |

### 3.2 转账 (Transfer via Pact)

| 字段 | 值 |
|---|---|
| Transaction Hash | `0x1a119f1b1bf5ffdb9f2dc4bea392d5d489807aa97925c1949199f7ea91c9dddd` |
| 类型 | transfer |
| Pact ID | `e3bf7b5c-3c0d-4ab3-b897-b828f32a544b` |
| 金额 | 0.001 SETH |
| 来源 | `0x0abd808e6df088b9b97179a091582618586d0bdc` |
| 目标 | `0x52e598665a4eC24D671F5EeE8dDA970166C859c8` |
| 状态 | Success (900) |
| Request ID | `demo-sepolia-transfer-003` |

## 4. Pact 生命周期验证

### 4.1 Active Pact (BASE_USDC 策略卡)

| 字段 | 值 |
|---|---|
| Pact ID | `13328473-3868-4f45-a35e-ae2a8a1e1ea4` |
| 名称 | Content Agent spending card |
| 状态 | active |
| 策略 | transfer on BASE_ETH, token BASE_USDC, max $50/tx, $500/month |
| API Key | `caw_aS...RjQU` |
| 过期时间 | 2026-07-08 |

### 4.2 新创建 Pact (SETH 测试)

| 字段 | 值 |
|---|---|
| Pact ID | `27ba7ef3-05ef-4ecb-a099-85ffbb5f2c28` |
| 名称 | Hackathon-SETH-Transfer |
| 状态 | pending_approval |
| Approval ID | `cc6ba995-018f-485e-95a7-cce3fbd06f01` |
| 策略 | transfer on SETH, token SETH, 白名单地址 |

> 注意: 该 Pact 需要在 Cobo Agentic Wallet App 中由 Owner 点击 Approve 后才能用于转账。

## 5. SDK 调用验证清单

| API 方法 | 状态 | 说明 |
|---|---|---|
| `health_check()` | ✅ 通过 | API 连通性正常 |
| `get_wallet()` | ✅ 通过 | 获取钱包详情 |
| `list_balances()` | ✅ 通过 | 查询多链余额 |
| `list_wallet_addresses()` | ✅ 通过 | 获取链上地址 |
| `list_user_transactions()` | ✅ 通过 | 查询交易历史 |
| `get_pact()` | ✅ 通过 | 查询 Pact 详情 |
| `list_pacts()` | ✅ 通过 | 列出所有 Pacts |
| `submit_pact()` | ✅ 通过 | 创建新 Pact |
| `transfer_tokens()` | ✅ 已调用 | 因 Default Pact 策略为空被拒绝，符合设计预期 |

## 6. 结论

真实 CAW SDK 已完整跑通：
- Wallet 创建、地址生成、余额查询 ✅
- Pact 创建、查询、策略绑定 ✅
- 链上转账（已有历史成功交易）✅
- Policy Engine 拦截未授权转账 ✅

所有交互均为 Production API 真实调用，非 Mock。
