import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('página pública e login atendem às verificações automáticas WCAG', async ({ page }) => {
  for (const path of ['/', '/#/admin/login']) {
    await page.goto(path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([]);
  }
});
