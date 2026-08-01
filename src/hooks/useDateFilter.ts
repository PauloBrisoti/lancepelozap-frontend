import { useMemo } from 'react';
import { subDays, format, subMonths } from 'date-fns';

type DatePeriod =
  | '7d' | '30d' | 'este_mes' | 'mes_passado' | 'personalizado' | 'tudo'
  | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  | 'all' | 'today' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'custom';

interface DateFilterResult {
  start: string;
  end: string;
  query: string;
}

function fiscalMonthRange(today: Date, startDay: number): { start: Date; end: Date } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  let start: Date;
  if (d >= startDay) {
    start = new Date(y, m, startDay);
  } else {
    start = new Date(y, m - 1, startDay);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);
  return { start, end };
}

export function useDateFilter(
  period: DatePeriod,
  customStart?: string,
  customEnd?: string,
  diaInicioMes: number = 1,
): DateFilterResult {
  return useMemo(() => {
    const today = new Date();
    let start = '';
    let end = format(today, 'yyyy-MM-dd');

    if (period === 'today' || period === 'TODAY') {
      start = format(today, 'yyyy-MM-dd');
      end = format(today, 'yyyy-MM-dd');
    } else if (period === 'last_7' || period === 'LAST_7_DAYS' || period === '7d') {
      start = format(subDays(today, 7), 'yyyy-MM-dd');
    } else if (period === 'last_30' || period === '30d') {
      start = format(subDays(today, 30), 'yyyy-MM-dd');
    } else if (period === 'this_month' || period === 'THIS_MONTH' || period === 'este_mes') {
      const range = fiscalMonthRange(today, diaInicioMes);
      start = format(range.start, 'yyyy-MM-dd');
      end = format(range.end, 'yyyy-MM-dd');
    } else if (period === 'last_month' || period === 'LAST_MONTH' || period === 'mes_passado') {
      const lastMonth = subMonths(today, 1);
      const range = fiscalMonthRange(lastMonth, diaInicioMes);
      start = format(range.start, 'yyyy-MM-dd');
      end = format(range.end, 'yyyy-MM-dd');
    } else if ((period === 'custom' || period === 'CUSTOM' || period === 'personalizado') && customStart && customEnd) {
      start = customStart;
      end = customEnd;
    } else if (period === 'all' || period === 'tudo') {
      start = '';
      end = '';
    }

    const query = start && end ? `?startDate=${start}&endDate=${end}` : '';
    return { start, end, query } as const;
  }, [period, customStart, customEnd, diaInicioMes]);
}
