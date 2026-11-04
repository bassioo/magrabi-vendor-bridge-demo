import type { Config } from 'tailwindcss';

// MAGRABi University house style tokens
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: '#1E1B18',
        greige: '#ECEAE4',
        cream: '#FBF3E1',
        card: '#FFFFFF',
        gold: { DEFAULT: '#A8884C', deep: '#8E7338' },
        champagne: '#C9B488',
        teal: { DEFAULT: '#2C6E7C', deep: '#1F535E' },
        grey: '#8C8983',
        ink: '#2A2723',
        body: '#3B3833',
        muted: '#9A968F',
        pass: { DEFAULT: '#3F7D58', bg: '#E8F1EA' },
        flag: { DEFAULT: '#9A6A12', bg: '#FBF0D9' },
        fail: { DEFAULT: '#A4443A', bg: '#F7E3E0' },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', '"Noto Kufi Arabic"', 'Inter', 'sans-serif'],
      },
      boxShadow: { card: '0 8px 24px rgba(30,27,24,0.08)', soft: '0 2px 8px rgba(30,27,24,0.06)' },
      borderRadius: { card: '16px' },
    },
  },
  plugins: [],
} satisfies Config;
