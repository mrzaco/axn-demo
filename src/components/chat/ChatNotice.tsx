import type { ReactNode } from 'react';
import './chat-notice.css';

/** 轻提示：一行图标 + 文字（替代整块 Alert） */
export default function ChatNotice({ tone, title, children }: { tone: 'info' | 'ok' | 'warn' | 'err'; title: ReactNode; children?: ReactNode }) {
  return (
    <div className={`axn-spec-notice is-${tone}`} role={tone === 'err' ? 'alert' : 'status'}>
      <i aria-hidden />
      <div><strong>{title}</strong>{children && <p>{children}</p>}</div>
    </div>
  );
}
