import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Alert, Breadcrumb, Button, Card, Dropdown, Empty, Input, Select, Space, Statistic, Table, Tabs, Tag, Tree } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ChevronDown, ChevronUp, Database, Folder, MoreHorizontal, Plus, Search, Upload } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { useKnowledge } from './state';
import { categories, publicCategories, librariesInScope, scopes, statusColors, type KFile, type KScope, type KStatus } from './mock';

export default function KnowledgeHome() {
  const { files, setFiles, libraries, setLibraries, setDialog } = useKnowledge();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const libraryId = params.get('library') ?? '';
  const requestedScope = params.get('scope') ?? libraries.find(lib => lib.id === libraryId)?.scope ?? 'personal';
  const scope = (scopes.some(item => item.key === requestedScope) ? requestedScope : 'personal') as KScope;
  const categoryOptions = scope === 'public' ? publicCategories : categories;
  const library = libraries.find(lib => lib.id === libraryId);
  const [category, setCategory] = useState('all');
  const [statsOpen, setStatsOpen] = useState(true);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string>();
  const [meta, setMeta] = useState<string>();
  const [sharer, setSharer] = useState<string>();
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const scopeLibraries = librariesInScope(libraries, scope);
  const visibleLibraries = scopeLibraries.filter(lib => (!libraryId || lib.id === libraryId) && (category === 'all' || lib.category === category));
  const baseFiles = files.filter(file => visibleLibraries.some(lib => lib.id === file.libraryId));
  const filtered = baseFiles.filter(file => (!name.trim() || file.name.toLowerCase().includes(name.trim().toLowerCase())) && (!status || file.status === status) && (!meta || file.metadata.includes(meta)) && (!sharer || file.sharer === sharer));
  const clearSelection = () => { setSelectedKeys([]); setPage(1); };
  const selectLibrary = (id: string) => { setParams({ scope, ...(id ? { library: id } : {}) }); clearSelection(); };
  const confirmDelete = (ids: React.Key[]) => modal.confirm({ title: `删除 ${ids.length} 份文件？`, content: '将从本次演示列表移除，刷新后恢复示例数据。', okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: () => { setFiles(rows => rows.filter(row => !ids.includes(row.id))); clearSelection(); message.success('文件已删除（演示）'); } });
  const libraryMenu = (id: string) => {
    const lib = libraries.find(item => item.id === id)!;
    return { items: [{ key: 'edit', label: '编辑' }, { key: 'toggle', label: lib.enabled ? '禁用' : '启用' }, { key: 'delete', label: '删除', danger: true }], onClick: ({ key }: { key: string }) => {
      if (key === 'edit') setDialog({ kind: 'library', libraryId: id });
      if (key === 'toggle') { setLibraries(rows => rows.map(row => row.id === id ? { ...row, enabled: !row.enabled } : row)); message.success(`知识库已${lib.enabled ? '禁用' : '启用'}（演示）`); }
      if (key === 'delete') modal.confirm({ title: `删除「${lib.name}」？`, content: '本次演示中的文件和分类展示将同步移除。', okText: '删除', okButtonProps: { danger: true }, cancelText: '取消', onOk: () => { setLibraries(rows => rows.filter(row => row.id !== id)); setFiles(rows => rows.filter(row => row.libraryId !== id)); selectLibrary(''); message.success('知识库已删除（演示）'); } });
    } };
  };
  const action = (key: string, file: KFile) => {
    if (key === 'config') navigate(`/knowledge/files/${file.id}/config`);
    if (key === 'history') setDialog({ kind: 'history', fileIds: [file.id] });
    if (key === 'share') setDialog({ kind: 'share', fileIds: [file.id] });
    if (key === 'download') message.info(`下载「${file.name}」（演示，不生成实际文件）`);
    if (key === 'delete') confirmDelete([file.id]);
    if (key === 'complete') { setFiles(rows => rows.map(row => row.id === file.id ? { ...row, status: '解析完成', slices: 6, failure: undefined } : row)); message.success('已切换为解析完成状态（演示）'); }
  };
  const columns: ColumnsType<KFile> = [
    { title: '文件名称', dataIndex: 'name', width: 250, fixed: 'left', render: (_, row) => <div><Button type="link" className="axn-k-file-link" onClick={() => row.status === '解析完成' ? navigate(`/knowledge/files/${row.id}/chunks`) : message.info(row.failure ?? `当前文件${row.status}，可通过更多操作模拟完成解析`)}>{row.name}</Button>{row.failure && <div className="axn-k-failure">{row.failure}</div>}</div> },
    { title: '所属分类', width: 110, render: (_, row) => libraries.find(lib => lib.id === row.libraryId)?.category },
    { title: '所属知识库', width: 170, render: (_, row) => <Button type="link" size="small" onClick={() => { setCategory('all'); selectLibrary(row.libraryId); }}>{libraries.find(lib => lib.id === row.libraryId)?.name}</Button> },
    { title: '状态', dataIndex: 'status', width: 110, render: (value: KStatus) => <Tag className="axn-k-status" color={statusColors[value]}>{value}</Tag> },
    { title: '文件标签', dataIndex: 'tags', width: 170, render: (value: string[]) => value.map(tag => <Tag key={tag}>{tag}</Tag>) },
    { title: '数据量', dataIndex: 'slices', width: 90, render: value => `${value} 切片` },
    { title: '元数据标注', dataIndex: 'metadata', width: 240 }, { title: '文件格式', dataIndex: 'format', width: 100 }, { title: '文件大小', dataIndex: 'size', width: 100 },
    { title: '创建人', dataIndex: 'creator', width: 130 }, { title: '导入时间', dataIndex: 'importedAt', width: 155 },
    { title: '共享者', dataIndex: 'sharer', width: 130, render: value => value || '—' }, { title: '共享时间', dataIndex: 'sharedAt', width: 155, render: value => value || '—' },
    { title: '操作', width: 145, fixed: 'right', render: (_, row) => <Space size={0}><Button type="link" size="small" disabled={row.status !== '解析完成'} onClick={() => navigate(`/knowledge/files/${row.id}/chunks`)}>查看切片</Button><Dropdown trigger={['click']} menu={{ items: [
      { key: 'config', label: '修改配置' }, { key: 'share', label: '共享' }, { key: 'history', label: '共享历史' }, { key: 'download', label: '下载' },
      ...(row.status !== '解析完成' ? [{ key: 'complete', label: '模拟完成解析' }] : []), { key: 'delete', label: '删除', danger: true },
    ], onClick: ({ key }) => action(key, row) }}><Button type="text" size="small" aria-label={`更多操作 ${row.name}`} icon={<MoreHorizontal size={16} />} /></Dropdown></Space> },
  ];
  const citations = baseFiles.reduce((sum, file) => sum + file.citations, 0);
  const slices = baseFiles.reduce((sum, file) => sum + file.slices, 0);
  const treeData = [{ key: 'all', title: <span><Folder size={14} /> 全部分类 <span className="axn-k-muted">{scopeLibraries.length}</span></span> }, ...categoryOptions.map(title => ({ key: `cat:${title}`, title: <span><Folder size={14} /> {title}</span>, children: scopeLibraries.filter(lib => lib.category === title).map(lib => ({ key: `lib:${lib.id}`, title: <span className="axn-k-tree-library">
        {!lib.enabled && <Tag className="axn-k-library-disabled-tag">已禁用</Tag>}
        <span className={`axn-k-library-name${lib.enabled ? '' : ' is-disabled'}`} title={lib.name}>{lib.name}</span>
        <span className="axn-k-library-menu" onClick={event => event.stopPropagation()}><Dropdown menu={libraryMenu(lib.id)} trigger={['click']}><Button size="small" type="text" aria-label={`${lib.name}菜单`} icon={<MoreHorizontal size={14} />} /></Dropdown></span></span> })) }))];
  return <div className="axn-np-section axn-k-page" data-testid="knowledge-page">
    <PageHeader title="知识库管理" sub="集中管理资料、切片与共享，让知识有序可用。" extra={<Space><Tag>示例数据</Tag><Button type={library ? 'default' : 'primary'} icon={<Plus size={16} />} onClick={() => setDialog({ kind: 'library', scope })}>新建知识库</Button></Space>} />
    <Tabs activeKey={scope} onChange={key => { setParams({ scope: key }); setCategory('all'); setName(''); setStatus(undefined); setMeta(undefined); setSharer(undefined); clearSelection(); }} items={scopes} />
    <div className="axn-k-home-grid">
      <aside className="axn-k-category"><div className="axn-k-section-title"><Database size={17} /> 知识分类</div><Tree key={scope} blockNode defaultExpandAll selectedKeys={[libraryId ? `lib:${libraryId}` : category === 'all' ? 'all' : `cat:${category}`]} treeData={treeData} onSelect={keys => { const key = String(keys[0] ?? 'all'); if (key.startsWith('lib:')) { setCategory('all'); selectLibrary(key.slice(4)); } else { setCategory(key.startsWith('cat:') ? key.slice(4) : 'all'); selectLibrary(''); } }} /></aside>
      <div className="axn-k-main">
        <div className="axn-k-toolbar"><Breadcrumb items={[{ title: scopes.find(item => item.key === scope)?.label }, { title: category === 'all' ? '全部分类' : category }, ...(library ? [{ title: library.name }] : [])]} /><Button type="text" size="small" icon={statsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />} onClick={() => setStatsOpen(value => !value)}>{statsOpen ? '收起统计' : '展开统计'}</Button></div>
        {statsOpen && <div className="axn-k-stats">{[{ title: '知识库数量', value: visibleLibraries.length, suffix: '个' }, { title: '文件数量', value: baseFiles.length, suffix: '份' }, { title: '切片引用次数', value: citations, suffix: '次' }, { title: '切片引用占比', value: slices ? Math.round(citations / slices * 100) : 0, suffix: '%' }].map(item => <Card key={item.title} size="small"><Statistic {...item} /></Card>)}</div>}
        <div className="axn-k-filters">
          <Select allowClear aria-label="文件状态" placeholder="文件状态" value={status} onChange={value => { setStatus(value); clearSelection(); }} options={Object.keys(statusColors).map(value => ({ value, label: value }))} />
          <Input allowClear aria-label="文件名称" prefix={<Search size={15} />} placeholder="搜索文件名称" value={name} onChange={event => { setName(event.target.value); clearSelection(); }} />
          <Select allowClear aria-label="元数据标注" placeholder="元数据标注" value={meta} onChange={value => { setMeta(value); clearSelection(); }} options={['V1.0', 'V2.0', 'V3.0'].map(value => ({ value, label: `版本 ${value}` }))} />
          <Select allowClear aria-label="共享者" placeholder="共享者" value={sharer} onChange={value => { setSharer(value); clearSelection(); }} options={[...new Set(baseFiles.map(file => file.sharer).filter(Boolean))].map(value => ({ value, label: value }))} />
          <Button aria-label="重置筛选" onClick={() => { setName(''); setStatus(undefined); setMeta(undefined); setSharer(undefined); clearSelection(); }}>重置</Button>
        </div>
        <div className="axn-k-toolbar"><Space wrap><Button disabled={!selectedKeys.length} onClick={() => setDialog({ kind: 'share', fileIds: selectedKeys.map(String) })}>批量共享</Button><Button danger disabled={!selectedKeys.length} onClick={() => confirmDelete(selectedKeys)}>批量删除</Button><span className="axn-k-muted">已选 {selectedKeys.length} 项</span></Space>
          {library && <Space wrap><Button onClick={() => setDialog({ kind: 'metadata', libraryId })}>元数据</Button><Button onClick={() => navigate(`/knowledge/library/${libraryId}/test`)}>命中测试</Button><Button disabled={!selectedKeys.length} onClick={() => navigate(`/knowledge/files/${selectedKeys[0]}/config?batch=${selectedKeys.join(',')}`)}>批量修改配置</Button><Button type="primary" icon={<Upload size={15} />} onClick={() => navigate(`/knowledge/library/${libraryId}/import`)}>导入文件</Button></Space>}
        </div>
        {files.some(file => file.id.startsWith('kf-import-') && file.status === '解析中' && baseFiles.includes(file)) && <Alert type="info" showIcon title="文件已进入模拟解析队列" description="在该文件的更多操作中选择“模拟完成解析”，即可查看切片并继续命中测试。" />}
        <Table<KFile> rowKey="id" size="small" columns={columns} dataSource={filtered} scroll={{ x: 2155 }} rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }} locale={{ emptyText: <Empty description={scope === 'unit' ? '单位知识库暂无资料' : '暂无匹配文件'} /> }} pagination={{ current: page, pageSize: 8, total: filtered.length, showSizeChanger: false, showTotal: total => `共 ${total} 份文件`, onChange: setPage }} />
      </div>
    </div>
  </div>;
}
