import { expect, test, type Page } from '@playwright/test';
import { DEMO_RESULT_FILES } from '../src/seed/resultFiles';

const mockCount = (category: string, conversationId?: string) => DEMO_RESULT_FILES.filter(file => file.category === category && (!conversationId || file.conversationId === conversationId)).length;

async function selectFileTab(page: Page, name: string) {
  const tab = page.getByRole('tab', { name: new RegExp(`${name} `) });
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function openFiles(page: Page) {
  await page.getByRole('button', { name: '我的文件', exact: true }).click();
  await expect(page.getByTestId('my-files-page')).toBeVisible();
}
async function send(page: Page, text: string) {
  const before = await page.locator('.axn-task-card').count();
  await page.getByPlaceholder(/向安小能发送指令/).fill(text);
  await page.keyboard.press('Enter');
  await expect(page.locator('.axn-task-card')).toHaveCount(before + 1);
  await expect(page.locator('.axn-task-card').last()).toContainText('已完成', { timeout: 30000 });
}

test('真实对话结果与示例并存，仅安小能按对话分组，删除后不再展示文件', async ({ page }) => {
  await page.goto('/');
  const sourceId = await page.locator('.axn-gs-conversation.is-active').getAttribute('data-testid');
  await send(page, '查询周边救援资源');
  await send(page, '评估救援效果');
  await send(page, '解释依据与术语');
  await page.goto('/#/library');
  await page.getByRole('tab', { name: /^值班日报 / }).click();
  await page.getByRole('button', { name: '生成值班日报', exact: true }).click();
  await expect(page.getByTestId('document-toolbar')).toContainText('新生成', { timeout: 30000 });
  await openFiles(page);
  await expect(page.getByRole('tab')).toHaveCount(6);
  await expect(page.getByRole('tab', { name: /^全部文件 / })).toHaveCount(0);
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant') + 1);
  await expect(page.locator('.axn-file-group')).toHaveCount(3);
  await selectFileTab(page, '文书生成智能体');
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('documents') + 1);
  await expect(page.locator('.axn-file-group')).toHaveCount(0);
  await selectFileTab(page, '救援效果评估智能体');
  await expect(page.locator('.axn-file-group')).toHaveCount(0);
  await page.getByRole('button', { name: '预览评估救援效果', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('剩余风险与改进建议');
  await page.getByRole('button', { name: '返回来源对话', exact: true }).click();
  await expect(page.locator('.axn-gs-conversation.is-active')).toHaveAttribute('data-testid', sourceId!);
  await page.getByTestId('new-conversation-btn').click();
  await send(page, '解释依据与术语');
  await openFiles(page);
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant') + 2);
  await expect(page.locator('.axn-file-group')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: '应急处置依据与术语核对', exact: true })).toBeVisible();
  await expect(page.locator('.axn-file-group-heading')).not.toContainText(['新的对话']);
  await selectFileTab(page, '救援资源管理智能体');
  await expect(page.locator('.axn-file-group')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载查询周边救援资源', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('查询周边救援资源.txt');
  let content = '';
  for await (const chunk of (await download.createReadStream())!) content += chunk.toString();
  expect(content).toContain('来源智能体：救援资源管理智能体');
  await page.getByRole('tab', { name: /^安小能 / }).click();
  const search = page.getByRole('textbox', { name: '搜索文件', exact: true });
  await search.fill('不存在的文件');
  await expect(page.getByText('没有找到匹配的文件')).toBeVisible();
  await page.getByRole('button', { name: '清空搜索', exact: true }).click();
  await page.reload();
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant') + 2);
  const active = page.locator('.axn-gs-conversation.is-active');
  await active.hover();
  await active.getByRole('button', { name: /^删除对话/ }).click();
  await page.getByRole('button', { name: /^删\s*除$/ }).click();
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant') + 1);
  const original = page.getByTestId(sourceId!);
  await original.hover();
  await original.getByRole('button', { name: /^删除对话/ }).click();
  await page.getByRole('button', { name: /^删\s*除$/ }).click();
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant') - mockCount('assistant', 'conv-seed-nandi'));
  await selectFileTab(page, '文书生成智能体');
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('documents') - mockCount('documents', 'conv-seed-nandi'));
  await expect(page.locator('.axn-file-row', { hasText: '新生成' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('原对话已删除', { exact: true })).toHaveCount(0);
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant') - mockCount('assistant', 'conv-seed-nandi'));
});

test('示例文件各分类均有内容，窄屏可预览下载，其他标签直接展示列表', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/files');
  await expect(page.locator('.axn-file-group')).toHaveCount(3);
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('assistant'));
  for (const name of ['文书生成智能体', '态势感知智能体', '救援资源管理智能体', '救援方案生成智能体', '救援效果评估智能体']) {
    const tab = page.getByRole('tab', { name: new RegExp(`${name} `) });
    await tab.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { name: new RegExp(`${name} `) })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.axn-file-group')).toHaveCount(0);
    await expect(page.locator('.axn-file-row').first()).toBeVisible();
  }
  const documentsTab = page.getByRole('tab', { name: /文书生成智能体 / });
  await documentsTab.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: /文书生成智能体 / })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '预览清河段南堤管涌险情处置要情（第3期）', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('下一步工作');
  await expect(page.getByRole('dialog')).toContainText('2026年9月28日');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载文本文件', exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('第3期');
});

test('文书文件可编辑原文，保存后更新文件列表并可再次继续编辑', async ({ page }) => {
  await page.goto('/#/files');
  await expect(page.getByTestId('my-files-page').getByRole('button', { name: /^编辑/ })).toHaveCount(0);
  await selectFileTab(page, '文书生成智能体');
  const title = '清河段南堤管涌险情处置要情（第3期）';
  const revised = '清河段南堤管涌险情处置要情（修订稿）';
  await page.getByRole('button', { name: `编辑${title}`, exact: true }).click();
  await expect(page.getByTestId('document-workspace')).toBeVisible();
  const input = page.getByRole('textbox', { name: '文书标题', exact: true });
  await expect(input).toHaveValue(title);
  await input.fill(revised);
  await page.getByRole('button', { name: '保存修改', exact: true }).click();
  await openFiles(page);
  await selectFileTab(page, '文书生成智能体');
  await expect(page.locator('.axn-file-row')).toHaveCount(mockCount('documents'));
  await expect(page.getByRole('heading', { name: revised, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `预览${revised}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(revised);
  await page.keyboard.press('Escape');
  await page.reload();
  await selectFileTab(page, '文书生成智能体');
  await page.getByRole('button', { name: `编辑${revised}`, exact: true }).click();
  await expect(page.getByRole('textbox', { name: '文书标题', exact: true })).toHaveValue(revised);
});
