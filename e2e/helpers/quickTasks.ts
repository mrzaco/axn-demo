import { expect, type Page } from '@playwright/test';

/** 点开能力块的子任务但不选（用于断言展开位置 / 子项内容）。
 *  注意：不适用于文书生成 —— 它不展开，改成在对话里给选项（见 clickQuickTask）。 */
export async function openQuickTaskMenu(page: Page, label: string) {
  const chip = page.locator('.axn-chips').getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.locator('.axn-chips [data-subtask]').first()).toBeVisible();
}

/** 通过输入框上方的快捷任务 chip 发起任务（能力块常驻平铺，不再有「更多任务」浮层）。
 *  多任务能力块（文书生成 / 态势感知 / 救援资源管理）点击后行为分两种：
 *  - 态势感知 / 救援资源管理：在它右侧就地展开子按钮，需传 task 再点具体任务；
 *  - 文书生成：不展开，而是在对话里召唤智能体并给出三个文书类型选项（用户 m00263），
 *    所以 task 要到对话气泡里的选项按钮点（data-testid=doc-agent-choices）。
 *  不传 task 时若已展开子按钮就直接报错，避免“以为点了任务、其实只是展开了子项”而后续断言傻等到超时。 */
export async function clickQuickTask(page: Page, label: string, task?: string) {
  const chips = page.locator('.axn-chips');
  const chip = chips.getByRole('button', { name: label, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  if (task) {
    const target = label === '文书生成'
      ? page.getByTestId('doc-agent-choices').last().getByRole('button', { name: task, exact: true })
      : chips.getByRole('button', { name: task, exact: true });
    await target.click();
  } else {
    await expect(page.locator('.axn-chips [data-subtask]'), `${label} 是展开式子任务的能力块，clickQuickTask 需要传具体任务名`).toHaveCount(0);
  }
}

/** 文书生成是多任务能力，但不再就地展开：先点能力块召唤智能体，再点它气泡里的文书类型选项。 */
export async function clickDocTask(page: Page, name: string) {
  await clickQuickTask(page, '文书生成', name);
}
