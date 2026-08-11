/**
 * Lógica de navegação compartilhada entre Sidebar e MobileBottomNav.
 * Centraliza a definição de "rota ativa" e a seção aberta no menu lateral,
 * evitando as divergências entre as implementações antigas de cada componente.
 */

/** Raiz (/app, /admin) exige match exato; rotas filhas aceitam sub-rotas. */
export function isPathActive(pathname: string, path: string): boolean {
  if (path === '/app' || path === '/admin') return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export interface NavSection {
  title: string;
  paths: readonly string[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  { title: 'Gestão & Relatórios', paths: ['/app/dashboard-pj', '/app/relatorios', '/app/insights', '/app/comissoes'] },
  { title: 'Operacional', paths: ['/app/caixa', '/app/os', '/app/agenda', '/app/orcamentos', '/app/operacional-pet', '/app/devolucoes'] },
  { title: 'Estoque & Suprimentos', paths: ['/app/estoque', '/app/transferencias', '/app/inventario', '/app/compras', '/app/fornecedores'] },
  { title: 'Comunicação', paths: ['/app/whatsapp', '/app/campanhas', '/app/chamados'] },
  { title: 'Configurações e Suporte', paths: ['/app/planos', '/app/configuracoes', '/app/importacao-legada', '/app/importar-planilha'] },
];

/** Título da seção do menu lateral que contém a rota atual ('' se nenhuma). */
export function activeSection(pathname: string): string {
  for (const section of NAV_SECTIONS) {
    if (section.paths.some(p => isPathActive(pathname, p))) return section.title;
  }
  return '';
}
