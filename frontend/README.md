# ClientForge CRM - Frontend

Modern React-based frontend application with TypeScript and Vite.

## 📋 Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Routing](#routing)
- [Styling](#styling)
- [Build & Deployment](#build--deployment)
- [Testing](#testing)

---

## 🛠️ Technology Stack

### Core
- **React 18.2** - UI framework
- **TypeScript 5.3** - Type safety
- **Vite 4.5** - Build tool and dev server

### UI & Styling
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible UI components
- **Heroicons** - Beautiful hand-crafted SVG icons

### State & Data
- **React Query / TanStack Query** - Server state management (if used)
- **Context API** - Global state management
- **Axios** - HTTP client for API calls

### Routing
- **React Router v6** - Client-side routing

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation

---

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── favicon.ico
│   └── index.html
│
├── src/
│   ├── assets/            # Images, fonts, icons
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── components/        # Reusable UI components
│   │   ├── common/       # Shared components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Table.tsx
│   │   ├── layout/       # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── [feature]/    # Feature-specific components
│   │       ├── ContactCard.tsx
│   │       ├── DealPipeline.tsx
│   │       └── TaskList.tsx
│   │
│   ├── pages/            # Page components (route views)
│   │   ├── Dashboard.tsx
│   │   ├── Contacts/
│   │   │   ├── ContactList.tsx
│   │   │   ├── ContactDetail.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── Deals/
│   │   │   ├── DealList.tsx
│   │   │   ├── DealDetail.tsx
│   │   │   └── DealForm.tsx
│   │   ├── Tasks/
│   │   └── Settings/
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useContacts.ts
│   │   └── useApi.ts
│   │
│   ├── contexts/         # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── TenantContext.tsx
│   │
│   ├── services/         # API service layer
│   │   ├── api.ts       # Axios instance
│   │   ├── auth.service.ts
│   │   ├── contact.service.ts
│   │   └── deal.service.ts
│   │
│   ├── types/            # TypeScript type definitions
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── index.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── styles/           # Global styles
│   │   ├── index.css    # Tailwind imports
│   │   └── custom.css   # Custom styles
│   │
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Application entry
│   └── vite-env.d.ts     # Vite type declarations
│
├── .env.example          # Environment variables template
├── .env                  # Local environment (gitignored)
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration (app)
├── tsconfig.node.json    # TypeScript configuration (build)
├── vite.config.ts        # Vite configuration
└── README.md             # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Backend API running on `http://localhost:3000`

### Installation

1. **Install Dependencies**:
```bash
cd frontend
npm install
```

2. **Configure Environment**:
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
```

3. **Start Development Server**:
```bash
npm run dev
```

Application runs on `http://localhost:5173` (default Vite port)

---

## 💻 Development Guide

### Development Server

```bash
npm run dev
```

Features:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- TypeScript type checking
- Instant updates on file save

### Code Formatting

```bash
# Format code with Prettier
npm run format

# Lint TypeScript
npm run lint

# Fix linting issues
npm run lint:fix
```

### Type Checking

```bash
# Run TypeScript compiler (no emit)
npm run typecheck
```

---

## 🧩 Component Architecture

### Component Structure

```tsx
// src/components/contacts/ContactCard.tsx
import { FC } from 'react';
import { Contact } from '@/types/models';

interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: number) => void;
}

export const ContactCard: FC<ContactCardProps> = ({
  contact,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold">
        {contact.firstName} {contact.lastName}
      </h3>
      <p className="text-gray-600">{contact.email}</p>

      <div className="mt-4 flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(contact)}
            className="btn-primary"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(contact.id)}
            className="btn-danger"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
```

### Component Best Practices

1. **Functional Components**: Use function components with hooks
2. **TypeScript**: Always type props and state
3. **Props Interface**: Define props interface above component
4. **Composition**: Break down into smaller, reusable components
5. **Naming**: Use PascalCase for components, camelCase for functions
6. **Exports**: Use named exports for components

---

## 🔄 State Management

### Context API

Used for global application state:

```tsx
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, FC, ReactNode } from 'react';
import { User } from '@/types/models';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Login logic
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Custom Hooks

Encapsulate reusable logic:

```tsx
// src/hooks/useContacts.ts
import { useState, useEffect } from 'react';
import { contactService } from '@/services/contact.service';
import { Contact } from '@/types/models';

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const data = await contactService.getAll();
        setContacts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  return { contacts, loading, error };
};
```

---

## 🗺️ Routing

### React Router Setup

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '@/pages/Dashboard';
import { ContactList } from '@/pages/Contacts/ContactList';
import { DealList } from '@/pages/Deals/DealList';
import { Login } from '@/pages/Auth/Login';
import { PrivateRoute } from '@/components/auth/PrivateRoute';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Private routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<ContactList />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/deals" element={<DealList />} />
          <Route path="/deals/:id" element={<DealDetail />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
```

### Protected Routes

```tsx
// src/components/auth/PrivateRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const PrivateRoute = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

---

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework for rapid UI development:

```tsx
// Example component with Tailwind
export const Button = ({ children, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
};
```

### Tailwind Configuration

```js
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
```

### Custom Styles

```css
/* src/styles/custom.css */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}
```

---

## 📦 Build & Deployment

### Production Build

```bash
# Build for production
npm run build

# Output in dist/ directory
```

Build includes:
- TypeScript compilation
- Code minification
- Asset optimization
- Tree shaking
- Code splitting

### Preview Production Build

```bash
npm run preview
```

### Environment-Specific Builds

```bash
# Development
VITE_API_URL=http://localhost:3000/api/v1 npm run build

# Staging
VITE_API_URL=https://staging-api.example.com/api/v1 npm run build

# Production
VITE_API_URL=https://api.example.com/api/v1 npm run build
```

### Docker Deployment

```bash
# Build Docker image
docker build -t clientforge-frontend .

# Run container
docker run -p 80:80 clientforge-frontend
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/              # Component unit tests
│   └── components/
├── integration/       # Integration tests
│   └── pages/
└── e2e/              # End-to-end tests (Playwright)
    └── scenarios/
```

### Running Tests

```bash
# Unit tests (if configured)
npm test

# E2E tests with Playwright
npm run test:e2e

# E2E tests in headed mode
npm run test:e2e:headed
```

### Writing Component Tests

```tsx
// Example with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactCard } from '@/components/contacts/ContactCard';

describe('ContactCard', () => {
  const mockContact = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  it('renders contact information', () => {
    render(<ContactCard contact={mockContact} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<ContactCard contact={mockContact} onEdit={onEdit} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockContact);
  });
});
```

---

## 🔌 API Integration

### API Service Layer

```tsx
// src/services/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Service Example

```tsx
// src/services/contact.service.ts
import { api } from './api';
import { Contact } from '@/types/models';

export const contactService = {
  async getAll(): Promise<Contact[]> {
    const response = await api.get('/contacts');
    return response.data;
  },

  async getById(id: number): Promise<Contact> {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
  },

  async create(contact: Partial<Contact>): Promise<Contact> {
    const response = await api.post('/contacts', contact);
    return response.data;
  },

  async update(id: number, contact: Partial<Contact>): Promise<Contact> {
    const response = await api.put(`/contacts/${id}`, contact);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/contacts/${id}`);
  },
};
```

---

## 📚 Additional Resources

- [Main README](../README.md) - Project overview
- [Backend README](../backend/README.md) - Backend documentation
- [Vite Documentation](https://vitejs.dev/) - Build tool docs
- [React Documentation](https://react.dev/) - React guides
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

---

## 🤝 Contributing

1. Follow React best practices
2. Use TypeScript for type safety
3. Follow component naming conventions
4. Write clean, readable code
5. Use Tailwind CSS for styling
6. Test components before committing

```bash
# Format and lint before committing
npm run format
npm run lint
```

---

## 📝 License

Copyright © 2025 ClientForge CRM. All rights reserved.
