import { spawn } from 'node:child_process';
import { readSites } from './site-config.js';
const site = (await readSites()).find(s => s.id === process.argv[2] && s.mode === 'firebase');
if (!site) throw new Error('Selecione um site Firebase cadastrado.');
const names = ['GIFTS_FIREBASE_REFRESH_TOKEN', 'GIFTS_TOKEN_SECRET', 'RESEND_API_KEY', 'GIFTS_FROM_EMAIL'];
const values = Object.fromEntries(names.filter(name => process.env[name]).map(name => [name, process.env[name]]));
if (!values.GIFTS_FIREBASE_REFRESH_TOKEN || !values.GIFTS_TOKEN_SECRET) throw new Error('Provisione a identidade de presentes no ambiente GitHub deste site antes de publicar.');
if (values.GIFTS_TOKEN_SECRET.length < 32) throw new Error('O segredo dos links deve conter pelo menos 32 caracteres.');
await new Promise((resolve, reject) => {
  const child = spawn('npx', ['wrangler', 'pages', 'secret', 'bulk', '--project-name', site.project], { stdio: ['pipe', 'ignore', 'ignore'] });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Não foi possível configurar os segredos no runtime Pages.')));
  child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify(values));
});
console.log(`Runtime ${site.id}: identidade restrita configurada; envio de e-mail ${values.RESEND_API_KEY && values.GIFTS_FROM_EMAIL ? 'configurado' : 'pendente (escolhas desabilitadas)'}.`);
