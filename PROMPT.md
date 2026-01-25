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
3. After implementing, **ALWAYS verify visually with Playwright**:
   - Start the dev servers if not running (frontend: port 5173, backend: port 5000)
   - Use Playwright MCP to navigate to the relevant page
   - Take screenshots to verify the UI looks correct
   - Test user interactions (clicks, form submissions, navigation)
   - Check for console errors
   - For backend-only changes: test API endpoints with curl or Playwright
4. Run build checks:
   - Frontend: `cd frontend && npm run lint && npm run build`
   - Backend: `cd backend && dotnet build`
   - Run tests: `npm test` / `dotnet test`
5. Append a dated progress entry to activity.md describing:
   - What you changed
   - What you verified visually (include screenshot filenames)
   - Any issues found and fixed
6. Update that task's `passes` in plan.md from `false` to `true`
7. Make one git commit for that task only with a clear message (conventional commits: feat, fix, chore, etc.)

**Do not:**
- Run git init (already done)
- Change git remotes
- Push to remote
- Work on multiple tasks at once
- Mark a task as passing without visual verification via Playwright

**IMPORTANT: After completing ONE task and committing, EXIT immediately.**
The Ralph loop will restart you with fresh context for the next task.

**When ALL tasks have `passes: true`**, output: <promise>COMPLETE</promise>
