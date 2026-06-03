# Week 3｜加分挑战｜深度研究包

> 研究对象：围绕主方向「AI Agent 程序化支付约束与商业闭环（PactGuard）」，选取三个互补层级的标准/协议/SDK，做深度阅读摘要。
> 作者：Neo（Nova001 搭档）
> 日期：2026-06-03

---

## 主方向定位

PactGuard 的核心命题：让 AI Agent 自主支付时，用户能声明「可为谁花钱、花多少、什么时候自动停止」，而不是把预算控制权交给黑盒 LLM。

这一命题天然需要三层基础设施协同：
- **支付通道层**：钱怎么付出去（x402）
- **信任发现层**：付给谁、对方是否可信（ERC-8004）
- **执行约束层**：付出去的行为边界由谁强制 enforce（Cobo CAW / Pact）

本研究包即围绕这三层各选一个代表性对象，回答：它解决什么问题、边界在哪、还缺什么。

---

## 研究对象一：x402 协议

**类型**：开放支付标准（Open Payment Standard）  
**维护方**：x402 Foundation（Coinbase / Cloudflare / Visa / Circle / Anthropic 等联合发起）  
**状态**：已发布 V2，多语言 SDK 可用（TypeScript / Python / Go / Java）

### 1. 它解决什么问题

1990 年代 HTTP 预留了 402 "Payment Required" 状态码，期待微支付成为 Web 核心，但信用卡最低手续费（~$0.30）使机器间小额支付 economically infeasible。

2020 年代 L2 区块链将结算成本压至 1 美分以下，AI Agent 涌现，但 Agent 调用 API 仍需：注册账号 → 实名认证 → 绑卡 → 获取 API Key → 每月对账 → 人类审批超额账单。这个流程对 Agent 来说是 friction wall。

x402 解决的问题是：**让 AI Agent 用一行代码、一个钱包地址，就能向任何支持 x402 的端点按请求即时支付，无需 API Key、无需预注册、无需人类逐笔审批。**

具体机制：
- 服务端返回 402 + `PAYMENT-REQUIRED` Header（金额、代币、收款地址、支付方案）
- 客户端创建签名支付授权（gasless USDC `transferFrom`）
- 重试请求携带 `PAYMENT-SIGNATURE` Header
- Facilitator 验证签名、余额、时间窗口后，Resource Server 放行请求并触发链上结算
- 最终返回 200 + `PAYMENT-RESPONSE` Header（含 tx hash）

### 2. 它的边界是什么

**边界一：只管「怎么付」，不管「付完怎么保证交货」**

x402 是支付通道协议。它确保：如果 Client 付了 $0.50，Server 收到了链上确认，那么 Server 必须放行资源。但它不解决：
- Server 收了钱之后交付的是垃圾内容怎么办？
- 双方对「交付质量是否达标」产生争议怎么办？
- 大额交易是否需要 escrow/托管？
- 服务方收了钱后跑路，如何追偿？

这就是为什么 Agent Commerce 不能只有 x402，还需要 ERC-8183 或类似 escrow 层的补充。

**边界二：Facilitator 是信任假设**

支付验证和链上结算由 Facilitator 完成（可以是 Coinbase、Cloudflare、第三方或自建）。协议设计原则 5 说「信任最小化：支付方案不允许 facilitator 或资源服务器转移资金（除非符合客户意图）」，但 Facilitator 仍然是验证签名的 single point of verification。如果 Facilitator 被攻陷或宕机，Client 无法独立完成验证（虽然理论上可以独立向链上验证 receipt）。

**边界三：向后兼容的代价**

x402 刻意把支付数据放在 HTTP Header 而非响应体里，使 402 响应体保持为空（`{}`）。这确实实现了向后兼容——现有错误处理器和监控工具不会崩溃，非 x402 客户端看到的是普通 402。但代价是：支付元数据（价格解释、服务条款、 dispute 入口）无法在 402 响应体中携带，必须另开通道或依赖链外文档。

**边界四：法币与传统金融体系的 gap**

V2 开始集成 ACH/信用卡，但核心优势在于链上原子结算。当需要对接传统银行账户、处理 chargeback、满足 KYC/AML 合规时，x402 的「无需身份、只需钱包」优势反而成为合规阻力。

### 3. 还缺什么

| 缺口 | 影响 | 与 PactGuard 的关系 |
|------|------|---------------------|
| **缺少 escrow/争议仲裁机制** | 先付款后交货场景下买方无保护 | 需要 ERC-8183 或自建 escrow 层补充 |
| **缺少预算约束原语** | Agent 可能在一个 session 内快速耗尽钱包余额 | 需要 CAW Pact / Safe Guard 等外部约束层 |
| **缺少交付物验证标准** | 无法判断「付了钱拿到的内容是否合格」 | 需要 ERC-8004 Validation Registry 或自定义验收层 |
| **缺少声誉/发现层** | Agent 不知道该不该向某个端点付款 | 需要 ERC-8004 Reputation Registry 或 Bazaar 扩展 |
| **链上结算延迟** | 即使 gasless，链上确认仍有秒级延迟，不适合超低延迟 API 调用 | 需要 batch settlement 或 off-chain 预授权 + 事后结算 |
| **多链原子性** | 跨链支付需要桥接，桥接有风险 | 需要 intent-based 跨链方案（如 Across、LayerZero）|

**一句话判断**：x402 是 Agent Commerce 的「高速公路收费站」——它让车辆能自动缴费通行，但它不负责判断前方路是不是对的、路质量好不好、车会不会超速或迷路。这些需要额外的路标系统（信任层）和交通规则系统（约束层）。

---

## 研究对象二：ERC-8004（Trustless Agents）

**类型**：以太坊标准草案（ERC Draft）  
**提出者**：社区草案（具体作者待查）  
**状态**：Draft —— 有标准文本，无大规模参考实现，无测试网部署验证

### 1. 它解决什么问题

MCP 解决「Agent 怎么发现工具」，A2A 解决「Agent 怎么互相发消息」，x402 解决「Agent 怎么付钱」。

但它们都没回答：**在开放市场里，我凭什么相信这个 Agent？**

ERC-8004 把这个问题拆成三块：

**Identity Registry（身份注册表）**
- 每个 Agent 有唯一的 `agentId` 和 `agentURI`
- 基于 ERC-721 实现：借用 NFT 的所有权、转移、URI 浏览兼容性，给 Agent 一个可携带身份容器
- 注册文件可列出 web、A2A、MCP、ENS、DID、email 等服务入口
- `agentWallet` 作为保留元数据，表示 Agent 接收支付的钱包

**Reputation Registry（声誉注册表）**
- 任意 `clientAddress` 可向某个 Agent 提交反馈
- 反馈包含：带符号定点数评分、小数位、自定义分类标签、相关 endpoint、链下反馈文件 URI 及其 hash
- 不规定统一评分算法，只规定「反馈信号如何被发布、读取和组合」

**Validation Registry（验证注册表）**
- 允许 Agent 请求独立验证器检查自己的工作结果
- 支持质押保障的重新执行、zkML proof、TEE oracle、可信裁判、自定义 validator contract

一句话：ERC-8004 试图为开放 Agent 经济建立**公共信任基础设施**——没有平台背书时，Agent 也能被发现、被评价、被验证。

### 2. 它的边界是什么

**边界一：Draft 阶段，尚未经过工程验证**

标准文本已出，但缺乏：
- 参考实现（reference implementation）
- 测试网部署与压力测试
- 主流 Agent 平台（OpenAI、Anthropic、Google）的采纳信号
- 钱包/托管方的集成意愿

这意味着它目前是「趋势信号和内容母题」，不宜在工程方案中当作已确定的事实标准依赖。

**边界二：身份层可能被 DID/ENS/AA 钱包方案分流**

ERC-8004 的 Identity Registry 用 ERC-721 作为 Agent 身份容器。但现实中：
- ENS 已经是成熟的去中心化命名系统
- DID（去中心化标识符）有 W3C 标准背书
- ERC-4337 / 7702 智能账户本身就可作为 Agent 的可编程身份

如果 Agent 经济最终采用「智能账户 = Agent 身份」的范式，ERC-8004 的 ERC-721 身份容器可能显得冗余。

**边界三：声誉系统的固有攻击面**

声誉注册表允许任意地址提交反馈，这天然面临：
- 女巫攻击（Sybil Attack）：攻击者创建大量地址给自己刷好评
- 刷分/恶意差评：竞争对手恶意拉低评分
- 平台操纵：如果链下聚合算法由某一方控制，可能形成新的中心化权力

标准本身不提供抗女巫机制（如质押、KYC、社交图谱验证），这些需要在协议外补充。

**边界四：验证成本可能过高，不适合低价值任务**

Validation Registry 支持的验证方式（zkML proof、TEE oracle、重新执行）都有显著成本。对于 $0.50 的 API 调用，请求第三方验证的费用可能超过交易本身。这导致验证机制更适合高价值任务（如 $500 的代码审计），而非高频微支付。

**边界五：支付不在协议范围内**

ERC-8004 明确说支付不在标准范围内。它只负责「发现 → 评价 → 验证」，不负责「如何转账」。这意味着它必须与 x402 或其他支付协议配合使用，自身不构成闭环。

### 3. 还缺什么

| 缺口 | 影响 | 与 PactGuard 的关系 |
|------|------|---------------------|
| **缺少参考实现和测试网部署** | 无法在实际 Demo 中调用真实的 Identity/Reputation/Validation Registry | PactGuard 目前用 mock 数据模拟声誉查询，需要等待标准成熟或自建轻量 registry |
| **缺少抗女巫机制** | 声誉分数容易被操纵，Buyer Agent 基于虚假高分选择服务方会导致损失 | PactGuard 的 v2 Pact 引入 `reputation_min_score`，但数据源可信度仍待解决 |
| **缺少低价值任务的轻量验证方案** | 微支付场景下第三方验证不经济 | 需要开发基于交付物 hash 比对的轻量自动验证（PactGuard 的 Reviewer Agent 角色） |
| **缺少与 MCP/A2A 的正式集成规范** | 标准文本提及关系，但没有正式的接口规范或适配层 | 需要社区或项目方推动桥接实现 |
| **缺少身份容器的主流共识** | ERC-721 vs DID vs Smart Account 之争未定 | PactGuard 采用「address + metadata」的兼容方案，不押注单一身份标准 |

**一句话判断**：ERC-8004 是 Agent Commerce 的「信用局草稿」——它勾勒了开放市场中身份、声誉、验证的骨架，但还没有实体建筑。在它成熟之前，任何依赖它的系统都需要设计 fallback（mock 声誉、人工审核、轻量验证）。

---

## 研究对象三：Cobo Agentic Wallet (CAW)

**类型**：基础设施 / SDK / MPC 钱包产品  
**维护方**：Cobo（全球数字资产托管与钱包基础设施商，$3.8T+ 资产托管，零安全事故记录）  
**状态**：已发布，邀请码申请制，SDK + MCP Server + Recipe 库可用

### 1. 它解决什么问题

现有 Agent 钱包方案的痛点：
- **TEE 方案**：依赖硬件可信执行环境，一旦被攻破或侧信道攻击，私钥暴露
- **API Key 方案**：Agent 持有 API Key，泄露即资金风险
- **委托 EOA 方案**：把私钥或助记词交给 Agent，等于把银行密码交给陌生人
- **静态 Policy 方案**：权限规则写死在配置文件里，无法围绕具体任务动态调整

CAW 解决的核心问题：**让 AI Agent 能自主执行链上操作，同时确保用户不交出私钥、不失去控制权、不依赖对 Agent 或 LLM 的信任。**

三个「行业首创」设计：

**MPC 非托管钱包**
- 私钥被加密分片，由用户、Agent、Cobo 基础设施三方共同参与签名
- 被攻破的 Agent、被 prompt injection 操纵的 LLM、泄露的凭证，**单独任何一方都无法生成有效签名**
- 这是密码学强制的数学保证，不是「安全最佳实践」级别的软约束

**Pact 协议（人类-Agent 授权协议）**
- 每个任务开始前生成一个 Pact，定义：
  - 金额范围（max/min/per-transaction/daily/hourly）
  - 合约白名单/黑名单
  - 网络限制
  - 时间窗口
  - 函数级权限（允许/禁止特定函数）
  - 执行模式（自动批准条件 vs 人工确认触发条件）
  - 终止条件（超时、连续失败次数、Pact 过期）
- Pact 在基础设施层原生 enforce，不是 Agent 层的「建议」
- Pact 动态生成、任务级、到期即失效——这实现了「反脆弱」的权限模型：权限不是静态配置，而是围绕具体任务生成的临时契约

**Recipe 技能层**
- 预定义链上任务路径（Uniswap V3 Swap、Aave V3 Lending、x402 Payment、Polymarket Trading 等）
- Agent 不再幻觉合约地址、编造 ABI 参数、猜测 Gas 费
- 从「能执行」升级为「能正确执行」

### 2. 它的边界是什么

**边界一：Pact 是用户-Agent-Cobo 三方契约，不是多方商业契约**

CAW Pact 约束的是「我的 Agent 能花多少钱、能调用哪些合约」。它不涉及：
- 服务方交付内容后的 escrow 释放条件
- 双方对交付质量的争议仲裁
- 商业合同的条款执行（如「7 条文案必须包含品牌关键词」）

这意味着 Pact 是**支出约束工具**，不是**商业执行工具**。PactGuard 项目中的 escrow、验收、争议仲裁需要 ERC-8183 或自建合约层来补充。

**边界二：MPC 签名需要用户在线协同**

MPC Mode 下，交易无法在没有用户协同签名的情况下完成。这确实提供了最高安全性，但也意味着：
- 用户离线时，Agent 无法执行紧急操作（虽然 CAW 也提供 API Key Mode 作为 trade-off）
- 高频自动化策略（如每秒执行的 DCA）可能受限于用户响应速度

API Key Mode 允许预授权范围内的自动执行，但这又引入了 API Key 泄露的风险——两种模式的切换点是安全与便利的经典 trade-off。

**边界三：生态锁定与供应商依赖**

CAW 是 Cobo 的封闭产品（虽然 SDK 开放）：
- Pact 协议由 Cobo 基础设施 enforce，不是开放标准
- 如果 Cobo 服务中断、政策变化、或被制裁，依赖 CAW 的 Agent 可能失去签名能力
- 目前没有看到 Pact 协议被标准化或第三方实现的迹象

这与 x402（开放标准）和 ERC-8004（社区草案）形成对比：CAW 是「好用的黑箱」，但不是「可替代的基础设施」。

**边界四：Recipe 库的覆盖范围有限**

Recipe 覆盖的场景主要是 DeFi（Swap、Lending、DCA）和支付（x402、Stripe）。对于非标准化的 Agent Commerce 场景（如「购买内容生成服务并验收质量」），Recipe 无法直接套用，需要开发者自定义。

### 3. 还缺什么

| 缺口 | 影响 | 与 PactGuard 的关系 |
|------|------|---------------------|
| **缺少 escrow 与争议仲裁原语** | Pact 只管支出边界，不管商业履约 | PactGuard 需要自建或集成 ERC-8183 的 escrow 层 |
| **缺少交付物验收标准** | Recipe 验证的是「交易参数是否正确」，不是「生成内容是否合格」 | PactGuard 的 Reviewer Agent 角色需要自定义语义验收逻辑 |
| **开放标准缺失** | Pact 是 Cobo 专有协议，无法被其他钱包/托管方替代 | PactGuard 的设计需保持「Pact 抽象层」，未来可适配其他约束方案（如 Safe Guard） |
| **缺少 Agent 声誉查询接口** | CAW 不提供服务方声誉数据 | PactGuard 需要集成 ERC-8004 或自建声誉查询模块 |
| **跨链 Pact 一致性** | 多链场景下 Pact 的 enforce 逻辑是否一致尚未明确 | PactGuard MVP 锁定单链（Base Sepolia）回避此问题 |
| **社会工程攻击防护** | 权限膨胀诱导（A8 攻击场景）：攻击者诱导用户手动放宽 Pact | 需要 UI 冷静期 + 多签 + timelock，这超出了 CAW SDK 的技术范畴，需产品层补充 |

**一句话判断**：CAW 是 Agent Commerce 的「智能保险箱」——它确保你的钱不会被偷、不会超支、不会被滥花，但它不负责判断你买的东西好不好、卖东西的人靠不靠谱、买完之后出了问题怎么仲裁。

---

## 三者协同关系与 PactGuard 的定位

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Commerce 全栈                        │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│  发现层     │  支付层     │  约束层     │    执行/仲裁层       │
│  ERC-8004  │   x402     │  CAW Pact  │  ERC-8183 / Escrow  │
│  Identity  │  按请求支付 │  预算/范围   │  托管/验收/争议      │
│  Reputation│  原子结算   │  时间/频率   │  条件释放/退款       │
│  Validation│  多链支持   │  函数级权限  │  Evaluator 裁决      │
└─────────────┴─────────────┴─────────────┴─────────────────────┘
         ↑              ↑              ↑              ↑
    「它是谁」      「怎么付钱」     「能花多少」      「付完怎么保证交货」
```

PactGuard 项目在三者之间的卡位：
- **不重复造轮子**：x402 的支付通道直接用，CAW Pact 的约束机制直接用（或模拟兼容）
- **补缺口**：在三者之间的空白地带——「支付前的预算约束」与「支付后的 escrow 仲裁」之间——建立可声明的 Guard 层
- **可演示的价值**：通过威胁模型验证，证明「只有支付通道 + 只有约束 SDK + 只有信任草案」都不足以安全地让 Agent 自主支付，必须叠加四层（支付 + 约束 + 信任 + 仲裁）

---

## 参考文献

| # | 资料 | 类型 | 获取路径 |
|---|------|------|---------|
| 1 | x402 协议白皮书与标准文档 | 协议标准 | `/mnt/d/ObsidianWorkspace/Neo/LLM-Wiki/concepts/x402.md` 及关联架构/支付流程/扩展机制文档 |
| 2 | x402 vs MPP 机器支付协议之争 | 讨论纪要 | `/mnt/d/ObsidianWorkspace/Neo/LLM-Wiki/04-技术标准/x402/x402-vs-MPP-Space-讨论纪要-2026-05-15.md` |
| 3 | ERC-8004 标准草案中文翻译 | 标准草案 | `/mnt/d/ObsidianWorkspace/Neo/LLM-Wiki/raw/articles/web4-agent-payment/ERC-8004专题/原始资料/ERC-8004中文翻译.md` |
| 4 | ERC-8004 标准解读：Agent发现、声誉与验证层 | 解读文章 | `/mnt/d/ObsidianWorkspace/Neo/LLM-Wiki/raw/articles/web4-agent-payment/ERC-8004专题/ERC-8004标准解读：Agent发现、声誉与验证层.md` |
| 5 | Cobo Agentic Wallet 官方文档 | 产品文档 | https://www.cobo.com/agentic-wallet |
| 6 | Cobo CAW GitHub 仓库 | SDK 源码 | https://github.com/CoboGlobal/cobo-agentic-wallet |
| 7 | Cobo 发布 CAW 的新闻稿 | 新闻稿 | https://www.cobo.com/post/cobo-launches-agentic-wallet-how-ai-agents-interact-on-chain |
| 8 | x402 Foundation 官方站点 | 组织官网 | https://x402.org |

---

> 评审自查：本研究包覆盖 3 个对象，均围绕主方向；每个对象均回答「解决什么问题」「边界是什么」「还缺什么」；已标注与 PactGuard 项目的关系；参考文献可复查。
