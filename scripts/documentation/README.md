# Documentation Update Scripts

**ClientForge CRM v3.0**
**Abstract Creatives LLC**

---

## 📚 Overview

This directory contains scripts to help maintain and update the main documentation files for ClientForge CRM.

## 🛠️ Available Scripts

### 1. `update-main-docs.ps1` (Windows PowerShell)

Interactive script for updating main documentation.

**Usage:**
```powershell
# Interactive mode (recommended)
.\update-main-docs.ps1

# Session end update (MAP + CHANGELOG + Log)
.\update-main-docs.ps1 -Mode session-end

# Update changelog only
.\update-main-docs.ps1 -Mode changelog-only

# Update all docs
.\update-main-docs.ps1 -Mode all
```

### 2. `update-main-docs.sh` (Linux/Mac/WSL)

Bash version of the update script.

**Usage:**
```bash
# Make executable
chmod +x update-main-docs.sh

# Interactive mode
./update-main-docs.sh

# Session end update
./update-main-docs.sh session-end

# Update changelog only
./update-main-docs.sh changelog
```

### 3. Quick Commands

Add these to your `package.json` for easy access:

```json
{
  "scripts": {
    "docs:update": "powershell -ExecutionPolicy Bypass -File ./scripts/documentation/update-main-docs.ps1",
    "docs:session-end": "powershell -ExecutionPolicy Bypass -File ./scripts/documentation/update-main-docs.ps1 -Mode session-end",
    "docs:changelog": "powershell -ExecutionPolicy Bypass -File ./scripts/documentation/update-main-docs.ps1 -Mode changelog-only"
  }
}
```

Then run:
```bash
npm run docs:update
npm run docs:session-end
npm run docs:changelog
```

---

## 📋 Main Documentation Files

| File | Purpose | Update Frequency |
|------|---------|------------------|
| **00_MAP.md** | Complete file/folder map | High - When files change |
| **01_ARCHITECTURE.md** | System architecture | Medium - Major changes |
| **02_AI-SYSTEMS.md** | AI tools and systems | Medium - AI changes |
| **03_API.md** | API documentation | High - New endpoints |
| **04_DEPLOYMENT.md** | Deployment guide | Low - Config changes |
| **05_SECURITY.md** | Security overview | Low - Security changes |
| **06_DEVELOPMENT.md** | Development guide | Low - Tool changes |
| **07_CHANGELOG.md** | Version history | **Very High - Every session** |
| **08_TROUBLESHOOTING.md** | Common issues | Medium - New issues |

---

## 🔄 Update Workflow

### Before Ending Session (AI Assistants)

**CRITICAL: Reserve 5-10 minutes for documentation updates**

1. **Run session-end script**:
   ```bash
   npm run docs:session-end
   ```

2. **This will**:
   - Create session log
   - Prompt for MAP updates
   - Prompt for CHANGELOG entry
   - Guide you through the process

3. **Manual steps**:
   - Fill in session log details
   - Update MAP if files/folders were added
   - Complete CHANGELOG entry
   - Update other main docs if needed

### During Development

**When making changes**:

1. **New files/folders**: Update `00_MAP.md`
2. **Architecture changes**: Update `01_ARCHITECTURE.md`
3. **New AI features**: Update `02_AI-SYSTEMS.md`
4. **New API endpoints**: Update `03_API.md`
5. **Deployment changes**: Update `04_DEPLOYMENT.md`
6. **Security changes**: Update `05_SECURITY.md`
7. **Dev tool changes**: Update `06_DEVELOPMENT.md`
8. **Any change**: Update `07_CHANGELOG.md`
9. **New bug pattern**: Update `08_TROUBLESHOOTING.md`

---

## 📝 Session Log Template

Session logs are created in `logs/session-logs/YYYY-MM-DD-task-name.md`

**Template Structure**:
```markdown
# Session Log: YYYY-MM-DD - Task Name

**Date**: YYYY-MM-DD
**Time**: HH:MM
**AI Assistant**: Claude Code
**Task**: Brief description

## Changes Made

### Files Created
- `path/to/file.ts` - Purpose

### Files Modified
- `path/to/file.ts` - Changes

### Folders Created
- `path/to/folder/` - Purpose

## Documentation Updated
- [x] 00_MAP.md
- [ ] 01_ARCHITECTURE.md
- ...

## Summary
What was accomplished

## Next Steps
- Unfinished work
- Suggestions

## Notes
- Important observations
```

---

## 🎯 Quick Reference

### Must Update Every Session
- ✅ **07_CHANGELOG.md** - ALWAYS
- ✅ **Session Log** - ALWAYS
- ✅ **00_MAP.md** - If files/folders changed

### Update When Relevant
- **01_ARCHITECTURE.md** - Architecture changes
- **02_AI-SYSTEMS.md** - AI feature changes
- **03_API.md** - New/modified endpoints
- **04_DEPLOYMENT.md** - Deployment config changes
- **05_SECURITY.md** - Security changes
- **06_DEVELOPMENT.md** - Dev tool changes
- **08_TROUBLESHOOTING.md** - New issues found

---

## 🔍 Verification Checklist

Before ending session:

- [ ] Session log created and filled out
- [ ] CHANGELOG has entry for this session
- [ ] MAP reflects current file structure
- [ ] Relevant main docs updated
- [ ] All changes documented
- [ ] No TODO items left in docs
- [ ] Links work correctly
- [ ] Formatting is consistent

---

## 🤖 AI Assistant Quick Commands

```bash
# At end of Claude Code session
npm run docs:session-end

# Quick changelog entry
npm run docs:changelog

# Full docs review
npm run docs:update
```

---

## 📞 Support

For questions about documentation:
- Read: `docs/DOCUMENTATION_UPDATE_GUIDE.md`
- Check: Main README.md section on Documentation System
- Ask: Project lead or team

---

**Remember**: Good documentation is as important as good code!

**Last Updated**: 2025-01-05
**Maintained By**: Abstract Creatives LLC
