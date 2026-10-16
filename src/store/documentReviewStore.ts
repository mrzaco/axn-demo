import { create } from 'zustand';
import { findReviewIssues, type ReviewIssue } from '@/services/documentReviewScenario';
import { sameMockDocument, type MockDocument } from '@/seed/mockDocuments';
import { clearPersist, loadPersist, schedulePersist } from './persistence';

export const DOCUMENT_CHECK_ITEMS = [
  { label: '数据来源', phase: 'data', detail: '核对文书所引用的资料与来源。' },
  { label: '数字与单位', phase: 'data', detail: '核对人员、设备、数量及计量单位。' },
  { label: '时间信息', phase: 'data', detail: '核对接报时间、数据时点与成文日期。' },
  { label: '关键要素', phase: 'data', detail: '核对地点、事件和处置进展等关键要素。' },
  { label: '文书结构', phase: 'content', detail: '检查标题、章节、正文与落款的完整性。' },
  { label: '表述规范', phase: 'content', detail: '检查用语、措辞和文书表述。' },
  { label: '前后逻辑', phase: 'content', detail: '检查段落衔接与前后表述的一致性。' },
  { label: '结论依据', phase: 'content', detail: '检查结论与所引用资料的对应关系。' },
  { label: '日期格式', phase: 'format', detail: '检查成文日期、落款日期与模板格式的一致性。' },
  { label: '版式要素', phase: 'format', detail: '检查版头、文号、章节序号与落款的完整性。' },
] as const;
export const DOCUMENT_CHECK_INTERVAL = 750;
export type DocumentReview = {
  runId: string;
  snapshot: MockDocument;
  status: 'running' | 'passed' | 'issues' | 'stale';
  issues?: ReviewIssue[];
  completedCount: number;
  startedAt: number;
  completedAt: number | null;
};
type Reviews = Record<string, Record<string, DocumentReview>>;
type ReviewState = {
  reviews: Reviews;
  detailsTarget: { scope: string; documentId: string } | null;
  issueTarget: { scope: string; documentId: string; issueId: string; requestId: number } | null;
  focusIssue: (scope: string, documentId: string, issueId: string) => void;
  start: (scope: string, document: MockDocument) => void;
  advance: (scope: string, documentId: string, runId: string, now?: number) => void;
  invalidate: (scope: string, document: MockDocument) => void;
  showDetails: (target: ReviewState['detailsTarget']) => void;
  reset: () => void;
};
function restoreReviews(): Reviews {
  const reviews = loadPersist<{ reviews: Reviews }>('docreview')?.reviews ?? {};
  for (const documents of Object.values(reviews)) for (const review of Object.values(documents)) {
    review.issues ??= findReviewIssues(review.snapshot);
    // 旧版检查未包含格式审核，不能把旧的通过结果当成完整的新结果。
    if (review.status === 'passed' && review.completedCount < DOCUMENT_CHECK_ITEMS.length) review.status = 'stale';
  }
  return reviews;
}
let serial = 0;
export const useDocumentReviewStore = create<ReviewState>((set) => ({
  reviews: restoreReviews(),
  detailsTarget: null,
  issueTarget: null,
  focusIssue: (scope, documentId, issueId) => set({ detailsTarget: null, issueTarget: { scope, documentId, issueId, requestId: ++serial } }),
  start: (scope, document) => set(state => ({ reviews: {
    ...state.reviews,
    [scope]: { ...state.reviews[scope], [document.id]: {
      runId: `${Date.now()}:${++serial}`, snapshot: document,
      issues: findReviewIssues(document), status: 'running', completedCount: 0, startedAt: Date.now(), completedAt: null,
    } },
  } })),
  advance: (scope, documentId, runId, now = Date.now()) => set(state => {
    const review = state.reviews[scope]?.[documentId];
    if (!review || review.runId !== runId || review.status !== 'running') return state;
    const completedCount = Math.min(DOCUMENT_CHECK_ITEMS.length, Math.max(0, Math.floor((now - review.startedAt) / DOCUMENT_CHECK_INTERVAL)));
    if (completedCount <= review.completedCount) return state;
    const done = completedCount === DOCUMENT_CHECK_ITEMS.length;
    return { reviews: { ...state.reviews, [scope]: { ...state.reviews[scope], [documentId]: {
      ...review, completedCount, status: done ? (review.issues?.length ? 'issues' : 'passed') : 'running', completedAt: done ? now : null,
    } } } };
  }),
  invalidate: (scope, document) => set(state => {
    const review = state.reviews[scope]?.[document.id];
    if (!review || review.status === 'stale' || sameMockDocument(review.snapshot, document)) return state;
    return { reviews: { ...state.reviews, [scope]: { ...state.reviews[scope], [document.id]: { ...review, status: 'stale' } } } };
  }),
  showDetails: detailsTarget => set({ detailsTarget }),
  reset: () => { clearPersist('docreview'); set({ reviews: {}, detailsTarget: null, issueTarget: null }); },
}));
useDocumentReviewStore.subscribe(state => schedulePersist('docreview', { reviews: state.reviews }));
