import { clickQuickTask } from './helpers/quickTasks';
/**
 * 文书智能体 E2E（UI 改版适配）：
 * 独立「文书库」页负责分类浏览 / 生成 / 样稿打开；样稿与草稿的阅读详情在助理页右侧「文书工作区」呈现，
 * 由显式「关闭文书」回到宽对话。业务断言（分类 4、样稿 8、生成回写、工作总结补充、真实草稿打开、
 * 在线编辑/放弃修改/导出为预览不下载）保持不降级。
 */
import { expect, test, type Page } from '@playwright/test';

async function openLibrary(page: Page) {
  await page.locator('.axn-gs-nav-item', { hasText: '文书库' }).first().click();
  await expect(page.getByTestId('document-library-page')).toBeVisible();
}

async function closeWorkspace(page: Page) {
  await page.getByTestId('workspace-close-btn').click();
  await expect(page.getByTestId('document-workspace')).toHaveCount(0);
}

test('文书库：分类浏览、样稿与生成回写', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  const library = page.getByTestId('document-library');
  await expect(library.getByRole('heading', { name: '文书库' })).toBeVisible();
  // 值班日报、会议纪要入口暂时隐藏；智能体物化文种仍展示分类行
  await expect(library.getByText('会议纪要', { exact: true })).toHaveCount(0);
  await expect(library.getByText('值班日报', { exact: true })).toHaveCount(0);
  await expect(library.locator('.doc-sample-row')).toHaveCount(4);
  for (const name of ['应急抢险要情', '抢险总结']) {
    const category = library.locator('.doc-category').filter({ hasText: name });
    // 点开样稿 → 回到助理页并展示右侧文书工作区
    await category.locator('.doc-sample-row').first().click();
    await expect(page.getByTestId('document-workspace')).toBeVisible();
    await expect(page.getByTestId('mock-redhead-document')).toBeVisible();
    await expect(page.locator('.axn-redhead-org')).toHaveText('中国安能建设集团有限公司');
    await closeWorkspace(page);
    // 分类生成 → 生成中自动打开工作区 → 完成后回写该分类
    await openLibrary(page);
    await category.getByRole('button', { name: `生成${name}`, exact: true }).click();
    await expect(page.getByTestId('document-workspace')).toContainText('正在生成文书');
    if (name === '抢险总结') {
      await page.getByRole('textbox', { name: '下一步改进措施' }).fill('完善通信保障和人员轮换机制。');
      await page.getByRole('button', { name: '提交并生成抢险总结' }).click();
    }
    await expect(page.getByTestId('document-toolbar')).toContainText('新生成');
    await closeWorkspace(page);
    await openLibrary(page);
    await expect(category.locator('.doc-sample-row')).toHaveCount(3);
  }
  await page.screenshot({ path: 'artifacts/document-agent-library.png' });

  // 真实草稿：缺必填 → 补录 → 再次生成 → 草稿在文书工作区打开
  const send = async (text: string) => {
    await page.getByPlaceholder(/向安小能发送指令/).fill(text);
    await page.keyboard.press('Enter');
  };
  await page.locator('.axn-gs-nav-item', { hasText: '智能助理' }).first().click();
  await send('生成应急要情');
  await expect(page.locator('.axn-task-card', { hasText: '生成应急要情' }).last()).toContainText('待补充信息', { timeout: 20000 });
  await send('报送单位是清河防汛分指挥部值班室');
  await expect(page.locator('.axn-task-card', { hasText: '补录报送单位' }).last().getByText('已完成')).toBeVisible({ timeout: 20000 });
  await send('生成应急要情');
  await expect(page.locator('article.doc-detail-paper')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('article.doc-detail-paper')).toContainText('清河防汛分指挥部值班室');
  await page.screenshot({ path: 'artifacts/document-agent-detail.png' });
  await closeWorkspace(page);
  // 已完成任务的产物提供真实草稿预览/打开动作（重新打开同一草稿，不重新生成）
  await expect(page.getByTestId('task-open-draft').first()).toBeVisible();
  await page.getByTestId('task-open-draft').first().click();
  await expect(page.locator('article.doc-detail-paper')).toBeVisible();
});

test('聊天文书快捷操作无需补录即可生成右侧模拟红头文书', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('.doc-center');
  for (const name of ['应急抢险要情']) {
    await clickQuickTask(page, `生成${name}`);
    const workflow = page.getByTestId('document-generation-card').last();
    await expect(workflow).toContainText('正在整理已收集的文书要素');
    await expect(workflow).toContainText('编制单位');
    await expect(workflow).toContainText('以下模拟用户已提供并确认的信息');
    await expect(workflow).toContainText('正在调用文书生成智能体…');
    await expect(workflow).toContainText('正在生成文书…');
    await expect(panel).toContainText('正在生成文书');
    await expect(panel.getByTestId('document-toolbar')).toContainText(`${name}（新生成）`);
    await expect(panel.locator('.axn-redhead-org')).toHaveText('中国安能建设集团有限公司');
    await expect(workflow).toContainText(/已完成|红头文书已生成/);
    await expect(panel.getByTestId('mock-redhead-document')).not.toContainText('文书要素（模拟收集）');
    await expect(page.getByText(new RegExp(`已生成《.*${name}（新生成）》`))).toBeVisible();
    await closeWorkspace(page);
    await openLibrary(page);
    await expect(page.getByTestId('document-library').locator('.doc-category').filter({ hasText: name }).locator('.doc-sample-row')).toHaveCount(3);
    await page.locator('.axn-gs-nav-item', { hasText: '智能助理' }).first().click();
  }
});

test('模拟文书详情就是编辑态：边改边存、放弃修改、导出为预览', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  await page.getByTestId('document-library').locator('.doc-sample-row').first().click();
  const panel = page.locator('.doc-center');
  // 打开即是编辑态：标题、正文直接可改，不需要先点「在线编辑」
  await panel.getByRole('textbox', { name: '文书标题', exact: true }).fill('防汛值守日报（修订）');
  await panel.getByRole('textbox', { name: '第1节正文', exact: true }).fill('本班次已完成重点区域巡查，并记录交接事项（模拟）。');
  await expect(page.getByTestId('mock-dirty-note')).toBeVisible();
  await panel.getByRole('button', { name: '保存修改', exact: true }).click();
  await expect(panel.getByTestId('rich-text-editor').first()).toContainText('本班次已完成重点区域巡查');
  await expect(page.getByTestId('mock-dirty-note')).toHaveCount(0);
  await closeWorkspace(page);
  await openLibrary(page);
  await page.getByTestId('document-library').locator('.doc-sample-row').filter({ hasText: '防汛值守日报（修订）' }).click();
  await expect(panel.getByTestId('rich-text-editor').first()).toContainText('本班次已完成重点区域巡查');
  // 未保存的改动离开详情页不丢，只有「放弃修改」才丢弃（离开再回来由单元测试盖）
  await panel.getByRole('textbox', { name: '文书标题', exact: true }).fill('未保存标题');
  await expect(page.getByTestId('mock-dirty-note')).toBeVisible();
  await panel.getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(panel.getByRole('textbox', { name: '文书标题', exact: true })).toHaveValue('防汛值守日报（修订）');
  await expect(page.getByTestId('mock-dirty-note')).toHaveCount(0);
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  for (const format of ['Word', 'PDF']) {
    await panel.getByRole('button', { name: `导出 ${format}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('不生成或下载实际文件');
    await page.getByRole('button', { name: '知道了' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  }
  expect(downloads).toEqual([]);
  await page.screenshot({ path: 'artifacts/document-detail-refined.png' });
});

test('直接编辑支持 Word 风格富文本（字号/加粗/标黄/红字/居中/列表），保存后重开仍带格式', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  await page.getByTestId('document-library').locator('.doc-sample-row').first().click();
  const panel = page.locator('.doc-center');
  const editor = panel.getByRole('textbox', { name: '第1节正文', exact: true });
  const toolbar = panel.getByTestId('rich-text-toolbar');
  await expect(toolbar).toBeVisible();

  /** execCommand 走 styleWithCSS 时写的是行内样式，所以按计算样式断言「格式真的生效了」。 */
  const computed = (property: 'fontWeight' | 'color' | 'backgroundColor') =>
    editor.evaluate((el, prop) => Array.from(el.querySelectorAll('*')).map(node => getComputedStyle(node)[prop as 'fontWeight']), property);

  await editor.selectText();
  await panel.getByTestId('rich-text-size').click();
  await page.locator('.ant-select-item-option', { hasText: '小二 24' }).click();
  await expect(editor.locator('font[size="4"]')).not.toHaveCount(0);

  await editor.selectText();
  await toolbar.getByRole('button', { name: '加粗' }).click();
  expect(await computed('fontWeight')).toContain('700');

  await editor.selectText();
  await toolbar.getByRole('button', { name: '标黄' }).click();
  expect(await computed('backgroundColor')).toContain('rgb(255, 229, 143)');

  await editor.selectText();
  await toolbar.getByRole('button', { name: '红字' }).click();
  expect(await computed('color')).toContain('rgb(198, 40, 40)');

  await editor.click();
  await toolbar.getByRole('button', { name: '居中' }).click();
  await expect(editor.locator('p, div').first()).toHaveAttribute('style', /text-align: center/);

  await editor.click();
  await toolbar.getByRole('button', { name: '无序列表' }).click();
  await expect(editor.locator('ul > li').first()).toBeVisible();
  // 列表不能嵌成 p>ul（Chromium 默认会把菜单式内容包成段落）
  await expect(editor.locator('p > ul')).toHaveCount(0);
  await expect(toolbar.getByRole('button', { name: '无序列表' })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'artifacts/rich-text-toolbar.png' });

  await panel.getByRole('button', { name: '保存修改', exact: true }).click();
  // 保存后仍是编辑态（工具条和编辑器都在），格式已经落进 store
  await expect(toolbar).toBeVisible();
  await closeWorkspace(page);
  await openLibrary(page);
  await page.getByTestId('document-library').locator('.doc-sample-row').first().click();
  const reopened = panel.getByRole('textbox', { name: '第1节正文', exact: true });
  await expect(reopened.locator('font[size="4"]')).not.toHaveCount(0);
  await expect(reopened.locator('ul > li')).not.toHaveCount(0);
});
