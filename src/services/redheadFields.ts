/**
 * 红头公文上「没有结构化字段」的文字（版头、时间行、落款、版记、页码）的默认值，
 * 以及整张纸面所有可编辑文字的统一清单。
 * 编辑页（MockDocumentDetail）、版本对比（DocVersionCompare）与变化摘要（docDiff）共用，
 * 保证三处对「纸面上有哪些字、各叫什么」的理解一致。
 */
import { DOCUMENT_CATEGORIES, type MockDocument, type RedheadSpec } from '@/seed/mockDocuments';
import { richTextToLines } from '@/services/richText';

export const REDHEAD_ORG_DEFAULT = '中国安能建设集团有限公司';
/** 落款/版记的默认文字：没有结构化字段，编辑值进 working.paper，改回这些默认值就等于没改。 */
export const DUTY_TAIL_FIELDS = [
  ['值班员', '值班员：×××'],
  ['值班电话', '值班电话：×××-××××××××'],
] as const;
export const BRIEF_TAIL_FIELDS = [
  ['报送行', '报送：集团应急指挥中心（模拟）。'],
  ['抄送行', '抄送：集团领导，副总师级以上管理人员，总部各部门（模拟）。'],
  ['承办行', '承办：应急指挥中心（模拟）\u2003\u2003编辑：×××\u2003电话：×××-××××××××'],
] as const;
export const REPORT_CONTACT_DEFAULT = '（联系人：×××\u2003\u2003电话：×××-××××××××）';
/** 周工作动态的版记：只有送/发两行（真实件里没承办、编辑、电话）。 */
export const DYNAMICS_TAIL_FIELDS = [
  ['送行', '送：集团公司领导，副总师级以上管理人员（模拟）。'],
  ['发行', '发：各二级企业主要负责人，分管领导（模拟）。'],
] as const;
/** 编辑器里隐藏的内部章节（只做要素留档，不上纸面）。 */
export const HIDDEN_SECTION = '文书要素（模拟收集）';

export function categoryOf(document: MockDocument) {
  return DOCUMENT_CATEGORIES.find(item => item.code === document.code);
}
export function signDefault(redhead?: RedheadSpec) {
  return redhead?.tail === 'duty' ? '审　阅：×××' : '签　发：×××';
}

/** 纸面上的一处文字。`group` 是变化摘要里的归类名（正文按节标题归类，其余按位置）。 */
export type PaperField = {
  key: string;
  label: string;
  group: string;
  zone: 'head' | 'title' | 'body' | 'tail';
  /** 正文用 \n 分段；其余字段是单行 */
  text: string;
};

/** 按纸面自上而下的顺序列出全部可编辑文字（未覆盖的取默认值）。 */
export function paperFields(document: MockDocument): PaperField[] {
  const category = categoryOf(document);
  const redhead = category?.redhead;
  const paper = document.paper ?? {};
  const pick = (key: string, fallback: string) => paper[key] ?? fallback;
  const fields: PaperField[] = [];
  const head = (key: string, label: string, text: string) => fields.push({ key, label, group: label, zone: 'head', text });

  if (redhead?.platform) head('platform', '平台行', pick('platform', redhead.platform));
  head('org', '发文机关', pick('org', redhead?.org ?? REDHEAD_ORG_DEFAULT));
  head('type', '文种', pick('type', redhead?.type ?? category?.name ?? '文书'));
  if (redhead?.showNumber !== false) head('number', '发文字号', document.number);
  head('date', '成文日期', document.date);
  head('sign', redhead?.tail === 'duty' ? '审阅人' : '签发人', pick('sign', signDefault(redhead)));
  fields.push({ key: 'title', label: '标题', group: '标题', zone: 'title', text: document.title });

  document.sections.forEach(([heading, body], index) => {
    if (heading === HIDDEN_SECTION) return;
    const group = heading.trim() || `第${index + 1}节`;
    fields.push({ key: `s${index}.h`, label: `第${index + 1}节标题`, group, zone: 'body', text: heading });
    fields.push({ key: `s${index}.b`, label: `第${index + 1}节正文`, group, zone: 'body', text: richTextToLines(body) });
  });

  const tail = (key: string, label: string, text: string) => fields.push({ key, label, group: label, zone: 'tail', text });
  if (redhead?.tail === 'duty') DUTY_TAIL_FIELDS.forEach(([label, fallback], i) => tail(`duty${i + 1}`, label, pick(`duty${i + 1}`, fallback)));
  if (redhead?.tail === 'brief') BRIEF_TAIL_FIELDS.forEach(([label, fallback], i) => tail(`brief${i + 1}`, label, pick(`brief${i + 1}`, fallback)));
  if (redhead?.tail === 'dynamics') DYNAMICS_TAIL_FIELDS.forEach(([label, fallback], i) => tail(`dynamics${i + 1}`, label, pick(`dynamics${i + 1}`, fallback)));
  if (redhead?.tail === 'report') {
    tail('signOrg', '落款单位', pick('signOrg', redhead.org ?? REDHEAD_ORG_DEFAULT));
    tail('contact', '联系人', pick('contact', REPORT_CONTACT_DEFAULT));
  }
  tail('pageno', '页码', pick('pageno', '— 1 —'));
  return fields;
}
