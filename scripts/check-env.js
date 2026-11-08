import { loadEnv } from 'vite';
import { readFileSync } from 'node:fs';

const mode = process.argv[2] || 'development';
const env = loadEnv(mode, process.cwd(), 'VITE_');
const site = JSON.parse(readFileSync('site.json', 'utf8'));
const demo = (env.VITE_SITE_MODE || site.mode) === 'demo';
const required = [
  'VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_APP_ID',
];
const configured = required.filter(name => env[name]?.trim());
console.log(`Firebase (${mode}): ${configured.length}/${required.length} configurações preenchidas.`);
for (const name of required) console.log(`${env[name]?.trim() ? 'OK' : 'PENDENTE'} ${name}`);
console.log(`${env.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim() ? 'OK' : 'PENDENTE (opcional para build)'} VITE_FIREBASE_APP_CHECK_SITE_KEY`);
if (demo) {
  console.log('Demonstração isolada: nenhuma resposta será enviada ao Firebase.');
  if (configured.length) { console.error('Remova as credenciais Firebase do build demonstrativo.'); process.exitCode = 1; }
} else if (mode === 'production' && configured.length < required.length) {
  console.error('Produção exige a configuração Firebase completa para login e RSVP.');
  process.exitCode = 1;
} else if (!configured.length) {
  console.log('Site público disponível; RSVP e login aguardam a configuração Firebase.');
} else if (configured.length < required.length) {
  console.error('Configuração Firebase incompleta. Preencha os campos pendentes antes de publicar.');
  process.exitCode = 1;
} else {
  console.log('Configuração Web preenchida. Valide as regras, administradores e App Check no Console.');
}

if (!demo && process.env.EXPECTED_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID !== process.env.EXPECTED_FIREBASE_PROJECT_ID) {
  console.error('O projeto Firebase não corresponde ao site selecionado. Publicação recusada.');
  process.exitCode = 1;
}
