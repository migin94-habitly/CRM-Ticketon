import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { X } from 'lucide-react';
import { dealsAPI, pipelinesAPI, contactsAPI } from '../../api';
import type { Deal, Pipeline, Contact, PipelineStage } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  deal?: Deal | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function DealModal({ deal, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset, control, setValue } = useForm<Partial<Deal>>();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const pipelineId = useWatch({ control, name: 'pipeline_id' }) as string | undefined;
  const prevPipelineId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!pipelineId) {
      setStages([]);
      return;
    }
    const fromList = pipelines.find((p) => p.id === pipelineId);
    const embedded = fromList?.stages;
    if (embedded && embedded.length > 0) {
      setStages(embedded);
      return;
    }
    let cancelled = false;
    pipelinesAPI
      .get(pipelineId)
      .then((r) => {
        if (cancelled) return;
        const p = r.data.data as Pipeline | undefined;
        setStages(p?.stages ?? []);
      })
      .catch(() => {
        if (!cancelled) setStages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId, pipelines]);

  useEffect(() => {
    if (!pipelineId) {
      prevPipelineId.current = undefined;
      return;
    }
    if (prevPipelineId.current !== undefined && prevPipelineId.current !== pipelineId) {
      setValue('stage_id', '');
    }
    prevPipelineId.current = pipelineId;
  }, [pipelineId, setValue]);

  useEffect(() => {
    reset(deal || { currency: 'USD', priority: 'medium' });
    pipelinesAPI.list()
      .then((r) => setPipelines(r.data.data || []))
      .catch(() => {
        toast.error('Failed to load pipelines');
        setPipelines([]);
      });
    contactsAPI
      .list({ limit: 100 })
      .then((r) => setContacts(r.data.data || []))
      .catch(() => {
        toast.error('Failed to load contacts');
        setContacts([]);
      });
  }, [deal, reset]);

  const normalizeDealPayload = (data: Partial<Deal>): Partial<Deal> => {
    const out = { ...data };
    {
      const v = data.value as unknown;
      let num = 0;
      if (typeof v === 'number' && Number.isFinite(v)) num = v;
      else if (typeof v === 'string' && v.trim() !== '') {
        const p = parseFloat(v.replace(/,/g, ''));
        num = Number.isFinite(p) ? p : 0;
      }
      out.value = num;
    }
    if (out.close_date && typeof out.close_date === 'string') {
      const d = out.close_date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        out.close_date = `${d}T00:00:00.000Z`;
      }
    }
    return out;
  };

  const onSubmit = async (data: Partial<Deal>) => {
    const payload = normalizeDealPayload(data);
    try {
      if (deal?.id) {
        await dealsAPI.update(deal.id, payload);
        toast.success('Deal updated');
      } else {
        await dealsAPI.create(payload);
        toast.success('Deal created');
      }
      onSaved();
    } catch {
      toast.error('Failed to save deal');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="font-semibold text-white">{deal ? 'Edit Deal' : 'New Deal'}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Deal Title *</label>
            <input className="input" {...register('title', { required: true })} placeholder="e.g. Enterprise License Deal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value</label>
              <input className="input" type="number" step="0.01" {...register('value', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" {...register('currency')}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="RUB">RUB</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Pipeline *</label>
              <select className="input" {...register('pipeline_id', { required: true })}>
                <option value="">Select pipeline</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Stage *</label>
              <select className="input" {...register('stage_id', { required: true })}>
                <option value="">Select stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact</label>
              <select className="input" {...register('contact_id')}>
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Close Date</label>
            <input className="input" type="date" {...register('close_date')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
