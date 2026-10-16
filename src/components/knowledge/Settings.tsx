import { useState } from 'react';
import { Card, Checkbox, Form, Input, InputNumber, Radio, Select, Slider, Space, Switch } from 'antd';

export function RetrievalSettings() {
  const [mode, setMode] = useState('hybrid');
  const [rerank, setRerank] = useState(true);
  return <div className="axn-k-settings">
    <Form.Item label="检索方式"><Radio.Group value={mode} onChange={event => setMode(event.target.value)} options={[{ label: '混合检索', value: 'hybrid' }, { label: '向量检索', value: 'vector' }, { label: '全文检索', value: 'text' }]} /></Form.Item>
    {mode === 'hybrid' && <Form.Item label="向量检索权重"><Slider min={0} max={1} step={0.1} defaultValue={0.7} marks={{ 0: '全文优先', 1: '向量优先' }} /></Form.Item>}
    <Form.Item label="启用 Rerank"><Switch checked={rerank} onChange={setRerank} /></Form.Item>
    {rerank && <Form.Item label="Rerank 模型"><Select defaultValue="rerank" options={[{ value: 'rerank', label: '通用重排模型 · 示例' }, { value: 'multi', label: '多语言重排模型 · 示例' }]} /></Form.Item>}
    <div className="axn-k-form-grid"><Form.Item label="召回数量"><InputNumber aria-label="召回数量" defaultValue={5} min={1} max={20} /></Form.Item><Form.Item label="最低匹配分"><InputNumber aria-label="最低匹配分" defaultValue={0.6} step={0.1} min={0} max={1} /></Form.Item></div>
  </div>;
}

/** 导入与文件配置复用；仅维护当前表单的临时选择。 */
export function ParsingSettings() {
  const [split, setSplit] = useState('default');
  return <Form layout="vertical" className="axn-k-settings">
    <Card title="解析设置" size="small">
      <Form.Item label="向量模型"><Select defaultValue="embedding" options={[{ value: 'embedding', label: '通用文本向量模型 · 示例' }, { value: 'multi', label: '多模态向量模型 · 示例' }]} /></Form.Item>
      <Form.Item label="解析选项"><Checkbox.Group defaultValue={['text', 'layout']} options={[{ label: '文字提取', value: 'text' }, { label: '版面分析', value: 'layout' }, { label: '文档图片分析', value: 'image' }, { label: '文档图表解析', value: 'chart' }, { label: '表格深度解析', value: 'table' }]} /></Form.Item>
    </Card>
    <Card title="切片设置" size="small">
      <Form.Item label="切片方式"><Radio.Group value={split} onChange={event => setSplit(event.target.value)} options={[{ label: '默认切分', value: 'default' }, { label: '自定义切片', value: 'custom' }, { label: '父子切片', value: 'parent' }]} /></Form.Item>
      {split === 'default' && <p className="axn-k-muted">按段落结构切分，每片最长 800 字符，重叠 80 字符。</p>}
      {split === 'custom' && <div className="axn-k-form-grid">
        <Form.Item label="分段标识符"><Input defaultValue="\\n\\n" /></Form.Item>
        <Form.Item label="最大长度"><InputNumber aria-label="最大长度" min={100} max={4000} defaultValue={800} addonAfter="字符" /></Form.Item>
        <Form.Item label="重叠度"><InputNumber aria-label="重叠度" min={0} max={300} defaultValue={80} addonAfter="字符" /></Form.Item>
        <Form.Item label="预处理规则"><Checkbox.Group defaultValue={['spaces']} options={[{ label: '清理连续空白', value: 'spaces' }, { label: '移除页眉页脚', value: 'header' }]} /></Form.Item>
      </div>}
      {split === 'parent' && <Space wrap><Form.Item label="父切片长度"><InputNumber min={500} defaultValue={1600} /></Form.Item><Form.Item label="子切片长度"><InputNumber min={100} defaultValue={400} /></Form.Item></Space>}
      <Form.Item label="知识增强" extra="展示关键词提取与知识点生成的配置效果。"><Switch defaultChecked /></Form.Item>
    </Card>
    <Card title="检索设置" size="small"><RetrievalSettings /></Card>
  </Form>;
}
