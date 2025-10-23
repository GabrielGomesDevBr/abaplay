# ABAPlay - Plataforma Completa para Clínicas de Intervenção Infantil

> Software profissional para gestão de clínicas de ABA, fonoaudiologia, terapia ocupacional e psicologia infantil.

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D12.0-blue.svg)](https://www.postgresql.org)

---

## 🚀 Sobre o ABAPlay

ABAPlay é uma plataforma SaaS multi-tenant completa para clínicas de terapia infantil, focada em **eficiência operacional**, **registro profissional** e **engajamento familiar**. Desenvolvida para clínicas de ABA (Análise do Comportamento Aplicada), fonoaudiologia, terapia ocupacional, psicologia e outras especialidades de intervenção pediátrica.

### ✨ Principais Recursos

- **🗓️ Agendamento Inteligente**
  - Recorrências automáticas (semanal, quinzenal, mensal)
  - Busca inteligente de disponibilidade por especialidade
  - Detecção automática de conflitos e sessões órfãs
  - Reagendamento em lote
  - Gestão de ausências e disponibilidade de terapeutas
  - Economiza até 80% do tempo em tarefas administrativas

- **📊 Registro de Sessões ABA-Compliant**
  - Sistema de 6 níveis de prompting (Independente → Sem Resposta)
  - Análise automática de progresso com indicadores visuais
  - Gráficos interativos por área de intervenção
  - Registro em tempo real via mobile

- **📄 Relatórios Profissionais**
  - PDFs personalizáveis com gráficos e insights baseados em dados
  - Relatórios consolidados para escolas, médicos e pais
  - Relatórios de evolução terapêutica multidisciplinares
  - Análise automática com sugestões inteligentes
  - Preview editável antes da geração

- **💬 Comunicação em Tempo Real**
  - Chat terapeuta-pais com notificações push
  - Discussões de caso entre profissionais da equipe
  - Sistema de notificações mobile-first
  - Histórico completo de conversas

- **📚 Biblioteca de Programas**
  - Acesso a 500+ programas de intervenção baseados em evidências
  - Criação de programas personalizados por clínica
  - Hierarquia organizada: Disciplinas → Áreas → Sub-áreas → Programas
  - Materiais e procedimentos inclusos

- **👨‍👩‍👧 Portal dos Pais**
  - Acompanhamento visual do progresso em tempo real
  - Acesso a gráficos de evolução organizados por área
  - Download de relatórios profissionais
  - Chat direto com terapeutas

- **📱 Mobile-First Design**
  - Interface otimizada para tablets e smartphones
  - Touch targets WCAG 2.1 AA compliant (mínimo 44px)
  - Navegação bottom sheet para mobile
  - Responsivo em todos os dispositivos

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Backend:**
- Node.js 16+ com Express.js
- PostgreSQL 12+ (queries SQL diretas, sem ORM)
- Socket.IO para comunicação em tempo real
- JWT para autenticação stateless
- Bcrypt para hashing de senhas

**Frontend:**
- React 18 com hooks avançados
- Tailwind CSS 3.4.7 para estilização
- Chart.js 4.4.3 para gráficos interativos
- jsPDF 2.5.1 para geração de PDFs
- Axios 1.11.0 para requisições HTTP
- Socket.IO Client 4.8.1 para WebSocket

**Infraestrutura:**
- Multi-tenant com isolamento por `clinic_id`
- Real-time updates via WebSocket
- SSL/TLS para conexões seguras
- Logs sanitizados (sem exposição de dados sensíveis)

### Estrutura do Projeto

```
abaplay/
├── backend/              # API REST + WebSocket Server
│   ├── src/
│   │   ├── controllers/  # Lógica de negócio
│   │   ├── models/       # Queries ao banco de dados
│   │   ├── routes/       # Definição de endpoints
│   │   ├── middleware/   # Autenticação e validação
│   │   ├── jobs/         # Background jobs (cron)
│   │   └── utils/        # Utilitários e helpers
│   ├── migrations/       # SQL migrations (versionamento de schema)
│   └── package.json
│
├── frontend/             # Single Page Application (React)
│   ├── src/
│   │   ├── components/   # Componentes React organizados por feature
│   │   ├── pages/        # Páginas principais da aplicação
│   │   ├── context/      # Context API (state management)
│   │   ├── api/          # Clientes HTTP para comunicação com backend
│   │   ├── hooks/        # Custom React hooks
│   │   └── utils/        # Utilitários e helpers
│   └── package.json
│
└── landing/              # Landing page estática
    ├── public/           # HTML, CSS, JS, assets
    ├── api/              # API do chat especialista
    └── package.json
```

---

## ⚙️ Configuração e Instalação

### Pré-requisitos

- **Node.js** 16.0.0 ou superior
- **PostgreSQL** 12.0 ou superior
- **npm** ou **yarn** (gerenciador de pacotes)
- **Git** (para clonar o repositório)

### 1. Configuração do Backend

```bash
# Navegar para o diretório do backend
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

**Variáveis de Ambiente (.env):**

```bash
# Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=abaplay_db
DATABASE_URL=postgresql://usuario:senha@host:5432/banco  # Alternativa

# Autenticação
JWT_SECRET=sua_chave_secreta_super_segura_aqui

# Ambiente
NODE_ENV=production  # ou development

# Features
ENABLE_AUTO_DETECTION=true          # Detecção automática de sessões órfãs
DETECTION_INTERVAL_MINUTES=30       # Intervalo do job (minutos)
DETECTION_LOOKBACK_HOURS=24         # Olhar quantas horas para trás
MISSED_AFTER_HOURS=2                # Marcar como perdido após X horas
ENABLE_SUBSCRIPTION_MODULES=true    # Módulos de assinatura

# Frontend (para CORS)
FRONTEND_URL=https://abaplay.app.br
```

**Iniciar o servidor:**

```bash
npm start          # Produção
npm run dev        # Desenvolvimento (com nodemon)
```

Servidor rodando em `http://localhost:3000`

### 2. Configuração do Frontend

```bash
# Navegar para o diretório do frontend
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start          # http://localhost:3001

# Ou build para produção
npm run build
```

**Configuração de API (src/config.js):**

O frontend detecta automaticamente o ambiente:
- **Desenvolvimento:** `http://localhost:3000/api`
- **Produção:** `https://abaplay-backendv2.onrender.com/api`

### 3. Configuração da Landing Page (Opcional)

```bash
# Navegar para o diretório da landing page
cd landing

# Instalar dependências
npm install

# Configurar variáveis de ambiente (.env)
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
PORT=3002

# Iniciar API do chat
npm start          # http://localhost:3002
```

---

## 🗄️ Banco de Dados

### Estrutura do Schema

O ABAPlay utiliza **PostgreSQL** com queries SQL diretas (sem ORM) para máximo controle e performance.

**Hierarquia de Programas:**
```
Disciplinas (ABA, Fono, T.O., Psico, etc.)
    └── Áreas (Comunicação, Social, Motora, etc.)
        └── Sub-áreas (Expressiva, Receptiva, etc.)
            └── Programas (500+ programas individuais)
```

**Multi-tenancy:**
- Isolamento completo por `clinic_id`
- Programas globais acessíveis por todas as clínicas
- Programas customizados isolados por clínica

**Principais Entidades:**
- `clinics`, `users`, `patients` - Entidades base
- `therapist_patient_assignments` - Atribuição terapeuta-paciente
- `patient_program_assignments` - Atribuição de programas
- `scheduled_sessions`, `recurring_appointment_templates` - Agendamento
- `therapist_availability`, `therapist_absences`, `therapist_specialties` - Disponibilidade
- `patient_program_progress` - Registro de sessões
- `case_discussions`, `parent_chats`, `notifications` - Comunicação

### Migrations

As migrations estão organizadas em:
- `/backend/migrations/legacy/` - Migrations históricas (já aplicadas)
- `/backend/migrations/hotfixes/` - Correções pontuais (já aplicadas)

**⚠️ IMPORTANTE:** O banco de dados em produção já possui todas as migrations aplicadas. Consulte `/backend/migrations/README_MIGRATIONS.md` para detalhes.

---

## 👥 Perfis de Usuário

### 🔧 Administrador
- Gestão de clínicas e configurações globais
- Cadastro e gerenciamento de usuários (terapeutas e pais)
- Atribuição de pacientes a terapeutas
- Gerenciamento da biblioteca de programas (global + customizados)
- Controle de planos de assinatura e trials
- Visão consolidada de métricas e relatórios
- Gestão de disponibilidade e ausências da equipe

### 👨‍⚕️ Terapeuta
- Gerenciamento de pacientes atribuídos
- Atribuição de programas de intervenção
- Registro avançado de sessões com níveis de prompting ABA
- Criação de agendamentos recorrentes automáticos
- Busca inteligente de horários disponíveis
- Geração de relatórios profissionais (consolidados e evolução)
- Chat em tempo real com pais
- Discussões de caso com equipe
- Dashboard com métricas de progresso

### 👨‍👩‍👧 Pais/Responsáveis
- Dashboard personalizado com dados do(s) filho(s)
- Visualização de gráficos de progresso por área
- Acesso a anotações e observações do terapeuta
- Download de relatórios profissionais em PDF
- Chat direto com terapeutas
- Notificações sobre marcos e atualizações do tratamento

---

## 🔒 Segurança

O ABAPlay implementa múltiplas camadas de segurança:

- **Autenticação JWT**: Tokens stateless com expiração configurável
- **Hashing de Senhas**: Bcrypt com salt rounds configuráveis
- **Validação de Entrada**: express-validator em todos os endpoints
- **Headers de Segurança**: Helmet configurado para produção
- **CORS**: Políticas de origem cruzada por ambiente
- **Controle de Acesso**: Middleware role-based para autorização
- **Logs Sanitizados**: Zero exposição de dados sensíveis no console
- **SSL/TLS**: Conexões criptografadas com banco de dados
- **Multi-device Sync**: Dados profissionais sincronizados com segurança

---

## 📚 Documentação

- **[CLAUDE.md](CLAUDE.md)** - Guia técnico completo para desenvolvimento (arquitetura, padrões, convenções, estrutura de código)
- **[CHANGELOG.md](CHANGELOG.md)** - Histórico detalhado de versões e mudanças
- **[DEPLOY_LANDING_RENDER.md](DEPLOY_LANDING_RENDER.md)** - Instruções de deploy da landing page
- **[/backend/migrations/README_MIGRATIONS.md](backend/migrations/README_MIGRATIONS.md)** - Documentação do schema e migrations

---

## 🚀 Deploy

### Backend (Render.com)
```bash
# Build Command:
npm install

# Start Command:
npm start

# Environment Variables:
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
NODE_ENV=production
FRONTEND_URL=https://abaplay.app.br
ENABLE_AUTO_DETECTION=true
ENABLE_SUBSCRIPTION_MODULES=true
```

### Frontend (Render.com ou Vercel)
```bash
# Build Command:
npm install && npm run build

# Publish Directory:
build

# Environment Variables:
REACT_APP_API_URL=https://abaplay-backendv2.onrender.com/api
REACT_APP_SOCKET_URL=https://abaplay-backendv2.onrender.com
```

### Landing Page
Ver [DEPLOY_LANDING_RENDER.md](DEPLOY_LANDING_RENDER.md)

---

## 🛠️ Scripts Úteis

### Backend
```bash
npm start          # Iniciar servidor em produção
npm run dev        # Iniciar com nodemon (auto-reload)
```

### Frontend
```bash
npm start          # Servidor de desenvolvimento (port 3001)
npm run build      # Build para produção
npm test           # Executar testes
```

---

## 📊 Planos e Módulos

O ABAPlay oferece dois planos de assinatura:

### ABAPlay Essencial (R$ 15/paciente/mês)
- Gestão completa de agendamentos
- Registro de sessões com anotações
- Relatórios gerenciais em PDF
- Notificações em tempo real
- Calendário completo da clínica

### ABAPlay Pro (R$ 35/paciente/mês)
- **Tudo do Essencial, mais:**
- Biblioteca de 500+ programas de intervenção
- Registro de sessões com níveis de prompting ABA
- Gráficos de evolução por área
- Relatórios profissionais avançados
- Chat em tempo real com pais
- Discussões de caso (equipe)
- Dashboard de gestão completo
- Portal completo para pais

**Trial Gratuito:** 7 dias de acesso completo ao plano Pro, sem cartão de crédito.

---

## 🤝 Contribuição

Este é um projeto proprietário. Para contribuições ou sugestões, entre em contato com a equipe de desenvolvimento.

---

## 📄 Licença

**Proprietary License** - © 2025 ABAPlay. Todos os direitos reservados.

Este software é proprietário e confidencial. Uso não autorizado, cópia, distribuição ou modificação são estritamente proibidos.

---

## 📧 Suporte e Contato

- **Email:** abaplayoficial@gmail.com
- **WhatsApp:** (11) 98854-3437
- **Website:** https://abaplay.app.br
- **Landing Page:** https://info.abaplay.app.br

---

## 🎯 Status do Projeto

- ✅ **Backend:** Estável e em produção
- ✅ **Frontend:** Estável e em produção
- ✅ **Landing Page:** Ativa em vendas.abaplay.app.br
- ✅ **Banco de Dados:** Schema v2.2.0 consolidado
- ✅ **Documentação:** Completa e atualizada

---

**Desenvolvido com ❤️ para clínicas de terapia infantil que buscam excelência operacional e clínica.**
