# Week 3 加分挑战｜Week 4 技术验证计划

> 所属：AI × Web3 School 共学营 Cohort 0 Week 3 加分挑战  
> 项目：PactGuard — AI Agent 的程序化支付约束与攻击拦截  
> 赛道：Cobo｜Agentic Economy × Cobo Agentic Wallet  
> 作者：Neo（GitHub: NeoWeb3Nova）  
> 日期：2026-06-03  
> 提交截止参考：2026-06-12（Hackathon 最终提交）

---

## 一、当前状态快照（Week 3 结束）

| 模块 | 状态 | 说明 |
|------|------|------|
| 架构设计 | ✅ 完成 | architecture.md + flow.md + 状态机 |
| Mock 客户端 | ✅ 完成 | pseudo-agent-client.py --pact-version v2 可自包含运行 |
| 威胁模型模拟器 | ✅ 完成 | 8 种攻击路径，v2 拦截率 87.5% |
| Pact 配置 | ✅ 完成 | snake_case 标准化，v1/v2 切换支持 |
| 文档 | ✅ 完成 | README + interfaces + risks |
| **x402 真实 SDK 调用** | ⏳ 待验证 | 当前为 Mock Server，需替换为真实 x402 Python SDK / FastAPI 中间件 |
| **Cobo CAW 真实环境** | ⏳ 待验证 | 当前为 Python 模拟类 `CoboCAWWallet`，需对接真实 CAW API 或测试环境 |
| **测试网交易** | ⏳ 待验证 | 当前无链上签名，需 Base Sepolia 真实 USDC 转账 + tx hash |
| **合约交互 / Safe Account** | ⏳ 待验证 | 当前无合约调用，需部署/交互 PactGuard 日志合约或 Safe Session Key |
| **Demo 截图 / 视频** | ⏳ 待验证 | 需在真实环境或稳定 Mock 下录制 3 分钟演示 |

---

## 二、Week 4 关键技术验证清单

### 2.1 Agent Trace 与 SDK 调用验证

| # | 技术点 | 验证目标 | 验收标准 | 风险 / Fallback |
|---|--------|----------|----------|-----------------|
| T1 | **x402 Python SDK 安装与调用** | 确认 x402 官方 Python 客户端可用 | `pip install x402` 成功，能构造 `PaymentRequirements` 对象并序列化为 402 响应头 | SDK 未发布则手写 FastAPI 中间件，保持接口兼容 |
| T2 | **x402 Client 识别 402 + 签名重试** | 真实 `requests` 库捕获 HTTP 402，解析 `X-Payment-Required`，构造 Payment Proof | 端到端：Client → 402 → 签名 → 200，日志打印完整链路 | 若 SDK 未提供 Client 端，保留现有 `BuyerAgent` 逻辑，仅替换 Server 层 |
| T3 | **Cobo CAW SDK 接入** | 查询 Cobo 是否提供 Python / JS SDK；若有，接入 `check_pact()` 等价接口 | 能调用真实 CAW API 创建/查询 Pact，返回预算剩余和权限列表 | CAW 未发布公开 SDK 时，继续用模拟类，但接口设计与 CAW API 文档保持一致 |

### 2.2 测试网交易验证

| # | 技术点 | 验证目标 | 验收标准 | 风险 / Fallback |
|---|--------|----------|----------|-----------------|
| T4 | **Base Sepolia 水龙头 & 账户** | 获取测试网 ETH + USDC，确认地址有余额 | BaseScan Sepolia 可查地址余额 > 0 | 水龙头限额则换地址或改用 Anvil 本地分叉 |
| T5 | **测试网转账 tx hash** | 从 EOA 向另一地址发送 USDC，获取真实交易回执 | 交易状态 Success，返回可查询的 tx hash，BaseScan 显示确认 | 无 USDC 合约则用原生 ETH transfer，降低复杂度 |
| T6 | **Idempotency + 重放防护** | 同一 Payment Proof 二次提交，链上或 Facilitator 层拒绝重复扣款 | 第二次请求返回 409 / 错误回执，余额未二次扣减 | 若无法接入真实 Facilitator，在 Mock 层加强 idempotency 检查并记录 |

### 2.3 合约交互与权限控制验证

| # | 技术点 | 验证目标 | 验收标准 | 风险 / Fallback |
|---|--------|----------|----------|-----------------|
| T7 | **ERC-4337 Safe Smart Account 创建** | 在 Base Sepolia 部署 Safe 1-of-1 或 1-of-2，配置 Session Key | Safe 合约地址可查询，Session Key 仅被授予「转账限额内签名」权限 | 部署复杂则改用 EOA + 链下 Pact 检查，保留架构接口 |
| T8 | **Session Key 权限边界** | 验证 Session Key 只能在 Pact 允许范围内签名；超限交易被 Safe Guard 拒绝 | 尝试超限额转账时 Safe 返回 revert / Guard 拦截，交易不上链 | Safe Guard 配置复杂则改为链下拦截（当前 v2 逻辑），链上仅做普通转账 |
| T9 | **PactGuard 日志合约（可选）** | 部署最小审计合约，记录 `audit_hash + timestamp + spender` | 每笔支付后写入事件 Event，链上可查询历史 | 若部署时间不够，审计日志保留链下 JSON，标注「生产环境可迁移至链上」 |

### 2.4 日志记录与审计验证

| # | 技术点 | 验证目标 | 验收标准 | 风险 / Fallback |
|---|--------|----------|----------|-----------------|
| T10 | **结构化审计日志输出** | 每次 check_pact / sign / receipt 生成统一格式 JSON | 字段：`audit_id`, `timestamp`, `pact_id`, `tx_hash`, `checks_passed`, `alert_level` | 已部分实现，需统一字段并补全 `tx_hash` 真实值 |
| T11 | **审计日志不可篡改校验** | 对单条日志计算 SHA-256，写入链上或本地 Merkle 树 | 可验证单条日志未被事后修改 | 链上存储成本高则本地保留 + 提交时附带 hash |
| T12 | **Console / File 双通道日志** | 运行时同时输出人类可读日志和机器可读 JSON | `run_demo.py` 执行后，目录下生成 `audit-YYYYMMDD.jsonl` | 已接近完成，需标准化写入路径 |

### 2.5 Demo 与截图验证

| # | 技术点 | 验证目标 | 验收标准 | 风险 / Fallback |
|---|--------|----------|----------|-----------------|
| T13 | **Mock 模式 Demo 视频** | 录制 3 分钟屏幕：正常流 + 1 种攻击拦截 + 审计日志 | 视频格式 MP4，上传至 GitHub / 飞书 / Google Drive，README 嵌入链接 | 无需额外依赖，优先完成 |
| T14 | **测试网 Demo 截图** | BaseScan 上显示真实 tx hash 的交易详情截图 | 截图含 tx hash、Status = Success、Token Transfer 字段 | 若测试网不稳定，保留 Mock 视频为主，截图作为加分项 |
| T15 | **终端运行截图** | `python run_demo.py` 执行结果终端截图 | 显示 ✅ 正常流通过 + ❌ 攻击被拦截 + 审计日志路径 | 已有 Mock 运行输出，直接截图即可 |

---

## 三、Week 4 执行路线图（6/4 – 6/11）

```
6/04 (周四) ──► T1 T2 │ x402 SDK 调研 + 安装测试，替换 Mock Server 为真实 FastAPI 或 SDK 封装
6/05 (周五) ──► T3 T4 │ Cobo CAW 环境申请 / 文档阅读；Base Sepolia 水龙头 + 账户准备
6/06 (周六) ──► T5 T6 │ 测试网真实转账，获取 tx hash；验证 idempotency 逻辑
6/07 (周日) ──► T7 T8 │ Safe Smart Account 部署（若时间允许）；Session Key 权限实验
6/08 (周一) ──► T9     │ PactGuard 日志合约部署（可选加分）
6/09 (周二) ──► T10-12 │ 审计日志标准化 + 不可篡改校验 + 文件输出
6/10 (周三) ──► T13-15 │ 录制 Demo 视频、截图、README 精修
6/11 (周四) ──► 最终检查 │ 完整运行一次 `run_demo.py`，确认所有链接有效，准备 6/12 提交
```

---

## 四、可复查材料清单

| 材料 | 当前链接 / 位置 | Week 4 补充目标 |
|------|-----------------|-----------------|
| **代码仓库** | `experiments/x402-caw-agent-payment-loop/` | 新增 `run_demo.py` 一键入口；新增 `real_*.py` 真实 SDK 分支 |
| **README** | `experiments/x402-caw-agent-payment-loop/README.md` | 更新状态、新增「如何接入真实环境」章节 |
| **架构文档** | `architecture.md` | 若引入 Safe / 合约，更新架构图 |
| **验证截图** | 待补充 | `assets/week4-screenshots/` 目录下存放 BaseScan + 终端截图 |
| **Demo 视频** | 待补充 | `assets/demo-pactguard.mp4` 或外部链接 |
| **任务看板** | 本文件即为计划看板 | 每日更新 `daily/` 记录实际验证进度 |
| **Mentor 提问记录** | Cohort 群 / Office Hour | 若 T3/T7 遇阻，在 Co-learning 时间提问并记录答复 |

---

## 五、关键决策与 Fallback 原则

1. **优先证明「可运行」而非「完美」**：Hackathon 评审看的是 Demo 可演示、逻辑可验证。Mock 模式 + 清晰文档 > 半吊子的真实链上代码。
2. **真实链上验证是加分项，不是必选项**：Base Sepolia tx hash 能大幅提升可信度，但如果 6/10 前仍无法获取，全力把 Mock 视频和文档做到极致。
3. **所有真实密钥隔离**：测试网私钥仅存在于本地 `.env`（已加入 `.gitignore`），永不提交到仓库。截图中若出现私钥/助记词，必须打码。
4. **每日提交 `daily/`**：验证进度即学习进度，每日记录卡点和解决路径，本身就是可复查材料。

---

## 六、与 Hackathon 评审标准的映射

| 评审维度 | Week 4 验证点对应 |
|----------|------------------|
| **代码可运行** | T1-T2（x402 SDK）、T10-T12（审计日志文件输出） |
| **有效检查** | T3（CAW Pact 真实接口）、T5-T6（测试网交易真实执行） |
| **有审计轨迹** | T10-T12（结构化日志 + hash 校验） |
| **有文档** | README 更新、本计划文档、Demo 视频 |
| **与 Cobo 赛道关联** | T3（CAW SDK）、T7-T8（Safe + Session Key） |

---

*文件位置*: `submissions/week3-bonus-technical-validation-plan.md`  
*关联项目*: `experiments/x402-caw-agent-payment-loop/`  
*Hackathon Proposal*: `submissions/hackathon-proposal-cobo-agentic-payment.md`  
*作者*: Neo（Nova001 的搭档）  
*日期*: 2026-06-03
