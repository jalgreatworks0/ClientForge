# Elaria - ClientForge Sync Setup
# Location: D:\ClientForge\03_BOTS\elaria_command_center\setup_sync.ps1
# Purpose: Sync Elaria with ClientForge and create necessary structure

param(
    [switch]$CreateDirs = $false,
    [switch]$CreateSamples = $false
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  ELARIA <-> CLIENTFORGE SYNC SETUP" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$root = "D:\ClientForge"

# Check root exists
if (!(Test-Path $root)) {
    Write-Host "ERROR: ClientForge root not found at $root" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Checking directory structure..." -ForegroundColor Yellow

$requiredDirs = @(
    "00_CORE",
    "01_PROJECTS",
    "02_CODE",
    "03_BOTS",
    "04_MCP_SKILLS",
    "05_SHARED_AI",
    "05_SHARED_AI\context_pack",
    "05_SHARED_AI\build_logs",
    "05_SHARED_AI\directives",
    "05_SHARED_AI\reasoning_summaries",
    "06_BACKUPS",
    "_staging",
    "docs"
)

$missing = @()
foreach ($dir in $requiredDirs) {
    $path = Join-Path $root $dir
    if (Test-Path $path) {
        Write-Host "  OK $dir" -ForegroundColor Green
    } else {
        Write-Host "  MISSING $dir" -ForegroundColor Red
        $missing += $path
    }
}

if ($missing.Count -gt 0 -and $CreateDirs) {
    Write-Host ""
    Write-Host "Creating missing directories..." -ForegroundColor Yellow
    foreach ($path in $missing) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  Created: $path" -ForegroundColor Cyan
    }
}

# Check priority files
Write-Host ""
Write-Host "[2/5] Checking priority context files..." -ForegroundColor Yellow

$priorityFiles = @(
    "README.md",
    "05_SHARED_AI\context_pack\project_overview.md",
    "05_SHARED_AI\context_pack\roles_rules.md",
    "05_SHARED_AI\context_pack\current_tasks.md",
    "05_SHARED_AI\context_pack\interfaces.md",
    "docs\07_CHANGELOG.md",
    "docs\00_MAP.md"
)

$missingFiles = @()
foreach ($file in $priorityFiles) {
    $path = Join-Path $root $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "  OK $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  MISSING $file" -ForegroundColor Red
        $missingFiles += @{Path=$path; Name=$file}
    }
}

if ($missingFiles.Count -gt 0 -and $CreateSamples) {
    Write-Host ""
    Write-Host "Creating sample context files..." -ForegroundColor Yellow

    foreach ($item in $missingFiles) {
        $content = ""

        switch ($item.Name) {
            "README.md" {
                $content = @"
# ClientForge CRM

Enterprise-grade CRM platform powered by AI.

## Overview

ClientForge is a comprehensive Customer Relationship Management system designed for modern businesses.

## Key Features

- Contact & Lead Management
- Deal Pipeline Tracking
- Email Campaign Management
- Advanced Analytics & Reporting
- Custom Fields & Tags
- File Attachments
- Real-time Notifications
- Gmail/ProtonMail Integration

## Architecture

- **Backend**: Node.js + Express
- **Frontend**: React + TailwindCSS
- **Database**: SQLite3 (production-ready)
- **AI**: LM Studio + Qwen models
- **Orchestration**: Elaria Command Center

## Directory Structure

- `00_CORE/` - Core utilities and libraries
- `01_PROJECTS/` - Project-specific code
- `02_CODE/` - Main application code
- `03_BOTS/` - AI bots and agents
- `04_MCP_SKILLS/` - MCP server skills
- `05_SHARED_AI/` - Shared AI context and logs
- `06_BACKUPS/` - Automated backups
- `_staging/` - Staging area for changes
- `docs/` - Documentation

## Getting Started

1. Install dependencies: ``npm install``
2. Configure environment: Copy ``.env.example`` to ``.env``
3. Run database migrations: ``npm run migrate``
4. Start development server: ``npm run dev``

## Elaria Command Center

Elaria is the AI orchestration brain for ClientForge.

Location: ``D:\ClientForge\03_BOTS\elaria_command_center\``

Commands:
- ``CRM-INIT`` - Initialize Elaria
- ``CRM-FEATURE <name>`` - Scaffold new feature
- ``TEST`` - Run test suite
- ``AUDIT`` - Security & performance audit
- ``DEPLOY`` - Deploy to production

## License

Proprietary - ClientForge Team
"@
            }

            "05_SHARED_AI\context_pack\project_overview.md" {
                $content = @"
# ClientForge CRM - Project Overview

## Mission

Build a best-in-class CRM platform that combines enterprise features with AI-powered automation.

## Technology Stack

### Backend
- Node.js 18+
- Express.js
- SQLite3 with better-sqlite3
- JWT authentication
- bcrypt password hashing

### Frontend
- React 18
- TailwindCSS
- Custom theme system (Light/Dark)
- Responsive design

### AI & Automation
- LM Studio with Qwen models
- Elaria Command Center
- MCP protocol integration
- Local RAG system

## Key Modules

1. **Contacts** - Contact management with custom fields
2. **Leads** - Lead tracking and scoring
3. **Deals** - Deal pipeline with stages
4. **Campaigns** - Email campaign management
5. **Reports** - Custom reporting engine
6. **Notifications** - Real-time notification system

## Development Workflow

1. Stage changes to ``_staging/``
2. Run tests: ``npm test``
3. Run validation: ``gate_ci.ps1``
4. Promote to production
5. Document in CHANGELOG

## Performance Goals

- API response: <200ms p50
- First Contentful Paint: <1.5s
- Bundle size: <200KB gzipped
- Test coverage: >85% (>95% for auth/payment)
"@
            }

            "05_SHARED_AI\context_pack\roles_rules.md" {
                $content = @"
# ClientForge CRM - Roles & Rules

## Elaria's Role

- Command center and orchestration brain
- Makes architectural decisions
- Enforces safety protocols
- Maintains code quality

## Development Rules

### Code Safety
1. Never mutate code without plan + backup + tests
2. Always stage changes to ``_staging/`` first
3. Always run validation before promotion
4. Never write secrets to repository

### Testing Requirements
- Unit tests: All services and utilities
- Integration tests: API endpoints
- E2E tests: Critical user flows
- Minimum coverage: 85% (95% for auth/payment)

### Code Style
- Use TypeScript for type safety
- Follow conventional commits
- Document all public APIs
- Use meaningful variable names

### Database Conventions
- snake_case for tables/columns
- Standard timestamps: created_at, updated_at
- Foreign keys: <table>_id format
- Always use migrations for schema changes

### API Conventions
- RESTful endpoints: /api/v1/...
- Use proper HTTP methods
- Return consistent error format
- Include pagination for lists

## Escalation Rules

Escalate to human developer when:
- Complexity ≥ 8/10
- Cross-module architecture changes
- Two consecutive CI failures
- Security-sensitive changes
"@
            }

            "05_SHARED_AI\context_pack\current_tasks.md" {
                $content = @"
# ClientForge CRM - Current Tasks

## In Progress

None currently

## Planned

None currently

## Backlog

- Feature: Advanced search with filters
- Feature: Email template builder
- Feature: Custom dashboards
- Enhancement: Performance optimization
- Enhancement: Mobile responsive improvements

## Completed

- Initial project setup
- Elaria Command Center integration
- LM Studio SDK integration
- MCP protocol setup

---

Last updated: $(Get-Date -Format "yyyy-MM-dd HH:mm")
"@
            }

            "05_SHARED_AI\context_pack\interfaces.md" {
                $content = @"
# ClientForge CRM - Interfaces & Contracts

## Elaria Command Interface

### CRM-INIT
Initialize Elaria with full context.

### CRM-FEATURE <name>
Scaffold a new feature with:
- Service layer
- API routes
- Frontend components
- Unit tests

### CRM-MODULE <name>
Create full-stack module with:
- Database migration
- Backend service + routes
- Frontend UI components
- Complete test suite

### TEST
Run test suite:
- Unit tests
- Integration tests
- Coverage report

### AUDIT
Run security and performance audit:
- OWASP top 10 check
- Dependency vulnerabilities
- Performance gate validation

### DEPLOY [branch]
Deploy to production:
- Run full test suite
- Build production assets
- Deploy to Render
- Run smoke tests

### DOCS
Update documentation:
- Session log
- CHANGELOG
- MAP
- API documentation

### SPEC <goal>
Generate TaskSpec for a feature:
- Requirements analysis
- Acceptance criteria
- Implementation plan
- Test strategy

## MCP Server Interfaces

### Filesystem
- read_file
- write_file
- list_directory
- search_files

### Process
- execute_command

### HTTP
- get
- post
- put
- delete

## API Response Format

\`\`\`json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
\`\`\`
"@
            }

            "docs\07_CHANGELOG.md" {
                $content = @"
# ClientForge CRM - Changelog

## [Unreleased]

### Added
- Elaria Command Center with LM Studio integration
- MCP protocol support
- TypeScript SDK for Elaria
- Automated testing and validation

### Changed
- None

### Fixed
- None

---

## [1.0.0] - $(Get-Date -Format "yyyy-MM-dd")

### Added
- Initial ClientForge CRM setup
- Core directory structure
- Documentation framework

---

Format based on [Keep a Changelog](https://keepachangelog.com/)
"@
            }

            "docs\00_MAP.md" {
                $content = @"
# ClientForge CRM - Project Map

## Directory Structure

\`\`\`
D:\ClientForge\
├── 00_CORE/              # Core utilities
├── 01_PROJECTS/          # Project-specific code
├── 02_CODE/              # Main application
│   ├── backend/          # Node.js backend
│   ├── frontend/         # React frontend
│   ├── database/         # Database & migrations
│   ├── tests/            # Test suites
│   └── docs/             # Documentation
├── 03_BOTS/              # AI bots
│   └── elaria_command_center/  # Elaria
├── 04_MCP_SKILLS/        # MCP skills
├── 05_SHARED_AI/         # AI context
│   ├── context_pack/     # Priority context files
│   ├── build_logs/       # Session logs
│   ├── directives/       # AI directives
│   └── reasoning_summaries/
├── 06_BACKUPS/           # Automated backups
├── _staging/             # Staging area
└── docs/                 # Root documentation
\`\`\`

## Key Files

- ``README.md`` - Project overview
- ``.env`` - Environment configuration
- ``package.json`` - Node.js dependencies
- ``docs/07_CHANGELOG.md`` - Change log
- ``docs/00_MAP.md`` - This file

## Elaria Command Center

Location: ``03_BOTS/elaria_command_center/``

Key files:
- ``src/elaria.js`` - Main service
- ``src/init-elaria.js`` - Initialization
- ``src/config.js`` - Configuration
- ``package.json`` - Dependencies
- ``README.md`` - Elaria documentation

## Workflow

1. Changes staged to ``_staging/``
2. Validation with ``gate_ci.ps1``
3. Tests run automatically
4. Promotion to ``02_CODE/``
5. Documentation updated
6. Backup created

---

Last updated: $(Get-Date -Format "yyyy-MM-dd HH:mm")
"@
            }
        }

        # Create parent directory if needed
        $parent = Split-Path $item.Path
        if (!(Test-Path $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }

        # Write file
        Set-Content -Path $item.Path -Value $content -Encoding UTF8
        Write-Host "  Created: $($item.Name)" -ForegroundColor Cyan
    }
}

# Check LM Studio configuration
Write-Host ""
Write-Host "[3/5] Checking LM Studio..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  OK - LM Studio is running" -ForegroundColor Green
    Write-Host "  Models loaded: $($response.data.Count)" -ForegroundColor Gray

    # Check for Qwen model
    $qwenModels = $response.data | Where-Object { $_.id -like "*qwen*" }
    if ($qwenModels.Count -gt 0) {
        Write-Host "  OK - Qwen models available:" -ForegroundColor Green
        $qwenModels | ForEach-Object {
            Write-Host "    - $($_.id)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  WARNING - No Qwen models found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR - LM Studio not responding" -ForegroundColor Red
}

# Check Node.js setup
Write-Host ""
Write-Host "[4/5] Checking Node.js setup..." -ForegroundColor Yellow

$elariaDir = Join-Path $root "03_BOTS\elaria_command_center"
if (Test-Path (Join-Path $elariaDir "node_modules")) {
    Write-Host "  OK - npm packages installed" -ForegroundColor Green
} else {
    Write-Host "  WARNING - npm packages not installed" -ForegroundColor Yellow
    Write-Host "  Run: cd $elariaDir && npm install" -ForegroundColor Gray
}

# Create .env file
Write-Host ""
Write-Host "[5/5] Checking .env configuration..." -ForegroundColor Yellow

$envPath = Join-Path $elariaDir ".env"
$envExamplePath = Join-Path $elariaDir ".env.example"

if (!(Test-Path $envPath) -and (Test-Path $envExamplePath)) {
    Write-Host "  Creating .env from example..." -ForegroundColor Cyan
    Copy-Item $envExamplePath $envPath

    # Update model name to qwen3-30b-a3b
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace "qwen2.5-30b-a3b", "qwen3-30b-a3b"
    Set-Content -Path $envPath -Value $envContent -NoNewline

    Write-Host "  Created .env (please review settings)" -ForegroundColor Green
} elseif (Test-Path $envPath) {
    Write-Host "  OK - .env exists" -ForegroundColor Green
} else {
    Write-Host "  WARNING - .env not found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  SYNC SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

if ($missingFiles.Count -gt 0 -and -not $CreateSamples) {
    Write-Host "Missing files detected. Run with -CreateSamples to create them:" -ForegroundColor Yellow
    Write-Host "  .\setup_sync.ps1 -CreateSamples" -ForegroundColor White
    Write-Host ""
}

if ($missing.Count -gt 0 -and -not $CreateDirs) {
    Write-Host "Missing directories detected. Run with -CreateDirs to create them:" -ForegroundColor Yellow
    Write-Host "  .\setup_sync.ps1 -CreateDirs" -ForegroundColor White
    Write-Host ""
}

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review .env configuration" -ForegroundColor White
Write-Host "  2. Run: npm run init" -ForegroundColor White
Write-Host "  3. Run: npm start" -ForegroundColor White
Write-Host ""
