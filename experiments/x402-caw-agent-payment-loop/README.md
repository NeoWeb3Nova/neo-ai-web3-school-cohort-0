# x402 + Cobo CAW Agent 自主支付闭环

## 项目简介

这是 Week 2 Module B 的进阶任务——一个最小化的 **x402 paywall + Cobo CAW Agent 自主支付闭环**。

核心目标不是"自动付款"，而是展示：在明确授权、预算控制和可审计记录下完成自动交易的全流程。

## 场景

**Agent 帮商户生成社交媒体营销内容并自动付款**

- 商户 Alice 授权 Buyer Agent 在 $50 预算内购买营销文案生成服务
- 服务提供方 ContentGen Agent 提供 x402 保护的 AI 推理 API
- CAW Pact 约束 Agent 的花钱范围、操作范围和时间窗口
- 交易完成后，链上留下可审计的结算记录

## 文件结构

```
x402-caw-agent-payment-loop/
├── README.md                ── 本文件：项目总览
├── architecture.md          ── 系统架构图与分层
├── flow.md                  ── 完整交互流程（含状态机）
├── pseudo-server.py         ── x402 Paywall 服务端伪代码
├── pseudo-agent-client.py   ── CAW Agent 客户端伪代码
├── pact-config.json         ── CAW Pact 配置示例（预算/权限/时间窗口）
├── interfaces.md            ── 关键接口说明
└── risks.md                 ── 风险边界分析
```

## 技术栈

| 层 | 技术 |解决问题 |
|---|---|---|
| 身份与声誉 | ERC-8004 | Agent 是谁、信誉如何 |
| 商业执行 | ERC-8183 | Job、Escrow、Evaluator |
| 支付通道 | x402 / MPP | HTTP-native 即时付款 |
| 钱包安全 | Cobo CAW | Pact、预算控制、审计 |

## 状态

- [x] 架构设计完成
- [x] 伪代码完成
- [x] 交互流程完成
- [x] 关键接口说明完成
- [x] 风险边界分析完成
- [ ] 真实测试网 Demo（待推进）
- [ ] 链上交易哈希（待实验）

## 参考资料

- x402 Docs: https://docs.x402.org/
- CAW Manual: https://www.cobo.com/products/agentic-wallet/manual/
- ERC-8183: https://eips.ethereum.org/EIPS/eip-8183
- ERC-8004: https://eips.ethereum.org/EIPS/eip-8004
- CAW x402 Recipe: https://www.cobo.com/agentic-wallet/recipes/x402-payment
