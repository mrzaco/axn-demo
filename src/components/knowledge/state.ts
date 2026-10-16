import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { KChunk, KFile, KLibrary, KScope } from './mock';
export type KDialog = { kind: 'library' | 'metadata' | 'share' | 'history' | 'config-detail'; libraryId?: string; scope?: KScope; fileIds?: string[] } | null;
export type KnowledgeState = { files: KFile[]; setFiles: Dispatch<SetStateAction<KFile[]>>; libraries: KLibrary[]; setLibraries: Dispatch<SetStateAction<KLibrary[]>>; chunks: Record<string, KChunk[]>; setChunks: Dispatch<SetStateAction<Record<string, KChunk[]>>>; dialog: KDialog; setDialog: Dispatch<SetStateAction<KDialog>> };
export const KnowledgeContext = createContext<KnowledgeState | null>(null);
export function useKnowledge() {
  const value = useContext(KnowledgeContext);
  if (!value) throw new Error('知识库页面未初始化');
  return value;
}
