# ClientForge CRM v3.0 - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you set up ClientForge CRM for development in minutes.

---

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 9+ installed (`npm --version`)
- [ ] Docker Desktop installed and running
- [ ] Git installed
- [ ] 10GB+ free disk space

---

## Step 1: Environment Setup (2 minutes)

### 1.1 Copy Environment File
```bash
cd d:\clientforge-crm
copy .env.example .env
```

### 1.2 Edit Environment Variables (Optional)
Open `.env` in your editor and update if needed. Default values work for local development.

```bash
# Most important settings for local dev:
NODE_ENV=development
APP_PORT=3000
DATABASE_URL=postgresql://crm:password@localhost:5432/clientforge
```

---

## Step 2: Install Dependencies (2 minutes)

### Option A: Using Make (Recommended)
```bash
make install
```

### Option B: Using npm
```bash
npm ci
cd frontend/apps/crm-web && npm ci
cd ../../..
```

---

## Step 3: Start Services (1 minute)

### Start All Services with Docker
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- MongoDB (port 27017)
- Redis cache (port 6379)
- Elasticsearch (port 9200)
- RabbitMQ (port 5672, management: 15672)
- MinIO file storage (port 9000, console: 9001)

### Verify Services are Running
```bash
docker-compose ps
```

---

## Step 4: Initialize Database (1 minute)

### Run Migrations
```bash
make db-migrate
```

### Seed Test Data
```bash
make db-seed
```

---

## Step 5: Start Development Server (30 seconds)

```bash
make dev
```

Or separately:
```bash
# Terminal 1 - Backend
make dev-backend

# Terminal 2 - Frontend
make dev-frontend

# Terminal 3 - AI Services (optional)
make dev-ai
```

---

## Step 6: Access the Application

### Web Interfaces
- **Main CRM App**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **GraphQL Playground**: http://localhost:3000/graphql
- **Admin Panel**: http://localhost:3001

### Service Dashboards
- **RabbitMQ Management**: http://localhost:15672 (user: crm, pass: password)
- **MinIO Console**: http://localhost:9001 (user: minioadmin, pass: minioadmin)

### Default Login (after seeding)
- **Email**: admin@clientforge.com
- **Password**: Admin123!

---

## 🎯 Common Tasks

### Development

#### Hot Reload Development
```bash
make dev                  # All services with hot reload
make dev-frontend         # Frontend only
make dev-backend          # Backend only
```

#### View Logs
```bash
make logs                 # Application logs
docker-compose logs -f    # All service logs
docker-compose logs -f postgres  # Specific service
```

### Database Management

#### Reset Database
```bash
make db-reset             # Rollback, migrate, and seed
```

#### Create Migration
```bash
# Add your migration SQL file to:
# database/migrations/features/your_migration.sql
make db-migrate
```

#### Backup Database
```bash
make backup
```

### Testing

#### Run All Tests
```bash
make test
```

#### Run Specific Test Suites
```bash
make test-unit            # Unit tests only
make test-integration     # Integration tests
make test-e2e             # End-to-end tests
make test-ai              # AI model tests
```

### Code Quality

#### Lint Code
```bash
make lint
```

#### Format Code
```bash
make format
```

#### Type Check
```bash
make type-check
```

#### Security Scan
```bash
make security-scan
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using a port
netstat -ano | findstr :3000

# Stop the process or change port in .env
```

### Docker Services Won't Start
```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart
docker-compose up -d
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Cannot Access Application
```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Check Docker network
docker network inspect clientforge-crm_default
```

### Clear Everything and Restart
```bash
# Stop all services
docker-compose down -v

# Clean build artifacts
make clean

# Remove node_modules
rm -rf node_modules
rm -rf frontend/apps/*/node_modules

# Reinstall
make setup
```

---

## 📚 Project Structure Quick Reference

```
clientforge-crm/
├── ai/                    # AI/ML systems & Albedo AI
├── backend/               # Node.js backend APIs
│   ├── api/              # REST, GraphQL, WebSocket
│   ├── core/             # Business logic
│   ├── services/         # External services
│   └── workers/          # Background jobs
├── frontend/              # Frontend applications
│   ├── apps/             # CRM web, mobile, admin
│   └── packages/         # Shared components
├── database/              # Database schemas & migrations
├── deployment/            # Docker, K8s, Terraform
├── integrations/          # Third-party integrations
├── tests/                 # All test suites
└── docs/                  # Documentation
```

---

## 🔑 Important Files

| File | Purpose |
|------|---------|
| `.env` | Environment configuration |
| `package.json` | NPM dependencies & scripts |
| `docker-compose.yml` | Docker services configuration |
| `Makefile` | Build automation commands |
| `tsconfig.json` | TypeScript configuration |
| `README.md` | Full project documentation |

---

## 🎓 Learn More

### Documentation
- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Developer Guide](docs/guides/developer-guide/README.md)
- [Contributing Guide](docs/development/contributing/CONTRIBUTING.md)

### Help & Support
```bash
# View all available commands
make help

# View Makefile targets
make

# Check project status
git status
docker-compose ps
```

---

## 🚀 Next Steps After Setup

1. **Explore the Codebase**
   - Check out `backend/api/rest/v1/routes/` for API endpoints
   - Look at `frontend/apps/crm-web/src/` for React components
   - Review `ai/albedo/` for AI companion features

2. **Create Your First Feature**
   ```bash
   # Create a new branch
   git checkout -b feature/my-feature

   # Make changes
   # ...

   # Test your changes
   make test

   # Commit
   git add .
   git commit -m "feat: add my feature"
   ```

3. **Read the Documentation**
   - Architecture decisions: `docs/architecture/decisions/`
   - API endpoints: `docs/api/`
   - Development guidelines: `docs/development/`

4. **Join the Development**
   - Check open issues
   - Review contribution guidelines
   - Submit pull requests

---

## 📋 Development Checklist

Daily development workflow:

- [ ] Pull latest changes: `git pull`
- [ ] Start services: `make dev`
- [ ] Check tests pass: `make test`
- [ ] Lint code: `make lint`
- [ ] Format code: `make format`
- [ ] Commit changes with meaningful message
- [ ] Push to feature branch
- [ ] Create pull request

---

## 🎯 Quick Command Reference

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make install` | Install all dependencies |
| `make dev` | Start development environment |
| `make test` | Run all tests |
| `make lint` | Run code linters |
| `make format` | Format code |
| `make build` | Build for production |
| `make clean` | Clean build artifacts |
| `docker-compose up -d` | Start Docker services |
| `docker-compose down` | Stop Docker services |
| `docker-compose ps` | View service status |
| `docker-compose logs -f` | View service logs |

---

## 💡 Pro Tips

1. **Use Make Commands**: All common tasks have Make shortcuts
2. **Docker Compose**: Keep services running in background with `-d` flag
3. **Hot Reload**: Frontend and backend auto-reload on file changes
4. **Testing**: Run `make test` before committing
5. **Linting**: Set up pre-commit hooks with `npm run prepare`
6. **Documentation**: Update docs when adding features
7. **Environment**: Never commit `.env` file
8. **Branches**: Use feature branches for development
9. **Commits**: Follow conventional commit format
10. **Reviews**: Test thoroughly before creating PRs

---

## 🎉 You're Ready!

Your ClientForge CRM development environment is now set up and running!

### What's Working:
✅ Full-stack development environment
✅ Hot reload for frontend and backend
✅ Database with test data
✅ All services running in Docker
✅ AI services ready
✅ API documentation available

### Start Building:
- Explore the API at http://localhost:3000/api/docs
- Check the web app at http://localhost:3000
- Read the architecture docs in `docs/architecture/`
- Review example code in `backend/` and `frontend/`

**Happy Coding! 🚀**

---

**Need Help?**
- Check `README.md` for detailed documentation
- View `PROJECT_STRUCTURE_SUMMARY.md` for architecture overview
- Run `make help` for available commands
- Check `docs/development/troubleshooting/` for common issues

**Last Updated**: November 5, 2025
