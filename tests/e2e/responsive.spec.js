import { expect, test } from '@playwright/test';
for (const width of [360, 390, 768, 1024, 1440]) {
  test(`site público e login em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Bruna e Rai' })).toBeVisible();
    if (width <= 700) await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('link', { name: 'R.S.V.P.', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Confirme sua presença' })).toBeInViewport();
    await expect(page.locator('#name')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('public.png') });
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
