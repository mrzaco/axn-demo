/**
 * 正文的富文本渲染与编辑。
 * 只读态：纯文本仍按原来的 <p> 渲染（老数据零变化），HTML 片段按同一套正文样式渲染。
 * 编辑态：contentEditable，格式由 RichTextToolbar 通过 document.execCommand 施加。
 * 两侧都走 richText 的白名单互转（parseRichHtml / serializeRichDom），不使用 innerHTML。
 */
import { useEffect, useMemo, useRef } from 'react';
import { isRichHtml, parseRichHtml, serializeRichDom } from '@/services/richText';

export function RichTextView({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rich = useMemo(() => isRichHtml(value), [value]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.replaceChildren(parseRichHtml(value));
  }, [value]);
  if (!rich) return <p>{value}</p>;
  return <div className="doc-rich" data-testid="rich-text-view" ref={ref} />;
}

export default function RichTextEditor({ value, onChange, ariaLabel, autoFocus }: {
  value: string; onChange: (value: string) => void; ariaLabel: string; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // 记住最近一次报出去的值：store 回流同一个字符串时不能再重建 DOM，否则光标会跳到开头。
  const emitted = useRef<string | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || emitted.current === value) return;
    element.replaceChildren(parseRichHtml(value));
    emitted.current = value;
  }, [value]);
  // 进入编辑态即聚焦第一段正文：工具条的按下态与命令都需要编辑器有焦点（Word 里也是双击即可输入）。
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const emit = () => {
    const element = ref.current;
    if (!element) return;
    const html = serializeRichDom(element);
    emitted.current = html;
    onChange(html);
  };
  return <div ref={ref} className="doc-rich doc-rich-editor" data-testid="rich-text-editor" contentEditable suppressContentEditableWarning
    role="textbox" aria-multiline="true" aria-label={ariaLabel} onInput={emit}
    onPaste={event => {
      // 粘贴一律落成纯文本：外部 HTML 带进来的字体/颜色会污染公文排版。
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    }} />;
}
