# Handbook Feedback: Settlement & Escrow — 增加与 Agent Wallet 的衔接示例

## 相关页面

https://aiweb3.school/zh/handbook/bridge/settlement-and-escrow/

## 反馈类型

Feature Request / 连接性建议

## 具体建议

建议在 Settlement & Escrow 页面增加「与 Agent Wallet / Machine Payment 的衔接示例」—— 即 Escrow 状态机如何与 Session Key / Budget Policy 在代码层面配合。

例如：
- Agent 的 per-call budget 如何映射到 escrow 的 `fund` 动作
- Guard 如何拦截超出 policy 的 fund 请求
- Receipt 如何成为 Agent Trust & Reputation 的输入

帮助学员理解 escrow 不是孤立合约，而是 Agent 支付链路的一环。

## 提交日期

2026-05-25
