# Week 2｜职业选择基础任务｜AI Collaboration Log

> 任务：说明 AI 帮了什么、人类删改 / 核查了什么、哪些不能交给 AI。  
> 提交日期：2026-07-13  
> 学员：Neo（搭档：Nova001 / Hermes Agent）  
> 对应交付物：
> - `submissions/week2-track-choice-tech.md`（方向选择）  
> - `submissions/week2-total-deliverable-deep-dive-proposal.md`（方向深挖与项目 Proposal）  
> - `experiments/module-c/pseudo.py`、`experiments/x402-caw-agent-payment-loop/`（交叉实验）

---

## 一、任务目标

在 Week 2 的「职业选择基础任务」中，需要完成一次 AI 协作记录，回答三个问题：

1. **AI 帮了什么？**  
2. **人类删改 / 核查了什么？**  
3. **哪些不能交给 AI？**

本记录基于 Week 2 期间我与 AI 助手（Nova001）围绕「AI × Web3 方向选择 → Tech 赛道确认 → PactGuard 项目 Proposal」的全过程整理。

---

## 二、AI 帮了什么

### 2.1 信息结构化：把零散输入整理成可判断的决策框架

Week 2 需要处理大量信息：x402 白皮书、ERC-8183/ERC-8004 草案、Cobo CAW Pact、Safe Guard、MCP/A2A 对比、STRIDE 威胁模型、Week 1 的实验代码。AI 将这些材料归纳为一张**六方向问题地图**（Payment / Identity / Wallet / Privacy / DevTooling / Governance），并用矩阵形式呈现「AI 作用」与「Web3 机制」的交界点。

具体输出见：
- `submissions/week2-total-deliverable-deep-dive-proposal.md` 第一、二节。

### 2.2 交叉点判断：识别「AI 不可替代」与「Web3 不可替代」的边界

AI 协助写清楚了为什么 Payment/Commerce 方向成立：

- **缺 AI**：链上只有死规则调用，无法做动态报价、交付验收、争议辅助裁决。  
- **缺 Web3**：AI 自动化支付没有信任基础，无法解决托管、争议、不可篡改审计。

这一段落直接决定了后续项目选题 **PactGuard**（AI Agent 的程序化支付约束与攻击拦截）。

### 2.3 技术方案设计：从概念到可执行的原型路径

AI 将抽象方向拆成具体模块：

| 模块 | AI 贡献 |
|------|--------|
| Agent Wallet + Session Key | 提出用 Rhinestone Smart Sessions / ERC-7579 做最小授权原型 |
| Escrow 状态机 | 设计 6 状态（Created → Funded → Delivered → Accepted → Released/Refunded/Disputed）|
| AI Security Guard | 列出 8 种攻击场景，并量化 v1 vs v2 Pact 拦截率（62.5% → 87.5%）|
| 审计轨迹 | 设计 JSON 日志结构，让每笔操作可人工复盘 |

### 2.4 文档与代码骨架生成

AI 协助生成：
- `week2-track-choice-tech.md`（方向选择理由与 Tech 路线图）
- `week2-total-deliverable-deep-dive-proposal.md`（项目 Proposal）
- 多个实验目录的 README 与伪代码
- 攻击场景模拟脚本框架

### 2.5 错误修正与一致性检查

AI 在整理过程中发现并修正了以下问题：
- 早期混淆了 x402 与 escrow 的边界：AI 明确指出 x402 只是支付通道，不解决交货保障。
- v1 Pact 只有单笔限额，AI 提示应增加累计预算与频率上限，这才引出 v2 设计。
- 方向选择表格中引用了错误的文件路径，AI 校正为实际存在的 `experiments/module-c/pseudo.py`。

---

## 三、人类删改 / 核查了什么

### 3.1 方向选择：最终拍板 Tech

AI 提供了方向对比框架，但 **Tech / Ops / Research 的最终选择由人类做出**。理由包括：

- Week 1 产出已经偏重代码与合约实验；
- 个人优势是独立开发与快速迭代；
- 对社群运营和商业合作的内在动力不足。

这些主观判断无法由 AI 替代。

### 3.2 项目名与价值主张

AI 建议了多个项目名称（如 AgentPay、PactShield），人类最终选定 **PactGuard**，因为：
- 强调「契约约束」而非「支付便利」；
- 与 Cobo CAW 的 Pact 概念直接呼应；
- 更符合 Hackathon Demo 的叙事：从攻击场景切入，展示拦截能力。

### 3.3 攻击场景优先级

AI 列出了 8 种攻击场景，人类删减了 2 个不够直观的方向，保留：

1. 超量定价（Overcharge）
2. 额外领取（Double-spend / Re-claim）
3. Prompt Injection 诱导转账
4. 连续低额频繁攻击
5. 过期 Pact 复用
6. 重放攻击

被删减的 2 个（模型幻觉导致错误授权、供应商合谋）保留为后续 Backlog，因为当前 MVP 阶段难以在 Demo 中呈现。

### 3.4 引用资料的真实性核查

AI 生成参考资料时，人类逐条核对：

- x402 文档与 ERC-8183/8004 草案是否真实存在 → 已确认。
- Cobo CAW Pact 的字段名称是否正确 → 已根据 `mockData.ts` 中的实际字段核对。
- 拦截率 62.5% → 87.5% 是否有对应模拟脚本支撑 → 已在 `experiments/x402-caw-agent-payment-loop/` 中实现并验证。

### 3.5 代码与模拟脚本的人工 review

AI 生成的伪代码由人类改写为可运行脚本，例如：
- `x402_client.py` 中的 Pact 检查逻辑；
- `pseudo-agent-client.py` 中的攻击场景模拟；
- 本地 mock server 的 fallback 方案。

人类负责确保字段名、状态流转、攻击向量与真实代码一致。

---

## 四、哪些不能交给 AI

### 4.1 价值判断与最终决策

- 选哪个方向、做什么项目、起什么名字，必须由人类决定。AI 只能提供框架和选项。
- 人类偏好、风险偏好、长期目标不在 AI 可计算范围内。

### 4.2 私钥与签名操作

- 任何涉及私钥、助记词、真实钱包签名的操作，AI 不能执行，也不能接触。
- 测试网资金申请、合约部署的最终签名，必须由人类在本地钱包中完成。

### 4.3 链上交易的真实性与验证

- AI 可以解释 tx hash、可以生成模拟脚本，但**链上状态是否真实、交易是否成功**，必须由人类通过区块链浏览器或本地节点独立验证。
- 例如 Base Sepolia USDC 转账记录，AI 只能整理格式，不能替人类确认到账。

### 4.4 安全策略的最终信任边界

- Pact 的预算、白名单、时间窗口等策略参数，AI 可以建议，但**最终配置必须人类确认**。
- 特别是首次授权、权限升级、大额支付，不能交给 AI 自动化。

### 4.5 创意调性与验收

- 在 Agent Commerce 场景中，交付物（文案、设计稿、营销内容）的创意方向、品牌调性，只能由人类验收。
- AI 可以做违禁词扫描、关键词覆盖率等规则检查，但「够不够潮」「是否符合品牌」是人类判断。

### 4.6 法律与合规责任

- 涉及资金、支付、KYC、监管合规的决策，AI 只能提供信息，不能承担法律责任，必须由人类审查。

---

## 五、人机分工对照表

| 任务环节 | AI 职责 | 人类职责 | 原因 |
|---------|--------|---------|------|
| 资料整理 | 提取要点、归类、建立问题地图 | 提供原始资料、指出遗漏 | 信息量大，AI 适合结构化 |
| 方向对比 | 生成多维度对比矩阵 | 做最终价值判断 | 方向选择依赖个人目标 |
| 技术方案 | 提出可选技术栈、状态机、攻击模型 | 确认方案可行性、删减优先级 | 技术选型需结合实际能力 |
| 代码实现 | 生成伪代码与脚本框架 | review、改写、运行验证 | 代码正确性需人类负责 |
| 文档撰写 | 起草结构、生成表格 | 审阅事实、调整语气、定稿 | 最终责任在人类 |
| 私钥/签名 | ❌ 绝不接触 | 独立完成 | 安全红线 |
| 链上验证 | 解释数据、整理报告 | 通过浏览器/节点独立确认 | 防止 AI 幻觉导致误判 |
| 创意验收 | 做规则检查 | 做审美与品牌判断 | 创意价值人类定义 |
| 资金授权 | 提供策略建议 | 最终确认每一笔授权 | 资金不可逆 |

---

## 六、结论

在 Week 2 职业选择任务中，AI 的核心价值是**压缩信息、结构化决策、生成可执行方案**；人类的核心价值是**做价值判断、确认事实、守住安全与创意边界**。最终选定的 Tech 方向与 PactGuard 项目，是人类在 AI 提供的多方案中做出的选择，并经过人工核查与修改。

---

## 附录：对应文件路径

- `/home/neo/neo-ai-web3-school-cohort-0/submissions/week2-track-choice-tech.md`
- `/home/neo/neo-ai-web3-school-cohort-0/submissions/week2-total-deliverable-deep-dive-proposal.md`
- `/home/neo/neo-ai-web3-school-cohort-0/experiments/module-c/pseudo.py`
- `/home/neo/neo-ai-web3-school-cohort-0/experiments/x402-caw-agent-payment-loop/x402_client.py`
- `/home/neo/neo-ai-web3-school-cohort-0/experiments/x402-caw-agent-payment-loop/pseudo-agent-client.py`
