# 📦 PACOTE COMPLETO DE IMPLEMENTAÇÃO
## Sistema de Agendamento Refatorado - Fases 1 e 2

**Data:** 2025-09-30
**Versão:** 1.0

---

## 📋 ÍNDICE DE ARQUIVOS CRIADOS

### ✅ JÁ CRIADOS (Prontos para usar)

1. `backend/src/jobs/sessionMaintenanceJob.js` ✅
2. `backend/src/server.js` ✅ (atualizado)
3. `frontend/src/components/scheduling/PendingActionsPanel.js` ✅

### 📝 PATCHES CRIADOS (Aplicar manualmente)

4. `PATCH_schedulingController.js` - Adicionar 3 métodos ao controller
5. `PATCH_schedulingRoutes.js` - Adicionar 3 rotas

### 🔨 PRECISA CRIAR (Instruções abaixo)

**Backend:**
- Nenhum adicional necessário para Fase 1

**Frontend - Fase 1:**
6. `frontend/src/api/schedulingApi.js` - Adicionar 2 funções
7. `frontend/src/components/scheduling/OrphanSessionsList.js` - Atualizar com checkboxes
8. `frontend/src/components/scheduling/BatchRetroactiveModal.js` - Novo componente

**Frontend - Fase 2:**
9. `frontend/src/components/scheduling/UnifiedAppointmentWizard.js`
10. `frontend/src/components/scheduling/wizard-steps/BasicInfoStep.js`
11. `frontend/src/components/scheduling/wizard-steps/AppointmentTypeStep.js`
12. `frontend/src/components/scheduling/wizard-steps/ReviewStep.js`
13. `frontend/src/components/scheduling/RecurrencePreviewCalendar.js`
14. `frontend/src/pages/RecurringTemplatesPage.js`
15. `frontend/src/components/scheduling/RecurringTemplateCard.js`

---

## 🚀 GUIA DE APLICAÇÃO RÁPIDA

### PASSO 1: Aplicar Patches Backend (5 minutos)

#### 1.1 Atualizar schedulingController.js

Abra: `backend/src/controllers/schedulingController.js`

**Localize a última função antes de `module.exports`** e adicione:

```javascript
/**
 * NOVO: Buscar ações pendentes
 */
async getPendingActions(req, res, next) {
  try {
    const { clinic_id } = req.user;
    const pool = require('../models/db');

    const orphanSessions = await ScheduledSessionModel.findOrphanSessions({
      clinic_id,
      lookbackDays: 7
    });

    const missedQuery = `
      SELECT * FROM v_scheduled_sessions_complete
      WHERE patient_clinic_id = $1
      AND status = 'missed'
      AND justified_at IS NULL
      LIMIT 100
    `;
    const { rows: missedAppointments } = await pool.query(missedQuery, [clinic_id]);

    const today = new Date().toISOString().split('T')[0];
    const detectedQuery = `
      SELECT COUNT(*) as count
      FROM scheduled_sessions ss
      JOIN patients p ON ss.patient_id = p.id
      WHERE p.clinic_id = $1
      AND ss.status = 'completed'
      AND ss.detection_source IN ('auto_detected', 'orphan_converted')
      AND DATE(ss.updated_at) = $2
    `;
    const { rows: detectedResult } = await pool.query(detectedQuery, [clinic_id, today]);

    res.status(200).json({
      orphan_sessions: orphanSessions,
      missed_appointments: missedAppointments,
      detected_today: parseInt(detectedResult[0]?.count || 0),
      total_pending: orphanSessions.length + missedAppointments.length
    });

  } catch (error) {
    console.error('[SCHEDULING] Erro ao buscar ações pendentes:', error);
    next(error);
  }
},

async createBatchRetroactive(req, res, next) {
  try {
    const { session_ids, common_data } = req.body;
    const { id: userId, clinic_id } = req.user;
    const pool = require('../models/db');

    if (!Array.isArray(session_ids) || session_ids.length === 0) {
      return res.status(400).json({
        errors: [{ msg: 'Forneça pelo menos um session_id' }]
      });
    }

    if (session_ids.length > 50) {
      return res.status(400).json({
        errors: [{ msg: 'Máximo de 50 agendamentos por vez' }]
      });
    }

    const results = {
      total: session_ids.length,
      created: 0,
      failed: 0,
      appointments: [],
      errors: []
    };

    for (const sessionId of session_ids) {
      try {
        const orphanQuery = `
          SELECT ppp.id as session_id, ppp.session_date, ppa.patient_id, ppa.therapist_id, p.clinic_id
          FROM patient_program_progress ppp
          JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
          JOIN patients p ON ppa.patient_id = p.id
          WHERE ppp.id = $1 AND p.clinic_id = $2
        `;

        const { rows } = await pool.query(orphanQuery, [sessionId, clinic_id]);

        if (rows.length === 0) {
          results.failed++;
          results.errors.push(`Sessão ${sessionId}: não encontrada`);
          continue;
        }

        const orphan = rows[0];

        const retroactiveData = {
          patient_id: orphan.patient_id,
          therapist_id: orphan.therapist_id,
          session_date: orphan.session_date,
          session_time: '10:00',
          session_id: sessionId,
          created_by: userId,
          discipline_id: common_data.discipline_id || null,
          notes: common_data.notes || 'Agendamento retroativo criado em lote'
        };

        const appointment = await ScheduledSessionModel.createRetroactiveAppointment(retroactiveData);
        results.created++;
        results.appointments.push(appointment);

      } catch (error) {
        results.failed++;
        results.errors.push(`Sessão ${sessionId}: ${error.message}`);
      }
    }

    res.status(results.created > 0 ? 200 : 400).json({
      message: `${results.created} de ${results.total} agendamentos criados`,
      ...results
    });

  } catch (error) {
    console.error('[SCHEDULING] Erro ao criar retroativos em lote:', error);
    next(error);
  }
}
```

#### 1.2 Atualizar schedulingRoutes.js

Abra: `backend/src/routes/schedulingRoutes.js`

**Antes de `module.exports = router;`** adicione:

```javascript
// Novas rotas - Fase 1
router.get('/pending-actions', verifyToken, schedulingController.getPendingActions);
router.post('/retroactive/batch', verifyToken, schedulingController.createBatchRetroactive);
```

### PASSO 2: Atualizar API Frontend (5 minutos)

Abra: `frontend/src/api/schedulingApi.js`

**Adicione ao final do arquivo (antes do export default se houver):**

```javascript
/**
 * Buscar ações pendentes
 */
export const getPendingActions = async () => {
  try {
    const response = await api.get('/scheduling/pending-actions', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar ações pendentes');
    throw error;
  }
};

/**
 * Criar agendamentos retroativos em lote
 */
export const createBatchRetroactive = async (batchData) => {
  try {
    const response = await api.post('/scheduling/retroactive/batch', batchData, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar retroativos em lote');
    throw error;
  }
};
```

### PASSO 3: Testar Fase 1 (10 minutos)

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

**Verificar:**
1. ✅ Backend inicia sem erros
2. ✅ Job de manutenção está agendado (ver logs)
3. ✅ Endpoint `/api/scheduling/pending-actions` responde
4. ✅ PendingActionsPanel aparece na interface

---

## 📦 COMPONENTES FASE 1 COMPLETOS

Os componentes essenciais da Fase 1 estão todos criados. Para completar:

### BatchRetroactiveModal.js

Esse componente já está documentado no arquivo `REFACTORING_SCHEDULING_SYSTEM.md` linhas 635-817.

**Copie o código de lá e cole em:**
`frontend/src/components/scheduling/BatchRetroactiveModal.js`

### Atualização do OrphanSessionsList.js

O código completo está no documento `REFACTORING_SCHEDULING_SYSTEM.md` linhas 563-633.

**Substitua o conteúdo atual por esse código atualizado.**

---

## ⏭️ PRÓXIMOS PASSOS (Fase 2 - Opcional)

A Fase 2 inclui o Wizard e componentes avançados. Todos os códigos estão no documento principal.

**Componentes Fase 2:**
1. UnifiedAppointmentWizard (linhas 895-1079)
2. RecurrencePreviewCalendar (linhas 1179-1401)
3. RecurringTemplatesPage (linhas 1466-1625)
4. RecurringTemplateCard (linhas 1629-1634 - placeholder)

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Backend
- [ ] `sessionMaintenanceJob.js` existe
- [ ] `server.js` importa e agenda o novo job
- [ ] `schedulingController.js` tem 2 novos métodos
- [ ] `schedulingRoutes.js` tem 2 novas rotas
- [ ] Backend inicia sem erros
- [ ] Logs mostram job agendado

### Frontend
- [ ] `PendingActionsPanel.js` existe
- [ ] `schedulingApi.js` tem 2 novas funções
- [ ] Frontend compila sem erros
- [ ] PendingActionsPanel renderiza
- [ ] Ações pendentes são carregadas

### Funcional
- [ ] Job de manutenção roda automaticamente
- [ ] Dashboard mostra órfãs e perdidos
- [ ] Criação em lote funciona
- [ ] Sem quebra de funcionalidades existentes

---

## 🆘 TROUBLESHOOTING

### Erro: "Module not found"
**Solução:** Verifique paths dos imports

### Erro: "getPendingActions is not a function"
**Solução:** Certifique-se de adicionar as funções no controller E no schedulingApi.js

### Job não está rodando
**Solução:** Adicione `ENABLE_AUTO_DETECTION=true` no `.env`

### Nenhuma ação pendente aparece
**Solução:** Crie dados de teste (sessões órfãs) primeiro

---

## 📞 SUPORTE

Consulte o documento completo: `REFACTORING_SCHEDULING_SYSTEM.md`

**Seções importantes:**
- Linha 126: Fusão dos Jobs
- Linha 244: Dashboard de Ações Pendentes
- Linha 563: Criação em Lote
- Linha 847: Wizard Unificado (Fase 2)

---

**FIM DO GUIA DE IMPLEMENTAÇÃO**

Tempo estimado total: **20-30 minutos para Fase 1 completa**