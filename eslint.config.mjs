import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  { ignores: ['.next/**', 'node_modules/**', 'playwright-report/**'] },
];

export default config;
