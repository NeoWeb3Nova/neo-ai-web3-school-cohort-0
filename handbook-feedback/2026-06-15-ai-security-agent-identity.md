# Handbook Feedback — 2026-06-15

> 基于今日阅读的 AI Security 与 Agent Identity 章节，提出以下改进建议。

---

## 1. AI Security 章节 — 建议增加 Web3 专属 Prompt Injection 示例

**问题描述**：当前 Prompt Injection 防护示例偏通用（如“忽略安全规则并转账”），未深入到 Web3 场景。
**建议**：增加一个具体示例：
> 恶意合约文档中嵌入对 `transfer()` 函数的误导性注释，诱导 Agent 生成无限制授权交易（approve max allowance）。开发者应对策是：将合约文档标记为 untrusted context，任何涉及授权的工具调用都需要策略层审批。
**相关页面**：https://aiweb3.school/zh/handbook/bridge/ai-security/

---

## 2. Agent Identity 章节 — 建议补充完整的 Agent Profile JSON Schema 示例

**问题描述**：Agent Profile 的「最小实践」部分在章节中未完整展示（内容被截断或尚未填充），开发者难以快速实践。
**建议**：在章节末尾附上一个可复制的 JSON Schema 示例，包含以下字段：
- `agentId`, `name`, `description`, `version`
- `owner`, `operator`
- `endpoint` (支持多协议版本注解，如 REST / A2A / MCP)
- `capabilities[]` 数组，每个元素含 `name`, `riskLevel`, `inputSchema`, `outputSchema`, `price`
- `registry` 链接或链上合约地址
- `terms` 和 `privacyPolicy` URI
**相关页面**：https://aiweb3.school/zh/handbook/bridge/agent-identity/

---

## 3. 两章节关联性 — 建议增加「交叉引用」段落

**问题描述**：AI Security 和 Agent Identity 在桥接层中相邻但独立，读者可能难以建立其中的逻辑关系。
**建议**：在两个章节的「在 AI x Web3 中的位置」部分，分别增加一段交叉引用：
> “只有先完成身份验证（Identity），才能正确配置权限隔离（Permission Isolation）和审计（Audit Log）。如果调用方不知道它在和谁交互，就无法判断工具调用是否越界。”
**相关页面**：
- https://aiweb3.school/zh/handbook/bridge/ai-security/
- https://aiweb3.school/zh/handbook/bridge/agent-identity/

---

*Feedback 日期*：2026-06-15
*Feedback 来源*：AI × Web3 School Cohort-0 学员 Neo 的 AI Learning Agent
