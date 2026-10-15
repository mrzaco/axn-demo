/**
 * 全站统一页头：标题 + 副标题 + 右侧操作区。
 * 文书库 / 知识库 / 智能体 / 应急项目 / 定时任务共用，保证各页起笔一致。
 */
import type { ReactNode } from 'react';

export default function PageHeader({ title, sub, extra }: { title: ReactNode; sub?: ReactNode; extra?: ReactNode }) {
  return (
    <header className="axn-page-header">
      <div className="axn-page-header-copy">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {extra && <div className="axn-page-header-extra">{extra}</div>}
    </header>
  );
}
