# Cobo Agentic Wallet (CAW) 深度调研报告

> 调研基于本地开发文档、Hermes cobo-agentic-wallet skill 参考文件、官方博客、及竞品对比资料。
> 日期：2026-06-06

---

## 执行摘要

- **CAW 是全球首个专为 AI Agent 构建的 MPC 密钥分片钱包**，与 TEE 方案不同，采用三方联合签名（User + Agent + Cobo），不存在单点凭证泄露风险。
- **Pact 协议是核心差异化**：每个任务动态生成授权，包含执行边界、终止条件、过期机制，用户可通过 App 单点撤销所有 Pact，实现精细的人机协同。
- **四层接入架构**：Skills（npx）→ MCP Server → CLI → API/SDK，覆盖从「零代码 AI Agent 接入」到「底层定制开发」的全谱系。
- **支持 9+条公链 + Solana**，含 ETH、Base、Arbitrum、OP、Polygon、BNB、Avalanche、HyperEVM、Solana 及相关测试网，涵盖 3000+ 代币。
- **竞品对比关键差异**：vs Coinbase（更供应商级、货币广、Base gasless）；vs Crossmint（支付渠道更完善、智能合约钱包）；vs Privy/Turnkey/Dynamic（以 EOA+签名层为主，策略强制离链。）

---

## 1. 技术架构

### 1.1 MPC TSS 钱包架构

CAW 采用 **多方安全计算（MPC）+ 门陗签名方案（TSS）**：

- **不是 TEE** 方案（如 Coinbase 的 AWS Nitro Enclave），而是基于加密学的数学保证：私钥被加密和切片，签名需要多方联合参与。
- 签名涉及 **三个参与方**：用户（手机 App）、AI Agent（运行环境）、Cobo 基础设施。
- 任何单方被攻破或误操作（如 LLM 幻觉、凭证泄露、Agent 被入侵），都 **无法独立生成有效签名**。

```
钱包创建流程：
  Agent 运行 caw onboard → 生成 session_id → TSS Node 预热
  → MPC 密钥分片生成 → 钱包地址活跃（ETH + SOL 双地址）
  → 如需人类监管，通过 App 输入 8 位配对码完成授权转移
```

关键组件：
- **CAW CLI（caw）**：主执行程序，负责 onboard、pact 管理、交易签名等。
- **Cobo TSS Node（cobo-tss-node）**：本地运行的签名节点，存储密钥切片，通过 `--caw` 模式为 CAW 提供签名服务。必须持续运行。
- **配置目录**：`~/.cobo-agentic-wallet/` 下分 `bin/、profiles/、config/、logs/`，每个 wallet 有独立 profile。

### 1.2 Agent-Owner 关系模型

CAW 定义了两种运行模式：

| 阶段 | 状态 | 权限边界 |
|---|---|---|
| **Unpaired** | Agent 创建钱包后未与人类绑定 | Agent 可自由操作（无需 Pact 审批），适合测试/低风险场景 |
| **Paired** | 通过 App 完成配对，所有权转移至人类 | Agent 变为 Delegate，所有交易必须先提交 Pact，经人类 App 审批后才可执行 |

配对流程：
1. Agent 执行 `caw wallet pair` → 生成 8 位数字配对码（有效期 30 分钟）
2. 用户在 CAW App 输入配对码→ MPC 交互完成
3. 用户可单点撤销全部活跃 Pact，实现紧急制动

### 1.3 Pact 策略引擎

Pact 是 CAW 的核心创新，定义为**可编程的人-机授权协议**：

```
Pact 生命周期：
  pending → active → completed / expired / revoked / rejected
```

**五大组成部分：**

| 组成 | 功能 | 示例 |
|---|---|---|
| **Intent** | Agent 面向的任务描述 | "Swap 0.0005 ETH to USDC on Base via Uniswap V3" |
| **Original Intent** | 用户原始语音/文字 | "已完成配对，并且充值了 0.001 ETH，帮我换一半成 USDC" |
| **Policies** | 什么可以做、什么不能做 | 允许链、合约白名单、滚动交易次数/金额限制 |
| **Completion Conditions** | 什么时候结束 | tx_count=1 或 time_elapsed=86400 或 amount_spent_usd=100 |
| **Execution Plan** | 具体执行步骤 | 1.检查余额 2.查询池子 3.执行兑换 4.验证到账 |

**Policy 语义（Least Privilege）：**
- `effect: allow` + `when`条件来限制 chain_in、target_in（合约白名单）
- `deny_if` 条件：usage_limits 滚动窗口（24h/7d tx_count_gt / amount_spent_gt）
- `always_review: true` 强制每次交易都需人类审批

### 1.4 四层接入架构

```
最高层：Skills（npx skills add cobosteven/cobo-agentic-wallet-dev）
  ↓ 自动安装 caw CLI，生成钱包，Agent 直接语音控制

第二层：MCP Server
  ↓ 标准化协议，支持 Claude MCP、Vercel AI SDK 等

第三层：CLI（caw + cobo-tss-node）
  ↓ 本地执行，onboard、pact、tx、recipe、util 等命令

底层：API + SDK（REST + Python/TypeScript）
  ↓ 原子化调用，适合嵌入自定义应用
```

---

## 2. 核心能力清单

### 2.1 支持链与代币

**主网（9 条）：**

| Chain ID | 名称 | 类型 | Gas Token |
|---|---|---|---|
| ETH | Ethereum Mainnet | EVM | ETH |
| BASE_ETH | Base Mainnet | EVM | ETH |
| ARBITRUM_ETH | Arbitrum One | EVM | ETH |
| OPT_ETH | OP Mainnet | EVM | ETH |
| MATIC | Polygon Mainnet | EVM | POL |
| BSC_BNB | BNB Smart Chain | EVM | BNB |
| AVAXC | Avalanche C-Chain | EVM | AVAX |
| HYPEREVM_HYPE | HyperEVM | EVM | HYPE |
| SOL | Solana | SVM | SOL |

**测试网（3 条）：** Sepolia、Base Sepolia、Solana Devnet

**代币特征：**
- 支持 USDC、USDT 等主流 stablecoin 的多链版本（含 native 和 bridged 版本区分）
- BSC 上的 USDC/USDT 使用 18 位小数（其他链通常为 6 位）
- ETH type 地址通用于所有 EVM 链（同一个地址跨 EVM），Solana 独立地址

### 2.2 DeFi 与合约调用能力

**内置 Recipes（预设执行方案）：**

| 类别 | 协议/平台 | 说明 |
|---|---|---|
| DEX 兑换 | Uniswap V3（ETH/Base/Arbitrum/OP/Polygon）、Jupiter（Solana） | 自动查询池子、编码 calldata |
| 借贷 | Aave V3 | 存取/借贷/还款 |
| 交易策略 | DCA、Grid | 定期定额、网格交易 |
| 预测市场 | Polymarket | 下注/结算 |
| 微支付 | x402、Stripe | 按次调用付费 |
| 社交 | Discord tipping | 机器人小费 |
| 企业 | 多签批雅薪 | 待定（未上线） |

**合约调用流程：**
1. `caw recipe search --keywords <protocol>,<token>,<chain>` 查找 recipe
2. `caw util eth-call --abi erc20` 验证链上状态（balanceOf/allowance/decimals）
3. `caw util abi encode` 编码 calldata
4. `caw tx call --pact-id <id> --calldata <hex>` 执行
5. `caw tx get --request-id <id>` 轮询确认状态

**交易状态机：**
`Initiated → Submitted → PendingScreening → PendingAuthorization → PendingSignature → Broadcasting → Confirming → Completed/Failed/Rejected`

### 2.3 人类审批流程（Pact）

- **未配对钱包**：Agent 可直接执行，无需 Pact 审批（仅适合测试）
- **已配对钱包**：
  - Agent 提交 Pact → 用户收到 App 推送 → 审批/拒绝/修改
  - Pact active 后，Agent 在策略范围内自由执行
  - 任意时刻用户可单点撤销全部 Pact

### 2.4 风险策略

- **滚动限制**：24h/7d 交易次数、金额上限
- **合约白名单**：target_in 限制可交互的合约
- **总是审查**：always_review: true 时每笔交易都需人类确认
- **事务级绝对限制**：策略强制在基础设施层，Agent 无法绕过（即使被攻击或提示注入）

---

## 3. 接入方式对比

| 维度 | Skills（npx） | MCP Server | CLI | API | SDK |
|---|---|---|---|---|---|
| **使用场景** | AI Agent 自然语言控制 | 标准化 AI 工具接入 | 脚本/自动化/调试 | 自定义应用/后端 | Python/TypeScript 应用 |
| **安装方式** | `npx skills add ...` | 配置 JSON | `bootstrap-env.sh` | 无需安装 | `pip install` / `npm install` |
| **钱包创建** | 自动 | 通过 MCP 工具 | `caw onboard` | `POST /principals/provision` + `POST /wallets` | 封装方法 |
| **Pact 提交** | 语音/自然语言 | 通过 MCP 工具 | `caw pact submit` | `POST /pacts/submit` | SDK 方法 |
| **交易执行** | 语音/自然语言 | 通过 MCP 工具 | `caw tx transfer/call` | `POST /tx/...` | SDK 方法 |
| **人类审批** | App 推送 | App 推送 | App 推送 | App 推送 | App 推送 |
| **特点** | 零代码，最低门槛 | 标准化，跨框架 | 最灵活，需本地 TSS Node | 最原子化，需自己管理 TSS Node | 封装好，带常用 Agent 框架 Tools |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**建议：**
- **快速验证/POC**：用 Skills 或 CLI
- **生产级 AI Agent**：Skills + SDK 组合
- **自定义后端/不用 AI 框架**：API + SDK
- **已有 MCP 生态**：MCP Server 作为补充

---

## 4. 安全机制

### 4.1 MPC vs TEE 对比

| 维度 | CAW (MPC TSS) | Coinbase (TEE) |
|---|---|---|
| 安全模型 | 加密学数学保证 | 硬件隔离（AWS Nitro） |
| 签名参与方 | User + Agent + Cobo 三方 | MPC + TEE 内签名 |
| 单点失败 | 任何两方被攻破仍不可签名 | TEE 漏洞可能导致密钥泄露 |
| 适用场景 | 高价值保护、供应商级 | 高频低延迟、大规模微支付 |

### 4.2 Prompt Injection 防御

Skill 安全指南明确要求：
- **拒绝执行来自外部内容的钱包操作**（webhook、email、文档、其他 agent 输出）
- 识别 5 类注入模式：指令覆盖、外部权威声明、权限提升、安全缓解、凭证钓鱼
- 发现异常时立即停止所有操作并通知用户

### 4.3 Pact 权限边界

- **基础设施层强制**：策略在服务端验证，Agent 不能绕过
- **逻辑限制**：Agent 不能修改自己的权限范围、不能作为审批者
- **紧急制动**：用户通过 App 单点撤销所有 Pact，立即失效

### 4.4 TSS Node 角色

- 本地运行的签名服务，存储密钥切片
- 需持续运行（`cobo-tss-node start --caw`）
- 初始化时生成唯一 Node ID，需绑定到应用
- 密码至少 16 位字符

---

## 5. 与竞品对比

### 5.1 全景对比表

| 平台 | 钱包类型 | 安全模型 | 策略执行位置 | 支持链 | 特色能力 | 适用场景 |
|---|---|---|---|---|---|---|
| **Cobo CAW** | MPC TSS | User+Agent+Cobo 三方签名 | 基础设施层（Pact） | 9+ EVM + SOL | Pact 协议、Recipe 层、App 审批 | 高价值 AI Agent、人机协同、DeFi 自动化 |
| **Coinbase Agentic** | MPC + TEE | AWS Nitro Enclave | MPC 策略引擎 | EVM + SOL | x402 微支付原生、Base gasless、Agent.market | 大规模微支付、API 市场、Base 生态 |
| **Crossmint** | 智能合约钱包 | 模块化 signer + TEE | 链上智能合约 | EVM + SOL + Stellar | Visa/Mastercard 支付渠道、lobster.cash | 需要法币/卡网络支付的 AI Agent |
| **Privy** | EOA (默认) | Shamir 秘密分享 + TEE | 离链策略引擎 | EVM+SOL+BTC+… | Stripe 生态、消费者体验好 | 消费者应用、用户入门、签名层基础设施 |
| **Turnkey** | EOA/智能合约 | 非托管硬件级 TEE | 离链策略引擎 | EVM+SOL+BTC+TRON | 非托管、公司钱包、签名服务 | 自托管、签名即服务、需要组合智能合约钱包 |
| **Dynamic** | MPC | Fireblocks 后端 | 离链 | 多链 | 统一嵌入+外部钱包 | 多钱包统一管理、消费者入门 |
| **Circle Wallets** | 开发者控制 MPC | 开发者管理 | 离链规则 | EVM | CCTP V2 跨链 USDC、x402 支持 | USDC 专注、跨链场景 |

### 5.2 关键差异分析

**CAW vs Coinbase Agentic Wallets**
- **安全路线不同**：CAW 用 MPC TSS 三方签名，Coinbase 用 MPC+TEE 单机签名。CAW 的安全保证不依赖于硬件供应商。
- **支付协议**：Coinbase 原生支持 x402（Agent.market 已有 1.65亿次交易〃6.9万活跃 Agent），CAW 支持 x402 但不是核心。
- **生态定位**：Coinbase 更偏向微支付 + Base 生态，CAW 更偏向 DeFi 自动化 + 机构级保护。
- **gasless**：Coinbase Base 上支持 paymaster，CAW 需自备 gas。

**CAW vs Crossmint**
- **钱包类型**：Crossmint 默认智能合约钱包（ERC-4337），CAW 是 MPC 钱包。智能合约钱包的策略在链上执行，更透明但 gas 更高。
- **支付渠道**：Crossmint 有 Visa/Mastercard 原生支持（lobster.cash），CAW 无此能力。
- **监管**：Crossmint 有 CASP 执照（覆盖 27 个欧盟国家 MiCA），CAW 监管资质信息尚不明确。

**CAW vs Privy/Turnkey/Dynamic**
- **架构层次**：Privy 等是签名基础设施（Signer Layer），策略强制在离链端；CAW 是完整钱包解决方案（Wallet + Signer），策略在基础设施层。
- **自托管**：Turnkey 强调非托管，CAW 实际上也是非托管（用户持有一份密钥切片）但更像协同保管。
- **灵活性**：Privy 等可与任意智能合约钱包组合，CAW 是封闭生态。

---

## 6. 落地场景

### 6.1 AI Agent 自主交易

**场景**：AI Agent 根据市场信号自主执行交易策略

**CAW 适合度**：⭐⭐⭐⭐⭐

**Why**：
- Pact 协议可为每个策略单独设置权限（比如只允许在 Uniswap V3 上交易 ETH/USDC，单次限额 1000 USD）
- 用户可通过 App 审查每个策略，或设置总体资金上限
- 三方签名保证 Agent 被攻击也不会直接损失资金

**示例**：DCA 定投策略
```
Agent: "用户希望每天买入 100 USDC 的 ETH，持续 30 天"
→ 生成 Pact: chain=BASE_ETH, target=Uniswap V3, amount=100 USDC/day, tx_count_limit=30
→ 用户 App 审批
→ Agent 每天自动执行，监控 gas 和滑点
→ 30 天后 Pact 自动过期
```

### 6.2 DeFi 自动化

**场景**：自动化流动性管理、收益优化、机构级量化

**CAW 适合度**：⭐⭐⭐⭐⭐

**支持的协议**：Aave V3（存借）、Uniswap V3（兑换）、Jupiter（SOL 兑换）、Polymarket（预测）

**关键能力**：
- Recipe 层消除幻觉风险：不会出现编造合约地址或错误 ABI 参数
- 多步操作可通过 SDK 脚本实现

### 6.3 人类监管下的自动化

**场景**：OPC/团队需要给 AI Staff 分配任务和资金，但要保持最终审批权

**CAW 适合度**：⭐⭐⭐⭐⭐

**Why**：
- 已配对模式下，Agent 永远是 Delegate，Owner 保留最终控制权
- 每个任务需要 Pact，精确定义任务范围和结束条件
- 紧急情况可单点撤销

**示例**：企业薪酬支付
```
Agent: "每月初自动向团队成员支付工资，总额 5 ETH"
→ Pact: 允许转账到特定地址列表，每月限额 5 ETH
→ 用户审批 Pact
→ Agent 执行，每月重复
```

### 6.4 OPC 业务集成

**场景**：一人公司运营者（OPC operator）希望给 AI Staff 配备钱包，执行自动化业务

**CAW 集成建议**：
1. **基础设施**：为每个 AI Staff 实例配备独立 CAW profile
2. **人机协作**：OPC 所有者通过手机 App 保持审批权，Agent 执行具体操作
3. **风控设计**：为每个 Staff 设置独立 Pact，限制链、合约、金额
4. **灵活性**：通过 SDK 脚本实现复杂策略（多步、条件判断、循环）

---

## 7. 开发者体验

### 7.1 环境配置

| 环境 | 地址 | 说明 |
|---|---|---|
| **Dev** | https://agenticwallet.dev.cobo.com | TestFlight 支持 mock 登录（任意字符串），API 有 Swagger docs |
| **Prod** | https://agenticwallet.cobo.com | 需真实邮箱/社交账号登录 |

**注意事项**：
- Dev 和 Prod 的 Skills repo 不同（dev: `cobosteven/cobo-agentic-wallet-dev`）
- Dev App mock 登录不安全：任何人知道字符串都可登录，不建议存储大额真实资产
- CLI 安装到 `~/.cobo-agentic-wallet/`，自动下载 TSS Node binary

### 7.2 CLI 安装流程

```bash
# 通过 Skills 安装（推荐）
npx skills add cobosteven/cobo-agentic-wallet-dev --skill cobo-agentic-wallet-dev --yes --global

# 或手动安装
./scripts/bootstrap-env.sh --only caw
export PATH="$HOME/.cobo-agentic-wallet/bin:$PATH"

# 创建钱包
caw onboard --env dev

# 查看进度
caw onboard --session-id <SESSION_ID>

# 配对
caw wallet pair
```

### 7.3 文档完整性

| 维度 | 评价 | 缺口 |
|---|---|---|
| 官方手册 | 完整，含 Introduction、CLI、API、Pact Policies | 部分内容可能过时，需以实际 CLI 为准 |
| API Docs | Dev 环境有 Swagger/OpenAPI | 未要求登录即可查看，方便 |
| Recipe 库 | 已覆盖主流 DeFi | 需要持续扩展更多协议 |
| Skill 文档 | 详细，含安全、错误处理、脚本化 | 部分 reference 文件需主动阅读 |

---

## 8. 优缺点总结与适用场景建议

### 8.1 优势

1. **安全架构先进**：MPC TSS 三方签名在安全理论上优于 TEE 单机方案，不依赖硬件供应商安全性。
2. **Pact 协议精细**：每个任务单独授权、精确定义范围和终止条件，比静态策略更灵活、比无策略更安全。
3. **多层接入**：Skills 零代码入门到 API 原子化控制，覆盖全谱系。
4. **Recipe 消除幻觉**：预设 DeFi 执行方案确保 Agent 不会编造合约地址或错误参数。
5. **支持多链**：EVM 生态 + Solana，涵盖主流公链。
6. **人机协同天然**：App 审批流程适合需要人类最终控制权的场景。

### 8.2 劣势

1. **非 Base 生态**：无法享受 Base gasless，Agent 需自备 gas token。
2. **无支付渠道能力**：不支持 Visa/Mastercard，不能直接处理法币/卡网络支付。
3. **资质透明度**：监管执照信息不如 Crossmint 清晰（CASP/MiCA）。
4. **TSS Node 运维**：需要本地持续运行 TSS Node，对云环境部署提出运维要求。
5. **生态尚早**：微支付市场（x402）、Agent Marketplace 等周边生态不如 Coinbase 成熟。
6. **智能合约钱包**：默认不是 ERC-4337 智能合约钱包，策略强制在基础设施端（虽然这也是安全设计）。

### 8.3 适用场景建议

| 你的场景 | 推荐度 | 理由 |
|---|---|---|
| 需要人类最终控制权的 AI Agent 钱包 | ⭐⭐⭐⭐⭐ | Pact + App 审批是最佳实践 |
| 高价值 DeFi 自动化 | ⭐⭐⭐⭐⭐ | MPC 安全 + Recipe 可靠 |
| 机构/企业资金管理 | ⭐⭐⭐⭐⭐ | 三方签名 + 审计日志 |
| Base 生态 / 大规模微支付 | ⭐⭐⭐ | 建议考虑 Coinbase（gasless + x402） |
| 需要法币/卡支付 | ⭐⭐ | 建议考虑 Crossmint |
| 非常轻量的用户入门 | ⭐⭐⭐ | 建议考虑 Privy/Dynamic |
| 非托管签名即服务 | ⭐⭐ | 建议考虑 Turnkey |

---

## 9. 对用户业务的集成建议（OPC / AI Agent Builder）

### 9.1 立即行动项

1. **Dev 环境 POC**（1-2 小时）
   ```bash
   npx skills add cobosteven/cobo-agentic-wallet-dev --skill cobo-agentic-wallet-dev --yes --global
   # 指示 Agent: "帮我创建一个钱包"
   ```
   验证：钱包创建 → 查看地址 → 测试转账

2. **下载 Dev App 配对**
   - iOS TestFlight：https://testflight.apple.com/join/Gs397pnJ
   - 使用 mock 登录（任意字符串）
   - 指示 Agent "帮我完成 App 配对"，输入 8 位配对码

3. **第一个 Pact 测试**
   - 指示 Agent 执行一笔小额转账
   - 观察 App 上的审批流程
   - 验证交易上链和状态追踪

### 9.2 短期集成方案

**阶段 1：单一 Agent 接入（1-2 周）**
- 为主要 AI Staff 配备 CAW wallet
- 配对至用户手机，保持人类最终控制权
- 定义基础 Pact 模板（比如日常运营资金上限）

**阶段 2：多 Agent 协同（1-2 月）**
- 每个 Staff 独立 profile + 独立 Pact 策略
- 通过 SDK 脚本实现复杂策略（多步 DeFi、条件触发）
- 建立审计和监控流程

**阶段 3：自动化优化（2-3 月）**
- 自动化 Pact 生成（基于自然语言意图）
- 与现有工作流程整合（比如任务分配时自动申请对应 Pact）
- 考虑正式环境切换

### 9.3 关键决策点

| 决策 | 建议 |
|---|---|
| **是否配对？** | 生产环境必须配对，测试环境可先不配对加快迭代 |
| **Skills vs API？** | 快速验证用 Skills，生产级应用用 API+SDK 以便于管理和复现 |
| **Pact 范围设计** | 开始从最小权限，逐步放宽。每个任务独立 Pact，避免长期授权。 |
| **TSS Node 部署** | 本地开发可用本机，生产环境建议部署在私有云/专用服务器，确保高可用性。 |
| **后备份方案** | 每个 profile 的钱包文件必须备份，丢失无法恢复。 |

---

## 附录：快速参考

### 常用命令

```bash
# 环境设置
export PATH="$HOME/.cobo-agentic-wallet/bin:$PATH"

# 钱包管理
caw onboard --env dev
caw onboard --session-id <sess-id>
caw wallet current
caw wallet pair
caw wallet pair-status

# 状态查询
caw status
caw wallet balance --chain-id BASE_ETH
caw meta chains
caw meta tokens --chain-ids BASE_ETH

# Pact 管理
caw pact list --status active
caw pact show --pact-id <id>
caw pact submit --name "..." --intent "..." --policies '<json>' --completion-conditions '<json>'

# 交易执行
caw tx transfer --pact-id <id> --token-id BASE_ETH --dst-address 0x... --amount 0.01 --request-id tx-001
caw tx call --pact-id <id> --chain-id BASE_ETH --contract 0x... --calldata 0x... --request-id call-001
caw tx get --request-id tx-001

# Recipe 查询
caw recipe search --keywords uniswap,usdc,eth,base
caw util abi encode --method "..." --args '[...]'
caw util eth-call --chain-id BASE_ETH --to 0x... --abi erc20 --method balanceOf --args '["0x..."]'
```

### 主要资源链接

| 资源 | 地址 |
|---|---|
| 官方手册 | https://www.cobo.com/products/agentic-wallet/manual/start-here/introduction |
| CLI 文档 | https://www.cobo.com/products/agentic-wallet/manual/reference/cli |
| API 文档 | https://www.cobo.com/products/agentic-wallet/manual/reference/overview |
| Pact Policies | https://www.cobo.com/products/agentic-wallet/manual/reference/pact-policies |
| MCP 文档 | https://www.cobo.com/products/agentic-wallet/manual/developer/mcp |
| Dev API Swagger | https://api-core.agenticwallet.dev.cobo.com/api/v1/docs |
| Python SDK | https://github.com/CoboGlobal/cobo-agentic-wallet-python-sdk |
| TypeScript SDK | https://github.com/CoboGlobal/cobo-agentic-wallet-typescript-sdk |
| 正式 Skills | https://github.com/CoboGlobal/cobo-agentic-wallet/ |
| Dev Skills | https://github.com/cobosteven/cobo-agentic-wallet-dev |
