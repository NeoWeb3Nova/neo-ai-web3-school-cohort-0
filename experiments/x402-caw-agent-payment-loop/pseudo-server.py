"""
x402 Paywall Server -- 受保护的 AI 推理服务端

技术栈: FastAPI + x402 Python SDK
网络: Base Sepolia (测试网)
模式: exact payment -- 每次请求固定价格
"""

from fastapi import FastAPI, Request, HTTPException
from x402 import payment_middleware, x402_resource_server
from x402.evm.exact.server import ExactEvmScheme
from x402.core.server import HTTPFacilitatorClient
import hashlib
import json
from datetime import datetime, timezone

app = FastAPI()

# 收款钱包地址 (服务提供方 ContentGen Agent 的钱包)
EVM_ADDRESS = "0xProviderWalletAddressHere"

# Facilitator 客户端 — 验证结算的中介
# 测试网用 https://x402.org/facilitator
# 主网用自己运营的 facilitator
facilitator_client = HTTPFacilitatorClient(
    url="https://x402.org/facilitator"
)

# 将 x402 支付中间件挂载到应用
# 注意: 生产环境需要自己运营 facilitator，不依赖公共服务
app = payment_middleware(
    app,
    routes={
        "POST /generate-content": {
            "accepts": [
                {
                    "scheme": "exact",
                    "price": "$0.50",  # 50 美分 USDC
                    "network": "eip155:84532",  # Base Sepolia chain ID
                    "payTo": EVM_ADDRESS,
                }
            ],
            "description": "AI-generated marketing content (7 social media posts)",
            "mimeType": "application/json",
        }
    },
    facilitator_client=facilitator_client,
)


@app.post("/generate-content")
async def generate_content(request: Request):
    """
    受 x402 保护的 AI 内容生成端点。
    
    中间件已在进入本函数前完成了：
    1. 检查 Authorization: Payment header 中的 payment proof
    2. 通过 facilitator 验证链上支付是否有效
    3. 检查 idempotency key 防止重复扣款
    
    如果支付验证失败，中间件会自动返回 402，本函数不会被调用。
    """
    
    body = await request.json()
    
    # 【实际生产环境】这里应该调用真实的 AI 推理服务
    # 例如: 调用本地 LLM 或第三方 API (OpenAI, Anthropic 等)
    # 但需要注意：不能让推理成本高于 $0.50，否则亏损
    content = await call_ai_inference_service(body)
    
    # 计算交付物 hash — 用于后续验证交付物是否被篡改
    content_json = json.dumps(content, sort_keys=True)
    deliverable_hash = hashlib.sha256(content_json.encode()).hexdigest()
    
    # 构建响应，包含 Payment-Receipt header
    # 客户端可以这个 receipt 作为已付款凭证
    receipt = {
        "settled": True,
        "amount": "$0.50",
        "token": "USDC",
        "network": "eip155:84532",
        "txHash": request.headers.get("X-Tx-Hash", "unknown"),
        "facilitator": "https://x402.org/facilitator",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "idempotencyKey": request.headers.get("X-Idempotency-Key", "unknown"),
    }
    
    return {
        "jobId": f"job-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        "deliverables": content,
        "deliverableHash": f"sha256:{deliverable_hash}",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "modelVersion": "gpt-4o-2026-05",  # 实际使用的模型版本
    }


async def call_ai_inference_service(params: dict) -> list:
    """
    【伪代码】调用 AI 推理服务生成内容。
    
    实际实现方案：
    - 方案 A：调用 OpenAI / Anthropic API（需要 API key 管理）
    - 方案 B：调用本地 Ollama / vLLM 服务（无 API 费用，但需要 GPU）
    - 方案 C：预先生成的模板库 + 参数填充（成本最低，但灵活性差）
    
    关键约束：推理成本必须低于 $0.50，否则亏损。
    这是 Agent Commerce 的核心经济约束。
    """
    
    # 仅作为演示的模拟返回
    return [
        {
            "id": i,
            "title": f"Post {i}: {params['brand']} {params['product']} Highlight",
            "caption": f"Chill vibes only with {params['brand']} {params['product']}. "
                       f"Perfect for {params['audience']}. #VibeCoding #AgentCommerce",
            "hashtags": [f"#{params['product'].replace(' ', '')}", f"#{params['brand'].replace(' ', '')}"],
            "image_prompt": f"Aesthetic photo of {params['product']} for {params['audience']}",
        }
        for i in range(1, 8)
    ]


# 【生产环境必要配置】
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
