import { useEffect, useState, useRef } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, Pause, Download, Zap } from 'lucide-react';
import { telephonyAPI, analyticsAPI } from '../api';
import type { CallRecord } from '../types';
import { formatDuration, formatDateTime } from '../utils/format';
import toast from 'react-hot-toast';

export default function TelephonyPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [toNumber, setToNumber] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = () => {
    setLoading(true);
    telephonyAPI.listCalls({ limit: 50 })
      .then(r => setCalls(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toNumber) return;
    setCalling(true);
    try {
      await telephonyAPI.initiateCall(toNumber);
      toast.success(`Вызов ${toNumber}...`);
      setToNumber('');
      load();
    } catch {
      toast.error('Ошибка вызова');
    } finally {
      setCalling(false);
    }
  };

  const playRecording = async (call: CallRecord) => {
    if (playingId === call.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    try {
      const r = await telephonyAPI.getRecordingURL(call.id);
      const url = r.data.data?.url;
      if (!url) { toast.error('Запись недоступна'); return; }
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingId(call.id);
        audioRef.current.onended = () => setPlayingId(null);
      }
    } catch {
      toast.error('Запись не найдена');
    }
  };

  const analyzeCall = async (id: string) => {
    setAnalyzing(id);
    try {
      await analyticsAPI.analyzeCall(id);
      toast.success('ИИ-анализ завершён');
    } catch {
      toast.error('Ошибка анализа');
    } finally {
      setAnalyzing(null);
    }
  };

  const DirectionIcon = ({ direction, status }: { direction: string; status: string }) => {
    if (status === 'missed') return <PhoneMissed className="w-4 h-4 text-red-400" />;
    if (direction === 'inbound') return <PhoneIncoming className="w-4 h-4 text-blue-400" />;
    return <PhoneOutgoing className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Телефония</h1>
          <p className="text-slate-500 text-sm">История звонков и записи</p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-400" /> Быстрый набор
        </h3>
        <form onSubmit={handleCall} className="flex gap-3">
          <input
            className="input flex-1"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={toNumber}
            onChange={e => setToNumber(e.target.value)}
          />
          <button type="submit" disabled={calling || !toNumber} className="btn-primary px-6">
            <Phone className="w-4 h-4" /> {calling ? 'Вызов...' : 'Позвонить'}
          </button>
        </form>
        <p className="text-xs text-slate-600 mt-2">
          Интеграция: Asterisk / FreeSWITCH / Twilio / Zadarma — настройте в Настройках
        </p>
      </div>

      <audio ref={audioRef} className="hidden" />

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h3 className="font-semibold text-white">История звонков</h3>
        </div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Загрузка...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Phone className="w-10 h-10 mx-auto mb-2 opacity-20" />
            Звонков нет
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Направление</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Номер</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Контакт</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Статус</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Длительность</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Дата</th>
                <th className="px-4 py-3 text-slate-500 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id} className="table-row">
                  <td className="px-4 py-3">
                    <DirectionIcon direction={call.direction} status={call.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                    {call.direction === 'inbound' ? call.from_number : call.to_number}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {call.contact ? `${call.contact.first_name} ${call.contact.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      call.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      call.status === 'missed' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>{call.status === 'completed' ? 'Завершён' : call.status === 'missed' ? 'Пропущен' : 'В процессе'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDuration(call.duration)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(call.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {call.recording_url && (
                        <>
                          <button
                            onClick={() => playRecording(call)}
                            className={`p-1.5 rounded transition ${
                              playingId === call.id
                                ? 'text-primary-400 bg-primary-500/10'
                                : 'text-slate-500 hover:text-white hover:bg-dark-700'
                            }`}
                            title="Play recording"
                          >
                            {playingId === call.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={call.recording_url}
                            download
                            className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-dark-700 transition"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => analyzeCall(call.id)}
                        disabled={analyzing === call.id}
                        className="p-1.5 rounded text-slate-500 hover:text-primary-400 hover:bg-dark-700 transition"
                        title="AI Analysis"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {calls.some(c => c.ai_analysis) && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" /> Последний ИИ-анализ
          </h3>
          {calls.filter(c => c.ai_analysis).slice(0, 1).map(c => (
            <div key={c.id} className="text-sm text-slate-400 whitespace-pre-wrap bg-dark-900 rounded-lg p-3">
              {c.ai_analysis}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
