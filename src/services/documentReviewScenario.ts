import type { MockDocument } from '@/seed/mockDocuments';
import { richTextToPlain } from './richText';

export type ReviewIssue = {
  id: string; checkIndex: number; title: string; location: string;
  original: string; explanation: string; suggestion: string;
};
export const REVIEW_NUMBER_ERROR = '累计转移群众 108 人，其中已安置 72 人、途中转移 24 人。';
export const REVIEW_NUMBER_FIXED = '累计转移群众 96 人，其中已安置 72 人、途中转移 24 人。';

/** 给新生成的模拟稿加入可复现的问题，检查结果对应真实展示的草稿内容。 */
export function withReviewDemoIssues(document: MockDocument): MockDocument {
  return {
    ...document,
    date: document.date.replace(/年|月/g, '/').replace(/日$/, ''),
    sections: document.sections.map(([heading, body], index) => [heading, index === 0 ? `${body}\n${REVIEW_NUMBER_ERROR}` : body] as const),
  };
}

export function findReviewIssues(document: MockDocument): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  for (const [heading, body] of document.sections) {
    if (richTextToPlain(body).includes(REVIEW_NUMBER_ERROR)) issues.push({
      id: `number-${issues.length}`, checkIndex: 1, title: '人数合计不一致', location: heading,
      original: REVIEW_NUMBER_ERROR,
      explanation: '分项人数合计为 72 + 24 = 96 人，与正文总人数 108 人相差 12 人。',
      suggestion: REVIEW_NUMBER_FIXED,
    });
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(document.date)) issues.push({
    id: 'date-format', checkIndex: 8, title: '日期格式错误', location: '成文日期 / 落款日期', original: document.date,
    explanation: '日期使用斜杠分隔，应按当前文书模板使用“年、月、日”格式。',
    suggestion: document.date.replace(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, '$1年$2月$3日'),
  });
  return issues;
}

/** 只替换模拟问题对应的原文，其余用户编辑保持不变。 */
export function applyReviewDemoFixes(document: MockDocument): MockDocument {
  const dateIssue = findReviewIssues(document).find(issue => issue.id === 'date-format');
  return { ...document, date: dateIssue?.suggestion ?? document.date,
    sections: document.sections.map(([heading, body]) => [heading, body.replaceAll(REVIEW_NUMBER_ERROR, REVIEW_NUMBER_FIXED)] as const),
  };
}
