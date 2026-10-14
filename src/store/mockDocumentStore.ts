import { create } from 'zustand';
import type { ChatMessage } from '@/domain/types';
import { DOCUMENT_CATEGORIES, MOCK_DOCUMENTS, type MockDocument } from '@/seed/mockDocuments';

type GenerationOptions = {
  collect?: () => Promise<void | false>;
  /** 逐条上报「已收齐第几条要素」，驱动气泡里的收集动画（用户 m01044）。
   *  没有自定义 collect 的文书（值班日报/应急要情）由 generate 按 elements 逐条吐。 */
  onCollected?: (count: number) => void;
  sections?: MockDocument['sections'];
  elements: NonNullable<ChatMessage['documentWorkflow']>['elements'];
  onStage: (stage: 'calling' | 'generating') => void;
};
/** 要素收集的节拍：每条 420ms，6 条约 2.5s —— 短到不拖生成，长到看得见进度在走。 */
export const COLLECT_STEP_MS = 420;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
/** 编辑中的工作副本（未保存）按文档 id 存放，离开详情页也不丢；保存或放弃才清除。 */
type Library = { documents: MockDocument[]; selected: MockDocument | null; generatingCode: string | null; working: Record<string, MockDocument> };
export const EMPTY_LIBRARY: Library = { documents: MOCK_DOCUMENTS, selected: null, generatingCode: null, working: {} };
interface MockDocumentState {
  libraries: Record<string, Library>;
  select: (scope: string, document: MockDocument | null) => void;
  update: (scope: string, document: MockDocument) => void;
  setWorking: (scope: string, document: MockDocument) => void;
  clearWorking: (scope: string, documentId: string) => void;
  generate: (scope: string, code: string, options?: GenerationOptions) => Promise<MockDocument | null>;
}

/** 分类按钮与对话快捷操作共用；每个会话单独保存模拟文书与生成状态。 */
export const useMockDocumentStore = create<MockDocumentState>((set, get) => ({
  libraries: {},
  select: (scope, document) => set(state => ({ libraries: {
    ...state.libraries, [scope]: { ...(state.libraries[scope] ?? EMPTY_LIBRARY), selected: document },
  } })),
  update: (scope, document) => set(state => {
    const library = state.libraries[scope] ?? EMPTY_LIBRARY;
    const { [document.id]: _saved, ...working } = library.working;
    return { libraries: { ...state.libraries, [scope]: {
      ...library, documents: library.documents.map(item => item.id === document.id ? document : item),
      selected: document, working,
    } } };
  }),
  setWorking: (scope, document) => set(state => {
    const library = state.libraries[scope] ?? EMPTY_LIBRARY;
    return { libraries: { ...state.libraries, [scope]: { ...library, working: { ...library.working, [document.id]: document } } } };
  }),
  clearWorking: (scope, documentId) => set(state => {
    const library = state.libraries[scope];
    if (!library?.working[documentId]) return state;
    const { [documentId]: _discarded, ...working } = library.working;
    return { libraries: { ...state.libraries, [scope]: { ...library, working } } };
  }),
  generate: async (scope, code, options) => {
    const category = DOCUMENT_CATEGORIES.find(item => item.code === code);
    if (!category || get().libraries[scope]?.generatingCode) return null;
    set(state => ({ libraries: { ...state.libraries, [scope]: {
      ...(state.libraries[scope] ?? EMPTY_LIBRARY), selected: null, generatingCode: code,
    } } }));
    if (options) {
      if (options.collect) {
        if (await options.collect() === false) {
          set(state => ({ libraries: { ...state.libraries, [scope]: { ...state.libraries[scope], generatingCode: null } } }));
          return null;
        }
      } else {
        // 没有自定义收集流程的文书（值班日报/应急要情）：按要素逐条推进。
        // 原来这里只有一段 700ms 死等，气泡里的「收集」看不见任何过程（用户 m01044 要的动画）。
        for (let count = 1; count <= options.elements.length; count += 1) {
          await sleep(COLLECT_STEP_MS);
          options.onCollected?.(count);
        }
      }
      await sleep(700);
      options.onStage('calling');
      await sleep(700);
      options.onStage('generating');
    }
    await sleep(1200);
    const now = new Date();
    // 正文尾部附图与附件表体都按文种挂（不随上传件变）：从同文种的样稿上取。
    const sample = MOCK_DOCUMENTS.find(item => item.code === code);
    const document: MockDocument = {
      id: `generated-${code}-${now.getTime()}`, code,
      title: `${category.topics[0]}（新生成）`,
      date: now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
      number: `${category.prefix}〔${now.getFullYear()}〕模拟草稿`, sections: options?.sections ?? category.sections,
      figures: sample?.figures,
      tables: sample?.tables,
    };
    set(state => ({ libraries: { ...state.libraries, [scope]: {
      ...(state.libraries[scope] ?? EMPTY_LIBRARY),
      documents: [document, ...(state.libraries[scope] ?? EMPTY_LIBRARY).documents],
      selected: document, generatingCode: null,
    } } }));
    return document;
  },
}));
