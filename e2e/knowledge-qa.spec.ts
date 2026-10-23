import { expect, test } from '@playwright/test';

/**
 * 知识问答链路（qa.json 语料）。
 *
 * 覆盖两个容易被"优化"悄悄改坏的点：
 * ① 首页引导问题是 ChatPanel 里的内联字面量（避免整包语料进首屏），点击后必须仍能命中语料答案
 *    —— 语料现由 src/services/qaKnowledge.ts 的 ensureQaLoaded() 按需加载，漏了前置 await 这条断言就会红；
 * ② 展示回答正文与来源，按标注移除分类置信度、实时数据栏和底部说明。
 */
test('点击首页引导问题命中知识库答案（语料按需加载）', async ({ page }) => {
  await page.goto('/');
  const first = page.locator('.axn-question-item').first();
  await expect(first).toBeVisible();
  await first.click();
  const answer = page.locator('.axn-qa').last();
  await expect(answer.locator('.axn-qa-lead')).toBeVisible({ timeout: 30000 });
  await expect(answer.locator('.axn-qa-source').first()).toBeVisible();
  await expect(answer.locator('.axn-qa-section')).toHaveCount(3);
  await expect(answer.locator('.axn-qa-meta, .axn-qa-live, .axn-qa-disclaimer')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/knowledge-qa.png' });
});
