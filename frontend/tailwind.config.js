/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light Mode - Elegant Alabaster & Cream
        alabaster: {
          50: '#FFFEFB', // Soft ivory
          100: '#FDFCFB', // Warm alabaster white (primary bg)
          200: '#FAF9F7', // Subtle accent
          300: '#F9F8F6', // Soft cream (tertiary bg)
          400: '#F5F4F1', // Gentle cream hover
          500: '#F8F7F4', // Pearl gray
          600: '#E7E5E4', // Soft border
          700: '#D6D3D1', // Visible stone border
          800: '#A8A29E', // Very light stone
          900: '#78716C', // Light stone
        },
        charcoal: {
          50: '#FAFAF9', // Almost white (dark mode text)
          100: '#F5F5F4', // Very light gray
          200: '#E5E5E5', // Light gray
          300: '#D4D4D3', // Light gray (dark mode secondary text)
          400: '#A8A8A7', // Medium gray
          500: '#737373', // Muted gray
          600: '#57534E', // Medium stone (light mode secondary)
          700: '#44403C', // Warm gray (accent secondary)
          800: '#292524', // Deep charcoal (accent primary)
          900: '#1C1917', // Warm charcoal (primary text)
        },
        // Dark Mode Backgrounds
        dark: {
          primary: '#0A0A0A', // Near black
          secondary: '#121212', // Elevated black
          tertiary: '#1A1A1A', // Card backgrounds
          hover: '#212121', // Hover state
          accent: '#161616', // Accent areas
          border: '#2A2A2A', // Subtle border
          'border-light': '#1F1F1F', // Lighter border
          'border-strong': '#404040', // Stronger border
        },
        // Elegant Accent Colors - Black/Charcoal Primary
        primary: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        cream: '#FAF8F5', // Rich cream
        ivory: '#FFFFFB', // Soft ivory
        pearl: '#F8F7F4', // Pearl gray
      },
      fontFamily: {
        sans: ['Syne', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Syne Mono', 'Roboto Mono', 'Courier New', 'monospace'],
        syne: ['Syne', 'sans-serif'],
        'syne-mono': ['Syne Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(28, 25, 23, 0.04)',
        DEFAULT: '0 2px 4px rgba(28, 25, 23, 0.06)',
        md: '0 4px 6px rgba(28, 25, 23, 0.07)',
        lg: '0 10px 15px rgba(28, 25, 23, 0.10)',
        xl: '0 20px 25px rgba(28, 25, 23, 0.12)',
        '2xl': '0 25px 50px rgba(28, 25, 23, 0.15)',
        '3xl': '0 35px 60px rgba(28, 25, 23, 0.18)',
        glow: '0 0 30px rgba(250, 248, 245, 0.8)',
        'glow-sm': '0 0 15px rgba(14, 165, 233, 0.3)',
        'glow-md': '0 0 30px rgba(14, 165, 233, 0.4)',
        'glow-lg': '0 0 45px rgba(14, 165, 233, 0.5)',
        'dark-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
        'dark-xl': '0 20px 25px rgba(0, 0, 0, 0.6)',
        'dark-2xl': '0 25px 50px rgba(0, 0, 0, 0.7)',
        'dark-glow': '0 0 30px rgba(255, 255, 255, 0.1)',
        'inner-glow': 'inset 0 0 20px rgba(14, 165, 233, 0.1)',
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.05)',
        'elegant': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 8px 40px -8px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        'gradient-elegant': 'linear-gradient(135deg, #FDFCFB 0%, #F9F8F6 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FFFEFB 0%, #FAF8F5 100%)',
        'gradient-shine': 'linear-gradient(135deg, #FFFFFF 0%, #F8F7F4 100%)',
        'gradient-dark-elegant': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
        'gradient-dark-warm': 'linear-gradient(135deg, #121212 0%, #1F1F1F 100%)',
        'gradient-dark-shine': 'linear-gradient(135deg, #1A1A1A 0%, #212121 100%)',
        'gradient-primary': 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
        'gradient-success': 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
        'gradient-warning': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        'gradient-mesh': 'radial-gradient(at 40% 20%, #0EA5E9 0px, transparent 50%), radial-gradient(at 80% 0%, #22C55E 0px, transparent 50%), radial-gradient(at 0% 50%, #F59E0B 0px, transparent 50%), radial-gradient(at 80% 50%, #EF4444 0px, transparent 50%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(14, 165, 233, 0.6)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      blur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
  ],
}
