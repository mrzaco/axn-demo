import { useScheduleStore } from '@/store/scheduleStore';
import { useConversationStore } from '@/store/conversationStore';
import { useSessionStore } from '@/store/sessionStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { incidentById } from '@/seed/scenario';
import { AGENT_INVITATIONS } from '@/seed/agentInvitations';
import { summonAgentInConversation } from './agentConversation';
import { sendMessage } from './taskRunner';

/** 手动模拟触发一次计划，复用真实的原型任务与文件产物链路。 */
export function runScheduledTask(id: string): string | null {
  const plan = useScheduleStore.getState().schedules.find(item => item.id === id);
  if (!plan) return null;
  if (plan.runs.some(run => run.status === 'running')) return null;
  if (useScheduleStore.getState().schedules.some(item => item.runs.some(run => run.status === 'running'))) throw new Error('已有定时任务正在执行，请等待完成');
  if (!incidentById.has(plan.eventId)) throw new Error('关联事件不存在，请先编辑任务');
  if (Object.values(useSessionStore.getState().tasks).some(task => ['queued', 'running'].includes(task.status))
    || Object.values(useMockDocumentStore.getState().libraries).some(library => library.generatingCode)) throw new Error('当前有任务正在执行，请完成后再模拟运行');
  if (plan.agentId) {
    const agent = AGENT_INVITATIONS.find(item => item.agentId === plan.agentId);
    if (!agent) throw new Error('指定的智能体不存在，请先编辑任务');

  }
  const run = useScheduleStore.getState().beginRun(id);
  if (!run) return null;
  const update = (patch: Parameters<ReturnType<typeof useScheduleStore.getState>['updateRun']>[2]) => useScheduleStore.getState().updateRun(id, run.id, patch);
  const conversation = useConversationStore.getState().createConversation({ title: `${plan.name} · ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`, type: 'general', eventId: plan.eventId });
  const sessionId = useSessionStore.getState().sessionByConversation[conversation.id];
  update({ conversationId: conversation.id });
  if (plan.agentId) summonAgentInConversation(sessionId, plan.agentId);
  void sendMessage(sessionId, { text: plan.prompt, agentId: plan.agentId ?? undefined }).then(taskId => {
    if (!taskId) { update({ status: 'failed', finishedAt: new Date().toISOString(), detail: '未匹配可演示的任务，请参考执行内容示例后重试。' }); return; }
    update({ taskId });
    let unsubscribe = () => {};
    const settle = () => {
      const task = useSessionStore.getState().tasks[taskId];
      if (task && ['queued', 'running'].includes(task.status)) return;
      unsubscribe();
      const status = !task || task.status === 'cancelled' ? 'cancelled' : task.status === 'waiting_input' ? 'waiting_input' : task.status === 'succeeded' ? 'succeeded' : 'failed';
      update({ status, finishedAt: new Date().toISOString(), detail: !task ? '来源对话已删除' : task.error?.message ?? (status === 'waiting_input' ? '请前往结果对话补充所需信息' : undefined) });
    };
    unsubscribe = useSessionStore.subscribe(settle);
    settle();
  }).catch(error => {
    const detail = error instanceof Error ? error.message : '执行失败，请重试';
    update({ status: 'failed', finishedAt: new Date().toISOString(), detail });
    if (useSessionStore.getState().sessions[sessionId])
      useSessionStore.getState().appendMessage(sessionId, { sessionId, role: 'assistant', kind: 'text', text: detail, taskId: null });
  });
  return conversation.id;
}
