import { Button, Descriptions, Progress, Space, Typography } from 'antd';
import { Circle, CircleAlert, CircleCheck, Crosshair, LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { DOCUMENT_CHECK_ITEMS, useDocumentReviewStore, type DocumentReview } from '@/store/documentReviewStore';
import { applyReviewDemoFixes } from '@/services/documentReviewScenario';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useDocumentNavigation } from '@/components/workspace/useDocumentNavigation';
import type { MockDocument } from '@/seed/mockDocuments';
import './document-review.css';

const { Text, Paragraph, Title } = Typography;
const timeText = (time: number) => new Date(time).toLocaleString('zh-CN', { hour12: false });
const STAGES = [
  { phase: 'data', label: '数据校验', start: 0, end: 4 },
  { phase: 'content', label: '内容初审', start: 4, end: 8 },
  { phase: 'format', label: '格式审核', start: 8, end: DOCUMENT_CHECK_ITEMS.length },
] as const;
const visibleIssues = (review: DocumentReview) => review.status === 'stale' ? [] : (review.issues ?? []).filter(issue => issue.checkIndex < review.completedCount);
type CheckState = 'done' | 'issue' | 'active' | 'pending';
function CheckIcon({ state }: { state: CheckState }) {
  return state === 'issue' ? <CircleAlert size={16} aria-hidden /> : state === 'done' ? <CircleCheck size={16} aria-hidden /> : state === 'active' ? <LoaderCircle size={16} className="axn-spin" aria-hidden /> : <Circle size={16} aria-hidden />;
}

function ReviewStages({ review }: { review: DocumentReview }) {
  const stale = review.status === 'stale';
  return <div className="doc-review-stages">{STAGES.map(stage => {
    const done = !stale && review.completedCount >= stage.end;
    const count = visibleIssues(review).filter(issue => issue.checkIndex >= stage.start && issue.checkIndex < stage.end).length;
    const active = review.status === 'running' && !done && review.completedCount >= stage.start;
    const state: CheckState = done ? count ? 'issue' : 'done' : active ? 'active' : 'pending';
    return <div key={stage.label} className={`doc-review-stage is-${state}`}>
      <Text className="doc-review-stage-label">{stage.label}</Text>
      <span className="doc-review-stage-value"><CheckIcon state={state} />{done ? count ? `${count} 项问题` : '通过' : active ? '检查中' : stale ? '待重新检查' : '待开始'}</span>
      {active && <span className="doc-review-stage-detail">{DOCUMENT_CHECK_ITEMS[review.completedCount]?.label}</span>}
    </div>;
  })}</div>;
}

export function DocumentReviewCard({ scope, documentId }: { scope: string; documentId: string }) {
  const review = useDocumentReviewStore(s => s.reviews[scope]?.[documentId]);
  const document = useMockDocumentStore(s => s.libraries[scope]?.working[documentId] ?? s.libraries[scope]?.documents.find(item => item.id === documentId));
  const openDocument = useDocumentNavigation();
  if (!review || !document) return null;
  const complete = review.status === 'passed';
  const hasIssues = review.status === 'issues';
  const stale = review.status === 'stale';
  const issues = visibleIssues(review);
  const open = (details: boolean) => {
    useDocumentReviewStore.getState().showDetails(details ? { scope, documentId } : null);
    openDocument(scope, { kind: 'mock', id: documentId });
  };
  return <section className="axn-agent-execution doc-review-card" data-testid="document-review-card" aria-live="polite">
    <span className="axn-agent-summon-avatar" aria-hidden>{hasIssues ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}</span>
    <div className="axn-agent-summon-body">
      <div className="axn-agent-summon-head"><span className="axn-agent-summon-name">文书检查</span><span className={`axn-status axn-status--${complete ? 'ok' : hasIssues ? 'err' : stale ? 'warn' : 'busy'}`}><i aria-hidden />{complete ? '已完成' : hasIssues ? '待修改' : stale ? '待重新检查' : '检查中'}</span></div>
      <Text type="secondary" className="doc-review-title">《{document.title}》</Text>
      <Paragraph className="doc-review-summary">{complete ? '未发现需修改事项，文书待人工确认。' : hasIssues ? `发现 ${issues.length} 项待修改事项，请修改后重新检查。` : stale ? '内容已更新，需重新检查。' : '正在核对文书数据、内容与格式。'}</Paragraph>
      <div className="axn-artifact doc-review-report">
        <ReviewStages review={review} />
        {issues.length > 0 && <div className="doc-review-findings">
          <div className="doc-review-findings-label">待修改事项 <span>{issues.length}</span></div>
          <ol className="doc-review-issue-summary">{issues.map(issue => <li key={issue.id}><button type="button" className="doc-review-issue-link" aria-label={`定位${issue.title}`} onClick={() => openDocument(scope, { kind: 'mock', id: documentId }, () => useDocumentReviewStore.getState().focusIssue(scope, documentId, issue.id))}><strong>{issue.title}<Crosshair size={14} aria-hidden /></strong><span>{issue.location}</span></button></li>)}</ol>
        </div>}
        <div className="axn-artifact-actions">
          <Button size="small" type={hasIssues ? 'primary' : 'default'} onClick={() => open(true)}>查看检查详情</Button>
          <Button size="small" onClick={() => open(false)}>查看文书</Button>
          {(stale || hasIssues) && <Button size="small" type="text" onClick={() => useDocumentReviewStore.getState().start(scope, document)}>重新检查</Button>}
        </div>
      </div>
    </div>
  </section>;
}

export function DocumentReviewDetails({ scope, document }: { scope: string; document: MockDocument }) {
  const review = useDocumentReviewStore(s => s.reviews[scope]?.[document.id]);
  if (!review) return null;
  const stale = review.status === 'stale';
  const complete = review.status === 'passed';
  const hasIssues = review.status === 'issues';
  const issues = visibleIssues(review);
  const applyFixes = () => {
    const current = useMockDocumentStore.getState().libraries[scope];
    const latest = current?.working[document.id] ?? current?.documents.find(item => item.id === document.id);
    if (!latest) return;
    const fixed = applyReviewDemoFixes(latest);
    useMockDocumentStore.getState().setWorking(scope, fixed);
    useDocumentReviewStore.getState().start(scope, fixed);
  };
  return <div className="doc-review-details" data-testid="document-review-details">
    <div className={`doc-review-result-head${hasIssues ? ' has-issues' : ''}`}><span className="doc-review-result-icon" aria-hidden>{hasIssues ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}</span><div><Title level={4}>{complete ? '文书检查已完成' : hasIssues ? `发现 ${issues.length} 项待修改事项` : stale ? '文书内容已更新' : '文书检查进行中'}</Title><Text type="secondary">{complete ? '数据校验、内容初审与格式审核均通过，待人工确认。' : hasIssues ? '数据与格式存在问题，请核对原文并修改后重新检查。' : stale ? '上次结果已失效，请对当前内容重新检查。' : '依次核对数据、内容与格式；发现问题后继续完成其余检查。'}</Text></div></div>
    <Descriptions size="small" column={1} items={[
      { key: 'document', label: '检查文书', children: review.snapshot.title },
      { key: 'started', label: '开始时间', children: timeText(review.startedAt) },
      ...(review.completedAt && !stale ? [{ key: 'completed', label: '完成时间', children: timeText(review.completedAt) }] : []),
      { key: 'mode', label: '检查方式', children: '模拟检查流程 · 结果仅供演示' },
    ]} />
    {!stale && <Progress percent={Math.round(review.completedCount / DOCUMENT_CHECK_ITEMS.length * 100)} status={hasIssues ? 'exception' : undefined} size="small" />}
    {issues.length > 0 && <section className="doc-review-problems" aria-label="待修改事项">
      <Title level={5}>待修改事项</Title>
      {issues.map((issue, index) => <article className="doc-review-problem" key={issue.id}>
        <strong><CircleAlert size={16} aria-hidden />{index + 1}. {issue.title}</strong>
        <Text type="secondary">位置：{issue.location}</Text>
        <Button size="small" type="link" icon={<Crosshair size={14} />} onClick={() => useDocumentReviewStore.getState().focusIssue(scope, document.id, issue.id)}>定位原文</Button>
        <blockquote>{issue.original}</blockquote>
        <Paragraph>{issue.explanation}</Paragraph>
        <div className="doc-review-suggestion"><Text strong>修改建议</Text><Paragraph>{issue.suggestion}</Paragraph></div>
      </article>)}
      {hasIssues && <Space wrap>
        <Button type="primary" onClick={applyFixes}>应用模拟修正并重新检查</Button>
        <Button onClick={() => useDocumentReviewStore.getState().showDetails(null)}>返回正文修改</Button>
      </Space>}
    </section>}
    {STAGES.map(stage => <section key={stage.phase} className="doc-review-group"><Title level={5}>{stage.label}</Title><ul>{DOCUMENT_CHECK_ITEMS.map((item, index) => {
      if (item.phase !== stage.phase) return null;
      const done = !stale && index < review.completedCount;
      const issue = done && issues.some(item => item.checkIndex === index);
      const active = review.status === 'running' && index === review.completedCount;
      const state: CheckState = issue ? 'issue' : done ? 'done' : active ? 'active' : 'pending';
      return <li key={item.label} className={`doc-review-check is-${state}`}><CheckIcon state={state} /><div><div className="doc-review-check-heading"><Text strong>{item.label}</Text><span className={`axn-status axn-status--${issue ? 'err' : done ? 'ok' : active ? 'busy' : 'idle'}`}>{issue ? '需修改' : done ? '通过' : active ? '检查中' : stale ? '待重新检查' : '待开始'}</span></div><Text type="secondary">{item.detail}</Text></div></li>;
    })}</ul></section>)}
    {(stale || hasIssues) && <Button onClick={() => useDocumentReviewStore.getState().start(scope, document)}>重新检查</Button>}
  </div>;
}
