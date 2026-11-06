import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: { fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] } },
  plugins: [react(), {
    name: 'admin-entry-pages',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') throw new Error('Página inicial ausente no build.');
      // O Pages serve arquivos/diretórios; cada entrada usa os mesmos assets compilados.
      for (const fileName of ['admin/index.html', 'admin/login/index.html']) {
        this.emitFile({ type: 'asset', fileName, source: index.source });
      }
    },
  }],
  base: process.env.SITE_BASE_PATH || '/',
  build: { outDir: 'dist', sourcemap: false },
});
