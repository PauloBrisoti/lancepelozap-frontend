# AGENTS.md — saas-frontend

React 19 + TypeScript + Tailwind 3.4 + Vite 8 + React Router 8 (`react-router`, não `react-router-dom`) + TanStack Query + Vitest.

## Comandos (sempre rodar após mudanças)
- `npm run typecheck` — deve sair sem `error TS`
- `npm run lint` — deve sair sem ` error ` (warnings de `no-explicit-any` são aceitos)
- `npm test` — Vitest (hoje: 17 arquivos / 114 testes)

## Padrões do código
- Dados: `fetchApi` (`src/lib/api.ts`, tem `ApiError.status/data`) + `useApiQuery`/`STALE_TIMES` (`src/lib/query.ts`)
- Polling: `usePoll` (`src/hooks/usePoll.ts`) — pausa em aba oculta
- Modais: componente `Modal` (`open=false` → null) + hook `useModal`; CRUD: `useCrudList`
- Datas/fuso: `src/lib/dates.ts` (`formatDateBR`/`formatDateTimeBR`, TZ Brasília); formato de valores: `src/utils/format.ts` (`formatBRL`, `formatNome`, `todayLocalDate`)
- Mapas de domínio (status/pagamentos): `src/utils/domainMaps.ts`
- Auth: `src/context/AuthContext.tsx` — eventos `session_expired` e `two_factor_setup_required` no `window` (401 e 2FA obrigatório vêm daqui)
- Backend local em `/Users/paulobarbosa/Projetos/backend` — consulte para validar contratos de API

## Pendências (refatoração futura)
1. **Duplicação CPF/CNPJ** — 3 implementações concorrentes: `maskCpfCnpj`/`validarCpfCnpj` (`src/lib/validators.ts`), `isValidCPFOrCNPJ` (`src/utils/cpfCnpj.ts`) e `formatDoc` local em `src/pages/LojasPage.tsx`. Unificar num único módulo.
2. **`any` tipáveis** — tipar respostas em `LojasPage` (`impersonationLogs`), `PermissoesAdminPage` (`loadClients`), `DashboardPJPage` (`sellers`), `FinanceiroPF`, `ComissoesPage` (summary) e `BiPage` (`useApiQuery<unknown>`).
3. **Padding duplo do `Modal`** — modais de `LojasPage` e `ConfiguracoesPage` usam `className="p-6 border-b"` interno + `size="xl"`; o `Modal` já aplica padding. Revisar CSS para evitar scroll quebrado em modal grande.
4. **DashboardPJPage mascara erro** — query de vendedores falha silenciosamente (`sellers?.sellers || []` mostra "nenhuma venda" em vez de erro).
5. **`useDateFilter`** — aceita múltiplos aliases de período (`'7d'|'last_7'|'LAST_7_DAYS'`…); consolidar enum único.
6. **`fetchApi` inline em one-offs** — `Layout.tsx` (revert-impersonate) e `ContextSwitcher.tsx` (criar loja) ainda chamam `fetchApi` direto no JSX; extrair hooks se crescerem.

## Histórico recente (ago/2026)
- Commit base `ac0ea30` → 13 commits de refactor+WIP (hooks de dados, domainMaps, modais financeiros, StatusActions, 2FA, Turnstile, verificação de email, role-gates, migração react-query/router 8).
- Refactor de estado (uncommitted): role-gates via AuthContext (`isPf`/`isRestrictedRole`/`canAccess`), `ACTIVE_STORE_KEY` centralizado, server data migrado para react-query em `PersonalDashboardPage`/`PDVPage`/`ComprasPage` (chaves por `storeId`, PDV com fallback offline), modais financeiros (`LancamentoModal`/`BaixaModal`/`BaixaPagarModal`) buscam seus próprios dados (`['finance-dashboard', storeId]`, `['finance-categories', storeId]`, `['customers', storeId]`), `ComprasPage` com estado `formOrder` agrupado + `useModal`.
