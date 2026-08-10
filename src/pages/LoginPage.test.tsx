import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockFetch = vi.fn();

vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: '' }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

function renderPage() {
  return render(<LoginPage />);
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título e formulário', () => {
    renderPage();
    expect(screen.getByText('Acesse sua conta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Entrar no Sistema')).toBeInTheDocument();
  });

  it('chama API de login no submit e navega para /app', async () => {
    mockFetch.mockResolvedValueOnce({ user: { role: 'USER', email: 'test@lpzteste.app' } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'test@lpzteste.app' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Entrar no Sistema'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ method: 'POST' }));
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  it('navega para /admin quando role é SUPER_ADMIN', async () => {
    mockFetch.mockResolvedValueOnce({ user: { role: 'SUPER_ADMIN' } });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'admin@lpzteste.app' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByText('Entrar no Sistema'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('entra em modo 2FA quando require2FA é true', async () => {
    mockFetch.mockResolvedValueOnce({ require2FA: true, tempToken: 'token-2fa' });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'test@lpzteste.app' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Entrar no Sistema'));

    await waitFor(() => {
      expect(screen.getByText('Código do Authenticator')).toBeInTheDocument();
      expect(screen.getByText('Validar Código')).toBeInTheDocument();
    });
  });

  it('submete código 2FA e navega', async () => {
    mockFetch.mockResolvedValueOnce({ require2FA: true, tempToken: 'token-2fa' });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'test@lpzteste.app' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Entrar no Sistema'));

    await waitFor(() => {
      expect(screen.getByText('Validar Código')).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({ user: { role: 'USER' } });
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Validar Código'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/auth/2fa/validate', expect.objectContaining({ method: 'POST' }));
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  it('mostra erro quando login falha', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Credenciais inválidas'));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'test@lpzteste.app' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Entrar no Sistema'));

    await waitFor(() => {
      expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
    });
  });

  it('mostra link "Esqueceu a senha?" e alterna para forgot mode', () => {
    renderPage();
    fireEvent.click(screen.getByText('Esqueceu a senha?'));
    expect(screen.getByText('Recuperar Senha')).toBeInTheDocument();
    expect(screen.getByText('Enviar Link de Recuperação')).toBeInTheDocument();
  });

  it('envia forgot-password e mostra confirmação', async () => {
    mockFetch.mockResolvedValueOnce({ message: 'ok' });
    renderPage();

    fireEvent.click(screen.getByText('Esqueceu a senha?'));
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'forgot@lpzteste.app' } });
    fireEvent.click(screen.getByText('Enviar Link de Recuperação'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/auth/forgot-password', expect.objectContaining({ method: 'POST' }));
      expect(screen.getByText(/Se o email existir no sistema/)).toBeInTheDocument();
    });
  });

  it('volta ao login pelo link no forgot mode', () => {
    renderPage();
    fireEvent.click(screen.getByText('Esqueceu a senha?'));
    expect(screen.getByText('Recuperar Senha')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Voltar ao Login'));
    expect(screen.getByText('Acesse sua conta')).toBeInTheDocument();
  });
});
