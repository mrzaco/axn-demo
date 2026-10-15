/**
 * 设计 token 守门。裸值一多，界面就「不精致」：
 * 1. 字号 / 圆角走 global.css 刻度（--fs-* 7 档、--radius-* 3 档 + 嵌套档），不裸写 px；
 * 2. 字重只用 400 / 600（系统字体下微软雅黑只有两档真字重，500/700 会塌层级）；
 * 3. 组件 CSS 不写字面色值 —— 颜色只在 theme.ts 定义，经 main.tsx 注入 --axn-*。
 * 例外：
 * - doc.css：红头公文按 GB/T 9704 的物理字号 / 字色排版，属于版式而非 UI；
 * - settings/：内部组件样例页（只豁免第 1 条）；
 * - @media print 块（打印必须纯黑白）、mask-image 的遮罩色、注释行；
 * - 带 `token-exempt` 注释的行（如角标 10px、iOS 防缩放 16px）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const DOC = /components\/doc\/doc\.css$/;
const SETTINGS = /components\/settings\//;
const RAW = /(font-size|border-radius):\s*(\d+(?:\.\d+)?)px/;
const ALLOWED_RADIUS = new Set(['999', '0', '1']);
const WEIGHT = /font-weight:\s*(\d+)/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return cssFiles(p);
    return p.endsWith('.css') ? [p] : [];
  });
}

/** 逐行遍历产品 CSS，跳过变量定义 / 注释 / 豁免行 / @media print 块。 */
function scan(check: (line: string, rel: string) => boolean, skip: RegExp[] = []): string[] {
  const offenders: string[] = [];
  for (const file of cssFiles(ROOT)) {
    const rel = relative(ROOT, file);
    if (DOC.test(rel) || skip.some((re) => re.test(rel))) continue;
    let printDepth = 0;
    let inComment = false;
    readFileSync(file, 'utf8').split('\n').forEach((raw, i) => {
      // 去掉注释（含跨行块注释），只检查真正生效的声明
      let line = '';
      let rest = raw;
      while (rest) {
        if (inComment) {
          const end = rest.indexOf('*/');
          if (end < 0) { rest = ''; break; }
          inComment = false;
          rest = rest.slice(end + 2);
        } else {
          const start = rest.indexOf('/*');
          if (start < 0) { line += rest; break; }
          line += rest.slice(0, start);
          inComment = true;
          rest = rest.slice(start + 2);
        }
      }
      const t = line.trim();
      if (printDepth > 0 || t.startsWith('@media print')) {
        printDepth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        return;
      }
      if (!t || t.startsWith('--') || raw.includes('token-exempt')) return;
      if (check(line, rel)) offenders.push(`${rel}:${i + 1}  ${t}`);
    });
  }
  return offenders;
}

describe('设计 token', () => {
  it('产品 CSS 不裸写 px 字号 / 圆角', () => {
    const offenders = scan((line) => {
      const m = RAW.exec(line);
      return !!m && !(m[1] === 'border-radius' && ALLOWED_RADIUS.has(m[2]));
    }, [SETTINGS]);
    expect(offenders).toEqual([]);
  });

  it('字重只用 400 / 600', () => {
    const offenders = scan((line) => {
      const m = WEIGHT.exec(line);
      return !!m && m[1] !== '400' && m[1] !== '600';
    }, [/styles\/fonts\.css$/]);
    expect(offenders).toEqual([]);
  });

  it('组件 CSS 不写字面色值', () => {
    const offenders = scan((line) => HEX.test(line) && !line.includes('mask-image'));
    expect(offenders).toEqual([]);
  });
});
