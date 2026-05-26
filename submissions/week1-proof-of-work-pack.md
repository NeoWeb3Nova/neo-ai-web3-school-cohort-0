# Week 1 Proof-of-Work Pack | AI × Web3 School Cohort 0

> 总入口：https://github.com/NeoWeb3Nova/neo-ai-web3-school-cohort-0
> 本 Pack 位置：`submissions/week1-proof-of-work-pack.md`
> 提交时间：2026-05-26
> 学员：Neo（GitHub: NeoWeb3Nova）

---

## 一句话总结

Week 1 完成了 AI 概念卡片的纠错学习、Base Sepolia 测试网 USDC 转账、Foundry 最小合约开发链路，以及「Agent 辅助链上交易」的最小交叉实验设计——核心收获是建立了「学习即工程」的节奏：每个概念对应一张卡片，每笔交易对应一个哈希，每个实验对应一份可运行伪代码。

---

## 1. AI 学习记录与概念卡片

### 1.1 AI 概念卡片（6 张 + 完整纠错链路）

文件：`tasks/week1-ai-concept-cards-corrected.md`

| # | 概念 | 关键修正 |
|---|------|---------|
| 1 | LLM | 向量表示 ≠ 向量数据库；ChatGPT 是产品名，GPT-3.5 是模型名 |
| 2 | Prompt | "智能化生成"是空泛循环定义 → 修正为自动提示优化 / 系统模板化 |
| 3 | Workflow | 从"逻辑链路"精确为 DAG 结构（节点=操作，边=数据流/控制流） |
| 4 | Tool Use | Hooks ≠ Function Calling；MCP 不是 CLI 协议；Skill 与 MCP 不在同一层级 |
| 5 | Vibe Coding | 记忆偏差：Web Coding → Vibe Coding（Karpathy, 2025） |
| 6 | Human in the Loop | "确权"是法律术语 → 修正为把关 / 授权确认 |

原始概念卡片：`tasks/week1-ai-concept-cards.md`

### 1.2 AI 工具实践：晚间学习 Agent（Hermes + cron）

- **功能**：每晚 20:00 自动访问 Handbook → 提取章节摘要 → 生成打卡草稿 → 写入 daily 笔记 → git push
- **配置**：`LEARNING_AGENT_RULES.md`
- **运行状态**：Week 1 连续 5 天（5/18–5/22）自动生成并推送 daily 笔记
- **问题记录**：WSL 休眠导致 cron job 偶尔漏执行，已在 Week 1 总结中标记为待修复项

---

## 2. Web3 学习记录与链上验证

### 2.1 Web3 概念卡片

文件：`tasks/week1-web3-concept-cards-corrected.md`

涵盖：EOA / Smart Account / 多签 / Gas 机制 / 测试网与主网区别

### 2.2 测试网交易记录

| 项目 | 详情 |
|------|------|
| 网络 | Base Sepolia Testnet |
| 类型 | USDC 转账 |
| 发送方 | `0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf` |
| 金额 | 0.01 USDC |
| 交易哈希 | `0xbad1a237ee7d6fc5724183fc3c95de461040d8bc905a37650356e15d44d937b3` |
| Gas Price | 0.006 Gwei |
| 区块浏览器 | [BaseScan Sepolia](https://sepolia.basescan.org/tx/0xbad1a237ee7d6fc5724183fc3c95de461040d8bc905a37650356e15d44d937b3) |

### 2.3 最小合约开发链路

文件：`tasks/week1-deploy-or-call-minimal-smart-contract.md`

- 工具：Foundry (`forge init`, `forge test`, `forge script`)
- 合约：`SimpleStorage.sol`（`set` / `get`）
- 链路：编译 → 单元测试 → 本地 Anvil 部署脚本 → 待测试网部署

---

## 3. AI × Web3 最小交叉实验

### 3.1 实验设计文档

文件：`experiments/module-c-minimal-bridge.md`

实验名称：Agent-Assisted On-Chain Transaction
核心链路：用户意图 → Agent 生成交易提案 → Guard 检查 → 人工复核 → 钱包签名 → 链上执行 → 状态验证

### 3.2 流程图

文件：`experiments/module-c/flow.md`

Mermaid 流程图 + 安全检查点（Guard → 人工复核 → 钱包签名 → 收据验证）

### 3.3 可运行伪代码

文件：`experiments/module-c/pseudo.py`

含 `BudgetPolicy` + `Guard` + `Agent` 流程的 Python 伪代码，可直接运行概念验证。

### 3.4 实验 README

文件：`experiments/module-c/README.md`

200 字说明 + 风险检查点 + Week 2 增强方向（Budget 层 / Quote 层 / AI Security 层）。

---

## 4. 本周的一个问题和一次人工修正记录

### 4.1 问题：AI 概念卡片中的术语层级混乱

在整理 Week 1 AI 概念卡片时，我连续犯了 8 个术语错误：

| # | 错误说法 | 正确说法 | 错误类型 |
|---|---------|---------|---------|
| 1 | 向量数据库 | 向量表示 / embeddings | 混淆内部结构与外部系统 |
| 2 | ChatGPT 3.5 | ChatGPT (based on GPT-3.5) | 产品名≠模型名 |
| 3 | 智能化生成 | 自动提示优化 / 系统模板化 | 空泛循环定义 |
| 4 | Hooks | Function Calling / Tool Calling | 术语错用（编程范式≠LLM 机制） |
| 5 | MCP 是命令行接口协议 | MCP = Model Context Protocol（开放协议） | **完全错误** |
| 6 | Skill 相比 MCP 有很多优点 | Skill 与 MCP 不在同一层级，不可比优劣 | 抽象层级混淆 |
| 7 | Web Coding | Vibe Coding | 记忆偏差 |
| 8 | 确权 | 把关 / 授权确认 | 术语错配（法律≠技术场景） |

**根本原因**：缺乏"层级意识"——把协议层（MCP）、应用层（Skill）、编程范式（Hooks）、产品层（ChatGPT）混为一谈。

### 4.2 人工修正过程

修正文件：`tasks/week1-ai-concept-cards-corrected.md`

修正方式：每张卡片采用「原始表述 → 问题诊断（严重程度标注） → 修正表述 → 为什么错了」四段式结构。额外输出「错误速查表」和「费曼纠错笔记 checklist」，供后续整理概念卡片时自查。

修正后建立的原则：
1. 术语先查官方定义
2. 明确所属抽象层级（协议/框架/应用/算法）
3. 警惕近似术语混淆（向量 DB vs embeddings）
4. 人名/公司名/产品名确认拼写和归属

### 4.3 另一个卡点：模块 B 合约测试网部署未完成

SimpleStorage 合约的 Foundry 项目已搭建（编译 + 测试 + 本地 Anvil 部署脚本），但实际的 Sepolia 测试网部署 tx hash 和合约地址尚未补充。原因是 Week 1 后期重心转向模块 C 交叉实验设计，模块 B 的链上记录被标记为 Week 2 初期补齐项。

---

## 5. 本周 Proof-of-Work 汇总表

| 类别 | 产出 | 链接/证据 |
|------|------|----------|
| 每日学习笔记 | 7 天连续记录 | `daily/2026-05-18.md` ~ `daily/2026-05-25.md` |
| AI 概念卡片 | 6 张 + 纠错链路 | `tasks/week1-ai-concept-cards-corrected.md` |
| Web3 概念卡片 | EOA/SmartAccount/多签/Gas | `tasks/week1-web3-concept-cards-corrected.md` |
| Web3 实践 | Base Sepolia USDC 转账 | Tx: `0xbad1a2...d937b3` |
| 合约开发 | Foundry Counter 项目 | `experiments/SimpleStorage.sol` + `tasks/week1-deploy-or-call-minimal-smart-contract.md` |
| 交叉实验设计 | Agent-Assisted 链上交易 | `experiments/module-c-minimal-bridge.md` |
| 流程图 | Mermaid + 安全检查点 | `experiments/module-c/flow.md` |
| 伪代码 | BudgetPolicy + Guard + Agent | `experiments/module-c/pseudo.py` |
| 学习 Agent | Hermes cron job（每晚自动笔记） | `LEARNING_AGENT_RULES.md` |
| Handbook 反馈 | 3 条（Track MVP / Bridge 代码跳跃 / Agent Identity 等） | `handbook-feedback/` |
| Week 2 方向预研 | 5W 风险框架对比 | `experiments/week2-direction-compare.md` |

---

## 6. 还没解决的问题 & Week 2 方向

| 问题 | 状态 |
|------|------|
| SimpleStorage 合约 Sepolia 测试网部署 | 待 Week 2 初期补齐 |
| Agent 结果验证机制（Evaluator） | 模块 C 原型中仅有"读取新状态"，缺少可靠 Evaluator |
| Session Key / Policy / Guard 具体技术实现 | 停留在概念设计，未动手实验（如 Rhinestone Smart Sessions） |
| WSL 休眠导致 cron job 漏执行 | 需迁移到更稳定的执行环境 |

Week 2 探索方向：
1. ERC-4337 Account Abstraction + Session Key 实践
2. 模块 C 原型接入真实 LLM Function Calling
3. Settlement & Escrow 状态机代码化

---

> 本 Pack 所有材料均来自 Week 1（2026-05-18 ~ 2026-05-25）的真实学习过程。概念修正有对照记录，交易有区块浏览器链接，实验有流程图和伪代码。欢迎审核者直接点击链接验证。
