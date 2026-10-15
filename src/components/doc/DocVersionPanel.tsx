/**
 * 版本记录侧栏：最新在上；每条给出作者 / 角色 / 时间、自动变化摘要（改了几处、在哪、增删字数）与选填说明。
 * 点一条 = 看这一版相对上一版改了什么（在纸面上标出）；最新版可补写修改说明、可标记定稿。
 */
import { useState } from 'react';
import { Button, Input, Tag } from 'antd';
import { BadgeCheck, PencilLine, Sparkles, X } from 'lucide-react';
import type { DocVersion, VersionAuthor } from '@/store/mockDocumentStore';

export type VersionTarget = number | 'working';

export function authorText(author: VersionAuthor): string {
  if (author.kind === 'ai') return '安小能';
  if (author.kind === 'sample') return '文书库样稿';
  return author.role && author.role !== author.name ? `${author.name} · ${author.role}` : author.name;
}

export function versionTime(iso?: string, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === now.toDateString() ? `今天 ${hm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

function originText(v: DocVersion): string | null {
  if (v.source === 'generated') return '安小能生成的初稿';
  if (v.source === 'sample') return '初始版本';
  if (v.source === 'autosave') return '自动保存';
  if (v.source === 'restore' && v.restoredFrom) return `恢复自 V${v.restoredFrom}`;
  return null;
}

function Delta({ added, removed }: { added: number; removed: number }) {
  return <span className="doc-ver-delta">
    {added > 0 && <span className="is-add">+{added}</span>}
    {removed > 0 && <span className="is-del">−{removed}</span>}
  </span>;
}

export default function DocVersionPanel({ versions, working, selected, onSelect, onSetNote, onToggleFinal, onClose }: {
  versions: DocVersion[];
  /** 有未保存修改时，相对最新版的变化 */
  working: { summary: string; added: number; removed: number } | null;
  selected: VersionTarget | null;
  onSelect: (target: VersionTarget) => void;
  onSetNote: (no: number, note: string) => void;
  onToggleFinal: (no: number) => void;
  onClose: () => void;
}) {
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const latest = versions[versions.length - 1];
  const list = [...versions].reverse();

  const commitNote = (no: number) => { onSetNote(no, draft); setEditingNote(null); };

  return <aside className="doc-ver-panel" aria-label="版本记录" data-testid="doc-version-panel">
    <header className="doc-ver-head">
      <div>
        <h3>版本记录</h3>
        <p>共 {versions.length} 个版本 · 点击查看与上一版的变化</p>
      </div>
      <Button type="text" size="small" aria-label="关闭版本记录" icon={<X size={16} />} onClick={onClose} />
    </header>
    <ol className="doc-ver-list">
      {working && <li className={`doc-ver-item is-working${selected === 'working' ? ' is-selected' : ''}`}>
        <button type="button" className="doc-ver-main" onClick={() => onSelect('working')} aria-pressed={selected === 'working'}>
          <span className="doc-ver-dot" aria-hidden />
          <span className="doc-ver-line1"><strong>当前编辑</strong><Tag className="doc-ver-tag is-warn">未保存</Tag></span>
          <span className="doc-ver-summary">{working.summary}</span>
          <Delta added={working.added} removed={working.removed} />
        </button>
      </li>}
      {list.map((v) => {
        const isLatest = v.no === latest.no;
        const isSelected = selected === v.no;
        const origin = originText(v);
        return <li key={v.no} className={`doc-ver-item${isSelected ? ' is-selected' : ''}${isLatest ? ' is-latest' : ''}`}>
          <button type="button" className="doc-ver-main" onClick={() => onSelect(v.no)} aria-pressed={isSelected} aria-label={`查看 V${v.no}`}>
            <span className="doc-ver-dot" aria-hidden />
            <span className="doc-ver-line1">
              <strong>V{v.no}</strong>
              {isLatest && <Tag className="doc-ver-tag">当前版本</Tag>}
              {v.final && <Tag className="doc-ver-tag is-final" icon={<BadgeCheck size={12} />}>定稿</Tag>}
              <time>{versionTime(v.at)}</time>
            </span>
            <span className="doc-ver-author">
              {v.author.kind === 'ai' && <Sparkles size={12} aria-hidden />}
              {authorText(v.author)}{origin && <> · {origin}</>}
            </span>
            {v.stats && <span className="doc-ver-summary">{v.stats.summary}</span>}
            {v.stats && <Delta added={v.stats.added} removed={v.stats.removed} />}
            {v.note && editingNote !== v.no && <span className="doc-ver-note">{v.note}</span>}
          </button>
          {editingNote === v.no ? <div className="doc-ver-note-edit">
            <Input.TextArea
              autoFocus
              autoSize={{ minRows: 2, maxRows: 4 }}
              maxLength={80}
              value={draft}
              placeholder="例如：按指挥长意见补充伤亡数据"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNote(v.no); }
                if (e.key === 'Escape') setEditingNote(null);
              }}
            />
            <div className="doc-ver-note-actions">
              <Button size="small" type="text" onClick={() => setEditingNote(null)}>取消</Button>
              <Button size="small" type="primary" onClick={() => commitNote(v.no)}>保存说明</Button>
            </div>
          </div> : (isSelected || isLatest) && <div className="doc-ver-actions">
            {v.no > 1 || v.source !== 'sample' ? <Button size="small" type="text" icon={<PencilLine size={14} />} onClick={() => { setDraft(v.note ?? ''); setEditingNote(v.no); }}>
              {v.note ? '编辑说明' : '添加修改说明'}
            </Button> : null}
            <Button size="small" type="text" icon={<BadgeCheck size={14} />} onClick={() => onToggleFinal(v.no)}>
              {v.final ? '取消定稿' : '标记定稿'}
            </Button>
          </div>}
        </li>;
      })}
    </ol>
  </aside>;
}
