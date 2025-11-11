# AI Session Quick Reference Card

**ClientForge CRM v3.0 - Abstract Creatives LLC**

---

## 🚀 START OF SESSION

### Step 1: Read Documentation (5 min)
```
✅ README.md (Complete AI guide - has EVERYTHING!)
✅ docs/07_CHANGELOG.md (recent changes)
✅ docs/00_MAP.md (file structure)
✅ logs/session-logs/ (last 2-3 sessions)
```

### Step 2: Confirm Task
- What am I working on?
- Where did we leave off?
- What's the goal today?

---

## 💻 DURING SESSION

### Track Changes
```
Files Created:    ________________
Files Modified:   ________________
New Features:     ________________
API Changes:      ________________
```

### File Placement Rules
```
Source Code      → backend/, frontend/, ai/
Documentation    → docs/
Configuration    → config/
Scripts          → scripts/
Tests            → tests/
Logs             → logs/
```

### Naming Conventions
```
Directories:     kebab-case
Files:           kebab-case.ext
Components:      PascalCase.tsx
Classes:         PascalCase
Functions/Vars:  camelCase
Constants:       UPPER_SNAKE_CASE
Database:        snake_case
```

---

## ⏰ END OF SESSION (Reserve 10 min!)

### Required Steps (IN ORDER)

**1. Run Command:**
```bash
npm run docs:session-end
```

**2. Create Session Log:**
```
Location: logs/session-logs/YYYY-MM-DD-task.md
Fill in: All sections completely
```

**3. Update CHANGELOG:**
```
Location: docs/07_CHANGELOG.md
Add: Entry with date and changes
```

**4. Update MAP (if files changed):**
```
Location: docs/00_MAP.md
Add/Remove: All file changes
```

**5. Update Other Docs (as needed):**
```
Files changed?      → 00_MAP.md ✅
API endpoint?       → 03_API.md
AI feature?         → 02_AI-SYSTEMS.md
Architecture?       → 01_ARCHITECTURE.md
Deployment?         → 04_DEPLOYMENT.md
Security?           → 05_SECURITY.md
Dev tool?           → 06_DEVELOPMENT.md
Bug pattern?        → 08_TROUBLESHOOTING.md
```

---

## 📊 Quick Decision Matrix

| Action | Update These Docs |
|--------|------------------|
| Created file | 00_MAP + 07_CHANGELOG |
| Modified file | 07_CHANGELOG (minimum) |
| Deleted file | 00_MAP + 07_CHANGELOG |
| New API endpoint | 03_API + 07_CHANGELOG |
| New AI feature | 02_AI-SYSTEMS + 07_CHANGELOG |
| Architecture change | 01_ARCHITECTURE + 07_CHANGELOG |
| End of session | SESSION LOG + 07_CHANGELOG + 00_MAP |

---

## ✅ Final Checklist

Before ending:
- [ ] Session log complete
- [ ] CHANGELOG updated
- [ ] MAP updated (if files changed)
- [ ] Other main docs updated (as needed)
- [ ] No TODOs without documentation
- [ ] All links work
- [ ] Next steps documented
- [ ] Formatting consistent

---

## 🚨 Never Do

❌ Skip reading docs at start
❌ Create files in root
❌ End without updating docs
❌ Skip session log
❌ Leave placeholder text
❌ Rush documentation
❌ Ignore naming conventions

---

## ✅ Always Do

✅ Read docs at session start
✅ Reserve 10 min for docs
✅ Track all changes
✅ Update CHANGELOG every session
✅ Create session log every time
✅ Follow file organization rules
✅ Document as you code
✅ Verify before ending

---

## 📚 Documentation Files

### Main Docs (CAPITALIZED + NUMBERED)
```
00_MAP.md            - File structure map
01_ARCHITECTURE.md   - System architecture
02_AI-SYSTEMS.md     - AI features & models
03_API.md            - API endpoints
04_DEPLOYMENT.md     - Deployment guide
05_SECURITY.md       - Security overview
06_DEVELOPMENT.md    - Dev guide
07_CHANGELOG.md      - Version history ⚡ UPDATE EVERY SESSION
08_TROUBLESHOOTING.md - Common issues
```

### Logs
```
logs/session-logs/YYYY-MM-DD-task.md
```

---

## 🎯 Time Management

```
Total Session:   60 min
──────────────────────────
Working:         50 min
Documentation:   10 min ⚡ CRITICAL
```

---

## 💡 Pro Tips

1. Set timer for last 10 minutes
2. Track changes as you work
3. Read last session log first
4. Follow existing patterns
5. Ask if unsure
6. Over-document vs under-document
7. Verify links before ending
8. Document "Next Steps" clearly

---

## 📞 Need Help?

```
Complete AI Guide: README.md (has EVERYTHING!)
Complete System:   DOCUMENTATION_SYSTEM.md
Project README:    docs/readme/PROJECT_README.md
Update Guide:      docs/DOCUMENTATION_UPDATE_GUIDE.md
Script Help:       scripts/documentation/README.md
Examples:          logs/session-logs/ (previous sessions)
```

---

## 🔄 Session Workflow

```
START
  ↓
Read Docs (5 min)
  ↓
Confirm Task
  ↓
DO WORK (Track changes)
  ↓
RESERVE 10 MIN
  ↓
npm run docs:session-end
  ↓
Fill Session Log
  ↓
Update CHANGELOG
  ↓
Update MAP
  ↓
Update Other Docs
  ↓
Verify All Docs
  ↓
COMPLETE ✅
```

---

**Remember: Documentation is NOT optional!**

**ClientForge CRM v3.0**
*Built with ❤️ by Abstract Creatives LLC*
