# 💻 Lance Pelo Zap — Frontend Web Client

Interface web moderna, responsiva e de alta performance desenvolvida para a plataforma SaaS de controle financeiro e gestão operacional **Lance Pelo Zap**.

---

## 🛠️ Stack Tecnológica & Arquitetura

* **Framework & Bundler:** React 18, Vite
* **Linguagem:** TypeScript (Tipagem estrita em componentes, formulários e fluxos da API)
* **Estilização & UI:** TailwindCSS, PostCSS, Lucide Icons
* **Roteamento & Estado:** React Router DOM, Custom Hooks modulares
* **Testes & Qualidade:** Vitest, Testing Library, ESLint flat config
* **Deploy & Web Server:** Nginx (SPA routing fallback e otimização de assets estáticos), Docker

---

## 📊 Módulos e Funcionalidades

* **Painéis Financeiros & DRE em Tempo Real:**
  * Dashboards interativos para acompanhamento de Receita Bruta, Receita Líquida, CMV e Margens.
  * Visualização de fluxo de caixa projetado, conciliação multiformas e controle de inadimplência.

* **Frente de Caixa & Operações Rápidas:**
  * Interface para rascunhos de venda (`useSaleDraft`), orçamentos e emissão simplificada.
  * Gestão de configurações multiloja (`useStoreConfig`) e controle de acessos de operadores.

* **Experiência do Usuário (UX/UI):**
  * Design system responsivo com suporte a estados de carregamento, validações em tempo real e prevenção de erros em transações financeiras.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js 18+
* npm, pnpm ou yarn

### Instalação e Execução
\`\`\`bash
# Clonar o repositório
git clone git@github.com:PauloBrisoti/lancepelozap-frontend.git

# Instalar as dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
\`\`\`
