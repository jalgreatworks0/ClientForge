# ClientForge CRM - Quick Start Guide

## 🚀 Starting the Application

### Option 1: One-Click Start (Recommended)
```bash
# Double-click or run:
D:\clientforge-crm\scripts\deployment\start-all.bat
```

### Option 2: Manual Start
```bash
# Terminal 1 - Backend
cd D:\clientforge-crm
npm run dev:backend

# Terminal 2 - Frontend
cd D:\clientforge-crm\frontend
npm run dev
```

---

## 🔑 Master Admin Login

```
Email:    master@clientforge.io
Password: _puQRte2HNygbzbRZD2kNqiXIUBlrWAZ5lBKT3aIXPI
```

⚠️ **IMPORTANT**: Change this password in production!

---

## 🐳 Docker Services (Already Running)

All infrastructure services are running in Docker Desktop:

| Service | Port | Status | Console |
|---------|------|--------|---------|
| PostgreSQL (pgvector) | 5432 | ✅ Running | - |
| MongoDB | 27017 | ✅ Running | - |
| Redis | 6379 | ✅ Running | - |
| Elasticsearch | 9200 | ✅ Running | http://localhost:9200 |
| MinIO (S3) | 9000 | ✅ Running | http://localhost:9001 |
| RabbitMQ | 5672 | ✅ Running | http://localhost:15672 |

### MinIO Console
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

### RabbitMQ Management
- URL: http://localhost:15672
- Username: `crm`
- Password: `password`

---

## 📊 Application URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/v1/health
- **Metrics**: http://localhost:3000/metrics

---

## ✅ What's Already Done

1. ✅ All Docker services configured and running
2. ✅ Database seeded with master admin user
3. ✅ Elasticsearch ILM policies set up
4. ✅ Environment variables configured
5. ✅ Backend import errors fixed
6. ✅ Backend server running and healthy

---

## 🛠️ Useful Commands

### Database
```bash
# Seed master admin
npm run seed:admin

# Run migrations
npm run db:migrate
```

### Elasticsearch
```bash
# Setup ILM policies
npm run es:setup-ilm

# Create tenant aliases
npm run es:create-tenant-aliases
```

### Queue Management
```bash
# Check queue health
npm run queue:health

# Clear dead letter queue
npm run queue:clear-dlq
```

### Deployment Verification
```bash
# Run all deployment checks
npm run deploy:verify
```

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Kill processes on ports
for /f "tokens=5" %a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %a
```

### Docker services not running
```bash
cd D:\clientforge-crm\deployment\docker\development
docker-compose up -d postgres redis mongodb elasticsearch minio rabbitmq
```

### Check Docker status
```bash
docker ps --filter "name=clientforge"
```

---

## 📁 Key Files Modified

1. **D:\clientforge-crm\.env** - Environment configuration
2. **D:\clientforge-crm\scripts\seed\seed-admin.ts** - Master admin seeding script
3. **D:\clientforge-crm\deployment\docker\development\docker-compose.dev.yml** - Docker services
4. **D:\clientforge-crm\backend\services\storage\storage.service.ts** - Fixed logger import
5. **D:\clientforge-crm\backend\api\rest\v1\controllers\files-controller.ts** - Fixed logger import
6. **D:\clientforge-crm\backend\api\rest\v1\routes\files-routes.ts** - Fixed imports

---

## 🎯 Next Steps

1. Run `D:\clientforge-crm\scripts\deployment\start-all.bat`
2. Wait for both servers to start (5-10 seconds)
3. Browser will open automatically to http://localhost:3001
4. Log in with master admin credentials
5. Start building! 🚀

---

## 📞 Support

- Documentation: Check the `/docs` folder
- Issues: Review the error logs in Terminal windows
- Health Check: http://localhost:3000/api/v1/health

---

**Generated:** 2025-11-10
**Backend Status:** ✅ Running
**Frontend Status:** Ready to start
**Docker Services:** ✅ All running
