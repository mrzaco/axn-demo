import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextScheduledAt, restoreSchedules, useScheduleStore, type ScheduleInput } from '@/store/scheduleStore';
import { runScheduledTask } from '@/services/scheduledTasks';
import { useConversationStore } from '@/store/conversationStore';
import { useSessionStore } from '@/store/sessionStore';
import { useDemoStore } from '@/store/demoStore';
import { useMockDocumentStore } from '@/store/mockDocumentStore';
import { useDocumentStore } from '@/store/documentStore';
import { collectResultFiles } from '@/services/myFiles';
import { resetDemoData } from '@/store/resetDemo';
import { flushPersist, loadPersist } from '@/store/persistence';

const plan: ScheduleInput = { name: '每日巡检', prompt: '生成灾情摘要', eventId: 'evt-demo-001', frequency: 'daily', time: '08:00', date: '', weekday: 1, enabled: true };
beforeEach(() => resetDemoData());
afterEach(() => vi.useRealTimers());

describe('计划配置与时间', () => {
  it('按北京时间计算每日、每周及单次计划，过期单次不补跑', () => {
    const now = Date.parse('2026-10-16T07:00:00+08:00');
    expect(nextScheduledAt(plan, now)).toBe('2026-10-16T00:00:00.000Z');
    expect(nextScheduledAt(plan, now + 3600000)).toBe('2026-10-17T00:00:00.000Z');
    expect(nextScheduledAt({ ...plan, frequency: 'weekly', weekday: 1 }, now)).toBe('2026-10-19T00:00:00.000Z');
    expect(nextScheduledAt({ ...plan, frequency: 'once', date: '2026-10-15' }, now)).toBeNull();
    expect(nextScheduledAt({ ...plan, enabled: false }, now)).toBeNull();
  });
  it('创建、编辑、暂停、恢复、删除与持久化一致', () => {
    const id = useScheduleStore.getState().save(plan);
    useScheduleStore.getState().save({ ...plan, name: '修改后的巡检' }, id);
    useScheduleStore.getState().toggle(id);
    expect(useScheduleStore.getState().schedules.find(item => item.id === id)?.enabled).toBe(false);
    flushPersist();
    expect(loadPersist<{ schedules: { id: string; name: string }[] }>('schedules')?.schedules.find(item => item.id === id)?.name).toBe('修改后的巡检');
    useScheduleStore.getState().toggle(id);
    expect(useScheduleStore.getState().schedules.find(item => item.id === id)?.enabled).toBe(true);
    useScheduleStore.getState().remove(id);
    expect(useScheduleStore.getState().schedules.some(item => item.id === id)).toBe(false);
    expect(() => useScheduleStore.getState().save({ ...plan, name: ' ' })).toThrow();
  });
  it('刷新中断的执行记录可恢复为失败，删除后的回调不复活计划', () => {
    const id = useScheduleStore.getState().save(plan);
    const run = useScheduleStore.getState().beginRun(id)!;
    expect(useScheduleStore.getState().beginRun(id)).toBeNull();
    const restored = restoreSchedules(useScheduleStore.getState().schedules);
    expect(restored.find(item => item.id === id)?.runs[0].status).toBe('failed');
    useScheduleStore.getState().remove(id);
    useScheduleStore.getState().updateRun(id, run.id, { status: 'succeeded' });
    expect(useScheduleStore.getState().schedules.some(item => item.id === id)).toBe(false);
  });
});

describe('模拟执行定时任务', () => {
  it('生成独立结果对话与文件，记录完成状态且防止重复执行', async () => {
    useDemoStore.getState().setPace('fast');
    const id = useScheduleStore.getState().save(plan);
    const previous = useConversationStore.getState().activeConversationId;
    const conversationId = runScheduledTask(id)!;
    expect(conversationId).not.toBe(previous);
    expect(runScheduledTask(id)).toBeNull();
    const other = useScheduleStore.getState().save({ ...plan, name: '另一个任务' });
    expect(() => runScheduledTask(other)).toThrow('正在执行');
    await vi.waitFor(() => expect(useScheduleStore.getState().schedules.find(item => item.id === id)?.runs[0].status).toBe('succeeded'), { timeout: 15000 });
    const files = collectResultFiles(useSessionStore.getState(), useMockDocumentStore.getState().libraries, useDocumentStore.getState().drafts, useConversationStore.getState().conversations);
    expect(files.some(file => file.conversationId === conversationId && file.category === 'situation')).toBe(true);
    expect(useConversationStore.getState().conversations[previous!]).toBeTruthy();
  });
  it('不支持的执行内容记录失败，不伪造成功结果', async () => {
    const id = useScheduleStore.getState().save({ ...plan, prompt: '一条完全没有对应能力的指令xyz' });
    runScheduledTask(id);
    await vi.waitFor(() => expect(useScheduleStore.getState().schedules.find(item => item.id === id)?.runs[0].status).toBe('failed'));
    expect(useScheduleStore.getState().schedules.find(item => item.id === id)?.runs[0].detail).toContain('未匹配');
  });
});
