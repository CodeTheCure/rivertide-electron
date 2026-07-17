/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf5f3',
          100: '#d1e8e2',
          200: '#a3d1c5',
          300: '#6cb9a8',
          400: '#35a28a',
          500: '#034f46',
          600: '#0a6b5d',
          700: '#0d7b6a',
          800: '#003630',
          900: '#002520',
          950: '#001512',
        },
        surface: {
          0: '#ffffff',
          50: '#f2f1f0',   // neutral gray sidebar
          100: '#eae9e8',
          200: '#dddcdb',
          300: '#c8c7c5',
          400: '#a3a1a0',
          500: '#787674',
          600: '#575553',
          700: '#3d3b3a',
          800: '#282726',
          850: '#201f1e',
          900: '#181716',
          950: '#0c0b0b',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
