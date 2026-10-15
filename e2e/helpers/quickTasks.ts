import { expect, type Page } from '@playwright/test';

/** 智能体入口在当前对话追加卡片，在自我介绍卡片内展示功能按钮。兼容调用处使用的简短名称。 */
export async function openQuickTaskMenu(page: Page, label: string) {
  const name = label.endsWith('智能体') ? label : `${label}智能体`;
  const chip = page.locator('.axn-chips').getByRole('button', { name, exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.locator('.axn-doc-choices').last()).toBeVisible();
}

export async function clickQuickTask(page: Page, label: string, task?: string) {
  await openQuickTaskMenu(page, label);
  if (task) await page.locator('.axn-doc-choices').last().getByRole('button', { name: task, exact: true }).click();
}

export async function clickDocTask(page: Page, name: string) {
  await clickQuickTask(page, '文书生成智能体', name);
}
