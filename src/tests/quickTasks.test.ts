/**
 * 快捷任务目录（seed/agentQuickTasks）与 mock 意图识别的契约测试。
 *
 * 背景：chip 菜单点击后发送的是 task 文本（不是 label），必须能被 recognize() 命中；
 * 若新增子任务的文本落不到任何意图，界面会显示“安小能暂未接入真实功能…”兜底，
 * 看起来就像坏了。本文件守住这条契约，以及菜单项 key 的唯一性。
 */
import { describe, expect, it } from 'vitest';
import { AGENT_QUICK_TASKS } from '@/seed/agentQuickTasks';
import { recognize } from '@/services/mock/provider';
import { ensureQaLoaded } from '@/services/qaKnowledge';

// recognize 内部会查问答语料（按需加载，不进首屏），先备好。
await ensureQaLoaded();

const ctx = { lastResourceResultIds: [], candidateResourceIds: [] };

/**
 * 不经 recognize、由 ChatPanel.tsx 的 handleQuickTask 本地分流的任务：
 * 「生成工作总结」走 generateWorkSummary（词面匹配不到任何演示意图，故必须豁免）。
 * 其余「应急要情 / 值班日报」虽也被本地分流，但词面同样能命中 doc_brief / doc_daily，
 * 所以不需要豁免 —— 顺便守住“摘掉本地分流后仍不会兜底”。
 */
const HANDLED_LOCALLY = new Set(['生成工作总结']);

describe('快捷任务目录与意图识别的契约', () => {
  it('每项 task 都能被 recognize 命中，不会落到 unknown 兜底', () => {
    for (const agent of AGENT_QUICK_TASKS) {
      for (const { label, task } of agent.tasks) {
        if (HANDLED_LOCALLY.has(task)) continue;
        const got = recognize(task, ctx).intent;
        expect(got, `${agent.label} / ${label} → “${task}” 落到了 unknown，请补 provider 的识别规则`).not.toBe('unknown');
      }
    }
  });

  it('task 文本唯一：同时用作菜单项 key，重复会让两个按钮点出同一个结果', () => {
    const tasks = AGENT_QUICK_TASKS.flatMap((a) => a.tasks.map((t) => t.task));
    expect(new Set(tasks).size).toBe(tasks.length);
  });

  it('五个能力块各有任务，且能力块 label 不重复', () => {
    expect(AGENT_QUICK_TASKS).toHaveLength(5);
    for (const agent of AGENT_QUICK_TASKS) expect(agent.tasks.length).toBeGreaterThan(0);
    const labels = AGENT_QUICK_TASKS.map((a) => a.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
