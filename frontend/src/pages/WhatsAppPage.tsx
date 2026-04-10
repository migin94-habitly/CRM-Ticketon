import { useEffect, useState } from 'react';
import { Send, MessageSquare, CheckCheck } from 'lucide-react';
import { whatsappAPI } from '../api';
import type { WhatsAppMessage } from '../types';
import { timeAgo } from '../utils/format';
import toast from 'react-hot-toast';

interface Conversation {
  contact_id?: string;
  contact_name?: string;
  contact?: { first_name: string; last_name: string; phone: string };
  to_number: string;
  last_message: string;
  unread_count: number;
  last_at: string;
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    whatsappAPI.conversations()
      .then(r => setConversations((r.data.data as Conversation[]) || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    const params: Record<string, unknown> = {};
    if (selectedConv.contact_id) params.contact_id = selectedConv.contact_id;
    whatsappAPI.messages(params)
      .then(r => setMessages(r.data.data || []));
  }, [selectedConv]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    try {
      await whatsappAPI.send({
        to_number: selectedConv.to_number,
        body: newMsg,
        contact_id: selectedConv.contact_id,
      });
      toast.success('Message sent');
      setNewMsg('');
      const params: Record<string, unknown> = {};
      if (selectedConv.contact_id) params.contact_id = selectedConv.contact_id;
      whatsappAPI.messages(params).then(r => setMessages(r.data.data || []));
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 animate-in">
      <div>
        <h1 className="text-xl font-bold text-white">WhatsApp</h1>
        <p className="text-slate-500 text-sm">Customer conversations</p>
      </div>

      <div className="card flex h-[calc(100vh-200px)] overflow-hidden">
        <div className="w-80 border-r border-slate-700/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-700/50">
            <input className="input text-sm py-1.5" placeholder="Search conversations..." />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No conversations yet
              </div>
            ) : conversations.map((conv, i) => (
              <div
                key={i}
                onClick={() => setSelectedConv(conv)}
                className={`flex items-start gap-3 p-3 border-b border-slate-700/20 cursor-pointer hover:bg-dark-700/40 transition ${
                  selectedConv?.to_number === conv.to_number ? 'bg-dark-700/50' : ''
                }`}
              >
                <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {(conv.contact_name || conv.to_number)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {conv.contact_name || conv.to_number}
                    </div>
                    <div className="text-xs text-slate-600 shrink-0 ml-2">{timeAgo(conv.last_at)}</div>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message}</div>
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {conv.unread_count}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedConv ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {(selectedConv.contact_name || selectedConv.to_number)[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-slate-200 text-sm">{selectedConv.contact_name || selectedConv.to_number}</div>
                <div className="text-xs text-green-400">WhatsApp</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-8">No messages yet</div>
              ) : messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                    msg.direction === 'outgoing'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-dark-700 text-slate-200 rounded-bl-sm'
                  }`}>
                    <p>{msg.body}</p>
                    <div className={`flex items-center gap-1 text-[10px] mt-1 ${
                      msg.direction === 'outgoing' ? 'text-green-200 justify-end' : 'text-slate-500'
                    }`}>
                      <span>{msg.sent_at ? timeAgo(msg.sent_at) : timeAgo(msg.created_at)}</span>
                      {msg.direction === 'outgoing' && (
                        <CheckCheck className={`w-3 h-3 ${msg.read_at ? 'text-blue-300' : 'text-green-200'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-3 border-t border-slate-700/50 flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Type a message..."
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
              />
              <button type="submit" disabled={sending || !newMsg.trim()} className="btn-primary px-4 py-2">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
