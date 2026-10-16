import { create } from 'zustand';
import { clearPersist, loadPersist, schedulePersist } from './persistence';

export type ScheduleInput = {
  name: string; prompt: string; eventId: string; frequency: 'once' | 'daily' | 'weekly';
  time: string; date: string; weekday: number; enabled: boolean;
};
export type ScheduleRun = { id: string; startedAt: string; finishedAt?: string; status: 'running' | 'succeeded' | 'waiting_input' | 'failed' | 'cancelled'; conversationId?: string; taskId?: string; detail?: string };
export type ScheduledTask = ScheduleInput & { id: string; createdAt: string; runs: ScheduleRun[] };
const DAY = 86400000;

/** 计划时间统一按 UTC+8 计算，不随运行浏览器的时区变化。 */
export function nextScheduledAt(plan: ScheduleInput, now = Date.now()): string | null {
  if (!plan.enabled || !/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.time)) return null;
  if (plan.frequency === 'once') {
    const at = Date.parse(`${plan.date}T${plan.time}:00+08:00`);
    return Number.isFinite(at) && at > now ? new Date(at).toISOString() : null;
  }
  const local = new Date(now + 8 * 3600000);
  const [hours, minutes] = plan.time.split(':').map(Number);
  const weekday = local.getUTCDay();
  local.setUTCHours(hours, minutes, 0, 0);
  let at = local.getTime() - 8 * 3600000;
  if (plan.frequency === 'weekly') at += ((plan.weekday - weekday + 7) % 7) * DAY;
  if (at <= now) at += (plan.frequency === 'weekly' ? 7 : 1) * DAY;
  return new Date(at).toISOString();
}

const defaults = (): ScheduledTask[] => [
  { id: 'sched-daily', name: '每日灾情摘要', prompt: '生成灾情摘要', eventId: 'evt-demo-001', frequency: 'daily', time: '08:00', date: '', weekday: 1, enabled: true },
  { id: 'sched-patrol', name: '重点河段态势巡检', prompt: '生成灾情摘要', eventId: 'evt-demo-002', frequency: 'daily', time: '09:00', date: '', weekday: 1, enabled: true },
  { id: 'sched-resource', name: '资源状态检查', prompt: '查询周边救援资源', eventId: 'evt-demo-001', frequency: 'weekly', time: '07:30', date: '', weekday: 1, enabled: false },
].map(plan => ({ ...plan, frequency: plan.frequency as ScheduleInput['frequency'], createdAt: '2026-09-28T00:00:00Z', runs: [] }));

export function restoreSchedules(rows: ScheduledTask[]): ScheduledTask[] {
  return rows.map(plan => ({ ...plan, runs: (plan.runs ?? []).map(run => run.status === 'running'
    ? { ...run, status: 'failed', finishedAt: new Date().toISOString(), detail: '页面已刷新，本次演示执行已中断，可重新执行。' } : run) }));
}
interface ScheduleState {
  schedules: ScheduledTask[];
  save: (input: ScheduleInput, id?: string) => string;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  beginRun: (id: string) => ScheduleRun | null;
  updateRun: (id: string, runId: string, patch: Partial<ScheduleRun>) => void;
  reset: () => void;
}
const persisted = loadPersist<{ schedules: ScheduledTask[] }>('schedules');
export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: persisted?.schedules ? restoreSchedules(persisted.schedules) : defaults(),
  save: (input, id) => {
    const value = { ...input, name: input.name.trim(), prompt: input.prompt.trim() };
    if (!value.name || !value.prompt || !value.eventId || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) throw new Error('请完整填写任务名称、执行内容、关联事件和时间');
    if (value.frequency === 'once' && !nextScheduledAt({ ...value, enabled: true })) throw new Error('单次任务的计划时间必须晚于当前时间');
    const existing = get().schedules.find(plan => plan.id === id);
    if (id && !existing) throw new Error('任务已删除，请重新创建');
    if (existing?.runs.some(run => run.status === 'running')) throw new Error('请等待本次执行结束后编辑任务');
    const next = { ...value, id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? new Date().toISOString(), runs: existing?.runs ?? [] };
    set(state => ({ schedules: existing ? state.schedules.map(plan => plan.id === id ? next : plan) : [next, ...state.schedules] }));
    return next.id;
  },
  toggle: id => {
    const plan = get().schedules.find(item => item.id === id);
    if (!plan) return;
    if (!plan.enabled && !nextScheduledAt({ ...plan, enabled: true })) throw new Error('请先编辑任务，设置未来的计划时间');
    set(state => ({ schedules: state.schedules.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item) }));
  },
  remove: id => set(state => ({ schedules: state.schedules.filter(plan => plan.id !== id) })),
  beginRun: id => {
    const plan = get().schedules.find(item => item.id === id);
    if (!plan || plan.runs.some(run => run.status === 'running')) return null;
    const run: ScheduleRun = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), status: 'running' };
    set(state => ({ schedules: state.schedules.map(item => item.id === id ? { ...item, runs: [run, ...item.runs].slice(0, 10) } : item) }));
    return run;
  },
  updateRun: (id, runId, patch) => set(state => ({ schedules: state.schedules.map(plan => plan.id === id
    ? { ...plan, runs: plan.runs.map(run => run.id === runId ? { ...run, ...patch, id: run.id } : run) } : plan) })),
  reset: () => { clearPersist('schedules'); set({ schedules: defaults() }); },
}));
useScheduleStore.subscribe(state => schedulePersist('schedules', { schedules: state.schedules }));
