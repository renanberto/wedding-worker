import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
export function weddingSiteConfig(configUrl) {
  const site = JSON.parse(readFileSync(new URL('./site.json', configUrl), 'utf8'));
  const mode = process.env.VITE_SITE_MODE || site.mode;
  const demo = mode === 'demo';
  return defineConfig({
    plugins: [react(), {
      name: 'wedding-pages-entries', enforce: 'post',
      generateBundle(_options, bundle) {
        const index = bundle['index.html'];
        if (!index || index.type !== 'asset') throw new Error('Página inicial ausente no build.');
        for (const fileName of ['admin/index.html', 'admin/login/index.html']) this.emitFile({ type: 'asset', fileName, source: index.source });
        this.emitFile({ type: 'asset', fileName: '_headers', source: `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'
${demo || !site.indexable ? '  X-Robots-Tag: noindex, nofollow\n' : ''}` });
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: demo || !site.indexable ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\nDisallow: /admin/\n' });
      },
    }],
    define: { 'import.meta.env.VITE_SITE_MODE': JSON.stringify(mode), 'import.meta.env.VITE_SITE_ID': JSON.stringify(site.id) },
    server: { fs: { allow: [fileURLToPath(new URL('../../', configUrl))] } },
    base: process.env.SITE_BASE_PATH || '/',
    build: { outDir: 'dist', sourcemap: false },
  });
}
