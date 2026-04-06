import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Briefcase, MessageSquare, Edit } from 'lucide-react';
import { contactsAPI } from '../api';
import type { Contact, Activity, CallRecord } from '../types';
import { formatDate, formatDateTime, statusColor, initials } from '../utils/format';
import ContactModal from '../components/contacts/ContactModal';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [tab, setTab] = useState<'activities' | 'calls' | 'messages'>('activities');
  const [editOpen, setEditOpen] = useState(false);

  const load = () => {
    if (!id) return;
    contactsAPI.get(id).then(r => setContact(r.data.data || null));
    contactsAPI.activities(id).then(r => setActivities(r.data.data || []));
    contactsAPI.calls(id).then(r => setCalls(r.data.data || []));
  };

  useEffect(() => { load(); }, [id]);

  if (!contact) return <div className="text-slate-500 animate-pulse">Loading...</div>;

  return (
    <div className="space-y-4 animate-in max-w-4xl">
      {/* Back + header */}
      <button onClick={() => navigate('/contacts')} className="flex items-center gap-1 text-slate-500 hover:text-white text-sm transition mb-2">
        <ArrowLeft className="w-4 h-4" /> Contacts
      </button>

      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary-700 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0">
            {initials(contact.first_name, contact.last_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{contact.first_name} {contact.last_name}</h1>
              <span className={`badge ${statusColor(contact.status)}`}>{contact.status}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
              {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-white"><Mail className="w-3.5 h-3.5" />{contact.email}</a>}
              {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-white"><Phone className="w-3.5 h-3.5" />{contact.phone}</a>}
              {contact.company && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{contact.company}{contact.position && ` · ${contact.position}`}</span>}
            </div>
            {contact.source && <div className="text-xs text-slate-600 mt-1">Source: {contact.source}</div>}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs py-1.5" onClick={() => setEditOpen(true)}>
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
            {contact.phone && (
              <button className="btn-primary text-xs py-1.5">
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            )}
          </div>
        </div>
        {contact.notes && (
          <div className="mt-4 p-3 bg-dark-900 rounded-lg text-sm text-slate-400">{contact.notes}</div>
        )}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3">
            {contact.tags.map(tag => (
              <span key={tag} className="badge bg-primary-500/10 text-primary-400">{tag}</span>
            ))}
          </div>
        )}
        <div className="text-xs text-slate-600 mt-3">Added {formatDate(contact.created_at)}</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {(['activities', 'calls', 'messages'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-primary-400 border-primary-500' : 'text-slate-500 border-transparent hover:text-white'
            }`}
          >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'activities' && (
        <div className="space-y-2">
          {activities.length === 0 ? (
            <div className="text-slate-500 text-sm py-6 text-center">No activities yet</div>
          ) : activities.map(a => (
            <div key={a.id} className="card p-3 flex items-start gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                a.type === 'call' ? 'bg-green-500/10 text-green-400' :
                a.type === 'email' ? 'bg-blue-500/10 text-blue-400' :
                'bg-purple-500/10 text-purple-400'
              }`}>
                {a.type === 'call' ? <Phone className="w-3.5 h-3.5" /> :
                 a.type === 'email' ? <Mail className="w-3.5 h-3.5" /> :
                 <MessageSquare className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-200">{a.subject}</div>
                {a.description && <div className="text-xs text-slate-500 mt-0.5">{a.description}</div>}
              </div>
              <div className="text-xs text-slate-600">{formatDateTime(a.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'calls' && (
        <div className="space-y-2">
          {calls.length === 0 ? (
            <div className="text-slate-500 text-sm py-6 text-center">No call records</div>
          ) : calls.map(c => (
            <div key={c.id} className="card p-3 flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                c.direction === 'inbound' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
              }`}>
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-200">{c.direction === 'inbound' ? c.from_number : c.to_number}</div>
                <div className="text-xs text-slate-500">{c.direction} · {c.status}</div>
              </div>
              <div className="text-xs text-slate-400">{c.duration}s</div>
              <div className="text-xs text-slate-600">{formatDateTime(c.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'messages' && (
        <div className="text-slate-500 text-sm py-6 text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          WhatsApp messages will appear here
        </div>
      )}

      {editOpen && (
        <ContactModal
          contact={contact}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      )}
    </div>
  );
}
