import { beforeEach, describe, expect, it } from 'vitest';
import { prepareResultFileEditing } from '@/services/editResultFile';
import { demoResultFiles } from '@/seed/resultFiles';
import { collectResultFiles } from '@/services/myFiles';
import { useConversationStore } from '@/store/conversationStore';
import { useSessionStore } from '@/store/sessionStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useDocumentStore } from '@/store/documentStore';
import { useDemoStore } from '@/store/demoStore';
import { createEventDocument } from '@/services/documentFactory';
import { resetDemoData } from '@/store/resetDemo';

beforeEach(() => resetDemoData());
const demo = () => demoResultFiles(useConversationStore.getState().conversations, useSessionStore.getState().sessionByConversation, useMockDocumentStore.getState().libraries);
const actual = () => collectResultFiles(useSessionStore.getState(), useMockDocumentStore.getState().libraries, useDocumentStore.getState().drafts, useConversationStore.getState().conversations);

describe('从我的文件继续编辑文书', () => {
  it('示例载入原有工作区，重复打开沿用文书，保存后目录显示修改内容且无重复', () => {
    const file = demo().find(file => file.category === 'documents')!;
    const target = prepareResultFileEditing(file)!;
    expect(target.selection.kind).toBe('mock');
    const original = useMockDocumentStore.getState().libraries[target.scope].documents.find(document => document.id === target.selection.id)!;
    expect(original.title).toBe(file.title);
    expect(original.sections[0][0]).toBe('一、险情概况');
    expect(prepareResultFileEditing(file)).toEqual(target);
    useMockDocumentStore.getState().update(target.scope, { ...original, title: '修改后的南堤处置要情' });
    const updated = actual().find(file => file.document?.id === original.id)!;
    expect(updated.title).toBe('修改后的南堤处置要情');
    expect(updated.content).toContain('修改后的南堤处置要情');
    expect(demo().some(item => item.id === file.id)).toBe(false);
    expect(prepareResultFileEditing(updated)).toEqual(target);
    expect(useMockDocumentStore.getState().libraries[target.scope].documents.filter(document => document.id === original.id)).toHaveLength(1);
  });

  it('原草稿定位正确，已签发草稿不绕过编辑限制', () => {
    const conversation = useConversationStore.getState().createConversation({ title: '原始生成对话', type: 'general', eventId: 'evt-demo-001' });
    const session = useSessionStore.getState().sessionByConversation[conversation.id];
    useDemoStore.getState().addManualFact({ field: 'reportingUnit', value: '清河防汛值班室', scopeKind: 'event', scopeId: 'evt-demo-001', actorId: useDemoStore.getState().actorId });
    const result = createEventDocument(session);
    expect(result.ok).toBe(true);
    const file = actual().find(file => file.document?.id === result.documentId)!;
    expect(prepareResultFileEditing(file)).toEqual({ scope: session, selection: { kind: 'draft', id: result.documentId, edit: true } });
    useDocumentStore.setState(state => ({ drafts: { ...state.drafts, [result.documentId!]: { ...state.drafts[result.documentId!], lifecycle: 'signed' } } }));
    expect(prepareResultFileEditing(file)).toBeNull();
  });

  it('非文书文件和失去来源的旧入口不会打开编辑器', () => {
    expect(prepareResultFileEditing(demo()[0])).toBeNull();
    const file = demo().find(file => file.category === 'documents')!;
    useConversationStore.getState().deleteConversation(file.conversationId!);
    expect(prepareResultFileEditing(file)).toBeNull();
  });
});
