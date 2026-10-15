/**
 * 选中文书文字后浮出的 AI 操作条：润色 / 扩写 / 核查来源。
 * 不直接改稿——把「指令 + 选中原文」送进对话输入框（axn:compose 事件，ChatPanel 接收），
 * 由用户确认后发送，保持「AI 建议、人来定稿」的口径。
 */
import { useEffect, useState } from 'react';
import { BookCheck, Expand, Sparkles } from 'lucide-react';

export const COMPOSE_EVENT = 'axn:compose';

const ACTIONS = [
  { key: 'polish', label: '润色', icon: Sparkles, prompt: '请润色以下文书内容，保持公文语体：' },
  { key: 'expand', label: '扩写', icon: Expand, prompt: '请在不改变事实的前提下扩写以下内容：' },
  { key: 'verify', label: '核查来源', icon: BookCheck, prompt: '请核查以下内容的数据来源与依据：' },
] as const;

const MAX_QUOTE = 300;

export default function SelectionAssist({ scope }: { scope: string }) {
  const [state, setState] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setState(null); return; }
      const range = sel.getRangeAt(0);
      const host = range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      if (!host?.closest(scope)) { setState(null); return; }
      const text = sel.toString().trim();
      if (text.length < 2) { setState(null); return; }
      const rect = range.getBoundingClientRect();
      setState({ text, x: rect.left + rect.width / 2, y: rect.top });
    };
    // 等鼠标抬起 / 键盘选择结束再出现，拖选过程中不跟着闪
    const onUp = () => requestAnimationFrame(update);
    const onSelChange = () => { if (!document.getSelection()?.toString()) setState(null); };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keyup', onUp);
    document.addEventListener('selectionchange', onSelChange);
    window.addEventListener('scroll', onSelChange, true);
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keyup', onUp);
      document.removeEventListener('selectionchange', onSelChange);
      window.removeEventListener('scroll', onSelChange, true);
    };
  }, [scope]);

  if (!state) return null;
  const quote = state.text.length > MAX_QUOTE ? `${state.text.slice(0, MAX_QUOTE)}…` : state.text;

  return (
    <div
      className="axn-selection-assist"
      role="toolbar"
      aria-label="AI 处理选中内容"
      style={{ left: state.x, top: state.y }}
      // 按下按钮时不让选区丢失
      onMouseDown={(e) => e.preventDefault()}
    >
      {ACTIONS.map(({ key, label, icon: Icon, prompt }) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(COMPOSE_EVENT, { detail: `${prompt}\n「${quote}」` }));
            document.getSelection()?.removeAllRanges();
            setState(null);
          }}
        >
          <Icon size={14} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
