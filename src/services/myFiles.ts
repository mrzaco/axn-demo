import type { Conversation } from '@/domain/types';
import type { useSessionStore } from '@/store/sessionStore';
import type { useMockDocumentStore } from '@/store/mockDocumentStore';
import type { useDocumentStore } from '@/store/documentStore';
import { teamById } from '@/seed/scenario';
import { factDisplay } from './factLookup';
import { flattenContent } from './validation';
import { richTextToPlain } from './richText';

export const FILE_CATEGORIES = [
  { key: 'assistant', label: '安小能', agent: '安小能' },
  { key: 'documents', label: '文书生成智能体', agent: '文书生成智能体' },
  { key: 'situation', label: '态势感知智能体', agent: '态势感知智能体' },
  { key: 'resources', label: '救援资源管理智能体', agent: '救援资源管理智能体' },
  { key: 'proposals', label: '救援方案生成智能体', agent: '救援方案生成智能体' },
  { key: 'evaluations', label: '救援效果评估智能体', agent: '救援效果评估智能体' },
] as const;
export type FileCategory = typeof FILE_CATEGORIES[number]['key'];
export interface ResultFile {
  id: string;
  title: string;
  category: FileCategory;
  sessionId: string;
  conversationId?: string;
  conversationTitle: string;
  createdAt: string;
  content: string;
  isExample?: boolean;
  document?: { kind: 'mock' | 'draft'; id: string };
}
type SessionData = Pick<ReturnType<typeof useSessionStore.getState>, 'sessions' | 'tasks' | 'proposals' | 'sessionByConversation'>;
type Libraries = ReturnType<typeof useMockDocumentStore.getState>['libraries'];
type Drafts = ReturnType<typeof useDocumentStore.getState>['drafts'];

/** 从已有持久化结果派生文件目录，不复制样稿或上传附件，不另存一套文件状态。 */
export function collectResultFiles(data: SessionData, libraries: Libraries, drafts: Drafts, conversations: Record<string, Conversation>): ResultFile[] {
  const files = new Map<string, ResultFile>();
  const activeSessions = new Set(Object.keys(conversations).map(id => data.sessionByConversation[id]).filter(Boolean));
  const source = (sessionId: string) => {
    const conversation = Object.values(conversations).find(item => data.sessionByConversation[item.id] === sessionId);
    return { sessionId, conversationId: conversation?.id, conversationTitle: conversation?.title ?? '' };
  };
  const add = (file: ResultFile) => { if (file.content.trim()) files.set(file.id, file); };

  for (const [sessionId, library] of Object.entries(libraries)) {
    if (!activeSessions.has(sessionId)) continue;
    for (const document of library.documents) {
      if (!document.id.startsWith('generated-')) continue;
      const history = library.versions[document.id];
      const stamp = Number(document.id.split('-').at(-1));
      const at = history?.at(-1)?.at ?? (Number.isFinite(stamp) ? new Date(stamp).toISOString() : data.sessions[sessionId]?.createdAt ?? '');
      const text = [document.title, document.number, document.date,
        ...document.sections.flatMap(([heading, body]) => [heading, richTextToPlain(body)]),
        ...(document.tables ?? []).flatMap(table => [table.title, table.head.join(' | '), ...table.rows.map(row => [row.group, ...row.cells].filter(Boolean).join(' | '))]),
        ...(document.figures ?? []).map(figure => `附图：${figure.caption}`),
      ].join('\n\n');
      add({ id: `document:${sessionId}:${document.id}`, title: document.title, category: 'documents', ...source(sessionId), createdAt: at, content: text,
        document: { kind: 'mock', id: document.id }, isExample: document.id.startsWith('generated-demo-file-') });
    }
  }
  for (const draft of Object.values(drafts)) {
    if (!activeSessions.has(draft.originSessionId)) continue;
    const content = [draft.working.content.title, ...flattenContent(draft.working.content, draft.snapshot).map(p => p.text), draft.working.content.footerNote].join('\n\n');
    add({ id: `document:${draft.originSessionId}:${draft.documentId}`, title: draft.title, category: 'documents', ...source(draft.originSessionId), createdAt: draft.updatedAt, content,
      document: { kind: 'draft', id: draft.documentId } });
  }
  for (const task of Object.values(data.tasks)) {
    if (!activeSessions.has(task.sessionId)) continue;
    const sections: Partial<Record<FileCategory, string[]>> = {};
    const push = (category: FileCategory, text: string) => { (sections[category] ??= []).push(text); };
    for (const { payload } of task.artifacts) {
      switch (payload.kind) {
        // 这两种产物由安小能直接回答，不经过协同智能体。
        case 'knowledge':
          push('assistant', payload.answer);
          break;
        case 'qa_knowledge':
          push('assistant', [payload.question, payload.summary, '处置要点', payload.keyActions,
            '注意事项', payload.doNot, '保障与报告', payload.supportAndReporting,
            ...payload.sources.map(item => `来源：${item.title} · ${item.section}`)].join('\n\n'));
          break;
        case 'summary':
          push(/^(resource_|candidate_)/.test(task.intent) ? 'resources' : 'situation', payload.rows.map(row => `${row.label}：${row.displayOverride ?? factDisplay(row.factId, { kind: 'event', eventId: payload.eventId })}`).join('\n') + (payload.sourceUnavailable ? `\n${payload.sourceUnavailable}` : ''));
          break;
        case 'resources':
          push('resources', [
            payload.resourceIds.length ? '救援资源清单' : '暂无可用救援资源',
            ...payload.resourceIds.map(id => {
              const team = teamById.get(id);
              const labels: Record<string, string> = { name: '队伍', peopleCount: '人数', excavatorCount: '挖掘机', distanceKm: '距离', etaMinutes: '预计到达', status: '状态', capabilityTags: '能力' };
              return team ? Object.entries(team.factRefs).map(([key, factId]) => `${labels[key] ?? key}：${factDisplay(factId, { kind: 'event', eventId: payload.eventId })}`).join('；') : id;
            }), payload.note,
          ].filter(Boolean).join('\n'));
          break;
        case 'proposal': {
          const proposal = data.proposals[payload.proposalId];
          if (proposal) push('proposals', [proposal.title, ...proposal.sections.flatMap(section => [section.title, section.text]), '风险提示', ...proposal.riskNotes].join('\n\n'));
          break;
        }
      }
    }
    if (task.intent === 'evaluation' && task.status === 'succeeded' && task.textAnswer) push('evaluations', task.textAnswer);
    for (const [category, parts] of Object.entries(sections)) {
      add({ id: `task:${task.taskId}:${category}`, title: task.displayTitle, category: category as FileCategory, ...source(task.sessionId), createdAt: task.finishedAt ?? task.startedAt, content: [...new Set(parts)].join('\n\n') });
    }
  }
  return [...files.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 用会话标识分组，名称相同的不同对话仍分别归档。 */
export function groupFilesByConversation(files: ResultFile[]) {
  const groups = new Map<string, { sessionId: string; title: string; files: ResultFile[] }>();
  for (const file of files) {
    const group = groups.get(file.sessionId) ?? { sessionId: file.sessionId, title: file.conversationTitle, files: [] };
    group.files.push(file);
    groups.set(file.sessionId, group);
  }
  return [...groups.values()];
}

export function fileAgent(file: ResultFile): string {
  return FILE_CATEGORIES.find(category => category.key === file.category)!.agent;
}

export function resultFileText(file: ResultFile): string {
  return `${file.title}\n来源智能体：${fileAgent(file)}\n来源对话：${file.conversationTitle}\n\n${file.content}`;
}
