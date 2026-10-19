import { useState } from 'react';
import { FileText, Layers, Search } from 'lucide-react';
import { Card, Checkbox, Form, Input, InputNumber, Radio, Select, Slider, Space, Switch } from 'antd';

const retrievalModes = [
  { value: 'hybrid', title: '混合检索', description: '结合语义与关键词，兼顾理解和精确匹配', icon: Layers },
  { value: 'vector', title: '向量检索', description: '理解问题语义，适合相似表达与自然语言提问', icon: Search },
  { value: 'text', title: '全文检索', description: '按关键词匹配，适合名称、编号与专业术语', icon: FileText },
];

export function RetrievalSettings() {
  const [mode, setMode] = useState('hybrid');
  const [weight, setWeight] = useState(70);
  const [rerank, setRerank] = useState(true);
  return <div className="axn-k-settings axn-k-retrieval">
    <Form.Item label="检索方式">
      <Radio.Group className="axn-k-retrieval-modes" value={mode} onChange={event => setMode(event.target.value)}>
        {retrievalModes.map(({ value, title, description, icon: Icon }) => <Radio key={value} value={value} aria-label={title} className="axn-k-retrieval-mode">
          <span className="axn-k-mode-content"><span className="axn-k-mode-title"><Icon size={16} aria-hidden />{title}{value === 'hybrid' && <span className="axn-k-mode-recommend">推荐</span>}</span><span className="axn-k-mode-description">{description}</span></span>
        </Radio>)}
      </Radio.Group>
    </Form.Item>
    {mode === 'hybrid' && <section className="axn-k-weight-panel" aria-label="检索权重">
      <div className="axn-k-setting-heading"><span>检索权重</span><strong>向量 {weight}% <span>／</span> 全文 {100 - weight}%</strong></div>
      <p className="axn-k-setting-description">调整语义理解与关键词匹配的侧重。</p>
      <Slider ariaLabelForHandle="向量检索权重" min={0} max={100} step={10} value={weight} onChange={setWeight} tooltip={{ formatter: value => `向量 ${value}%` }} />
      <div className="axn-k-weight-labels"><span>更侧重全文匹配</span><span>更侧重语义理解</span></div>
    </section>}
    <section className="axn-k-rerank-panel" aria-label="结果重排">
      <div className="axn-k-rerank-heading"><div><div className="axn-k-setting-heading">结果重排 <span className="axn-k-setting-english">Rerank</span></div><p className="axn-k-setting-description">对召回内容再次排序，优先展示更相关的切片。</p></div><Switch aria-label="启用 Rerank" checked={rerank} onChange={setRerank} /></div>
      {rerank && <Form.Item label="Rerank 模型"><Select aria-label="Rerank 模型" defaultValue="rerank" options={[{ value: 'rerank', label: '通用重排模型 · 示例' }, { value: 'multi', label: '多语言重排模型 · 示例' }]} /></Form.Item>}
    </section>
    <div className="axn-k-form-grid axn-k-retrieval-limits">
      <Form.Item label="召回数量" extra="单次最多返回的切片数量，范围 1–20。"><InputNumber aria-label="召回数量" defaultValue={5} min={1} max={20} /></Form.Item>
      <Form.Item label="最低匹配分" extra="仅保留达到此分数的结果，范围 0–1。"><InputNumber aria-label="最低匹配分" defaultValue={0.6} step={0.1} min={0} max={1} /></Form.Item>
    </div>
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
