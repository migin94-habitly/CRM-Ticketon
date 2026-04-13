export function formatCurrency(value: number, currency = 'KZT'): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact KZT formatter for chart axes: 1 500 000 → "1.5М ₸", 500 000 → "500К ₸" */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}М ₸`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}К ₸`;
  return `${value} ₸`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h} ч ${rm} мин` : `${h} ч`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} д назад`;
  return formatDate(iso);
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-400 bg-red-500/10';
    case 'medium': return 'text-yellow-400 bg-yellow-500/10';
    default: return 'text-slate-400 bg-slate-500/10';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'new': return 'text-blue-400 bg-blue-500/10';
    case 'active': return 'text-green-400 bg-green-500/10';
    case 'inactive': return 'text-slate-400 bg-slate-500/10';
    case 'lost': return 'text-red-400 bg-red-500/10';
    default: return 'text-slate-400 bg-slate-500/10';
  }
}
