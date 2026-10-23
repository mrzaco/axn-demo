import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { Check, ChevronDown, Search, X, Zap } from 'lucide-react';
import { DEMO_SKILLS } from '@/seed/demoSkills';
import './composer-skill.css';

interface ComposerSkillPickerProps {
  conversationId: string;
  disabled: boolean;
  compact?: boolean;
  open: boolean;
  slashQuery: string | null;
  containerRef: { readonly current: HTMLDivElement | null };
  onOpenChange: (open: boolean) => void;
  onAfterClose: () => void;
}

/** 技能列表贴近输入框；斜杠搜索留在输入框中，按钮入口提供列表内搜索。 */
export default function ComposerSkillPicker({ conversationId, disabled, compact = false, open, slashQuery, containerRef, onOpenChange, onAfterClose }: ComposerSkillPickerProps) {
  const [selectedByConversation, setSelectedByConversation] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<InputRef>(null);
  const selectedId = selectedByConversation[conversationId] ?? null;
  const selected = DEMO_SKILLS.find(skill => skill.id === selectedId);
  const effectiveQuery = slashQuery ?? query;
  const matches = DEMO_SKILLS.filter(skill => !effectiveQuery.trim() || `${skill.name}${skill.description}`.toLowerCase().includes(effectiveQuery.trim().toLowerCase()));
  const close = (restoreFocus = true) => {
    onOpenChange(false);
    if (restoreFocus) requestAnimationFrame(onAfterClose);
  };
  const select = (id: string | null) => {
    setSelectedByConversation(previous => ({ ...previous, [conversationId]: id }));
    close();
  };
  useEffect(() => { onOpenChange(false); }, [conversationId, onOpenChange]);
  useEffect(() => { if (open) { setQuery(''); setActive(0); } }, [open]);
  useEffect(() => { setActive(0); }, [effectiveQuery]);
  useEffect(() => {
    if (open && slashQuery === null) searchRef.current?.focus();
  }, [open, slashQuery]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      if (target instanceof HTMLTextAreaElement && containerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange, containerRef]);
  useEffect(() => {
    if (!open) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') close();
      else if (event.key === 'Enter') { if (matches[active]) select(matches[active].id); }
      else if (matches.length) setActive(previous => (previous + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length);
    };
    // 捕获 Enter，避免选择技能时误提交对话。
    const container = containerRef.current;
    container?.addEventListener('keydown', keyboard, true);
    return () => container?.removeEventListener('keydown', keyboard, true);
  });
  useEffect(() => {
    if (open) menuRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  const menu = open && containerRef.current ? createPortal(
    <div ref={menuRef} className="axn-composer-menu" role="region" aria-label="选择技能" onMouseDown={event => event.stopPropagation()}>
      <div className="axn-composer-menu-heading"><span>技能 <span className="axn-composer-menu-count">{matches.length}</span></span><button type="button" className="axn-composer-menu-close" aria-label="关闭技能选择" onClick={() => close()}><X size={14} /></button></div>
      {slashQuery === null ? <Input ref={searchRef} className="axn-composer-menu-search" allowClear aria-label="搜索对话技能" prefix={<Search size={14} />} placeholder="搜索技能" value={query} onChange={event => setQuery(event.target.value)} /> : <div className="axn-composer-menu-query">{effectiveQuery ? `搜索：${effectiveQuery}` : '继续输入以搜索技能'}</div>}
      <div className="axn-composer-menu-list" role="listbox" aria-label="可选技能">
        {matches.map((skill, index) => {
          const Icon = skill.icon;
          return <button key={skill.id} type="button" role="option" aria-selected={skill.id === selectedId} data-active={index === active}
            className={`axn-composer-menu-option${index === active ? ' is-active' : ''}`} onPointerMove={() => setActive(index)} onClick={() => select(skill.id)}>
            <span className="axn-composer-menu-icon"><Icon size={18} aria-hidden /></span>
            <span className="axn-composer-menu-copy"><strong>{skill.name}</strong><span>{skill.description}</span></span>
            {skill.id === selectedId && <Check size={16} className="axn-composer-menu-check" aria-hidden />}
          </button>;
        })}
        {!matches.length && <div className="axn-composer-menu-empty">未找到匹配的技能</div>}
      </div>
      <div className="axn-composer-menu-footer"><span><kbd>↑</kbd><kbd>↓</kbd> 选择 <kbd>↵</kbd> 确认 <kbd>esc</kbd> 收起</span><Button type="text" size="small" disabled={!selected} onClick={() => select(null)}>清除选择</Button></div>
    </div>, containerRef.current,
  ) : null;
  return <>
    <Tooltip title={selected?.name ?? '选择技能（输入 / 打开）'}>
      <button ref={triggerRef} type="button" className={`axn-composer-skill${selected ? ' is-selected' : ''}`} disabled={disabled}
        aria-label="选择技能" aria-description={selected?.name ?? '未选择技能'} aria-haspopup="listbox" aria-expanded={open} data-testid="composer-skill-picker"
        onClick={() => onOpenChange(!open)}>
        <Zap size={14} aria-hidden /><span>{compact ? '技能' : selected?.name ?? '技能'}</span><ChevronDown size={12} aria-hidden />
      </button>
    </Tooltip>
    {menu}
  </>;
}
