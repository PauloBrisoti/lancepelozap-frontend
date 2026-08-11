import { describe, it, expect } from 'vitest';
import { estoqueBaixo } from './estoque';

describe('estoqueBaixo', () => {
  it('retorna true quando a quantidade está no mínimo configurado', () => {
    expect(estoqueBaixo({ qtdEstoqueAtual: 5, estoqueMinimo: 5 })).toBe(true);
  });

  it('retorna false quando há estoque acima do mínimo', () => {
    expect(estoqueBaixo({ qtdEstoqueAtual: 6, estoqueMinimo: 5 })).toBe(false);
    expect(estoqueBaixo({ qtdEstoqueAtual: 7, estoqueMinimo: 5 })).toBe(false);
  });

  it('usa o fallback de 5 quando o mínimo não está configurado', () => {
    expect(estoqueBaixo({ qtdEstoqueAtual: 5, estoqueMinimo: null })).toBe(true);
    expect(estoqueBaixo({ qtdEstoqueAtual: 4, estoqueMinimo: 0 })).toBe(true);
    expect(estoqueBaixo({ qtdEstoqueAtual: 6, estoqueMinimo: 0 })).toBe(false);
    expect(estoqueBaixo({ qtdEstoqueAtual: 6, estoqueMinimo: null })).toBe(false);
  });

  it('aceita fallback customizado', () => {
    expect(estoqueBaixo({ qtdEstoqueAtual: 10, estoqueMinimo: null }, 10)).toBe(true);
    expect(estoqueBaixo({ qtdEstoqueAtual: 11, estoqueMinimo: null }, 10)).toBe(false);
  });
});
