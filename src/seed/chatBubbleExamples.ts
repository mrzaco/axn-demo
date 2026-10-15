/** 气泡用例页的示例数据，只供 /settings/chat-controls/examples 使用。 */
export const CHAT_BUBBLE_EXAMPLES = [
  { id: 'qa', title: '知识问答', description: '结论、分节建议、置信度与依据来源', agent: '安小能', prompt: '堤防管涌有哪些识别征兆？怎么抢护？', controls: ['身份标识', '文本', '分节内容', '置信度', '来源引用'] },
  { id: 'summary', title: '灾情摘要', description: '任务运行条、字段摘要与后续操作', agent: '态势感知智能体', agentId: 'agent-situation', prompt: '帮我汇总清河段险情的最新情况。', controls: ['身份标识', '任务运行条', '字段摘要', '操作按钮'] },
  { id: 'images', title: '现场图文回报', description: '现场照片与分节说明', agent: '态势感知智能体', agentId: 'agent-situation', prompt: '看一下现场照片，整理当前作业进展。', controls: ['身份标识', '图片展示', '分节内容', '来源引用'] },
  { id: 'resources', title: '资源查询', description: '资源清单、差异提醒与查看入口', agent: '资源管理智能体', agentId: 'agent-resource', prompt: '查询附近可调派的救援队伍和物资。', controls: ['任务运行条', '资源清单', '提示信息', '操作按钮'] },
  { id: 'document', title: '文书生成', description: '运行中 / 完成 / 取消三种状态与产物条目', agent: '文书生成智能体', agentId: 'agent-doc', prompt: '根据现场资料生成一份情况报告。', controls: ['身份标识', '任务运行条', '产物条目', '操作按钮'] },
  { id: 'input', title: '材料与信息补录', description: '附件确认、文书选择与信息输入', agent: '文书生成智能体', agentId: 'agent-doc', prompt: '参考这份现场记录，帮我整理报送材料。', controls: ['附件条目', '选项按钮', '信息输入', '提示信息'] },
  { id: 'failure', title: '异常与重试', description: '失败原因、执行记录与恢复反馈', agent: '态势感知智能体', agentId: 'agent-situation', prompt: '更新当前水位监测数据。', controls: ['任务运行条', '提示信息', '字段摘要', '操作按钮'] },
] as const;

export type BubbleExampleId = typeof CHAT_BUBBLE_EXAMPLES[number]['id'];

export const EXAMPLE_SITE_IMAGES = [
  { src: '/doc-assets/qinghe-site-1.jpg', caption: '抢险机械清理作业面' },
  { src: '/doc-assets/qinghe-site-2.jpg', caption: '现场队伍会商处置方案' },
];
