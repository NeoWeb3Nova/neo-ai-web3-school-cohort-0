# 部署或调用一个最小智能合约 – Solidity‑Counter 项目概览

---

## 项目简介

`solidity-counter` 是一个最小化的 **Counter** 合约示例以及配套的 **Next.js** 前端，演示了如何在 **Foundry** 环境下编写、测试、部署 Solidity 合约，并通过 **wagmi** 与 **viem** 在浏览器中与合约交互。

---

## 目录结构

```
solidity-counter/
├─ src/                # Solidity 合约源码
│   └─ Counter.sol
├─ test/               # Foundry 测试
│   └─ Counter.t.sol
├─ script/             # 部署脚本
│   └─ Counter.s.sol
├─ web/                # 前端 (Next.js + wagmi)
│   ├─ components/    # UI 组件 (WalletBar, ChainGuard, CounterPanel)
│   ├─ hooks/         # 合约读取/写入 Hook
│   │   ├─ useCounterRead.ts
│   │   └─ useCounterWrite.ts
│   └─ pages/ ...
└─ README.md           # 项目概览
```

---

## 合约代码（`src/Counter.sol`）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;

    function increment() external {
        unchecked { count += 1; }
    }
}
```

- `count` 为公开状态变量，自动生成 getter `function count() external view returns (uint256)`。
- `increment()` 为无返回值的外部函数，使用 `unchecked` 避免不必要的溢出检查（对计数器安全足够）。

---

## 合约部署脚本（`script/Counter.s.sol`）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Counter.sol";

contract CounterScript is Script {
    function run() external {
        vm.startBroadcast();
        new Counter();
        vm.stopBroadcast();
    }
}
```

脚本使用 **Foundry** 的 `vm.startBroadcast()` 将部署交易发送到当前配置的 RPC。

---

## 开发与测试指令（在项目根目录）

| 操作 | 命令 |
|------|------|
| 编译合约 | `forge build` |
| 运行全部测试 | `forge test -vv` |
| 只运行某个测试 | `forge test -vv --match-test <TestName>` |
| 详细调试（trace） | `forge test -vvvv` |
| 生成覆盖率报告 | `forge coverage` |
| 启动本地 Anvil 节点 | `anvil &` |
| 本地部署合约 | ```bash
PRIVATE_KEY=0xac... \
  forge script script/Counter.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
``` |
| 在 Sepolia 测试网部署（需 .env） | ```bash
source .env
forge script script/Counter.s.sol \
  --rpc-url $SEPOLIA_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
``` |

> **注意**: `.env`（或 `.env.local`）已在 `.gitignore` 中，切勿提交私钥。

---

## 前端（Next.js + wagmi）

### 启动步骤（在 `web/` 目录）

```bash
cp .env.example .env.local   # 复制并根据实际 RPC/合约地址填写
npm install                  # 安装依赖
npm run dev                  # 本地开发服务器，默认 http://localhost:3000
```

### 核心 Hook 与组件

- **`hooks/useCounterRead.ts`** – 使用 `useReadContract` 读取 `count`，自动缓存。
- **`hooks/useCounterWrite.ts`** – 封装 `writeContract` 与 `waitForTransactionReceipt`，并提供 `txPhase` 枚举（`idle`, `awaiting_signature`, `submitted`, `confirming`, `success`, `error`）。
- **`components/CounterPanel.tsx`** – 显示当前计数并提供 “Increment” 按钮，基于 `useCounterWrite` 的 `txPhase` 渲染不同状态提示。
- **`components/WalletBar.tsx`** – 连接钱包（MetaMask），展示地址与网络信息。
- **`components/ChainGuard.tsx`** – 检查当前链是否为 **Anvil (31337)** 或 **Sepolia (11155111)**，并提供切换按钮。

### 环境变量（`web/.env.local` 示例）

```dotenv
NEXT_PUBLIC_ANVIL_RPC=http://127.0.0.1:8545
NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.infura.io/v3/your-project-id
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedCounterAddress
```

前端通过 `NEXT_PUBLIC_*` 前缀读取，这样不会在代码中硬编码 RPC 地址或合约地址。

---

## 常见问题与注意事项

1. **MetaMask 中余额为 0** – 在本地 Anvil 环境下，可使用 Foundry 的 `cast` 给任意地址充值：
   ```bash
   cast rpc anvil_setBalance <address> 0xDE0B6B3A7640000
   ```
   其中 `0xDE0B6B3A7640000` 代表 1 ETH（10^18 wei）。
2. **前端报错 `Hydration mismatch`** – 确保所有状态在服务器端渲染时保持一致，建议在 `useEffect` 中仅在浏览器侧读取钱包信息。
3. **交易失败（gas 不足）** – 在发送 `increment()` 前，可在 `useCounterWrite` 中加入余额检查：
   ```ts
   const { data: balance } = useBalance({ address: address! });
   if (balance && balance < estimatedGas) { /* 提示用户充值 */ }
   ```
4. **安全** – 合约本身极其简易，没有权限控制。生产环境请自行添加 **Ownable** 或 **AccessControl**，并在前端做好错误信息过滤，避免泄露内部细节。

---

## 结论

本项目展示了 **Solidity 合约** → **Foundry 测试/部署** → **Next.js 前端交互** 的完整闭环，适合作为 Web3 入门的最小可运行示例。通过上述指令即可在本地 Anvil 或 Sepolia 测试网部署并调用 `Counter` 合约，进一步探索更复杂的业务逻辑。

---

*文档生成于 Claude Code，遵循项目的 CLAUDE.md 与全局开发规范。*