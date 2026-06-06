# PactGuard — AI × Web3 Agentic Builders Hackathon

赛道：Cobo ｜Agentic Economy × Cobo Agentic Wallet
方向：01｜Agent-Native Payments（HTTP 402 自动完成支付，不依赖 API Key）

---

## 一句话简介

PactGuard 是一个让 AI Agent 能在预算约束和权限边界内自主完成 HTTP 402 支付的中间件框架。
商户配置一次 CAW Pact，Agent 即可在测试网安全地完成"请求内容 → 评估预算 → 签名授权 → 链上结算 → 审计留痕"的全流程。

---

## 核心特性

| 能力 | 说明 |
|---|---|
| HTTP 402 原生支付 | Agent 无需 API Key，通过 x402 协议完成付费调用 |
| CAW Pact 预算控制 | 商户预设预算上限、时间窗口、白名单，Agent 超支自动拦截 |
| 威胁模型覆盖 | 8 种攻击场景模拟（重放、中间人、预算耗尽、权限提升等），全流程可审计 |
| 零私钥在线 | Agent 不持有私钥，通过 CAW Session Key 请求签名， humans 保留最终否决权 |
| 测试网可复现 | Base Sepolia 上完整运行，带交易哈希和审计日志 |

---

## 文件结构

```
project/
├── src/                  # 核心代码
│   ├── x402_client.py    # Agent 侧：Pact 校验 + 402 自动响应 + 签名请求
│   ├── x402_server.py    # 服务侧：402 支付墙 + 资源交付 + 链上结算
│   ├── pact_guard.py     # Pact 运行时引擎（预算/权限/时间检查）
│   ├── threat_model.py   # 8 种攻击场景模拟器
│   └── audit_logger.py   # 结构化审计日志与报表导出
├── tests/                # 单元测试与集成测试
├── docs/                 # 架构文档、API 说明、攻击矩阵
├── demo/
│   ├── screenshots/      # 运行时截图与链上证据
│   └── video/            # Demo 视频
└── submission/           # 最终提交物清单与核对表
```

---

## 快速开始

```bash
# 1. 克隆并进入项目
cd project

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量（测试网 RPC，无需真实私钥）
cp .env.example .env
# 编辑 .env 填入 Base Sepolia RPC（Public 即可）

# 4. 启动服务端
python src/x402_server.py

# 5. 启动 Agent 客户端（自动完成 402 支付）
python src/x402_client.py
```

---

## 时间线

| 日期 | 里程碑 |
|---|---|
| 6/03 | Mock 模式 + v2 Pact + 威胁模型稳定 ✅ |
| 6/04 | x402 SDK 接入评估 / Fallback Mock 固化 |
| 6/05 | CAW 测试网验证 / 端到端运行 |
| 6/06 | Demo 视频脚本 |
| 6/07 | 视频录制 + README 重构 |
| 6/10 | Office Hour 预演 |
| 6/12 | **提交截止** |

---

> 详细 Sprint Plan 见 `../sprint-plan.md`
