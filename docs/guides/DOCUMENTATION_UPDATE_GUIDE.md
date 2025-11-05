# Documentation Update Guide

**For AI Assistants and Developers**

## 🎯 Purpose

This guide explains how to maintain and update ClientForge CRM documentation, ensuring consistency and completeness throughout the project lifecycle.

---

## 📚 Main Documentation Files

### Location: `docs/`

All main documentation files are **CAPITALIZED** and **NUMBERED** to appear at the top:

```
docs/
├── 00_MAP.md                       # Complete file/folder map
├── 01_ARCHITECTURE.md              # System architecture overview
├── 02_AI-SYSTEMS.md                # AI tools and systems guide
├── 03_API.md                       # API documentation summary
├── 04_DEPLOYMENT.md                # Deployment guide summary
├── 05_SECURITY.md                  # Security overview
├── 06_DEVELOPMENT.md               # Development guide
├── 07_CHANGELOG.md                 # Version history and changes
└── 08_TROUBLESHOOTING.md           # Common issues and solutions
```

---

## 🔄 When to Update Documentation

### 1. **Automatic Triggers** (MUST UPDATE)

| Trigger | Files to Update |
|---------|----------------|
| **New file/folder created** | `00_MAP.md` |
| **Architecture change** | `01_ARCHITECTURE.md`, `00_MAP.md` |
| **New AI feature** | `02_AI-SYSTEMS.md` |
| **New API endpoint** | `03_API.md` |
| **Deployment config change** | `04_DEPLOYMENT.md` |
| **Security change** | `05_SECURITY.md` |
| **New dev tool/process** | `06_DEVELOPMENT.md` |
| **Any significant change** | `07_CHANGELOG.md` |
| **New bug pattern** | `08_TROUBLESHOOTING.md` |

### 2. **End of Major Update/Upgrade**

After completing significant features:
- ✅ Update all affected main docs
- ✅ Update `07_CHANGELOG.md` with version details
- ✅ Update `00_MAP.md` if structure changed
- ✅ Add entry to relevant troubleshooting if needed

### 3. **When Creator Requests**

If developer explicitly says "update docs":
- ✅ Review all changes made in session
- ✅ Update all relevant main documentation
- ✅ Update changelog
- ✅ Update any affected sub-documentation

### 4. **Before Session End (AI Assistants)**

**CRITICAL FOR CLAUDE CODE:**

Before ending any session:
1. **Reserve 5-10 minutes** for documentation
2. Review all files created/modified
3. Update `00_MAP.md` if files/folders added
4. Update `07_CHANGELOG.md` with session summary
5. Update relevant main docs for significant changes
6. Create session log in `logs/session-logs/`

---

## 📝 How to Update Each Main Doc

### 00_MAP.md - Complete File/Folder Map

**Purpose**: Complete directory and file mapping

**Update When**:
- Any new file created
- Any new folder created
- Files renamed or moved
- Structure reorganized

**Update Process**:
```bash
# Generate current structure
tree /F /A > temp_structure.txt

# Or use PowerShell
Get-ChildItem -Recurse | Select-Object FullName > temp_structure.txt
```

**Template Section**:
```markdown
## [Module Name]

### Directory Structure
```
path/to/module/
├── file1.ts
├── file2.ts
└── subfolder/
    └── file3.ts
```

### Files
- **file1.ts**: Description
- **file2.ts**: Description
- **file3.ts**: Description
```

---

### 01_ARCHITECTURE.md - System Architecture

**Purpose**: High-level and detailed architecture overview

**Update When**:
- New service added
- New database added
- Integration pattern changes
- API structure changes
- Microservice extracted
- Major refactoring

**Include**:
- Architecture diagrams (ASCII or reference to images)
- Component descriptions
- Data flow diagrams
- Technology stack
- Design patterns used
- Scalability considerations

---

### 02_AI-SYSTEMS.md - AI Tools and Systems

**Purpose**: Complete guide to all AI features and systems

**Update When**:
- New AI model added
- New AI feature implemented
- AI service configuration changes
- New integration with AI API
- ML pipeline changes

**Include**:
- Albedo AI capabilities
- All ML models and their purposes
- AI service configurations
- API integrations (OpenAI, Anthropic, etc.)
- Training pipelines
- Model deployment process
- Performance metrics

---

### 03_API.md - API Documentation

**Purpose**: Complete API reference and usage guide

**Update When**:
- New endpoint added
- Endpoint modified
- New API version
- Authentication changes
- Rate limiting changes
- New WebSocket event

**Include**:
- REST API endpoints (all versions)
- GraphQL schema
- WebSocket events
- Authentication methods
- Request/Response examples
- Error codes
- Rate limits

---

### 04_DEPLOYMENT.md - Deployment Guide

**Purpose**: Complete deployment instructions for all environments

**Update When**:
- New deployment target added
- Infrastructure changes
- CI/CD pipeline modified
- Environment variable changes
- Docker/K8s config changes

**Include**:
- Local development setup
- Docker deployment
- Kubernetes deployment
- Cloud deployments (AWS, Azure, GCP)
- On-premise deployment
- Environment configurations
- Rollback procedures

---

### 05_SECURITY.md - Security Overview

**Purpose**: Security features, policies, and best practices

**Update When**:
- New security feature added
- Security vulnerability fixed
- Authentication method changes
- Compliance requirement added
- Security tool added
- Encryption method changes

**Include**:
- Authentication & authorization
- Encryption methods
- Security scanning tools
- Compliance status (GDPR, HIPAA, etc.)
- Security best practices
- Incident response procedures
- Vulnerability disclosure policy

---

### 06_DEVELOPMENT.md - Development Guide

**Purpose**: Developer onboarding and workflow guide

**Update When**:
- New development tool added
- Coding standards changed
- New testing framework added
- Build process changes
- New linting rules
- Git workflow changes

**Include**:
- Development environment setup
- Coding standards and conventions
- Testing guidelines
- Git workflow
- Code review process
- Available make commands
- IDE configuration
- Debugging tips

---

### 07_CHANGELOG.md - Version History

**Purpose**: Complete version history and changes

**Update When**:
- **EVERY significant change**
- End of every session
- Before every commit
- Before every release

**Format**:
```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Modified feature description

### Fixed
- Bug fix description

### Removed
- Removed feature description

### Security
- Security improvement description
```

**Keep It Current**: This is the MOST frequently updated doc!

---

### 08_TROUBLESHOOTING.md - Common Issues

**Purpose**: Solutions to common problems

**Update When**:
- New bug pattern discovered
- Common error encountered
- New solution found
- Environment issue resolved

**Format**:
```markdown
### Issue: [Description]

**Symptoms**:
- What the user sees

**Cause**:
- Why it happens

**Solution**:
```bash
# Commands to fix
```

**Prevention**:
- How to avoid in future
```

---

## 🤖 AI Assistant Update Workflow

### Before Starting Work
1. Read relevant main docs
2. Understand current state
3. Note what will change

### During Work
1. Track all files created
2. Track all files modified
3. Note architectural changes
4. Note new features/APIs

### Before Ending Session (CRITICAL)
1. **Check time** - Reserve 5-10 minutes
2. **Create session log** in `logs/session-logs/YYYY-MM-DD-task-name.md`
3. **Update 00_MAP.md** if files/folders added
4. **Update 07_CHANGELOG.md** with session summary
5. **Update other main docs** as needed
6. **Verify all docs** are consistent

### Session Log Template
```markdown
# Session Log: YYYY-MM-DD - [Task Name]

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
- [x] 07_CHANGELOG.md - Added session entry
- [ ] 01_ARCHITECTURE.md - Not needed
- [ ] 02_AI-SYSTEMS.md - Not needed
- [ ] 03_API.md - Not needed
- [ ] 04_DEPLOYMENT.md - Not needed
- [ ] 05_SECURITY.md - Not needed
- [ ] 06_DEVELOPMENT.md - Not needed
- [ ] 08_TROUBLESHOOTING.md - Not needed

## Summary
Brief summary of what was accomplished

## Next Steps
- Suggested next actions
- Unfinished work
- Known issues

## Notes
- Any important observations
- Performance considerations
- Technical debt created
```

---

## 📊 Quick Reference Table

| File | Update Frequency | Auto-Update | Priority |
|------|-----------------|-------------|----------|
| `00_MAP.md` | High | When files change | High |
| `01_ARCHITECTURE.md` | Medium | Major changes only | High |
| `02_AI-SYSTEMS.md` | Medium | AI changes only | Medium |
| `03_API.md` | High | New endpoints | High |
| `04_DEPLOYMENT.md` | Low | Config changes | Medium |
| `05_SECURITY.md` | Low | Security changes | High |
| `06_DEVELOPMENT.md` | Low | Tool changes | Medium |
| `07_CHANGELOG.md` | **Very High** | **Every session** | **Critical** |
| `08_TROUBLESHOOTING.md` | Medium | New issues | Medium |

---

## 🔍 Documentation Quality Checklist

Before ending session, verify:

- [ ] All main docs are up-to-date
- [ ] Changelog has session entry
- [ ] Map reflects current structure
- [ ] No broken internal links
- [ ] Code examples are accurate
- [ ] All new features documented
- [ ] Session log created
- [ ] Consistent formatting
- [ ] Clear, concise language
- [ ] No outdated information

---

## 🚀 Automation Scripts

### Check Documentation Status
```bash
# Verify docs are up-to-date
npm run docs:check

# Generate MAP automatically
npm run docs:generate-map

# Validate all docs
npm run docs:validate
```

### Update Documentation
```bash
# Interactive doc update
npm run docs:update

# Generate changelog entry
npm run docs:changelog

# Create session log
npm run docs:session-log
```

---

## 📋 Best Practices

### DO ✅
- Update docs immediately after changes
- Use consistent formatting
- Include code examples
- Cross-reference related docs
- Keep language clear and concise
- Use proper markdown
- Include timestamps in changelog
- Create session logs

### DON'T ❌
- Defer documentation updates
- Use vague descriptions
- Skip changelog entries
- Leave broken links
- Use inconsistent formatting
- Document in comments instead of docs
- Skip session logs
- Rush documentation at session end

---

## 🎯 Documentation Goals

1. **Complete**: All features documented
2. **Current**: Always up-to-date
3. **Clear**: Easy to understand
4. **Consistent**: Uniform formatting
5. **Accessible**: Easy to find information
6. **Maintainable**: Easy to update
7. **AI-Friendly**: Structured for AI understanding

---

## 📞 Questions?

If unsure about documentation:
1. Check this guide
2. Review existing docs for patterns
3. Ask the project lead
4. Default to over-documentation

**Remember**: Good documentation is as important as good code!

---

**Last Updated**: 2025-01-05
**Version**: 1.0.0
**Maintained By**: Abstract Creatives LLC
