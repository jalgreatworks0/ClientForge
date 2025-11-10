#!/bin/bash

# ClientForge Login Page - Quick Setup Script
# This script sets up a complete React + TypeScript + Tailwind CSS project

echo "🚀 ClientForge CRM Login Page - Quick Setup"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js detected: $(node --version)"
echo "✓ npm detected: $(npm --version)"
echo ""

# Prompt for project name
read -p "Enter project name (default: clientforge-login): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-clientforge-login}

echo ""
echo "📦 Creating project with Vite..."
npm create vite@latest "$PROJECT_NAME" -- --template react-ts

# Navigate to project directory
cd "$PROJECT_NAME" || exit

echo ""
echo "📚 Installing dependencies..."
npm install

echo ""
echo "🎨 Installing UI dependencies..."
npm install react-hook-form zod @hookform/resolvers lucide-react

echo ""
echo "💅 Installing Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

echo ""
echo "📝 Setting up files..."

# Create components directory
mkdir -p src/components

# Create Tailwind config
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Update index.css
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 30px white inset !important;
}
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📁 Project location: $(pwd)"
echo ""
echo "🎯 Next steps:"
echo "   1. Copy LoginPage.tsx to src/components/"
echo "   2. Update src/App.tsx to import and use LoginPage"
echo "   3. Run: npm run dev"
echo "   4. Open: http://localhost:5173"
echo ""
echo "📖 See SETUP_GUIDE.md for detailed instructions"
echo ""
echo "Happy coding! 🎉"
