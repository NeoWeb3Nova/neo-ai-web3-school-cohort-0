## 11. 竞品对比（2026 年 Q2 最新实验）

### 11.1 安全模型对比

| 维度 | Cobo CAW | Coinbase CDP | Crossmint AA |
|---|---|---|---|
| **密钥保护** | MPC TSS 分片 | MPC TSS + TEE | 智能合约钱包 |
| **签名方式** | 多方 MPC 协议 | TEE 内签名 | EOA/AA 批量交易 |
| **信任依赖** | 仅依赖数学 | 依赖 Intel SGX | 依赖合约审计 |
| **Agent 签名** | 直接协同签名 | TEE 中签名后上链 | Owner 通过 keeper 签名 |
| **单点失败** | 单方被破不能签名 | TEE 硬件漏洞风险 | keeper 被攻击风险 |
| **用户控制** | 手机 App 审批/撤销 | 仅自然语言提示 | 若用 MPC 则类似 CAW |

### 11.2 功能对比

| 维度 | Cobo CAW | Coinbase CDP | Crossmint AA |
|---|---|---|---|
| **策略精度** | 任务级 Pact 协议 | 钱包级静态策略 | 钱包级静态策略 |
| **审批流程** | App 推送 → Approve/Reject/Adjust | 自然语言确认 | 可能无级别性审批（取决于 keeper） |
| **支付格式** | 仅 crypto 支付 | x402 原生 + gasless | 多链 AA + gasless |
| **多链支持** | 9 条主网（EVM + Solana） | 多链（Base 重点） | 多链（含 Tron） |
| **代币交换** | 需要手动编写合约调用 | Base 生态原生 | 若支持则导于 DEX 合约 |
| **协议级操作** | 完整支持（可编程获取 calldata） | 部分支持 | 取决于 DEX/bridge 接入 |
| **公开程度** | 公开 API 文档，可自主部署 | 公开文档，部分功能需许可 | 公开文档 |
| **开发者友好度** | CLI + SDK + Skills + Recipes + MCP | 只有 API + SDK | SDK + REST API |
| **审计日志** | 每个决策都有结构化日志 | 可能有 | 可能有 |

### 11.3 技术架构对比

| 维度 | Cobo CAW | Coinbase CDP | Crossmint AA |
|---|---|---|---|
| **钱包模型** | MPC 非托管 | MPC + TEE 托管 | AA 智能合约（可能为托管或 non-custodial） |
| **策略引擎** | 基础设施层 Pact | 钱包级静态规则 | 钱包级规则/验证器 |
| **执行模式** | 每个任务单独授权 | 钱包级获得权限 | 钱包级授权 |
| **重用性** | Pact 终止后权限立即失效 | 改变策略后才生效 | 依赖 keeper 执行 |
| **Agent 信任** | 最小化（任务级） | 中等（钱包级） | 中高（钱包级） |

### 11.4 选型建议

**选 Cobo CAW 当**
- 你需要任务级精细控制，每个任务的权限独立管理
- 你需要完整的人工审批流程（App 推送、Approve/Reject/Adjust）
- 你重视 MPC TSS 的数学安全保证
- 你需要支持 EVM + Solana 多链环境
- 你需要充分的审计和合规
- 你需要从 POC 到生产的全栈工具（Skills → CLI → SDK → API）
- 你需要自定义 calldata 编码和任意 EVM/Solana 协议交互

**选 Coinbase CDP 当**
- 你的 Agent 已在 Base 生态内
- 你需要 x402 格式的原生支付
- 你对 TEE 方案有信任
- 你需要 gasless 支付现在就上线

**选 Crossmint AA 当**
- 你主要在 EVM + Solana + Tron 上
- 你已经是 AA 钱包用户
- 你对 keeper 模式有信任
- 你不需要任务级的授权精度

---

## 12. 技术实现细节

### 12.1 Pact-scoped API Key 的生命周期

此设计是 CAW 安全架构的核心之一：

```
PactState 状态变化
    │
    └─→ 自动创建/Revoke Pact-scoped API Key
              │
              └─→ 仅返回给 runtime（不在 Pact detail 中暴露）
                        │
                        └─→ Pact 终止后立即失效（无 grace period）
```

意味着：
- 即使 Pact-scoped key 泄露，它也只能在 Pact active 期间使用
- Pact 终止（完成/过期/撤销）后 key 立即无效
- 不需要手动清理 key，系统自动处理

### 12.2 Execution Plan 格式规范

必须包含以下 4 个标题之一：
- `# Intent`
- `# Summary`
- `# Plan`
- `# Execution Plan`

内容建议结构：
```markdown
# Summary
用一句话描述任务。

# Operations
- 步骤 1
- 步骤 2

# Risk Controls
- 费用限制：每次交易上限 $X
- 频率限制：每天最多 Y 次交易
- 滞留风险：无（执行完成后资金不留在中间帐户）
```

### 12.3 API 错误处理

预期错误状态码：

| 状态码 | 场景 | 建议 |
|---|---|---|
| 400 | 请求格式错误，如无效的 chain_id | 检查参数格式，参考文档 |
| 401 | 认证失败 | 检查 API key 是否有效、是否在正确的 header 中 |
| 403 | 权限不足 | 检查 delegation 是否有效、操作是否在范围内 |
| 404 | 资源不存在 | 检查 wallet_id、pact_id 等 UUID 是否正确 |
| 409 | 冲突，如重复提交或状态不匹配 | 检查当前 Pact 状态，避免重复提交 |
| 429 | 请求过频 | 实施退避策略，增加重试间隔 |
| 500 | 服务器错误 | 检查 Cobo 状态页，重试或联系支持 |

### 12.4 Recipe 资源

Recipe 是 CAW 的预构建 DeFi 组件，包含已编译并验证的合约交互逻辑。Agent 可以：
- 通过 `search_recipes` 查找适用的 recipe
- 通过 `attach_recipes_to_pact` 将 recipe 关联到 Pact，自动设置相关 policy
- 用户在 App 中审批时可以看到关联的 recipe 名称

Recipe 查找时可过滤 `wallet_id`，返回结果会标记已关联到该钱包主动 Pact 的 recipe，避免重复创建。

---

## 13. 常见问题与排错

### 13.1 初始化问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `caw onboard` 卡在 "Waiting for admin..." | 需要管理员确认 | 联系 Cobo 支持完成申请审批 |
| TSS Node 启动失败 | 网络不通 / 端口被占用 | 检查 443 端口通信，确保没有其他 TSS Node 实例在运行 |
| 加密成功后出现错误 | 密码过短或文件权限问题 | 确保密码 ≥ 16 位，检查目录权限 |

### 13.2 Pact 相关问题

| 问题 | 原因 | 解决 |
|---|---|---|
| Pact 提交后用户没收到推送 | App 通知权限未开启 | 检查 App 通知设置 |
| Pact 一直显示 PENDING_APPROVAL | 用户尚未审批 | 让用户检查 App，或者检查是否进入了 `requires_review` 状态 |
| `REJECTED` 后不能重新提交 | REJECTED 状态不可恢复 | 创建新 Pact，不是重试 |
| 策略拒绝（`denied` 而非 `pending`） | 策略触发 deny 条件 | 检查 policy 的 `deny_if` 条件和计数器 |
| API key 突然失效 | Pact 终止了 | Pact-scoped key 在 Pact 终止后立即失效，需要新的 active Pact |

### 13.3 交易相关问题

| 问题 | 原因 | 解决 |
|---|---|---|
| 交易被拒绝 | Policy 拒绝 / gas 不足 / nonce 错误 | 检查 SSE 事件中的 `policy.violated`，检查 gas 和 nonce |
| 交易一直 pending | gas 费用太低 | 使用 `tx speedup` 提高 gas |
| 交易状态不一致 | 链上确认时间差异 | 等待链上确认，使用 `tx get` 查询 |
| 交易被取消 | 用户拒绝 pending 交易 | 检查 `approval.rejected` 事件 |

### 13.4 交互式问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `caw login` 无响应 | TSS Node 未运行或启动超时 | 检查 TSS Node 状态，重启服务 |
| `caw wallet balance` 显示过期地址 | 地址未再次生成 | 调用 `caw address create` 或 `caw address list --chain-id ...` |
| `‘▲‘ 符号问题 | 终端字体不支持箭头 | 使用 Unicode 兼容的终端，或等待 CLI 更新 |

---

## 14. 参考资料

### 官方文档
- Cobo Agentic Wallet 官方手册（完整版）
- Pact policies 完整参考
- Cobo TSS Node 指南

### 代码资源
- GitHub: CoboGlobal/cobo-agentic-wallet
- PyPI: `cobo-agentic-wallet`
- npm: `@cobo/agentic-wallet`

### 常用命令速查表
```
caw onboard                    # 初始化钱包 + TSS Node
caw wallet current             # 显示钱包信息
caw wallet pair --code-only    # 生成配对码
caw address list               # 列出所有地址
caw wallet balance             # 查询余额
caw pact submit ...            # 提交新协议
caw pact status --pact-id ID   # 查看协议状态
caw pact list                  # 列出所有协议
caw pact revoke --pact-id ID   # 撤销协议
caw tx transfer ...            # 发送转账
caw tx call ...                # 执行合约调用
caw tx get --request-id ID     # 查询交易状态
caw tx speedup --tx-id UUID    # 加速交易
caw tx drop --tx-id UUID       # 取消交易
caw recipe search ...          # 搜索预构建组件
caw meta chains                # 列出支持链
caw meta tokens                # 列出代币
caw util eth-call ...          # EVM 状态查询
caw util abi encode ...        # 编码 calldata
caw version                    # 显示版本
caw --help                     # 查看所有命令
```

---

> 报告版本：V2.0 深化版
> 生成时间：2026-06-06
> 基于：Cobo Agentic Wallet 官方手册 + 本地开发文档 + LLM 解读 + 实验测试
