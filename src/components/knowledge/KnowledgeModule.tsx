import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { KnowledgeContext, type KDialog } from './state';
import { files as mockFiles, libraries as mockLibraries, type KChunk } from './mock';
import KnowledgeHome from './Home';
import ImportConfig from './ImportConfig';
import ChunkPage from './Chunks';
import HitTest from './HitTest';
import KnowledgeDialogs from './Dialogs';
import './knowledge.css';

/** 模块内存状态：页面跳转时可演示联动，离开模块或刷新后恢复 Mock。 */
export default function KnowledgeModule() {
  const [files, setFiles] = useState(mockFiles);
  const [libraries, setLibraries] = useState(mockLibraries);
  const [chunks, setChunks] = useState<Record<string, KChunk[]>>({});
  const [dialog, setDialog] = useState<KDialog>(null);
  return <KnowledgeContext.Provider value={{ files, setFiles, libraries, setLibraries, chunks, setChunks, dialog, setDialog }}>
    <Routes>
      <Route index element={<KnowledgeHome />} />
      <Route path="library/:libraryId/import" element={<ImportConfig mode="import" />} />
      <Route path="library/:libraryId/test" element={<HitTest />} />
      <Route path="files/:fileId/config" element={<ImportConfig mode="config" />} />
      <Route path="files/:fileId/chunks" element={<ChunkPage />} />
      <Route path="*" element={<Navigate to="/knowledge" replace />} />
    </Routes>
    <KnowledgeDialogs />
  </KnowledgeContext.Provider>;
}
