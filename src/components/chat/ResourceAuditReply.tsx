import { Space, Table, Typography } from 'antd';
import { auditResourceLedger, type ResourceLedgerRow } from '@/services/resourceAudit';

/** 核验结果作为消息正文展示，原始台账快照随消息保存。 */
export default function ResourceAuditReply({ rows, checkedAt }: { rows: ResourceLedgerRow[]; checkedAt: string }) {
  const issues = auditResourceLedger(rows);
  return <Space orientation="vertical" size="middle" style={{ width: '100%', minWidth: 0 }} data-testid="resource-audit-reply">
    <div>
      <Typography.Paragraph style={{ marginBottom: 8 }}>{!rows.length ? '资料不足，无法核验。' : `物资核验：已核对 ${rows.length} 条记录，发现 ${issues.length} 项问题。`}</Typography.Paragraph>
      <Typography.Paragraph style={{ marginBottom: 0 }}>核验时点：{checkedAt}；当前为本地模拟台账。</Typography.Paragraph>
    </div>
    <Table rowKey="id" size="small" pagination={false} scroll={{ x: 720 }} dataSource={issues} columns={[
      { title: '问题类型', dataIndex: 'type', width: 140, filters: ['归属异常', '重复记录', '必填空缺', '数量不一致'].map(value => ({ text: value, value })), onFilter: (value, issue) => issue.type === value },
      { title: '物资标识', dataIndex: 'assetId', width: 120 },
      { title: '差异与依据', dataIndex: 'detail' },
    ]} expandable={{ expandedRowRender: issue => <Table rowKey="id" size="small" pagination={false} scroll={{ x: 680 }} dataSource={issue.records} columns={[
      { title: '来源', dataIndex: 'source' }, { title: '名称', dataIndex: 'name' },
      { title: '归属', render: (_, row) => row.owner || '缺失' },
      { title: '数量', render: (_, row) => row.quantity === null ? '缺失' : `${row.quantity}${row.unit}` },
      { title: '更新时点', dataIndex: 'updatedAt' },
    ]} /> }} />
    <Typography.Text type="secondary">按同一物资标识对照基地台账与集团汇总；请核对原始单据和调拨记录后修正。</Typography.Text>
  </Space>;
}
