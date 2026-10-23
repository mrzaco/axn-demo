import { create } from 'zustand';
import { clearPersist, loadPersist, schedulePersist } from './persistence';

export type FeedbackRecord = {
  sessionId: string; targetId: string; sentiment: 'helpful' | 'unhelpful';
  reasons: string[]; detail: string; updatedAt: string;
};
export const feedbackKey = (sessionId: string, targetId: string) => `${sessionId}:${targetId}`;
interface FeedbackState {
  records: Record<string, FeedbackRecord>;
  save: (input: Omit<FeedbackRecord, 'updatedAt'>) => void;
  remove: (sessionId: string, targetId: string) => void;
  removeSession: (sessionId: string) => void;
  reset: () => void;
}
export const useFeedbackStore = create<FeedbackState>((set) => ({
  records: loadPersist<{ records: Record<string, FeedbackRecord> }>('feedback')?.records ?? {},
  save: input => {
    const detail = input.detail.trim().slice(0, 500);
    if (input.sentiment === 'unhelpful' && !input.reasons.length && !detail) throw new Error('请选择原因或填写补充说明');
    const record: FeedbackRecord = { ...input, reasons: input.sentiment === 'helpful' ? [] : [...new Set(input.reasons)], detail: input.sentiment === 'helpful' ? '' : detail, updatedAt: new Date().toISOString() };
    set(state => ({ records: { ...state.records, [feedbackKey(input.sessionId, input.targetId)]: record } }));
  },
  remove: (sessionId, targetId) => set(state => ({ records: Object.fromEntries(Object.entries(state.records).filter(([key]) => key !== feedbackKey(sessionId, targetId))) })),
  removeSession: sessionId => set(state => ({ records: Object.fromEntries(Object.entries(state.records).filter(([, record]) => record.sessionId !== sessionId)) })),
  reset: () => { clearPersist('feedback'); set({ records: {} }); },
}));
useFeedbackStore.subscribe(state => schedulePersist('feedback', { records: state.records }));
