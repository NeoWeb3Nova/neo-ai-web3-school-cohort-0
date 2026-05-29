# Week 2｜Agent Identity｜ProposalGuard Agent Profile 草图

> 基于 Module C「最小交叉实验」中链上交易提案 Agent 的完整身份与能力声明。

---

## 一、Agent 身份声明（Who）

| 属性 | 声明 |
|------|------|
| **名称** | ProposalGuard Agent（简称 PGAgent） |
| **身份** | 链上交易意图解析器 + 风险预检员 + 结构化提案生成器 |
| **维护者** | 用户自身 EOA 或多签合约（用户拥有 root 控制权） |
| **部署形态** | 本地 CLI 进程 / MCP Server 节点 / A2A 协议端点 |
| **信任边界** | **仅拥有提案权（Proposal），永不拥有签名权（Signature）** |

**一句话定义**：
PGAgent 是一个「只动嘴、不动手」的链上交易参谋——它理解你的意图、查数据、算风险、写提案，但**永远碰不到你的私钥**。

---

## 二、Capability 能力声明（What）

### 2.1 核心能力矩阵

| 能力 | 说明 | 权限等级 |
|------|------|----------|
| **意图解析** | 将自然语言目标拆解为链上操作步骤 | 内部计算 |
| **数据获取** | 调用外部 API（价格、合约 ABI、Gas 估算） | 需预算 + Quote 确认 |
| **风险预检** | 执行 Guard 规则（白名单、金额上限、方法校验） | 系统级检查 |
| **提案生成** | 输出标准化交易提案（to/value/data + 风险标签） | 输出给人类复核 |
| **AI Security** | 标记不可信上下文（untrusted context），隔离 Prompt Injection | 安全层 |
| **审计记录** | 记录完整决策链路（输入 → 推理 → 输出 → 结果） | 不可篡改日志 |

### 2.2 明确不能做的事（Negative Capability）

- ❌ 不持有、不生成、不传输任何私钥
- ❌ 不直接广播交易到内存池
- ❌ 不在预算外调用付费 API
- ❌ 不执行 Guard 检查失败的交易
- ❌ 不将不可信上下文混入核心推理链路

---

## 三、输入与输出（Interface）

### 3.1 输入

```json
{
  "user_intent": "将 100 USDC 换成 ETH 并质押到 Lido",
  "budget_context": {
    "daily_budget_usd": 10.0,
    "remaining_usd": 7.5,
    "api_quote_accepted": true
  },
  "session_constraints": {
    "allowed_tokens": ["USDC", "ETH", "stETH"],
    "max_single_tx_usd": 1000,
    "allowed_contracts": ["0xA0b...Uniswap", "0xae7...Lido"]
  },
  "untrusted_context": [
    "https://some-blog.com/eth-yield-guide"
  ]
}
```

### 3.2 输出

```json
{
  "proposal_id": "prop-20250529-001",
  "status": "pending_human_review",
  "steps": [
    {
      "step": 1,
      "action": "approve USDC to Uniswap Router",
      "contract": "0xA0b...",
      "value": "0",
      "data": "0x095ea7b3...",
      "estimated_gas": 45000
    },
    {
      "step": 2,
      "action": "swapExactTokensForTokens 100 USDC → ETH",
      "contract": "0x7a2...",
      "value": "0",
      "data": "0x472b43f3...",
      "estimated_gas": 120000
    },
    {
      "step": 3,
      "action": "submit ETH to Lido for stETH",
      "contract": "0xae7...",
      "value": "0.05",
      "data": "0xa1903eab...",
      "estimated_gas": 85000
    }
  ],
  "risk_assessment": {
    "level": "low",
    "flags": [],
    "guard_result": "PASS"
  },
  "budget_consumption": {
    "api_calls_cost_usd": 0.12,
    "remaining_budget_usd": 7.38
  },
  "audit_hash": "sha256:9f86d08..."
}
```

---

## 四、协作对象（Collaborators）

| 协作方 | 角色 | 交互方式 | 信任假设 |
|--------|------|----------|----------|
| **用户** | 意图提供方 + 最终仲裁者 | 自然语言输入 / 提案确认 / 钱包签名 | 完全信任（root of trust） |
| **Guard 系统** | 规则执行引擎 | 本地函数调用（白名单、金额校验） | 与 Agent 同进程，防绕过 |
| **外部 API** | 数据提供者（价格、路由、Gas） | HTTPS + Quote 先确认 | 半信任，按量付费 |
| **MCP Server** | 工具扩展层（链上查询、合约模拟） | MCP 协议（stdio/sse） | 信任但隔离（Capability 粒度授权） |
| **审计日志** | 事后追溯与责任归属 | 本地写入 + 可选上链存证 | 只写不读，防篡改 |

---

## 五、失败点与处理策略（Failure Modes）

| 失败场景 | 根因 | 影响 | 处理策略 |
|----------|------|------|----------|
| **意图理解偏差** | LLM 幻觉 / 用户表述模糊 | 生成错误提案 | 要求用户二次确认 + 步骤可视化 + 模拟执行预览 |
| **Prompt Injection** | 不可信上下文诱导恶意操作 | 提案被污染 | AI Security 层隔离 untrusted context → 标记风险 → 人工复核 |
| **外部 API 失效** | 服务商宕机 / 报价超预算 | 数据缺失或预算耗尽 | 优雅降级：返回「数据不可用，请手动查询后确认」 |
| **Guard 绕过（配置错误）** | 白名单更新滞后 / 合约伪装 | 高风险交易通过检查 | 多签 Guard 更新 + 社区审计 + 紧急暂停开关 |
| **Session Key 泄露** | 若给予自动查询权限后密钥被盗 | 查询隐私泄露 / 预算被刷 | Session Key 仅给「查询权+草稿权」，定时过期，Budget 硬上限 |
| **人工复核疲劳** | 高频交易导致用户盲签 | 安全边界失效 | 累计额度阈值 → 超过后强制冷却期 + 多签升级 |

---

## 六、调用方式（Invocation）

| 模式 | 场景 | 技术方式 |
|------|------|----------|
| **交互式** | 用户主动发起单次交易 | CLI / Chat 界面输入自然语言 |
| **MCP 工具** | 被其他 Agent（如 Nova001）调用 | MCP Server 暴露 `generate_proposal` tool |
| **A2A 协议** | 跨域 Agent 委托交易规划 | A2A Task 消息：`skill=tx-planning` |
| **定时策略** | 定投、复利再投资等自动化 | 用户预设策略 + 每次仍需人工确认（不自动签名） |

---

## 七、收费模型（Economics）

| 费用类型 | 计费方式 | 支付方 |
|----------|----------|--------|
| **推理调用** | 按提案生成次数（本地 LLM 免费，云端按 token） | 用户 |
| **外部 API** | 按实际调用量（先 Quote 后执行） | 用户（从 Budget 扣除） |
| **链上模拟** | Tenderly/Anvil 节点调用费 | 用户 |
| **审计存证** | 可选上链到日志合约的 Gas | 用户 |
| **失败重试** | 前 2 次免费，后续按次收费 | 用户（防止滥用） |

**Budget 硬约束**：
- 每日 API 预算上限（如 $10）
- 单次 Quote 超过剩余预算 50% 时拒绝执行
- 预算耗尽后降级到纯人工模式（Agent 只提供文本建议，不调用外部 API）

---

## 八、验证与审计（Verification）

| 验证层 | 方法 | 验证什么 |
|--------|------|----------|
| **链下自验** | 提案哈希 + 模拟执行（Tenderly/Anvil） | 交易是否会 revert、Gas 是否足够 |
| **Guard 规则验证** | 白名单命中检查 + 金额阈值检查 | 是否超出授权范围 |
| **人工最终验证** | 用户阅读提案 + 钱包签名 | 意图与结果是否一致 |
| **事后审计** | 完整日志（输入 → 推理 → 输出 → 执行结果） | 责任归属与异常追溯 |
| **可选：链上存证** | 将 audit_hash 写入日志合约 | 永久不可篡改的代理行为记录 |

---

## 九、可选加分：MCP vs A2A 协议对比

| 维度 | **MCP（Model Context Protocol）** | **A2A（Agent-to-Agent）** |
|------|-----------------------------------|--------------------------|
| **发明方** | Anthropic（2024.11） | Google + 社区（2025.04） |
| **解决的核心问题** | **接口标准化**：AI 如何统一调用外部工具（文件、数据库、API、浏览器） | **协作标准化**：AI Agent 之间如何发现、委托、协商完成任务 |
| **协议层级** | 工具层（Tool/Resource/Prompt） | 任务层（Task/Artifact/Message） |
| **适合解决哪类问题** | ① Agent **调用**链上数据、钱包模拟、合约 ABI 查询等**能力接口**<br>② 统一工具描述（Capability → JSON Schema） | ① 多 Agent **编排**（PGAgent 委托给 PriceOracleAgent 查价）<br>② **支付协商**（A2A 支持 Skill 报价 + 预算协商）<br>③ **跨域信任**（不同厂商 Agent 之间的任务委托） |
| **支付/收费** | 不直接定义支付层，工具侧自行计费 | 原生支持报价（Quote）→ 协商 → 支付闭环 |
| **Module C 中的角色** | PGAgent 通过 MCP 调用 Guard 检查、链上查询工具 | PGAgent 通过 A2A 接收用户 Agent 的委托任务，或向外部 Price Agent 询价 |
| **互补关系** | MCP 解决「Agent 有什么工具可用」 | A2A 解决「Agent 之间如何协作交易」 |

**一句话总结**：
- **MCP** 是 Agent 的「瑞士军刀接口」——让 Agent 知道怎么调用工具；
- **A2A** 是 Agent 的「商务谈判语言」——让 Agent 之间能谈任务、谈价格、谈交付。

在 Module C 的架构中，**MCP 更适合解决「接口问题」**（标准化链上工具调用），**A2A 更适合解决「协作与支付问题」**（跨 Agent 询价、预算协商、任务委托）。两者不是竞争关系，而是互补：MCP 管「向内集成工具」，A2A 管「向外协作 Agent」。

---

## 十、设计反思

1. **为什么坚持「提案权 ≠ 签名权」？** 因为这是 Agent Identity 的「第一性原理」——AI 可以犯错，但犯错成本必须被人类确认这道防火墙拦截。
2. **Budget + Quote 的经济学意义**：让 Agent 像员工报销一样先申请预算，再执行消耗，防止自动化导致的「预算黑洞」。
3. **AI Security 层的本质**：将互联网上的不可信信息视为「污染输入」，通过隔离带防止其进入核心决策链路——这是「反脆弱」思想在 Agent 架构中的体现。

---

*文件位置*: `submissions/week2-module-c-agent-identity.md`  
*作者*: Neo（Nova001 的搭档）  
*日期*: 2025-05-29
