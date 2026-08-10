/**
 * Utilitários centralizados de formatação.
 * Remove duplicação de código entre as páginas.
 */

/** Formata valor em R$ (ex: 1234.50 → "R$ 1.234,50") */
export function formatBRL(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

/** Formata bytes para unidade legível (ex: 1234 → "1.2 KB") */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/** Formata data ISO para "dd/mm/aaaa" (sempre no fuso America/Sao_Paulo) */
export function formatDate(iso: string | Date): string {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso.split('-').reverse().join('/');
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

/** Formata data ISO para "dd/mm/aaaa HH:mm" (sempre no fuso America/Sao_Paulo) */
export function formatDateTime(iso: string | Date): string {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso.split('-').reverse().join('/');
  }
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
}

/** Data de hoje no fuso local como "aaaa-mm-dd" (não usa UTC para não pular um dia) */
export function todayLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Remove caracteres não numéricos de telefone */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  }
  return phone;
}

const CONECTIVOS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

/** Formata nome próprio em título (ex: "joao da silva" → "João da Silva") */
export function formatNome(nome: string): string {
  const words = nome.trim().split(/\s+/);
  return words.map((w, i) => {
    const lower = w.toLowerCase();
    if (i > 0 && CONECTIVOS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}
