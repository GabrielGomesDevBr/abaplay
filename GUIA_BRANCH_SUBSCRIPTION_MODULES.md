# 🌿 Guia da Branch: feature/subscription-modules

> **Workflow de desenvolvimento local com Git para implementação do Sistema de Módulos**
> Guia completo para trabalhar com branches, sincronizar hotfixes e fazer deploy seguro

---

## 📋 Índice

1. [Visão Geral da Estratégia](#visão-geral-da-estratégia)
2. [Setup Inicial](#setup-inicial)
3. [Workflow Diário](#workflow-diário)
4. [Gestão de Hotfixes](#gestão-de-hotfixes)
5. [Sincronização e Merge](#sincronização-e-merge)
6. [Deploy e Validação](#deploy-e-validação)
7. [Rollback de Emergência](#rollback-de-emergência)
8. [Boas Práticas](#boas-práticas)
9. [Comandos Rápidos](#comandos-rápidos)

---

## 🎯 Visão Geral da Estratégia

### **Objetivo**
Desenvolver o sistema de módulos (Plano Agendamento vs Pro) de forma isolada, mantendo a capacidade de aplicar correções urgentes na versão de produção sem interromper o desenvolvimento.

### **Estratégia de Branches**

```
main (produção estável)
  ├── hotfix/nome-da-correcao (correções urgentes)
  └── feature/subscription-modules (nova funcionalidade)
```

### **Ambiente de Desenvolvimento**

```
┌─────────────────────────────────────┐
│   DESENVOLVIMENTO LOCAL (Sua Máquina) │
│                                     │
│   Backend:  localhost:3000         │
│   Frontend: localhost:3001         │
│   Branch:   feature/subscription-modules │
│                                     │
│   Conecta → Base de Dados Remota   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│   PRODUÇÃO (Servidor)               │
│                                     │
│   URL:    abaplay.app.br          │
│   Branch: main                     │
│                                     │
│   Conecta → Mesma Base de Dados    │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│   BASE DE DADOS (PostgreSQL/Render) │
│                                     │
│   Compartilhada entre Local e Prod │
└─────────────────────────────────────┘
```

### **Vantagens**
✅ **Desenvolvimento local** - Rápido, sem custo de servidor extra
✅ **Isolamento de código** - Feature branch separada da produção
✅ **Dados reais** - Testa com base de produção (cuidado!)
✅ **Hotfix rápido** - Consegue pausar feature e corrigir produção em 10min
✅ **Sincronização fácil** - Merge/rebase traz correções para feature

---

## 🚀 Setup Inicial

### **1. Clonar Repositório (Se Ainda Não Tiver)**

```bash
# Navegar para pasta de projetos
cd ~/projetos

# Clonar repositório
git clone https://github.com/seu-usuario/abaplay.git
cd abaplay

# Verificar branch atual
git branch
# Deve mostrar: * main
```

### **2. Criar Branch de Feature**

```bash
# Garantir que está na main atualizada
git checkout main
git pull origin main

# Criar branch de feature
git checkout -b feature/subscription-modules

# Verificar branch atual
git branch
# Deve mostrar: * feature/subscription-modules

# Enviar branch para GitHub (primeira vez)
git push -u origin feature/subscription-modules
```

### **3. Configurar Ambiente Local**

#### **Backend (.env)**

```bash
# Navegar para backend
cd backend

# Criar/editar .env
nano .env
# OU
code .env
```

**Conteúdo do `.env` local**:

```bash
# ==========================================
# AMBIENTE: DESENVOLVIMENTO LOCAL
# Branch: feature/subscription-modules
# ==========================================

# Base de Dados (MESMA de produção)
DB_HOST=dpg-d07n3madbo4c73ehoiqg-a.oregon-postgres.render.com
DB_PORT=5432
DB_USER=abaplay_postgres_db_user
DB_PASSWORD=Tw25MdVIzWKQqAkU6stiqum81LmuZgyf
DB_NAME=abaplay_postgres_db

# JWT
JWT_SECRET=seu_secret_super_seguro

# Ambiente
NODE_ENV=development
PORT=3000

# Feature Flags (ATIVADO localmente)
ENABLE_SUBSCRIPTION_MODULES=true
ENABLE_AUTO_DETECTION=true
ENABLE_JOBS=false  # Desativar jobs em dev (rodar manualmente se necessário)
```

#### **Frontend (.env)**

```bash
cd ../frontend
nano .env.local
# OU
code .env.local
```

**Conteúdo do `.env.local`**:

```bash
# API Backend Local
REACT_APP_API_URL=http://localhost:3000/api

# Socket.IO Local
REACT_APP_SOCKET_URL=http://localhost:3000

# Feature Flag
REACT_APP_SUBSCRIPTION_MODULES=true
```

### **4. Instalar Dependências**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### **5. Rodar Aplicação Local**

#### **Terminal 1 - Backend**
```bash
cd backend
npm run dev
# Aguardar: Server running on port 3000
```

#### **Terminal 2 - Frontend**
```bash
cd frontend
npm start
# Aguardar: Compiled successfully!
# Abre automaticamente: http://localhost:3001
```

### **6. Validar Setup**

✅ **Checklist de Validação**:
- [ ] Backend rodando em `http://localhost:3000`
- [ ] Frontend rodando em `http://localhost:3001`
- [ ] Consegue fazer login
- [ ] Consegue ver lista de pacientes
- [ ] Branch é `feature/subscription-modules` (`git branch` para verificar)

---

## 💼 Workflow Diário

### **Início do Dia**

```bash
# 1. Garantir que está na branch correta
git checkout feature/subscription-modules

# 2. Atualizar branch com últimas mudanças (suas e do GitHub)
git pull origin feature/subscription-modules

# 3. Verificar se há atualizações da main (correções que foram feitas)
git fetch origin main

# 4. (Opcional) Sincronizar correções da main
git merge origin/main
# OU (se preferir histórico linear)
git rebase origin/main

# 5. Rodar aplicação
cd backend && npm run dev  # Terminal 1
cd frontend && npm start   # Terminal 2
```

### **Durante o Desenvolvimento**

#### **Fazer Commits Frequentes**

```bash
# Verificar mudanças
git status

# Ver diff (o que mudou)
git diff

# Adicionar arquivos específicos
git add backend/src/middleware/subscriptionMiddleware.js
git add frontend/src/context/AuthContext.js

# OU adicionar tudo
git add .

# Commit com mensagem descritiva
git commit -m "feat: adicionar middleware de verificação de plano"

# Enviar para GitHub (backup e colaboração)
git push origin feature/subscription-modules
```

#### **Convenções de Mensagens de Commit**

```bash
# Funcionalidade nova
git commit -m "feat: adicionar sistema de trial Pro"

# Correção de bug
git commit -m "fix: corrigir validação de plano no middleware"

# Refatoração
git commit -m "refactor: extrair lógica de preços para função helper"

# Documentação
git commit -m "docs: atualizar README com info de módulos"

# Testes
git commit -m "test: adicionar testes para middleware de subscription"

# Estilo/formatação (sem mudança de lógica)
git commit -m "style: formatar código do authController"
```

### **Fim do Dia**

```bash
# 1. Commit de trabalho em progresso (se não terminou)
git add .
git commit -m "wip: desenvolvimento de trial em andamento"

# 2. Push para GitHub (backup)
git push origin feature/subscription-modules

# 3. (Opcional) Criar tag de checkpoint
git tag checkpoint-dia-3
git push origin checkpoint-dia-3
```

---

## 🚨 Gestão de Hotfixes

### **Cenário: Bug Crítico em Produção Durante Desenvolvimento**

```
Você está no DIA 3 de 7 do desenvolvimento
└── 🔥 CLIENTE REPORTA: Agendamentos duplicados em produção
```

### **Procedimento de Hotfix (10-15 minutos)**

#### **1. Pausar Desenvolvimento e Salvar Progresso (2min)**

```bash
# Verificar branch atual
git branch
# Deve estar em: feature/subscription-modules

# Salvar TODO o trabalho atual (mesmo incompleto)
git add .
git commit -m "wip: pausado para hotfix - desenvolvimento de trial (Dia 3)"

# Push de segurança
git push origin feature/subscription-modules

# Anotar onde parou (opcional mas útil)
echo "Pausado em: $(date) - Arquivo: trialController.js linha 45" >> PROGRESSO.md
git add PROGRESSO.md
git commit -m "docs: checkpoint antes de hotfix"
git push
```

#### **2. Ir Para Main e Criar Hotfix (1min)**

```bash
# Mudar para branch main
git checkout main

# Atualizar main
git pull origin main

# Criar branch de hotfix
git checkout -b hotfix/agendamento-duplicado

# Verificar branch
git branch
# Deve estar em: hotfix/agendamento-duplicado
```

#### **3. Corrigir Bug (5min)**

```bash
# Editar arquivo com o bug
code backend/src/controllers/schedulingController.js

# (Fazer a correção...)

# Testar localmente (IMPORTANTE!)
npm run dev  # Rodar backend
# Testar a correção no navegador/Postman

# Commit da correção
git add backend/src/controllers/schedulingController.js
git commit -m "fix: corrigir agendamentos duplicados (validação de conflito)"
```

#### **4. Mergear Hotfix na Main (2min)**

```bash
# Voltar para main
git checkout main

# Mergear hotfix
git merge hotfix/agendamento-duplicado

# Push para GitHub
git push origin main

# (Opcional) Deletar branch de hotfix local
git branch -d hotfix/agendamento-duplicado
```

#### **5. Deploy IMEDIATO em Produção (3min)**

```bash
# SSH no servidor
ssh usuario@servidor-producao

# Navegar para pasta da aplicação
cd /var/www/abaplay

# Pull da main atualizada
git pull origin main

# Reinstalar dependências (se houver package.json alterado)
npm install

# Reiniciar aplicação
pm2 restart abaplay
# OU
systemctl restart abaplay

# Verificar logs
pm2 logs abaplay --lines 20

# Sair do servidor
exit
```

#### **6. Sincronizar Correção na Branch de Feature (2min)**

```bash
# Voltar para branch de desenvolvimento
git checkout feature/subscription-modules

# Trazer correção da main
git merge main
# Mensagem padrão: "Merge branch 'main' into feature/subscription-modules"

# OU (se preferir histórico linear)
git rebase main

# Resolver conflitos (se houver)
# ... editar arquivos conflitantes ...
git add .
git rebase --continue  # se usou rebase
# OU
git commit  # se usou merge

# Push atualizado
git push origin feature/subscription-modules
```

#### **7. Continuar Desenvolvimento (Imediato)**

```bash
# Verificar onde parou
cat PROGRESSO.md
# "Pausado em: 2025-01-15 14:30 - Arquivo: trialController.js linha 45"

# Abrir arquivo e continuar
code backend/src/controllers/trialController.js

# Rodar aplicação novamente
npm run dev
```

### **Timeline do Hotfix**

| Etapa | Tempo | Ação |
|-------|-------|------|
| 1. Pausar dev | 2min | Commit WIP + push |
| 2. Checkout main | 1min | git checkout main |
| 3. Corrigir bug | 5min | Editar código + testar |
| 4. Merge main | 2min | git merge + push |
| 5. Deploy prod | 3min | SSH + pull + restart |
| 6. Sync feature | 2min | git merge main |
| 7. Continuar | 0min | Retomar desenvolvimento |
| **TOTAL** | **15min** | **Produção corrigida** ✅ |

---

## 🔄 Sincronização e Merge

### **Sincronizar Correções da Main (Diariamente)**

```bash
# Garantir que está na feature branch
git checkout feature/subscription-modules

# Buscar atualizações da main
git fetch origin main

# Opção 1: Merge (mantém histórico completo)
git merge origin/main

# Opção 2: Rebase (histórico linear - mais limpo)
git rebase origin/main

# Push das mudanças
git push origin feature/subscription-modules
# (Pode precisar de --force se usou rebase)
git push --force-with-lease origin feature/subscription-modules
```

### **Merge vs Rebase - Quando Usar?**

#### **Use MERGE quando**:
- ✅ Trabalha em equipe (outras pessoas também na branch)
- ✅ Quer preservar histórico completo
- ✅ É iniciante em Git

```bash
git merge origin/main
# Cria commit de merge: "Merge branch 'main' into feature/..."
```

#### **Use REBASE quando**:
- ✅ Trabalha sozinho na branch
- ✅ Quer histórico linear (mais limpo)
- ✅ Conhece bem Git

```bash
git rebase origin/main
# Reaplica seus commits em cima da main
```

### **Resolver Conflitos**

#### **Conflitos no Merge**:

```bash
git merge origin/main
# CONFLICT (content): Merge conflict in backend/src/controllers/authController.js

# Abrir arquivo conflitante
code backend/src/controllers/authController.js
```

**Arquivo com conflito**:

```javascript
<<<<<<< HEAD (sua versão)
const subscriptionPlan = user.subscription_plan;
=======
const userPlan = user.plan;  // versão da main
>>>>>>> origin/main
```

**Resolver**:

```javascript
// Escolher o que fica (ou combinar)
const subscriptionPlan = user.subscription_plan; // Usar sua versão
```

```bash
# Marcar como resolvido
git add backend/src/controllers/authController.js

# Finalizar merge
git commit
# (Editor abre - salvar e fechar)

# Push
git push origin feature/subscription-modules
```

#### **Conflitos no Rebase**:

```bash
git rebase origin/main
# CONFLICT: ...

# Resolver arquivo
code backend/src/controllers/authController.js

# Marcar como resolvido
git add backend/src/controllers/authController.js

# Continuar rebase
git rebase --continue

# Se der muitos conflitos e quiser desistir
git rebase --abort  # Volta ao estado anterior
```

---

## 🚀 Deploy e Validação

### **Quando Funcionalidade Estiver Completa**

#### **1. Preparação Local (30min)**

```bash
# Garantir que está na feature branch
git checkout feature/subscription-modules

# Atualizar com main (última sincronização)
git fetch origin main
git merge origin/main

# Resolver conflitos (se houver)

# Commit final
git add .
git commit -m "feat: sistema de módulos completo e testado"
git push origin feature/subscription-modules

# Testar TUDO localmente
# - Login com planos diferentes
# - Trial
# - Acesso a features
# - Migrations

# Criar tag de release
git tag v1.2.0-modules
git push origin v1.2.0-modules
```

#### **2. Executar Migration (UMA VEZ)**

```bash
# Conectar no banco de produção
psql -h dpg-d07n3madbo4c73ehoiqg-a.oregon-postgres.render.com \
     -p 5432 \
     -U abaplay_postgres_db_user \
     -d abaplay_postgres_db \
     -f backend/migrations/007_add_subscription_plans.sql

# Validar
psql ... -c "SELECT * FROM subscription_plan_prices;"
psql ... -c "\d clinics"  # Verificar colunas trial_*
```

#### **3. Merge para Main (5min)**

```bash
# Ir para main
git checkout main

# Atualizar main
git pull origin main

# Mergear feature (--no-ff garante commit de merge)
git merge --no-ff feature/subscription-modules

# Adicionar mensagem descritiva
# Editor abre, adicionar:
"""
Merge feature/subscription-modules into main

Implementação completa do Sistema de Módulos:
- Plano Agendamento (R$ 10/paciente)
- Plano Pro (R$ 35/paciente)
- Sistema de Trial (7-30 dias)
- Analytics de conversão
- SuperAdmin trial management

Closes #123
"""

# Push para main
git push origin main
```

#### **4. Deploy em Produção (10min)**

```bash
# SSH no servidor
ssh usuario@servidor-producao

# Navegar para aplicação
cd /var/www/abaplay

# Backup da versão atual (SEGURANÇA)
cp -r /var/www/abaplay /var/www/abaplay-backup-$(date +%Y%m%d-%H%M)

# Pull da main
git pull origin main

# Instalar dependências
cd backend && npm install
cd ../frontend && npm install

# Build do frontend
cd frontend
npm run build

# Reiniciar backend
pm2 restart abaplay

# Verificar logs
pm2 logs abaplay --lines 50

# Sair
exit
```

#### **5. Validação Pós-Deploy (15min)**

```bash
# Testar login
curl -X POST https://abaplay.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha"}'

# Testar endpoint de perfil
curl https://abaplay.com.br/api/auth/profile \
  -H "Authorization: Bearer TOKEN"

# No navegador:
# 1. Login com clínica de teste (plano scheduling)
# 2. Verificar botões ocultos ✅
# 3. Tentar acessar rota bloqueada (deve redirecionar) ✅
# 4. Login com clínica Pro
# 5. Verificar acesso total ✅
# 6. SuperAdmin: ativar trial ✅
# 7. Verificar banner de trial ✅
```

#### **6. Monitoramento (24h)**

```bash
# Monitorar logs em tempo real
ssh usuario@servidor-producao
pm2 logs abaplay --lines 100 --timestamp

# Verificar erros
grep -i error /var/log/abaplay/error.log

# Verificar performance
pm2 monit

# Verificar uso de recursos
htop
```

---

## 🔙 Rollback de Emergência

### **Cenário: Deploy Quebrou Produção**

#### **Rollback de Código (5 minutos)**

```bash
# SSH no servidor
ssh usuario@servidor-producao

# Navegar para pasta da aplicação
cd /var/www/abaplay

# Ver commits recentes
git log --oneline -5
# abc1234 Merge feature/subscription-modules (PROBLEMA)
# def5678 fix: corrigir agendamento (ÚLTIMA VERSÃO BOA)

# Voltar para commit anterior ao merge
git reset --hard def5678

# OU voltar para main sem o merge
git checkout main
git reset --hard origin/main~1  # ~1 = um commit antes

# Reinstalar dependências da versão antiga
cd backend && npm install
cd ../frontend && npm install && npm run build

# Reiniciar
pm2 restart all

# Verificar
pm2 logs abaplay

# Sair
exit
```

#### **Rollback de Migration (10 minutos)** ⚠️

**ATENÇÃO**: Só fazer se realmente necessário!

```bash
# Conectar no banco
psql -h dpg-... -U ... -d abaplay_postgres_db

# Verificar se há clínicas no plano 'scheduling'
SELECT COUNT(*) FROM clinics WHERE subscription_plan = 'scheduling';
-- Se 0: Pode fazer rollback tranquilo
-- Se > 0: CUIDADO! Converter para 'pro' antes

-- Converter todas para Pro (se necessário)
UPDATE clinics SET subscription_plan = 'pro' WHERE subscription_plan = 'scheduling';

-- Remover coluna de plano
ALTER TABLE clinics DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE clinics DROP COLUMN IF EXISTS trial_pro_enabled;
ALTER TABLE clinics DROP COLUMN IF EXISTS trial_pro_expires_at;
-- ... etc

-- Remover tabelas
DROP TABLE IF EXISTS subscription_usage_analytics;
DROP TABLE IF EXISTS trial_history;
DROP TABLE IF EXISTS subscription_plan_prices CASCADE;

-- Remover views
DROP VIEW IF EXISTS v_clinic_subscription_details;

-- Remover funções
DROP FUNCTION IF EXISTS activate_trial_pro;
DROP FUNCTION IF EXISTS convert_trial_to_pro;
DROP FUNCTION IF EXISTS expire_trials;
DROP FUNCTION IF EXISTS log_feature_access;
DROP FUNCTION IF EXISTS get_upgrade_opportunities;
DROP FUNCTION IF EXISTS get_trial_conversion_stats;
```

#### **Reverter Merge no Git (Histórico Limpo)**

```bash
# No seu computador local
git checkout main
git pull origin main

# Reverter merge (cria novo commit que desfaz)
git revert -m 1 HEAD
# -m 1 = manter a main como "principal"

# Commit de reversão
# Editor abre, adicionar mensagem:
"""
Revert "Merge feature/subscription-modules"

Rollback temporário do sistema de módulos devido a [MOTIVO].
Investigar e re-deployar após correção.
"""

# Push
git push origin main

# Deploy da reversão
ssh usuario@servidor-producao
cd /var/www/abaplay
git pull origin main
pm2 restart all
exit
```

---

## 📚 Boas Práticas

### **Commits**

✅ **Bom**:
```bash
git commit -m "feat: adicionar middleware de verificação de plano"
git commit -m "fix: corrigir cálculo de dias restantes do trial"
git commit -m "refactor: extrair lógica de preços para getPriceByPlan()"
```

❌ **Ruim**:
```bash
git commit -m "mudanças"
git commit -m "fix"
git commit -m "atualizações do dia"
```

### **Branches**

✅ **Bom**:
- `feature/subscription-modules`
- `hotfix/agendamento-duplicado`
- `fix/trial-banner-responsivo`

❌ **Ruim**:
- `teste`
- `nova-branch`
- `branch-2`

### **Frequência de Commits**

✅ **Ideal**:
- A cada funcionalidade pequena completa (30min-1h de trabalho)
- Antes de pausar para almoço/fim do dia
- Antes de mudar de contexto (trabalhar em outro arquivo)

❌ **Evitar**:
- 1 commit gigante no final do dia
- 50 commits de "wip" sem sentido

### **Mensagens de Commit**

**Estrutura recomendada**:

```
tipo: descrição curta (máx 50 caracteres)

Descrição mais longa explicando o porquê (opcional).
Pode ter múltiplas linhas.

Refs: #123 (issue relacionada)
```

**Exemplo completo**:

```bash
git commit -m "feat: adicionar sistema de trial Pro

Implementa ativação de trial pelo SuperAdmin com:
- Duração configurável (7-30 dias)
- Expiração automática via cron job
- Analytics de conversão

Refs: #456
"
```

### **Segurança com Base de Dados Compartilhada**

⚠️ **CUIDADOS**:

1. **Não deletar dados em dev**
```bash
# ❌ NUNCA rodar em dev conectado na base prod
DELETE FROM patients WHERE ...
DROP TABLE ...
```

2. **Testar migrations em backup primeiro**
```bash
# Criar backup antes de migration
pg_dump ... > backup-antes-migration.sql

# Restaurar se der errado
psql ... < backup-antes-migration.sql
```

3. **Feature flags para rollback fácil**
```javascript
// Permite desativar sem re-deploy
if (process.env.ENABLE_SUBSCRIPTION_MODULES === 'true') {
  // Código novo
} else {
  // Código antigo (fallback)
}
```

### **Organização de Arquivos**

✅ **Criar arquivos novos em pastas corretas**:

```
backend/src/
├── controllers/
│   └── trialController.js          ✅ NOVO
├── middleware/
│   └── subscriptionMiddleware.js   ✅ NOVO
├── routes/
│   └── trialRoutes.js              ✅ NOVO
└── jobs/
    └── trialExpirationJob.js       ✅ NOVO

frontend/src/
├── components/
│   ├── trial/
│   │   └── TrialBanner.js          ✅ NOVO
│   └── superAdmin/
│       └── TrialManagement.js      ✅ NOVO
├── hooks/
│   └── useSubscriptionAccess.js    ✅ NOVO
└── api/
    └── trialApi.js                 ✅ NOVO
```

---

## ⚡ Comandos Rápidos

### **Git - Comandos Essenciais**

```bash
# Status (o que mudou)
git status

# Ver mudanças
git diff

# Adicionar tudo
git add .

# Commit
git commit -m "mensagem"

# Push
git push origin feature/subscription-modules

# Pull (atualizar)
git pull origin feature/subscription-modules

# Trocar de branch
git checkout main
git checkout feature/subscription-modules

# Ver branches
git branch

# Ver histórico
git log --oneline -10

# Desfazer último commit (mantém mudanças)
git reset --soft HEAD~1

# Desfazer mudanças não commitadas
git checkout -- arquivo.js
git restore arquivo.js  # Git 2.23+
```

### **Fluxo Hotfix (Copy-Paste)**

```bash
# 1. Salvar trabalho atual
git add . && git commit -m "wip: pausado para hotfix" && git push

# 2. Criar hotfix
git checkout main && git pull && git checkout -b hotfix/nome-do-bug

# 3. (Corrigir bug aqui)

# 4. Commit e merge
git add . && git commit -m "fix: descrição" && git checkout main && git merge hotfix/nome-do-bug && git push origin main

# 5. Sincronizar feature
git checkout feature/subscription-modules && git merge main && git push

# 6. Continuar desenvolvendo
```

### **Desenvolvimento - Aliases Úteis**

Adicionar ao `~/.bashrc` ou `~/.zshrc`:

```bash
# Aliases Git
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push origin'
alias gl='git pull origin'
alias gco='git checkout'
alias glog='git log --oneline --graph --decorate --all'

# Aliases Projeto
alias aba-backend='cd ~/projetos/abaplay/backend && npm run dev'
alias aba-frontend='cd ~/projetos/abaplay/frontend && npm start'
alias aba-feature='git checkout feature/subscription-modules'
alias aba-main='git checkout main'
```

**Usar**:

```bash
# Ao invés de: git status
gs

# Ao invés de: git add . && git commit -m "feat: nova feature"
ga && gc "feat: nova feature"

# Ao invés de: git checkout feature/subscription-modules
aba-feature
```

---

## 📝 Template de Commit Diário

```bash
# Manhã (início do dia)
git checkout feature/subscription-modules
git pull origin feature/subscription-modules
git merge origin/main  # Sincronizar correções

# Durante o dia (a cada funcionalidade)
git add .
git commit -m "feat: [descrição]"
git push origin feature/subscription-modules

# Fim do dia
git add .
git commit -m "wip: [onde parou] - Dia X/7"
git push origin feature/subscription-modules
echo "Pausado: $(date) - Próximo: [tarefa]" >> PROGRESSO.md
git add PROGRESSO.md && git commit -m "docs: checkpoint dia X" && git push
```

---

## 🎯 Checklist de Workflow

### **Diário**
- [ ] Começar: `git checkout feature/subscription-modules && git pull`
- [ ] Sincronizar: `git merge origin/main` (se houver correções)
- [ ] Desenvolver e commitar frequentemente
- [ ] Terminar: `git push origin feature/subscription-modules`

### **Hotfix**
- [ ] Pausar: `git add . && git commit -m "wip" && git push`
- [ ] Hotfix: `git checkout main && git checkout -b hotfix/...`
- [ ] Corrigir, testar, commit
- [ ] Merge: `git checkout main && git merge hotfix/... && git push`
- [ ] Deploy: SSH + pull + restart
- [ ] Sync: `git checkout feature/... && git merge main`

### **Deploy Final**
- [ ] Testar TUDO localmente
- [ ] Executar migration
- [ ] Merge na main: `git checkout main && git merge feature/...`
- [ ] Push: `git push origin main`
- [ ] Deploy: SSH + pull + npm install + restart
- [ ] Validar produção
- [ ] Monitorar 24h

---

## 🆘 Troubleshooting

### **Problema: "Sua branch está desatualizada"**

```bash
git pull origin feature/subscription-modules
# Se der conflito, resolver e commit
```

### **Problema: "Não consigo fazer push"**

```bash
# Forçar push (CUIDADO - só se trabalha sozinho)
git push --force-with-lease origin feature/subscription-modules
```

### **Problema: "Commitei na branch errada"**

```bash
# Ver último commit
git log -1

# Desfazer commit (mantém mudanças)
git reset --soft HEAD~1

# Trocar para branch correta
git checkout feature/subscription-modules

# Commitar novamente
git add . && git commit -m "mensagem"
```

### **Problema: "Quero descartar TODAS as mudanças"**

```bash
# ⚠️ CUIDADO: Perde todo trabalho não commitado
git reset --hard HEAD
git clean -fd  # Remove arquivos não rastreados
```

### **Problema: "Migration quebrou o banco"**

```bash
# Restaurar backup
psql ... < backup-antes-migration.sql

# OU reverter migration manualmente
psql ... -c "ALTER TABLE clinics DROP COLUMN subscription_plan;"
```

---

## 🎉 Resumo Final

### **Comandos do Dia-a-Dia**

```bash
# Iniciar
git checkout feature/subscription-modules
git pull origin feature/subscription-modules

# Desenvolver
# ... codificar ...
git add .
git commit -m "feat: descrição"
git push origin feature/subscription-modules

# Hotfix (se necessário)
git add . && git commit -m "wip" && git push
git checkout main && git checkout -b hotfix/nome
# ... corrigir ...
git add . && git commit -m "fix: descrição"
git checkout main && git merge hotfix/nome && git push
# Deploy
git checkout feature/subscription-modules && git merge main

# Deploy final
git checkout main
git merge feature/subscription-modules
git push origin main
# SSH + pull + restart
```

### **Regras de Ouro**

1. ✅ **Sempre** commitar antes de trocar de branch
2. ✅ **Sempre** fazer pull antes de push
3. ✅ **Sempre** testar localmente antes de push
4. ✅ **Sempre** fazer backup antes de migration
5. ✅ **Sempre** sincronizar correções da main

### **Quando Pedir Ajuda**

- ❓ Conflitos de merge complexos
- ❓ Perda de commits (reflog pode salvar)
- ❓ Migration irreversível
- ❓ Deploy que quebrou produção

---

**Sucesso no desenvolvimento!** 🚀

**Última atualização**: Janeiro 2025
**Versão**: 1.0
