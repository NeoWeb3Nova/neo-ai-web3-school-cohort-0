# Week 2 方向选择：Tech | AI × Web3 School Cohort 0

> 学员：Neo（GitHub: [NeoWeb3Nova](https://github.com/NeoWeb3Nova)）  
> 提交日期：2026-07-11  
> 选择：**Tech 方向**

---

## 一句话理由

我选择 Tech 方向，因为 Week 1 的产出、兴奋点和能力匹配度都指向把概念写成可运行代码，而不是做运营或纯理论研究。

---

## 为什么选 Tech

### 1. Week 1 产出偏重 Tech

| 产出 | 说明 | 证据 |
|------|------|------|
| 合约骨架 | `experiments/SimpleStorage.sol` + Foundry 项目文档 | `tasks/week1-deploy-or-call-minimal-smart-contract.md` |
| 交叉实验原型 | BudgetPolicy + Guard + Agent 伪代码 | `experiments/module-c/pseudo.py` |
| 学习自动化 | Hermes cron job 自动生成笔记 + 打卡草稿 | `LEARNING_AGENT_RULES.md` |
| 链上交易记录 | Base Sepolia USDC 转账，有真实 tx hash | `daily/2026-05-21.md` |

### 2. 个人优势与 Tech 匹配

| 能力 | 证据 | 与 Tech 方向关联 |
|------|------|-----------------|
| 独立开发 | 能用 Python / Solidity / Next.js 完成原型 | 实现 Agent Wallet / Escrow / Guard |
| 项目驱动学习 | 喜欢动手做原型而不是只看文档 | Tech 方向要求代码产出 |
| 纠错能力 | Week 1 概念卡片纠错过程中能快速识别和修复错误 | Tech 实施中需要快速迭代 |
| 安全意识 | 明确 Agent 提案权 / 签名权分离 | Tech 方向必须设计安全的权限系统 |

### 3. 最想深入的 Tech 领域

按优先级：

1. **Agent Wallet + Session Key**
   - 目标：写一个可运行的原型，展示 Agent 如何拥有受限的「提案权」
   - 技术栈：Rhinestone Smart Sessions 或类似 ERC-7579/ERC-4337 框架
   - 验收标准：能在测试网上完成一笔由 Agent 发起、人工签名的交易

2. **Settlement & Escrow 状态机**
   - 目标：把 6 状态（Created → Funded → Delivered → Accepted → Released/Refunded/Disputed）写成 Solidity 合约
   - 技术栈：Foundry + Solidity + 最小 Next.js 前端
   - 验收标准：能在测试网上完成买家打款、卖家交付、买家确认、资金释放的完整流程

3. **AI Security Guard 层**
   - 目标：给 Agent 增加确定性规则拦截，防止 Prompt Injection 诱导转账
   - 技术栈：Python Guard 层 + 审计日志 + 仿真模拟
   - 验收标准：能够检测和拦截恶意合约地址、超出预算的转账请求

---

## 为什么不选 Ops

| 维度 | 自我评估 |
|------|----------|
| 社群运营 | Week 1 没有主动组织过共学、答疑或社区活动 |
| 活动策划 | 更乐于做原型，而不是做活动流程或协调安排 |
| Partnership | 对商业合作、赞助对接等运营型任务动力不足 |
| 值得学习 | 愿意在 Tech 质量达标后，用副业时间补一些项目管理和社区协作能力 |

---

## 为什么不选 Research

| 维度 | 自我评估 |
|------|----------|
| 理论研究 | 喜欢研究，但更喜欢把研究转化为代码 |
| 论文/报告 | 能写分析报告，但不会主动选择长期只产出文档 |
| 技术深度 | Research 需要对某个细分领域有极深理解，我的优势在于快速原型和迭代 |
| 兼容性 | 可以在 Tech 实施过程中做小规模研究，但不会主攻 Research |

---

## Week 2 的 Tech 路线图

```
Week 2 Day 1-2: 补齐模块 B 合约部署（Base Sepolia 真实 tx hash）
Week 2 Day 3-4: 学习 Rhinestone Smart Sessions，完成最小 Session Key 原型
Week 2 Day 5-6: 把 Escrow 6 状态机写成 Solidity 合约，配一个最小前端
Week 2 Day 7: 整理 Week 2 Build Log，准备 Week 3 进阶
```

---

## 需要的支持

1. **Session Key 框架选型建议**：Rhinestone Smart Sessions / ZeroDev / Biconomy 中哪个更适合 Week 2 最小原型？
2. **Monad 测试网实践**：推荐的 RPC、浏览器、Faucet 和 SDK 是什么？
3. **Tech 方向提交物标准**：是更看重「能运行的代码」还是「设计文档 + 伪代码」？
4. **AI Security 测试资源**：是否有推荐的 Prompt Injection 测试集或 Guard 规则模板？

---

> 本文件为 Week 2 方向选择的初步理由。已确定选择 **Tech 方向**，并将在 Week 2 专注于 Agent Wallet / Escrow / AI Security Guard 的可运行实现。
