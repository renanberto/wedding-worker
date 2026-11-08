import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateWeddingId } from '../packages/wedding-core/src/lib/wedding.js';
export function validateSites(sites, sharedProject = sites?.find(s => s?.mode === 'firebase')?.firebaseProject) {
  if (!Array.isArray(sites) || !sites.length) throw new Error('Cadastre pelo menos um site.');
  const ids = new Set(), projects = new Set(), domains = new Set(), weddings = new Set();
  for (const s of sites) {
    if (!s || typeof s.id !== 'string' || typeof s.project !== 'string') throw new Error('Informe o identificador e o projeto do site.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id) || s.workspace !== `@wedding/${s.id}` || !/^[a-z0-9-]+$/.test(s.project)) throw new Error('Identificador ou workspace inválido.');
    validateWeddingId(s.weddingId);
    if (weddings.has(s.weddingId)) throw new Error('Cada site deve identificar seu casamento sem duplicatas.');
    weddings.add(s.weddingId);
    if (!['demo', 'firebase'].includes(s.mode)) throw new Error('Modo inválido.');
    if (ids.has(s.id) || projects.has(s.project) || (s.domain && domains.has(s.domain))) throw new Error('Site, projeto ou domínio duplicado.');
    if (s.domain && !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(s.domain)) throw new Error('Domínio inválido.');
    if (s.mode === 'firebase') {
      if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(s.firebaseProject || '') || s.firebaseProject !== sharedProject) throw new Error('Os sites Firebase devem usar o projeto compartilhado configurado.');
    } else if (s.firebaseProject) throw new Error('Uma demonstração não pode apontar para Firebase.');
    ids.add(s.id); projects.add(s.project); domains.add(s.domain);
  }
  return sites;
}
export async function readSites() {
  const data = JSON.parse(await readFile(new URL('../sites.json', import.meta.url), 'utf8'));
  const sites = validateSites(data.sites, data.firebaseProject);
  for (const site of sites) {
    const config = JSON.parse(await readFile(new URL(`../sites/${site.id}/site.json`, import.meta.url), 'utf8'));
    if (config.id !== site.id || config.mode !== site.mode || config.weddingId !== site.weddingId) throw new Error('O cadastro e o site.json não correspondem.');
  }
  return sites;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sites = await readSites();
  console.log(JSON.stringify(process.argv[2] === 'matrix' ? { include: sites } : sites, null, process.argv[2] === 'matrix' ? 0 : 2));
}
