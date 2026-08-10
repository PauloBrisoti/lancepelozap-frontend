// Datas no fuso de Brasília/São Paulo (America/Sao_Paulo)
// O banco armazena UTC; a conversão acontece na exibição.

export const TZ_BR = 'America/Sao_Paulo';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ_BR,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ_BR,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

/** "2026-08-03" → "03/08/2026" (sem conversão de fuso, valor é só data) */
function formatDateOnly(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value;
}

export function formatDateTimeBR(iso?: string | null): string {
  if (!iso) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatDateOnly(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return dateTimeFormatter.format(d).replace(', ', ' ').replace('24:', '00:');
}

export function formatDateBR(iso?: string | null): string {
  if (!iso) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return formatDateOnly(iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return dateFormatter.format(d);
}
