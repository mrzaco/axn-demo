/** 智能体调用与真实任务状态同步，执行步骤和模拟结果在同一张卡中展示。 */
import type { ReactNode } from 'react';
import {
  Bot,
} from 'lucide-react'
import { Tag, Typography } from 'antd';
import type { TaskStatus } from '@/domain/types';

const LABELS: Record<TaskStatus, string> = {
  queued: '正在调用', running: '执行中', succeeded: '已完成', partial: '部分完成',
  waiting_input: '待补充信息', failed: '执行失败', cancelled: '已取消',
};
export default function AgentSummonCard({ agentName, agentRole, action, status = 'running', children, bodyExtra }: {
  agentName: string; agentRole: string; action: string; status?: TaskStatus; children?: ReactNode;
  /** 接在正文列末尾（与姓名下的文字左对齐）的内容，如文书生成的三个文书类型选项；
      children 是卡片底部的整幅子内容和卡（如任务卡），占满卡片宽度，两者用途不同。 */
  bodyExtra?: ReactNode;
}) {
  const active = status === 'running' || status === 'queued';
  return <section className={`axn-agent-execution ${active ? 'is-running' : ''}`} data-testid="agent-summon-card" aria-live="polite">
    <div className="axn-agent-summon">
      <span className="axn-agent-summon-avatar" aria-hidden><Bot /></span>
      <div className="axn-agent-summon-body">
        <div className="axn-agent-summon-head"><Typography.Text strong>{agentName}</Typography.Text><Tag color={active ? 'processing' : status === 'succeeded' ? 'blue' : status === 'failed' ? 'error' : 'default'}>{LABELS[status]}</Tag></div>
        <div className="axn-agent-summon-role"><Typography.Text type="secondary">{agentRole} · 模拟执行</Typography.Text></div>
        <div className="axn-agent-summon-action"><Typography.Text>{active ? action : status === 'succeeded' ? '任务已完成，执行过程与结果如下' : status === 'waiting_input' ? '请补充所需信息后继续' : status === 'cancelled' ? '任务已停止，已完成的步骤保留如下' : status === 'failed' ? '执行遇到问题，可查看原因并重试' : '已完成部分任务，详情如下'}</Typography.Text></div>
        {bodyExtra}
      </div>
    </div>
    {children}
  </section>;
}
