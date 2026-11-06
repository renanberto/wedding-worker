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
  const marker = `E2E-${randomUUID()}`;
  const password = randomBytes(24).toString('base64url');
  const accounts = [];
  let app, db, admin, visitor;
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
    await db.collection('admins').doc(admin.uid).create({ testRun: marker });
  });
  test.afterAll(async () => {
    if (!app) return;
    try {
      const results = await Promise.allSettled([
        (async () => {
          const responses = await db.collection('rsvp_responses').where('message', '==', marker).get();
          await Promise.all(responses.docs.map(doc => doc.ref.delete()));
        })(),
        ...(admin ? [db.collection('admins').doc(admin.uid).delete()] : []),
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
    const saved = await db.collection('rsvp_responses').where('message', '==', marker).get();
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
  test('recusa conta autenticada sem autorização administrativa', async ({ page }) => {
    await page.goto('/#/admin/login');
    await page.getByLabel('E-mail', { exact: true }).fill(visitor.email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Esta conta não possui acesso administrativo.', { timeout: 20000 });
    await page.goto('/#/admin');
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
  });
});
