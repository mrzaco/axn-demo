import { expect, test } from '@playwright/test';

for (const width of [320, 375, 390, 430]) {
  test(`移动端输入框分区布局稳定 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const knowledge = page.getByRole('button', { name: '选择知识库', exact: true });
    await knowledge.click();
    await page.getByRole('dialog', { name: '选择知识库', exact: true }).getByRole('option', { name: /星澜产品资料库/ }).click();
    const incident = page.getByTestId('chat-link-incident');
    await incident.click();
    await page.getByTestId('incident-picker').getByRole('option', { name: /清河段堤防险情/ }).click();
    const shell = (await page.locator('.axn-composer-shell').boundingBox())!;
    const context = (await knowledge.boundingBox())!;
    const event = (await incident.boundingBox())!;
    const more = page.getByRole('button', { name: '输入工具', exact: true });
    const plus = (await more.boundingBox())!;
    const sendButton = page.getByRole('button', { name: '发送', exact: true });
    const send = (await sendButton.boundingBox())!;
    for (const box of [context, event, plus]) expect(Math.abs(box.y + box.height / 2 - send.y - send.height / 2)).toBeLessThan(1);
    expect(plus.x + plus.width).toBeLessThan(context.x);
    expect(context.x + context.width).toBeLessThan(event.x);
    expect(event.x + event.width).toBeLessThan(send.x);
    for (const box of [context, event, plus, send]) {
      expect(box.x).toBeGreaterThanOrEqual(shell.x);
      expect(box.x + box.width).toBeLessThanOrEqual(shell.x + shell.width);
      expect(box.y + box.height).toBeLessThanOrEqual(shell.y + shell.height);
    }
    expect(shell.x + shell.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `/tmp/axn-mobile-composer-redesign-${width}.png` });
    await more.click();
    await expect(page.getByTestId('composer-upload')).toBeVisible();
    await expect(page.getByTestId('composer-speech')).toBeVisible();
    const web = page.getByRole('switch', { name: '联网搜索', exact: true });
    await web.click();
    await expect(web).toBeChecked();
    await more.click();
    await page.getByTestId('composer-speech').click();
    await expect(page.getByRole('button', { name: '停止语音输入', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '停止语音输入', exact: true }).click();
    const input = page.getByPlaceholder(/向安小能发送指令/);
    await input.fill('请整理相关资料');
    await expect(page.getByTestId('composer-speech')).toBeVisible();
    await expect(sendButton).toBeEnabled();
    const typed = (await sendButton.boundingBox())!;
    expect(Math.abs(typed.x - send.x)).toBeLessThan(1);
    await input.fill('第一行\n第二行\n第三行\n第四行\n第五行\n第六行');
    const expanded = (await sendButton.boundingBox())!;
    expect(Math.abs(expanded.x - send.x)).toBeLessThan(1);
    expect(Math.abs(expanded.y - send.y)).toBeLessThan(1);
  });
}

for (const width of [1440, 390]) {
  test(`输入框选择知识库支持搜索、切换对话和清除 ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const picker = page.getByRole('button', { name: '选择知识库', exact: true });
    await expect(picker).toContainText('知识库');
    await picker.click();
    const dialog = page.getByRole('dialog', { name: '选择知识库', exact: true });
    await expect(dialog.getByRole('option')).toHaveCount(3);
    await expect(dialog.getByRole('option', { name: /产业政策参考库/ })).toBeDisabled();
    await expect(dialog.getByRole('tab', { name: '公共知识库', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('option', { name: /防汛预案与法规/ })).toHaveCount(0);
    const chooseScope = async (name: string) => {
      const tab = dialog.getByRole('tab', { name, exact: true });
      await tab.focus();
      await page.keyboard.press('Enter');
    };
    await chooseScope('部门知识库');
    await expect(dialog.getByRole('option')).toHaveCount(2);
    await expect(dialog.getByRole('option', { name: /协作制度知识库/ })).toBeEnabled();
    await chooseScope('单位知识库');
    await expect(dialog).toContainText('单位知识库暂无资料');
    await expect(dialog.getByRole('option')).toHaveCount(0);
    await chooseScope('个人知识库');
    await expect(dialog.getByRole('option')).toHaveCount(3);
    await chooseScope('全部');
    const search = dialog.getByRole('textbox', { name: '搜索对话知识库', exact: true });
    await search.fill('不存在的知识库');
    await expect(dialog).toContainText('未找到匹配的知识库');
    await search.fill('资源保障');
    await expect(dialog.getByRole('option')).toHaveCount(0);
    await search.fill('星澜');
    await expect(dialog.getByRole('option')).toHaveCount(1);
    await dialog.getByRole('option', { name: /星澜产品资料库/ }).click();
    await expect(dialog).toBeHidden();
    await expect(picker).toHaveAttribute('aria-description', '星澜产品资料库');
    const selectedConversation = page.locator('.axn-gs-conversation.is-active');
    const previousId = await selectedConversation.getAttribute('data-testid');
    await page.screenshot({ path: `/tmp/axn-composer-knowledge-${width}.png` });
    if (width < 768) await page.getByRole('button', { name: '打开导航', exact: true }).click();
    await page.getByTestId('new-conversation-btn').click();
    if (width < 768) {
      await page.getByRole('button', { name: '关闭导航', exact: true }).click();
      await page.mouse.move(width - 10, 600);
      await expect(page.locator('.ant-message-notice')).toHaveCount(0);
    }
    await expect(picker).toHaveText('知识库');
    if (width < 768) await page.getByRole('button', { name: '打开导航', exact: true }).click();
    await page.getByTestId(previousId!).click();
    if (width < 768) await page.getByRole('button', { name: '关闭导航', exact: true }).click();
    await expect(picker).toHaveAttribute('aria-description', '星澜产品资料库');
    await picker.click();
    await expect(dialog.getByRole('option', { name: /星澜产品资料库/ })).toHaveAttribute('aria-selected', 'true');
    await dialog.getByRole('button', { name: '清除选择', exact: true }).click();
    await expect(picker).toHaveText('知识库');
    const outside = await page.locator('.axn-composer-shell').evaluate(el => el.getBoundingClientRect().right > innerWidth);
    expect(outside).toBe(false);
    expect(errors).toEqual([]);
  });
}

for (const width of [1366, 1680]) {
  test(`工作区展开后输入框按分栏宽度切换布局 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 928 });
    await page.goto('/');
    const shell = page.locator('.axn-composer-shell');
    await expect(shell).not.toHaveClass(/is-mobile/);
    await page.goto('/#/library');
    await page.getByTestId('document-library').locator('.doc-sample-row').first().click();
    await expect(page.getByTestId('document-workspace')).toBeVisible();
    await expect(shell).toHaveClass(/is-mobile/);
    const boxes = await Promise.all([
      page.getByRole('button', { name: '输入工具', exact: true }),
      page.getByTestId('composer-knowledge-picker'),
      page.getByTestId('chat-link-incident'),
      page.getByTestId('composer-speech'),
      page.getByRole('button', { name: '发送', exact: true }),
    ].map(locator => locator.boundingBox()));
    const boundary = (await shell.boundingBox())!;
    for (let index = 0; index < boxes.length; index++) {
      const box = boxes[index]!;
      expect(box.x).toBeGreaterThanOrEqual(boundary.x);
      expect(box.x + box.width).toBeLessThanOrEqual(boundary.x + boundary.width);
      if (index > 0) expect(box.x).toBeGreaterThan(boxes[index - 1]!.x + boxes[index - 1]!.width);
      expect(Math.abs(box.y + box.height / 2 - boxes[0]!.y - boxes[0]!.height / 2)).toBeLessThan(1);
    }
    await page.screenshot({ path: `/tmp/axn-workspace-composer-${width}.png` });
    await page.getByTestId('workspace-close-btn').click();
    await expect(shell).not.toHaveClass(/is-mobile/);
    await expect(page.getByTestId('composer-upload')).toBeVisible();
  });
}
