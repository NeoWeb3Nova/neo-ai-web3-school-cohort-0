# 【废弃方案存档】PactGuard —— AI Agent 的程序化支付约束与攻击拦截

> **状态：DEPRECATED（已废弃）**  
> **替代方案**：`submissions/hackathon-proposal-cobo-opc-treasury.md`（OPC Agent Treasury —— 一人企业的 AI 员工财务卡包）  
> **废弃原因**：经重新评估，PactGuard 方向聚焦于"攻击拦截"，场景过于技术化，与真实用户（OPC 老板）的日常痛点脱节。新方案 OPC Agent Treasury 直接解决"一人企业如何管理 Agent 员工的钱"这一真实需求，叙事更有共鸣，CAW 的不可替代性更自然。

---

## 原方案核心内容（存档）

### 三句话电梯演讲

> **问题**：让 AI Agent 自主支付是可行的，但"为谁花钱、花多少、什么时候自动停止"这些边界完全由黑盒 LLM 内部决定，用户无法审查、无法复盘、无法抢救。  
> 方案：建立一套**可声明的程序化支付约束（CAW Pact）**——在任何支付发生前，Agent 必须在用户预置的预算、合约白名单、时间窗口、频率上限内通过全部检查；违规时自动拒绝、记录审计、触发冷静期。  
> 最小 Demo：一个 Buyer Agent 通过 x402 协议自动购买 AI 推理服务，在 CAW Pact v2 保护下抵御 8 种攻击场景。

### 原技术路径

| 层 | 技术 | 作用 |
|------|------|------|
| 协议层 | x402 | HTTP 402 Payment Required 握手 |
| 钱包层 | CAW (mocked) | Pact 程序化约束 + 审计日志 |
| 身份层 | ERC-8004 (mocked) | Agent 声誉查询 |
| 账户层 | ERC-4337 / Safe (planned) | Session Key + Guard |
| 网络层 | Base Sepolia | 测试网验证 |

### 原最小 Demo

1. **正常流**：Buyer Agent 通过 x402 购买 $0.50 的 AI 内容生成服务，Pact v2 通过 7 项检查，支付成功，生成审计日志。
2. **攻击演示**：8 种攻击场景（越权转账、超额定价、未知合约、黑名单函数、预算耗尽、时间窗口绕过、重放、社会工程）。
3. **审计演示**：每次支付前后的 JSON 审计记录。

### 相关文件

| 文件 | 位置 | 状态 |
|------|------|------|
| 原始提案 | `submissions/hackathon-proposal-cobo-agentic-payment.md` | 存档 |
| 技术验证计划 | `submissions/week3-bonus-technical-validation-plan.md` | 存档（部分验证点可复用） |
| Mock 实验代码 | `experiments/x402-caw-agent-payment-loop/` | 存档（接口设计可参考） |
| Sprint Plan | `hackathon/sprint-plan.md` | 存档 |
| Direction Card | `hackathon/direction-card.md` | 存档 |

### 可复用资产

以下组件在新方案中可复用或参考：

- **Pact 字段设计**：`budget_limit`、`vendor_whitelist`、`single_tx_limit`、`cooldown_period` 等字段可直接迁移到 OPC Agent Treasury 的 Card Pact 设计
- **审计日志格式**：JSON 审计输出结构保持不变
- **威胁模型模拟器**：8 种攻击场景的拦截逻辑可复用为"异常检测引擎"
- **Mock CAW 客户端**：接口设计参考现有实现，调整为 OPC 场景

### 废弃记录

- **废弃日期**：2026-06-06
- **决策人**：Neo
- **决策依据**：与导师讨论后确认，Hackathon 评审更看重"解决真实用户痛点"而非"展示安全技术能力"；OPC 场景更贴近 Cobo 赛道"Agentic Economy"的本质

---

*本文件仅供存档参考，不再更新。*
