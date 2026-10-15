import { useEffect } from 'react';
import { DOCUMENT_CHECK_INTERVAL, useDocumentReviewStore } from '@/store/documentReviewStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useSessionStore } from '@/store/sessionStore';

/** 常驻推进检查；切换会话、关闭文书都不会中断，刷新后按保存的时点恢复。 */
export default function DocumentReviewSync() {
  const reviews = useDocumentReviewStore(s => s.reviews);
  const libraries = useMockDocumentStore(s => s.libraries);
  const sessions = useSessionStore(s => s.sessions);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [scope, documents] of Object.entries(reviews)) {
      for (const [documentId, review] of Object.entries(documents)) {
        const library = libraries[scope];
        const document = library?.working[documentId] ?? library?.documents.find(doc => doc.id === documentId);
        if (!document) continue;
        useDocumentReviewStore.getState().invalidate(scope, document);
        if (useDocumentReviewStore.getState().reviews[scope]?.[documentId]?.status !== 'running') continue;
        const next = review.startedAt + (review.completedCount + 1) * DOCUMENT_CHECK_INTERVAL;
        timers.push(setTimeout(() => useDocumentReviewStore.getState().advance(scope, documentId, review.runId), Math.max(0, next - Date.now())));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [reviews, libraries]);
  useEffect(() => {
    for (const [scope, documents] of Object.entries(reviews)) {
      const session = sessions[scope];
      if (!session) continue;
      for (const documentId of Object.keys(documents)) {
        if (useSessionStore.getState().sessions[scope]?.messages.some(m => m.reviewDocumentId === documentId)) continue;
        // 检查记录只在生成结束后创建；文书库直接生成也能追加独立检查气泡。
        useSessionStore.getState().appendMessage(scope, {
          sessionId: scope, role: 'assistant', kind: 'text', text: '文书检查', taskId: null, reviewDocumentId: documentId,
        });
      }
    }
  }, [reviews, sessions]);
  return null;
}
