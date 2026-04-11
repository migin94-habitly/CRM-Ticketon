import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Check, GripVertical } from 'lucide-react';
import { pipelinesAPI } from '../../api';
import type { Pipeline, PipelineStage } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  pipeline: Pipeline;
  allPipelines: Pipeline[];
  onClose: () => void;
  onSaved: (updated: Pipeline) => void;
  onDeleted: () => void;
  onPipelineCreated: () => void;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#64748b', '#1e293b',
];

interface StageRow extends Partial<PipelineStage> {
  _key: string;
  _new: boolean;
  _deleted: boolean;
}

let tmpCounter = 0;
function tmpKey() { return `_new_${++tmpCounter}`; }

export default function ConfigureModal({
  pipeline, allPipelines, onClose, onSaved, onDeleted, onPipelineCreated,
}: Props) {
  const [name, setName] = useState(pipeline.name);
  const [isDefault, setIsDefault] = useState(pipeline.is_default);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [colorPickerKey, setColorPickerKey] = useState<string | null>(null);

  useEffect(() => {
    setName(pipeline.name);
    setIsDefault(pipeline.is_default);
    setStages(
      (pipeline.stages ?? []).map(s => ({
        ...s,
        _key: s.id,
        _new: false,
        _deleted: false,
      }))
    );
  }, [pipeline]);

  const visibleStages = stages.filter(s => !s._deleted);

  const updateStage = (key: string, patch: Partial<StageRow>) => {
    setStages(prev => prev.map(s => s._key === key ? { ...s, ...patch } : s));
  };

  const addStage = () => {
    setStages(prev => [...prev, {
      _key: tmpKey(),
      _new: true,
      _deleted: false,
      name: 'Новая стадия',
      color: '#6366f1',
      probability: 20,
      is_won: false,
      is_lost: false,
      position: prev.filter(s => !s._deleted).length,
    }]);
  };

  const moveStage = (key: string, dir: -1 | 1) => {
    const vis = stages.filter(s => !s._deleted);
    const idx = vis.findIndex(s => s._key === key);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= vis.length) return;

    const reordered = [...vis];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];

    setStages([
      ...reordered.map((s, i) => ({ ...s, position: i })),
      ...stages.filter(s => s._deleted),
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Введите название воронки'); return; }
    setSaving(true);
    try {
      await pipelinesAPI.update(pipeline.id, {
        name: name.trim(),
        is_default: isDefault,
      } as Partial<Pipeline>);

      const deleted = stages.filter(s => s._deleted && !s._new);
      for (const s of deleted) {
        await pipelinesAPI.deleteStage(pipeline.id, s.id!);
      }

      const active = stages.filter(s => !s._deleted);
      for (let i = 0; i < active.length; i++) {
        const s = active[i];
        const payload = {
          name: s.name || 'Stage',
          color: s.color || '#6366f1',
          position: i,
          probability: s.probability ?? 20,
          is_won: s.is_won ?? false,
          is_lost: s.is_lost ?? false,
        };
        if (s._new) {
          await pipelinesAPI.addStage(pipeline.id, payload);
        } else {
          await pipelinesAPI.updateStage(pipeline.id, s.id!, payload);
        }
      }

      const updated = await pipelinesAPI.get(pipeline.id);
      const fresh = updated.data.data as Pipeline;
      toast.success('Воронка сохранена');
      onSaved(fresh);
    } catch {
      toast.error('Ошибка сохранения воронки');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (allPipelines.length <= 1) {
      toast.error('Нельзя удалить единственную воронку');
      return;
    }
    setDeleting(true);
    try {
      await pipelinesAPI.delete(pipeline.id);
      toast.success('Воронка удалена');
      onDeleted();
    } catch {
      toast.error('Ошибка удаления воронки');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) { toast.error('Введите название'); return; }
    try {
      await pipelinesAPI.create({ name: newPipelineName.trim(), is_default: false } as Partial<Pipeline>);
      toast.success('Воронка создана');
      setShowNewPipeline(false);
      setNewPipelineName('');
      onPipelineCreated();
    } catch {
      toast.error('Ошибка создания воронки');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative h-full w-full max-w-md bg-dark-800 border-l border-slate-700 flex flex-col shadow-2xl animate-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white">Настройка воронки</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Воронка</h3>
            <div>
              <label className="label">Название</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Название воронки"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setIsDefault(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${isDefault ? 'bg-primary-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isDefault ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
              <span className="text-sm text-slate-300">Воронка по умолчанию</span>
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Стадии</h3>
              <button onClick={addStage} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition">
                <Plus className="w-3.5 h-3.5" /> Добавить стадию
              </button>
            </div>

            <div className="space-y-2">
              {visibleStages.map((s, idx) => (
                <div key={s._key} className="bg-dark-900 border border-slate-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-slate-600 shrink-0" />

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setColorPickerKey(colorPickerKey === s._key ? null : s._key)}
                        className="w-5 h-5 rounded-full border-2 border-slate-600 shrink-0 hover:border-white transition"
                        style={{ background: s.color || '#6366f1' }}
                      />
                      {colorPickerKey === s._key && (
                        <div className="absolute left-0 top-7 z-10 bg-dark-800 border border-slate-700 rounded-lg p-2 grid grid-cols-6 gap-1.5 shadow-xl">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => { updateStage(s._key, { color: c }); setColorPickerKey(null); }}
                              className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                              style={{ background: c }}
                            >
                              {s.color === c && <Check className="w-3 h-3 text-white m-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      className="input py-1 text-sm flex-1"
                      value={s.name || ''}
                      onChange={e => updateStage(s._key, { name: e.target.value })}
                      placeholder="Название стадии"
                    />

                    <button
                      type="button"
                      onClick={() => moveStage(s._key, -1)}
                      disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-30 transition"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(s._key, 1)}
                      disabled={idx === visibleStages.length - 1}
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-30 transition"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStage(s._key, { _deleted: true })}
                      className="p-1 text-slate-600 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 pl-7">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Win %</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="input py-0.5 px-2 text-xs w-16"
                        value={s.probability ?? 20}
                        onChange={e => updateStage(s._key, { probability: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => updateStage(s._key, { is_won: !s.is_won, is_lost: false })}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition border ${
                        s.is_won
                          ? 'bg-green-500/20 text-green-400 border-green-500/40'
                          : 'bg-slate-700/50 text-slate-500 border-slate-600 hover:border-green-500/40 hover:text-green-400'
                      }`}
                    >
                      ВЫИГРАН
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStage(s._key, { is_lost: !s.is_lost, is_won: false })}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition border ${
                        s.is_lost
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : 'bg-slate-700/50 text-slate-500 border-slate-600 hover:border-red-500/40 hover:text-red-400'
                      }`}
                    >
                      ПРОИГРАН
                    </button>
                  </div>
                </div>
              ))}

              {visibleStages.length === 0 && (
                <div className="text-center text-slate-600 text-sm py-4 border-2 border-dashed border-slate-700 rounded-lg">
                  Стадий нет — нажмите «Добавить стадию»
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Другие воронки</h3>
            {!showNewPipeline ? (
              <button
                type="button"
                onClick={() => setShowNewPipeline(true)}
                className="btn-secondary text-sm w-full justify-center"
              >
                <Plus className="w-4 h-4" /> Новая воронка
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input text-sm flex-1"
                  placeholder="Название воронки"
                  value={newPipelineName}
                  onChange={e => setNewPipelineName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreatePipeline()}
                  autoFocus
                />
                <button type="button" onClick={handleCreatePipeline} className="btn-primary text-sm px-3">
                  Создать
                </button>
                <button type="button" onClick={() => setShowNewPipeline(false)} className="btn-secondary text-sm px-3">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {allPipelines.map(p => (
                <div key={p.id} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                  p.id === pipeline.id ? 'bg-primary-500/10 text-primary-300' : 'text-slate-400'
                }`}>
                  <span className="truncate">{p.name}</span>
                  {p.is_default && <span className="text-[10px] text-slate-500 ml-2 shrink-0">осн.</span>}
                  {p.id === pipeline.id && <span className="text-[10px] text-primary-400 ml-2 shrink-0">редактируется</span>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-700 px-5 py-4 flex items-center justify-between gap-3">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={allPipelines.length <= 1}
              className="btn-danger text-sm py-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Удалить
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Уверены?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger text-xs py-1 px-2">
                {deleting ? '...' : 'Да'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary text-xs py-1 px-2">
                Нет
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm py-1.5">
              Отмена
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-sm py-1.5">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
