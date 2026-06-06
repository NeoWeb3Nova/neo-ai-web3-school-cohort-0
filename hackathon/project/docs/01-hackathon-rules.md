# AI × Web3 Agentic Builders Hackathon — 规则全纪录

> 来源：https://casualhackathon.com/hackathons/cmpsjubkg0003p80kxuzrdyjy
> 备份时间：2026-06-06

---

## 时间线

- 报名 & 组队：6 月 1 日 — 6 月 13 日 12:00（UTC+8）
- Build Period：6 月 1 日 — 6 月 12 日
- 提交截止：6 月 13 日 12:00（UTC+8）
- Demo Day：6 月 14 日
- 获奖公示：6 月 17 日

---

## Cobo 赛道｜Agentic Economy × Cobo Agentic Wallet

### 赛道建议方向（本项目命中 01｜Agent-Native Payments）

| 编号 | 方向 | 说明 | CAW 角色 |
|---|---|---|---|
| 01 | Agent-Native Payments | HTTP 402 自动完成支付，不依赖 API Key 和人类预注册 | 让 Agent 持有和支配资金 |
| 02 | Trustless Agent Work Agreements | 基于 ERC-8183 的发布→托管→交付→验收/驳回→付款 | Agent 资金账户，接收报酬、支付佣金、管理托管 |
| 03 | Agent Resource Procurement | 自主发现、比价、采购算力/数据/API/存储 | 赋予 Agent 自主采购能力 |
| 04 | Autonomous Trading | 自主执行链上交易策略 | 让 Agent 持有交易资金，授权边界内自主签署交易 |
| 05 | A2A Economy | 多个 Agent 各自拥有钱包，互雇/拍卖/分账 | 每个 Agent 独立 CAW 钱包，Agent 间直接支付/结算/分润 |

### 赛道规则（硬约束）

1. 项目必须围绕 Agent 与资金操作场景展开
2. Agent 的资金相关操作需通过 Cobo Agentic Wallet（CAW）完成
3. Agent 需要具备真实的资金执行能力（支付/转账/结算/收益管理/资产调度），而非仅停留在流程设计层面
4. 项目需体现 CAW 在 Agent 钱包管理、权限控制、安全隔离或自主支付等方面的价值
5. 最终成果需为可运行或可演示的产品原型（Demo），不接受纯 PPT、概念设计或 Mockup

### 提交要求

- [ ] GitHub Repo
- [ ] README 与项目说明文档
- [ ] Demo 视频（建议 3–5 分钟）
- [ ] 项目演示链接（如有）
- [ ] 使用 CAW 的关键代码或配置说明
- [ ] 链上交互证据：测试网地址、Transaction Hash、Agent Wallet 地址、流程截图或操作记录

### 评审侧重点

| 维度 | 权重直觉 | 本项目对应点 |
|---|---|---|
| 场景贴合度 | 高 | HTTP 402 原生支付，Agent 自主调用付费服务 |
| CAW 关键性 | 高 | Pact 是资金流程核心组件，非可替换元素 |
| 资金流程完整度 | 高 | 从请求触发到链上结算完整闭环 |
| 可演示性 | 中 | 稳定 CLI 演示 + 视频 |
| 风险边界说明 | 中 | 8 种攻击场景 + 预算控制 + 审计日志 |

---

## Z.AI 赛道｜Web3 × Long-Horizon Task

本项目也可赛道二作为备选方向，核心长程任务能力体现在：
- Agent 自主拆解任务（生成内容 → 预算评估 → 支付授权 → 审计）
- 多步计划制定与持续执行
- 迭代修复（威胁模型模拟器中的自我纠错）

---

## 通用规则

1. 项目须为本次 Hackathon 期间完成，或能清楚说明活动期间新增贡献
2. 不得提交恶意、欺诈、侵犯隐私或违反相关法律法规的项目
3. 使用第三方 API/SDK/开源代码时，请在 README 中说明
4. 如涉及真实资产、私钥、钱包权限或用户数据，请使用测试环境，并说明权限边界、失败处理和人工介入条件
5. 要求实际运行能力；静态展示/设计稿/未实现方案不在评审范围
6. 每个团队只能提交一个项目，选择最契合的单一赛道

---

## 奖金

- 总奖金池：7000 USDT
- Cobo 赛道：3500 USDT
- Z.AI 赛道：3500 USDT（含 API 补贴支持，数量有限）

---

## 支持资源

- Telegram：t.me/aiweb3school
- 微信：clynn2024（备注 AI × Web3 Agentic Builders Hackathon）
- API 补贴申请：https://docs.google.com/forms/d/e/1FAIpQLSdPXXZBoos9CsP2vA_rmD6blm7a-cvAsJ6XdVvLCjepY0sNrg/viewform

---

## 参考资料

- Cobo 官网：https://www.cobo.com/agentic-wallet
- Recipes：https://agenticwallet.cobo.com/agentic-wallet/recipes
- 文档：https://www.cobo.com/products/agentic-wallet/manual/start-here/introduction
- SDK：https://www.cobo.com/products/agentic-wallet/manual/developer/quickstart-overview
- Z.AI DevPack：https://docs.z.ai/devpack/overview
- Z.AI API：https://docs.z.ai/api-reference/introduction
- GLM-5.1 技术报告：https://z.ai/blog/glm-5.1
- 开源模型：https://huggingface.co/zai-org/GLM-5.1
