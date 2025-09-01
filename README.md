# ABAplay: Plataforma de Intervenção Infantil (SaaS)

O ABAplay é uma aplicação SaaS (Software as a Service) desenvolvida para clínicas de tratamento infantil, com foco em terapias de intervenção baseadas em ABA (Análise do Comportamento Aplicada). A plataforma visa otimizar o gerenciamento de pacientes, atribuição de programas de intervenção, registro de evolução e comunicação entre terapeutas e pais.

## Visão Geral da Aplicação

A aplicação é dividida em dois módulos principais:

- **Backend**: Construído com Node.js e Express, utilizando PostgreSQL como banco de dados. Gerencia dados de usuários, clínicas, pacientes, atribuições de programas e sessões de terapia.
- **Frontend**: Desenvolvido com React 18, oferece interfaces intuitivas para diferentes perfis de usuário, consumindo a API do backend com comunicação em tempo real via Socket.IO.

## Principais Funcionalidades por Perfil

### Administrador
- Cadastro e gerenciamento de clínicas
- Cadastro e gerenciamento de usuários (terapeutas e pais)
- Atribuição de pacientes a terapeutas
- Visão consolidada de todos os pacientes e programas
- Gerenciamento da biblioteca de programas de intervenção
- Controle de acesso e permissões

### Terapeuta
- Gerenciamento completo de pacientes atribuídos
- Atribuição inteligente de programas de intervenção com status normalizado
- Registro avançado de sessões com sistema de níveis de prompting ABA
- Pontuação automática de progresso baseada em níveis de prompting e taxa de sucesso
- Anotações detalhadas e documentação de sessões
- Visualização de gráficos interativos de progresso organizados por área de intervenção
- **Sistema Completo de Relatórios de Evolução Terapêutica**:
  - Relatórios profissionais personalizáveis para todas as disciplinas
  - Configuração única de dados profissionais (CRP, qualificações, assinatura)
  - Seletor de períodos flexível (30/60/90 dias ou personalizado)
  - Análise automática com insights baseados em dados reais
  - Preview editável antes da geração do PDF
  - Geração de PDFs profissionais com formatação consistente
- Geração automatizada de relatórios consolidados em PDF com gráficos e dados de sessão
- Comunicação em tempo real com pais através de chat integrado
- Sistema colaborativo de discussões de caso com outros profissionais
- Gerenciamento centralizado de notificações, alertas de progresso e badges
- Interface de contatos e networking profissional

### Pais/Responsáveis
- Dashboard personalizado com dados do(s) filho(s) atribuído(s)
- Visualização detalhada de anotações e observações do terapeuta
- Acompanhamento visual do progresso através de gráficos interativos organizados por área de intervenção
- Acesso aos dados de níveis de prompting e evolução das sessões
- Chat integrado com comunicação direta e em tempo real com terapeutas
- Download de relatórios consolidados em PDF com visualizações de progresso
- Sistema inteligente de notificações sobre marcos, atualizações e alertas do tratamento
- Interface responsiva otimizada para diferentes dispositivos

## Tecnologias Utilizadas

### Frontend
- **React 18.3.1** - Framework principal com hooks avançados
- **Tailwind CSS 3.4.7** - Estilização utilitária e responsividade
- **Chart.js 4.4.3** com react-chartjs-2 5.2.0 - Gráficos interativos de evolução
- **chartjs-plugin-annotation 3.0.1** - Anotações e marcadores em gráficos
- **Axios 1.11.0** - Cliente HTTP com interceptadores
- **React Router DOM 6.25.1** - Roteamento SPA com lazy loading
- **Socket.IO Client 4.8.1** - Comunicação bidirecional em tempo real
- **FontAwesome 6.5.2** e **Lucide React 0.417.0** - Biblioteca de ícones
- **jsPDF 2.5.1** com jspdf-autotable 3.8.2 - Geração avançada de relatórios PDF
- **JWT Decode 4.0.0** - Decodificação e validação de tokens

### Backend (v1.0.0)
- **Node.js** com **Express.js 4.21.2** - Framework de servidor robusto
- **PostgreSQL** - Banco de dados relacional com constraints avançadas
- **pg 8.15.5** - Driver Node.js para PostgreSQL com pool de conexões
- **Socket.IO 4.8.1** - Comunicação em tempo real bidirecional
- **jsonwebtoken 9.0.2** - Autenticação JWT stateless
- **Bcrypt 5.1.1** - Hash seguro de senhas com salt
- **Express-validator 7.2.1** - Validação e sanitização de dados de entrada
- **Helmet 8.1.0** - Cabeçalhos de segurança HTTP
- **CORS 2.8.5** - Configuração de políticas de origem cruzada
- **Dotenv 16.5.0** - Gerenciamento seguro de variáveis de ambiente
- **Nodemon 2.0.7** - Auto-reload durante desenvolvimento

### Recursos Avançados
- **Sistema de Níveis de Prompting ABA** - 6 níveis de prompting com indicadores visuais e pontuação automática de progresso
- **Arquitetura de Status Normalizado** - Sistema consistente de status de programas com constraints de banco de dados
- **Context API Avançado** - Gerenciamento de estado otimizado (AuthContext, PatientContext, ProgramContext)
- **Estrutura Hierárquica** - Disciplinas → Áreas → Sub-áreas → Programas com navegação intuitiva
- **Sistema de Notificações** - Badges, painéis e alertas de progresso em tempo real com Socket.IO
- **Persistência de Seleção** - Manutenção inteligente do estado do paciente selecionado durante navegação
- **Relatórios PDF Avançados** - Geração automática com gráficos interativos e dados de sessão detalhados
- **Interface Modernizada** - UI aprimorada com animações e componentes responsivos

## Configuração e Execução do Projeto

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)
- PostgreSQL (servidor de banco de dados)

### 1. Configuração do Banco de Dados (PostgreSQL)
Crie um banco de dados PostgreSQL para a aplicação.

No diretório `backend/`, crie um arquivo `.env` com as seguintes variáveis de ambiente:

```bash
DB_USER=seu_usuario
DB_HOST=seu_host_db
DB_DATABASE=seu_nome_db
DB_PASSWORD=sua_senha_db
DB_PORT=5432
DATABASE_URL=postgresql://usuario:senha@host:5432/banco  # Alternativa para produção
JWT_SECRET=sua_chave_secreta_jwt
NODE_ENV=development  # ou production
```

**Observação**: O arquivo `.env` não está incluído no repositório por conter dados sensíveis. Certifique-se de preenchê-lo corretamente.

### 2. Configuração e Execução do Backend
No diretório `backend/`:

```bash
npm install
npm start          # Produção
# ou
npm run dev        # Desenvolvimento com nodemon
```

O servidor backend estará rodando em `http://localhost:3000`.

### 3. Configuração e Execução do Frontend  
No diretório `frontend/`:

```bash
npm install
npm start          # Servidor de desenvolvimento
# ou
npm run build      # Build para produção
npm test           # Executar testes
```

O aplicativo frontend estará rodando em `http://localhost:3001`.

## Estrutura do Projeto

### Backend (`/backend`)
```
src/
├── config/
│   └── db.config.js        # Configurações do banco de dados
├── controllers/            # Controladores da aplicação
│   ├── adminController.js
│   ├── assignmentController.js
│   ├── authController.js
│   ├── caseDiscussionController.js
│   ├── contactController.js    # NOVO: Gerenciamento de contatos
│   ├── notificationController.js
│   ├── parentChatController.js
│   ├── parentController.js
│   ├── patientController.js
│   ├── programController.js
│   └── reportController.js     # NOVO: Relatórios de evolução terapêutica
├── middleware/
│   └── authMiddleware.js   # Middleware de autenticação
├── models/                 # Modelos de dados
│   ├── assignmentModel.js
│   ├── caseDiscussionModel.js
│   ├── clinicModel.js
│   ├── contactModel.js         # NOVO: Modelo de contatos
│   ├── db.js              # Conexão com PostgreSQL
│   ├── notificationStatusModel.js
│   ├── parentChatModel.js
│   ├── patientModel.js
│   ├── programModel.js
│   ├── reportModel.js          # NOVO: Modelo de relatórios com análise automática
│   └── userModel.js
├── routes/                 # Definição de rotas da API
│   ├── adminRoutes.js
│   ├── assignmentRoutes.js
│   ├── authRoutes.js
│   ├── caseDiscussionRoutes.js
│   ├── contactRoutes.js        # NOVO: Rotas de contatos
│   ├── notificationRoutes.js
│   ├── parentChatRoutes.js
│   ├── parentRoutes.js
│   ├── patientRoutes.js
│   ├── programRoutes.js
│   ├── promptLevelRoutes.js    # NOVO: Rotas para níveis de prompting
│   └── reportRoutes.js         # NOVO: Rotas de relatórios
├── utils/
│   ├── promptLevels.js     # NOVO: Definições e cálculos de níveis ABA
│   ├── progressAlerts.js   # NOVO: Sistema de alertas de progresso
│   └── statusNormalizer.js # Utilitário de normalização de status
└── server.js              # Servidor principal com Socket.IO
```

### Frontend (`/frontend`)
```
src/
├── api/                   # Comunicação com a API
│   ├── adminApi.js
│   ├── authApi.js
│   ├── caseDiscussionApi.js
│   ├── contactApi.js          # NOVO: API de contatos
│   ├── notificationApi.js
│   ├── parentApi.js
│   ├── parentChatApi.js
│   ├── patientApi.js
│   ├── programApi.js
│   └── reportApi.js           # NOVO: API de relatórios de evolução
├── components/            # Componentes React organizados por funcionalidade
│   ├── admin/            # Componentes de administração
│   ├── chat/             # Componentes de chat e discussões
│   ├── contacts/         # NOVO: Componentes de contatos
│   ├── layout/           # Componentes de layout (Navbar, Sidebar)
│   ├── notifications/    # Sistema de notificações
│   ├── patient/          # Componentes de pacientes
│   ├── program/          # Componentes de programas e sessões
│   ├── reports/          # NOVO: Componentes de relatórios de evolução
│   └── shared/           # Componentes compartilhados
├── context/              # Context API para gerenciamento de estado
│   ├── AuthContext.js    # Estado de autenticação
│   ├── PatientContext.js # Estado de pacientes
│   └── ProgramContext.js # Estado de programas
├── hooks/
│   ├── useApi.js         # Hook customizado para API
│   └── usePatientNotifications.js # NOVO: Hook de notificações por paciente
├── pages/                # Componentes de páginas principais
│   ├── AdminPage.js
│   ├── AdminProgramsPage.js
│   ├── ClientsPage.js
│   ├── ColleaguesPage.js      # NOVO: Página de colegas e networking
│   ├── ContactsPage.js        # NOVO: Página de contatos
│   ├── DashboardPage.js
│   ├── HomePage.js
│   ├── LoginPage.js
│   ├── NotesPage.js
│   ├── ParentDashboardPage.js
│   ├── ProgramSessionPage.js
│   └── ProgramsPage.js
├── utils/
│   └── pdfGenerator.js   # Geração de relatórios PDF
├── App.js               # Componente principal com roteamento
├── config.js            # Configurações do frontend
└── index.js             # Ponto de entrada da aplicação
```

## Funcionalidades Detalhadas

### Sistema de Relatórios de Evolução Terapêutica (NOVO)
- **Multidisciplinar**: Adequado para psicólogos, fonoaudiólogos, terapeutas ocupacionais, musicoterapeutas, etc.
- **Configuração Única**: Dados profissionais (registro, qualificações, assinatura) salvos uma única vez
- **Persistência de Dados**: Informações do paciente reutilizadas automaticamente
- **Seletor de Períodos**: Análise flexível (30/60/90 dias ou período personalizado)
- **Análise Automática**: Insights baseados em dados reais das sessões com estatísticas detalhadas
- **Preview Editável**: Revisão completa antes da geração do PDF
- **PDFs Profissionais**: Formatação consistente e profissional para todas as páginas
- **Componentes Principais**:
  - `ReportEvolutionModal`: Configuração inicial e seletor de período
  - `ReportPreview`: Preview com seções editáveis
  - `ReportEvolutionContainer`: Orquestração do fluxo completo

### Sistema de Comunicação em Tempo Real
- **Chat Terapeuta-Pai**: Comunicação direta via Socket.IO
- **Discussões de Caso**: Colaboração entre profissionais
- **Notificações Push**: Alertas em tempo real sobre atualizações

### Gerenciamento de Programas
- **Estrutura Hierárquica**: Disciplinas → Áreas → Sub-áreas → Programas
- **Status Normalizados**: Sistema consistente (ativo/arquivado/pausado)
- **Atribuição Inteligente**: Controle de quais programas são atribuídos a cada paciente
- **Materiais e Procedimentos**: Armazenamento em formato JSONB para flexibilidade

### Análise e Relatórios  
- **Gráficos Interativos**: Visualização de progresso com Chart.js
- **Agrupamento por Área**: Organização de dados por especialidade
- **Relatórios PDF**: Geração automática com jsPDF e autotable
- **Métricas de Sessão**: Acompanhamento detalhado de evolução

### Segurança e Autenticação
- **JWT Stateless**: Tokens seguros para autenticação
- **Controle de Acesso**: Middleware para verificação de permissões  
- **Hash de Senhas**: Criptografia com bcrypt
- **Validação de Entrada**: express-validator para sanitização
- **Headers de Segurança**: Helmet para proteção adicional

## Melhoras e Funcionalidades Recentes

### Melhorias na Experiência do Usuário
- **Persistência de Seleção**: Manutenção do estado do paciente selecionado durante navegação
- **Redirecionamento Inteligente**: Roteamento baseado em roles após login
- **Interface Responsiva**: Otimizada para diferentes dispositivos

### Funcionalidades de Comunicação  
- **Chat em Tempo Real**: Socket.IO para comunicação instantânea
- **Sistema de Notificações**: Badges e painéis com contadores em tempo real
- **Discussões de Caso**: Plataforma para colaboração profissional

### Análise e Relatórios
- **Dashboard de Pais**: Gráficos organizados por área de intervenção 
- **Relatórios Consolidados**: PDFs com anotações e gráficos de progresso
- **Visualização Aprimorada**: Charts interativos com anotações

### Gerenciamento de Dados
- **Normalização de Status**: Sistema consistente para status de programas com constraints de banco de dados
- **Validação Aprimorada**: Sanitização robusta de dados de entrada com express-validator
- **Estrutura de Banco Otimizada**: Relacionamentos eficientes, suporte a SSL e integridade referencial

## Melhorias e Correções Recentes

### Sistema de Níveis de Prompting ABA (Novo)
- **6 Níveis de Prompting**: Independente, Dica Verbal, Dica Gestual, Ajuda Física Parcial, Ajuda Física Total, Sem Resposta
- **Indicadores Visuais**: Cores e descrições específicas para cada nível
- **Pontuação Automática**: Cálculo de progresso baseado no nível de prompting e taxa de sucesso
- **Interface Intuitiva**: Componente `PromptLevelSelector` com dropdown interativo

### Correções de Bugs Importantes
- **Erro de Atribuição de Programas**: Corrigida violação de constraint de status no banco de dados
- **Status Normalizado**: Implementação de valores padronizados (active/archived/paused) em inglês
- **Tratamento de Erros**: Melhor handling de erros de duplicação e validação

### Melhorias na Interface de Usuário
- **LoginPage Modernizada**: Novo design com animações e experiência aprimorada
- **Dashboard de Pais Aprimorado**: Gráficos organizados por área de intervenção
- **Relatórios PDF Avançados**: Inclusão de dados de sessão e gráficos de progresso
- **Navegação Intuitiva**: Melhor fluxo de usuário e persistência de estado

### Arquitetura e Performance
- **Context API Otimizado**: Melhor gerenciamento de estado com PatientContext
- **API Error Handling**: Tratamento abrangente de erros em todos os endpoints
- **Socket.IO Integração**: Comunicação em tempo real aprimorada
- **Componentização**: Melhor organização de componentes por funcionalidade

### Sistema de Notificações Avançado
- **Badges Inteligentes**: Indicadores de contagem em tempo real
- **Alertas de Progresso**: Notificações automáticas baseadas em marcos de desenvolvimento
- **Notificações por Paciente**: Sistema granular de notificações específicas

## Funcionalidades Implementadas Recentemente (2024)

### ✅ Sistema Completo de Relatórios de Evolução Terapêutica
- **Problema Resolvido**: Necessidade de relatórios profissionais para diferentes disciplinas
- **Solução**: Sistema completo multidisciplinar com análise automática e geração de PDFs
- **Impacto**: Profissionais podem gerar relatórios detalhados em minutos ao invés de horas

### ✅ Correções de Persistência de Dados
- **Problema Resolvido**: Dados de usuário e paciente não persistiam no sistema de relatórios
- **Solução**: Atualização dos models para retornar campos complementares (professional_id, qualifications, guardian_name, etc.)
- **Impacto**: Dados preenchidos uma vez são reutilizados automaticamente

### ✅ Formatação Profissional de PDFs
- **Problema Resolvido**: Inconsistências de formatação entre páginas dos relatórios
- **Solução**: Sistema de preservação de contexto de formatação e espaçamentos padronizados
- **Impacto**: PDFs com aparência profissional e consistente

### ✅ Aceitação de Termos para Administradores
- **Problema Resolvido**: Termos de uso não persistiam, obrigando re-aceitação a cada login
- **Solução**: Correção do userModel.js para retornar campos terms_accepted_at
- **Impacto**: Administradores aceitam termos apenas uma vez

### ✅ Sistema de Cores Padronizado
- **Problema Resolvido**: Botão de relatório consolidado sem cor definida
- **Solução**: Adição da cor purple ao sistema de cores dos ActionCards
- **Impacto**: Interface mais harmoniosa e profissional