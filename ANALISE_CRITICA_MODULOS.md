# 🚨 ANÁLISE CRÍTICA - PROBLEMAS ADICIONAIS ENCONTRADOS

**Data**: Janeiro 2025
**Status**: **INCOMPLETO - FALHAS CRÍTICAS DE SEGURANÇA**

---

## ⚠️ RESUMO EXECUTIVO

Após análise aprofundada, identifiquei **PROBLEMAS CRÍTICOS DE SEGURANÇA** que não estavam no guia original:

### **🔴 PROBLEMAS CRÍTICOS ADICIONAIS**

1. ❌ **Backend sem proteção**: Rotas de programas NÃO usam `requireProPlan`
2. ❌ **Backend sem proteção**: Rotas de dashboard NÃO usam `requireProPlan`
3. ⚠️ **Notificações misturadas**: `case_discussion` e `parent_chat` são features Pro, mas usam mesmo enum

---

## 🔍 PROBLEMA 7: BACKEND - ROTAS DE PROGRAMAS SEM PROTEÇÃO

### **Descoberta**
As rotas de programas em `backend/src/routes/programRoutes.js` **NÃO têm middleware `requireProPlan`**.

### **Impacto**
Mesmo com frontend bloqueando a interface, um usuário de plano scheduling pode:
- Fazer requisições diretas via API (Postman, curl, etc.)
- Acessar biblioteca de programas
- Atribuir programas a pacientes
- **BURLAR completamente o sistema de planos**

### **Código Atual (INSEGURO)**
```javascript
// backend/src/routes/programRoutes.js
router.get('/', programController.getAllPrograms); // ❌ SEM PROTEÇÃO
router.post('/custom', programController.createCustomProgram); // ❌ SEM PROTEÇÃO
router.get('/patient/:patientId/grade', programController.getPatientProgramsGrade); // ❌ SEM PROTEÇÃO
```

### **Solução Necessária**
```javascript
// backend/src/routes/programRoutes.js
const { requireProPlan } = require('../middleware/subscriptionMiddleware');

// Aplicar em TODAS as rotas de programas:
router.get('/', requireProPlan, programController.getAllPrograms); // ✅ PROTEGIDO
router.post('/custom', requireProPlan, programController.createCustomProgram); // ✅ PROTEGIDO
router.get('/patient/:patientId/grade', requireProPlan, programController.getPatientProgramsGrade); // ✅ PROTEGIDO
// ... aplicar em TODAS
```

---

## 🔍 PROBLEMA 8: BACKEND - OUTRAS ROTAS PRO SEM PROTEÇÃO

### **Rotas que PRECISAM de `requireProPlan`**

#### **1. Dashboard / Analytics**
```javascript
// Procurar por rotas de dashboard e aplicar:
router.get('/api/dashboard/*', requireProPlan, ...);
```

#### **2. Registros Detalhados de Sessão com Prompting**
```javascript
// Rotas de patient_program_progress (registro detalhado):
router.post('/api/progress/*', requireProPlan, ...);
router.put('/api/progress/*', requireProPlan, ...);
```

#### **3. Relatórios de Evolução**
```javascript
// Rotas de relatórios Pro:
router.get('/api/reports/evolution/*', requireProPlan, ...);
```

#### **4. Chat com Pais e Discussões de Caso**
```javascript
// Estas são features Pro:
router.get('/api/parent-chat/*', requireProPlan, ...);
router.post('/api/parent-chat/*', requireProPlan, ...);
router.get('/api/case-discussion/*', requireProPlan, ...);
router.post('/api/case-discussion/*', requireProPlan, ...);
```

#### **5. Prontuário Expandido (Edição)**
```javascript
// Leitura pode ser permitida (dados existentes), mas EDIÇÃO é Pro:
router.put('/api/expanded-patient/*', requireProPlan, ...);
router.post('/api/expanded-patient/*', requireProPlan, ...);
```

---

## 🔍 PROBLEMA 9: NOTIFICAÇÕES - TIPOS MISTURADOS

### **Descoberta**
O enum `chat_type` contém tipos de notificações de **AGENDAMENTO** e **PRO** misturados:

```sql
-- Enum atual:
'case_discussion'         -- ✅ Pro
'parent_chat'             -- ✅ Pro
'scheduling_reminder'     -- ✅ Agendamento
'appointment_cancelled'   -- ✅ Agendamento
'appointment_created'     -- ✅ Agendamento
```

### **Análise**
- ✅ **BOM**: Tipos estão separados logicamente
- ✅ **BOM**: `case_discussion` e `parent_chat` só funcionam se tiverem dados (features Pro)
- ⚠️ **ATENÇÃO**: Frontend precisa filtrar notificações por plano

### **Verificação Necessária no Frontend**

**NotificationsPage.js / NotificationPanel.js**:
```javascript
// Deve filtrar notificações baseado no plano:
const allowedNotificationTypes = hasProAccess()
  ? ['case_discussion', 'parent_chat', 'scheduling_reminder', 'appointment_cancelled', 'appointment_created']
  : ['scheduling_reminder', 'appointment_cancelled', 'appointment_created']; // Apenas agendamento

const filteredNotifications = notifications.filter(n =>
  allowedNotificationTypes.includes(n.chatType)
);
```

**Status**: ⚠️ **PRECISA VERIFICAR** se já está implementado

---

## 🔍 PROBLEMA 10: MIGRAÇÃO - DADOS ÓRFÃOS

### **Cenário: Downgrade Pro → Agendamento**

Se uma clínica Pro fez downgrade para Agendamento:

#### **Dados que ficam "órfãos" (não deletados, mas inacessíveis)**:

1. **Programas Atribuídos** (`patient_program_assignments`)
   - ✅ Permanecem no banco
   - ❌ Interface bloqueada
   - ⚠️ **PROBLEMA**: Se terapeuta tentar marcar sessão como "completed" via nova interface, pode gerar conflito se houver `progress_session_id` apontando para programa

2. **Registros Detalhados** (`patient_program_progress`)
   - ✅ Permanecem no banco
   - ❌ Não podem ser criados novos
   - ⚠️ **PROBLEMA**: `scheduled_sessions.progress_session_id` pode apontar para registro inacessível

3. **Notificações Pro**
   - ⚠️ `case_discussion` e `parent_chat` antigas ficam no banco
   - ❌ Não podem ser criadas novas (features bloqueadas)
   - ⚠️ Precisam ser filtradas no frontend

### **Solução Recomendada**

**Opção 1: Modo Read-Only para Dados Pro (MELHOR)**
```javascript
// Ao fazer downgrade, permitir VISUALIZAR dados Pro antigos, mas bloquear EDIÇÃO
if (subscription_plan === 'scheduling' && hasLegacyProData) {
  return {
    canView: true,  // Permite ver programas/sessões antigas
    canEdit: false, // Bloqueia criar/editar novos
    message: 'Dados do plano Pro anterior. Atualize para editar.'
  };
}
```

**Opção 2: Aviso de Downgrade no Super Admin**
```javascript
// Antes de fazer downgrade, verificar se há dados Pro:
const hasProData = await checkClinicHasProData(clinicId);

if (hasProData.programs > 0 || hasProData.expandedPatients > 0) {
  showWarning(`
    ⚠️ Esta clínica possui:
    - ${hasProData.programs} programas atribuídos
    - ${hasProData.expandedPatients} pacientes com dados expandidos
    - ${hasProData.detailedSessions} sessões detalhadas registradas

    Ao fazer downgrade:
    ✅ Dados NÃO serão deletados
    ❌ Funcionalidades ficarão inacessíveis
    ✅ Dados voltam ao reativar Pro
  `);
}
```

---

## ✅ CHECKLIST ATUALIZADO DE IMPLEMENTAÇÃO

### **FASE 0: SEGURANÇA CRÍTICA (FAZER PRIMEIRO)**
**Tempo**: 2-3 horas

- [ ] **Tarefa 7**: Proteger rotas de programas com `requireProPlan`
- [ ] **Tarefa 8**: Proteger outras rotas Pro (dashboard, relatórios, chats)
- [ ] **Tarefa 9**: Verificar filtro de notificações no frontend
- [ ] **Tarefa 10**: Implementar aviso de downgrade no Super Admin

### **FASE 1: FUNCIONALIDADE CRÍTICA**
**Tempo**: 2-3 horas

- [ ] **Tarefa 6**: Sistema de Registro de Sessão Simplificado

### **FASE 2: SEGURANÇA FRONTEND**
**Tempo**: 1 hora

- [ ] **Tarefa 2**: Ocultar Dashboard
- [ ] **Tarefa 4**: Proteger rota /programs

### **FASE 3: UX**
**Tempo**: 1.5 horas

- [ ] **Tarefa 1**: Seletor de plano no cadastro
- [ ] **Tarefa 3**: Ocultar botão "Programas Atribuídos"
- [ ] **Tarefa 5**: Formulário simplificado de paciente

**Tempo Total**: ~6.5-8.5 horas (com segurança backend)

---

## 📊 TABELA DE ROTAS - PROTEÇÃO NECESSÁRIA

| Rota | Feature | Plano Necessário | Status Atual | Ação |
|------|---------|------------------|--------------|------|
| `/api/programs/*` | Biblioteca de Programas | Pro | ❌ SEM PROTEÇÃO | Adicionar `requireProPlan` |
| `/api/assignments/*` | Atribuição de Programas | Pro | ❌ VERIFICAR | Adicionar `requireProPlan` se necessário |
| `/api/progress/*` | Registro Detalhado | Pro | ❌ VERIFICAR | Adicionar `requireProPlan` |
| `/api/reports/evolution/*` | Relatórios de Evolução | Pro | ❌ VERIFICAR | Adicionar `requireProPlan` |
| `/api/parent-chat/*` | Chat com Pais | Pro | ❌ VERIFICAR | Adicionar `requireProPlan` |
| `/api/case-discussion/*` | Discussões de Caso | Pro | ❌ VERIFICAR | Adicionar `requireProPlan` |
| `/api/expanded-patient/*` (PUT/POST) | Edição Prontuário | Pro | ❌ VERIFICAR | Adicionar `requireProPlan` |
| `/api/scheduling/*` | Agendamento | Ambos | ✅ SEM PROTEÇÃO OK | Deixar livre |
| `/api/admin/*` | Administração | Ambos | ✅ SEM PROTEÇÃO OK | Deixar livre |

---

## 🚨 CONCLUSÃO CRÍTICA

**O GUIA ORIGINAL ESTÁ 60% COMPLETO**

### **O que está faltando:**

1. ❌ **Proteção de rotas no backend** (CRÍTICO)
2. ❌ **Filtro de notificações Pro** (verificar)
3. ❌ **Aviso de downgrade** (importante)
4. ❌ **Modo read-only para dados órfãos** (desejável)

### **Risco Atual**:
🔴 **ALTO** - Sistema pode ser burlado via API direta

### **Recomendação**:
1. **URGENTE**: Implementar Fase 0 (proteção backend)
2. **CRÍTICO**: Implementar Tarefa 6 (registro de sessão)
3. **IMPORTANTE**: Implementar Fases 2 e 3

---

**Próximo Passo**: Atualizar `GUIA_FINALIZACAO_MODULOS.md` com estas descobertas críticas.
