/**
 * Regras de domínio de estoque centralizadas.
 */

interface ProductStockLike {
  qtdEstoqueAtual: number;
  estoqueMinimo?: number | null;
}

/**
 * Indica se o produto está com estoque baixo (quantidade atual <= mínimo).
 * Quando o mínimo não está configurado (0/nulo), assume o fallback (default 5),
 * replicando o comportamento histórico das telas de estoque.
 */
export function estoqueBaixo(prod: ProductStockLike, fallback = 5): boolean {
  return Number(prod.qtdEstoqueAtual) <= (prod.estoqueMinimo || fallback);
}
