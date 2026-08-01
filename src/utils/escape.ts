/**
 * Utilitários de sanitização para prevenir XSS no frontend.
 *
 * Use estas funções sempre que for renderizar conteúdo
 * fornecido pelo usuário ou vindo da API.
 */

/**
 * Escapa caracteres HTML perigosos para evitar XSS.
 *
 * Exemplo:
 *   escapeHtml('<script>alert("xss")</script>')
 *   → "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitiza um objeto recursivamente, escapando todas as strings.
 * Útil para dados vindos da API antes de renderizar.
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') return escapeHtml(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as unknown as T;
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }
  return obj;
}

/**
 * Marca um texto como seguro para renderização (já sanitizado).
 * Use com moderação — prefira sempre escapar na fonte.
 */
export function safeHtml(text: string): { __html: string } {
  return { __html: escapeHtml(text) };
}
