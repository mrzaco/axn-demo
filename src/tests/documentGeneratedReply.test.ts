import { describe, expect, it } from 'vitest';
import { documentGeneratedReply } from '@/services/documentGeneratedReply';

describe('documentGeneratedReply', () => {
  it('统一生成完成回复文案', () => {
    expect(documentGeneratedReply('工程救援处置方案初稿（模拟）')).toBe(
      '已生成《工程救援处置方案初稿（模拟）》（模拟文书），已在右侧文书工作区打开。',
    );
  });

  it('空标题回落为未命名文书', () => {
    expect(documentGeneratedReply('  ')).toBe(
      '已生成《未命名文书》（模拟文书），已在右侧文书工作区打开。',
    );
  });
});
