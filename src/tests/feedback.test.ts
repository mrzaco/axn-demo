import { beforeEach, describe, expect, it } from 'vitest';
import { feedbackKey, useFeedbackStore } from '@/store/feedbackStore';
import { useConversationStore } from '@/store/conversationStore';
import { useSessionStore } from '@/store/sessionStore';
import { resetDemoData } from '@/store/resetDemo';
import { flushPersist, loadPersist } from '@/store/persistence';

beforeEach(() => resetDemoData());
describe('回答反馈', () => {
  it('分别记录每条回答，切换评价不保留旧原因，支持撤回与持久化', () => {
    const store = useFeedbackStore.getState();
    store.save({ sessionId: 'session-a', targetId: 'task-a', sentiment: 'unhelpful', reasons: ['内容不准确'], detail: '  请核对现场信息  ' });
    store.save({ sessionId: 'session-b', targetId: 'task-a', sentiment: 'helpful', reasons: [], detail: '' });
    expect(useFeedbackStore.getState().records[feedbackKey('session-a', 'task-a')].detail).toBe('请核对现场信息');
    store.save({ sessionId: 'session-a', targetId: 'task-a', sentiment: 'helpful', reasons: ['内容不准确'], detail: '旧内容' });
    expect(useFeedbackStore.getState().records[feedbackKey('session-a', 'task-a')]).toMatchObject({ reasons: [], detail: '', sentiment: 'helpful' });
    flushPersist();
    expect(Object.keys(loadPersist<{ records: object }>('feedback')!.records)).toHaveLength(2);
    store.remove('session-a', 'task-a');
    expect(Object.keys(useFeedbackStore.getState().records)).toHaveLength(1);
    expect(() => store.save({ sessionId: 'a', targetId: 'b', sentiment: 'unhelpful', reasons: [], detail: ' ' })).toThrow();
  });
  it('删除对话清理所属反馈，重置清空全部反馈', () => {
    const c = useConversationStore.getState().createConversation({ title: '反馈对话', type: 'general' });
    const sessionId = useSessionStore.getState().sessionByConversation[c.id];
    useFeedbackStore.getState().save({ sessionId, targetId: 'message', sentiment: 'helpful', reasons: [], detail: '' });
    useConversationStore.getState().deleteConversation(c.id);
    expect(Object.keys(useFeedbackStore.getState().records)).toHaveLength(0);
    useFeedbackStore.getState().save({ sessionId: 'other', targetId: 'other', sentiment: 'helpful', reasons: [], detail: '' });
    resetDemoData();
    expect(Object.keys(useFeedbackStore.getState().records)).toHaveLength(0);
  });
});
