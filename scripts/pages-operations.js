import { readSites } from './site-config.js';
const [operation, siteId, deploymentId] = process.argv.slice(2);
const site = (await readSites()).find(s => s.id === siteId);
const account = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_API_TOKEN;
if (!site || !account || !token || !['status', 'rollback'].includes(operation)) throw new Error('Informe status/rollback e um site cadastrado.');
const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/pages/projects/${site.project}`;
async function api(path, method = 'GET') {
  const response = await fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(`Operação Pages recusada: HTTP ${response.status}.`);
  return data.result;
}
if (operation === 'status') {
  const deployments = await api('/deployments?per_page=10');
  console.log(JSON.stringify(deployments.map(d => ({ id: d.id, environment: d.environment, url: d.url, created_on: d.created_on, status: d.latest_stage?.status, commit: d.deployment_trigger?.metadata?.commit_hash })), null, 2));
} else {
  if (!/^[a-f0-9-]{36}$/.test(deploymentId || '')) throw new Error('Informe um ID de deployment válido.');
  const target = await api(`/deployments/${deploymentId}`);
  if (target.environment !== 'production' || target.latest_stage?.status !== 'success') throw new Error('Só é permitido restaurar uma publicação de produção concluída.');
  const result = await api(`/deployments/${deploymentId}/rollback`, 'POST');
  console.log(JSON.stringify({ restored: result.id, url: result.url, status: result.latest_stage?.status }));
}
