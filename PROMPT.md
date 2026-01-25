@plan.md @activity.md

We are building awork Forms - a React frontend + C# Minimal API backend application.

**CRITICAL SETUP**: When running for the first time, check if frontend/backend directories exist. If not, the setup tasks must be completed first.

First read activity.md to see what was recently accomplished.

## Development Environment

Frontend: React + TypeScript + Vite (in ./frontend)
Backend: .NET 8 Minimal API with SQLite (in ./backend)

To start services:
- Frontend: `cd frontend && npm run dev` (port 5173)
- Backend: `cd backend && dotnet run` (port 5000)

## Your Task

1. Open plan.md and find the single highest priority task where `passes` is false
2. Work on exactly ONE task: implement all steps for that task
3. After implementing, verify the changes:
   - For frontend: run `npm run lint` and `npm run build`
   - For backend: run `dotnet build`
   - Use Playwright to take a screenshot of relevant UI state if applicable
4. Append a dated progress entry to activity.md describing:
   - What you changed
   - Which commands you ran
   - What you verified
5. Update that task's `passes` in plan.md from `false` to `true`
6. Make one git commit for that task only with a clear message (conventional commits: feat, fix, chore, etc.)

**Do not:**
- Run git init (already done)
- Change git remotes
- Push to remote
- Work on multiple tasks at once

**When ALL tasks have `passes: true`**, output: <promise>COMPLETE</promise>
