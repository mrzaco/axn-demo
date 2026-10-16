import { AGENT_QUICK_TASKS } from './agentQuickTasks';

const PRESENTATIONS: Record<string, { role: string; intro: string; hint: string }> = {
  'agent-doc': {
    role: '文书撰写',
    intro: '您好，我是文书生成智能体，可以帮您撰写各类文书。请选择您要生成的文书类型：',
    hint: '您也可以直接把生成要求告诉我；需要参考的文件、要写进文书的图片，都可以上传给我。',
  },
  'agent-situation': {
    role: '灾情研判',
    intro: '您好，我是态势感知智能体，可以帮您汇聚多源数据、梳理灾情摘要、研判态势并生成报告。请选择需要的功能：',
    hint: '您也可以直接描述研判需求，或上传现场照片、监测记录等参考材料。',
  },
  'agent-resource': {
    role: '资源管理',
    intro: '您好，我是救援资源管理智能体，可以帮您查询周边救援资源、检索可用力量并核对资源状态。请选择需要的功能：',
    hint: '您也可以直接告诉我需要的队伍、装备与物资，以及地点、数量和到达时间要求。',
  },
  'agent-plan': {
    role: '方案编制',
    intro: '您好，我是救援方案生成智能体，可以结合当前灾情与救援资源，为您编制现场处置行动方案。请选择需要的功能：',
    hint: '您也可以直接说明处置目标和现场约束，或上传相关预案与现场资料。',
  },
  'agent-eval': {
    role: '复盘评估',
    intro: '您好，我是救援效果评估智能体，可以帮您评估处置成效、分析剩余风险，并梳理复盘与改进建议。请选择需要的功能：',
    hint: '您也可以直接说明评估范围与关注点，或上传救援过程记录和阶段总结。',
  },
};

export const AGENT_INVITATIONS = AGENT_QUICK_TASKS.map(agent => ({
  agentId: agent.agentId,
  name: `${agent.label}智能体`,
  options: agent.tasks,
  ...PRESENTATIONS[agent.agentId],
}));
