import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Check, Pencil, X } from 'lucide-react';
import { checklistAPI } from '../../api';
import type { ChecklistItem } from '../../types';

interface Props {
  dealId: string;
}

export default function DealChecklist({ dealId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    checklistAPI.list(dealId)
      .then(r => setItems((r.data.data as ChecklistItem[]) || []));
  };

  useEffect(() => { load(); }, [dealId]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const r = await checklistAPI.create(dealId, newText.trim());
    const item = r.data.data as ChecklistItem;
    setItems(prev => [...prev, item]);
    setNewText('');
    setAdding(false);
  };

  const handleToggle = async (item: ChecklistItem) => {
    const r = await checklistAPI.toggle(dealId, item.id);
    const updated = r.data.data as ChecklistItem;
    setItems(prev => prev.map(i => i.id === item.id ? updated : i));
  };

  const handleDelete = async (id: string) => {
    await checklistAPI.delete(dealId, id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleEditSave = async (id: string) => {
    if (!editText.trim()) return;
    await checklistAPI.update(dealId, id, editText.trim());
    setItems(prev => prev.map(i => i.id === id ? { ...i, text: editText.trim() } : i));
    setEditingId(null);
  };

  const done = items.filter(i => i.is_done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white">Чеклист</h3>
          {total > 0 && (
            <span className="text-xs text-slate-500">{done}/{total}</span>
          )}
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Добавить шаг
        </button>
      </div>

      {total > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? '#10b981' : '#6366f1',
              }}
            />
          </div>
          {progress === 100 && (
            <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Все шаги выполнены!
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            className="group flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-dark-700/40 transition"
          >
            <button
              onClick={() => handleToggle(item)}
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                item.is_done
                  ? 'bg-green-500 border-green-500'
                  : 'border-slate-600 hover:border-primary-400'
              }`}
            >
              {item.is_done && <Check className="w-2.5 h-2.5 text-white" />}
            </button>

            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  className="input py-0.5 text-sm flex-1"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave(item.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
                <button onClick={() => handleEditSave(item.id)} className="text-green-400 hover:text-green-300">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <span className={`flex-1 text-sm leading-relaxed ${
                  item.is_done ? 'line-through text-slate-500' : 'text-slate-200'
                }`}>
                  {item.text}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1 text-slate-500 hover:text-white transition"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {adding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
            <div className="w-4 h-4 rounded border border-slate-700 shrink-0" />
            <input
              ref={inputRef}
              className="input py-1 text-sm flex-1"
              placeholder="Название шага..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setAdding(false)}
            />
            <button type="submit" className="btn-primary text-xs py-1 px-3">
              Добавить
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewText(''); }}
              className="text-slate-500 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : items.length === 0 ? (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-4 border-2 border-dashed border-slate-700 rounded-lg text-xs text-slate-600 hover:text-slate-400 hover:border-slate-600 transition"
          >
            + Добавить первый шаг
          </button>
        ) : null}
      </div>
    </div>
  );
}
