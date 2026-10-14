import { useEffect } from 'react';
// message 反馈走 AntdApp.useApp()：antd v5 静态方法不消费 ConfigProvider 主题，会退回默认 token。
// useApp() 在 <App> 之外（如直接渲染本组件的单元测试）返回空实现，故调用点用可选链避免抛错。
import { App as AntdApp } from 'antd';
import {
  FileText,
} from 'lucide-react'
import { DOCUMENT_CATEGORIES, sameMockDocument, type MockDocument } from '@/seed/mockDocuments';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { richTextToPlain } from '@/services/richText';
import DocumentDetailToolbar from './DocumentDetailToolbar';
import PaperText from './PaperText';
import RichTextEditor from './RichText';
import RichTextToolbar from './RichTextToolbar';

const REDHEAD_ORG_DEFAULT = '中国安能建设集团有限公司';
/** 落款/版记的默认文字：没有结构化字段，编辑值进 working.paper，改回这些默认值就等于没改。 */
const DUTY_TAIL_FIELDS = [
  ['值班员', '值班员：×××'],
  ['值班电话', '值班电话：×××-××××××××'],
] as const;
const BRIEF_TAIL_FIELDS = [
  ['报送行', '报送：集团应急指挥中心（模拟）。'],
  ['抄送行', '抄送：集团领导，副总师级以上管理人员，总部各部门（模拟）。'],
  ['承办行', '承办：应急指挥中心（模拟）\u2003\u2003编辑：×××\u2003电话：×××-××××××××'],
] as const;
const REPORT_CONTACT_DEFAULT = '（联系人：×××\u2003\u2003电话：×××-××××××××）';
/** 周工作动态的版记：只有送/发两行（真实件里没承办、编辑、电话）。 */
const DYNAMICS_TAIL_FIELDS = [
  ['送行', '送：集团公司领导，副总师级以上管理人员（模拟）。'],
  ['发行', '发：各二级企业主要负责人，分管领导（模拟）。'],
] as const;

/** 附件表的合并首列（真件里的「分类」跨三行）：从这一行往后数到下一个带 group 的行。 */
function groupSpan(rows: readonly { group?: string }[], index: number) {
  const next = rows.slice(index + 1).findIndex(row => row.group);
  return next < 0 ? rows.length - index : next + 1;
}

/** 模拟文书右栏详情：打开即编辑（不再有阅读/编辑两态），保存只写回当前会话作用域的模拟文书库。 */
export default function MockDocumentDetail({ scope, document, onClose, onOpenLibrary, onSave, onDirtyChange }: {
  scope: string; document: MockDocument; onClose: () => void; onSave: (document: MockDocument) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onOpenLibrary?: () => void;
}) {
  const { message } = AntdApp.useApp();
  // 未保存的工作副本存在 store 里（按会话作用域 + 文档 id），离开详情页不丢，保存或放弃才清除。
  const savedWorking = useMockDocumentStore((s) => s.libraries[scope]?.working[document.id]);
  const working = savedWorking ?? document;
  const applyWorking = (next: MockDocument) => {
    const store = useMockDocumentStore.getState();
    // 改回原文即视为没有未保存修改，顺手清掉工作副本。
    if (sameMockDocument(next, document)) store.clearWorking(scope, document.id);
    else store.setWorking(scope, next);
  };
  const category = DOCUMENT_CATEGORIES.find(item => item.code === document.code);
  const categoryName = category?.name ?? '文书';
  const redhead = category?.redhead;
  const signDefault = redhead?.tail === 'duty' ? '审　阅：×××' : '签　发：×××';
  // 红头/时间行/落款/页码没有结构化字段，编辑值统一存进 working.paper；改回默认值就把键删掉（等于没改），
  // 「有未保存修改」的判断和「放弃修改」沿用同一套 working 机制。
  const paper = working.paper;
  const setPaper = (key: string, value: string, fallback: string) => {
    const next = { ...paper };
    if (value === fallback) delete next[key]; else next[key] = value;
    applyWorking({ ...working, paper: next });
  };
  const paperField = (key: string, fallback: string) => ({
    fieldKey: key, fallback, value: paper?.[key], onChange: (value: string) => setPaper(key, value, fallback),
  });
  const dirty = !sameMockDocument(working, document);
  const sectionChange = (index: number, part: 0 | 1, value: string) => applyWorking({
    ...working, sections: working.sections.map((section, i) => i === index ? (part === 0 ? [value, section[1]] : [section[0], value]) : section),
  });
  // 未保存修改状态上报给工作区（供关闭 / 切换导航前的保护确认使用）。
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  const save = () => {
    if (!working.title.trim() || working.sections.some(([heading, body]) => !heading.trim() || !richTextToPlain(body).trim())) {
      message.warning?.('请填写文书标题、章节标题和正文后保存'); return;
    }
    onSave(working); onDirtyChange?.(false); message.success?.('修改已保存在当前会话');
  };
  // 工作副本在 store 里，离开详情页不丢；只有「放弃修改」会真正丢弃。
  const discard = () => { useMockDocumentStore.getState().clearWorking(scope, document.id); onDirtyChange?.(false); message.info?.('已放弃未保存修改'); };
  return <div className="doc-detail-view">
    <DocumentDetailToolbar title={document.title} subtitle={`${categoryName} · ${document.date} · 编辑中 · 保存后生效`} editing dirty={dirty} onBack={onClose} onOpenLibrary={onOpenLibrary}
      onSave={save} onDiscard={discard} />
    {/* 富文本工具条：命令作用于正文编辑器里当前的选区，见 components/doc/RichTextToolbar.tsx */}
    <RichTextToolbar />
    {dirty && <div className="doc-dirty-note" data-testid="mock-dirty-note">有未保存修改 · 「放弃修改」丢弃，保存后写入当前会话文书库</div>}
    <div className="doc-detail-scroll">
      <article className="axn-redhead-paper doc-paper-editing" data-testid="mock-redhead-document">
        {redhead?.platform && <PaperText className="axn-redhead-platform" ariaLabel="平台行" {...paperField('platform', redhead.platform)} />}
        <PaperText className="axn-redhead-org" ariaLabel="发文机关标志" {...paperField('org', redhead?.org ?? REDHEAD_ORG_DEFAULT)} />
        <PaperText className="axn-redhead-type" ariaLabel="文种" {...paperField('type', redhead?.type ?? categoryName)} />
        {redhead?.showNumber !== false && <div className="axn-redhead-no">
          <PaperText as="span" ariaLabel="发文字号" value={working.number} onChange={value => applyWorking({ ...working, number: value })} />
          <span>（模拟）</span>
        </div>}
        <div className="axn-redhead-metabar">
          <PaperText as="span" ariaLabel="成文日期" value={working.date} onChange={value => applyWorking({ ...working, date: value })} />
          <PaperText as="span" ariaLabel={redhead?.tail === 'duty' ? '审阅人' : '签发人'} {...paperField('sign', signDefault)} />
        </div>
        <div className="axn-redhead-rule" />
        <input className="doc-edit-title doc-inline-edit" aria-label="文书标题" value={working.title} onChange={event => applyWorking({ ...working, title: event.target.value })} />
        <div className="axn-redhead-body">{working.sections.map(([heading, body], index) => heading === '文书要素（模拟收集）' ? null : <section key={index}>
          <input className="doc-edit-heading doc-inline-edit" aria-label={`第${index + 1}节标题`} value={heading} onChange={event => sectionChange(index, 0, event.target.value)} /><RichTextEditor ariaLabel={`第${index + 1}节正文`} autoFocus={index === 0} value={body} onChange={next => sectionChange(index, 1, next)} />
        </section>)}</div>
        {/* 正文尾部附图（只有挂了 figures 的样稿才有；用户 m01044 的两张现场照片） */}
        {working.figures?.length ? <div className="axn-redhead-figures" data-testid="mock-document-figures">
          <div className="axn-redhead-figures-label">附：现场处置图片（模拟）</div>
          {working.figures.map(figure => <figure key={figure.src}>
            <img src={figure.src} alt={figure.caption} />
            <figcaption>{figure.caption}</figcaption>
          </figure>)}
        </div> : null}
        {/* 附件统计表（用户 m01163：周工作动态的附件要模拟出表格）—— 与图片同一个位置：正文之后、落款之前。
            表体不进富文本正文（不能编辑）：它是生成的固定产物，跟正文的可编辑文字分开，避免 execCommand 碰表格。 */}
        {working.tables?.length ? <div className="axn-redhead-tables" data-testid="mock-document-tables">
          {working.tables.map((table, tableIndex) => <section key={table.title} className="axn-redhead-table">
            <div className="axn-redhead-table-title">附件{tableIndex + 1}：{table.title}（模拟）</div>
            <div className="axn-redhead-table-scroll">
              <table>
                <thead>
                  <tr>{table.head.map((cell, index) => <th key={index}>{cell}</th>)}</tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => <tr key={rowIndex}>
                    {row.group ? <th rowSpan={groupSpan(table.rows, rowIndex)}>{row.group}</th> : null}
                    {row.cells.map((cell, index) => <td key={index}>{cell}</td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>)}
        </div> : null}
        {redhead?.tail === 'duty' && <div className="axn-redhead-tail axn-redhead-tail-duty">
          {DUTY_TAIL_FIELDS.map(([label, fallback], index) => <PaperText key={label} as="span" ariaLabel={label} {...paperField(`duty${index + 1}`, fallback)} />)}
        </div>}
        {redhead?.tail === 'brief' && <div className="axn-redhead-tail axn-redhead-tail-brief">
          {BRIEF_TAIL_FIELDS.map(([label, fallback], index) => <PaperText key={label} ariaLabel={label} {...paperField(`brief${index + 1}`, fallback)} />)}
        </div>}
        {redhead?.tail === 'dynamics' && <div className="axn-redhead-tail axn-redhead-tail-dynamics">
          {DYNAMICS_TAIL_FIELDS.map(([label, fallback], index) => <PaperText key={label} ariaLabel={label} {...paperField(`dynamics${index + 1}`, fallback)} />)}
        </div>}
        {redhead?.tail === 'report' && <div className="axn-redhead-tail axn-redhead-tail-report">
          <PaperText className="axn-redhead-sign-org" ariaLabel="落款单位" {...paperField('signOrg', redhead.org ?? REDHEAD_ORG_DEFAULT)} />
          <PaperText className="axn-redhead-sign-date" ariaLabel="落款日期" value={working.date} onChange={value => applyWorking({ ...working, date: value })} />
          <PaperText className="axn-redhead-contact" ariaLabel="联系人" {...paperField('contact', REPORT_CONTACT_DEFAULT)} />
        </div>}
        <PaperText className="axn-redhead-pageno" ariaLabel="页码" {...paperField('pageno', '— 1 —')} />
        <div className="axn-redhead-mock">模拟样稿 · 仅供评估</div>
      </article>
      <div className="doc-reading-footer"><FileText /> {categoryName} · 红头格式<span>{working.sections.reduce((count, [heading, body]) => count + heading.length + richTextToPlain(body).length, working.title.length)} 字</span></div>
    </div>
  </div>;
}
