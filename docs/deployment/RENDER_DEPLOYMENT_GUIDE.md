# ClientForge CRM - Render.com Deployment Guide

**From Local Docker → Production on Render**

---

## 🎯 Overview

**Local (Development):**
- Docker Desktop with 4 containers (PostgreSQL, MongoDB, Redis, Elasticsearch)
- Backend runs on `localhost:3000`
- Frontend runs on `localhost:3001`

**Production (Render):**
- Managed PostgreSQL (Render's native service)
- Managed Redis (Render's native service)
- MongoDB Atlas (separate service)
- Elasticsearch Cloud (optional, or disable)
- Backend deployed as Web Service
- Frontend deployed as Static Site

---

## 📋 Pre-Deployment Checklist

### 1. Git Repository Setup

```bash
# Initialize git if not already done
cd D:/clientforge-crm
git init

# Create .gitignore (CRITICAL!)
cat > .gitignore << 'EOF'
# Environment variables - NEVER commit!
.env
.env.local
.env.production

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
out/

# Logs
logs/
*.log

# Database files
*.db
*.sqlite
*.sqlite3

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker (local only)
docker-compose.override.yml

# Temporary files
tmp/
temp/
.cache/
EOF

# Initial commit
git add .
git commit -m "Initial commit - ClientForge CRM v3.0"

# Add remote (GitHub/GitLab)
git remote add origin https://github.com/YourUsername/clientforge-crm.git
git branch -M main
git push -u origin main
```

### 2. Environment Variables Strategy

**Local (.env) - NOT committed:**
```bash
NODE_ENV=development
DATABASE_URL=postgresql://crm:password@localhost:5432/clientforge
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/clientforge
```

**Production (Render Environment Variables) - Set in Render dashboard:**
```bash
NODE_ENV=production
DATABASE_URL=<Render PostgreSQL URL>
REDIS_URL=<Render Redis URL>
MONGODB_URI=<MongoDB Atlas URL>
JWT_SECRET=<Generated 256-bit secret>
```

---

## 🚀 Render Deployment Steps

### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name:** `clientforge-postgres`
   - **Database:** `clientforge`
   - **User:** `clientforge_user`
   - **Region:** Choose closest to your users
   - **Plan:** Starter ($7/month) or Free
4. Click **Create Database**
5. **Copy the Internal Database URL** (starts with `postgresql://`)

### Step 2: Create Redis on Render

1. Click **New +** → **Redis**
2. Configure:
   - **Name:** `clientforge-redis`
   - **Region:** Same as PostgreSQL
   - **Plan:** Starter ($10/month) or Free (25MB)
3. Click **Create Redis**
4. **Copy the Internal Redis URL**

### Step 3: Create MongoDB Atlas (Free Tier)

Render doesn't offer managed MongoDB, so use MongoDB Atlas:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create free cluster (512MB, shared)
3. **Database Access** → Create user (username/password)
4. **Network Access** → Add IP: `0.0.0.0/0` (allow from anywhere)
5. **Database** → Connect → Get connection string
6. **Copy the connection string** (like `mongodb+srv://user:pass@cluster.mongodb.net/clientforge`)

### Step 4: Deploy Backend to Render

1. Click **New +** → **Web Service**
2. Connect your GitHub/GitLab repository
3. Configure:

**Build Settings:**
```yaml
Name: clientforge-backend
Environment: Node
Region: Same as databases
Branch: main
Root Directory: .
Build Command: npm install && npm run build:backend
Start Command: npm run start:backend
```

**Environment Variables (click "Advanced" → "Add Environment Variable"):**
```bash
NODE_ENV=production

# Database URLs (use Render's internal URLs - faster and free traffic)
DATABASE_URL=<Paste Internal PostgreSQL URL from Step 1>
REDIS_URL=<Paste Internal Redis URL from Step 2>
MONGODB_URI=<Paste MongoDB Atlas URL from Step 3>

# Security - CRITICAL! Generate new secrets!
JWT_SECRET=<Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SESSION_SECRET=<Generate another 64-char hex>
ENCRYPTION_KEY=<Generate another 64-char hex>

# CORS - Your frontend URL
ALLOWED_ORIGINS=https://your-app.onrender.com,https://clientforge.com

# Secrets Provider
SECRETS_PROVIDER=env

# Optional: Disable services you're not using
DISABLE_ELASTICSEARCH=true

# App Config
APP_PORT=3000
APP_URL=https://clientforge-backend.onrender.com
FRONTEND_URL=https://your-app.onrender.com
```

**Health Check Path:** `/api/v1/health`

4. Click **Create Web Service**

### Step 5: Run Database Migrations

After backend deploys successfully:

1. Go to backend service → **Shell** tab
2. Run migrations:
```bash
npm run db:migrate
```

Or use Render's **Build Command** to auto-migrate:
```bash
Build Command: npm install && npm run build:backend && npm run db:migrate
```

### Step 6: Deploy Frontend to Render

1. Click **New +** → **Static Site**
2. Connect same repository
3. Configure:

**Build Settings:**
```yaml
Name: clientforge-frontend
Branch: main
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: frontend/dist
```

**Environment Variables:**
```bash
NODE_ENV=production
VITE_API_URL=https://clientforge-backend.onrender.com/api
VITE_APP_URL=https://your-app.onrender.com
```

4. Click **Create Static Site**

---

## 🔐 Security Configuration for Production

### 1. Generate Production Secrets

**Never use the same secrets as development!**

```bash
# On your local machine, generate secrets:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Add these to Render environment variables.

### 2. Update CORS for Production

In Render backend environment variables:
```bash
ALLOWED_ORIGINS=https://clientforge.onrender.com,https://www.clientforge.com
```

### 3. Enable HTTPS Only

Render automatically provides HTTPS. Make sure your backend enforces it:

**backend/middleware/security/https-redirect.ts:**
```typescript
export function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`)
  }
  next()
}
```

---

## 📊 Database Migration Strategy

### Option 1: Automated Migrations (Recommended)

Update `package.json`:
```json
{
  "scripts": {
    "build:backend": "tsc -p backend/tsconfig.json",
    "start:backend": "npm run db:migrate:production && node dist/backend/index.js",
    "db:migrate:production": "node scripts/migration/run-migrations.js"
  }
}
```

Migrations run automatically on every deploy.

### Option 2: Manual Migrations

Run manually via Render Shell after each deploy:
```bash
npm run db:migrate
```

### Option 3: CI/CD Pipeline (Advanced)

Use GitHub Actions to run migrations before deployment:

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Migrations
        env:
          DATABASE_URL: ${{ secrets.RENDER_DATABASE_URL }}
        run: |
          npm install
          npm run db:migrate
```

---

## 🔄 Deployment Workflow

### First Deploy (One-time setup)

```bash
# 1. Create production branch
git checkout -b production

# 2. Update production configs
# - Update CORS URLs
# - Update API endpoints
# - Disable dev-only features

# 3. Push to GitHub
git add .
git commit -m "Production configuration"
git push origin production

# 4. Configure Render to deploy from 'production' branch

# 5. Deploy!
```

### Regular Updates

```bash
# Development workflow
git checkout main
# ... make changes ...
git add .
git commit -m "Add new feature"
git push origin main

# When ready for production
git checkout production
git merge main
git push origin production

# Render auto-deploys production branch
```

---

## 🐳 Docker on Render (Alternative Approach)

If you want to use Docker on Render instead of native services:

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build:backend

EXPOSE 3000

CMD ["npm", "run", "start:backend"]
```

**render.yaml (Infrastructure as Code):**
```yaml
services:
  # Backend
  - type: web
    name: clientforge-backend
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: clientforge-postgres
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: clientforge-redis
          type: redis
          property: connectionString

  # Frontend
  - type: web
    name: clientforge-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist

databases:
  - name: clientforge-postgres
    plan: starter

  - name: clientforge-redis
    plan: starter
```

Deploy with:
```bash
# Push render.yaml to repo
git add render.yaml
git commit -m "Add Render config"
git push

# Render auto-detects and deploys infrastructure
```

---

## 💰 Cost Breakdown (Render)

### Free Tier (Good for testing)
- **PostgreSQL:** Free (expires after 90 days)
- **Redis:** Free (25MB, expires after 90 days)
- **Backend Web Service:** Free (spins down after 15min inactivity)
- **Frontend Static Site:** Free
- **Total:** $0/month (with limitations)

### Starter Tier (Recommended for production)
- **PostgreSQL:** $7/month (256MB RAM, 1GB storage)
- **Redis:** $10/month (256MB RAM)
- **Backend Web Service:** $7/month (512MB RAM, always on)
- **Frontend Static Site:** Free (100GB bandwidth)
- **MongoDB Atlas:** Free (512MB)
- **Total:** $24/month

### Professional Tier
- **PostgreSQL:** $50/month (4GB RAM, 100GB storage)
- **Redis:** $50/month (4GB RAM)
- **Backend Web Service:** $25/month (2GB RAM)
- **Total:** $125/month

---

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Render Dashboard → Your Service → Logs tab
# Real-time logs streaming
```

### Health Checks
```bash
# Render automatically monitors: /api/v1/health
# If it fails 3 times, service restarts
```

### Database Access
```bash
# Render Dashboard → PostgreSQL → Connect
# Use provided connection string with any PostgreSQL client
```

### Shell Access
```bash
# Render Dashboard → Web Service → Shell tab
# Run any command: npm run db:migrate, node scripts/test.js, etc.
```

---

## 🚨 Common Deployment Issues

### 1. "ECONNREFUSED" Database Errors

**Problem:** Backend can't connect to database

**Solution:** Use Render's **Internal URLs** for databases (not External URLs)
- Internal: `postgresql://user:pass@dpg-xyz-a` (FREE internal traffic)
- External: `postgresql://user:pass@oregon-postgres.render.com` (costs $)

### 2. CORS Errors

**Problem:** Frontend can't call backend

**Solution:** Update `ALLOWED_ORIGINS` in backend environment variables:
```bash
ALLOWED_ORIGINS=https://your-frontend.onrender.com
```

### 3. Build Failures

**Problem:** `npm run build:backend` fails

**Solution:** Check TypeScript errors locally first:
```bash
npm run typecheck
npm run build:backend
```

Fix all errors before deploying.

### 4. Port Binding Errors

**Problem:** Backend doesn't start

**Solution:** Use Render's `PORT` environment variable:
```typescript
const PORT = process.env.PORT || 3000
app.listen(PORT)
```

Render automatically sets `PORT`, don't hardcode it.

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] Can login/register users
- [ ] Database migrations completed
- [ ] All environment variables set correctly
- [ ] CORS configured for production URLs
- [ ] HTTPS enforced (Render does this automatically)
- [ ] Secrets are production-grade (256-bit)
- [ ] MongoDB Atlas connection working
- [ ] Redis connection working
- [ ] Analytics endpoints working
- [ ] Custom domain configured (optional)
- [ ] Set up monitoring/alerts in Render
- [ ] Enable automatic deploys from main branch

---

## 🎯 Development vs Production Summary

| Feature | Local (Docker) | Production (Render) |
|---------|---------------|---------------------|
| **PostgreSQL** | Docker container | Render managed PostgreSQL |
| **MongoDB** | Docker container | MongoDB Atlas |
| **Redis** | Docker container | Render managed Redis |
| **Elasticsearch** | Docker container | Disabled or Elastic Cloud |
| **Backend** | `npm run dev:backend` | Render Web Service |
| **Frontend** | `npm run dev:frontend` | Render Static Site |
| **Environment** | `.env` file | Render env vars |
| **Secrets** | Weak (for dev) | Strong (256-bit) |
| **HTTPS** | No | Yes (automatic) |
| **Auto-deploy** | No | Yes (on git push) |
| **Cost** | $0 (uses your PC) | $0-$125/month |

---

## 🔗 Custom Domain Setup

### 1. Buy Domain (e.g., clientforge.com)

### 2. Configure in Render

**Backend:**
1. Render → Backend Service → Settings → Custom Domains
2. Add: `api.clientforge.com`
3. Add DNS records at your domain provider:
```
Type: CNAME
Name: api
Value: clientforge-backend.onrender.com
```

**Frontend:**
1. Render → Frontend Site → Settings → Custom Domains
2. Add: `clientforge.com` and `www.clientforge.com`
3. Add DNS records:
```
Type: A
Name: @
Value: <Render IP from dashboard>

Type: CNAME
Name: www
Value: clientforge-frontend.onrender.com
```

### 3. Update Environment Variables

```bash
# Backend
APP_URL=https://api.clientforge.com
FRONTEND_URL=https://clientforge.com
ALLOWED_ORIGINS=https://clientforge.com,https://www.clientforge.com

# Frontend
VITE_API_URL=https://api.clientforge.com/api
```

---

**You're now live! 🚀**

Local Docker for development → Git for version control → Render for production
