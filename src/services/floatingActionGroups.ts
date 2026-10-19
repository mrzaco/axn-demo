import type { EventStage } from './agentFlow';
import { stageChoices, type StageChoice, type StageChoiceGroup } from './stageConversation';
import { CONVERSATION_ONLY_ACTIONS } from '@/seed/agentQuickTasks';
import { conversationRequest } from '@/seed/conversationRequests';

const STAGES: { stage: EventStage; label: string; actions: string[] }[] = [
  { stage: '待研判', label: '灾情研判', actions: ['生成灾情摘要', '核对道路天气'] },
  { stage: '力量投送中', label: '力量投送', actions: ['生成周边资源报告', '核对资源状态', '物资核验', '资源预警通知', '资源数据与预警'] },
  { stage: '救援中', label: '现场救援', actions: ['预案条款对照'] },
  { stage: '待复盘', label: '撤收与复盘', actions: ['回撤归建', '七环节救援时间轴', '评估救援效果', '救援复盘与知识'] },
  { stage: '已归档', label: '归档与经验沉淀', actions: ['知识沉淀入库', '正式知识库审核发布', '正式知识检索'] },
];

/** 按事件发展顺序组织提问、操作和材料，当前阶段仅作标记，不改变顺序。 */
export function floatingActionGroups(stage: EventStage | null): StageChoiceGroup[] {
  const seen = new Set<string>();
  const unique = (options: StageChoice[]) => options.filter(option => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
  const quick = (labels: string[]): StageChoice[] => labels.filter(label => CONVERSATION_ONLY_ACTIONS.includes(label)).map(label => ({
    id: `legacy-quick:${label}`, kind: 'question', label: conversationRequest(label), prompt: conversationRequest(label),
  }));
  const groups: StageChoiceGroup[] = [{ label: '了解区域灾情', options: [{ id: 'regional-disasters', kind: 'question', label: '帮我看看我负责的区域目前有哪些灾情？', prompt: '帮我看看我负责的区域目前有哪些灾情？' }] }];
  for (const item of STAGES) {
    const choices = stageChoices(item.stage);
    const questions = choices[0].options.filter(option => option.id !== 'fuzzy-resource-search' || item.stage === '力量投送中');
    groups.push({ label: `${item.label}${stage === item.stage ? ' · 当前阶段' : ''}`, options: unique([...questions, ...quick(item.actions), ...choices[1].options]) });
  }
  // 未分配的新辅助操作保留在末尾，避免配置扩展时入口丢失。
  const remaining = unique(quick(CONVERSATION_ONLY_ACTIONS));
  if (remaining.length) groups.push({ label: '其他辅助操作', options: remaining });
  groups.push({ ...stageChoices(stage ?? '待研判')[2], options: unique(stageChoices(stage ?? '待研判')[2].options) });
  return groups.filter(group => group.options.length);
}
