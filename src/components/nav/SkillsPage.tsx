import { useState } from 'react';
import { App as AntdApp, Button, Card, Dropdown, Empty, Input, Modal, Space, Tag, Tooltip } from 'antd';
import { ChevronDown, ClipboardList, FileText, Info, ListChecks, Plus, Search, ShieldCheck, TableProperties, Upload } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

const DEMO_SKILLS = [
  {
    id: 'field-notes', name: '现场记录提炼', category: '信息整理', icon: FileText,
    description: '从零散现场记录中提炼时间、地点、险情与处置进展，整理关键信息。',
  },
  {
    id: 'resource-list', name: '资源清单整理', category: '资源管理', icon: TableProperties,
    description: '归类队伍、装备与物资信息，整理数量、位置和可用状态。',
  },
  {
    id: 'risk-check', name: '风险要点检查', category: '辅助检查', icon: ShieldCheck,
    description: '逐项梳理处置材料中的风险关注点，形成便于人工核对的检查清单。',
  },
  {
    id: 'duty-summary', name: '值班信息汇总', category: '信息整理', icon: ClipboardList,
    description: '汇集当班重点事项、处理进展与交接内容，整理成简洁的值班记录。',
  },
  {
    id: 'response-review', name: '处置复盘整理', category: '复盘评估', icon: ListChecks,
    description: '沿时间线归纳处置动作与阶段成果，整理经验和后续改进事项。',
  },
].map(skill => ({ ...skill, creator: 'szygadmin', version: '1.0.0', usage: '免审核' }));

export default function SkillsPage() {
  const { message } = AntdApp.useApp();
  const [detail, setDetail] = useState<typeof DEMO_SKILLS[number] | null>(null);
  const [keyword, setKeyword] = useState('');
  const query = keyword.trim().toLocaleLowerCase();
  const filtered = DEMO_SKILLS.filter(skill =>
    [skill.name, skill.description, skill.category].join(' ').toLocaleLowerCase().includes(query),
  );

  return (
    <div className="axn-np-section" data-testid="skills-page">
      <PageHeader title="技能管理" sub="浏览可复用的任务技能，了解它们能做什么、需要哪些材料。"
        extra={<Tag>{DEMO_SKILLS.length} 项示例技能</Tag>} />
      <div className="axn-skills-search-row">
        <Input className="axn-skills-search" allowClear prefix={<Search size={16} />}
          aria-label="搜索技能" placeholder="搜索技能名称、描述或分类" value={keyword}
          onChange={event => setKeyword(event.target.value)} />
        <span className="axn-np-count" role="status">共 {filtered.length} 项技能</span>
        <Dropdown trigger={['click']} menu={{
          items: [
            { key: 'upload', label: '手动上传技能', icon: <Upload size={16} /> },
            { key: 'create', label: '创建技能', icon: <Plus size={16} /> },
          ],
          onClick: ({ key }) => message.info(`${key === 'upload' ? '手动上传技能' : '创建技能'}功能建设中`),
        }}>
          <Button className="axn-skills-create" type="primary" icon={<Plus size={16} />}>
            创建技能<ChevronDown size={14} />
          </Button>
        </Dropdown>
      </div>
      <div className="axn-np-grid axn-agents-grid">
        {filtered.map(skill => {
          const Icon = skill.icon;
          return <Card key={skill.id} className="axn-agent-card axn-skill-card">
            <div className="axn-agent-card-heading">
              <span className="axn-np-icon-tile"><Icon /></span>
              <div className="axn-np-flex-1"><h2 className="axn-np-title-sm">{skill.name}</h2>
                <div className="axn-np-meta">{skill.category}</div></div>
              <Tag>示例</Tag>
            </div>
            <p className="axn-np-desc">{skill.description}</p>
            <Space size={4}><Tag className="axn-np-skill">{skill.category}</Tag><span className="axn-np-meta">v{skill.version}</span></Space>
            <div className="axn-agent-card-footer">
              <Button onClick={() => setDetail(skill)} aria-label={`查看${skill.name}详情`}>查看详情</Button>
            </div>
          </Card>;
        })}
      </div>
      {filtered.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有找到匹配的技能">
        <Button onClick={() => setKeyword('')}>清空搜索</Button>
      </Empty>}
      <Modal title="技能详情" open={!!detail} centered width={600} footer={null}
        onCancel={() => setDetail(null)}>
        {detail && <dl className="axn-skill-details">
          <dt>技能名称</dt>
          <dd className="axn-skill-detail-name">
            {detail.name}
            <Tooltip title="技能的展示名称"><Info size={15} aria-label="技能名称说明" /></Tooltip>
          </dd>
          <dt>描述</dt>
          <dd>{detail.description}</dd>
          <dt>创建者</dt><dd>{detail.creator}</dd>
          <dt>当前版本</dt><dd>{detail.version}</dd>
          <dt>使用方式</dt><dd><Tag color="green">{detail.usage}</Tag></dd>
        </dl>}
      </Modal>
    </div>
  );
}
