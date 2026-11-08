import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_WEDDING_ID': JSON.stringify('test') },
  test: { environment: 'jsdom', include: ['tests/**/*.test.{js,jsx}'], exclude: ['tests/rules/**'], setupFiles: ['tests/setup.js'] },
});
