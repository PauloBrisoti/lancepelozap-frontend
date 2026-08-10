export const BLOCKED_SUBSCRIPTION_STATUSES = ['INADIMPLENTE', 'VENCIDO', 'PENDENTE'] as const;

export function isSubscriptionBlocked(status: string | null | undefined): boolean {
  return !!status && (BLOCKED_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

export function trialDaysLeft(dataVencimento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
