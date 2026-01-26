# awork Forms

A form builder application that integrates with [awork](https://www.awork.com/) to automatically create tasks and projects from form submissions.

## Features

- **Drag-and-drop form builder** - Create forms with text, email, number, textarea, select, checkbox, and date fields
- **Custom styling** - Set primary/background colors and upload a logo for public forms
- **awork integration** - Automatically create tasks or projects in awork when forms are submitted
- **Field mapping** - Map form fields to awork task/project properties (name, description, dates, etc.)
- **Public form sharing** - Share forms via unique URL with custom branding
- **Submission tracking** - View all submissions with status and links to created awork items

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: .NET 9 Minimal API, C#, Entity Framework Core
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: awork OAuth 2.0 with PKCE + DCR

## Prerequisites

- Node.js 20+
- .NET 9 SDK
- An awork account with API access

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/awork-forms.git
cd awork-forms
```

### 2. Set up environment variables

Create a `.env` file in the root directory:

```env
# JWT secret for session tokens (min 32 chars)
JWT_SECRET_KEY=your-secret-key-min-32-characters

# Optional: Base URL for file attachments (default: http://localhost:5000)
BASE_URL=https://your-domain.com
```

**Note:** awork OAuth uses Dynamic Client Registration (DCR), so no client ID/secret is needed.

### 3. Install dependencies

```bash
# Frontend
cd frontend
npm install

# Backend dependencies are restored automatically on build
```

### 4. Start development servers

The easiest way to start both servers:

```bash
./dev.sh
```

Or start them separately:

```bash
# Backend (runs on http://localhost:5100)
cd backend
dotnet run

# Frontend (runs on http://localhost:5173)
cd frontend
npm run dev
```

### 5. Open the app

Navigate to http://localhost:5173 and sign in with your awork account.

## Database Configuration

The app uses **SQLite** by default for local development. For production, set the `DATABASE_URL` environment variable to use **PostgreSQL**.

### SQLite (Development - Default)

No configuration needed. Database is created automatically at `backend/Data/awork-forms.db`.

### PostgreSQL (Production)

Set the `DATABASE_URL` environment variable:

```env
DATABASE_URL=Host=localhost;Database=awork_forms;Username=postgres;Password=secret
```

Or use a connection string format:

```env
DATABASE_URL=postgres://user:password@host:5432/awork_forms
```

EF Core migrations are applied automatically on startup.

## Project Structure

```
awork-forms/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Utilities, API client, types
│   │   └── test/             # Test setup
│   └── package.json
├── backend/                  # .NET backend
│   ├── Auth/                 # Authentication services
│   ├── Awork/                # awork API integration
│   ├── Data/                 # EF Core DbContext, entities, migrations
│   ├── Endpoints/            # Structured minimal API endpoints
│   ├── Forms/                # Form CRUD services
│   ├── Submissions/          # Submission processing
│   └── Program.cs            # App configuration
├── backend.Tests/            # Backend unit tests
├── Dockerfile                # Production container build
├── dev.sh                    # Development startup script
└── README.md
```

## Running Tests

```bash
# Backend tests (xUnit)
cd backend.Tests
dotnet test

# Frontend tests (Vitest)
cd frontend
npm test
```

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate OAuth login
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Forms (requires authentication)
- `GET /api/forms` - List all forms
- `POST /api/forms` - Create a form
- `GET /api/forms/{id}` - Get form details
- `PUT /api/forms/{id}` - Update a form
- `DELETE /api/forms/{id}` - Delete a form
- `POST /api/forms/{id}/logo` - Upload form logo
- `DELETE /api/forms/{id}/logo` - Remove form logo

### Submissions (requires authentication)
- `GET /api/submissions` - List all submissions
- `GET /api/forms/{id}/submissions` - List form submissions

### Public Forms (no authentication)
- `GET /api/f/{publicId}` - Get public form
- `POST /api/f/{publicId}/submit` - Submit form data

### awork Proxy (requires authentication)
- `GET /api/awork/projects` - List awork projects
- `GET /api/awork/projecttypes` - List project types
- `GET /api/awork/users` - List workspace users
- `GET /api/awork/projects/{id}/taskstatuses` - Get task statuses
- `GET /api/awork/projects/{id}/tasklists` - Get task lists
- `GET /api/awork/typesofwork` - Get types of work

## License

MIT
