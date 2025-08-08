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
- Gerenciamento de pacientes atribuídos
- Atribuição de programas de intervenção para pacientes
- Registro detalhado da evolução das sessões com gráficos interativos
- Anotações gerais sobre o paciente
- Visualização de gráficos de progresso por área de intervenção
- Geração de relatórios consolidados em PDF
- Comunicação com pais através de chat em tempo real
- Sistema de discussões de caso com outros profissionais
- Gerenciamento de notificações e alertas

### Pais/Responsáveis
- Acesso ao dashboard do(s) filho(s) atribuído(s)
- Visualização de anotações feitas pelo terapeuta
- Acompanhamento do progresso da criança através de gráficos de evolução, organizados por área de intervenção
- Chat direto com terapeutas em tempo real
- Acesso a relatórios de progresso em PDF
- Sistema de notificações sobre atualizações do tratamento

## Tecnologias Utilizadas

### Frontend
- **React 18** - Framework principal
- **Tailwind CSS** - Estilização e responsividade
- **Chart.js** com react-chartjs-2 - Gráficos de evolução interativos
- **chartjs-plugin-annotation** - Anotações em gráficos
- **Axios** - Requisições HTTP
- **React Router DOM** - Roteamento e navegação
- **Socket.IO Client** - Comunicação em tempo real
- **FontAwesome** e **Lucide React** - Ícones
- **jsPDF** com jspdf-autotable - Geração de relatórios PDF
- **JWT Decode** - Decodificação de tokens

### Backend  
- **Node.js** com **Express.js** - Framework do servidor
- **PostgreSQL** - Banco de dados relacional
- **pg** - Driver Node.js para PostgreSQL
- **Socket.IO** - Comunicação em tempo real
- **JWT** - Autenticação com tokens
- **Bcrypt** - Hash de senhas
- **Express-validator** - Validação de dados de entrada
- **Helmet** - Cabeçalhos de segurança
- **CORS** - Configuração de origem cruzada
- **Dotenv** - Gerenciamento de variáveis de ambiente

### Recursos Avançados
- **Arquitetura de Status Normalizado** - Sistema consistente de status de programas (ativo/arquivado/pausado)
- **Context API** - Gerenciamento de estado no React (AuthContext, PatientContext, ProgramContext)
- **Estrutura Hierárquica** - Disciplinas → Áreas → Sub-áreas → Programas
- **Sistema de Notificações** - Badges e painéis de notificação em tempo real
- **Persistência de Seleção** - Manutenção do estado do paciente selecionado

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
│   ├── notificationController.js
│   ├── parentChatController.js
│   ├── parentController.js
│   ├── patientController.js
│   └── programController.js
├── middleware/
│   └── authMiddleware.js   # Middleware de autenticação
├── models/                 # Modelos de dados
│   ├── assignmentModel.js
│   ├── caseDiscussionModel.js
│   ├── clinicModel.js
│   ├── db.js              # Conexão com PostgreSQL
│   ├── notificationStatusModel.js
│   ├── parentChatModel.js
│   ├── patientModel.js
│   ├── programModel.js
│   └── userModel.js
├── routes/                 # Definição de rotas da API
│   ├── adminRoutes.js
│   ├── assignmentRoutes.js
│   ├── authRoutes.js
│   ├── caseDiscussionRoutes.js
│   ├── notificationRoutes.js
│   ├── parentChatRoutes.js
│   ├── parentRoutes.js
│   ├── patientRoutes.js
│   └── programRoutes.js
├── utils/
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
│   ├── notificationApi.js
│   ├── parentApi.js
│   ├── parentChatApi.js
│   ├── patientApi.js
│   └── programApi.js
├── components/            # Componentes React organizados por funcionalidade
│   ├── admin/            # Componentes de administração
│   ├── chat/             # Componentes de chat e discussões
│   ├── layout/           # Componentes de layout (Navbar, Sidebar)
│   ├── notifications/    # Sistema de notificações
│   ├── patient/          # Componentes de pacientes
│   ├── program/          # Componentes de programas e sessões
│   └── shared/           # Componentes compartilhados
├── context/              # Context API para gerenciamento de estado
│   ├── AuthContext.js    # Estado de autenticação
│   ├── PatientContext.js # Estado de pacientes
│   └── ProgramContext.js # Estado de programas
├── hooks/
│   └── useApi.js         # Hook customizado para API
├── pages/                # Componentes de páginas principais
│   ├── AdminPage.js
│   ├── AdminProgramsPage.js
│   ├── ClientsPage.js
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
- **Normalização de Status**: Sistema consistente para status de programas
- **Validação Aprimorada**: Sanitização robusta de dados de entrada
- **Estrutura de Banco Otimizada**: Relacionamentos eficientes e suporte a SSL