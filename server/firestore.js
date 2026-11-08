// Identidade Firebase restrita aos presentes de um único casamento.
// O refresh token fica exclusivamente no runtime do servidor.
let cached;
export async function accessToken(refreshToken, apiKey, projectId) {
  if (cached?.credential === refreshToken && cached.until > Date.now()) return cached.token;
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok || !result.id_token) throw new Error('credential/token-failed');
  const payload = result.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  // O token vem diretamente do Google por HTTPS, nunca do visitante.
  if (JSON.parse(atob(payload)).aud !== projectId) throw new Error('credential/project-mismatch');
  cached = { credential: refreshToken, token: result.id_token, until: Date.now() + Math.min(Number(result.expires_in) - 60, 3000) * 1000 };
  return cached.token;
}
function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'string') return { stringValue: value };
  throw new Error('store/unsupported-field');
}
function decode(document) {
  if (!document) return null;
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, 'integerValue' in value ? Number(value.integerValue) : 'nullValue' in value ? null : value.stringValue ?? value.booleanValue]));
}
export function firestoreStore({ projectId, token, endpoint = 'https://firestore.googleapis.com' }) {
  const root = `projects/${projectId}/databases/(default)/documents`;
  async function request(path, body, allowMissing = false) {
    const response = await fetch(`${endpoint}/v1/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (allowMissing && response.status === 404) return null;
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error('store/request-failed'), { status: response.status, retryable: ['ABORTED', 'FAILED_PRECONDITION', 'ALREADY_EXISTS'].includes(data.error?.status) });
    return data;
  }
  return {
    get: async path => decode(await request(`${root}/${path}`, undefined, true)),
    async list(path, { all = false } = {}) {
      if (all) {
        const rows = []; let pageToken = '';
        do {
          const page = await request(`${root}/${path}?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
          rows.push(...(page.documents || []).map(document => ({ ...decode(document), id: document.name.split('/').pop() })));
          pageToken = page.nextPageToken || '';
        } while (pageToken);
        return rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      const parts = path.split('/'); const collectionId = parts.pop();
      const rows = await request(`${root}/${parts.join('/')}:runQuery`, { structuredQuery: { from: [{ collectionId }], orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 200 } });
      return rows.filter(row => row.document).map(row => ({ ...decode(row.document), id: row.document.name.split('/').pop() }));
    },
    // Commit atômico com precondições de versão para TODOS os documentos alterados.
    // Não usa transações pessimistas (indisponíveis para identidades Firebase REST).
    async transaction(fn) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const reads = new Map(), staged = new Map();
        const result = await fn({
          async get(path) {
            if (!reads.has(path)) reads.set(path, await request(`${root}/${path}`, undefined, true));
            return decode(reads.get(path));
          },
          set(path, data) { staged.set(path, data); },
        });
        if (!staged.size) return result;
        const writes = [...staged].map(([path, data]) => ({
          update: { name: `${root}/${path}`, fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) },
          ...(reads.has(path) ? { currentDocument: reads.get(path) ? { updateTime: reads.get(path).updateTime } : { exists: false } } : {}),
        }));
        try { await request(`${root}:commit`, { writes }); return result; }
        catch (error) { if (error.retryable && attempt < 4) continue; throw error; }
      }
    },
  };
}
