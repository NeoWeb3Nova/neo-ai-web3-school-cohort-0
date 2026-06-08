"""
CAW Client Factory — 根据环境变量自动选择 Mock 或 Real CAW Client

使用:
    from caw_factory import get_caw_client
    caw = get_caw_client()
    # 之后与 MockCAWClient 接口完全一致

环境变量:
    CAW_MODE=mock   # 使用 MockCAWClient（无需外部依赖，默认）
    CAW_MODE=real   # 使用 RealCAWClient（需要 SDK + API Key）
"""

import os
import sys
from typing import Union

# 确保能导入 src 下的模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mock_caw_client import MockCAWClient


def get_caw_client() -> Union[MockCAWClient, "RealCAWClient"]:
    """根据 CAW_MODE 返回对应的 CAW Client 实例。"""
    mode = os.getenv("CAW_MODE", "mock").lower().strip()

    if mode == "real":
        try:
            from real_caw_client import RealCAWClient
            return RealCAWClient()
        except ImportError as exc:
            raise ImportError(
                f"CAW_MODE=real 要求安装 cobo-agentic-wallet SDK，"
                f"但导入失败: {exc}\n"
                f"请运行: pip install cobo-agentic-wallet"
            ) from exc
        except ValueError as exc:
            raise ValueError(
                f"CAW_MODE=real 需要配置环境变量: "
                f"AGENT_WALLET_API_KEY, AGENT_WALLET_WALLET_ID\n"
                f"原因: {exc}"
            ) from exc

    # 默认 / mock
    return MockCAWClient()


if __name__ == "__main__":
    client = get_caw_client()
    print(f"[Factory] CAW_MODE={os.getenv('CAW_MODE', 'mock')}")
    print(f"[Factory] Client type: {type(client).__name__}")
