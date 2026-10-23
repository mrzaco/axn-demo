import { describe, expect, it } from 'vitest';
import { findReviewTextRanges } from '@/services/reviewTextRanges';
import { serializeRichDom } from '@/services/richText';

describe('文书检查原文范围', () => {
  it('跨富文本节点找到错误句，不改变格式或保存内容', () => {
    const root = document.createElement('div');
    const before = document.createTextNode('累计转移群众 ');
    const number = document.createElement('strong'); number.textContent = '108';
    root.append(before, number, document.createTextNode(' 人，其中已安置 72 人、途中转移 24 人。'));
    const html = serializeRichDom(root);
    const ranges = findReviewTextRanges(root, '累计转移群众 108 人，其中已安置 72 人、途中转移 24 人。');
    expect(ranges).toHaveLength(1);
    expect(ranges[0].toString()).toBe(root.textContent);
    expect(serializeRichDom(root)).toBe(html);
    expect(root.querySelector('strong')?.textContent).toBe('108');
  });

  it('重复日期分别定位，无法匹配的原文不标记', () => {
    const root = document.createElement('div'); root.textContent = '2026/10/15，落款：2026/10/15';
    const ranges = findReviewTextRanges(root, '2026/10/15');
    expect(ranges).toHaveLength(2);
    expect(ranges.map(range => range.toString())).toEqual(['2026/10/15', '2026/10/15']);
    expect(findReviewTextRanges(root, '')).toEqual([]);
    expect(findReviewTextRanges(root, '2026年10月15日')).toEqual([]);
  });
});
