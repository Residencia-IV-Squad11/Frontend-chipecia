Chip & Cia — Dashboard de Qualidade de Atendimento

Interface web para análise e monitoramento da qualidade dos atendimentos da Chip & Cia, utilizando inteligência artificial para avaliar transcrições de conversas e gerar métricas de desempenho.


Visão Geral

O sistema permite que gestores e auditores de qualidade submetam transcrições de atendimentos ao cliente, recebendo de volta uma análise automática com:


Score geral de qualidade do atendimento
Sentimento da interação (positivo, neutro ou negativo)
Métricas detalhadas: empatia, clareza, objetividade e resolutividade
Resumo gerado por IA sobre o atendimento
Categorização automática do tipo de chamado


Os dados são exibidos em um dashboard com gráficos e histórico paginado.


Tecnologias

CamadaTecnologiaFrameworkReact 19 + TypeScriptBuildVite 7EstilizaçãoTailwind CSS v4Componentes UIRadix UI + shadcn/uiRoteamentoWouterEstado e cacheTanStack Query (React Query)GráficosRechartsAnimaçõesFramer MotionFormuláriosReact Hook Form + ZodÍconesLucide React


Estrutura do Projeto

src/
├── App.tsx                    # Configuração de rotas e providers
├── main.tsx                   # Entry point
├── index.css                  # Estilos globais e tokens de design
├── lib/
│   ├── api.ts                 # Cliente HTTP e tipagens da API
│   └── utils.ts               # Funções utilitárias
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx        # Navegação lateral colapsável
│   │   └── page-layout.tsx    # Layout base das páginas
│   └── ui/                    # Componentes de design system (shadcn/ui)
├── pages/
│   ├── dashboard.tsx          # Visão geral com KPIs e gráficos
│   ├── new-analysis.tsx       # Formulário de envio de transcrição
│   ├── history.tsx            # Histórico paginado de atendimentos
│   ├── settings.tsx           # Configurações da plataforma
│   └── not-found.tsx          # Página 404
└── hooks/
    ├── use-mobile.tsx
    └── use-toast.ts


Páginas

/ — Dashboard

Visão geral com KPIs (total de atendimentos, score médio), gráfico de linha com evolução das métricas de qualidade ao longo do tempo, gráfico de pizza com distribuição de sentimentos e lista dos atendimentos mais recentes.

/nova-analise — Nova Análise

Formulário para submissão de uma transcrição. O usuário pode informar opcionalmente o número de protocolo e categoria. A IA processa o texto e retorna o resultado na mesma tela com score, métricas e resumo.

/historico — Histórico

Listagem paginada de todos os atendimentos já analisados, com filtros por sentimento.

/configuracoes — Configurações

Painel para ajuste de parâmetros de análise (SLA padrão, idioma). Configurações de prompt base são restritas a administradores.


Pré-requisitos


Node.js 18+
pnpm (recomendado) ou npm



Instalação e Execução

bash# Clone o repositório
git clone <url-do-repositorio>
cd Frontend-chipecia-main

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev

A aplicação estará disponível em http://localhost:5173.


Variáveis de Ambiente

Crie um arquivo .env na raiz do projeto:

env# URL base da API backend (padrão: /api via proxy)
VITE_API_URL=https://backend-chip-cia.onrender.com

# Caminho base da aplicação (padrão: /)
BASE_PATH=/


Em desenvolvimento, o Vite já realiza proxy das requisições /api para o backend configurado em vite.config.ts. Em produção, defina VITE_API_URL com a URL completa do backend.




Scripts Disponíveis

ComandoDescriçãopnpm devInicia o servidor de desenvolvimentopnpm buildGera o build de produção em dist/publicpnpm serveServe o build de produção localmentepnpm typecheckVerifica tipos TypeScript sem emitir arquivos


Integração com a API

O cliente da API está centralizado em src/lib/api.ts e se comunica com o backend nos seguintes endpoints:

EndpointMétodoDescrição/api/dashboard/resumoGETDados para o dashboard (KPIs, sentimentos, histórico recente)/api/atendimento/fila?status=concluidoGETListagem de atendimentos concluídos/api/atendimento/avaliarPOSTEnvia transcrição para análise pela IA/api/atendimento/:idGETDetalhe de um atendimento específico


Build para Produção

bashpnpm build

Os arquivos estáticos serão gerados em dist/public e podem ser servidos por qualquer servidor web estático (Nginx, Vercel, Netlify, etc.).
