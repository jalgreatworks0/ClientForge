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
        glow: '0 0 30px rgba(250, 248, 245, 0.8)',
        'dark-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
        'dark-xl': '0 20px 25px rgba(0, 0, 0, 0.6)',
        'dark-glow': '0 0 30px rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'gradient-elegant': 'linear-gradient(135deg, #FDFCFB 0%, #F9F8F6 100%)',
        'gradient-warm': 'linear-gradient(135deg, #FFFEFB 0%, #FAF8F5 100%)',
        'gradient-shine': 'linear-gradient(135deg, #FFFFFF 0%, #F8F7F4 100%)',
        'gradient-dark-elegant': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
        'gradient-dark-warm': 'linear-gradient(135deg, #121212 0%, #1F1F1F 100%)',
        'gradient-dark-shine': 'linear-gradient(135deg, #1A1A1A 0%, #212121 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
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
      },
    },
  },
  plugins: [],
}
