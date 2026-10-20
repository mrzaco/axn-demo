import { ClipboardList, FileText, ListChecks, ShieldCheck, TableProperties } from 'lucide-react';

export const DEMO_SKILLS = [
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
