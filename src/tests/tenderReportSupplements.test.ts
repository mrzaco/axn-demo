import { describe, expect, it } from 'vitest';
import {
  evalCapabilitySupplement,
  planCapabilitySupplement,
  resourceCapabilitySupplement,
  situationCapabilitySupplement,
} from '@/services/tenderReportSupplements';
import { splitPipeContent } from '@/services/pipeTable';

const ctx = {
  eventName: 'G5513边坡滑移处置',
  disasterType: '边坡滑移',
  location: 'G5513 边坡路段（演示）',
  risks: '边坡稳定、落石与交通作业风险',
  planTitle: '边坡滑移处置预案（模拟）',
};

describe('tenderReportSupplements', () => {
  it('态势补齐含多源表、响应等级与预警推送', () => {
    const sit = situationCapabilitySupplement(ctx);
    expect(sit.multiSourceAndLevel).toContain('建议响应等级');
    expect(sit.warningPush).toContain('预警推送');
    expect(splitPipeContent(sit.multiSourceAndLevel).some((b) => b.kind === 'table')).toBe(true);
  });

  it('资源补齐含物联网、NL 检索与多约束推荐表', () => {
    const res = resourceCapabilitySupplement(ctx);
    expect(res.full).toContain('物联网');
    expect(res.nlSearch).toMatch(/破拆/);
    expect(res.multiConstraint).toContain('多约束');
  });

  it('方案补齐含预案RAG与安全红线', () => {
    const plan = planCapabilitySupplement(ctx);
    expect(plan.ragAndRules).toContain('预案RAG');
    expect(plan.versionAndRedline).toContain('安全红线');
  });

  it('评估补齐含全维偏差与知识库迭代', () => {
    const evalSup = evalCapabilitySupplement(ctx);
    expect(evalSup.deviationFull).toContain('投送力量');
    expect(evalSup.knowledgeLoop).toContain('知识库迭代');
    expect(evalSup.materialCheck).toContain('真实程度');
  });
});
