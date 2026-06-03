# Repo Skeleton | PactGuard

> 完整的仓库结构与文件说明，便于评委、队友、contributor 快速复盘。

---

## 仓库信息

| 项 | 内容 |
|---|---|
| **仓库地址** | https://github.com/neocortexplus/neo-ai-web3-school-cohort-0 |
| **主分支** | `master` |
| **赛道** | Cobo | Agentic Economy × Cobo Agentic Wallet |
| **项目名** | PactGuard — AI Agent 的程序化支付约束与攻击拦截 |
| **队伍** | Neo (solo, open for teammate) |
| **提交截止** | 2026-06-13 12:00 UTC+8 |

---

## 目录结构

```
neo-ai-web3-school-cohort-0/
┌── README.md                           ── 仓库总览、快速导航、Week 4 Ready Pack 入口
│
┌── profile.md                          ── 学员画像（AI × Web3 School Cohort-0）
│   ├── learning-plan.md                 ── 个人学习计划（Week 1–Week 4）
│
┌── daily/                              ── 每日学习打卡与开发日志（YYYY-MM-DD.md）
│   ├── 2026-05-18.md → 2026-06-03.md     ── 共 17 篇日志，涵盖学习、实验、黑客松开发
│
┌── tasks/                              ── 课程任务记录（概念卡、流程图、威胁模型等）
│   ├── week1-*                          ── Week 1 课程任务（AI/Web3 概念卡、合约部署、正误对照）
│   ├── week2-module-*                   ── Week 2 模块任务（A–G，共 5 份）
│
┌── experiments/                        ── 实验与原型代码
│   ├── module-c-minimal-bridge.md         ── Week 2 Module C 最小路由桥实验
│   ├── module-c/                        ── 模块 C 框架文档
│   ├── week2-direction-compare.md        ── 方向比对分析（笔记）
│   └── x402-caw-agent-payment-loop/     ── ☘️ 黑客松核心 Demo
│       ├── README.md                      ── 项目介绍：场景、技术栈、当前状态
│       ├── architecture.md                ── 系统架构图（5 层分层）、流程层次、状态机
│       ├── flow.md                        ── 完整交互流程（10 步步骤 + HTTP 完整报文）
│       ├── interfaces.md                    ── 5 组关键接口定义（x402、CAW Pact、ERC-8004、Facilitator、审计）
│       ├── pact-config.json                ── CAW Pact 配置示例（预算/范围/时间/执行/审计）
│       ├── pseudo-server.py                ── x402 Paywall Server 伪代码
│       ├── pseudo-agent-client.py          ── ☘️ CAW Agent Client 主代码
│       └── threat-model-simulator.py       ── ☘️ 8 种攻击场景模拟器 + v1/v2 拦截对比
│       └── risks.md                       ── 完整风险边界分析（10 种风险 + 矩阵 + 设计原则）
│
┌── hackathon/                          ── ☘️ 黑客松提交材料（Week 4 Ready Pack）
│   ├── direction-card.md               ── ☘️ 方向卡片（一句话定位、问题、方案、MVP、完成度）
│   ├── overview.md                      ── 黑客松官方信息汇总（时间线、奖池、赛道规则、提交要求）
│   ├── hackathon-quickstart.md          ── 参赛速查手册（Open Day 现场信息整理）
│   ├── sprint-plan.md                  ── ☘️ Sprint 计划（到 6/12 的详细日历 + 关键路径）
│   ├── risk-memo.md                     ── ☘️ 风险备忘录（精炼版，含 Top 5 风险 + 评审自查）
│   ├── sponsor-mentor-questions.md      ── ☘️ Sponsor/Mentor 问题清单（19 问题，含已获回答）
│   ├── vc-insights-for-builders.md       ── VC 视角打磨项目的建议
│   ├── vc-perspective-polishing-project.md ── VC 投资视角与创业建议转写（完整版）
│   └── open-day-2026-06-02.md           ── Open Day 录音转写
│
┌── submissions/                        ── 学校任务提交物
│   ├── hackathon-proposal-cobo-agentic-payment.md  ── ☘️ 黑客松正式提案（含 Week 4 Sprint 初版）
│   ├── week1-*                          ── Week 1 任务提交
│   └── week2-module-c-agent-identity.md  ── Week 2 模块 C 提交
│
└── templates/                          ── 笔记模板
    ├── daily-note.md                    ── 日打卡模板
    └── task-note.md                     ── 任务笔记模板
```

---

## 核心代码文件说明

### `experiments/x402-caw-agent-payment-loop/pseudo-agent-client.py`

CAW Agent 客户端主代码。支持:
- **Mock 模式** (默认)：无需外部 Server/API Key，`python pseudo-agent-client.py` 即可运行
- **Pact v1/v2 切换**: `--pact-version v2` 体验安全增强检查
- 完整流程: 服务发现 → 声誉查询 → 402 处理 → Pact 检查 → 签名支付 → 结果接收 → 审计日志

### `experiments/x402-caw-agent-payment-loop/threat-model-simulator.py`

8 种攻击场景模拟器，对比 Pact v1 与 Pact v2 的拦截率:
```bash
python threat-model-simulator.py
# 输出: Intercepted (v1): 6/8 (75%) | Intercepted (v2): 7/8 (87.5%)
```

### `experiments/x402-caw-agent-payment-loop/pact-config.json`

CAW Pact 配置示例，统一使用 snake_case 字段：
- 预算: `max_usd`, `per_transaction_max`, `daily_limit`
- 范围: `allowed_contracts`, `allowed_networks`, `deny_functions`
- 时间: `expires_at`, `allowed_hours`
- 执行: `mode`, `require_human_confirm`, `max_retries`
- 审计: `log_level`, `alert_on_anomaly`

---

## 运行指南

### 快速启动 (Mock 模式，无需外部依赖)

```bash
# 1. Clone
 git clone https://github.com/neocortexplus/neo-ai-web3-school-cohort-0.git
 cd neo-ai-web3-school-cohort-0

# 2. 运行正常流 Demo (Mock 模式，v2 Pact)
 python experiments/x402-caw-agent-payment-loop/pseudo-agent-client.py --pact-version v2

# 3. 运行威胁模型模拟
 python experiments/x402-caw-agent-payment-loop/threat-model-simulator.py
```

### 依赖

- Python 3.10+
- 标准库：`requests`, `dataclasses`, `datetime`, `argparse`, `json`
- 无外部 API Key / 钱包 / 私钥需求

---

## 提交材料索引

### Week 4 Ready Pack (本提交)

| 必交材料 | 文件路径 | 状态 |
|---|---|---|
| Hackathon Direction Card | `hackathon/direction-card.md` | ✅ 已创建 |
| Proposal Memo | `submissions/hackathon-proposal-cobo-agentic-payment.md` | ✅ 已有 |
| Repo Skeleton | `hackathon/repo-skeleton.md` | ✅ 已创建 |
| Sprint Plan | `hackathon/sprint-plan.md` | ✅ 已创建 |
| Risk Memo | `hackathon/risk-memo.md` | ✅ 已创建 |
| Sponsor/Mentor 问题清单 | `hackathon/sponsor-mentor-questions.md` | ✅ 已创建 |

### 历史提交

| 阶段 | 文件路径 |
|---|---|
| Week 1 Pack | `submissions/week1-proof-of-work-pack.md` |
| Week 2 Module A | `tasks/week2-module-a-ai-web3-problem-map.md` |
| Week 2 Module B | `tasks/week2-module-b-payment-commerce-flow.md` |
| Week 2 Module C | `submissions/week2-module-c-agent-identity.md` |
| Week 2 Module D | `tasks/week2-module-d-wallet-permission-safe-execution.md` |
| Week 2 Module F | `tasks/week2-module-f-agent-workflow-threat-model.md` |
| Week 2 Module G | `tasks/week2-module-g-governance-coordination-workflow.md` |

---

## 开发规范

### 命名规约

- 每日打卡: `daily/YYYY-MM-DD.md`
- 任务笔记: `tasks/week{num}-module-{letter}-{description}.md`
- 实验代码: `experiments/{project-name}/{file}.{ext}`
- 黑客松资料: `hackathon/{type}-{description}.md`

### 提交前检查清单

```bash
# 1. 敏感信息扫描
grep -r -i "api_key\|private_key\|mnemonic\|secret\|password\|token" --include="*.py" --include="*.json" --include="*.md" .

# 2. 确认代码可运行
python experiments/x402-caw-agent-payment-loop/pseudo-agent-client.py
python experiments/x402-caw-agent-payment-loop/threat-model-simulator.py

# 3. 确认提交材料齐全
ls hackathon/direction-card.md hackathon/sprint-plan.md hackathon/risk-memo.md hackathon/sponsor-mentor-questions.md
```

---

## 联系与参与

- **Issue / PR**: 本仓库 Issues / PRs 欢迎
- **队友招募**: Frontend / Demo 角色，或 Contract / DevOps 角色（Base Sepolia + Safe 4337）
- **学校社区**: Telegram `t.me/aiweb3school` / WeChat 群

---

> 更新日期: 2026-06-03
> 下次更新: Sprint 计划里程碑日 (6/12 提交前)
