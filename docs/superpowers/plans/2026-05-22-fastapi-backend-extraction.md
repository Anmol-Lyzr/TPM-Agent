# FastAPI Backend Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI backend in `backend/` that replaces the existing Next.js API routes while preserving frontend request and response contracts.

**Architecture:** The backend is a standalone FastAPI service with route modules and service modules for Lyzr, parsing, sessions, analytics, metadata, and meeting context. The Next.js app remains frontend-only and calls FastAPI through `NEXT_PUBLIC_API_BASE_URL`.

**Tech Stack:** FastAPI, Pydantic, PyMongo, httpx, pytest, Next.js, TypeScript.

---

## File Structure

- Create `backend/requirements.txt` for FastAPI runtime and test dependencies.
- Create `backend/app/main.py` for app creation, CORS, and route registration.
- Create `backend/app/core/config.py` for environment configuration.
- Create `backend/app/models/meeting.py` for structured payload validation.
- Create `backend/app/services/lyzr.py` for upstream Lyzr calls.
- Create `backend/app/services/payload_parser.py` for response extraction.
- Create `backend/app/services/session_store.py` for Mongo-backed session persistence.
- Create `backend/app/services/analytics.py` for dashboard totals.
- Create `backend/app/services/meeting_context.py` for console prompt context.
- Create `backend/app/routes/agent.py`, `console.py`, `sessions.py`, `analytics.py`, and `metadata.py`.
- Create `backend/tests/` contract and service tests.
- Modify `src/lib/agentClient.ts`, `src/lib/consoleClient.ts`, and `src/lib/sessionStore.ts` to use `NEXT_PUBLIC_API_BASE_URL`.
- Modify `.env.example` and `README.md` for dual-service local setup.
- Remove `src/app/api/**` after UI clients are verified.

### Task 1: Backend Scaffold and Health

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing health test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: FAIL because `app.main` does not exist.

- [ ] **Step 3: Implement FastAPI scaffold**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    fastapi_app = FastAPI(title="TPM Agent Backend")
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @fastapi_app.get("/health")
    def health() -> dict[str, bool]:
        return {"ok": True}

    return fastapi_app


app = create_app()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: PASS.

### Task 2: Payload Models and Parser

**Files:**
- Create: `backend/app/models/meeting.py`
- Create: `backend/app/services/payload_parser.py`
- Create: `backend/tests/test_payload_parser.py`

- [ ] **Step 1: Write failing parser tests**

Test direct payload, fenced JSON string, nested payload, and unrelated responses returning `None`.

- [ ] **Step 2: Run parser tests to verify failure**

Run: `cd backend && pytest tests/test_payload_parser.py -v`
Expected: FAIL because parser module does not exist.

- [ ] **Step 3: Implement Pydantic models and parser**

Port the existing TypeScript schema and `extractAgentPayload` traversal rules into Python.

- [ ] **Step 4: Run parser tests to verify pass**

Run: `cd backend && pytest tests/test_payload_parser.py -v`
Expected: PASS.

### Task 3: Lyzr and Agent Routes

**Files:**
- Create: `backend/app/services/lyzr.py`
- Create: `backend/app/routes/agent.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_agent_routes.py`

- [ ] **Step 1: Write failing route tests**

Cover missing env, missing message, successful Lyzr response parsing, persistence success, and persistence failure returning `persisted: false`.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && pytest tests/test_agent_routes.py -v`
Expected: FAIL because route does not exist.

- [ ] **Step 3: Implement Lyzr service and `/api/agent` route**

Use `httpx.AsyncClient` to call `https://agent-prod.studio.lyzr.ai/v3/inference/chat/` with the same JSON body and `x-api-key` header used today.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && pytest tests/test_agent_routes.py -v`
Expected: PASS.

### Task 4: Sessions, Analytics, and Console Routes

**Files:**
- Create: `backend/app/services/session_store.py`
- Create: `backend/app/services/analytics.py`
- Create: `backend/app/services/meeting_context.py`
- Create: `backend/app/routes/sessions.py`
- Create: `backend/app/routes/analytics.py`
- Create: `backend/app/routes/console.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_sessions_routes.py`
- Create: `backend/tests/test_analytics.py`
- Create: `backend/tests/test_console_route.py`

- [ ] **Step 1: Write failing service and route tests**

Cover session list shape, get not found, put response shape, delete response, analytics totals, console missing message, console missing meeting session, and console attached meeting response.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && pytest tests/test_sessions_routes.py tests/test_analytics.py tests/test_console_route.py -v`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement stores, services, and routes**

Preserve current field names including `sessionId`, `createdAt`, `updatedAt`, `hasTranscript`, `planCount`, `issuesCount`, and `raidCount`.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && pytest tests/test_sessions_routes.py tests/test_analytics.py tests/test_console_route.py -v`
Expected: PASS.

### Task 5: Metadata and Integrations Routes

**Files:**
- Create: `backend/app/routes/metadata.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_metadata_routes.py`

- [ ] **Step 1: Write failing metadata tests**

Cover `/api/agent/metadata` runtime masking and `/api/agent/integrations` static provider payload.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend && pytest tests/test_metadata_routes.py -v`
Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement metadata and integrations routes**

Port the current `TPM_AGENT_METADATA` and integrations catalog into Python constants.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd backend && pytest tests/test_metadata_routes.py -v`
Expected: PASS.

### Task 6: UI Client Migration

**Files:**
- Modify: `src/lib/agentClient.ts`
- Modify: `src/lib/consoleClient.ts`
- Modify: `src/lib/sessionStore.ts`
- Modify: `.env.example`
- Create: `src/lib/apiBase.ts`

- [ ] **Step 1: Add a failing TypeScript check target**

Run: `npm run lint`
Expected: existing lint must pass before edits or reveal pre-existing issues.

- [ ] **Step 2: Implement API base helper and update clients**

Use `process.env.NEXT_PUBLIC_API_BASE_URL ?? ""`, strip trailing slashes, and preserve relative paths as fallback.

- [ ] **Step 3: Run frontend verification**

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

### Task 7: Remove Next.js API Routes and Verify End-to-End

**Files:**
- Delete: `src/app/api/agent/route.ts`
- Delete: `src/app/api/agent/metadata/route.ts`
- Delete: `src/app/api/agent/integrations/route.ts`
- Delete: `src/app/api/console/chat/route.ts`
- Delete: `src/app/api/sessions/route.ts`
- Delete: `src/app/api/sessions/[sessionId]/route.ts`
- Delete: `src/app/api/analytics/route.ts`
- Modify: `README.md`

- [ ] **Step 1: Run full backend tests**

Run: `cd backend && pytest -v`
Expected: PASS.

- [ ] **Step 2: Run frontend checks**

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Start local backend and frontend**

Run: `cd backend && uvicorn app.main:app --reload --port 8000`
Expected: FastAPI starts on `http://127.0.0.1:8000`.

Run: `npm run dev`
Expected: Next.js starts on `http://localhost:3000`.

- [ ] **Step 4: Smoke check**

Open the UI and confirm metadata/session/analytics requests hit FastAPI. Use fake or configured Lyzr credentials only when testing live `/api/agent`.
