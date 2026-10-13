import { describe, expect, it } from 'vitest';
import {
  assertQuickActionCatalogValid,
  chipCatalogActions,
  QUICK_ACTION_CATALOG,
  stageChipConfig,
} from '@/seed/quickActionCatalog';
import { AGENT_QUICK_TASKS } from '@/seed/agentQuickTasks';
import { primaryLabelsForStage, loopLabelsForStage } from '@/services/agentFlow';

describe('quickActionCatalog', () => {
  it('配置自洽：stageChips 引用均存在于 actions', () => {
    expect(() => assertQuickActionCatalogValid()).not.toThrow();
  });

  it('AGENT_QUICK_TASKS 与 chip（chat+flow）动作一致', () => {
    expect(AGENT_QUICK_TASKS.map((item) => item.label)).toEqual(
      chipCatalogActions().map((item) => item.label),
    );
  });

  it('研判/投送/救援中主推核心功能；待复盘主推复盘动作', () => {
    expect(stageChipConfig('待研判').primary).toEqual(['生成灾情摘要', '态势研判预警', '生成态势报告', '核对道路天气', '资源建议']);
    expect(primaryLabelsForStage('力量投送中')).toEqual(['查询周边救援资源', '核对资源状态', '物资核验', '生成周边资源报告', '资源建议']);
    expect(primaryLabelsForStage('救援中')[0]).toBe('生成救援方案');
    expect(loopLabelsForStage('救援中')).toEqual([]);
    expect(primaryLabelsForStage('待复盘')).toEqual(['复盘总结', '事件沉淀']);
    expect(loopLabelsForStage('待复盘')).toEqual(['补充态势研判', '返回力量投送']);
    expect(QUICK_ACTION_CATALOG.moreMenu.appendOverallFlow).toBe(false);
    expect(chipCatalogActions().map(item => item.label)).toEqual(expect.arrayContaining(['生成值班日报', '生成会议纪要', '生成日常工作总结']));
  });

  it('moreMenu 按招标四场景排序', () => {
    expect(QUICK_ACTION_CATALOG.moreMenu.scenarioOrder).toEqual([
      'situation',
      'forceDelivery',
      'rescueOps',
      'assistant',
    ]);
  });
});
