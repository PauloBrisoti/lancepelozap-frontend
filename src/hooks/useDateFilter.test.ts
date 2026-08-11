import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDateFilter } from './useDateFilter';

describe('useDateFilter', () => {
  it('retorna query vazia para "tudo"', () => {
    const { result } = renderHook(() => useDateFilter('tudo'));
    expect(result.current.query).toBe('');
    expect(result.current.start).toBe('');
    expect(result.current.end).toBe('');
  });

  it('retorna período de 7 dias para "7d"', () => {
    const { result } = renderHook(() => useDateFilter('7d'));
    expect(result.current.query).toContain('startDate=');
    expect(result.current.query).toContain('endDate=');
    expect(result.current.start).toBeTruthy();
    expect(result.current.end).toBeTruthy();
  });

  it('retorna período de 30 dias para "30d"', () => {
    const { result } = renderHook(() => useDateFilter('30d'));
    expect(result.current.query).toContain('startDate=');
  });

  it('retorna mês atual para "este_mes"', () => {
    const { result } = renderHook(() => useDateFilter('este_mes'));
    expect(result.current.query).toContain('startDate=');
    expect(result.current.start).toContain('-01');
  });

  it('retorna mês passado para "mes_passado"', () => {
    const { result } = renderHook(() => useDateFilter('mes_passado'));
    expect(result.current.query).toContain('startDate=');
    expect(result.current.query).toContain('endDate=');
  });

  it('retorna hoje para "today"', () => {
    const { result } = renderHook(() => useDateFilter('today'));
    expect(result.current.start).toBe(result.current.end);
  });

  it('retorna custom quando período é "personalizado"', () => {
    const { result } = renderHook(() => useDateFilter('personalizado', '2026-01-01', '2026-01-31'));
    expect(result.current.query).toContain('startDate=2026-01-01');
    expect(result.current.query).toContain('endDate=2026-01-31');
  });

  it('não quebra com período inválido', () => {
    const { result } = renderHook(() => useDateFilter('invalido' as any));
    expect(result.current.query).toBe('');
    expect(result.current.start).toBe('');
    expect(result.current.end).toBeTruthy();
  });
});
