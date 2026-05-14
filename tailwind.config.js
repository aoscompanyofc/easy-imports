/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFC107',
          600: '#FFB300',
          700: '#FFA000',
          800: '#FF8F00',
          900: '#F57F17',
          DEFAULT: '#FFC107',
          light: '#FFF8E1',
        },
        secondary: {
          DEFAULT: '#8B5CF6',
          light: '#EDE9FE',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#1A1A1A',
        },
        success: { DEFAULT: '#10B981', light: '#D1FAE5' },
        danger:  { DEFAULT: '#EF4444', light: '#FEE2E2' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7' },
        info:    { DEFAULT: '#3B82F6', light: '#DBEAFE' },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        focus: '0 0 0 3px rgba(255, 193, 7, 0.25)',
      },
    },
  },
  plugins: [animate],
}
