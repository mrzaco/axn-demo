/**
 * 演示数据重置测试：resetDemoData 确实回到种子状态。
 * 覆盖 store/resetDemo 的收口逻辑（含 sessionStore → documentStore / demoStore 的级联）。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '@/store/resetDemo';
import { useConversationStore } from '@/store/conversationStore';
import { useDemoStore } from '@/store/demoStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSessionStore } from '@/store/sessionStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DEFAULT_SESSION_ID } from '@/seed/scenario';

/** 把各 store 推到偏离种子的状态，用于验证重置确实生效。 */
function dirtyAllStores() {
  useDemoStore.getState().setPace('fast');
  useConversationStore.getState().setActiveNav('library');
  useWorkspaceStore.getState().setDirty('scope-test', true);
  useSessionStore.getState().setLastResourceResult(DEFAULT_SESSION_ID, ['team-001'], 'eta');
  useDocumentStore.getState().addAudit({
    action: 'test',
    actor: 'tester',
    objectId: 'doc-test',
    version: null,
    performedAt: '2026-01-01T00:00:00Z',
    demoClockAt: '2026-01-01T00:00:00Z',
    detail: null,
  });
}

function expectSeedState() {
  expect(useDemoStore.getState().pace).toBe('normal');
  expect(useConversationStore.getState().activeNav).toBe('assistant');
  expect(useWorkspaceStore.getState().isDirty('scope-test')).toBe(false);
  expect(useSessionStore.getState().sessions[DEFAULT_SESSION_ID].lastResourceResultIds).toEqual([]);
  // 文书 / 审计由 sessionStore.resetAll 级联清理（审查 M-10）
  expect(useDocumentStore.getState().audit).toEqual([]);
}

beforeEach(() => {
  resetDemoData();
});

describe('演示数据重置', () => {
  it('resetDemoData 把各 store 恢复到种子状态', () => {
    dirtyAllStores();
    expect(useDemoStore.getState().pace).toBe('fast');

    resetDemoData();

    expectSeedState();
  });

});
