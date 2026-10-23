import type { ResultFile } from './myFiles';
import { EMPTY_LIBRARY, baselineVersion, useMockDocumentStore } from '@/store/mockDocumentStore';
import { useConversationStore } from '@/store/conversationStore';
import { useSessionStore } from '@/store/sessionStore';
import { useDocumentStore } from '@/store/documentStore';
import type { WorkspaceSelection } from '@/store/workspaceStore';
import type { MockDocument } from '@/seed/mockDocuments';

/** 定位原文书；示例文件首次打开时载入文书库，之后沿用同一份内容和版本。 */
export function prepareResultFileEditing(file: ResultFile): { scope: string; selection: WorkspaceSelection } | null {
  if (file.category !== 'documents' || !file.conversationId) return null;
  const conversation = useConversationStore.getState().conversations[file.conversationId];
  if (!conversation) return null;
  if (file.document?.kind === 'draft') {
    const draft = useDocumentStore.getState().drafts[file.document.id];
    if (!draft || draft.lifecycle !== 'draft' || draft.originSessionId !== file.sessionId) return null;
    return { scope: file.sessionId, selection: { ...file.document, kind: 'draft', edit: true } };
  }
  if (file.document?.kind === 'mock') {
    return useMockDocumentStore.getState().libraries[file.sessionId]?.documents.some(document => document.id === file.document!.id)
      ? { scope: file.sessionId, selection: { kind: 'mock', id: file.document.id } } : null;
  }
  if (!file.isExample) return null;
  const scope = useSessionStore.getState().sessionByConversation[conversation.id]
    ?? useSessionStore.getState().ensureSessionForConversation(conversation.id, conversation.eventId ?? `evt-blank-${conversation.id}`);
  const id = `generated-demo-file-${file.id.replace(/^demo-file:/, '')}`;
  const library = useMockDocumentStore.getState().libraries[scope] ?? EMPTY_LIBRARY;
  if (!library.documents.some(document => document.id === id)) {
    const sections = file.content.split('\n\n').filter(block => /^[一二三四五六七八九十]+、/.test(block)).map(block => {
      const [heading, ...body] = block.split('\n');
      return [heading, body.join('\n')] as [string, string];
    });
    const document: MockDocument = {
      id, code: file.title.includes('日报') ? 'DUTY_DAILY' : 'EMERGENCY_BRIEF',
      title: file.title, date: new Date(file.createdAt).toLocaleDateString('zh-CN'),
      number: file.content.match(/模拟报〔[^\n]+/)?.[0] ?? '模拟草稿',
      sections: sections.length ? sections : [['正文', file.content]],
    };
    useMockDocumentStore.setState(state => ({ libraries: { ...state.libraries, [scope]: {
      ...(state.libraries[scope] ?? EMPTY_LIBRARY), documents: [document, ...(state.libraries[scope] ?? EMPTY_LIBRARY).documents],
      versions: { ...(state.libraries[scope] ?? EMPTY_LIBRARY).versions, [id]: [{ ...baselineVersion(document), at: file.createdAt, author: { kind: 'sample' }, source: 'sample' }] },
    } } }));
  }
  return { scope, selection: { kind: 'mock', id } };
}
