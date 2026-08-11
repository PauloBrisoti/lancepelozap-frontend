const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'temp-mail.org',
  'throwaway.email', 'yopmail.com', 'mailnator.com', 'trashmail.com',
  'temporarymail.com', 'fakemail.com', 'emailfake.com', 'tempmail.net',
  'mailcatch.com', 'mytemp.email', 'spam4.me', 'dispostable.com',
  'getnada.com', 'maildrop.cc', 'inboxbear.com', 'tempr.email',
  'sharklasers.com', 'grr.la',
]);

const GENERIC_DOMAINS = new Set([
  'test.com', 'example.com', 'domain.com', 'company.com', 'email.com',
  'mail.com', 'website.com', 'yourdomain.com', 'yourcompany.com',
  'mycompany.com', 'mydomain.com', 'localhost.com', 'teste.com',
  'teste123.com', 'email.com.br', 'provedor.com', 'meuemail.com',
  'nomail.com', 'nowhere.com',
]);

export function validarEmail(email: string): string | null {
  if (!email) return 'E-mail é obrigatório';
  if (!EMAIL_REGEX.test(email)) return 'E-mail inválido';
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.has(domain)) return 'E-mail descartável não é permitido';
  if (domain && GENERIC_DOMAINS.has(domain)) return 'E-mail genérico não é permitido';
  return null;
}

const TELEFONE_REGEX = /^\(\d{2}\)\s9\d{4}-\d{4}$/;

export function validarTelefone(telefone: string): string | null {
  if (!telefone) return 'WhatsApp é obrigatório';
  if (!TELEFONE_REGEX.test(telefone)) return 'Formato exigido: (DD) 9XXXX-XXXX';
  return null;
}

export function validarSenha(senha: string): { valida: boolean; erros: string[] } {
  const erros: string[] = [];
  if (!senha || senha.length < 8) erros.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(senha)) erros.push('Uma letra maiúscula');
  if (!/[a-z]/.test(senha)) erros.push('Uma letra minúscula');
  if (!/[0-9]/.test(senha)) erros.push('Um número');
  return { valida: erros.length === 0, erros };
}

export function validarNomeLoja(nome: string): string | null {
  if (!nome || nome.trim().length < 2) return 'Nome da loja é obrigatório';
  return null;
}

export function validarNomeResponsavel(nome: string): string | null {
  if (!nome || nome.trim().length < 2) return 'Nome do responsável é obrigatório';
  return null;
}
