# ClawHuddle

**Self-hosted OpenClaw for teams** — Give every person on your team their own AI assistant.

Each team member gets an isolated [OpenClaw](https://openclaw.ai) instance with zero maintenance. You add people, the system handles the rest.

[English](#features) | [中文](./README_zh.md)

---

## Features

- **Isolated instances** — Every team member gets their own workspace, conversation history, and config. Nothing is shared.
- **Managed skills** — Build a library of custom skills. Assign them to individuals or the whole team from one dashboard.
- **Admin controls** — Invite members, manage API keys, monitor deployments. One place for everything.
- **Zero-touch deploy** — Add someone to your org. Their AI assistant is running within seconds.
- **Private & secure** — Each instance is fully isolated. Conversations, files, and settings never leak between users.
- **Multi-provider** — Bring your own API keys for Anthropic, OpenAI, Google Gemini, or OpenRouter.

## Architecture

```
┌────────────────────────────────────────────────────┐
│                     Traefik                        │
│                  (reverse proxy)                   │
└──────────┬─────────────────┬───────────────────────┘
           │                 │
     ┌─────▼─────┐     ┌─────▼─────┐
     │  Next.js  │     │  Fastify  │
     │  Frontend │     │  API      │
     │  :3000    │     │  :4000    │
     └───────────┘     └─────┬─────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │  OpenClaw │  │  OpenClaw │  │  OpenClaw │
        │  User A   │  │  User B   │  │  User C   │
        │  (Docker) │  │  (Docker) │  │  (Docker) │
        └───────────┘  └───────────┘  └───────────┘
```

**Monorepo structure:**

```
apps/
  api/          Fastify + SQLite backend
  web/          Next.js 16 frontend
packages/
  shared/       TypeScript types
docker/
  gateway/      OpenClaw container image
```

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, NextAuth v5 |
| Backend  | Fastify 5, better-sqlite3, dockerode              |
| Gateway  | OpenClaw (Docker containers, per-user)            |
| Proxy    | Traefik 2.11                                      |
| Build    | Turborepo, TypeScript 5.7                         |

## Getting Started

### Prerequisites

- Node.js 22+
- npm 11+
- Docker (for gateway containers)

### Setup

1. **Clone the repo**

```bash
git clone https://github.com/allen-hsu/clawhuddle.git
cd clawhuddle
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change-me-to-random-secret

# Internal auth providers (at least one required): GitLab and/or Authentik
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
GITLAB_BASE_URL=https://gitlab.com

AUTHENTIK_ISSUER=https://your-authentik.example.com/application/o/clawhuddle
AUTHENTIK_CLIENT_ID=
AUTHENTIK_CLIENT_SECRET=

# Optional local-development aid only
NEXTAUTH_ENABLE_DEV_CREDENTIALS=false

# Optional: restrict sign-in to a specific email domain
ALLOWED_DOMAIN=

# LLM API key (at least one provider required)
ANTHROPIC_API_KEY=sk-ant-...

# Super admin account
SUPER_ADMIN_EMAIL=you@example.com

# Optional: invitation emails via Resend
RESEND_API_KEY=re_xxxx
EMAIL_FROM=ClawHuddle <noreply@yourdomain.com>
```

Sign-in behavior details:
- Configure **either `GITLAB_*` or `AUTHENTIK_*` (or both).** At least one internal provider must be set, or auth routes will fail validation during startup/build.
- For Authentik, `AUTHENTIK_ISSUER` **must be the full issuer URL**, not a hostname.
- `NEXTAUTH_ENABLE_DEV_CREDENTIALS` is only for local development and is not intended for production.
- `GITLAB_BASE_URL` is optional; leave empty to use GitLab Cloud defaults (`https://gitlab.com`), or set to your self-hosted GitLab base URL.

4. **Build the gateway image**

```bash
docker build -t clawhuddle-gateway:local docker/gateway
```

5. **Start development servers**

```bash
npm run dev
```

The app will be available at `http://localhost:3000` (frontend) and `http://localhost:4000` (API).

### First Login

Open `http://localhost:3000/login` and sign in. The first user automatically becomes the admin. From there you can create an organization, invite team members, and provision AI assistant instances.

## Docker Compose (Production)

```bash
cp .env.example .env
# Edit .env with your production values (DOMAIN, NEXTAUTH_SECRET, etc.)

docker compose up -d
```

This starts Traefik, the web frontend, the API server, and builds the gateway base image. Each team member's OpenClaw instance is provisioned on-demand via the admin dashboard.

## Configuration

| Variable                    | Description                                                         | Default                 |
| --------------------------- | ------------------------------------------------------------------- | ----------------------- |
| `NEXTAUTH_URL`              | Frontend URL                                                        | `http://localhost:3000` |
| `NEXTAUTH_SECRET`           | Session encryption secret                                           | **(required)**          |
| `GITLAB_CLIENT_ID`          | GitLab OAuth client ID                                              | —                       |
| `GITLAB_CLIENT_SECRET`      | GitLab OAuth client secret                                          | —                       |
| `GITLAB_BASE_URL`           | GitLab base URL (optional, self-hosted instance base URL)             | `https://gitlab.com`     |
| `AUTHENTIK_ISSUER`          | Authentik issuer URL (full OIDC issuer, e.g. `https://auth.example.com/application/o/clawhuddle`) | — |
| `AUTHENTIK_CLIENT_ID`       | Authentik OAuth client ID                                            | —                       |
| `AUTHENTIK_CLIENT_SECRET`   | Authentik OAuth client secret                                        | —                       |
| `ALLOWED_DOMAIN`            | Restrict sign-in to email domain(s), comma-separated (e.g. `company.com,partner.com`) | — |
| `NEXTAUTH_ENABLE_DEV_CREDENTIALS` | Enable local credential login flow in dev environments              | `false`                  |
| `ANTHROPIC_API_KEY`         | Default Anthropic API key                                           | —                       |
| `SUPER_ADMIN_EMAIL`         | Super admin account email                                           | —                       |
| `MAX_MEMBERS_PER_ORG`       | Member limit per organization                                       | `50`                    |
| `RESEND_API_KEY`            | Resend API key for invitation emails                                | —                       |
| `EMAIL_FROM`                | Sender address for emails                                           | —                       |
| `APP_URL`                   | Public app URL, used in invitation email links                      | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support email shown in the settings page                            | —                       |
| `DATABASE_PATH`             | SQLite file path                                                    | `./data/db.sqlite`      |
| `CORS_ORIGIN`               | Allowed origin for API requests                                     | `http://localhost:3000` |
| `DOCKER_NETWORK`            | Docker network name                                                 | `clawhuddle-net`        |
| `DOMAIN`                    | Production domain (used by Traefik)                                 | `localhost`             |
| `GATEWAY_DOMAIN`            | Domain for per-user gateway subdomains (e.g. `gw.company.com` → `alice.gw.company.com`) | — |
| `HOST_DATA_DIR`             | Absolute path on host for Docker bind mounts. Defaults to `$PWD/data`. Override if your data dir is elsewhere. | — |

## Project Scripts

```bash
npm run dev          # Start all services in dev mode
npm run build        # Build all packages
npm run db:migrate   # Run database migrations
npm run create-admin # Manually promote a user to super admin
```

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Support

If you find ClawHuddle useful, consider buying me a coffee!

<a href="https://buymeacoffee.com/unless" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="40"></a>

## License

[AGPL-3.0](./LICENSE) — You can use, modify, and distribute this software freely. If you run a modified version as a network service, you must share your source code under the same license.
