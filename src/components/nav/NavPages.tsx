/**
 * 一级导航对应的业务页面（需求七）：应急项目 / 智能体与 Skill / 定时任务 / 知识库。
 * 轻量展示页：企业级浅色卡片，全部数据为模拟数据。
 */
import { useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  FileCheck,
  Heart,
  Network,
  Presentation,
  Search,
  Wrench,
  Zap,
} from 'lucide-react'
import { Button, Card, Drawer, Empty, Input, Space, Tag, Timeline, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { NAV_PATH } from './navRoutes';
import type { NavPage } from '@/domain/types';
import { useConversationStore } from '@/store/conversationStore';
import { knowledgeChunks } from '@/seed/scenario';
import PageHeader from '@/components/common/PageHeader';
import SkillsPage from './SkillsPage';
import { AGENT_INVITATIONS } from '@/seed/agentInvitations';
import { agentIcon } from '@/components/chat/agentIcons';
import { summonAgentFromManagement } from '@/services/agentConversation';

/* ================= 应急项目 ================= */

interface ProjectRow {
  projectId: string;
  name: string;
  status: '进行中' | '已归档' | '筹备中';
  updatedAt: string;
  owner: string;
  conversationTitle: string;
  eventId?: string;
  desc: string;
}

const PROJECTS: ProjectRow[] = [
  {
    projectId: 'proj-demo-001',
    name: '清河段堤防险情处置',
    status: '进行中',
    updatedAt: '2026-09-28 10:24',
    owner: '指挥员',
    conversationTitle: '南堤堤防管涌险情',
    eventId: 'evt-demo-001',
    desc: '堤防管涌险情研判、资源预置与处置跟踪（虚构模拟项目）',
  },
  {
    projectId: 'proj-demo-002',
    name: '城镇内涝防御响应',
    status: '进行中',
    updatedAt: '2026-09-28 09:56',
    owner: '值班员',
    conversationTitle: '漳河镇水位上涨预警',
    eventId: 'evt-demo-002',
    desc: '下穿道路积水预警与防御调度（虚构模拟项目）',
  },
  {
    projectId: 'proj-demo-003',
    name: '汛期值班保障专项',
    status: '筹备中',
    updatedAt: '2026-09-27 17:05',
    owner: '值班员',
    conversationTitle: '防汛资源调度',
    eventId: 'evt-demo-001',
    desc: '值班安排、日报整理与资源状态检查（虚构模拟项目）',
  },
];

export function ProjectsPage() {
  const createConversation = useConversationStore((s) => s.createConversation);
  const conversations = useConversationStore((s) => s.conversations);
  const selectConversation = useConversationStore((s) => s.selectConversation);
  const navigate = useNavigate();

  const enterWorkspace = (project: ProjectRow) => {
    // 优先进入项目关联的既有会话；不存在则新建
    const existing = Object.values(conversations).find((c) => c.title === project.conversationTitle);
    if (existing) {
      selectConversation(existing.id);
    } else {
      createConversation({
        title: project.conversationTitle,
        type: 'emergency',
        eventId: project.eventId,
        summary: `${project.name} · 项目会话`,
      });
    }
    navigate(NAV_PATH.assistant);
  };

  return (
    <div className="axn-np-section" data-testid="projects-page">
      <PageHeader title="应急项目" sub="项目为业务组织维度；进入工作台后继续在智能助理中操作" />
      <div className="axn-np-col">
        {PROJECTS.map((p) => (
          <Card key={p.projectId} size="small" styles={{ body: { display: 'flex', alignItems: 'center', gap: 14 } }}>
            <Presentation className="axn-np-icon-huge" />
            <div className="axn-np-flex-1">
              <div className="axn-np-flex-row">
                <Typography.Text strong className="axn-np-fs14">
                  {p.name}
                </Typography.Text>
                <Tag color={p.status === '进行中' ? 'processing' : p.status === '筹备中' ? 'default' : 'success'}>
                  {p.status}
                </Tag>
              </div>
              <div className="axn-np-meta-nowrap">
                {p.desc}
              </div>
              <div className="axn-np-meta">
                更新 {p.updatedAt} · 负责人 {p.owner} · 关联会话「{p.conversationTitle}」
              </div>
            </div>
            <Button type="primary" ghost onClick={() => enterWorkspace(p)}>
              进入工作台
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================= 智能体管理 ================= */

const AGENT_DESCRIPTIONS: Record<string, string> = {
  'agent-doc': '把现场资料整理成规范文书，支持应急要情、值班日报、周工作动态和工作总结，协助补齐要素并生成草稿。',
  'agent-situation': '汇聚监测记录与现场信息，梳理灾情摘要、研判风险态势，帮助快速掌握事件进展与需要关注的变化。',
  'agent-resource': '查询周边救援队伍、装备与物资，按需求检索可用力量、核对资源状态，为调度决策提供参考。',
  'agent-plan': '结合当前灾情与救援资源，编制现场处置行动方案，梳理处置步骤、力量安排及风险提示。',
  'agent-eval': '结合救援过程与阶段进展，评估处置成效、识别剩余风险，整理复盘分析与后续改进建议。',
};

export function AgentsPage() {
  const navigate = useNavigate();
  const summon = (agentId: string) => {
    if (summonAgentFromManagement(agentId)) navigate(NAV_PATH.assistant);
  };

  return (
    <div className="axn-np-section" data-testid="agents-page">
      <PageHeader
        title="智能体管理"
        sub="认识你的应急协作伙伴。召唤到当前对话，再选择需要的任务。"
        extra={<Tag>{AGENT_INVITATIONS.length} 个智能体</Tag>}
      />
      <div className="axn-np-grid axn-agents-grid">
        {AGENT_INVITATIONS.map((agent) => {
          const Icon = agentIcon(agent.agentId);
          return (
            <Card key={agent.agentId} className="axn-agent-card" data-agent-id={agent.agentId}>
              <div className="axn-agent-card-heading">
                <span className="axn-np-icon-tile"><Icon /></span>
                <div className="axn-np-flex-1">
                  <h2 className="axn-np-title-sm">{agent.name}</h2>
                  <div className="axn-np-meta">{agent.role}</div>
                </div>
                <span className="axn-np-status">已接入</span>
              </div>
              <p className="axn-np-desc">{AGENT_DESCRIPTIONS[agent.agentId]}</p>
              <div className="axn-np-label axn-np-fs12">可以帮你</div>
              <Space size={[4, 6]} wrap>
                {agent.options.map(option => <Tag key={option.task}>{option.label}</Tag>)}
              </Space>
              <div className="axn-agent-card-footer">
                <Button type="primary" icon={<Icon size={16} />} aria-label={`召唤${agent.name}`}
                  onClick={() => summon(agent.agentId)}>召唤</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ================= 定时任务 ================= */

interface ScheduleRow {
  scheduleId: string;
  name: string;
  cron: string;
  desc: string;
  lastRun: string;
  status: '运行中' | '已暂停';
}

const SCHEDULES: ScheduleRow[] = [
  { scheduleId: 'sched-daily', name: '每日值班日报', cron: '每天 08:00', desc: '生成当日值班日报草稿并推送待补录提醒', lastRun: '2026-09-28 08:00', status: '运行中' },
  { scheduleId: 'sched-patrol', name: '防汛监测巡检', cron: '每 2 小时', desc: '巡检水位监测数据并标记异常', lastRun: '2026-09-28 20:00', status: '运行中' },
  { scheduleId: 'sched-resource', name: '资源状态检查', cron: '每天 07:30', desc: '检查救援队伍与装备状态并更新可用性', lastRun: '2026-09-28 07:30', status: '已暂停' },
];

export function SchedulesPage() {
  return (
    <div className="axn-np-section" data-testid="schedules-page">
      <PageHeader title="定时任务" sub="按计划自动执行的值守任务" />
      <div className="axn-np-col">
        {SCHEDULES.map((s) => (
          <Card key={s.scheduleId} size="small" styles={{ body: { display: 'flex', alignItems: 'center', gap: 14 } }}>
            <Clock className="axn-np-icon-med" />
            <div className="axn-np-flex-1">
              <Space size={8}>
                <Typography.Text strong className="axn-np-fs13">
                  {s.name}
                </Typography.Text>
                <Tag>{s.cron}</Tag>
                <Tag color={s.status === '已暂停' ? 'default' : 'success'}>{s.status}</Tag>
              </Space>
              <div className="axn-np-meta">{s.desc}</div>
            </div>
            <Typography.Text type="secondary" className="axn-np-text-sm">
              上次 {s.lastRun}
            </Typography.Text>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================= 知识库 ================= */

interface KnowledgeLibrary {
  libraryId: string;
  name: string;
  icon: React.ReactNode;
  desc: string;
  count: number;
}

const LIBRARIES: KnowledgeLibrary[] = [
  { libraryId: 'lib-plan', name: '预案库', icon: <FileCheck />, desc: '应急预案与处置流程文档', count: 12 },
  { libraryId: 'lib-law', name: '法规规范库', icon: <BookOpen />, desc: '相关法规、规程与标准条目', count: 8 },
  { libraryId: 'lib-case', name: '历史案例库', icon: <Network />, desc: '历史事件处置案例与复盘', count: 15 },
  { libraryId: 'lib-tactic', name: '救援技战法', icon: <Zap />, desc: '典型场景技战法与操作要点', count: 10 },
  { libraryId: 'lib-equipment', name: '装备知识库', icon: <Wrench />, desc: '救援装备参数与使用要点', count: 22 },
  { libraryId: 'lib-team', name: '队伍能力库', icon: <Heart />, desc: '救援队伍能力档案与擅长场景', count: 6 },
];

export function KnowledgePage() {
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<KnowledgeLibrary | null>(null);

  const filteredLibs = useMemo(
    () => LIBRARIES.filter((l) => !keyword.trim() || l.name.includes(keyword.trim()) || l.desc.includes(keyword.trim())),
    [keyword],
  );

  return (
    <div className="axn-np-section" data-testid="knowledge-page">
      <PageHeader
        title="知识库"
        sub="六大领域知识，是问答与文书生成的依据来源"
        extra={
          <Space>
            <Input
              allowClear
              size="small"
              prefix={<Search className="axn-np-icon-gray" />}
              placeholder="搜索知识库"
              className="axn-np-search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              data-testid="knowledge-search"
            />
          </Space>
        }
      />
      <div className="axn-np-grid-wide">
        {filteredLibs.map((lib) => (
          <Card
            key={lib.libraryId}
            size="small"
            hoverable
            onClick={() => setDetail(lib)}
            styles={{ body: { display: 'flex', gap: 12, alignItems: 'flex-start' } }}
          >
            <span className="axn-np-icon-tile">{lib.icon}</span>
            <div className="axn-np-flex-1">
              <div className="axn-np-flex-row">
                <Typography.Text strong className="axn-np-fs14">
                  {lib.name}
                </Typography.Text>
                <span className="axn-np-count">{lib.count} 条</span>
              </div>
              <div className="axn-np-meta">{lib.desc}</div>
            </div>
          </Card>
        ))}
        {filteredLibs.length === 0 && (
          <div className="axn-np-full-span">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`未找到与「${keyword}」匹配的知识库`} />
          </div>
        )}
      </div>

      {!keyword.trim() && (
        <section className="axn-np-recent" aria-label="近期被引用的条目">
          <h2 className="axn-np-subhead">近期被引用</h2>
          <ul className="axn-np-recent-list">
            {knowledgeChunks.map((k) => (
              <li key={k.chunkId}>
                <span className="axn-np-recent-title">{k.title}</span>
                <span className="axn-np-recent-meta">{k.category} · {k.version}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Drawer
        title={detail ? `${detail.name} · 详情` : ''}
        size={480}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div>
            <Timeline
              items={knowledgeChunks.map((k) => ({
                color: 'blue',
                children: (
                  <div>
                    <div className="axn-np-k-title">{k.title}</div>
                    <div className="axn-np-meta">{k.content}</div>
                    <div className="axn-np-meta">
                      {k.category} · {k.version} · {k.sourceLabel}
                    </div>
                    <div className="axn-np-k-notice">{k.notice}</div>
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}

/** 主工作区按导航页分发。 */
export function NavPageContent({ page }: { page: NavPage }) {
  switch (page) {
    case 'projects':
      return <ProjectsPage />;
    case 'agents':
      return <AgentsPage />;
    case 'skills':
      return <SkillsPage />;
    case 'schedules':
      return <SchedulesPage />;
    case 'knowledge':
      return <KnowledgePage />;
    default:
      return null;
  }
}
