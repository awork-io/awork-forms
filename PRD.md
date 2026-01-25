# awork Forms - Product Requirements Document

## Overview

A standalone web application for awork customers to create customizable forms that automatically generate projects and/or tasks in their awork workspace.

## Goals

1. Enable customers to collect structured data via forms
2. Automatically create awork projects/tasks from submissions
3. Provide simple form management without awork app complexity
4. Host on internal Hetzner infrastructure

## User Stories

### Authentication
- [ ] As a user, I can log in using my awork account
- [ ] As a user, I stay logged in until I explicitly log out
- [ ] As a user, I can see which awork workspace I'm connected to

### Form Management
- [ ] As a user, I can create a new form with a name and description
- [ ] As a user, I can add fields to my form (text, email, number, textarea, select, checkbox, date)
- [ ] As a user, I can configure field properties (label, placeholder, required, options for select)
- [ ] As a user, I can reorder fields via drag-and-drop
- [ ] As a user, I can delete fields from my form
- [ ] As a user, I can save my form
- [ ] As a user, I can edit existing forms
- [ ] As a user, I can delete forms
- [ ] As a user, I can see a list of all my forms

### awork Integration
- [ ] As a user, I can configure a form to create a task on submission
- [ ] As a user, I can select which awork project receives the tasks
- [ ] As a user, I can configure a form to create a project on submission
- [ ] As a user, I can select the project type for created projects
- [ ] As a user, I can map form fields to project/task fields (name, description, due date, assignee)
- [ ] As a user, I can configure a form to create both a project and a task

### Form Sharing
- [ ] As a user, I can get a public link to my form
- [ ] As a user, I can preview how my form looks to submitters
- [ ] As a user, I can activate/deactivate forms

### Submissions
- [ ] As an anonymous user, I can fill out and submit a public form
- [ ] As a user, I can see all submissions for my forms
- [ ] As a user, I can click through to the created project/task in awork
- [ ] As a user, I can see submission status (pending/completed/failed)

## Technical Requirements

### Frontend
- React 18+ with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- React Router for navigation
- React Hook Form + Zod for form validation
- TanStack Query for data fetching

### Backend
- .NET 8 Minimal API
- SQLite database (Microsoft.Data.Sqlite)
- JWT authentication
- HTTP client for awork API

### Infrastructure
- Single Docker container
- Kubernetes deployment on Hetzner K3s
- Persistent volume for SQLite
- Tailscale for secure access

## Non-Goals (v1)

- Form analytics/reporting
- Custom branding/white-labeling
- Webhook integrations
- Multi-workspace support
- Form templates
- File upload fields
- Conditional logic

## Success Metrics

- Users can create and publish a form in < 5 minutes
- Form submissions successfully create awork items > 99%
- Page load time < 2 seconds

## Milestones

### Phase 1: Foundation
- [ ] Project setup (frontend + backend)
- [ ] OAuth authentication with awork
- [ ] Basic database schema

### Phase 2: Form Builder
- [ ] Form CRUD operations
- [ ] Field type support
- [ ] Drag-and-drop reordering
- [ ] Form preview

### Phase 3: awork Integration
- [ ] awork API proxy
- [ ] Project/task creation
- [ ] Field mapping configuration

### Phase 4: Public Forms
- [ ] Public form endpoint
- [ ] Form submission handling
- [ ] Submission status tracking

### Phase 5: Deployment
- [ ] Docker build
- [ ] Kubernetes manifests
- [ ] Hetzner deployment
