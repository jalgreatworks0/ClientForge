# ClientForge CRM - Documentation System Guide

**Abstract Creatives LLC**
**Version**: 3.0.0
**Last Updated**: 2025-01-05

---

## 📚 Overview

This document explains how to maintain and update all documentation in the ClientForge CRM project. This system is designed for both human developers and AI assistants (especially Claude Code) to easily keep documentation synchronized with code changes.

---

## 🎯 Quick Start for AI Assistants

### Before Ending Any Session

**CRITICAL: Reserve 5-10 minutes for documentation updates**

```bash
# Run this command before ending session
npm run docs:session-end
```

This will:
1. ✅ Create a session log
2. ✅ Prompt for MAP updates
3. ✅ Prompt for CHANGELOG entry
4. ✅ Guide you through the process

### Minimum Required Updates

**EVERY session MUST update**:
- `docs/07_CHANGELOG.md` - Add entry for changes made
- `logs/session-logs/YYYY-MM-DD-task-name.md` - Create session log
- `docs/00_MAP.md` - Update if files/folders were added/removed

---

## 📁 Documentation Structure

### Main Documentation (CAPITALIZED + NUMBERED)

Located in `docs/` directory:

```
docs/
├── 00_MAP.md                       # Complete file/folder map ⚡ UPDATE OFTEN
├── 01_ARCHITECTURE.md              # System architecture overview
├── 02_AI-SYSTEMS.md                # AI tools and systems guide
├── 03_API.md                       # API documentation summary ⚡ UPDATE OFTEN
├── 04_DEPLOYMENT.md                # Deployment guide summary
├── 05_SECURITY.md                  # Security overview
├── 06_DEVELOPMENT.md               # Development guide
├── 07_CHANGELOG.md                 # Version history ⚡⚡ UPDATE EVERY SESSION
└── 08_TROUBLESHOOTING.md           # Common issues and solutions
```

### Sub-Documentation (lowercase)

Detailed documentation in subdirectories:

```
docs/
├── architecture/
│   ├── decisions/                  # Architecture Decision Records (ADRs)
│   ├── diagrams/                   # System diagrams
│   └── patterns/                   # Design patterns
├── api/
│   ├── rest/                       # REST API details
│   ├── graphql/                    # GraphQL schema details
│   └── websocket/                  # WebSocket events
├── guides/
│   ├── user-manual/                # End-user documentation
│   ├── admin-guide/                # Administrator guide
│   ├── developer-guide/            # Developer onboarding
│   └── ai-features/                # AI feature documentation
└── modules/
    ├── contacts/                   # Contact module docs
    ├── deals/                      # Deal pipeline docs
    └── ai-companion/               # Albedo AI docs
```

### Logs

Session and activity logs:

```
logs/
├── session-logs/                   # AI assistant session logs
│   └── 2025-01-05-task-name.md
├── development-logs/               # Development activity logs
├── deployment-logs/                # Deployment logs
└── error-logs/                     # Error tracking
```

---

## 🔄 Update Triggers

### Automatic Triggers

| Change Type | Files to Update |
|-------------|----------------|
| **Any file/folder created** | `00_MAP.md`, `07_CHANGELOG.md` |
| **Any file/folder deleted** | `00_MAP.md`, `07_CHANGELOG.md` |
| **Architecture change** | `01_ARCHITECTURE.md`, `07_CHANGELOG.md` |
| **New AI feature/model** | `02_AI-SYSTEMS.md`, `07_CHANGELOG.md` |
| **New/modified API endpoint** | `03_API.md`, `07_CHANGELOG.md` |
| **Deployment config change** | `04_DEPLOYMENT.md`, `07_CHANGELOG.md` |
| **Security feature/fix** | `05_SECURITY.md`, `07_CHANGELOG.md` |
| **New dev tool/process** | `06_DEVELOPMENT.md`, `07_CHANGELOG.md` |
| **New bug pattern** | `08_TROUBLESHOOTING.md`, `07_CHANGELOG.md` |

### Manual Triggers

1. **End of Major Update/Upgrade**
   - Update all affected main docs
   - Add comprehensive changelog entry
   - Update MAP if structure changed

2. **When Creator Requests**
   - "Update docs" or similar command
   - Update all relevant documentation
   - Ensure consistency across all docs

3. **Before Session End** (AI Assistants)
   - **ALWAYS** run `npm run docs:session-end`
   - Create session log
   - Update CHANGELOG
   - Update MAP if needed

---

## 🛠️ Available Tools

### NPM Scripts

```bash
# Interactive documentation update
npm run docs:update

# Session end update (recommended before ending session)
npm run docs:session-end

# Quick changelog entry
npm run docs:changelog

# Check documentation status
npm run docs:check

# Validate all documentation
npm run docs:validate
```

### PowerShell Scripts

```powershell
# Direct script execution
.\scripts\documentation\update-main-docs.ps1

# With parameters
.\scripts\documentation\update-main-docs.ps1 -Mode session-end
.\scripts\documentation\update-main-docs.ps1 -Mode changelog-only
```

---

## 📝 Documentation Templates

### Session Log Template

**Location**: `logs/session-logs/YYYY-MM-DD-task-name.md`

```markdown
# Session Log: YYYY-MM-DD - Task Name

**Date**: YYYY-MM-DD
**Time**: HH:MM - HH:MM
**AI Assistant**: Claude Code
**Task**: Brief description

## Changes Made

### Files Created
- `path/to/file.ts` - Purpose of file

### Files Modified
- `path/to/file.ts` - What was changed

### Folders Created
- `path/to/folder/` - Purpose of folder

## Documentation Updated
- [x] 00_MAP.md - Added new files to map
- [ ] 01_ARCHITECTURE.md - No changes needed
- [ ] 02_AI-SYSTEMS.md - No changes needed
- [x] 03_API.md - Added new endpoint documentation
- [ ] 04_DEPLOYMENT.md - No changes needed
- [ ] 05_SECURITY.md - No changes needed
- [ ] 06_DEVELOPMENT.md - No changes needed
- [x] 07_CHANGELOG.md - Added session entry
- [ ] 08_TROUBLESHOOTING.md - No changes needed

## Summary
Brief summary of work completed during this session.

## Next Steps
- Suggested next actions
- Unfinished work that needs attention
- Known issues to address

## Notes
- Any important observations
- Performance considerations
- Technical debt created
- Recommendations

---

**Session Duration**: HH:MM - HH:MM
**Status**: Completed
**By**: Claude Code / Abstract Creatives LLC
```

### Changelog Entry Template

**Location**: `docs/07_CHANGELOG.md`

```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature description
- Another new feature

### Changed
- Modified feature description
- Another change

### Fixed
- Bug fix description
- Another bug fix

### Removed
- Removed feature description

### Security
- Security improvement description

---
```

---

## 📋 Update Workflow

### For AI Assistants (Claude Code)

#### Starting a Session
1. Read relevant main documentation
2. Understand current project state
3. Note what will be changed

#### During the Session
1. Track all files created
2. Track all files modified
3. Track all folders created
4. Note architectural changes
5. Note new features/APIs

#### Before Ending Session (CRITICAL)

**Time Management**:
- Reserve 5-10 minutes for documentation
- Don't wait until the last second

**Steps**:
1. **Run session-end command**:
   ```bash
   npm run docs:session-end
   ```

2. **Create session log**:
   - Fill in all sections
   - List all files created/modified
   - Summarize changes
   - List next steps

3. **Update MAP**:
   - Add any new files/folders
   - Remove any deleted items
   - Maintain alphabetical order
   - Keep formatting consistent

4. **Update CHANGELOG**:
   - Add entry with today's date
   - Use proper categories (Added, Changed, Fixed, etc.)
   - Be specific and clear
   - Reference ticket numbers if applicable

5. **Update other main docs as needed**:
   - Architecture if structure changed
   - AI-SYSTEMS if AI features added
   - API if endpoints added
   - Others as relevant

6. **Verify updates**:
   - Check all links work
   - Ensure formatting is consistent
   - Verify accuracy of information

---

## 🎯 Quality Checklist

Before ending session, verify:

- [ ] Session log created and complete
- [ ] CHANGELOG has entry for this session
- [ ] MAP reflects current file structure
- [ ] All new features documented
- [ ] All API changes documented
- [ ] No broken internal links
- [ ] Code examples are accurate
- [ ] Formatting is consistent
- [ ] Clear, concise language used
- [ ] No placeholder text (e.g., "TODO")
- [ ] All affected main docs updated
- [ ] Cross-references are correct

---

## 📊 Documentation Priority

### Critical (Update Every Time)
- ✅ **07_CHANGELOG.md** - ALWAYS update
- ✅ **Session Log** - ALWAYS create
- ✅ **00_MAP.md** - Update when files/folders change

### High Priority (Update Frequently)
- ⚡ **03_API.md** - Update when endpoints change
- ⚡ **00_MAP.md** - Keep synchronized with structure

### Medium Priority (Update as Needed)
- **01_ARCHITECTURE.md** - Major architectural changes
- **02_AI-SYSTEMS.md** - New AI features
- **08_TROUBLESHOOTING.md** - New bug patterns

### Low Priority (Update Occasionally)
- **04_DEPLOYMENT.md** - Deployment config changes
- **05_SECURITY.md** - Security features
- **06_DEVELOPMENT.md** - Dev tool changes

---

## 🔍 Best Practices

### DO ✅
- ✅ Update docs immediately after changes
- ✅ Use consistent formatting
- ✅ Include code examples where helpful
- ✅ Cross-reference related documentation
- ✅ Keep language clear and concise
- ✅ Create session logs every time
- ✅ Reserve time for documentation before ending
- ✅ Verify links work
- ✅ Keep CHANGELOG current

### DON'T ❌
- ❌ Defer documentation updates to later
- ❌ Use vague or unclear descriptions
- ❌ Skip changelog entries
- ❌ Leave broken links
- ❌ Use inconsistent formatting
- ❌ Document only in code comments
- ❌ Skip session logs
- ❌ Rush documentation at the last minute
- ❌ Leave placeholder text (TODO, TBD, etc.)

---

## 🚀 Quick Reference Commands

```bash
# Before ending session (MOST IMPORTANT)
npm run docs:session-end

# Quick changelog entry
npm run docs:changelog

# Interactive documentation update
npm run docs:update

# Check documentation status
npm run docs:check

# Validate all documentation
npm run docs:validate
```

---

## 📞 Help & Support

### Documentation Resources

1. **This Guide**: Complete documentation system overview
2. **[scripts/documentation/README.md](scripts/documentation/README.md)**: Script documentation
3. **[docs/DOCUMENTATION_UPDATE_GUIDE.md](docs/DOCUMENTATION_UPDATE_GUIDE.md)**: Detailed update guide
4. **[README.md](README.md)**: Main project README (see Documentation System section)

### Getting Help

If unsure about documentation:
1. Check this guide
2. Review existing docs for patterns
3. Look at previous session logs for examples
4. Ask the project lead
5. Default to over-documentation rather than under-documentation

---

## 🎓 Examples

### Example 1: Adding a New API Endpoint

**Changes Made**:
- Created `backend/api/rest/v1/routes/analytics.ts`
- Created `backend/api/rest/v1/controllers/analytics-controller.ts`

**Documentation Updates Required**:
1. ✅ `00_MAP.md` - Add new files
2. ✅ `03_API.md` - Document new endpoint
3. ✅ `07_CHANGELOG.md` - Add entry under "Added"
4. ✅ Session log - List files created

### Example 2: Refactoring AI Model

**Changes Made**:
- Modified `ai/ml/lead-scoring/models/gradient-boost.py`
- Updated `ai/ml/lead-scoring/training/train.py`
- Changed configuration in `config/ai/models.json`

**Documentation Updates Required**:
1. ✅ `02_AI-SYSTEMS.md` - Update model documentation
2. ✅ `07_CHANGELOG.md` - Add entry under "Changed"
3. ✅ Session log - List files modified

### Example 3: Fixing Security Vulnerability

**Changes Made**:
- Fixed SQL injection in `backend/core/contacts/repositories/contact-repository.ts`
- Updated tests in `tests/security/sql-injection.test.ts`

**Documentation Updates Required**:
1. ✅ `05_SECURITY.md` - Note vulnerability fixed
2. ✅ `07_CHANGELOG.md` - Add entry under "Security"
3. ✅ `08_TROUBLESHOOTING.md` - Add prevention guidance
4. ✅ Session log - Document the fix

---

## 📈 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-05 | Initial documentation system guide |

---

## ✅ Final Checklist for AI Assistants

Before ending **ANY** Claude Code session:

- [ ] Time reserved (5-10 minutes) for documentation
- [ ] Session log created in `logs/session-logs/`
- [ ] Session log completely filled out
- [ ] `07_CHANGELOG.md` updated with session entry
- [ ] `00_MAP.md` updated if files/folders changed
- [ ] Other main docs updated as needed
- [ ] All new features documented
- [ ] All API changes documented
- [ ] Links verified
- [ ] Formatting checked
- [ ] No TODOs or placeholders left

**Remember**: Documentation is NOT optional. It's a critical part of every session.

---

<div align="center">

**ClientForge CRM v3.0**

*Built with ❤️ by Abstract Creatives LLC*

**Good documentation = Good code**

</div>
