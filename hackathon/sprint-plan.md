# Sprint Plan | OPC Agent Treasury —— 到 6/12 提交截止

> **状态：正式方案（ACTIVE）**  
> **替代**：本方案替代 `hackathon/sprint-plan.md`（原 PactGuard Sprint Plan），已废弃。

---

## 时间线总览

```
6/06 (周六)  ── 方案定稿 + 旧方案废弃 + CAW SDK 调研 ── 今天
6/07 (周日)  ── Mock CAW Client 开发 + Pact 字段设计
6/08 (周一)  ── Agent 运行时（内容 + 投放）+ 正常流 Demo
6/09 (周二)  ── 审计报表 + 异常拦截 + Demo 脚本定稿
6/10 (周三)  ── Demo 视频录制 + README 重构
6/11 (周四)  ── 最终检查 + 提交前打包
6/12 (周五)  ── 12:00 提交截止
```

---

## 详细任务分解

### Phase 1: 方案定稿 & 环境准备（6/06）

| 任务 | 完成标准 | 风险 |
|------|---------|------|
| 新提案定稿 | `submissions/hackathon-proposal-cobo-opc-treasury.md` 完成 | 低 |
| 旧方案标记废弃 | 原提案文件重命名为 DEPRECATED，添加废弃说明 | 低 |
| Direction Card 更新 | `hackathon/direction-card.md` 更新为新方向 | 低 |
| CAW SDK 安装测试 | `pip install cobo-caw` 或确认安装方式 | **高**: 可能未发布pypi包 |
| CAW 测试环境申请 | 确认 pairing 流程、API Key 获取方式 | **高**: 可能需要等待审批 |

### Phase 2: Mock 开发 & 核心逻辑（6/07–6/08）

| 日期 | 任务 | 完成标准 |
|------|------|---------|
| 6/07 | Mock CAW Client | `mock_caw_client.py` 实现：`create_card_pact()`、`submit_payment()`、`get_audit_logs()`、`revoke_pact()` |
| 6/07 | Pact 字段设计 | Card Pact 字段标准化：`agent_id`、`monthly_budget`、`vendor_whitelist`、`single_tx_limit`、`cooldown_hours`、`owner_address` |
| 6/08 | 内容 Agent 运行时 | `content_agent.py`：模拟 Midjourney/OpenAI/Unsplash 的采购请求 |
| 6/08 | 投放 Agent 运行时 | `ad_agent.py`：模拟广告充值的采购请求 |
| 6/08 | 正常流 Demo | `python run_demo.py --flow normal` 输出完整开卡→支付→成功链路 |

### Phase 3: 审计 & 异常检测（6/09）

| 任务 | 完成标准 |
|------|---------|
| 审计报表生成器 | `audit_reporter.py`：读取 Mock CAW 日志，输出 Markdown/CSV 报表 |
| 异常检测模拟器 | `threat_simulator.py`：模拟 5 种异常场景（超量、未知地址、预算耗尽、时间异常、频率异常） |
| 拦截演示 | `python run_demo.py --flow attack` 展示 CAW 在签名前拒绝异常请求 |
| Demo 脚本定稿 | 3 分钟逐字稿：开场 30s → 正常流 60s → 审计 30s → 拦截 60s |

### Phase 4: 文档 & 视频（6/10）

| 任务 | 完成标准 |
|------|---------|
| Demo 视频录制 | 5 分钟内，含 CLI 录屏 + 关键输出高亮 |
| README 重构 | 安装/运行/架构/场景/CAW 集成说明全包含 |
| 项目 README | `hackathon/project/README.md` 精修 |

### Phase 5: 提交（6/11–6/12）

| 日期 | 任务 |
|------|------|
| 6/11 | 最终代码检查 + 敏感信息扫描 |
| 6/11 | 提交物清单核对（6 项必备） |
| 6/12 10:00 | 提前 2 小时提交至官方平台 |
| 6/12 12:00 | **提交截止** |

---

## 每日检查点

每天 21:00 前更新 `daily/YYYY-MM-DD.md`：
1. 今日完成任务
2. 明日最高优先级任务（仅限 1 项）
3. 阻塞项 / 需 mentor 支持的问题
4. CAW SDK / 测试网进展

---

## 关键路径

```
方案定稿 ──→ Mock CAW Client ──→ Agent 运行时 ──→ 审计+拦截 ──→ Demo 视频 ──→ README ──→ 提交
     ↑___________________________________________________________________________________|
              (若 CAW SDK 不可用，Mock 路径可独立跑完全流程)
```

---

## 成功定义 (Definition of Done)

- [ ] `python run_demo.py --flow normal` 3 分钟内展示"开卡→正常支付→审计报表"
- [ ] `python run_demo.py --flow attack` 展示异常拦截
- [ ] README 包含：OPC 用户故事、架构图、安装步骤、运行命令、CAW 集成说明
- [ ] Demo 视频 ≤ 5 分钟，上传到可访问平台
- [ ] 提交官网表单完成，收到确认
- [ ] 无敏感信息泄露

---

## 提交物清单

| # | 提交物 | 计划路径 |
|---|--------|---------|
| 1 | GitHub Repo | `neo-ai-web3-school-cohort-0/hackathon/project/` |
| 2 | README | `project/README.md` |
| 3 | Demo 视频 | `project/demo/video/` + 上传平台 |
| 4 | 项目演示链接 | 如有 CLI demo 则附运行命令 |
| 5 | 使用 CAW 的关键代码 | `project/src/mock_caw_client.py` + 真实 SDK 接入点 |
| 6 | 链上交互证据 | 测试网地址、tx hash（如有）或 Mock 截图 |

---

## 资源需求

| 资源 | 用途 | 状态 |
|------|------|------|
| CAW Python SDK | 真实 Pact 创建/支付/审计 | 待调研安装 |
| CAW 测试环境 | 配对 / API Key | 待申请 |
| Base Sepolia USDC | 测试网交易 | 待获取水龙头 |
| Demo 录制工具 | 视频制作 | 已具备（OBS/asciinema） |

---

> 所属: AI x Web3 School Cohort-0 | 赛道: Cobo | 项目: OPC Agent Treasury  
> 废弃方案: PactGuard（见 `submissions/hackathon-proposal-cobo-agentic-payment.md` DEPRECATED）
