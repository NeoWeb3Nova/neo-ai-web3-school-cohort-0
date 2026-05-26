# Week 1 学习总结 | AI × Web3 School Cohort 0

> 作者：Neo（GitHub: NeoWeb3Nova）
> 时间：2026-05-26
> 所属：AI × Web3 School 共学营 Cohort 0 Week 1
> 标签：#AIxWeb3School

---

## 一、重新理解的 AI 概念：Tool Use 不是「钩子」，是 LLM 的能力边界外延

Week 1 之前，我把 Tool Use 理解成「大模型预测出需要运行哪些工具，通常以钩子的形式出现」。这个概念卡提交后被纠正了——**Tool Use 的本质不是「钩子」这种被动触发机制，而是 Function Calling：模型在生成过程中主动识别需要外部能力，并输出结构化的工具调用请求**。

更深一层，我重新理解了 Workflow 和 Agent 的区别。之前以为 Workflow 就是「按逻辑顺序规范大模型产出」，现在明白 Workflow 是**有向图（DAG）结构**的任务编排：节点是 LLM 调用、工具执行、条件判断，边是数据流和控制流。如果只是线性链路，那叫 Pipeline；Workflow 的关键在于分支、循环和并行。

这让我意识到：当 LLM 可以通过 Tool Use 调用链上查询、甚至生成交易草稿时，它不再只是「回答问题」——它正在成为经济活动的参与方。这是 AI × Web3 交叉的底层逻辑。

---

## 二、重新理解的 Web3 概念：Gas 是「计算资源的信用凭证」，不是手续费

Week 1 的模块 B 要求完成测试网实践。我在 Base Sepolia 测试网完成了一笔 USDC 转账：

| 字段 | 值 |
|------|-----|
| 网络 | Base Sepolia Testnet |
| 发送方 | `0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf` |
| 金额 | 0.01 USDC |
| 交易哈希 | `0xbad1a237ee7d6fc5724183fc3c95de461040d8bc905a37650356e15d44d937b3` |
| Gas Price | 0.006 Gwei |
| 浏览器 | [BaseScan](https://sepolia.basescan.org/tx/0xbad1a237ee7d6fc5724183fc3c95de461040d8bc905a37650356e15d44d937b3) |

真正动手后才理解：**Gas 不是传统意义上的「手续费」，而是对区块空间计算资源的竞价**。Gas Price 低的时候交易可能长时间 pending，Gas Limit 设太低会导致 revert 且已消耗的 Gas 不退。测试网让我安全地犯了错——这才是 Web3「不可逆性」的预演。

另外，我用 Foundry 搭建了一个最小 Counter 合约项目（`solidity-counter`），完整走通了「编译 → 测试 → 部署脚本」的链路。合约代码、部署脚本和前端交互逻辑都记录在 `tasks/week1-deploy-or-call-minimal-smart-contract.md`。

---

## 三、AI × Web3 交叉问题：Agent 能发起链上支付吗？什么必须留在人类手中？

这是 Week 1 思考最多的问题。我的结论是：**技术上 Agent 完全可以自主构建和签名交易，但经济上必须有明确的权限边界**。

模块 C 的设计文档（`experiments/module-c-minimal-bridge.md`）给出了我的最小交叉实验方案：

```
User Intent
    ↓
Agent 生成交易提案（Proposal）
    ↓
Guard 检查（合约白名单、金额上限、风险等级）
    ↓
【Human-in-the-Loop】人工复核
    ↓
钱包签名（Agent 不触碰私钥）
    ↓
链上执行 + 收据生成
```

核心设计原则是：**Agent 永远只有「提案权」，没有「签名权」**。私钥隔离、签名隔离、网络隔离、回滚检查是不可协商的安全边界。

这个链路让我意识到 AI × Web3 的「信任缺口」在哪里：Agent 可以生成提案，但**结果验证**仍然是开放问题——链上 tx hash 能证明「发生了什么」，但无法直接证明「结果是否符合预期」。这也许是 Week 2 探索 Settlement & Escrow 的起点。

---

## 四、本周 Proof-of-Work

### 4.1 学习日志（连续 7 天）
`daily/2026-05-18.md` ~ `daily/2026-05-25.md` — 每日学习笔记，包含概念整理、实验记录、打卡草稿。

### 4.2 AI 概念卡片纠错学习
`tasks/week1-ai-concept-cards-corrected.md` — 6 张概念卡片的「原始表述 → 问题诊断 → 修正表述 → 为什么错了」完整纠错链路。关键收获：LLM 内部的 embeddings 不是向量数据库，Prompt 的优化是算法自动优化而非「智能化生成」，Tool Use 是 Function Calling 而非 Hooks。

### 4.3 Web3 基础实践
`tasks/week1-web3-eoa-smartaccount-multisig-corrected.md` — EOA / Smart Account / 多签的概念澄清。
`tasks/week1-deploy-or-call-minimal-smart-contract.md` — Foundry + Counter 合约完整开发链路。

### 4.4 模块 C 最小交叉实验原型
`experiments/module-c-minimal-bridge.md` — 实验设计文档：Agent-Assisted On-Chain Transaction。
`experiments/module-c/flow.md` — 流程图与安全检查点。
`experiments/module-c/pseudo.py` — 可运行伪代码（含 BudgetPolicy + Guard + Agent 流程）。
`experiments/module-c/README.md` — 实验说明与风险边界。

### 4.5 Week 2 方向预研
`experiments/week2-direction-compare.md` — 用「5W 风险框架」对比 Agentic Commerce / AI Security / 模块 C 延伸三个方向。

---

## 五、还没解决的问题 & 下周方向

### 未解决问题
1. **模块 B 合约部署的具体链上记录仍不完整**：虽然 Counter 合约项目已搭建，但实际的 Sepolia 部署 tx hash 和合约地址尚未补充到笔记中（本地 Foundry 部署到 Anvil 已完成，测试网部署待推进）。
2. **Agent 结果验证的空白**：模块 C 原型中，Agent 生成提案后，如何验证链上执行的结果确实符合用户原始意图？目前只有「读取新状态」这一步，缺少一个可靠的 Evaluator 机制。
3. **权限层级的细化**：Session Key / Policy / Guard 的具体技术实现（如 Rhinestone Smart Sessions）尚未动手实验，目前停留在概念设计阶段。

### 下周想探索的方向
1. **ERC-4337 Account Abstraction 实践**：尝试用 Session Key 给 AI Agent 有限的链上操作权限（只读/草稿），签名权保留在人类钱包。
2. **将模块 C 原型接入真实 LLM**：目前的伪代码中 Agent 生成 Proposal 是硬编码的，下周想接入实际的 LLM Function Calling，让 Agent 真正理解用户意图并生成交易参数。
3. **Settlement & Escrow 状态机代码化**：如果方向锚定为 Agentic Commerce，需要将「Created → Funded → Delivered → Accepted → Released」状态机写成最小合约结构或 Python 模拟器。

---

## 相关链接

- GitHub 学习仓库：https://github.com/NeoWeb3Nova/neo-ai-web3-school-cohort-0
- 本总结文件：`submissions/week1-summary.md`
- Week 1 每日笔记：`daily/`
- 实验产出：`experiments/`
- 任务提交：`tasks/`

---

> 这不是一篇 AI 生成的空泛总结。上面每一个概念修正、每一笔交易哈希、每一行伪代码都来自 Week 1 的真实学习过程。如果你在学 AI × Web3，欢迎来仓库交流。
