# Week 1 Build Log 初稿 | AI × Web3 School Cohort 0

> 学员：Neo（GitHub: [NeoWeb3Nova](https://github.com/NeoWeb3Nova)）  
> 仓库：[neo-ai-web3-school-cohort-0](https://github.com/NeoWeb3Nova/neo-ai-web3-school-cohort-0)  
> 时间范围：2026-05-18 ~ 2026-05-25  
> 提交日期：2026-07-11（补档 Week 1 Build Log，用于 Week 2 Tech/Ops/Research 分轨）  
> 对应提交：`7725514`（Week 1 Proof-of-Work Pack）

---

## 一句话总结

Week 1 完成了「AI 概念卡片纠错学习 → Base Sepolia 测试网 USDC 转账 → Foundry 最小合约开发链路 → Agent 辅助链上交易原型」的完整闭环。核心转变是从「AI 和 Web3 分开学」切换到「交叉链路必须一起设计」，并把每个概念落到了可验证的提交物或链上哈希。

---

## 1. 完成了哪些链上实践

### 1.1 测试网转账（已完成，有链上记录）

| 项目 | 详情 |
|------|------|
| 网络 | Base Sepolia Testnet |
| 类型 | USDC 转账 |
| 发送方 | `0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf` |
| 接收方 | `0x5045539b30e83F1D7a2D83E1CFe22A9beFc858F3` |
| 交互合约（USDC） | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| 金额 | 0.01 USDC |
| 交易哈希 | `0xbad1a237ee7d6fc5724183fc3c95de461040d8bc905a37650356e15d44d937b3` |
| 区块高度 | 41661802 |
| Gas Price | 0.006 Gwei |
| 交易费 | 0.000000515729466272 ETH |
| 区块浏览器 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0xbad1a237ee7d6fc5724183fc3c95de461040d8bc905a37650356e15d44d937b3) |

### 1.2 最小智能合约开发链路（部分完成）

- 合约代码：`experiments/SimpleStorage.sol`（`set` / `get`）
- 完整项目文档：`tasks/week1-deploy-or-call-minimal-smart-contract.md`
- 工具链：Foundry（`forge init`、`forge test`、`forge script`）
- 已完成：编译 → 单元测试 → 本地 Anvil 部署脚本
- **未完成**：Sepolia / Base Sepolia 测试网真实部署的合约地址和 tx hash 尚未补充

### 1.3 AI × Web3 最小交叉实验（已完成设计 + 伪代码）

- 设计文档：`experiments/module-c-minimal-bridge.md`
- 流程图：`experiments/module-c/flow.md`
- 可运行伪代码：`experiments/module-c/pseudo.py`
- README：`experiments/module-c/README.md`
- 核心链路：用户意图 → Agent 生成交易提案 → Guard 检查 → 人工复核 → 钱包签名 → 链上执行 → 状态验证

---

## 2. 遇到了哪些问题

| # | 问题 | 影响 | 当前状态 |
|---|------|------|----------|
| 1 | AI 概念卡片出现 8 处术语层级/命名错误 | 概念基础不牢，容易在社区讨论中暴露不专业 | 已纠错并建立 checklist |
| 2 | Web3 概念卡片出现 15 处错误（含密码学机制错误） | 签名/验证/授权等核心安全概念混淆 | 已纠错并建立错误速查表 |
| 3 | SimpleStorage 合约未在测试网真实部署 | 模块 B 链上记录不完整 | 标记为 Week 2 初期补齐项 |
| 4 | WSL 休眠导致晚间 cron job 偶尔漏执行 | 学习 Agent 自动提醒不稳定 | 已识别原因，需迁移到稳定环境 |
| 5 | 模块 C 原型从设计到可运行原型的格式不确定 | 一度不知道提交物应该是什么 | 通过 Co-learning 和文档模板确定为「流程图 + 伪代码 + README」 |
| 6 | 方向选择犹豫：Agentic Commerce vs AI Security vs 治理自动化 | Week 2 聚焦不够 | 5W 框架对比后初步倾向 Tech 方向的 Agent Wallet / Settlement 实现 |

---

## 3. AI 帮我解决了什么

### 3.1 自动化学习流程

- 每晚 20:00 自动生成 `daily/` 笔记草稿、打卡文案，并推送到 GitHub
- 配置规则：`LEARNING_AGENT_RULES.md`
- Week 1 连续 5 天（5/18–5/22）自动生成并推送

### 3.2 概念纠错与结构化输出

- AI 将我的原始概念卡片与 Handbook / 官方定义对照，输出「原始表述 → 问题诊断 → 修正表述 → 为什么错了」四段式纠错文档
- 生成错误速查表和费曼纠错 checklist，供后续自查

### 3.3 代码与文档骨架生成

- 生成 `SimpleStorage.sol` 合约骨架
- 生成 `tasks/week1-deploy-or-call-minimal-smart-contract.md` 的 Foundry + Next.js 项目文档
- 生成模块 C 的 `flow.md`、`pseudo.py`、`README.md` 骨架

### 3.4 方向对比框架

- 用 5W 框架（谁发起 / 谁执行 / 谁付款 / 谁验证 / 谁承担风险）对比 Agentic Commerce / AI Security / 治理自动化
- 输出 `experiments/week2-direction-compare.md`

---

## 4. 哪些地方必须由我人工判断

| # | 判断点 | 为什么 AI 不能代劳 |
|---|--------|-------------------|
| 1 | 测试网钱包创建和真实签名 | 私钥/助记词必须离我本地，不能进入 AI 上下文或 repo |
| 2 | 模块 B 真实链上记录的地址和 tx hash | AI 无法访问我的钱包或浏览器，必须由我手动复制回填 |
| 3 | 概念纠错中的「严重程度」标注 | 需要我根据自己的理解深度和场景判断哪些是真正的高危错误 |
| 4 | Hackathon / Week 2 方向最终选择 | 涉及个人兴趣、能力圈、时间投入，AI 只能给框架不能替我做决定 |
| 5 | 模块 C 中 Agent 的权限边界 | 「提案权 vs 签名权」是安全设计底线，必须由人定义并坚守 |
| 6 | 是否将某个实验推进到真实链上 | 涉及 Gas 成本和不可逆风险，需要人工确认 |

---

## 5. 对 Monad 或 Web3 的理解发生了什么变化

### 5.1 从「AI + Web3 = 自动化交易」到「AI + Web3 = 权限分层」

Week 1 之前，我以为 Agent 在 Web3 里的价值是「自动帮我转账/交易」。Week 1 结束后，我理解到真正的交叉点是：

- Agent 只拥有「提案权」
- Guard 和 Policy 拥有「审查权」
- 人类钱包拥有「签名权」
- 链上合约拥有「执行权」

四权分离，而不是让 AI 越俎代庖。

### 5.2 对「签名」的理解从「登录」升级为「数学授权」

通过 Web3 概念卡片纠错，我意识到：

- 签名不是「同意服务条款」，而是对一笔链上消息的数学承诺
- `approve` 和 `sign transaction` 是完全不同的两件事
- 签名的内容决定风险大小，而不是签名动作本身

### 5.3 对 Monad 的初步认知

虽然 Week 1 主要实践在 Base Sepolia，但通过课程资料和社区讨论，我对 Monad 建立了以下预期：

- Monad 的目标之一是提升 EVM 兼容链的吞吐量和最终性速度
- 如果 Agent 需要高频、低延迟的机器支付，Monad 的高性能执行层可能降低「AI 决策 → 链上结算」的摩擦
- 但链再快，权限和安全设计原则不变：Agent 不持主私钥、人工复核不可省

### 5.4 从「学概念」到「学工程」

Week 1 最大的变化是建立了「每个概念对应一张卡片，每笔交易对应一个哈希，每个实验对应一份可运行伪代码」的工程习惯。

---

## 6. 更适合进入 Tech、Ops 还是 Research 方向

**初步选择：Tech 方向。**

### 6.1 选择 Tech 的初步理由

| 维度 | 自我评估 |
|------|----------|
| 编程能力 | 能独立开发，已用 Python / Foundry / Next.js 完成原型骨架 |
| 学习偏好 | 喜欢动手实验，以项目驱动学习 |
| Week 1 产出 | 合约、伪代码、流程图、自动化 Agent 都有实际提交物 |
| 最兴奋的点 | 把 Agent Wallet / Session Key / Guard / Escrow 这些概念写成可运行代码 |
| 最不擅长的点 | 社群运营、活动策划、偏商业的 Partnership |

### 6.2 为什么不选 Ops / Research

- **Ops**：Week 1 我没有主动组织过共学、答疑或社区活动，对运营型任务动力不足。
- **Research**：虽然我喜欢读文档和写分析，但我的优势在于「把研究快速转化为原型代码」，而不是长期产出纯理论报告。

### 6.3 Tech 方向内想深入的具体领域

按优先级排序：

1. **Agent Wallet + Session Key**：把「提案权/签名权分离」写成可运行代码
2. **Settlement & Escrow 状态机**：把 6 状态 escrow 从伪代码变成 Solidity 合约 + 前端交互
3. **AI Security Guard 层**：给 Agent 增加确定性规则拦截 + 审计日志

---

## 7. Prompt / AI 输出 / 人工修改记录

### 7.1 一个典型 Prompt-Modify 循环

**我的 Prompt（大意）**：

> 「帮我整理 6 个 AI 基础概念卡片，要求每张卡片包含定义、应用场景、与 Web3 的关联。」

**AI 输出**：

- 生成了 6 张卡片的初稿

**人工修改**：

- 我发现其中把 MCP 说成「命令行接口协议」，把 Tool Calling 说成「Hooks」，把 Vibe Coding 说成「Web Coding」
- 我要求 AI 用「原始表述 → 问题诊断 → 修正表述 → 为什么错了」四段式重新输出
- 最终形成 `tasks/week1-ai-concept-cards-corrected.md`

**收获**：AI 可以快速生成结构，但术语精确性必须人工把关，尤其是跨 AI/Web3 的交叉术语。

### 7.2 另一个 Prompt-Modify 循环

**我的 Prompt**：

> 「为 Week 1 模块 C 设计一个最小交叉实验，展示 AI 生成交易提案到链上执行的链路。」

**AI 输出**：

- 生成了 `experiments/module-c-minimal-bridge.md` 的设计文档

**人工修改**：

- 我坚持加入三条不可协商的安全边界：Agent 永不接触私钥、签名必须在用户钱包完成、主网操作需要额外确认
- 我要求把 Week 2 的 Budget/Quote/AI Security 层作为增强点写入 `experiments/module-c/README.md`
- 最终形成 `experiments/module-c/flow.md`、`pseudo.py`、`README.md`

---

## 8. 学习中的失败和修复过程

### 8.1 失败 1：术语层级混乱

**表现**：把 MCP、Skill、Hooks、Function Calling、CLI 等概念混为一谈。

**修复**：

- 建立「抽象层级」意识：协议层 / 框架层 / 应用层 / 算法层
- 每次整理新概念时先查官方定义
- 输出错误速查表，供后续自查

### 8.2 失败 2：密码学概念错误

**表现**：说「公钥解密签名」、「助记词反推私钥」。

**修复**：

- 重新学习 ECDSA 签名/验证流程
- 明确助记词 → 种子 → 主私钥 → 子私钥 的单向派生关系
- 在 Web3 概念卡片中补充「私钥、助记词、签名、授权的风险链条」

### 8.3 失败 3：模块 B 合约未真实上链

**表现**：SimpleStorage 合约只在本地 Anvil 跑通，测试网部署记录为空。

**修复计划**：

- Week 2 初期用 Foundry 脚本在 Base Sepolia 部署
- 记录真实合约地址和 tx hash
- 补充到本 Build Log 和 `daily/` 笔记

### 8.4 失败 4：WSL cron 不稳定

**表现**：晚间学习 Agent 偶尔漏执行。

**修复计划**：

- 短期：手动触发或设置更可靠的唤醒策略
- 长期：迁移到云服务器或 GitHub Actions

---

## 9. 本周最重要的 1–3 个学习收获

1. **权限分层是 AI × Web3 的安全底线**：Agent 提案、Guard 审查、人类签名、链上执行，四权分离不可混淆。
2. **术语精确性决定专业度**：一个「公钥解密」或「MCP 是 CLI 协议」的错误，会在技术讨论中立刻暴露基础薄弱。
3. **学习即工程**：每个概念对应一张卡片，每笔交易对应一个哈希，每个实验对应一份可运行伪代码。

---

## 10. 希望 Week 2 深入的方向

按优先级：

1. **Agent Wallet + Session Key 实践**：用 Rhinestone Smart Sessions 或类似框架，给 Agent 分配受限权限
2. **Escrow 状态机代码化**：把 6 状态 escrow 写成 Solidity 合约，并配一个最小前端
3. **真实链上闭环**：让 Agent 生成的提案最终通过用户钱包在测试网执行，并记录真实 tx hash

---

## 11. 需要助教或同伴帮助的问题

1. **测试网部署资源**：除了 Base Sepolia，课程是否推荐在 Monad 测试网或其他 EVM 测试网做练习？是否有稳定的 Faucet 推荐？
2. **Session Key 技术选型**：Rhinestone Smart Sessions / ZeroDev / Biconomy 中，哪个更适合 Week 2 最小原型？
3. **Agent Wallet 原型标准**：Week 2 Tech 方向的提交物，是更看重「能运行的代码」还是「完整的设计文档 + 伪代码」？
4. **Monad 特定工具链**：如果要在 Monad 上部署和测试，推荐哪些 RPC、浏览器、水龙头和 SDK？
5. **AI Security 实践**：课程是否有推荐的 Prompt Injection 测试集或 Guard 规则模板，用于验证 Agent 安全层？

---

## 12. 附录：Week 1 关键文件索引

| 文件 | 说明 |
|------|------|
| `submissions/week1-proof-of-work-pack.md` | Week 1 正式提交物汇总 |
| `tasks/week1-ai-concept-cards-corrected.md` | AI 概念卡片纠错版 |
| `tasks/week1-web3-concept-cards-corrected.md` | Web3 概念卡片纠错版 |
| `tasks/week1-deploy-or-call-minimal-smart-contract.md` | 最小合约开发链路文档 |
| `experiments/module-c-minimal-bridge.md` | 模块 C 交叉实验设计 |
| `experiments/module-c/flow.md` | 模块 C 流程图 |
| `experiments/module-c/pseudo.py` | 模块 C 可运行伪代码 |
| `experiments/module-c/README.md` | 模块 C 说明 |
| `daily/2026-05-18.md` ~ `daily/2026-05-26.md` | 每日学习笔记 |

---

> 本文件为 Week 1 Build Log 初稿，用于 Week 2 Tech/Ops/Research 分轨准备。已选择 **Tech 方向**，详细理由见 `submissions/week2-track-choice-tech.md`。
