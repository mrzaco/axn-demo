/**
 * 版本对比纸面：同一张红头公文，删掉的字红色删除线、新增的字绿色下划线（Word 修订读法）。
 * 只读；「仅看改动」时隐藏没改过的版头 / 落款，并把没改过的正文段落折叠成一行提示。
 */
import { Fragment, type ReactNode } from 'react';
import type { MockDocument } from '@/seed/mockDocuments';
import { categoryOf } from '@/services/redheadFields';
import { diffDocuments, type DiffOp, type FieldDiff } from '@/services/docDiff';

/** 渲染一串 diff；每段连续改动的第一个片段带 .doc-diff-hunk，供「上一处 / 下一处」定位。 */
function Marked({ ops }: { ops: DiffOp[] }) {
  return <>{ops.map((op, i) => {
    const first = op.t !== 0 && (i === 0 || ops[i - 1].t === 0);
    const cls = first ? ' doc-diff-hunk' : '';
    if (op.t === 1) return <ins key={i} className={`doc-diff-add${cls}`}>{op.s}</ins>;
    // 删掉的分段符号不真的断行，用 ¶ 标出来
    if (op.t === -1) return <del key={i} className={`doc-diff-del${cls}`}>{op.s.replace(/\n/g, '¶')}</del>;
    return <Fragment key={i}>{op.s}</Fragment>;
  })}</>;
}

/** 把带 \n 的 diff 切成段落（新增 / 保留的换行才断段）。 */
function splitParagraphs(ops: DiffOp[]): DiffOp[][] {
  const paragraphs: DiffOp[][] = [[]];
  for (const op of ops) {
    if (op.t === -1) { paragraphs[paragraphs.length - 1].push(op); continue; }
    op.s.split('\n').forEach((piece, i) => {
      if (i > 0) paragraphs.push([]);
      if (piece) paragraphs[paragraphs.length - 1].push({ t: op.t, s: piece });
    });
  }
  return paragraphs.filter(p => p.length > 0);
}

const changed = (f?: FieldDiff) => !!f && f.hunks > 0;

export default function DocVersionCompare({ base, target, onlyChanges }: {
  /** 对比基准；null 表示没有更早版本（只展示 target 本身） */
  base: MockDocument | null;
  target: MockDocument;
  onlyChanges: boolean;
}) {
  const diff = diffDocuments(base ?? target, target);
  const byKey = new Map(diff.fields.map(f => [f.key, f]));
  const redhead = categoryOf(target)?.redhead;
  const show = (key: string) => {
    const f = byKey.get(key);
    return !!f && (!onlyChanges || changed(f));
  };
  const text = (key: string) => {
    const f = byKey.get(key);
    return f ? <Marked ops={f.ops} /> : null;
  };
  const line = (key: string, className: string, as: 'div' | 'span' = 'div'): ReactNode => {
    if (!show(key)) return null;
    const Tag = as;
    return <Tag className={className}>{text(key)}{onlyChanges && <small className="doc-diff-label">{byKey.get(key)?.label}</small>}</Tag>;
  };

  const headChanged = ['platform', 'org', 'type', 'number', 'date', 'sign'].some(k => changed(byKey.get(k)));
  const sections = diff.fields.filter(f => f.zone === 'body' && f.key.endsWith('.h'));
  const tailFields = diff.fields.filter(f => f.zone === 'tail');
  const removedSections = diff.fields.filter(f => f.zone === 'body' && !target.sections[Number(f.key.slice(1, f.key.indexOf('.')))]);

  return <article className="axn-redhead-paper doc-paper-editing doc-paper-compare" data-testid="doc-version-compare">
    {(!onlyChanges || headChanged) && <>
      {line('platform', 'axn-redhead-platform')}
      {line('org', 'axn-redhead-org')}
      {line('type', 'axn-redhead-type')}
      {line('number', 'axn-redhead-no')}
      {(show('date') || show('sign')) && <div className="axn-redhead-metabar">
        {show('date') ? <span>{text('date')}</span> : <span />}
        {show('sign') ? <span>{text('sign')}</span> : null}
      </div>}
      {!onlyChanges && <div className="axn-redhead-rule" />}
    </>}
    {line('title', 'doc-edit-title')}
    <div className="axn-redhead-body">
      {sections.map((head) => {
        const index = head.key.slice(1, head.key.indexOf('.'));
        const body = byKey.get(`s${index}.b`);
        const paragraphs = body ? splitParagraphs(body.ops) : [];
        const sectionChanged = changed(head) || changed(body);
        if (onlyChanges && !sectionChanged) return null;
        // 仅看改动：未改动的段落连续折叠成一行
        const rendered: ReactNode[] = [];
        let folded = 0;
        const flushFold = (key: string) => {
          if (folded) rendered.push(<div key={key} className="doc-diff-fold">⋯ 未改动的 {folded} 段</div>);
          folded = 0;
        };
        paragraphs.forEach((p, i) => {
          const hasChange = p.some(op => op.t !== 0);
          if (onlyChanges && !hasChange) { folded += 1; return; }
          flushFold(`f${i}`);
          rendered.push(<div key={i}><Marked ops={p} /></div>);
        });
        flushFold('f-end');
        return <section key={head.key} className={removedSections.includes(head) ? 'doc-diff-removed-section' : undefined}>
          <div className="doc-edit-heading"><Marked ops={head.ops} /></div>
          <div className="doc-rich">{rendered}</div>
        </section>;
      })}
    </div>
    {tailFields.some(f => show(f.key)) && <div className={`axn-redhead-tail${redhead?.tail ? ` axn-redhead-tail-${redhead.tail}` : ''}`}>
      {tailFields.filter(f => f.key !== 'pageno').map(f => {
        if (!show(f.key)) return null;
        const cls = f.key === 'signOrg' ? 'axn-redhead-sign-org' : f.key === 'contact' ? 'axn-redhead-contact' : undefined;
        return <div key={f.key} className={cls}><Marked ops={f.ops} />{onlyChanges && <small className="doc-diff-label">{f.label}</small>}</div>;
      })}
    </div>}
    {line('pageno', 'axn-redhead-pageno')}
    {onlyChanges && diff.hunks === 0 && <div className="doc-diff-empty">{diff.formatOnly.length ? `文字未改动，仅调整了格式：${diff.formatOnly.join('、')}` : '两个版本内容相同'}</div>}
  </article>;
}
