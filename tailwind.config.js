/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Liquid Glass da Apple
        primary: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',   // Ouro/Âmbar primário
          600: '#FFB300',
          700: '#FFA000',
          800: '#FF8F00',
          900: '#F57F17',
          DEFAULT: '#FFC107',
          light: '#FFF8E1',
        },
        // Paleta neutra melhorada para Liquid Glass
        neutral: {
          0: '#FFFFFF',
          50: '#F9FAFB',
          100: '#F3F4F6',
          150: '#ECECF1',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          850: '#18202F',
          900: '#111827',
          950: '#030712',
          DEFAULT: '#F3F4F6',
        },
        // Cores semânticas
        success: { DEFAULT: '#10B981', light: '#D1FAE5' },
        danger:  { DEFAULT: '#EF4444', light: '#FEE2E2' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        info:    { DEFAULT: '#3B82F6', light: '#DBEAFE' },

        // Cores de vidro
        glass: {
          light: 'rgba(255, 255, 255, 0.10)',
          lighter: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-light': 'rgba(255, 255, 255, 0.10)',
        },
      },
      fontFamily: {
        // Apple SF Pro (fallback para Inter)
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Inter', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Bordas discretas — 10 a 12px (círculos reais usam "full")
        none: '0',
        sm: '8px',
        DEFAULT: '10px',
        md: '10px',
        lg: '10px',
        xl: '12px',
        '2xl': '12px',
        '3xl': '12px',
        '4xl': '12px',
        full: '9999px',
      },
      backdropFilter: {
        none: 'none',
        sm: 'blur(12px)',
        md: 'blur(30px)',
        lg: 'blur(40px)',
        xl: 'blur(50px)',
        '2xl': 'blur(60px)',
      },
      backdropBlur: {
        xs: '4px',
        sm: '12px',
        md: '30px',
        lg: '40px',
        xl: '50px',
        '2xl': '60px',
      },
      boxShadow: {
        // Sombras suaves Liquid Glass
        none: 'none',
        sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
        md: '0 8px 20px rgba(0, 0, 0, 0.10)',
        lg: '0 12px 32px rgba(0, 0, 0, 0.12)',
        xl: '0 20px 60px rgba(0, 0, 0, 0.15)',
        '2xl': '0 25px 80px rgba(0, 0, 0, 0.18)',
        glow: '0 0 30px rgba(255, 193, 7, 0.20)',
        'glow-primary': '0 0 40px rgba(255, 193, 7, 0.15)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.02) 100%)',
        'glass-gradient-dark': 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slideUp 300ms cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0.25, 1, 0.5, 1)',
        'glass-shimmer': 'glassShimmer 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glassShimmer: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'glass': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        250: '250ms',
        300: '300ms',
      },
    },
  },
  plugins: [animate],
}
