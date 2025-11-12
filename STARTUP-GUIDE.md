# ClientForge CRM - Startup Guide

Quick guide to running the ClientForge CRM application on Windows.

## Prerequisites

1. **Docker Desktop** - Must be installed and running
2. **Node.js** - Version 18 or higher
3. **Git** - For version control

## Quick Start (Recommended)

### Option 1: Interactive Start
Double-click `start-all.bat` or run:
```bash
.\start-all.bat
```
This will:
- Check if Docker is running
- Start all database services (PostgreSQL, MongoDB, Redis, Elasticsearch)
- Ask if you want to start backend and frontend
- Open new terminal windows for each service

### Option 2: Automatic Start
Double-click `quick-start.bat` or run:
```bash
.\quick-start.bat
```
This automatically starts everything without prompts.

## Access the Application

Once started, you can access:

- **Backend API**: http://localhost:3000
- **Frontend UI**: http://localhost:3001
- **API Health Check**: http://localhost:3000/api/v1/health

### Default Services

- **PostgreSQL**: localhost:5432
  - Database: `clientforge`
  - User: `crm`
  - Password: `password`

- **MongoDB**: localhost:27017
  - Database: `clientforge`

- **Redis**: localhost:6379

- **Elasticsearch**: localhost:9200

## Stopping the Application

Double-click `stop-all.bat` or run:
```bash
.\stop-all.bat
```

This will stop all Docker containers and Node.js processes.

## Manual Start (Alternative)

If you prefer to start services manually:

### 1. Start Docker Services
```bash
docker-compose up -d
```

### 2. Start Backend
```bash
npm run dev:backend
```

### 3. Start Frontend (in new terminal)
```bash
cd frontend
npm run dev
```

## Troubleshooting

### Docker Not Running
**Error**: `ERROR: Docker is not running!`

**Solution**:
1. Open Docker Desktop
2. Wait for it to fully start (whale icon in system tray)
3. Try again

### Port Already in Use
**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Find and kill the process using the port
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Database Connection Failed
**Error**: `Connection refused to PostgreSQL/MongoDB`

**Solution**:
1. Check if Docker containers are running:
   ```bash
   docker ps
   ```
2. Restart Docker services:
   ```bash
   docker-compose restart
   ```

### Services Not Ready
If services fail to connect, they may need more time to initialize:

```bash
# Check container logs
docker-compose logs postgres
docker-compose logs mongodb
docker-compose logs redis
docker-compose logs elasticsearch
```

## First-Time Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
copy .env.example .env
```

Edit `.env` with your configurations (or use docker-compose.yml defaults for dev).

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Seed Initial Data (Optional)
```bash
npm run db:seed
npm run seed:admin
```

## Development Tips

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f mongodb
```

### Restart a Service
```bash
docker-compose restart postgres
```

### Clean Restart (removes data)
```bash
docker-compose down -v
docker-compose up -d
```

### Check Service Health
```bash
# Backend health
curl http://localhost:3000/api/v1/health

# Or open in browser
start http://localhost:3000/api/v1/health
```

## Database Management

### Connect to PostgreSQL
```bash
docker exec -it clientforge-crm-postgres-1 psql -U crm -d clientforge
```

### Connect to MongoDB
```bash
docker exec -it clientforge-crm-mongodb-1 mongosh --username crm --password password
```

### Connect to Redis
```bash
docker exec -it clientforge-crm-redis-1 redis-cli
```

## Production Deployment

For production deployment, see:
- `deployment/docker/production/README.md`
- `docs/deployment/PRODUCTION-DEPLOYMENT.md`

## Need Help?

- Check the main README.md for detailed documentation
- Review logs: `docker-compose logs -f`
- Check the docs folder for specific guides
- Report issues on GitHub

## Quick Reference

| Script | Purpose |
|--------|---------|
| `start-all.bat` | Interactive startup with prompts |
| `quick-start.bat` | Automatic startup, no prompts |
| `stop-all.bat` | Stop all services |

| URL | Service |
|-----|---------|
| http://localhost:3000 | Backend API |
| http://localhost:3001 | Frontend UI |
| http://localhost:3000/api/v1/health | Health Check |

| Command | Purpose |
|---------|---------|
| `npm run dev:backend` | Start backend only |
| `npm run dev` | Start all via turbo |
| `docker-compose up -d` | Start Docker services |
| `docker-compose down` | Stop Docker services |
| `docker-compose logs -f` | View all logs |
