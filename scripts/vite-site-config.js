import { defineConfig } from 'vite';
import { build as bundleWorker } from 'esbuild';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { validateWeddingId } from '../packages/wedding-core/src/lib/wedding.js';
export function weddingSiteConfig(configUrl) {
  const site = JSON.parse(readFileSync(new URL('./site.json', configUrl), 'utf8'));
  validateWeddingId(site.weddingId);
  const mode = process.env.VITE_SITE_MODE || site.mode;
  const demo = mode === 'demo';
  let resolved;
  const registry = JSON.parse(readFileSync(new URL('../sites.json', import.meta.url), 'utf8'));
  const entry = registry.sites.find(item => item.id === site.id);
  return defineConfig({
    plugins: [react(), {
      name: 'wedding-pages-entries', enforce: 'post',
      configResolved(config) { resolved = config; },
      async generateBundle(_options, bundle) {
        const index = bundle['index.html'];
        if (!index || index.type !== 'asset') throw new Error('Página inicial ausente no build.');
        for (const fileName of ['admin/index.html', 'admin/login/index.html', 'admin/presentes/index.html']) this.emitFile({ type: 'asset', fileName, source: index.source });
        this.emitFile({ type: 'asset', fileName: '_headers', source: `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'
${demo || !site.indexable ? '  X-Robots-Tag: noindex, nofollow\n' : ''}` });
        if (!demo) {
          const origin = entry.domainActive && entry.domain ? `https://${entry.domain}` : `https://${entry.project}.pages.dev`;
          const config = { weddingId: site.weddingId, projectId: entry.firebaseProject, apiKey: resolved.env.VITE_FIREBASE_API_KEY, origin, allowedOrigins: [origin, `https://${entry.project}.pages.dev`] };
          const worker = await bundleWorker({ stdin: { contents: `import {createWorker} from './server/worker.js'; export default createWorker(${JSON.stringify(config)});`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
          this.emitFile({ type: 'asset', fileName: '_worker.js', source: worker.outputFiles[0].text });
          this.emitFile({ type: 'asset', fileName: '_routes.json', source: JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }) });
        }
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: demo || !site.indexable ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\nDisallow: /admin/\n' });
      },
    }],
    define: { 'import.meta.env.VITE_SITE_MODE': JSON.stringify(mode), 'import.meta.env.VITE_SITE_ID': JSON.stringify(site.id), 'import.meta.env.VITE_WEDDING_ID': JSON.stringify(site.weddingId) },
    server: { fs: { allow: [fileURLToPath(new URL('../../', configUrl))] } },
    base: process.env.SITE_BASE_PATH || '/',
    build: { outDir: 'dist', sourcemap: false },
  });
}
