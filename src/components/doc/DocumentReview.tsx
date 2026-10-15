import { Button, Descriptions, Progress, Space, Typography } from 'antd';
import { Circle, CircleCheck, LoaderCircle, ShieldCheck } from 'lucide-react';
import { DOCUMENT_CHECK_ITEMS, useDocumentReviewStore, type DocumentReview } from '@/store/documentReviewStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useDocumentNavigation } from '@/components/workspace/useDocumentNavigation';
import type { MockDocument } from '@/seed/mockDocuments';
import './document-review.css';

const { Text, Paragraph, Title } = Typography;
const timeText = (time: number) => new Date(time).toLocaleString('zh-CN', { hour12: false });

function CheckIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  return state === 'done' ? <CircleCheck size={16} aria-hidden /> : state === 'active' ? <LoaderCircle size={16} className="axn-spin" aria-hidden /> : <Circle size={16} aria-hidden />;
}

function ReviewStages({ review }: { review: DocumentReview }) {
  const stale = review.status === 'stale';
  return <div className="doc-review-stages">{[
    { label: '数据校验', start: 0, end: 4 }, { label: '内容初审', start: 4, end: 8 },
  ].map(stage => {
    const done = !stale && review.completedCount >= stage.end;
    const active = !stale && !done && review.completedCount >= stage.start;
    const state = done ? 'done' : active ? 'active' : 'pending';
    return <div key={stage.label} className={`doc-review-stage is-${state}`}>
      <CheckIcon state={state} /><Text>{stage.label}{done ? '通过' : active ? '中' : stale ? '待重新检查' : '待开始'}</Text>
      {active && <Text type="secondary">正在检查{DOCUMENT_CHECK_ITEMS[review.completedCount]?.label}</Text>}
    </div>;
  })}</div>;
}

export function DocumentReviewCard({ scope, documentId }: { scope: string; documentId: string }) {
  const review = useDocumentReviewStore(s => s.reviews[scope]?.[documentId]);
  const document = useMockDocumentStore(s => s.libraries[scope]?.working[documentId] ?? s.libraries[scope]?.documents.find(item => item.id === documentId));
  const openDocument = useDocumentNavigation();
  if (!review || !document) return null;
  const complete = review.status === 'passed';
  const stale = review.status === 'stale';
  const open = (details: boolean) => {
    useDocumentReviewStore.getState().showDetails(details ? { scope, documentId } : null);
    openDocument(scope, { kind: 'mock', id: documentId });
  };
  return <section className="axn-agent-execution doc-review-card" data-testid="document-review-card" aria-live="polite">
    <span className="axn-agent-summon-avatar" aria-hidden><ShieldCheck size={16} /></span>
    <div className="axn-agent-summon-body">
      <div className="axn-agent-summon-head"><span className="axn-agent-summon-name">文书检查</span><span className={`axn-status axn-status--${complete ? 'ok' : stale ? 'warn' : 'busy'}`}><i aria-hidden />{complete ? '已完成' : stale ? '待重新检查' : '检查中'}</span></div>
      <Text type="secondary" className="doc-review-title">《{document.title}》</Text>
      <ReviewStages review={review} />
      <Paragraph className="doc-review-summary">{complete ? '未发现需修改事项，文书待人工确认。' : stale ? '内容已更新，需重新检查。' : '草稿已生成，正在依次进行数据校验与内容初审。'}</Paragraph>
      <Space wrap size={8}>
        <Button size="small" onClick={() => open(false)}>查看文书</Button>
        <Button size="small" onClick={() => open(true)}>查看检查详情</Button>
        {stale && <Button size="small" type="primary" onClick={() => useDocumentReviewStore.getState().start(scope, document)}>重新检查</Button>}
      </Space>
    </div>
  </section>;
}

export function DocumentReviewDetails({ scope, document }: { scope: string; document: MockDocument }) {
  const review = useDocumentReviewStore(s => s.reviews[scope]?.[document.id]);
  if (!review) return null;
  const stale = review.status === 'stale';
  const complete = review.status === 'passed';
  return <div className="doc-review-details" data-testid="document-review-details">
    <div className="doc-review-result-head"><span className="doc-review-result-icon" aria-hidden><ShieldCheck size={24} /></span><div><Title level={4}>{complete ? '文书检查已完成' : stale ? '文书内容已更新' : '文书检查进行中'}</Title><Text type="secondary">{complete ? '数据校验与内容初审均通过，待人工确认。' : stale ? '上次结果已失效，请对当前内容重新检查。' : '先核对数据，再审核内容；草稿可随时查看。'}</Text></div></div>
    <Descriptions size="small" column={1} items={[
      { key: 'document', label: '检查文书', children: review.snapshot.title },
      { key: 'started', label: '开始时间', children: timeText(review.startedAt) },
      ...(review.completedAt && !stale ? [{ key: 'completed', label: '完成时间', children: timeText(review.completedAt) }] : []),
      { key: 'mode', label: '检查方式', children: '模拟检查流程 · 结果仅供演示' },
    ]} />
    {!stale && <Progress percent={Math.round(review.completedCount / DOCUMENT_CHECK_ITEMS.length * 100)} size="small" />}
    {(['data', 'content'] as const).map(phase => <section key={phase} className="doc-review-group"><Title level={5}>{phase === 'data' ? '数据校验' : '内容初审'}</Title><ul>{DOCUMENT_CHECK_ITEMS.map((item, index) => {
      if (item.phase !== phase) return null;
      const done = !stale && index < review.completedCount;
      const active = !stale && index === review.completedCount;
      const state = done ? 'done' : active ? 'active' : 'pending';
      return <li key={item.label} className={`doc-review-check is-${state}`}><CheckIcon state={state} /><div><Text strong>{item.label}</Text><Text type="secondary">{item.detail}</Text></div><span className={`axn-status axn-status--${done ? 'ok' : active ? 'busy' : 'idle'}`}>{done ? '通过' : active ? '检查中' : stale ? '待重新检查' : '待开始'}</span></li>;
    })}</ul></section>)}
    {stale && <Button type="primary" onClick={() => useDocumentReviewStore.getState().start(scope, document)}>重新检查</Button>}
  </div>;
}
