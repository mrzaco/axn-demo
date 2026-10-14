import { useEffect, useState } from 'react';
import {
  defaultWorkSummaryImprovement,
  ensureWorkSummaryDocument,
  submitWorkSummaryImprovement,
} from '@/services/workSummaryWorkflow';
import {
  Bot,
  CircleCheck,
  FileText,
  LoaderCircle,
} from 'lucide-react'
import { Button, Input, Space, Steps, Tag, Typography } from 'antd';
import type { ChatMessage } from '@/domain/types';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useSessionStore } from '@/store/sessionStore';
import { useDocumentNavigation } from '@/components/workspace/useDocumentNavigation';

export default function DocumentGenerationCard({
  message,
}: {
  message: ChatMessage;
  onTask?: (prompt: string) => void;
  onNavigate?: (path: string) => void;
  busy?: boolean;
}) {
  const openDocument = useDocumentNavigation();
  const workflow = message.documentWorkflow!;
  const eventId = useSessionStore((s) => s.sessions[message.sessionId]?.eventId ?? '');
  const draftImprovement = workflow.collection?.[5]?.answer?.trim()
    || defaultWorkSummaryImprovement(eventId);
  const [improvement, setImprovement] = useState(draftImprovement);
  const waiting = workflow.stage === 'waiting_input';
  const completed = workflow.stage === 'completed';
  const interrupted = workflow.stage === 'interrupted';
  const current = {
    collecting: 0,
    waiting_input: 0,
    calling: 1,
    generating: 2,
    completed: 3,
    interrupted: 0,
  }[workflow.stage];
  const document = useMockDocumentStore((s) => {
    const lib = s.libraries[message.sessionId];
    if (workflow.documentId) {
      const hit = lib?.documents.find((item) => item.id === workflow.documentId);
      if (hit) return hit;
    }
    return null;
  });
  // 刷新后 mock 库为空：已完成且仍有章节稿时自动重建，避免「已完成但右侧空白」。
  useEffect(() => {
    if (!completed || document || !workflow.reportSections?.length) return;
    ensureWorkSummaryDocument(message.sessionId, workflow, message.messageId);
  }, [completed, document, message.messageId, message.sessionId, workflow]);
  // 兼容历史会话：若仍停在待补充，回填改进草稿。
  useEffect(() => {
    if (!waiting) return;
    setImprovement((prev) => (prev.trim() ? prev : draftImprovement));
  }, [waiting, draftImprovement]);
  const openInWorkspace = () => {
    const doc = document ?? ensureWorkSummaryDocument(message.sessionId, workflow, message.messageId);
    if (!doc) return;
    openDocument(message.sessionId, { kind: 'mock', id: doc.id });
  };
  return (
    <div className="axn-document-workflow" data-testid="document-generation-card" aria-live="polite">
      <Space wrap className="axn-document-workflow-head">
        <Bot />
        <Typography.Text strong>{message.agentName || '文书生成智能体'}</Typography.Text>
        <Tag color={completed ? 'blue' : 'processing'}>
          {completed ? '已完成' : interrupted ? '已中断' : waiting ? '待补充' : '执行中'}
        </Tag>
      </Space>
      {!completed && <Typography.Paragraph type="secondary">{message.agentRole} · 模拟</Typography.Paragraph>}
      {!completed && <Steps
        orientation="vertical"
        size="small"
        current={current}
        status={interrupted ? 'error' : undefined}
        items={[
          {
            title: current === 0
              ? (workflow.collection ? '正在自动汇总复盘要素…' : '正在整理已收集的文书要素')
              : '文书要素已收集',
            content: (
              <>
                <Typography.Text type="secondary">
                  {workflow.collection
                    ? '已自动汇总过程、方案、不足与改进要点，直接生成抢险总结。'
                    : workflow.documentCode
                      ? '本次输入资料与生成依据'
                      : '以下模拟用户已提供并确认的信息'}
                </Typography.Text>
                {!workflow.collection && (
                  <dl className="axn-document-elements">
                    {workflow.elements.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {waiting && (
                  <div className="axn-summary-input" style={{ marginTop: 12 }}>
                    <Typography.Paragraph type="secondary">
                      历史会话需确认改进计划后继续生成，可直接修改预填内容。
                    </Typography.Paragraph>
                    <Input.TextArea
                      aria-label="下一步改进措施"
                      placeholder="请输入你的改进计划…"
                      autoSize={{ minRows: 3, maxRows: 8 }}
                      value={improvement}
                      onChange={(event) => setImprovement(event.target.value)}
                    />
                    <Button
                      type="primary"
                      disabled={!improvement.trim()}
                      onClick={() => void submitWorkSummaryImprovement(message.sessionId, message.messageId, improvement)}
                    >
                      提交并生成抢险总结
                    </Button>
                  </div>
                )}
                {current > 0 && !waiting && (
                  <Typography.Text type="success">
                    <CircleCheck /> 要素齐备，已确认（模拟）
                  </Typography.Text>
                )}
              </>
            ),
          },
          {
            title: '调用文书生成智能体',
            content: current >= 1 ? '已传入文书类型、编制单位及内容要求' : '等待要素整理完成',
          },
          {
            title: completed ? '红头文书已生成' : '正在生成红头文书',
            content: current >= 2 ? '整理正文 · 编排红头格式 · 同步右侧面板' : '等待智能体调用',
          },
        ]}
      />}
      {waiting ? (
        <Typography.Text type="secondary">等待你确认改进计划，也可以在下方对话框直接回复。</Typography.Text>
      ) : interrupted ? (
        <Typography.Text type="secondary">页面刷新中断了模拟过程，请重新点击生成。</Typography.Text>
      ) : completed ? (
        <Space wrap className="axn-document-workflow-footer" data-testid="document-result-summary">
          <CircleCheck />
          <Typography.Text strong>
            {document ? document.title : (workflow.reportSections?.length ? '红头文书可恢复' : '红头文书已生成')}
          </Typography.Text>
          <Button
            aria-label="查看文书"
            size="small"
            icon={<FileText />}
            disabled={!document && !workflow.reportSections?.length}
            onClick={openInWorkspace}
          >
            {document ? '查看文书' : '恢复并打开文书'}
          </Button>
        </Space>
      ) : (
        <Space>
          <LoaderCircle />
          <Typography.Text>
            {workflow.stage === 'collecting'
              ? '自动汇总复盘要素…'
              : workflow.stage === 'calling'
                ? '正在调用文书生成智能体…'
                : '正在生成文书…'}
          </Typography.Text>
        </Space>
      )}
    </div>
  );
}
