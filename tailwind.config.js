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
        // Paleta neutra — tons frios discretos (slate), sem preto/branco absolutos
        neutral: {
          0: '#FFFFFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          150: '#ECF1F6',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          850: '#172033',
          900: '#0F172A',
          950: '#020617',
          DEFAULT: '#F1F5F9',
        },
        // Cores semânticas
        success: { DEFAULT: '#16A34A', light: '#D1FAE5' },
        danger:  { DEFAULT: '#DC2626', light: '#FEE2E2' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        info:    { DEFAULT: '#2563EB', light: '#DBEAFE' },

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
        // Somente 4 valores, por design (ver design system) — círculos reais usam "full"
        none: '0',
        sm: '6px',
        DEFAULT: '10px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '20px',
        '3xl': '20px',
        '4xl': '20px',
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
        // Sombras quase imperceptíveis — nunca sombras pesadas
        none: 'none',
        sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
        md: '0 4px 12px rgba(0, 0, 0, 0.05)',
        lg: '0 10px 30px rgba(0, 0, 0, 0.06)',
        xl: '0 10px 30px rgba(0, 0, 0, 0.06)',
        '2xl': '0 10px 30px rgba(0, 0, 0, 0.06)',
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
        120: '120ms',
        180: '180ms',
        240: '240ms',
        320: '320ms',
      },
      fontSize: {
        display: ['48px', { lineHeight: '1.1', fontWeight: '600' }],
        'heading-xl': ['36px', { lineHeight: '1.15', fontWeight: '600' }],
        'heading-l': ['30px', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-m': ['24px', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-s': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        small: ['14px', { lineHeight: '1.4' }],
        caption: ['12px', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [animate],
}
