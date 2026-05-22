# FastAPI Backend Extraction Design

## Goal

Move all existing server-side API behavior out of the Next.js app and into a new `backend/` FastAPI service while preserving the current browser-facing API contracts.

## Approved Scope

FastAPI fully replaces the current Next.js API routes. The browser UI will call FastAPI directly through `NEXT_PUBLIC_API_BASE_URL`, for example `http://localhost:8000`, and response shapes must remain compatible with the current frontend clients.

The first migration ports these existing contracts exactly:

- `POST /api/agent`
- `POST /api/console/chat`
- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `PUT /api/sessions/{session_id}`
- `DELETE /api/sessions/{session_id}`
- `GET /api/analytics`
- `GET /api/agent/metadata`
- `GET /api/agent/integrations`

The existing UI call to `/api/agent/integrations/connect` is outside the current contract because there is no matching Next.js route today.

## Architecture

The Next.js app remains the frontend only. A new `backend/` folder contains a FastAPI app with route modules, service modules, Pydantic models, and tests. FastAPI owns Lyzr inference, structured payload parsing, MongoDB session storage, dashboard analytics, agent metadata, integrations metadata, and console meeting-context assembly.

The UI clients in `src/lib/agentClient.ts`, `src/lib/consoleClient.ts`, and `src/lib/sessionStore.ts` will build URLs from `NEXT_PUBLIC_API_BASE_URL`. Their request bodies and expected responses stay unchanged.

## Backend Components

- `backend/app/main.py`: creates the FastAPI app, registers routers, configures CORS, and exposes a health route.
- `backend/app/core/config.py`: reads environment variables for Lyzr, MongoDB, database name, and allowed CORS origins.
- `backend/app/models/meeting.py`: Pydantic representation of the existing structured meeting payload.
- `backend/app/services/lyzr.py`: calls the Lyzr inference endpoint and creates session IDs.
- `backend/app/services/payload_parser.py`: extracts the structured meeting payload from known Lyzr response shapes, including nested objects and markdown code fences.
- `backend/app/services/session_store.py`: stores, reads, lists, and deletes sessions in MongoDB.
- `backend/app/services/analytics.py`: computes dashboard totals from stored session payloads.
- `backend/app/services/meeting_context.py`: builds the console Q&A context block from a saved meeting.
- `backend/app/routes/*.py`: exposes the approved API contracts.

## Data Flow

For meeting analysis, the browser posts to FastAPI `/api/agent`. FastAPI validates `message`, creates or reuses a session ID, calls Lyzr, parses the returned structured payload, attempts to persist the session in MongoDB, and returns `session_id`, `payload`, `persisted`, and optional `persist_error`.

For console chat, the browser posts to FastAPI `/api/console/chat`. If `meeting_session_id` is provided, FastAPI loads that saved meeting and prepends its context to the user prompt before calling the console agent. The response remains `{ reply, session_id, meeting_attached }`.

Session and analytics routes read and write the same `sessions` collection shape used by the current app: `sessionId`, `payload`, `transcript`, `createdAt`, and `updatedAt`.

## Error Handling

Missing or invalid request fields return `400` with `{ "error": "..." }`. Missing sessions return `404` with the existing frontend-compatible error messages. Lyzr failures return `502`. Mongo failures return `500` for read/write routes. `/api/agent` preserves the current behavior of returning a successful Lyzr response even when persistence fails, with `persisted: false` and `persist_error`.

## Testing

Backend tests cover payload extraction, analytics computation, route validation, metadata/integrations response shape, and session route behavior with a fake store where external MongoDB is not required. UI verification covers TypeScript/lint/build checks and a local smoke test against the FastAPI server when environment values are available.

## Environment

The root `.env.example` gains:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The backend uses the existing server variables:

```env
LYZR_API_KEY=
LYZR_AGENT_ID=
LYZR_CONSOLE_AGENT_ID=
LYZR_USER_ID=
MONGODB_URI=
MONGODB_DB_NAME=TPM
CORS_ORIGINS=http://localhost:3000
```
