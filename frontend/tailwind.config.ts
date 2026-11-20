import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        aviation: {
          bg: '#080D18',
          secondary: '#101827',
          panel: '#151F30',
          panelHover: '#1B293F',
          border: '#1F2E47',
          borderLight: '#2D3F5E',
          primary: '#35B6F6',
          secondaryAccent: '#36D6B0',
          warning: '#F5B942',
          critical: '#F05B67',
          text: '#E8EEF8',
          muted: '#91A0B8',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
