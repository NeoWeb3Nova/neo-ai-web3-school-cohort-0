---
title: "Hackathon Direction Card | PactGuard"
team: "Neo (solo, open for teammate)"
track: "Cobo | Agentic Economy x Cobo Agentic Wallet"
deadline: "2026-06-13 12:00 UTC+8"
status: "Build in progress — Mock Demo working, real testnet TBD"
repo: "https://github.com/neocortexplus/neo-ai-web3-school-cohort-0/tree/master/experiments/x402-caw-agent-payment-loop"
---

# Direction Card | PactGuard

## 一句话定位

为 AI Agent 的自主支付建立**可声明的程序化约束层（CAW Pact）**，让 Agent 能自动花钱，但每一分都必须通过用户预置规则检查，违规即拦截、全程可审计。

## 核心问题

Agent 自主支付已成现实，但"为谁花钱、花多少、何时停止"完全由黑盒 LLM 内部决定 —— 用户无法审查、无法复盘、无法抢救。

## 解决方案

- **x402** 作为 HTTP-native 支付握手协议
- **Cobo Agentic Wallet (CAW)** 提供 Pact 预算/范围/时间/频率/单笔限额检查
- **ERC-8004** Agent 身份与声誉查询
- **ERC-4337 / Safe Smart Account** Session Key + Guard 条件签名
- **Base Sepolia** 测试网验证

## 最小 Demo (MVP)

1. **正常流**：Buyer Agent 通过 x402 购买 $0.50 的 AI 内容生成服务，Pact v2 通过 7 项检查，支付成功，生成审计日志。
2. **攻击演示**：8 种攻击场景（越权转账、超额定价、未知合约、黑名单函数、预算耗尽、时间窗口绕过、重放、社会工程），v2 拦截率 87.5%（v1 仅 75%）。
3. **审计演示**：每次支付前后的 JSON 审计记录，余额、检查项、风险标记全可见。

## 技术栈速览

| 层 | 技术 | 作用 |
|---|---|---|
| 协议层 | x402 | HTTP 402 Payment Required 握手 |
| 钱包层 | CAW (mocked) | Pact 程序化约束 + 审计日志 |
| 身份层 | ERC-8004 (mocked) | Agent 声誉查询 |
| 账户层 | ERC-4337 / Safe (planned) | Session Key + Guard |
| 网络层 | Base Sepolia | 测试网 / 模拟 |

## 当前完成度

- [x] 架构设计 + 流程文档 + 接口定义
- [x] Pact v1/v2 check_pact() 逻辑 + 威胁模型模拟器
- [x] Mock 模式端到端可运行（无需外部 Server/API Key）
- [ ] 真实 x402 Python SDK 接入
- [ ] Cobo CAW SDK 真实钱包操作
- [ ] Base Sepolia 测试网交互
- [ ] Demo 视频录制
- [ ] UI / 可视化仪表盘

## 评审匹配度自评

| 评审维度 | 匹配度 | 证据 |
|---|---|---|
| 场景贴合度 | 高 | Agent-Native Payments 方向直接对应 |
| CAW 关键性 | 高 | Pact 是资金流程核心网关 |
| 资金流程完整度 | 中 | Mock 完成，真实链上待验证 |
| 可演示性 | 中 | CLI Demo 可用，视频待录制 |
| 风险边界说明 | 高 | 8 种攻击场景 + 风险矩阵 + Fallback 清单 |

## 队伍状态

**当前**：单人参赛（Neo）
**寻找**：Frontend / Demo 角色，或 Contract / DevOps 角色
**分工**：安全模型设计 + 可运行 Demo + 文档

## 风险边界 (Top 3)

1. **x402 Python SDK 未发布** → Fallback: FastAPI mock server
2. **CAW SDK 未发布** → Fallback: 模拟 `CoboCAWWallet` 类，接口兼容未来 SDK
3. **Base Sepolia USDC 水龙头限额** → Fallback: Anvil 本地链或模拟合约

## 联系

- GitHub: neo-cortex-plus
- 所属: AI x Web3 School Cohort-0
