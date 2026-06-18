import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50:  '#FFFDF8',
          100: '#FAF6EC',
          200: '#F2EBD9',
          300: '#E8DDC0',
          400: '#D8C79E',
          500: '#C2AB78',
        },
        ink: {
          400: '#6B6253',
          500: '#4A4337',
          600: '#3A332A',
          700: '#2B2620',
          800: '#1F1B16',
        },
        primary: {
          50:  '#FBF3E2',
          100: '#F6E6C2',
          200: '#EDCD8A',
          300: '#E2B355',
          400: '#D4A24C',
          500: '#BE8A33',
          600: '#9C6F26',
          700: '#7A571E',
          800: '#583F15',
          900: '#3A2A0E',
        },
        brand: {
          50:  '#F0F4ED',
          100: '#DCE6D5',
          200: '#B9CCAB',
          300: '#93B080',
          400: '#719761',
          500: '#5C7A5C',
          600: '#496149',
          700: '#374938',
          800: '#263327',
          900: '#161D17',
        },
        rust: {
          400: '#C2645A',
          500: '#B5483D',
          600: '#963A31',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', '"Source Serif 4"', 'Georgia', 'serif'],
        marker: ['"Caveat"', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'flip': 'flip 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        flip: { '0%': { transform: 'rotateY(0deg)' }, '100%': { transform: 'rotateY(180deg)' } },
      },
    },
  },
  plugins: [],
};

export default config;
