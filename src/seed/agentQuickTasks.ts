/**
 * 与智能体能力页（NavPages.tsx 的 AGENTS）一一对应的快捷入口：一个智能体一块，共 5 块。
 *
 * chip 上恒定显示能力名（label），点击后在 chip 上方弹出菜单再选具体任务（向上弹，
 * 避免遮挡下方输入区）；只有一项的能力也是「一项菜单」，保持 chip 语义与交互一致。
 *
 * === task 与意图识别的契约（改这里必须看）===
 * 点击发送的是 task 文本，不是 label —— label 只作展示。task 必须能被
 * services/mock/provider.ts 的 recognize() 命中，否则会落到 UNKNOWN_REPLY_TEXT
 * （“安小能暂未接入真实功能…”）兜底。当前各 task 的落点：
 *
 *   task                                          → intent          说明
 *   生成灾情摘要                                   → summary
 *   汇总多源数据生成灾情摘要                        → summary         含「摘要」
 *   态势研判预警                                   → summary         含「态势」
 *   核对道路与天气态势                              → summary         含「态势」（无道路/气象种子数据，暂复用摘要流程）
 *   生成态势简报                                   → doc_brief       (生成|起草|…).{0,6}(要情|简报) → 出红头文书
 *   查询周边救援资源                               → resource_query
 *   按条件查询周边救援资源                          → resource_query  含「周边救援资源」
 *   查询周边救援资源的可用状态                       → resource_query  同上
 *   生成救援方案                                   → proposal        精确匹配
 *   评估救援效果                                   → evaluation      精确匹配
 *
 * 注意两点：
 * 1) 态势感知的 4 项、救援资源管理的 3 项目前**复用同一套模拟流程**，回复内容相同
 *    （用户消息气泡显示各自不同的 task 文本，仍能看出点了哪个按钮）。要让它们各出
 *    独立结果，需在 provider.ts 新增 intent + 配套文案/种子数据。
 * 2) task 同时用作菜单项的 key，**必须唯一**，两项不可共用同一字符串。
 *
 * 契约由 src/tests/quickTasks.test.ts 守护（每项都能命中、且不重复）。
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
    tasks: [
      { label: '灾情摘要', task: '生成灾情摘要' },
      { label: '多源数据汇聚', task: '汇总多源数据生成灾情摘要' },
      { label: '态势研判预警', task: '态势研判预警' },
      { label: '态势报告自动生成', task: '生成态势简报' },
      { label: '核对道路天气', task: '核对道路与天气态势' },
    ],
  },
  {
    agentId: 'agent-resource',
    agentName: '资源管理智能体',
    label: '救援资源管理',
    tasks: [
      { label: '周边救援资源', task: '查询周边救援资源' },
      { label: '资源智能检索', task: '按条件查询周边救援资源' },
      { label: '核对资源状态', task: '查询周边救援资源的可用状态' },
    ],
  },
  {
    agentId: 'agent-plan',
    agentName: '救援方案生成智能体',
    label: '救援方案生成',
    tasks: [{ label: '现场处置行方案', task: '生成救援方案' }],
  },
  {
    agentId: 'agent-eval',
    agentName: '效果评估智能体',
    label: '救援效果评估',
    tasks: [{ label: '复盘评估分析', task: '评估救援效果' }],
  },
];
