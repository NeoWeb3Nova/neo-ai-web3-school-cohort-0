"""
Curated service registry for x402 + ERC-8004 demo flows.

The entries are grounded in the public x402scan marketplace and 8004scan agent
registry pages used by the hackathon demo. They are intentionally small and
stable: the live scanners are discovery sources, while this module provides a
repeatable allowlist shape for local mock/CAW policy tests.
"""

from __future__ import annotations

from typing import Any, Dict, List


X402_PROVIDERS: List[Dict[str, Any]] = [
    {
        "name": "BlockRun AI Gateway",
        "address": "0x4020000000000000000000000000000000000001",
        "category": "ai",
        "x402_url": "https://blockrun.ai",
        "description": "Pay-per-call AI gateway; models, data and runtime settled in USDC.",
        "pricing_usdc": 0.05,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:blockrun-ai-gateway",
        "erc8004_registry_url": "https://8004scan.io/agents?search=BlockRun",
    },
    {
        "name": "claw402 API Gateway",
        "address": "0x4020000000000000000000000000000000000002",
        "category": "api",
        "x402_url": "https://claw402.ai",
        "description": "x402 API payment gateway for wallet-native API access without API keys.",
        "pricing_usdc": 0.02,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:claw402-api-gateway",
        "erc8004_registry_url": "https://8004scan.io/agents?search=claw402",
    },
    {
        "name": "Vishwa",
        "address": "0x4020000000000000000000000000000000000003",
        "category": "infra",
        "x402_url": "https://api.vishwalab.com",
        "description": "Agent-native banking infrastructure with pre-execution control for capital flows.",
        "pricing_usdc": 0.10,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:vishwa",
        "erc8004_registry_url": "https://8004scan.io/agents?search=Vishwa",
    },
    {
        "name": "ATXP Agent Account",
        "address": "0x4020000000000000000000000000000000000004",
        "category": "infra",
        "x402_url": "https://hub.atxp.ai",
        "description": "Agent identity, payments, communication and tools; compatible with x402 and MPP.",
        "pricing_usdc": 0.08,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:atxp-agent-account",
        "erc8004_registry_url": "https://8004scan.io/agents?search=ATXP",
    },
    {
        "name": "StableEnrich",
        "address": "0x4020000000000000000000000000000000000005",
        "category": "search",
        "x402_url": "https://stableenrich.dev",
        "description": "Pay-per-request access to Apollo, Clado, Exa, Firecrawl, Google Maps, Serper and Whitepages.",
        "pricing_usdc": 0.03,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:stableenrich",
        "erc8004_registry_url": "https://8004scan.io/agents?search=StableEnrich",
    },
    {
        "name": "twit.sh",
        "address": "0x4020000000000000000000000000000000000006",
        "category": "social",
        "x402_url": "https://x402.twit.sh",
        "description": "Real-time Twitter/X data for agents; no signup or API keys, paid via USDC on Base.",
        "pricing_usdc": 0.01,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:twit-sh",
        "erc8004_registry_url": "https://8004scan.io/agents?search=twit.sh",
    },
    {
        "name": "OneSource Ethereum RPC",
        "address": "0x4020000000000000000000000000000000000007",
        "category": "crypto",
        "x402_url": "https://skills.onesource.io",
        "description": "Ethereum RPC data: blocks, balances, contracts, NFTs, transactions and events.",
        "pricing_usdc": 0.01,
        "chain": "Ethereum",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "ethereum:onesource-rpc",
        "erc8004_registry_url": "https://8004scan.io/agents?search=OneSource",
    },
    {
        "name": "Orbis API Marketplace",
        "address": "0x4020000000000000000000000000000000000008",
        "category": "api",
        "x402_url": "https://orbisapi.com",
        "description": "API marketplace for agent-era pay-per-call APIs on Base and Solana.",
        "pricing_usdc": 0.04,
        "chain": "Base",
        "source": "x402scan:most-used",
        "erc8004_agent_id": "base:orbis-api-marketplace",
        "erc8004_registry_url": "https://8004scan.io/agents?search=Orbis",
    },
]

ERC8004_AGENTS: List[Dict[str, Any]] = [
    {
        "agent_id": "bsc:131602",
        "name": "Ave.ai Trading Agent#131602",
        "chain": "BNB Smart Chain",
        "service": "CUSTOM",
        "owner": "0xed86...c7a8",
        "score": 0,
        "feedback": 0,
        "stars": 0,
        "x402_enabled": True,
        "registry_url": "https://8004scan.io/agents/bsc/131602",
        "source": "8004scan:newest",
    },
    {
        "agent_id": "monad:8588",
        "name": "MpruyKeren#8588",
        "chain": "Monad",
        "service": "CUSTOM",
        "owner": "0x457d...e3a5",
        "score": 0,
        "feedback": 0,
        "stars": 0,
        "x402_enabled": True,
        "registry_url": "https://8004scan.io/agents/monad/8588",
        "source": "8004scan:newest",
    },
    {
        "agent_id": "monad:8587",
        "name": "LUNA ₍^. .^₎Ⳋ#8587",
        "chain": "Monad",
        "service": "CUSTOM",
        "owner": "0x795a...c513",
        "score": 0,
        "feedback": 0,
        "stars": 0,
        "x402_enabled": True,
        "registry_url": "https://8004scan.io/agents/monad/8587",
        "source": "8004scan:newest",
    },
]

MARKETPLACE_CONTEXT: Dict[str, Any] = {
    "x402scan": {
        "source_url": "https://www.x402scan.com/resources",
        "active_merchants_24h": 7010,
        "new_merchants_24h": 199,
        "registered_active_merchants_24h": 38,
        "registered_unique_buyers_24h": 206,
        "categories": {
            "most_used": 2076,
            "search": 535,
            "crypto": 940,
            "ai": 969,
            "trading": 402,
        },
    },
    "erc8004": {
        "build_url": "https://www.8004.org/build",
        "scan_url": "https://8004scan.io/agents",
        "registry_total_agents": 358909,
        "supported_chains": [
            "Ethereum",
            "Base",
            "Arbitrum",
            "Avalanche",
            "BNB Chain",
            "Celo",
            "Gnosis",
            "Linea",
            "Monad",
            "Optimism",
            "Polygon",
            "Scroll",
        ],
        "integration_note": "Use ERC-8004 for agent identity/reputation and x402 for per-request settlement.",
    },
}


def list_x402_providers() -> List[Dict[str, Any]]:
    return [dict(p) for p in X402_PROVIDERS]


def get_vendor_registry() -> Dict[str, str]:
    return {str(p["name"]): str(p["address"]) for p in X402_PROVIDERS}


def list_erc8004_agents() -> List[Dict[str, Any]]:
    return [dict(a) for a in ERC8004_AGENTS]


def get_marketplace_context() -> Dict[str, Any]:
    return dict(MARKETPLACE_CONTEXT)
