import { expect, test } from '@playwright/test';
test('demonstração isola RSVP e painel nesta aba sem chamar Firebase', async ({ page }) => {
  test.skip(process.env.E2E_SITE !== 'demo-moderno');
  const backendRequests = [];
  page.on('request', request => { if (/firestore.googleapis|identitytoolkit.googleapis/.test(request.url())) backendRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByText(/Site de demonstração/)).toBeVisible();
  await page.getByLabel(/Nome completo/).fill('Convidado fictício E2E');
  await page.getByLabel('Sim, estarei lá!').check();
  await page.getByLabel(/Total de pessoas/).selectOption('3');
  await page.getByRole('button', { name: /Enviar confirmação/ }).click();
  await expect(page.getByRole('heading', { name: 'Recebemos sua resposta!' })).toBeVisible();
  await page.getByRole('link', { name: 'Login dos noivos' }).click();
  await page.getByRole('button', { name: 'Explorar painel de exemplo' }).click();
  await page.getByLabel('Buscar por nome').fill('Convidado fictício E2E');
  await expect(page.getByRole('cell', { name: 'Convidado fictício E2E' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Confirmações de presença' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
  expect(backendRequests).toEqual([]);
});
test('nova aba não herda respostas nem sessão da demonstração', async ({ browser, baseURL }) => {
  test.skip(process.env.E2E_SITE !== 'demo-moderno');
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(new URL('/#/admin', baseURL).toString());
    await expect(page.getByRole('button', { name: 'Explorar painel de exemplo' })).toBeVisible();
    await page.getByRole('button', { name: 'Explorar painel de exemplo' }).click();
    await expect(page.getByRole('cell', { name: 'Convidado fictício E2E' })).toHaveCount(0);
  } finally { await context.close(); }
});
