import { describe, it, expect } from 'vitest';
import { formatDateTimeBR, formatDateBR } from './dates';

describe('datas no fuso de Brasília (America/Sao_Paulo)', () => {
  it('converte UTC para hora de São Paulo', () => {
    expect(formatDateTimeBR('2026-08-03T15:30:00.000Z')).toBe('03/08/2026 12:30');
  });

  it('lida com horário de verão histórico (UTC-2)', () => {
    expect(formatDateTimeBR('2026-01-03T22:00:00.000Z')).toBe('03/01/2026 19:00');
  });

  it('formata somente data', () => {
    expect(formatDateBR('2026-08-03T15:30:00.000Z')).toBe('03/08/2026');
  });

  it('retorna — para valores nulos/inválidos', () => {
    expect(formatDateTimeBR(null)).toBe('—');
    expect(formatDateTimeBR(undefined)).toBe('—');
    expect(formatDateTimeBR('data-invalida')).toBe('—');
    expect(formatDateBR(null)).toBe('—');
  });
});
