"""
x402 Real Server — 基于 x402 Python SDK 2.x 的 FastAPI 服务端

技术栈: FastAPI + x402 Python SDK 2.12.0
网络: Base Sepolia (eip155:84532) 测试网
Facilitator: https://x402.org/facilitator (测试网)

运行:
  source venv/bin/activate
  uvicorn x402-server:app --reload --host 0.0.0.0 --port 8000
"""

import json
import hashlib
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from x402.http.facilitator_client import HTTPFacilitatorClient
from x402.server import x402ResourceServer
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.http.middleware.fastapi import payment_middleware
from x402.http.types import RouteConfig, PaymentOption

app = FastAPI(title="PactGuard x402 Server", version="0.2.0")

# 收款钱包地址 (服务提供方 ContentGen Agent 的钱包)
# 使用新生成的测试地址: 0x728A427FB55f9d5997c50a98c8034E955A0fC4BD
EVM_ADDRESS = "0x728A427FB55f9d5997c50a98c8034E955A0fC4BD"

# Facilitator 客户端 — 验证结算的中介
# 测试网用 https://x402.org/facilitator
facilitator_client = HTTPFacilitatorClient({
    "url": "https://x402.org/facilitator"
})

# 创建 x402 Resource Server 并注册 EVM Exact Scheme
server = x402ResourceServer(facilitator_client)
server.register("eip155:84532", ExactEvmServerScheme())

# 定义受保护路由配置
routes = {
    "POST /generate-content": RouteConfig(
        accepts=PaymentOption(
            scheme="exact",
            price="$0.50",
            network="eip155:84532",
            pay_to=EVM_ADDRESS,
        ),
        description="AI-generated marketing content (7 social media posts)",
        mime_type="application/json",
    )
}

# 挂载 x402 支付中间件
# 注意: payment_middleware 返回一个 async 函数，需用 @app.middleware("http") 包装
_middleware = payment_middleware(routes, server)

@app.middleware("http")
async def x402_middleware(request: Request, call_next):
    return await _middleware(request, call_next)


@app.post("/generate-content")
async def generate_content(request: Request):
    """
    受 x402 保护的 AI 内容生成端点。

    中间件已在进入本函数前完成了:
    1. 检查 payment-signature header 中的 payment proof
    2. 通过 facilitator 验证链上支付是否有效
    3. 检查 idempotency key 防止重复扣款

    如果支付验证失败，中间件会自动返回 402，本函数不会被调用。
    """
    body = await request.json()

    # 获取已验证的支付信息（由中间件注入 request.state）
    payment_payload = getattr(request.state, "payment_payload", None)
    payment_requirements = getattr(request.state, "payment_requirements", None)

    # 【实际生产环境】这里应该调用真实的 AI 推理服务
    # 演示阶段: 模拟返回内容
    content = generate_mock_content(body)

    # 计算交付物 hash
    content_json = json.dumps(content, sort_keys=True)
    deliverable_hash = hashlib.sha256(content_json.encode()).hexdigest()

    # 构建响应
    return {
        "jobId": f"job-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        "deliverables": content,
        "deliverableHash": f"sha256:{deliverable_hash}",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "modelVersion": "mock-gpt-4o",
        "payment": {
            "settled": True,
            "amount": "$0.50",
            "token": "USDC",
            "network": "eip155:84532",
            "facilitator": "https://x402.org/facilitator",
        },
    }


def generate_mock_content(params: dict) -> list:
    """模拟 AI 内容生成。"""
    return [
        {
            "id": i,
            "title": f"Post {i}: {params.get('brand', 'Brand')} {params.get('product', 'Product')} Highlight",
            "caption": f"Chill vibes only with {params.get('brand', 'Brand')} {params.get('product', 'Product')}. "
                       f"Perfect for {params.get('audience', 'everyone')}. #VibeCoding #AgentCommerce",
            "hashtags": [f"#{params.get('product', 'Product').replace(' ', '')}", f"#{params.get('brand', 'Brand').replace(' ', '')}"],
            "image_prompt": f"Aesthetic photo of {params.get('product', 'Product')} for {params.get('audience', 'everyone')}",
        }
        for i in range(1, 8)
    ]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "PactGuard x402 Server", "version": "0.2.0"}
