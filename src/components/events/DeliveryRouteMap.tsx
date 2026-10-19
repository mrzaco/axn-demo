/** 本地投送路线示意，不提供真实导航或里程估算。 */
import { useId } from 'react';
import { Tag, Typography } from 'antd';
import type { DisasterProfile } from '@/seed/disasterScenarios';
import './events.css';

export default function DeliveryRouteMap({ profile, route = '东侧绕行（示例）', road = '主路阻断（示例）', progress = 0 }: {
  profile?: DisasterProfile;
  route?: string;
  road?: string;
  /** 0–3，当前轨迹节点。 */
  progress?: number;
}) {
  const id = useId().replace(/:/g, '');
  const rail = /铁路/.test(route);
  const location = profile?.location ?? '事发地';
  const reached = Math.min(3, Math.max(0, progress));
  const nodes = [
    { label: '基地出发', x: 92, y: 248 },
    { label: rail ? '铁路转运点' : '通行检查点', x: 280, y: 224 },
    { label: '前方集结点', x: 520, y: 220 },
    { label: '现场到达', x: 714, y: 108 },
  ];
  const path = 'M92 248 C168 248 198 224 280 224 L476 224 Q510 224 520 220 C610 204 638 108 714 108';
  const main = 'M92 248 C150 240 160 120 270 120 L610 120 Q672 120 714 108';
  return (
    <div className="axn-delivery-map" data-testid="delivery-route-map">
      <div className="axn-delivery-map-head">
        <Typography.Text strong>投送路线示意</Typography.Text>
        <Tag color="blue">{rail ? '铁路投送' : '东侧绕行'} · 模拟</Tag>
      </div>
      <div className="axn-delivery-map-location">{location}</div>
      <svg viewBox="0 0 800 340" role="img" aria-label={`${location}投送路径示意图：${route}`}>
        <title>{route}；{road}；轨迹节点 {reached + 1}/4（示意，非真实导航）</title>
        <defs>
          <pattern id={`${id}-grid`} width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e7ede9" strokeWidth=".6" /></pattern>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M2 2L8 5L2 8" fill="none" stroke="white" strokeWidth="1.6" /></marker>
        </defs>
        <rect width="800" height="340" fill="#f4f7f3" />
        <rect width="800" height="340" fill={`url(#${id}-grid)`} />
        <path d="M0 60Q140 6 276 66T570 44T800 78V0H0Z" fill="#e5eee3" />
        <path d="M0 302Q180 236 340 294T800 264V340H0Z" fill="#e4eddf" />
        <path d="M-20 123C160 82 246 118 394 70S642 22 830 60" fill="none" stroke="#d5e8ef" strokeWidth="22" />
        <path d="M-20 123C160 82 246 118 394 70S642 22 830 60" fill="none" stroke="#edf7fb" strokeWidth="2" />
        <g fill="none" stroke="#fff" strokeWidth="8">
          <path d="M0 207L180 300L430 256L800 308" /><path d="M167 0L230 100L392 340" /><path d="M566 0L610 150L800 228" />
        </g>
        <g fontSize="11" fill="#93a2a0"><text x="75" y="48">基地周边</text><text x="356" y="43">河道</text><text x="634" y="284">作业区域</text></g>
        <path d={main} fill="none" stroke="#fff" strokeWidth="9" />
        <path d={main} fill="none" stroke="#df8d82" strokeWidth="4" strokeDasharray="7 7" />
        <path d={path} fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
        <path d={path} fill="none" stroke="#3477ed" strokeWidth="6" strokeLinecap="round" />
        {rail && <path d={path} fill="none" stroke="#c8ddff" strokeWidth="9" strokeDasharray="2 9" />}
        <path d="M350 224H370 M440 224H460 M590 179L604 166" fill="none" stroke="#3477ed" strokeWidth="4" markerEnd={`url(#${id}-arrow)`} />
        <g transform="translate(408 120)">
          <circle r="13" fill="#fff" stroke="#dd6b5e" strokeWidth="2" />
          <path d="M-4 -4L4 4M4 -4L-4 4" stroke="#dd6b5e" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="-48" y="-47" width="96" height="27" rx="7" fill="#fff1ef" stroke="#f1d1cc" />
          <text y="-29" textAnchor="middle" fontSize="12" fill="#b95448">主通道阻断</text>
        </g>
        {nodes.map((node, index) => {
          const done = index < reached;
          const current = index === reached;
          const labelY = index === 3 ? node.y - 51 : node.y + 25;
          return <g key={node.label}>
            {current && <circle cx={node.x} cy={node.y} r="22" fill="#3477ed" opacity=".13" />}
            <circle cx={node.x} cy={node.y} r="13" fill={done || current ? '#3477ed' : '#fff'} stroke={done || current ? '#fff' : '#8eaddb'} strokeWidth="3" />
            {done ? <path d={`M${node.x - 5} ${node.y}l3 3 7 -7`} stroke="#fff" strokeWidth="2.3" strokeLinecap="round" fill="none" /> : <text x={node.x} y={node.y + 4} textAnchor="middle" fill={current ? '#fff' : '#6381ab'} fontSize="12" fontWeight="600">{index + 1}</text>}
            <rect x={node.x - 61} y={labelY} width="122" height="29" rx="7" fill="#fff" stroke="#e0e7ee" />
            <text x={node.x} y={labelY + 19} textAnchor="middle" fontSize="13" fontWeight="500" fill="#334155">{node.label}</text>
          </g>;
        })}
        <g transform="translate(756 32)" fill="#6e8191"><path d="M0 1L-6 17L0 13L6 17Z" /><text y="-5" textAnchor="middle" fontSize="10">N</text></g>
        <g transform="translate(24 318)" fontSize="11" fill="#65788b">
          <path d="M0 -4H23" stroke="#3477ed" strokeWidth="4" strokeLinecap="round" /><text x="31">选用路线</text>
          <path d="M112 -4H135" stroke="#df8d82" strokeWidth="3" strokeDasharray="5 4" /><text x="143">阻断通道</text>
        </g>
        <g transform="translate(651 310)"><rect width="125" height="22" rx="6" fill="#fff" opacity=".94" /><text x="62" y="15" textAnchor="middle" fontSize="11" fill="#54729a">当前节点：{nodes[reached].label}</text></g>
      </svg>
      <Typography.Text type="secondary" className="axn-delivery-map-hint">路线与地形均为模拟示意，不代表真实导航、距离或实时路况。</Typography.Text>
    </div>
  );
}
