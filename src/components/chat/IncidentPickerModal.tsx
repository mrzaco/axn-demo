/**
 * 关联灾情选择弹窗：屏幕居中，顶部搜索，列表只展示事件名称。
 * 支持键盘：↑/↓ 移动高亮，Enter 选择，Esc 关闭。
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Modal } from 'antd';
import { Check, Search, X } from 'lucide-react';
import { factText, incidents } from '@/seed/scenario';

interface Row {
  id: string;
  title: string;
  sortKey: string;
}

export default function IncidentPickerModal({ open, value, onClose, onSelect }: {
  open: boolean;
  /** 当前关联的事件 id；'none' 表示不关联 */
  value: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => incidents.map((inc) => ({
    id: inc.eventId,
    title: factText(inc.factRefs.title),
    sortKey: factText(inc.factRefs.occurredAt),
  })).sort((a, b) => b.sortKey.localeCompare(a.sortKey)), []);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => rows.filter(row => !q || row.title.toLowerCase().includes(q)), [rows, q]);
  // 键盘导航用的扁平序：「不关联」放在最后。
  const flat = useMemo(() => [...matches.map(row => row.id), ...(q ? [] : ['none'])], [matches, q]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(0, flat.indexOf(value)));
    // Modal 打开动画结束前 input 还不可聚焦
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
    // 只在打开瞬间按当前值定位高亮（故意只依赖 open）
  }, [open]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (id: string) => { onSelect(id); onClose(); };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(flat.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); pick(flat[active]); }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      centered
      width={560}
      destroyOnHidden
      className="axn-incident-modal"
      title={null}
      aria-label="选择关联灾情"
    >
      <div className="axn-incident-picker" data-testid="incident-picker" onKeyDown={onKeyDown}>
        <div className="axn-incident-head">
          <div>
            <h2>选择关联灾情</h2>
            <p>关联后，问答与智能体都会以该事件的数据为依据。</p>
          </div>
          <button type="button" className="axn-incident-close" aria-label="关闭" onClick={onClose}><X size={16} /></button>
        </div>
        <label className="axn-incident-search">
          <Search size={16} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索事件名称"
            aria-label="搜索灾情"
            role="combobox"
            aria-expanded
            aria-controls="axn-incident-list"
            aria-activedescendant={flat[active] ? `axn-incident-opt-${flat[active]}` : undefined}
          />
          {query && <button type="button" aria-label="清空搜索" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><X size={14} /></button>}
        </label>
        <div className="axn-incident-list" id="axn-incident-list" role="listbox" aria-label="灾情列表" ref={listRef}>
          {matches.map((row) => {
            const idx = flat.indexOf(row.id);
            const selected = row.id === value;
            return (
              <div
                key={row.id}
                id={`axn-incident-opt-${row.id}`}
                role="option"
                aria-selected={selected}
                className={`axn-incident-option${idx === active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
                onMouseMove={() => setActive(idx)}
                onClick={() => pick(row.id)}
              >
                <span className="axn-incident-copy"><span className="axn-incident-title">{row.title}</span></span>
                {selected && <Check size={16} className="axn-incident-check" aria-hidden />}
              </div>
            );
          })}
          {matches.length === 0 && <div className="axn-incident-empty">没有找到「{query.trim()}」相关的灾情</div>}
          {!q && (
            <div
              id="axn-incident-opt-none"
              role="option"
              aria-selected={value === 'none'}
              className={`axn-incident-option axn-incident-none${flat[active] === 'none' ? ' is-active' : ''}${value === 'none' ? ' is-selected' : ''}`}
              onMouseMove={() => setActive(flat.indexOf('none'))}
              onClick={() => pick('none')}
            >
              <span className="axn-incident-copy"><span className="axn-incident-title">不关联灾情</span></span>
              {value === 'none' && <Check size={16} className="axn-incident-check" aria-hidden />}
            </div>
          )}
        </div>
        <div className="axn-incident-foot" aria-hidden>
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>Enter</kbd> 确认</span><span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </Modal>
  );
}
