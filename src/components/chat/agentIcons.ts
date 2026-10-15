import { Bot, FileCheck, Flame, Lightbulb, ShieldCheck, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** 智能体图标：能力块 chip、对话里的智能体头像共用（与 NavPages 的 AGENTS[].icon 同源选型）。 */
export const AGENT_ICONS: Record<string, LucideIcon> = {
  'agent-doc': FileCheck,
  'agent-situation': Flame,
  'agent-resource': Wrench,
  'agent-plan': Lightbulb,
  'agent-eval': ShieldCheck,
};

export const agentIcon = (agentId?: string): LucideIcon => (agentId && AGENT_ICONS[agentId]) || Bot;
