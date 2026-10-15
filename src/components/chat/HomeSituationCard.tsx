/**
 * 首页态势卡：当前关联事件的等级 / 地点 / 发生时间 / 关键数字。
 * 应急产品的首屏应当「先给态势、再问要做什么」，而不是一片空白的欢迎语。
 * 数据全部取自种子事实（factText / latestWaterLevelFactId），不另造数值。
 */
import { Clock, MapPin } from 'lucide-react';
import { useDemoStore } from '@/store/demoStore';
import { latestWaterLevelFactId } from '@/services/factLookup';
import { factText, getFact, incidentById, teams, warehouses } from '@/seed/scenario';

const LEVEL_LABEL: Record<string, { text: string; tone: 1 | 2 | 3 | 4 }> = {
  I: { text: 'Ⅰ级响应', tone: 1 },
  II: { text: 'Ⅱ级响应', tone: 2 },
  III: { text: 'Ⅲ级响应', tone: 3 },
  IV: { text: 'Ⅳ级响应', tone: 4 },
};

const CONTROL_LABEL: Record<string, string> = {
  ongoing: '处置中',
  controlled: '已控制',
  closed: '已结束',
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HomeSituationCard() {
  const eventId = useDemoStore((s) => s.currentEventId);
  // 订阅水位覆盖开关：切换后最新水位跟着变
  useDemoStore((s) => s.waterOverride);
  const incident = incidentById.get(eventId);
  if (!incident) return null;

  const refs = incident.factRefs;
  const level = LEVEL_LABEL[factText(refs.confirmedResponseLevel)];
  const control = CONTROL_LABEL[factText(refs.controlStatus)] ?? factText(refs.controlStatus);
  const waterId = latestWaterLevelFactId(eventId);
  const water = waterId ? `${factText(waterId)}` : '—';
  const waterUnit = waterId ? getFact(waterId)?.unit ?? '' : '';

  const metrics = [
    { label: '最新水位', value: water, unit: waterUnit },
    { label: '可调队伍', value: String(teams.length), unit: '支' },
    { label: '物资仓库', value: String(warehouses.length), unit: '处' },
  ];

  return (
    <section className="axn-situation" data-testid="home-situation" aria-label="当前事件态势">
      <div className="axn-situation-main">
        <div className="axn-situation-tags">
          {level && <span className={`axn-level-badge axn-level-${level.tone}`}>{level.text}</span>}
          {control && <span className="axn-situation-status"><i aria-hidden />{control}</span>}
        </div>
        <div className="axn-situation-title">{factText(refs.title)}</div>
        <div className="axn-situation-meta">
          <span><MapPin size={13} aria-hidden />{factText(refs.location)} · {factText(refs.disasterType)}</span>
          <span><Clock size={13} aria-hidden />{fmtTime(factText(refs.occurredAt))} 接报</span>
        </div>
      </div>
      <dl className="axn-situation-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="axn-situation-metric">
            <dt>{m.label}</dt>
            <dd>{m.value}{m.unit && <small>{m.unit}</small>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
