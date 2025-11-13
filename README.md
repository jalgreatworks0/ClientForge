# ClientForge CRM

**Enterprise-grade Customer Relationship Management platform built with modern web technologies.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-85%25+-brightgreen)](https://github.com/jalgreatworks0/ClientForge)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Docker Desktop (for local development)
- Git

### Local Development Setup

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/jalgreatworks0/ClientForge.git
   cd ClientForge
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm run install-all
   # or manually:
   npm install
   cd frontend && npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your local configuration
   \`\`\`

4. **Start infrastructure services**
   \`\`\`bash
   docker-compose up -d
   # Starts: PostgreSQL, MongoDB, Redis, Elasticsearch
   \`\`\`

5. **Run the application**

   **Option A: One-click start (Windows)**
   \`\`\`bash
   start-all.bat
   \`\`\`

   **Option B: Manual start**
   \`\`\`bash
   # Terminal 1: Backend
   npm run dev:backend

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   \`\`\`

6. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Health: http://localhost:3000/api/v1/health

## 📁 Project Structure

\`\`\`
clientforge-crm/
├── backend/              # Node.js/Express API
│   ├── api/             # REST API endpoints
│   ├── core/            # Business logic & domain
│   ├── middleware/      # Express middleware
│   ├── services/        # External integrations
│   └── utils/           # Shared utilities
├── frontend/            # React application
│   ├── apps/            # Frontend applications
│   ├── packages/        # Shared UI components
│   └── src/             # Source code
├── tests/               # Test suites
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
├── config/              # Application configuration
├── database/            # Database schemas & migrations
├── deployment/          # Docker & infrastructure
├── docs/                # Documentation
└── scripts/             # Helper scripts
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run all backend tests
npm run test:backend

# Run specific test suite
npm run test:backend -- --testPathPattern=auth

# Run with coverage
npm run test:backend -- --coverage

# Type checking
npm run typecheck

# Linting
npm run lint
\`\`\`

### Test Coverage

- **Total Coverage**: 85%+ (504+ passing tests)
- **Critical Infrastructure**: 95%+
  - Auth Core (TM-7, TM-8, TM-9): 96 tests
  - TenantGuard (TM-11): 23 tests
  - RateLimiter (TM-12): 35 tests
  - InputSanitizer (TM-13): 139 tests
  - Auth Flow Integration (TM-14): 4 tests
  - HTTP Pipeline (TM-15): 13 tests

See [TEST-CONSTITUTION.md](docs/testing/TEST-CONSTITUTION.md) for testing guidelines.

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript 5.x
- **Databases**:
  - PostgreSQL (primary data)
  - MongoDB (documents)
  - Redis (caching/sessions)
  - Elasticsearch (search)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Winston (logging)

## 📖 Documentation

- [Testing Guide](docs/testing/TEST-CONSTITUTION.md) - Test organization and patterns
- [Architecture](docs/architecture/) - System design and architecture
- [API Documentation](docs/api/) - REST API reference
- [Development Guide](docs/development/) - Development workflows

## 🔧 Development Scripts

\`\`\`bash
# Install all dependencies
npm run install-all

# Start all services (one-click)
npm run dev:all

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm run test:backend

# Build for production
npm run build
\`\`\`

## 🐳 Docker Services

The \`docker-compose.yml\` provides the following services:

- **PostgreSQL** (port 5432): Main relational database
- **MongoDB** (port 27017): Document storage
- **Redis** (port 6379): Caching and sessions
- **Elasticsearch** (port 9200): Full-text search

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

- Multi-tenant isolation enforced at middleware level
- XSS/injection prevention via input sanitization
- Rate limiting on all auth endpoints
- CORS configuration for API protection
- Environment-based secrets management

## 📊 Project Status

- **Version**: 3.0.0
- **Status**: Active Development
- **Test Coverage**: 85%+
- **TypeScript Errors**: 0
- **ESLint Errors**: 0
- **Production Ready**: Backend API ✅ | Frontend 🚧

## 📞 Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/jalgreatworks0/ClientForge/issues) page.

---

**Built with ❤️ by the ClientForge Team**
