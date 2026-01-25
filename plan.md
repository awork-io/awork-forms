# awork Forms - Build Plan

## Overview
Building awork Forms app: React frontend + C# Minimal API backend + SQLite.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "category": "setup",
    "description": "Initialize frontend project with Vite, React, TypeScript, Tailwind, shadcn/ui",
    "steps": [
      "Create frontend directory with Vite React TypeScript template",
      "Install and configure Tailwind CSS",
      "Initialize shadcn/ui with components.json",
      "Add core shadcn components: button, input, card, dialog, form, toast",
      "Set up basic folder structure: pages, components, lib, hooks",
      "Verify dev server runs correctly"
    ],
    "passes": true
  },
  {
    "category": "setup",
    "description": "Initialize backend project with .NET 10 Minimal API",
    "steps": [
      "Create backend directory with dotnet new web -f net10.0",
      "Add Microsoft.Data.Sqlite package",
      "Add System.IdentityModel.Tokens.Jwt for auth",
      "Create basic Program.cs with CORS and routing",
      "Create solution file combining frontend/backend",
      "Verify API starts and returns health check"
    ],
    "passes": true
  },
  {
    "category": "setup",
    "description": "Set up SQLite database and migrations",
    "steps": [
      "Create Database folder with schema classes",
      "Implement DbContext with SQLite connection",
      "Create Users, Forms, Submissions tables",
      "Add migration runner on startup",
      "Verify tables are created on first run"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Implement awork OAuth authentication (DCR + PKCE)",
    "steps": [
      "Create auth endpoints: /api/auth/login, /api/auth/callback",
      "Implement PKCE code verifier/challenge generation",
      "Implement DCR client registration with awork",
      "Exchange auth code for tokens",
      "Store user and tokens in database",
      "Issue JWT session token",
      "Create AuthContext in frontend",
      "Add login page with awork button",
      "Handle OAuth callback redirect"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Create main layout and navigation",
    "steps": [
      "Create AppLayout component with sidebar",
      "Add navigation links: Dashboard, Forms, Settings",
      "Style to match awork aesthetic",
      "Add user avatar and workspace name in header",
      "Create protected route wrapper",
      "Verify navigation works between pages"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Implement forms CRUD API",
    "steps": [
      "Create GET /api/forms endpoint",
      "Create POST /api/forms endpoint",
      "Create GET /api/forms/{id} endpoint",
      "Create PUT /api/forms/{id} endpoint",
      "Create DELETE /api/forms/{id} endpoint",
      "Add JWT auth middleware",
      "Verify all CRUD operations work"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Build forms list (Dashboard) page",
    "steps": [
      "Create Dashboard page component",
      "Fetch and display list of forms",
      "Show form name, field count, submission count",
      "Add 'Create New Form' button",
      "Add edit/delete actions per form",
      "Style with cards layout"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Build form editor with field types",
    "steps": [
      "Create FormEditor page component",
      "Add form name and description inputs",
      "Create FieldTypeSidebar with draggable field types",
      "Create FormCanvas for dropped fields",
      "Implement drag-and-drop with dnd-kit",
      "Create FieldCard for each field in canvas",
      "Support all field types: text, email, number, textarea, select, checkbox, date",
      "Add field config panel for editing properties",
      "Add save form button"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Implement awork API proxy",
    "steps": [
      "Create GET /api/awork/projects endpoint",
      "Create GET /api/awork/project-types endpoint",
      "Create GET /api/awork/users endpoint",
      "Implement token refresh logic",
      "Forward requests to awork API with auth",
      "Verify project list fetches correctly"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "Add awork integration settings to form editor",
    "steps": [
      "Add action type selector (task/project/both)",
      "Add project selector for task forms",
      "Add project type selector for project forms",
      "Create field mapping UI for project fields",
      "Create field mapping UI for task fields",
      "Save mappings with form",
      "Verify mappings persist correctly"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Add form styling options (colors, logo)",
    "steps": [
      "Add styling fields to form schema (primary_color, background_color, logo_url)",
      "Create POST /api/forms/{id}/logo endpoint for logo upload",
      "Store logos in /uploads directory",
      "Add StyleEditor component with color pickers",
      "Add logo upload with preview",
      "Add live preview panel showing styled form",
      "Save styling with form"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Create public form view with GUID and custom styling",
    "steps": [
      "Add public_id (GUID) to forms table",
      "Create GET /api/f/{publicId} endpoint (no auth)",
      "Create POST /api/f/{publicId}/submit endpoint (no auth)",
      "Create PublicForm page at /f/{publicId}",
      "Apply custom colors and logo from form settings",
      "Design beautiful, modern public form UI",
      "Add subtle animations and polish",
      "Render form fields dynamically",
      "Validate required fields",
      "Show success message with confetti/animation",
      "Mobile responsive design"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Implement awork project/task creation on submit",
    "steps": [
      "Process submission based on action type",
      "Create project in awork if configured",
      "Create task in awork if configured",
      "Apply field mappings",
      "Store awork IDs in submission record",
      "Update submission status",
      "Handle errors gracefully"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Build submissions list page",
    "steps": [
      "Create Submissions page component",
      "Fetch submissions for a form",
      "Display submission data in table",
      "Show status badge (pending/completed/failed)",
      "Link to awork project/task if created",
      "Add pagination if needed"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "Add form preview and share functionality",
    "steps": [
      "Add preview button in form editor",
      "Create FormPreview component",
      "Generate public form URL",
      "Add copy link button",
      "Add active/inactive toggle",
      "Show form status in list"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Add backend unit tests (xUnit)",
    "steps": [
      "Create backend test project with xUnit",
      "Add test for user authentication/JWT",
      "Add test for form CRUD operations",
      "Add test for public form access by GUID",
      "Add test for submission creation",
      "Add test for awork token refresh",
      "Verify all tests pass"
    ],
    "passes": false
  },
  {
    "category": "testing",
    "description": "Add frontend unit tests (Vitest)",
    "steps": [
      "Set up vitest with React Testing Library",
      "Add test for AuthContext",
      "Add test for FormEditor component",
      "Add test for PublicForm rendering",
      "Add test for form validation",
      "Add test for API hooks",
      "Verify all tests pass with npm test"
    ],
    "passes": false
  },

]
```

---

## Agent Instructions

1. Read `activity.md` first to understand current state
2. Find next task with `"passes": false`
3. Complete all steps for that task
4. **ALWAYS verify visually using Playwright MCP:**
   - Navigate to the page in browser
   - Take screenshot and save to `screenshots/`
   - Test interactions (clicks, forms, navigation)
   - Check browser console for errors
   - Fix any visual or functional issues before proceeding
5. Run lint, build, and tests
6. Update task to `"passes": true`
7. Log completion in `activity.md` with screenshot references
8. Commit with conventional commit message
9. Repeat until all tasks pass

**Important:** 
- Only modify the `passes` field. Do not remove or rewrite tasks.
- Never mark a task passing without Playwright visual verification.

---

## Completion Criteria

All tasks marked with `"passes": true`
