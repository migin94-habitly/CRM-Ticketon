import { useEffect, useState } from 'react';
import { Plus, Phone, Mail, Calendar, FileText, ListTodo, MessageSquare } from 'lucide-react';
import { activitiesAPI } from '../api';
import type { Activity, ActivityType } from '../types';
import { formatDateTime } from '../utils/format';
import toast from 'react-hot-toast';

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  meeting: <Calendar className="w-3.5 h-3.5" />,
  note: <FileText className="w-3.5 h-3.5" />,
  task: <ListTodo className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5" />,
};

const typeColors: Record<string, string> = {
  call: 'bg-green-500/10 text-green-400',
  email: 'bg-blue-500/10 text-blue-400',
  meeting: 'bg-purple-500/10 text-purple-400',
  note: 'bg-yellow-500/10 text-yellow-400',
  task: 'bg-orange-500/10 text-orange-400',
  whatsapp: 'bg-emerald-500/10 text-emerald-400',
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ type: ActivityType; subject: string; description: string; due_date: string }>({ type: "call", subject: "", description: "", due_date: "" });

  const load = () => {
    setLoading(true);
    activitiesAPI.list()
      .then(r => setActivities(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await activitiesAPI.create(form);
      toast.success('Activity created');
      setShowForm(false);
      setForm({ type: 'call', subject: '', description: '', due_date: '' });
      load();
    } catch {
      toast.error('Failed to create activity');
    }
  };

  const handleComplete = async (id: string) => {
    await activitiesAPI.update(id, { status: 'completed' });
    toast.success('Marked complete');
    load();
  };

  return (
    <div className="space-y-4 animate-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Activities</h1>
          <p className="text-slate-500 text-sm">{activities.length} activities</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Activity
        </button>
      </div>

      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4">New Activity</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ActivityType }))}>
                  {Object.keys(typeIcons).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input className="input" type="datetime-local" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Subject *</label>
              <input className="input" required value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : activities.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-20" />
          No activities yet
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(a => (
            <div key={a.id} className={`card p-4 flex items-start gap-3 ${a.status === 'completed' ? 'opacity-50' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[a.type] || 'bg-slate-500/10 text-slate-400'}`}>
                {typeIcons[a.type]}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-200">{a.subject}</div>
                {a.description && <div className="text-xs text-slate-500 mt-0.5">{a.description}</div>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`badge text-xs ${a.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {a.status}
                  </span>
                  {a.due_date && <span className="text-xs text-slate-500">{formatDateTime(a.due_date)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs text-slate-600">{formatDateTime(a.created_at)}</div>
                {a.status === 'pending' && (
                  <button onClick={() => handleComplete(a.id)}
                    className="text-xs text-slate-500 hover:text-green-400 px-2 py-1 rounded hover:bg-dark-700 transition">
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
