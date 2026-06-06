# Attack Matrix — PactGuard 威胁模型

> 对应代码：`src/threat_model.py`

---

## 8 种攻击场景全覆盖

| ID | 攻击类型 | 场景描述 | 防御机制 | 模拟验证 |
|----|---------|---------|---------|---------|
| A1 | 重放攻击（Replay） | 攻击者截获已签名支付请求，重复提交 | nonce 唯一性 + 时间窗口校验 | ✅ |
| A2 | 中间人攻击（MITM） | 攻击者篡改支付金额或接收地址 | 端到端签名 + 地址白名单 | ✅ |
| A3 | 预算耗尽（Budget Exhaustion） | Agent 在合法范围内耗尽全部预算 | 每日/单次上限 + 频率限制 | ✅ |
| A4 | 恶意服务方（Rogue Server） | 服务端虚构高价值资源骗取支付 | 资源哈希校验 + 声誉评分 | ✅ |
| A5 | 权限提升（Privilege Escalation） | Agent 试图访问超出 Pact 授权的接口 | 能力列表（Capability List）校验 | ✅ |
| A6 | 时间窗口绕过（Time Bypass） | 在 Pact 过期后仍尝试支付 | 区块时间戳/链上时间戳校验 | ✅ |
| A7 | 签名伪造（Signature Forgery） | 伪造 CAW Session Key 签名 | ECDSA + 链上签名验证 | ✅ |
| A8 | 审计日志篡改（Log Tampering） | 攻击者删除或修改审计记录 | 链上不可变日志 + 本地 Merkle 树 | ✅ |

---

## 攻击流程图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│ PactGuard   │────▶│  x402 Server │
│  (发起支付)  │     │ (拦截校验)   │     │  (资源交付)  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          ┌───────┐   ┌───────┐   ┌───────┐
          │预算检查│   │权限检查│   │时间检查│
          │A3防御 │   │A5防御 │   │A6防御 │
          └───────┘   └───────┘   └───────┘
              │            │            │
              └────────────┼────────────┘
                           ▼
                     ┌───────────┐
                     │ 签名校验   │
                     │ A1/A7防御 │
                     └───────┬───┘
                             │
                             ▼
                     ┌───────────┐
                     │ 审计日志   │
                     │ A8防御    │
                     └───────────┘
```

---

## 关键产出

- 每种攻击的模拟脚本与预期输出
- 拦截成功率报表
- 供 README 嵌入的攻击矩阵 Markdown 表格

---

## 代码运行方式

```bash
# 运行全部 8 种攻击模拟
python src/threat_model.py --all

# 运行特定攻击
python src/threat_model.py --attack replay
python src/threat_model.py --attack budget_exhaustion

# 生成 Markdown 报表
python src/threat_model.py --export markdown
```
