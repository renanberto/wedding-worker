import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Opt-in only. Uses disposable accounts and removes only data created by this run.
// Never run on public PRs or upload traces/screenshots containing real guests.
test.describe('Firebase real: RSVP e autorização', () => {
  test.skip(process.env.E2E_FIREBASE_LIVE !== '1', 'Exige autorização e credencial administrativa local.');
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60000);
  const marker = `E2E-${randomUUID()}`;
  const password = randomBytes(24).toString('base64url');
  const accounts = [];
  let app, db, admin, visitor;
  const weddingId = process.env.E2E_WEDDING_ID || 'test';
  const responsesRef = () => db.collection('weddings').doc(weddingId).collection('rsvp_responses');
  const members = () => db.collection('weddings').doc(weddingId).collection('members');
  const otherWeddingId = `e2e-${randomUUID()}`;
  test.beforeAll(async () => {
    const credentials = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    // Prevent tests from writing into a different Firebase than the site being tested.
    if (credentials.project_id !== process.env.E2E_FIREBASE_PROJECT_ID) {
      throw new Error('E2E_FIREBASE_PROJECT_ID não corresponde à credencial administrativa.');
    }
    app = initializeApp({ credential: cert(credentials), projectId: credentials.project_id }, marker);
    db = getFirestore(app);
    const auth = getAuth(app);
    admin = await auth.createUser({ email: `${marker.toLowerCase()}-admin@example.com`, password });
    accounts.push(admin.uid);
    visitor = await auth.createUser({ email: `${marker.toLowerCase()}-visitor@example.com`, password });
    accounts.push(visitor.uid);
    await members().doc(admin.uid).create({ testRun: marker, role: 'admin', enabled: true });
    await db.collection('weddings').doc(otherWeddingId).create({ active: true, title: marker });
    await db.collection('weddings').doc(otherWeddingId).collection('members').doc(visitor.uid).create({ role: 'owner', enabled: true });
  });
  test.afterAll(async () => {
    if (!app) return;
    try {
      const results = await Promise.allSettled([
        (async () => {
          const responses = await responsesRef().where('message', '==', marker).get();
          await Promise.all(responses.docs.map(doc => doc.ref.delete()));
          if (process.env.E2E_GIFTS_LIVE === '1') {
            const gifts = await db.collection('weddings').doc(weddingId).collection('gifts').where('title', '==', marker).get();
            await Promise.all(gifts.docs.map(doc => doc.ref.delete()));
          }
        })(),
        ...(admin ? [members().doc(admin.uid).delete()] : []),
        ...(visitor ? [db.collection('weddings').doc(otherWeddingId).collection('members').doc(visitor.uid).delete()] : []),
        db.collection('weddings').doc(otherWeddingId).delete(),
        ...accounts.map(uid => getAuth(app).deleteUser(uid)),
      ]);
      if (results.some(result => result.status === 'rejected')) {
        throw new Error(`Limpeza E2E incompleta. Revise no Console os recursos do teste ${marker}.`);
      }
    } finally { await deleteApp(app); }
  });
  test('grava RSVP público e permite leitura pelo administrador', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Nome completo/).fill(marker);
    await page.getByLabel('Sim, estarei lá!').check();
    await page.getByLabel(/Total de pessoas/).selectOption('2');
    await page.getByLabel(/Mensagem aos noivos/).fill(marker);
    await page.getByRole('button', { name: /Enviar confirmação/ }).click();
    await expect(page.getByRole('heading', { name: 'Recebemos sua resposta!' })).toBeVisible({ timeout: 20000 });
    const saved = await responsesRef().where('message', '==', marker).get();
    expect(saved.size).toBe(1);
    expect(saved.docs[0].data()).toMatchObject({ name: marker, attendance: 'yes', guests: 2 });
    await page.goto('/#/admin/login');
    await page.getByLabel('E-mail', { exact: true }).fill(admin.email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Confirmações de presença' })).toBeVisible({ timeout: 20000 });
    await page.getByLabel('Buscar por nome').fill(marker);
    await expect(page.getByRole('cell', { name: marker, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Confirmações de presença' })).toBeVisible();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
  });
  test('recusa administrador de outro casamento', async ({ page }) => {
    await page.goto('/#/admin/login');
    await page.getByLabel('E-mail', { exact: true }).fill(visitor.email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Esta conta não possui acesso administrativo.', { timeout: 20000 });
    await page.goto('/#/admin');
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
  });
  test('presentes: cadastro administrativo e catálogo público sem dados dos convidados', async ({ page }) => {
    test.skip(process.env.E2E_GIFTS_LIVE !== '1', 'Exige Worker publicado; não envia e-mails.');
    await page.goto('/#/admin/login');
    await page.getByLabel('E-mail', { exact: true }).fill(admin.email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('link', { name: 'Gerenciar presentes' }).click();
    await page.getByLabel('Título do presente').fill(marker);
    await page.getByLabel('Descrição', { exact: true }).fill('Presente descartável de verificação.');
    await page.getByRole('button', { name: 'Salvar presente' }).click();
    const card = page.locator('.gift-card').filter({ has: page.getByRole('heading', { name: marker, exact: true }) });
    await expect(card).toBeVisible({ timeout: 20000 });
    const response = await page.request.get('/api/gifts');
    expect(response.ok()).toBe(true);
    const catalog = await response.json();
    const gift = catalog.gifts.find(g => g.title === marker);
    expect(gift.status).toBe('available');
    expect(Object.keys(gift).sort()).toEqual(['description', 'id', 'imageUrl', 'status', 'title', 'url']);
    await card.getByRole('button', { name: 'Arquivar', exact: true }).click();
    await expect(card.getByText('Arquivado', { exact: true })).toBeVisible();
    const archived = await (await page.request.get('/api/gifts')).json();
    expect(archived.gifts.some(g => g.id === gift.id)).toBe(false);
  });
  test('SDK cliente confirma isolamento mesmo alterando o caminho manualmente', async () => {
    const { loadEnv } = await import('vite');
    const env = loadEnv('development', `${process.cwd()}/sites/test`, 'VITE_');
    const web = await import('firebase/app');
    const authSdk = await import('firebase/auth');
    const firestore = await import('firebase/firestore');
    const client = web.initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, projectId: env.VITE_FIREBASE_PROJECT_ID }, marker);
    const clientDb = firestore.getFirestore(client);
    try {
      await authSdk.signInWithEmailAndPassword(authSdk.getAuth(client), visitor.email, password);
      if (process.env.E2E_GIFTS_LIVE === '1') {
        const token = await authSdk.getAuth(client).currentUser.getIdToken();
        const denied = await fetch(`${process.env.E2E_BASE_URL}/api/gifts/admin`, { headers: { Authorization: `Bearer ${token}` } });
        expect(denied.status).toBe(403);
      }
      await expect(firestore.getDocs(firestore.collection(clientDb, 'weddings', otherWeddingId, 'rsvp_responses'))).resolves.toBeDefined();
      await expect(firestore.getDocs(firestore.collection(clientDb, 'weddings', weddingId, 'rsvp_responses'))).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(firestore.setDoc(firestore.doc(clientDb, 'weddings', weddingId, 'members', visitor.uid), { enabled: true, role: 'owner' })).rejects.toMatchObject({ code: 'permission-denied' });
      if (process.env.E2E_EXPECT_FINAL_RULES === '1') {
        const ref = firestore.doc(clientDb, 'rsvp_responses', marker);
        try {
          await expect(firestore.setDoc(ref, { name: marker, message: marker, attendance: 'yes', guests: 1, createdAt: firestore.serverTimestamp() })).rejects.toMatchObject({ code: 'permission-denied' });
        } finally { await db.collection('rsvp_responses').doc(marker).delete(); }
      }
    } finally { await firestore.terminate(clientDb); await web.deleteApp(client); }
  });
});
