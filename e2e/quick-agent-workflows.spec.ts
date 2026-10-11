import { clickQuickTask } from './helpers/quickTasks';
import { expect, test } from '@playwright/test';

test('快捷任务在智能体卡片内展示执行过程和模拟结果', async ({ page }) => {
  await page.goto('/');
  for (const [label, agent, result, steps] of [
    ['生成灾情摘要', '态势感知智能体', '人员伤亡情况', 4],
    ['生成态势报告', '态势感知智能体', '安全区域', 4],
    ['查询周边救援资源', '资源管理智能体', '预计到达', 3],
  ] as const) {
    await clickQuickTask(page, label);
    const card = page.getByTestId('agent-summon-card').filter({ hasText: agent }).last();
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/is-running/);
    await expect(card.locator('.axn-step-running')).toBeVisible();
    await expect(card).toContainText('任务已完成，执行过程与结果如下', { timeout: 20000 });
    await expect(card).not.toHaveClass(/is-running/);
    await expect(card.locator('.axn-step-completed')).toHaveCount(steps);
    await expect(card).toContainText(result);
    if (label === '生成灾情摘要') {
      await expect(card).toContainText('队伍与人员状态时效');
      await expect(card).toContainText('状态更新时间');
      await expect(card.getByRole('button', { name: '查看文书' })).toBeVisible();
      await expect(page.getByTestId('document-workspace')).toBeVisible({ timeout: 10000 });
    }
    if (label === '生成态势报告') {
      await expect(card.getByTestId('scenario-sections')).toContainText('建设材料');
      await expect(card.getByRole('button', { name: '查看文书' })).toBeVisible();
      await expect(page.getByTestId('mock-redhead-document')).toContainText('灾情态势报告', { timeout: 10000 });
    }
    if (label === '查询周边救援资源') {
      await expect(card.getByTestId('resource-result-compact')).toBeVisible();
      await expect(card.getByRole('button', { name: '查看文书' })).toBeVisible();
      await expect(card.getByRole('button', { name: '查看态势地图' }).first()).toBeVisible();
      await card.getByRole('button', { name: '查看资源列表' }).first().click();
      const drawer = page.locator('.ant-drawer', { hasText: '资源与态势（模拟）' });
      await expect(drawer).toBeVisible();
      await expect(page.getByTestId('resource-tab-list')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  }
  await page.screenshot({ path: 'artifacts/quick-agent-workflows.png' });
});

test('建设场景事件资源查询：按本事件资料整理并打开文书，不沿用其他事件 ETA', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-conversation-btn').click();
  await page.getByTestId('chat-link-incident').click();
  await page.locator('.ant-select-item-option', { hasText: '武陵大道立交下穿城市内涝' }).click();
  await expect(page.getByText('【当前状态】')).toBeVisible();
  await clickQuickTask(page, '查询周边救援资源');
  const card = page.getByTestId('agent-summon-card').filter({ hasText: '资源管理智能体' }).last();
  await expect(card).toContainText('任务已完成，执行过程与结果如下', { timeout: 20000 });
  await expect(card).not.toContainText('暂无获授权的资源数据，不能沿用其他事件');
  await expect(card.getByTestId('scenario-sections')).toBeVisible();
  await expect(card.getByRole('button', { name: '查看文书' })).toBeVisible();
  await expect(card.getByRole('button', { name: '查看态势地图' }).first()).toBeVisible();
  await expect(page.getByTestId('mock-redhead-document')).toBeVisible({ timeout: 10000 });
  await card.getByRole('button', { name: '查看态势地图' }).first().click();
  const drawer = page.locator('.ant-drawer', { hasText: '资源与态势（模拟）' });
  await expect(drawer).toBeVisible();
  await expect(page.getByTestId('resource-tab-map')).toBeVisible();
  await expect(page.getByTestId('map-marker-vue-res-nl08-t01')).toBeVisible();
  await drawer.getByRole('tab', { name: '资源列表' }).click();
  await expect(page.getByTestId('resource-tab-list')).toContainText('常德水域排涝队');
  await page.keyboard.press('Escape');
  await clickQuickTask(page, '生成周边资源报告');
  const report = page.getByTestId('agent-summon-card').filter({ hasText: '资源管理智能体' }).last();
  await expect(report).toContainText('任务已完成，执行过程与结果如下', { timeout: 20000 });
  await expect(report.getByTestId('scenario-sections')).toContainText('周边资源');
  await expect(report.getByRole('button', { name: '查看文书' })).toBeVisible();
});

test('空白对话提示关联灾情，关联后可正常生成摘要', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('new-conversation-btn').click();
  // 无消息时头部不显示事件标题，未关联状态由关联灾情选择器承载（标注 vibe_1791303121889）
  await expect(page.getByTestId('chat-link-incident')).toContainText('未关联事件');
  // 建设场景入口（含「队伍人员状态时效」）在未关联时也只提示，不产出资源材料
  await page.getByTestId('home-construction-scenarios').getByRole('button').first().click();
  const situationCard = page.getByTestId('agent-summon-card').last();
  await expect(situationCard).toContainText('当前对话尚未关联有效灾情', { timeout: 20000 });
  await expect(situationCard).toContainText('待补充信息');
  await expect(situationCard).not.toContainText('资源状态待核实');
  await expect(situationCard).not.toContainText('INTERNAL');
  await clickQuickTask(page, '核对资源状态');
  const resourceCard = page.getByTestId('agent-summon-card').last();
  await expect(resourceCard).toContainText('当前对话尚未关联有效灾情', { timeout: 20000 });
  await expect(resourceCard).toContainText('待补充信息');
  await expect(resourceCard.getByTestId('scenario-sections')).toHaveCount(0);
  await page.getByTestId('chat-link-incident').click();
  await page.locator('.ant-select-item-option', { hasText: '清河段堤防险情' }).click();
  await clickQuickTask(page, '生成灾情摘要');
  await expect(page.getByTestId('agent-summon-card').last()).toContainText('任务已完成，执行过程与结果如下', { timeout: 20000 });
  await expect(page.getByTestId('agent-summon-card').last()).toContainText('人员伤亡情况');
  // 有消息后头部事件标题回归（无消息时不显示）
  await expect(page.getByTestId('header-event')).toContainText('清河段堤防险情');
});

test('五类智能体均有入口，方案与评估可执行并展示结果', async ({ page }) => {
  await page.goto('/');
  const chips = page.locator('.axn-chips');
  // 主推区含当前场景智能体；其余经「更多动作」可达
  await expect(chips.locator('[data-agent-id="agent-plan"]').first()).toBeVisible();
  await expect(chips.locator('[data-agent-id="agent-doc"]').first()).toBeVisible();
  await chips.getByTestId('chip-more-actions').click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await clickQuickTask(page, '生成救援方案');
  const plan = page.getByTestId('agent-summon-card').filter({ hasText: '救援方案生成智能体' }).last();
  await expect(plan).toHaveClass(/is-running/);
  await expect(plan).toContainText('任务已完成，执行过程与结果如下', { timeout: 20000 });
  await expect(plan.getByTestId('scenario-sections')).toBeVisible();
  await expect(plan.getByTestId('proposal-result')).toBeVisible();
  await expect(plan.getByRole('button', { name: '查看建议与知识' })).toBeVisible();
  await expect(plan.getByRole('button', { name: '查看文书' })).toBeVisible();
  await expect(page.getByTestId('mock-redhead-document')).toContainText('工程救援处置方案初稿', { timeout: 10000 });
  // 评估需「待复盘」阶段：切到种子阶段已是待复盘的事件后再跑
  await page.getByTestId('new-conversation-btn').click();
  await page.getByTestId('chat-link-incident').click();
  await page.locator('.ant-select-item-option', { hasText: 'G5513边坡滑移处置' }).click();
  await clickQuickTask(page, '评估救援效果');
  const evaluation = page.getByTestId('agent-summon-card').filter({ hasText: '救援效果评估智能体' }).last();
  await expect(evaluation).toContainText('任务已完成，执行过程与结果如下', { timeout: 20000 });
  await expect(evaluation.getByTestId('scenario-sections')).toBeVisible();
  await expect(evaluation.getByRole('button', { name: '查看文书' })).toBeVisible();
  await expect(page.getByTestId('mock-redhead-document')).toBeVisible({ timeout: 10000 });
});
