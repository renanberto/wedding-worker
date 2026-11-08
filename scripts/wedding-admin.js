import { validateWeddingId } from '../packages/wedding-core/src/lib/wedding.js';
import { readSites } from './site-config.js';
export async function resolveWedding(project, id, { allowDemo = false } = {}) {
  validateWeddingId(id);
  const sites = await readSites();
  const site = sites.find(entry => entry.weddingId === id && (allowDemo || entry.mode === 'firebase'));
  const shared = sites.find(entry => entry.mode === 'firebase')?.firebaseProject;
  if (!site || !project || project !== shared) throw new Error('Informe um casamento cadastrado e o projeto Firebase compartilhado correto.');
  return site;
}
