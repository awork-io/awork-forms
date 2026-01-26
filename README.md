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
- **Backend**: .NET 9 Minimal API, C#
- **Database**: SQLite
- **Authentication**: awork OAuth 2.0 with PKCE

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
AWORK_CLIENT_ID=your_client_id
AWORK_CLIENT_SECRET=your_client_secret
```

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
│   ├── Database/             # SQLite database and migrations
│   ├── Forms/                # Form CRUD services
│   ├── Submissions/          # Submission processing
│   └── Program.cs            # API endpoints
├── backend.Tests/            # Backend unit tests
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
