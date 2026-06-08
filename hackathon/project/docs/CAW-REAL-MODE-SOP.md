# OPC Agent Treasury — CAW 真实模式操作 SOP

> **前置条件**：你已完成以下步骤
> - 在 Ubuntu/WSL 上安装了 `caw` CLI
> - 成功创建/导入了 Wallet
> - 在手机上安装 Cobo Agentic Wallet App 并完成配对
> - 曾经通过手机 Approve 过至少一个 Pact（熟悉流程）
>
> **目标**：将 Hackathon 项目从 Mock 模式切换到 Real 模式，使用真实 CAW SDK 创建 Pact、Approve、转账。

---

## 一、获取 Credentials

在终端运行以下命令，获取接入真实环境所需的三个关键值：

```bash
# 1. 查看当前激活的 Wallet UUID
caw wallet current
# 输出示例：Wallet UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890

# 2. 获取 API Key（用于后端程序调用 SDK）
caw wallet current --show-api-key
# 输出示例：caw_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 3. 确认环境 URL
# Dev 环境（测试用）: https://api-core.agenticwallet.dev.cobo.com
# 生产环境:           https://api.agenticwallet.cobo.com
```

**记录好这三个值**，下一步写入 `.env`：

| 变量名 | 值 | 来源 |
|--------|-----|------|
| `AGENT_WALLET_WALLET_ID` | `a1b2c3d4-...` | `caw wallet current` |
| `AGENT_WALLET_API_KEY` | `caw_sk_...` | `caw wallet current --show-api-key` |
| `AGENT_WALLET_API_URL` | dev 或 prod URL | 见上方 |

---

## 二、配置项目环境变量

```bash
cd /home/neo/neo-ai-web3-school-cohort-0/hackathon/project
cp .env.example .env
```

编辑 `.env`，修改以下行：

```bash
# 切换到真实模式
CAW_MODE=real

# 填入你刚才获取的值
AGENT_WALLET_API_URL=https://api-core.agenticwallet.dev.cobo.com
AGENT_WALLET_API_KEY=caw_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGENT_WALLET_WALLET_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890

# 链和代币（默认 Base + USDC，一般不用改）
CAW_DEFAULT_CHAIN=BASE_ETH
CAW_DEFAULT_TOKEN=BASE_USDC
```

**注意**：
- 不要提交 `.env` 到 git，已配置 `.gitignore` 忽略
- 如果还没有供应商的真实链上地址，`VENDOR_*_ADDR` 可以保持零地址，但真实转账会失败

---

## 三、安装 Python 依赖

项目已配置虚拟环境：

```bash
cd /home/neo/neo-ai-web3-school-cohort-0/hackathon/project
source .venv/bin/activate
pip install cobo-agentic-wallet nest-asyncio
```

验证 SDK 可用：

```bash
python -c "import cobo_agentic_wallet; print(cobo_agentic_wallet.__version__)"
# 期望输出: 0.1.40
```

---

## 四、启动 Backend（Real Mode）

```bash
cd /home/neo/neo-ai-web3-school-cohort-0/hackathon/project/backend
uvicorn main:app --reload --port 8000
```

看到类似输出表示启动成功：

```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4.1 验证连接

在另一个终端窗口运行：

```bash
curl http://localhost:8000/health | python -m json.tool
```

**期望输出**：

```json
{
  "status": "ok",
  "caw_mode": "real",
  "sdk_available": true,
  "wallet_uuid": "a1b2c3d4-..."
}
```

如果 `caw_mode` 是 `mock`，检查 `.env` 是否在当前目录，或手动导出：

```bash
export $(cat /home/neo/neo-ai-web3-school-cohort-0/hackathon/project/.env | xargs)
```

---

## 五、创建并 Approve 真实 Pact

### 5.1 创建 Pact（Card）

```bash
curl -X POST http://localhost:8000/cards \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "Content Agent",
    "monthly_budget": 500,
    "single_tx_limit": 50,
    "vendor_whitelist": [
      {"name": "OpenAI", "address": "0xOpenAIAddr", "category": "api"}
    ],
    "cooldown_hours": 12,
    "duration_days": 30
  }' | python -m json.tool
```

**期望输出**：

```json
{
  "card_id": "pact-xxxxxxxx",
  "agent_name": "Content Agent",
  "status": "PENDING_APPROVAL",
  ...
}
```

记录返回的 `card_id`。

### 5.2 手机 Approve

1. 打开 **Cobo Agentic Wallet App**
2. 进入 **Pacts** 页面
3. 找到刚创建的 Pact（标题包含 "Content Agent"）
4. 点击 **Approve**

### 5.3 等待 Pact 变为 ACTIVE

回到终端，运行：

```bash
curl -X POST http://localhost:8000/cards/{card_id}/approve | python -m json.tool
```

**此时后端会轮询等待**，最多 5 分钟。请**在轮询期间**到手机上点击 Approve。

**成功输出**：

```json
{
  "card_id": "pact-xxxxxxxx",
  "status": "ACTIVE",
  "api_key": "caw_sk_..."
}
```

> **注意**：如果超时（408），说明手机上还没点 Approve。重新调用该接口即可继续等待。

---

## 六、提交真实支付

```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "card_id": "pact-xxxxxxxx",
    "vendor": "OpenAI",
    "amount": 10,
    "purpose": "API call test"
  }' | python -m json.tool
```

**可能的结果**：

| 结果 | 说明 |
|------|------|
| `APPROVED` | Policy Engine 通过，转账已提交上链 |
| `DENIED` + `POLICY_DENIED` | 超出单笔/月度限额、不在白名单、或 cooldown 冲突 |
| `DENIED` + `ERROR` | SDK 调用异常（检查 API Key、余额、网络） |

---

## 七、前端联动（React Dashboard）

### 7.1 启动前端

```bash
cd /home/neo/neo-ai-web3-school-cohort-0/hackathon/project/web
npm install
npm run dev
```

### 7.2 确认前端连接后端

打开浏览器访问 http://localhost:5173

- Dashboard 页面会自动调用 `GET /dashboard`
- 如果后端返回真实数据，页面会显示真实 Pact 和交易记录
- 如果后端不可达，页面会显示黄色提示条 "Backend offline — showing demo data"

### 7.3 前端环境变量（如需修改）

```bash
cp .env.example .env.local
```

默认 `VITE_API_URL=http://localhost:8000` 一般无需修改。

---

## 八、常用调试命令

```bash
# 查看所有 Pacts
curl http://localhost:8000/cards | python -m json.tool

# 查看所有交易
curl http://localhost:8000/transactions | python -m json.tool

# 查看审计汇总
curl http://localhost:8000/audit/summary | python -m json.tool

# 运行攻击场景（测试 Policy 拦截）
curl -X POST http://localhost:8000/attacks/a1 \
  -H "Content-Type: application/json" \
  -d '{"card_id": "pact-xxxxxxxx"}' | python -m json.tool
```

---

## 九、常见问题排查

### 9.1 `caw_mode` 仍然是 `mock`

**原因**：`.env` 文件没有被加载，或环境变量未导出。

**解决**：

```bash
# 方法1: 手动导出
export CAW_MODE=real
export AGENT_WALLET_API_KEY=...
export AGENT_WALLET_WALLET_ID=...

# 方法2: 使用 dotenv
source .venv/bin/activate
python -c "from dotenv import load_dotenv; load_dotenv('.env'); import os; print(os.getenv('CAW_MODE'))"
```

### 9.2 `ImportError: cobo-agentic-wallet SDK is not installed`

**解决**：

```bash
source .venv/bin/activate
pip install cobo-agentic-wallet nest-asyncio
```

### 9.3 `ValueError: CAW API key is required`

**原因**：`.env` 中 `AGENT_WALLET_API_KEY` 为空或未加载。

**解决**：确认 `caw wallet current --show-api-key` 有输出，并正确写入 `.env`。

### 9.4 Approve 接口返回 408 Timeout

**原因**：手机上没有在轮询期间点击 Approve。

**解决**：
1. 确认手机上看到了新的 Pact 通知
2. 点击 Approve 后，重新调用 `POST /cards/{id}/approve`
3. 如果 Pact 状态一直没变，用 `caw pact list` 查看链上状态

### 9.5 支付返回 `DENIED: destination address not allowed`

**原因**：`vendor` 名称对应的 `VENDOR_*_ADDR` 环境变量未配置，或地址不在白名单。

**解决**：在 `.env` 中配置对应供应商的真实链上地址，重启 backend。

### 9.6 支付返回 `DENIED: insufficient balance`

**原因**：Wallet 中 USDC 余额不足。

**解决**：向 Wallet 地址充值 Base 网络上的 USDC。

---

## 十、从 Real 切回 Mock

如需恢复演示/开发模式：

```bash
# 修改 .env
CAW_MODE=mock

# 重启 backend
# Mock 模式下所有交易都是本地模拟，不消耗真实资金
```

---

## 附录：文件结构速查

```
/home/neo/neo-ai-web3-school-cohort-0/hackathon/project/
├── .env                      # 环境变量（不提交 git）
├── .env.example              # 模板
├── src/
│   ├── caw_factory.py          # Mock/Real 自动切换
│   ├── real_caw_client.py    # 真实 SDK 封装
│   └── mock_caw_client.py    # 模拟客户端
├── backend/
│   ├── main.py                 # FastAPI 入口
│   ├── models.py               # Pydantic 模型
│   └── requirements.txt        # 依赖清单
└── web/
    ├── src/
    │   ├── api/client.ts         # 前端 API 客户端
    │   └── pages/Dashboard.tsx   # 数据面板
    └── .env.example            # 前端环境模板
```
