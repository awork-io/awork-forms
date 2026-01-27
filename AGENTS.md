# AGENTS

## Purpose
awork Forms. React SPA + .NET Minimal API. Forms -> submissions -> awork tasks/projects.

## Structure
- frontend/ React 19 + Vite + Tailwind + shadcn/ui
- backend/ .NET 10 Minimal API + EF Core
- docker-compose.yml local Postgres
- dev.sh runs Postgres + backend + frontend

## Local Dev
- ./dev.sh
- Frontend: http://localhost:5173
- Backend: http://localhost:5100
- DB: localhost:5432

## Config
- .env required: JWT_SECRET_KEY (min 32 chars)
- Optional: DATABASE_URL, BASE_URL

## Tests/Build
- Frontend: `cd frontend && npm run lint && npm run test && npm run build`
- Backend: `cd backend && dotnet test` (targeted tests first)

## Notes
- Public forms at /f/:publicId
- Auth: awork OAuth 2.0 + PKCE
