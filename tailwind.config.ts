import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { fontFamily: { sans: ['var(--font-sora)'], mono: ['var(--font-space-mono)'] } } },
  plugins: [],
};
export default config;