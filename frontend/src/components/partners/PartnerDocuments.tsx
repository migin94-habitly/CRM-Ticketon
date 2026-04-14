import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Trash2, Download, File } from 'lucide-react';
import { partnerDocumentsAPI } from '../../api';
import type { PartnerDocument } from '../../types';

interface Props {
  partnerId: string;
  canUpload: boolean;
  canDelete: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function mimeLabel(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('wordprocessingml')) return 'DOCX';
  return mime.split('/').pop()?.toUpperCase() ?? 'FILE';
}

export default function PartnerDocuments({ partnerId, canUpload, canDelete }: Props) {
  const [docs, setDocs] = useState<PartnerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await partnerDocumentsAPI.list(partnerId);
      setDocs(res.data.data ?? []);
    } catch {
      setError('Не удалось загрузить документы');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [partnerId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setError('Разрешены только файлы PDF и DOCX');
      return;
    }

    setUploading(true);
    setError('');
    try {
      await partnerDocumentsAPI.upload(partnerId, file);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg ?? 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: PartnerDocument) => {
    try {
      const res = await partnerDocumentsAPI.download(partnerId, doc.id);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Ошибка при скачивании файла');
    }
  };

  const handleDelete = async (doc: PartnerDocument) => {
    if (!confirm(`Удалить документ «${doc.filename}»?`)) return;
    try {
      await partnerDocumentsAPI.delete(partnerId, doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
    } catch {
      setError('Ошибка при удалении документа');
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          Документы
          {docs.length > 0 && (
            <span className="text-xs text-slate-500 font-normal">{docs.length}</span>
          )}
        </h3>
        {canUpload && (
          <>
            <button
              className="btn-secondary text-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="animate-pulse">Загрузка...</span>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Добавить
                </>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm animate-pulse py-4 text-center">
          Загрузка...
        </div>
      ) : docs.length === 0 ? (
        <div className="text-slate-500 text-sm text-center py-8 flex flex-col items-center gap-2">
          <File className="w-8 h-8 text-slate-700" />
          <span>Документы не добавлены</span>
          {canUpload && (
            <span className="text-xs text-slate-600">
              Поддерживаются форматы PDF и DOCX
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition group"
            >
              <div className="shrink-0 w-9 h-9 rounded-md bg-slate-800 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">
                  {doc.filename}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span className="uppercase font-medium text-slate-600">
                    {mimeLabel(doc.mime_type)}
                  </span>
                  <span>·</span>
                  <span>{formatBytes(doc.file_size)}</span>
                  <span>·</span>
                  <span>{formatDate(doc.created_at)}</span>
                  {doc.uploader_name && (
                    <>
                      <span>·</span>
                      <span>{doc.uploader_name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Скачать"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {canDelete && (
                  <button
                    className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                    title="Удалить"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
