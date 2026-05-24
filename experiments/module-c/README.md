# 模块 C 最小交叉实验

## 一句话说明

让 AI Agent 生成链上操作提案，但不给它签名权——用「提案权 + 人工复核 + 钱包签名」分离风险。

## 核心流程

1. 用户输入目标
2. Agent 生成交易提案（Proposal）
3. Guard 检查（合约白名单、金额上限、风险等级）
4. 人工复核（最终确认）
5. 钱包签名（Agent 不触碰私钥）
6. 链上执行 + 收据生成

## 风险检查点

- Agent 永远只有「提案权」，没有「签名权」
- 任何交易都需要人工确认后才能签名
- Guard 层在交易出门前做最后检查
- 审计日志记录完整链路

## Week 2 增强（今日新增）

- **Budget + Quote**: 如果 Agent 需要调用外部服务获取数据，先获取服务方报价，在预算范围内才执行
- **AI Security**: 所有外部文档、网页内容标记为 untrusted context，防止 Prompt Injection 诱导转账
- **Session Key 履念**: 如果需要给 Agent 自动权限，只给「查询权」和「草稿权」的 Session Key，不给签名权

## 文件结构

- `flow.md` — 流程图与安全检查点
- `pseudo.py` — 可运行伪代码（含 BudgetPolicy + Guard + Agent 流程）
- `README.md` — 本文档

## 如何运行

```bash
python experiments/module-c/pseudo.py
```

## 待迭代

- [ ] 将模拟钱包签名替换为真实钱包工具调用
- [ ] 增加合约模拟执行（使甩 Tenderly / Anvil / Hardhat network）
- [ ] 增加 LLM 调用层，让 Agent 真正生成 Proposal 而非硬编码
