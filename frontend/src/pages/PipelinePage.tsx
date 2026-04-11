import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, Phone, Settings } from 'lucide-react';
import { pipelinesAPI, dealsAPI } from '../api';
import type { Pipeline, Deal } from '../types';
import { formatCurrency, initials } from '../utils/format';
import DealModal from '../components/deals/DealModal';
import ConfigureModal from '../components/pipeline/ConfigureModal';
import toast from 'react-hot-toast';

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [showConfigure, setShowConfigure] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPipelines = async () => {
    setLoading(true);
    try {
      const r = await pipelinesAPI.list();
      const all = r.data.data || [];
      setPipelines(all);
      const def = all.find(p => p.is_default) || all[0];
      if (def) {
        setSelectedPipeline(def);
      } else {
        setSelectedPipeline(null);
        setLoading(false);
      }
    } catch {
      toast.error('Ошибка загрузки воронок');
      setSelectedPipeline(null);
      setLoading(false);
    }
  };

  const loadDeals = async (pipeline: Pipeline) => {
    setLoading(true);
    try {
      const r = await dealsAPI.list({ pipeline_id: pipeline.id, limit: 100 });
      const deals = r.data.data || [];
      const grouped: Record<string, Deal[]> = {};
      const stages = pipeline.stages ?? [];
      for (const stage of stages) grouped[stage.id] = [];
      for (const deal of deals) {
        if (grouped[deal.stage_id]) grouped[deal.stage_id].push(deal);
        else grouped[deal.stage_id] = [deal];
      }
      setDealsByStage(grouped);
    } catch {
      toast.error('Ошибка загрузки сделок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPipelines(); }, []);
  useEffect(() => { if (selectedPipeline) loadDeals(selectedPipeline); }, [selectedPipeline]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedPipeline) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setDealsByStage(prev => {
      const next = { ...prev };
      const srcDeals = [...(next[source.droppableId] || [])];
      const destDeals = source.droppableId === destination.droppableId
        ? srcDeals : [...(next[destination.droppableId] || [])];

      const [moved] = srcDeals.splice(source.index, 1);
      if (source.droppableId === destination.droppableId) {
        srcDeals.splice(destination.index, 0, moved);
        next[source.droppableId] = srcDeals;
      } else {
        moved.stage_id = destination.droppableId;
        destDeals.splice(destination.index, 0, moved);
        next[source.droppableId] = srcDeals;
        next[destination.droppableId] = destDeals;
      }
      return next;
    });

    try {
      await dealsAPI.move(draggableId, destination.droppableId);
    } catch {
      toast.error('Ошибка перемещения сделки');
      loadDeals(selectedPipeline);
    }
  };

  const stageTotal = (stageId: string) =>
    (dealsByStage[stageId] || []).reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4 animate-in">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Воронка</h1>
          <p className="text-slate-500 text-sm">Канбан-доска</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="input py-1.5 text-sm w-44"
            value={selectedPipeline?.id || ''}
            onChange={e => {
              const p = pipelines.find(p => p.id === e.target.value);
              if (p) setSelectedPipeline(p);
            }}
          >
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            className="btn-secondary text-sm py-1.5"
            onClick={() => setShowConfigure(true)}
            disabled={!selectedPipeline}
          >
            <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Настроить</span>
          </button>
          <button className="btn-primary text-sm py-1.5" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Добавить сделку
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500 text-center py-20">Загрузка воронки...</div>
      ) : !selectedPipeline ? (
        <div className="text-slate-500 text-center py-20">Воронок нет. Создайте в Настройках.</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container pb-4">
            {(selectedPipeline.stages ?? []).map(stage => {
              const deals = dealsByStage[stage.id] || [];
              const total = stageTotal(stage.id);
              return (
                <div key={stage.id} className="kanban-column shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                      <span className="text-sm font-semibold text-slate-200">{stage.name}</span>
                      <span className="badge bg-dark-700 text-slate-400">{deals.length}</span>
                    </div>
                    <span className="text-xs text-slate-500">{formatCurrency(total)}</span>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-16 space-y-2 rounded-xl p-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-dark-700/50' : ''
                        }`}
                      >
                        {deals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`card p-3 cursor-grab active:cursor-grabbing transition-all ${
                                  snapshot.isDragging ? 'ring-2 ring-primary-500 rotate-1 shadow-lg' : 'hover:border-slate-600'
                                }`}
                              >
                                <div className="text-sm font-medium text-slate-200 mb-2 line-clamp-2">{deal.title}</div>
                                {deal.contact && (
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <div className="w-5 h-5 bg-primary-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                      {initials(deal.contact.first_name, deal.contact.last_name)}
                                    </div>
                                    <span className="text-xs text-slate-400 truncate">
                                      {deal.contact.first_name} {deal.contact.last_name}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <div className="text-green-400 text-xs font-semibold">
                                    {formatCurrency(deal.value, deal.currency)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={`badge text-[10px] py-0 ${
                                      deal.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                      deal.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                      'bg-slate-500/10 text-slate-400'
                                    }`}>{deal.priority === 'high' ? 'Высокий' : deal.priority === 'medium' ? 'Средний' : 'Низкий'}</span>
                                  </div>
                                </div>
                                {deal.contact?.phone && (
                                  <button
                                    onClick={e => { e.stopPropagation(); }}
                                    className="mt-2 flex items-center gap-1 text-[10px] text-slate-600 hover:text-green-400 transition"
                                  >
                                    <Phone className="w-3 h-3" /> {deal.contact.phone}
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {deals.length === 0 && !snapshot.isDraggingOver && (
                          <div className="border-2 border-dashed border-slate-700/50 rounded-xl p-4 text-center text-xs text-slate-600">
                            Перетащите сюда
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {showModal && (
        <DealModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); if (selectedPipeline) loadDeals(selectedPipeline); }}
        />
      )}

      {showConfigure && selectedPipeline && (
        <ConfigureModal
          pipeline={selectedPipeline}
          allPipelines={pipelines}
          onClose={() => setShowConfigure(false)}
          onSaved={(updated) => {
            setPipelines(prev => prev.map(p => p.id === updated.id ? updated : p));
            setSelectedPipeline(updated);
            setShowConfigure(false);
            loadDeals(updated);
          }}
          onDeleted={() => {
            setShowConfigure(false);
            loadPipelines();
          }}
          onPipelineCreated={() => {
            loadPipelines();
          }}
        />
      )}
    </div>
  );
}
