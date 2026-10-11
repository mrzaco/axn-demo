/**
 * 文书生成完成后的统一对话回复（模拟文书 · 右侧工作区已打开）。
 */
export function documentGeneratedReply(title: string): string {
  const name = title.trim() || '未命名文书';
  return `已生成《${name}》（模拟文书），已在右侧文书工作区打开。`;
}
