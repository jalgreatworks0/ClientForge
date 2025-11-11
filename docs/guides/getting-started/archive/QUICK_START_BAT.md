# ClientForge CRM - Batch File Quick Start Guide

This guide explains how to use the convenient batch files to run ClientForge CRM on Windows.

## 📋 Available Batch Files

### Main Startup Scripts

| Batch File | Description | Ports | Use Case |
|------------|-------------|-------|----------|
| **start-all.bat** | Starts both backend and frontend | 3000, 3001 | **Recommended for full stack development** |
| **start-backend.bat** | Starts backend API only | 3000 | Backend development or testing |
| **start-frontend.bat** | Starts frontend UI only | 3001 | Frontend development |

### Utility Scripts

| Batch File | Description | Purpose |
|------------|-------------|---------|
| **install-all.bat** | Installs all dependencies | First-time setup |
| **build-all.bat** | Builds for production | Production deployment |

## 🚀 Quick Start

### First Time Setup

1. **Install Dependencies**
   ```cmd
   install-all.bat
   ```
   This will:
   - Install root npm packages
   - Install frontend npm packages
   - Verify Node.js installation

2. **Create Environment File**
   - Copy `.env.example` to `.env`
   - Configure your environment variables

3. **Start Development**
   ```cmd
   start-all.bat
   ```

## 📖 Detailed Usage

### start-all.bat (Recommended)

Starts both servers in separate windows for full-stack development.

```cmd
start-all.bat
```

**What it does:**
- Opens a new window for backend server (Port 3000)
- Opens a new window for frontend server (Port 3001)
- Backend starts first, frontend waits 3 seconds
- Both servers run simultaneously

**Access:**
- Backend API: http://localhost:3000/api
- Frontend UI: http://localhost:3001
- Health Check: http://localhost:3000/api/v1/health

**To Stop:**
- Close each command window
- Or press Ctrl+C in each window

---

### start-backend.bat

Starts only the backend Node.js API server.

```cmd
start-backend.bat
```

**What it does:**
- Checks for .env file
- Installs dependencies if needed
- Builds backend if dist/ doesn't exist
- Starts Node.js server on port 3000

**Access:**
- API Base: http://localhost:3000/api
- Health: http://localhost:3000/api/v1/health

**Use when:**
- Testing backend APIs
- Running backend tests
- Developing backend features

---

### start-frontend.bat

Starts only the Vite development server for React frontend.

```cmd
start-frontend.bat
```

**What it does:**
- Navigates to frontend/ directory
- Installs dependencies if needed
- Starts Vite dev server on port 3001
- Proxies /api requests to http://localhost:3000

**Access:**
- Frontend UI: http://localhost:3001

**Use when:**
- Developing frontend UI components
- Testing frontend features
- Backend is running separately

---

### install-all.bat

Installs all npm dependencies for the entire project.

```cmd
install-all.bat
```

**What it does:**
- Checks Node.js and npm versions
- Installs root dependencies with `--legacy-peer-deps`
- Installs frontend dependencies
- Shows success message with next steps

**Use when:**
- First time cloning the repository
- After pulling major dependency changes
- After deleting node_modules

---

### build-all.bat

Builds both backend and frontend for production deployment.

```cmd
build-all.bat
```

**What it does:**
- Compiles TypeScript backend → dist/backend/
- Builds React frontend → frontend/dist/
- Shows build status for each step

**Output:**
- Backend: `dist/backend/index.js` (entry point)
- Frontend: `frontend/dist/` (static files)

**Use when:**
- Preparing for production deployment
- Testing production builds locally
- Before deploying to Render

## 🔧 Troubleshooting

### "node is not recognized"
**Problem:** Node.js not installed or not in PATH
**Solution:** Install Node.js from https://nodejs.org/ (v18.17.0 recommended)

### ".env file not found"
**Problem:** Missing environment configuration
**Solution:** Copy `.env.example` to `.env` and configure values

### "Failed to install dependencies"
**Problem:** npm install errors
**Solution:**
1. Delete `node_modules` folders
2. Run `install-all.bat` again
3. Check npm logs for specific errors

### "Port 3000 already in use"
**Problem:** Another process using port 3000
**Solution:**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Backend builds with warnings
**Problem:** TypeScript errors during build
**Solution:** This is normal! The build uses `|| true` to continue despite type warnings. The app will still run.

## 🌐 Production Deployment

For production deployment to Render:

1. **Build locally to test:**
   ```cmd
   build-all.bat
   ```

2. **Commit and push to GitHub:**
   ```cmd
   git add .
   git commit -m "Your message"
   git push origin main
   ```

3. **Render auto-deploys** from GitHub automatically

## 📝 Development Workflow

### Typical Development Session

1. **Morning Start**
   ```cmd
   start-all.bat
   ```

2. **Code Changes**
   - Edit files in your IDE
   - Frontend: Hot reload (automatic)
   - Backend: Restart server (Ctrl+C, run start-backend.bat)

3. **End of Day**
   - Close command windows
   - Commit your changes

### After Pulling Updates

```cmd
install-all.bat    # Update dependencies
start-all.bat      # Start development
```

## 💡 Pro Tips

1. **Keep Windows Organized**
   - Backend window: Left side
   - Frontend window: Right side
   - IDE: Center

2. **Watch for Errors**
   - Backend errors show in backend window
   - Frontend errors show in browser console
   - TypeScript errors won't crash the server

3. **Quick Restart**
   - Frontend: Press Ctrl+C → Up Arrow → Enter
   - Backend: Press Ctrl+C → Up Arrow → Enter

4. **Use Health Check**
   - Test backend: http://localhost:3000/api/v1/health
   - Should return: `{"success":true,"data":{"status":"healthy",...}}`

## 🆘 Need Help?

- Check server logs in command windows
- Review error messages carefully
- Ensure .env is configured correctly
- Verify Node.js version: `node --version` (should be 18.x)
- Check GitHub repository for updates

---

**Ready to develop!** Run `start-all.bat` and visit http://localhost:3001
