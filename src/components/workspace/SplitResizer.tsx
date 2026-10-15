/**
 * 对话 / 文书分栏拖拽条。宽度写到父容器的 CSS 变量 --axn-chat-col，上下限由 CSS clamp 兜底；
 * 记在 localStorage，刷新后保持。键盘可用：←/→ 每次 24px。
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

const KEY = 'axn-chat-col';
const STEP = 24;

function readSaved(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export default function SplitResizer() {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const container = () => ref.current?.parentElement ?? null;
  const apply = (px: number, persist: boolean) => {
    const host = container();
    if (!host) return;
    const w = Math.round(Math.max(360, Math.min(px, host.clientWidth * 0.55)));
    host.style.setProperty('--axn-chat-col', `${w}px`);
    if (persist) try { localStorage.setItem(KEY, String(w)); } catch { /* 隐私模式 */ }
  };
  const current = () => {
    const host = container();
    const pane = host?.firstElementChild as HTMLElement | null;
    return pane?.getBoundingClientRect().width ?? 460;
  };

  useEffect(() => {
    const saved = readSaved();
    if (saved) apply(saved, false);
    const host = container();
    return () => { host?.style.removeProperty('--axn-chat-col'); };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const host = container();
    if (!host) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    host.classList.add('is-resizing');
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const host = container();
    if (!host) return;
    apply(e.clientX - host.getBoundingClientRect().left, false);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    container()?.classList.remove('is-resizing');
    apply(current(), true);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    apply(current() + (e.key === 'ArrowRight' ? STEP : -STEP), true);
  };

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="调整对话与文书宽度"
      tabIndex={0}
      className={`axn-split-resizer${dragging ? ' is-dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => { container()?.style.removeProperty('--axn-chat-col'); try { localStorage.removeItem(KEY); } catch { /* noop */ } }}
      onKeyDown={onKeyDown}
    />
  );
}
