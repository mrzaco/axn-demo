import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App, Breadcrumb, Button, Card, Descriptions, Radio, Result, Select, Space, Steps, Tabs, Tag } from 'antd';
import { ArrowLeft, FileText, Upload, X } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { useKnowledge } from './state';
import { uploadExamples } from './mock';
import { ParsingSettings } from './Settings';

export default function ImportConfig({ mode }: { mode: 'import' | 'config' }) {
  const { libraryId, fileId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { files, setFiles, libraries } = useKnowledge();
  const { message } = App.useApp();
  const file = files.find(item => item.id === fileId);
  const library = libraries.find(item => item.id === (mode === 'import' ? libraryId : file?.libraryId));
  const [method, setMethod] = useState('type');
  const [fileType, setFileType] = useState<keyof typeof uploadExamples>('文本文档');
  const [picked, setPicked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const example = uploadExamples[fileType];
  const batch = params.get('batch')?.split(',').filter(id => files.some(item => item.id === id)) ?? [];
  const back = () => navigate(`/knowledge?library=${library?.id ?? 'product'}`);
  const submit = () => {
    if (mode === 'import' && !picked) { message.info('请先点击上传区域，选择示例文件'); return; }
    if (!library) return;
    setSubmitting(true);
    if (mode === 'import') {
      const id = `${example.id}-${library.id}`;
      setFiles(rows => [{ ...example, id, libraryId: library.id, status: '解析中', tags: ['新导入', '示例资料'], slices: 0, citations: 0, creator: '林沐（示例）', importedAt: '2026-10-16 15:30', sharer: '', sharedAt: '', metadata: '版本=V1.0；生效日期=2026-10-01' }, ...rows.filter(row => row.id !== id)]);
      message.success('已提交模拟解析任务');
    } else message.success(batch.length ? `已为 ${batch.length} 份文件保存配置（演示）` : '文件配置已保存（演示）');
    back();
  };
  if (!library || (mode === 'config' && !file)) return <Result status="404" title="未找到对应资料" extra={<Button onClick={() => navigate('/knowledge')}>返回知识库</Button>} />;
  return <div className="axn-np-section axn-k-page" data-testid={mode === 'import' ? 'knowledge-import' : 'knowledge-config'}>
    <Breadcrumb items={[{ title: <a onClick={back}>知识库管理</a> }, { title: library.name }, { title: mode === 'import' ? '导入文件' : batch.length ? '批量修改配置' : '文件配置' }]} />
    <PageHeader title={mode === 'import' ? '导入文件' : batch.length ? `批量修改配置 · ${batch.length} 份文件` : '文件配置'} sub={mode === 'import' ? '选择示例资料，配置解析与检索方式。' : file?.name} extra={<Button icon={<ArrowLeft size={15} />} onClick={back}>返回文件列表</Button>} />
    <div className="axn-k-editor-layout">
      <div className="axn-k-editor-main">
        {mode === 'import' && <Card title="选择资料" size="small">
          <Tabs activeKey={method} onChange={setMethod} items={[{ key: 'type', label: '按文件类型' }, { key: 'scene', label: '按业务场景' }, { key: 'template', label: '按模板' }]} />
          {method === 'scene' && <div className="axn-k-method"><span>业务场景</span><Select defaultValue="support" options={[{ value: 'support', label: '产品支持与售后' }, { value: 'office', label: '办公制度查询' }, { value: 'policy', label: '政策资料咨询' }]} /></div>}
          {method === 'template' && <div className="axn-k-method"><span>解析模板</span><Select defaultValue="manual" options={[{ value: 'manual', label: '产品手册标准模板' }, { value: 'rules', label: '规章制度通用模板' }, { value: 'table', label: '表格问答模板' }]} /></div>}
          <Radio.Group value={fileType} onChange={event => { setFileType(event.target.value); setPicked(false); }} optionType="button" options={Object.keys(uploadExamples)} />
          <button className="axn-k-upload" onClick={() => setPicked(true)} type="button"><Upload size={28} /><strong>点击选择示例文件，或在此展示拖拽上传</strong><span>{fileType === '文本文档' ? '支持 PDF、DOCX、TXT，单文件不超过 50 MB' : fileType === '表格型知识' ? '支持 XLSX、CSV，单文件不超过 20 MB' : '支持 PNG、JPG，单文件不超过 10 MB'}</span></button>
          {picked && <div className="axn-k-upload-file"><FileText size={18} /><span>{example.name}</span><Tag>{example.size}</Tag><Tag color="blue">待上传</Tag><Button type="text" aria-label="移除待上传文件" icon={<X size={16} />} onClick={() => setPicked(false)} /></div>}
        </Card>}
        <ParsingSettings />
        <div className="axn-k-footer"><Button onClick={() => { message.info('已取消，本次配置未提交'); back(); }}>取消</Button><Button type="primary" loading={submitting} onClick={submit}>{mode === 'import' ? '提交并解析' : '保存配置'}</Button></div>
      </div>
      <aside className="axn-k-editor-side"><Card size="small" title="当前知识库"><Descriptions column={1} items={[{ key: 'name', label: '名称', children: library.name }, { key: 'type', label: '类型', children: library.type }, { key: 'category', label: '分类', children: library.category }, ...(file ? [{ key: 'file', label: '文件', children: file.name }] : [])]} /></Card><Card size="small" title={mode === 'import' ? '导入流程' : '已有解析配置'}>{mode === 'import' ? <Steps direction="vertical" size="small" current={picked ? 1 : 0} items={[{ title: '选择资料', description: '使用预设示例文件' }, { title: '配置解析', description: '设置切片与检索参数' }, { title: '查看结果', description: '返回文件列表查看解析状态' }]} /> : <Space direction="vertical"><span>向量模型：通用文本向量模型</span><span>文字提取、版面分析</span><span>默认切分 · 800 字符</span><span>重叠 80 字符 · 知识增强已开启</span></Space>}</Card></aside>
    </div>
  </div>;
}
