import { expect, type Page } from '@playwright/test';

/** 点开能力块的子任务但不选（用于断言展开位置 / 子项内容）。 */
export async function openQuickTaskMenu(page: Page, label: string) {
  const chip = page.locator('.axn-chips').getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.locator('.axn-chips [data-subtask]').first()).toBeVisible();
}

/** 通过输入框上方的快捷任务 chip 发起任务（能力块常驻平铺，不再有「更多任务」浮层）。
 *  多任务能力块（文书生成 / 态势感知 / 救援资源管理）点击后在它右侧就地展开子按钮，
 *  需传 task 再点具体任务；不传 task 时若已展开子按钮就直接报错，
 *  避免“以为点了任务、其实只是展开了子项”而后续断言傻等到超时。 */
export async function clickQuickTask(page: Page, label: string, task?: string) {
  const chips = page.locator('.axn-chips');
  const chip = chips.getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  if (task) {
    await chips.getByRole('button', { name: task, exact: true }).click();
  } else {
    await expect(page.locator('.axn-chips [data-subtask]'), `${label} 是展开式子任务的能力块，clickQuickTask 需要传具体任务名`).toHaveCount(0);
  }
}

/** 文书生成是多任务能力：先点能力块，再点它右侧就地展开的子按钮。 */
export async function clickDocTask(page: Page, name: string) {
  await clickQuickTask(page, '文书生成', name);
}
