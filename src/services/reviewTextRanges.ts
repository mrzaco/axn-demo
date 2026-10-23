/** 在已渲染的正文中匹配原文；范围跨文本节点，不改 DOM 或编辑器内容。 */
export function findReviewTextRanges(root: HTMLElement, text: string): Range[] {
  if (!text) return [];
  const nodes: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);
  const content = nodes.map(item => item.data).join('');
  const ranges: Range[] = [];
  let from = 0;
  let start: number;
  while ((start = content.indexOf(text, from)) !== -1) {
    const end = start + text.length;
    const range = root.ownerDocument.createRange();
    let offset = 0;
    for (const item of nodes) {
      if (offset <= start && start < offset + item.length) range.setStart(item, start - offset);
      if (offset < end && end <= offset + item.length) { range.setEnd(item, end - offset); break; }
      offset += item.length;
    }
    ranges.push(range);
    from = end;
  }
  return ranges;
}
