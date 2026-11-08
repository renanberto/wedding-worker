import { readSites } from './site-config.js';
let failures = 0;
for (const site of await readSites()) {
  const urls = process.env.CHECK_BASE_URL ? [process.env.CHECK_BASE_URL] : [`https://${site.project}.pages.dev`, ...(site.domainActive && site.domain ? [`https://${site.domain}`] : [])];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const body = await response.text();
      if (!response.ok || !body.includes('id="root"') || !body.includes('/assets/')) throw new Error('Resposta HTTP ou HTML inválido.');
      console.log(`${site.id}: OK ${url} (HTTP ${response.status})`);
    } catch { console.error(`${site.id}: falha ao verificar ${url}`); failures++; }
  }
}
process.exitCode = failures ? 1 : 0;
