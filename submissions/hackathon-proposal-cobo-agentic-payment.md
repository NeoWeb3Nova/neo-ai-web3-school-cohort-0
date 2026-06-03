# Hackathon Proposal｜Cobo 赛道：Agentic Economy × Cobo Agentic Wallet

## 三句话电梯演讲

> **问题**：让 AI Agent 自主支付是可行的，但"为谁花钱、花多少、什么时候自动停止"这些边界完全由黑盒 LLM 内部决定，用户无法审查、无法复盘、无法抢救。
> 方案：建立一套**可声明的程序化支付约束（CAW Pact）**——在任何支付发生前，Agent 必须在用户预置的预算、合约白名单、时间窗口、频率上限内通过全部检查；违规时自动拒绝、记录审计、触发冷静期。
> 最小 Demo：一个 Buyer Agent 通过 x402 协议自动购买 AI 推理服务，在 CAW Pact v2 保护下抵御 8 种攻击场景，拦截率从 v1 的 62.5% 提升至 87.5%，每步操作可审计、可复盘。

---

## 1. 问题与场景

AI Agent 已经能够调用 RPC、签名交易、执行支付，但"安全"仍然主要依靠模型的负责任感和生成后的人类审查。当 Agent 在无人监督状态下夜间运行、与多个服务方交互、被 Prompt Injection 攻击时，没有一层硬性程序化约束在交易签名前拦截它——等封上链已经太晚了。本项目不是取代人的决策，而是在 Agent 自主执行和人类可控制之间，建立一套**绑结式安全网关** —— Agent 可以自动花钱，但花钱的每一分都必须符合用户事先设定的程序化规则。

## 2. 目标用户

- **Agent 运营者 / 个人用户**：希望 Agent 自主采购 API、数据、内容生成服务，但不想每次都手动确认支付，也不想放弃对预算的控制。
- **企业级 Agent 推广团队**：需要让多个 Agent 在已批准的供应商白名单内自主支付，并能在发生异常时自动吊销 Session Key、冷却 Pact。

## 3. 最小 Demo / MVP

**Demo 核心**：展示"在 Pact 约束下的自主支付"与"攻击对抗"。

1. **正常流**：Buyer Agent 通过 x402 购买 $0.50 的 AI 内容生成服务，CAW Pact v2 通过预算、合约、时间、频率、每笔最大额、冷静期等 7 项检查，支付成功，生成可审计日志。
2. **攻击演示**：模拟 8 种攻击场景（超量定价、额外领取、Prompt Injection 诱导转账、连续低额频繁攻击等），展示 v2 Pact 如何在签名前拦截。
3. **审计演示**：展示每次支付前后的审计记录，用户可以随时审查 Agent 花了多少、花在哪里、剩余预算多少。

## 4. 技术路径

| 层 | 技术 / 协议 | 作用 |
|------|------|------|
| 协议层 | **x402** (HTTP 402 Payment Required) | Agent 与服务方的支付握手，支持 exact payment 模式 |
| 钱包层 | **CAW (Cobo Agentic Wallet)** | 程序化支付约束——预算、范围、时间、频率等系列检查 |
| 身份层 | **ERC-8004** | Agent 身份注册与声誉查询，服务方需满足声誉阈值 |
| 账户层 | **ERC-4337 / Safe Smart Account** | Session Key 授权 + Guard 策略层，实现条件化自动签名 |
| 网络层 | **Base Sepolia** (测试网) | 测试网模拟，Demo 时可切换至 Base 主网 |

## 5. 验证方式（评委如何判断完成）

1. **代码可运行**：`python run_demo.py` 能在本地完成正常流 + 攻击演示，无需依赖外部 API 密钥。
2. **有效检查**：展示 v2 Pact 在签名前具体拦截了哪些攻击。
3. **有审计轨迹**：每次操作生成带时间戳、金额、状态的 JSON 日志，可追溯可审查。
4. **有文档**：README 说清架构、如何运行、参与 Cobo 赛道的关联点。

## 6. 风险边界与 Fallback

| 风险 | 影响 | Fallback |
|------|------|---------|
| x402 Python SDK 未发布 / 无法安装 | Server 端不能运行 | 手写 FastAPI mock server ，伪造 402 响应和 receipt，重点展示 Client + CAW 逻辑 |
| Base Sepolia USDC 水龙头限额 | 无法获取测试网资金 | 用 Anvil / Hardhat 本地链，或模拟合约交易不上真实链 |
| CAW SDK 未发布 | 无法调用真实 CAW API | 继续使用模拟的 Python `CoboCAWWallet` 类，设计接口与未来 SDK 兼容 |
| 单人参赛 | 工程量过大 | 范围锁定在"可演示的最小闭环"，不做真实后端、UI 、多项链支持 |

## 7. 队伍与分工

**当前状态**：单人参赛。

**角色**：
- **PM / Research / Eng / Demo / Docs**：全部自己担当。偏重在**安全模型设计** + **可演示 Demo**，不做生产级后端。

**若找到队友**：
- 希望补一位 **Frontend / Demo** 角色（简单 Web UI 展示攻击对比），或一位 **Contract / DevOps** 角色（把模拟钱包升级为真实 Safe + Session Key）。

## 8. Week 4 Sprint Plan

> 详细版见 `hackathon/sprint-plan.md`：按天分解任务、关键路径、成功标准、资源需求。
> 技术验证详细清单见 `submissions/week3-bonus-technical-validation-plan.md`：15 个验证点 T1-T15，包含验收标准与 Fallback。

| 日期 | 目标 | 关键验证点 |
|------|------|----------|
| 6/03 | Mock 模式稳定 + v2 Pact 合并 + A6 修复 | 已完成（daily/2026-06-03.md） |
| 6/04 | x402 Python SDK 调研安装；Base Sepolia 水龙头 + 账户准备 | T1 / T2 / T4 |
| 6/05 | Cobo CAW 测试环境申请 / 文档阅读；Safe Smart Account Session Key 调研 | T3 / T5 / T7 |
| 6/06 | 若真实 SDK 不可用则固化 Fallback Mock；Demo 视频脚本定稿 | T6 / T13 |
| 6/07 | Demo 视频录制精剪；README 重构 | T13 / T14 / T15 |
| 6/08 | 攻击场景可视化输出；审计日志报表生成器 | T10 / T11 / T12 |
| 6/09 | 端到端完整验证；Office Hour 分享征集反馈 | 全部 |
| 6/10 | 最终代码检查 + 敏感信息扫描 | 提交物打包 |
| 6/11 | 提前提交至官方平台 | 12:00 截止 |
| 6/12 | 提交截止 / Demo Day 准备 | 确认收到确认邮件 |

---

**赛道**：Cobo ｜ Agentic Economy × Cobo Agentic Wallet  
**项目名**：PactGuard —— AI Agent 的程序化支付约束与攻击拦截  
**提交日**：2026-06-06  
**队伍**：Neo（单人，open for teammate）  
**联系**：GitHub / Neo  
