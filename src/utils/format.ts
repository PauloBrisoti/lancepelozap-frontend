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

/** Formata data ISO para "dd/mm/aaaa" */
export function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso));
}

/** Formata data ISO para "dd/mm/aaaa HH:mm" */
export function formatDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
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
