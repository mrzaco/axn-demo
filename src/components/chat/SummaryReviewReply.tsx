import { Button, Space } from 'antd';
import { KvTable, Section } from '@/components/common/ChatPrimitives';
import type { ChatMessage } from '@/domain/types';

export default function SummaryReviewReply({ message, active, busy, onReply }: { message: ChatMessage; active: boolean; busy: boolean; onReply: (text: string) => void }) {
  return <div className="axn-agent-result" data-testid="summary-review-reply">
    {message.reviewSummary && <>
      <p className="axn-agent-result-lead">{message.reviewSummary.conclusion}</p>
      <Section title="本次复盘要点"><KvTable rows={message.reviewSummary.rows} foot="模拟评估，依据当前事件记录；详细分析与原始依据在报告中展示。" /></Section>
    </>}
    <p style={{ margin: 0 }}>{message.text}</p>
    {active && message.summaryOffer && <Space wrap>
      <Button size="small" type="primary" disabled={busy} onClick={() => onReply(message.summaryOffer?.kind === 'report' ? '需要，生成总结报告' : '需要，整理知识候选')}>{message.summaryOffer.kind === 'report' ? '生成总结报告' : '整理知识候选'}</Button>
      <Button size="small" disabled={busy} onClick={() => onReply(message.summaryOffer?.kind === 'report' ? '暂不生成' : '暂不整理')}>暂时不需要</Button>
    </Space>}
  </div>;
}
