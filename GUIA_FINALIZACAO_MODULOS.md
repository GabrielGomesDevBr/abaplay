# 🚀 GUIA DE FINALIZAÇÃO - SISTEMA DE MÓDULOS ABAPLAY

**Branch**: `feature/subscription-modules`
**Data**: Janeiro 2025
**Status**: 80% Completo - Faltam 6 ajustes críticos

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Diferenciação de Planos](#diferenciação-de-planos)
3. [Problemas Identificados](#problemas-identificados)
4. [Tarefas Pendentes](#tarefas-pendentes)
5. [Compatibilidade de Migração](#compatibilidade-de-migração)
6. [Ordem de Implementação](#ordem-de-implementação)
7. [Testes Pós-Implementação](#testes-pós-implementação)

---

## 🎯 VISÃO GERAL

O sistema ABAplay está sendo refatorado para suportar dois planos de assinatura:

### **📅 ABAplay Agenda** (R$ 10,00/paciente)
Sistema simplificado de agendamento e registro básico de sessões.

### **🚀 ABAplay Pro** (R$ 35,00/paciente)
Sistema completo com programas ABA, dashboard analítico, prontuário expandido e relatórios com IA.

---

## 📊 DIFERENCIAÇÃO DE PLANOS

### **PLANO AGENDAMENTO - Funcionalidades Permitidas**

| Categoria | Funcionalidade | Status |
|-----------|---------------|---------|
| **Gestão** | Cadastro de usuários (terapeutas/pais) | ✅ OK |
| **Pacientes** | Cadastro básico (nome, data nascimento, diagnóstico, observações gerais) | ✅ OK |
| **Agendamento** | Criar agendamentos pontuais e recorrentes | ✅ OK |
| **Agendamento** | Visualizar agenda pessoal (terapeuta) | ✅ OK |
| **Agendamento** | Visualizar agenda geral (admin) | ✅ OK |
| **Sessões** | **Registrar sessão realizada com anotações** | ❌ **CRÍTICO - FALTA IMPLEMENTAR** |
| **Sessões** | Editar anotações de sessões passadas | ❌ **FALTA IMPLEMENTAR** |
| **Sessões** | Visualizar histórico de sessões | ⚠️ Parcial |
| **Relatórios** | Relatório de agendamentos (geral e individual) | ✅ OK |
| **Notificações** | Alertas de cancelamento/mudanças | ✅ OK |
| **Anotações** | Anotações gerais do paciente (NotesPage) | ✅ OK |

### **PLANO PRO - Funcionalidades Adicionais**

| Categoria | Funcionalidade |
|-----------|---------------|
| **Dashboard** | Dashboard analítico com métricas ABA |
| **Programas** | Biblioteca de programas de intervenção |
| **Programas** | Programas customizados por clínica |
| **Sessões** | Registro detalhado com níveis de prompting |
| **Prontuário** | 10 seções expandidas (responsáveis, endereço, educação, desenvolvimento, médico, medicações, emergência, histórico, profissionais) |
| **Relatórios** | Relatórios de evolução com análise automática |
| **Comunicação** | Chat com pais |
| **Comunicação** | Discussões de caso entre terapeutas |

---

## 🔍 PROBLEMAS IDENTIFICADOS

### **✅ O QUE JÁ ESTÁ FUNCIONANDO**

1. ✅ Estrutura de banco de dados completa (subscription_plan, trial_pro_enabled)
2. ✅ Middleware de verificação de plano (`requireProPlan`)
3. ✅ AuthContext com helpers (`canAccessPrograms()`, `canAccessSessionRecording()`, `hasProAccess()`)
4. ✅ Sistema de trial implementado (migrations, funções SQL, API)
5. ✅ BottomNavigation ocultando botões baseado em plano
6. ✅ Biblioteca de programas funcionando
7. ✅ Sistema de agendamento recorrente funcionando
8. ✅ Relatórios de agendamento funcionando

### **❌ O QUE PRECISA SER CORRIGIDO/IMPLEMENTADO**

#### **PROBLEMA 1: Super Admin - Seleção de Plano no Cadastro**
**Descrição**: Ao cadastrar uma nova clínica, não há opção para selecionar o plano. Todas são criadas como "pro" por padrão.

**Impacto**: Super admin precisa editar manualmente na página de assinaturas após criar.

**Prioridade**: 🟡 MÉDIA

---

#### **PROBLEMA 2: Dashboard - Visível para Plano Agendamento**
**Descrição**: Dashboard aparece para clínicas com plano "scheduling", mas é feature exclusiva Pro.

**Impacto**: Usuários veem página sem utilidade e podem se confundir.

**Prioridade**: 🟠 ALTA

---

#### **PROBLEMA 3: Admin Page - Botão "Programas Atribuídos"**
**Descrição**: Botão de programas aparece para todas as clínicas, sem verificação de plano.

**Impacto**: Usuários tentam acessar feature bloqueada.

**Prioridade**: 🟡 MÉDIA

---

#### **PROBLEMA 4: Página de Programas - Acesso Direto**
**Descrição**: Rota `/programs` pode ser acessada digitando URL manualmente, mesmo em plano scheduling.

**Impacto**: Brecha de segurança (interface aparece antes de verificar permissão).

**Prioridade**: 🟠 ALTA

---

#### **PROBLEMA 5: Cadastro de Paciente - Formulário Único**
**Descrição**: Mesmo formulário expandido (10 abas) é usado para ambos os planos.

**Impacto**: Plano agendamento deveria ter apenas 4 campos básicos.

**Prioridade**: 🟡 MÉDIA

---

#### **PROBLEMA 6: 🔴 CRÍTICO - Registro de Sessão Simplificado**
**Descrição**: Plano agendamento NÃO tem interface para marcar sessão como realizada e adicionar anotações.

**Impacto**:
- Relatórios mostram 0% de conclusão
- Agendamentos ficam como "scheduled" eternamente
- Sistema detecta como "sessões órfãs" após 48h
- **Plano agendamento fica não-funcional para registro**

**Prioridade**: 🔴 **CRÍTICA**

---

## 📝 TAREFAS PENDENTES

### **TAREFA 1: Seletor de Plano no Cadastro de Clínica**

#### **Objetivo**
Adicionar campo de seleção de plano ao criar nova clínica via super admin.

#### **Arquivos a Modificar**

**Frontend**:
```
frontend/src/components/admin/ClinicFormModal.js (ou similar)
```

**Backend**:
```
backend/src/controllers/adminController.js
```

#### **Implementação**

**Frontend - ClinicFormModal.js**:

```jsx
// Estado para plano
const [subscriptionPlan, setSubscriptionPlan] = useState('scheduling'); // padrão agendamento

// No JSX do formulário, adicionar:
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Plano de Assinatura *
  </label>
  <select
    value={subscriptionPlan}
    onChange={(e) => setSubscriptionPlan(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
    required
  >
    <option value="scheduling">📅 ABAplay Agenda - R$ 10,00/paciente</option>
    <option value="pro">🚀 ABAplay Pro - R$ 35,00/paciente</option>
  </select>
  <p className="mt-1 text-xs text-gray-500">
    Selecione o plano inicial da clínica. Pode ser alterado depois.
  </p>
</div>

// No handleSubmit, incluir subscription_plan:
const clinicData = {
  name,
  max_patients,
  subscription_plan: subscriptionPlan // ✅ ADICIONAR
};

await createClinic(clinicData);
```

**Backend - adminController.js**:

```javascript
// Em createClinic:
const createClinic = async (req, res) => {
  try {
    const { name, max_patients, subscription_plan } = req.body;

    // Validação
    if (!subscription_plan || !['pro', 'scheduling'].includes(subscription_plan)) {
      return res.status(400).json({
        error: 'Plano inválido. Use "pro" ou "scheduling"'
      });
    }

    const query = `
      INSERT INTO clinics (name, max_patients, subscription_plan)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const values = [name, max_patients, subscription_plan];
    const { rows } = await pool.query(query, values);

    res.status(201).json({ clinic: rows[0] });
  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    res.status(500).json({ error: 'Erro ao criar clínica' });
  }
};
```

#### **Testes**
1. ✅ Criar clínica com plano "scheduling"
2. ✅ Criar clínica com plano "pro"
3. ✅ Verificar que plano correto aparece no banco de dados
4. ✅ Verificar que funcionalidades são bloqueadas corretamente

---

### **TAREFA 2: Ocultar Dashboard para Plano Agendamento**

#### **Objetivo**
Dashboard deve ser acessível APENAS no plano Pro.

#### **Arquivos a Modificar**

```
frontend/src/context/AuthContext.js
frontend/src/components/layout/Sidebar.js
frontend/src/App.js
frontend/src/pages/DashboardPage.js
```

#### **Implementação**

**1. AuthContext.js - Adicionar helper**:

```javascript
// Linha ~186 (após canAccessSessionRecording)
const canAccessDashboard = useCallback(() => {
  return hasProAccess();
}, [hasProAccess]);

// No value do Provider (linha ~270):
const value = {
  user,
  login,
  logout,
  subscription,
  hasProAccess,
  canAccessPrograms,
  canAccessSessionRecording,
  canAccessDashboard, // ✅ ADICIONAR
  professionalData,
  updateProfessionalData
};
```

**2. Sidebar.js - Condicionar exibição**:

```javascript
// Linha ~115-127
const { canAccessDashboard } = useAuth(); // ✅ ADICIONAR ao destructuring

const toolsMenuItems = [
  {
    icon: faTachometerAlt,
    label: 'Dashboard',
    path: '/dashboard',
    show: canAccessDashboard(), // ✅ ALTERAR de 'true'
  },
  {
    icon: faPencilAlt,
    label: 'Anotações',
    path: '/notes',
    show: true,
  },
  {
    icon: faSignOutAlt,
    label: 'Sair',
    action: logout,
    show: true,
    isLogout: true,
  },
];
```

**3. App.js - Proteger rota**:

```javascript
import { useAuth } from './context/AuthContext';

// Criar componente wrapper (antes das rotas):
const ProtectedProRoute = ({ children }) => {
  const { hasProAccess } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasProAccess()) {
      navigate('/clients');
    }
  }, [hasProAccess, navigate]);

  return hasProAccess() ? children : null;
};

// Na rota de dashboard:
<Route
  path="/dashboard"
  element={
    <ProtectedProRoute>
      <DashboardPage />
    </ProtectedProRoute>
  }
/>
```

**4. DashboardPage.js - Redirecionamento de segurança (defesa dupla)**:

```javascript
// No início do componente (linha ~830):
const { user, hasProAccess } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!hasProAccess()) {
    navigate('/clients');
  }
}, [hasProAccess, navigate]);
```

#### **Testes**
1. ✅ Plano scheduling: Dashboard não aparece no menu
2. ✅ Plano scheduling: URL `/dashboard` redireciona para `/clients`
3. ✅ Plano Pro: Dashboard funciona normalmente

---

### **TAREFA 3: Ocultar Botão "Programas Atribuídos" no Admin**

#### **Objetivo**
Botão só deve aparecer para clínicas Pro.

#### **Arquivos a Modificar**

```
frontend/src/pages/AdminPage.js
```

#### **Implementação**

Localizar a seção onde está o botão "Programas Atribuídos" e adicionar verificação:

```javascript
import { useAuth } from '../context/AuthContext';

// No componente:
const { user, hasProAccess } = useAuth();

// No JSX, ao redor do botão:
{hasProAccess() && (
  <button
    onClick={() => handleProgramsClick(patient)}
    className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded-md transition-colors"
  >
    <FontAwesomeIcon icon={faCogs} className="mr-1" />
    Programas Atribuídos
  </button>
)}
```

#### **Testes**
1. ✅ Plano scheduling: Botão não aparece
2. ✅ Plano Pro: Botão aparece e funciona

---

### **TAREFA 4: Proteger Página de Programas**

#### **Objetivo**
Prevenir acesso direto via URL `/programs`.

#### **Arquivos a Modificar**

```
frontend/src/App.js
frontend/src/pages/ProgramsPage.js
```

#### **Implementação**

**1. App.js - Proteger rota (usar mesmo wrapper da Tarefa 2)**:

```javascript
<Route
  path="/programs"
  element={
    <ProtectedProRoute>
      <ProgramsPage />
    </ProtectedProRoute>
  }
/>
```

**2. ProgramsPage.js - Redirecionamento de segurança**:

```javascript
// No início do componente:
const { hasProAccess } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!hasProAccess()) {
    navigate('/clients');
  }
}, [hasProAccess, navigate]);
```

#### **Testes**
1. ✅ Plano scheduling: URL `/programs` redireciona
2. ✅ Plano Pro: Página funciona normalmente

---

### **TAREFA 5: Formulário Simplificado de Paciente**

#### **Objetivo**
Plano agendamento usa formulário básico (4 campos). Plano Pro usa formulário expandido (10 abas).

#### **Arquivos a Modificar**

```
frontend/src/pages/AdminPage.js
frontend/src/components/patient/PatientForm.js (já existe - básico)
frontend/src/components/patient/ExpandedPatientForm.js (já existe - completo)
```

#### **Implementação**

**AdminPage.js - Decidir qual formulário abrir**:

```javascript
import { useAuth } from '../context/AuthContext';
import PatientForm from '../components/patient/PatientForm'; // Básico
import ExpandedPatientForm from '../components/patient/ExpandedPatientForm'; // Completo

const { hasProAccess } = useAuth();

// Estados para controlar modais:
const [showBasicPatientForm, setShowBasicPatientForm] = useState(false);
const [showExpandedPatientForm, setShowExpandedPatientForm] = useState(false);
const [patientToEdit, setPatientToEdit] = useState(null);

// Função para abrir modal correto:
const handleAddPatient = () => {
  setPatientToEdit(null);

  if (hasProAccess()) {
    setShowExpandedPatientForm(true);
  } else {
    setShowBasicPatientForm(true);
  }
};

const handleEditPatient = (patient) => {
  setPatientToEdit(patient);

  if (hasProAccess()) {
    setShowExpandedPatientForm(true);
  } else {
    setShowBasicPatientForm(true);
  }
};

// No JSX:
{/* Formulário Básico (Scheduling) */}
<PatientForm
  isOpen={showBasicPatientForm}
  onClose={() => {
    setShowBasicPatientForm(false);
    setPatientToEdit(null);
  }}
  onSave={handleSavePatient}
  patientToEdit={patientToEdit}
/>

{/* Formulário Expandido (Pro) */}
<ExpandedPatientForm
  isOpen={showExpandedPatientForm}
  onClose={() => {
    setShowExpandedPatientForm(false);
    setPatientToEdit(null);
  }}
  onSave={handleSavePatient}
  patient={patientToEdit}
/>
```

#### **PatientForm.js - Já está correto**
Formulário básico com 4 campos:
- Nome completo
- Data de nascimento
- Diagnóstico
- Observações gerais

#### **Testes**
1. ✅ Plano scheduling: Abre formulário básico (4 campos)
2. ✅ Plano Pro: Abre formulário expandido (10 abas)
3. ✅ Edição funciona em ambos os planos
4. ✅ Dados salvam corretamente

---

### **TAREFA 6: 🔴 CRÍTICO - Sistema de Registro de Sessão Simplificado**

#### **Objetivo**
Permitir que terapeutas marquem sessões agendadas como "completadas" com anotações de texto livre.

#### **Contexto**
Atualmente, o plano agendamento permite:
- ✅ Criar agendamentos
- ✅ Visualizar agenda
- ❌ **NÃO permite marcar sessão como realizada**
- ❌ **NÃO permite adicionar anotações de sessão**

**Sem isso**:
- Relatórios mostram 0% de conclusão
- Métricas ficam incorretas
- Sistema detecta como "sessões órfãs"

#### **Arquivos a Criar/Modificar**

**CRIAR**:
```
frontend/src/components/scheduling/SessionNoteModal.js (modal simples)
```

**MODIFICAR**:
```
frontend/src/pages/TherapistSchedulePage.js
backend/src/models/scheduledSessionModel.js
backend/src/controllers/schedulingController.js
backend/src/routes/schedulingRoutes.js
```

#### **Implementação**

**1. CRIAR SessionNoteModal.js**:

```javascript
// frontend/src/components/scheduling/SessionNoteModal.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSave,
  faSpinner,
  faCheckCircle,
  faPencilAlt,
  faCalendarCheck
} from '@fortawesome/free-solid-svg-icons';

const SessionNoteModal = ({ isOpen, onClose, onSave, appointment }) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && appointment) {
      setNotes(appointment.notes || '');
      setError('');
    }
  }, [isOpen, appointment]);

  const handleSave = async () => {
    if (!notes.trim()) {
      setError('Por favor, adicione uma anotação sobre a sessão.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave(appointment.id, notes);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar anotação.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    return timeString.substring(0, 5); // HH:MM
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-full">
              <FontAwesomeIcon icon={faPencilAlt} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Registrar Sessão Realizada
              </h2>
              <p className="text-sm text-gray-600">
                {appointment.patient_name} • {formatDate(appointment.scheduled_date)} às {formatTime(appointment.scheduled_time)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Informações da sessão */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
            <div className="flex items-start space-x-3">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-blue-600 mt-1" />
              <div>
                <p className="text-blue-800 font-medium mb-1">ℹ️ Importante</p>
                <p className="text-blue-700 text-sm">
                  Ao salvar esta anotação, a sessão será marcada como <strong>realizada</strong> e
                  aparecerá nos relatórios de agendamento.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Campo de anotações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anotações da Sessão <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="10"
              placeholder="Descreva o que aconteceu durante a sessão:&#10;&#10;• Atividades realizadas&#10;• Comportamentos observados&#10;• Progressos ou dificuldades&#10;• Próximos passos&#10;• Outras observações relevantes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-vertical"
            />
            <p className="mt-1 text-xs text-gray-500">
              {notes.length} caracteres
            </p>
          </div>

          {/* Dica */}
          <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
            <p className="text-green-700 text-xs">
              💡 <strong>Dica:</strong> Estas anotações poderão ser editadas posteriormente e
              ficarão preservadas caso a clínica migre para o plano Pro.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !notes.trim()}
            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={isSaving ? faSpinner : faCheckCircle} className={isSaving ? 'fa-spin' : ''} />
            <span>{isSaving ? 'Salvando...' : 'Marcar como Realizada'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionNoteModal;
```

**2. MODIFICAR TherapistSchedulePage.js**:

```javascript
// Adicionar imports:
import { completeSessionWithNotes } from '../api/schedulingApi';
import SessionNoteModal from '../components/scheduling/SessionNoteModal';

// Adicionar estados:
const [showSessionNoteModal, setShowSessionNoteModal] = useState(false);
const [sessionToComplete, setSessionToComplete] = useState(null);

// Adicionar função:
const handleCompleteSession = (appointment) => {
  setSessionToComplete(appointment);
  setShowSessionNoteModal(true);
};

const handleSaveSessionNote = async (appointmentId, notes) => {
  try {
    await completeSessionWithNotes(appointmentId, notes);

    // Recarregar dados
    await loadAllData();

    setShowSessionNoteModal(false);
    setSessionToComplete(null);
  } catch (error) {
    throw error;
  }
};

// No JSX, adicionar botão "Registrar Sessão" nos agendamentos:
// Exemplo de onde adicionar (dentro do map de appointments):
{appointment.status === 'scheduled' && (
  <button
    onClick={() => handleCompleteSession(appointment)}
    className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md border border-green-300 hover:bg-green-50 transition-colors text-sm flex items-center space-x-1"
  >
    <FontAwesomeIcon icon={faCheckCircle} />
    <span>Registrar Sessão</span>
  </button>
)}

{appointment.status === 'completed' && appointment.notes && (
  <button
    onClick={() => handleCompleteSession(appointment)}
    className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded-md border border-blue-300 hover:bg-blue-50 transition-colors text-sm flex items-center space-x-1"
  >
    <FontAwesomeIcon icon={faPencilAlt} />
    <span>Editar Anotação</span>
  </button>
)}

// No final do componente, antes do return:
<SessionNoteModal
  isOpen={showSessionNoteModal}
  onClose={() => {
    setShowSessionNoteModal(false);
    setSessionToComplete(null);
  }}
  onSave={handleSaveSessionNote}
  appointment={sessionToComplete}
/>
```

**3. BACKEND - scheduledSessionModel.js**:

```javascript
/**
 * Marca sessão como completada com anotações
 * @param {number} sessionId - ID da sessão
 * @param {string} notes - Anotações da sessão
 * @returns {Promise<Object>} Sessão atualizada
 */
async completeWithNotes(sessionId, notes) {
  const query = `
    UPDATE scheduled_sessions
    SET
      status = 'completed',
      notes = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [notes, sessionId]);

    if (rows.length === 0) {
      throw new Error('Sessão não encontrada');
    }

    console.log(`[SCHEDULING] Sessão ${sessionId} marcada como completada`);
    return rows[0];
  } catch (error) {
    console.error('[SCHEDULING-ERROR] Erro ao completar sessão:', error);
    throw error;
  }
}
```

**4. BACKEND - schedulingController.js**:

```javascript
/**
 * Marcar sessão como completada com anotações
 */
const completeSessionWithNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    // Validação
    if (!notes || !notes.trim()) {
      return res.status(400).json({
        error: 'Anotações são obrigatórias para marcar sessão como completada'
      });
    }

    // Buscar sessão
    const session = await scheduledSessionModel.getById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Verificar permissão (terapeuta da sessão ou admin da clínica)
    if (session.therapist_id !== userId && !req.user.is_admin) {
      return res.status(403).json({
        error: 'Sem permissão para completar esta sessão'
      });
    }

    // Completar sessão
    const updated = await scheduledSessionModel.completeWithNotes(sessionId, notes);

    res.json({
      message: 'Sessão marcada como realizada com sucesso',
      session: updated
    });
  } catch (error) {
    console.error('Erro ao completar sessão:', error);
    res.status(500).json({ error: 'Erro ao completar sessão' });
  }
};

module.exports = {
  // ... outras funções
  completeSessionWithNotes
};
```

**5. BACKEND - schedulingRoutes.js**:

```javascript
// Adicionar rota:
router.put(
  '/sessions/:sessionId/complete',
  verifyToken,
  schedulingController.completeSessionWithNotes
);
```

**6. FRONTEND - schedulingApi.js**:

```javascript
/**
 * Marcar sessão como completada com anotações
 */
export const completeSessionWithNotes = async (sessionId, notes) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/sessions/${sessionId}/complete`,
    { notes },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
```

#### **Funcionalidades Implementadas**
- ✅ Modal para registrar sessão com anotações
- ✅ Marcar sessão como "completed"
- ✅ Editar anotações de sessões já completadas
- ✅ Validação de permissões (apenas terapeuta da sessão ou admin)
- ✅ Compatível com migração de planos

#### **Testes**
1. ✅ Terapeuta marca sessão agendada como realizada
2. ✅ Anotação é salva em `scheduled_sessions.notes`
3. ✅ Status muda para "completed"
4. ✅ Sessão aparece em relatórios de agendamento
5. ✅ Métricas de conclusão ficam corretas
6. ✅ Terapeuta pode editar anotação depois
7. ✅ Anotações preservadas ao migrar para Pro

---

## 🔄 COMPATIBILIDADE DE MIGRAÇÃO

### **AGENDAMENTO → PRO (Upgrade)**

| Dado | Status | Observação |
|------|--------|-----------|
| Pacientes (dados básicos) | ✅ Preservados | Campos expandidos NULL, podem ser preenchidos depois |
| Terapeutas | ✅ Funcionam imediatamente | Ganham acesso a programas/dashboard |
| Agendamentos | ✅ Todos preservados | Continuam funcionando normalmente |
| Anotações de sessão (`scheduled_sessions.notes`) | ✅ Preservadas | Podem ser visualizadas no histórico |
| Relatórios de agendamento | ✅ Funcionam | Dados históricos mantidos |

**Resultado**: ✅ **TOTALMENTE COMPATÍVEL** - Cliente pode começar a usar features Pro imediatamente.

---

### **PRO → AGENDAMENTO (Downgrade)**

| Dado | Status | Observação |
|------|--------|-----------|
| Pacientes (dados expandidos) | ⚠️ Bloqueados | Permanecem no banco, mas interface não permite editar |
| Programas atribuídos | ⚠️ Bloqueados | Permanecem no banco, não são deletados |
| Registros de sessão detalhados | ⚠️ Bloqueados | Ligação em `progress_session_id` mantida |
| Dashboard | ❌ Bloqueado | Interface oculta |
| Agendamentos | ✅ Funcionam | Continuam normalmente |
| Anotações de sessão | ✅ Funcionam | Campo `notes` continua acessível |

**Resultado**: ⚠️ **COMPATÍVEL COM LIMITAÇÕES** - Nenhum dado é perdido, mas interfaces Pro são bloqueadas.

**⚠️ RECOMENDAÇÃO**: Adicionar aviso no Super Admin ao fazer downgrade de clínica que possui dados Pro.

---

## 🔧 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### **Fase 1: Crítico (Fazer primeiro)**
**Tempo estimado**: 2-3 horas

1. **Tarefa 6** - Sistema de Registro de Sessão (CRÍTICO)
   - Sem isso, plano agendamento não funciona
   - Maior impacto no sistema

### **Fase 2: Segurança (Fazer depois)**
**Tempo estimado**: 1 hora

2. **Tarefa 2** - Ocultar Dashboard
3. **Tarefa 4** - Proteger rota de Programas

### **Fase 3: UX (Pode fazer por último)**
**Tempo estimado**: 1.5 horas

4. **Tarefa 3** - Ocultar botão "Programas Atribuídos"
5. **Tarefa 5** - Formulário simplificado de paciente
6. **Tarefa 1** - Seletor de plano no cadastro

**Tempo Total**: ~4.5-5.5 horas

---

## ✅ TESTES PÓS-IMPLEMENTAÇÃO

### **Checklist de Testes - Plano Agendamento**

#### **Gestão de Clínica**
- [ ] Super admin consegue criar clínica com plano "scheduling"
- [ ] Super admin consegue criar clínica com plano "pro"
- [ ] Plano correto aparece no banco de dados

#### **Interface**
- [ ] Dashboard NÃO aparece no menu
- [ ] URL `/dashboard` redireciona para `/clients`
- [ ] Página de Programas NÃO aparece no menu
- [ ] URL `/programs` redireciona para `/clients`
- [ ] Botão "Programas Atribuídos" NÃO aparece no AdminPage

#### **Cadastro de Paciente**
- [ ] Formulário básico (4 campos) aparece ao criar/editar paciente
- [ ] Dados salvam corretamente
- [ ] Campos expandidos ficam NULL no banco

#### **Agendamento**
- [ ] Admin consegue criar agendamento
- [ ] Terapeuta consegue criar agendamento
- [ ] Agendamentos recorrentes funcionam
- [ ] Agenda pessoal (terapeuta) funciona
- [ ] Agenda geral (admin) funciona

#### **Registro de Sessão** (CRÍTICO)
- [ ] Terapeuta vê botão "Registrar Sessão" em agendamentos scheduled
- [ ] Modal de anotações abre corretamente
- [ ] Anotação salva em `scheduled_sessions.notes`
- [ ] Status muda para "completed"
- [ ] Botão muda para "Editar Anotação" após completar
- [ ] Terapeuta consegue editar anotação de sessão completada
- [ ] Sistema detecta sessão como realizada (não marca como órfã)

#### **Relatórios**
- [ ] Relatório geral de agendamentos funciona
- [ ] Relatório individual (terapeuta) funciona
- [ ] Métricas de conclusão estão corretas
- [ ] Sessões completadas aparecem no relatório
- [ ] Anotações aparecem no relatório

### **Checklist de Testes - Plano Pro**

#### **Todas as funcionalidades de Agendamento +**
- [ ] Dashboard aparece e funciona
- [ ] Página de Programas aparece e funciona
- [ ] Botão "Programas Atribuídos" aparece
- [ ] Formulário expandido (10 abas) aparece ao criar/editar paciente
- [ ] Registro detalhado de sessão com prompting funciona
- [ ] Relatórios de evolução funcionam

### **Checklist de Migração**

#### **Agendamento → Pro**
- [ ] Pacientes com dados básicos preservados
- [ ] Campos expandidos NULL (podem ser preenchidos)
- [ ] Agendamentos preservados
- [ ] Anotações de sessão preservadas
- [ ] Dashboard funciona (sem histórico de programas)
- [ ] Terapeuta pode atribuir programas imediatamente

#### **Pro → Agendamento**
- [ ] Dados de pacientes expandidos permanecem no banco
- [ ] Programas atribuídos permanecem no banco
- [ ] Dashboard desaparece do menu
- [ ] Página de Programas desaparece
- [ ] Agendamentos continuam funcionando
- [ ] Anotações de sessão continuam acessíveis
- [ ] Relatórios de agendamento funcionam

---

## 🚀 CONCLUSÃO

Após implementar estas 6 tarefas, o sistema de módulos estará **100% funcional** e pronto para produção.

**Prioridade Máxima**: **Tarefa 6** (Registro de Sessão) - sem ela, o plano agendamento não funciona adequadamente.

**Todas as outras tarefas são importantes para UX e segurança**, mas podem ser feitas em sequência após a crítica.

---

## 📞 CONTATO E SUPORTE

- **Documentação do Projeto**: `/abaplay/CLAUDE.md`
- **Guia de Implementação Original**: `/abaplay/GUIA_IMPLEMENTACAO_MODULOS.md`
- **Branch**: `feature/subscription-modules`

---

**Última Atualização**: Janeiro 2025
**Versão**: 1.0
**Status**: Pronto para implementação
