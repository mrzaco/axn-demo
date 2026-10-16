import { useEffect, useRef } from 'react';
import type { MockDocument } from '@/seed/mockDocuments';
import { useDocumentReviewStore, type DocumentReview } from '@/store/documentReviewStore';
import { findReviewTextRanges } from '@/services/reviewTextRanges';

/** 标红通过浏览器范围绘制，不向富文本插入标签，保存与导出不带检查标记。 */
export function useReviewIssueLocations(scope: string, document: MockDocument, review: DocumentReview | undefined, enabled: boolean) {
  const paperRef = useRef<HTMLElement>(null);
  const handledRequest = useRef<number | null>(null);
  const target = useDocumentReviewStore(s => s.issueTarget);
  useEffect(() => {
    const paper = paperRef.current;
    if (!enabled || !paper || !review) return;
    const supportsHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
    const render = () => {
      paper.querySelectorAll('[data-review-issue]').forEach(el => el.removeAttribute('data-review-issue'));
      paper.querySelectorAll('[data-review-focused]').forEach(el => el.removeAttribute('data-review-focused'));
      const ranges: Range[] = [];
      const locations = new Map<string, { element: HTMLElement; range: Range }[]>();
      for (const issue of review.issues ?? []) {
        if (issue.checkIndex >= review.completedCount) continue;
        const sectionIndex = issue.sectionIndex ?? document.sections.findIndex(([heading]) => heading === issue.location);
        const elements = issue.id === 'date-format'
          ? paper.querySelectorAll<HTMLElement>('[aria-label="成文日期"], [aria-label="落款日期"]')
          : paper.querySelectorAll<HTMLElement>(`[data-review-section="${sectionIndex}"] .doc-rich-editor`);
        for (const element of elements) {
          const matches = findReviewTextRanges(element, issue.original);
          if (!matches.length) continue;
          element.dataset.reviewIssue = issue.id;
          ranges.push(...matches);
          locations.set(issue.id, [...(locations.get(issue.id) ?? []), { element, range: matches[0] }]);
        }
      }
      if (supportsHighlight) CSS.highlights.set('doc-review-error', new Highlight(...ranges));
      if (target?.scope !== scope || target.documentId !== document.id) return;
      const candidates = locations.get(target.issueId);
      // 日期在版头和落款重复时，优先定位落款日期。
      const location = candidates?.find(item => item.element.getAttribute('aria-label') === '落款日期') ?? candidates?.[0];
      if (!location) return;
      location.element.dataset.reviewFocused = 'true';
      if (handledRequest.current === target.requestId) return;
      handledRequest.current = target.requestId;
      const rect = location.range.getBoundingClientRect();
      const scroller = paper.closest<HTMLElement>('.doc-detail-scroll');
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        scroller.scrollBy({ top: rect.top - box.top - box.height * .35, behavior: 'instant' });
      }
      location.element.focus({ preventScroll: true });
      const caret = location.range.cloneRange();
      caret.collapse(true);
      const selection = paper.ownerDocument.getSelection();
      selection?.removeAllRanges(); selection?.addRange(caret);
    };
    const frame = requestAnimationFrame(render);
    const observer = new MutationObserver(render);
    observer.observe(paper, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      if (supportsHighlight) CSS.highlights.delete('doc-review-error');
      paper.querySelectorAll('[data-review-issue]').forEach(el => el.removeAttribute('data-review-issue'));
      paper.querySelectorAll('[data-review-focused]').forEach(el => el.removeAttribute('data-review-focused'));
    };
  }, [scope, document, review, enabled, target]);
  return paperRef;
}
