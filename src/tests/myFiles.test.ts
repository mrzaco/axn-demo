import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentTask, TaskArtifactPayload } from '@/domain/types';
import { collectResultFiles, groupFilesByConversation } from '@/services/myFiles';
import { useSessionStore } from '@/store/sessionStore';
import { useMockDocumentStore, EMPTY_LIBRARY } from '@/store/mockDocumentStore';
import { useDocumentStore } from '@/store/documentStore';
import { useConversationStore } from '@/store/conversationStore';
import { resetDemoData } from '@/store/resetDemo';
import { MOCK_DOCUMENTS } from '@/seed/mockDocuments';
import { useDemoStore } from '@/store/demoStore';
import { createEventDocument } from '@/services/documentFactory';
import { runDocumentValidation } from '@/services/documentLifecycle';
import { flushPersist, loadPersist } from '@/store/persistence';
import { demoResultFiles, mockFileConversationTitles } from '@/seed/resultFiles';

beforeEach(() => resetDemoData());
afterEach(() => vi.useRealTimers());
const collect = () => collectResultFiles(useSessionStore.getState(), useMockDocumentStore.getState().libraries, useDocumentStore.getState().drafts, useConversationStore.getState().conversations);
function conversation(title: string) {
  const result = useConversationStore.getState().createConversation({ title, type: 'general', eventId: 'evt-demo-001' });
  return { ...result, sessionId: useSessionStore.getState().sessionByConversation[result.id] };
}
function task(sessionId: string, intent: string, payload?: TaskArtifactPayload, patch: Partial<AgentTask> = {}) {
  const task = useSessionStore.getState().createTask({ sessionId, eventId: 'evt-demo-001', intent, userMessageId: 'user', displayTitle: intent, attempt: 1 });
  useSessionStore.setState(state => ({ tasks: { ...state.tasks, [task.taskId]: { ...task, status: 'succeeded', artifacts: payload ? [{ artifactId: 'artifact', payload }] : [], ...patch } } }));
  return task;
}

describe('我的文件从对话结果汇总', () => {
  it('文件名称与对话分组不使用知识问答这一泛化名称', () => {
    const c = conversation('防汛知识问答');
    task(c.sessionId, 'knowledge', { kind: 'knowledge', chunkIds: [], answer: '现场处置记录', dataTime: 'now' }, { displayTitle: '知识问答' });
    const file = mockFileConversationTitles(collect())[0];
    expect(file.title).toBe('现场处置参考要点');
    expect(file.conversationTitle).toBe('防汛现场处置要点整理');
    expect(file.conversationId).toBe(c.id);
  });

  it('安小能分组使用场景名称，默认对话按产物命名且保留来源关联', () => {
    const c = conversation('新的对话 2');
    task(c.sessionId, 'knowledge', { kind: 'knowledge', chunkIds: [], answer: '工作依据', dataTime: 'now' }, { displayTitle: '解释依据与术语' });
    const files = mockFileConversationTitles([
      ...collect(), ...demoResultFiles(useConversationStore.getState().conversations, useSessionStore.getState().sessionByConversation),
    ]);
    expect(files.find(file => file.conversationId === c.id)).toMatchObject({ conversationTitle: '应急处置依据与术语核对', conversationId: c.id });
    expect(files.filter(file => file.category === 'assistant').every(file => !file.conversationTitle.includes('新的对话'))).toBe(true);
    expect(files.find(file => file.category === 'assistant' && file.conversationId === 'conv-seed-nandi')?.conversationTitle).toBe('南堤险情核实与现场交接');
    expect(useConversationStore.getState().conversations[c.id].title).toBe('新的对话 2');
  });

  it('示例文件覆盖六个分类，绑定有效对话，删除来源后对应示例一并消失', () => {
    const getDemo = () => demoResultFiles(useConversationStore.getState().conversations, useSessionStore.getState().sessionByConversation);
    const before = getDemo();
    expect(before).toHaveLength(15);
    expect(new Set(before.map(file => file.category)).size).toBe(6);
    expect(before.every(file => file.conversationId && file.content.length > 100)).toBe(true);
    useConversationStore.getState().deleteConversation('conv-seed-nandi');
    expect(getDemo()).toHaveLength(before.filter(file => file.conversationId !== 'conv-seed-nandi').length);
    expect(getDemo().some(file => file.conversationId === 'conv-seed-nandi')).toBe(false);
  });

  it('安小能直接产物单独归类，并按对话标识区分同名对话', () => {
    const first = conversation('同名对话');
    const second = conversation('同名对话');
    task(first.sessionId, 'knowledge', { kind: 'knowledge', chunkIds: [], answer: '安小能直接生成的依据说明', dataTime: 'now' });
    task(second.sessionId, 'qa_knowledge', { kind: 'qa_knowledge', qaId: 1, question: '如何识别险情', category: '应急知识', summary: '安小能的知识回答', keyActions: '检查', doNot: '不要冒险', supportAndReporting: '报告', liveDataNeeded: [], confidence: 0.9, answerStatus: '可参考', sources: [], dataTime: 'now' });
    task(first.sessionId, 'evaluation', undefined, { textAnswer: '协同智能体的评估报告' });
    const assistantFiles = collect().filter(file => file.category === 'assistant');
    expect(assistantFiles).toHaveLength(2);
    expect(assistantFiles.every(file => !file.content.includes('协同智能体的评估报告'))).toBe(true);
    const groups = groupFilesByConversation(assistantFiles);
    expect(groups).toHaveLength(2);
    expect(new Set(groups.map(group => group.sessionId)).size).toBe(2);
    expect(groups.every(group => group.title === '同名对话' && group.files.length === 1)).toBe(true);
  });

  it('排除样稿、上传附件、未完成评估和无结果任务', () => {
    const c = conversation('空对话');
    useMockDocumentStore.setState({ libraries: { [c.sessionId]: { ...EMPTY_LIBRARY } } });
    useSessionStore.getState().appendMessage(c.sessionId, { sessionId: c.sessionId, role: 'user', kind: 'text', text: '附件', taskId: null, attachments: [{ name: '上传材料.pdf', size: 10 }] });
    task(c.sessionId, 'evaluation', undefined, { status: 'running', textAnswer: '尚未完成' });
    task(c.sessionId, 'summary');
    expect(collect()).toHaveLength(0);
  });

  it('归类五个智能体的产物，跨对话汇总且保留正确来源', () => {
    const first = conversation('现场处置');
    const second = conversation('阶段复盘');
    const generated = { ...MOCK_DOCUMENTS[0], id: 'generated-DUTY_DAILY-1790000000000', title: '对话生成日报' };
    useMockDocumentStore.setState({ libraries: { [first.sessionId]: { ...EMPTY_LIBRARY, documents: [...MOCK_DOCUMENTS, generated] } } });
    task(first.sessionId, 'summary', { kind: 'summary', eventId: first.eventId!, rows: [{ label: '险情', factId: 'missing', displayOverride: '管涌' }], pendingKeys: [], waterLevelFactId: null, dataTime: 'now', sourceUnavailable: null });
    task(first.sessionId, 'resource_query', { kind: 'resources', eventId: first.eventId!, resourceIds: ['team-001'], sortedBy: null, dataTime: 'now', excluded: [], note: null });
    useSessionStore.getState().addProposal({ proposalId: 'proposal', eventId: first.eventId!, version: 'v1', isMock: true, title: '现场处置方案', sections: [{ id: 'goal', title: '目标', text: '保障安全' }], riskNotes: ['需人工核实'], knowledgeRefs: [], factRefsUsed: [], candidateIds: [], createdAt: '2026-10-01T00:00:00Z' });
    task(first.sessionId, 'proposal', { kind: 'proposal', proposalId: 'proposal', eventId: first.eventId!, version: 'v1', dataTime: 'now' });
    task(second.sessionId, 'evaluation', undefined, { textAnswer: '阶段性评估：继续跟踪剩余风险。' });
    const files = collect();
    expect(files).toHaveLength(5);
    expect(new Set(files.map(file => file.category)).size).toBe(5);
    expect(files.find(file => file.category === 'documents')).toMatchObject({ title: '对话生成日报', conversationId: first.id });
    expect(files.find(file => file.category === 'situation')?.content).toContain('险情：管涌');
    expect(files.find(file => file.category === 'proposals')?.content).toContain('保障安全');
    expect(files.find(file => file.category === 'evaluations')).toMatchObject({ conversationId: second.id, conversationTitle: '阶段复盘' });
  });

  it('失败任务的已完成产物随来源对话删除，其他同事件对话的文件保留', () => {
    const c = conversation('原对话');
    const other = conversation('保留的对话');
    const removed = task(c.sessionId, 'summary', { kind: 'summary', eventId: c.eventId!, rows: [{ label: '情况', factId: 'missing', displayOverride: '已生成的摘要' }], pendingKeys: [], waterLevelFactId: null, dataTime: 'now', sourceUnavailable: null }, { status: 'failed' });
    task(other.sessionId, 'knowledge', { kind: 'knowledge', chunkIds: [], answer: '另一个对话的文件', dataTime: 'now' });
    const generated = { ...MOCK_DOCUMENTS[0], id: 'generated-DUTY_DAILY-1790000000000', title: '待删除文书' };
    useMockDocumentStore.setState({ libraries: { [c.sessionId]: { ...EMPTY_LIBRARY, documents: [generated] } } });
    expect(collect()).toHaveLength(3);
    useConversationStore.getState().deleteConversation(c.id);
    expect(useMockDocumentStore.getState().libraries[c.sessionId]).toBeUndefined();
    expect(useSessionStore.getState().tasks[removed.taskId]).toBeUndefined();
    expect(useSessionStore.getState().sessionByConversation[c.id]).toBeUndefined();
    expect(collect()).toHaveLength(1);
    expect(collect()[0]).toMatchObject({ conversationId: other.id, content: '另一个对话的文件' });
  });

  it('历史残留的孤立产物不会进入文件目录', () => {
    const c = conversation('旧对话');
    task(c.sessionId, 'knowledge', { kind: 'knowledge', chunkIds: [], answer: '旧数据残留', dataTime: 'now' });
    useConversationStore.setState(state => ({ conversations: Object.fromEntries(Object.entries(state.conversations).filter(([id]) => id !== c.id)) }));
    expect(collect()).toHaveLength(0);
  });

  it('删除正式草稿及其版本、检查报告，持久化也不保留文件', () => {
    const c = conversation('带草稿的对话');
    useDemoStore.getState().addManualFact({ field: 'reportingUnit', value: '清河段防汛值班室', scopeKind: 'event', scopeId: 'evt-demo-001', actorId: useDemoStore.getState().actorId });
    const result = createEventDocument(c.sessionId);
    expect(result.ok).toBe(true);
    const id = result.documentId!;
    const report = runDocumentValidation(id)!;
    expect(collect().some(file => file.title === useDocumentStore.getState().drafts[id].title)).toBe(true);
    useConversationStore.getState().deleteConversation(c.id);
    const documents = useDocumentStore.getState();
    expect(documents.drafts[id]).toBeUndefined();
    expect(documents.reports[report.reportId]).toBeUndefined();
    expect(Object.values(documents.revisions).some(revision => revision.documentId === id)).toBe(false);
    flushPersist();
    expect(loadPersist<{ drafts: Record<string, unknown> }>('doc')?.drafts[id]).toBeUndefined();
    expect(collect()).toHaveLength(0);
  });

  it('删除生成中的对话后，异步任务不会重新写回文书', async () => {
    vi.useFakeTimers();
    const c = conversation('正在生成');
    const pending = useMockDocumentStore.getState().generate(c.sessionId, 'DUTY_DAILY');
    useConversationStore.getState().deleteConversation(c.id);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await pending).toBeNull();
    expect(useMockDocumentStore.getState().libraries[c.sessionId]).toBeUndefined();
    expect(collect()).toHaveLength(0);
  });
});
