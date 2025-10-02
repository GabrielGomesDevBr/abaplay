# 📋 REFATORAÇÃO DO SISTEMA DE AGENDAMENTO - GUIA COMPLETO

**Projeto:** ABAplay
**Módulo:** Sistema de Agendamento de Sessões Terapêuticas
**Versão:** 2.0
**Data:** 2025-09-30
**Objetivo:** Simplificar e automatizar o fluxo de agendamentos, detecção de sessões e gestão de recorrências

---

## 📑 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Análise do Estado Atual](#análise-do-estado-atual)
3. [Fase 1: Melhorias Rápidas](#fase-1-melhorias-rápidas)
4. [Fase 2: Unificação do UX](#fase-2-unificação-do-ux)
5. [Checklist de Implementação](#checklist-de-implementação)
6. [Testes Obrigatórios](#testes-obrigatórios)
7. [Rollback Plan](#rollback-plan)

---

## 🎯 VISÃO GERAL

### Objetivo da Refatoração

Transformar o sistema de agendamento atual (funcional mas fragmentado) em uma experiência fluida, intuitiva e automatizada, reduzindo significativamente o trabalho manual dos usuários.

### Princípios Norteadores

- ✅ **Menos Cliques, Mais Automação**
- ✅ **Feedback Visual Claro**
- ✅ **Ações em Lote Sempre que Possível**
- ✅ **Não Quebrar Funcionalidades Existentes**
- ✅ **Implementação Incremental**

### Métricas de Sucesso

| Métrica | Antes | Meta |
|---------|-------|------|
| Cliques para criar agendamento simples | 8-10 | 4-5 |
| Tempo para resolver sessões órfãs (10 itens) | 5-7 min | 1-2 min |
| Taxa de agendamentos perdidos sem justificativa | ~15% | <5% |
| Satisfação do usuário (escala 1-10) | 6-7 | 9-10 |

---

## 🔍 ANÁLISE DO ESTADO ATUAL

### Arquitetura Existente

#### Backend (`/backend/src/`)

**Models:**
- `scheduledSessionModel.js` - Gerenciamento de agendamentos individuais
- `recurringAppointmentModel.js` - Templates de recorrência

**Controllers:**
- `therapistScheduleController.js` - Operações de agenda dos terapeutas

**Jobs:**
- `sessionDetectionJob.js` - Detecção automática de sessões realizadas
- `recurringAppointmentJob.js` - Geração de agendamentos recorrentes

#### Frontend (`/frontend/src/components/scheduling/`)

**Componentes Principais:**
- `AppointmentForm.js` - Formulário de criação/edição (700+ linhas)
- `AppointmentsList.js` - Listagem de agendamentos
- `OrphanSessionsList.js` - Sessões órfãs
- `RetroactiveAppointmentModal.js` - Criação retroativa
- `RecurringTemplatesList.js` - Gestão de templates

### Pontos Fortes

✅ **Lógica de negócio robusta** - Sistema completo de validações e verificação de conflitos
✅ **Detecção inteligente** - Algoritmo eficiente de matching sessão-agendamento
✅ **Recorrência flexível** - Suporte a weekly, biweekly, monthly
✅ **Isolamento por clínica** - Segurança de dados garantida
✅ **Jobs configuráveis** - Ativação via variáveis de ambiente

### Pontos de Dor (Pain Points)

❌ **Fluxo fragmentado** - Usuário navega por múltiplas telas para tarefas relacionadas
❌ **Falta de visibilidade** - Jobs rodam mas usuário não sabe o resultado
❌ **Trabalho manual repetitivo** - Criar retroativos/justificar um por um
❌ **UX complexa** - Formulário de agendamento com muitas opções ao mesmo tempo
❌ **Jobs separados fazem trabalho complementar** - Poderia ser unificado

---

## 🚀 FASE 1: MELHORIAS RÁPIDAS

**Duração Estimada:** 1-2 semanas
**Complexidade:** Baixa-Média
**Impacto:** Alto
**Risco:** Baixo

### Objetivo

Reduzir drasticamente o trabalho manual através de automação e ações em lote, sem alterar componentes de UI principais.

---

### 1.1 Fusão dos Jobs de Manutenção

#### Problema

Atualmente existem dois jobs separados:
- `sessionDetectionJob.js` - Detecta e vincula sessões
- Job de marcação de perdidos (dentro do modelo)

Eles rodam independentemente mas fazem trabalho complementar.

#### Solução

Criar job unificado que executa workflow completo de manutenção.

#### Implementação

**Arquivo:** `/backend/src/jobs/sessionMaintenanceJob.js` (NOVO)

```javascript
// backend/src/jobs/sessionMaintenanceJob.js

const scheduledSessionModel = require('../models/scheduledSessionModel');
const NotificationModel = require('../models/notificationModel');

/**
 * Job unificado de manutenção do sistema de agendamento
 * Combina: detecção de sessões + marcação de perdidos + detecção de órfãs
 */
const SessionMaintenanceJob = {

  /**
   * Executa rotina completa de manutenção
   */
  async runMaintenanceRoutine(options = {}) {
    const {
      lookbackHours = 24,
      missedAfterHours = 2,
      notifyUsers = true
    } = options;

    console.log('[SESSION-MAINTENANCE] Iniciando rotina de manutenção...');

    const results = {
      started_at: new Date(),
      detected_sessions: [],
      missed_appointments: [],
      orphan_sessions: [],
      notifications_created: 0
    };

    try {
      // ETAPA 1: Detectar e vincular sessões realizadas
      console.log('[SESSION-MAINTENANCE] Etapa 1: Detectando sessões realizadas...');
      const detectionResult = await scheduledSessionModel.intelligentSessionDetection({
        clinic_id: null, // Rodar para todas as clínicas
        start_date: this.getDateFromHours(lookbackHours),
        end_date: new Date().toISOString().split('T')[0],
        auto_create_retroactive: false // Não criar retroativos automaticamente
      });

      results.detected_sessions = detectionResult.completed_sessions || [];
      console.log(`[SESSION-MAINTENANCE] ${results.detected_sessions.length} sessões detectadas e vinculadas`);

      // ETAPA 2: Marcar agendamentos vencidos como perdidos
      console.log('[SESSION-MAINTENANCE] Etapa 2: Marcando agendamentos perdidos...');
      const missedResult = await scheduledSessionModel.markMissedAppointments(missedAfterHours);
      results.missed_appointments = missedResult || [];
      console.log(`[SESSION-MAINTENANCE] ${results.missed_appointments.length} agendamentos marcados como perdidos`);

      // ETAPA 3: Detectar sessões órfãs (novas desde última execução)
      console.log('[SESSION-MAINTENANCE] Etapa 3: Detectando sessões órfãs...');
      const orphanResult = await scheduledSessionModel.findOrphanSessions({
        lookbackDays: Math.ceil(lookbackHours / 24)
      });
      results.orphan_sessions = orphanResult || [];
      console.log(`[SESSION-MAINTENANCE] ${results.orphan_sessions.length} sessões órfãs detectadas`);

      // ETAPA 4: Criar notificações consolidadas (se habilitado)
      if (notifyUsers) {
        console.log('[SESSION-MAINTENANCE] Etapa 4: Criando notificações...');
        results.notifications_created = await this.createConsolidatedNotifications(results);
        console.log(`[SESSION-MAINTENANCE] ${results.notifications_created} notificações criadas`);
      }

      results.completed_at = new Date();
      results.duration_ms = results.completed_at - results.started_at;
      results.success = true;

      console.log(`[SESSION-MAINTENANCE] Manutenção concluída com sucesso em ${results.duration_ms}ms`);
      return results;

    } catch (error) {
      console.error('[SESSION-MAINTENANCE] Erro na rotina de manutenção:', error);
      results.completed_at = new Date();
      results.duration_ms = results.completed_at - results.started_at;
      results.success = false;
      results.error = error.message;
      throw error;
    }
  },

  /**
   * Criar notificações consolidadas para usuários
   */
  async createConsolidatedNotifications(results) {
    let notificationCount = 0;

    // Agrupar por clínica para notificações consolidadas
    const clinicsToNotify = new Set();

    // Adicionar clínicas com órfãs
    results.orphan_sessions.forEach(orphan => {
      if (orphan.clinic_id) clinicsToNotify.add(orphan.clinic_id);
    });

    // Adicionar clínicas com perdidos
    results.missed_appointments.forEach(missed => {
      if (missed.patient_clinic_id) clinicsToNotify.add(missed.patient_clinic_id);
    });

    // Criar notificação consolidada por clínica
    for (const clinicId of clinicsToNotify) {
      const orphansInClinic = results.orphan_sessions.filter(o => o.clinic_id === clinicId);
      const missedInClinic = results.missed_appointments.filter(m => m.patient_clinic_id === clinicId);

      if (orphansInClinic.length > 0 || missedInClinic.length > 0) {
        try {
          // Criar notificação para administradores da clínica
          await NotificationModel.createClinicNotification({
            clinic_id: clinicId,
            title: 'Ações Pendentes no Agendamento',
            message: this.buildNotificationMessage(orphansInClinic.length, missedInClinic.length),
            type: 'scheduling_pending_actions',
            data: {
              orphan_count: orphansInClinic.length,
              missed_count: missedInClinic.length
            }
          });
          notificationCount++;
        } catch (error) {
          console.error(`[SESSION-MAINTENANCE] Erro ao criar notificação para clínica ${clinicId}:`, error);
        }
      }
    }

    return notificationCount;
  },

  /**
   * Construir mensagem de notificação
   */
  buildNotificationMessage(orphanCount, missedCount) {
    const messages = [];

    if (orphanCount > 0) {
      messages.push(`${orphanCount} sessão(ões) órfã(s) detectada(s)`);
    }

    if (missedCount > 0) {
      messages.push(`${missedCount} agendamento(s) perdido(s) sem justificativa`);
    }

    return messages.join(' • ');
  },

  /**
   * Calcular data a partir de horas atrás
   */
  getDateFromHours(hours) {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString().split('T')[0];
  },

  /**
   * Iniciar job agendado (para produção)
   */
  scheduleJob(intervalMinutes = 30) {
    console.log(`[SESSION-MAINTENANCE] Agendando job para rodar a cada ${intervalMinutes} minutos`);

    const intervalMs = intervalMinutes * 60 * 1000;

    // Executar imediatamente ao iniciar
    setTimeout(() => {
      this.runMaintenanceRoutine().catch(error => {
        console.error('[SESSION-MAINTENANCE] Erro na execução inicial:', error);
      });
    }, 5000);

    // Agendar execuções subsequentes
    setInterval(() => {
      this.runMaintenanceRoutine().catch(error => {
        console.error('[SESSION-MAINTENANCE] Erro na execução agendada:', error);
      });
    }, intervalMs);

    console.log('[SESSION-MAINTENANCE] Job agendado com sucesso');
  }
};

module.exports = SessionMaintenanceJob;
```

**Arquivo:** `/backend/src/server.js` (ATUALIZAR)

```javascript
// backend/src/server.js

// ... imports existentes ...
const SessionMaintenanceJob = require('./jobs/sessionMaintenanceJob');
const RecurringAppointmentJob = require('./jobs/recurringAppointmentJob');

// ... código existente ...

// Inicializar jobs de agendamento
const enableAutoDetection = process.env.ENABLE_AUTO_DETECTION === 'true' || process.env.NODE_ENV === 'production';
const enableRecurringJobs = process.env.ENABLE_RECURRING_JOBS === 'true' || process.env.NODE_ENV === 'production';

if (enableAutoDetection) {
  console.log('[SCHEDULING] Iniciando job de manutenção de sessões...');
  SessionMaintenanceJob.scheduleJob(30); // Rodar a cada 30 minutos
} else {
  console.log('[SCHEDULING] Job de manutenção desabilitado (NODE_ENV != production e ENABLE_AUTO_DETECTION != true)');
}

if (enableRecurringJobs) {
  console.log('[RECURRING] Iniciando job de agendamentos recorrentes...');
  RecurringAppointmentJob.scheduleJob(60); // Rodar a cada 60 minutos
} else {
  console.log('[RECURRING] Job de agendamentos recorrentes desabilitado (NODE_ENV != production e ENABLE_RECURRING_JOBS != true)');
}

// ... resto do código ...
```

#### Checklist de Implementação

- [ ] Criar arquivo `sessionMaintenanceJob.js`
- [ ] Implementar método `runMaintenanceRoutine()`
- [ ] Implementar criação de notificações consolidadas
- [ ] Atualizar `server.js` para usar novo job
- [ ] Remover/deprecar chamadas ao job antigo (`sessionDetectionJob.js`)
- [ ] Testar em desenvolvimento com `ENABLE_AUTO_DETECTION=true`
- [ ] Verificar logs de execução
- [ ] Deploy em produção

#### Testes

```bash
# Testar job manualmente
curl -X POST http://localhost:3000/api/scheduling/run-maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 1.2 Dashboard de Ações Pendentes

#### Problema

Jobs rodam automaticamente mas usuário não tem visibilidade do resultado. Não há interface clara mostrando o que precisa de atenção.

#### Solução

Criar painel de "Ações Pendentes" na tela principal de agendamento com contadores e ações rápidas.

#### Implementação

**Arquivo:** `/frontend/src/components/scheduling/PendingActionsPanel.js` (NOVO)

```jsx
// frontend/src/components/scheduling/PendingActionsPanel.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationCircle,
  faCheckCircle,
  faSpinner,
  faCalendarPlus,
  faFileAlt,
  faBolt,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { getPendingActions } from '../../api/schedulingApi';

/**
 * Painel de ações pendentes no sistema de agendamento
 * Mostra resumo consolidado de tarefas que precisam de atenção
 */
const PendingActionsPanel = ({ onResolveAction, refreshTrigger = 0 }) => {
  const [pendingData, setPendingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPendingActions();
  }, [refreshTrigger]);

  const loadPendingActions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPendingActions();
      setPendingData(data);
    } catch (err) {
      console.error('Erro ao carregar ações pendentes:', err);
      setError('Erro ao carregar ações pendentes');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin h-6 w-6 text-blue-600 mr-2" />
          <span className="text-gray-600">Carregando ações pendentes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  const { orphan_sessions = [], missed_appointments = [], detected_today = 0 } = pendingData || {};
  const totalPending = orphan_sessions.length + missed_appointments.length;

  if (totalPending === 0 && detected_today === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 h-6 w-6 mr-3" />
          <div>
            <h3 className="text-green-800 font-medium">Tudo em Ordem!</h3>
            <p className="text-green-600 text-sm">Não há ações pendentes no momento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faBolt} className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-semibold">Ações Pendentes</h2>
          </div>
          {totalPending > 0 && (
            <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
              {totalPending}
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6 space-y-4">
        {/* Sucesso do dia */}
        {detected_today > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 h-5 w-5 mr-3" />
                <div>
                  <p className="text-green-800 font-medium">Sessões Detectadas Hoje</p>
                  <p className="text-green-600 text-sm">
                    {detected_today} sessão(ões) foi(ram) vinculada(s) automaticamente
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sessões órfãs */}
        {orphan_sessions.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <FontAwesomeIcon icon={faCalendarPlus} className="text-orange-500 h-5 w-5 mr-3" />
                <div>
                  <p className="text-orange-800 font-medium">
                    {orphan_sessions.length} Sessão(ões) Órfã(s)
                  </p>
                  <p className="text-orange-600 text-sm">
                    Sessões realizadas sem agendamento prévio
                  </p>
                </div>
              </div>
              <button
                onClick={() => onResolveAction('orphans')}
                className="ml-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center text-sm font-medium"
              >
                Resolver
                <FontAwesomeIcon icon={faChevronRight} className="ml-2 h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Agendamentos perdidos */}
        {missed_appointments.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <FontAwesomeIcon icon={faFileAlt} className="text-red-500 h-5 w-5 mr-3" />
                <div>
                  <p className="text-red-800 font-medium">
                    {missed_appointments.length} Agendamento(s) Perdido(s)
                  </p>
                  <p className="text-red-600 text-sm">
                    Agendamentos sem justificativa
                  </p>
                </div>
              </div>
              <button
                onClick={() => onResolveAction('missed')}
                className="ml-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center text-sm font-medium"
              >
                Justificar
                <FontAwesomeIcon icon={faChevronRight} className="ml-2 h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer com ação rápida */}
      {totalPending > 0 && (
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg border-t border-gray-200">
          <button
            onClick={() => onResolveAction('all')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
          >
            <FontAwesomeIcon icon={faBolt} className="mr-2" />
            Resolver Tudo em Lote
          </button>
        </div>
      )}
    </div>
  );
};

export default PendingActionsPanel;
```

**Arquivo:** `/frontend/src/api/schedulingApi.js` (ADICIONAR)

```javascript
// Adicionar ao arquivo existente

/**
 * Buscar ações pendentes (órfãs + perdidos + detectados hoje)
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
```

**Arquivo:** `/backend/src/routes/schedulingRoutes.js` (ADICIONAR)

```javascript
// Adicionar ao arquivo existente

/**
 * GET /api/scheduling/pending-actions
 * Retorna resumo de ações pendentes para a clínica do usuário
 */
router.get(
  '/pending-actions',
  verifyToken,
  schedulingController.getPendingActions
);
```

**Arquivo:** `/backend/src/controllers/schedulingController.js` (ADICIONAR)

```javascript
// Adicionar ao controlador existente

/**
 * Buscar ações pendentes
 */
async getPendingActions(req, res, next) {
  try {
    const { clinic_id } = req.user;

    // Buscar órfãs dos últimos 7 dias
    const orphanSessions = await ScheduledSessionModel.findOrphanSessions({
      clinic_id,
      lookbackDays: 7
    });

    // Buscar agendamentos perdidos sem justificativa
    const missedAppointments = await ScheduledSessionModel.findAll({
      clinic_id,
      status: 'missed',
      limit: 100
    });

    // Filtrar apenas perdidos sem justificativa
    const missedWithoutJustification = missedAppointments.filter(
      appointment => !appointment.justified_at
    );

    // Contar sessões detectadas hoje
    const today = new Date().toISOString().split('T')[0];
    const detectedToday = await ScheduledSessionModel.findAll({
      clinic_id,
      start_date: today,
      end_date: today,
      status: 'completed'
    });

    // Filtrar apenas as detectadas automaticamente hoje
    const autoDetectedToday = detectedToday.filter(
      appointment => appointment.detection_source === 'auto_detected' &&
        appointment.updated_at?.startsWith(today)
    );

    res.status(200).json({
      orphan_sessions: orphanSessions,
      missed_appointments: missedWithoutJustification,
      detected_today: autoDetectedToday.length,
      total_pending: orphanSessions.length + missedWithoutJustification.length
    });

  } catch (error) {
    console.error('[SCHEDULING] Erro ao buscar ações pendentes:', error);
    next(error);
  }
}
```

#### Checklist de Implementação

- [ ] Criar componente `PendingActionsPanel.js`
- [ ] Adicionar função `getPendingActions()` na API
- [ ] Criar endpoint backend `/api/scheduling/pending-actions`
- [ ] Integrar painel na página principal de agendamento
- [ ] Testar com dados reais
- [ ] Ajustar cores e layout conforme design system

---

### 1.3 Criação Retroativa em Lote

#### Problema

Usuário precisa criar agendamento retroativo para cada sessão órfã individualmente. Com 10+ órfãs, processo leva 5-7 minutos.

#### Solução

Permitir seleção múltipla de sessões órfãs e criar retroativos em lote com configuração comum.

#### Implementação

**Arquivo:** `/frontend/src/components/scheduling/OrphanSessionsList.js` (ATUALIZAR)

```jsx
// Adicionar ao componente existente

const OrphanSessionsList = ({ onCreateRetroactive, refreshTrigger = 0 }) => {
  // ... estados existentes ...

  // NOVO: Estados para seleção múltipla
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // NOVO: Handlers de seleção
  const handleSelectSession = (sessionId) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === filteredSessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(filteredSessions.map(s => s.session_id));
    }
  };

  const handleBatchCreate = () => {
    if (selectedSessions.length === 0) {
      alert('Selecione pelo menos uma sessão órfã');
      return;
    }
    setShowBatchModal(true);
  };

  // ... resto do componente ...

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header com seleção */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-3 text-orange-500" />
              Sessões Órfãs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredSessions.length} encontradas
              {selectedSessions.length > 0 && ` • ${selectedSessions.length} selecionadas`}
            </p>
          </div>

          {/* NOVO: Botão de criar em lote */}
          {filteredSessions.length > 0 && (
            <div className="flex space-x-3">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                {selectedSessions.length === filteredSessions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </button>

              {selectedSessions.length > 0 && (
                <button
                  onClick={handleBatchCreate}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors flex items-center"
                >
                  <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                  Criar {selectedSessions.length} Agendamento(s)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ... filtros existentes ... */}

      {/* Tabela com checkboxes */}
      <div className="overflow-x-auto">
        {filteredSessions.length === 0 ? (
          // ... empty state existente ...
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* NOVA: Coluna de checkbox */}
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSessions.length === filteredSessions.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </th>
                {/* ... colunas existentes ... */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={session.session_id} className="hover:bg-gray-50">
                  {/* NOVA: Checkbox da linha */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(session.session_id)}
                      onChange={() => handleSelectSession(session.session_id)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </td>
                  {/* ... células existentes ... */}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* NOVO: Modal de criação em lote */}
      {showBatchModal && (
        <BatchRetroactiveModal
          isOpen={showBatchModal}
          onClose={() => {
            setShowBatchModal(false);
            setSelectedSessions([]);
          }}
          selectedSessions={filteredSessions.filter(s => selectedSessions.includes(s.session_id))}
          onSuccess={() => {
            setShowBatchModal(false);
            setSelectedSessions([]);
            loadOrphanSessions(); // Recarregar lista
          }}
        />
      )}
    </div>
  );
};
```

**Arquivo:** `/frontend/src/components/scheduling/BatchRetroactiveModal.js` (NOVO)

```jsx
// frontend/src/components/scheduling/BatchRetroactiveModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faCalendarPlus,
  faStickyNote,
  faStethoscope,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { createBatchRetroactive } from '../../api/schedulingApi';
import { getDisciplineHierarchy } from '../../api/programApi';

/**
 * Modal para criar múltiplos agendamentos retroativos
 */
const BatchRetroactiveModal = ({ isOpen, onClose, selectedSessions, onSuccess }) => {
  const [formData, setFormData] = useState({
    discipline_id: '',
    notes: 'Agendamentos retroativos criados em lote'
  });

  const [disciplines, setDisciplines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadDisciplines();
      setFormData({
        discipline_id: '',
        notes: `Agendamentos retroativos criados em lote (${selectedSessions.length} sessões)`
      });
      setError(null);
      setResult(null);
    }
  }, [isOpen, selectedSessions.length]);

  const loadDisciplines = async () => {
    try {
      setIsLoadingDisciplines(true);
      const disciplinesData = await getDisciplineHierarchy();

      // Extrair array de disciplinas
      let disciplinesList = [];
      if (disciplinesData && typeof disciplinesData === 'object') {
        disciplinesList = Object.keys(disciplinesData).map(disciplineName => ({
          id: disciplinesData[disciplineName].id,
          name: disciplineName
        }));
      }

      setDisciplines(disciplinesList);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      setError('Erro ao carregar lista de disciplinas');
    } finally {
      setIsLoadingDisciplines(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);

      const sessionIds = selectedSessions.map(s => s.session_id);

      const batchData = {
        session_ids: sessionIds,
        common_data: {
          discipline_id: formData.discipline_id ? parseInt(formData.discipline_id) : null,
          notes: formData.notes
        }
      };

      const response = await createBatchRetroactive(batchData);
      setResult(response);

      // Aguardar um momento antes de fechar
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(response);
        }
      }, 2000);

    } catch (error) {
      console.error('Erro ao criar agendamentos em lote:', error);
      setError(error.message || 'Erro ao criar agendamentos retroativos');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ discipline_id: '', notes: '' });
      setError(null);
      setResult(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faCalendarPlus} className="mr-3 text-green-600" />
            Criar Agendamentos Retroativos em Lote
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {result ? (
            /* Tela de sucesso */
            <div className="text-center py-8">
              <FontAwesomeIcon icon={faCheckCircle} className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Agendamentos Criados com Sucesso!
              </h3>
              <p className="text-gray-600 mb-4">
                {result.created} de {result.total} agendamentos foram criados
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left">
                  <p className="text-yellow-800 font-medium mb-2">Alguns agendamentos falharam:</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {result.errors.slice(0, 3).map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                    {result.errors.length > 3 && (
                      <li>... e mais {result.errors.length - 3} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Resumo das sessões selecionadas */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  {selectedSessions.length} Sessão(ões) Selecionada(s)
                </h3>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {selectedSessions.slice(0, 5).map((session, idx) => (
                    <div key={idx} className="text-sm text-blue-700 flex justify-between">
                      <span>{session.patient_name}</span>
                      <span>{new Date(session.session_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                  {selectedSessions.length > 5 && (
                    <div className="text-sm text-blue-600 text-center">
                      ... e mais {selectedSessions.length - 5} sessões
                    </div>
                  )}
                </div>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Disciplina comum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStethoscope} className="mr-2 text-gray-400" />
                    Área de Intervenção <span className="text-gray-500 text-sm">(aplicar a todas)</span>
                  </label>
                  <select
                    name="discipline_id"
                    value={formData.discipline_id}
                    onChange={handleInputChange}
                    disabled={isLoading || isLoadingDisciplines}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {isLoadingDisciplines ? 'Carregando...' : 'Sessão geral (padrão)'}
                    </option>
                    {Array.isArray(disciplines) && disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Esta configuração será aplicada a todos os agendamentos
                  </p>
                </div>

                {/* Observações comuns */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faStickyNote} className="mr-2 text-gray-400" />
                    Observações
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    maxLength={500}
                    placeholder="Observações comuns para todos os agendamentos..."
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 resize-none"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    {formData.notes.length}/500 caracteres
                  </div>
                </div>

                {/* Aviso */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Esta operação criará {selectedSessions.length} agendamentos
                      retroativos de uma vez. Todos serão marcados como "realizados" e vinculados às sessões
                      correspondentes.
                    </div>
                  </div>
                </div>

                {/* Erro */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mr-2" />
                      <span className="text-red-800 text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                        Criando {selectedSessions.length} agendamentos...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                        Criar {selectedSessions.length} Agendamentos
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchRetroactiveModal;
```

**Arquivo:** `/frontend/src/api/schedulingApi.js` (ADICIONAR)

```javascript
/**
 * Criar múltiplos agendamentos retroativos em lote
 */
export const createBatchRetroactive = async (batchData) => {
  try {
    const response = await api.post('/scheduling/retroactive/batch', batchData, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar agendamentos retroativos em lote');
    throw error;
  }
};
```

**Arquivo:** `/backend/src/routes/schedulingRoutes.js` (ADICIONAR)

```javascript
/**
 * POST /api/scheduling/retroactive/batch
 * Criar múltiplos agendamentos retroativos
 */
router.post(
  '/retroactive/batch',
  verifyToken,
  schedulingController.createBatchRetroactive
);
```

**Arquivo:** `/backend/src/controllers/schedulingController.js` (ADICIONAR)

```javascript
/**
 * Criar agendamentos retroativos em lote
 */
async createBatchRetroactive(req, res, next) {
  try {
    const { session_ids, common_data } = req.body;
    const { id: userId, clinic_id } = req.user;

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

    // Criar retroativo para cada sessão
    for (const sessionId of session_ids) {
      try {
        // Buscar dados da sessão órfã
        const orphanQuery = `
          SELECT
            ppp.id as session_id,
            ppp.session_date,
            ppa.patient_id,
            ppa.therapist_id
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

        // Criar agendamento retroativo
        const retroactiveData = {
          patient_id: orphan.patient_id,
          therapist_id: orphan.therapist_id,
          session_date: orphan.session_date,
          session_time: '10:00', // Horário padrão
          session_id: sessionId,
          created_by: userId,
          ...common_data // discipline_id e notes
        };

        const appointment = await ScheduledSessionModel.createRetroactiveAppointment(retroactiveData);

        results.created++;
        results.appointments.push(appointment);

      } catch (error) {
        results.failed++;
        results.errors.push(`Sessão ${sessionId}: ${error.message}`);
        console.error(`[BATCH-RETROACTIVE] Erro na sessão ${sessionId}:`, error);
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

#### Checklist de Implementação

- [ ] Atualizar `OrphanSessionsList.js` com checkboxes
- [ ] Criar `BatchRetroactiveModal.js`
- [ ] Adicionar função `createBatchRetroactive()` na API
- [ ] Criar endpoint `/api/scheduling/retroactive/batch`
- [ ] Testar com 2-3 sessões primeiro
- [ ] Testar com 10+ sessões
- [ ] Validar limite máximo (50 sessões)
- [ ] Testar tratamento de erros parciais

---

## 🎨 FASE 2: UNIFICAÇÃO DO UX

**Duração Estimada:** 2-3 semanas
**Complexidade:** Média-Alta
**Impacto:** Muito Alto
**Risco:** Médio

### Objetivo

Redesenhar a experiência do usuário para torná-la mais intuitiva, fluida e profissional, através de wizard steps e interfaces consolidadas.

---

### 2.1 Wizard Unificado de Agendamento

#### Problema

Formulário atual (`AppointmentForm.js`) tem 800+ linhas, mistura agendamento simples e recorrente, e apresenta muitas opções ao mesmo tempo.

#### Solução

Criar wizard com 3 etapas claras:
1. **Informações Básicas** - Paciente, terapeuta, data, horário
2. **Tipo de Agendamento** - Escolha visual entre único ou recorrente
3. **Revisão e Confirmação** - Preview, conflitos, e confirmação final

#### Implementação

**Arquivo:** `/frontend/src/components/scheduling/UnifiedAppointmentWizard.js` (NOVO)

```jsx
// frontend/src/components/scheduling/UnifiedAppointmentWizard.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faArrowRight,
  faArrowLeft,
  faCheck,
  faCalendarAlt,
  faRedoAlt
} from '@fortawesome/free-solid-svg-icons';

// Importar steps
import BasicInfoStep from './wizard-steps/BasicInfoStep';
import AppointmentTypeStep from './wizard-steps/AppointmentTypeStep';
import ReviewStep from './wizard-steps/ReviewStep';

/**
 * Wizard unificado para criação de agendamentos
 * Simplifica UX dividindo processo em 3 etapas claras
 */
const UnifiedAppointmentWizard = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    // Step 1: Informações básicas
    patient_id: '',
    therapist_id: '',
    discipline_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    notes: '',

    // Step 2: Tipo de agendamento
    appointment_type: 'single', // 'single' ou 'recurring'
    recurrence_config: {
      type: 'weekly',
      endDate: '',
      generateWeeks: 4,
      skipHolidays: false
    },

    // Step 3: Revisão (preenchido automaticamente)
    preview: [],
    conflicts: []
  });

  const [stepErrors, setStepErrors] = useState({});

  const steps = [
    {
      id: 1,
      name: 'Informações Básicas',
      icon: faCalendarAlt,
      component: BasicInfoStep
    },
    {
      id: 2,
      name: 'Tipo de Agendamento',
      icon: faRedoAlt,
      component: AppointmentTypeStep
    },
    {
      id: 3,
      name: 'Revisão',
      icon: faCheck,
      component: ReviewStep
    }
  ];

  // Resetar quando modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setWizardData({
        patient_id: '',
        therapist_id: '',
        discipline_id: '',
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: 60,
        notes: '',
        appointment_type: 'single',
        recurrence_config: {
          type: 'weekly',
          endDate: '',
          generateWeeks: 4,
          skipHolidays: false
        },
        preview: [],
        conflicts: []
      });
      setStepErrors({});
    }
  }, [isOpen]);

  const updateWizardData = (updates) => {
    setWizardData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      if (!wizardData.patient_id) errors.patient_id = 'Selecione um paciente';
      if (!wizardData.therapist_id) errors.therapist_id = 'Selecione um terapeuta';
      if (!wizardData.scheduled_date) errors.scheduled_date = 'Selecione uma data';
      if (!wizardData.scheduled_time) errors.scheduled_time = 'Selecione um horário';
    }

    if (step === 2) {
      if (wizardData.appointment_type === 'recurring') {
        if (wizardData.recurrence_config.generateWeeks < 1) {
          errors.generateWeeks = 'Mínimo de 1 semana';
        }
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    // Preparar dados para submissão
    if (wizardData.appointment_type === 'single') {
      // Agendamento único
      const submitData = {
        patient_id: parseInt(wizardData.patient_id),
        therapist_id: parseInt(wizardData.therapist_id),
        discipline_id: wizardData.discipline_id ? parseInt(wizardData.discipline_id) : null,
        scheduled_date: wizardData.scheduled_date,
        scheduled_time: wizardData.scheduled_time,
        duration_minutes: parseInt(wizardData.duration_minutes),
        notes: wizardData.notes
      };
      await onSubmit(submitData);
    } else {
      // Agendamento recorrente
      const dayOfWeek = new Date(wizardData.scheduled_date).getDay();
      const templateData = {
        type: 'recurring',
        patient_id: parseInt(wizardData.patient_id),
        therapist_id: parseInt(wizardData.therapist_id),
        discipline_id: wizardData.discipline_id ? parseInt(wizardData.discipline_id) : null,
        recurrence_type: wizardData.recurrence_config.type,
        day_of_week: dayOfWeek,
        scheduled_time: wizardData.scheduled_time,
        duration_minutes: parseInt(wizardData.duration_minutes),
        start_date: wizardData.scheduled_date,
        end_date: wizardData.recurrence_config.endDate || null,
        generate_weeks_ahead: parseInt(wizardData.recurrence_config.generateWeeks),
        skip_holidays: Boolean(wizardData.recurrence_config.skipHolidays),
        notes: wizardData.notes
      };
      await onSubmit(templateData);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h2 className="text-xl font-semibold flex items-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="mr-3" />
            Novo Agendamento
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      currentStep >= step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <FontAwesomeIcon icon={faCheck} />
                    ) : (
                      <FontAwesomeIcon icon={step.icon} />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-colors ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    style={{ maxWidth: '80px' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <CurrentStepComponent
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            errors={stepErrors}
            setErrors={setStepErrors}
          />
        </div>

        {/* Footer com botões */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Etapa {currentStep} de {steps.length}
          </div>

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                Voltar
              </button>
            )}

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Próximo
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Criando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Criar Agendamento
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAppointmentWizard;
```

**Observação:** Os componentes `BasicInfoStep.js`, `AppointmentTypeStep.js` e `ReviewStep.js` precisam ser criados separadamente. Estrutura similar ao formulário existente, mas dividida em partes lógicas.

#### Checklist de Implementação

- [ ] Criar `UnifiedAppointmentWizard.js` (wizard principal)
- [ ] Criar `BasicInfoStep.js` (step 1)
- [ ] Criar `AppointmentTypeStep.js` (step 2)
- [ ] Criar `ReviewStep.js` (step 3)
- [ ] Integrar wizard na página de agendamento
- [ ] Manter `AppointmentForm.js` antigo temporariamente (fallback)
- [ ] Testar fluxo completo: simples → recorrente
- [ ] Coletar feedback de usuários beta
- [ ] Deprecar componente antigo após validação

---

### 2.2 Preview Aprimorado de Recorrência

#### Problema

Preview atual mostra apenas lista de datas. Falta visualização em calendário e edição inline.

#### Solução

Criar componente de calendário visual para preview de recorrência com:
- Timeline em formato de calendário mensal
- Conflitos destacados visualmente
- Possibilidade de remover datas específicas antes de criar

#### Implementação

**Arquivo:** `/frontend/src/components/scheduling/RecurrencePreviewCalendar.js` (NOVO)

```jsx
// frontend/src/components/scheduling/RecurrencePreviewCalendar.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faChevronLeft,
  faChevronRight,
  faExclamationTriangle,
  faCheckCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

/**
 * Calendário visual para preview de agendamentos recorrentes
 */
const RecurrencePreviewCalendar = ({
  appointments,
  conflicts = [],
  onRemoveDate,
  onConfirm
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [removedDates, setRemovedDates] = useState([]);

  // Gerar dias do mês para exibição
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const hasAppointment = (date) => {
    if (!date) return false;
    const dateKey = formatDateKey(date);
    return appointments.some(apt => apt.date === dateKey) && !removedDates.includes(dateKey);
  };

  const hasConflict = (date) => {
    if (!date) return false;
    const dateKey = formatDateKey(date);
    return conflicts.some(conf => conf.scheduled_date === dateKey);
  };

  const handleRemoveDate = (date) => {
    const dateKey = formatDateKey(date);
    setRemovedDates(prev => {
      if (prev.includes(dateKey)) {
        return prev.filter(d => d !== dateKey);
      } else {
        return [...prev, dateKey];
      }
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const activeAppointments = appointments.filter(apt => !removedDates.includes(apt.date));
  const conflictsCount = conflicts.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header com navegação */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <h3 className="text-lg font-semibold capitalize">{monthName}</h3>

        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Calendário */}
      <div className="p-4">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const hasApt = hasAppointment(date);
            const hasConf = hasConflict(date);
            const isRemovedDate = removedDates.includes(formatDateKey(date));
            const today = isToday(date);

            return (
              <div
                key={formatDateKey(date)}
                onClick={() => hasApt && handleRemoveDate(date)}
                className={`
                  aspect-square p-1 rounded-lg flex flex-col items-center justify-center text-sm cursor-pointer transition-all
                  ${today ? 'ring-2 ring-blue-400' : ''}
                  ${hasApt && !isRemovedDate ? 'bg-green-100 hover:bg-green-200' : ''}
                  ${hasApt && isRemovedDate ? 'bg-gray-100 hover:bg-gray-200 opacity-50' : ''}
                  ${hasConf ? 'bg-red-100 hover:bg-red-200' : ''}
                  ${!hasApt && !hasConf ? 'hover:bg-gray-50' : ''}
                `}
              >
                <span className={`font-medium ${hasApt || hasConf ? 'text-gray-900' : 'text-gray-600'}`}>
                  {date.getDate()}
                </span>
                {hasApt && !isRemovedDate && (
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xs mt-1" />
                )}
                {hasApt && isRemovedDate && (
                  <FontAwesomeIcon icon={faTimes} className="text-gray-500 text-xs mt-1" />
                )}
                {hasConf && (
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600 text-xs mt-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda e estatísticas */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
              <span className="text-gray-700">Agendamento</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
              <span className="text-gray-700">Conflito</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 rounded mr-2 opacity-50"></div>
              <span className="text-gray-700">Removido</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium text-gray-900">{activeAppointments.length}</span>
            <span className="text-gray-600"> agendamento(s) serão criados</span>
            {conflictsCount > 0 && (
              <>
                <span className="text-gray-600"> • </span>
                <span className="font-medium text-red-600">{conflictsCount}</span>
                <span className="text-gray-600"> conflito(s)</span>
              </>
            )}
          </div>

          {removedDates.length > 0 && (
            <button
              onClick={() => setRemovedDates([])}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Restaurar removidos ({removedDates.length})
            </button>
          )}
        </div>

        {removedDates.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            💡 Clique nas datas verdes para remover/restaurar antes de criar
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurrencePreviewCalendar;
```

#### Checklist de Implementação

- [ ] Criar `RecurrencePreviewCalendar.js`
- [ ] Integrar no `AppointmentTypeStep.js` (wizard)
- [ ] Adicionar lógica de remoção/restauração de datas
- [ ] Testar navegação entre meses
- [ ] Validar cálculo de conflitos
- [ ] Ajustar responsividade para mobile

---

### 2.3 Gerenciamento de Templates Recorrentes

#### Problema

Após criar template recorrente, não há interface clara para visualizar, editar, pausar ou gerar mais agendamentos.

#### Solução

Criar página dedicada para gerenciar templates com cards visuais e ações rápidas.

#### Implementação

**Arquivo:** `/frontend/src/pages/RecurringTemplatesPage.js` (NOVO)

```jsx
// frontend/src/pages/RecurringTemplatesPage.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faPlus,
  faSpinner,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { recurringAppointmentApi } from '../api/recurringAppointmentApi';
import { useAuth } from '../context/AuthContext';
import RecurringTemplateCard from '../components/scheduling/RecurringTemplateCard';
import UnifiedAppointmentWizard from '../components/scheduling/UnifiedAppointmentWizard';

/**
 * Página de gerenciamento de templates recorrentes
 */
const RecurringTemplatesPage = () => {
  const { user, token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await recurringAppointmentApi.getActiveTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError('Erro ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData) => {
    try {
      await recurringAppointmentApi.createTemplate(templateData);
      setShowWizard(false);
      loadTemplates(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao criar template:', error);
      throw error;
    }
  };

  const handlePauseTemplate = async (templateId) => {
    try {
      await recurringAppointmentApi.pauseTemplate(templateId);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao pausar template:', error);
      alert('Erro ao pausar template');
    }
  };

  const handleResumeTemplate = async (templateId) => {
    try {
      await recurringAppointmentApi.resumeTemplate(templateId);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao reativar template:', error);
      alert('Erro ao reativar template');
    }
  };

  const handleGenerateMore = async (templateId) => {
    try {
      await recurringAppointmentApi.generateAppointments(templateId);
      alert('Agendamentos adicionais gerados com sucesso!');
      loadTemplates();
    } catch (error) {
      console.error('Erro ao gerar agendamentos:', error);
      alert('Erro ao gerar agendamentos adicionais');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin h-12 w-12 text-blue-600 mb-4" />
          <p className="text-gray-600">Carregando templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-blue-600" />
                Templates de Agendamentos Recorrentes
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie seus agendamentos recorrentes
              </p>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Novo Template
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon icon={faCalendarAlt} className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum Template Recorrente
            </h3>
            <p className="text-gray-600 mb-6">
              Crie templates para automatizar agendamentos semanais, quinzenais ou mensais.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Criar Primeiro Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <RecurringTemplateCard
                key={template.id}
                template={template}
                onPause={() => handlePauseTemplate(template.id)}
                onResume={() => handleResumeTemplate(template.id)}
                onGenerateMore={() => handleGenerateMore(template.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Wizard de criação */}
      <UnifiedAppointmentWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSubmit={handleCreateTemplate}
      />
    </div>
  );
};

export default RecurringTemplatesPage;
```

**Arquivo:** `/frontend/src/components/scheduling/RecurringTemplateCard.js` (NOVO - Implementação resumida)

```jsx
// Card visual para exibir template recorrente
// Inclui: Status badge, próxima geração, estatísticas, botões de ação
// Deixar implementação detalhada para fase de desenvolvimento
```

#### Checklist de Implementação

- [ ] Criar `RecurringTemplatesPage.js`
- [ ] Criar `RecurringTemplateCard.js`
- [ ] Adicionar rota `/scheduling/templates` no router
- [ ] Adicionar link no menu de navegação
- [ ] Implementar ações: pausar, retomar, gerar mais
- [ ] Testar fluxo completo de gerenciamento
- [ ] Adicionar filtros por status (ativo/pausado/expirado)

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO GERAL

### Fase 1: Melhorias Rápidas

#### Fusão dos Jobs
- [ ] Criar `sessionMaintenanceJob.js`
- [ ] Implementar `runMaintenanceRoutine()`
- [ ] Criar sistema de notificações consolidadas
- [ ] Atualizar `server.js`
- [ ] Testar execução manual e agendada
- [ ] Deploy em produção

#### Dashboard de Ações Pendentes
- [ ] Criar `PendingActionsPanel.js`
- [ ] Adicionar endpoint `/api/scheduling/pending-actions`
- [ ] Integrar na página principal
- [ ] Testar com dados reais
- [ ] Validar contadores e ações

#### Criação em Lote
- [ ] Atualizar `OrphanSessionsList.js` com checkboxes
- [ ] Criar `BatchRetroactiveModal.js`
- [ ] Adicionar endpoint batch no backend
- [ ] Testar com múltiplas sessões
- [ ] Validar limite de 50 itens

### Fase 2: Unificação do UX

#### Wizard Unificado
- [ ] Criar estrutura do wizard
- [ ] Implementar `BasicInfoStep.js`
- [ ] Implementar `AppointmentTypeStep.js`
- [ ] Implementar `ReviewStep.js`
- [ ] Integrar validações entre steps
- [ ] Testar fluxo completo
- [ ] Migrar usuários gradualmente

#### Preview de Calendário
- [ ] Criar `RecurrencePreviewCalendar.js`
- [ ] Implementar navegação de meses
- [ ] Adicionar remoção/restauração de datas
- [ ] Integrar no wizard
- [ ] Testar responsividade

#### Gerenciamento de Templates
- [ ] Criar `RecurringTemplatesPage.js`
- [ ] Criar `RecurringTemplateCard.js`
- [ ] Implementar ações (pausar/retomar/gerar)
- [ ] Adicionar ao router e menu
- [ ] Testar gerenciamento completo

---

## 🧪 TESTES OBRIGATÓRIOS

### Testes de Regressão

**Cenário 1: Agendamento simples continua funcionando**
- [ ] Criar agendamento único via novo wizard
- [ ] Verificar que foi salvo corretamente no DB
- [ ] Confirmar que aparece na lista de agendamentos
- [ ] Validar que detecção automática funciona

**Cenário 2: Recorrência mantém funcionalidade**
- [ ] Criar template recorrente semanal (4 semanas)
- [ ] Verificar geração de 4 agendamentos
- [ ] Confirmar que não criou conflitos
- [ ] Validar formato de dados no DB

**Cenário 3: Detecção automática não quebrou**
- [ ] Criar agendamento para hoje 10:00
- [ ] Registrar sessão para o mesmo paciente/terapeuta hoje
- [ ] Aguardar job rodar (ou executar manualmente)
- [ ] Confirmar vinculação automática

### Testes de Novas Funcionalidades

**Cenário 4: Job unificado funciona corretamente**
- [ ] Executar `runMaintenanceRoutine()` manualmente
- [ ] Verificar logs de detecção, órfãs e perdidos
- [ ] Confirmar criação de notificações
- [ ] Validar resultado retornado

**Cenário 5: Dashboard de ações pendentes atualiza**
- [ ] Criar sessões órfãs de teste
- [ ] Deixar agendamentos expirarem (perdidos)
- [ ] Verificar contadores no dashboard
- [ ] Clicar em "Resolver" e validar ação

**Cenário 6: Criação em lote de retroativos**
- [ ] Selecionar 5 sessões órfãs
- [ ] Criar em lote com configuração comum
- [ ] Verificar que 5 agendamentos foram criados
- [ ] Confirmar que órfãs desapareceram da lista

**Cenário 7: Wizard wizard flui naturalmente**
- [ ] Preencher step 1 (dados básicos)
- [ ] Avançar para step 2 (tipo)
- [ ] Escolher recorrente e configurar
- [ ] Ver preview no step 3
- [ ] Confirmar e criar
- [ ] Validar resultado final

### Testes de Performance

**Cenário 8: Lote com muitas sessões**
- [ ] Criar 50 sessões órfãs (limite)
- [ ] Criar retroativos em lote
- [ ] Medir tempo de processamento (<5s ideal)
- [ ] Verificar memória do servidor

**Cenário 9: Preview com muitos agendamentos**
- [ ] Criar recorrência de 6 meses (24 semanas)
- [ ] Verificar renderização do calendário
- [ ] Testar navegação entre meses
- [ ] Validar responsividade

### Testes de Segurança

**Cenário 10: Isolamento de clínicas**
- [ ] Usuário clínica A tenta acessar template clínica B
- [ ] Verificar erro 403/404
- [ ] Validar query com `clinic_id` em todas rotas
- [ ] Confirmar segregação de dados

---

## 🔄 ROLLBACK PLAN

### Se Fase 1 Falhar

**Opção A: Rollback Completo**
1. Desabilitar novo job via env vars
2. Reativar jobs antigos
3. Remover componente `PendingActionsPanel`
4. Restaurar endpoints originais

**Opção B: Rollback Parcial**
1. Manter job novo mas desabilitar notificações
2. Remover botões de ação em lote
3. Manter dashboard em modo "somente leitura"

### Se Fase 2 Falhar

**Opção A: Rollback do Wizard**
1. Restaurar `AppointmentForm.js` antigo
2. Remover `UnifiedAppointmentWizard.js`
3. Atualizar imports nos componentes pai

**Opção B: Convivência Temporária**
1. Manter ambos componentes
2. Toggle via feature flag
3. Permitir usuário escolher versão
4. Coletar feedback antes de decisão final

### Critérios para Rollback

**Acionar rollback se:**
- ❌ >5% de taxa de erro nas requisições
- ❌ Tempo de resposta >3x o baseline
- ❌ >10 reports de bugs críticos em 24h
- ❌ Perda de dados ou corrupção detectada

---

## 📊 MÉTRICAS DE SUCESSO

### Métricas Quantitativas

| Métrica | Baseline | Meta Fase 1 | Meta Fase 2 |
|---------|----------|-------------|-------------|
| Tempo médio para resolver órfã | 30-45s | 5-10s | 5-10s |
| Cliques para agendar sessão simples | 8-10 | 8-10 | 4-5 |
| Taxa de agendamentos perdidos sem justificativa | ~15% | <8% | <5% |
| Satisfação do usuário (1-10) | 6-7 | 7-8 | 9-10 |
| Tempo para criar 10 retroativos | 5-7min | 1-2min | 1-2min |

### Métricas Qualitativas

**Após Fase 1:**
- [ ] Usuários relatam menos "trabalho braçal"
- [ ] Administradores têm visibilidade de pendências
- [ ] Jobs rodam consistentemente sem falhas

**Após Fase 2:**
- [ ] Usuários descrevem processo como "intuitivo"
- [ ] Redução em tickets de suporte sobre agendamento
- [ ] Feedback positivo sobre wizard e preview

---

## 📝 NOTAS FINAIS

### Priorização Recomendada

1. **Implementar Fase 1 completa primeiro** - Maior retorno com menor esforço
2. **Validar com usuários beta** - Coletar feedback real antes de Fase 2
3. **Iterar baseado em dados** - Ajustar prioridades conforme uso real

### Recursos Necessários

**Desenvolvimento:**
- 1 desenvolvedor full-stack sênior
- Estimativa: 4-5 semanas total (Fase 1 + Fase 2)

**Infraestrutura:**
- Ambiente de staging para testes
- Monitoramento de performance (logs, métricas)
- Sistema de feature flags (opcional mas recomendado)

### Riscos Identificados

🟡 **Médio:** Curva de aprendizado para usuários acostumados com versão antiga
**Mitigação:** Tutorial interativo, documentação clara, suporte proativo

🟡 **Médio:** Bugs não detectados em testes afetam produção
**Mitigação:** Beta testing extensivo, rollout gradual, monitoramento 24/7

🟢 **Baixo:** Incompatibilidade com dados antigos
**Mitigação:** Componentes novos usam mesma estrutura de dados

---

## ✨ CONCLUSÃO

Esta refatoração transforma o sistema de agendamento de **funcional** para **excepcional**, mantendo toda a robustez técnica existente enquanto melhora drasticamente a experiência do usuário.

**Benefícios Esperados:**
- ⏱️ **70-80% de redução** no tempo para tarefas comuns
- 🎯 **Maior adoção** do sistema de agendamento
- 📊 **Melhores métricas** de comparecimento e organização
- 😊 **Usuários mais satisfeitos** e produtivos

**Próximos Passos:**
1. Revisar e aprovar este documento
2. Criar issues/tasks no sistema de gestão
3. Iniciar implementação da Fase 1
4. Iterar baseado em feedback contínuo

---

**Documento criado em:** 2025-09-30
**Versão:** 1.0
**Status:** Aguardando aprovação para implementação