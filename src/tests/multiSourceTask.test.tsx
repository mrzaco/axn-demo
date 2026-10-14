import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { recognize } from '@/services/mock/provider';
import { sendMessage } from '@/services/taskRunner';
import { useSessionStore } from '@/store/sessionStore';
import { useDemoStore } from '@/store/demoStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEFAULT_EVENT_ID } from '@/seed/scenario';
import { stageChipConfig } from '@/seed/quickActionCatalog';
import { ensureQaLoaded } from '@/services/qaKnowledge';

await ensureQaLoaded();

import WorkspaceSync from '@/components/workspace/WorkspaceSync';
import TaskCard from '@/components/chat/TaskCard';

beforeEach(() => {
  useDemoStore.getState().reset();
  useDemoStore.getState().switchEvent(DEFAULT_EVENT_ID);
  useDemoStore.getState().setPace('fast');
  useSessionStore.getState().resetAll();
});
afterEach(cleanup);

describe('独立多源数据汇聚快捷任务', () => {
  it('快捷目录和自然语言走汇聚，摘要和报告语义独立', () => {
    const ctx = { lastResourceResultIds: [], candidateResourceIds: [] };
    expect(stageChipConfig('待研判').primary).toContain('多源数据汇聚');
    expect(recognize('多源数据汇聚', ctx).params.capability).toBe('multiSource');
    expect(recognize('自动整合舆情、气象、水文等多源数据，实现全域灾情信息自动汇总', ctx).params.capability).toBe('multiSource');
    expect(recognize('生成灾情摘要', ctx).params.capability).toBe('disasterSummary');
    expect(recognize('生成态势报告', ctx).params.capability).toBe('situationReport');
  });
  it('直接展示六源与授权域两张表，不生成文书或切换工作区', async () => {
    const sid = useSessionStore.getState().ensureSessionForEvent(DEFAULT_EVENT_ID);
    const beforeDocs = useMockDocumentStore.getState().libraries[sid]?.documents.length ?? 0;
    const beforeWorkspace = useWorkspaceStore.getState().scopes[sid]?.selection;
    render(<WorkspaceSync />);
    const id = await sendMessage(sid, { text: '多源数据汇聚' });
    await expect.poll(() => useSessionStore.getState().tasks[id]?.status, { timeout: 5000 }).toBe('succeeded');
    const task = useSessionStore.getState().tasks[id];
    expect(task.steps.map(s => s.name)).toEqual(['确定授权汇聚范围', '整合六类数据来源', '按事件归并并汇总灾情信息']);
    expect(task.artifacts).toHaveLength(1);
    const result = task.artifacts[0].payload;
    if (result.kind !== 'summary') throw Error('missing aggregation');
    expect(result.displayMode).toBe('multi_source');
    expect(result.rows).toEqual([]);
    expect(result.multiSource?.event.sources).toHaveLength(6);
    expect(result.multiSource?.domainEvents.length).toBeGreaterThan(0);
    expect(useMockDocumentStore.getState().libraries[sid]?.documents.length ?? 0).toBe(beforeDocs);
    expect(useWorkspaceStore.getState().scopes[sid]?.selection).toEqual(beforeWorkspace);
    expect(useWorkspaceStore.getState().scopes[sid]?.generating ?? false).toBe(false);
    render(<MemoryRouter><TaskCard task={task} onOpenDrawer={() => {}} /></MemoryRouter>);
    expect(screen.getByTestId('multi-source-summary')).toBeTruthy();
    expect(screen.queryByTestId('event-summary-text')).toBeNull();
    expect(screen.getByText('全域灾情汇总（授权范围）')).toBeTruthy();
    expect(screen.getAllByRole('table')).toHaveLength(2);
    const eventButton = screen.getAllByRole('button').find(b => b.textContent === result.multiSource!.domainEvents[0].title);
    fireEvent.click(eventButton!);
    expect(await screen.findByText(/授权汇聚$/)).toBeTruthy();
    expect(screen.getAllByText(/V1-demo/).length).toBeGreaterThan(0);
  });
  it('未关联事件时不读取跨域资料', async () => {
    useDemoStore.getState().switchEvent('evt-blank-ms');
    const sid = useSessionStore.getState().ensureSessionForEvent('evt-blank-ms');
    const id = await sendMessage(sid, { text: '多源数据汇聚' });
    await expect.poll(() => useSessionStore.getState().tasks[id]?.status, { timeout: 5000 }).toBe('waiting_input');
    expect(useSessionStore.getState().tasks[id].artifacts).toEqual([]);
  });
});

 describe('现场智能勘察辅助任务', () => {
  it('快捷入口走独立勘察分析，不映射到摘要或补充流程', () => {
    expect(stageChipConfig('待研判').primary).toContain('现场智能勘察辅助');
    expect(recognize('现场智能勘察辅助', { lastResourceResultIds: [], candidateResourceIds: [] }).params.capability).toBe('survey');
  });
  it('同一任务输出可见分析正文及包含三张表的勘察文书', async () => {
    const sid = useSessionStore.getState().ensureSessionForEvent(DEFAULT_EVENT_ID);
    const sync = render(<WorkspaceSync />);
    const id = await sendMessage(sid, { text: '现场智能勘察辅助' });
    await expect.poll(() => useSessionStore.getState().tasks[id]?.status, { timeout: 5000 }).toBe('succeeded');
    const task = useSessionStore.getState().tasks[id];
    expect(task.textAnswer).toContain('现场资料综合分析');
    expect(task.textAnswer).toContain('勘察建议与补证事项');
    const artifact = task.artifacts.find(a => a.payload.kind === 'scenario_sections');
    if (artifact?.payload.kind !== 'scenario_sections') throw Error('missing survey document');
    expect(artifact.payload.capability).toBe('survey');
    expect(artifact.payload.tables).toHaveLength(3);
    const documentId = artifact.payload.documentId;
    const doc = useMockDocumentStore.getState().libraries[sid].documents.find(d => d.id === documentId);
    expect(doc?.code).toBe('SURVEY_ANALYSIS');
    expect(doc?.sections.some(([h,b]) => h.includes('风险与专业指导对照表') && b.includes(' | '))).toBe(true);
    expect(useWorkspaceStore.getState().scopes[sid].selection?.id).toBe(doc?.id);
    sync.unmount();
    useMockDocumentStore.setState({ libraries: {} });
    render(<WorkspaceSync />);
    await expect.poll(() => useMockDocumentStore.getState().libraries[sid]?.documents.some(d => d.id === documentId)).toBe(true);
    render(<MemoryRouter><TaskCard task={task} onOpenDrawer={() => {}} /></MemoryRouter>);
    expect(screen.getByText(/现场资料综合分析/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '查看文书' })).toBeTruthy();
  });
 });

 it('智能编组快捷任务同时输出正文、搭配方案及比较表', async () => {
   const sid = useSessionStore.getState().ensureSessionForEvent(DEFAULT_EVENT_ID);
   render(<WorkspaceSync />);
   const id = await sendMessage(sid, { text: '智能编组推荐' });
   await expect.poll(() => useSessionStore.getState().tasks[id]?.status, { timeout: 5000 }).toBe('succeeded');
   const task = useSessionStore.getState().tasks[id];
   expect(task.textAnswer).toContain('任务与推荐约束');
   expect(task.textAnswer).toContain('道路');
   const artifact = task.artifacts.find(a => a.payload.kind === 'scenario_sections');
   if (artifact?.payload.kind !== 'scenario_sections') throw Error('missing grouping');
   const docId = artifact.payload.documentId;
   expect(artifact.payload.capability).toBe('group');
   expect(useMockDocumentStore.getState().libraries[sid].documents.find(d=>d.id===docId)?.code).toBe('GROUP_RECOMMENDATION');
   render(<MemoryRouter><TaskCard task={task} onOpenDrawer={()=>{}} /></MemoryRouter>);
   expect(screen.getByText(/比较规则与推荐理由/)).toBeTruthy();
   expect(screen.getByRole('button', {name:'查看文书'})).toBeTruthy();
 });
