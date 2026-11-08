import { cp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { readSites, validateSites } from './site-config.js';
const { values, positionals } = parseArgs({ allowPositionals: true, options: { domain: { type: 'string' }, firebase: { type: 'boolean' }, 'wedding-id': { type: 'string' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('npm run site:create -- nome-do-casal [--domain casal.example.com] [--firebase] [--wedding-id identificador]');
  process.exit(0);
}
const id = positionals[0];
const sites = await readSites();
const registry = JSON.parse(await readFile(new URL('../sites.json', import.meta.url), 'utf8'));
const site = { id, workspace: `@wedding/${id}`, project: `onda-wedding-${id}`, weddingId: values['wedding-id'] || id, mode: values.firebase ? 'firebase' : 'demo', firebaseProject: values.firebase ? registry.firebaseProject : '', domain: values.domain || '', heading: 'Helena & Tomás' };
validateSites([...sites, site]);
if (site.project.length > 58) throw new Error('Use um nome de site mais curto.');
const target = new URL(`../sites/${id}/`, import.meta.url);
await mkdir(target); // refuses an existing directory; never overwrite another site
for (const file of ['src', 'public', 'index.html', 'vite.config.js', '.env.example']) {
  await cp(new URL(`../sites/demo-moderno/${file}`, import.meta.url), new URL(file, target), { recursive: true, errorOnExist: true, force: false });
}
const pkg = JSON.parse(await readFile(new URL('../sites/demo-moderno/package.json', import.meta.url), 'utf8'));
pkg.name = site.workspace;
await writeFile(new URL('package.json', target), JSON.stringify(pkg, null, 2) + '\n');
await writeFile(new URL('site.json', target), JSON.stringify({ id, mode: site.mode, weddingId: site.weddingId, indexable: false }, null, 2) + '\n');
if (site.mode === 'firebase') await cp(new URL('../sites/test/.env.example', import.meta.url), new URL('.env.example', target));
await writeFile(new URL('../sites.json', import.meta.url), JSON.stringify({ ...registry, sites: [...sites, site] }, null, 2) + '\n');
console.log(`Site criado: sites/${id}. Execute npm install, personalize src/content.js e index.html e configure o ambiente site-${id} antes de publicar.`);
