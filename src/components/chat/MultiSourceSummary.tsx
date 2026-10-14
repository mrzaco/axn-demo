import { useState } from 'react';
import { Button, Card, Drawer, Empty, Space, Table, Tag, Typography } from 'antd';
import { Database } from 'lucide-react';
import type { DisasterSourceEvent, DisasterSourceGroup, MultiSourceSnapshot } from '@/domain/multiSource';
import { aggregationCounts } from '@/services/multiSourceAggregation';
import './multi-source.css';

function sourceStats(source: DisasterSourceGroup): string {
  if (!source.records.length) return source.missing || '暂无记录';
  return `${source.records.length} 条记录 · ${source.records.filter((r) => !r.duplicateOf).length} 条归并线索`;
}

function sourceDetail(source: DisasterSourceGroup): string {
  return source.records[0]?.content ?? '数据缺失不代表没有灾情。';
}

export default function MultiSourceSummary({ snapshot }: { snapshot: MultiSourceSnapshot }) {
  const [domainEvent, setDomainEvent] = useState<DisasterSourceEvent | null>(null);
  const counts = aggregationCounts(snapshot.event.sources);

  return (
    <section className="axn-multi-source" aria-label="多源数据汇聚" data-testid="multi-source-summary">
      <div className="axn-ms-heading">
        <Space>
          <Database size={17} />
          <Typography.Text strong>多源数据汇聚</Typography.Text>
        </Space>
        <Tag color="blue">自动汇总 · 模拟</Tag>
      </div>

      <Typography.Paragraph type="secondary">自动整合舆情、气象、水文、地质、现场影像和接报记录。以下使用本地模拟资料，未连接真实全域采集接口；缺项不代表无灾情。</Typography.Paragraph>
      <Typography.Title level={5} className="axn-ms-section-title">{snapshot.event.title} · 当前事件六源汇聚</Typography.Title>
      <div className="axn-ms-counts">
        覆盖 {counts.covered}/6 类 · 原始 {counts.raw} 条 · 归并后 {counts.merged} 条 · 待核 {counts.pending} 条
      </div>
      <Table
        size="small"
        pagination={false}
        rowKey="kind"
        className="axn-ms-table"
        scroll={{ x: 640 }}
        dataSource={snapshot.event.sources}
        columns={[
          { title: '类别', dataIndex: 'kind', width: 110 },
          {
            title: '状态',
            dataIndex: 'state',
            width: 120,
            render: (state: DisasterSourceGroup['state']) => (
              <Tag color={state === '暂无记录' ? 'orange' : 'blue'}>{state}</Tag>
            ),
          },
          {
            title: '统计',
            width: 180,
            render: (_, source) => sourceStats(source),
          },
          {
            title: '详情',
            render: (_, source) => (
              <Typography.Paragraph className="axn-ms-preview" type="secondary" style={{ marginBottom: 0 }}>
                {sourceDetail(source)}
              </Typography.Paragraph>
            ),
          },
        ]}
      />
      <Typography.Title level={5} className="axn-ms-section-title">全域灾情汇总（授权范围）</Typography.Title>
      <Typography.Paragraph type="secondary" className="axn-ms-counts">
        {snapshot.scopeLabel} · {snapshot.domainEvents.length} 个事件。按事件分别归并，跨事件不合并。真实全域采集服务待接入。
      </Typography.Paragraph>
      <Table
        size="small"
        pagination={false}
        rowKey="eventId"
        className="axn-ms-table"
        scroll={{ x: 560 }}
        dataSource={snapshot.domainEvents}
        columns={[
          {
            title: '事件',
            dataIndex: 'title',
            render: (_, event) => (
              <Button
                type="link"
                style={{ padding: 0, whiteSpace: 'normal', height: 'auto', textAlign: 'left' }}
                onClick={() => setDomainEvent(event)}
              >
                {event.title}
              </Button>
            ),
          },
          { title: '位置', dataIndex: 'location' },
          { title: '灾情线索', render: (_, event) => event.sources.flatMap(source => source.records.filter(record => !record.duplicateOf)).slice(0, 2).map(record => record.content).join('；') || '暂无可用记录' },
          {
            title: '六类来源覆盖',
            render: (_, event) => `${aggregationCounts(event.sources).covered}/6 类`,
          },
          {
            title: '归并线索',
            render: (_, event) => `${aggregationCounts(event.sources).merged} 条`,
          },
          {
            title: '待核',
            render: (_, event) => `${aggregationCounts(event.sources).pending} 条`,
          },
        ]}
        locale={{ emptyText: <Empty description="当前事件不在授权数据域内，未读取跨域记录" /> }}
      />

      <div className="axn-ms-foot">汇聚快照：{snapshot.gatheredAt} · 本地模拟 · 招标 4.2 多源数据汇聚</div>
      <Drawer
        title={domainEvent ? `${domainEvent.title} · 授权汇聚` : '授权汇聚'}
        open={!!domainEvent}
        onClose={() => setDomainEvent(null)}
        size={560}
      >
        {domainEvent && (
          <>
            {domainEvent.sources.map((source) => (
              <Card className="axn-ms-record" size="small" key={source.kind} title={source.kind} extra={<Tag>{source.state}</Tag>}>
                {source.records.length
                  ? source.records.map((record) => (
                    <div key={record.id}>
                      <Typography.Paragraph>{record.content}</Typography.Paragraph>
                      {record.duplicateOf && <Tag>重复转发 · 归并至 {record.duplicateOf}</Tag>}
                      <Typography.Paragraph type="secondary">
                        {record.source} · {record.capturedAt} · {record.version} · {record.verification}
                        <br />
                        引用：{record.refs.join('、')}
                      </Typography.Paragraph>
                    </div>
                  ))
                  : <Typography.Text type="secondary">{source.missing}</Typography.Text>}
              </Card>
            ))}
          </>
        )}
      </Drawer>
    </section>
  );
}
