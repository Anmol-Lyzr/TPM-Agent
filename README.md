# TPM Agent UI

A Next.js dashboard for the Lyzr TPM Agent. Paste MS Teams meeting transcripts to generate:

- **Project Plan** — Smartsheet-style schedule table
- **Issue Tracker** — Jira issues created or updated
- **Task Tracker** — Work items with owners and dates
- **Minutes of Meeting** — Structured MoM + Confluence link

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` with your Lyzr credentials:

```env
LYZR_API_KEY=your-api-key
LYZR_AGENT_ID=6a06c9cbc5ab512e5b0d21e5
LYZR_USER_ID=anmol@lyzr.ai
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Click **Load sample** to fill a mock MS Teams transcript, or paste your own.
2. Click **Analyze Meeting** — the agent runs Jira and Confluence tools (30–90 seconds).
3. Review the four dashboard panels.
4. Click **New Meeting** to start a fresh session.

## API

The UI calls `POST /api/agent`, which proxies to Lyzr `v3/inference/chat/`. The API key never leaves the server.

## Parser tests

```bash
npm run test:parser
```

## Security

- Never commit `.env.local` or API keys.
- Rotate any key that was shared in plaintext.
