# OPC Agent Policy Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current spending-card UI into a coherent OPC digital-employee payment-control product: agents own CAW policy cards; cards whitelist x402 providers; ERC-8004 trust requirements are visible and used as product logic.

**Architecture:** Extend the existing FastAPI service rather than creating a new backend. Add a curated Digital Agent directory and a Trust Requirements object to card/provider payloads, then wire React/Vite Cards and Agent Console pages to display agent, x402, and ERC-8004 trust layers clearly.

**Tech Stack:** FastAPI + Pydantic, existing MockCAWClient, React 19 + Vite + TypeScript + Tailwind utility classes.

---

### Task 1: Backend agent directory and trust metadata

**Files:**
- Modify: `src/service_registry.py`
- Modify: `backend/models.py`
- Modify: `backend/main.py`
- Modify: `src/mock_caw_client.py`
- Test: `tests/test_marketplace_api.py`

- [ ] **Step 1: Write failing backend tests**

Add tests asserting `/agents/digital-employees` returns Alpha/Beta/Nova/Watt and that created cards include `trust_requirements` with Identity, Reputation, and Validation registry states.

- [ ] **Step 2: Run tests to verify failure**

Run: `pytest tests/test_marketplace_api.py -q`
Expected: FAIL because endpoint/model fields are missing.

- [ ] **Step 3: Implement registry/model/API support**

Add curated `DIGITAL_EMPLOYEES`, `TRUST_REQUIREMENTS`, helper functions, Pydantic `DigitalEmployee` / `TrustRequirement` models, and `GET /agents/digital-employees`. Include `trust_requirements` in card dicts.

- [ ] **Step 4: Run backend tests**

Run: `pytest tests/test_marketplace_api.py tests/test_cards_api.py -q`
Expected: PASS.

### Task 2: Frontend types and card configuration UI

**Files:**
- Modify: `web/src/data/mockData.ts`
- Modify: `web/src/api/caw.ts`
- Modify: `web/src/pages/Cards.tsx`

- [ ] **Step 1: Add frontend contract types**

Add `TrustRequirement` and `DigitalEmployee` interfaces; add optional `trust_requirements` on `CardPact` and trust metadata on `Vendor`.

- [ ] **Step 2: Replace free-form agent entry with agent-first selection**

Cards page should load `/agents/digital-employees`, default to Alpha, and create cards from selected agent names while showing role, risk tier, ERC-8004 identity, and recommended budget.

- [ ] **Step 3: Upgrade x402 provider selection**

Render provider cards instead of simple pills: name, description, endpoint, chain, price, payee address, ERC-8004 identity/registry URL, and trust tier.

- [ ] **Step 4: Add ERC-8004 Trust Requirements block**

Show protocol-correct labels: Identity Registry, Reputation Registry, Validation Registry. Do not use “Evaluation Registry” as protocol name.

### Task 3: Agent Console payment-flow narrative

**Files:**
- Modify: `web/src/pages/AgentConsole.tsx`

- [ ] **Step 1: Rename pipeline steps**

Payment flow should narrate x402 challenge → CAW card permission → ERC-8004 identity → reputation threshold → validation registry → CAW budget/signature/audit.

- [ ] **Step 2: Show selected agent/card trust context**

Agent persona block and policy panel should show card as a policy credential assigned to the digital employee, plus provider trust metadata.

### Task 4: Verify, build, and commit

**Files:**
- All changed files

- [ ] **Step 1: Run backend tests**

Run: `pytest tests/test_marketplace_api.py tests/test_cards_api.py -q`
Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `npm run build` in `web/`
Expected: PASS.

- [ ] **Step 3: Smoke test API**

Run backend in mock mode and query `/agents/digital-employees`, `/providers/x402`, `/cards`.

- [ ] **Step 4: Commit changes**

Commit message: `feat: model OPC agent policy cards with ERC-8004 trust`.
