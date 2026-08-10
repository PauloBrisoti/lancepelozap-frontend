import { useCallback, useState } from 'react';

export interface CepInfo {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export function formatCepInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

export function buildEnderecoCompleto(data: CepInfo): string {
  if (!data.logradouro && !data.bairro && !data.localidade) return '';
  return [data.logradouro, data.bairro, data.localidade && `${data.localidade} - ${data.uf ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ');
}

/**
 * Hook de busca de CEP via ViaCEP.
 * Retorna também o formatador de input, para manter a máscara junto da lógica.
 */
export function useCep() {
  const [buscando, setBuscando] = useState(false);

  const buscar = useCallback(async (cep: string): Promise<CepInfo | null> => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return null;
    setBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) return null;
      return data as CepInfo;
    } catch {
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);

  return { buscar, buscando };
}
