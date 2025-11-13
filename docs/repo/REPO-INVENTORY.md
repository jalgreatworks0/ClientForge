# ClientForge-CRM Repository Inventory

**Date**: 2025-11-13
**Purpose**: Classification of all top-level items in the repository for production-ready surface hardening

## Directory Classification

| Name | Category | Action | Size | Notes |
|------|----------|--------|------|-------|
| `backend/` | CORE_APP | **KEEP** | - | Main Node/TS API, services, domain logic |
| `frontend/` | CORE_APP | **KEEP** | - | Frontend application (apps/web structure) |
| `packages/` | CORE_APP | **KEEP** | - | Shared libraries, domain modules |
| `tests/` | TESTS | **KEEP** | - | Unit, integration, fortress suites (TM-7 through TM-15) |
| `config/` | CORE_APP | **KEEP** | - | Application configuration (app, database, security) |
| `database/` | INFRA | **KEEP** | - | Database schemas and migration files |
| `deployment/` | INFRA | **KEEP** | - | Docker configurations |
| `.github/` | INFRA | **KEEP** | - | CI/CD workflows |
| `docs/` | DOCS | **KEEP** | - | Architecture, testing, development docs |
| `scripts/` | DX | **KEEP** | - | Helper scripts (build, migration, monitoring) |
| `agents/` | LEGACY | **ARCHIVE** | 217MB | Agent control plane experiments - not part of main app |
| `logs/` | LEGACY_OR_JUNK | **REMOVE** | 3.1MB | Local development logs - should not be in repo |
| `input/` | LEGACY_OR_JUNK | **REMOVE** | 916KB | Development input files, screenshots - local only |
| `archive/` | LEGACY_OR_JUNK | **REMOVE** | 128KB | Already archived content - redundant |
| `.backups/` | LEGACY_OR_JUNK | **REMOVE** | 0 | Empty backup directory |
| `_backup/` | LEGACY_OR_JUNK | **REMOVE** | 0 | Empty backup directory |
| `ai/` | LEGACY_OR_JUNK | **REMOVE** | 0 | Empty AI directory |
| `storage/` | LEGACY_OR_JUNK | **REMOVE** | 0 | Runtime storage - should not be in repo |
| `dist/` | LEGACY_OR_JUNK | **REMOVE** | - | Build output - should be gitignored |
| `coverage/` | LEGACY_OR_JUNK | **REMOVE** | - | Test coverage reports - should be gitignored |
| `node_modules/` | LEGACY_OR_JUNK | **VERIFY GITIGNORE** | - | Dependencies - must be gitignored |

## Root-Level Files Classification

### KEEP (Core Infrastructure)
| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | Dependencies, scripts | Core |
| `tsconfig.json` | TypeScript config | Core |
| `.eslintrc.json` | ESLint config | Core |
| `.prettierrc` | Prettier config | Core |
| `.gitignore` | Git ignore rules | Core |
| `.dockerignore` | Docker ignore rules | Core |
| `.editorconfig` | Editor config | Core |
| `.nvmrc` | Node version | Core |
| `.env.example` | Environment template | Core - safe to commit |
| `docker-compose.yml` | Docker setup | Core |
| `lerna.json` | Monorepo config | Core (if using Lerna) |
| `Makefile` | Build automation | Core |
| `LICENSE` | License | Core |
| `README.md` | Main documentation | Core |
| `jest.config.js` | Test config | Core |
| `babel.config.js` | Babel config | Core |

### KEEP (Developer Experience)
| File | Purpose | Notes |
|------|---------|-------|
| `start-all.bat` | One-click dev start | DX - recently fixed |
| `start-backend.bat` | Backend start | DX |
| `start-frontend.bat` | Frontend start | DX |
| `build-all.bat` | Build automation | DX |
| `install-all.bat` | Dependency install | DX |

### REMOVE (Junk/Generated/Local)
| File | Reason | Notes |
|------|--------|-------|
| `*.log` (22 files) | Local dev logs | Should be gitignored |
| `.env` | Contains secrets | Should be gitignored (keep only .env.example) |
| `.env.local` | Contains secrets | Should be gitignored |
| `.env.backup` | Old environment | Remove |
| `.env.test.backup` | Old test environment | Remove |
| `docker-compose.yml.bak` | Backup file | Remove |
| `DIRECTORY_TREE.txt` | Generated documentation | Remove or move to docs/ |
| `create_structure.ps1` | One-time setup script | Archive or remove |
| `nul` | Accidental file | Remove |
| `QUICK START COMMANDS` | Local dev file | Remove or consolidate into docs |

## Security Concerns

**⚠️ CRITICAL**: The following files contain or may contain secrets:
- `.env` - **MUST BE REMOVED FROM GIT**
- `.env.local` - **MUST BE REMOVED FROM GIT**
- `.env.backup` - **MUST BE REMOVED FROM GIT**

Action: Remove from git, ensure .gitignore blocks them, keep only `.env.example`

## Production-Ready Target Structure

```
clientforge-crm/
├── backend/              # Core API application
├── frontend/             # Core UI application
├── packages/             # Shared libraries
├── tests/                # Fortress suites + integration tests
├── config/               # App configuration
├── database/             # Schemas and migrations
├── deployment/           # Docker and infrastructure
├── docs/                 # Documentation
├── scripts/              # Helper scripts
├── .github/              # CI/CD workflows
├── .husky/               # Git hooks
├── .vscode/              # VS Code settings (optional)
├── start-all.bat         # DX: One-click start
├── start-backend.bat     # DX: Backend start
├── start-frontend.bat    # DX: Frontend start
├── build-all.bat         # DX: Build automation
├── install-all.bat       # DX: Dependency install
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── .eslintrc.json        # ESLint config
├── .gitignore            # Git ignore (updated)
├── docker-compose.yml    # Docker setup
├── LICENSE               # License
└── README.md             # Main documentation
```

## Agents Directory Analysis

The `agents/` directory (217MB) contains:
- `elaria_command_center/` - Agent control plane experiments
- `elaria-control-plane/` - Control plane implementation
- `mcp/` - MCP server experiments

**Decision**: ARCHIVE instead of DELETE
- Not part of main ClientForge app
- May have future value
- Large size (217MB)
- Move to `archive/agents-experiments/`

## Summary

### To Remove (Delete from git)
- Empty directories: `.backups/`, `_backup/`, `ai/`, `storage/`
- Local dev artifacts: `logs/`, `input/`, `archive/`
- Build outputs: `dist/`, `coverage/` (verify gitignore)
- Generated files: `node_modules/` (verify gitignore)
- Log files: All `*.log` files in root
- Backup/temp files: `.env.backup`, `.env.local`, `docker-compose.yml.bak`, `nul`
- Secret files: `.env` (keep .env.example only)

### To Archive
- `agents/` → move to `archive/agents-experiments/`

### To Update
- `.gitignore` - ensure secrets, logs, build outputs are blocked
- `README.md` - update to reflect current structure
- `docs/` - consolidate and organize

### Critical Preservation
- All fortress test suites (TM-7 through TM-15)
- Backend core application
- Frontend application
- Configuration files
- Infrastructure setup
