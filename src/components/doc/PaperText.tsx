/**
 * 纸面上的一处可编辑文字：红头三行、时间行、落款/版记、页码等没有结构化字段的文本。
 * 故意不给输入框外观（边框/底色）——纸面本身就是编辑器，样式全交给元素自身的 class，
 * 可编辑提示见 doc.css 的 .doc-paper-editing .doc-inline-edit（只在悬停/聚焦时给一层底色）。
 *
 * 值用 textContent 直接写，不让 React 重建子节点：store 回流同一个字符串时重建 DOM 会把光标顶到开头，
 * 处理方式与 components/doc/RichText.tsx 一致（同样不走 innerHTML）。
 */
import { useEffect, useRef } from 'react';

export default function PaperText({ fieldKey, fallback = '', value, onChange, ariaLabel, className, as = 'div' }: {
  /** 存进 working.paper 的键；模型字段（标题、日期、发文字号）直接绑 onChange，不需要它。 */
  fieldKey?: string;
  /** 还没有覆盖值时的默认文字；模型字段由 value 保证一定有值。 */
  fallback?: string;
  value?: string; onChange: (value: string) => void;
  ariaLabel: string; className?: string; as?: 'div' | 'span';
}) {
  // 两种标签共用同一个 ref：它只用来读写 textContent，div / span 通用。
  const ref = useRef<HTMLDivElement | HTMLSpanElement | null>(null);
  // 记住最近一次报出去的值，store 回流同一个字符串时不再重建 DOM。
  const emitted = useRef<string | null>(null);
  const text = value ?? fallback;
  useEffect(() => {
    const element = ref.current;
    if (!element || emitted.current === text) return;
    element.textContent = text;
    emitted.current = text;
  }, [text]);
  const emit = () => {
    const element = ref.current;
    if (!element) return;
    const next = element.textContent ?? '';
    emitted.current = next;
    onChange(next);
  };
  const shared = {
    className: className ? `doc-inline-edit ${className}` : 'doc-inline-edit',
    'data-paper-field': fieldKey,
    contentEditable: true,
    suppressContentEditableWarning: true,
    role: 'textbox',
    'aria-label': ariaLabel,
    onInput: emit,
    // 这些都是单行文字，回车落成换行字符会写进纯文本字段里，直接吃掉。
    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'Enter') event.preventDefault(); },
  };
  return as === 'span'
    ? <span ref={ref as React.RefObject<HTMLSpanElement>} {...shared} />
    : <div ref={ref as React.RefObject<HTMLDivElement>} {...shared} />;
}
