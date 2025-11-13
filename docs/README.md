# ClientForge CRM - Documentation

This directory contains all technical and user documentation for the ClientForge CRM application.

## 📚 Documentation Structure

```
docs/
├── architecture/          # System architecture & design decisions
├── deployment/            # Deployment guides and configuration
├── development/          # Developer guides and workflows
├── errors/               # Error handling documentation & runbooks
├── fs/                   # File structure sanitation documentation
├── guides/               # User and admin guides
├── protocols/            # Team protocols and standards
├── security/             # Security policies and guidelines
└── testing/              # Testing strategy and documentation
```

## 🚫 Anti-Placeholder Policy

**IMPORTANT**: Do not create empty documentation directories as placeholders for future documentation.

### Policy (Established FS-6, 2025-11-12)

1. **Only create documentation directories when adding content**
   - ❌ Do NOT create `docs/new-feature/` before writing documentation
   - ✅ DO create `docs/new-feature/` when you start writing the first document

2. **No empty placeholder subdirectories**
   - Empty directories create repository clutter
   - They create false signals about what's documented
   - Planning for future docs should live in:
     - GitHub issues with "documentation" label
     - Project boards
     - ADR TODO sections
     - NOT in empty directory trees

3. **Documentation structure should reflect reality**
   - If a feature is documented, the directory exists
   - If documentation doesn't exist yet, neither should the directory
   - Keep directory structure aligned with actual content

### Historical Context

This policy was established after **FS-6 (2025-11-12)** when 20 empty documentation placeholder directories were removed:

**API Documentation Placeholders** (3):
- `docs/api/graphql/` - Empty GraphQL API docs placeholder
- `docs/api/rest/` - Empty REST API docs placeholder
- `docs/api/websocket/` - Empty WebSocket API docs placeholder

**Architecture Placeholders** (2):
- `docs/architecture/diagrams/` - Empty diagrams directory
- `docs/architecture/patterns/` - Empty design patterns directory

**Deployment Placeholders** (3):
- `docs/deployment/cloud/` - Empty cloud deployment guides
- `docs/deployment/local/` - Empty local setup guides
- `docs/deployment/on-premise/` - Empty on-premise guides

**Development Placeholders** (3):
- `docs/development/coding-standards/` - Empty standards directory
- `docs/development/contributing/` - Empty contribution guides
- `docs/development/troubleshooting/` - Empty troubleshooting guides

**Guides Placeholders** (4):
- `docs/guides/admin-guide/` - Empty admin documentation
- `docs/guides/ai-features/` - Empty AI features guide
- `docs/guides/developer-guide/` - Empty developer guide
- `docs/guides/user-manual/` - Empty user manual

**Module Documentation Placeholders** (4):
- `docs/modules/ai-companion/` - Empty module docs
- `docs/modules/analytics/` - Empty module docs
- `docs/modules/contacts/` - Empty module docs
- `docs/modules/deals/` - Empty module docs

**Operations Placeholders** (1):
- `docs/runbooks/` - Empty runbooks directory (entire parent removed)

**Empty Parent Directories Removed** (2):
- `docs/api/` - All subdirectories empty, parent removed
- `docs/modules/` - All subdirectories empty, parent removed

These directories were created with good intentions but resulted in:
- Repository clutter (20+ empty directories)
- Maintenance overhead
- False signals about documentation coverage
- Confusion about what's actually documented

### Enforcement

- **Code Review**: Reject PRs that add empty documentation directories
- **Documentation**: Update this README when adding new documentation categories
- **Cleanup**: Run periodic scans for empty directories and remove them
- **Planning**: Use GitHub issues, not empty directories, to track future documentation needs

## 📝 Contributing Documentation

When adding new documentation:

1. ✅ Create the directory only when you have content to add
2. ✅ Follow existing naming conventions (lowercase, hyphens for spaces)
3. ✅ Add a README.md in new directories explaining the contents
4. ✅ Update this main README if adding a new top-level category
5. ✅ Use markdown for all documentation
6. ✅ Link related documents together

## 🔗 Key Documentation

### For Users
- [Guides](./guides/) - User and admin guides
- [Security](./security/) - Security policies and best practices

### For Developers
- [Architecture](./architecture/) - System design and architecture decisions
- [Development](./development/) - Developer workflows and guidelines
- [Testing](./testing/) - Testing strategy and documentation
- [Protocols](./protocols/) - Team protocols and coding standards

### For Operations
- [Deployment](./deployment/) - Deployment guides and infrastructure
- [Errors](./errors/) - Error handling documentation and runbooks

## 📋 Documentation Standards

- **Format**: Markdown (.md files)
- **Structure**: Use H1 for title, H2 for sections, H3 for subsections
- **Links**: Use relative links for internal documentation
- **Code Blocks**: Use fenced code blocks with language identifiers
- **Images**: Store in `docs/assets/` or inline as diagrams
- **TOC**: Add table of contents for documents >500 lines

---

**Last Updated**: 2025-11-12 (FS-6 - Documentation Placeholder Removal)

**Policy Established By**: File Structure Sanitation - Phase 6
