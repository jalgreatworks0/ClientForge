# 🚀 ClientForge CRM - Quick Start Guide

**Get up and running in 5 minutes!**

---

## ✅ Prerequisites Installed

- ✅ **Docker Desktop 4.50** (Installing now)
- ✅ **Node.js v22.21.0**
- ✅ **DBeaver** - Database GUI
- ✅ **Postman** - API testing
- ✅ **MongoDB Compass** - MongoDB GUI

---

## 🎯 Three Simple Steps

### **Step 1: Start Docker Desktop**
1. Open Docker Desktop from Start Menu
2. Wait for green icon in system tray (Docker is running)

### **Step 2: Start Development Environment**
Open PowerShell in `D:\clientforge-crm`:

```powershell
.\start-dev.ps1
```

This will:
- ✅ Start PostgreSQL, Redis, MongoDB
- ✅ Verify all services are healthy
- ✅ Show connection details

### **Step 3: Initialize Database**
```powershell
.\run-migrations.ps1
```

This will:
- ✅ Create all database tables
- ✅ Set up default admin user
- ✅ Verify schema is correct

**That's it! Your development environment is ready!** 🎉

---

## 📊 Access Your Services

### **Backend API**
```
URL: http://localhost:3000
Health: http://localhost:3000/api/v1/health
```

### **Databases**
```
PostgreSQL: localhost:5432
  User: crm
  Password: password
  Database: clientforge

Redis: localhost:6379

MongoDB: localhost:27017
  User: crm
  Password: password
```

### **Default Admin Account**
```
Email: admin@clientforge.com
Password: admin123
```
⚠️ Change this in production!

---

## 🛠️ Development Workflow

### **Start Backend Server**
```powershell
npm run dev:backend
```

### **Start Frontend**
```powershell
npm run dev:frontend
```

### **Test API with Postman**
1. Open Postman
2. Create new request:
   ```
   POST http://localhost:3000/api/v1/auth/login
   Content-Type: application/json

   {
     "email": "admin@clientforge.com",
     "password": "admin123"
   }
   ```
3. Copy the `accessToken` from response
4. Test other endpoints with:
   ```
   Authorization: Bearer {your_access_token}
   ```

### **View Database with DBeaver**
1. Open DBeaver
2. New Connection → PostgreSQL
3. Host: `localhost`, Port: `5432`
4. Database: `clientforge`, User: `crm`, Password: `password`
5. Test Connection → OK → Finish

---

## 🔄 Common Commands

### **View Logs**
```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
```

### **Restart Services**
```powershell
docker compose restart
```

### **Stop Everything**
```powershell
docker compose down
```

### **Reset Everything (Nuclear Option)**
```powershell
.\reset-dev-env.ps1
```
⚠️ This deletes ALL data!

---

## 🐛 Troubleshooting

### **"Docker is not running"**
- Start Docker Desktop from Start Menu
- Wait for green icon in system tray

### **"Port already in use"**
```powershell
# Find what's using the port
netstat -ano | findstr :5432

# Kill the process (replace PID)
taskkill /PID <process_id> /F
```

### **Backend can't connect to database**
1. Check PostgreSQL is running: `docker compose ps`
2. Check logs: `docker compose logs postgres`
3. Restart backend server (auto-reconnects)

### **Need to start fresh?**
```powershell
.\reset-dev-env.ps1
```

---

## 📚 Next Steps

1. ✅ **Read**: `DOCKER_SETUP_GUIDE.md` - Detailed setup info
2. ✅ **Read**: `docs/BUILD_GUIDE_FOUNDATION.md` - Development roadmap
3. ✅ **Read**: `README.md` - Project overview & protocols
4. 🚀 **Start Building**: Phase 2 features (contacts, deals, tasks)

---

## 🎯 Available Scripts

| Script | Purpose | Warning |
|--------|---------|---------|
| `start-dev.ps1` | Start all services | Safe |
| `run-migrations.ps1` | Run database migrations | Safe |
| `reset-dev-env.ps1` | Nuclear reset | ⚠️ Deletes data! |

---

## 🌐 Key URLs

| Service | URL |
|---------|-----|
| Backend Health | http://localhost:3000/api/v1/health |
| Backend API | http://localhost:3000/api/v1 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MongoDB | localhost:27017 |

---

## 🔑 API Endpoints

### **Authentication**
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh token

### **Contacts**
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact
- `GET /api/v1/contacts/:id` - Get contact
- `PUT /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact

### **Accounts**
- `GET /api/v1/accounts` - List accounts
- `POST /api/v1/accounts` - Create account
- (Same CRUD pattern)

### **Deals**
- `GET /api/v1/deals` - List deals
- `POST /api/v1/deals` - Create deal
- (Same CRUD pattern)

### **AI Assistant (Albedo)**
- `POST /api/v1/ai/chat` - Chat with Albedo
- `POST /api/v1/ai/suggest` - Get suggestions

All endpoints (except auth) require:
```
Authorization: Bearer {access_token}
```

---

**Happy Coding! 🚀**

**For questions, check:**
- `DOCKER_SETUP_GUIDE.md` - Docker details
- `docs/BUILD_GUIDE_FOUNDATION.md` - Build roadmap
- `README.md` - Project protocols
