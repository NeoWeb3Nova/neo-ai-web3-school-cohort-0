# Sprint Plan | PactGuard — 到 6/12 提交截止

> 基于 `submissions/hackathon-proposal-cobo-agentic-payment.md` Week 4 Sprint 扩展细化。
> 当前日期: 2026-06-03 (周三) | 剩余: 10 天

---

## 时间线总览

```
6/03 (Wed)  ── 代码可运行化完成 ── Mock 模式 + v2 Pact + 威胁模型 ✅ 今天
6/04 (Thu)  ── 接入真实 x402 SDK / 测试网交互
6/05 (Fri)  ── Cobo CAW 测试环境申请 / SDK 接口验证
6/06 (Sat)  ── Demo 视频脚本撰写 + 首次录制
6/07 (Sun)  ── Demo 视频精剪 + README 重构
6/08 (Mon)  ── 端到端本地验证 + 文档精修
6/09 (Tue)  ── 攻击场景可视化输出 + 审计日志报表
6/10 (Wed)  ── 预演 + 社区反馈收集 (Office Hour)
6/11 (Thu)  ── 最终检查 + 提交前打包
6/12 (Fri)  ── 12:00 提交截止
6/13 (Sat)  ── Demo Day (如被选中)
```

---

## 详细任务分解

### Phase 1: Core Demo Stabilization (6/03–6/04)

| 日期 | 任务 | 完成标准 | 负责人 | 风险 |
|---|---|---|---|---|
| 6/03 | Mock 模式自包含运行 + v2 Pact 合并 | `python pseudo-agent-client.py --pact-version v2` 通过 | Neo | 低 |
| 6/03 | 威胁模型模拟器 A6 修复 + 全 8 场景验证 | 8/8 攻击输出与预期一致 | Neo | 低 |
| 6/04 | 接入 x402 Python SDK (如已发布) | `pip install x402` 成功，client 可发真实 402 请求 | Neo | **高**: SDK 未发布则切 Fallback |
| 6/04 | Base Sepolia USDC 水龙头申请 | 钱包有余额可用于测试交易 | Neo | **中**: 水龙头限额 |

### Phase 2: Real Integration (6/05–6/06)

| 日期 | 任务 | 完成标准 | 风险 |
|---|---|---|---|
| 6/05 | Cobo CAW 测试环境申请 / 文档阅读 | 确认 CAW SDK 安装方式、API 端点 | **高**: SDK 可能未公开 |
| 6/05 | Safe Smart Account Session Key 调研 | 确认 Base Sepolia 上 Safe 4337 模块可用性 | 中 |
| 6/06 | 若真实 SDK 不可用，固化 Fallback Mock | README 明确标注 "模拟组件" 与 "未来接入点" | 低 |
| 6/06 | Demo 脚本撰写 (3 分钟结构) | 脚本定稿：开场 30s → 正常流 60s → 攻击演示 60s → 审计 30s | 低 |

### Phase 3: Documentation & Demo (6/07–6/09)

| 日期 | 任务 | 完成标准 |
|---|---|---|
| 6/07 | Demo 视频录制 + 精剪 | 5 分钟内，包含 CLI 录屏 + 关键输出高亮 |
| 6/07 | README 重构 (项目级) | 安装/运行/架构/攻击矩阵/审计示例全包含 |
| 6/08 | 攻击场景可视化输出 | Markdown 表格 + ASCII 架构图，可嵌入 README |
| 6/08 | 审计日志报表生成器 | `python export_audit.py --format markdown` 输出 |
| 6/09 | 端到端完整验证 | 从 `git clone` 到 `python run_demo.py` 全流程零报错 |

### Phase 4: Polish & Submit (6/10–6/12)

| 日期 | 任务 | 完成标准 |
|---|---|---|
| 6/10 | Office Hour 预演 + 反馈 | 在 TG / WeChat 群分享 Demo 视频，收集反馈 |
| 6/11 | 最终代码检查 + 敏感信息扫描 | 无 .env / 无私钥 / 无 mnemonic / 无 API key 残留 |
| 6/11 | 提交物打包清单核对 | 6 份必备材料齐全 |
| 6/12 10:00 | 提前 2 小时提交至官方平台 | 官网表单 + GitHub repo + 视频链接全部就位 |
| 6/12 12:00 | **提交截止** | 确认收到确认邮件 / 页面状态 |

---

## 每日检查点 (Daily Standup)

每天 21:00 前更新 `daily/YYYY-MM-DD.md` 记录:
1. 今日完成任务
2. 明日最高优先级任务 (仅限 1 项)
3. 阻塞项 / 需 mentor 支持的问题
4. 真实 SDK / 测试网进展

---

## 关键路径 (Critical Path)

```
Mock Demo 稳定 ──→ 接入 x402 SDK (或 Fallback 固化) ──→ Demo 视频 ──→ README 重构 ──→ 提交
         ↑___________________________________________________________________________|
                    (若 SDK 不可用，Fallback 路径可提前至 6/5 完成，不阻塞整体进度)
```

---

## 成功定义 (Definition of Done)

- [ ] `python run_demo.py` 在全新环境中 3 分钟内跑通正常流 + 攻击演示
- [ ] README 包含: 架构图、安装步骤、运行命令、攻击拦截矩阵、审计日志示例
- [ ] Demo 视频 ≤ 5 分钟，上传到可访问平台 (YouTube / Bilibili / 腾讯会议云录制)
- [ ] 提交官网表单完成，收到确认
- [ ] 无敏感信息泄露

---

## 资源需求

| 资源 | 用途 | 获取方式 | 状态 |
|---|---|---|---|
| x402 Python SDK | 真实 402 支付握手 | GitHub / pip | 待发布 |
| CAW SDK / 测试环境 | 真实 Pact 检查 | Cobo 官方申请 | 待申请 |
| Base Sepolia USDC | 测试网交易 | 水龙头 / 桥接 | 待获取 |
| Safe 4337 Module | Session Key + Guard | Safe{Wallet} 文档 | 调研中 |
| GLM-5.1 API (ZI) | 长程任务 / 内容生成 | Z.AI DevPack | 备选 |
| Demo 录制工具 | 视频制作 | OBS / asciinema | 已具备 |

---

> 所属: AI x Web3 School Cohort-0 | 赛道: Cobo | 项目: PactGuard
