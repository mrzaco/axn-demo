import { describe, expect, it } from 'vitest';
import { AGENT_INVITATIONS } from '@/seed/agentInvitations';
import { WELCOME_QUESTIONS } from '@/seed/welcomeQuestions';
import { eventRequirement } from '@/services/eventRequirement';

const context = { lastResourceResultIds: [], candidateResourceIds: [] };

describe('智能体任务的事件前置引导', () => {
  it.each(AGENT_INVITATIONS.flatMap(agent => agent.options.map(option => ({ ...option, agentId: agent.agentId }))))('$agentId：$label', async ({ task, agentId }) => {
    const result = await eventRequirement(task, context, agentId);
    if (agentId === 'agent-doc') expect(result).toBeNull();
    else expect(result).toMatchObject({ agentId });
  });
  it.each(['生成灾情摘要', '查询周边救援资源', '生成救援方案', '评估救援效果', '生成态势简报'])('直接输入 %s 也需要事件', async text => {
    expect(await eventRequirement(text, context)).not.toBeNull();
  });
  it('专属智能体里的普通知识提问不被关联事件拦截', async () => {
    expect(await eventRequirement(WELCOME_QUESTIONS[0], context, 'agent-situation')).toBeNull();
    expect(await eventRequirement('请生成态势简报', context, 'agent-situation')).toMatchObject({ agentId: 'agent-situation' });
  });
  it.each(['生成应急要情', '生成值班日报', '生成工作总结', '生成应急救援周工作动态', '停止', '你好', ...WELCOME_QUESTIONS])('文书、知识问答和普通输入不触发关联引导：%s', async text => {
    expect(await eventRequirement(text, context)).toBeNull();
  });
});
