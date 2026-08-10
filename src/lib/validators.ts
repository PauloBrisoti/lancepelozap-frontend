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

export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function validarCpfCnpj(doc: string): string | null {
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length === 11) {
    if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido';
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
    let dv = 11 - (sum % 11);
    if (dv >= 10) dv = 0;
    if (dv !== Number(digits[9])) return 'CPF inválido';
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
    dv = 11 - (sum % 11);
    if (dv >= 10) dv = 0;
    if (dv !== Number(digits[10])) return 'CPF inválido';
    return null;
  }
  if (digits.length === 14) {
    if (/^(\d)\1{13}$/.test(digits)) return 'CNPJ inválido';
    const calc = (weights: number[]): number => {
      let s = 0;
      for (let i = 0; i < weights.length; i++) s += Number(digits[i]) * weights[i];
      const rest = s % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    if (calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) !== Number(digits[12])) return 'CNPJ inválido';
    if (calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) !== Number(digits[13])) return 'CNPJ inválido';
    return null;
  }
  return 'CNPJ/CPF deve ter 11 (CPF) ou 14 (CNPJ) dígitos';
}
