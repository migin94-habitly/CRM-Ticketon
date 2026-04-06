import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { dealsAPI, pipelinesAPI, contactsAPI } from '../../api';
import type { Deal, Pipeline, Contact } from '../../types';
import toast from 'react-hot-toast';

interface Props {
  deal?: Deal | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function DealModal({ deal, onClose, onSaved }: Props) {
  const { register, handleSubmit, reset, watch } = useForm<Partial<Deal>>();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const selectedPipeline = watch('pipeline_id');
  const stages = pipelines.find(p => p.id === selectedPipeline)?.stages || [];

  useEffect(() => {
    reset(deal || { currency: 'USD', priority: 'medium' });
    pipelinesAPI.list().then(r => setPipelines(r.data.data || []));
    contactsAPI.list({ limit: 100 }).then(r => setContacts(r.data.data || []));
  }, [deal, reset]);

  const onSubmit = async (data: Partial<Deal>) => {
    try {
      if (deal?.id) {
        await dealsAPI.update(deal.id, data);
        toast.success('Deal updated');
      } else {
        await dealsAPI.create(data);
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
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Deal Title *</label>
            <input className="input" {...register('title', { required: true })} placeholder="e.g. Enterprise License Deal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value</label>
              <input className="input" type="number" step="0.01" {...register('value')} />
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
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stage *</label>
              <select className="input" {...register('stage_id', { required: true })}>
                <option value="">Select stage</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact</label>
              <select className="input" {...register('contact_id')}>
                <option value="">None</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
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
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Deal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
