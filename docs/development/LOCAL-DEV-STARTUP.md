# Local Development Startup Guide

Quick reference for starting the ClientForge CRM application in local development mode.

## Quick Start (Recommended)

### One-Click Launch

**Double-click `start-all.bat` at the repository root**, or run from command line:

```bash
.\start-all.bat
```

This elite launcher will automatically:
1. ✅ Verify Docker Desktop is running
2. ✅ Start all Docker services (PostgreSQL, MongoDB, Redis, Elasticsearch)
3. ✅ Wait for services to initialize
4. ✅ Start backend API on http://localhost:3000
5. ✅ Wait for backend health endpoint to respond
6. ✅ Start frontend UI on http://localhost:3001
7. ✅ Open your browser to the frontend

**The entire stack starts with ONE command!**

---

## What Gets Started

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend UI** | http://localhost:3001 | React + Vite dev server |
| **Backend API** | http://localhost:3000 | Express REST API |
| **Health Check** | http://localhost:3000/api/v1/health | API health status |
| **PostgreSQL** | localhost:5432 | Primary database |
| **MongoDB** | localhost:27017 | Document storage |
| **Redis** | localhost:6379 | Cache & sessions |
| **Elasticsearch** | localhost:9200 | Search engine |

---

## Prerequisites

Before running `start-all.bat`, ensure you have:

1. **Docker Desktop** - Installed and running
2. **Node.js 18+** - Installed
3. **Dependencies** - Run `npm install` in repository root

---

## How It Works

The `start-all.bat` script is a robust, idempotent launcher that:

### Step 1: Docker Health Check
Verifies Docker Desktop is running before proceeding. If not, shows clear error message with instructions.

### Step 2: Start Docker Services
Launches only the required services:
```bash
docker-compose up -d postgres mongodb redis elasticsearch
```

### Step 3: Initialization Wait
Waits 10 seconds for database services to fully initialize.

### Step 4: Backend Startup
Opens a new terminal window running:
```bash
npm run dev:backend
```

### Step 5: Backend Health Wait
Polls `http://localhost:3000/api/v1/health` for up to 60 seconds until backend is ready. This prevents frontend errors.

### Step 6: Frontend Startup
Opens a new terminal window running:
```bash
cd frontend && npm run dev
```

### Step 7: Browser Launch
After a 10-second wait for Vite compilation, opens browser to http://localhost:3001.

---

## Terminal Windows

After running `start-all.bat`, you'll see **3 windows**:

1. **Launcher Window** - Shows startup progress, closes when you press any key
2. **Backend Window** - Backend API logs (keep open)
3. **Frontend Window** - Vite dev server logs (keep open)

---

## Stopping Services

### Stop All Servers

**Option 1 - Use stop-all.bat:**
```bash
.\stop-all.bat
```

**Option 2 - Manual:**
1. Close backend terminal window (Ctrl+C)
2. Close frontend terminal window (Ctrl+C)
3. Stop Docker services:
   ```bash
   docker-compose down
   ```

---

## Troubleshooting

### Docker Not Running

**Error:**
```
ERROR: Docker is not running!
```

**Solution:**
1. Open Docker Desktop
2. Wait for the whale icon to appear in system tray
3. Run `start-all.bat` again

---

### Port Already in Use

**Error:**
```
Port 3000 is already in use
```

**Solution:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

### Backend Not Ready

**Symptom:** Backend health check times out after 60 seconds.

**Possible Causes:**
- Database connection failed
- TypeScript compilation errors
- Missing `.env` file
- Port 3000 already in use

**Solution:**
1. Check backend terminal window for error messages
2. Verify `.env` file exists (copy from `.env.example` if needed)
3. Check Docker services are running: `docker ps`
4. View Docker logs: `docker-compose logs postgres`

---

### Frontend Not Loading

**Symptom:** Browser opens but shows blank page or "Cannot connect"

**Possible Causes:**
- Vite still compiling (wait 30 more seconds)
- Frontend crashed (check frontend terminal)
- Port 3001 already in use

**Solution:**
1. Check frontend terminal window for "ready in Xms" message
2. Wait for Vite compilation to complete (can take 10-30 seconds)
3. Manually refresh browser after compilation completes
4. If still not working, check for port conflicts

---

### Database Connection Errors

**Symptom:** Backend shows "Connection refused" errors

**Solution:**
1. Check Docker containers are running:
   ```bash
   docker ps
   ```
2. Verify PostgreSQL is healthy:
   ```bash
   docker-compose logs postgres
   ```
3. Restart Docker services:
   ```bash
   docker-compose restart postgres
   ```
4. If still failing, clean restart:
   ```bash
   docker-compose down -v
   docker-compose up -d postgres mongodb redis elasticsearch
   ```

---

## Advanced Usage

### Optional Health Check

The script includes a commented-out health check section. To enable:

1. Edit `start-all.bat`
2. Uncomment lines 33-47 (the health check section)
3. This will run a quick smoke test before starting services

### Manual Start (Alternative)

If you prefer manual control:

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Start backend (in one terminal)
npm run dev:backend

# 3. Start frontend (in another terminal)
cd frontend
npm run dev

# 4. Open browser
start http://localhost:3001
```

---

## Development Tips

### View All Docker Logs
```bash
docker-compose logs -f
```

### View Specific Service Logs
```bash
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis
docker-compose logs -f elasticsearch
```

### Restart a Docker Service
```bash
docker-compose restart postgres
```

### Check Backend Health
```bash
curl http://localhost:3000/api/v1/health
```

### Clean Docker Data (Nuclear Option)
```bash
docker-compose down -v
```
⚠️ **Warning:** This deletes all database data!

---

## Comparison with Other Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `start-all.bat` | **New elite launcher** - Robust, health-checked startup | ✅ **Recommended for daily dev** |
| `start-clientforge.bat` | Original launcher | Alternative if you prefer the old version |
| `quick-start.bat` | Minimal launcher, no health checks | Quick tests, less verbose |

---

## Related Documentation

- [STARTUP-GUIDE.md](../../STARTUP-GUIDE.md) - Original startup documentation
- [README.md](../../README.md) - Main project README
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development guidelines
- [docker-compose.yml](../../docker-compose.yml) - Docker services configuration

---

## Script Location

The script is located at the repository root:

```
D:\clientforge-crm\start-all.bat
```

It's safe to run multiple times - the script is idempotent and includes error handling for common issues.

---

## Support

If you encounter issues not covered here:

1. Check backend and frontend terminal windows for errors
2. Review Docker logs: `docker-compose logs -f`
3. Check the [troubleshooting](../troubleshooting/) documentation
4. Report issues on GitHub

---

**Last Updated:** 2025-11-13
**Maintainer:** Developer Experience Team
