import { useState } from 'react';
import { App, Button, Card, Empty, Form, Input, Modal, Popconfirm, Select, Space, Switch, Tag } from 'antd';
import { Clock, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import { useScheduleStore, nextScheduledAt, type ScheduleInput, type ScheduledTask } from '@/store/scheduleStore';
import { incidents } from '@/seed/scenario';
import { eventDisplayName } from '@/services/factLookup';
import { runScheduledTask } from '@/services/scheduledTasks';
import { NAV_PATH } from './navRoutes';

const DEFAULT_INPUT: ScheduleInput = { name: '', prompt: '', eventId: 'evt-demo-001', frequency: 'daily', time: '08:00', date: '', weekday: 1, enabled: true };
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const fmt = (value?: string | null) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '暂无';
const cycle = (plan: ScheduleInput) => `${plan.frequency === 'daily' ? '每天' : plan.frequency === 'weekly' ? `每${WEEKDAYS[plan.weekday]}` : plan.date} ${plan.time}`;

export default function SchedulesPage() {
  const schedules = useScheduleStore(s => s.schedules);
  const [keyword, setKeyword] = useState('');
  const query = keyword.trim().toLocaleLowerCase();
  const filteredSchedules = schedules.filter(plan => [plan.name, plan.prompt].some(value => value.toLocaleLowerCase().includes(query)));
  const [form] = Form.useForm<ScheduleInput>();
  const frequency = Form.useWatch('frequency', form) ?? 'daily';
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const openForm = (plan?: ScheduledTask) => { setEditing(plan?.id ?? null); form.resetFields(); form.setFieldsValue(plan ?? DEFAULT_INPUT); setOpen(true); };
  const save = async () => {
    const input = await form.validateFields().catch(() => null);
    if (!input) return;
    try { useScheduleStore.getState().save(input, editing ?? undefined); setOpen(false); message.success('定时任务已保存'); }
    catch (error) { message.error((error as Error).message); }
  };
  const toggle = (id: string) => {
    try { useScheduleStore.getState().toggle(id); } catch (error) { message.info((error as Error).message); }
  };
  const run = (id: string) => {
    try { if (runScheduledTask(id)) { message.info('已开始模拟执行，结果将保存在本次对话中'); navigate(NAV_PATH.assistant); } }
    catch (error) { message.info((error as Error).message); }
  };

  return <div className="axn-np-section" data-testid="schedules-page">
    <PageHeader title="定时任务" sub="安排周期性工作，管理任务计划。"
      extra={<Button type="primary" icon={<Plus size={16} />} onClick={() => openForm()}>新建定时任务</Button>} />
    <Input className="axn-schedule-search" allowClear prefix={<Search size={16} />}
      aria-label="搜索定时任务" placeholder="搜索任务名称或执行内容" value={keyword}
      onChange={event => setKeyword(event.target.value)} />
    <div className="axn-schedule-list">
      {!schedules.length && <Empty description="暂无定时任务"><Button onClick={() => openForm()}>创建第一个任务</Button></Empty>}
      {!!schedules.length && !filteredSchedules.length && <Empty description="未找到匹配的定时任务" />}
      {filteredSchedules.map(plan => {
        const latest = plan.runs[0];
        const running = latest?.status === 'running';
        return <Card key={plan.id} className="axn-schedule-card">
          <div className="axn-schedule-heading">
            <span className="axn-np-icon-tile"><Clock /></span>
            <div className="axn-np-flex-1"><h2 className="axn-np-title-sm">{plan.name}</h2><div className="axn-np-meta">{eventDisplayName(plan.eventId)}</div></div>
            <Tag color={plan.enabled ? 'blue' : 'default'}>{plan.enabled ? '已启用' : '已暂停'}</Tag>
            <Switch checked={plan.enabled} aria-label={`启用${plan.name}`} onChange={() => toggle(plan.id)} />
          </div>
          <p className="axn-np-desc">{plan.prompt}</p>
          <div className="axn-schedule-meta"><span>计划：{cycle(plan)}</span><span>下次计划：{plan.enabled ? fmt(nextScheduledAt(plan)) : '已暂停'}</span></div>
          <Space wrap className="axn-np-mt10">
            <Button type="primary" icon={<Play size={15} />} loading={running} onClick={() => run(plan.id)} aria-label={`立即执行${plan.name}`}>立即执行</Button>
            <Button icon={<Pencil size={15} />} disabled={running} onClick={() => openForm(plan)} aria-label={`编辑${plan.name}`}>编辑</Button>
            <Popconfirm title="删除该定时任务？" description="已生成的对话和文件会保留。" okText="删除" cancelText="取消" onConfirm={() => useScheduleStore.getState().remove(plan.id)}>
              <Button danger disabled={running} icon={<Trash2 size={15} />} aria-label={`删除${plan.name}`}>删除</Button>
            </Popconfirm>
          </Space>
        </Card>;
      })}
    </div>
    <Modal title={editing ? '编辑定时任务' : '新建定时任务'} open={open} onCancel={() => setOpen(false)} onOk={() => void save()} okText="保存任务" cancelText="取消" width={600}>
      <Form form={form} layout="vertical" initialValues={DEFAULT_INPUT}>
        <Form.Item label="任务名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入任务名称' }]}><Input maxLength={50} placeholder="例如：每日防汛态势汇总" /></Form.Item>
        <Form.Item label="执行内容" name="prompt" rules={[{ required: true, whitespace: true, message: '请输入执行内容' }]} extra="可演示：生成灾情摘要、查询周边救援资源、生成救援方案、评估救援效果、生成值班日报。"><Input.TextArea rows={3} maxLength={500} showCount placeholder="描述希望安小能执行的任务" /></Form.Item>
        <Form.Item label="关联事件" name="eventId" rules={[{ required: true }]}><Select virtual={false} options={incidents.map(incident => ({ value: incident.eventId, label: eventDisplayName(incident.eventId) }))} /></Form.Item>
        <div className="axn-schedule-form-row">
          <Form.Item label="重复周期" name="frequency"><Select virtual={false} options={[{ value: 'once', label: '仅一次' }, { value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }]} /></Form.Item>
          {frequency === 'once' && <Form.Item label="执行日期" name="date" rules={[{ required: true, message: '请选择日期' }]}><Input type="date" /></Form.Item>}
          {frequency === 'weekly' && <Form.Item label="执行日" name="weekday"><Select virtual={false} options={WEEKDAYS.map((label, value) => ({ label, value }))} /></Form.Item>}
          <Form.Item label="执行时间（北京时间）" name="time" rules={[{ required: true, message: '请选择时间' }]}><Input type="time" /></Form.Item>
        </div>
        <Form.Item label="启用任务" name="enabled" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Modal>
  </div>;
}
