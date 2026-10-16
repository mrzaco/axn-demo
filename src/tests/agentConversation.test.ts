import { beforeEach, describe, expect, it } from 'vitest';
import { AGENT_INVITATIONS } from '@/seed/agentInvitations';
import { summonAgentFromManagement, summonAgentInConversation } from '@/services/agentConversation';
import { useConversationStore } from '@/store/conversationStore';
import { useSessionStore } from '@/store/sessionStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { resetDemoData } from '@/store/resetDemo';

beforeEach(() => resetDemoData());

describe('在同一对话召唤智能体', () => {
  it('管理页召唤保留当前对话、事件与历史，且不提前执行任务', () => {
    const conversation = useConversationStore.getState().createConversation({ title: '管理页返回的对话', type: 'general', eventId: 'evt-demo-001' });
    const sessionId = useSessionStore.getState().sessionByConversation[conversation.id];
    const original = useSessionStore.getState().appendMessage(sessionId, { sessionId, role: 'user', kind: 'text', text: '已有需求', taskId: null });
    const before = useConversationStore.getState().conversations;
    for (const agent of AGENT_INVITATIONS) {
      expect(summonAgentFromManagement(agent.agentId)).toMatchObject({ agentId: agent.agentId, choices: agent.options });
    }
    expect(useConversationStore.getState().conversations).toBe(before);
    expect(useConversationStore.getState().activeConversationId).toBe(conversation.id);
    expect(useSessionStore.getState().sessions[sessionId].messages[0]).toEqual(original);
    expect(useSessionStore.getState().sessions[sessionId].eventId).toBe('evt-demo-001');
    expect(Object.keys(useSessionStore.getState().tasks)).toHaveLength(0);
  });

  it('没有当前对话时创建独立对话，后续召唤继续沿用', () => {
    useConversationStore.setState({ conversations: {}, activeConversationId: null });
    expect(summonAgentFromManagement('missing')).toBeNull();
    expect(Object.keys(useConversationStore.getState().conversations)).toHaveLength(0);
    const first = summonAgentFromManagement('agent-doc');
    const second = summonAgentFromManagement('agent-resource');
    expect(first).toMatchObject({ agentId: 'agent-doc' });
    expect(second?.sessionId).toBe(first?.sessionId);
    expect(Object.keys(useConversationStore.getState().conversations)).toHaveLength(1);
  });

  it.each([undefined, 'evt-demo-001'])('多个智能体保留当前对话、事件、已有记录和工作区（事件 %s）', eventId => {
    const conversation = useConversationStore.getState().createConversation({ title: '原对话', type: 'general', eventId });
    const sessionId = useSessionStore.getState().sessionByConversation[conversation.id];
    const original = useSessionStore.getState().appendMessage(sessionId, { sessionId, role: 'user', kind: 'text', text: '保留原来的消息', taskId: null });
    const before = useConversationStore.getState().conversations;
    const workspace = useWorkspaceStore.getState();
    for (const [index, agent] of AGENT_INVITATIONS.entries()) {
      const message = summonAgentInConversation(sessionId, agent.agentId);
      const session = useSessionStore.getState().sessions[sessionId];
      expect(useConversationStore.getState().conversations).toBe(before);
      expect(useConversationStore.getState().activeConversationId).toBe(conversation.id);
      expect(useSessionStore.getState().currentSessionId).toBe(sessionId);
      expect(session.eventId).toBe(conversation.eventId);
      expect(session.messages).toHaveLength(index + 2);
      expect(session.messages[0]).toEqual(original);
      expect(message).toMatchObject({ kind: 'agent', agentId: agent.agentId, choices: agent.options, taskId: null });
      expect(session.messages.at(-1)).toEqual(message);
      expect(useWorkspaceStore.getState()).toBe(workspace);
    }
    expect(Object.keys(useSessionStore.getState().tasks)).toHaveLength(0);
    summonAgentInConversation(sessionId, 'agent-doc');
    expect(useSessionStore.getState().sessions[sessionId].messages).toHaveLength(7);
  });

  it('无效智能体或会话不修改任何状态', () => {
    const before = useSessionStore.getState();
    expect(summonAgentInConversation(before.currentSessionId, 'missing')).toBeNull();
    expect(summonAgentInConversation('missing', 'agent-doc')).toBeNull();
    expect(useSessionStore.getState()).toBe(before);
  });
});
