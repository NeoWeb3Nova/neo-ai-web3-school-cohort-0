// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleStorage
 * @dev AI x Web3 School Week 1 最小合约部署练习
 *      目标：在 Remix 上完成编译、部署、读取、写入全流程
 *      网络建议：Sepolia 测试网
 */
contract SimpleStorage {
    uint256 private storedData;

    // 事件：方便在区块浏览器中追踪写入操作
    event DataChanged(uint256 oldValue, uint256 newValue, address indexed caller);

    /**
     * @dev 写入数据。这是一个交易调用，需要签名并消耗 Gas。
     * @param x 要存储的新数值
     */
    function set(uint256 x) public {
        uint256 old = storedData;
        storedData = x;
        emit DataChanged(old, x, msg.sender);
    }

    /**
     * @dev 读取数据。这是一个 view 调用，不消耗 Gas，不上链。
     * @return 当前存储的数值
     */
    function get() public view returns (uint256) {
        return storedData;
    }

    /**
     * @dev 一步到位：直接设置并返回新值，方便测试。
     */
    function setAndGet(uint256 x) public returns (uint256) {
        set(x);
        return storedData;
    }
}
