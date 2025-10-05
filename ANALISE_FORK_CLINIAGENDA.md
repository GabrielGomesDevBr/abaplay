# 📊 Análise de Viabilidade: Fork do Módulo de Agendamento ABAplay → CliniAgende

**Data**: 2025-10-05
**Versão**: 1.0
**Status**: Análise Completa - Aguardando Decisão

---

## 📑 Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Análise Técnica de Separação](#2-análise-técnica-de-separação)
3. [Arquitetura Recomendada: Monorepo](#3-arquitetura-recomendada-monorepo)
4. [Estratégia de Banco de Dados](#4-estratégia-de-banco-de-dados)
5. [Modelo de Assinatura CliniAgende](#5-modelo-de-assinatura-cliniagenda)
6. [Diferenciação de Marca e Posicionamento](#6-diferenciação-de-marca-e-posicionamento)
7. [Guia de Implementação Passo a Passo](#7-guia-de-implementação-passo-a-passo)
8. [Cronograma Detalhado](#8-cronograma-detalhado)
9. [Gestão de Riscos](#9-gestão-de-riscos)
10. [Análise Financeira](#10-análise-financeira)
11. [Checklist de Decisão](#11-checklist-de-decisão)
12. [Conclusão e Recomendações](#12-conclusão-e-recomendações)

---

## 1. 📋 Resumo Executivo

### 🎯 Objetivo
Criar **CliniAgende**, uma aplicação de agendamento para clínicas gerais (psicólogos, nutricionistas, dentistas, etc.), reutilizando o módulo de agendamento do **ABAplay** (focado em TEA/ABA).

### ✅ Viabilidade
**ALTA** - Tecnicamente viável, estrategicamente interessante, financeiramente atrativo.

### ⏱️ Esforço Estimado
**2-3 semanas** de desenvolvimento (vs. 3-6 meses construindo do zero)

### 💰 Economia
Aproximadamente **80% de redução** em tempo e custo de desenvolvimento.

### 🏗️ Arquitetura Recomendada
**Monorepo compartilhado** com pacotes reutilizáveis e aplicações independentes.

### 📊 Potencial de Mercado
- **ABAplay**: Nicho premium (~500-1000 clínicas TEA no Brasil)
- **CliniAgende**: Mercado amplo (~50.000+ clínicas/consultórios no Brasil)
- **Multiplicador**: Mercado 50-100x maior

### 🎨 Estratégia
- **ABAplay**: Premium TEA (R$ 10-35/paciente) - Upsell intensivo
- **CliniAgende**: Volume alto (R$ 8-15/profissional) - Simplicidade

---

## 2. 🔍 Análise Técnica de Separação

### 2.1 Componentes 100% Compartilháveis

Estes componentes podem ser **reutilizados sem modificações** entre ABAplay e CliniAgende:

#### 🖥️ Backend Compartilhável (~70% do código)

| Módulo | Arquivos | Motivo |
|--------|----------|--------|
| **Autenticação** | `authModel.js`, `authController.js`, `authRoutes.js`, `authMiddleware.js` | JWT é genérico |
| **Agendamento** | `appointmentModel.js`, `appointmentController.js`, `appointmentRoutes.js` | Core do produto |
| **Assinaturas** | Todos os arquivos da migration 007 | Sistema pronto e testado! |
| **Clínicas** | `clinicModel.js`, `clinicController.js`, `clinicRoutes.js` | Multi-tenant genérico |
| **Usuários** | `userModel.js`, `userController.js`, `userRoutes.js` | RBAC genérico |
| **Notificações** | `notificationModel.js`, Socket.IO | Genérico |
| **Jobs** | `sessionMaintenanceJob.js`, `trialExpirationJob.js` | Reutilizáveis |
| **Middleware** | `verifyToken.js`, `requireSuperAdmin.js`, `subscriptionMiddleware.js` | Genéricos |
| **Database** | `db.js` (Pool PostgreSQL) | Infraestrutura |

**Total estimado**: 42 arquivos reutilizáveis (de 60 arquivos backend)

#### 🎨 Frontend Compartilhável (~65% do código)

| Módulo | Arquivos | Motivo |
|--------|----------|--------|
| **Contextos** | `AuthContext.js`, `NotificationContext.js` | Lógica genérica |
| **Componentes de Agendamento** | `Calendar.js`, `AppointmentForm.js`, `AppointmentList.js`, `WeeklySchedule.js`, `DaySchedule.js` | Core do produto |
| **Componentes de Assinatura** | `PlanBadge.js` | Sistema de assinatura compartilhado |
| **Componentes Compartilhados** | `BottomNavigation.js`, `Navbar.js`, `PrivateRoute.js`, `LoadingSpinner.js` | UI genérica |
| **Componentes de Usuários** | `UserList.js`, `UserForm.js`, `ClinicForm.js` | CRUD genérico |
| **API Clients** | `authApi.js`, `appointmentApi.js`, `subscriptionApi.js` | Endpoints compartilhados |
| **Utils** | `dateUtils.js`, `formatters.js`, `validators.js` | Utilitários |
| **Estilos** | Tailwind CSS config, classes compartilhadas | Design system |

**Total estimado**: 35 arquivos reutilizáveis (de 55 arquivos frontend)

---

### 2.2 Componentes Específicos ABAplay (❌ Não Migrar)

Estes devem **permanecer exclusivos** do ABAplay:

#### Backend ABAplay
- ❌ `programModel.js`, `programController.js`, `programRoutes.js`
- ❌ `sessionModel.js`, `sessionController.js`, `sessionRoutes.js`
- ❌ `chatModel.js`, `chatController.js`, `chatRoutes.js`
- ❌ `reportModel.js` (relatórios específicos ABA: ABC, reforçadores)
- ❌ Migrations específicas TEA (patient medical history, medications)

#### Frontend ABAplay
- ❌ `ProgramsPage.js`, `ProgramForm.js`, `ProgramList.js`
- ❌ `SessionRecordingPage.js`, `SessionForm.js`
- ❌ `ChatPage.js`
- ❌ `ABCReportPage.js`, `ReinforcerAnalysis.js`
- ❌ `PatientEvolutionCharts.js` (gráficos de evolução TEA)
- ❌ Contextos: `ProgramContext.js`, `SessionContext.js`

**Total**: ~30% do código é específico de TEA/ABA

---

### 2.3 Adaptações Necessárias para CliniAgende

#### 🏷️ A. Mudanças de Terminologia

| Contexto | ABAplay (TEA) | CliniAgende (Geral) | Mudança no Código |
|----------|---------------|---------------------|-------------------|
| **Profissional** | Terapeuta | Médico / Profissional / Especialista | Labels UI, variáveis opcionalmente |
| **Intervenção** | Programa ABA | ❌ (não existe) | Remover completamente |
| **Atendimento** | Sessão de terapia | Consulta / Atendimento | Labels UI |
| **Cliente** | Paciente | Paciente ✅ | Manter (termo universal) |
| **Estabelecimento** | Clínica ABA | Clínica / Consultório | Labels UI |

**Implementação**:
```javascript
// config/terminology.js
export const TERMINOLOGY = {
  abaplay: {
    professional: 'Terapeuta',
    appointment: 'Sessão',
    clinic: 'Clínica ABA',
    hasPrograms: true
  },
  cliniagenda: {
    professional: 'Profissional',
    appointment: 'Consulta',
    clinic: 'Clínica',
    hasPrograms: false
  }
};

const brand = process.env.REACT_APP_BRAND || 'abaplay';
export const terms = TERMINOLOGY[brand];
```

#### 📋 B. Schema de Pacientes Genérico

**ABAplay** usa campos específicos TEA:
```sql
-- Campos específicos TEA (manter no ABAplay)
birth_weight INTEGER,
birth_height INTEGER,
gestational_age INTEGER,
diagnosis_date DATE,
diagnosis_description TEXT
```

**CliniAgende** precisa de schema genérico:
```sql
-- Migration: 008_cliniagenda_patients.sql
CREATE TABLE patients_cliniagenda (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,

  -- Dados pessoais básicos
  name VARCHAR(255) NOT NULL,
  birth_date DATE,
  gender VARCHAR(20) CHECK (gender IN ('masculino', 'feminino', 'outro', 'prefiro_nao_dizer')),
  cpf VARCHAR(14) UNIQUE,
  rg VARCHAR(20),

  -- Contato
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zipcode VARCHAR(10),

  -- Dados clínicos genéricos
  medical_notes TEXT, -- ✅ Campo livre para qualquer observação
  allergies TEXT,
  blood_type VARCHAR(5),
  health_insurance VARCHAR(255),
  insurance_number VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Índices
CREATE INDEX idx_patients_cliniagenda_clinic ON patients_cliniagenda(clinic_id);
CREATE INDEX idx_patients_cliniagenda_cpf ON patients_cliniagenda(cpf) WHERE cpf IS NOT NULL;

-- Tabela de contatos (reutilizar conceito do ABAplay)
CREATE TABLE patient_contacts_cliniagenda (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients_cliniagenda(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100), -- "Responsável", "Cônjuge", "Filho(a)", etc
  phone VARCHAR(20),
  email VARCHAR(255),
  is_emergency BOOLEAN DEFAULT false,
  notes TEXT
);
```

**Estratégia de Banco**:
- Opção 1: Tabelas separadas (`patients_abaplay`, `patients_cliniagenda`)
- Opção 2 (Recomendada): Mesma tabela `patients` com coluna `brand` e campos opcionais

#### 🎨 C. Branding Visual

```javascript
// config/branding.js
export const BRANDS = {
  abaplay: {
    name: 'ABAplay',
    domain: 'app.abaplay.com.br',

    // Cores
    primaryColor: '#3B82F6',      // Azul
    secondaryColor: '#10B981',    // Verde
    accentColor: '#F59E0B',       // Amarelo

    // Logos
    logo: '/assets/logos/abaplay-logo.png',
    logoSmall: '/assets/logos/abaplay-icon.png',
    favicon: '/assets/logos/abaplay-favicon.ico',

    // Identidade
    tagline: 'Gestão Completa de Terapia ABA e TEA',
    description: 'Plataforma para clínicas especializadas em TEA',

    // Features disponíveis
    features: {
      scheduling: true,
      patients: true,
      programs: true,      // ✅ Exclusivo ABAplay
      sessions: true,      // ✅ Exclusivo ABAplay
      chat: true,          // ✅ Exclusivo ABAplay
      reports: true,
      analytics: true      // ✅ Exclusivo ABAplay
    },

    // SEO
    metaTitle: 'ABAplay - Gestão de Terapia ABA',
    metaDescription: 'Sistema completo para clínicas de terapia ABA e TEA',
    metaKeywords: 'aba, tea, autismo, terapia, gestão clínica'
  },

  cliniagenda: {
    name: 'CliniAgende',
    domain: 'app.cliniagenda.com.br',

    // Cores (sugestão: verde/saúde)
    primaryColor: '#10B981',      // Verde
    secondaryColor: '#3B82F6',    // Azul
    accentColor: '#8B5CF6',       // Roxo

    // Logos
    logo: '/assets/logos/cliniagenda-logo.png',
    logoSmall: '/assets/logos/cliniagenda-icon.png',
    favicon: '/assets/logos/cliniagenda-favicon.ico',

    // Identidade
    tagline: 'Agendamento Inteligente para Clínicas',
    description: 'Gestão de agendamentos para clínicas de qualquer especialidade',

    // Features disponíveis
    features: {
      scheduling: true,
      patients: true,
      programs: false,     // ❌ Não existe
      sessions: false,     // ❌ Não existe
      chat: false,         // ❌ Não existe
      reports: true,       // ✅ Apenas relatórios de agendamento
      analytics: false     // ❌ Simplificado
    },

    // SEO
    metaTitle: 'CliniAgende - Gestão de Agendamentos para Clínicas',
    metaDescription: 'Sistema de agendamento online para psicólogos, nutricionistas, dentistas e clínicas em geral',
    metaKeywords: 'agendamento, clínica, consultório, psicólogo, médico, agenda online'
  }
};

// Detectar brand via variável de ambiente
const CURRENT_BRAND = process.env.REACT_APP_BRAND || process.env.BRAND || 'abaplay';

export const brand = BRANDS[CURRENT_BRAND];

// Helper para verificar features
export const hasFeature = (feature) => brand.features[feature] === true;
```

**Uso no código**:
```javascript
import { brand, hasFeature } from '../config/branding';

// No Navbar
<img src={brand.logo} alt={brand.name} />

// No BottomNavigation
{hasFeature('programs') && (
  <NavItem icon={faFolderOpen} label="Programas" />
)}

// No Helmet (SEO)
<Helmet>
  <title>{brand.metaTitle}</title>
  <meta name="description" content={brand.metaDescription} />
</Helmet>
```

---

## 3. 🏗️ Arquitetura Recomendada: Monorepo

### 3.1 Estrutura de Diretórios

```
abaplay-monorepo/
│
├── 📦 packages/
│   │
│   ├── 🔧 shared-backend/              # Backend compartilhado
│   │   ├── config/
│   │   │   ├── db.js                   # Pool PostgreSQL
│   │   │   └── branding.js             # Config de marca
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js       # verifyToken, requireSuperAdmin
│   │   │   └── subscriptionMiddleware.js
│   │   │
│   │   ├── models/
│   │   │   ├── authModel.js
│   │   │   ├── appointmentModel.js     # ⭐ Core do CliniAgende
│   │   │   ├── subscriptionModel.js    # ⭐ Sistema de assinaturas
│   │   │   ├── clinicModel.js
│   │   │   ├── userModel.js
│   │   │   └── notificationModel.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── appointmentController.js
│   │   │   ├── subscriptionController.js
│   │   │   ├── clinicController.js
│   │   │   └── userController.js
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── appointmentRoutes.js
│   │   │   ├── subscriptionRoutes.js
│   │   │   ├── clinicRoutes.js
│   │   │   └── userRoutes.js
│   │   │
│   │   ├── jobs/
│   │   │   ├── trialExpirationJob.js
│   │   │   └── appointmentMaintenanceJob.js
│   │   │
│   │   ├── utils/
│   │   │   ├── validators.js
│   │   │   ├── emailService.js
│   │   │   └── dateHelpers.js
│   │   │
│   │   └── package.json
│   │
│   ├── 🎨 shared-frontend/             # Frontend compartilhado
│   │   ├── components/
│   │   │   ├── appointments/
│   │   │   │   ├── Calendar.js         # ⭐ Core do CliniAgende
│   │   │   │   ├── AppointmentForm.js
│   │   │   │   ├── AppointmentList.js
│   │   │   │   ├── WeeklySchedule.js
│   │   │   │   └── DaySchedule.js
│   │   │   │
│   │   │   ├── shared/
│   │   │   │   ├── Navbar.js
│   │   │   │   ├── BottomNavigation.js
│   │   │   │   ├── LoadingSpinner.js
│   │   │   │   ├── PlanBadge.js        # ⭐ Sistema de assinaturas
│   │   │   │   └── PrivateRoute.js
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── UserList.js
│   │   │   │   └── UserForm.js
│   │   │   │
│   │   │   └── clinics/
│   │   │       ├── ClinicForm.js
│   │   │       └── ClinicSettings.js
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.js          # ⭐ Com subscription
│   │   │   └── NotificationContext.js
│   │   │
│   │   ├── api/
│   │   │   ├── authApi.js
│   │   │   ├── appointmentApi.js
│   │   │   ├── subscriptionApi.js      # ⭐ Sistema de assinaturas
│   │   │   ├── clinicApi.js
│   │   │   └── userApi.js
│   │   │
│   │   ├── utils/
│   │   │   ├── dateUtils.js
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   │
│   │   ├── config/
│   │   │   └── branding.js             # ⭐ Config de marca
│   │   │
│   │   └── package.json
│   │
│   ├── 🔵 abaplay-backend/             # Backend ABAplay específico
│   │   ├── models/
│   │   │   ├── programModel.js         # ✅ Exclusivo ABAplay
│   │   │   ├── sessionModel.js         # ✅ Exclusivo ABAplay
│   │   │   └── chatModel.js            # ✅ Exclusivo ABAplay
│   │   │
│   │   ├── controllers/
│   │   │   ├── programController.js
│   │   │   ├── sessionController.js
│   │   │   └── chatController.js
│   │   │
│   │   ├── routes/
│   │   │   ├── programRoutes.js
│   │   │   ├── sessionRoutes.js
│   │   │   └── chatRoutes.js
│   │   │
│   │   ├── server.js                   # ⭐ Importa shared-backend
│   │   ├── .env.abaplay
│   │   └── package.json
│   │
│   ├── 🔵 abaplay-frontend/            # Frontend ABAplay específico
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── ProgramsPage.js     # ✅ Exclusivo ABAplay
│   │   │   │   ├── SessionRecordingPage.js
│   │   │   │   ├── ChatPage.js
│   │   │   │   ├── DashboardPage.js    # Dashboard completo
│   │   │   │   └── SuperAdminPage.js   # Com gestão de trials
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── programs/
│   │   │   │   ├── sessions/
│   │   │   │   └── chat/
│   │   │   │
│   │   │   ├── context/
│   │   │   │   ├── ProgramContext.js
│   │   │   │   └── SessionContext.js
│   │   │   │
│   │   │   ├── App.js                  # ⭐ Importa shared-frontend
│   │   │   └── index.js
│   │   │
│   │   ├── public/
│   │   │   ├── assets/logos/
│   │   │   │   ├── abaplay-logo.png
│   │   │   │   └── abaplay-icon.png
│   │   │   └── favicon.ico
│   │   │
│   │   ├── .env.abaplay
│   │   └── package.json
│   │
│   ├── 🟢 cliniagenda-backend/         # Backend CliniAgende específico
│   │   ├── models/
│   │   │   └── (vazio ou custom models se necessário)
│   │   │
│   │   ├── server.js                   # ⭐ Importa shared-backend
│   │   ├── .env.cliniagenda
│   │   └── package.json
│   │
│   └── 🟢 cliniagenda-frontend/        # Frontend CliniAgende específico
│       ├── src/
│       │   ├── pages/
│       │   │   ├── DashboardPage.js    # Dashboard simplificado
│       │   │   ├── AppointmentsPage.js # Apenas agendamento
│       │   │   ├── PatientsPage.js     # CRUD de pacientes
│       │   │   ├── SettingsPage.js
│       │   │   └── SuperAdminPage.js   # Gestão de assinaturas
│       │   │
│       │   ├── App.js                  # ⭐ Importa shared-frontend
│       │   └── index.js
│       │
│       ├── public/
│       │   ├── assets/logos/
│       │   │   ├── cliniagenda-logo.png
│       │   │   └── cliniagenda-icon.png
│       │   └── favicon.ico
│       │
│       ├── .env.cliniagenda
│       └── package.json
│
├── 🗄️ migrations/                      # Migrations compartilhadas
│   ├── 001_initial_schema.sql
│   ├── 002_create_recurring_appointments.sql
│   ├── ...
│   ├── 007_add_subscription_plans.sql  # ⭐ Sistema de assinaturas
│   └── 008_cliniagenda_setup.sql       # ⭐ Setup CliniAgende
│
├── 📚 docs/
│   ├── GUIA_IMPLEMENTACAO_MODULOS.md
│   ├── GUIA_BRANCH_SUBSCRIPTION_MODULES.md
│   ├── ANALISE_FORK_CLINIAGENDA.md     # ⭐ Este documento
│   └── API_DOCUMENTATION.md
│
├── 🧪 tests/                           # Testes compartilhados
│   ├── backend/
│   └── frontend/
│
├── .gitignore
├── package.json                        # ⭐ Workspace raiz
├── lerna.json                          # ⭐ Config Lerna
└── README.md
```

---

### 3.2 Configuração do Monorepo

#### A. `package.json` (Raiz)

```json
{
  "name": "abaplay-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:abaplay:backend": "cd packages/abaplay-backend && npm start",
    "dev:abaplay:frontend": "cd packages/abaplay-frontend && npm start",
    "dev:abaplay": "concurrently \"npm run dev:abaplay:backend\" \"npm run dev:abaplay:frontend\"",

    "dev:cliniagenda:backend": "cd packages/cliniagenda-backend && npm start",
    "dev:cliniagenda:frontend": "cd packages/cliniagenda-frontend && npm start",
    "dev:cliniagenda": "concurrently \"npm run dev:cliniagenda:backend\" \"npm run dev:cliniagenda:frontend\"",

    "build:abaplay:backend": "cd packages/abaplay-backend && npm run build",
    "build:abaplay:frontend": "cd packages/abaplay-frontend && npm run build",
    "build:abaplay": "npm run build:abaplay:backend && npm run build:abaplay:frontend",

    "build:cliniagenda:backend": "cd packages/cliniagenda-backend && npm run build",
    "build:cliniagenda:frontend": "cd packages/cliniagenda-frontend && npm run build",
    "build:cliniagenda": "npm run build:cliniagenda:backend && npm run build:cliniagenda:frontend",

    "build:all": "npm run build:abaplay && npm run build:cliniagenda",

    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  },
  "devDependencies": {
    "lerna": "^8.0.0",
    "concurrently": "^8.2.2"
  }
}
```

#### B. `lerna.json`

```json
{
  "version": "independent",
  "npmClient": "npm",
  "packages": [
    "packages/*"
  ],
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    }
  }
}
```

#### C. `packages/shared-backend/package.json`

```json
{
  "name": "@abaplay/shared-backend",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "node-cron": "^3.0.3",
    "helmet": "^7.1.0",
    "cors": "^2.8.5"
  }
}
```

#### D. `packages/abaplay-backend/package.json`

```json
{
  "name": "@abaplay/backend",
  "version": "1.0.0",
  "dependencies": {
    "@abaplay/shared-backend": "^1.0.0",
    "socket.io": "^4.7.2"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

#### E. `packages/abaplay-backend/server.js`

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// ⭐ Importar módulos compartilhados
const { authRoutes, appointmentRoutes, subscriptionRoutes, clinicRoutes, userRoutes } = require('@abaplay/shared-backend/routes');
const { verifyToken } = require('@abaplay/shared-backend/middleware');
const { TrialExpirationJob } = require('@abaplay/shared-backend/jobs');

// ⭐ Importar módulos específicos ABAplay
const programRoutes = require('./routes/programRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());

// ⭐ Rotas compartilhadas
app.use('/api/auth', authRoutes);
app.use('/api/appointments', verifyToken, appointmentRoutes);
app.use('/api/subscription', verifyToken, subscriptionRoutes);
app.use('/api/clinics', verifyToken, clinicRoutes);
app.use('/api/users', verifyToken, userRoutes);

// ⭐ Rotas específicas ABAplay
app.use('/api/programs', verifyToken, programRoutes);
app.use('/api/sessions', verifyToken, sessionRoutes);
app.use('/api/chat', verifyToken, chatRoutes);

// Jobs
if (process.env.ENABLE_SUBSCRIPTION_MODULES === 'true') {
  TrialExpirationJob.scheduleJob();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔵 ABAplay Backend rodando na porta ${PORT}`);
});
```

#### F. `packages/cliniagenda-backend/server.js`

```javascript
const express = require('express');
const http = require('http');

// ⭐ Importar APENAS módulos compartilhados
const { authRoutes, appointmentRoutes, subscriptionRoutes, clinicRoutes, userRoutes } = require('@abaplay/shared-backend/routes');
const { verifyToken } = require('@abaplay/shared-backend/middleware');
const { TrialExpirationJob } = require('@abaplay/shared-backend/jobs');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());

// ⭐ Rotas compartilhadas (APENAS agendamento)
app.use('/api/auth', authRoutes);
app.use('/api/appointments', verifyToken, appointmentRoutes);
app.use('/api/subscription', verifyToken, subscriptionRoutes);
app.use('/api/clinics', verifyToken, clinicRoutes);
app.use('/api/users', verifyToken, userRoutes);

// ❌ SEM rotas de programs, sessions, chat

// Jobs
if (process.env.ENABLE_SUBSCRIPTION_MODULES === 'true') {
  TrialExpirationJob.scheduleJob();
}

const PORT = process.env.PORT || 3100;
server.listen(PORT, () => {
  console.log(`🟢 CliniAgende Backend rodando na porta ${PORT}`);
});
```

---

### 3.3 Vantagens e Desvantagens do Monorepo

#### ✅ Vantagens

1. **DRY (Don't Repeat Yourself)**
   - Bug fix em `shared-backend` afeta automaticamente ambos produtos
   - Feature nova (ex: integração WhatsApp) adicionada uma vez, disponível para ambos

2. **Versionamento Unificado**
   - Um repositório Git
   - Um histórico de commits
   - Pull requests afetam ambos produtos simultaneamente

3. **Compartilhamento Fácil**
   ```javascript
   // Em qualquer app
   import { Calendar } from '@abaplay/shared-frontend';
   import { appointmentModel } from '@abaplay/shared-backend';
   ```

4. **Testes Compartilhados**
   - Suite única de testes para código compartilhado
   - Economiza tempo e garante qualidade

5. **Deploy Independente**
   - Apesar do código compartilhado, cada app faz deploy separado
   - `npm run build:abaplay` vs `npm run build:cliniagenda`

6. **Refatoração Segura**
   - Mudar uma função compartilhada força você a testar em ambos apps

#### ⚠️ Desvantagens

1. **Build Mais Complexo**
   - Precisa de Lerna ou Turborepo
   - Curva de aprendizado inicial
   - **Mitigação**: Usar Lerna (já configurado acima)

2. **Tamanho do Repositório**
   - Repositório cresce com 2 produtos
   - Clone inicial mais pesado
   - **Mitigação**: Git LFS para assets grandes

3. **Conflitos de Merge**
   - Múltiplos devs trabalhando em apps diferentes podem gerar conflitos
   - **Mitigação**: Branches bem nomeadas (`abaplay/feature-x`, `cliniagenda/feature-y`)

4. **Risco de Bug Cascade**
   - Bug em código compartilhado afeta ambos produtos
   - **Mitigação**: Testes automatizados obrigatórios

---

### 3.4 Alternativa: Repositórios Separados com NPM Privado

Se preferir separação total:

```
Estrutura:
├── abaplay-core/               # NPM privado (GitHub Packages)
│   └── packages/
│       ├── @abaplay/appointments/
│       ├── @abaplay/auth/
│       └── @abaplay/subscriptions/
│
├── abaplay/                    # Repositório ABAplay
│   └── package.json
│       dependencies:
│         "@abaplay/appointments": "^1.0.0"
│         "@abaplay/auth": "^1.0.0"
│
└── cliniagenda/                # Repositório CliniAgende
    └── package.json
        dependencies:
          "@abaplay/appointments": "^1.0.0"
          "@abaplay/auth": "^1.0.0"
```

**Vantagens**:
- ✅ Separação total
- ✅ Times independentes

**Desvantagens**:
- ❌ Bug fix requer: `fix → publish → update package.json → deploy` (3 passos)
- ❌ Versionamento fragmentado
- ❌ Mais burocracia

**Recomendação**: Usar **monorepo** (mais simples para 1 desenvolvedor/equipe pequena)

---

## 4. 🗄️ Estratégia de Banco de Dados

### 4.1 Opção Recomendada: Banco Único Multi-Tenant com Branding

#### A. Schema Unificado

```sql
-- Migration: 008_cliniagenda_setup.sql

-- 1. Adicionar coluna de branding
ALTER TABLE clinics
ADD COLUMN brand VARCHAR(20) DEFAULT 'abaplay'
CHECK (brand IN ('abaplay', 'cliniagenda'));

CREATE INDEX idx_clinics_brand ON clinics(brand);

-- 2. Atualizar view de assinaturas para incluir brand
CREATE OR REPLACE VIEW v_clinic_subscription_details AS
SELECT
  c.id AS clinic_id,
  c.name AS clinic_name,
  c.brand,
  c.subscription_plan,
  c.trial_pro_enabled,
  c.trial_pro_expires_at,

  CASE
    WHEN c.trial_pro_enabled AND c.trial_pro_expires_at > CURRENT_TIMESTAMP THEN true
    ELSE false
  END AS has_active_trial,

  CASE
    WHEN c.trial_pro_enabled AND c.trial_pro_expires_at > CURRENT_TIMESTAMP THEN 'pro'
    ELSE c.subscription_plan
  END AS effective_plan,

  spp.price_per_patient,
  spp.display_name AS plan_display_name,
  spp.features AS plan_features,

  COUNT(DISTINCT p.id) AS total_patients,

  CASE
    WHEN c.trial_pro_enabled AND c.trial_pro_expires_at > CURRENT_TIMESTAMP THEN 0
    ELSE COUNT(DISTINCT p.id) * spp.price_per_patient
  END AS monthly_revenue,

  th.activated_by,
  u.name AS trial_activated_by_name,
  th.activated_at AS trial_activated_at,
  th.duration_days AS trial_duration_days

FROM clinics c
LEFT JOIN subscription_plan_prices spp ON spp.plan_name = c.subscription_plan
LEFT JOIN patients p ON p.clinic_id = c.id
LEFT JOIN LATERAL (
  SELECT activated_by, activated_at, duration_days
  FROM trial_history
  WHERE clinic_id = c.id AND status = 'active'
  ORDER BY activated_at DESC
  LIMIT 1
) th ON true
LEFT JOIN users u ON u.id = th.activated_by
GROUP BY c.id, c.name, c.brand, c.subscription_plan, c.trial_pro_enabled, c.trial_pro_expires_at,
         spp.price_per_patient, spp.display_name, spp.features,
         th.activated_by, u.name, th.activated_at, th.duration_days;

-- 3. Views separadas por produto
CREATE VIEW v_abaplay_clinics AS
SELECT * FROM v_clinic_subscription_details
WHERE brand = 'abaplay';

CREATE VIEW v_cliniagenda_clinics AS
SELECT * FROM v_clinic_subscription_details
WHERE brand = 'cliniagenda';

-- 4. Função para criar clínica CliniAgende
CREATE OR REPLACE FUNCTION create_cliniagenda_clinic(
  p_name VARCHAR(255),
  p_admin_name VARCHAR(255),
  p_admin_email VARCHAR(255),
  p_admin_password VARCHAR(255)
) RETURNS TABLE(clinic_id INTEGER, user_id INTEGER) AS $$
DECLARE
  v_clinic_id INTEGER;
  v_user_id INTEGER;
BEGIN
  -- Criar clínica
  INSERT INTO clinics (name, brand, subscription_plan)
  VALUES (p_name, 'cliniagenda', 'basic')
  RETURNING id INTO v_clinic_id;

  -- Criar admin
  INSERT INTO users (clinic_id, name, email, password, role, is_admin)
  VALUES (v_clinic_id, p_admin_name, p_admin_email, p_admin_password, 'admin', true)
  RETURNING id INTO v_user_id;

  RETURN QUERY SELECT v_clinic_id, v_user_id;
END;
$$ LANGUAGE plpgsql;
```

#### B. Isolation de Dados

Cada backend filtra por `brand`:

```javascript
// Em shared-backend/models/clinicModel.js
const getClinicsByBrand = async (brand) => {
  const result = await pool.query(
    'SELECT * FROM clinics WHERE brand = $1',
    [brand]
  );
  return result.rows;
};

// Em abaplay-backend/server.js
const brand = 'abaplay';
const clinics = await clinicModel.getClinicsByBrand(brand);

// Em cliniagenda-backend/server.js
const brand = 'cliniagenda';
const clinics = await clinicModel.getClinicsByBrand(brand);
```

#### C. Vantagens do Banco Único

✅ **Migração fácil**: Clínica pode migrar de ABAplay → CliniAgende (ou vice-versa) apenas mudando `brand`
✅ **Infraestrutura única**: 1 servidor PostgreSQL, 1 backup
✅ **Analytics comparativos**: Fácil comparar receita ABAplay vs CliniAgende
✅ **Custo reduzido**: 1 instância RDS/Render ao invés de 2

#### D. Desvantagens

⚠️ **Risco de data leak**: Bug pode expor dados de um produto para outro
⚠️ **Escala**: Se CliniAgende crescer muito, pode sobrecarregar o banco

**Mitigação**:
- Testes rigorosos de isolation
- Middleware obrigatório filtrando por `brand`
- Considerar separação de banco quando atingir 10.000+ clínicas

---

### 4.2 Alternativa: Bancos Separados

Se preferir isolamento total:

```
PostgreSQL Servidor 1 (ABAplay):
- Database: abaplay_db
- Clinics: brand = 'abaplay'

PostgreSQL Servidor 2 (CliniAgende):
- Database: cliniagenda_db
- Clinics: brand = 'cliniagenda'
```

**Vantagens**:
✅ Isolation perfeito
✅ Escala independente

**Desvantagens**:
❌ 2x custo de infraestrutura
❌ 2x trabalho de backup
❌ Migrations duplicadas

---

## 5. 💰 Modelo de Assinatura CliniAgende

### 5.1 Planos Propostos

O sistema de assinaturas **já está implementado e testado** (migration 007)!

Basta adicionar os planos CliniAgende:

```sql
-- Migration: 009_cliniagenda_plans.sql

-- Inserir planos CliniAgende
INSERT INTO subscription_plan_prices (plan_name, price_per_patient, display_name, features)
VALUES
  (
    'basic',
    8.00,
    'CliniAgende Básico',
    '{
      "scheduling": true,
      "patients": true,
      "reports": false,
      "whatsapp": false,
      "sms": false
    }'::jsonb
  ),
  (
    'pro',
    15.00,
    'CliniAgende Pro',
    '{
      "scheduling": true,
      "patients": true,
      "reports": true,
      "whatsapp": true,
      "sms": true,
      "api": true
    }'::jsonb
  );

-- Atualizar constraint (adicionar 'basic' aos planos aceitos)
ALTER TABLE clinics
DROP CONSTRAINT IF EXISTS clinics_subscription_plan_check;

ALTER TABLE clinics
ADD CONSTRAINT clinics_subscription_plan_check
CHECK (subscription_plan IN ('basic', 'scheduling', 'pro'));
```

### 5.2 Comparação de Planos

| Feature | ABAplay Agenda | ABAplay Pro | CliniAgende Básico | CliniAgende Pro |
|---------|---------------|-------------|-------------------|-----------------|
| **Preço** | R$ 10/paciente | R$ 35/paciente | R$ 8/profissional | R$ 15/profissional |
| **Agendamento** | ✅ | ✅ | ✅ | ✅ |
| **Pacientes** | ✅ | ✅ | ✅ | ✅ |
| **Programas ABA** | ❌ | ✅ | ❌ | ❌ |
| **Sessões Terapia** | ❌ | ✅ | ❌ | ❌ |
| **Chat** | ❌ | ✅ | ❌ | ❌ |
| **Relatórios** | Básicos | Avançados | ❌ | ✅ |
| **WhatsApp** | ❌ | ✅ | ❌ | ✅ |
| **SMS** | ❌ | ❌ | ❌ | ✅ |
| **API** | ❌ | ❌ | ❌ | ✅ |

### 5.3 Estratégia de Pricing

#### ABAplay (Nicho Premium)
- **Público**: ~500-1000 clínicas TEA no Brasil
- **Pricing**: Alto (R$ 35/paciente) - Justifica funcionalidades especializadas
- **Estratégia**: Upsell (Agenda → Pro)
- **LTV**: Alto (clínicas ficam anos)

#### CliniAgende (Volume Alto)
- **Público**: ~50.000+ clínicas/consultórios no Brasil
- **Pricing**: Baixo (R$ 8-15/profissional) - Competir com concorrência
- **Estratégia**: Volume + conversão rápida
- **LTV**: Médio

### 5.4 Trial System (Já Funciona!)

O sistema de trial **já está pronto**:

```javascript
// Ativar trial CliniAgende Pro (14 dias)
const result = await activateTrial(clinicId, 14);

// Job automático expira trials às 3 AM
TrialExpirationJob.scheduleJob();
```

**Sugestão de duração**:
- ABAplay Pro: 7-14 dias (features complexas, precisa de tempo)
- CliniAgende Pro: 7 dias (agendamento é simples, 1 semana é suficiente)

---

## 6. 🎨 Diferenciação de Marca e Posicionamento

### 6.1 ABAplay - Gestão Completa de Terapia TEA

#### Identidade Visual
- **Cores**: Azul (#3B82F6), Verde (#10B981), Amarelo (#F59E0B)
- **Logo**: Puzzle (símbolo do autismo) + Play (evolução)
- **Tom**: Profissional, especializado, científico

#### Mensagem
- **Tagline**: "Gestão Completa de Terapia ABA e TEA"
- **Proposta de Valor**: "Plataforma especializada que integra agendamento, programas de intervenção, registro de sessões e analytics de evolução"
- **Público**: Clínicas ABA, terapeutas especializados, coordenadores TEA

#### Features Exclusivas
- 🧩 Programas de intervenção baseados em ABA
- 📊 Gráficos de evolução de marcos de desenvolvimento
- 💬 Chat entre terapeutas e coordenadores
- 📈 Relatórios ABC, análise de reforçadores

#### Marketing
- Eventos TEA (Congresso Autismo Brasil, seminários)
- Grupos de Facebook de pais de autistas
- Parcerias com clínicas referência
- SEO: "software gestão clínica aba", "sistema terapia tea"

---

### 6.2 CliniAgende - Agendamento Inteligente para Clínicas

#### Identidade Visual
- **Cores**: Verde (#10B981), Azul (#3B82F6), Roxo (#8B5CF6)
- **Logo**: Calendário + Cruz médica (saúde) + Checkmark (confirmação)
- **Tom**: Simples, acessível, prático

#### Mensagem
- **Tagline**: "Agendamento Inteligente para Clínicas de Qualquer Especialidade"
- **Proposta de Valor**: "Sistema completo de agendamento online que reduz faltas e otimiza seu tempo"
- **Público**: Psicólogos, nutricionistas, dentistas, fisioterapeutas, médicos, clínicas gerais

#### Features
- 📅 Agendamento inteligente com detecção automática de faltas
- 👥 Gestão de pacientes simplificada
- 📊 Relatórios de agendamento (Pro)
- 💬 Notificações WhatsApp (Pro)
- 📱 App web responsivo (funciona no celular)

#### Marketing
- Google Ads: "software agendamento clínica", "agenda online consultório"
- Facebook Ads: Segmentação por profissão (psicólogo, nutricionista)
- Parcerias: CRP (Conselho Regional de Psicologia), CRN (Nutrição), CRO (Odontologia)
- SEO: "sistema agendamento psicólogo", "agenda online nutricionista"
- Landing pages específicas por especialidade

---

### 6.3 Tabela Comparativa (Para Marketing)

| Aspecto | ABAplay | CliniAgende |
|---------|---------|-------------|
| **Foco** | Gestão completa de terapia TEA/ABA | Agendamento para clínicas gerais |
| **Especialização** | Alta (nicho TEA) | Baixa (qualquer clínica) |
| **Complexidade** | Alta (programas, sessões, analytics) | Baixa (agendamento + pacientes) |
| **Preço** | R$ 10-35/paciente | R$ 8-15/profissional |
| **Público** | ~1.000 clínicas TEA | ~50.000+ clínicas |
| **LTV** | Alto (R$ 500-2000/mês) | Médio (R$ 50-300/mês) |
| **Churn** | Baixo (alta especialização) | Médio (baixa barreira de saída) |
| **Suporte** | Especializado (treinamento ABA) | Básico (tutoriais, FAQ) |

---

## 7. 🛠️ Guia de Implementação Passo a Passo

### Fase 1: Setup do Monorepo (3 dias)

#### Dia 1: Estrutura Inicial

```bash
# 1. Criar estrutura de diretórios
mkdir -p abaplay-monorepo/packages
cd abaplay-monorepo

# 2. Inicializar workspace
npm init -y

# 3. Configurar workspaces
npm install lerna concurrently --save-dev

# 4. Criar lerna.json
cat > lerna.json << 'EOF'
{
  "version": "independent",
  "npmClient": "npm",
  "packages": ["packages/*"]
}
EOF

# 5. Atualizar package.json raiz
# (copiar o exemplo da seção 3.2)
```

#### Dia 2: Extrair Código Compartilhado

```bash
# 1. Criar pacote shared-backend
mkdir -p packages/shared-backend/{config,middleware,models,controllers,routes,jobs,utils}

# 2. Copiar arquivos do ABAplay atual para shared-backend
cp backend/config/db.js packages/shared-backend/config/
cp backend/middleware/authMiddleware.js packages/shared-backend/middleware/
cp backend/middleware/subscriptionMiddleware.js packages/shared-backend/middleware/
cp backend/models/authModel.js packages/shared-backend/models/
cp backend/models/appointmentModel.js packages/shared-backend/models/
cp backend/models/subscriptionModel.js packages/shared-backend/models/
cp backend/models/clinicModel.js packages/shared-backend/models/
cp backend/models/userModel.js packages/shared-backend/models/
# ... (copiar todos os models/controllers/routes compartilháveis)

# 3. Criar package.json do shared-backend
cd packages/shared-backend
npm init -y
npm install express pg bcryptjs jsonwebtoken express-validator node-cron helmet cors

# 4. Criar exports em index.js
cat > index.js << 'EOF'
module.exports = {
  models: {
    authModel: require('./models/authModel'),
    appointmentModel: require('./models/appointmentModel'),
    subscriptionModel: require('./models/subscriptionModel'),
    clinicModel: require('./models/clinicModel'),
    userModel: require('./models/userModel')
  },
  controllers: {
    authController: require('./controllers/authController'),
    appointmentController: require('./controllers/appointmentController'),
    subscriptionController: require('./controllers/subscriptionController'),
    clinicController: require('./controllers/clinicController'),
    userController: require('./controllers/userController')
  },
  routes: {
    authRoutes: require('./routes/authRoutes'),
    appointmentRoutes: require('./routes/appointmentRoutes'),
    subscriptionRoutes: require('./routes/subscriptionRoutes'),
    clinicRoutes: require('./routes/clinicRoutes'),
    userRoutes: require('./routes/userRoutes')
  },
  middleware: {
    verifyToken: require('./middleware/authMiddleware').verifyToken,
    requireSuperAdmin: require('./middleware/authMiddleware').requireSuperAdmin,
    requireProPlan: require('./middleware/subscriptionMiddleware').requireProPlan
  },
  jobs: {
    TrialExpirationJob: require('./jobs/trialExpirationJob')
  }
};
EOF
```

#### Dia 3: Criar Pacotes Frontend e Backend

```bash
# 1. Criar shared-frontend
mkdir -p packages/shared-frontend/{components,context,api,utils,config}
cd packages/shared-frontend
npm init -y
npm install react react-dom axios

# 2. Copiar componentes compartilháveis
cp -r ../../frontend/src/components/appointments/ components/
cp -r ../../frontend/src/components/shared/ components/
cp ../../frontend/src/context/AuthContext.js context/
cp ../../frontend/src/api/appointmentApi.js api/
cp ../../frontend/src/api/subscriptionApi.js api/
# ... etc

# 3. Criar abaplay-backend
mkdir -p packages/abaplay-backend/{models,controllers,routes}
cd packages/abaplay-backend
npm init -y
npm install @abaplay/shared-backend socket.io

# 4. Copiar código específico ABAplay
cp ../../backend/models/programModel.js models/
cp ../../backend/models/sessionModel.js models/
# ... etc

# 5. Criar server.js (exemplo na seção 3.2)

# 6. Criar abaplay-frontend
mkdir -p packages/abaplay-frontend/src/{pages,components}
cd packages/abaplay-frontend
npx create-react-app . --template cra-template
npm install @abaplay/shared-frontend

# 7. Copiar páginas ABAplay
cp -r ../../../frontend/src/pages/* src/pages/
```

---

### Fase 2: CliniAgende Backend (4 dias)

#### Dia 4: Migration e Schema

```bash
# 1. Criar migration
cat > migrations/008_cliniagenda_setup.sql << 'EOF'
-- (copiar SQL da seção 4.1)
EOF

# 2. Executar migration
PGPASSWORD="sua_senha" psql -h seu_host -p 5432 -U seu_user -d sua_db -f migrations/008_cliniagenda_setup.sql

# 3. Criar migration de planos
cat > migrations/009_cliniagenda_plans.sql << 'EOF'
-- (copiar SQL da seção 5.1)
EOF

# 4. Executar
PGPASSWORD="sua_senha" psql -h seu_host -p 5432 -U seu_user -d sua_db -f migrations/009_cliniagenda_plans.sql
```

#### Dia 5-6: Backend CliniAgende

```bash
# 1. Criar pacote
mkdir -p packages/cliniagenda-backend
cd packages/cliniagenda-backend
npm init -y
npm install @abaplay/shared-backend

# 2. Criar server.js (exemplo na seção 3.2)

# 3. Criar .env.cliniagenda
cat > .env.cliniagenda << 'EOF'
# Database
DATABASE_URL=sua_connection_string

# JWT
JWT_SECRET=seu_secret

# Subscription
ENABLE_SUBSCRIPTION_MODULES=true

# Brand
BRAND=cliniagenda

# Server
PORT=3100
EOF

# 4. Testar backend
npm start
```

#### Dia 7: Testes de Isolation

```javascript
// tests/backend/isolation.test.js

const { clinicModel } = require('@abaplay/shared-backend/models');

describe('Brand Isolation', () => {
  it('ABAplay backend deve retornar apenas clínicas ABAplay', async () => {
    const clinics = await clinicModel.getClinicsByBrand('abaplay');

    clinics.forEach(clinic => {
      expect(clinic.brand).toBe('abaplay');
    });
  });

  it('CliniAgende backend deve retornar apenas clínicas CliniAgende', async () => {
    const clinics = await clinicModel.getClinicsByBrand('cliniagenda');

    clinics.forEach(clinic => {
      expect(clinic.brand).toBe('cliniagenda');
    });
  });
});
```

---

### Fase 3: CliniAgende Frontend (5 dias)

#### Dia 8-9: Setup Básico

```bash
# 1. Criar app
mkdir -p packages/cliniagenda-frontend
cd packages/cliniagenda-frontend
npx create-react-app . --template cra-template

# 2. Instalar dependências
npm install @abaplay/shared-frontend
npm install react-router-dom axios tailwindcss @fortawesome/react-fontawesome

# 3. Criar config de branding
mkdir src/config
cat > src/config/branding.js << 'EOF'
// (copiar da seção 2.3C)
EOF

# 4. Criar .env
cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:3100/api
REACT_APP_BRAND=cliniagenda
EOF
```

#### Dia 10-11: Páginas CliniAgende

```javascript
// src/pages/DashboardPage.js (versão simplificada)

import React, { useState, useEffect } from 'react';
import { Calendar } from '@abaplay/shared-frontend/components/appointments';
import { getAppointments } from '@abaplay/shared-frontend/api/appointmentApi';
import { brand } from '../config/branding';

const DashboardPage = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const data = await getAppointments();
    setAppointments(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6" style={{ color: brand.primaryColor }}>
        Dashboard - {brand.name}
      </h1>

      {/* Estatísticas simplificadas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Consultas Hoje</h3>
          <p className="text-2xl font-bold">{appointments.filter(a => isToday(a.date)).length}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Pacientes Ativos</h3>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-gray-500">Taxa de Presença</h3>
          <p className="text-2xl font-bold">--</p>
        </div>
      </div>

      {/* Calendário (componente compartilhado) */}
      <Calendar
        appointments={appointments}
        onAppointmentClick={(apt) => console.log(apt)}
      />
    </div>
  );
};

export default DashboardPage;
```

```javascript
// src/pages/PatientsPage.js

import React, { useState, useEffect } from 'react';
import { getPatients, createPatient } from '../api/patientApi';
import { brand } from '../config/branding';

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const handleCreatePatient = async (patientData) => {
    await createPatient(patientData);
    loadPatients();
    setShowForm(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pacientes</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded text-white"
          style={{ backgroundColor: brand.primaryColor }}
        >
          + Novo Paciente
        </button>
      </div>

      {/* Lista de pacientes */}
      <div className="bg-white rounded shadow">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Telefone</th>
              <th className="p-3 text-left">Última Consulta</th>
              <th className="p-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(patient => (
              <tr key={patient.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{patient.name}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">{patient.last_appointment || 'Nunca'}</td>
                <td className="p-3">
                  <button className="text-blue-500">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de formulário (se showForm === true) */}
    </div>
  );
};

export default PatientsPage;
```

#### Dia 12: Navegação e Rotas

```javascript
// src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@abaplay/shared-frontend/context/AuthContext';
import { PrivateRoute } from '@abaplay/shared-frontend/components/shared';
import { brand } from './config/branding';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsPage from './pages/PatientsPage';
import SettingsPage from './pages/SettingsPage';
import SuperAdminPage from './pages/SuperAdminPage';

function App() {
  return (
    <AuthProvider brandConfig={brand}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/appointments" element={<PrivateRoute><AppointmentsPage /></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute><PatientsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

          {/* SuperAdmin */}
          <Route path="/superadmin" element={<PrivateRoute requireSuperAdmin><SuperAdminPage /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

### Fase 4: Testes (3 dias)

#### Dia 13: Testes de Agendamento

```bash
# 1. Criar clínica de teste CliniAgende
PGPASSWORD="senha" psql -h host -U user -d db -c "
  SELECT * FROM create_cliniagenda_clinic(
    'Clínica Teste CliniAgende',
    'Admin Teste',
    'admin@teste.com',
    '\$2a\$10\$hashedpassword...'
  );
"

# 2. Fazer login no CliniAgende
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@teste.com", "password": "senha123"}'

# 3. Criar agendamento
curl -X POST http://localhost:3100/api/appointments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "therapist_id": 1,
    "date": "2025-10-10",
    "time": "14:00",
    "duration": 60
  }'

# 4. Listar agendamentos
curl -X GET http://localhost:3100/api/appointments \
  -H "Authorization: Bearer {token}"
```

#### Dia 14: Testes de Isolation

```javascript
// Verificar que clínica ABAplay NÃO aparece no CliniAgende

// 1. Login como admin CliniAgende
const cliniAgendeToken = await login('admin@cliniagenda.com', 'senha');

// 2. Buscar clínicas
const response = await fetch('http://localhost:3100/api/clinics', {
  headers: { Authorization: `Bearer ${cliniAgendeToken}` }
});

const clinics = await response.json();

// 3. Verificar que APENAS clínicas CliniAgende aparecem
clinics.forEach(clinic => {
  expect(clinic.brand).toBe('cliniagenda');
});
```

#### Dia 15: Testes de Assinaturas

```bash
# 1. Ativar trial Pro na clínica CliniAgende
curl -X POST http://localhost:3100/api/subscription/clinic/1/trial/activate \
  -H "Authorization: Bearer {superadmin_token}" \
  -H "Content-Type: application/json" \
  -d '{"durationDays": 7}'

# 2. Verificar subscription
curl -X GET http://localhost:3100/api/subscription/my-subscription \
  -H "Authorization: Bearer {token}"

# Resposta esperada:
# {
#   "subscription_plan": "basic",
#   "trial_pro_enabled": true,
#   "has_active_trial": true,
#   "effective_plan": "pro",
#   ...
# }

# 3. Aguardar expiração (ou forçar via SQL)
PGPASSWORD="senha" psql -h host -U user -d db -c "
  UPDATE clinics
  SET trial_pro_expires_at = NOW() - INTERVAL '1 day'
  WHERE id = 1;

  SELECT * FROM expire_trials();
"

# 4. Verificar que voltou para 'basic'
curl -X GET http://localhost:3100/api/subscription/my-subscription \
  -H "Authorization: Bearer {token}"

# {
#   "subscription_plan": "basic",
#   "trial_pro_enabled": false,
#   "has_active_trial": false,
#   "effective_plan": "basic",
#   ...
# }
```

---

### Fase 5: Deploy (2 dias)

#### Dia 16: Configuração de Domínios e SSL

```bash
# 1. Adquirir domínios
# - app.abaplay.com.br
# - app.cliniagenda.com.br

# 2. Configurar DNS (exemplo Cloudflare)
# A record: app.abaplay.com.br → IP_SERVIDOR_ABAPLAY
# A record: app.cliniagenda.com.br → IP_SERVIDOR_CLINIAGENDA

# 3. SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx

sudo certbot --nginx -d app.abaplay.com.br
sudo certbot --nginx -d app.cliniagenda.com.br

# 4. Nginx config para ABAplay
cat > /etc/nginx/sites-available/abaplay << 'EOF'
server {
    listen 80;
    server_name app.abaplay.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name app.abaplay.com.br;

    ssl_certificate /etc/letsencrypt/live/app.abaplay.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.abaplay.com.br/privkey.pem;

    # Frontend (React build)
    root /var/www/abaplay-frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 5. Nginx config para CliniAgende
cat > /etc/nginx/sites-available/cliniagenda << 'EOF'
server {
    listen 80;
    server_name app.cliniagenda.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name app.cliniagenda.com.br;

    ssl_certificate /etc/letsencrypt/live/app.cliniagenda.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.cliniagenda.com.br/privkey.pem;

    root /var/www/cliniagenda-frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 6. Ativar sites
sudo ln -s /etc/nginx/sites-available/abaplay /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cliniagenda /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Dia 17: Build e Deploy

```bash
# 1. Build ABAplay
cd packages/abaplay-frontend
REACT_APP_BRAND=abaplay npm run build
sudo cp -r build/* /var/www/abaplay-frontend/build/

# 2. Build CliniAgende
cd packages/cliniagenda-frontend
REACT_APP_BRAND=cliniagenda npm run build
sudo cp -r build/* /var/www/cliniagenda-frontend/build/

# 3. PM2 para backends
sudo npm install -g pm2

# Backend ABAplay
cd packages/abaplay-backend
pm2 start server.js --name abaplay-backend --env production

# Backend CliniAgende
cd packages/cliniagenda-backend
pm2 start server.js --name cliniagenda-backend --env production

# 4. PM2 startup (reinicia após reboot)
pm2 startup
pm2 save

# 5. Verificar status
pm2 status

# ┌─────┬──────────────────────┬─────────┬──────┐
# │ id  │ name                 │ status  │ cpu  │
# ├─────┼──────────────────────┼─────────┼──────┤
# │ 0   │ abaplay-backend      │ online  │ 0%   │
# │ 1   │ cliniagenda-backend  │ online  │ 0%   │
# └─────┴──────────────────────┴─────────┴──────┘
```

---

## 8. 📅 Cronograma Detalhado

| Fase | Dias | Atividades | Responsável | Deliverables |
|------|------|------------|-------------|--------------|
| **1. Setup Monorepo** | 1-3 | Criar estrutura, extrair código compartilhado, configurar Lerna | Dev | Monorepo funcional, pacotes criados |
| **2. CliniAgende Backend** | 4-7 | Migrations, server.js, testes de isolation | Dev | Backend CliniAgende rodando |
| **3. CliniAgende Frontend** | 8-12 | Páginas, componentes, branding, navegação | Dev/Designer | Frontend CliniAgende funcional |
| **4. Testes** | 13-15 | Testes de agendamento, isolation, assinaturas | QA/Dev | Todos testes passando |
| **5. Deploy** | 16-17 | DNS, SSL, Nginx, PM2, build | DevOps | Aplicações no ar |
| **6. Marketing** | 18-20 | Landing pages, Google Ads, SEO | Marketing | Primeiros leads |

**Total**: 20 dias úteis (~4 semanas)

---

## 9. ⚠️ Gestão de Riscos

### Risco 1: Manutenção Duplicada

**Descrição**: Manter 2 produtos pode duplicar trabalho de suporte, bugs, features.

**Probabilidade**: Média (60%)
**Impacto**: Alto

**Mitigação**:
✅ Usar monorepo compartilhado (bug fix em 1 lugar afeta ambos)
✅ Priorizar features compartilhadas (ex: integração WhatsApp para ambos)
✅ Contratar suporte dedicado quando atingir 100+ clínicas CliniAgende

**Plano de Contingência**:
- Se manutenção ficar insustentável, descontinuar o produto com menos receita

---

### Risco 2: Confusão de Código

**Descrição**: Desenvolvedores podem confundir código ABAplay com CliniAgende.

**Probabilidade**: Baixa (30%)
**Impacto**: Médio

**Mitigação**:
✅ Nomenclatura clara (`abaplay-*`, `cliniagenda-*`, `shared-*`)
✅ Documentação obrigatória em cada pacote
✅ Code review antes de merge

---

### Risco 3: Bug em Shared Afeta Ambos

**Descrição**: Bug crítico em `shared-backend` derruba ABAplay E CliniAgende.

**Probabilidade**: Média (40%)
**Impacto**: Crítico

**Mitigação**:
✅ Testes automatizados obrigatórios para código compartilhado
✅ Staging environment separado
✅ Feature flags para rollback rápido
✅ Monitoramento 24/7 (Sentry, LogRocket)

**Plano de Contingência**:
- Reverter commit imediatamente
- Comunicar clientes afetados em <15 minutos
- Post-mortem obrigatório

---

### Risco 4: Clínicas Migrarem de ABAplay → CliniAgende

**Descrição**: Clínica TEA pode descobrir CliniAgende e fazer downgrade (R$ 35 → R$ 15).

**Probabilidade**: Baixa (20%)
**Impacto**: Médio

**Mitigação**:
✅ Diferenciação clara: ABAplay tem **programas, sessões, analytics TEA** (exclusivos)
✅ CliniAgende NÃO oferece recursos ABA (apenas agendamento genérico)
✅ Marketing separado (clínicas TEA nem veem CliniAgende)
✅ Proibir migration automática (exige aprovação SuperAdmin)

---

### Risco 5: Complexidade do Monorepo

**Descrição**: Lerna/Turborepo pode ter curva de aprendizado difícil.

**Probabilidade**: Média (50%)
**Impacto**: Médio

**Mitigação**:
✅ Documentação completa (este documento)
✅ Exemplos práticos de comandos
✅ Usar Lerna (mais simples que Turborepo)

---

### Risco 6: Esforço de Marketing Duplo

**Descrição**: Promover 2 produtos exige 2x trabalho de marketing.

**Probabilidade**: Alta (80%)
**Impacto**: Médio

**Mitigação**:
⚠️ **Aceitar o custo** - Faz parte da estratégia
✅ Automatizar com ferramentas (RD Station, HubSpot)
✅ Landing pages com templates compartilhados
✅ Contratar freelancer de marketing quando atingir 50+ clínicas CliniAgende

---

## 10. 💰 Análise Financeira

### 10.1 Custos de Desenvolvimento

| Item | Custo | Observação |
|------|-------|------------|
| **Desenvolvimento (17 dias)** | R$ 8.500 | R$ 500/dia (freelancer) ou custo de oportunidade |
| **Design (logos, landing pages)** | R$ 1.500 | Designer freelancer |
| **Domínios** | R$ 100 | cliniagenda.com.br |
| **Infraestrutura (3 meses)** | R$ 300 | Servidor compartilhado inicialmente |
| **Marketing Inicial** | R$ 1.000 | Google Ads, Facebook Ads |
| **Contingência (20%)** | R$ 2.280 | Imprevistos |
| **TOTAL** | **R$ 13.680** | Investimento inicial |

### 10.2 Custos Recorrentes (Mensal)

| Item | ABAplay | CliniAgende | Total |
|------|---------|-------------|-------|
| **Servidor** | R$ 100 | R$ 0 (compartilhado) | R$ 100 |
| **Banco de Dados** | R$ 50 | R$ 0 (compartilhado) | R$ 50 |
| **Email (SendGrid)** | R$ 50 | R$ 50 | R$ 100 |
| **Suporte** | R$ 500 | R$ 300 | R$ 800 |
| **Marketing** | R$ 500 | R$ 1.000 | R$ 1.500 |
| **TOTAL** | R$ 1.200 | R$ 1.350 | **R$ 2.550** |

### 10.3 Projeção de Receita (12 meses)

#### ABAplay (Conservador)

| Mês | Clínicas | Pacientes/Clínica | Plano Médio | Receita Mensal | Receita Acumulada |
|-----|----------|-------------------|-------------|----------------|-------------------|
| 1 | 5 | 10 | R$ 25 (mix) | R$ 1.250 | R$ 1.250 |
| 3 | 10 | 15 | R$ 25 | R$ 3.750 | R$ 8.750 |
| 6 | 20 | 20 | R$ 28 | R$ 11.200 | R$ 35.000 |
| 12 | 40 | 25 | R$ 30 | R$ 30.000 | R$ 150.000 |

#### CliniAgende (Otimista - Volume Alto)

| Mês | Clínicas | Profissionais/Clínica | Plano Médio | Receita Mensal | Receita Acumulada |
|-----|----------|----------------------|-------------|----------------|-------------------|
| 1 | 10 | 2 | R$ 10 | R$ 200 | R$ 200 |
| 3 | 50 | 3 | R$ 12 | R$ 1.800 | R$ 6.000 |
| 6 | 150 | 3 | R$ 12 | R$ 5.400 | R$ 30.000 |
| 12 | 400 | 4 | R$ 13 | R$ 20.800 | R$ 120.000 |

#### Total Combinado (12 meses)

- **ABAplay**: R$ 150.000 (40 clínicas)
- **CliniAgende**: R$ 120.000 (400 clínicas)
- **TOTAL**: **R$ 270.000** (receita acumulada ano 1)

### 10.4 Breakeven

**Fórmula**: Custos Iniciais + (Custos Mensais × Meses) = Receita Acumulada

```
R$ 13.680 + (R$ 2.550 × M) = Receita Acumulada

Cenário Conservador (apenas ABAplay):
Mês 8: R$ 13.680 + (R$ 1.200 × 8) = R$ 23.280
Receita acumulada mês 8: ~R$ 70.000
✅ Breakeven mês 8

Cenário com CliniAgende:
Mês 5: R$ 13.680 + (R$ 2.550 × 5) = R$ 26.430
Receita acumulada mês 5: ~R$ 40.000
✅ Breakeven mês 5
```

**Conclusão**: CliniAgende **reduz breakeven de 8 para 5 meses** (37% mais rápido).

### 10.5 ROI (12 meses)

```
ROI = (Receita - Custos) / Custos × 100%

Custos totais (12 meses):
R$ 13.680 (inicial) + (R$ 2.550 × 12) = R$ 44.280

Receita (12 meses):
R$ 270.000

ROI = (R$ 270.000 - R$ 44.280) / R$ 44.280 × 100%
ROI = 509%
```

**Retorno de 509% no primeiro ano** (cenário otimista mas realista).

---

## 11. ✅ Checklist de Decisão

Antes de iniciar o fork, valide:

### Técnico
- [ ] Você tem domínio do código atual do ABAplay?
- [ ] Está familiarizado com Git branches e monorepos?
- [ ] Tem ambiente de desenvolvimento local configurado?
- [ ] Conhece PostgreSQL e migrations?
- [ ] Sabe usar Lerna ou está disposto a aprender?

### Negócio
- [ ] Validou demanda de mercado (pesquisou com psicólogos, nutricionistas)?
- [ ] Tem orçamento para investimento inicial (R$ 13.680)?
- [ ] Tem capacidade de pagar custos mensais (R$ 2.550)?
- [ ] Tem tempo para promover 2 produtos simultaneamente?
- [ ] Tem estratégia de aquisição de clientes para CliniAgende?

### Marketing
- [ ] Domínio `cliniagenda.com.br` está disponível?
- [ ] Tem logo e identidade visual prontos (ou orçamento para designer)?
- [ ] Tem landing page planejada?
- [ ] Sabe criar campanhas Google Ads / Facebook Ads?
- [ ] Tem parcerias potenciais (CRP, CRN, CRO)?

### Suporte
- [ ] Tem capacidade de atender clientes de 2 produtos?
- [ ] Tem documentação/FAQ preparada para CliniAgende?
- [ ] Tem scripts de onboarding diferentes para cada produto?
- [ ] Tem SLA definido (tempo de resposta a suporte)?

### Legal
- [ ] Tem CNPJ ativo?
- [ ] Tem contrato de prestação de serviço atualizado?
- [ ] Tem política de privacidade (LGPD) adaptada?
- [ ] Tem termos de uso separados por produto?

**Decisão**: Se **10+ itens marcados**, o fork é viável. Se **15+ itens marcados**, é altamente recomendado!

---

## 12. 🎉 Conclusão e Recomendações

### 12.1 Resumo da Análise

✅ **Viabilidade Técnica**: ALTA
- 70% do código é reutilizável
- Sistema de agendamento já testado e funcional
- Sistema de assinaturas **pronto** (migration 007)
- Monorepo resolve compartilhamento e manutenção

✅ **Viabilidade Financeira**: ALTA
- Investimento inicial: R$ 13.680
- Breakeven em 5 meses (com CliniAgende)
- ROI de 509% no primeiro ano
- Mercado CliniAgende 50-100x maior que ABAplay

✅ **Viabilidade Estratégica**: ALTA
- Diversificação de receita (nicho premium + volume alto)
- Redução de risco (não depender apenas de clínicas TEA)
- Economia de 80% vs. construir do zero
- Aproveita código já existente e testado

### 12.2 Recomendação Final

**PROSSEGUIR com o fork usando arquitetura de monorepo compartilhado.**

**Justificativa**:
1. Você acabou de implementar o sistema de assinaturas (trial, planos, jobs) — **está pronto para uso!**
2. Reutilizar 70% do código economiza **3-6 meses de desenvolvimento**
3. Mercado CliniAgende é **50-100x maior** que ABAplay
4. Custo marginal é **baixo** (R$ 13k inicial, R$ 2,5k/mês)
5. ROI projetado de **509% no primeiro ano**
6. Breakeven em **5 meses** (vs. 8 meses só com ABAplay)

### 12.3 Próximos Passos Imediatos

#### Curto Prazo (Esta Semana)
1. **Validar demanda**: Entrevistar 10-20 psicólogos/nutricionistas sobre dor de agendamento
2. **Reservar domínio**: Comprar `cliniagenda.com.br`
3. **Criar MVP de landing page**: Validar conversão antes de desenvolver

#### Médio Prazo (Este Mês)
4. **Contratar designer**: Logo e identidade visual CliniAgende
5. **Iniciar monorepo**: Seguir Fase 1 deste guia (3 dias)
6. **Desenvolver CliniAgende**: Seguir Fases 2-3 (9 dias)

#### Longo Prazo (Próximos 3 Meses)
7. **Lançar beta**: 10-20 clínicas beta (gratuito ou desconto)
8. **Coletar feedback**: Iterar no produto
9. **Marketing agressivo**: Google Ads, Facebook, parcerias
10. **Escalar**: Meta de 50 clínicas em 3 meses, 400 em 12 meses

### 12.4 Fatores Críticos de Sucesso

Para o fork ser bem-sucedido, você **DEVE**:

1. ✅ **Manter código compartilhado limpo**: Qualquer bug afeta ambos produtos
2. ✅ **Diferenciar claramente os produtos**: ABAplay = TEA especializado / CliniAgende = geral simples
3. ✅ **Investir em marketing CliniAgende**: Produto novo precisa de visibilidade
4. ✅ **Ter suporte escalável**: 2 produtos = 2x tickets de suporte
5. ✅ **Monitorar métricas separadamente**: MRR, churn, CAC, LTV por produto

### 12.5 Red Flags (Quando NÃO Fazer o Fork)

❌ **NÃO faça o fork se**:
- Você não consegue dedicar 15-20 dias de desenvolvimento
- Não tem orçamento para marketing (~R$ 1.000/mês)
- ABAplay atual tem bugs críticos não resolvidos (priorize estabilidade)
- Não consegue validar demanda de mercado (risco alto)
- Não tem capacidade de atender clientes de 2 produtos

---

## 📚 Apêndices

### Apêndice A: Comandos Úteis do Monorepo

```bash
# Rodar ABAplay em dev
npm run dev:abaplay

# Rodar CliniAgende em dev
npm run dev:cliniagenda

# Build de produção ABAplay
npm run build:abaplay

# Build de produção CliniAgende
npm run build:cliniagenda

# Build de ambos
npm run build:all

# Instalar dependências em todos pacotes
npm install --workspaces

# Rodar testes em todos pacotes
npm run test --workspaces

# Adicionar dependência em pacote específico
npm install axios --workspace=packages/cliniagenda-frontend

# Listar pacotes
lerna list

# Publicar pacotes (se usar NPM privado)
lerna publish
```

### Apêndice B: Estrutura de .env

```bash
# .env.abaplay (Backend ABAplay)
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENABLE_SUBSCRIPTION_MODULES=true
BRAND=abaplay
PORT=3000

# .env.cliniagenda (Backend CliniAgende)
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENABLE_SUBSCRIPTION_MODULES=true
BRAND=cliniagenda
PORT=3100

# .env (Frontend ABAplay)
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_BRAND=abaplay

# .env (Frontend CliniAgende)
REACT_APP_API_URL=http://localhost:3100/api
REACT_APP_BRAND=cliniagenda
```

### Apêndice C: Recursos Adicionais

- **Lerna**: https://lerna.js.org/
- **Monorepo Guide**: https://monorepo.tools/
- **React Shared Components**: https://kentcdodds.com/blog/colocation
- **PostgreSQL Multi-Tenancy**: https://www.citusdata.com/blog/2016/10/03/designing-your-saas-database-for-high-scalability/

---

## 📞 Suporte

Se tiver dúvidas durante a implementação deste guia, consulte:

1. **Documentação ABAplay**: `docs/` no repositório
2. **Migration 007**: Sistema de assinaturas já implementado
3. **Este documento**: `ANALISE_FORK_CLINIAGENDA.md`

---

**Documento criado em**: 2025-10-05
**Versão**: 1.0
**Autor**: Claude (Anthropic)
**Baseado em**: Implementação real do sistema de assinaturas ABAplay

---

**BOA SORTE COM O FORK! 🚀**
