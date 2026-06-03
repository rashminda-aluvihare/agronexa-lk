import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        // Pastel SaaS palette
        ink: '#06140C',
        paper: '#F7FBF8',
        'glass-border': 'rgba(255,255,255,0.12)',
        'brand-green': {
          50: '#EAFBF2',
          100: '#C8F2DA',
          200: '#9EE8BF',
          300: '#6EDCA1',
          400: '#3DCC86',
          500: '#1FAE67',
        },
        'brand-teal': {
          50: '#E3F6FA',
          100: '#BFEAF6',
          200: '#93DDF0',
          300: '#64D0EA',
          500: '#1B9ECF',
        },
        'brand-amber': {
          50: '#FFF2E6',
          100: '#FFE0BC',
          200: '#FFC98F',
          300: '#FFAB5A',
          500: '#F08A2B',
        },
        'brand-purple': {
          50: '#F2EDFF',
          100: '#E4D7FF',
          200: '#C7A9FF',
          300: '#A97AFC',
          500: '#7C4DFF',
        },
        'brand-blue': {
          50: '#E8F0FF',
          100: '#CFE0FF',
          200: '#A9C3FF',
          300: '#7AA3FF',
          500: '#3F7CFF',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(2, 28, 14, 0.08)',
        'glass-lg': '0 12px 40px rgba(0,0,0,0.18)',
      },
      backdropBlur: {
        18: '18px',
      },
      transitionTimingFunction: {
        comfy: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
} satisfies Config

