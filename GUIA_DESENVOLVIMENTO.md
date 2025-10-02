# 🚀 Guia de Desenvolvimento - ABAplay

> **Guia consolidado para desenvolvedores** - Tudo que você precisa saber para trabalhar no ABAplay.

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Configuração do Ambiente](#configuração-do-ambiente)
4. [Funcionalidades Principais](#funcionalidades-principais)
5. [Banco de Dados e Migrations](#banco-de-dados-e-migrations)
6. [Estrutura de Diretórios](#estrutura-de-diretórios)
7. [Documentação Essencial](#documentação-essencial)
8. [Fluxo de Desenvolvimento](#fluxo-de-desenvolvimento)
9. [Troubleshooting](#troubleshooting)

---

## 📖 Visão Geral do Projeto

**ABAplay** é uma plataforma SaaS completa para clínicas de terapia ABA (Análise do Comportamento Aplicada), focada em intervenção infantil.

### Principais Características:
- 🏥 **Multi-tenant**: Suporte a múltiplas clínicas
- 👥 **3 Perfis**: Admin, Terapeuta, Pais/Responsáveis
- 📊 **Gestão Completa**: Pacientes, programas, sessões, agendamentos
- 💬 **Tempo Real**: Chat e notificações via Socket.IO
- 📈 **Análise de Progresso**: Gráficos, relatórios e métricas ABA
- 🤖 **IA Integrada**: Sugestões inteligentes para relatórios

---

## 🏗️ Arquitetura Técnica

### Backend
```
Framework: Node.js + Express.js
Banco de Dados: PostgreSQL (sem ORM - SQL direto)
Autenticação: JWT + bcrypt
Tempo Real: Socket.IO
Segurança: Helmet, CORS
Validação: express-validator
Porta: 3000
```

### Frontend
```
Framework: React 18
Roteamento: React Router DOM v6
Estilização: Tailwind CSS v3.4.7
Ícones: FontAwesome v6.5.2 + Lucide React v0.417.0
Gráficos: Chart.js v4.4.3 + react-chartjs-2 v5.2.0
PDF: jsPDF v2.5.1 + jspdf-autotable v3.8.2
HTTP: Axios v1.11.0
Real-time: Socket.IO Client v4.8.1
Porta: 3001
```

### Estrutura do Banco
```
PostgreSQL com queries SQL diretas
Hierarquia: disciplines → program_areas → program_sub_areas → programs
Multi-tenant: Isolamento por clinic_id
Migrations: Versionadas em /backend/migrations/
```

---

## ⚙️ Configuração do Ambiente

### Requisitos
- Node.js v16+
- PostgreSQL v12+
- npm ou yarn

### 1. Backend

```bash
cd backend
npm install

# Configurar .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=abaplay_db
JWT_SECRET=seu_secret_super_seguro
NODE_ENV=development
ENABLE_AUTO_DETECTION=true

# Executar migrations
psql -h localhost -U seu_usuario -d abaplay_db -f migrations/001_create_scheduled_sessions.sql
psql -h localhost -U seu_usuario -d abaplay_db -f migrations/002_create_recurring_appointments.sql
psql -h localhost -U seu_usuario -d abaplay_db -f migrations/003_expand_patient_registration_fixed.sql
psql -h localhost -U seu_usuario -d abaplay_db -f migrations/004_add_appointment_cancelled_notification.sql

# Iniciar
npm run dev  # Desenvolvimento (nodemon)
npm start    # Produção
```

### 2. Frontend

```bash
cd frontend
npm install

# Iniciar
npm start    # Desenvolvimento (porta 3001)
npm run build  # Build para produção
```

---

## 🎯 Funcionalidades Principais

### 1. Sistema de Agendamento V2.0 (Recorrente + Inteligente)
- ✅ **Agendamentos únicos e recorrentes** (diário, semanal, mensal)
- ✅ **Detecção automática de sessões órfãs** (agendadas sem registro)
- ✅ **Calendário visual** com view de semana/mês
- ✅ **Notificações em tempo real**
- ✅ **Justificativas de ausência**
- 📍 **Arquivo**: `ABAPLAY_V2_NOVIDADES.md` (documentação completa)

### 2. Programas Customizados por Clínica
- ✅ **Biblioteca global** de programas ABA
- ✅ **Programas customizados isolados por clínica**
- ✅ **Hierarquia**: Disciplina → Área → Sub-área → Programa
- ✅ **Configuração de tentativas personalizadas**
- 📍 **Arquivo**: `PROGRAMAS_CUSTOMIZADOS_README.md`

### 3. Sistema de Relatórios de Evolução
- ✅ **Geração profissional de PDFs**
- ✅ **Sugestões inteligentes baseadas em dados reais**
- ✅ **Sincronização multi-dispositivo** (dados profissionais)
- ✅ **Preview editável** antes da geração
- ✅ **Gráficos de progresso integrados**
- 📍 **Documentação**: `DOCUMENTACAO/SISTEMA_RELATORIOS_EVOLUCAO.md`

### 4. Níveis de Prompting ABA
- ✅ **6 níveis**: Independente → Sem Resposta
- ✅ **Pontuação automática** baseada em níveis
- ✅ **Visualização em gráficos** por área de intervenção
- ✅ **Dashboard de progresso** para pais

### 5. Comunicação em Tempo Real
- ✅ **Chat terapeuta-pais** (Socket.IO rooms)
- ✅ **Discussões de caso** entre profissionais
- ✅ **Sistema de notificações** com badges
- ✅ **Alertas de progresso automáticos**

### 6. Super Admin Enterprise
- ✅ **Gestão de múltiplas clínicas**
- ✅ **Visão financeira consolidada**
- ✅ **Controle de assinaturas**
- 📍 **Arquivo**: `SUPER_ADMIN_ENTERPRISE.md`

---

## 🗄️ Banco de Dados e Migrations

### Estrutura Principal

```
users (usuários do sistema)
  └─ clinics (clínicas - multi-tenant)
      └─ patients (pacientes)
          └─ patient_program_assignments (atribuições)
              └─ patient_program_progress (sessões/progresso)

programs (biblioteca global de programas)
  └─ clinic_id (null = global, valor = customizado por clínica)
```

### Migrations Ativas

Execute na ordem:

```bash
# 1. Sistema de agendamento
001_create_scheduled_sessions.sql
002_create_recurring_appointments.sql

# 2. Cadastro expandido de pacientes
003_expand_patient_registration_fixed.sql

# 3. Notificações de agendamento
004_add_appointment_cancelled_notification.sql
```

### Histórico de Migrações

Todas as migrações anteriores (VB-MAPP, correções, debug) estão arquivadas em:
- `_HISTORICO_MIGRACAO/` (referência histórica, não executar)

---

## 📁 Estrutura de Diretórios

```
abaplay/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de negócio
│   │   ├── models/          # Queries SQL
│   │   ├── routes/          # Definição de rotas
│   │   ├── middleware/      # JWT auth, validação
│   │   ├── jobs/            # Jobs agendados (cron)
│   │   ├── utils/           # Utilidades (promptLevels, etc)
│   │   └── server.js        # Entry point
│   ├── migrations/          # SQL migrations (versionadas)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React organizados
│   │   ├── pages/           # Páginas principais
│   │   ├── context/         # Context API (Auth, Patient, Program)
│   │   ├── api/             # Chamadas à API (Axios)
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilities (pdfGenerator, etc)
│   │   └── App.js           # Entry point
│   └── package.json
│
├── DOCUMENTACAO/            # Documentação técnica organizada
├── _HISTORICO_MIGRACAO/     # Histórico de migrações antigas
├── _QUERIES_DESENVOLVIMENTO/ # Queries de debug (não essenciais)
│
├── CLAUDE.md                # Guia para IA (essencial)
├── README.md                # Documentação principal
├── GUIA_DESENVOLVIMENTO.md  # Este arquivo
├── ABAPLAY_V2_NOVIDADES.md  # Sistema de agendamento V2
└── PROGRAMAS_CUSTOMIZADOS_README.md
```

---

## 📚 Documentação Essencial

### Ordem de Leitura Recomendada:

1. **`README.md`** - Visão geral do projeto e funcionalidades
2. **`CLAUDE.md`** - Arquitetura técnica detalhada e convenções
3. **`GUIA_DESENVOLVIMENTO.md`** - Este arquivo (guia prático)
4. **`ABAPLAY_V2_NOVIDADES.md`** - Sistema de agendamento completo
5. **`PROGRAMAS_CUSTOMIZADOS_README.md`** - Programas por clínica

### Documentação Técnica Avançada:

- **Backend**: `DOCUMENTACAO/RESUMO_BACKEND.md`
- **Frontend**: `DOCUMENTACAO/RESUMO_FRONTEND.md`
- **Banco de Dados**: `DOCUMENTACAO/RESUMO_DB.md`
- **Relatórios IA**: `DOCUMENTACAO/SISTEMA_RELATORIOS_EVOLUCAO.md`

---

## 🔄 Fluxo de Desenvolvimento

### 1. Novas Funcionalidades

```bash
# 1. Criar branch
git checkout -b feature/nome-da-feature

# 2. Desenvolver
# Backend: criar controller → model → route
# Frontend: criar component → integrar API → testar

# 3. Testar localmente
npm run dev (backend)
npm start (frontend)

# 4. Commit
git add .
git commit -m "feat: descrição da feature"

# 5. Merge/PR
```

### 2. Banco de Dados (Migrations)

```bash
# Criar nova migration
# Nome: XXX_descricao.sql (XXX = número sequencial)

# Estrutura:
-- Migration XXX: Descrição
-- Data: YYYY-MM
-- Compatibilidade: [detalhes]

ALTER TABLE ...
CREATE TABLE ...

# Executar
psql -h host -U user -d db -f migrations/XXX_descricao.sql

# Documentar em CLAUDE.md se relevante
```

### 3. API (Backend → Frontend)

```bash
# Backend
1. Controller: backend/src/controllers/nomeController.js
2. Model: backend/src/models/nomeModel.js
3. Route: backend/src/routes/nomeRoutes.js

# Frontend
1. API: frontend/src/api/nomeApi.js
2. Component: frontend/src/components/[categoria]/NomeComponent.js
3. Context (se necessário): frontend/src/context/NomeContext.js
```

---

## 🛠️ Troubleshooting

### Backend não inicia

```bash
# Verificar conexão com banco
psql -h localhost -U user -d abaplay_db

# Verificar .env
cat backend/.env

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Frontend não compila

```bash
# Limpar cache
rm -rf node_modules .cache build
npm install
npm start
```

### Migrations falhando

```bash
# Verificar ordem de execução
ls -la backend/migrations/

# Executar manualmente uma por uma
psql ... -f migrations/001_...sql

# Verificar constraints/foreign keys
```

### Socket.IO não conecta

```bash
# Verificar CORS no backend
# backend/src/server.js - configuração CORS

# Verificar URL no frontend
# frontend/src/config.js - SOCKET_URL
```

### Job de agendamento não roda

```bash
# Verificar .env
ENABLE_AUTO_DETECTION=true

# Verificar logs do backend
# Deve aparecer: "Session Maintenance Job iniciado"
```

---

## 🎓 Convenções e Boas Práticas

### Código

- **Backend**: CommonJS (require/module.exports)
- **Frontend**: ES6 Modules (import/export)
- **Nomenclatura**: camelCase para variáveis/funções, PascalCase para componentes
- **SQL**: Queries organizadas em models, não em controllers

### Commits

```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
refactor: refatoração
test: testes
chore: tarefas gerais
```

### Segurança

- ✅ JWT tokens para autenticação
- ✅ Bcrypt para senhas
- ✅ CORS configurado
- ✅ express-validator para inputs
- ✅ Helmet para headers de segurança
- ❌ **NUNCA** logar tokens/senhas no console

---

## 📞 Suporte e Referências

### Documentação Complementar
- Histórico de migrações: `_HISTORICO_MIGRACAO/README_HISTORICO.md`
- Termos de uso: `termos_de_uso.md`
- Instruções super admin: `INSTRUCOES_SUPER_ADMIN.md`

### Changelog
- Todas as versões e mudanças: `CHANGELOG.md`

---

## ✅ Checklist para Novos Desenvolvedores

- [ ] Ler `README.md` completo
- [ ] Ler `CLAUDE.md` (arquitetura técnica)
- [ ] Configurar ambiente (backend + frontend)
- [ ] Executar todas as migrations
- [ ] Rodar aplicação localmente
- [ ] Criar usuário de teste
- [ ] Explorar 3 perfis (Admin, Terapeuta, Pais)
- [ ] Ler `ABAPLAY_V2_NOVIDADES.md` (agendamento)
- [ ] Entender estrutura de diretórios
- [ ] Fazer primeira contribuição (pequena)

---

## 🎉 Pronto para Desenvolver!

Você agora tem todas as informações essenciais. Use este guia como referência rápida e consulte a documentação técnica detalhada quando necessário.

**Boa codificação!** 🚀

---

_Versão 1.0 - Criado em 2025-10-02_
