import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bloom: {
          bg: '#07080b',
          panel: '#10131a',
          gold: '#d4a017',
          up: '#3ee0a2',
          down: '#ff6b8a',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        terminal: '0 24px 80px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
