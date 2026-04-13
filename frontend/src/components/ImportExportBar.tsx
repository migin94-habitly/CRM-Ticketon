import { useRef, useState } from 'react';
import { Download, Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  entityName: string;          // e.g. "контактов", "сделок"
  filename: string;            // e.g. "contacts", "deals"
  onExport: () => Promise<{ data: Blob }>;
  onImport: (file: File) => Promise<{ data: { message?: string; data?: { inserted: number; skipped: number } } }>;
  onImportSuccess?: () => void;
}

interface ImportResult {
  inserted: number;
  skipped: number;
}

export default function ImportExportBar({ entityName, filename, onExport, onImport, onImportSuccess }: Props) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await onExport();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Экспорт ${entityName} выполнен`);
    } catch {
      toast.error('Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Выберите файл в формате CSV');
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await onImport(file);
      const data = res.data?.data as ImportResult | undefined;
      if (data) {
        setResult(data);
        toast.success(`Импортировано: ${data.inserted}, пропущено: ${data.skipped}`);
        onImportSuccess?.();
      }
    } catch {
      toast.error('Ошибка импорта. Проверьте формат файла.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
        title={`Экспорт ${entityName} в CSV`}
      >
        <Download className="w-3.5 h-3.5" />
        {exporting ? 'Экспорт...' : 'CSV Экспорт'}
      </button>

      {/* Import button */}
      <label
        className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shrink-0 ${importing ? 'opacity-60 pointer-events-none' : ''}`}
        title={`Импорт ${entityName} из CSV`}
      >
        <Upload className="w-3.5 h-3.5" />
        {importing ? 'Загрузка...' : 'CSV Импорт'}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {/* Template download hint */}
      <button
        onClick={() => downloadTemplate(filename)}
        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
        title="Скачать шаблон CSV"
      >
        <FileText className="w-3 h-3" />
        Шаблон
      </button>

      {/* Result badge */}
      {result && (
        <div className="flex items-center gap-1.5 text-xs">
          {result.inserted > 0 && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              {result.inserted} добавлено
            </span>
          )}
          {result.skipped > 0 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {result.skipped} пропущено
            </span>
          )}
          <button onClick={() => setResult(null)} className="text-slate-600 hover:text-slate-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// CSV template definitions per entity
const TEMPLATES: Record<string, { headers: string[]; example: string[] }> = {
  contacts: {
    headers: ['ID', 'Имя', 'Фамилия', 'Email', 'Телефон', 'Компания', 'Должность', 'Статус', 'Источник', 'Заметки', 'Дата создания'],
    example: ['', 'Иван', 'Иванов', 'ivan@example.com', '+7 999 000-00-00', 'ООО Ромашка', 'Директор', 'new', 'website', '', ''],
  },
  deals: {
    headers: ['ID', 'Название', 'Сумма', 'Валюта', 'Этап', 'Приоритет', 'Дата закрытия', 'Мероприятие', 'Кол-во билетов', 'Заметки', 'Дата создания'],
    example: ['', 'Концерт Алматы', '500000', 'KZT', '', 'medium', '2025-12-31', 'Рок-фестиваль', '500', '', ''],
  },
  partners: {
    headers: ['ID', 'Название', 'Контактное лицо', 'Email', 'Телефон', 'Статус', 'Номер договора', 'Комиссия (%)', 'Сайт', 'Заметки', 'Дата создания'],
    example: ['', 'ООО Промоутер', 'Аскар Ахметов', 'askar@promo.kz', '+7 777 000-00-00', 'active', 'ДГ-2025-001', '10', 'promo.kz', '', ''],
  },
  venues: {
    headers: ['ID', 'Название', 'Адрес', 'Город', 'Вместимость', 'Описание', 'Дата создания'],
    example: ['', 'Дворец спорта', 'ул. Достык 1', 'Алматы', '5000', 'Крытый стадион', ''],
  },
};

function downloadTemplate(filename: string) {
  const tpl = TEMPLATES[filename];
  if (!tpl) return;
  const bom = '\uFEFF';
  const rows = [tpl.headers, tpl.example]
    .map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([bom + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
