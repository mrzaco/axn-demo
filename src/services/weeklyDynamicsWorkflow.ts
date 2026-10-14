/**
 * 应急救援周工作动态的生成流程 —— 素材依赖型文书。
 *
 * 与另外两条文书流程的关键区别：正文数据基本来自各二级企业报来的统计表，所以**生成前必须先拿到
 * 参考文档与附件**。因此这里比 workSummaryWorkflow 多一个「上传门」阶段：
 *
 *   waiting_upload  → 用户上传参考文档/附件（卡片内上传，或直接在输入框把文件发给智能体）
 *   collecting      → 按上传件整理文书要素
 *   calling         → 调用文书生成智能体
 *   generating      → 编排红头文书
 *   completed / interrupted
 *
 * 放行条件只看「至少 1 份上传件」，不按文件名逐项匹配：演示环境里文件名千奇百怪，
 * 逐项匹配会把用户卡死；清单（REQUIRED_ATTACHMENTS）只作为“需要传什么”的提示。
 * 上传件不落盘、不读取内容，只留文件名与大小（同 ChatMessage.attachments 的约定）。
 */
import type { ChatMessage } from '@/domain/types';
import { DOCUMENT_CATEGORIES } from '@/seed/mockDocuments';
import { COLLECT_STEP_MS, useMockDocumentStore } from '@/store/mockDocumentStore';
import { useSessionStore } from '@/store/sessionStore';

type Workflow = NonNullable<ChatMessage['documentWorkflow']>;
export type UploadedFile = { name: string; size: number };

export const WEEKLY_DYNAMICS_CODE = 'WEEKLY_DYNAMICS';

/** 生成周工作动态需要的参考文档与附件（显示在上传门里，指导用户传什么）。 */
export const REQUIRED_ATTACHMENTS = [
  '工程练兵情况统计表（附件1）',
  '安全应急产业营收情况统计表（附件2）',
  '本周中标项目（直接签订合同项目）汇总表',
];

const ELEMENTS: Workflow['elements'] = [
  { label: '文书类型', value: '应急救援周工作动态' },
  { label: '编制单位', value: '集团应急救援事业部（模拟）' },
  { label: '报送对象', value: '集团公司领导，副总师级以上管理人员（模拟）' },
  { label: '周期', value: '本周一至周日（模拟）' },
  { label: '数据来源', value: '各二级企业报来的参考文档与附件（生成前需上传）' },
  { label: '文书格式', value: '红头格式，含附件清单与送/发版记' },
];

/** 会话里是否还有正在跑的文书生成（生成中/排队中都算，避免重复出件）。 */
function generating(sessionId: string): boolean {
  const store = useSessionStore.getState();
  return !!useMockDocumentStore.getState().libraries[sessionId]?.generatingCode
    || Object.values(store.tasks).some(task => task.sessionId === sessionId && ['running', 'queued'].includes(task.status));
}

function findWorkflow(sessionId: string, messageId: string): Workflow | undefined {
  return useSessionStore.getState().sessions[sessionId]?.messages.find(message => message.messageId === messageId)?.documentWorkflow;
}

/**
 * 点「周工作动态」：只落一张上传门卡片，不收要素也不生成。
 * 要素收集要等文件到位才做 —— 正文数据全来自这些统计表，先问要素也是白问。
 */
export function startWeeklyDynamics(sessionId: string, text = '生成应急救援周工作动态') {
  const store = useSessionStore.getState();
  const session = store.sessions[sessionId];
  if (!session || generating(sessionId)) return;
  // 同一会话只留一张在等的门：重复点不叠加（和 workSummaryWorkflow 的 waiting_input 判断同一套思路）。
  if (session.messages.some(message => message.documentWorkflow?.stage === 'waiting_upload')) return;
  store.appendMessage(sessionId, { sessionId, role: 'user', kind: 'text', text, taskId: null });
  store.appendMessage(sessionId, {
    sessionId, role: 'assistant', kind: 'agent', taskId: null,
    text: '生成《应急救援周工作动态》需要先上传本周的参考文档与附件：各二级企业报来的统计表是正文数据的唯一来源，没有材料我无法编制。',
    agentName: '文书生成智能体', agentRole: '生成应急救援周工作动态 · 需要参考文档与附件',
    documentWorkflow: {
      stage: 'waiting_upload', elements: ELEMENTS,
      requiredAttachments: REQUIRED_ATTACHMENTS, attachments: [],
    },
  });
}

/** 生成件的正文 = 该文种的正文骨架；「附件」一节换成本轮真实上传件清单（样稿里的附件名是示例）。 */
function buildSections(files: UploadedFile[]): [string, string][] {
  const category = DOCUMENT_CATEGORIES.find(item => item.code === WEEKLY_DYNAMICS_CODE);
  const body = (category?.sections ?? []).filter(([heading]) => heading !== '附件');
  const list = files.map((file, index) => `附件${index + 1}：${file.name}`).join('\n');
  return [
    ...body.map(([heading, text]): [string, string] => [heading, text]),
    ['附件', `本次生成依据以下 ${files.length} 份参考文档与附件（模拟）：\n${list}\n各附件表体见下方（表头与数据取参考真件，模拟口径）。`],
  ];
}

/**
 * 上传门收到文件后继续：收要素 → 调用智能体 → 生成。
 * 文件来自卡片内的上传控件，或用户在输入框直接把文件发过来（两条路共用这里）。
 */
export async function submitDynamicsSources(sessionId: string, messageId: string, files: UploadedFile[]) {
  const store = useSessionStore.getState();
  const workflow = findWorkflow(sessionId, messageId);
  if (!workflow || workflow.stage !== 'waiting_upload' || files.length === 0 || generating(sessionId)) return;

  const attachments = files.map(({ name, size }) => ({ name, size }));
  const update = (patch: Partial<Workflow>) =>
    useSessionStore.getState().updateDocumentWorkflow(sessionId, messageId, { ...workflow, ...patch, attachments });

  // 上传动作也记进对话流：附件用现成的 message-attachments 渲染，刷新后仍看得到传了什么。
  store.appendMessage(sessionId, {
    sessionId, role: 'user', kind: 'text', taskId: null,
    text: `已上传参考文档与附件（${attachments.length} 份）`, attachments,
  });
  update({ stage: 'collecting' });
  const document = await useMockDocumentStore.getState().generate(sessionId, WEEKLY_DYNAMICS_CODE, {
    elements: workflow.elements,
    sections: buildSections(attachments),
    // 逐条推进要素收集（与值班日报/应急要情同一节拍，见 mockDocumentStore 的 COLLECT_STEP_MS）：
    // 卡片上的进度条与扫光都按 collectedCount 走。注意 update() 是拿提交上传时快照的 workflow
    // 做底子的，stage 必须显式带上，否则会退回 waiting_upload。
    collect: async () => {
      for (let count = 1; count <= workflow.elements.length; count += 1) {
        await new Promise(resolve => setTimeout(resolve, COLLECT_STEP_MS));
        update({ stage: 'collecting', collectedCount: count });
      }
    },
    onStage: stage => update({ stage }),
  });
  update({ stage: document ? 'completed' : 'interrupted', documentId: document?.id });
}
