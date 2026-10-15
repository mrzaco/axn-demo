/**
 * 公文版本对比：字级 diff + 整篇文书的变化摘要。
 *
 * - 分词：汉字逐字、英文单词 / 数字整段、空白与标点各自成词 —— 中文修订按字标，数字「42.3」整体替换而不是拆成半个；
 * - 算法：先剥掉公共前后缀（公文修改通常只动几处，剥完中段很短），中段做 LCS；
 *   中段过大（> MAX_CELLS）时直接按「整段删 + 整段增」处理，保证不卡界面；
 * - 清理：两处改动之间只夹一个字的「相同」并入改动，避免「删1字留1字增1字」那种碎修订难以阅读；
 * - 每一段连续改动规整为「先删后增」，渲染时就是 Word 修订的读法。
 */
import type { MockDocument } from '@/seed/mockDocuments';
import { paperFields, type PaperField } from '@/services/redheadFields';

export type DiffOp = { t: 0 | 1 | -1; s: string };

const TOKEN = /[A-Za-z]+|\d+(?:\.\d+)?|\s+|./gsu;
const MAX_CELLS = 2_000_000;

function tokenize(s: string): string[] {
  return s.match(TOKEN) ?? [];
}

function lcsOps(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m ? [{ t: 1, s: b.join('') }] : [];
  if (m === 0) return [{ t: -1, s: a.join('') }];
  if (n * m > MAX_CELLS) return [{ t: -1, s: a.join('') }, { t: 1, s: b.join('') }];
  // dp[i][j] = a[i..] 与 b[j..] 的 LCS 长度（一维展开）
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i * w + j] = a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ t: 0, s: a[i] }); i += 1; j += 1; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) { ops.push({ t: -1, s: a[i] }); i += 1; }
    else { ops.push({ t: 1, s: b[j] }); j += 1; }
  }
  while (i < n) { ops.push({ t: -1, s: a[i] }); i += 1; }
  while (j < m) { ops.push({ t: 1, s: b[j] }); j += 1; }
  return ops;
}

/** 合并同类相邻项，并把每段连续改动规整成「删在前、增在后」。 */
function normalize(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  let del = '';
  let add = '';
  const flush = () => {
    if (del) out.push({ t: -1, s: del });
    if (add) out.push({ t: 1, s: add });
    del = '';
    add = '';
  };
  for (const op of ops) {
    if (op.t === -1) del += op.s;
    else if (op.t === 1) add += op.s;
    else {
      flush();
      const last = out[out.length - 1];
      if (last?.t === 0) last.s += op.s; else out.push({ t: 0, s: op.s });
    }
  }
  flush();
  return out;
}

/** 两段改动之间只夹 1 个非空白字符的「相同」，并入改动（读起来是一处修订，而不是三处碎片）。 */
function absorbTinyEquals(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = [];
  for (let k = 0; k < ops.length; k += 1) {
    const op = ops[k];
    const prevChange = merged.length > 0 && merged[merged.length - 1].t !== 0;
    const nextChange = k + 1 < ops.length && ops[k + 1].t !== 0;
    if (op.t === 0 && prevChange && nextChange && [...op.s].length <= 1 && op.s.trim()) {
      merged.push({ t: -1, s: op.s }, { t: 1, s: op.s });
    } else merged.push(op);
  }
  return normalize(merged);
}

export function diffText(before: string, after: string): DiffOp[] {
  if (before === after) return before ? [{ t: 0, s: before }] : [];
  const a = tokenize(before);
  const b = tokenize(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const ops: DiffOp[] = [];
  if (start > 0) ops.push({ t: 0, s: a.slice(0, start).join('') });
  ops.push(...lcsOps(a.slice(start, endA), b.slice(start, endB)));
  if (endA < a.length) ops.push({ t: 0, s: a.slice(endA).join('') });
  return absorbTinyEquals(normalize(ops));
}

/** 不计空白的可见字数 */
function visibleLength(s: string): number {
  return [...s.replace(/\s+/g, '')].length;
}

export type FieldDiff = PaperField & {
  before: string;
  ops: DiffOp[];
  /** 连续改动段数（「改了几处」） */
  hunks: number;
  added: number;
  removed: number;
};

export type DocumentDiff = {
  fields: FieldDiff[];
  hunks: number;
  added: number;
  removed: number;
  /** 按归类聚合的改动处数，顺序同纸面 */
  groups: { group: string; hunks: number }[];
  /** 文字没变、只调了格式（加粗 / 颜色 / 对齐）的章节 */
  formatOnly: string[];
};

function countHunks(ops: DiffOp[]): number {
  let hunks = 0;
  let inChange = false;
  for (const op of ops) {
    if (op.t !== 0 && !inChange) hunks += 1;
    inChange = op.t !== 0;
  }
  return hunks;
}

/** 以 after 的纸面结构为准逐字段对比；before 里没有的字段视为全新增，after 里删掉的字段补在末尾。 */
export function diffDocuments(before: MockDocument, after: MockDocument): DocumentDiff {
  const beforeFields = new Map(paperFields(before).map(f => [f.key, f]));
  const afterFields = paperFields(after);
  const fields: FieldDiff[] = afterFields.map((field) => {
    const prev = beforeFields.get(field.key)?.text ?? '';
    const ops = diffText(prev, field.text);
    return {
      ...field,
      before: prev,
      ops,
      hunks: countHunks(ops),
      added: ops.reduce((n, op) => n + (op.t === 1 ? visibleLength(op.s) : 0), 0),
      removed: ops.reduce((n, op) => n + (op.t === -1 ? visibleLength(op.s) : 0), 0),
    };
  });
  const afterKeys = new Set(afterFields.map(f => f.key));
  for (const [key, field] of beforeFields) {
    if (afterKeys.has(key)) continue;
    fields.push({ ...field, before: field.text, text: '', ops: [{ t: -1, s: field.text }], hunks: 1, added: 0, removed: visibleLength(field.text) });
  }

  const groups: { group: string; hunks: number }[] = [];
  for (const f of fields) {
    if (!f.hunks) continue;
    const g = groups.find(item => item.group === f.group);
    if (g) g.hunks += f.hunks; else groups.push({ group: f.group, hunks: f.hunks });
  }

  const formatOnly: string[] = [];
  before.sections.forEach(([, body], index) => {
    const next = after.sections[index];
    if (!next || next[1] === body) return;
    const field = fields.find(f => f.key === `s${index}.b`);
    if (field && field.hunks === 0) formatOnly.push(field.group);
  });

  return {
    fields,
    hunks: fields.reduce((n, f) => n + f.hunks, 0),
    added: fields.reduce((n, f) => n + f.added, 0),
    removed: fields.reduce((n, f) => n + f.removed, 0),
    groups,
    formatOnly,
  };
}

/** 版本列表上的一句话摘要：「改了 3 处：一、基本情况（2 处）、落款日期」。 */
export function summarizeDiff(diff: DocumentDiff, maxGroups = 3): string {
  if (diff.hunks === 0) return diff.formatOnly.length ? `调整了格式：${diff.formatOnly.join('、')}` : '内容无变化';
  const parts = diff.groups.slice(0, maxGroups).map(g => (g.hunks > 1 ? `${g.group}（${g.hunks} 处）` : g.group));
  const more = diff.groups.length > maxGroups ? ` 等 ${diff.groups.length} 个部分` : '';
  return `改了 ${diff.hunks} 处：${parts.join('、')}${more}`;
}
