import { siteId } from './site';

const key = `wedding-demo:${siteId}:responses`;
export const demoSessionKey = `wedding-demo:${siteId}:session`;
const examples = [
  { id: 'example-1', name: 'Mariana Costa (exemplo)', attendance: 'yes', guests: 2, message: 'Que seja um dia inesquecível!', createdAt: '2026-11-01T12:00:00Z' },
  { id: 'example-2', name: 'Miguel Santos (exemplo)', attendance: 'no', guests: 0, message: 'Estaremos a torcer por vocês.', createdAt: '2026-11-02T12:00:00Z' },
];
export function readDemoResponses() {
  let rows;
  try { rows = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { /* discard malformed demo data */ }
  if (!Array.isArray(rows)) rows = examples;
  return rows.map(row => ({ ...row, createdAt: { toDate: () => new Date(row.createdAt), toMillis: () => new Date(row.createdAt).getTime() } }));
}
export function saveDemoResponse(values) {
  const rows = readDemoResponses().map(row => ({ ...row, createdAt: row.createdAt.toDate().toISOString() }));
  rows.unshift({ ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  sessionStorage.setItem(key, JSON.stringify(rows));
}
export function resetDemo() {
  sessionStorage.removeItem(key);
}
