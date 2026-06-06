# AI x Web3 Agentic Builders Hackathon — 推进中心

> **状态更新：方案已重构。新方案 OPC Agent Treasury 替代原方案 PactGuard。**
> 
> **新项目名**：OPC Agent Treasury —— 一人企业的 AI 员工财务卡包  
> **旧项目名**：PactGuard —— AI Agent 的程序化支付约束与攻击拦截（已废弃，见 `submissions/hackathon-proposal-cobo-agentic-payment.md` 存档）  
> **赛道**：Cobo ｜Agentic Economy × Cobo Agentic Wallet  
> **方向**：05 ｜ A2A Economy → 也兼容 01 ｜ Agent-Native Payments  
> **提交截止**：2026-06-13 12:00（UTC+8）｜ 剩余 6 天

---

## 方案重构说明

**2026-06-06 决定**：经评估，原 PactGuard 方案（聚焦"攻击拦截"的技术演示）与真实用户痛点脱节。新方案 **OPC Agent Treasury** 切入 OPC（一人企业/小小微企业）的真实财务现状：

- 1 个人管公司，5-10 个 Agent 员工 7x24 运转
- 每个 Agent 买 API/付外包/充广告都需要老板当人肉 ATM
- 给了私钥怕被黑，不给就卡死，月底对账更是噩梦

**新方案为每个 Agent 发行 CAW 「公司虚拟卡」**——有预算、有用途白名单、有时间窗口、有自动审计。Agent 能自主花钱，老板能睡安稳觉。

---

## 目录导航

### 本次项目推进（新方案）

| 目录 | 内容 |
|---|---|
| `project/` | 参赛项目代码 + 文档 + Demo |
| `project/README.md` | 项目一句话介绍与快速开始 |
| `project/src/` | 核心代码（Agent 运行时、Mock CAW Client、审计报表生成器、异常模拟器） |
| `project/docs/` | 技术文档（规则、进度、架构、流程） |
| `project/demo/` | Demo 视频、截图、演示素材 |
| `project/submission/` | 最终提交物清单 |

### 规则与资源

| 目录 | 内容 |
|---|---|
| `project/docs/01-hackathon-rules.md` | 赛道规则全纪录（含提交要求、评审标准） |
| `project/docs/02-sprint-tracker.md` | 冲刺进度追踪（每日更新） |
| `resources/` | 外部参考资料（CAW 文档、x402 白皮书等） |

### 提案与计划

| 文件 | 状态 | 说明 |
|------|------|------|
| `submissions/hackathon-proposal-cobo-opc-treasury.md` | **正式方案** | OPC Agent Treasury 提案（本次 Hackathon 主提案） |
| `submissions/hackathon-proposal-cobo-agentic-payment.md` | 已废弃 | 原 PactGuard 方案（DEPRECATED，存档参考） |
| `direction-card.md` | **已更新** | 新方向 Direction Card |
| `sprint-plan.md` | **已更新** | 新方向 Sprint Plan（替代原 PactGuard Sprint Plan） |
| `overview.md` | 存档 | 活动信息汇总（通用，未变） |
| `repo-skeleton.md` | 存档 | 仓库骨架设计 |
| `vc-*` | 存档 | VC 视角输入 |

---

## 今日行动点

1. 打开 `project/docs/02-sprint-tracker.md`，在对应日期下更新进度
2. 打开 `project/submission/01-checklist.md`，确认已完成项与阻塞
3. 代码工作在 `project/src/`，Demo 素材在 `project/demo/`

---

## 里程碑时间线（新方案）

```
6/06 ✅ 方案重构完成 + 旧方案废弃标记
6/07 → Mock CAW Client + Pact 字段设计
6/08 → Agent 运行时 + 正常流 Demo
6/09 → 审计报表 + 异常拦截 + Demo 脚本
6/10 → Demo 视频录制 + README 重构
6/11 → 最终检查 + 打包
6/12 → 提交
```

---

## 快捷链接

- 官网：https://casualhackathon.com/hackathons/cmpsjubkg0003p80kxuzrdyjy
- 报名：https://casualhackathon.com/registrations?eventId=cmpsjubkg0003p80kxuzrdyjy
- API 补贴：https://docs.google.com/forms/d/e/1FAIpQLSdPXXZBoos9CsP2vA_rmD6blm7a-cvAsJ6XdVvLCjepY0sNrg/viewform
- TG：t.me/aiweb3school
