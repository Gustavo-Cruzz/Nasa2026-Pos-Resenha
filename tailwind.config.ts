import type { Config } from 'tailwindcss';

/** Plantaê brandkit tokens: Floresta #142018, Painel #1E2D20, Lima #B6DC63, Creme #FBF8F0, Ciano #8DC8CF, Âmbar #E7BF62. */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#fbf8f0', 100: '#f2eee2', 200: '#e2e7dc', 300: '#c8d0c3', 400: '#aab7a3',
          500: '#85957d', 600: '#61755f', 700: '#405840', 800: '#2a3d2b', 900: '#1e2d20', 950: '#142018',
        },
        forest: '#142018',
        panel: '#1e2d20',
        cream: '#fbf8f0',
        lime: { 100: '#eef7d2', 200: '#d8efa0', 300: '#b6dc63', 400: '#9fc752' },
        amber: { 100: '#f7e8b6', 300: '#e7bf62', 950: '#4a3716' },
        cyan: { 100: '#d8edf0', 200: '#b4dce1', 300: '#8dc8cf', 500: '#568da3' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Nunito Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Cards 16 px, fields and buttons 8-12 px.
      borderRadius: { md: '0.5rem', lg: '0.625rem', xl: '1rem', '2xl': '1.25rem' },
    },
  },
  plugins: [],
};

export default config;
