# Agent Card Assignment and Payment Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate permission-card creation, durable card-to-agent assignment, and x402 payment requests so the UI and backend enforce the same product model.

**Architecture:** Cards/Pacts remain the source of spending policy: budget, single-transaction limit, cooldown, status, vendor whitelist, x402/ERC-8004 provider metadata. Digital employees become the spending actors. A new persistent Assignment layer records which employee can use which active card, and `/payments` requires `agent_id` plus `card_id` and rejects requests from unassigned agents.

**Tech Stack:** FastAPI + Pydantic backend, in-memory MockCAWClient and RealCAWClient metadata cache, React/Vite/TypeScript frontend, i18next locales, pytest backend tests, `npm run build` frontend verification.

---

## File Structure

**Modify backend files**
- `backend/models.py`
  - Add assignment fields to `CardResponse`.
  - Add `AssignCardRequest`, `AssignCardResponse`.
  - Add `agent_id` to `PaymentRequest`.
- `backend/main.py`
  - Add `POST /cards/{card_id}/assign` endpoint.
  - Add assignment-aware validation before payment submission.
  - Ensure `/cards`, `/cards/{card_id}`, `/dashboard` return assignment fields.
- `src/mock_caw_client.py`
  - Extend `CardPact` with `card_name`, `assigned_agent_id`, `assigned_agent_name`, `assigned_at`.
  - Implement `assign_card(card_id, agent_id, agent_name)`.
  - Require `agent_id` in `submit_payment` and reject unassigned/mismatched usage.
  - Keep backward-compatible `agent_name` response during transition.
- `src/real_caw_client.py`
  - Preserve assignment metadata in local `_cards` cache when CAW refreshes Pact status.
  - Implement assignment as local metadata overlay, because CAW Pact APIs are authoritative for lifecycle but may not store demo UI assignment fields.

**Modify frontend files**
- `web/src/api/caw.ts`
  - Add assignment request/response types.
  - Add `assignCard(cardId, payload)`.
  - Add `agent_id` to `PaymentPayload`.
- `web/src/data/mockData.ts`
  - Add optional assignment fields to `CardPact` type.
- `web/src/pages/Cards.tsx`
  - Rename creation form state from `newCardName`-style naming to card-name semantics where practical.
  - Change CTA from “use in console” semantics to “assign to agent”.
  - Display assigned/unassigned status clearly.
- `web/src/pages/AgentConsole.tsx`
  - Split top panel into explicit assignment action.
  - Show assigned card list for selected employee.
  - Payment form uses only cards assigned to selected employee.
  - Rename “新建支付请求” to “发起 x402 服务调用” or “提交智能体支付请求”.
- `web/src/i18n/locales/zh.json`
  - Fix Chinese product copy.
- `web/src/i18n/locales/en.json`
  - Fix English product copy.

**Modify/add tests**
- `tests/test_card_assignment_api.py` create.
- `tests/test_cards_api.py` update existing fixtures for new fields.
- Optional frontend type/build verification via `npm run build`; no new frontend test framework required unless already configured.

---

## Product Contract

Final user-facing model:

1. Card page creates a permission card.
   - User chooses card name, budget, single transaction limit, cooldown, duration, provider whitelist.
   - Card is not assigned to any employee at creation.
   - Card must be approved before assignment/payment usage.

2. Agent Console assigns an active permission card to a digital employee.
   - Assignment is an explicit action: select employee + select active unassigned/available card + click “确认分配”.
   - Assignment is persisted in backend response fields.

3. Agent Console submits a payment/service-call request.
   - Payment requires `agent_id`, `card_id`, `vendor`, `amount`, `purpose`.
   - Backend rejects if the selected employee is not assigned to that card.
   - Backend still enforces policy checks: active status, vendor whitelist, amount, budget, cooldown, anomaly.

Terminology:
- “卡片” = permission card / Pact / policy card.
- “员工智能体” = actor who uses permission.
- “绑定/分配” = durable relationship between employee and card.
- “支付请求” = one x402 service call/payment attempt, not binding.

---

### Task 1: Backend Models for Assignment and Payment Actor

**Files:**
- Modify: `backend/models.py`
- Test: `tests/test_card_assignment_api.py`

- [ ] **Step 1: Create failing assignment-model tests**

Create `tests/test_card_assignment_api.py` with:

```python
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "src"))

os.environ.setdefault("CAW_MODE", "mock")

from models import CardResponse, PaymentRequest


def base_card_payload():
    return {
        "card_id": "card-test",
        "agent_id": "legacy-card-agent",
        "agent_name": "Research API Card",
        "card_name": "Research API Card",
        "owner": "0xOwner",
        "status": "ACTIVE",
        "budget": {"currency": "USDC", "monthly_max": 100.0, "spent": 0.0, "single_tx_limit": 10.0},
        "vendor_whitelist": [],
        "cooldown_hours": 6,
        "time_window": None,
        "created_at": "2026-06-11T00:00:00+00:00",
        "expires_at": "2026-07-11T00:00:00+00:00",
        "api_key": "",
        "assigned_agent_id": "agent-alpha-research",
        "assigned_agent_name": "Alpha Research Agent",
        "assigned_at": "2026-06-11T01:00:00+00:00",
    }


def test_card_response_exposes_assignment_fields():
    card = CardResponse(**base_card_payload())

    assert card.card_name == "Research API Card"
    assert card.assigned_agent_id == "agent-alpha-research"
    assert card.assigned_agent_name == "Alpha Research Agent"
    assert card.assigned_at == "2026-06-11T01:00:00+00:00"


def test_payment_request_requires_agent_id():
    req = PaymentRequest(
        agent_id="agent-alpha-research",
        card_id="card-test",
        vendor="BlockRun AI Gateway",
        amount=1.5,
        purpose="x402 paid API call",
    )

    assert req.agent_id == "agent-alpha-research"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest tests/test_card_assignment_api.py -v
```

Expected: FAIL because `CardResponse` has no `card_name` / assignment fields or `PaymentRequest` has no `agent_id`.

- [ ] **Step 3: Implement model fields**

Modify `backend/models.py`:

```python
class CardResponse(BaseModel):
    card_id: str
    agent_id: str
    agent_name: str
    card_name: Optional[str] = None
    owner: str
    status: str
    budget: Dict[str, Any]
    vendor_whitelist: List[Dict[str, Any]]
    cooldown_hours: int
    time_window: Optional[Dict[str, Any]] = None
    created_at: str
    expires_at: str
    api_key: Optional[str] = None
    x402_enabled: bool = True
    x402_url: Optional[str] = None
    erc8004_agent_id: Optional[str] = None
    erc8004_registry_url: Optional[str] = None
    trust_requirements: List[Dict[str, Any]] = []
    assigned_agent_id: Optional[str] = None
    assigned_agent_name: Optional[str] = None
    assigned_at: Optional[str] = None

    @field_validator("created_at", "expires_at", "assigned_at", mode="before")
    @classmethod
    def none_datetime_to_empty_string(cls, value: Any) -> str:
        """CAW may return null for optional Pact timestamps; keep frontend contract as string."""
        return "" if value is None else str(value)
```

Add below `ApproveResponse`:

```python
class AssignCardRequest(BaseModel):
    agent_id: str
    agent_name: str


class AssignCardResponse(BaseModel):
    card_id: str
    status: str
    assigned_agent_id: str
    assigned_agent_name: str
    assigned_at: str
```

Update `PaymentRequest`:

```python
class PaymentRequest(BaseModel):
    agent_id: str
    card_id: str
    vendor: str
    amount: float = Field(..., gt=0)
    purpose: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = None
```

- [ ] **Step 4: Run model tests**

Run:

```bash
pytest tests/test_card_assignment_api.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/models.py tests/test_card_assignment_api.py
git commit -m "feat: add card assignment API models"
```

---

### Task 2: Mock CAW Assignment Semantics and Payment Enforcement

**Files:**
- Modify: `src/mock_caw_client.py`
- Test: `tests/test_card_assignment_api.py`

- [ ] **Step 1: Add failing MockCAW assignment tests**

Append to `tests/test_card_assignment_api.py`:

```python
import pytest
from mock_caw_client import MockCAWClient


def first_provider():
    from service_registry import list_x402_providers
    return list_x402_providers()[0]


def create_active_card(caw: MockCAWClient) -> str:
    card_id = caw.create_card_pact(
        agent_name="Research API Card",
        monthly_budget=100,
        single_tx_limit=10,
        vendor_whitelist=[first_provider()],
        cooldown_hours=0,
    )
    caw.approve_card(card_id)
    return card_id


def test_mock_assign_card_persists_employee_assignment():
    caw = MockCAWClient()
    card_id = create_active_card(caw)

    result = caw.assign_card(card_id, "agent-alpha-research", "Alpha Research Agent")
    card = caw.get_card(card_id)

    assert result["status"] == "ASSIGNED"
    assert card["assigned_agent_id"] == "agent-alpha-research"
    assert card["assigned_agent_name"] == "Alpha Research Agent"
    assert card["assigned_at"]


def test_mock_payment_rejects_unassigned_agent():
    caw = MockCAWClient()
    card_id = create_active_card(caw)
    caw.assign_card(card_id, "agent-alpha-research", "Alpha Research Agent")

    response = caw.submit_payment(
        card_id=card_id,
        agent_id="agent-beta-growth",
        vendor=first_provider()["name"],
        amount=1.0,
        metadata={"purpose": "wrong employee tries card"},
    )

    assert response["status"] == "DENIED"
    assert "agent_not_assigned" in response["reason"]


def test_mock_payment_approves_assigned_agent():
    caw = MockCAWClient()
    card_id = create_active_card(caw)
    caw.assign_card(card_id, "agent-alpha-research", "Alpha Research Agent")

    response = caw.submit_payment(
        card_id=card_id,
        agent_id="agent-alpha-research",
        vendor=first_provider()["name"],
        amount=1.0,
        metadata={"purpose": "assigned employee paid API call"},
    )

    assert response["status"] == "APPROVED"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_card_assignment_api.py -v
```

Expected: FAIL because `assign_card` and `submit_payment(agent_id=...)` do not exist.

- [ ] **Step 3: Extend CardPact dataclass**

Modify `src/mock_caw_client.py` `CardPact`:

```python
@dataclass
class CardPact:
    card_id: str
    agent_id: str
    agent_name: str
    owner: str
    status: str  # PENDING_APPROVAL | ACTIVE | REVOKED | EXPIRED | COMPLETED
    budget: Budget
    vendor_whitelist: List[Vendor]
    cooldown_hours: int
    time_window: TimeWindow
    created_at: str
    expires_at: str
    api_key: str = ""
    erc8004_agent_id: str = ""
    erc8004_registry_url: str = ""
    card_name: str = ""
    assigned_agent_id: str = ""
    assigned_agent_name: str = ""
    assigned_at: str = ""
```

In `create_card_pact`, when constructing `CardPact`, add:

```python
card_name=agent_name,
assigned_agent_id="",
assigned_agent_name="",
assigned_at="",
```

- [ ] **Step 4: Add `assign_card` method**

Add to `MockCAWClient` after `approve_card`:

```python
    def assign_card(self, card_id: str, agent_id: str, agent_name: str) -> Dict[str, Any]:
        card = self._get_card_or_raise(card_id)
        if card.status != "ACTIVE":
            raise ValueError(f"Card {card_id} must be ACTIVE before assignment (status={card.status})")
        if not agent_id.strip():
            raise ValueError("agent_id is required")
        if not agent_name.strip():
            raise ValueError("agent_name is required")

        now = datetime.now(timezone.utc).isoformat()
        card.assigned_agent_id = agent_id
        card.assigned_agent_name = agent_name
        card.assigned_at = now
        self._log_audit("CARD_ASSIGNED", card_id, {
            "assigned_agent_id": agent_id,
            "assigned_agent_name": agent_name,
        })
        return {
            "card_id": card_id,
            "status": "ASSIGNED",
            "assigned_agent_id": agent_id,
            "assigned_agent_name": agent_name,
            "assigned_at": now,
        }
```

- [ ] **Step 5: Require agent_id in `submit_payment`**

Change `submit_payment` signature:

```python
    def submit_payment(
        self,
        card_id: str,
        vendor: str,
        amount: float,
        agent_id: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
```

After active-card check and before amount check, add:

```python
        if not card.assigned_agent_id:
            reason = "PERMISSION_DENIED: card_not_assigned"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason, metadata=meta)
            return self._payment_result(tx, card, "DENIED", reason)

        if agent_id != card.assigned_agent_id:
            reason = f"PERMISSION_DENIED: agent_not_assigned ({agent_id} cannot use {card.card_id})"
            tx = self._record_tx(tx_id, card, vendor, vendor_addr, amount, "DENIED", reason, metadata=meta)
            return self._payment_result(tx, card, "DENIED", reason)
```

- [ ] **Step 6: Return assignment fields from `_card_to_dict`**

In `_card_to_dict`, add these keys:

```python
            "card_name": card.card_name or card.agent_name,
            "assigned_agent_id": card.assigned_agent_id,
            "assigned_agent_name": card.assigned_agent_name,
            "assigned_at": card.assigned_at,
```

Keep existing `agent_id` and `agent_name` for compatibility.

- [ ] **Step 7: Run tests**

```bash
pytest tests/test_card_assignment_api.py tests/test_marketplace_api.py -v
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/mock_caw_client.py tests/test_card_assignment_api.py
git commit -m "feat: enforce mock card assignment before payment"
```

---

### Task 3: FastAPI Assignment Endpoint and Payment Guard

**Files:**
- Modify: `backend/main.py`
- Test: `tests/test_card_assignment_api.py`

- [ ] **Step 1: Add failing API tests**

Append to `tests/test_card_assignment_api.py`:

```python
from fastapi.testclient import TestClient
import main


def test_assign_card_endpoint_persists_assignment():
    main._caw_instance = None
    client = TestClient(main.app)
    provider = client.get("/providers/x402").json()[0]
    created = client.post("/cards", json={
        "agent_name": "Research API Card",
        "monthly_budget": 100,
        "single_tx_limit": 10,
        "vendor_whitelist": [provider],
        "cooldown_hours": 0,
    }).json()
    client.post(f"/cards/{created['card_id']}/approve")

    response = client.post(f"/cards/{created['card_id']}/assign", json={
        "agent_id": "agent-alpha-research",
        "agent_name": "Alpha Research Agent",
    })

    assert response.status_code == 200
    payload = response.json()
    assert payload["assigned_agent_id"] == "agent-alpha-research"

    card = client.get(f"/cards/{created['card_id']}").json()
    assert card["assigned_agent_id"] == "agent-alpha-research"
    assert card["assigned_agent_name"] == "Alpha Research Agent"


def test_payments_endpoint_rejects_unassigned_employee():
    main._caw_instance = None
    client = TestClient(main.app)
    provider = client.get("/providers/x402").json()[0]
    created = client.post("/cards", json={
        "agent_name": "Research API Card",
        "monthly_budget": 100,
        "single_tx_limit": 10,
        "vendor_whitelist": [provider],
        "cooldown_hours": 0,
    }).json()
    client.post(f"/cards/{created['card_id']}/approve")
    client.post(f"/cards/{created['card_id']}/assign", json={
        "agent_id": "agent-alpha-research",
        "agent_name": "Alpha Research Agent",
    })

    response = client.post("/payments", json={
        "agent_id": "agent-beta-growth",
        "card_id": created["card_id"],
        "vendor": provider["name"],
        "amount": 1.0,
        "purpose": "wrong employee tries payment",
    })

    assert response.status_code == 200
    assert response.json()["status"] == "DENIED"
    assert "agent_not_assigned" in response.json()["reason"]


def test_payments_endpoint_approves_assigned_employee():
    main._caw_instance = None
    client = TestClient(main.app)
    provider = client.get("/providers/x402").json()[0]
    created = client.post("/cards", json={
        "agent_name": "Research API Card",
        "monthly_budget": 100,
        "single_tx_limit": 10,
        "vendor_whitelist": [provider],
        "cooldown_hours": 0,
    }).json()
    client.post(f"/cards/{created['card_id']}/approve")
    client.post(f"/cards/{created['card_id']}/assign", json={
        "agent_id": "agent-alpha-research",
        "agent_name": "Alpha Research Agent",
    })

    response = client.post("/payments", json={
        "agent_id": "agent-alpha-research",
        "card_id": created["card_id"],
        "vendor": provider["name"],
        "amount": 1.0,
        "purpose": "assigned employee payment",
    })

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"
```

- [ ] **Step 2: Run API tests to verify failure**

```bash
pytest tests/test_card_assignment_api.py -v
```

Expected: FAIL because `/cards/{card_id}/assign` does not exist and `/payments` does not pass `agent_id`.

- [ ] **Step 3: Import new models**

Modify `backend/main.py` model imports:

```python
    AssignCardRequest,
    AssignCardResponse,
```

- [ ] **Step 4: Add assignment endpoint**

Add after `approve_card` and before `revoke_card`:

```python
@app.post("/cards/{card_id}/assign", response_model=AssignCardResponse)
def assign_card(card_id: str, req: AssignCardRequest):
    """Assign an ACTIVE permission card to one OPC digital employee."""
    try:
        result = _caw().assign_card(
            card_id=card_id,
            agent_id=req.agent_id,
            agent_name=req.agent_name,
        )
        return AssignCardResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
```

- [ ] **Step 5: Pass `agent_id` to payment client**

Modify `/payments` in `backend/main.py`:

```python
        meta = req.metadata or {}
        if req.purpose:
            meta["purpose"] = req.purpose
        meta["agent_id"] = req.agent_id
        result = _caw().submit_payment(
            card_id=req.card_id,
            agent_id=req.agent_id,
            vendor=req.vendor,
            amount=req.amount,
            metadata=meta,
        )
```

- [ ] **Step 6: Update attack scenarios for new signature**

In `run_attack`, get the card first and use its assignment if present:

```python
    card = caw.get_card(card_id)
    attack_agent_id = card.get("assigned_agent_id") or card.get("agent_id") or "attack-agent"
```

Then update every `caw.submit_payment(...)` in `run_attack` to include `agent_id=attack_agent_id`.

Example:

```python
result = caw.submit_payment(card_id, "0xEvilHacker", 500.0, agent_id=attack_agent_id, metadata=meta)
```

- [ ] **Step 7: Run backend test suite**

```bash
pytest tests -v
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/main.py tests/test_card_assignment_api.py
git commit -m "feat: add card assignment endpoint and payment guard"
```

---

### Task 4: Real CAW Metadata Overlay for Assignment

**Files:**
- Modify: `src/real_caw_client.py`
- Test: `tests/test_cards_api.py`

- [ ] **Step 1: Add failing real-client metadata test**

Append to `tests/test_cards_api.py`:

```python
def test_real_caw_list_cards_preserves_assignment_metadata_after_api_refresh():
    client = RealCAWClient.__new__(RealCAWClient)
    client.wallet_uuid = "wallet-123"
    client._owner = "OPC Owner"
    client._cards = {
        "pact-http-1": {
            "card_id": "pact-http-1",
            "agent_name": "Research API Card",
            "card_name": "Research API Card",
            "agent_id": "legacy-card-agent",
            "owner": "OPC Owner",
            "status": "PENDING_APPROVAL",
            "budget": {"currency": "USDC", "monthly_max": 200.0, "spent": 0.0, "single_tx_limit": 50.0},
            "vendor_whitelist": [],
            "cooldown_hours": 6,
            "created_at": "2026-06-10T00:00:00+00:00",
            "expires_at": "2026-07-10T00:00:00+00:00",
            "api_key": "",
            "assigned_agent_id": "agent-alpha-research",
            "assigned_agent_name": "Alpha Research Agent",
            "assigned_at": "2026-06-11T01:00:00+00:00",
        }
    }

    class LoopPoisonedSDK:
        def list_pacts(self, **kwargs):
            raise AssertionError("SDK list_pacts should not be called when HTTP succeeds")

    client._client = LoopPoisonedSDK()

    def fake_http_get_json(path, params):
        return {
            "result": {
                "pacts": [
                    {
                        "pact_id": "pact-http-1",
                        "intent": "Issue spending card for Research API Card",
                        "status": "APPROVED",
                        "spec": {"policies": []},
                        "created_at": "2026-06-10T00:00:00+00:00",
                        "expires_at": None,
                    }
                ]
            }
        }

    client._http_get_json = fake_http_get_json

    cards = client.list_cards()

    assert cards[0]["status"] == "ACTIVE"
    assert cards[0]["card_name"] == "Research API Card"
    assert cards[0]["assigned_agent_id"] == "agent-alpha-research"
    assert cards[0]["assigned_agent_name"] == "Alpha Research Agent"
    assert cards[0]["assigned_at"] == "2026-06-11T01:00:00+00:00"
```

- [ ] **Step 2: Run targeted test**

```bash
pytest tests/test_cards_api.py::test_real_caw_list_cards_preserves_assignment_metadata_after_api_refresh -v
```

Expected: FAIL until RealCAWClient carries assignment overlay through refresh.

- [ ] **Step 3: Implement `assign_card` in RealCAWClient**

In `src/real_caw_client.py`, add a method following the client’s existing style:

```python
    def assign_card(self, card_id: str, agent_id: str, agent_name: str) -> Dict[str, Any]:
        card = self.get_card(card_id)
        if card.get("status") != "ACTIVE":
            raise ValueError(f"Card {card_id} must be ACTIVE before assignment (status={card.get('status')})")
        now = datetime.now(timezone.utc).isoformat()
        next_card = dict(card)
        next_card["card_name"] = next_card.get("card_name") or next_card.get("agent_name") or card_id
        next_card["assigned_agent_id"] = agent_id
        next_card["assigned_agent_name"] = agent_name
        next_card["assigned_at"] = now
        self._cards[card_id] = next_card
        return {
            "card_id": card_id,
            "status": "ASSIGNED",
            "assigned_agent_id": agent_id,
            "assigned_agent_name": agent_name,
            "assigned_at": now,
        }
```

Ensure `datetime` and `timezone` are imported if not already.

- [ ] **Step 4: Preserve assignment fields during refresh merge**

Find the existing local metadata merge in `list_cards`. Ensure refreshed cards copy these keys from previous local card when provider refresh lacks them:

```python
for key in [
    "card_name",
    "assigned_agent_id",
    "assigned_agent_name",
    "assigned_at",
    "vendor_whitelist",
    "x402_url",
    "erc8004_agent_id",
    "erc8004_registry_url",
]:
    if existing.get(key) and not refreshed.get(key):
        refreshed[key] = existing[key]
```

If there is already a merge helper, add the four assignment keys there instead of duplicating merge logic.

- [ ] **Step 5: Decide real-payment behavior**

Before submitting real CAW payment, RealCAWClient must enforce local assignment just like mock. Add at the top of real `submit_payment`:

```python
card = self.get_card(card_id)
if not card.get("assigned_agent_id"):
    return self._denied_payment_result(card_id, agent_id, vendor, amount, "PERMISSION_DENIED: card_not_assigned", metadata)
if card.get("assigned_agent_id") != agent_id:
    return self._denied_payment_result(card_id, agent_id, vendor, amount, f"PERMISSION_DENIED: agent_not_assigned ({agent_id} cannot use {card_id})", metadata)
```

If no `_denied_payment_result` helper exists, create one that returns the same shape as `PaymentResponse`:

```python
    def _denied_payment_result(self, card_id: str, agent_id: str, vendor: str, amount: float, reason: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        card = self.get_card(card_id)
        remaining = float(card.get("budget", {}).get("monthly_max", 0) or 0) - float(card.get("budget", {}).get("spent", 0) or 0)
        return {
            "status": "DENIED",
            "reason": reason,
            "tx_id": None,
            "amount": amount,
            "vendor": vendor,
            "remaining_budget": remaining,
            "tx_hash": None,
            "alert_level": "blocked",
        }
```

- [ ] **Step 6: Run real-client tests**

```bash
pytest tests/test_cards_api.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/real_caw_client.py tests/test_cards_api.py
git commit -m "feat: preserve real card assignment metadata"
```

---

### Task 5: Frontend API Types and CardPact Shape

**Files:**
- Modify: `web/src/api/caw.ts`
- Modify: `web/src/data/mockData.ts`

- [ ] **Step 1: Update `CardPact` type**

In `web/src/data/mockData.ts`, add optional fields to `CardPact`:

```ts
  card_name?: string;
  assigned_agent_id?: string | null;
  assigned_agent_name?: string | null;
  assigned_at?: string | null;
```

Keep existing `agent_id` / `agent_name` fields during transition.

- [ ] **Step 2: Update frontend API types**

In `web/src/api/caw.ts`, add:

```ts
export type AssignCardPayload = {
  agent_id: string;
  agent_name: string;
};

export type AssignCardResponse = {
  card_id: string;
  status: string;
  assigned_agent_id: string;
  assigned_agent_name: string;
  assigned_at: string;
};
```

Modify `PaymentPayload`:

```ts
export type PaymentPayload = {
  agent_id: string;
  card_id: string;
  vendor: string;
  amount: number;
  purpose?: string;
  metadata?: Record<string, any>;
};
```

Add API method:

```ts
  assignCard: (cardId: string, payload: AssignCardPayload) =>
    api<AssignCardResponse>(`/cards/${cardId}/assign`, { method: 'POST', body: JSON.stringify(payload) }),
```

Place it near `approveCard` and `revokeCard`.

- [ ] **Step 3: Run TypeScript build to reveal downstream failures**

```bash
cd web && npm run build
```

Expected: FAIL because `submitPayment` call lacks `agent_id` until AgentConsole is updated.

- [ ] **Step 4: Commit only if build failure matches expected missing field**

Do not commit if there are unrelated TypeScript errors. If expected, commit API type work:

```bash
git add web/src/api/caw.ts web/src/data/mockData.ts
git commit -m "feat: add frontend card assignment API types"
```

---

### Task 6: Agent Console Explicit Assignment UI

**Files:**
- Modify: `web/src/pages/AgentConsole.tsx`
- Modify: `web/src/i18n/locales/zh.json`
- Modify: `web/src/i18n/locales/en.json`

- [ ] **Step 1: Replace derived card selection model**

In `AgentConsole.tsx`, keep all loaded active cards but derive assignment-aware sets:

```ts
  const cardsForSelectedEmployee = useMemo(
    () => activeCards.filter((c) => c.assigned_agent_id === selectedEmployeeId),
    [activeCards, selectedEmployeeId]
  );

  const assignableCards = useMemo(
    () => activeCards.filter((c) => !c.assigned_agent_id || c.assigned_agent_id === selectedEmployeeId),
    [activeCards, selectedEmployeeId]
  );
```

Add state:

```ts
  const [assignmentCardId, setAssignmentCardId] = useState(searchParams.get('card_id') || '');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
```

Change payment card derivation:

```ts
  const selectedCardId = selectedCard || cardsForSelectedEmployee[0]?.card_id || '';
  const card = cardsForSelectedEmployee.find((c) => c.card_id === selectedCardId) || cardsForSelectedEmployee[0] || null;
```

- [ ] **Step 2: Add explicit assignment handler**

Add below `handleCardChange`:

```ts
  const handleAssignCard = async () => {
    if (!selectedEmployee || !assignmentCardId) return;
    setAssignmentLoading(true);
    setResult(null);
    try {
      await cawApi.assignCard(assignmentCardId, {
        agent_id: selectedEmployee.agent_id,
        agent_name: selectedEmployee.name,
      });
      setSelectedCard(assignmentCardId);
      setSearchParams({ card_id: assignmentCardId });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setAssignmentLoading(false);
    }
  };
```

- [ ] **Step 3: Pass `agent_id` in payment submission**

Modify `submitPayment` payload:

```ts
      const response = await cawApi.submitPayment({
        agent_id: selectedEmployee?.agent_id || '',
        card_id: card.card_id,
        vendor: effectiveVendor,
        amount: parseFloat(amount),
        purpose: purpose.trim(),
        metadata: {
          source: 'agent_console',
          assigned_employee_id: selectedEmployee?.agent_id,
          assigned_employee_name: selectedEmployee?.name,
        },
      });
```

Also update `isFormValid`:

```ts
  const isFormValid = !!selectedEmployee && !!card && Object.keys(errors).length === 0 && parseFloat(amount) > 0 && purpose.trim().length > 0 && !!effectiveVendor;
```

- [ ] **Step 4: Replace top assignment panel JSX**

Replace the top “Agent Assignment” panel body with explicit assignment controls:

```tsx
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.selectEmployee')}</label>
            <select
              value={selectedEmployee?.agent_id || ''}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setSelectedCard('');
                setResult(null);
              }}
              className="w-full px-3 py-2 rounded-im text-sm input-kinpaku"
            >
              {employees.map((employee) => (
                <option key={employee.agent_id} value={employee.agent_id}>
                  {employee.name} — {employee.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">{t('agent.assignableCard')}</label>
            <div className="flex gap-2">
              <select
                value={assignmentCardId}
                onChange={(e) => setAssignmentCardId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-im text-sm input-kinpaku"
              >
                <option value="">{t('agent.selectCardToAssign')}</option>
                {assignableCards.map((c) => (
                  <option key={c.card_id} value={c.card_id}>
                    {(c.card_name || c.agent_name)} — ${c.budget.spent.toFixed(0)} / ${c.budget.monthly_max}
                    {c.assigned_agent_id === selectedEmployeeId ? ` · ${t('agent.alreadyAssigned')}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignCard}
                disabled={!selectedEmployee || !assignmentCardId || assignmentLoading}
                className="px-3 py-2 rounded-im text-sm btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignmentLoading ? t('common.processing') : t('agent.confirmAssignment')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-im bg-bg-primary border border-border-default p-3 text-xs text-text-secondary flex items-center gap-3">
          <EmployeeAvatar employee={selectedEmployee} label={selectedEmployee?.name} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-text-primary">{t('agent.assignedCards')}</p>
            <p className="mt-1 truncate">
              {cardsForSelectedEmployee.length > 0
                ? cardsForSelectedEmployee.map((c) => c.card_name || c.agent_name).join(' · ')
                : t('agent.noAssignedCardsForEmployee')}
            </p>
            {selectedEmployee && (
              <p className="mt-1 text-text-muted truncate">ERC-8004: {selectedEmployee.erc8004_agent_id}</p>
            )}
          </div>
        </div>
```

- [ ] **Step 5: Update payment form card select to assigned cards only**

Replace `activeCards.map` with `cardsForSelectedEmployee.map`:

```tsx
                  {cardsForSelectedEmployee.map((c) => (
                    <option key={c.card_id} value={c.card_id}>
                      {(c.card_name || c.agent_name)} — ${c.budget.spent.toFixed(0)} / ${c.budget.monthly_max} {t('common.usdc')}
                    </option>
                  ))}
```

- [ ] **Step 6: Update no-card state**

The existing `if (!card)` should now distinguish no active cards vs no assigned cards. Use this heading text:

```tsx
<h2 className="text-base font-semibold text-text-primary">
  {activeCards.length === 0 ? t('agent.noActiveCards') : t('agent.noAssignedCards')}
</h2>
<p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">
  {activeCards.length === 0 ? t('agent.noActiveCardsDesc') : t('agent.noAssignedCardsDesc')}
</p>
```

Keep link to `/cards` and retry button.

- [ ] **Step 7: Update locale copy**

In `web/src/i18n/locales/zh.json`, under `agent`, use:

```json
"newPaymentRequest": "发起 x402 服务调用",
"submitPaymentRequest": "提交智能体支付请求",
"assignCardTitle": "分配权限卡给员工智能体",
"assignCardDesc": "先选择员工智能体，再把一张已激活权限卡持久分配给它。支付请求只能使用已分配卡片。",
"assignableCard": "可分配权限卡",
"selectCardToAssign": "选择要分配的卡片",
"confirmAssignment": "确认分配",
"alreadyAssigned": "已分配",
"assignedCards": "已分配卡片",
"noAssignedCards": "当前员工还没有分配权限卡",
"noAssignedCardsDesc": "请先在上方选择一张已激活卡片并点击确认分配，然后再发起 x402 服务调用。",
"noAssignedCardsForEmployee": "这个员工还没有分配卡片"
```

In `web/src/i18n/locales/en.json`, under `agent`, use:

```json
"newPaymentRequest": "Start x402 Service Call",
"submitPaymentRequest": "Submit Agent Payment Request",
"assignCardTitle": "Assign Permission Card to Digital Employee",
"assignCardDesc": "Select a digital employee, then persistently assign one active permission card. Payment requests can only use assigned cards.",
"assignableCard": "Assignable permission card",
"selectCardToAssign": "Select a card to assign",
"confirmAssignment": "Confirm assignment",
"alreadyAssigned": "assigned",
"assignedCards": "Assigned cards",
"noAssignedCards": "This employee has no assigned permission card",
"noAssignedCardsDesc": "Choose an active card above and confirm assignment before starting an x402 service call.",
"noAssignedCardsForEmployee": "This employee has no assigned cards"
```

- [ ] **Step 8: Run frontend build**

```bash
cd web && npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add web/src/pages/AgentConsole.tsx web/src/i18n/locales/zh.json web/src/i18n/locales/en.json
git commit -m "feat: make agent card assignment explicit"
```

---

### Task 7: Cards Page Copy and Assignment Status

**Files:**
- Modify: `web/src/pages/Cards.tsx`
- Modify: `web/src/i18n/locales/zh.json`
- Modify: `web/src/i18n/locales/en.json`

- [ ] **Step 1: Update Cards CTA semantics**

In `Cards.tsx`, keep route behavior but change the active-card CTA visual meaning. The existing button navigates to:

```ts
navigate(`/agent?card_id=${encodeURIComponent(card.card_id)}`);
```

Keep that navigation. Change locale key `cards.useInAgent` text to assignment-focused.

`zh.json`:

```json
"useInAgent": "去分配给智能体"
```

`en.json`:

```json
"useInAgent": "Assign to agent"
```

- [ ] **Step 2: Display assignment status on each card**

In `Cards.tsx`, near the card header metadata below card id, add:

```tsx
                      <p className="text-xs text-text-muted mt-0.5">
                        {card.assigned_agent_name
                          ? `${t('cards.assignedTo')}: ${card.assigned_agent_name}`
                          : t('cards.notAssigned')}
                      </p>
```

Add locale keys.

`zh.json` under `cards`:

```json
"assignedTo": "已分配给",
"notAssigned": "尚未分配"
```

`en.json` under `cards`:

```json
"assignedTo": "Assigned to",
"notAssigned": "Not assigned"
```

- [ ] **Step 3: Clarify creation form label**

The code already maps `cards.agentName` to “卡片名称” in Chinese. Make English match:

`en.json` under `cards`:

```json
"agentName": "Card name",
"agentNamePlaceholder": "e.g. Research API monthly card",
"agentNameRequired": "Card name is required"
```

- [ ] **Step 4: Run frontend build**

```bash
cd web && npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/Cards.tsx web/src/i18n/locales/zh.json web/src/i18n/locales/en.json
git commit -m "fix: clarify card assignment copy"
```

---

### Task 8: End-to-End Verification

**Files:**
- No code changes unless verification exposes defects.

- [ ] **Step 1: Run backend tests**

```bash
pytest tests -v
```

Expected: all tests PASS.

- [ ] **Step 2: Run frontend build**

```bash
cd web && npm run build
```

Expected: TypeScript and Vite build PASS.

- [ ] **Step 3: Start backend in mock mode**

```bash
CAW_MODE=mock uvicorn main:app --port 8000
```

Run from:

```bash
cd /home/neo/neo-ai-web3-school-cohort-0/hackathon/project/backend
```

Expected log includes Uvicorn running on `http://127.0.0.1:8000`.

- [ ] **Step 4: Start frontend preview**

In another process:

```bash
cd /home/neo/neo-ai-web3-school-cohort-0/hackathon/project/web
npx vite preview --port 5173 --host 127.0.0.1
```

Expected preview available at `http://127.0.0.1:5173`.

- [ ] **Step 5: Verify API flow with curl**

Run:

```bash
PROVIDER_JSON=$(curl -s http://127.0.0.1:8000/providers/x402 | python -c 'import json,sys; print(json.dumps(json.load(sys.stdin)[0]))')
CARD_ID=$(curl -s -X POST http://127.0.0.1:8000/cards \
  -H 'Content-Type: application/json' \
  -d "{\"agent_name\":\"Research API Card\",\"monthly_budget\":100,\"single_tx_limit\":10,\"vendor_whitelist\":[$PROVIDER_JSON],\"cooldown_hours\":0}" \
  | python -c 'import json,sys; print(json.load(sys.stdin)["card_id"])')
curl -s -X POST http://127.0.0.1:8000/cards/$CARD_ID/approve | python -m json.tool
curl -s -X POST http://127.0.0.1:8000/cards/$CARD_ID/assign \
  -H 'Content-Type: application/json' \
  -d '{"agent_id":"agent-alpha-research","agent_name":"Alpha Research Agent"}' \
  | python -m json.tool
curl -s -X POST http://127.0.0.1:8000/payments \
  -H 'Content-Type: application/json' \
  -d "{\"agent_id\":\"agent-alpha-research\",\"card_id\":\"$CARD_ID\",\"vendor\":\"BlockRun AI Gateway\",\"amount\":1,\"purpose\":\"verify assigned payment\"}" \
  | python -m json.tool
curl -s -X POST http://127.0.0.1:8000/payments \
  -H 'Content-Type: application/json' \
  -d "{\"agent_id\":\"agent-beta-growth\",\"card_id\":\"$CARD_ID\",\"vendor\":\"BlockRun AI Gateway\",\"amount\":1,\"purpose\":\"verify rejected payment\"}" \
  | python -m json.tool
```

Expected:
- Assignment response has `status: ASSIGNED`.
- Alpha payment has `status: APPROVED`.
- Beta payment has `status: DENIED` and reason contains `agent_not_assigned`.

- [ ] **Step 6: Browser smoke test**

Open `http://127.0.0.1:5173`.

Manual checks:
1. Cards page: create a card named “Research API Card”.
2. Approve it.
3. Card shows “尚未分配 / Not assigned”.
4. Click “去分配给智能体 / Assign to agent”.
5. Agent Console opens with `card_id` in URL.
6. Select Alpha Research Agent.
7. Select Research API Card in assignment control.
8. Click “确认分配”.
9. Assigned cards panel shows Research API Card.
10. Payment panel title says “发起 x402 服务调用”.
11. Submit a 1 USDC payment to an allowed provider.
12. Result says approved.
13. Switch to another employee and verify that same card is not usable unless assigned.

- [ ] **Step 7: Commit verification fixes if any**

If verification exposes defects, fix them and commit:

```bash
git add <changed-files>
git commit -m "fix: complete assignment payment verification"
```

- [ ] **Step 8: Final commit status**

```bash
git status --short
git log --oneline -5
```

Expected: clean working tree, recent commits show assignment work.

---

## Self-Review

**Spec coverage:**
- Durable card-to-agent binding: Tasks 1-4.
- Backend payment enforcement: Tasks 2-4.
- UI distinction between assignment and payment: Tasks 6-7.
- “新建支付请求” meaning clarified: Task 6 locale copy.
- Card creation no longer implies agent binding: Task 7 copy/status.
- Verification: Task 8.

**Placeholder scan:** No TBD/TODO/fill-in placeholders. Each code-changing task has concrete snippets and commands.

**Type consistency:** Uses `assigned_agent_id`, `assigned_agent_name`, `assigned_at`, `card_name`, and `agent_id` consistently across backend models, mock/real clients, API client, and React pages.
