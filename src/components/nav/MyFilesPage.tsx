import { useMemo, useState } from 'react';
import { App as AntdApp, Button, Empty, Input, Modal, Space, Tabs, Tag } from 'antd';
import { Download, FileText, MessagesSquare, Pencil, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import { useSessionStore } from '@/store/sessionStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useDocumentStore } from '@/store/documentStore';
import { useConversationStore } from '@/store/conversationStore';
import { collectResultFiles, FILE_CATEGORIES, fileAgent, groupFilesByConversation, resultFileText, type FileCategory } from '@/services/myFiles';
import { NAV_PATH } from './navRoutes';
import { demoResultFiles, mockFileConversationTitles } from '@/seed/resultFiles';
import { prepareResultFileEditing } from '@/services/editResultFile';
import { useDocumentNavigation } from '@/components/workspace/useDocumentNavigation';

export default function MyFilesPage() {
  const { message } = AntdApp.useApp();
  const navigateDocument = useDocumentNavigation();
  const sessions = useSessionStore(s => s.sessions);
  const tasks = useSessionStore(s => s.tasks);
  const proposals = useSessionStore(s => s.proposals);
  const sessionByConversation = useSessionStore(s => s.sessionByConversation);
  const libraries = useMockDocumentStore(s => s.libraries);
  const drafts = useDocumentStore(s => s.drafts);
  const conversations = useConversationStore(s => s.conversations);
  const [category, setCategory] = useState<FileCategory>('assistant');
  const [keyword, setKeyword] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const navigate = useNavigate();
  const files = useMemo(() => mockFileConversationTitles([
    ...collectResultFiles({ sessions, tasks, proposals, sessionByConversation }, libraries, drafts, conversations),
    ...demoResultFiles(conversations, sessionByConversation, libraries),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    [sessions, tasks, proposals, sessionByConversation, libraries, drafts, conversations]);
  const query = keyword.trim().toLocaleLowerCase();
  const matching = files.filter(file => [file.title, fileAgent(file), file.conversationTitle].join(' ').toLocaleLowerCase().includes(query));
  const filtered = matching.filter(file => file.category === category);
  const groups = groupFilesByConversation(filtered);
  const preview = files.find(file => file.id === previewId);
  const tabs = FILE_CATEGORIES.map(item => ({
    key: item.key, label: `${item.label} (${matching.filter(file => file.category === item.key).length})`,
  }));
  const download = (file: typeof files[number]) => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', resultFileText(file)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const openSource = (conversationId: string) => {
    useConversationStore.getState().selectConversation(conversationId);
    navigate(NAV_PATH.assistant);
  };
  const edit = (file: typeof files[number]) => {
    const target = prepareResultFileEditing(file);
    if (!target) { message.info('该文书当前不可编辑，请查看原文书状态'); return; }
    navigateDocument(target.scope, target.selection, () => {
      if (file.conversationId) useConversationStore.getState().selectConversation(file.conversationId);
    });
  };

  const renderFile = (file: typeof files[number]) => (<article key={file.id} className="axn-file-row">
        <span className="axn-np-icon-tile"><FileText /></span>
        <div className="axn-file-info">
          <h3 className="axn-np-title-sm">{file.title}</h3>
          <div className="axn-file-meta"><span>{fileAgent(file)}</span><span>来源：{file.conversationTitle}</span>
            <time dateTime={file.createdAt}>{new Date(file.createdAt).toLocaleString('zh-CN', { hour12: false })}</time><Tag>TXT</Tag>{file.isExample && <Tag>示例</Tag>}</div>
        </div>
        <Space wrap>
          {file.category === 'documents' && <Button icon={<Pencil size={15} />} disabled={file.document?.kind === 'draft' && drafts[file.document.id]?.lifecycle !== 'draft'} onClick={() => edit(file)} aria-label={`编辑${file.title}`}>编辑</Button>}
          <Button onClick={() => setPreviewId(file.id)} aria-label={`预览${file.title}`}>预览</Button>
          <Button icon={<Download size={15} />} onClick={() => download(file)} aria-label={`下载${file.title}`}>下载</Button>
        </Space>
      </article>
  );

  return <div className="axn-np-section" data-testid="my-files-page">
    <PageHeader title="我的文件" sub="汇集各智能体的工作产物；安小能的文件按对话归档。" extra={<Tag>{files.length} 个结果文件</Tag>} />
    <div className="axn-skills-search-row">
      <Input className="axn-skills-search" allowClear prefix={<Search size={16} />} aria-label="搜索文件"
        placeholder="搜索文件、智能体或来源对话" value={keyword} onChange={event => setKeyword(event.target.value)} />
      <span className="axn-np-count" role="status">共 {filtered.length} 个文件</span>
    </div>
    <Tabs activeKey={category} onChange={key => setCategory(key as FileCategory)} items={tabs} />
    {filtered.length ? category === 'assistant' ? <div className="axn-file-groups">
      {groups.map(group => <section key={group.sessionId} className="axn-file-group" aria-label={`对话：${group.title}`}>
        <div className="axn-file-group-heading">
          <MessagesSquare size={18} aria-hidden />
          <h2 className="axn-np-title-sm">{group.title}</h2>
          <span className="axn-np-count">{group.files.length} 个文件</span>
        </div>
        <div className="axn-files-list">
          {group.files.map(renderFile)}
        </div>
      </section>)}
    </div> : <div className="axn-files-list">{filtered.map(renderFile)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={query ? '没有找到匹配的文件' : '暂无结果文件'}>
      {query ? <Button onClick={() => setKeyword('')}>清空搜索</Button>
        : <Button type="primary" onClick={() => navigate(category === 'assistant' ? NAV_PATH.assistant : NAV_PATH.agents)}>{category === 'assistant' ? '与安小能对话' : '去召唤智能体'}</Button>}
    </Empty>}
    <Modal title={preview?.title ?? '文件预览'} open={!!preview} onCancel={() => setPreviewId(null)} width={760}
      footer={preview ? <Space wrap>
        {preview.category === 'documents' && <Button onClick={() => edit(preview)}>编辑文书</Button>}
        <Button disabled={!preview.conversationId} onClick={() => preview.conversationId && openSource(preview.conversationId)}>返回来源对话</Button>
        <Button type="primary" icon={<Download size={15} />} onClick={() => download(preview)}>下载文本文件</Button>
      </Space> : null}>
      {preview && <><p className="axn-np-meta">{fileAgent(preview)} · {preview.conversationTitle}</p>
        <pre className="axn-file-preview">{preview.content}</pre></>}
    </Modal>
  </div>;
}
