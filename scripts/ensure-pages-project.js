import { appendFileSync } from 'node:fs';
// CI bootstrap: safe to repeat; never prints credentials or API response bodies.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const project = process.argv[2];
const domain = process.argv[3];
if (!account || !token || !project || !/^[a-z0-9-]+$/.test(project)) {
  throw new Error('Configure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN e o nome do projeto Pages.');
}
if (domain && !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) {
  throw new Error('Informe um subdomínio válido.');
}
const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/pages/projects`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  return fetch(`${url}/${project}${path}`, { ...options, headers, signal: AbortSignal.timeout(30000) });
}
const existing = await request('');
let details;
if (existing.ok) {
  details = (await existing.json()).result;
} else if (existing.status === 404) {
  const created = await fetch(url, { method: 'POST', headers, signal: AbortSignal.timeout(30000), body: JSON.stringify({ name: project, production_branch: 'main' }) });
  if (!created.ok) throw new Error(`Criação do projeto Pages recusada (HTTP ${created.status}). Verifique Account → Cloudflare Pages → Edit.`);
  details = (await created.json()).result;
} else {
  throw new Error(`Consulta do projeto Pages recusada (HTTP ${existing.status}). Verifique a conta e as permissões do token.`);
}
if (!details?.subdomain || !/^[a-z0-9.-]+\.pages\.dev$/.test(details.subdomain)) {
  throw new Error('O Cloudflare não retornou um endereço Pages válido.');
}
const pagesUrl = `https://${details.subdomain}`;
console.log(`Projeto Pages disponível: ${project} (${pagesUrl})`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${pagesUrl}\n`);
if (domain) {
  const domains = await request('/domains');
  if (!domains.ok) throw new Error(`Consulta de domínios recusada (HTTP ${domains.status}).`);
  const data = await domains.json();
  if (!data.result?.some(entry => entry.name === domain)) {
    const added = await request('/domains', { method: 'POST', body: JSON.stringify({ name: domain }) });
    if (!added.ok) throw new Error(`Cadastro do domínio recusado (HTTP ${added.status}).`);
  }
  console.log(`Configure no seu provedor DNS: CNAME ${domain} → ${details.subdomain}`);
}
