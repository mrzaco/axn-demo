import { useSessionStore } from '@/store/sessionStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useDocumentStore } from '@/store/documentStore';
import { useDocumentReviewStore } from '@/store/documentReviewStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { invalidateRun } from './taskRuns';

const without = <T,>(record: Record<string, T>, keep: (value: T, key: string) => boolean) =>
  Object.fromEntries(Object.entries(record).filter(([key, value]) => keep(value, key)));

/** 删除会话的产物及持久化副本，不影响同一事件下其他对话的文件。 */
export function deleteConversationOutputs(conversationId: string, sessionId: string) {
  const store = useSessionStore.getState();
  const removedTasks = Object.values(store.tasks).filter(task => task.sessionId === sessionId);
  for (const task of removedTasks) invalidateRun(task.taskId);
  const proposalIds = new Set(removedTasks.flatMap(task => task.artifacts.flatMap(artifact => artifact.payload.kind === 'proposal' ? [artifact.payload.proposalId] : [])));
  for (const task of Object.values(store.tasks)) {
    if (task.sessionId === sessionId) continue;
    for (const { payload } of task.artifacts) if (payload.kind === 'proposal') proposalIds.delete(payload.proposalId);
  }
  useSessionStore.setState(state => ({
    tasks: without(state.tasks, task => task.sessionId !== sessionId),
    proposals: without(state.proposals, (_, id) => !proposalIds.has(id)),
    sessionByConversation: without(state.sessionByConversation, (_, id) => id !== conversationId),
    // 保留空上下文，兼容删完最后一个对话时仍读取 currentSession 的界面。
    sessions: state.sessions[sessionId] ? { ...state.sessions, [sessionId]: {
      ...state.sessions[sessionId], messages: [], activeDocumentId: null, selectedProposalId: null,
      pendingClarification: null, candidateResourceIds: [], lastResourceResultIds: [], resourceSortBy: null,
    } } : state.sessions,
  }));
  useMockDocumentStore.setState(state => ({ libraries: without(state.libraries, (_, scope) => scope !== sessionId) }));
  const documentIds = new Set(Object.values(useDocumentStore.getState().drafts).filter(draft => draft.originSessionId === sessionId).map(draft => draft.documentId));
  useDocumentStore.setState(state => ({
    drafts: without(state.drafts, draft => !documentIds.has(draft.documentId)),
    revisions: without(state.revisions, revision => !documentIds.has(revision.documentId)),
    reports: without(state.reports, report => !documentIds.has(report.documentId)),
    activeReportByDocument: without(state.activeReportByDocument, (_, id) => !documentIds.has(id)),
    audit: state.audit.filter(entry => !documentIds.has(entry.objectId)),
  }));
  useDocumentReviewStore.setState(state => ({
    reviews: without(state.reviews, (_, scope) => scope !== sessionId),
    detailsTarget: state.detailsTarget?.scope === sessionId ? null : state.detailsTarget,
    issueTarget: state.issueTarget?.scope === sessionId ? null : state.issueTarget,
  }));
  useWorkspaceStore.setState(state => ({
    scopes: without(state.scopes, (_, scope) => scope !== sessionId),
    modes: without(state.modes, (_, scope) => scope !== sessionId),
    dirty: without(state.dirty, (_, scope) => scope !== sessionId),
  }));
}
