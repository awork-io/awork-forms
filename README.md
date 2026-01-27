# awork Forms

Create customizable forms that automatically generate tasks and projects in [awork](https://www.awork.com/).

**Live:** https://awork-forms.proudpond-0e645c13.germanywestcentral.azurecontainerapps.io

## Features

- **Form Builder** – Drag-and-drop fields: text, email, number, textarea, select, checkbox, date
- **Custom Branding** – Set colors and upload a logo for public forms
- **awork Integration** – Auto-create tasks or projects from submissions with field mapping
- **Public Sharing** – Unique URLs with custom branding
- **Submission Tracking** – View submissions with links to created awork items

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | .NET 10 Minimal API, EF Core |
| Database | PostgreSQL (prod) / SQLite (dev fallback) |
| Auth | awork OAuth 2.0 + PKCE + DCR |
| Hosting | Azure Container Apps |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/awork-io/awork-forms.git
cd awork-forms

# 2. Configure
cp .env.example .env
# Edit .env: set JWT_SECRET_KEY (min 32 chars)

# 3. Run (starts PostgreSQL via Docker + backend + frontend)
./dev.sh
```

Open http://localhost:5173

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | Yes | Session token secret (min 32 chars) |
| `DATABASE_URL` | No | PostgreSQL connection string |
| `BASE_URL` | No | Public URL for OAuth redirects |

## Development

```bash
./dev.sh              # Start everything (Postgres + backend + frontend)
docker compose down   # Stop PostgreSQL
```

Servers:
- Frontend: http://localhost:5173
- Backend: http://localhost:5100
- PostgreSQL: localhost:5432

## Deployment

Pushes to `main` auto-deploy via GitHub Actions to Azure Container Apps.

**Azure Resources:**
- Container App: `awork-forms` in `awork-global`
- Database: `awork_forms` on `internal-tools.postgres.database.azure.com`

## Project Structure

```
├── frontend/          # React SPA
├── backend/           # .NET API
│   ├── Auth/          # OAuth + JWT
│   ├── Awork/         # awork API client
│   ├── Endpoints/     # API routes
│   ├── Forms/         # Form CRUD
│   └── Submissions/   # Submission processing
├── dev.sh             # Dev startup script
├── docker-compose.yml # Local PostgreSQL
└── Dockerfile         # Production build
```

## License

MIT
