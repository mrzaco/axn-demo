import { useId } from 'react';

/**
 * 安小能品牌图形：渐变圆角方块 + 盾形（守护）+ 四角星（智能）。
 * 侧栏品牌位与 AI 头像共用，替代原来「方块里一个 安 字」的占位。
 * 颜色全部取主色色阶（primary-400 → 600 渐变），换主色时自动跟随。
 */
export default function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--axn-primary-400)" />
          <stop offset="1" stopColor="var(--axn-primary-600)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-g)`} />
      <path
        d="M16 6.8l7.2 2.7v5.8c0 4.7-3.1 8.5-7.2 10-4.1-1.5-7.2-5.3-7.2-10V9.5z"
        fill="var(--axn-surface)"
        fillOpacity=".96"
      />
      <path
        d="M16 11.2l1.15 2.75 2.75 1.15-2.75 1.15L16 19l-1.15-2.75-2.75-1.15 2.75-1.15z"
        fill="var(--axn-primary)"
      />
    </svg>
  );
}
