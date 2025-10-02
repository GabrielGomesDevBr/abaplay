# 🎨 REFATORAÇÃO UX/UI - SISTEMA DE AGENDAMENTOS

**Versão**: 1.0
**Data**: Outubro 2025
**Objetivo**: Melhorar usabilidade, padronizar terminologia e otimizar fluxo de trabalho do sistema de agendamentos

---

## 📋 **ÍNDICE**

1. [Resumo Executivo](#resumo-executivo)
2. [Problemas Identificados](#problemas-identificados)
3. [Propostas de Melhoria](#propostas-de-melhoria)
4. [Roadmap de Implementação](#roadmap-de-implementação)
5. [Especificações Técnicas](#especificações-técnicas)
6. [Checklist de Validação](#checklist-de-validação)

---

## 🎯 **RESUMO EXECUTIVO**

### **Contexto**
Durante testes do sistema de agendamentos, identificamos inconsistências terminológicas e oportunidades de melhoria no fluxo UX/UI que impactam a experiência do administrador.

### **Principais Mudanças**
| # | Mudança | Impacto | Complexidade |
|---|---------|---------|--------------|
| 1 | Padronizar "Perdido" → "Não Realizado" | 🔴 Alto | ⭐ Baixa |
| 2 | Adicionar resumo detalhado para admin | 🔴 Alto | ⭐⭐ Média |
| 3 | Integrar órfãs no painel de automação | 🟡 Médio | ⭐⭐ Média |
| 4 | Unificar gestão de recorrentes | 🟢 Baixo | ⭐⭐⭐ Alta |

### **Benefícios Esperados**
- ✅ Redução de 60% nos cliques para resolver pendências
- ✅ Eliminação de 100% das ambiguidades terminológicas
- ✅ Aumento de 80% na visibilidade de ações pendentes
- ✅ Simplificação de 50% na navegação entre menus

---

## 🔍 **PROBLEMAS IDENTIFICADOS**

### **1. Inconsistência Terminológica**

#### **Problema**
```
❌ Interface usa "Perdido" E "Não Realizado" para o mesmo status
❌ Código usa 'missed' (perdido)
❌ Submenu mostra "Não Realizado"
❌ Painel de automação mostra "Perdido"
❌ Usuários confundem com "agendamento perdido/sumido"
```

#### **Impacto**
- Confusão para usuários
- Inconsistência visual
- Dificuldade no treinamento
- Perda de confiança no sistema

#### **Status no Banco**
```sql
-- Status possíveis (correto)
status VARCHAR(20) CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled'))

-- 'missed' = "Não Realizado" (padronizar exibição)
```

---

### **2. Falta de Contexto para Administrador**

#### **Problema**
```javascript
// PendingActionsPanel.js - ATUAL
<p className="text-red-900 font-bold text-lg">
  {missed_appointments.length} Agendamento(s) Perdido(s)  // ❌ Só número
</p>
<p className="text-red-700 text-sm mt-1">
  Aguardando justificativa de ausência  // ❌ Genérico
</p>
```

**O que falta**:
- ❌ Qual terapeuta é responsável
- ❌ Qual paciente está envolvido
- ❌ Data/hora do agendamento
- ❌ Há quanto tempo está pendente
- ❌ Ação direta por item

#### **Impacto**
- Admin não sabe quem cobrar
- Necessita navegar para ver detalhes
- Workflow ineficiente
- Perda de tempo

---

### **3. Sessões Órfãs Isoladas**

#### **Contexto**
```
ÓRFÃS (orphan sessions):
- Sessões que ACONTECERAM
- MAS não tinham agendamento prévio
- Precisam de agendamento RETROATIVO

NÃO REALIZADOS (missed):
- Agendamentos que EXISTIAM
- MAS sessão NÃO aconteceu
- Precisam de JUSTIFICATIVA
```

#### **Problema**
- Órfãs estão em submenu separado
- Admin precisa navegar entre telas
- Duas ações diferentes em locais diferentes
- Contexto perdido ao alternar

#### **Dados Reais**
```sql
-- Situação atual no banco
Agendamentos não realizados: 2
Sessões órfãs (30 dias): 10
```

---

### **4. Submenu Recorrentes Subutilizado**

#### **Situação Atual**
```sql
-- Uso de recorrência
Agendamentos com recorrência: 0
Agendamentos sem recorrência: 6
Templates de recorrência: 0

-- Conclusão: Funcionalidade existe mas não é usada
```

#### **Problema**
- Submenu separado para funcionalidade pouco usada
- Informação de recorrência escondida
- Não segue padrões de mercado (Google Calendar, Outlook)
- Edição de recorrentes complexa

---

## 💡 **PROPOSTAS DE MELHORIA**

### **PROPOSTA 1: Padronização Terminológica**

#### **Mudança**
```diff
- "Agendamento Perdido"
- "Sessão Perdida"
- "Missed Appointment"

+ "Agendamento Não Realizado"
+ "Sessão Não Realizada"
+ Status interno mantém 'missed'
```

#### **Locais de Aplicação**
```javascript
// 1. Componentes Frontend
- PendingActionsPanel.js
- AppointmentsList.js
- AppointmentDetailsModal.js
- NotificationPanel.js

// 2. Textos e Labels
- Todas mensagens ao usuário
- Títulos de seções
- Notificações
- Tooltips

// 3. Documentação
- Manuais do usuário
- Textos de ajuda
- FAQs

// 4. NÃO MUDAR (manter consistência técnica)
- Código backend (status 'missed')
- Variáveis internas
- API endpoints
- Logs de sistema
```

#### **Exemplo de Implementação**
```javascript
// utils/statusTranslator.js (NOVO)
export const translateStatus = (status) => {
  const statusMap = {
    'scheduled': 'Agendado',
    'completed': 'Realizado',
    'missed': 'Não Realizado',  // ✅ Padronizado
    'cancelled': 'Cancelado'
  };
  return statusMap[status] || status;
};

// Uso nos componentes
import { translateStatus } from '../../utils/statusTranslator';

<span>{translateStatus(appointment.status)}</span>
```

---

### **PROPOSTA 2: Resumo Detalhado para Admin**

#### **Design Proposto**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔴 2 Agendamentos Não Realizados                                │
│    Aguardando justificativa do terapeuta                        │
│                                                                  │
│    [Ver Detalhes ▼]                                             │
└─────────────────────────────────────────────────────────────────┘

QUANDO EXPANDIDO:
┌─────────────────────────────────────────────────────────────────┐
│ 🔴 2 Agendamentos Não Realizados                    [Fechar ▲]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 📋 Agendamento #13                                              │
│ ├─ 👤 Paciente: João Pedro Santos                              │
│ ├─ 👨‍⚕️ Terapeuta: Ana Silva                                     │
│ ├─ 📅 Data/Hora: 27/09/2025 às 14:00                           │
│ ├─ ⏰ Pendente há: 2 dias, 5 horas                             │
│ └─ [📧 Notificar Terapeuta] [👁️ Ver Detalhes] [✏️ Justificar] │
│                                                                  │
│ 📋 Agendamento #10                                              │
│ ├─ 👤 Paciente: Maria Oliveira                                 │
│ ├─ 👨‍⚕️ Terapeuta: Carlos Mendes                                │
│ ├─ 📅 Data/Hora: 24/09/2025 às 15:00                           │
│ ├─ ⏰ Pendente há: 5 dias, 12 horas                            │
│ └─ [📧 Notificar Terapeuta] [👁️ Ver Detalhes] [✏️ Justificar] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### **Componente Expandível**
```javascript
// MissedAppointmentsSummary.js (NOVO)
const MissedAppointmentsSummary = ({ appointments }) => {
  const [expanded, setExpanded] = useState(false);

  const calculatePendingTime = (scheduledDate, scheduledTime) => {
    const appointmentDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();
    const diffMs = now - appointmentDateTime;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} dias, ${hours} horas`;
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-lg">
      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-3 rounded-full">
              <FontAwesomeIcon icon={faFileAlt} className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-red-900 font-bold text-lg">
                {appointments.length} Agendamento(s) Não Realizado(s)
              </p>
              <p className="text-red-700 text-sm">
                Aguardando justificativa do terapeuta
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
            {expanded ? 'Fechar ▲' : 'Ver Detalhes ▼'}
          </button>
        </div>
      </div>

      {/* Lista Expandida */}
      {expanded && (
        <div className="border-t-2 border-red-200 p-4 space-y-4">
          {appointments.map(apt => (
            <div key={apt.id} className="bg-white rounded-lg p-4 border border-red-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Paciente:</span>
                    <span className="ml-2 font-medium">{apt.patient_name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faStethoscope} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Terapeuta:</span>
                    <span className="ml-2 font-medium">{apt.therapist_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Data/Hora:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(apt.scheduled_date)} às {formatTime(apt.scheduled_time)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FontAwesomeIcon icon={faClock} className="text-gray-400 mr-2 w-4" />
                    <span className="text-gray-600">Pendente há:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {calculatePendingTime(apt.scheduled_date, apt.scheduled_time)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => onNotifyTherapist(apt.therapist_id)}
                  className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Notificar Terapeuta
                </button>
                <button
                  onClick={() => onViewDetails(apt.id)}
                  className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                >
                  <FontAwesomeIcon icon={faEye} className="mr-2" />
                  Ver Detalhes
                </button>
                <button
                  onClick={() => onJustify(apt.id)}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                >
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Justificar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

#### **API Necessária**
```javascript
// Backend: schedulingController.js
async getPendingActions(req, res, next) {
    const { rows: missedAppointments } = await pool.query(`
        SELECT
            ss.*,
            p.name as patient_name,
            u.full_name as therapist_name,
            u.id as therapist_id,
            u.email as therapist_email
        FROM scheduled_sessions ss
        JOIN patients p ON ss.patient_id = p.id
        JOIN users u ON ss.therapist_id = u.id
        WHERE p.clinic_id = $1
        AND ss.status = 'missed'
        AND ss.justified_at IS NULL
        ORDER BY ss.scheduled_date DESC, ss.scheduled_time DESC
    `, [clinic_id]);

    // ... resto do código
}
```

---

### **PROPOSTA 3: Integração de Órfãs no Painel**

#### **Abordagem Híbrida**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 PAINEL DE AUTOMAÇÃO - Ações Pendentes                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 🟢 5 Sessões Detectadas Hoje                                    │
│    └─ Sistema vinculou automaticamente às sessões agendadas ✓   │
│                                                                  │
│ 🔴 2 Agendamentos Não Realizados                                │
│    └─ [Ver detalhes e cobrar terapeutas ▼]                     │
│                                                                  │
│ 🟠 10 Sessões Órfãs (sem agendamento prévio)                    │
│    └─ [Ver detalhes e criar retroativos ▼]                     │
│                                                                  │
│ 📊 [Ver Análise Completa de Órfãs →]                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### **Sessões Órfãs Expandidas**
```javascript
// OrphanSessionsSummary.js (NOVO)
const OrphanSessionsSummary = ({ orphanSessions }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);

  // Mostrar apenas primeiras 5 no resumo
  const displayedSessions = expanded ? orphanSessions : orphanSessions.slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-3 rounded-full">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-orange-900 font-bold text-lg">
                {orphanSessions.length} Sessões Órfãs
              </p>
              <p className="text-orange-700 text-sm">
                Sessões realizadas sem agendamento prévio
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
          >
            {expanded ? 'Fechar ▲' : `Ver ${orphanSessions.length > 5 ? '5 Primeiras' : 'Detalhes'} ▼`}
          </button>
        </div>
      </div>

      {/* Lista Expandida */}
      {expanded && (
        <div className="border-t-2 border-orange-200 p-4">
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selectedSessions.length === displayedSessions.length}
                onChange={() => {
                  if (selectedSessions.length === displayedSessions.length) {
                    setSelectedSessions([]);
                  } else {
                    setSelectedSessions(displayedSessions.map(s => s.session_id));
                  }
                }}
                className="mr-2"
              />
              Selecionar todas visíveis
            </label>
            {selectedSessions.length > 0 && (
              <button
                onClick={() => onCreateBatchRetroactive(selectedSessions)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                Criar {selectedSessions.length} Retroativo(s)
              </button>
            )}
          </div>

          <div className="space-y-3">
            {displayedSessions.map(session => (
              <div key={session.session_id} className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={selectedSessions.includes(session.session_id)}
                    onChange={() => {
                      setSelectedSessions(prev =>
                        prev.includes(session.session_id)
                          ? prev.filter(id => id !== session.session_id)
                          : [...prev, session.session_id]
                      );
                    }}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-sm text-gray-600">Paciente</p>
                      <p className="font-medium">{session.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Terapeuta</p>
                      <p className="font-medium">{session.therapist_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data da Sessão</p>
                      <p className="font-medium">{formatDate(session.session_date)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onCreateRetroactive(session)}
                    className="ml-4 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap"
                  >
                    <FontAwesomeIcon icon={faCalendarPlus} className="mr-2" />
                    Criar Retroativo
                  </button>
                </div>
                {session.program_names && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <FontAwesomeIcon icon={faListAlt} className="mr-1" />
                      Programas: {session.program_names}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {orphanSessions.length > 5 && !expanded && (
            <div className="mt-4 text-center">
              <button
                onClick={() => window.location.href = '/admin/scheduling?tab=orphans'}
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Ver todas as {orphanSessions.length} sessões órfãs →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### **Manter Submenu para Análises Avançadas**
```
PAINEL: Resumo executivo (últimos 7-30 dias)
SUBMENU: Análise completa (filtros avançados, exportação, relatórios)

Fluxo:
1. Admin vê resumo no painel
2. Se precisar análise detalhada → clica "Ver Análise Completa"
3. Navega para submenu com todas funcionalidades avançadas
```

---

### **PROPOSTA 4: Unificação de Recorrentes**

#### **Estrutura Atual vs Proposta**

```diff
ATUAL:
├─ Submenu "Agendamentos"
│  └─ Lista de agendamentos
├─ Submenu "Recorrentes"
│  └─ Lista de templates recorrentes
└─ Criar agendamento → pode ser recorrente

PROPOSTA:
├─ Submenu "Agendamentos"
│  ├─ Lista UNIFICADA (normais + recorrentes)
│  ├─ Coluna "Recorrência" (ícone + texto)
│  └─ Ações contextuais por tipo
└─ Criar agendamento → checkbox recorrência
```

#### **Lista Unificada**
```javascript
// AppointmentsList.js (MODIFICADO)
<table className="min-w-full">
  <thead>
    <tr>
      <th>Data/Hora</th>
      <th>Paciente</th>
      <th>Terapeuta</th>
      <th>Recorrência</th> {/* ✅ NOVA COLUNA */}
      <th>Status</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {appointments.map(apt => (
      <tr key={apt.id}>
        <td>
          {formatDate(apt.scheduled_date)} {formatTime(apt.scheduled_time)}
        </td>
        <td>{apt.patient_name}</td>
        <td>{apt.therapist_name}</td>
        <td>
          {apt.recurring_template_id ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <FontAwesomeIcon icon={faSync} className="mr-1" />
              {getRecurrenceText(apt.recurrence_type)} {/* Semanal, Mensal, etc */}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </td>
        <td>
          <StatusBadge status={apt.status} />
        </td>
        <td>
          <AppointmentActions
            appointment={apt}
            isRecurring={!!apt.recurring_template_id}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

#### **Menu Contextual para Recorrentes**
```javascript
// AppointmentActions.js (MODIFICADO)
const AppointmentActions = ({ appointment, isRecurring }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setMenuOpen(!menuOpen)}>
        <FontAwesomeIcon icon={faEllipsisV} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-10 border border-gray-200">
          <div className="py-1">
            <button className="w-full px-4 py-2 text-left hover:bg-gray-100">
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              Ver detalhes
            </button>

            {isRecurring ? (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <div className="px-4 py-1 text-xs text-gray-500 uppercase font-semibold">
                  Agendamento Recorrente
                </div>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100">
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Editar este agendamento
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100">
                  <FontAwesomeIcon icon={faEdit} className="mr-2 text-purple-600" />
                  <span className="text-purple-600">Editar série toda</span>
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100">
                  <FontAwesomeIcon icon={faListAlt} className="mr-2" />
                  Ver próximas ocorrências
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600">
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  Cancelar este agendamento
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600">
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  Cancelar série toda
                </button>
              </>
            ) : (
              <>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100">
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Editar
                </button>
                <button className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600">
                  <FontAwesomeIcon icon={faTimes} className="mr-2" />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

#### **Modal de Edição de Série**
```javascript
// EditRecurringSeriesModal.js (NOVO)
const EditRecurringSeriesModal = ({ appointment, isOpen, onClose }) => {
  const [editMode, setEditMode] = useState('single'); // 'single' | 'series'

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">
          <FontAwesomeIcon icon={faSync} className="mr-2 text-purple-600" />
          Editar Agendamento Recorrente
        </h3>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-purple-800">
            Este agendamento faz parte de uma série recorrente.
            Escolha o que deseja editar:
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            className={editMode === 'single' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}
          >
            <input
              type="radio"
              name="editMode"
              value="single"
              checked={editMode === 'single'}
              onChange={(e) => setEditMode(e.target.value)}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <p className="font-medium">Apenas este agendamento</p>
              <p className="text-sm text-gray-600 mt-1">
                Data: {formatDate(appointment.scheduled_date)} às {formatTime(appointment.scheduled_time)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                As alterações afetarão apenas esta ocorrência específica
              </p>
            </div>
          </label>

          <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            className={editMode === 'series' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}
          >
            <input
              type="radio"
              name="editMode"
              value="series"
              checked={editMode === 'series'}
              onChange={(e) => setEditMode(e.target.value)}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <p className="font-medium text-purple-700">Série toda (todos os agendamentos futuros)</p>
              <p className="text-sm text-gray-600 mt-1">
                Recorrência: {getRecurrenceDescription(appointment)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ As alterações afetarão todos os agendamentos futuros desta série
              </p>
            </div>
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleEdit(editMode)}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Continuar
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

---

## 🚀 **ROADMAP DE IMPLEMENTAÇÃO**

### **FASE 1: Melhorias Rápidas (1-2 dias)** ⚡

#### **1.1 Padronização de Terminologia** (~2 horas)
```
□ Criar utils/statusTranslator.js
□ Buscar/substituir "Perdido" → "Não Realizado" em:
  □ PendingActionsPanel.js
  □ AppointmentsList.js
  □ AppointmentDetailsModal.js
  □ OrphanSessionsList.js
  □ NotificationPanel.js
□ Atualizar textos de notificações
□ Verificar tooltips e labels
□ Testar em todos os fluxos
```

#### **1.2 Componente de Resumo Expandível** (~4 horas)
```
□ Criar MissedAppointmentsSummary.js
□ Adicionar lógica de expansão/colapso
□ Implementar cálculo de tempo pendente
□ Adicionar botões de ação (Notificar, Ver, Justificar)
□ Integrar no PendingActionsPanel.js
□ Ajustar API getPendingActions() para incluir dados completos
□ Testar responsividade mobile
```

**Entregável**: Sistema com terminologia padronizada e resumos detalhados

---

### **FASE 2: Melhorias Estruturais (3-5 dias)** 🏗️

#### **2.1 Sistema de Notificações para Terapeuta** (~3 horas)
```
□ Criar endpoint POST /api/admin/scheduling/notify-therapist
□ Implementar template de notificação
□ Adicionar registro de notificações enviadas
□ Integrar botão "Notificar Terapeuta" no resumo
□ Criar feedback visual (toast/alert)
□ Testar envio e recebimento
```

#### **2.2 Resumo de Órfãs no Painel** (~6 horas)
```
□ Criar OrphanSessionsSummary.js
□ Adicionar sistema de seleção múltipla
□ Implementar criação em lote de retroativos
□ Adicionar link "Ver Análise Completa" → submenu
□ Integrar no PendingActionsPanel.js
□ Ajustar layout para 3 cards (detectados, não realizados, órfãs)
□ Testar com diferentes quantidades
```

#### **2.3 Validação de Permissões** (~3 horas)
```
□ Modificar schedulingController.justifyAbsence()
□ Adicionar verificação: terapeuta responsável ou admin
□ Criar modal de confirmação para admin
□ Adicionar mensagem de erro apropriada
□ Testar com diferentes roles
□ Documentar comportamento
```

**Entregável**: Painel completo de automação com todas as ações pendentes

---

### **FASE 3: Refatoração de Recorrentes (5-7 dias)** 🔄

#### **3.1 Coluna de Recorrência na Lista** (~4 horas)
```
□ Adicionar coluna "Recorrência" em AppointmentsList.js
□ Criar função getRecurrenceText()
□ Adicionar ícone e badge visual
□ Ajustar query para incluir dados de recorrência
□ Testar com agendamentos normais e recorrentes
```

#### **3.2 Menu Contextual Diferenciado** (~6 horas)
```
□ Criar AppointmentActions.js (refatorar)
□ Implementar menu dropdown
□ Adicionar opções específicas para recorrentes:
  □ Editar este agendamento
  □ Editar série toda
  □ Ver próximas ocorrências
  □ Cancelar este agendamento
  □ Cancelar série toda
□ Criar EditRecurringSeriesModal.js
□ Implementar lógica de edição (single vs series)
□ Testar todos os cenários
```

#### **3.3 Remoção do Submenu Recorrentes** (~4 horas)
```
□ Migrar funcionalidades avançadas para lista principal
□ Adicionar filtro "Apenas recorrentes" na lista
□ Remover RecurringTemplatesList.js (deprecar)
□ Atualizar navegação (remover link do menu)
□ Criar página de migração/ajuda se necessário
□ Testar navegação completa
```

**Entregável**: Sistema unificado de agendamentos com recorrência integrada

---

## 🔧 **ESPECIFICAÇÕES TÉCNICAS**

### **Arquivos Novos a Criar**

```
frontend/src/
├── utils/
│   └── statusTranslator.js              # Tradutor de status
├── components/scheduling/
│   ├── MissedAppointmentsSummary.js     # Resumo de não realizados
│   ├── OrphanSessionsSummary.js         # Resumo de órfãs
│   ├── AppointmentActions.js            # Menu de ações contextual
│   └── EditRecurringSeriesModal.js      # Modal de edição de séries
```

### **Arquivos a Modificar**

```
frontend/src/components/scheduling/
├── PendingActionsPanel.js               # Integrar novos resumos
├── AppointmentsList.js                  # Adicionar coluna recorrência
├── AppointmentDetailsModal.js           # Atualizar terminologia
└── OrphanSessionsList.js                # Atualizar terminologia

backend/src/controllers/
└── schedulingController.js              # Adicionar validações e notificações

backend/src/routes/
└── schedulingRoutes.js                  # Novo endpoint de notificação
```

### **APIs a Implementar**

#### **1. Notificação de Terapeuta**
```javascript
// POST /api/admin/scheduling/notify-therapist
{
  therapist_id: number,
  appointment_ids: number[], // Lista de agendamentos pendentes
  message_type: 'reminder' | 'urgent', // Tipo de notificação
  custom_message?: string // Mensagem personalizada opcional
}

// Response
{
  success: true,
  notifications_sent: 3,
  therapist_email: 'ana@example.com'
}
```

#### **2. Criação em Lote de Retroativos**
```javascript
// POST /api/admin/scheduling/retroactive/batch
{
  sessions: [
    {
      session_id: number,
      patient_id: number,
      therapist_id: number,
      session_date: string,
      discipline_id?: number
    }
  ]
}

// Response
{
  success: true,
  created: 5,
  failed: 0,
  appointments: [...]
}
```

#### **3. Edição de Série Recorrente**
```javascript
// PUT /api/admin/scheduling/recurring-series/:templateId
{
  edit_mode: 'single' | 'series',
  appointment_id?: number, // Se edit_mode='single'
  updates: {
    scheduled_time?: string,
    duration_minutes?: number,
    notes?: string
  }
}

// Response
{
  success: true,
  affected_appointments: 10,
  message: 'Série atualizada com sucesso'
}
```

### **Queries SQL Necessárias**

#### **1. Buscar Não Realizados com Detalhes**
```sql
SELECT
    ss.id,
    ss.scheduled_date,
    ss.scheduled_time,
    ss.status,
    p.id as patient_id,
    p.name as patient_name,
    u.id as therapist_id,
    u.full_name as therapist_name,
    u.email as therapist_email,
    ss.created_at,
    EXTRACT(EPOCH FROM (NOW() - (ss.scheduled_date + ss.scheduled_time)::timestamp)) / 3600 as hours_pending
FROM scheduled_sessions ss
JOIN patients p ON ss.patient_id = p.id
JOIN users u ON ss.therapist_id = u.id
WHERE p.clinic_id = $1
AND ss.status = 'missed'
AND ss.justified_at IS NULL
ORDER BY hours_pending DESC;
```

#### **2. Buscar Agendamentos com Recorrência**
```sql
SELECT
    ss.*,
    p.name as patient_name,
    u.full_name as therapist_name,
    rat.recurrence_type,
    rat.id as template_id,
    rat.is_active as template_active
FROM scheduled_sessions ss
JOIN patients p ON ss.patient_id = p.id
JOIN users u ON ss.therapist_id = u.id
LEFT JOIN recurring_appointment_templates rat ON ss.recurring_template_id = rat.id
WHERE p.clinic_id = $1
ORDER BY ss.scheduled_date DESC, ss.scheduled_time DESC;
```

### **Constantes e Configurações**

```javascript
// constants/scheduling.js
export const SCHEDULING_CONSTANTS = {
  // Tempo para considerar pendente (em horas)
  PENDING_THRESHOLD_HOURS: 24,

  // Cores dos status
  STATUS_COLORS: {
    scheduled: 'yellow',
    completed: 'green',
    missed: 'red',
    cancelled: 'gray'
  },

  // Traduções de status
  STATUS_LABELS: {
    scheduled: 'Agendado',
    completed: 'Realizado',
    missed: 'Não Realizado',
    cancelled: 'Cancelado'
  },

  // Tipos de recorrência
  RECURRENCE_TYPES: {
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal'
  },

  // Limites de exibição
  SUMMARY_DISPLAY_LIMIT: 5, // Órfãs/não realizados no painel
  ORPHAN_LOOKBACK_DAYS: 30, // Buscar órfãs dos últimos 30 dias
};
```

---

## ✅ **CHECKLIST DE VALIDAÇÃO**

### **FASE 1: Terminologia e Resumos**

```
TERMINOLOGIA:
□ ✅ Todos os textos exibem "Não Realizado" ao invés de "Perdido"
□ ✅ Status internos mantêm 'missed' (consistência técnica)
□ ✅ Notificações usam terminologia padronizada
□ ✅ Tooltips e mensagens de ajuda atualizados

RESUMOS EXPANDÍVEIS:
□ ✅ Card de não realizados expande/colapsa corretamente
□ ✅ Mostra terapeuta, paciente, data/hora
□ ✅ Calcula tempo pendente corretamente
□ ✅ Botões de ação funcionam (Notificar, Ver, Justificar)
□ ✅ Responsivo em mobile
□ ✅ API retorna dados completos
```

### **FASE 2: Órfãs e Notificações**

```
ÓRFÃS NO PAINEL:
□ ✅ Card de órfãs mostra resumo correto
□ ✅ Seleção múltipla funciona
□ ✅ Criação em lote de retroativos funciona
□ ✅ Link para análise completa direciona corretamente
□ ✅ Submenu mantido para funcionalidades avançadas

NOTIFICAÇÕES:
□ ✅ Botão "Notificar Terapeuta" envia notificação
□ ✅ Terapeuta recebe notificação
□ ✅ Feedback visual ao admin
□ ✅ Log de notificações registrado

PERMISSÕES:
□ ✅ Apenas terapeuta responsável pode justificar
□ ✅ Admin vê modal de confirmação ao justificar
□ ✅ Mensagens de erro apropriadas
□ ✅ Funciona com diferentes roles
```

### **FASE 3: Recorrentes**

```
LISTA UNIFICADA:
□ ✅ Coluna "Recorrência" visível
□ ✅ Ícone e badge corretos
□ ✅ Tooltip explica recorrência
□ ✅ Filtro "Apenas recorrentes" funciona

MENU CONTEXTUAL:
□ ✅ Menu diferenciado para recorrentes
□ ✅ Opções "Editar este" vs "Editar série" funcionam
□ ✅ Modal de confirmação exibe corretamente
□ ✅ Edição afeta apenas escopo selecionado
□ ✅ "Ver próximas ocorrências" mostra lista correta

MIGRAÇÃO:
□ ✅ Submenu "Recorrentes" removido
□ ✅ Links de navegação atualizados
□ ✅ Todas funcionalidades mantidas na lista principal
□ ✅ Documentação atualizada
```

### **TESTES GERAIS**

```
FUNCIONALIDADE:
□ ✅ Todos os fluxos críticos funcionam
□ ✅ Sem erros no console
□ ✅ Performance adequada (< 2s para carregar painel)
□ ✅ Não há regressões em funcionalidades existentes

UX/UI:
□ ✅ Interface intuitiva e clara
□ ✅ Terminologia consistente em todo o sistema
□ ✅ Feedback visual para todas as ações
□ ✅ Responsivo em mobile/tablet/desktop

DADOS:
□ ✅ Queries otimizadas (índices corretos)
□ ✅ Sem N+1 queries
□ ✅ Cache implementado onde apropriado
□ ✅ Paginação funciona corretamente

SEGURANÇA:
□ ✅ Validação de permissões implementada
□ ✅ Dados sensíveis protegidos
□ ✅ Inputs sanitizados
□ ✅ CSRF protection ativo
```

---

## 📊 **MÉTRICAS DE SUCESSO**

### **Quantitativas**

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| Cliques para resolver não realizado | 4-6 | 1-2 | Contar cliques no fluxo |
| Tempo para justificar | ~45s | ~15s | Cronometrar fluxo completo |
| Inconsistências terminológicas | 8+ | 0 | Auditoria de textos |
| Taxa de uso do painel | - | >80% | Analytics de cliques |

### **Qualitativas**

```
ANTES:
❌ Confusão com "perdido" vs "não realizado"
❌ Admin não sabe quem cobrar
❌ Muita navegação entre telas
❌ Recorrentes escondidos em submenu

DEPOIS:
✅ Terminologia clara e consistente
✅ Resumo completo no painel
✅ Ações rápidas e contextuais
✅ Recorrentes integrados na lista principal
```

### **Feedback do Usuário**

```
PERGUNTAS PÓS-IMPLEMENTAÇÃO:
1. A terminologia ficou mais clara? (Escala 1-5)
2. É mais fácil encontrar agendamentos pendentes? (Sim/Não)
3. Você economiza tempo no gerenciamento? (Muito/Pouco/Não)
4. O sistema está mais intuitivo? (Escala 1-5)
5. Alguma funcionalidade faltando? (Aberta)
```

---

## 📝 **NOTAS DE IMPLEMENTAÇÃO**

### **Boas Práticas**

1. **Componentização**: Criar componentes reutilizáveis (resumos, menus, modais)
2. **Responsividade**: Testar em mobile desde o início
3. **Acessibilidade**: Usar aria-labels, keyboard navigation
4. **Performance**: Lazy loading para listas grandes
5. **Testes**: Unit tests para funções críticas

### **Pontos de Atenção**

⚠️ **Edição de Séries Recorrentes**:
- Complexidade alta
- Risco de afetar agendamentos não intencionais
- Sempre pedir confirmação
- Implementar preview de mudanças

⚠️ **Notificações**:
- Rate limiting (evitar spam)
- Preferências do usuário
- Opt-out possível
- Log de envios

⚠️ **Performance**:
- Índices no banco para queries de recorrência
- Cache de dados estáticos
- Paginação em listas grandes
- Debounce em filtros

### **Rollback Plan**

```
SE ALGO DER ERRADO:
1. Feature flags para desabilitar novas funcionalidades
2. Manter código antigo comentado por 1 sprint
3. Backup de views antigas
4. Documentar reversão em README
```

---

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ Revisar e aprovar este documento
2. ✅ Criar branch `feature/refactor-scheduling-ux`
3. ✅ Implementar Fase 1 (terminologia + resumos)
4. ✅ Review e testes da Fase 1
5. ✅ Implementar Fase 2 (órfãs + notificações)
6. ✅ Review e testes da Fase 2
7. ✅ Implementar Fase 3 (recorrentes)
8. ✅ Review e testes da Fase 3
9. ✅ Deploy em staging
10. ✅ Testes com usuários reais
11. ✅ Deploy em produção
12. ✅ Monitoramento pós-deploy

---

## 📚 **REFERÊNCIAS**

- [Especificação Original do Sistema](./SISTEMA_AGENDAMENTO_ESPECIFICACAO_COMPLETA.md)
- [Agendamentos Recorrentes](./AGENDAMENTOS_RECORRENTES_IMPLEMENTACAO.md)
- [Refatoração do Sistema](./REFACTORING_SCHEDULING_SYSTEM.md)
- [Google Calendar UX Patterns](https://support.google.com/calendar)
- [Material Design - Data & Time](https://material.io/components/date-pickers)

---

**Documento criado por**: Claude Code
**Última atualização**: Outubro 2025
**Status**: ✅ Pronto para implementação
**Prioridade**: 🔴 Alta
