import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#fbf8f0', 100: '#f2eee2', 200: '#e2e7dc', 300: '#c8d0c3', 400: '#aab7a3',
          500: '#85957d', 600: '#61755f', 700: '#405840', 800: '#2a3d2b', 900: '#1e2d20', 950: '#142018',
        },
        lime: { 200: '#d8efa0', 300: '#b6dc63' },
        amber: { 100: '#f7e8b6', 300: '#e7bf62', 950: '#4a3716' },
        cyan: { 100: '#d8edf0', 300: '#8dc8cf', 500: '#568da3' },
      },
    },
  },
  plugins: [],
};

export default config;
