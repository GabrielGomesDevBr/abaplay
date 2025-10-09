# 🔒 ANÁLISE COMPLETA DE SEGURANÇA - TODAS AS ROTAS BACKEND

**Data**: Janeiro 2025
**Branch**: `feature/subscription-modules`
**Arquivos Analisados**: 16 arquivos de rotas

---

## 📊 RESUMO EXECUTIVO

### **Estatísticas da Análise**
- **Total de Arquivos de Rotas**: 16
- **Rotas que PRECISAM proteção `requireProPlan`**: 8 arquivos (50%)
- **Rotas SEM proteção adequada**: 45+ rotas individuais
- **Gravidade**: 🔴 **CRÍTICA**

---

## 🎯 CLASSIFICAÇÃO DAS ROTAS

### **CATEGORIA A: PLANO PRO - PRECISAM `requireProPlan`** 🔴

| Arquivo | Feature | Nº Rotas | Status Atual | Prioridade |
|---------|---------|----------|--------------|------------|
| `programRoutes.js` | Biblioteca de Programas | 15 | ❌ SEM PROTEÇÃO | 🔴 CRÍTICA |
| `assignmentRoutes.js` | Atribuição de Programas | 10 | ❌ SEM PROTEÇÃO | 🔴 CRÍTICA |
| `promptLevelRoutes.js` | Níveis de Prompting | 3 | ❌ SEM PROTEÇÃO | 🔴 CRÍTICA |
| `reportRoutes.js` | Relatórios de Evolução | 4 | ❌ SEM PROTEÇÃO | 🔴 ALTA |
| `caseDiscussionRoutes.js` | Discussões de Caso | 2 | ❌ SEM PROTEÇÃO | 🔴 ALTA |
| `parentChatRoutes.js` | Chat com Pais | 2 | ❌ SEM PROTEÇÃO | 🔴 ALTA |
| `contactRoutes.js` | Contatos Profissionais | 2 | ⚠️ PARCIAL | 🟡 MÉDIA |
| `parentRoutes.js` | Dashboard de Pais | 1 | ⚠️ PARCIAL | 🟡 MÉDIA |

### **CATEGORIA B: AMBOS OS PLANOS - OK SEM PROTEÇÃO** ✅

| Arquivo | Feature | Status |
|---------|---------|--------|
| `adminRoutes.js` | Gestão Admin | ✅ OK (apenas admin role) |
| `schedulingRoutes.js` | Agendamento | ✅ OK (recurso scheduling) |
| `recurringAppointmentRoutes.js` | Agendamentos Recorrentes | ✅ OK (recurso scheduling) |
| `therapistScheduleRoutes.js` | Agenda Pessoal | ✅ OK (recurso scheduling) |
| `authRoutes.js` | Autenticação | ✅ OK (público/auth) |
| `subscriptionRoutes.js` | Assinaturas | ✅ OK (super admin) |
| `superAdminRoutes.js` | Super Admin | ✅ OK (super admin) |
| `notificationRoutes.js` | Notificações | ✅ OK (ambos) |

### **CATEGORIA C: CASOS ESPECIAIS** ⚠️

| Arquivo | Regra Especial | Ação Necessária |
|---------|----------------|-----------------|
| `patientRoutes.js` | Edição de dados expandidos | ⚠️ Apenas PUT `/patients/:id/expanded` precisa `requireProPlan` |

---

## 🔴 DETALHAMENTO DAS ROTAS QUE PRECISAM PROTEÇÃO

### **1. programRoutes.js** - 🔴 CRÍTICO

**Feature**: Biblioteca de Programas ABA (Pro)

#### **Rotas SEM Proteção (15)**:
```javascript
// ❌ TODAS ESTAS ROTAS PRECISAM DE requireProPlan:

// Programas globais (super admin) - OK como está
router.post('/global', verifySuperAdmin, ...); // ✅ OK
router.get('/global', verifySuperAdmin, ...); // ✅ OK
router.put('/global/:id', verifySuperAdmin, ...); // ✅ OK
router.delete('/global/:id', verifySuperAdmin, ...); // ✅ OK

// Programas customizados - PRECISAM PROTEÇÃO
router.get('/hierarchy', ...); // ❌ Hierarquia de disciplinas
router.post('/custom', ...); // ❌ Criar programa customizado
router.get('/custom', ...); // ❌ Buscar programas customizados
router.put('/custom/:id', ...); // ❌ Atualizar programa customizado
router.delete('/custom/:id', ...); // ❌ Deletar programa customizado

// Programas gerais - PRECISAM PROTEÇÃO
router.post('/', ...); // ❌ Criar programa
router.get('/', ...); // ❌ Listar todos os programas
router.get('/:id', ...); // ❌ Detalhes de programa
router.put('/:id', ...); // ❌ Atualizar programa
router.delete('/:id', ...); // ❌ Deletar programa

// Programas de pacientes - PRECISAM PROTEÇÃO
router.get('/patient/:patientId/grade', ...); // ❌ Grade de programas do paciente
router.get('/:id/usage', ...); // ❌ Estatísticas de uso
```

#### **Correção Necessária**:
```javascript
// programRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Aplicar em TODAS as rotas (exceto /global que é super admin):
router.get('/hierarchy', requireProPlan, programController.getDisciplineHierarchy);
router.post('/custom', requireProPlan, programController.createCustomProgram);
router.get('/custom', requireProPlan, programController.getCustomPrograms);
router.put('/custom/:id', requireProPlan, programController.updateCustomProgram);
router.delete('/custom/:id', requireProPlan, programController.deleteCustomProgram);
router.post('/', requireProPlan, programController.createProgram);
router.get('/', requireProPlan, programController.getAllPrograms);
router.get('/patient/:patientId/grade', requireProPlan, programController.getPatientProgramsGrade);
router.get('/:id/usage', requireProPlan, programController.getProgramUsage);
router.get('/:id', requireProPlan, programController.getProgramDetails);
router.put('/:id', requireProPlan, programController.updateProgram);
router.delete('/:id', requireProPlan, programController.deleteProgram);
```

---

### **2. assignmentRoutes.js** - 🔴 CRÍTICO

**Feature**: Atribuição de Programas a Pacientes (Pro)

#### **Rotas SEM Proteção (10)**:
```javascript
// ❌ TODAS PRECISAM DE requireProPlan:
router.get('/prompt-levels', ...); // ❌ Níveis de prompting disponíveis
router.post('/progress', ...); // ❌ Registrar progresso detalhado
router.post('/', ...); // ❌ Atribuir programa
router.delete('/:assignmentId', ...); // ❌ Remover atribuição
router.get('/patient/:patientId', ...); // ❌ Programas do paciente
router.get('/:id', ...); // ❌ Detalhes de atribuição
router.get('/:id/history', ...); // ❌ Histórico (incluindo arquivados)
router.patch('/:id/status', ...); // ❌ Atualizar status
router.get('/:assignmentId/progress', ...); // ❌ Evolução
router.put('/:assignmentId/custom-trials', ...); // ❌ Tentativas customizadas
```

#### **Correção Necessária**:
```javascript
// assignmentRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Aplicar em TODAS as rotas:
router.get('/prompt-levels', requireProPlan, assignmentController.getPromptLevels);
router.post('/progress', requireProPlan, assignmentController.recordProgress);
router.post('/', requireProPlan, assignmentController.assignProgramToPatient);
router.delete('/:assignmentId', requireProPlan, assignmentController.removeProgramFromPatient);
router.get('/patient/:patientId', requireProPlan, assignmentController.getAssignedProgramsByPatientId);
router.get('/:id', requireProPlan, assignmentController.getAssignmentDetails);
router.get('/:id/history', requireProPlan, assignmentController.getAssignmentDetailsWithHistory);
router.patch('/:id/status', requireProPlan, assignmentController.updateAssignmentStatus);
router.get('/:assignmentId/progress', requireProPlan, assignmentController.getEvolutionForAssignment);
router.put('/:assignmentId/custom-trials', requireProPlan, assignmentController.updateCustomTrials);
```

---

### **3. promptLevelRoutes.js** - 🔴 CRÍTICO

**Feature**: Gestão de Níveis de Prompting (Pro)

#### **Rotas SEM Proteção (3)**:
```javascript
// ❌ TODAS PRECISAM DE requireProPlan:
router.put('/assignment/:assignmentId', ...); // ❌ Atualizar prompt level
router.get('/assignment/:assignmentId', ...); // ❌ Buscar prompt level
router.get('/patient/:patientId/program/:programId', ...); // ❌ Prompt level por programa
```

#### **Correção Necessária**:
```javascript
// promptLevelRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Aplicar depois de verifyToken:
router.use(verifyToken);
router.use(requireProPlan); // ✅ Aplica em todas as rotas do arquivo

// Ou individualmente:
router.put('/assignment/:assignmentId', requireProPlan, promptLevelController.updatePromptLevel);
router.get('/assignment/:assignmentId', requireProPlan, promptLevelController.getCurrentPromptLevel);
router.get('/patient/:patientId/program/:programId', requireProPlan, promptLevelController.getPromptLevelByPatientAndProgram);
```

---

### **4. reportRoutes.js** - 🔴 ALTA

**Feature**: Relatórios de Evolução com IA (Pro)

#### **Rotas SEM Proteção (4)**:
```javascript
// ❌ TODAS PRECISAM DE requireProPlan:
router.get('/evolution-data/:patientId', ...); // ❌ Dados de evolução
router.put('/professional-data', ...); // ❌ Atualizar dados profissionais
router.put('/patient-data/:patientId', ...); // ❌ Atualizar dados complementares
router.get('/automatic-analysis/:patientId', ...); // ❌ Análise automática
```

#### **Correção Necessária**:
```javascript
// reportRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Aplicar depois de verifyToken:
router.use(verifyToken);
router.use(requireProPlan); // ✅ Aplica em todas as rotas

// Ou individualmente:
router.get('/evolution-data/:patientId', requireProPlan, reportController.getEvolutionReportData);
router.put('/professional-data', requireProPlan, reportController.updateProfessionalData);
router.put('/patient-data/:patientId', requireProPlan, reportController.updatePatientData);
router.get('/automatic-analysis/:patientId', requireProPlan, reportController.getAutomaticAnalysis);
```

---

### **5. caseDiscussionRoutes.js** - 🔴 ALTA

**Feature**: Discussões de Caso entre Terapeutas (Pro)

#### **Rotas SEM Proteção (2)**:
```javascript
// ❌ PRECISAM DE requireProPlan:
router.get('/patient/:patientId', verifyToken, ...); // ❌ Buscar mensagens
router.post('/patient/:patientId', verifyToken, ...); // ❌ Criar mensagem
```

#### **Correção Necessária**:
```javascript
// caseDiscussionRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

router.get('/patient/:patientId', verifyToken, requireProPlan, caseDiscussionController.getMessagesByPatient);
router.post('/patient/:patientId', verifyToken, requireProPlan, caseDiscussionController.createMessage);
```

---

### **6. parentChatRoutes.js** - 🔴 ALTA

**Feature**: Chat entre Pais e Terapeutas (Pro)

#### **Rotas SEM Proteção (2)**:
```javascript
// ❌ PRECISAM DE requireProPlan:
router.get('/:patientId', verifyToken, ...); // ❌ Buscar mensagens
router.post('/:patientId', verifyToken, ...); // ❌ Postar mensagem
```

#### **Correção Necessária**:
```javascript
// parentChatRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

router.get('/:patientId', verifyToken, requireProPlan, parentChatController.getMessages);
router.post('/:patientId', verifyToken, requireProPlan, parentChatController.postMessage);
```

---

### **7. contactRoutes.js** - ⚠️ PARCIAL

**Feature**: Contatos de Terapeutas e Colegas

#### **Análise**:
- `GET /therapists/:patientId` - Usado por pais (pode ser Pro ou Scheduling se houver pais)
- `GET /colleagues/:patientId` - Usado para discussões de caso (Pro apenas)

#### **Correção Necessária**:
```javascript
// contactRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Apenas /colleagues precisa proteção (discussões de caso = Pro)
router.get('/therapists/:patientId', verifyToken, contactController.getTherapistContacts); // ✅ OK
router.get('/colleagues/:patientId', verifyToken, requireProPlan, contactController.getColleagueContacts); // ❌ ADICIONAR
```

---

### **8. parentRoutes.js** - ⚠️ PARCIAL

**Feature**: Dashboard de Pais

#### **Análise**:
- Dashboard de pais mostra evolução de programas (Pro)
- Pais existem apenas em plano Pro (chat, acompanhamento)

#### **Correção Necessária**:
```javascript
// parentRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

router.get('/dashboard', verifyToken, requireProPlan, parentController.getDashboardData);
```

---

### **9. patientRoutes.js** - ⚠️ CASO ESPECIAL

**Feature**: Gestão de Pacientes

#### **Análise**:
- Leitura de pacientes: Ambos os planos ✅
- Edição de dados básicos: Ambos os planos ✅
- **Edição de dados expandidos**: Apenas Pro ❌

#### **Rotas Atuais**:
```javascript
router.get('/', verifyToken, ...); // ✅ OK - ambos
router.get('/:id', verifyToken, ...); // ✅ OK - ambos
router.patch('/:patientId/notes', verifyToken, ...); // ✅ OK - ambos
router.get('/:id/expanded', verifyToken, ...); // ⚠️ Leitura - OK (dados existentes)
router.put('/:id/expanded', verifyToken, ...); // ❌ Edição - PRECISA requireProPlan
```

#### **Correção Necessária**:
```javascript
// patientRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Apenas PUT /expanded precisa proteção:
router.put('/:id/expanded', verifyToken, requireProPlan, [...validações], patientController.updatePatientExpandedData);

// GET /expanded pode ficar sem (permite visualizar dados antigos ao fazer downgrade)
router.get('/:id/expanded', verifyToken, patientController.getPatientExpandedData); // ✅ OK
```

---

## 📊 RESUMO DAS CORREÇÕES NECESSÁRIAS

### **Total de Rotas a Proteger**: 45+

| Arquivo | Rotas a Proteger | Método |
|---------|------------------|--------|
| `programRoutes.js` | 15 rotas | Individual ou `router.use()` após imports |
| `assignmentRoutes.js` | 10 rotas | Individual ou `router.use()` |
| `promptLevelRoutes.js` | 3 rotas | `router.use(requireProPlan)` após `verifyToken` |
| `reportRoutes.js` | 4 rotas | `router.use(requireProPlan)` após `verifyToken` |
| `caseDiscussionRoutes.js` | 2 rotas | Individual (adicionar após `verifyToken`) |
| `parentChatRoutes.js` | 2 rotas | Individual (adicionar após `verifyToken`) |
| `contactRoutes.js` | 1 rota | Individual (`/colleagues` apenas) |
| `parentRoutes.js` | 1 rota | Individual |
| `patientRoutes.js` | 1 rota | Individual (`PUT /expanded` apenas) |

---

## 🛡️ ESTRATÉGIAS DE IMPLEMENTAÇÃO

### **Opção 1: router.use() - Mais Rápido** ⚡
Quando TODAS as rotas do arquivo precisam proteção:

```javascript
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

router.use(verifyToken);
router.use(requireProPlan); // ✅ Aplica em todas as rotas abaixo

// Todas as rotas agora exigem Pro
router.get('/', ...);
router.post('/', ...);
```

**Arquivos que podem usar**: `promptLevelRoutes.js`, `reportRoutes.js`

---

### **Opção 2: Individual - Mais Preciso** 🎯
Quando apenas algumas rotas precisam proteção:

```javascript
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Protegidas
router.get('/colleagues/:patientId', verifyToken, requireProPlan, ...);

// Livres
router.get('/therapists/:patientId', verifyToken, ...);
```

**Arquivos que precisam**: `contactRoutes.js`, `parentRoutes.js`, `patientRoutes.js`

---

### **Opção 3: Mista - Mais Organizada** 📋
Quando há muitas rotas, mas nem todas precisam:

```javascript
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Rotas públicas/scheduling
router.get('/public', ...);

// A partir daqui, todas precisam Pro
router.use(requireProPlan);

router.get('/pro-feature-1', ...);
router.post('/pro-feature-2', ...);
```

**Arquivos que podem usar**: `programRoutes.js` (exceto `/global`), `assignmentRoutes.js`

---

## ⚠️ IMPACTO DA NÃO-IMPLEMENTAÇÃO

### **Riscos de Segurança** 🔴

#### **1. Burla Completa do Sistema de Planos**
```bash
# Usuário com plano scheduling pode:
curl -H "Authorization: Bearer TOKEN_SCHEDULING" \
  http://api.abaplay.com/api/programs

# ❌ RESULTADO: Acessa biblioteca completa de programas
```

#### **2. Criação de Dados Pro em Plano Scheduling**
```bash
# Pode atribuir programas:
curl -X POST -H "Authorization: Bearer TOKEN_SCHEDULING" \
  -d '{"patient_id": 1, "program_id": 10}' \
  http://api.abaplay.com/api/assignments

# ❌ RESULTADO: Cria atribuições (feature Pro) sem pagar
```

#### **3. Acesso a Features Pagas Sem Autorização**
- Chat com pais ❌
- Discussões de caso ❌
- Relatórios de evolução ❌
- Dashboard analítico ❌
- Níveis de prompting ❌

### **Impacto Financeiro** 💰
- Clínicas usando features Pro sem pagar
- Perda de receita estimada: **100% do diferencial entre planos**
- Diferença de preço: R$ 25,00/paciente (R$ 10 → R$ 35)

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 0: Proteção Backend (URGENTE)**

```
[ ] 1. Criar arquivo de teste para validar proteções
[ ] 2. programRoutes.js (15 rotas)
[ ] 3. assignmentRoutes.js (10 rotas)
[ ] 4. promptLevelRoutes.js (3 rotas)
[ ] 5. reportRoutes.js (4 rotas)
[ ] 6. caseDiscussionRoutes.js (2 rotas)
[ ] 7. parentChatRoutes.js (2 rotas)
[ ] 8. contactRoutes.js (1 rota - /colleagues)
[ ] 9. parentRoutes.js (1 rota - /dashboard)
[ ] 10. patientRoutes.js (1 rota - PUT /expanded)
[ ] 11. Testar com Postman/curl cada rota protegida
[ ] 12. Validar mensagens de erro 403
[ ] 13. Testar com trial ativo (deve funcionar como Pro)
[ ] 14. Documentar alterações no CLAUDE.md
```

---

## 🧪 SCRIPT DE TESTE

Criar arquivo `backend/tests/subscription-security.test.js`:

```javascript
/**
 * Testes de segurança de assinatura
 * Valida que rotas Pro estão protegidas
 */

const request = require('supertest');
const app = require('../src/server');

describe('Proteção de Rotas Pro', () => {
  let schedulingToken, proToken;

  beforeAll(async () => {
    // Login com usuário scheduling
    const resScheduling = await request(app)
      .post('/api/auth/login')
      .send({ username: 'scheduling.user', password: 'test' });
    schedulingToken = resScheduling.body.token;

    // Login com usuário pro
    const resPro = await request(app)
      .post('/api/auth/login')
      .send({ username: 'pro.user', password: 'test' });
    proToken = resPro.body.token;
  });

  describe('Programas - Biblioteca Pro', () => {
    it('deve bloquear acesso de scheduling a /api/programs', async () => {
      const res = await request(app)
        .get('/api/programs')
        .set('Authorization', `Bearer ${schedulingToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('plano Pro');
      expect(res.body.requiresPro).toBe(true);
    });

    it('deve permitir acesso de pro a /api/programs', async () => {
      const res = await request(app)
        .get('/api/programs')
        .set('Authorization', `Bearer ${proToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('programs');
    });
  });

  describe('Atribuições - Feature Pro', () => {
    it('deve bloquear POST /api/assignments de scheduling', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${schedulingToken}`)
        .send({ patient_id: 1, program_id: 1 });

      expect(res.status).toBe(403);
    });
  });

  // ... Adicionar testes para todas as 45 rotas
});
```

---

## 📄 CÓDIGO PRONTO PARA IMPLEMENTAÇÃO

### **Template de Proteção**

```javascript
// [ARQUIVO].js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { requireProPlan } = require('../middleware/subscriptionMiddleware'); // ✅ ADICIONAR
const controller = require('../controllers/[CONTROLLER]');

// ==========================================
// ESTRATÉGIA 1: Proteger todas as rotas
// ==========================================
router.use(verifyToken);
router.use(requireProPlan); // ✅ Todas as rotas abaixo exigem Pro

router.get('/', controller.getAll);
router.post('/', controller.create);
// ...

// ==========================================
// ESTRATÉGIA 2: Proteger individualmente
// ==========================================
router.use(verifyToken);

// Rota protegida
router.get('/pro-feature', requireProPlan, controller.proFeature);

// Rota livre
router.get('/free-feature', controller.freeFeature);

module.exports = router;
```

---

## 🎯 PRIORIZAÇÃO FINAL

### **🔴 URGENTE (Fazer HOJE)**
1. `programRoutes.js` - Biblioteca de programas
2. `assignmentRoutes.js` - Atribuições
3. `promptLevelRoutes.js` - Níveis de prompting

### **🟠 ALTA (Fazer esta semana)**
4. `reportRoutes.js` - Relatórios
5. `caseDiscussionRoutes.js` - Discussões
6. `parentChatRoutes.js` - Chat com pais

### **🟡 MÉDIA (Fazer em seguida)**
7. `contactRoutes.js` - Contatos (/colleagues)
8. `parentRoutes.js` - Dashboard de pais
9. `patientRoutes.js` - Edição expandida

---

## 📞 CONCLUSÃO

### **Status Atual**: 🔴 **SISTEMA INSEGURO**

**45+ rotas de features Pro estão COMPLETAMENTE DESPROTEGIDAS no backend.**

Qualquer usuário com plano scheduling pode:
- ✅ Fazer requisições diretas via API
- ✅ Acessar biblioteca de programas
- ✅ Atribuir programas a pacientes
- ✅ Registrar sessões detalhadas
- ✅ Gerar relatórios de evolução
- ✅ Usar chat com pais
- ✅ Criar discussões de caso

**Bloqueio apenas no frontend NÃO É SEGURANÇA.**

### **Ação Imediata Necessária**:
Implementar proteção `requireProPlan` em TODAS as rotas Pro antes de qualquer deploy.

---

**Próximo Passo**: Atualizar `GUIA_FINALIZACAO_MODULOS.md` com Fase 0 detalhada.

**Tempo Estimado de Implementação**: 4-6 horas para todas as 45 rotas + testes.
