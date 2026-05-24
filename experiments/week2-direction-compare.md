# Week 2 方向对比 — 5W 风险框架

## 对比维度

| 维度 | Agentic Commerce | AI Security | 模块 C 延伸（治理自动化） |
|------|------------------|-------------|--------------------------|
| Who initiates | 用户 or Agent 发现服务需求 | 用户 or 系统自动监控 | 治理参与者 or 风险信号 |
| Who executes | Agent 协商、报价、支付 | Agent 检测、告警、拦截 | Agent 生成提案、汇总、预警 |
| Who pays | 用户钱包 / Agent Budget | 安全基础设施方（或用户付监控费） | 民小仁 / 社区基金 |
| Who verifies | 服务方收据 + 链上结算记录 | Guard 规则 + 审计日志 | 多签或人工复核 + 链上投票记录 |
| Who bears risk | 用户（支付失败、服务欺诈） | 用户（资产损失）+ 项目方（声誉） | 社区（治理决策失误）+ 协议（资金安全） |

## 方向 A: Agentic Commerce

### 描述
Agent 代表用户发现服务、获取报价、完成支付并留下链上凭证。

### 核心交叉点
- **Machine Payment**: Budget + Quote + Receipt 三层必须同时存在
- **Agent Wallet**: Session Key 只给付款范围，不给无限 allowance
- **Settlement & Escrow**: 高价值服务需要担保/托管，防止付款不收货

### 优势
- 场景真实、可演示性强
- 产品化路径清晰

### 风险
- 支付流程复杂，需要整合多个协议
- 真实用户对 "AI 自动花我的钱" 信任门槛高

## 方向 B: AI Security

### 描述
系统自动检测恶意上下文、工具滥用、非法交易，并在危险时拦截。

### 核心交叉点
- **AI Security**: Prompt Injection / Tool Abuse / Malicious Context 四层防护
- **Agent Wallet**: Guard 层用确定性规则拦截越界动作
- **Audit Log**: 完整链路可回放，支持事后复盘

### 优势
- 技术深度高，差异化明显
- 对任何涉及 Agent 自动化的项目都是基础设施

### 风险
- 防御系统本身不好做 demo（需要攻击场景配合）
- 用户感知弱，容易被视为 "抽象工具"

## 方向 C: 模块 C 延伸（治理自动化）

### 描述
将模块 C 的 "AI 生成提案 → 人工复核 → 链上执行" 延伸到治理场景：
AI 汇总治理提案、分析风险、警告异常，最终人工确认后链上投票或执行。

### 核心交叉点
- **Agent Wallet**: 给 Agent "读取 + 草稿" 的 Session Key，签名权留在多签
- **Machine Payment**: 如果 Agent 需要购买数据服务，有 Budget + Quote 约束
- **AI Security**: 攻击者可能通过伪造治理提案诱导投票，需要内容验证

### 优势
- 有 Week 1 模块 C 原型作为起点，迭代成本低
- 活用性强：可以对接多个 DAO / 治理协议

### 风险
- 治理本身是慢节奏场景，Agent 提效效果难以即时量化
- 需要了解具体 DAO 的治理规则

## 初步倾向

倾向 **方向 C（模块 C 延伸 → 治理自动化）** 或 **方向 A（Agentic Commerce）**。

理由：
1. 方向 C 有现成基础（模块 C 原型已存在），可以快速进入迭代
2. 方向 A 场景最直观，Hackathon demo 效果好
3. 两个方向都可以自然融入 Machine Payment 和 Agent Wallet 的概念
4. 下周一 Co-learning 时与导师 / 同学确认，根据反馈最终决策

## 明确化问题（下周一 Co-learning 讨论用）

1. 如果选方向 C，是否有导师推荐的具体治理协议或 DAO 案例可以对接？
2. 如果选方向 A，是否有现成的 x402 / MPP 实现框架可以复用？
3. 是否允许同时探索两个方向，到 Week 3 再确定最终项目？
