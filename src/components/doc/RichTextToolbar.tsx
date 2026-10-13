/**
 * 正文富文本工具栏（在线编辑态，Word 风格）。
 *
 * 工具栏本身不管选区：命令统一交给 services/richText 的 runRichCommand ——
 * 它按「当前焦点/选区所在的正文编辑器」施命令，所以工具条只需要渲染按钮和按下态。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Select } from 'antd';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Bold, Highlighter, Italic, List, ListOrdered, Redo2, RemoveFormatting,
  Strikethrough, Underline, Undo2,
} from 'lucide-react';
import {
  DEFAULT_FORMAT_STATE, activeRichEditor, currentRichFontSize, readRichFormatState, rememberRichSelection,
  runRichCommand, type RichCommand, type RichFormatState,
} from '@/services/richText';

/** 字号档位：execCommand('fontSize') 的 1–5 号，px 由 doc.css 的 .doc-rich font[size] 映射（三号 = 正文 21px）。 */
const FONT_SIZES = [
  { value: '1', label: '五号 15' },
  { value: '2', label: '小四 17' },
  { value: '3', label: '三号 21' },
  { value: '4', label: '小二 24' },
  { value: '5', label: '小一 29' },
];
const DEFAULT_FONT_SIZE = '3';

export default function RichTextToolbar() {
  const [format, setFormat] = useState<RichFormatState>(DEFAULT_FORMAT_STATE);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  // 光标/选区一变就重读按下态；选区不在正文编辑器里（比如用户正在改标题）时保留上次的值。
  useEffect(() => {
    const sync = () => {
      if (!activeRichEditor()) return;
      rememberRichSelection();
      setFormat(readRichFormatState());
      const current = currentRichFontSize();
      if (current) setFontSize(current);
    };
    document.addEventListener('selectionchange', sync);
    return () => document.removeEventListener('selectionchange', sync);
  }, []);
  const run = (command: RichCommand, value?: string) => {
    // 光标折叠时 DOM 里还写不出 <font>，字号先按用户选的那档显示，光标移进字号不同的文字时会自动纠正。
    if (command === 'fontSize' && value) setFontSize(value);
    runRichCommand(command, value);
    setFormat(readRichFormatState());
  };
  const cmd = (command: RichCommand, value?: string) => () => run(command, value);
  return <div className="doc-rich-toolbar" data-testid="rich-text-toolbar" role="toolbar" aria-label="正文格式">
    <ToolButton label="撤销" icon={<Undo2 size={16} />} onClick={cmd('undo')} />
    <ToolButton label="重做" icon={<Redo2 size={16} />} onClick={cmd('redo')} />
    <span className="doc-rich-divider" />
    <Select className="doc-rich-size" data-testid="rich-text-size" size="small" value={fontSize}
      options={FONT_SIZES} onChange={value => run('fontSize', value)} />
    <span className="doc-rich-divider" />
    <ToolButton label="加粗" icon={<Bold size={16} />} active={format.bold} onClick={cmd('bold')} />
    <ToolButton label="斜体" icon={<Italic size={16} />} active={format.italic} onClick={cmd('italic')} />
    <ToolButton label="下划线" icon={<Underline size={16} />} active={format.underline} onClick={cmd('underline')} />
    <ToolButton label="删除线" icon={<Strikethrough size={16} />} active={format.strike} onClick={cmd('strikeThrough')} />
    <span className="doc-rich-divider" />
    <ToolButton label="红字" icon={<span className="doc-rich-swatch doc-rich-swatch-red" />} onClick={cmd('foreColor', '#c62828')} />
    <ToolButton label="标黄" icon={<Highlighter size={16} />} onClick={cmd('hiliteColor', '#ffe58f')} />
    <ToolButton label="清除格式" icon={<RemoveFormatting size={16} />} onClick={cmd('removeFormat')} />
    <span className="doc-rich-divider" />
    <ToolButton label="左对齐" icon={<AlignLeft size={16} />} active={format.align === 'left'} onClick={cmd('justifyLeft')} />
    <ToolButton label="居中" icon={<AlignCenter size={16} />} active={format.align === 'center'} onClick={cmd('justifyCenter')} />
    <ToolButton label="右对齐" icon={<AlignRight size={16} />} active={format.align === 'right'} onClick={cmd('justifyRight')} />
    <ToolButton label="两端对齐" icon={<AlignJustify size={16} />} active={format.align === 'justify'} onClick={cmd('justifyFull')} />
    <span className="doc-rich-divider" />
    <ToolButton label="无序列表" icon={<List size={16} />} active={format.list === 'unordered'} onClick={cmd('insertUnorderedList')} />
    <ToolButton label="有序列表" icon={<ListOrdered size={16} />} active={format.list === 'ordered'} onClick={cmd('insertOrderedList')} />
  </div>;
}

function ToolButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active?: boolean; onClick: () => void }) {
  return <button type="button" className="doc-rich-tool" title={label} aria-label={label}
    aria-pressed={active ? 'true' : 'false'}
    // 按下鼠标时不让按钮抢走焦点：选区留在正文里，execCommand 才有作用对象。
    onMouseDown={event => event.preventDefault()} onClick={onClick}>{icon}</button>;
}
