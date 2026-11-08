import { expect, test } from '@playwright/test';
const headingName = process.env.E2E_HEADING || ((process.env.E2E_SITE || 'test') === 'demo-moderno' ? 'Helena & Tomás' : 'Bruna e Rai');
for (const width of [360, 390, 768, 1024, 1440]) {
  test(`site público e login em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: headingName })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('home.png') });
    const login = page.getByRole('link', { name: 'Login dos noivos' });
    await expect(login).toBeVisible();
    if (width <= 700) {
      const [brand, button, menu] = await Promise.all([
        page.getByRole('link', { name: 'Ir para o início' }).boundingBox(),
        login.boundingBox(), page.getByRole('button', { name: 'Abrir menu' }).boundingBox(),
      ]);
      expect(brand.x + brand.width).toBeLessThanOrEqual(button.x);
      expect(button.x + button.width).toBeLessThanOrEqual(menu.x);
      await page.getByRole('button', { name: 'Abrir menu' }).click();
    }
    await page.getByRole('link', { name: 'R.S.V.P.', exact: true }).click();
    await expect(page.locator('#rsvp').getByRole('heading', { level: 2 })).toBeInViewport();
    await expect(page.locator('#name')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('public.png') });
    await page.getByRole('link', { name: 'Login dos noivos' }).click();
    await expect(page).toHaveURL(/#\/admin\/login$/);
    await page.goto('/#/admin');
    await expect(page).toHaveURL(/#\/admin\/login$/);
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
for (const width of [360, 390, 768, 1024, 1440]) {
  test(`componentes administrativos em ${width}px`, async ({ page }) => {
    test.skip(Boolean(process.env.E2E_BASE_URL || process.env.E2E_PREVIEW === '1' || (process.env.E2E_SITE && process.env.E2E_SITE !== 'test')), 'Fixture administrativa disponível somente no servidor local.');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tests/e2e/admin-fixture.html');
    await expect(page.getByRole('heading', { name: 'Pessoas confirmadas' })).toBeVisible();
    await page.getByText('Ver mensagem completa').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const region = page.getByRole('region', { name: 'Confirmações' });
    expect(await region.evaluate(element => element.scrollWidth >= element.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('admin.png') });
    await page.getByLabel('Buscar por nome').fill('não existe');
    await expect(page.getByRole('status')).toHaveText('Nenhuma confirmação encontrada.');
  });
}

for (const path of ['/admin', '/admin/', '/admin/login', '/admin/login/']) {
  test(`entrada direta ${path} abre login e permite atualizar`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/#\/admin\/login$/);
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Área dos noivos' })).toBeVisible();
  });
}

test('clicar novamente na mesma seção retorna a ela após rolar a página', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const rsvp = page.getByRole('link', { name: 'R.S.V.P.', exact: true });
  const heading = page.locator('#rsvp').getByRole('heading', { level: 2 });
  await rsvp.click();
  await expect(heading).toBeInViewport();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.getByRole('heading', { name: headingName })).toBeInViewport();
  await rsvp.click();
  await expect(heading).toBeInViewport();
});
