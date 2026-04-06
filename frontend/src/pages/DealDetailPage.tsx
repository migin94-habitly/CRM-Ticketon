import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Phone, Edit, Zap } from 'lucide-react';
import { dealsAPI, analyticsAPI } from '../api';
import type { Deal, AIScore } from '../types';
import { formatCurrency, formatDate, priorityColor } from '../utils/format';
import DealModal from '../components/deals/DealModal';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [aiScore, setAiScore] = useState<AIScore | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const load = () => {
    if (!id) return;
    dealsAPI.get(id).then(r => setDeal(r.data.data || null));
  };

  const analyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    analyticsAPI.analyzeDeal(id)
      .then(r => {
        const data = r.data.data as AIScore;
        setAiScore(data);
      })
      .finally(() => setAnalyzing(false));
  };

  useEffect(() => { load(); }, [id]);

  if (!deal) return <div className="text-slate-500 animate-pulse">Loading...</div>;

  const score = aiScore || deal.ai_score;
  const scoreOffset = score ? 100 - score.score : 100;

  return (
    <div className="space-y-4 animate-in max-w-4xl">
      <button onClick={() => navigate('/deals')} className="flex items-center gap-1 text-slate-500 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Deals
      </button>

      <div className="grid grid-cols-3 gap-4">
        {/* Main info */}
        <div className="card p-5 col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{deal.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                {deal.stage && (
                  <span className="badge" style={{ background: `${deal.stage.color}20`, color: deal.stage.color }}>
                    {deal.stage.name}
                  </span>
                )}
                <span className={`badge ${priorityColor(deal.priority)}`}>{deal.priority} priority</span>
              </div>
            </div>
            <button onClick={() => setEditOpen(true)} className="btn-secondary text-xs py-1.5">
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-700">
            <div>
              <div className="text-xs text-slate-500">Value</div>
              <div className="flex items-center gap-1 text-xl font-bold text-green-400 mt-0.5">
                <DollarSign className="w-4 h-4" />
                {formatCurrency(deal.value, deal.currency)}
              </div>
            </div>
            {deal.contact && (
              <div>
                <div className="text-xs text-slate-500">Contact</div>
                <div className="text-sm text-slate-200 mt-0.5">{deal.contact.first_name} {deal.contact.last_name}</div>
                {deal.contact.phone && (
                  <a href={`tel:${deal.contact.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-green-400 mt-0.5">
                    <Phone className="w-3 h-3" />{deal.contact.phone}
                  </a>
                )}
              </div>
            )}
            <div>
              <div className="text-xs text-slate-500">Close Date</div>
              <div className="text-sm text-slate-200 mt-0.5">{deal.close_date ? formatDate(deal.close_date) : 'Not set'}</div>
            </div>
          </div>

          {deal.notes && (
            <div className="mt-4 p-3 bg-dark-900 rounded-lg text-sm text-slate-400">{deal.notes}</div>
          )}
        </div>

        {/* AI Score */}
        <div className="card p-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 w-full">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="font-semibold text-white text-sm">AI Win Score</span>
          </div>

          {score ? (
            <>
              <svg className="w-28 h-28" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#1e293b" strokeWidth="3.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={score.score >= 70 ? '#10b981' : score.score >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3.5" strokeDasharray="100"
                  style={{ strokeDashoffset: scoreOffset, transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
                <text x="18" y="20.5" textAnchor="middle" fontSize="9" fill="#f1f5f9" fontWeight="bold">
                  {score.score.toFixed(0)}%
                </text>
              </svg>
              <div className={`badge text-xs ${
                score.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' :
                score.sentiment === 'negative' ? 'bg-red-500/10 text-red-400' :
                'bg-yellow-500/10 text-yellow-400'
              }`}>{score.sentiment}</div>

              {score.insights && score.insights.length > 0 && (
                <div className="w-full space-y-1.5 text-xs text-slate-400">
                  {score.insights.map((ins, i) => (
                    <div key={i} className="flex gap-1.5"><span className="text-primary-400">•</span>{ins}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-20 h-20 rounded-full border-4 border-dark-700 flex items-center justify-center text-slate-600">
                <Zap className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-500 text-center">No AI analysis yet</p>
            </div>
          )}
          <button onClick={analyze} disabled={analyzing} className="btn-primary w-full justify-center text-xs py-1.5 mt-auto">
            {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
          </button>
        </div>
      </div>

      {/* Activities */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">Activity Timeline</h3>
        {deal.activities && deal.activities.length > 0 ? (
          <div className="space-y-2">
            {deal.activities.map(a => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-700/30 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                <div>
                  <div className="text-sm text-slate-200">{a.subject}</div>
                  <div className="text-xs text-slate-500">{a.type} · {formatDate(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-sm">No activities yet</div>
        )}
      </div>

      {editOpen && (
        <DealModal deal={deal} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} />
      )}
    </div>
  );
}
