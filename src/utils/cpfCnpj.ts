function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev > 9) rev = 0;
  if (rev !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev > 9) rev = 0;
  return rev === parseInt(digits[10]);
}

function isValidCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (base: number[]) => {
    const weights = base.length === 12
      ? [5,4,3,2,9,8,7,6,5,4,3,2]
      : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += base[i] * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const base = digits.slice(0, 12).split('').map(Number);
  if (calc(base) !== parseInt(digits[12])) return false;

  const base2 = digits.slice(0, 13).split('').map(Number);
  return calc(base2) === parseInt(digits[13]);
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos). */
export function isValidCPFOrCNPJ(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return isValidCPF(value);
  if (digits.length === 14) return isValidCNPJ(value);
  return false;
}

/** Máscara progressiva: CPF 000.000.000-00 ou CNPJ 00.000.000/0000-00. */
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

/** Valida e retorna mensagem de erro, ou null se válido/vazio. */
export function validarCpfCnpj(doc: string): string | null {
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length === 11) return isValidCPF(doc) ? null : 'CPF inválido';
  if (digits.length === 14) return isValidCNPJ(doc) ? null : 'CNPJ inválido';
  return 'CNPJ/CPF deve ter 11 (CPF) ou 14 (CNPJ) dígitos';
}

/** Formata para exibição, preservando valores não-CPF/CNPJ (ex.: "-"). */
export function formatDoc(doc: string | null | undefined): string {
  const digits = (doc || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc || '-';
}
