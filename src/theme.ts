/**
 * 安小能配色 v3 —— 主蓝 #1A5CFF + 微冷灰 + 两档语义色 + 应急等级色。
 * 这是全应用唯一允许出现字面色值的地方（公文版式 doc.css 与富文本命令色除外）：
 * antd token 走 themeConfig，品牌扩展色走 brandVars，二者都由 main.tsx 注入 :root 的 --axn-*。
 *
 * 规则
 * - 主色：每屏只给一个实心主操作；选中态一律 primary-50 浅底 + primary-600 文字。
 *   色阶由 antd 从 #1A5CFF 生成（50 #E6F1FF / 100 #BDD8FF / 400 #427EFF / 500 #1A5CFF / 600 #0B3ED9），
 *   不再用 color-mix 掺黑临时调色（掺黑后的蓝发灰发脏）。
 * - 中性灰带极轻冷调（色相 220°），与主蓝同温，读起来仍是灰。
 * - 语义色两档：基础档给圆点 / 图标 / 边框，-text 档给文字（白底 ≥4.5:1）。
 *   antd 的 colorSuccess / Warning / Error 用文字档 —— Typography type="warning" 等直接拿它当字色。
 * - 应急等级色只表达险情等级；Ⅳ级用天蓝，刻意与品牌蓝分开，免得「可点」和「Ⅳ级」混淆。
 *
 * 对比度（WCAG 2.2，白 / 画布 #F6F7F9）
 *   text      #161B26  17.2 / 16.1   正文、标题
 *   muted     #525B6B   6.9 /  6.4   次要文字、元信息
 *   faint     #8A93A3   3.1 /  2.9   仅图标、占位、禁用 —— 不得用于正文
 *   primary   #1A5CFF   5.2          链接、主按钮（primary-50 底上 4.6）
 *   primary600 #0B3ED9  6.8 (on 50)  浅底上的蓝字
 *   success-text #067647 5.7 · warning-text #B54708 5.4 · error-text #B42318 6.6
 */
import type { ThemeConfig } from 'antd';

const C = {
  primary: '#1A5CFF',
  text: '#161B26',
  muted: '#525B6B',
  faint: '#8A93A3',
  control: '#D5DAE1', // 输入框等可交互控件的描边，需比卡片边框更清楚
  border: '#E4E7EC',
  divider: '#EEF0F3',
  canvas: '#F6F7F9',
  sunken: '#F2F4F7',
  surface: '#FFFFFF',
  successText: '#067647',
  warningText: '#B54708',
  errorText: '#B42318',
};

export const themeConfig: ThemeConfig = {
  token: {
    // ── 主色 ──
    colorPrimary: C.primary,
    colorInfo: C.primary,
    colorLink: C.primary,
    colorSuccess: C.successText,
    colorWarning: C.warningText,
    colorError: C.errorText,

    // ── 背景与表面 ──
    colorBgLayout: C.canvas,
    colorBgContainer: C.surface,
    colorBgElevated: C.surface,

    // ── 文字 ──
    colorText: C.text,
    colorTextSecondary: C.muted,
    colorTextTertiary: C.faint,
    colorTextQuaternary: '#B4BBC6',

    // ── 边框 ──
    colorBorder: C.control,
    colorBorderSecondary: C.border,
    colorSplit: C.divider,

    // ── 填充 ──
    colorFillAlter: C.sunken,
    colorFillQuaternary: C.sunken,

    // ── 阴影（冷调，与灰阶同温） ──
    boxShadow: '0 2px 4px rgba(16, 24, 40, .04), 0 8px 24px rgba(16, 24, 40, .08)',
    boxShadowSecondary: '0 4px 8px rgba(16, 24, 40, .05), 0 16px 40px rgba(16, 24, 40, .12)',

    // ── 圆角与字体 ──
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 6,
    fontSize: 14,
    lineHeight: 22 / 14,
    fontWeightStrong: 600,
    // 拉丁与数字走 Inter；中文按平台点名系统黑体（见 global.css body 注释）
    fontFamily:
      "'Inter Variable', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Segoe UI', sans-serif",
  },
  components: {
    Layout: {
      headerBg: C.surface,
      headerHeight: 56,
      bodyBg: C.canvas,
    },
    Card: { bodyPadding: 14, headerFontSize: 14 },
    Tabs: { horizontalItemPadding: '8px 14px' },
    Table: { cellPaddingBlockSM: 6, cellPaddingInlineSM: 8 },
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      fontWeight: 400,
    },
    Input: {
      activeShadow: '0 0 0 3px rgba(26, 92, 255, .12)',
    },
    Modal: {
      marginXXS: 20,
    },
  },
};

/**
 * antd token 之外的品牌扩展色，由 main.tsx 原样注入 :root。
 * 键即 CSS 变量名。
 */
export const brandVars: Record<string, string> = {
  '--axn-divider': C.divider,
  '--axn-sunken': C.sunken,

  // 语义色基础档（圆点 / 图标 / 边框）；文字档见 --axn-*-text
  '--axn-success': '#079455',
  '--axn-warning': '#DC6803',
  '--axn-error': '#D92D20',
  '--axn-success-text': C.successText,
  '--axn-warning-text': C.warningText,
  '--axn-error-text': C.errorText,
  '--axn-success-bg': '#ECFDF3',
  '--axn-warning-bg': '#FEF6EE',
  '--axn-error-bg': '#FEF3F2',

  // 应急响应等级（Ⅰ红 / Ⅱ橙 / Ⅲ黄 / Ⅳ天蓝）：基础档 + 文字档 + 浅底
  '--axn-level-1': '#D92D20',
  '--axn-level-2': '#EF6820',
  '--axn-level-3': '#CA8504',
  '--axn-level-4': '#0086C9',
  '--axn-level-1-text': '#B42318',
  '--axn-level-2-text': '#B93815',
  '--axn-level-3-text': '#A15C07',
  '--axn-level-4-text': '#026AA2',
  '--axn-level-1-bg': '#FEF3F2',
  '--axn-level-2-bg': '#FEF6EE',
  '--axn-level-3-bg': '#FEFBE8',
  '--axn-level-4-bg': '#F0F9FF',

  // 分类色板（图例 / 地图）：6 色，色相错开主蓝与等级色，饱和度统一压低一档
  '--axn-cat-1': '#16B364', // 队伍
  '--axn-cat-2': '#F38744', // 事件
  '--axn-cat-3': '#7A5AF8', // 水位站
  '--axn-cat-4': '#0BA5EC',
  '--axn-cat-5': '#EE46BC',
  '--axn-cat-6': '#667085',
  '--axn-map-water': '#9CC7F5',
  '--axn-map-water-deep': '#5B9BEA',
  '--axn-map-active': '#E04F16',
  '--axn-map-route': '#099250',
  '--axn-map-selected': '#3CCB7F',

  // 公文红头 / 要害标记：GB/T 9704 正红，属于公文版式语义，不随品牌调
  '--axn-critical': '#D0021B',

  // 阴影基色（冷调）
  '--shadow-rgb': '16, 24, 40',
};
