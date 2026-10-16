import { useEffect, useState } from 'react';
import { App, Button, Checkbox, Descriptions, Empty, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tree, TreeSelect } from 'antd';
import { Plus } from 'lucide-react';
import { useKnowledge } from './state';
import { categories, publicCategories, members, metadataFields, shareHistory } from './mock';

export default function KnowledgeDialogs() {
  const { dialog, setDialog, libraries, setLibraries, files, setFiles } = useKnowledge();
  const { message, modal } = App.useApp();
  const [libraryForm] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const [fields, setFields] = useState(metadataFields);
  const [fieldEditor, setFieldEditor] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [department, setDepartment] = useState('all');
  const [search, setSearch] = useState('');
  const [histories, setHistories] = useState<Record<string, typeof shareHistory>>({});
  const [historyKeys, setHistoryKeys] = useState<React.Key[]>([]);
  const library = libraries.find(lib => lib.id === dialog?.libraryId);
  const categoryOptions = dialog?.scope === 'public' || library?.scope === 'public' ? publicCategories : categories;
  const historyKey = dialog?.fileIds?.[0] ?? 'default';
  const history = histories[historyKey] ?? (files.find(file => file.id === historyKey)?.sharer ? shareHistory : []);
  const close = () => setDialog(null);
  useEffect(() => {
    if (!dialog) return;
    setSearch(''); setSelectedMembers([]); setHistoryKeys([]); setDepartment('all'); setFieldEditor(null);
    if (dialog.kind === 'library') {
      libraryForm.resetFields();
      libraryForm.setFieldsValue(library ?? { type: '图片/文本', category: categoryOptions[0], sensitive: '通用敏感词库' });
    }
  }, [dialog, library, libraryForm, categoryOptions]);
  const saveLibrary = async () => {
    const values = await libraryForm.validateFields().catch(() => null);
    if (!values) return;
    setLibraries(rows => library ? rows.map(row => row.id === library.id ? { ...row, ...values } : row) : [...rows, { ...values, id: `lib-demo-${rows.length + 1}`, enabled: true, scope: dialog?.scope === 'public' ? 'public' : undefined }]);
    message.success(library ? '知识库已更新（演示）' : '知识库已创建（演示）'); close();
  };
  const editField = (id: string) => {
    fieldForm.resetFields(); fieldForm.setFieldsValue(fields.find(field => field.id === id) ?? { type: 'String' }); setFieldEditor(id);
  };
  const saveField = async () => {
    const values = await fieldForm.validateFields().catch(() => null);
    if (!values) return;
    setFields(rows => fieldEditor === 'new' ? [...rows, { ...values, id: `meta-${Date.now()}`, value: '—' }] : rows.map(row => row.id === fieldEditor ? { ...row, ...values } : row));
    setFieldEditor(null); message.success('元数据字段已更新（演示）');
  };
  const cancelSharing = (ids: React.Key[]) => modal.confirm({ title: '取消所选共享？', content: `将模拟取消 ${ids.length} 位成员的共享。`, okText: '确认取消', cancelText: '返回', onOk: () => {
    setHistories(rows => ({ ...rows, [historyKey]: history.map(row => ids.includes(row.id) ? { ...row, status: '已取消', reason: '—' } : row) })); setHistoryKeys([]); message.success('已取消共享（演示）');
  } });
  const share = () => {
    if (!selectedMembers.length) { message.info('请选择共享成员'); return; }
    const ids = dialog?.fileIds ?? [];
    const additions = members.filter(member => selectedMembers.includes(member.id)).map(member => ({ ...member, time: '2026-10-16 15:30', status: '共享成功', reason: '—' }));
    setHistories(previous => {
      const next = { ...previous };
      for (const id of ids) {
        const existing = previous[id] ?? (files.find(file => file.id === id)?.sharer ? shareHistory : []);
        next[id] = [...additions, ...existing.filter(record => !selectedMembers.includes(record.id))];
      }
      return next;
    });
    setFiles(rows => rows.map(row => ids.includes(row.id) ? { ...row, sharer: '林沐（示例）', sharedAt: '2026-10-16 15:30' } : row));
    message.success(`已向 ${selectedMembers.length} 位成员共享 ${ids.length} 份文件（演示）`); close();
  };
  const heading = dialog?.fileIds?.length ? files.find(file => file.id === dialog.fileIds![0])?.name : library?.name;
  const filteredMembers = members.filter(member => (department === 'all' || member.department === department) && (!search.trim() || `${member.name}${member.department}`.includes(search.trim())));
  return <>
    <Modal title={library ? '编辑知识库' : '新建知识库'} open={dialog?.kind === 'library'} onCancel={close} onOk={() => void saveLibrary()} okText="确定" cancelText="取消" width={560}>
      <Form form={libraryForm} layout="vertical">
        <Form.Item label="知识库名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入知识库名称' }]}><Input aria-label="知识库名称" maxLength={50} placeholder="请输入知识库名称" /></Form.Item>
        <Form.Item label="描述" name="description"><Input.TextArea rows={3} maxLength={200} showCount /></Form.Item>
        <Form.Item label="知识类型" name="type"><Select options={['图片/文本', '音视频'].map(value => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="所属分类" name="category"><TreeSelect treeData={categoryOptions.map(value => ({ value, title: value }))} /></Form.Item>
        <Form.Item label="敏感词库" name="sensitive"><Select options={['通用敏感词库', '产品术语词库', '无'].map(value => ({ value, label: value }))} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={`${library?.name ?? '知识库'} · 元数据管理`} open={dialog?.kind === 'metadata'} onCancel={close} footer={<Button aria-label="完成" onClick={close}>完成</Button>} width={640}>
      <div className="axn-k-toolbar"><p className="axn-k-muted">为文件设置统一的描述字段。</p><Button icon={<Plus size={15} />} onClick={() => editField('new')}>新增字段</Button></div>
      <Table size="small" rowKey="id" dataSource={fields} pagination={false} columns={[
        { title: '字段名称', dataIndex: 'name' }, { title: '类型', dataIndex: 'type', render: value => <Tag>{value}</Tag> }, { title: '示例值', dataIndex: 'value' },
        { title: '操作', render: (_, row) => <Space><Button size="small" type="link" onClick={() => editField(row.id)}>编辑</Button><Popconfirm title="删除该元数据字段？" okText="删除" cancelText="取消" onConfirm={() => { setFields(items => items.filter(item => item.id !== row.id)); message.success('字段已删除（演示）'); }}><Button size="small" type="link" danger>删除</Button></Popconfirm></Space> },
      ]} />
    </Modal>
    <Modal title={fieldEditor === 'new' ? '新增元数据字段' : '编辑元数据字段'} open={fieldEditor !== null} onCancel={() => setFieldEditor(null)} onOk={() => void saveField()} okText="保存" cancelText="取消">
      <Form form={fieldForm} layout="vertical"><Form.Item label="字段类型" name="type"><Select options={['String', 'Number', 'Time'].map(value => ({ value, label: value }))} /></Form.Item><Form.Item label="字段名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入字段名称' }]}><Input aria-label="字段名称" maxLength={30} /></Form.Item></Form>
    </Modal>
    <Modal title="共享文件" open={dialog?.kind === 'share'} onCancel={close} onOk={share} okText="确认共享" cancelText="取消" width={740}>
      <p className="axn-k-muted">已选择 {dialog?.fileIds?.length ?? 1} 份文件 · 共享范围仅用于演示</p>
      <Input allowClear placeholder="搜索部门或成员" value={search} onChange={event => setSearch(event.target.value)} />
      <div className="axn-k-share-grid">
        <Tree defaultExpandAll selectedKeys={[department]} onSelect={keys => setDepartment(String(keys[0] ?? 'all'))} treeData={[{ key: 'all', title: '示例单位', children: [...new Set(members.map(member => member.department))].map(title => ({ key: title, title })) }]} />
        <div>{filteredMembers.length ? filteredMembers.map(member => <div key={member.id} className="axn-k-member"><Checkbox checked={selectedMembers.includes(member.id)} onChange={event => setSelectedMembers(rows => event.target.checked ? [...rows, member.id] : rows.filter(id => id !== member.id))}>{member.name}</Checkbox><span className="axn-k-muted">{member.department}</span></div>) : <Empty description="暂无匹配成员" />}</div>
      </div>
      <div className="axn-k-selection">已选 {selectedMembers.length} 人：{members.filter(member => selectedMembers.includes(member.id)).map(member => <Tag key={member.id} closable onClose={() => setSelectedMembers(rows => rows.filter(id => id !== member.id))}>{member.name}</Tag>)}</div>
    </Modal>
    <Modal title="共享历史" open={dialog?.kind === 'history'} onCancel={close} footer={<Button onClick={close}>关闭</Button>} width={920}>
      <p className="axn-k-muted">{heading}</p>
      <div className="axn-k-toolbar"><Input allowClear placeholder="搜索成员名称或部门" value={search} onChange={event => setSearch(event.target.value)} /><Button disabled={!historyKeys.length} onClick={() => cancelSharing(historyKeys)}>批量取消</Button><Button disabled={!history.some(row => row.status !== '已取消')} onClick={() => cancelSharing(history.filter(row => row.status !== '已取消').map(row => row.id))}>全部取消</Button></div>
      <Table rowKey="id" size="small" scroll={{ x: 780 }} dataSource={history.filter(row => `${row.name}${row.department}`.includes(search.trim()))} rowSelection={{ selectedRowKeys: historyKeys, onChange: setHistoryKeys, getCheckboxProps: row => ({ disabled: row.status === '已取消' }) }} pagination={false} columns={[
        { title: '成员名称', dataIndex: 'name' }, { title: '部门', dataIndex: 'department' }, { title: '共享时间', dataIndex: 'time' },
        { title: '共享状态', dataIndex: 'status', render: value => <Tag className="axn-k-status" color={value === '共享成功' ? 'success' : value === '共享失败' ? 'error' : 'default'}>{value}</Tag> },
        { title: '失败原因', dataIndex: 'reason' }, { title: '操作', render: (_, row) => <Button type="link" disabled={row.status === '已取消'} onClick={() => cancelSharing([row.id])}>取消共享</Button> },
      ]} />
    </Modal>
    <Modal title="配置详情" open={dialog?.kind === 'config-detail'} onCancel={close} footer={<Button onClick={close}>关闭</Button>}>
      <Descriptions column={1} bordered size="small" items={[
        { key: 'file', label: '文件', children: heading }, { key: 'model', label: '向量模型', children: '通用文本向量模型 · 示例' },
        { key: 'parse', label: '解析方式', children: '文字提取、版面分析' }, { key: 'split', label: '切片方式', children: '默认切分 · 800 字符 / 重叠 80 字符' },
        { key: 'retrieve', label: '检索方式', children: '混合检索 · 向量权重 0.7' }, { key: 'enhance', label: '知识增强', children: '已开启' },
      ]} />
    </Modal>
  </>;
}
