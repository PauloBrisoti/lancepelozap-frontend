# AGENTS.md — saas-frontend

React 19 + TypeScript + Tailwind 3.4 + Vite 8 + React Router 8 (`react-router`, não `react-router-dom`) + TanStack Query + Vitest.

## Comandos (sempre rodar após mudanças)
- `npm run typecheck` — deve sair sem `error TS`
- `npm run lint` — deve sair sem ` error ` (warnings de `no-explicit-any` são aceitos)
- `npm test` — Vitest (hoje: 19 arquivos / 119 testes)

## Padrões do código
- Dados: `fetchApi` (`src/lib/api.ts`, tem `ApiError.status/data`) + `useApiQuery`/`STALE_TIMES` (`src/lib/query.ts`)
- Polling: `usePoll` (`src/hooks/usePoll.ts`) — pausa em aba oculta
- Modais: componente `Modal` (`open=false` → null) + hook `useModal`; CRUD: `useCrudList`
- Datas/fuso: `src/lib/dates.ts` (`formatDateBR`/`formatDateTimeBR`, TZ Brasília); formato de valores: `src/utils/format.ts` (`formatBRL`, `formatNome`, `todayLocalDate`)
- Mapas de domínio (status/pagamentos): `src/utils/domainMaps.ts`
- Auth: `src/context/AuthContext.tsx` — eventos `session_expired` e `two_factor_setup_required` no `window` (401 e 2FA obrigatório vêm daqui). Consumir via hooks granulares: `useAuthUser` (user/loading/activeWorkspace/isPf/isRestrictedRole/canAccess), `useAuthStore` (activeStoreId), `useAuthActions` (login/logout/switchWorkspace/impersonate/revertImpersonate/refreshUser — identidade estável). Não re-criar o hook único `useAuth`.
- Backend local em `/Users/paulobarbosa/Projetos/backend` — consulte para validar contratos de API

## Pendências da auditoria (concluídas em ago/2026)
1. ✅ **Duplicação CPF/CNPJ** — unificada em `src/utils/cpfCnpj.ts` (`isValidCPFOrCNPJ`, `maskCpfCnpj`, `validarCpfCnpj`, `formatDoc`); `validators.ts` ficou só com email/telefone/senha/nome.
2. ✅ **`any` tipáveis** — `impersonationLogs`/`plans`/`clientUsers` (LojasPage), `loadClients` (PermissoesAdminPage), `sellers` (DashboardPJPage), FinanceiroPF/ComissoesPage/BiPage sem `any` cru (só formatters do recharts aceitos).
3. ✅ **Padding duplo do `Modal`** — modais com header/footer internos usam `padded={false}` (LojasPage: formulário de cliente, histórico de acessos, equipe; ConfiguracoesPage já estava correto).
4. ✅ **DashboardPJPage mascara erro** — falha da query de vendedores agora mostra estado de erro com botão "Tentar novamente".
5. ✅ **`useDateFilter`** — enum único canônico (`today|7d|30d|este_mes|mes_passado|personalizado|tudo`), sem aliases legados.
6. ✅ **`fetchApi` inline em one-offs** — `revertImpersonate` no AuthContext e `useCreateStore` (ContextSwitcher/Layout sem fetch direto).

## Pendências (refatoração futura)
- Nenhuma registrada no momento.

## Histórico recente (ago/2026)
- Commit base `ac0ea30` → 13 commits de refactor+WIP (hooks de dados, domainMaps, modais financeiros, StatusActions, 2FA, Turnstile, verificação de email, role-gates, migração react-query/router 8).
- Fase 3 de refactor: `utils/estoque` + `utils/financeiro` com testes (`saldoRestante`, valorização), `revertImpersonate` no AuthContext, `useCreateStore`, `useWallets` em `query.ts`, subcomponentes no `LancamentoModal` (estado de categoria via container), `utils/navigation` (`isPathActive`/`activeSection`) usado por Sidebar/MobileBottomNav, `AgendaPage` com `useModal`, `ConfigCardMachinePage` com `useCrudList`.
- Bugs de sessão: `fetchApi` com `cache: 'no-store'` (304 do `/me` derrubava a sessão) e `ProtectedRoute` protegido contra `error = null`.
- Pendências da auditoria concluídas (seção acima).
