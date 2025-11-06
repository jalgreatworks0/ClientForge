# 🐳 ClientForge CRM - Docker Setup Guide

**Quick Reference for Starting Your Development Environment**

---

## ✅ **Tools Installed**

- ✅ **Docker Desktop 4.50** (Manual install in progress)
- ✅ **DBeaver** - Database management GUI
  - Location: `C:\Program Files\DBeaver`
  - Launch: Start Menu → DBeaver
- ✅ **Postman** - API testing tool
  - Location: `C:\Users\ScrollForge\AppData\Local\Postman`
  - Launch: Start Menu → Postman
- ✅ **MongoDB Compass** - MongoDB GUI
  - Location: `C:\Users\ScrollForge\AppData\Local\Postman`
  - Launch: Start Menu → MongoDB Compass
- ✅ **Node.js v22.21.0** - JavaScript runtime
- ✅ **Git** - Version control
- ✅ **VS Code** - Code editor
- ✅ **NVIDIA CUDA 13.0** - GPU acceleration for AI

### ⚠️ **Still Need**
- **Redis Insight** - Download manually: https://redis.io/insight/
  - Chocolatey doesn't have it, but it's optional

---

## 🚀 **Quick Start (After Docker Desktop Installs)**

### **Step 1: Start Docker Desktop**
1. Open **Docker Desktop** from Start Menu
2. Wait for "Docker Desktop is running" (system tray icon turns green)
3. Accept any first-time setup prompts

### **Step 2: Start Database Services**
Open PowerShell in project directory:

```powershell
cd D:\clientforge-crm

# Start all database services
docker compose up -d postgres redis mongodb

# Verify services are running
docker compose ps
```

Expected output:
```
NAME                      STATUS              PORTS
clientforge-crm-postgres  running (healthy)   0.0.0.0:5432->5432/tcp
clientforge-crm-redis     running (healthy)   0.0.0.0:6379->6379/tcp
clientforge-crm-mongodb   running (healthy)   0.0.0.0:27017->27017/tcp
```

### **Step 3: Initialize Database Schema**
```powershell
# Run the initial migration
docker compose exec postgres psql -U crm -d clientforge -f /docker-entrypoint-initdb.d/001_initial_schema.sql

# OR if mounted correctly:
psql -h localhost -U crm -d clientforge -f backend/database/migrations/001_initial_schema.sql
```

When prompted for password, enter: `password`

### **Step 4: Verify Database**
```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U crm -d clientforge

# List tables
\dt

# Should see:
# - tenants
# - users
# - roles
# - user_roles
# - sessions
# - contacts
# - accounts
# - deals
# - tasks
# - activities
# - tags
# - notes
# - comments
# - notifications
# - audit_logs
# - custom_fields

# Exit psql
\q
```

### **Step 5: Test Backend Connection**
Backend should auto-reconnect once PostgreSQL is running.

Check server logs for:
```
✅ PostgreSQL connection pool initialized
✅ Claude SDK Service initialized
✅ OpenAI Service initialized
🚀 Server running on port 3000
```

Test health endpoint:
```powershell
curl http://localhost:3000/api/v1/health
```

---

## 🗄️ **Database Connection Details**

### **PostgreSQL (Primary Database)**
```
Host: localhost
Port: 5432
Database: clientforge
User: crm
Password: password
```

**DBeaver Connection:**
1. Open DBeaver
2. New Connection → PostgreSQL
3. Enter details above
4. Test Connection → OK
5. Finish

### **Redis (Cache & Sessions)**
```
Host: localhost
Port: 6379
Password: (none)
```

**Redis Insight Connection:**
1. Open Redis Insight (if installed)
2. Add Database
3. Host: localhost, Port: 6379
4. Connect

### **MongoDB (Logs & Events)**
```
Host: localhost
Port: 27017
Database: clientforge_logs
User: crm
Password: password
Connection String: mongodb://crm:password@localhost:27017
```

**MongoDB Compass Connection:**
1. Open MongoDB Compass
2. New Connection
3. URI: `mongodb://crm:password@localhost:27017`
4. Connect

---

## 📊 **Default Admin Account**

After running the initial schema migration:

```
Email: admin@clientforge.com
Password: admin123
```

⚠️ **IMPORTANT**: Change this password immediately in production!

### **Login via API:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clientforge.com",
    "password": "admin123"
  }'
```

You'll receive:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": "00000000-0000-0000-0000-000000000001",
      "email": "admin@clientforge.com",
      "firstName": "Admin",
      "lastName": "User"
    }
  }
}
```

---

## 🛠️ **Useful Docker Commands**

### **View Logs**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f mongodb
```

### **Stop Services**
```bash
# Stop all
docker compose down

# Stop specific service
docker compose stop postgres
```

### **Restart Services**
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart postgres
```

### **Clean Up (Nuclear Option)**
```bash
# Stop and remove containers + volumes (deletes all data!)
docker compose down -v

# Then start fresh
docker compose up -d
```

### **Check Service Health**
```bash
# PostgreSQL
docker compose exec postgres pg_isready -U crm

# Redis
docker compose exec redis redis-cli ping

# MongoDB
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

---

## 🔧 **Troubleshooting**

### **"Port 5432 already in use"**
Another PostgreSQL instance is running:
```bash
# Windows - Stop local PostgreSQL service
net stop postgresql-x64-14

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use 5433 instead
```

### **"Cannot connect to Docker daemon"**
Docker Desktop isn't running:
1. Start Docker Desktop from Start Menu
2. Wait for green icon in system tray
3. Try command again

### **"Database 'clientforge' does not exist"**
Database wasn't created:
```bash
# Create database manually
docker compose exec postgres createdb -U crm clientforge

# Then run migration
docker compose exec postgres psql -U crm -d clientforge -f /path/to/001_initial_schema.sql
```

### **Backend still says "Database connection error"**
1. Check PostgreSQL is running: `docker compose ps`
2. Check logs: `docker compose logs postgres`
3. Restart backend server (it should auto-reconnect)
4. Check .env has correct DATABASE_URL

---

## 📋 **API Endpoints to Test in Postman**

Once database is running, test these endpoints:

### **1. Health Check**
```
GET http://localhost:3000/api/v1/health
```

### **2. Login**
```
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@clientforge.com",
  "password": "admin123"
}
```

### **3. Get Contacts** (Requires auth token)
```
GET http://localhost:3000/api/v1/contacts
Authorization: Bearer {your_access_token}
```

### **4. Create Contact**
```
POST http://localhost:3000/api/v1/contacts
Authorization: Bearer {your_access_token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-1234"
}
```

### **5. AI Chat (Albedo)**
```
POST http://localhost:3000/api/v1/ai/chat
Authorization: Bearer {your_access_token}
Content-Type: application/json

{
  "message": "Show me my top 5 deals",
  "context": {}
}
```

---

## 🎯 **Next Steps After Setup**

1. ✅ Start Docker Desktop
2. ✅ Run `docker compose up -d postgres redis mongodb`
3. ✅ Run database migration
4. ✅ Verify backend connects
5. ✅ Test login with Postman
6. ✅ Create test contact
7. ✅ Test AI endpoint
8. 🚀 Start building features!

---

## 📚 **Additional Resources**

- **Docker Compose Docs**: https://docs.docker.com/compose/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/docs/
- **MongoDB Docs**: https://www.mongodb.com/docs/

---

**Built with ❤️ for ClientForge CRM v3.0**
**All services containerized for easy development and deployment**
