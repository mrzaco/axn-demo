/**
 * 聊天气泡用例：把标准控件组合成真实对话中的完整回复。
 * 对话版式与智能助理一致（用户浅灰气泡靠右；AI 回复为头像列 + 平铺内容），控件取自 ChatSpecimens。
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Image, Input } from 'antd';
import { ArrowUpRight, Map as MapIcon, Paperclip, RefreshCw, Send } from 'lucide-react';
import { NAV_PATH } from '@/components/nav/navRoutes';
import PageHeader from '@/components/common/PageHeader';
import { agentIcon } from '@/components/chat/agentIcons';
import { CHAT_BUBBLE_EXAMPLES, EXAMPLE_SITE_IMAGES, type BubbleExampleId } from '@/seed/chatBubbleExamples';
import {
  AgentMessage, AssistantMessage, ChoiceChips, Cite, Confidence, FileRow, InlineFlag, KvTable, Notice,
  Prose, ResourceList, RunBar, Section, SourceList, UserMessage, type SpecStep, type Tone,
} from './ChatSpecimens';
import './chat-controls.css';
import './chat-bubble-examples.css';

type DocState = 'running' | 'completed' | 'cancelled';
const DOC_STATUS: Record<DocState, { tone: Tone; label: string }> = {
  running: { tone: 'busy', label: '执行中' }, completed: { tone: 'ok', label: '已完成' }, cancelled: { tone: 'idle', label: '已取消' },
};

function ExampleReply({ id, onPick }: { id: BubbleExampleId; onPick: (id: BubbleExampleId) => void }) {
  const [docState, setDocState] = useState<DocState>('completed');
  const [docOpen, setDocOpen] = useState(false);
  const [retried, setRetried] = useState(false);
  const [docType, setDocType] = useState('情况报告');
  const [submission, setSubmission] = useState<{ unit: string; type: string } | null>(null);
  const example = CHAT_BUBBLE_EXAMPLES.find(item => item.id === id)!;
  const Icon = agentIcon('agentId' in example ? example.agentId : undefined);
  const agent = (children: ReactNode, status?: { tone: Tone; label: string }) =>
    <AgentMessage icon={<Icon size={16} />} name={example.agent} status={status}>{children}</AgentMessage>;

  let reply: ReactNode;
  switch (id) {
    case 'qa':
      reply = <AssistantMessage><Prose>
        <div className="axn-qa-meta"><span className="axn-qa-category">堤防险情</span><Confidence level="mid" value={72} /></div>
        <p className="axn-qa-lead">背水坡出现翻沙鼓水、出水带沙即可判断为管涌，应立即抢筑反滤围井<Cite n={1} />。</p>
        <Section title="建议动作">按「砂—石—土工布」分层铺设反滤料，围井高度以出水不带沙为准。</Section>
        <Section title="禁忌提醒" warn>严禁用不透水材料强行堵塞出口，以免险情转移扩大。</Section>
        <Section title="协同上报">每 30 分钟向防指报告一次出水量与水位变化<Cite n={2} />。</Section>
        <SourceList sources={[
          { title: '堤防工程抢险技术规程', section: '第 4.2 节 · 管涌抢护', excerpt: '发现管涌应立即在出口处抢筑反滤围井，严禁用不透水材料强行堵塞出口。' },
          { title: '防汛应急预案', section: '第 6 章 · 信息报送', excerpt: '险情处置期间，现场每 30 分钟报告一次处置进展。' },
        ]} />
        <p className="axn-qa-disclaimer">AI 生成内容仅供参考，现场处置以指挥体系、现行标准与专业判断为准。</p>
      </Prose></AssistantMessage>;
      break;
    case 'summary':
      reply = agent(<>
        <RunBar title="汇总灾情摘要" status={{ tone: 'ok', label: '已完成' }} meta="2.1s" steps={[
          { name: '读取现场接报', status: 'completed', output: '3 条记录', time: '0.6s' },
          { name: '核对水位与响应等级', status: 'completed', time: '0.9s' },
          { name: '生成摘要', status: 'completed', time: '0.6s' },
        ]} />
        <KvTable rows={[
          { label: '事件地点', value: '清河段 K12+300' },
          { label: '最新水位', value: <>42.3 米<InlineFlag tone="info">建议值</InlineFlag></> },
          { label: '现场力量', value: '2 支队伍 · 36 人' },
          { label: '影响范围', value: <>下游 2 个村<InlineFlag tone="warn">待确认</InlineFlag></> },
        ]} foot="数据来源：现场接报记录、监测台账 · 09:30" actions={<>
          <Button size="small" type="primary" onClick={() => onPick('document')}>生成情况报告</Button>
          <Button size="small" onClick={() => onPick('images')}>查看现场图片</Button>
        </>} />
      </>);
      break;
    case 'images':
      reply = agent(<Prose>
        <p>已收到两张现场照片，按作业进展整理如下。</p>
        <Image.PreviewGroup><div className="axn-controls-images">{EXAMPLE_SITE_IMAGES.map(item => <figure key={item.src}><Image src={item.src} alt={item.caption} width="100%" /><figcaption>{item.caption}</figcaption></figure>)}</div></Image.PreviewGroup>
        <Section title="现场作业">机械正在清理作业面，队伍会商后将分区推进处置<Cite n={1} />。</Section>
        <Section title="后续关注">补充作业区安全边界，并在 30 分钟内回报下一轮进度。</Section>
        <SourceList sources={[{ title: '现场照片回传', section: '09:20 · 2 张', excerpt: '抢险机械清理作业面；现场队伍会商处置方案。' }]} />
      </Prose>);
      break;
    case 'resources':
      reply = agent(<>
        <RunBar title="查询可调派资源" status={{ tone: 'ok', label: '已完成' }} meta="2.4s" steps={[
          { name: '定位事件', status: 'completed' }, { name: '检索队伍与仓库', status: 'completed', output: '命中 3 项' }, { name: '按到达时间排序', status: 'completed' },
        ]} />
        <ResourceList
          summary={{ label: '查询结果', value: '2 支队伍 · 1 处仓库' }}
          items={[
            { name: '清河抢险突击队', kind: 'team', meta: '人员 24 · 挖掘机 2', eta: '18 分钟', dist: '6.2 公里' },
            { name: '城东应急救援队', kind: 'team', meta: '人员 12 · 挖掘机 1', eta: '32 分钟', dist: '11.5 公里' },
            { name: '河东防汛物资库', kind: 'store', meta: '救生衣 · 台账 30 件 / 现场 28 件', flag: <InlineFlag tone="warn">相差 2 件</InlineFlag> },
          ]}
          foot="未列入：北岸支队（已在漳河镇执行任务）"
          actions={<Button size="small" icon={<MapIcon size={14} />}>查看资源与态势</Button>}
        />
        <Notice tone="warn" title="救生衣台账与现场相差 2 件">请核对调拨记录，确认是否有临时借用。</Notice>
      </>);
      break;
    case 'document': {
      const steps: SpecStep[] = [
        { name: '收集资料', status: 'completed', output: '现场回报与物资清单', time: '0.8s' },
        { name: '核对要素', status: docState === 'running' ? 'running' : 'completed', output: docState === 'running' ? undefined : '时间、地点与现场力量' },
        { name: '生成文书', status: docState === 'completed' ? 'completed' : 'pending', output: docState === 'completed' ? '情况报告草稿' : undefined },
      ];
      reply = agent(<>
        <div className="axn-agent-summon-action">
          {docState === 'completed' ? '已根据现场资料生成情况报告，请核对后定稿。' : docState === 'running' ? '资料已收齐，正在核对要素并编制文书。' : '本次生成已停止，已完成的步骤保留如下。'}
        </div>
        <RunBar key={docState} title="生成情况报告" status={DOC_STATUS[docState]} meta={docState === 'completed' ? '6.3s' : undefined} defaultOpen={docState !== 'completed'} steps={steps}
          side={docState === 'running' ? <button type="button" className="axn-task-cancel" onClick={() => setDocState('cancelled')}>停止</button> : undefined} />
        {docState === 'completed' && <FileRow name="清河段堤防险情情况报告" sub="情况报告 · 草稿 · 09:32"
          action={<Button size="small" type="primary" icon={<ArrowUpRight size={14} />} onClick={() => setDocOpen(v => !v)}>{docOpen ? '收起文书' : '查看文书'}</Button>} />}
        {docOpen && docState === 'completed' && <div className="axn-examples-doc">
          <h4>清河段堤防险情情况报告</h4>
          <p>一、基本情况：清河段 K12+300 出现管涌险情，现场已开展排查。</p>
          <p>二、处置进展：2 支队伍、36 人进场，反滤围井抢筑中。</p>
          <p>三、下一步工作：核实影响范围，持续更新监测与处置记录。</p>
        </div>}
        <div className="axn-examples-demo">
          <span>演示状态</span>
          {docState === 'running'
            ? <Button size="small" onClick={() => setDocState('completed')}>模拟完成</Button>
            : <Button size="small" icon={<RefreshCw size={14} />} onClick={() => { setDocState('running'); setDocOpen(false); }}>重新生成</Button>}
        </div>
      </>);
      break;
    }
    case 'input':
      reply = agent(<>
        <div className="axn-agent-summon-action">{submission ? '信息已补全，可以开始生成。' : '已收到现场记录，请选择文书类型并补充报送单位。'}</div>
        <FileRow icon={<Paperclip size={16} />} name="南堤现场记录.docx" sub="24 KB · 已接收" />
        {submission
          ? <>
            <Notice tone="ok" title="补充信息已确认">报送单位：{submission.unit}；文书类型：{submission.type}。</Notice>
            <div><Button size="small" onClick={() => setSubmission(null)}>重新填写</Button></div>
          </>
          : <Form layout="vertical" className="axn-controls-form" onFinish={(values: { unit: string }) => setSubmission({ unit: values.unit.trim(), type: docType })}>
            <Form.Item label="文书类型"><ChoiceChips options={['情况报告', '工作总结', '周工作动态']} value={docType} onChange={setDocType} /></Form.Item>
            <Form.Item name="unit" label="报送单位" rules={[{ required: true, whitespace: true, message: '请输入报送单位' }]}>
              <Input placeholder="例如：南堤现场工作组" maxLength={60} />
            </Form.Item>
            <Button size="small" type="primary" htmlType="submit" icon={<Send size={14} />}>确认并继续</Button>
          </Form>}
      </>, submission ? undefined : { tone: 'warn', label: '待补充' });
      break;
    case 'failure':
      reply = agent(<>
        <RunBar key={String(retried)} title="更新水位监测" defaultOpen={!retried}
          status={retried ? { tone: 'ok', label: '已完成' } : { tone: 'err', label: '执行失败' }}
          steps={[
            { name: '定位监测站点', status: 'completed', time: '0.3s' },
            { name: '获取实时水位', status: retried ? 'completed' : 'failed', output: retried ? '已重新连接并取得数据' : '连接超时（8s）' },
            { name: '更新摘要', status: retried ? 'completed' : 'pending' },
          ]} />
        {retried
          ? <KvTable rows={[{ label: '最新水位', value: '42.35 米' }, { label: '监测时点', value: '09:35' }]} actions={<Button size="small" onClick={() => setRetried(false)}>重新演示异常</Button>} />
          : <>
            <Notice tone="err" title="监测接口连接超时">已保留上一轮数据：42.3 米（09:30），可重试获取最新数据。</Notice>
            <div><Button size="small" type="primary" icon={<RefreshCw size={14} />} onClick={() => setRetried(true)}>重试</Button></div>
          </>}
      </>);
      break;
  }

  return <div className="axn-examples-conversation">
    <UserMessage>{example.prompt}</UserMessage>
    {reply}
  </div>;
}

export default function ChatBubbleExamplesPage() {
  const [selected, setSelected] = useState<BubbleExampleId>('qa');
  const example = CHAT_BUBBLE_EXAMPLES.find(item => item.id === selected)!;
  return <section className="axn-controls-page axn-examples-page" aria-label="聊天气泡用例">
    <nav className="axn-controls-page-nav"><Link to={NAV_PATH.controls}>← 返回标准控件</Link></nav>
    <PageHeader title="聊天气泡用例" sub={`${CHAT_BUBBLE_EXAMPLES.length} 个用例：标准控件组合后在对话中的完整样子，可直接操作。`} />
    <div className="axn-examples-layout">
      <nav className="axn-examples-nav" aria-label="选择气泡用例">{CHAT_BUBBLE_EXAMPLES.map((item, index) => (
        <button key={item.id} type="button" className={`axn-examples-option${selected === item.id ? ' is-selected' : ''}`} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
          <span className="axn-controls-number">{String(index + 1).padStart(2, '0')}</span>
          <span><strong>{item.title}</strong><span>{item.description}</span></span>
        </button>
      ))}</nav>
      <div className="axn-examples-stage">
        <header className="axn-examples-stage-head">
          <h3>{example.title}</h3>
          <span className="axn-examples-components">{example.controls.join(' · ')}</span>
        </header>
        <ExampleReply key={selected} id={selected} onPick={setSelected} />
      </div>
    </div>
  </section>;
}
