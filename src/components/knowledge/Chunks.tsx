import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App, Breadcrumb, Button, Card, Empty, Form, Input, Modal, Result, Select, Space, Switch, Tabs, Tag } from 'antd';
import { ArrowLeft, Download, Pencil, Plus, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { useKnowledge } from './state';
import { chunksFor, type KChunk } from './mock';

export default function ChunkPage() {
  const { fileId } = useParams();
  const [params] = useSearchParams();
  const { files, setFiles, libraries, chunks, setChunks, setDialog } = useKnowledge();
  const file = files.find(item => item.id === fileId);
  const library = libraries.find(item => item.id === file?.libraryId);
  const rows = file ? chunks[file.id] ?? chunksFor(file) : [];
  const [selectedId, setSelectedId] = useState(params.get('chunk') ?? '');
  const selected = rows.find(row => row.id === selectedId) ?? rows[0];
  const paperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const paper = paperRef.current;
    const section = paper?.querySelector<HTMLElement>('.is-highlighted');
    if (paper && section) paper.scrollTo({ top: Math.max(0, section.offsetTop - paper.offsetTop - 16), behavior: 'smooth' });
  }, [selected?.id]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState<string>();
  const [editing, setEditing] = useState<KChunk | 'new' | null>(null);
  const [content, setContent] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const filtered = rows.filter(row => (tab === 'all' || (tab === 'custom' ? row.custom : !row.custom)) && (!status || row.enabled === (status === 'enabled')) && (!query.trim() || `${row.content}${row.keywords.join('')}`.includes(query.trim())));
  const edit = (row: KChunk | 'new') => { setEditing(row); setContent(row === 'new' ? '' : row.content); setKeywords(row === 'new' ? [] : row.keywords); };
  const save = () => {
    if (!content.trim()) { message.info('请输入切片内容'); return; }
    if (!file || !editing) return;
    const next: KChunk = editing === 'new' ? { id: `${file.id}-custom-${Date.now()}`, title: `自定义切片 ${rows.filter(row => row.custom).length + 1}`, custom: true, enabled: true, content: content.trim(), keywords, points: [`关键词：${keywords.join('、') || '待补充'}`, `来源：${file.name} · 自定义内容`] } : { ...editing, content: content.trim(), keywords };
    const updated = editing === 'new' ? [...rows, next] : rows.map(row => row.id === next.id ? next : row);
    setChunks(all => ({ ...all, [file.id]: updated }));
    setFiles(all => all.map(item => item.id === file.id ? { ...item, slices: updated.length } : item));
    setSelectedId(next.id); setTab('all'); setQuery(''); setStatus(undefined); setEditing(null); message.success('切片已保存（演示）');
  };
  if (!file || !library) return <Result status="404" title="未找到对应文件" extra={<Button onClick={() => navigate('/knowledge')}>返回知识库</Button>} />;
  if (file.status !== '解析完成') return <Result status="info" title={`文件${file.status}`} subTitle={file.failure ?? '完成解析后可查看示例切片。'} extra={<Button onClick={() => navigate(`/knowledge?library=${library.id}`)}>返回文件列表</Button>} />;
  return <div className="axn-np-section axn-k-page" data-testid="knowledge-chunks">
    <Breadcrumb items={[{ title: <a onClick={() => navigate(`/knowledge?library=${library.id}`)}>知识库管理</a> }, { title: library.name }, { title: '切片详情' }]} />
    <PageHeader title="切片详情" sub={file.name} extra={<Space wrap><Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/knowledge?library=${library.id}`)}>返回</Button><Button icon={<Download size={15} />} onClick={() => message.info('下载原文（演示，不生成实际文件）')}>下载原文</Button><Button onClick={() => setDialog({ kind: 'config-detail', fileIds: [file.id] })}>配置详情</Button><Button type="primary" onClick={() => navigate(`/knowledge/library/${library.id}/test?file=${file.id}`)}>命中测试</Button></Space>} />
    <div className="axn-k-chunk-grid">
      <Card title="原文预览" size="small" className="axn-k-original"><div className="axn-k-paper" ref={paperRef}><span className="axn-k-muted">示例资料 · 原文预览</span><h2>{file.name.replace(/\.[^.]+$/, '')}</h2><p className="axn-k-muted">版本 V2.0 · 2026 年 10 月 · 虚构资料</p>{rows.filter(row => !row.custom).map(row => <section key={row.id} className={selected?.id === row.id ? 'is-highlighted' : ''}><h3>{row.title}</h3><p>{row.content}</p></section>)}{selected?.custom && <section className="is-highlighted"><h3>自定义补充</h3><p>{selected.content}</p></section>}</div></Card>
      <Card title={`知识切片 · ${rows.length}`} size="small" extra={<Button size="small" icon={<Plus size={14} />} onClick={() => edit('new')}>新建切片</Button>}>
        <div className="axn-k-chunk-search"><Input allowClear aria-label="搜索切片" prefix={<Search size={15} />} placeholder="搜索内容或关键词" value={query} onChange={event => setQuery(event.target.value)} /><Select allowClear placeholder="状态" aria-label="切片状态" value={status} onChange={setStatus} options={[{ value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已禁用' }]} /></div>
        <Tabs activeKey={tab} onChange={setTab} items={[{ key: 'all', label: `全部 ${rows.length}` }, { key: 'original', label: `原文切片 ${rows.filter(row => !row.custom).length}` }, { key: 'custom', label: `自定义切片 ${rows.filter(row => row.custom).length}` }]} />
        <div className="axn-k-chunk-list">{filtered.map(row => <div key={row.id} className={`axn-k-chunk ${selected?.id === row.id ? 'is-selected' : ''}`}>
          <button className="axn-k-chunk-body" type="button" aria-pressed={selected?.id === row.id} onClick={() => setSelectedId(row.id)}><strong>{row.title}</strong><p>{row.content}</p><span>{row.keywords.map(word => <Tag key={word}>{word}</Tag>)}</span></button>
          <div className="axn-k-chunk-bottom"><span className="axn-k-muted">{row.content.length} 字符 · {row.custom ? '自定义' : '原文'}</span><Space><Switch size="small" checked={row.enabled} aria-label={`启用${row.title}`} onChange={enabled => { setChunks(all => ({ ...all, [file.id]: rows.map(item => item.id === row.id ? { ...item, enabled } : item) })); message.success('切片状态已更新（演示）'); }} /><Button type="text" size="small" aria-label={`编辑${row.title}`} icon={<Pencil size={14} />} onClick={() => edit(row)} /></Space></div>
        </div>)}{!filtered.length && <Empty description="暂无匹配切片" />}</div>
      </Card>
      <Card title="关联知识点" size="small"><Tag color="blue">{selected?.title}</Tag><div className="axn-k-points">{selected?.points.map((point, i) => <div key={point}><span>{String(i + 1).padStart(2, '0')}</span><p>{point}</p></div>)}</div><p className="axn-k-muted">点击中间的切片，可切换原文高亮和知识点。</p><Space direction="vertical" className="axn-k-width-full"><Button block onClick={() => setDialog({ kind: 'share', fileIds: [file.id] })}>共享文件</Button><Button block onClick={() => setDialog({ kind: 'history', fileIds: [file.id] })}>共享历史</Button></Space></Card>
    </div>
    <Modal title={editing === 'new' ? '新增切片' : '编辑切片'} open={!!editing} onCancel={() => setEditing(null)} onOk={save} okText="保存" cancelText="取消" width={640}>
      <Form layout="vertical"><Form.Item label="内容" required><Input.TextArea aria-label="切片内容" rows={7} value={content} onChange={event => setContent(event.target.value)} maxLength={4000} showCount /></Form.Item><p className="axn-k-muted">字符数：{content.length}</p><Form.Item label="关键词"><Select mode="tags" aria-label="切片关键词" value={keywords} onChange={setKeywords} placeholder="输入关键词后按回车" /></Form.Item></Form>
    </Modal>
  </div>;
}
