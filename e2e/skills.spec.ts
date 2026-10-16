import { expect, test } from '@playwright/test';

test('创建技能按钮可展开上传和创建两个入口', async ({ page }) => {
  await page.goto('/#/skills');
  await page.getByRole('button', { name: '创建技能', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: '手动上传技能', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: '创建技能', exact: true })).toBeVisible();
  await page.getByRole('menuitem', { name: '手动上传技能', exact: true }).click();
  await expect(page.getByText('手动上传技能功能建设中', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '创建技能', exact: true }).click();
  await page.getByRole('menuitem', { name: '创建技能', exact: true }).click();
  await expect(page.getByText('创建技能功能建设中', { exact: true })).toBeVisible();
});

test('技能管理展示示例技能，可查看详情但不开放调用', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '技能管理', exact: true }).click();
  await expect(page.getByTestId('skills-page')).toBeVisible();
  await expect(page.locator('.axn-gs-nav-item', { hasText: '技能管理' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('5 项示例技能', { exact: true })).toBeVisible();
  await expect(page.locator('.axn-skill-card')).toHaveCount(5);
  const search = page.getByRole('textbox', { name: '搜索技能', exact: true });
  await search.fill('  现场记录  ');
  await expect(page.locator('.axn-skill-card')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('共 1 项技能');
  await search.fill('信息整理');
  await expect(page.locator('.axn-skill-card')).toHaveCount(2);
  await search.fill('交接内容');
  await expect(page.locator('.axn-skill-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '值班信息汇总', exact: true })).toBeVisible();
  await search.fill('不存在的技能');
  await expect(page.getByText('没有找到匹配的技能')).toBeVisible();
  await expect(page.locator('.axn-skill-card')).toHaveCount(0);
  await page.getByRole('button', { name: '清空搜索', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.locator('.axn-skill-card')).toHaveCount(5);
  await page.getByRole('button', { name: '查看现场记录提炼详情', exact: true }).click();
  const detail = page.getByRole('dialog');
  for (const text of ['技能名称', '现场记录提炼', '描述', '从零散现场记录中提炼', '创建者', 'szygadmin', '当前版本', '1.0.0', '使用方式', '免审核']) {
    await expect(detail).toContainText(text);
  }
  await expect(page.locator('.ant-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await expect(page.getByTestId('skills-page').getByRole('button', { name: /召唤/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('skills-page')).toBeVisible();
  await expect(page.locator('.axn-skill-card')).toHaveCount(5);
});
