# CLAUDE.md

## Project Overview

ClawHuddle is a multi-tenant platform for managing OpenClaw AI gateway instances. Each org member gets a personal OpenClaw Docker container with auto-provisioned config, credentials, and skills.

## Architecture

```
Monorepo
├── apps/api          Fastify + SQLite backend (dockerode for container management)
├── apps/web          Next.js 16 frontend (NextAuth v5)
├── packages/shared   Shared types, provider definitions
└── vendor/claw-proxy Git submodule — OpenAI-compatible proxy for Claude Max
```

**Data flow**: Frontend → API server → generates `openclaw.json` + `auth-profiles.json` → mounts into per-user Docker containers → OpenClaw gateway reads config on startup.

## Claw Proxy Integration

claw-proxy routes OpenAI-format requests through `claude -p` CLI using Claude Max subscriptions. It registers as a **custom OpenClaw provider** (not env var override).

### How it works

1. Admin sets `CLAW_PROXY_URL=http://claw-proxy:3456/v1` in `.env`
2. Admin adds bearer token via UI under "Claw Proxy (Claude Max)" provider
3. On gateway provision/redeploy, `generateOpenClawConfig()` writes a `models.providers.claw` section into `openclaw.json` with:
   - `baseUrl` + `apiKey` (bearer token from DB)
   - `api: "openai-completions"`
   - Full model definitions (id, name, reasoning, contextWindow, cost=0)
4. Model IDs use `claw/` prefix (e.g. `claw/claude-sonnet-4-6`)
5. Bearer token goes into `openclaw.json` directly — NOT `auth-profiles.json`

### Key env vars

| Variable | Where | Purpose |
|----------|-------|---------|
| `CLAW_PROXY_URL` | API server `.env` | Base URL for claw-proxy (default: `http://claw-proxy:3456/v1`) |

### Frontend behavior

- `GET /api/system/proxy-status` returns `{ proxyEnabled }` based on `CLAW_PROXY_URL` env var
- When proxy is disabled, the entire "Claw Proxy" provider card is hidden (all models are `proxyOnly: true`)
- When proxy is enabled, admin sees the card with bearer token input and model selector

### Starting claw-proxy

```bash
docker compose --profile proxy up -d --build
```

Config: `data/claw-proxy/config.json` (bearerToken + accounts with oauthTokens from `claude setup-token`).

## Provider System

Providers are defined in `packages/shared/src/index.ts` as `PROVIDERS` array. Each has:
- `id`, `label`, `envVar`, `placeholder`, `defaultModel`
- `models[]` — available models (with optional `proxyOnly` flag)
- Optional: `supportsSetupToken`, `supportsOAuth`

API keys are stored in `api_keys` table (org-scoped), written to `auth-profiles.json` for standard providers, or embedded in `openclaw.json` for custom providers (claw-proxy).

## Config Generation

`apps/api/src/services/openclaw-config.ts`:
- `generateOpenClawConfig()` — creates full `openclaw.json` from options
- `mergeOpenClawConfig()` — updates platform-managed fields while preserving user customizations

Platform-managed fields: `meta`, `gateway.*`, `models.providers.claw`, `agents.defaults`, `channels`, `plugins`.

## Build & Run

```bash
# Local dev
npm install
npm run dev          # starts api (4000) + web (3000)

# Docker
docker compose up -d --build                    # api + web
docker compose --profile proxy up -d --build    # + claw-proxy
```
