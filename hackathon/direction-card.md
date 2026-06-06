# Hackathon Direction Card | OPC Agent Treasury

> **状态：正式方案（ACTIVE）**  
> **替代**：本方案替代并废弃此前 `hackathon/direction-card.md`（PactGuard）方向。

---

title: "Hackathon Direction Card | OPC Agent Treasury"
team: "Neo (solo, open for teammate)"
track: "Cobo | Agentic Economy x Cobo Agentic Wallet"
deadline: "2026-06-13 12:00 UTC+8"
status: "方案重构完成 — 新方向 OPC Agent Treasury，旧方案 PactGuard 已废弃"
repo: "https://github.com/neocortexplus/neo-ai-web3-school-cohort-0/tree/master/hackathon/project/"

---

# Direction Card | OPC Agent Treasury

## 一句话定位

为 OPC（一人企业/小小微企业）提供 **AI 员工的财务卡包系统**——基于 CAW（Cobo Agentic Wallet），让每个 Agent 都有自己的预算卡，能自主花钱、不超支、可追溯、可一键吊销。

## 核心问题

OPC 老板雇佣了 5-10 个 Agent 员工，但所有 Agent 买 API、付外包、充广告都需要老板当人肉 ATM。给了私钥怕被黑，不给就卡死，月底对账更是噩梦。

## 解决方案

- **Cobo Agentic Wallet (CAW)**：为每个 Agent 发行虚拟「公司卡」——Pact 定义预算、白名单、限额、冷却期
- **Agent Runtime**：Agent 需要花钱时，向 CAW 提交支付请求
- **CAW 策略引擎**：服务端校验预算、地址、频率、时间 → 通过则 MPC 签名执行，拒绝则返回结构化原因
- **审计系统**：每笔支付自动生成不可篡改记录，月末一键导出报表
- **异常熔断**：偏离历史行为模式时自动拦截 + 警报 + 一键吊销

## 最小 Demo (MVP)

### 闭环 1：正常采购（开卡→花钱）
1. 老板在 CAW 为"内容 Agent"创建 Content-Card Pact：月预算 200 USDC，白名单 OpenAI/Midjourney/Unsplash
2. 内容 Agent 发起 Midjourney 订阅支付（30 USDC）
3. CAW 校验通过 → MPC 自动签名 → 支付成功 → 老板收到推送"剩余 170"

### 闭环 2：月末审计（看账）
1. 财务 Agent 调用 CAW API 拉取本月交易
2. 自动生成结构化报表：按 Agent、供应商、金额、剩余预算聚合
3. 导出 CSV，老板 5 分钟看完

### 闭环 3：异常拦截（防黑）
1. 凌晨 3 点，内容 Agent 被 Prompt Injection 攻击，试图向新地址转 500 USDC
2. CAW 异常检测：金额异常 + 未知地址 + 非工作时间 → **签名前拒绝**
3. 老板早上看到警报，一键吊销 Content-Card Pact

## 技术栈速览

| 层 | 技术 | 作用 |
|------|------|------|
| 协议层 | x402 / 直接链上转账 | 支付通道 |
| 钱包层 | **Cobo Agentic Wallet（CAW）** | Pact 策略引擎、MPC 签名、预算控制、审计 |
| 身份层 | ERC-8004 / 自注册 | Agent 身份绑定 |
| 网络层 | Base Sepolia / Base Mainnet | 低 Gas、USDC 生态活跃 |
| 应用层 | Python Agent Runtime + CAW SDK | Agent 调用 CAW API |

## 当前完成度

- [x] 新方案设计完成（本文件）
- [x] 旧方案标记废弃（原 PactGuard 提案存档）
- [ ] CAW SDK 安装与测试环境对接
- [ ] Mock CAW Client 开发
- [ ] 内容 Agent / 投放 Agent 运行时开发
- [ ] 审计报表生成器
- [ ] 异常检测模拟器
- [ ] Demo 视频录制
- [ ] README 重构

## 评审匹配度自评

| 评审维度 | 匹配度 | 证据 |
|----------|--------|------|
| 场景贴合度 | **高** | OPC Agent 员工采购 API/服务 = Agentic Economy 的最小真实单元 |
| CAW 关键性 | **高** | CAW 是"发卡行+风控引擎+审计系统"三位一体，没有替代方案 |
| 资金流程完整度 | **中** | 概念验证完成，Mock 开发中，真实链上待验证 |
| 可演示性 | **中** | CLI Demo 规划完成，视频待录制 |
| 风险边界说明 | **高** | 白名单/限额/冷却期/异常检测/吊销，五层防护 |

## 队伍状态

**当前**：单人参赛（Neo）
**寻找**：Frontend / Demo 角色，或 Contract / DevOps 角色
**分工**：OPC 场景设计 + CAW 集成 Demo + 文档

## 风险边界 (Top 3)

1. **CAW SDK 未发布 / 测试环境不可用** → Fallback: MockCAWClient，接口与 CAW API 保持兼容
2. **Base Sepolia USDC 水龙头限额** → Fallback: Anvil 本地分叉或纯 Mock 演示
3. **单人时间紧** → 范围锁定在"2 个 Agent + 3 个供应商 + 审计报表"的最小闭环

## 联系

- GitHub: neo-cortex-plus
- 所属: AI x Web3 School Cohort-0
