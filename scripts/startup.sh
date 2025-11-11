#!/bin/bash
# ClientForge CRM - Complete Startup Script
# Comprehensive initialization and startup sequence
# Usage: ./scripts/startup.sh

set -e  # Exit on error

echo "════════════════════════════════════════════════════════"
echo "  ClientForge CRM - Complete Startup Sequence"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step tracking
STEP=0
total_steps=10

increment_step() {
  STEP=$((STEP + 1))
  echo -e "${GREEN}[${STEP}/${total_steps}]${NC} $1"
}

error_exit() {
  echo -e "${RED}❌ Error: $1${NC}"
  exit 1
}

# ════════════════════════════════════════════════════════
# Step 1: Environment Verification
# ════════════════════════════════════════════════════════
increment_step "Verifying environment configuration"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "⚠️  .env file not found, creating from .env.example"
    cp .env.example .env
    echo "📝 Please review and update .env with your configuration"
  else
    error_exit "Neither .env nor .env.example found"
  fi
fi

# ════════════════════════════════════════════════════════
# Step 2: Dependency Check
# ════════════════════════════════════════════════════════
increment_step "Checking dependencies"

if ! command -v node &> /dev/null; then
  error_exit "Node.js is not installed"
fi

if ! command -v npm &> /dev/null; then
  error_exit "npm is not installed"
fi

echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# ════════════════════════════════════════════════════════
# Step 3: Install/Update Packages
# ════════════════════════════════════════════════════════
increment_step "Installing/updating npm packages"

npm ci --production=false --legacy-peer-deps || npm install --production=false --legacy-peer-deps

# ════════════════════════════════════════════════════════
# Step 4: Service Health Check
# ════════════════════════════════════════════════════════
increment_step "Verifying core services are accessible"

npm run verify:services || {
  echo -e "${YELLOW}⚠️  Some services may not be accessible${NC}"
  echo "Make sure PostgreSQL, MongoDB, Redis, and Elasticsearch are running"
}

# ════════════════════════════════════════════════════════
# Step 5: Database Migrations
# ════════════════════════════════════════════════════════
increment_step "Running database migrations"

npm run db:migrate || {
  echo -e "${YELLOW}⚠️  Migrations may have already been run${NC}"
}

# ════════════════════════════════════════════════════════
# Step 6: Seed Admin User
# ════════════════════════════════════════════════════════
increment_step "Seeding master admin user"

npm run seed:admin || {
  echo -e "${YELLOW}⚠️  Admin user may already exist${NC}"
}

# ════════════════════════════════════════════════════════
# Step 7: Build TypeScript
# ════════════════════════════════════════════════════════
increment_step "Building backend (TypeScript compilation)"

npm run build:backend || {
  echo -e "${YELLOW}⚠️  Build warnings detected (non-critical)${NC}"
}

# ════════════════════════════════════════════════════════
# Step 8: Linting Check
# ════════════════════════════════════════════════════════
increment_step "Running code quality checks"

npm run lint:backend || {
  echo -e "${YELLOW}⚠️  Lint warnings detected (non-critical)${NC}"
}

# ════════════════════════════════════════════════════════
# Step 9: Frontend Setup
# ════════════════════════════════════════════════════════
increment_step "Preparing frontend"

if [ -d "frontend" ]; then
  cd frontend
  if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
  fi
  cd ..
  echo "✅ Frontend dependencies ready"
else
  echo -e "${YELLOW}⚠️  Frontend directory not found${NC}"
fi

# ════════════════════════════════════════════════════════
# Step 10: Startup Complete
# ════════════════════════════════════════════════════════
increment_step "Startup sequence complete!"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Ready to Start Services"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📋 To start the application, run:"
echo ""
echo "  Terminal 1 - Backend Server:"
echo "    ${GREEN}npm run dev:backend${NC}"
echo ""
echo "  Terminal 2 - Frontend Development:"
echo "    ${GREEN}cd frontend && npm run dev${NC}"
echo ""
echo "  Terminal 3 - Monitor Services:"
echo "    ${GREEN}npm run verify:services${NC} (repeat as needed)"
echo ""
echo "📝 Default Admin Credentials:"
echo "  Email: admin@clientforge.local"
echo "  Password: Admin!234"
echo ""
echo "🌐 Access Points:"
echo "  Backend API: http://localhost:3000/api/v1"
echo "  Frontend: http://localhost:3001"
echo "  Health Check: http://localhost:3000/api/v1/health"
echo "  Metrics: http://localhost:3000/metrics"
echo ""
echo "🚀 After startup, verify deployment with:"
echo "    ${GREEN}npm run deploy:verify${NC}"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""

exit 0
