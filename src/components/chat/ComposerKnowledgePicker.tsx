import { useEffect, useState } from 'react';
import { Button, Empty, Input, Modal, Tabs, Tag, Tooltip } from 'antd';
import { BookOpen, Check, ChevronDown, Search } from 'lucide-react';
import { files, libraries, librariesInScope, scopes, type KScope } from '@/components/knowledge/mock';
import './composer-knowledge.css';

type PickerScope = Exclude<KScope, 'public'> | 'all';
const pickerLibraries = libraries.filter(library => library.scope !== 'public');
const pickerScopes = scopes.filter(scope => scope.key !== 'public');

/** 当前页面内按对话保留选择，仅演示知识范围选择，不接入真实检索。 */
export default function ComposerKnowledgePicker({ conversationId, disabled, compact = false }: { conversationId: string; disabled: boolean; compact?: boolean }) {
  const [selectedByConversation, setSelectedByConversation] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<PickerScope>('all');
  const selectedId = selectedByConversation[conversationId] ?? null;
  const selected = pickerLibraries.find(library => library.id === selectedId);
  useEffect(() => { setOpen(false); setQuery(''); }, [conversationId]);
  const matches = librariesInScope(pickerLibraries, scope).filter(library => !query.trim() || `${library.name}${library.category}${library.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const emptyDescription = query.trim() ? '未找到匹配的知识库' : scope === 'unit' ? '单位知识库暂无资料' : '暂无可选知识库';
  const select = (id: string | null) => {
    setSelectedByConversation(previous => ({ ...previous, [conversationId]: id }));
    setOpen(false);
  };
  return <>
    <Tooltip title={selected?.name ?? '选择知识库'}>
      <button type="button" className={`axn-composer-knowledge${selected ? ' is-selected' : ''}`} disabled={disabled}
        aria-label="选择知识库" aria-description={selected?.name ?? '未选择知识库'} aria-haspopup="dialog" data-testid="composer-knowledge-picker"
        onClick={() => { setQuery(''); setScope('all'); setOpen(true); }}>
        <BookOpen size={14} aria-hidden /><span>{compact ? '知识库' : selected?.name ?? '知识库'}</span><ChevronDown size={12} aria-hidden />
      </button>
    </Tooltip>
    <Modal title="选择知识库" centered open={open} onCancel={() => setOpen(false)} width={640}
      footer={<div className="axn-knowledge-picker-footer"><Button disabled={!selected} onClick={() => select(null)}>清除选择</Button><Button onClick={() => setOpen(false)}>取消</Button></div>}>
      <p className="axn-knowledge-picker-intro">选择当前对话使用的知识库。</p>
      <Input allowClear aria-label="搜索对话知识库" prefix={<Search size={16} />} placeholder="搜索知识库名称或分类" value={query} onChange={event => setQuery(event.target.value)} />
      <Tabs activeKey={scope} onChange={key => setScope(key as PickerScope)} items={[{ key: 'all', label: '全部' }, ...pickerScopes]} />
      <div className="axn-knowledge-picker-list" role="listbox" aria-label="可选知识库">
        {matches.map(library => <button key={library.id} type="button" role="option" aria-selected={library.id === selectedId} disabled={!library.enabled}
          className={`axn-knowledge-picker-option${library.id === selectedId ? ' is-selected' : ''}`} onClick={() => select(library.id)}>
          <span className="axn-knowledge-picker-icon"><BookOpen size={18} aria-hidden /></span>
          <span className="axn-knowledge-picker-copy"><span className="axn-knowledge-picker-title">{!library.enabled && <Tag>已禁用</Tag>}<strong>{library.name}</strong></span><span>{library.category} · {files.filter(file => file.libraryId === library.id).length} 份文件</span><span>{library.description}</span></span>
          {library.id === selectedId && <Check size={18} className="axn-knowledge-picker-check" aria-hidden />}
        </button>)}
        {!matches.length && <Empty description={emptyDescription} />}
      </div>
    </Modal>
  </>;
}
