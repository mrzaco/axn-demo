import { useState } from 'react';
import { Alert, Button, Card, Input, Modal, Select, Space, Table, Typography, App } from 'antd';
import { auditResourceLedger, resourceAuditSample } from '@/services/resourceAudit';
import { exportMaterial } from '@/services/prototypeExports';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useSessionStore } from '@/store/sessionStore';
import { documentGeneratedReply } from '@/services/documentGeneratedReply';
import { disasterProfileById } from '@/seed/disasterScenarios';
import { vueDemoResourcesForEvent } from '@/seed/vueDemoResources';
import { vueWorkspaceEventById } from '@/seed/vueWorkspaceEvents';
import { eventDisplayName } from '@/services/factLookup';
import { resolveDocumentSections } from '@/seed/resolveDocumentSections';

export const CUSTOMER_ACTIONS = [
  '物资核验',
  '生成值班日报',
  '生成会议纪要',
  '生成日常工作总结',
  '生成救援方案',
] as const;
export type CustomerAction = typeof CUSTOMER_ACTIONS[number];

/** 方案约束条件默认草稿（模拟）；打开面板即展示多套备选方案，无需再点生成。 */
export function defaultPlanConstraintDraft(eventId: string): string {
  const profile = disasterProfileById.get(eventId);
  if (profile) {
    const force = profile.resources.slice(0, 3).map((r) => `${r.name}/${r.amount}/${r.status}`).join('；');
    return [
      `处置重点：围绕「${profile.objective}」推进（进度 ${profile.completed}/${profile.target}${profile.unit}，模拟）；优先化解 ${profile.risks}。`,
      `可用力量（候选示意，≠已调派）：${force || '待补核'}。`,
      `道路与安全约束：作业区「${profile.location}」；${profile.gaps}；撤离与通信双通道待岗位复核。`,
      `预案参考：${profile.planTitle}。`,
    ].join('\n');
  }
  const vue = vueWorkspaceEventById.get(eventId);
  const demos = vueDemoResourcesForEvent(eventId).slice(0, 3);
  const force = demos.length
    ? demos.map((r) => `${r.name}/${r.amountLabel}/${r.status}`).join('；')
    : '以本事件已登记候选力量为准，未确认项不写入正式编成';
  return [
    `处置重点：围绕「${vue?.name ?? eventDisplayName(eventId)}」核实现场条件与优先任务（${vue?.category ?? '处置'}·模拟）；关注 ${vue?.risks ?? '作业与次生风险'}。`,
    `可用力量（候选示意，≠已调派）：${force}。`,
    `道路与安全约束：作业区「${vue?.location ?? '待核'}」；${vue?.description ?? '通行、撤离与通信保障待岗位复核'}；缺证不推断。`,
  ].join('\n');
}

export default function CustomerRequestPanel({ action, sessionId, eventId, onClose }: {
  action: CustomerAction; sessionId: string; eventId: string; onClose: () => void;
}) {
  const { message } = App.useApp();
  const isPlan = action === '生成救援方案';
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [records, setRecords] = useState(() => (isPlan ? defaultPlanConstraintDraft(eventId) : ''));
  const [decisions, setDecisions] = useState('');
  const [mode, setMode] = useState<'异常样例' | '正常样例' | '资料不足'>('异常样例');
  const [audited, setAudited] = useState(false);
  const [auditedAt, setAuditedAt] = useState('');
  const [variant, setVariant] = useState('稳妥处置');
  const [saving, setSaving] = useState(false);
  const rows = resourceAuditSample(mode);
  const issues = auditResourceLedger(rows);
  const isAudit = action === '物资核验';
  const isMinutes = action === '生成会议纪要';
  const isDaily = action === '生成值班日报';
  const profile = disasterProfileById.get(eventId);
  const plans = [
    { name: '稳妥处置', tactic: '分区核查后逐区推进', organization: '先遣侦测、主力处置、保障支援分批投入，风险核查后扩大作业面。', tradeoff: '强调安全核查与顺序推进；完成时间待现场测算。' },
    { name: '并行处置', tactic: '条件具备的作业点并行推进', organization: '按作业区分配独立任务组，共享保障力量；需核实人员、装备和通信是否足以支持并行作业。', tradeoff: '增加协同与资源需求；不保证耗时最短。' },
    { name: '分阶段增援', tactic: '先期处置后按缺口增援', organization: '先用已核实的可用力量处理优先任务，依据监测变化与缺口分阶段申请增援。', tradeoff: '减少未确认资源依赖；需持续核实增援到位时间。' },
  ];
  const selectedPlan = plans.find(p => p.name === variant)!;

  const sections = (): [string, string][] => {
    if (isAudit) return [
      ['一、核验范围', `${mode}（本地模拟台账）；共${rows.length}条。核验时点：${auditedAt}。规则：按物资标识对比归属、必填字段、同源重复和同单位数量。`],
      ['二、核验结果', rows.length ? issues.length ? issues.map(i => `${i.type} / ${i.assetId}：${i.detail}\n${i.records.map(r => `${r.source}：${r.name}，${r.owner || '归属缺失'}，${r.quantity ?? '数量缺失'}${r.unit}；${r.updatedAt}`).join('\n')}`).join('\n\n') : '本次样例未发现上述规则范围内的异常。' : '资料不足，未执行核验，不能判定正常。'],
      ['三、处理建议', '核对原台账与调拨记录，补齐资料后重新核验。本次不修改原系统数据。'],
    ];
    if (isPlan) return [
      ...resolveDocumentSections(eventId, 'RESCUE_PLAN').map(([h, b]): [string, string] => [h, b.replaceAll('待原系统锁定', '待负责人确认').replaceAll('审签沿用原处置方案模块', '本稿导出后由用户按现行业务办理')]),
      ['六、所选备选战法与组织方式', `方案：${variant}（组织方式演示，待专家确认）\n战法：${selectedPlan.tactic}\n${selectedPlan.organization}\n${selectedPlan.tradeoff}\n处置重点与约束：${records || '待补充'}\n${profile ? `预案参考：${profile.planTitle}；资源：${profile.resources.map(r => `${r.name} ${r.amount} ${r.status}`).join('；')}` : `当前事件资料：${eventDisplayName(eventId)}；预案与可用资源需补充核对。`}\n成本与到位时间：尚未测算。`],
    ];
    if (isMinutes) return [
      ['一、会议基本信息', `会议主题：${subject}\n时间、地点与参会人员：${period}`],
      ['二、会议讨论记录', records],
      ['三、议定事项与责任分工', decisions || '待根据转写记录核对议定事项、责任人和时限；未自动推断。'],
      ['四、资料依据', '以上内容来自本次输入的会议转写文本与人工确认事项；原型按模板整理，未接真实语音转写或大模型。'],
    ];
    if (isDaily) return [
      ['一、值班基本情况', `值班日期：${period}\n值班岗位及人员：${subject}`],
      ['二、值班记录', records],
      ['三、交接及待办事项', decisions || '待补充交接事项'],
      ['四、资料依据', '按本次输入的值班资料整理，未自动调用正式值班台账。'],
    ];
    return [
      ['一、工作范围', `工作主题：${subject}\n总结时段：${period}`],
      ['二、工作时间轴', records],
      ['三、亮点与依据', decisions || '待补充亮点及对应的工作记录；不自动编造。'],
      ['四、待补事项', '下一步计划、责任及时限待根据工作记录补充。本总结仅使用本次输入，不引用关联灾情的模拟救援数据。'],
    ];
  };

  const save = () => {
    if (saving) return;
    if (!isPlan && (!subject.trim() || !period.trim() || !records.trim())) return;
    setSaving(true);
    const code = isPlan ? 'RESCUE_PLAN' : isMinutes ? 'MEETING_MINUTES' : isDaily ? 'DUTY_DAILY' : 'DAILY_WORK_SUMMARY';
    const reportSections = sections();
    const title = isPlan ? `${eventDisplayName(eventId)} · ${variant}行动方案` : `${subject} · ${isMinutes ? '会议纪要' : isDaily ? '值班日报' : '日常工作总结'}`;
    const document = useMockDocumentStore.getState().publishAgentMaterial(sessionId, { code, title, sections: reportSections });
    if (!document) { setSaving(false); message.error('文书生成失败，请重试'); return; }
    const store = useSessionStore.getState();
    store.appendMessage(sessionId, { sessionId, role: 'user', kind: 'text', taskId: null, text: action });
    store.appendMessage(sessionId, { sessionId, role: 'assistant', kind: 'agent', taskId: null,
      text: '依据本次输入整理文书', agentName: isPlan ? '救援方案生成智能体' : '文书生成智能体', agentRole: action,
      documentWorkflow: { stage: 'completed', documentCode: code, documentTitle: title, elements: [{ label: '资料来源', value: isPlan ? '当前事件预案样例与本次约束条件' : '本次输入资料' }], reportSections, documentId: document.id } });
    store.appendMessage(sessionId, { sessionId, role: 'assistant', kind: 'text', taskId: null, text: documentGeneratedReply(document.title) });
    onClose();
  };

  return <Modal open title={action} onCancel={onClose} width={900} footer={null} destroyOnHidden>
    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
      {isAudit ? <>
        <Space wrap><Select aria-label="核验样例" value={mode} options={['异常样例', '正常样例', '资料不足'].map(value => ({ value, label: value }))} onChange={v => { setMode(v); setAudited(false); }} />
          <Button type="primary" onClick={() => { setAudited(true); setAuditedAt(new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })); }}>开始核验</Button></Space>
        {audited && <>
          <Alert type={!rows.length ? 'warning' : issues.length ? 'warning' : 'success'} title={!rows.length ? '资料不足，无法核验' : `已核验${rows.length}条记录，发现${issues.length}项问题`} description={`核验时间：${auditedAt}；仅检查当前规则范围。`} />
          <Table rowKey="id" size="small" pagination={false} dataSource={issues} columns={[
            { title: '问题类型', dataIndex: 'type', filters: ['归属异常', '重复记录', '必填空缺', '数量不一致'].map(value => ({ text: value, value })), onFilter: (v, r) => r.type === v },
            { title: '物资标识', dataIndex: 'assetId' }, { title: '差异与依据', dataIndex: 'detail' },
          ]} expandable={{ expandedRowRender: issue => <Table size="small" rowKey="id" pagination={false} dataSource={issue.records} columns={[
            { title: '来源', dataIndex: 'source' }, { title: '名称', dataIndex: 'name' }, { title: '归属', render: (_, r) => r.owner || '缺失' },
            { title: '数量', render: (_, r) => r.quantity === null ? '缺失' : `${r.quantity}${r.unit}` }, { title: '更新时点', dataIndex: 'updatedAt' },
          ]} /> }} />
          <Button onClick={() => void exportMaterial(`${action}问题清单`, sections(), 'Word').catch(() => message.error('导出失败，请重试'))}>导出核验结果</Button>
        </>}
      </> : isPlan ? <>
        <Input.TextArea aria-label="方案约束条件" value={records} onChange={e => setRecords(e.target.value)} placeholder="补充处置重点、可用力量、道路或安全约束" rows={3} />
        {plans.map(p => (
          <Card
            key={p.name}
            size="small"
            title={p.name}
            extra={
              <Button type={variant === p.name ? 'primary' : 'default'} onClick={() => setVariant(p.name)}>
                {variant === p.name ? '已选择' : '选择方案'}
              </Button>
            }
          >
            <Typography.Paragraph>{p.tactic}：{p.organization}</Typography.Paragraph>
            <Typography.Text type="secondary">{p.tradeoff}</Typography.Text>
          </Card>
        ))}
        <Typography.Text type="secondary">
          预案依据：{profile?.planTitle ?? `${eventDisplayName(eventId)}资料（预案待补充核对）`}；专业战法与安全条款在生成的完整方案中保留。
        </Typography.Text>
        <Button type="primary" loading={saving} onClick={save}>生成所选方案并在线修改</Button>
      </> : <>
        <Input aria-label="文书主题" value={subject} onChange={e => setSubject(e.target.value)} placeholder={isDaily ? '值班岗位及人员' : '会议／工作主题'} />
        <Input aria-label="文书时段" value={period} onChange={e => setPeriod(e.target.value)} placeholder={isMinutes ? '会议时间、地点、参会人员' : '日期／总结起止时段'} />
        <Input.TextArea aria-label="文书原始资料" value={records} onChange={e => setRecords(e.target.value)} rows={7} placeholder={isMinutes ? '粘贴会议语音转写记录' : '逐行填写：时间—工作事项—结果及资料依据'} />
        <Input.TextArea aria-label="确认事项" value={decisions} onChange={e => setDecisions(e.target.value)} rows={3} placeholder={isMinutes ? '确认的议定事项、责任人、时限（可留待核）' : isDaily ? '交接及待办事项' : '亮点及对应时间轴记录'} />
        <Button type="primary" disabled={!subject.trim() || !period.trim() || !records.trim()} loading={saving} onClick={save}>生成初稿并在线修改</Button>
      </>}
    </Space>
  </Modal>;
}
