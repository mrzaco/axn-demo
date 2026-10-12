/**
 * 与智能体能力页（NavPages.tsx 的 AGENTS）一一对应的快捷入口：一个智能体一块，共 5 块。
 *
 * 每块列出该能力的任务：单项能力点击直接执行；文书生成有三类并列文书，点击后在 chip
 * 上方弹出菜单再选（向上弹，避免遮挡下方输入区）。
 * task 一律沿用识别的 canonical 词（见 mock/provider.ts 的 recognize），
 * 能力名 label 只作展示 —— 点击发送的仍是具体任务文本。
 */
export const AGENT_QUICK_TASKS = [
  {
    agentId: 'agent-doc',
    agentName: '文书生成智能体',
    label: '文书生成',
    tasks: [
      { label: '应急要情', task: '生成应急要情' },
      { label: '值班日报', task: '生成值班日报' },
      { label: '工作总结', task: '生成工作总结' },
    ],
  },
  {
    agentId: 'agent-situation',
    agentName: '态势感知智能体',
    label: '态势感知',
    tasks: [{ label: '生成灾情摘要', task: '生成灾情摘要' }],
  },
  {
    agentId: 'agent-resource',
    agentName: '资源管理智能体',
    label: '救援资源管理',
    tasks: [{ label: '查询周边救援资源', task: '查询周边救援资源' }],
  },
  {
    agentId: 'agent-plan',
    agentName: '救援方案生成智能体',
    label: '救援方案生成',
    tasks: [{ label: '生成救援方案', task: '生成救援方案' }],
  },
  {
    agentId: 'agent-eval',
    agentName: '效果评估智能体',
    label: '救援效果评估',
    tasks: [{ label: '评估救援效果', task: '评估救援效果' }],
  },
];
