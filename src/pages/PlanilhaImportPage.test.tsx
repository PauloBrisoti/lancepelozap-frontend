import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanilhaImportPage } from './PlanilhaImportPage';

const mockFetch = vi.fn();
vi.mock('../lib/api', () => ({
  fetchApi: (...args: any[]) => mockFetch(...args),
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createFile(name = 'test.xlsx') {
  return new File(['fake-content'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function renderPage() {
  const result = render(<PlanilhaImportPage />);
  const fileInput = result.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  return { ...result, fileInput };
}

function selectFile(fileInput: HTMLInputElement, file: File) {
  fireEvent.change(fileInput, { target: { files: [file] } });
}

describe('PlanilhaImportPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders title and upload area', () => {
    renderPage();
    expect(screen.getByText('Importar Planilha')).toBeInTheDocument();
    expect(screen.getByText(/Faça upload da planilha/)).toBeInTheDocument();
    expect(screen.getByText('Clique para selecionar o arquivo')).toBeInTheDocument();
  });

  it('shows file name after selection and shows action buttons', () => {
    const { fileInput } = renderPage();
    selectFile(fileInput, createFile());
    expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    expect(screen.getByText('Visualizar Preview')).toBeInTheDocument();
    expect(screen.getByText('Importar Direto')).toBeInTheDocument();
  });

  it('shows loading state on preview button', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    const { fileInput } = renderPage();
    selectFile(fileInput, createFile());
    fireEvent.click(screen.getByText('Visualizar Preview'));
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('shows preview results after successful preview', async () => {
    const previewData = {
      data: {
        preview: [
          { name: 'PRODUTOS', type: 'PRODUTOS', columns: ['Nome', 'Preço'], rowCount: 5 },
          { name: 'CLIENTES', type: 'CLIENTES', columns: ['Nome', 'Telefone'], rowCount: 3 },
        ],
        warnings: ['Coluna "Preço" mapeada como precoVendaSugerido'],
        errors: [],
      },
    };
    mockFetch.mockResolvedValueOnce(previewData);
    const { fileInput } = renderPage();
    selectFile(fileInput, createFile());
    fireEvent.click(screen.getByText('Visualizar Preview'));
    await waitFor(() => {
      expect(screen.getByText('PRODUTOS')).toBeInTheDocument();
      expect(screen.getByText('CLIENTES')).toBeInTheDocument();
    });
    expect(screen.getByText(/Total: ~8 linhas/)).toBeInTheDocument();
    expect(screen.getByText(/1 Aviso/)).toBeInTheDocument();
    expect(screen.getByText('Confirmar Importação (8 linhas)')).toBeInTheDocument();
  });

  it('shows import summary after successful import', async () => {
    const importData = {
      data: {
        preview: [{ name: 'PRODUTOS', type: 'PRODUTOS', columns: [], rowCount: 5 }],
        imported: { produtos: 5, clientes: 3 },
        warnings: [],
        errors: [],
      },
    };
    mockFetch.mockResolvedValueOnce(importData);
    const { fileInput } = renderPage();
    selectFile(fileInput, createFile());
    fireEvent.click(screen.getByText('Importar Direto'));
    await waitFor(() => {
      expect(screen.getByText('Importação Concluída')).toBeInTheDocument();
    });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows validation errors when present', async () => {
    const errorData = {
      data: {
        preview: [{ name: 'PRODUTOS', type: 'PRODUTOS', columns: ['Nome'], rowCount: 1 }],
        warnings: [],
        errors: [
          { sheet: 'PRODUTOS', row: 2, field: 'precoVenda', message: 'Preço inválido' },
        ],
      },
    };
    mockFetch.mockResolvedValueOnce(errorData);
    const { fileInput } = renderPage();
    selectFile(fileInput, createFile());
    fireEvent.click(screen.getByText('Visualizar Preview'));
    await waitFor(() => {
      expect(screen.getByText(/1 Erro/)).toBeInTheDocument();
      expect(screen.getByText(/PRODUTOS linha 2/)).toBeInTheDocument();
    });
  });
});
