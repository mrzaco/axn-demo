import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App, Breadcrumb, Button, Card, Empty, Form, Input, Modal, Radio, Result, Space, Spin, Tag } from 'antd';
import { ArrowLeft, Clock, Search, Settings } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { useKnowledge } from './state';
import { chunksFor, recallScores, testHistoryFor } from './mock';
import { RetrievalSettings } from './Settings';

export default function HitTest() {
  const { libraryId } = useParams();
  const [params] = useSearchParams();
  const { files, libraries, chunks } = useKnowledge();
  const library = libraries.find(item => item.id === libraryId);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [settings, setSettings] = useState(false);
  const [history, setHistory] = useState(() => testHistoryFor(libraryId));
  const [scenario, setScenario] = useState('success');
  const [result, setResult] = useState<'initial' | 'success' | 'empty'>('initial');
  const [loading, setLoading] = useState(false);
  const [testedQuestion, setTestedQuestion] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const candidates = files.filter(file => file.libraryId === libraryId && file.status === '解析完成').sort((a, b) => Number(b.id === params.get('file')) - Number(a.id === params.get('file')));
  const first = candidates[0];
  const recall = first ? (chunks[first.id] ?? chunksFor(first)).filter(chunk => chunk.enabled).slice(0, 3).map((chunk, index) => ({ file: candidates[index] ?? first, chunk, score: recallScores[index] })) : [];
  // 每个结果使用其来源文件自己的切片，保证详情可定位。
  const results = recall.map((row, index) => ({ ...row, chunk: (chunks[row.file.id] ?? chunksFor(row.file)).filter(chunk => chunk.enabled)[index] ?? row.chunk }));
  const run = () => {
    if (!question.trim()) { message.info('请输入测试问题'); return; }
    setLoading(true); setTestedQuestion(question.trim());
    timer.current = setTimeout(() => {
      const empty = scenario === 'empty' || /未收录|不存在/.test(question) || !results.length;
      setResult(empty ? 'empty' : 'success'); setLoading(false);
      setHistory(rows => [{ id: `h-${Date.now()}`, question: question.trim(), time: '本次演示 · 刚刚', empty }, ...rows].slice(0, 8));
    }, 650);
  };
  if (!library) return <Result status="404" title="未找到对应知识库" extra={<Button onClick={() => navigate('/knowledge')}>返回知识库</Button>} />;
  return <div className="axn-np-section axn-k-page" data-testid="knowledge-hit-test">
    <Breadcrumb items={[{ title: <a onClick={() => navigate(`/knowledge?library=${library.id}`)}>知识库管理</a> }, { title: library.name }, { title: '命中测试' }]} />
    <PageHeader title="命中测试" sub={`当前知识库：${library.name}`} extra={<Button icon={<ArrowLeft size={15} />} onClick={() => navigate(`/knowledge?library=${library.id}`)}>返回文件列表</Button>} />
    <div className="axn-k-test-grid">
      <div><Card title="测试问题" size="small" extra={<Button type="text" icon={<Settings size={15} />} onClick={() => setSettings(true)}>查询设置</Button>}>
        <Input.TextArea aria-label="测试问题" placeholder={`例如：${testHistoryFor(libraryId)[0].question}`} rows={5} maxLength={500} showCount value={question} onChange={event => setQuestion(event.target.value)} />
        <div className="axn-k-test-mode"><span className="axn-k-muted">演示结果</span><Radio.Group value={scenario} onChange={event => setScenario(event.target.value)} options={[{ value: 'success', label: '成功召回' }, { value: 'empty', label: '暂无结果' }]} /></div>
        <Button block type="primary" icon={<Search size={16} />} loading={loading} onClick={run}>开始测试</Button>
      </Card><Card title="测试历史" size="small" className="axn-k-history-card">{history.map(item => <button type="button" className="axn-k-history" key={item.id} onClick={() => { setQuestion(item.question); setScenario(item.empty ? 'empty' : 'success'); }}><strong>{item.question}</strong><span><Clock size={12} /> {item.time}<Tag>{item.empty ? '无结果' : '已召回'}</Tag></span></button>)}</Card></div>
      <Card title="召回结果" size="small" extra={result === 'success' && !loading ? <Tag color="blue">{results.length} 条结果</Tag> : null}>
        {loading ? <div className="axn-k-test-empty"><Spin description="正在模拟检索…" /></div> : result === 'initial' ? <div className="axn-k-test-empty"><Empty description="输入问题，或选择历史记录开始测试" /></div> : result === 'empty' ? <div className="axn-k-test-empty"><Empty description="暂无匹配结果，可调整问题或查询设置后重试" /></div> : <><p className="axn-k-muted">问题：{testedQuestion} · 预设召回结果</p>{results.map((row, index) => <Card key={`${row.file.id}-${row.chunk.id}`} size="small" className="axn-k-result"><div className="axn-k-toolbar"><strong>{index + 1}. {row.file.name}</strong><Tag className="axn-k-status" color="success">匹配分 {row.score.toFixed(2)}</Tag></div><p>{row.chunk.content}</p><div className="axn-k-toolbar"><Space wrap>{row.chunk.keywords.map(word => <Tag key={word}>{word}</Tag>)}</Space><Button type="link" onClick={() => navigate(`/knowledge/files/${row.file.id}/chunks?chunk=${row.chunk.id}`)}>查看详情</Button></div></Card>)}</>}
      </Card>
    </div>
    <Modal title="查询设置" open={settings} onCancel={() => setSettings(false)} onOk={() => { setSettings(false); message.success('查询设置已应用（演示）'); }} okText="应用设置" cancelText="取消" width={580}><Form layout="vertical"><RetrievalSettings /></Form></Modal>
  </div>;
}
