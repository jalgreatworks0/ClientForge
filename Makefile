# ClientForge CRM Makefile

.PHONY: help
help:
	@echo "ClientForge CRM - Available Commands"
	@echo "===================================="
	@echo "Setup & Installation:"
	@echo "  make install          - Install all dependencies"
	@echo "  make setup           - Complete setup (install + db + seed)"
	@echo ""
	@echo "Development:"
	@echo "  make dev             - Start development environment"
	@echo "  make dev-frontend    - Start frontend only"
	@echo "  make dev-backend     - Start backend only"
	@echo "  make dev-ai          - Start AI services"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate      - Run database migrations"
	@echo "  make db-rollback     - Rollback last migration"
	@echo "  make db-seed         - Seed database with test data"
	@echo "  make db-reset        - Reset database"
	@echo ""
	@echo "Testing:"
	@echo "  make test            - Run all tests"
	@echo "  make test-unit       - Run unit tests"
	@echo "  make test-integration - Run integration tests"
	@echo "  make test-e2e        - Run end-to-end tests"
	@echo "  make test-ai         - Run AI model tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint            - Run linters"
	@echo "  make format          - Format code"
	@echo "  make security-scan   - Run security scan"
	@echo "  make type-check      - TypeScript type checking"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  make build           - Build for production"
	@echo "  make docker-build    - Build Docker images"
	@echo "  make deploy-dev      - Deploy to development"
	@echo "  make deploy-staging  - Deploy to staging"
	@echo "  make deploy-prod     - Deploy to production"
	@echo ""
	@echo "AI Operations:"
	@echo "  make train-models    - Train AI models"
	@echo "  make validate-models - Validate model accuracy"
	@echo "  make deploy-models   - Deploy models to production"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup          - Backup database"
	@echo "  make restore         - Restore from backup"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make logs            - View application logs"

# Setup & Installation
install:
	npm ci
	cd frontend/apps/crm-web && npm ci
	cd ai && pip install -r requirements.txt

setup: install db-migrate db-seed
	@echo "Setup complete!"

# Development
dev:
	docker-compose up -d
	npm run dev

dev-frontend:
	cd frontend/apps/crm-web && npm run dev

dev-backend:
	npm run dev:backend

dev-ai:
	cd ai && python app.py

# Database
db-migrate:
	npm run db:migrate

db-rollback:
	npm run db:rollback

db-seed:
	npm run db:seed

db-reset: db-rollback db-migrate db-seed

# Testing
test:
	npm test

test-unit:
	npm run test:unit

test-integration:
	npm run test:integration

test-e2e:
	npm run test:e2e

test-ai:
	cd ai && pytest tests/

# Code Quality
lint:
	npm run lint

format:
	npm run format

security-scan:
	npm audit
	npm run security:scan

type-check:
	npm run type-check

# Build & Deploy
build:
	npm run build

docker-build:
	docker build -f deployment/docker/production/Dockerfile.prod -t clientforge:latest .

deploy-dev:
	./scripts/deploy/deploy-dev.sh

deploy-staging:
	./scripts/deploy/deploy-staging.sh

deploy-prod:
	./scripts/deploy/deploy-production.sh

# AI Operations
train-models:
	cd ai && python training/train_all_models.py

validate-models:
	cd ai && python training/validate_models.py

deploy-models:
	cd ai && ./deploy_models.sh

# Maintenance
backup:
	./scripts/maintenance/backup.sh

restore:
	./scripts/maintenance/restore.sh

clean:
	rm -rf dist/ build/ coverage/ .parcel-cache/
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -delete

logs:
	tail -f logs/app.log
