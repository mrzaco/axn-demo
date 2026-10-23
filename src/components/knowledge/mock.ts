/** 知识库原型的集中数据源。名称、数量与页面关联均从此处派生，不连接业务服务。 */
export type KScope = 'personal' | 'department' | 'unit' | 'public';
export const scopes: { key: KScope; label: string }[] = [
  { key: 'personal', label: '个人知识库' }, { key: 'department', label: '部门知识库' },
  { key: 'unit', label: '单位知识库' }, { key: 'public', label: '公共知识库' },
];
export const categories = ['产品资料', '规章制度', '政策文件'];
export const publicCatalog = [
  { id: 'public-plans', category: '预案法规知识库', name: '防汛预案与法规', description: '防汛应急预案、响应流程及法规条款索引等虚构示例资料。', question: '防汛应急预案包含哪些内容？', documents: [
    ['青岚片区防汛应急预案（示例）', 'PDF'], ['应急响应分级与启动流程（示例）', 'Word'], ['应急法规条款索引（示例）', 'Excel'], ['预案修订与备案说明（示例）', 'TXT'], ['防汛响应流程图（示例）', '图片'], ['综合应急预案编制指引（示例）', 'PDF'],
  ] },
  { id: 'public-cases', category: '事件案例知识库', name: '典型险情处置案例', description: '内涝、堤防险情与边坡滑移等事件的虚构处置复盘。', question: '内涝处置案例中记录了哪些协同事项？', documents: [
    ['青岚镇内涝处置复盘（示例）', 'PDF'], ['南溪堤防险情处置案例（示例）', 'Word'], ['典型灾害事件要素清单（示例）', 'Excel'], ['边坡滑移监测处置记录（示例）', 'TXT'], ['事件处置时间线（示例）', '图片'], ['跨区域协同救援案例（示例）', 'PDF'],
  ] },
  { id: 'public-duty', category: '值守文书知识库', name: '值守文书与报送模板', description: '要情、值班日报、交接记录与信息报送的示例模板。', question: '值守交接记录应包含哪些要素？', documents: [
    ['突发事件要情报送模板（示例）', 'Word'], ['防汛值班日报编写规范（示例）', 'PDF'], ['值守交接记录表（示例）', 'Excel'], ['信息报送用语参考（示例）', 'TXT'], ['值班信息报送流程图（示例）', '图片'], ['阶段性工作总结模板（示例）', 'Word'],
  ] },
  { id: 'public-resources', category: '资源保障知识库', name: '救援资源与保障指南', description: '队伍能力、装备使用、物资储备与调拨的示例资料。', question: '救援物资调拨记录需要哪些信息？', documents: [
    ['抢险救援装备使用手册（示例）', 'PDF'], ['应急物资储备与调拨规范（示例）', 'Word'], ['救援队伍能力清单（示例）', 'Excel'], ['物资保障联络记录（示例）', 'TXT'], ['装备维护作业示意图（示例）', '图片'], ['临时安置资源配置指引（示例）', 'PDF'],
  ] },
  { id: 'public-situation', category: '态势感知知识库', name: '监测预警与态势研判', description: '雨水情指标、监测数据核对、预警汇总和态势简报示例。', question: '雨水情监测数据需要核对哪些要素？', documents: [
    ['雨水情监测指标释义（示例）', 'PDF'], ['多源监测数据核对规则（示例）', 'Word'], ['险情态势研判指标表（示例）', 'Excel'], ['预警信息汇总口径（示例）', 'TXT'], ['水位趋势研判示意图（示例）', '图片'], ['汛期态势简报编写指引（示例）', 'Word'],
  ] },
];
export const publicCategories = publicCatalog.map(item => item.category);
export type KLibrary = { id: string; name: string; description: string; category: string; type: string; sensitive: string; enabled: boolean; scope?: 'public' };
/** 管理页与对话选择器共用范围规则；全部去重，单位暂用空数据状态。 */
export function librariesInScope(rows: KLibrary[], scope: KScope | 'all') {
  return rows.filter(library => scope === 'all' || (scope === 'public' ? library.scope === 'public'
    : scope !== 'unit' && library.scope !== 'public' && (scope === 'personal' || library.id !== 'product')));
}
export const libraries: KLibrary[] = [
  { id: 'product', name: '星澜产品资料库', description: '星澜系列设备的产品手册、维护指南与参数资料。', category: '产品资料', type: '图片/文本', sensitive: '通用敏感词库', enabled: true },
  { id: 'rules', name: '协作制度知识库', description: '虚构的办公协作、设备管理与资料归档制度。', category: '规章制度', type: '图片/文本', sensitive: '通用敏感词库', enabled: true },
  { id: 'policy', name: '产业政策参考库', description: '虚构的产业服务政策、申报指引和图解资料。', category: '政策文件', type: '音视频', sensitive: '无', enabled: false },
  ...publicCatalog.map(item => ({ id: item.id, name: item.name, description: item.description, category: item.category, type: '图片/文本', sensitive: '通用敏感词库', enabled: true, scope: 'public' as const })),
];
export type KStatus = '待解析' | '解析中' | '解析完成' | '解析失败';
export const statusColors: Record<KStatus, string> = { 待解析: 'default', 解析中: 'processing', 解析完成: 'success', 解析失败: 'error' };
export type KFile = { id: string; libraryId: string; name: string; status: KStatus; tags: string[]; slices: number; citations: number; format: string; size: string; creator: string; importedAt: string; sharer: string; sharedAt: string; metadata: string; failure?: string };
const titles = [
  ['星澜巡检终端使用手册', 'PDF'], ['星澜设备维护指南', 'Word'], ['星澜产品参数对照表', 'Excel'], ['设备常见问题汇编', 'TXT'],
  ['巡检终端接口示意图', '图片'], ['产品安装调试规范', 'PDF'], ['配件兼容性清单', 'Excel'], ['终端状态指示说明', 'Word'],
  ['协同办公管理办法', 'PDF'], ['资料归档操作规程', 'Word'], ['设备领用登记规范', 'Excel'], ['会议组织指引', 'TXT'],
  ['办公流程示意图', '图片'], ['内部培训组织制度', 'PDF'], ['资料版本管理细则', 'Word'], ['值班交接清单', 'Excel'],
  ['产业服务扶持指引', 'PDF'], ['项目申报材料说明', 'Word'], ['服务事项申报清单', 'Excel'], ['政策咨询问答', 'TXT'],
  ['申报流程图解', '图片'], ['绿色设备更新说明', 'PDF'], ['创新服务申请指南', 'Word'], ['政策宣讲视频文字稿', 'TXT'],
];
const extensions: Record<string, string> = { PDF: 'pdf', Word: 'docx', Excel: 'xlsx', TXT: 'txt', 图片: 'png' };
export const files: KFile[] = [...titles.map(([title, format], index): KFile => {
  const status: KStatus = index % 8 === 5 ? '解析中' : index % 8 === 6 ? '待解析' : index % 8 === 7 ? '解析失败' : '解析完成';
  return { id: `kf-${index + 1}`, libraryId: libraries[Math.floor(index / 8)].id, name: `${title}.${extensions[format]}`, status,
    tags: [index < 8 ? '产品支持' : index < 16 ? '内部协作' : '政策参考', '示例资料'], slices: status === '解析完成' ? 6 : 0,
    citations: status === '解析完成' ? (index % 5 + 1) * 2 : 0, format, size: format === '图片' ? '1.8 MB' : `${168 + index * 37} KB`,
    creator: ['林沐（示例）', '许禾（示例）', '周宁（示例）'][index % 3], importedAt: `2026-10-${String(8 + index % 8).padStart(2, '0')} 09:30`,
    sharer: index % 3 === 0 ? '林沐（示例）' : '', sharedAt: index % 3 === 0 ? '2026-10-15 14:20' : '',
    metadata: `版本=V${index % 3 + 1}.0；生效日期=2026-10-01`, failure: status === '解析失败' ? '示例文件缺少可识别的文本层，请修改解析配置后重试。' : undefined };
}), ...publicCatalog.flatMap(library => library.documents.map(([title, format], index): KFile => ({
  id: `${library.id}-file-${index + 1}`, libraryId: library.id, name: `${title}.${extensions[format]}`,
  status: index === 5 ? '解析中' : '解析完成', tags: [library.category.replace('知识库', ''), '公开共享', '示例资料'],
  slices: index === 5 ? 0 : 6, citations: index === 5 ? 0 : (index % 3 + 1) * 2, format,
  size: format === '图片' ? '1.4 MB' : `${240 + index * 76} KB`, creator: '知识运营组（示例）', importedAt: `2026-10-${String(10 + index).padStart(2, '0')} 10:20`,
  sharer: '知识运营组（示例）', sharedAt: '2026-10-16 09:00', metadata: '版本=V2.0；生效日期=2026-10-01',
})))];
export const demoUpload = { id: 'kf-import-demo', name: '星澜设备现场维护补充指引.pdf', format: 'PDF', size: '682 KB' };
export const uploadExamples = {
  文本文档: demoUpload,
  表格型知识: { id: 'kf-import-table', name: '星澜设备维护记录示例.xlsx', format: 'Excel', size: '236 KB' },
  图片: { id: 'kf-import-image', name: '星澜设备维护流程示意图.png', format: '图片', size: '1.6 MB' },
};
export const metadataFields = [
  { id: 'meta-version', name: '版本', type: 'String', value: 'V2.0' },
  { id: 'meta-year', name: '发布年份', type: 'Number', value: '2026' },
  { id: 'meta-date', name: '生效日期', type: 'Time', value: '2026-10-01' },
];
export const members = [
  { id: 'm1', name: '林沐（示例）', department: '产品支持部' }, { id: 'm2', name: '许禾（示例）', department: '产品支持部' },
  { id: 'm3', name: '周宁（示例）', department: '综合管理部' }, { id: 'm4', name: '沈言（示例）', department: '产业服务部' },
];
export const shareHistory = members.map((member, index) => ({ ...member, time: '2026-10-15 14:20', status: ['共享成功', '共享失败', '已取消', '共享成功'][index], reason: index === 1 ? '示例成员暂未开通资料访问范围' : '—' }));
export type KChunk = { id: string; title: string; content: string; keywords: string[]; custom: boolean; enabled: boolean; points: string[] };
export function chunksFor(file: KFile): KChunk[] {
  const category = libraries.find(lib => lib.id === file.libraryId)?.category ?? '产品资料';
  const bodies: Record<string, string[]> = {
    产品资料: ['设备启用前，应检查电源接口、外壳及状态指示灯。首次使用需完成设备自检，确认通信正常后进入巡检模式。', '日常维护按每月一次的周期执行。维护时先关闭电源，使用干燥软布清理接口，并填写维护记录。', '出现状态灯异常时，应记录指示颜色与闪烁频率，检查连接状态。连续两次自检失败后，交由支持人员处理。', '维护记录包括设备编号、检查日期、操作人和处理结果。更换配件后，应更新设备档案并重新执行自检。', '资料版本更新后，应由产品支持人员复核变更内容，确认适用型号后再分发使用。', '现场交接时建议核对自检结果、维护记录和配件清单，确保信息完整且便于后续追溯。'],
    规章制度: ['协作事项应明确负责人、完成时间及交付物。跨部门事项由发起部门统筹，协作部门按约定节点反馈。', '资料归档在事项办结后五个工作日内完成。归档内容应包括审批记录、正式版本和相关附件。', '设备领用应填写用途与预计归还日期，领用人完成检查后签收，归还时核对配件和运行状态。', '会议纪要应记录议题、形成的意见与待办事项，并在两个工作日内发送给参会人员确认。', '制度更新应保留版本说明，并向适用部门发送更新提醒。', '每月开展一次归档完整性检查，对缺失记录及时补齐并留存处理情况。'],
    政策文件: ['示例项目面向符合条件的设备更新与服务创新活动，申请主体应按申报指引准备基础资料。', '申报材料包括项目说明、实施计划与预算表。材料应保持内容一致，提交前完成内部复核。', '资料预审通过后进入综合评估环节，评估意见由项目联系人统一反馈。', '申请主体应在规定期限内补齐材料，逾期未补齐的按本轮未完成处理。', '政策说明以示例发布版本为准，更新内容通过服务窗口统一告知。', '申报进度与反馈记录应定期整理，便于后续跟踪和复盘。'],
    预案法规知识库: ['本示例预案以虚构的青岚片区为背景，资料包括适用范围、组织职责、信息报告、响应衔接和记录归档六部分。', '响应启动记录列明示例事件、会商意见、启动时间和通知范围，便于展示不同环节之间的衔接关系。', '法规条款索引按主题、资料名称、示例条款和更新日期整理，展示检索与引用的结构，不对应真实法规原文。', '预案修订记录包括修订原因、变更章节、复核意见和版本号，旧版本保留修订说明。', '示例流程图展示信息接收、研判会商、响应通知及后续跟踪的节点关系。', '使用预案资料时应核对适用范围与版本，演示结束后可沿来源文件查看完整示例内容。'],
    事件案例知识库: ['青岚镇内涝案例为虚构复盘资料，按事件背景、信息接报、协同处置、阶段结果和经验整理内容。', '示例时间线记录首次接报、现场核实、力量联络和阶段反馈等节点，每个节点关联对应记录。', '协同事项包括信息联络、现场情况共享、资源需求汇总和任务反馈，各项列明示例责任角色。', '案例复盘区分已核实事实与待补充资料，缺少依据的阶段结果不直接写成最终结论。', '经验条目围绕信息完整性、协同衔接和记录可追溯性整理，供案例对比演示使用。', '补充记录应注明来源、时间和版本，避免将不同事件的处置过程混在同一案例中。'],
    值守文书知识库: ['值守文书示例按要情、日报、交接记录和阶段总结分类，每类提供标题、要素清单与虚构正文。', '交接记录包括当班重点事项、处理进展、待跟踪任务、资料位置和交接时间。', '日报示例采用当班概况、重点事件、工作进展和下一班关注事项的结构，便于演示材料整理。', '信息报送示例区分接报时间、事件发生时间与更新时点，未知信息以待核实标记展示。', '文书版本保留修改说明，正式示例与工作记录分别标注，便于查看来源与更新过程。', '交接完成后形成示例确认记录，后续补充内容通过新的版本保留变更信息。'],
    资源保障知识库: ['资源保障资料按队伍、装备、物资和保障联络分类，展示虚构的能力说明、维护记录与调拨表单。', '示例物资调拨记录包括申请事项、物资名称、规格数量、来源位置、接收信息和时间。', '队伍能力清单分别列明专业方向、示例人员规模、装备情况及联络角色，不代表实时可用力量。', '装备资料区分使用说明、维护记录和配件清单，维护完成后更新示例档案版本。', '保障联络记录保留需求提出、信息核对、处理反馈和跟踪状态，便于演示跨环节查询。', '资源清单中的预置、申请和反馈采用独立字段，避免把资源记录直接视为实际调派指令。'],
    态势感知知识库: ['态势感知资料以虚构监测记录为例，涵盖雨水情指标、数据核对、预警汇总与阶段研判说明。', '监测数据核对要素包括观测位置、采集时间、单位、来源和更新周期，异常项保留核对记录。', '趋势示意图以连续时点的示例值展示变化，资料明确标注时间范围与数据口径。', '多源记录并列展示来源、观测时点与差异说明，未核实差异不直接合并为确定结论。', '态势简报按总体情况、重点变化、关注事项与资料来源组织，标注仍需补充的信息。', '预警信息汇总保留发布主体、适用范围、有效时段与更新说明，便于演示追溯和版本核对。'],
  };
  const isPublic = publicCategories.includes(category);
  const headings = isPublic ? ['资料概览', '要素清单', '关联记录', '归档管理', '版本说明', '使用参考'] : ['适用说明', '操作要求', '异常处理', '记录管理', '版本维护', '补充说明'];
  return (bodies[category] ?? bodies['产品资料']).map((content, i) => ({ id: `${file.id}-chunk-${i + 1}`, title: `第 ${i + 1} 节 · ${headings[i]}`, content,
    keywords: [category, isPublic ? headings[i] : ['操作流程', '维护周期', '异常处置', '记录要求', '版本', '交接'][i]], custom: i === 5, enabled: i !== 4,
    points: [isPublic ? content.split(/[，。]/)[0] : ['确认适用范围', '按规定周期执行', '异常需记录并反馈', '信息完整可追溯', '保留版本变更', '交接核对清单'][i], `来源：${file.name} · 第 ${i + 1} 节`] }));
}
export const testHistory = [
  { id: 'h1', question: '星澜设备日常维护需要注意什么？', time: '2026-10-16 10:20', empty: false },
  { id: 'h2', question: '资料归档应在多久内完成？', time: '2026-10-15 16:40', empty: false },
  { id: 'h3', question: '查询尚未收录的资料', time: '2026-10-15 11:10', empty: true },
];
export function testHistoryFor(libraryId?: string) {
  const item = publicCatalog.find(library => library.id === libraryId);
  return item ? [
    { id: `${item.id}-h1`, question: item.question, time: '2026-10-16 10:20', empty: false },
    { id: `${item.id}-h2`, question: '这些资料的更新和记录要求是什么？', time: '2026-10-15 16:40', empty: false },
    { id: `${item.id}-h3`, question: '查询尚未收录的资料', time: '2026-10-15 11:10', empty: true },
  ] : testHistory;
}
export const recallScores = [0.94, 0.87, 0.79];
