import { expect, type Page } from '@playwright/test';

/** 通过输入框上方的快捷任务 chip 发起任务（能力块常驻平铺，不再有「更多任务」浮层）。 */
export async function clickQuickTask(page: Page, label: string) {
  const chip = page.locator('.axn-chips').getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
}

/** 文书生成是多任务能力：先点能力块，再在弹出的菜单里选具体文书（菜单向上弹）。 */
export async function clickDocTask(page: Page, name: string) {
  await clickQuickTask(page, '文书生成');
  await page.getByRole('menuitem', { name, exact: true }).click();
}
