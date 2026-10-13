import { generateWorkSummary, submitWorkSummaryImprovement } from '@/services/workSummaryWorkflow';
/**
 * 安小能对话工作流（UI 改版）：会话头（标题 + 关联灾情）+ 消息流（Bubble.List）
 * + 圆角一体化输入区（快捷任务 chips 位于输入框上方）+ 补录表单。
 * 首页引导问题取自已接入知识库的 qa.json；输入区平铺 5 个能力块，点击后在它右侧就地横向展开一行子按钮。
 * 会话跟随演示事件切换（ensureSessionForConversation）；消息与任务状态全部订阅 sessionStore，不本地复制。
 * 本界面为模拟数据演示（规则意图识别，不接真实大模型）。
 */
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSessionTasks } from '@/hooks/useSessionTasks';
import {
  ChevronRight,
  FileCheck,
  Flame,
  Lightbulb,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Alert, App as AntdApp, Button, Input, Select, Space, Tag, Typography, Upload, theme } from 'antd';
import { Bubble, Sender } from '@ant-design/x';
import type { BubbleItemType } from '@ant-design/x';
import { useConversationStore } from '@/store/conversationStore';
import { useDemoStore } from '@/store/demoStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useSessionStore } from '@/store/sessionStore';
import { useActiveScope, useWorkspaceStore } from '@/store/workspaceStore';
import { sendMessage, cancelTask } from '@/services/taskRunner';
import { AGENT_QUICK_TASKS } from '@/seed/agentQuickTasks';
import { WELCOME_QUESTIONS } from '@/seed/welcomeQuestions';
import { factText, incidentById, incidents } from '@/seed/scenario';
import { eventDisplayName } from '@/services/factLookup';
import TaskCard from './TaskCard';
import DocumentGenerationCard from './DocumentGenerationCard';
import AgentSummonCard from './AgentSummonCard';
import './chat.css';

const { Text } = Typography;

export interface ChatPanelProps {
  onOpenDrawer: (target: 'resource' | 'knowledge') => void;
  compact?: boolean;
}

const AVATAR = <div className="axn-chat-avatar">安</div>;

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// 快捷任务：5 个能力块平铺在输入框上方，点块在它右侧就地横向展开一行子按钮（不再是浮层）
// （任务全集与 task→intent 契约见 seed/agentQuickTasks，顺序沿用该目录即按智能体分组）

// 能力块图标（标注 vibe_1791862025042：每个块各配一个图标）。
// 与智能体能力页 NavPages 的 AGENTS[].icon 同源选型，改那边时这里跟着改。
const AGENT_CHIP_ICONS: Record<string, LucideIcon> = {
  'agent-doc': FileCheck,
  'agent-situation': Flame,
  'agent-resource': Wrench,
  'agent-plan': Lightbulb,
  'agent-eval': ShieldCheck,
};

export default function ChatPanel({ onOpenDrawer, compact = false }: ChatPanelProps) {
  const { token } = theme.useToken();
  const { modal } = AntdApp.useApp();
  const currentEventId = useDemoStore((s) => s.currentEventId);
  const sidebarCollapsed = useDemoStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useDemoStore((s) => s.toggleSidebar);
  const activeConversation = useConversationStore((s) =>
    s.activeConversationId ? s.conversations[s.activeConversationId] : null,
  );
  const activeConversationId = activeConversation?.id ?? null;
  const session = useSessionStore((s) => s.sessions[s.sessionByConversation[activeConversationId ?? ''] ?? '']);
  const tasks = useSessionTasks(session);
  const scope = useActiveScope();

  const [input, setInput] = useState('');
  const [clarifyValue, setClarifyValue] = useState('');
  // 当前就地展开子任务的能力块（一次只展开一个；null = 都收着）
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  // FLIP：展开/收起会瞬间重排，先用 transform 把父按钮「拉回」旧位置再动画归零，
  // 让被推开的父按钮滑过去而不是跳位（用户 m01749「展开移动的时候要有动画效果」）。
  // 用 offsetLeft 而非 getBoundingClientRect().x：前者是布局位置，不受容器横向滚动影响，
  // 所以展开时的自动滚进可见区不会污染位移量。
  const flipFrom = useRef<Map<string, number>>(new Map());
  const recordChipPositions = () => {
    const el = chipsRef.current;
    if (!el) return;
    flipFrom.current = new Map(
      Array.from(el.querySelectorAll<HTMLElement>('[data-agent-id]')).map((n) => [n.dataset.agentId ?? '', n.offsetLeft]),
    );
  };
  useLayoutEffect(() => {
    const el = chipsRef.current;
    const before = flipFrom.current;
    flipFrom.current = new Map();
    if (!el || before.size === 0) return;
    // 尊重系统「减少动态效果」偏好（CSS 侧 token 已被同样地归零）
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof el.animate !== 'function') return; // jsdom 等环境没有 WAAPI
    el.querySelectorAll<HTMLElement>('[data-agent-id]').forEach((node) => {
      const from = before.get(node.dataset.agentId ?? '');
      const delta = from == null ? 0 : Math.round(from - node.offsetLeft);
      if (!delta) return;
      node.animate([{ transform: `translateX(${delta}px)` }, { transform: 'none' }], {
        duration: 240,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // 同 --ease-out
      });
    });
    // 子按钮晚 80ms 淡入：等父按钮让开位置再出现，避免与正在移动的父按钮重叠
    el.querySelectorAll<HTMLElement>('[data-subtask]').forEach((node) => {
      node.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 140,
        delay: 80,
        easing: 'ease-out',
        fill: 'backwards',
      });
    });
  }, [expandedAgent]);
  // 展开的首个子项若落在横向滚动区右边界外（末尾几个能力块会这样），把它滚进可见区。
  // inline/block 都用 nearest：只做最小滚动，不会带动页面纵向跳。
  const revealSubTask = useCallback((el: HTMLButtonElement | null) => {
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, []);
  // 上传的文件：演示环境没有上传接口，不落盘也不读取内容，只把文件名与大小随消息记下来
  const [attachments, setAttachments] = useState<{ uid: string; name: string; size: number }[]>([]);

  const addAttachments = (files: File[]) => {
    setAttachments((prev) => [
      ...prev,
      ...files.map((f, i) => ({ uid: `${f.name}-${f.size}-${Date.now()}-${i}`, name: f.name, size: f.size })),
    ]);
  };
  const removeAttachment = (uid: string) => setAttachments((prev) => prev.filter((f) => f.uid !== uid));

  // 事件切换/重置后确保会话存在并跟随当前事件
  useEffect(() => {
    if (activeConversation) {
      useSessionStore
        .getState()
        .ensureSessionForConversation(activeConversation.id, activeConversation.eventId ?? currentEventId);
    }
  }, [activeConversation, currentEventId]);

  const runningTask = useMemo(
    () =>
      Object.values(tasks).find(
        (t) => t.sessionId === session?.sessionId && (t.status === 'running' || t.status === 'queued'),
      ) ?? null,
    [tasks, session?.sessionId],
  );
  const generatingDocument = useMockDocumentStore(s => s.libraries[session?.sessionId ?? '']?.generatingCode);
  const busy = runningTask != null || !!generatingDocument;

  const handleSend = (raw: string) => {
    const text = raw.trim();
    if (!session || !text || busy) return;
    setInput('');
    // 附件随本条消息送出后清空（只有默认问答路径消费附件；工作总结 / 文书生成路径不读）
    const pendingAttachments = attachments;
    setAttachments([]);
    const waitingSummary = session.messages.find(message => message.documentWorkflow?.stage === 'waiting_input');
    if (waitingSummary) {
      void submitWorkSummaryImprovement(session.sessionId, waitingSummary.messageId, text);
      return;
    }
    if (/生成.*工作总结|工作总结.*生成/.test(text)) {
      void generateWorkSummary(session.sessionId, text);
      return;
    }
    void sendMessage(session.sessionId, { text, attachments: pendingAttachments.length ? pendingAttachments : undefined });
  };

  const handleQuickTask = async (text: string) => {
    if (text === '生成工作总结') {
      if (session && !busy) await generateWorkSummary(session.sessionId, text);
      return;
    }
    const code = text === '生成值班日报' ? 'DUTY_DAILY' : text === '生成应急要情' ? 'EMERGENCY_BRIEF' : null;
    if (!code) { handleSend(text); return; }
    if (!session || busy) return;
    const sessionId = session.sessionId;
    useSessionStore.getState().appendMessage(sessionId, { sessionId, role: 'user', kind: 'text', text, taskId: null });
    const elements = [
      { label: '文书类型', value: code === 'DUTY_DAILY' ? '值班日报' : '应急要情' },
      { label: '编制单位', value: '应急指挥中心（模拟）' },
      { label: '报送对象', value: '相关应急工作部门（模拟）' },
      { label: code === 'DUTY_DAILY' ? '值班时段' : '关联事项', value: code === 'DUTY_DAILY' ? '当日 08:00—20:00（模拟）' : eventTitle },
      { label: code === 'DUTY_DAILY' ? '交接要求' : '内容要求', value: code === 'DUTY_DAILY' ? '持续跟踪重点风险、核实待报信息并做好交接' : '汇总基本情况、先期处置和下一步工作；未核实信息保留待核实标记' },
      { label: '文书格式', value: '红头格式，包含标题、正文与落款' },
    ];
    const invocation = useSessionStore.getState().appendMessage(sessionId, {
      sessionId, role: 'assistant', kind: 'agent', text: '根据已收集的文书要素生成红头文书', taskId: null,
      agentName: '文书生成智能体', agentRole: text,
      documentWorkflow: { stage: 'collecting', elements },
    });
    const document = await useMockDocumentStore.getState().generate(sessionId, code, {
      elements,
      onStage: stage => useSessionStore.getState().updateDocumentWorkflow(sessionId, invocation.messageId, { stage, elements }),
    });
    useSessionStore.getState().updateDocumentWorkflow(sessionId, invocation.messageId, {
      stage: document ? 'completed' : 'interrupted', elements, documentId: document?.id,
    });
    if (document && useSessionStore.getState().sessions[sessionId]) {
      useSessionStore.getState().appendMessage(sessionId, {
        sessionId, role: 'assistant', kind: 'text', taskId: null,
        text: `已生成《${document.title}》（模拟文书），已在右侧文书工作区打开。`,
      });
    }
  };

  const pending = session?.pendingClarification ?? null;
  const submitClarification = () => {
    const value = clarifyValue.trim();
    if (!session || !pending || !value) return;
    const prefix = pending.field === 'handOverNotes' ? '交接事项：' : '报送单位：';
    void sendMessage(session.sessionId, { text: `${prefix}${value}` });
    setClarifyValue('');
  };

  const incident = incidentById.get(currentEventId);
  const isBlankEvent = currentEventId.startsWith('evt-blank-');
  const eventTitle = incident
    ? factText(incident.factRefs.title) || currentEventId
    : isBlankEvent
      ? '空白对话（未关联事件）'
      : currentEventId;

  // 关联灾情（对话界面内切换）：evt-blank- 前缀或未绑定 → 未关联；否则为绑定事件
  const linkConversationToEvent = useConversationStore((s) => s.linkConversationToEvent);
  const BLANK = '__blank__';
  const linkValue =
    !activeConversation || !activeConversation.eventId || activeConversation.eventId.startsWith('evt-blank-')
      ? BLANK
      : activeConversation.eventId;
  const linkOptions = useMemo(
    () => [
      // 下拉里的「解除关联」项；未关联时触发器显示的是 placeholder（见下），不用这个文案
      // （标注 vibe_1791787570681）
      { value: BLANK, label: '未关联事件' },
      ...incidents.map((i) => ({ value: i.eventId, label: eventDisplayName(i.eventId) })),
    ],
    [],
  );
  const handleLinkChange = (value: string) => {
    if (!activeConversation) return;
    // undefined → 会话回到专属虚拟事件（保留其独立消息）
    const proceed = () => linkConversationToEvent(activeConversation.id, value === BLANK ? undefined : value);
    const workspace = useWorkspaceStore.getState();
    if (!workspace.isDirty(scope)) { proceed(); return; }
    modal.confirm({
      title: '有未保存的文书修改',
      // 切事件只解除编辑状态；草稿改动在 documentStore、模拟文书改动在 mockDocumentStore，都不会丢。
      content: '切换事件不会丢弃修改，改动保留在本次会话（尚未保存）。',
      okText: '继续切换',
      cancelText: '继续编辑',
      onOk: () => { workspace.setDirty(scope, false); workspace.close(scope); proceed(); },
    });
  };

  // 关联灾情选择器：与发送/语音按钮同排，位于其左侧。
  // 原外层 Tooltip（「关联后使用该事件的业务资料，对话消息保持独立」）会随鼠标悬停
  // 在输入区弹出遮挡，按要求移除；语义仍由 aria-label 提供。
  const incidentSelect = (
    <Select
      size="small"
      variant="borderless"
      className="axn-cp-select"
      // 未关联时传 undefined 而非 BLANK：让触发器显示 placeholder「选择关联灾情事件」。
      // BLANK 仍是合法选中值（handleLinkChange 里转成「解除关联」），只是不再当触发器文案用
      // （标注 vibe_1791787570681）
      value={linkValue === BLANK ? undefined : linkValue}
      onChange={handleLinkChange}
      placeholder="选择关联灾情事件"
      options={linkOptions}
      aria-label="关联灾情"
      data-testid="chat-link-incident"
    />
  );

  const items: BubbleItemType[] = useMemo(() => {
    const messages = session?.messages ?? [];
    const summonedTasks = new Set(messages.filter(message => message.kind === 'agent' && message.taskId && tasks[message.taskId]).map(message => message.taskId));
    return messages.filter(message => !(message.kind === 'task' && summonedTasks.has(message.taskId))).map((m) => {
      if (m.kind === 'task' && m.taskId) {
        const task = tasks[m.taskId];
        return {
          key: m.messageId,
          role: 'task',
          content: task?.displayTitle ?? '任务',
          avatar: AVATAR,
          // 任务卡占满会话栏可用宽度（默认气泡 fit-content 会把长内容挤成窄条）
          styles: {
            root: { flex: '1 1 auto', width: 'auto', minWidth: 0, alignSelf: 'stretch', paddingInlineEnd: 0 },
            body: { flex: '1 1 auto', width: '100%', minWidth: 0, maxWidth: '100%' },
            content: { width: '100%' },
          },
          contentRender: () =>
            task ? (
              <TaskCard task={task} onOpenDrawer={onOpenDrawer} />
            ) : (
              <Tag color="error">任务数据缺失（模拟数据）</Tag>
            ),
        };
      }
      if (m.kind === 'agent') {
        return {
          key: m.messageId,
          role: 'task',
          content: m.agentName ?? '智能体协同',
          avatar: null,
          styles: {
            root: { flex: '1 1 auto', width: 'auto', minWidth: 0, alignSelf: 'stretch', paddingInlineEnd: 0 },
            body: { flex: '1 1 auto', width: '100%', minWidth: 0, maxWidth: '100%' },
            content: { width: '100%', padding: 0, background: 'transparent' },
          },
          contentRender: () => m.documentWorkflow ? <DocumentGenerationCard message={m} /> : (
            <AgentSummonCard
              agentName={m.agentName ?? '智能体协同'}
              agentRole={m.agentRole ?? ''}
              action={m.text ?? ''}
              status={m.taskId ? tasks[m.taskId]?.status : undefined}
            >
              {m.taskId && tasks[m.taskId] && <TaskCard task={tasks[m.taskId]} onOpenDrawer={onOpenDrawer} />}
            </AgentSummonCard>
          ),
        };
      }
      if (m.role === 'user') {
        const files = m.attachments ?? [];
        return {
          key: m.messageId,
          role: 'user',
          content: m.text ?? '',
          // 附件标记：发出去之后仍能看到随行的文件（否则选完文件一发送就没痕迹了）
          contentRender: files.length
            ? () => (
                <div>
                  <div>{m.text}</div>
                  <div className="axn-msg-attach" data-testid="message-attachments">
                    {files.map((f) => (
                      <span key={`${f.name}-${f.size}`} className="axn-msg-attach-item">
                        <Paperclip size={12} />{f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )
            : undefined,
        };
      }
      if (m.role === 'system') {
        return {
          key: m.messageId,
          role: 'system',
          content: m.text ?? '',
          styles: { content: { fontSize: 'var(--fs-body)', color: 'var(--axn-muted)' } },
        };
      }
      return { key: m.messageId, role: 'ai', content: m.text ?? '', avatar: AVATAR };
    });
  }, [session?.messages, tasks, onOpenDrawer]);

  const hasMessages = items.length > 0;

  return (
    <div className="axn-chat-page">
          {/* 会话头：左侧收起侧边栏 + 标题 */}
      <div className="axn-chat-head">
        <div className="axn-chat-head-row">
          <Button
            type="text"
            className="axn-collapse-btn"
            icon={sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          />
          {/* 无消息、或对话未关联事件时不显示标题：两者都由下方「关联灾情」选择器承载，
              标题只是重复（标注 vibe_1791303121889）；关联事件后标题回归。 */}
          {hasMessages && !isBlankEvent && (
            <Text strong className="axn-cp-title" data-testid="header-event">
              {eventTitle}
            </Text>
          )}
        </div>
      </div>

      {/* 消息流 / 首页 */}
      {hasMessages ? (
        <Bubble.List
          className="axn-message-list"
          autoScroll
          items={items}
          role={{
            ai: {
              placement: 'start',
              variant: 'filled',
              avatar: AVATAR,
              styles: { content: { background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: '4px 14px 14px 14px', padding: '12px 14px', lineHeight: 1.85, maxWidth: '100%', overflowWrap: 'anywhere' } },
            },
            user: {
              placement: 'end',
              variant: 'filled',
              styles: { content: { background: token.colorPrimary, color: token.colorTextLightSolid, borderRadius: '14px 14px 4px 14px', padding: '11px 15px', lineHeight: 1.8, fontSize: 13, overflowWrap: 'anywhere' } },
            },
            system: { placement: 'start', variant: 'borderless' },
            task: {
              placement: 'start',
              variant: 'borderless',
              avatar: AVATAR,
              styles: {
                body: { flex: '1 1 auto', minWidth: 0 },
                content: { padding: 0, background: 'transparent', width: '100%', flex: '1 1 auto', minWidth: 0 },
              },
            },
          }}
        />
      ) : compact ? (
        <div className="axn-chat-empty-compact" data-testid="split-chat-empty">
          <MessageSquare />
          <Typography.Title level={5}>围绕这份文书继续讨论</Typography.Title>
          <Typography.Text type="secondary">可以补充资料、发起任务，或在右侧编辑文书。</Typography.Text>
        </div>
      ) : (
        <div className="chat-scroll axn-home">
          <div className="axn-home-inner">
            <div className="axn-home-hero">
              {/* 标注 vibe_1791788298951：原「有什么我能帮你的吗？」+ 下方 secondary 问候语合并成这一句 */}
              <Typography.Title level={1} className="axn-home-title">您好，我是安小能，您的应急智能助手</Typography.Title>
            </div>
            {/* 标注 vibe_1791788359448 */}
            <Typography.Paragraph className="axn-home-copy">
              您可以问我问题，也可以让我帮您写公文，或者我也可以帮您执行应急相关的任务。
            </Typography.Paragraph>

            <div className="axn-home-block" data-testid="home-chat-recommend">
              <Text type="secondary" className="axn-tc-fs13">为你推荐</Text>
              <ul className="axn-question-list">
                {WELCOME_QUESTIONS.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      className="axn-question-item"
                      disabled={!session || busy}
                      onClick={() => { void handleQuickTask(q); }}
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <Text type="secondary" className="axn-tc-fs12">
              也可直接输入指令，或在下方输入区使用快捷任务。
            </Text>
          </div>
        </div>
      )}

      {/* 补录表单（pendingClarification 存在时内联展示） */}
      {pending && (
        <div className="axn-clarification">
          <Alert
            type="warning"
            showIcon
            title={pending.prompt}
            description={
              <Space.Compact className="axn-cp-compact">
                <Input
                  value={clarifyValue}
                  onChange={(e) => setClarifyValue(e.target.value)}
                  onPressEnter={submitClarification}
                  placeholder={`示例：${pending.exampleHint}`}
                  maxLength={80}
                />
                <Button type="primary" onClick={submitClarification} disabled={!clarifyValue.trim()}>
                  提交
                </Button>
              </Space.Compact>
            }
          />
        </div>
      )}

      {/* 快捷任务 chips：5 个能力块平铺在输入框上方，点块就在它右侧就地展开子任务 */}
      <div className="axn-cp-chips-wrap">
        <div className="axn-chips" ref={chipsRef}>
          {AGENT_QUICK_TASKS.map(({ label, agentName, agentId, tasks }) => {
            const open = expandedAgent === agentId;
            const ChipIcon = AGENT_CHIP_ICONS[agentId];
            return (
              <Fragment key={agentId}>
                {/* 父按钮：右侧箭头提示「点开是向右展开一行」（用户 m01620）；busy 时整块禁用。 */}
                <Button
                  size="small"
                  className="axn-chip"
                  title={agentName}
                  data-agent-id={agentId}
                  disabled={!session || busy}
                  aria-expanded={open}
                  onClick={() => { recordChipPositions(); setExpandedAgent(open ? null : agentId); }}
                >
                  {/* aria-hidden：图标不进可访问名，e2e 的 getByRole('button', { name, exact: true }) 才照旧命中 */}
                  {ChipIcon && <ChipIcon className="axn-chip-icon" size={13} aria-hidden />}
                  {label}
                  <ChevronRight className="axn-chip-arrow" size={12} aria-hidden />
                </Button>
                {/* 子任务：内联插在父按钮右侧，与父按钮同一行 —— 后面的父按钮会被推到右边
                    （用户 m01646「是横向的一行」/ m01661「父按钮要跟着往右移动」）。
                    样式与父按钮同款胶囊按钮（备注 vibe_1791791690567_uzj6y6tjy）。 */}
                {open &&
                  tasks.map(({ label: taskLabel, task }, index) => (
                    <Button
                      key={task}
                      // 首个条目挂上 ref：展开后保证它（以及跟它的父按钮）在可见区内
                      ref={index === 0 ? revealSubTask : undefined}
                      size="small"
                      className="axn-chip"
                      data-subtask={task}
                      disabled={!session || busy}
                      onClick={() => { recordChipPositions(); setExpandedAgent(null); void handleQuickTask(task); }}
                    >
                      {taskLabel}
                    </Button>
                  ))}
              </Fragment>
            );
          })}
        </div>
      </div>
      {/* 圆角一体化输入区：关联灾情与发送/语音按钮同在输入框右下角 */}
      <div className="axn-composer">
        <div className="axn-composer-shell">
          {/* 已选文件：输入框上方一行可移除的 chip（上传按钮在输入框左下角） */}
          {attachments.length > 0 && (
            <ul className="axn-attach-list" data-testid="composer-attachments">
              {attachments.map((f) => (
                <li key={f.uid}>
                  <Tag
                    closable
                    className="axn-attach-tag"
                    onClose={(e) => {
                      e.preventDefault();
                      removeAttachment(f.uid);
                    }}
                  >
                    <Paperclip size={12} />
                    <span className="axn-attach-name">{f.name}</span>
                    <span className="axn-attach-size">{formatSize(f.size)}</span>
                  </Tag>
                </li>
              ))}
            </ul>
          )}
          <Sender
            value={input}
            onChange={(v) => setInput(v)}
            onSubmit={(message) => handleSend(message)}
            loading={runningTask != null}
            onCancel={() => {
              if (runningTask) cancelTask(runningTask.taskId);
            }}
            prefix={(
              /* 上传文件（输入框左下角，标注见本行）：演示环境不落盘也不上传，只把文件名/大小附在消息上 */
              <Upload
                multiple
                showUploadList={false}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg"
                beforeUpload={(file) => {
                  addAttachments([file]);
                  return false; // 没有上传接口：只拦下文件，不让 antd 发起请求
                }}
              >
                <Button
                  type="text"
                  className="axn-composer-upload"
                  icon={<Paperclip size={18} />}
                  aria-label="上传文件"
                  title="上传文件"
                  data-testid="composer-upload"
                />
              </Upload>
            )}
            suffix={(_, { components: { LoadingButton, SendButton, SpeechButton } }) => (
              <>
                {incidentSelect}
                {/* 空输入→语音，有文字→发送，运行中→停止（可取消当前任务）
                    同一位置同一动作槽：语音按钮与发送按钮同形（实心圆形主色容器）。 */}
                {runningTask != null ? <LoadingButton /> : input.trim() ? <SendButton /> : <SpeechButton variant="solid" color="primary" shape="circle" />}
              </>
            )}
            /* 最小 2 行 = 54px（用户 m01370 要求输入框再高一些；1 行只有 32px 显得太扁）。
               输入框独占第一行（见 chat.css 的 .ant-sender-input { flex: 1 1 100% }），
               三个控件在第二行，所以留白在输入区内、不会把控件推到盒子底部。
               原 minRows: 3 时输入框恒为 76px 且控件与文字同一行（备注 m01301、m01342）。 */
            autoSize={{ minRows: 2, maxRows: 6 }}
            placeholder={
              session ? '向安小能发送指令，Enter 发送' : '会话初始化中…'
            }
            disabled={!session || !!generatingDocument}
          />
        </div>
      </div>
    </div>
  );
}
