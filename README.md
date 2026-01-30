# awork Forms

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)

Create customizable forms that automatically generate tasks and projects in [awork](https://www.awork.com/).

**Live Demo:** [awork-forms.proudpond-0e645c13.germanywestcentral.azurecontainerapps.io](https://awork-forms.proudpond-0e645c13.germanywestcentral.azurecontainerapps.io)

---

## What is this?

awork Forms lets you create public-facing forms that, when submitted, automatically create tasks or projects in your awork workspace. Perfect for:

- **Client intake forms** – Collect project requests that become awork projects
- **Bug report forms** – Turn user-submitted bugs into trackable tasks
- **Request forms** – Let team members or external users submit work requests
- **Onboarding forms** – Automate new client/employee setup workflows

---

## How It Works

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   Create Form   │ ───► │  Share Public   │ ───► │   Submission    │
│   in Builder    │      │      URL        │      │    Received     │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │                 │
                                                  │  Task/Project   │
                                                  │  Created in     │
                                                  │     awork       │
                                                  │                 │
                                                  └─────────────────┘
```

1. **Build** – Create a form using the drag-and-drop builder
2. **Brand** – Customize colors and add your logo
3. **Map** – Connect form fields to awork task/project fields
4. **Share** – Publish and share the unique URL
5. **Automate** – Submissions automatically create awork items

---

## Features

| Feature | Description |
|---------|-------------|
| **Form Builder** | Drag-and-drop fields: text, email, number, textarea, select, checkbox, date |
| **Custom Branding** | Set primary/background colors and upload your logo |
| **awork Integration** | Auto-create tasks or projects with configurable field mapping |
| **Public Sharing** | Each form gets a unique, shareable URL |
| **Submission Tracking** | View all submissions with direct links to created awork items |

---

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) (for PostgreSQL)
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)

### Setup

```bash
# Clone the repository
git clone https://github.com/awork-io/awork-forms.git
cd awork-forms

# Create environment file
cp .env.example .env

# Edit .env and set JWT_SECRET_KEY (minimum 32 characters)
# Example: JWT_SECRET_KEY=your-super-secret-key-at-least-32-chars

# Start everything (PostgreSQL + backend + frontend)
./dev.sh
```

Open [http://localhost:5173](http://localhost:5173) and you're ready to go!

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET_KEY` | **Yes** | – | Secret key for JWT tokens (min 32 characters) |
| `DATABASE_URL` | No | SQLite | PostgreSQL connection string |
| `BASE_URL` | No | `http://localhost:5100` | Public URL for OAuth redirects |
| `VITE_API_URL` | No | `http://localhost:5100` | API URL for frontend |

---

## Development

### Running Locally

```bash
# Start all services (recommended)
./dev.sh

# Or run components separately:
docker compose up -d          # Start PostgreSQL
cd backend && dotnet run      # Start API
cd frontend && npm run dev    # Start frontend
```

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | [localhost:5173](http://localhost:5173) | React development server |
| Backend | [localhost:5100](http://localhost:5100) | .NET API |
| PostgreSQL | localhost:5432 | Database (user: `postgres`, pass: `postgres`) |

### Useful Commands

```bash
# Stop PostgreSQL
docker compose down

# Reset database
docker compose down -v && ./dev.sh

# Run backend tests
cd backend && dotnet test

# Build frontend for production
cd frontend && npm run build
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, dnd-kit |
| **Backend** | .NET 10 Minimal API, Entity Framework Core |
| **Database** | PostgreSQL (production), SQLite (development fallback) |
| **Auth** | awork OAuth 2.0 + PKCE + Dynamic Client Registration |
| **Hosting** | Azure Container Apps |

---

## Project Structure

```
awork-forms/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Route pages
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utilities
│   └── package.json
│
├── backend/                 # .NET API
│   ├── Auth/                # OAuth flow + JWT handling
│   ├── Awork/               # awork API client
│   ├── Endpoints/           # API route definitions
│   ├── Forms/               # Form CRUD operations
│   ├── Submissions/         # Submission processing
│   └── Program.cs           # Application entry point
│
├── dev.sh                   # Development startup script
├── docker-compose.yml       # Local PostgreSQL setup
├── Dockerfile               # Production container build
└── README.md
```

---

## Deployment

Pushes to `main` automatically deploy via GitHub Actions to Azure Container Apps.

### Azure Resources

| Resource | Name | Resource Group |
|----------|------|----------------|
| Container App | `awork-forms` | `awork-global` |
| PostgreSQL | `awork_forms` | `internal-tools.postgres.database.azure.com` |

### Manual Deployment

```bash
# Build and push container
docker build -t awork-forms .
docker tag awork-forms <your-registry>/awork-forms
docker push <your-registry>/awork-forms
```

---

## Troubleshooting

### "JWT_SECRET_KEY must be at least 32 characters"

Your `.env` file is missing or has a short `JWT_SECRET_KEY`. Generate one:

```bash
openssl rand -base64 32
```

### PostgreSQL connection failed

Make sure Docker is running and the container is up:

```bash
docker compose up -d
docker compose logs postgres
```

### "Port 5173 already in use"

Another process is using the port. Find and kill it:

```bash
lsof -i :5173
kill -9 <PID>
```

### OAuth redirect fails

Check that `BASE_URL` in `.env` matches your actual backend URL. For local development, this should be `http://localhost:5100`.

---

## Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements – we'd love your help.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to your branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Write meaningful commit messages
- Add tests for new functionality
- Update documentation as needed

### Found a Bug?

[Open an issue](https://github.com/awork-io/awork-forms/issues/new) with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [awork API](https://developers.awork.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Drag and drop powered by [dnd-kit](https://dndkit.com/)

---

<p align="center">
  Made with care by the <a href="https://www.awork.com">awork</a> team
</p>
