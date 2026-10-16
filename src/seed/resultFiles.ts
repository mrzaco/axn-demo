import type { Conversation } from '@/domain/types';
import type { FileCategory, ResultFile } from '@/services/myFiles';
import type { useMockDocumentStore } from '@/store/mockDocumentStore';

type DemoFile = { id: string; category: FileCategory; conversationId: string; title: string; createdAt: string; content: string };

/** 与现有示例对话绑定；对话删除后不再展示，不创建“已删除”的假来源。 */
export const DEMO_RESULT_FILES: DemoFile[] = [
  { id: 'nandi-checklist', category: 'assistant', conversationId: 'conv-seed-nandi', title: '南堤管涌险情现场核实清单', createdAt: '2026-09-28T10:18:00+08:00', content: `南堤管涌险情现场核实清单
整理时间：2026年9月28日 10:18

一、已掌握情况
巡堤人员发现背水坡局部渗水，回报涌水夹带细砂，现场已设置警戒区并安排专人观察。

二、待现场核实
1. 标记出水点位置，补录桩号与距堤脚距离。
2. 同一时刻记录出水范围、浑浊程度及附近新增渗水点。
3. 核对现场人员、照明、通信和撤离通道是否到位。
4. 补齐带拍摄时间的全景与近景照片。

三、回报要求
由现场联络员统一汇总；发现涌水量明显增大、浑浊加重或地面塌陷时，立即报告现场指挥人员。

本清单为模拟演示资料。` },
  { id: 'nandi-handover', category: 'assistant', conversationId: 'conv-seed-nandi', title: '南堤现场交接事项与待办', createdAt: '2026-09-28T10:24:00+08:00', content: `南堤现场交接事项与待办
交接时点：2026年9月28日 10:20

已完成
- 警戒带与夜间照明点位已登记。
- 现场情况回报与资源需求已汇总至值班室。

待跟进
事项：复测渗水范围；责任岗位：巡堤组；要求：复测后补录照片和观察记录。
事项：核实备用物资位置；责任岗位：保障组；要求：确认装卸条件并回报。
事项：补全现场联络表；责任岗位：值班室；要求：交接前复核通信畅通情况。

交接提示
对未核实信息保留“待核实”标记，避免将拟投入力量写成已调派力量。

模拟演示资料。` },
  { id: 'zhanghe-monitor', category: 'assistant', conversationId: 'conv-seed-zhanghe', title: '漳河镇水位监测信息核对表', createdAt: '2026-09-28T09:50:00+08:00', content: `漳河镇水位监测信息核对表
记录日期：2026年9月28日

核对项目 | 当前记录 | 后续动作
监测时点 | 09:30、09:45 | 确保对比采用同一测站
数据单位 | 米 | 回报时保留小数位
水位趋势 | 现场回报上涨 | 与测站原始记录交叉核对
低洼区域 | 已通知属地巡查 | 回报积水范围及道路通行情况

待补材料
测站名称、最近一次巡查记录、低洼点位照片与属地联系人。

模拟演示资料，不替代实时监测数据。` },
  { id: 'duty-notes', category: 'assistant', conversationId: 'conv-seed-daily-draft', title: '9月28日值班重点事项摘录', createdAt: '2026-09-28T08:35:00+08:00', content: `9月28日值班重点事项摘录

重点事件
南堤堤防管涌险情：跟进现场处置回报，补齐险情变化与拟投入力量信息。
漳河镇水位上涨：核对监测时点，持续关注低洼点位巡查结果。

值班待办
09:00前汇总上一班未办结事项。
交接前复核通信录与装备联络清单。
日报报送前确认统计口径，核查“已投入”和“拟投入”的表述。

模拟演示资料。` },
  { id: 'nandi-brief', category: 'documents', conversationId: 'conv-seed-nandi', title: '清河段南堤管涌险情处置要情（第3期）', createdAt: '2026-09-28T10:22:00+08:00', content: `应急救援要情
模拟报〔2026〕第3期

一、险情概况
9月28日上午，巡堤人员回报清河段南堤背水坡出现局部渗水并夹带细砂。具体位置与影响范围正在进一步核实。

二、处置进展
现场已划定警戒区域，安排巡查观察与情况回报。相关队伍与保障物资正在按需求复核，尚未形成正式调派命令。

三、下一步工作
持续核实渗水变化，完善现场记录；复核道路、照明、通信与撤离条件；根据现场专业意见调整后续安排。

报送：应急指挥中心（模拟）
承办：防汛值班室
2026年9月28日
模拟草稿，供演示。` },
  { id: 'duty-daily', category: 'documents', conversationId: 'conv-seed-daily-draft', title: '防汛值班日报（2026年9月28日）', createdAt: '2026-09-28T08:40:00+08:00', content: `防汛值班日报
统计时段：9月27日20时至9月28日08时

一、值守情况
值班领导、值班员及通信保障岗位均按计划在岗，完成上一班事项交接。

二、重点情况
跟进南堤管涌险情与漳河镇水位上涨情况，已汇总现场回报并登记待核实事项。

三、资源保障
复核抢险队伍、运输车辆与照明保障资源联络信息。拟使用资源以最终确认清单为准。

四、交接事项
持续跟踪重点点位，补齐巡查照片与监测记录；复核日报统计口径后按程序报送。

值班室（模拟）
2026年9月28日` },
  { id: 'sept20-brief', category: 'documents', conversationId: 'conv-seed-0920-brief', title: '9月20日重点险情值班要情（归档稿）', createdAt: '2026-09-20T19:20:00+08:00', content: `重点险情值班要情
模拟归档稿 · 第4版

一、当日工作
汇总所属点位巡查信息，核对值守与资源保障情况，完成重点事项登记。

二、处置与保障
对现场回报逐项核实并记录反馈；复核运输、通信与照明保障条件，形成交接清单。

三、后续安排
继续跟踪未办结事项，完善资料归档与回报渠道，重要变化及时报告。

模拟演示资料。` },
  { id: 'nandi-situation', category: 'situation', conversationId: 'conv-seed-nandi', title: '南堤管涌险情态势简报（10:00时点）', createdAt: '2026-09-28T10:05:00+08:00', content: `南堤管涌险情态势简报
数据时点：2026年9月28日10:00

总体态势
现场回报存在局部渗水夹砂，已开展巡查观察与范围标记。暂无足够数据判断险情变化趋势。

重点关注
出水范围、涌水浑浊程度及堤脚周边变化。
现场人员与装备活动范围、夜间照明和撤离通道条件。

信息缺口
缺少连续观测记录和统一时点的现场照片，需要补录后再研判。

模拟演示资料。` },
  { id: 'zhanghe-situation', category: 'situation', conversationId: 'conv-seed-zhanghe', title: '漳河镇水位上涨阶段性研判', createdAt: '2026-09-28T09:56:00+08:00', content: `漳河镇水位上涨阶段性研判

当前情况
现场回报水位呈上涨趋势，属地正在核对测站记录并组织低洼点位巡查。

研判重点
比较同测站、相邻时点的数据；确认道路与低洼区域情况；关注后续降雨及上游来水信息。

后续建议
补齐原始监测值与现场核实记录，再形成后续处置建议。当前资料不足以确认影响范围。

模拟演示资料，不构成预警发布。` },
  { id: 'dispatch-resources', category: 'resources', conversationId: 'conv-seed-dispatch', title: '清河段防汛队伍与装备候选清单', createdAt: '2026-09-27T16:50:00+08:00', content: `清河段防汛队伍与装备候选清单
核对时点：2026年9月27日16:50

队伍 | 人员 | 装备 | 预计准备时间 | 状态
一号工程应急救援队 | 24人 | 挖掘机2台、运输车2辆 | 30分钟 | 待确认
二号抢险保障队 | 18人 | 排水泵4台、照明设备2套 | 45分钟 | 待确认
通信与后勤保障组 | 8人 | 通信车1辆、发电机2台 | 20分钟 | 待确认

说明
以上为模拟候选资源，准备时间不等于到达时间；可用状态与运输条件需在调派前复核。` },
  { id: 'nandi-supplies', category: 'resources', conversationId: 'conv-seed-nandi', title: '南堤抢险物资需求核对清单', createdAt: '2026-09-28T10:12:00+08:00', content: `南堤抢险物资需求核对清单

物资 | 参考需求 | 核对事项
编织袋 | 500条 | 复核库存、装车与运送条件
反滤料 | 30立方米 | 确认规格与堆放位置
便携照明 | 4套 | 现场试机并复核供电
警戒带 | 6卷 | 明确布设范围

现场需求需由专业人员结合实际工况确认。本清单为模拟备料记录，未形成正式采购或调派指令。` },
  { id: 'nandi-plan', category: 'proposals', conversationId: 'conv-seed-nandi', title: '南堤管涌险情现场处置行动建议（V2）', createdAt: '2026-09-28T10:20:00+08:00', content: `南堤管涌险情现场处置行动建议
版本：V2 · 待审核

工作目标
保障现场人员安全，及时核实险情变化，形成连续、可追溯的观察记录。

组织分工
巡查组负责观察标记与情况回报；保障组核对物资、照明与通信；联络员汇总待核实事项。

实施安排
先复核警戒范围与撤离通道，再由现场专业人员确认技术措施与作业顺序。

风险提示
未确认拟使用资源的可用状态；缺少连续观测记录，不能直接判断险情已经稳定。

模拟建议，具体措施须经专业审核。` },
  { id: 'dispatch-plan', category: 'proposals', conversationId: 'conv-seed-dispatch', title: '清河段防汛力量预置与投送建议', createdAt: '2026-09-27T17:05:00+08:00', content: `清河段防汛力量预置与投送建议

预置原则
按风险点位就近复核队伍与物资，优先确认道路通行、装卸条件和联络方式。

阶段安排
第一阶段：核对候选资源状态与集结条件。
第二阶段：明确拟预置点位、到达路线与后勤保障。
第三阶段：根据现场反馈调整候选清单。

待确认事项
人员装备状态、路线、预计出发时间及现场接应岗位。

本文件为模拟建议，非正式调派命令。` },
  { id: 'nandi-evaluation', category: 'evaluations', conversationId: 'conv-seed-nandi', title: '南堤险情阶段处置效果评估', createdAt: '2026-09-28T10:24:00+08:00', content: `南堤险情阶段处置效果评估
评估时点：2026年9月28日10:20

一、已完成工作
警戒区设置、观察点登记与现场信息回报流程已建立。

二、阶段成效
现场分工与联络渠道逐步明确，重点事项形成跟进清单；尚缺连续观测数据，暂不对险情控制效果作确定性判断。

三、改进建议
统一回报时点；补齐照片、观察记录与资源状态信息；复核交接事项责任岗位。

模拟评估，仅用于流程演示。` },
  { id: 'dispatch-evaluation', category: 'evaluations', conversationId: 'conv-seed-dispatch', title: '防汛资源准备与响应效率复盘', createdAt: '2026-09-27T17:00:00+08:00', content: `防汛资源准备与响应效率复盘

复盘范围
候选队伍与物资核对、通信联络和出发准备。

发现问题
部分资源状态回报时点不一致；准备时间与预计到达时间混用；现场接应信息尚未补全。

改进事项
统一状态核对时点，分别记录准备、出发与到达时间；指定接应岗位并完善联系表。

模拟复盘，供工作流程展示。` },
];

export function demoResultFiles(conversations: Record<string, Conversation>, sessionByConversation: Record<string, string>, libraries: ReturnType<typeof useMockDocumentStore.getState>['libraries'] = {}): ResultFile[] {
  return DEMO_RESULT_FILES.flatMap(file => {
    const conversation = conversations[file.conversationId];
    const scope = sessionByConversation[file.conversationId];
    if (file.category === 'documents' && scope && libraries[scope]?.documents.some(document => document.id === `generated-demo-file-${file.id}`)) return [];
    return conversation ? [{ ...file, id: `demo-file:${file.id}`, sessionId: sessionByConversation[conversation.id] ?? `demo-session:${conversation.id}`,
      conversationTitle: conversation.title, isExample: true }] : [];
  });
}

const DEMO_CONVERSATION_TITLES: Record<string, string> = {
  'conv-seed-nandi': '南堤险情核实与现场交接',
  'conv-seed-zhanghe': '漳河镇水位监测信息核对',
  'conv-seed-daily-draft': '防汛值班重点事项整理',
};

/** 文件页的示例分组标题；默认空白对话按产物命名，保留原对话关联。 */
export function mockFileConversationTitles(files: ResultFile[]): ResultFile[] {
  const displayFiles = files.map(file => file.category === 'assistant' ? {
    ...file,
    title: file.title.replace(/知识问答/g, '现场处置参考要点'),
    conversationTitle: file.conversationTitle.replace(/知识问答/g, '现场处置要点整理'),
  } : file);
  const titles = new Map<string, string>();
  for (const file of displayFiles) {
    if (file.category !== 'assistant' || titles.has(file.sessionId)) continue;
    const title = DEMO_CONVERSATION_TITLES[file.conversationId ?? ''];
    const isDefault = /^新的对话(?:\s+\d+)?$/.test(file.conversationTitle.trim());
    titles.set(file.sessionId, title ?? (isDefault
      ? file.title === '解释依据与术语' ? '应急处置依据与术语核对' : file.title
      : file.conversationTitle));
  }
  return displayFiles.map(file => file.category === 'assistant'
    ? { ...file, conversationTitle: titles.get(file.sessionId) ?? file.conversationTitle }
    : file);
}
