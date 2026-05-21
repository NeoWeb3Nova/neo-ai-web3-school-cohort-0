# 模块 C｜最小交叉实验设计

> 实验目标：把 LLM / Agent 的输出与链上执行用「人工确认」桥接起来，验证 Week 1 的完整链路。
> 状态：设计中 → 待模块 B 完成后执行

## 实验名称

**Agent-Assisted On-Chain Transaction**（Agent 辅助链上交易）

## 核心链路

```
User Intent
    ↓
Agent 理解 + 生成交易参数（to, value, data / 合约调用参数）
    ↓
Agent 输出结构化提案（JSON / Markdown）
    ↓
【Human-in-the-Loop】人工复核：目标地址、金额、Gas 上限、操作类型
    ↓
用户在自己的钱包（MetaMask / Rabby）中签名并广播
    ↓
链上确认 → 区块浏览器验证
    ↓
Agent 读取链上状态，返回执行摘要
```

## 最小可执行版本（MVP）

### 场景：Agent 建议更新 SimpleStorage 合约中的数值

1. **Agent 侧**：读取当前合约 `storedData` 值 → 根据用户意图生成建议新值（如 `42`）
2. **Agent 输出提案**：
   ```json
   {
     "proposal": {
       "contract": "0x...",
       "network": "Sepolia",
       "function": "set(uint256)",
       "parameters": [42],
       "estimated_gas": 50000,
       "reasoning": "用户要求将存储值更新为 42"
     },
     "warnings": [
       "此操作将消耗 Gas 并上链，无法撤销",
       "请核对合约地址是否为您的部署地址"
     ],
     "required_confirmations": ["人工在钱包中签名"]
   }
   ```
3. **人工复核**：用户核对合约地址、数值、网络
4. **钱包执行**：用户在 Remix / MetaMask 中手动调用 `set(42)`
5. **链上验证**：记录交易哈希，Agent 后续读取 `get()` 验证状态变更

## 安全边界（不可协商）

| 层级 | 规则 |
|------|------|
| 私钥隔离 | Agent 永不接触私钥、助记词、钱包密码 |
| 签名隔离 | 签名动作必须在用户控制的钱包中完成，Agent 只生成提案 |
| 网络隔离 | 主网操作需要额外确认步骤；测试网作为默认实验环境 |
| 回滚检查 | 对于写入操作，Agent 必须明确提示「不可撤销」 |

## 伪代码

```python
# Agent 侧逻辑（概念演示，非生产代码）

class AgentBridge:
    def propose_transaction(user_intent: str, contract_address: str) -> dict:
        # 1. 理解意图
        intent = parse_intent(user_intent)  # e.g., "把 storedData 改成 42"
        
        # 2. 读取链上当前状态（只读，不消耗 Gas）
        current_value = call_contract(contract_address, "get()")
        
        # 3. 生成提案
        proposal = {
            "action": "write",
            "contract": contract_address,
            "function": "set(uint256)",
            "params": [intent.new_value],
            "current_state": current_value,
            "warnings": [
                "此操作消耗 Gas 并永久上链",
                "请确认合约地址正确"
            ]
        }
        return proposal
    
    def verify_execution(tx_hash: str, contract_address: str) -> dict:
        # 等待确认后读取新状态
        receipt = wait_for_receipt(tx_hash)
        new_value = call_contract(contract_address, "get()")
        return {
            "status": "confirmed" if receipt.status == 1 else "failed",
            "block_number": receipt.blockNumber,
            "gas_used": receipt.gasUsed,
            "new_state": new_value
        }
```

## 与 Week 1 任务的对应关系

| Week 1 模块 | 本实验覆盖点 |
|------------|------------|
| A｜Agent / Workflow | Agent 理解意图 → 生成结构化输出 |
| B｜钱包 / 签名 / 交易 | 人工在钱包中签名广播 |
| B｜合约部署 | 调用已部署的 SimpleStorage |
| C｜交叉实验 | AI 输出 → 人工复核 → 链上执行的完整闭环 |

## 执行 checklist

- [ ] 模块 B 完成：已有测试钱包、已部署 SimpleStorage 合约
- [ ] 记录合约地址到本文件
- [ ] 在 Agent 中模拟一次「意图 → 提案」流程
- [ ] 在钱包中手动执行提案交易
- [ ] 记录交易哈希、Gas、区块高度
- [ ] Agent 读取链上新状态并返回摘要
- [ ] 截图或记录整个流程到 `daily/2026-05-20.md`

## 记录模板（执行后填写）

```
实验时间: 2026-05-??
合约地址: 0x...
用户意图: "将 storedData 更新为 42"
Agent 提案输出: （粘贴 Agent 生成的 JSON）
人工复核确认: ✅ 地址正确 / ✅ 数值正确 / ✅ 网络为 Sepolia
钱包签名时间: ...
交易哈希: 0x...
Gas Used: ...
区块高度: ...
状态变更验证: storedData 从 ? 变为 42
浏览器链接: https://sepolia.etherscan.io/tx/0x...
```
