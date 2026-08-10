import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { IdleSession } from './components/IdleSession';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const VerificarEmailPage = lazy(() => import('./pages/VerificarEmailPage').then(m => ({ default: m.VerificarEmailPage })));
const TwoFactorSetupPage = lazy(() => import('./pages/TwoFactorSetupPage').then(m => ({ default: m.TwoFactorSetupPage })));
const CompletarCadastroPage = lazy(() => import('./pages/CompletarCadastroPage').then(m => ({ default: m.CompletarCadastroPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const CatalogoPublicoPage = lazy(() => import('./pages/CatalogoPublicoPage').then(m => ({ default: m.CatalogoPublicoPage })));
const PortalPage = lazy(() => import('./pages/PortalPage').then(m => ({ default: m.PortalPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const DashboardPJPage = lazy(() => import('./pages/DashboardPJPage').then(m => ({ default: m.DashboardPJPage })));
const PDVPage = lazy(() => import('./pages/PDVPage').then(m => ({ default: m.PDVPage })));
const CashRegisterPage = lazy(() => import('./pages/CashRegisterPage').then(m => ({ default: m.CashRegisterPage })));
const VendasPage = lazy(() => import('./pages/VendasPage').then(m => ({ default: m.VendasPage })));
const OrdemServicoPage = lazy(() => import('./pages/OrdemServicoPage').then(m => ({ default: m.OrdemServicoPage })));
const AgendaPage = lazy(() => import('./pages/AgendaPage').then(m => ({ default: m.AgendaPage })));
const OrcamentosPage = lazy(() => import('./pages/OrcamentosPage').then(m => ({ default: m.OrcamentosPage })));
const OperacionalPetPage = lazy(() => import("./pages/OperacionalPetPage"));
const ComprasPage = lazy(() => import('./pages/ComprasPage').then(m => ({ default: m.ComprasPage })));
const FornecedoresPage = lazy(() => import('./pages/FornecedoresPage').then(m => ({ default: m.FornecedoresPage })));
const ComissoesPage = lazy(() => import('./pages/ComissoesPage').then(m => ({ default: m.ComissoesPage })));
const DevolucoesPage = lazy(() => import('./pages/DevolucoesPage').then(m => ({ default: m.DevolucoesPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const BiPage = lazy(() => import('./pages/BiPage').then(m => ({ default: m.BiPage })));
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })));
const EstoquePage = lazy(() => import('./pages/EstoquePage').then(m => ({ default: m.EstoquePage })));
const TransferenciasPage = lazy(() => import('./pages/TransferenciasPage').then(m => ({ default: m.TransferenciasPage })));
const InventarioPage = lazy(() => import('./pages/InventarioPage').then(m => ({ default: m.InventarioPage })));
const FinanceiroPage = lazy(() => import('./pages/FinanceiroPage').then(m => ({ default: m.FinanceiroPage })));
const FinanceiroPF = lazy(() => import('./pages/FinanceiroPF').then(m => ({ default: m.FinanceiroPF })));
const ClientesPage = lazy(() => import('./pages/ClientesPage').then(m => ({ default: m.ClientesPage })));
const PlanosPage = lazy(() => import('./pages/PlanosPage').then(m => ({ default: m.PlanosPage })));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })));
const WhatsAppConfigPage = lazy(() => import('./pages/WhatsAppConfigPage').then(m => ({ default: m.WhatsAppConfigPage })));
const CampanhasPage = lazy(() => import('./pages/CampanhasPage').then(m => ({ default: m.CampanhasPage })));
const LegacyImportPage = lazy(() => import('./pages/LegacyImportPage').then(m => ({ default: m.LegacyImportPage })));
const PlanilhaImportPage = lazy(() => import('./pages/PlanilhaImportPage').then(m => ({ default: m.PlanilhaImportPage })));
const FiadoPage = lazy(() => import('./pages/FiadoPage').then(m => ({ default: m.FiadoPage })));
const PersonalDashboardPage = lazy(() => import('./pages/PersonalDashboardPage').then(m => ({ default: m.PersonalDashboardPage })));
const ChamadosLojistaPage = lazy(() => import('./pages/ChamadosLojistaPage').then(m => ({ default: m.ChamadosLojistaPage })));
const ConfigCardMachinePage = lazy(() => import('./pages/ConfigCardMachinePage'));
const LojasPage = lazy(() => import('./pages/LojasPage').then(m => ({ default: m.LojasPage })));
const ChamadosAdminPage = lazy(() => import('./pages/ChamadosAdminPage').then(m => ({ default: m.ChamadosAdminPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const PlanosAdminPage = lazy(() => import('./pages/PlanosAdminPage').then(m => ({ default: m.PlanosAdminPage })));
const AprovacaoCadastrosPage = lazy(() => import('./pages/AprovacaoCadastrosPage').then(m => ({ default: m.AprovacaoCadastrosPage })));
const UsuariosAdminPage = lazy(() => import('./pages/UsuariosAdminPage').then(m => ({ default: m.UsuariosAdminPage })));
const ZerarPainelPage = lazy(() => import('./pages/ZerarPainelPage').then(m => ({ default: m.ZerarPainelPage })));
const NotificacoesAdminPage = lazy(() => import('./pages/NotificacoesAdminPage').then(m => ({ default: m.NotificacoesAdminPage })));
const RelatoriosFinanceirosPage = lazy(() => import('./pages/RelatoriosFinanceirosPage').then(m => ({ default: m.RelatoriosFinanceirosPage })));
const InadimplentesPage = lazy(() => import('./pages/InadimplentesPage').then(m => ({ default: m.InadimplentesPage })));
const EquipeAdminPage = lazy(() => import('./pages/EquipeAdminPage').then(m => ({ default: m.EquipeAdminPage })));
const PermissoesAdminPage = lazy(() => import('./pages/PermissoesAdminPage').then(m => ({ default: m.PermissoesAdminPage })));
const ConfiguracoesGeraisAdminPage = lazy(() => import('./pages/ConfiguracoesGeraisAdminPage').then(m => ({ default: m.ConfiguracoesGeraisAdminPage })));
const MonitoramentoPage = lazy(() => import('./pages/MonitoramentoPage').then(m => ({ default: m.MonitoramentoPage })));
const LogsServidorPage = lazy(() => import('./pages/LogsServidorPage').then(m => ({ default: m.LogsServidorPage })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
  </div>
);

function AppFinanceiro() {
  const { activeWorkspace, loading } = useAuth();
  if (loading || !activeWorkspace) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" /></div>;
  }
  if (activeWorkspace.tipo === 'PF') {
    return <FinanceiroPF />;
  }
  return <FinanceiroPage />;
}

function FeatureGuard({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const { isPf } = useAuth();
  const location = useLocation();

  const storeRoutes = ['pdv','caixa','vendas','os','agenda','orcamentos','compras',
    'fornecedores','comissoes','devolucoes','relatorios','estoque','transferencias',
    'inventario','financeiro','clientes','whatsapp','campanhas','fiado'];

  if (isPf && feature !== 'financas_pessoais') {
    const currentPath = location.pathname.replace('/app/', '').split('/')[0];
    if (storeRoutes.includes(currentPath)) {
      return <Navigate to="/app" replace />;
    }
  }

  return <>{children}</>;
}

const RESTRICTED_BLOCKED_PATHS = ['dashboard-pj', 'insights', 'bi', 'relatorios', 'financeiro',
  'planos', 'configuracoes', 'importacao-legada', 'importar-planilha'];

function StoreRoleGuard({ children }: { children: React.ReactNode }) {
  const { isRestrictedRole } = useAuth();
  const location = useLocation();

  if (isRestrictedRole) {
    const currentPath = location.pathname.replace('/app/', '').split('/')[0];
    if (currentPath === '' || RESTRICTED_BLOCKED_PATHS.includes(currentPath)) {
      return <Navigate to="/app/vendas" replace />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        <TwoFactorSetupRedirect />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verificar-email" element={<VerificarEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/catalogo/:tenantId" element={<CatalogoPublicoPage />} />
          <Route path="/portal/:token" element={<PortalPage />} />
          <Route path="/portal" element={<PortalPage />} />
          <Route path="/app/completar-cadastro" element={<ProtectedRoute><CompletarCadastroPage /></ProtectedRoute>} />

          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<StoreRoleGuard><DashboardPage /></StoreRoleGuard>} />
            <Route path="dashboard-pj" element={<StoreRoleGuard><DashboardPJPage /></StoreRoleGuard>} />
            <Route path="pdv" element={<FeatureGuard><PDVPage /></FeatureGuard>} />
            <Route path="caixa" element={<FeatureGuard><CashRegisterPage /></FeatureGuard>} />
            <Route path="vendas" element={<FeatureGuard><VendasPage /></FeatureGuard>} />
            <Route path="os" element={<FeatureGuard><OrdemServicoPage /></FeatureGuard>} />
            <Route path="agenda" element={<FeatureGuard><AgendaPage /></FeatureGuard>} />
            <Route path="orcamentos" element={<FeatureGuard><OrcamentosPage /></FeatureGuard>} />
            <Route path="operacional-pet" element={<OperacionalPetPage />} />
            <Route path="compras" element={<FeatureGuard><ComprasPage /></FeatureGuard>} />
            <Route path="fornecedores" element={<FeatureGuard><FornecedoresPage /></FeatureGuard>} />
            <Route path="comissoes" element={<FeatureGuard><ComissoesPage /></FeatureGuard>} />
            <Route path="devolucoes" element={<FeatureGuard><DevolucoesPage /></FeatureGuard>} />
            <Route path="insights" element={<StoreRoleGuard><InsightsPage /></StoreRoleGuard>} />
            <Route path="bi" element={<StoreRoleGuard><BiPage /></StoreRoleGuard>} />
            <Route path="relatorios" element={<StoreRoleGuard><RelatoriosPage /></StoreRoleGuard>} />
            <Route path="estoque" element={<FeatureGuard><EstoquePage /></FeatureGuard>} />
            <Route path="transferencias" element={<FeatureGuard><TransferenciasPage /></FeatureGuard>} />
            <Route path="inventario" element={<FeatureGuard><InventarioPage /></FeatureGuard>} />
            <Route path="financeiro" element={<StoreRoleGuard><AppFinanceiro /></StoreRoleGuard>} />
            <Route path="clientes" element={<FeatureGuard><ClientesPage /></FeatureGuard>} />
            <Route path="planos" element={<StoreRoleGuard><PlanosPage /></StoreRoleGuard>} />
            <Route path="configuracoes" element={<StoreRoleGuard><ConfiguracoesPage /></StoreRoleGuard>} />
            <Route path="configuracoes/maquininha" element={<StoreRoleGuard><ConfigCardMachinePage /></StoreRoleGuard>} />
            <Route path="whatsapp" element={<FeatureGuard><WhatsAppConfigPage /></FeatureGuard>} />
            <Route path="campanhas" element={<FeatureGuard><CampanhasPage /></FeatureGuard>} />
            <Route path="importacao-legada" element={<StoreRoleGuard><LegacyImportPage /></StoreRoleGuard>} />
            <Route path="importar-planilha" element={<StoreRoleGuard><PlanilhaImportPage /></StoreRoleGuard>} />
            <Route path="fiado" element={<FeatureGuard><FiadoPage /></FeatureGuard>} />
            <Route path="financas-pessoais" element={<PersonalDashboardPage />} />
            <Route path="chamados" element={<ChamadosLojistaPage />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="lojas" element={<LojasPage />} />
            <Route path="chamados" element={<ChamadosAdminPage />} />
            <Route path="auditoria" element={<AuditLogsPage />} />
            <Route path="planos" element={<PlanosAdminPage />} />
            <Route path="aprovar-cadastros" element={<AprovacaoCadastrosPage />} />
            <Route path="usuarios" element={<UsuariosAdminPage />} />
            <Route path="zerar-painel" element={<ZerarPainelPage />} />
            <Route path="notificacoes" element={<NotificacoesAdminPage />} />
            <Route path="relatorios-financeiros" element={<RelatoriosFinanceirosPage />} />
            <Route path="inadimplentes" element={<InadimplentesPage />} />
            <Route path="equipe" element={<EquipeAdminPage />} />
            <Route path="equipe/permissoes" element={<PermissoesAdminPage />} />
            <Route path="configuracoes" element={<ConfiguracoesGeraisAdminPage />} />
            <Route path="monitoramento" element={<MonitoramentoPage />} />
            <Route path="logs" element={<LogsServidorPage />} />
          </Route>

          <Route path="/admin/2fa-setup" element={<ProtectedRoute><TwoFactorSetupPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Redireciona para o setup de 2FA quando o backend responde
 * 403 { twoFactorSetupRequired: true } (produção, admin sem 2FA).
 */
function TwoFactorSetupRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const handler = () => {
      if (location.pathname !== '/admin/2fa-setup') {
        navigate('/admin/2fa-setup', { replace: true });
      }
    };
    window.addEventListener('two_factor_setup_required', handler);
    return () => window.removeEventListener('two_factor_setup_required', handler);
  }, [navigate, location.pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <IdleSession />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
