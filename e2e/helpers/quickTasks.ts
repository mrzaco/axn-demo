import { expect, type Page } from '@playwright/test';

/** 点开能力块的菜单但不选任务（用于断言菜单内容 / 弹出位置）。 */
export async function openQuickTaskMenu(page: Page, label: string) {
  const chip = page.locator('.axn-chips').getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/** 通过输入框上方的快捷任务 chip 发起任务（能力块常驻平铺，不再有「更多任务」浮层）。
 *  多任务能力块（文书生成 / 态势感知 / 救援资源管理）点击后只展开菜单，
 *  需传 task 再点具体任务；不传 task 时若弹出菜单则直接报错，
 *  避免“以为点了任务、其实只是开了菜单”而后续断言傻等到超时。 */
export async function clickQuickTask(page: Page, label: string, task?: string) {
  const chip = page.locator('.axn-chips').getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  if (task) {
    await page.getByRole('menuitem', { name: task, exact: true }).click();
  } else {
    await expect(page.getByRole('menu'), `${label} 是菜单能力块，clickQuickTask 需要传具体任务名`).toHaveCount(0);
  }
}

/** 文书生成是多任务能力：先点能力块，再在弹出的菜单里选具体文书（菜单向上弹）。 */
export async function clickDocTask(page: Page, name: string) {
  await clickQuickTask(page, '文书生成', name);
}
