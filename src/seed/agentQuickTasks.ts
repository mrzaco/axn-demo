/**
 * 底部快捷任务：由 quickActionCatalog.json（招标 §4）派生。
 * 含 chat（走 AgentSummonCard + TaskCard）与 flow（打开右侧业务流程工作区）。
 * 展示名见 tenderNames。
 */
import { chipCatalogActions } from './quickActionCatalog';

export const AGENT_QUICK_TASKS = chipCatalogActions().map((action) => ({
  agentId: action.agentId,
  agentName: action.agentName,
  label: action.label,
  scenarioId: action.scenarioId,
  clause: action.clause,
  kind: action.kind,
})) as readonly {
  agentId: string;
  agentName: string;
  label: string;
  scenarioId: string;
  clause: string;
  kind: 'chat' | 'flow' | 'loop';
}[];
