# ClientForge CRM - Render Deployment Guide

## 🚀 Quick Deploy to Render

This guide walks you through deploying ClientForge CRM to Render.com with all required services.

---

## Prerequisites

1. **Render Account** - [Sign up at render.com](https://render.com)
2. **MongoDB Atlas** - [Free tier at mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. **Elasticsearch Cloud** - [Free trial at elastic.co](https://www.elastic.co/cloud/)
4. **Cloudflare R2** (Optional) - For file storage
5. **GitHub Repository** - Your code must be in a Git repo

---

## Step 1: External Services Setup

### MongoDB Atlas (Logging Database)

1. Create free cluster at mongodb.com/cloud/atlas
2. Create database: `clientforge_logs`
3. Create user with read/write permissions
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/clientforge_logs`
5. **Save this for later** - you'll add it to Render env vars

### Elasticsearch Cloud (Search)

1. Create free trial deployment at elastic.co
2. Note the Cloud ID and API endpoint
3. Get connection URL: `https://your-deployment.es.cloud:443`
4. **Save this for later**

### Cloudflare R2 (File Storage - Optional)

1. Create R2 bucket at cloudflare.com
2. Create API token with R2 permissions
3. Note:
   - Account ID
   - Access Key ID
   - Secret Access Key
   - Bucket name
4. **Save these for later**

---

## Step 2: Deploy to Render

### Method 1: Blueprint (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure services automatically
5. Click **Apply**

### Method 2: Manual Setup

If blueprint fails, deploy services manually:

#### A. PostgreSQL Database

1. **New** → **PostgreSQL**
2. Name: `clientforge-db`
3. Database: `clientforge`
4. User: `clientforge`
5. Region: `Oregon`
6. Plan: `Starter` ($7/mo)
7. Click **Create Database**
8. **Save internal connection string**

#### B. Redis

1. **New** → **Redis**
2. Name: `clientforge-redis`
3. Region: `Oregon`
4. Plan: `Standard` ($10/mo)
5. **CRITICAL**: Set `maxmemory-policy` to `noeviction`
6. Click **Create Redis**
7. **Save internal connection string**

#### C. Backend API

1. **New** → **Web Service**
2. Connect GitHub repository
3. Configuration:
   - **Name**: `clientforge-backend`
   - **Runtime**: `Node`
   - **Region**: `Oregon`
   - **Branch**: `main`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build:backend`
   - **Start Command**: `node dist/backend/index.js`
   - **Plan**: `Starter` ($7/mo)
   - **Health Check Path**: `/api/v1/health`

4. **Environment Variables** (click "Environment"):

```bash
# Application
NODE_ENV=production
APP_NAME=ClientForge CRM
APP_PORT=3000
LOG_LEVEL=info

# Security (Auto-generate these)
JWT_SECRET=<click "Generate">
SESSION_SECRET=<click "Generate">
ENCRYPTION_KEY=<click "Generate">

# Databases
DATABASE_URL=<from PostgreSQL service>
REDIS_URL=<from Redis service>
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/clientforge_logs
ELASTICSEARCH_URL=https://your-deployment.es.cloud:443

# CORS (Add your frontend URL after deploying frontend)
CORS_ORIGIN=https://your-frontend.onrender.com

# Storage (Optional - Cloudflare R2)
STORAGE_TYPE=cloudflare-r2
CLOUDFLARE_R2_ACCOUNT_ID=<your_account_id>
CLOUDFLARE_R2_ACCESS_KEY_ID=<your_access_key>
CLOUDFLARE_R2_SECRET_ACCESS_KEY=<your_secret>
CLOUDFLARE_R2_BUCKET=clientforge-production

# AI Services (Optional)
OPENAI_API_KEY=<your_key>
ANTHROPIC_API_KEY=<your_key>

# Email (Optional - SendGrid)
SENDGRID_API_KEY=<your_key>
EMAIL_FROM=noreply@yourdomain.com

# Features
ENABLE_AI_FEATURES=true
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_WEBSOCKET=true
ENABLE_JOB_QUEUE=true
```

5. Click **Create Web Service**
6. **Wait for deployment** (5-10 minutes)
7. **Note your backend URL**: `https://clientforge-backend.onrender.com`

#### D. Frontend

1. **New** → **Static Site**
2. Connect same GitHub repository
3. Configuration:
   - **Name**: `clientforge-frontend`
   - **Region**: `Oregon`
   - **Branch**: `main`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. **Environment Variables**:

```bash
NODE_ENV=production
VITE_API_URL=https://clientforge-backend.onrender.com/api
```

5. **Rewrite Rules** (under "Redirects/Rewrites"):
   - Source: `/*`
   - Destination: `/index.html`
   - Type: `Rewrite`

6. Click **Create Static Site**
7. **Note your frontend URL**: `https://clientforge-frontend.onrender.com`

#### E. Background Workers (Optional but Recommended)

1. **New** → **Background Worker**
2. Configuration:
   - **Name**: `clientforge-workers`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build:backend`
   - **Start Command**: `npm run workers:prod`
   - **Plan**: `Starter` ($7/mo)

3. **Environment Variables**: Same as backend (use "Copy from service")

---

## Step 3: Post-Deployment Setup

### 1. Update CORS Origin

1. Go to backend service
2. Edit `CORS_ORIGIN` environment variable
3. Set to: `https://your-frontend.onrender.com`
4. Service will auto-redeploy

### 2. Seed Master Admin

```bash
# SSH into backend service (from Render dashboard → Shell)
npm run seed:admin
```

**Master Admin Credentials**:
- Email: `master@clientforge.io`
- Password: (shown in seed output)

**⚠️ CRITICAL**: Change this password immediately after first login!

### 3. Run Database Migrations

```bash
# In backend shell
npm run db:migrate
```

### 4. Verify Elasticsearch Connection

```bash
# In backend shell
npm run es:check-status
```

### 5. Setup ILM Policies

```bash
# In backend shell
npm run es:setup-ilm
npm run es:create-tenant-aliases
```

---

## Step 4: Configure Automated Backups

### PostgreSQL Backups (Daily)

1. **New** → **Cron Job**
2. Configuration:
   - **Name**: `postgres-backup`
   - **Schedule**: `0 2 * * *` (Daily at 2 AM)
   - **Build Command**: `npm install`
   - **Start Command**: `npm run backup:postgres`
   - **Environment**: Same as backend

3. **Add S3 credentials** (for backup storage):

```bash
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=auto
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
```

### MongoDB Backups (Daily)

1. **New** → **Cron Job**
2. Configuration:
   - **Name**: `mongodb-backup`
   - **Schedule**: `0 3 * * *` (Daily at 3 AM)
   - **Start Command**: `npm run backup:mongodb`

---

## Step 5: Monitoring & Health Checks

### Health Endpoints

- **Backend**: `https://your-backend.onrender.com/api/v1/health`
- **Metrics**: `https://your-backend.onrender.com/metrics`

### Verify Services

1. Backend health check should return:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "services": {
    "database": "connected",
    "redis": "connected",
    "mongodb": "connected",
    "elasticsearch": "connected"
  }
}
```

2. Check logs in Render dashboard:
   - No critical errors
   - MongoDB collections initialized
   - Elasticsearch indexes created
   - Queue workers started

---

## Costs Breakdown

### Minimal Setup ($21/month)

- PostgreSQL Starter: $7/month
- Redis Standard: $10/month
- Backend Starter: $7/month (includes 750 hours)
- Frontend Static: $0/month
- **Total: ~$24/month**

### Recommended Production ($45/month)

- PostgreSQL Standard: $20/month
- Redis Standard: $10/month
- Backend Standard: $15/month
- Background Workers Starter: $7/month
- Cron Jobs (2): $0/month
- Frontend Static: $0/month
- **Total: ~$52/month**

### External Services

- MongoDB Atlas: $0/month (Free tier - 512MB)
- Elasticsearch Cloud: $0/month (14-day trial, then ~$15/mo)
- Cloudflare R2: $0/month (10GB free, then $0.015/GB)

---

## Troubleshooting

### Backend Won't Start

1. Check environment variables are set
2. Verify DATABASE_URL and REDIS_URL are correct
3. Check build logs for TypeScript errors
4. Ensure `npm run build:backend` succeeds locally

### MongoDB Connection Fails

1. Verify MongoDB Atlas connection string
2. Check IP whitelist allows Render IPs (0.0.0.0/0)
3. Test connection locally: `mongosh "mongodb+srv://..."`

### Elasticsearch Connection Fails

1. Verify Elasticsearch Cloud deployment is running
2. Check API key has correct permissions
3. Test with: `curl https://your-deployment.es.cloud:443`

### Workers Not Processing Jobs

1. Check Redis `maxmemory-policy` is `noeviction`
2. Verify background worker service is running
3. Check logs: `npm run queue:health`

### Frontend Can't Connect to Backend

1. Verify `VITE_API_URL` matches backend URL
2. Check `CORS_ORIGIN` in backend includes frontend URL
3. Test backend health endpoint directly

---

## Security Checklist

- [ ] Changed master admin password
- [ ] Set strong JWT_SECRET (auto-generated)
- [ ] Set strong SESSION_SECRET (auto-generated)
- [ ] Set strong ENCRYPTION_KEY (auto-generated)
- [ ] Configured CORS_ORIGIN to frontend URL only
- [ ] Enabled MongoDB Atlas IP whitelist
- [ ] Configured Cloudflare R2 CORS rules
- [ ] Set up automated backups
- [ ] Tested backup restoration process
- [ ] Enabled Render's built-in DDoS protection
- [ ] Configured custom domain with SSL

---

## Next Steps

1. **Custom Domain**: Configure in Render dashboard → Settings → Custom Domain
2. **SSL Certificate**: Auto-provisioned by Render (Let's Encrypt)
3. **Monitoring**: Set up Render alerts for service health
4. **Scaling**: Increase plans as usage grows
5. **Team Access**: Invite team members in Render dashboard

---

## Support Resources

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas/
- **Elasticsearch Cloud Docs**: https://www.elastic.co/guide/
- **ClientForge Health**: `https://your-backend.onrender.com/api/v1/health`

---

**🎉 Congratulations! ClientForge CRM is now live in production!**

Access your app at: `https://your-frontend.onrender.com`

Log in with master admin credentials and change the password immediately.
