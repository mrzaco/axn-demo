/**
 * 本地 SVG 态势示意图（T-008）：地形底纹 / 廊道 / 事件点 / 救援队伍 / 物资仓库 / 水位站。
 * 几何数据来自种子 schematicMap 与各实体 schematicPosition，名称取自种子事实；
 * 图上位置不用于计算距离或 ETA（示意，非真实地图）。
 *
 * 配色：品牌蓝（仓库、候选高亮）一律取主题 token；队伍绿 / 事件橙 / 水位站紫 /
 * 当前选中 / 常态连线 / 高亮 取 --axn-legend-* / --axn-map-* 语义色 token。
 */
import { Alert, Space, Tag, Typography, theme } from 'antd';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { factText, incidentById, schematicMap, station, teamById, warehouseById } from '@/seed/scenario';

import { useDemoStore } from '@/store/demoStore';
import { resourceAllowed } from '@/services/factLookup';

const { Text } = Typography;

export interface SchematicOverlayMarker {
  id: string;
  /** 与建设场景演示资源 kind 对齐（含宾馆/加油站等影响目标）。 */
  kind: 'team' | 'warehouse' | 'equipment' | 'hospital' | 'hotel' | 'gasStation' | 'supportUnit' | 'expert' | 'school';
  x: number;
  y: number;
  name: string;
}

export interface SchematicMapProps {
  /** 高亮（描边）的资源 id，一般是候选力量 */
  highlightIds?: string[];
  /** 当前选中的资源 id（与资源表格联动） */
  selectedResourceId?: string | null;
  /** 点击标记或空白处回调（传 null 表示取消选择） */
  onSelectResourceId?: (id: string | null) => void;
  /** 最近一次查询结果 id（授权台账）；为空时仍展示事件周边全部授权资源。 */
  resultIds?: string[];
  /** 建设场景演示叠加点位（分布示意，不走授权台账）。 */
  overlayMarkers?: SchematicOverlayMarker[];
}

interface MarkerEntity {
  id: string;
  x: number;
  y: number;
  name: string;
}

function shortenLabel(name: string, max = 11): string {
  const cleaned = name.replace(/（模拟）/g, '').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function MarkerLabel({
  x,
  y,
  text,
  color,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  anchor?: 'middle' | 'start';
}) {
  const label = shortenLabel(text);
  const width = Math.min(132, Math.max(48, label.length * 8.2 + 16));
  const left = anchor === 'start' ? x : x - width / 2;
  return (
    <g className="axn-schematic-label" pointerEvents="none">
      <rect
        x={left}
        y={y}
        width={width}
        height={20}
        rx={4}
        fill="rgba(255,255,255,0.95)"
        stroke="rgba(15, 23, 42, 0.12)"
        strokeWidth={1}
      />
      <text
        x={anchor === 'start' ? left + 8 : x}
        y={y + 14}
        fontSize={10.5}
        fontWeight={600}
        textAnchor={anchor === 'start' ? 'start' : 'middle'}
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}

/** 按可见点位收紧视野，减少大片留白。 */
function fitViewBox(
  points: { x: number; y: number }[],
  full: number[],
): { minX: number; minY: number; width: number; height: number } {
  const [ox, oy, ow, oh] = full;
  if (!points.length) {
    return { minX: ox, minY: oy, width: ow, height: oh };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const padX = 160;
  const padY = 130;
  let minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  let minY = Math.min(...ys) - padY;
  const maxY = Math.max(...ys) + padY;
  let width = Math.max(420, maxX - minX);
  let height = Math.max(300, maxY - minY);
  // 宽高比贴近面板，避免裁切过扁
  const targetRatio = 1.55;
  if (width / height < targetRatio) {
    const nextW = height * targetRatio;
    minX -= (nextW - width) / 2;
    width = nextW;
  } else if (width / height > 2.1) {
    const nextH = width / 1.7;
    minY -= (nextH - height) / 2;
    height = nextH;
  }
  minX = Math.max(ox - 40, Math.min(minX, ox + ow - width + 40));
  minY = Math.max(oy - 40, Math.min(minY, oy + oh - height + 40));
  return { minX, minY, width, height };
}

export default function SchematicMap({
  highlightIds = [],
  selectedResourceId = null,
  onSelectResourceId,
  resultIds,
  overlayMarkers = [],
}: SchematicMapProps) {
  const { token } = theme.useToken();
  const eventId = useDemoStore(s => s.currentEventId);
  const vb = schematicMap?.viewBox;
  const riverPath = schematicMap?.riverPath ?? '';
  const mapReady = Boolean(vb && vb.length >= 4 && riverPath);
  const inResult = (id: string) => !resultIds || resultIds.length === 0 || resultIds.includes(id);

  const teamMarkers: MarkerEntity[] = mapReady
    ? [...teamById.values()]
      .filter((t) => resourceAllowed(t.resourceId, eventId) && inResult(t.resourceId))
      .map((t) => ({
        id: t.resourceId,
        x: t.schematicPosition.x,
        y: t.schematicPosition.y,
        name: factText(t.factRefs.name) || t.resourceId,
      }))
    : [];
  const warehouseMarkers: MarkerEntity[] = mapReady
    ? [...warehouseById.values()]
      .filter((w) => resourceAllowed(w.resourceId, eventId) && inResult(w.resourceId))
      .map((w) => ({
        id: w.resourceId,
        x: w.schematicPosition.x,
        y: w.schematicPosition.y,
        name: factText(w.factRefs.name) || w.resourceId,
      }))
    : [];
  const incidentMarkers: MarkerEntity[] = mapReady
    ? [...incidentById.values()].filter(i => i.eventId === eventId).map((i) => ({
      id: i.eventId,
      x: i.schematicPosition.x,
      y: i.schematicPosition.y,
      name: factText(i.factRefs.title) || i.eventId,
    }))
    : [];

  const frame = fitViewBox(
    [
      ...incidentMarkers,
      ...teamMarkers,
      ...warehouseMarkers,
      ...overlayMarkers,
      ...(mapReady && station.eventId === eventId ? [station.schematicPosition] : []),
    ],
    vb ?? [0, 0, 1000, 650],
  );

  const viewBoxStr = `${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`;
  const { minX: fx, minY: fy, width: fw, height: fh } = frame;

  if (!mapReady) {
    return <Alert type="error" showIcon title="态势示意数据不可用（模拟数据缺失）" />;
  }

  const pickMarker = (id: string) => (event: ReactMouseEvent) => {
    event.stopPropagation();
    onSelectResourceId?.(id);
  };

  return (
    <div className="axn-schematic">
      <svg
        viewBox={viewBoxStr}
        role="img"
        aria-label="救援力量空间示意图"
        onClick={() => onSelectResourceId?.(null)}
      >
        <defs>
          <linearGradient id="axn-map-terrain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dfeaf3" />
            <stop offset="38%" stopColor="#eef4f8" />
            <stop offset="100%" stopColor="#d8e5f0" />
          </linearGradient>
          <linearGradient id="axn-map-river" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8ebef0" />
            <stop offset="45%" stopColor="#4a8fd6" />
            <stop offset="100%" stopColor="#6eaae4" />
          </linearGradient>
          <linearGradient id="axn-map-land" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c9d9e6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#b8ccd9" stopOpacity="0.55" />
          </linearGradient>
          <filter id="axn-map-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1.8" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>
          <pattern id="axn-map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(71, 98, 130, 0.1)" strokeWidth="1" />
          </pattern>
          <pattern id="axn-map-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="4" r="1.1" fill="rgba(90, 120, 150, 0.18)" />
            <circle cx="16" cy="18" r="0.9" fill="rgba(90, 120, 150, 0.12)" />
          </pattern>
        </defs>

        {/* 底图 */}
        <rect x={fx} y={fy} width={fw} height={fh} fill="url(#axn-map-terrain)" />
        <rect x={fx} y={fy} width={fw} height={fh} fill="url(#axn-map-grid)" />
        <rect x={fx} y={fy} width={fw} height={fh} fill="url(#axn-map-dots)" />

        {/* 地貌色块 */}
        <path
          d={`M${fx} ${fy + fh * 0.62} Q${fx + fw * 0.25} ${fy + fh * 0.5} ${fx + fw * 0.45} ${fy + fh * 0.6} T${fx + fw} ${fy + fh * 0.68} L${fx + fw} ${fy + fh} L${fx} ${fy + fh} Z`}
          fill="url(#axn-map-land)"
        />
        <path
          d={`M${fx} ${fy} L${fx} ${fy + fh * 0.28} Q${fx + fw * 0.3} ${fy + fh * 0.36} ${fx + fw * 0.55} ${fy + fh * 0.2} T${fx + fw} ${fy + fh * 0.26} L${fx + fw} ${fy} Z`}
          fill="#cfdce8"
          opacity={0.45}
        />

        {/* 支路示意 */}
        <path
          d={`M${fx + fw * 0.08} ${fy + fh * 0.78} Q${fx + fw * 0.3} ${fy + fh * 0.7} ${fx + fw * 0.48} ${fy + fh * 0.74}`}
          fill="none"
          stroke="#a8b9c9"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.55}
        />
        <path
          d={`M${fx + fw * 0.55} ${fy + fh * 0.22} Q${fx + fw * 0.72} ${fy + fh * 0.3} ${fx + fw * 0.9} ${fy + fh * 0.18}`}
          fill="none"
          stroke="#a8b9c9"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.5}
        />

        {/* 等高线 */}
        <path
          d={`M${fx + 24} ${fy + fh * 0.82} Q${fx + fw * 0.28} ${fy + fh * 0.72} ${fx + fw * 0.5} ${fy + fh * 0.8} T${fx + fw - 20} ${fy + fh * 0.84}`}
          fill="none"
          stroke="#9eb2c4"
          strokeWidth={1.2}
          opacity={0.65}
        />
        <path
          d={`M${fx + 36} ${fy + fh * 0.88} Q${fx + fw * 0.32} ${fy + fh * 0.78} ${fx + fw * 0.55} ${fy + fh * 0.86} T${fx + fw - 28} ${fy + fh * 0.9}`}
          fill="none"
          stroke="#9eb2c4"
          strokeWidth={1}
          opacity={0.45}
        />
        <path
          d={`M${fx + 40} ${fy + fh * 0.14} Q${fx + fw * 0.35} ${fy + fh * 0.22} ${fx + fw * 0.62} ${fy + fh * 0.12} T${fx + fw - 30} ${fy + fh * 0.18}`}
          fill="none"
          stroke="#9eb2c4"
          strokeWidth={1.2}
          opacity={0.55}
        />

        {/* 聚落 / 地块示意块 */}
        {[
          [0.12, 0.2, 52, 28],
          [0.78, 0.28, 46, 24],
          [0.18, 0.7, 40, 22],
          [0.72, 0.76, 56, 26],
        ].map(([rx, ry, w, h], i) => (
          <rect
            key={`block-${i}`}
            x={fx + fw * Number(rx)}
            y={fy + fh * Number(ry)}
            width={Number(w)}
            height={Number(h)}
            rx={3}
            fill="rgba(148, 163, 184, 0.22)"
            stroke="rgba(100, 116, 139, 0.28)"
            strokeWidth={1}
          />
        ))}

        {/* 廊道 / 河道 */}
        <path d={riverPath} fill="none" stroke="#b9d4ef" strokeWidth={38} strokeLinecap="round" opacity={0.95} />
        <path d={riverPath} fill="none" stroke="url(#axn-map-river)" strokeWidth={18} strokeLinecap="round" />
        <path
          d={riverPath}
          fill="none"
          stroke="#e8f3ff"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.8}
          strokeDasharray="12 16"
        />

        {/* 分区标注 */}
        <text x={fx + 28} y={fy + 36} fontSize={11} fill="#64748b" fontWeight={600}>上游示意区</text>
        <text x={fx + fw - 118} y={fy + 40} fontSize={11} fill="#64748b" fontWeight={600}>外围集结带</text>
        <text x={fx + 28} y={fy + fh - 18} fontSize={11} fill="#64748b" fontWeight={600}>下游示意区</text>

        {/* 指北针 */}
        <g transform={`translate(${fx + fw - 42} ${fy + 48})`} aria-hidden>
          <circle r={20} fill="rgba(255,255,255,0.94)" stroke="#94a3b8" strokeWidth={1.2} />
          <polygon points="0,-12 4.5,5 0,1.5 -4.5,5" fill="#334155" />
          <text y={16} textAnchor="middle" fontSize={9} fontWeight={700} fill="#334155">N</text>
        </g>

        {/* 比例尺装饰 */}
        <g transform={`translate(${fx + 24} ${fy + 48})`} aria-hidden>
          <rect x={0} y={0} width={108} height={26} rx={5} fill="rgba(255,255,255,0.92)" stroke="rgba(15,23,42,0.1)" />
          <text x={10} y={11} fontSize={8.5} fill="#64748b">示意尺度 · 非测距</text>
          <path d="M12 18 H92" stroke="#475569" strokeWidth={2} />
          <path d="M12 15 V21 M92 15 V21" stroke="#475569" strokeWidth={2} />
        </g>

        {/* 水位站 */}
        {station.eventId === eventId && (
          <g>
            <title>{`水位站（模拟）· 观测 ${factText(station?.latestObservationId ?? '') || '—'}`}</title>
            <polygon
              points={`${station.schematicPosition.x},${station.schematicPosition.y - 11} ${station.schematicPosition.x + 11},${station.schematicPosition.y} ${station.schematicPosition.x},${station.schematicPosition.y + 11} ${station.schematicPosition.x - 11},${station.schematicPosition.y}`}
              fill="var(--axn-legend-station)"
              stroke="#fff"
              strokeWidth={2}
              filter="url(#axn-map-soft)"
            />
            <MarkerLabel
              x={station.schematicPosition.x}
              y={station.schematicPosition.y + 14}
              text="水位站"
              color="#5b21b6"
            />
          </g>
        )}

        {/* 事件点 */}
        {incidentMarkers.map((m) => (
          <g key={m.id}>
            <title>{`${m.name}（模拟事件）`}</title>
            <circle cx={m.x} cy={m.y} r={46} fill="var(--axn-legend-event)" opacity={0.08} />
            <circle
              cx={m.x}
              cy={m.y}
              r={34}
              fill="none"
              stroke="var(--axn-legend-event)"
              strokeWidth={1.4}
              strokeDasharray="5 4"
              opacity={0.55}
            />
            <circle cx={m.x} cy={m.y} r={18} fill="var(--axn-legend-event)" opacity={0.2} />
            <circle
              cx={m.x}
              cy={m.y}
              r={11}
              fill="var(--axn-legend-event)"
              stroke="#fff"
              strokeWidth={2.5}
              filter="url(#axn-map-soft)"
            />
            <circle cx={m.x} cy={m.y} r={3.5} fill="#fff" />
            <MarkerLabel x={m.x + 14} y={m.y - 30} text={m.name} color="#9a3412" anchor="start" />
          </g>
        ))}

        {/* 物资仓库 */}
        {warehouseMarkers.map((m) => {
          const selected = selectedResourceId === m.id;
          return (
            <g key={m.id} onClick={pickMarker(m.id)}>
              <title>{`${m.name}（物资仓库 · 模拟）`}</title>
              <polygon
                points={`${m.x},${m.y - 13} ${m.x - 12},${m.y + 10} ${m.x + 12},${m.y + 10}`}
                fill={selected ? token.colorPrimaryHover : token.colorPrimary}
                stroke={selected ? 'var(--axn-map-active)' : '#fff'}
                strokeWidth={selected ? 3 : 2}
                filter="url(#axn-map-soft)"
              />
              <MarkerLabel x={m.x} y={m.y + 14} text={m.name} color="#1c4d80" />
            </g>
          );
        })}

        {/* 救援队伍 */}
        {teamMarkers.map((m) => {
          const highlighted = highlightIds.includes(m.id);
          const selected = selectedResourceId === m.id;
          const stroke = selected ? 'var(--axn-map-active)' : highlighted ? token.colorPrimary : '#fff';
          const strokeWidth = selected ? 3 : highlighted ? 2.5 : 2;
          return (
            <g key={m.id} onClick={pickMarker(m.id)}>
              <title>{`${m.name}${highlighted ? ' · 候选力量（≠已调派）' : ''}（模拟）`}</title>
              {highlighted && (
                <rect
                  x={m.x - 16}
                  y={m.y - 16}
                  width={32}
                  height={32}
                  rx={7}
                  fill="none"
                  stroke={token.colorPrimary}
                  strokeWidth={1.4}
                  opacity={0.55}
                />
              )}
              <rect
                x={m.x - 10}
                y={m.y - 10}
                width={20}
                height={20}
                rx={4}
                fill={selected ? 'var(--axn-map-selected)' : 'var(--axn-legend-team)'}
                stroke={stroke}
                strokeWidth={strokeWidth}
                filter="url(#axn-map-soft)"
              />
              <MarkerLabel x={m.x} y={m.y + 14} text={m.name} color="#26641a" />
            </g>
          );
        })}

        {/* 建设场景叠加点位 */}
        {overlayMarkers.map((m) => {
          const highlighted = highlightIds.includes(m.id);
          const selected = selectedResourceId === m.id;
          const fill = m.kind === 'hospital' || m.kind === 'school' || m.kind === 'hotel'
            ? 'var(--axn-legend-station)'
            : m.kind === 'equipment' || m.kind === 'warehouse' || m.kind === 'gasStation'
              ? token.colorPrimary
              : 'var(--axn-legend-team)';
          const shape = m.kind === 'team' || m.kind === 'expert' || m.kind === 'supportUnit'
            ? 'team'
            : m.kind === 'hospital' || m.kind === 'school'
              ? 'hospital'
              : 'site';
          const labelColor = shape === 'team' ? '#26641a' : shape === 'hospital' ? '#5b21b6' : '#1c4d80';
          return (
            <g key={`overlay-${m.id}`} onClick={pickMarker(m.id)}>
              <title>{`${m.name}（建设场景示意 · 模拟）`}</title>
              {highlighted && (
                <circle cx={m.x} cy={m.y} r={18} fill="none" stroke={token.colorPrimary} strokeWidth={1.4} opacity={0.55} />
              )}
              {shape === 'team' ? (
                <rect
                  data-testid={`map-marker-${m.id}`}
                  x={m.x - 10}
                  y={m.y - 10}
                  width={20}
                  height={20}
                  rx={4}
                  fill={selected ? 'var(--axn-map-selected)' : fill}
                  stroke={selected ? 'var(--axn-map-active)' : '#fff'}
                  strokeWidth={selected ? 3 : 2}
                  filter="url(#axn-map-soft)"
                />
              ) : shape === 'hospital' ? (
                <polygon
                  data-testid={`map-marker-${m.id}`}
                  points={`${m.x},${m.y - 11} ${m.x + 11},${m.y} ${m.x},${m.y + 11} ${m.x - 11},${m.y}`}
                  fill={fill}
                  stroke={selected ? 'var(--axn-map-active)' : '#fff'}
                  strokeWidth={selected ? 3 : 2}
                  filter="url(#axn-map-soft)"
                />
              ) : (
                <polygon
                  data-testid={`map-marker-${m.id}`}
                  points={`${m.x},${m.y - 12} ${m.x - 11},${m.y + 9} ${m.x + 11},${m.y + 9}`}
                  fill={fill}
                  stroke={selected ? 'var(--axn-map-active)' : '#fff'}
                  strokeWidth={selected ? 3 : 2}
                  filter="url(#axn-map-soft)"
                />
              )}
              <MarkerLabel x={m.x} y={m.y + 14} text={m.name} color={labelColor} />
            </g>
          );
        })}
      </svg>

      <Space size={6} wrap className="axn-legend" align="center">
        <Tag color="orange">模拟数据</Tag>
        <Text type="secondary" className="axn-legend-text">
          {schematicMap?.label ?? '空间示意 · 非真实地图'}
        </Text>
        <span className="axn-legend-item">
          <span className="axn-legend-swatch axn-legend-swatch--team" /> 队伍
        </span>
        <span className="axn-legend-item">
          <span className="axn-legend-swatch axn-legend-swatch--warehouse" /> 仓库/装备
        </span>
        <span className="axn-legend-item">
          <span className="axn-legend-swatch axn-legend-swatch--event" /> 事件
        </span>
        <span className="axn-legend-item">
          <span className="axn-legend-swatch axn-legend-swatch--station" /> 水位站/医院
        </span>
        <Text type="secondary" className="axn-legend-text">
          {schematicMap?.distanceRule ?? '图上位置不用于算公里数或 ETA。'}
        </Text>
      </Space>
    </div>
  );
}
