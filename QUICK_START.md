# ClientForge CRM - Quick Start Guide

## 🚀 One-Click Startup

Simply run this BAT file to start everything:

```batch
D:\clientforge-crm\scripts\deployment\start-all.bat
```

**What it does:**
1. ✅ Starts Backend Server (Port 3000)
2. ✅ Starts Frontend Server (Port 3001)
3. ✅ Waits for servers to initialize
4. ✅ **Automatically opens browser to http://localhost:3001**

## 🌐 Access Points

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/v1/health

## 🔐 Default Login

- **Email**: master@clientforge.io
- **Password**: Your master admin password

## 📁 Project Structure

```
D:\clientforge-crm\                  ← SINGLE SOURCE OF TRUTH
├── backend/                         ← Port 3000 (Node.js + Express)
│   ├── api/routes/                 ← API endpoints
│   ├── services/ai/                ← AI features
│   └── index.ts                    ← Entry point
│
├── frontend/                        ← Port 3001 (React + Vite)
│   └── src/                        ← React components
│
└── scripts/deployment/
    └── start-all.bat               ← YOUR MAIN STARTUP SCRIPT
```

## 🛠️ Essential BAT Files

**Main Startup:**
- `scripts/deployment/start-all.bat` - **Use this one!** Starts everything + opens browser

**Supporting Scripts:**
- `scripts/deployment/start-backend.bat` - Backend only (called by start-all)
- `scripts/deployment/start-frontend.bat` - Frontend only (called by start-all)
- `scripts/deployment/restart-clean.bat` - Clean restart utility

**Database Utilities:**
- `scripts/fix-postgres-auth.bat` - Fix PostgreSQL authentication issues

## 🎯 Available Features (All 100% Complete)

### Priority 1-5: Strategic Roadmap ✅
1. ✅ **Core CRM Foundation** - Contacts, Accounts, Deals, Custom Fields
2. ✅ **Multi-Pipeline Deals** - Drag-and-drop Kanban, Multiple pipelines
3. ✅ **Email Integration** - Gmail & Outlook OAuth2, Sync, Send
4. ✅ **Reporting & Analytics** - Charts, Metrics, CSV/PDF Export
5. ✅ **AI-Powered Features** - Lead Scoring, Next Actions, Email Composition, Pattern Recognition, Sentiment Analysis

### AI Capabilities

**Lead Scoring** (`POST /api/v1/ai/lead-score/:contactId`):
- 0-100 scores with A-F grades
- Hot/Warm/Cold priority levels
- Engagement, company fit, timing, budget factors

**Next Action Suggestions** (`POST /api/v1/ai/next-actions/:dealId`):
- Contextual recommendations (call/email/meeting/demo)
- Deal health scores
- Risk assessments and opportunities

**AI Email Composition** (`POST /api/v1/ai/compose-email`):
- Purpose-driven (follow-up, introduction, proposal, etc.)
- Tone-adjustable (professional, casual, friendly, formal)
- Personalized based on context

**Pattern Recognition** (`POST /api/v1/ai/recognize-patterns/:dealId`):
- At-risk deals detection
- Upsell/cross-sell opportunities
- Expansion readiness indicators

**Sentiment Analysis** (`POST /api/v1/ai/sentiment-analysis/:emailId`):
- Email emotion detection
- Urgency level tracking
- Sentiment trends (improving/stable/declining)

## 🗄️ Database Stack

All running in Docker:

- **PostgreSQL** (Port 5432) - Primary transactional database
- **MongoDB** (Port 27017) - Structured logs with TTL
- **Elasticsearch** (Port 9200) - Full-text search
- **Redis** (Port 6379) - Sessions, cache, rate limiting

## 🔧 Troubleshooting

### Port Already in Use
If you see "EADDRINUSE" error:

```batch
# Kill processes on port 3000 (backend)
taskkill //F //PID <PID>

# Find PID using:
netstat -ano | findstr :3000
```

### Cannot Login
1. Clear browser cache and cookies
2. Try incognito/private browsing
3. Check browser console (F12) for errors
4. Verify backend is running on port 3000

### Server Won't Start
1. Check Docker is running (PostgreSQL, MongoDB, Elasticsearch, Redis)
2. Verify `.env` file exists in project root
3. Check logs in server console windows

## 📝 Useful Commands

```bash
# Backend only
npm run dev:backend

# Frontend only (from frontend directory)
cd frontend && npm run dev

# Run both with Turbo
npm run dev

# Database migration
node scripts/run-ai-features-migration.js

# Check user account
node scripts/check-user-schema.js
```

## 🎉 Next Steps

After login, you'll see:
- Dashboard with metrics
- Contacts management
- Deals pipeline (Kanban board)
- Email integration
- Analytics with charts
- AI-powered features

## 📚 Documentation

- **README.md** - Full project documentation
- **CHANGELOG.md** - Recent changes and features
- **IMPLEMENTATION_COMPLETE.md** - Setup guide

---

**Questions or Issues?**

Check the browser console (F12) for errors or review the server logs in the command windows that start-all.bat opens.
