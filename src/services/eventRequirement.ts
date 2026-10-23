import { AGENT_INVITATIONS } from '@/seed/agentInvitations';
import { agentForIntent, recognize } from './mock/provider';
import { ensureQaLoaded } from './qaKnowledge';

/** 执行前判断是否需要事件，不创建消息或任务。明确的功能入口优先于文本意图。 */
export async function eventRequirement(text: string, context: { lastResourceResultIds: string[]; candidateResourceIds: string[] }, agentId?: string) {
  await ensureQaLoaded();
  const matchedAgent = AGENT_INVITATIONS.find(agent => agent.options.some(option => option.task === text))?.agentId;
  const recognized = recognize(text, context);
  const recognizedAgent = agentForIntent(recognized.intent)?.agentId;
  if (!matchedAgent && !recognizedAgent) return null;
  const owner = agentId ?? matchedAgent ?? recognizedAgent;
  if (!owner || owner === 'agent-doc') return null;
  return { agentId: owner, title: matchedAgent ? text : recognized.displayTitle };
}
