import { useState } from 'react';
import { App as AntdApp, Button, Card, Dropdown, Empty, Input, Modal, Space, Tag, Tooltip } from 'antd';
import { ChevronDown, Info, Plus, Search, Upload } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { DEMO_SKILLS } from '@/seed/demoSkills';

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
