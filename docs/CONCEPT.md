# awork Forms - Architecture Concept

## Overview

**awork Forms** is a standalone web application that enables awork customers to create forms that automatically generate projects and tasks in their awork workspace when submitted.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + TypeScript + Vite | Fast dev, type safety, modern tooling |
| UI Components | shadcn/ui + Tailwind CSS | awork-consistent styling (see form-craft) |
| Backend | C# Minimal API (.NET 8) | Matches awork backend stack, simple deployment |
| Database | SQLite | Single-file, no external DB needed for small-scale |
| Auth | awork OAuth (DCR + PKCE) | Leverages existing awork login, no separate accounts |
| Hosting | Hetzner K3s cluster | Existing internal tools infrastructure |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Hetzner K3s Cluster                      │
├──────────────────────┬──────────────────────────────────────┤
│   Frontend (React)   │         Backend (C# Minimal API)     │
│                      │                                       │
│  - Form Builder UI   │  - /api/auth/callback (OAuth)        │
│  - Form Management   │  - /api/forms (CRUD)                 │
│  - Public Form View  │  - /api/submissions (public submit)  │
│  - Submissions List  │  - /api/awork/* (proxy to awork API) │
│                      │                                       │
│  Tailscale Access    │  SQLite: forms.db                    │
└──────────────────────┴──────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   awork API     │
                    │                 │
                    │ - Projects      │
                    │ - Tasks         │
                    │ - Users         │
                    └─────────────────┘
```

## Authentication Flow (DCR + PKCE)

Based on awork-form-craft implementation:

1. **Dynamic Client Registration (DCR)**: App registers itself with awork API on first OAuth
2. **PKCE Flow**: Authorization code exchange with code_verifier (no client_secret needed)
3. **Token Storage**: Access/refresh tokens stored server-side in SQLite
4. **Session**: JWT issued by our backend after successful awork OAuth

```
User → Login → Backend generates PKCE verifier
     → Redirect to awork authorize endpoint
     → User grants access
     → Callback with code
     → Backend exchanges code for tokens (with verifier)
     → Backend stores tokens, issues session JWT
```

## Data Model (SQLite)

```sql
-- Users authenticated via awork
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    awork_user_id TEXT UNIQUE NOT NULL,
    awork_workspace_id TEXT NOT NULL,
    awork_workspace_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Form definitions
CREATE TABLE forms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    fields TEXT NOT NULL, -- JSON array
    action_type TEXT DEFAULT 'task' CHECK(action_type IN ('project', 'task', 'both')),
    project_mapping TEXT, -- JSON: field mappings for project creation
    task_mapping TEXT,    -- JSON: field mappings for task creation
    target_project_id TEXT, -- Fixed project for task-only forms
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Form submissions
CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id),
    data TEXT NOT NULL, -- JSON: submitted field values
    awork_project_id TEXT,
    awork_task_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Auth
- `GET /api/auth/login` - Start OAuth flow (redirect to awork)
- `GET /api/auth/callback` - OAuth callback, exchange code
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear session

### Forms
- `GET /api/forms` - List user's forms
- `POST /api/forms` - Create form
- `GET /api/forms/{id}` - Get form details
- `PUT /api/forms/{id}` - Update form
- `DELETE /api/forms/{id}` - Delete form
- `GET /api/forms/{id}/public` - Get public form (no auth)

### Submissions
- `POST /api/forms/{id}/submit` - Submit form (public, no auth)
- `GET /api/forms/{id}/submissions` - List submissions

### awork Proxy
- `GET /api/awork/projects` - List projects
- `GET /api/awork/project-types` - List project types
- `GET /api/awork/users` - List workspace users

## Form Builder Features

### Field Types (from form-craft)
- Text (single line)
- Email
- Number
- Long Text (textarea)
- Dropdown (select)
- Checkbox
- Date

### Actions on Submit
1. **Create Task**: In specified project
2. **Create Project**: New project from form data
3. **Create Both**: Project + initial task

### Field Mappings
Map form fields to awork entity fields:
- Project: name, description, projectTypeId
- Task: name, description, dueOn, assigneeId

## Deployment

### Hetzner K3s
- Deploy as Kubernetes deployment
- Use existing Tailscale tunnel for access
- SQLite volume mount for persistence
- Single Docker image (frontend + backend)

### Docker
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
# Build C# backend
FROM node:20 AS frontend
# Build React app
FROM mcr.microsoft.com/dotnet/aspnet:8.0
# Combine: serve frontend from wwwroot, API at /api
```

## UI Pages

1. **Login** - awork OAuth button
2. **Dashboard** - List forms, quick stats
3. **Form Editor** - Drag-drop builder, field config, awork mappings
4. **Form Preview** - Test form before publishing
5. **Public Form** - Customer-facing form (embeddable)
6. **Submissions** - View form submissions + awork links
7. **Settings** - awork connection management

## Styling

Match app.awork.com:
- Font: Use awork's font stack
- Colors: Primary accent, neutral grays
- Components: shadcn/ui base with awork theming
- Layout: Clean sidebar navigation

## Security Considerations

- No credentials stored client-side
- PKCE prevents code interception
- Refresh tokens rotated on use
- Public form endpoints rate-limited
- SQLite file protected with filesystem perms
