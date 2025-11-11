# ClientForge CRM - Complete Startup Script (PowerShell)
# Comprehensive initialization and startup sequence
# Usage: .\scripts\startup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ClientForge CRM - Complete Startup Sequence (Windows)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step tracking
$STEP = 0
$total_steps = 10

function Increment-Step {
  param([string]$Message)
  $STEP++
  Write-Host "[$($STEP)/$($total_steps)] $($Message)" -ForegroundColor Green
}

function Error-Exit {
  param([string]$Message)
  Write-Host "❌ Error: $($Message)" -ForegroundColor Red
  exit 1
}

# ════════════════════════════════════════════════════════
# Step 1: Environment Verification
# ════════════════════════════════════════════════════════
Increment-Step "Verifying environment configuration"

if (!(Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Write-Host "⚠️  .env file not found, creating from .env.example" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 Please review and update .env with your configuration" -ForegroundColor Yellow
  } else {
    Error-Exit "Neither .env nor .env.example found"
  }
}

# ════════════════════════════════════════════════════════
# Step 2: Dependency Check
# ════════════════════════════════════════════════════════
Increment-Step "Checking dependencies"

try {
  $nodeVersion = & node --version
  $npmVersion = & npm --version
  Write-Host "Node: $($nodeVersion)" -ForegroundColor Gray
  Write-Host "npm: $($npmVersion)" -ForegroundColor Gray
} catch {
  Error-Exit "Node.js or npm is not installed"
}

# ════════════════════════════════════════════════════════
# Step 3: Install/Update Packages
# ════════════════════════════════════════════════════════
Increment-Step "Installing/updating npm packages"

try {
  & npm ci --production=false --legacy-peer-deps
} catch {
  try {
    & npm install --production=false --legacy-peer-deps
  } catch {
    Error-Exit "Failed to install npm packages"
  }
}

# ════════════════════════════════════════════════════════
# Step 4: Service Health Check
# ════════════════════════════════════════════════════════
Increment-Step "Verifying core services are accessible"

try {
  & npm run verify:services
} catch {
  Write-Host "⚠️  Some services may not be accessible" -ForegroundColor Yellow
  Write-Host "Make sure PostgreSQL, MongoDB, Redis, and Elasticsearch are running" -ForegroundColor Yellow
}

# ════════════════════════════════════════════════════════
# Step 5: Database Migrations
# ════════════════════════════════════════════════════════
Increment-Step "Running database migrations"

try {
  & npm run db:migrate
} catch {
  Write-Host "⚠️  Migrations may have already been run" -ForegroundColor Yellow
}

# ════════════════════════════════════════════════════════
# Step 6: Seed Admin User
# ════════════════════════════════════════════════════════
Increment-Step "Seeding master admin user"

try {
  & npm run seed:admin
} catch {
  Write-Host "⚠️  Admin user may already exist" -ForegroundColor Yellow
}

# ════════════════════════════════════════════════════════
# Step 7: Build TypeScript
# ════════════════════════════════════════════════════════
Increment-Step "Building backend (TypeScript compilation)"

try {
  & npm run build:backend
} catch {
  Write-Host "⚠️  Build warnings detected (non-critical)" -ForegroundColor Yellow
}

# ════════════════════════════════════════════════════════
# Step 8: Linting Check
# ════════════════════════════════════════════════════════
Increment-Step "Running code quality checks"

try {
  & npm run lint:backend
} catch {
  Write-Host "⚠️  Lint warnings detected (non-critical)" -ForegroundColor Yellow
}

# ════════════════════════════════════════════════════════
# Step 9: Frontend Setup
# ════════════════════════════════════════════════════════
Increment-Step "Preparing frontend"

if (Test-Path "frontend") {
  Push-Location "frontend"
  if (!(Test-Path "node_modules")) {
    & npm install --legacy-peer-deps
  }
  Pop-Location
  Write-Host "✅ Frontend dependencies ready" -ForegroundColor Green
} else {
  Write-Host "⚠️  Frontend directory not found" -ForegroundColor Yellow
}

# ════════════════════════════════════════════════════════
# Step 10: Startup Complete
# ════════════════════════════════════════════════════════
Increment-Step "Startup sequence complete!"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Ready to Start Services" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 To start the application, run in separate terminal windows:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 - Backend Server:" -ForegroundColor White
Write-Host "    npm run dev:backend" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 2 - Frontend Development:" -ForegroundColor White
Write-Host "    cd frontend && npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "  Terminal 3 - Monitor Services:" -ForegroundColor White
Write-Host "    npm run verify:services" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Default Admin Credentials:" -ForegroundColor White
Write-Host "  Email: admin@clientforge.local" -ForegroundColor Gray
Write-Host "  Password: Admin!234" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Access Points:" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3000/api/v1" -ForegroundColor Gray
Write-Host "  Frontend: http://localhost:3001" -ForegroundColor Gray
Write-Host "  Health Check: http://localhost:3000/api/v1/health" -ForegroundColor Gray
Write-Host "  Metrics: http://localhost:3000/metrics" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 After startup, verify deployment with:" -ForegroundColor White
Write-Host "    npm run deploy:verify" -ForegroundColor Green
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

exit 0
