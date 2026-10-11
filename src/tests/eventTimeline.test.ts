import { describe, expect, it } from 'vitest';
import { buildEventTimeline, formatTimelineForDocument } from '@/services/eventTimeline';
import { splitPipeContent } from '@/services/pipeTable';

describe('eventTimeline', () => {
  it('武陵大道内涝：含接报与水位监测节点', () => {
    const view = buildEventTimeline('evt-vue-nl08');
    expect(view.stageLabel).toBe('救援中');
    expect(view.items.some((item) => item.title === '接报')).toBe(true);
    expect(view.items.filter((item) => item.title === '水位监测')).toHaveLength(3);
    expect(view.items.at(-1)?.tone).toBe('pending');
  });

  it('清河段堤防：用水情观测序列展开时间轴', () => {
    const view = buildEventTimeline('evt-demo-001');
    expect(view.items.some((item) => item.title === '事件接报')).toBe(true);
    expect(view.items.some((item) => item.title === '水位监测')).toBe(true);
    expect(view.items.some((item) => item.detail.includes('米'))).toBe(true);
  });

  it('G5513：覆盖接报到复盘全流程，文书侧输出表格', () => {
    const view = buildEventTimeline('evt-vue-g5513');
    expect(view.items.map((item) => item.title)).toEqual([
      '信息接报', '态势研判', '力量投送', '现场处置', '撤收登记', '待复盘', '复盘总结',
    ]);
    const text = formatTimelineForDocument('evt-vue-g5513');
    const blocks = splitPipeContent(text);
    const table = blocks.find((block) => block.kind === 'table');
    expect(table?.kind).toBe('table');
    if (table?.kind === 'table') {
      expect(table.headers).toEqual(['序号', '时间节点', '环节', '记录详情', '状态']);
      expect(table.rows).toHaveLength(7);
    }
  });
});
