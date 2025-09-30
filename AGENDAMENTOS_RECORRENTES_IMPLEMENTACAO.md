# 🔄 SISTEMA DE AGENDAMENTOS RECORRENTES - GUIA DE IMPLEMENTAÇÃO

**Versão**: 2.0 - Adaptado para Estrutura Atual
**Data**: Janeiro 2025
**Estimativa**: 12-16 horas de desenvolvimento

---

## 📋 **VISÃO GERAL**

Este documento detalha a implementação completa do sistema de agendamentos recorrentes para o ABAplay, adaptado para a estrutura atual que trabalha diretamente com `patient_id`, `therapist_id` e `discipline_id`, permitindo criar séries de agendamentos que se repetem automaticamente (ex: "toda segunda às 09h").

### **Objetivos**
- ✅ Automatizar criação de agendamentos repetitivos
- ✅ Reduzir trabalho manual dos administradores
- ✅ Manter flexibilidade para alterações individuais
- ✅ Preservar total compatibilidade com sistema atual
- ✅ Integrar com estrutura existente (patient_id + therapist_id + discipline_id)
- ✅ Suportar campos específicos já implementados (is_retroactive, detection_source)

---

## 🗄️ **FASE 1: ESTRUTURA DE BANCO DE DADOS**

**Duração Estimada**: 2-3 horas

### **1.1 Nova Tabela: `recurring_appointment_templates`**
**ADAPTADA PARA ESTRUTURA ATUAL**

```sql
-- Tabela principal para templates de recorrência
-- INTEGRADA COM ESTRUTURA EXISTENTE: patient_id + therapist_id + discipline_id
CREATE TABLE recurring_appointment_templates (
    id SERIAL PRIMARY KEY,

    -- Relacionamentos básicos (ESTRUTURA ATUAL)
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    therapist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discipline_id INTEGER REFERENCES disciplines(id), -- Opcional: área específica ou sessão geral

    -- Configuração de recorrência
    recurrence_type VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('weekly', 'biweekly', 'monthly', 'custom')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 6=sábado
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,

    -- Período de validade
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = sem fim definido

    -- Configurações de geração
    generate_weeks_ahead INTEGER DEFAULT 4, -- Quantas semanas gerar antecipadamente

    -- Status e gestão de exceções
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false, -- NOVO: Pausar temporariamente
    paused_until DATE, -- NOVO: Data até quando está pausado
    pause_reason TEXT, -- NOVO: Motivo da pausa

    -- Tratamento de feriados
    skip_holidays BOOLEAN DEFAULT false, -- NOVO: Pular feriados automaticamente
    holiday_behavior VARCHAR(20) DEFAULT 'skip' CHECK (holiday_behavior IN ('skip', 'next_day', 'previous_day')),

    -- Metadados e auditoria
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Campos de auditoria
    deactivated_by INTEGER REFERENCES users(id),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivation_reason TEXT,

    -- Estatísticas de uso (para analytics)
    total_appointments_generated INTEGER DEFAULT 0,
    last_generation_date TIMESTAMP WITH TIME ZONE,

    -- Constraint para evitar duplicatas
    UNIQUE(patient_id, therapist_id, discipline_id, day_of_week, scheduled_time, recurrence_type)
);
```

### **1.2 Modificação na Tabela Existente**
**INTEGRANDO COM CAMPOS JÁ EXISTENTES**

```sql
-- Adicionar referência ao template na tabela de agendamentos (NOVO)
ALTER TABLE scheduled_sessions
ADD COLUMN recurring_template_id INTEGER REFERENCES recurring_appointment_templates(id);

-- Adicionar flag para identificar agendamentos gerados automaticamente (NOVO)
ALTER TABLE scheduled_sessions
ADD COLUMN is_auto_generated BOOLEAN DEFAULT false;

-- CAMPOS JÁ EXISTENTES QUE SERÃO UTILIZADOS:
-- - is_retroactive: será FALSE para agendamentos recorrentes gerados prospectivamente
-- - detection_source: será 'recurring_template' para agendamentos gerados por template
-- - patient_id, therapist_id, discipline_id: estrutura base já existente
-- - missed_reason_type, missed_reason_description: para justificativas

-- Adicionar novos valores ao check constraint de detection_source
ALTER TABLE scheduled_sessions
DROP CONSTRAINT IF EXISTS scheduled_sessions_detection_source_check;

ALTER TABLE scheduled_sessions
ADD CONSTRAINT scheduled_sessions_detection_source_check
CHECK (detection_source IN ('manual', 'orphan_converted', 'auto_detected', 'recurring_template'));
```

### **1.3 Índices para Performance**

```sql
-- Índices essenciais para templates de recorrência
CREATE INDEX idx_recurring_templates_patient_therapist ON recurring_appointment_templates(patient_id, therapist_id);
CREATE INDEX idx_recurring_templates_active ON recurring_appointment_templates(is_active, is_paused, start_date, end_date);
CREATE INDEX idx_recurring_templates_day_time ON recurring_appointment_templates(day_of_week, scheduled_time);
CREATE INDEX idx_recurring_templates_generation ON recurring_appointment_templates(is_active, generate_weeks_ahead, last_generation_date);

-- Índices para agendamentos com template
CREATE INDEX idx_scheduled_sessions_template ON scheduled_sessions(recurring_template_id);
CREATE INDEX idx_scheduled_sessions_auto_generated ON scheduled_sessions(is_auto_generated, scheduled_date);
CREATE INDEX idx_scheduled_sessions_recurring_lookup ON scheduled_sessions(patient_id, therapist_id, scheduled_date)
WHERE recurring_template_id IS NOT NULL;

-- Índice composto para verificação de conflitos
CREATE INDEX idx_scheduled_sessions_conflict_check ON scheduled_sessions(therapist_id, scheduled_date, scheduled_time, status)
WHERE status IN ('scheduled', 'completed');
```

### **1.4 Funções de Apoio (ADAPTADAS)**

```sql
-- Função para gerar próximos agendamentos de um template
CREATE OR REPLACE FUNCTION generate_recurring_appointments(
    template_id INTEGER,
    weeks_to_generate INTEGER DEFAULT NULL
) RETURNS TABLE(
    generated_date DATE,
    scheduled_time TIME,
    success BOOLEAN,
    conflict_reason TEXT
) AS $$
DECLARE
    template_record RECORD;
    current_date DATE;
    target_date DATE;
    week_offset INTEGER;
    max_weeks INTEGER;
    conflict_exists BOOLEAN;
BEGIN
    -- Buscar template
    SELECT * INTO template_record
    FROM recurring_appointment_templates
    WHERE id = template_id AND is_active = true AND (is_paused = false OR paused_until < CURRENT_DATE);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template não encontrado ou inativo';
    END IF;

    max_weeks := COALESCE(weeks_to_generate, template_record.generate_weeks_ahead);
    current_date := GREATEST(template_record.start_date, CURRENT_DATE);

    -- Gerar agendamentos por semanas
    FOR week_offset IN 0..max_weeks-1 LOOP
        -- Calcular data alvo baseada no tipo de recorrência
        CASE template_record.recurrence_type
            WHEN 'weekly' THEN
                target_date := current_date + (week_offset * 7) +
                              (template_record.day_of_week - EXTRACT(dow FROM current_date))::INTEGER;
            WHEN 'biweekly' THEN
                target_date := current_date + (week_offset * 14) +
                              (template_record.day_of_week - EXTRACT(dow FROM current_date))::INTEGER;
            WHEN 'monthly' THEN
                target_date := current_date + (week_offset * 30) +
                              (template_record.day_of_week - EXTRACT(dow FROM current_date))::INTEGER;
        END CASE;

        -- Verificar se data está dentro do período válido
        IF template_record.end_date IS NOT NULL AND target_date > template_record.end_date THEN
            CONTINUE;
        END IF;

        -- Verificar se já existe agendamento
        SELECT EXISTS(
            SELECT 1 FROM scheduled_sessions
            WHERE patient_id = template_record.patient_id
            AND therapist_id = template_record.therapist_id
            AND scheduled_date = target_date
            AND status IN ('scheduled', 'completed')
        ) INTO conflict_exists;

        IF NOT conflict_exists THEN
            -- Inserir agendamento
            INSERT INTO scheduled_sessions (
                patient_id, therapist_id, discipline_id,
                scheduled_date, scheduled_time, duration_minutes,
                status, created_by, recurring_template_id,
                is_auto_generated, is_retroactive, detection_source,
                notes
            ) VALUES (
                template_record.patient_id, template_record.therapist_id, template_record.discipline_id,
                target_date, template_record.scheduled_time, template_record.duration_minutes,
                'scheduled', template_record.created_by, template_id,
                true, false, 'recurring_template',
                'Agendamento gerado automaticamente pelo template #' || template_id
            );

            RETURN QUERY SELECT target_date, template_record.scheduled_time, true, NULL::TEXT;
        ELSE
            RETURN QUERY SELECT target_date, template_record.scheduled_time, false, 'Conflito: já existe agendamento'::TEXT;
        END IF;
    END LOOP;

    -- Atualizar estatísticas do template
    UPDATE recurring_appointment_templates
    SET last_generation_date = NOW(),
        total_appointments_generated = total_appointments_generated +
            (SELECT COUNT(*) FROM scheduled_sessions WHERE recurring_template_id = template_id)
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários de documentação
COMMENT ON TABLE recurring_appointment_templates IS 'Templates para agendamentos recorrentes - integrado com estrutura atual (patient_id + therapist_id + discipline_id)';
COMMENT ON COLUMN recurring_appointment_templates.recurrence_type IS 'Tipo: weekly, biweekly, monthly, custom';
COMMENT ON COLUMN recurring_appointment_templates.day_of_week IS '0=domingo, 1=segunda, ..., 6=sábado';
COMMENT ON COLUMN recurring_appointment_templates.generate_weeks_ahead IS 'Quantas semanas gerar antecipadamente';
COMMENT ON COLUMN recurring_appointment_templates.is_paused IS 'Pausar template temporariamente';
COMMENT ON COLUMN recurring_appointment_templates.skip_holidays IS 'Pular feriados automaticamente';
```

---

## 🖥️ **FASE 2: INTERFACE DE USUÁRIO**

**Duração Estimada**: 4-5 horas

### **2.1 Modificações no `AppointmentForm.js`**
**INTEGRAÇÃO COM ESTRUTURA ATUAL**

#### **Estados Adicionais (COMPATÍVEL COM FORMULÁRIO EXISTENTE)**
```javascript
// Estados para recorrência - INTEGRADO COM ESTRUTURA EXISTENTE
const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
const [recurrenceConfig, setRecurrenceConfig] = useState({
  type: 'weekly', // weekly, biweekly, monthly
  endDate: '',
  generateWeeks: 4,
  skipHolidays: false,
  notes: ''
});

// Estado para preview de agendamentos
const [recurrencePreview, setRecurrencePreview] = useState([]);
const [showPreview, setShowPreview] = useState(false);
```

#### **Seção de Recorrência na UI**
```jsx
{/* Seção de Recorrência */}
<div className="recurrence-section">
  <div className="flex items-center mb-4">
    <input
      type="checkbox"
      id="recurrence-enabled"
      checked={recurrenceEnabled}
      onChange={(e) => setRecurrenceEnabled(e.target.checked)}
      className="rounded border-gray-300"
    />
    <label htmlFor="recurrence-enabled" className="ml-2 font-medium">
      🔄 Repetir este agendamento
    </label>
  </div>

  {recurrenceEnabled && (
    <div className="bg-blue-50 p-4 rounded-lg space-y-4">
      {/* Tipo de recorrência */}
      <div>
        <label className="block text-sm font-medium mb-2">Frequência</label>
        <select
          value={recurrenceConfig.type}
          onChange={(e) => setRecurrenceConfig({...recurrenceConfig, type: e.target.value})}
          className="form-select w-full"
        >
          <option value="weekly">📅 Toda semana (mesmo dia/hora)</option>
          <option value="biweekly">📅 A cada 2 semanas</option>
          <option value="monthly">📅 Todo mês (mesmo dia)</option>
        </select>
      </div>

      {/* Configurações avançadas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Gerar para próximas</label>
          <select
            value={recurrenceConfig.generateWeeks}
            onChange={(e) => setRecurrenceConfig({...recurrenceConfig, generateWeeks: parseInt(e.target.value)})}
            className="form-select w-full"
          >
            <option value={4}>4 semanas</option>
            <option value={8}>8 semanas</option>
            <option value={12}>12 semanas</option>
            <option value={16}>16 semanas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Terminar em (opcional)</label>
          <input
            type="date"
            value={recurrenceConfig.endDate}
            onChange={(e) => setRecurrenceConfig({...recurrenceConfig, endDate: e.target.value})}
            className="form-input w-full"
            min={formData.scheduled_date}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white p-3 rounded border">
        <p className="text-sm text-gray-600">
          <strong>Preview:</strong> {generateRecurrencePreview(formData, recurrenceConfig)}
        </p>
      </div>
    </div>
  )}
</div>
```

### **2.2 Novo Componente: `RecurringAppointmentsList.js`**

#### **Funcionalidades**
- ✅ Listar todos os templates ativos
- ✅ Visualizar próximos agendamentos gerados
- ✅ Pausar/reativar séries
- ✅ Editar configurações
- ✅ Excluir séries

#### **Layout Sugerido**
```jsx
<div className="recurring-appointments-list">
  <div className="header">
    <h3>🔄 Agendamentos Recorrentes Ativos</h3>
    <button>➕ Novo Agendamento Recorrente</button>
  </div>

  {templates.map(template => (
    <div key={template.id} className="template-card">
      <div className="template-info">
        <h4>{template.patient_name} - {template.therapist_name}</h4>
        <p>{formatRecurrenceDescription(template)}</p>
        <div className="next-appointments">
          Próximos: {template.upcoming_appointments.slice(0, 3).map(...)}
        </div>
      </div>

      <div className="template-actions">
        <button>✏️ Editar</button>
        <button>⏸️ Pausar</button>
        <button>🗑️ Excluir</button>
      </div>
    </div>
  ))}
</div>
```

### **2.3 Integração na `SchedulingPage.js`**

#### **Nova Aba**
```jsx
const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'recurring'

<div className="tabs">
  <button
    className={activeTab === 'appointments' ? 'active' : ''}
    onClick={() => setActiveTab('appointments')}
  >
    📅 Agendamentos
  </button>
  <button
    className={activeTab === 'recurring' ? 'active' : ''}
    onClick={() => setActiveTab('recurring')}
  >
    🔄 Recorrentes
  </button>
</div>
```

---

## ⚙️ **FASE 3: LÓGICA DE BACKEND**

**Duração Estimada**: 5-6 horas

### **3.1 Novo Model: `recurringAppointmentModel.js`**
**ADAPTADO PARA ESTRUTURA ATUAL**

#### **Métodos Principais**
```javascript
class RecurringAppointmentModel {
  // Criar template de recorrência (ADAPTADO)
  async createTemplate(templateData) {
    const {
      patient_id, therapist_id, discipline_id, // ESTRUTURA ATUAL
      recurrence_type, day_of_week, scheduled_time,
      duration_minutes = 60, start_date, end_date,
      generate_weeks_ahead = 4, skip_holidays = false,
      created_by, notes
    } = templateData;

    // Validar se paciente, terapeuta e disciplina existem
    await this.validateRelationships(patient_id, therapist_id, discipline_id);

    const query = `
      INSERT INTO recurring_appointment_templates (
        patient_id, therapist_id, discipline_id,
        recurrence_type, day_of_week, scheduled_time, duration_minutes,
        start_date, end_date, generate_weeks_ahead, skip_holidays,
        created_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      patient_id, therapist_id, discipline_id,
      recurrence_type, day_of_week, scheduled_time, duration_minutes,
      start_date, end_date, generate_weeks_ahead, skip_holidays,
      created_by, notes
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // Buscar templates ativos por clínica (ADAPTADO)
  async getActiveTemplates(clinicId, filters = {}) {
    let query = `
      SELECT
        rat.*,
        p.name as patient_name,
        u.full_name as therapist_name,
        d.name as discipline_name,
        u_creator.full_name as created_by_name,
        -- Estatísticas do template
        COUNT(ss.id) as total_appointments,
        COUNT(CASE WHEN ss.status = 'completed' THEN 1 END) as completed_appointments,
        -- Próximos agendamentos
        ARRAY_AGG(
          ss.scheduled_date ORDER BY ss.scheduled_date
        ) FILTER (WHERE ss.scheduled_date > CURRENT_DATE) as upcoming_dates
      FROM recurring_appointment_templates rat
      JOIN patients p ON rat.patient_id = p.id
      JOIN users u ON rat.therapist_id = u.id
      LEFT JOIN disciplines d ON rat.discipline_id = d.id
      JOIN users u_creator ON rat.created_by = u_creator.id
      LEFT JOIN scheduled_sessions ss ON rat.id = ss.recurring_template_id
      WHERE p.clinic_id = $1 AND rat.is_active = true
    `;

    const values = [clinicId];
    let paramCount = 1;

    // Adicionar filtros opcionais
    if (filters.patient_id) {
      paramCount++;
      query += ` AND rat.patient_id = $${paramCount}`;
      values.push(filters.patient_id);
    }

    if (filters.therapist_id) {
      paramCount++;
      query += ` AND rat.therapist_id = $${paramCount}`;
      values.push(filters.therapist_id);
    }

    query += `
      GROUP BY rat.id, p.name, u.full_name, d.name, u_creator.full_name
      ORDER BY rat.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows;
  }

  // Gerar agendamentos usando função SQL (ADAPTADO)
  async generateAppointments(templateId, weeksAhead = null) {
    const query = `SELECT * FROM generate_recurring_appointments($1, $2)`;
    const { rows } = await pool.query(query, [templateId, weeksAhead]);
    return rows;
  }

  // Outros métodos adaptados...
  async updateTemplate(templateId, updates, clinicId) { /* ADAPTADO */ }
  async pauseTemplate(templateId, reason, userId, pauseUntil) { /* NOVO */ }
  async deactivateTemplate(templateId, reason, userId) { /* ADAPTADO */ }
  async getTemplateAppointments(templateId, options = {}) { /* ADAPTADO */ }
  async checkConflicts(templateData) { /* ADAPTADO */ }
}
```

#### **Lógica de Geração**
```javascript
async generateAppointments(templateId, weeksAhead = 4) {
  const template = await this.getTemplateById(templateId);
  const appointments = [];

  for (let week = 0; week < weeksAhead; week++) {
    const appointmentDate = calculateNextDate(template, week);

    // Verificar se já existe
    const exists = await this.appointmentExists(templateId, appointmentDate);
    if (!exists) {
      // Verificar conflitos
      const hasConflict = await this.checkTimeConflict(
        template.therapist_id,
        appointmentDate,
        template.scheduled_time
      );

      if (!hasConflict) {
        const appointment = await this.createSingleAppointment({
          ...template,
          scheduled_date: appointmentDate,
          recurring_template_id: templateId,
          is_auto_generated: true
        });
        appointments.push(appointment);
      }
    }
  }

  return appointments;
}
```

### **3.2 Controller: `recurringAppointmentController.js`**

#### **Endpoints Principais**
```javascript
// POST /api/admin/recurring-appointments
async createRecurringAppointment(req, res) { ... }

// GET /api/admin/recurring-appointments
async getRecurringAppointments(req, res) { ... }

// PUT /api/admin/recurring-appointments/:id
async updateRecurringAppointment(req, res) { ... }

// DELETE /api/admin/recurring-appointments/:id
async deleteRecurringAppointment(req, res) { ... }

// POST /api/admin/recurring-appointments/:id/generate
async generateMoreAppointments(req, res) { ... }

// PUT /api/admin/recurring-appointments/:id/pause
async pauseRecurringAppointment(req, res) { ... }
```

### **3.3 Rotas: `recurringAppointmentRoutes.js`**

```javascript
// Validações específicas
const recurringAppointmentValidation = [
  body('patient_id').isInt().withMessage('ID do paciente inválido'),
  body('therapist_id').isInt().withMessage('ID do terapeuta inválido'),
  body('recurrence_type').isIn(['weekly', 'biweekly', 'monthly']),
  body('day_of_week').isInt({ min: 0, max: 6 }),
  body('scheduled_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('start_date').isISO8601().withMessage('Data de início inválida'),
  // ... outras validações
];
```

### **3.4 Integração com `scheduledSessionModel.js`**

#### **Modificações Necessárias**
```javascript
// Adicionar método para buscar por template
async getByRecurringTemplate(templateId, options = {}) { ... }

// Modificar método de criação para suportar templates
async create(sessionData) {
  // Verificar se é parte de série recorrente
  if (sessionData.recurring_template_id) {
    sessionData.is_auto_generated = true;
  }
  // ... resto da lógica
}

// Método para excluir série completa
async deleteRecurringSeries(templateId, deleteType = 'future') { ... }
```

---

## 🔄 **FASE 4: AUTOMAÇÃO E JOBS**

**Duração Estimada**: 2-3 horas

### **4.1 Job: `recurringAppointmentsJob.js`**

#### **Funcionalidades**
```javascript
// Gerar novos agendamentos automaticamente
async generateUpcomingAppointments() {
  const activeTemplates = await RecurringAppointmentModel.getActiveTemplates();

  for (const template of activeTemplates) {
    const futureCount = await countFutureAppointments(template.id);

    // Se tem menos de 2 semanas futuras, gerar mais
    if (futureCount < 2) {
      await RecurringAppointmentModel.generateAppointments(
        template.id,
        template.generate_weeks_ahead
      );
    }
  }
}

// Limpar agendamentos antigos não realizados
async cleanupOldAppointments() { ... }

// Verificar templates expirados
async deactivateExpiredTemplates() { ... }
```

### **4.2 Configuração do Cron**

```javascript
// No server.js
const cron = require('node-cron');

// Executar todo dia às 02:00
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Executando geração de agendamentos recorrentes...');
  await recurringAppointmentsJob.generateUpcomingAppointments();
  await recurringAppointmentsJob.cleanupOldAppointments();
  await recurringAppointmentsJob.deactivateExpiredTemplates();
});
```

---

## 🎯 **FASE 5: FUNCIONALIDADES AVANÇADAS**

**Duração Estimada**: 3-4 horas

### **5.1 Gestão de Exceções**

#### **Casos de Uso**
1. **Pular Próximo Agendamento**: Cancelar uma única ocorrência
2. **Alterar Horário Específico**: Mudar hora de uma sessão sem afetar série
3. **Pausar Série**: Suspender temporariamente
4. **Terminar Série**: Finalizar antes do prazo

#### **Implementação**
```javascript
// Método para pular próxima ocorrência
async skipNextOccurrence(templateId, skipDate, reason) {
  await ScheduledSessionModel.update(appointmentId, {
    status: 'cancelled',
    notes: `Pulado da série recorrente: ${reason}`
  });
}

// Método para alterar horário específico
async modifySingleOccurrence(appointmentId, changes) {
  await ScheduledSessionModel.update(appointmentId, {
    ...changes,
    recurring_template_id: null, // Desconectar da série
    is_auto_generated: false
  });
}
```

### **5.2 Relatórios e Analytics**

#### **Métricas Úteis**
- Templates mais utilizados
- Taxa de comparecimento por série
- Conflitos de horário detectados
- Eficiência da automação

### **5.3 Notificações**

#### **Alertas Automáticos**
- ⚠️ Template com muitos conflitos
- ⚠️ Série com baixa taxa de comparecimento
- ⚠️ Template prestes a expirar
- ⚠️ Falha na geração automática

---

## 🧪 **FASE 6: TESTES E VALIDAÇÃO**

**Duração Estimada**: 2-3 horas

### **6.1 Testes Unitários**

```javascript
describe('RecurringAppointmentModel', () => {
  test('deve gerar agendamentos semanais corretamente', async () => { ... });
  test('deve detectar conflitos de horário', async () => { ... });
  test('deve respeitar data de término', async () => { ... });
  test('deve pausar e reativar templates', async () => { ... });
});
```

### **6.2 Testes de Integração**

```javascript
describe('Fluxo Completo de Recorrência', () => {
  test('criar template -> gerar agendamentos -> executar job', async () => { ... });
  test('modificar série -> verificar agendamentos futuros', async () => { ... });
});
```

### **6.3 Cenários de Teste**

1. **Cenário Básico**: Segunda às 09h por 8 semanas
2. **Cenário com Término**: Biweekly até data específica
3. **Cenário com Conflitos**: Template que gera conflitos
4. **Cenário de Exceção**: Pular feriados/férias
5. **Cenário de Performance**: 100+ templates ativos

---

## 📊 **MÉTRICAS DE SUCESSO**

### **KPIs para Medir Impacto**

1. **Redução de Trabalho Manual**
   - Tempo gasto criando agendamentos (antes vs depois)
   - Número de cliques para criar série vs individual

2. **Qualidade dos Agendamentos**
   - Taxa de conflitos detectados
   - Precisão da geração automática

3. **Satisfação do Usuário**
   - Facilidade de uso (1-10)
   - Frequência de uso da funcionalidade

4. **Performance Técnica**
   - Tempo de geração de agendamentos
   - Uso de recursos do servidor

---

## 🚨 **CONSIDERAÇÕES IMPORTANTES**

### **Limitações Técnicas**
- ⚠️ Templates só geram agendamentos futuros
- ⚠️ Alterações em template não afetam agendamentos já criados
- ⚠️ Feriados devem ser tratados manualmente

### **Casos Extremos**
- 📅 Mudança de horário de verão
- 📅 Meses com dias diferentes (28, 29, 30, 31)
- 📅 Templates com mais de 1 ano de duração

### **Segurança**
- 🔒 Apenas admins podem criar templates
- 🔒 Log de todas as operações
- 🔒 Validação rigorosa de conflitos

---

## 🎯 **CRONOGRAMA SUGERIDO**

| Fase | Duração | Dependências | Entregável |
|------|---------|--------------|------------|
| 1 | 2-3h | - | Estrutura de BD |
| 2 | 4-5h | Fase 1 | Interface completa |
| 3 | 5-6h | Fase 1,2 | Backend funcional |
| 4 | 2-3h | Fase 3 | Jobs automáticos |
| 5 | 3-4h | Fase 3 | Funcionalidades avançadas |
| 6 | 2-3h | Todas | Testes e validação |

**Total**: 18-24 horas

---

## 📚 **RECURSOS ADICIONAIS**

### **Bibliotecas Úteis**
- `node-cron`: Para jobs automáticos
- `date-fns`: Para cálculos de data
- `moment-timezone`: Para fusos horários

### **Referências**
- [RFC 5545 - iCalendar](https://tools.ietf.org/html/rfc5545) (padrão de recorrência)
- [Google Calendar API](https://developers.google.com/calendar) (inspiração de UX)

---

## 📝 **PRÓXIMOS PASSOS**

1. ✅ **Aprovação da Arquitetura**: Revisar e aprovar esta especificação
2. 🛠️ **Setup de Desenvolvimento**: Preparar branch e ambiente
3. 📊 **Criação de Migrations**: Implementar estrutura de BD
4. 🎨 **Prototipação de UI**: Criar wireframes das telas
5. ⚙️ **Desenvolvimento Backend**: Implementar lógica core
6. 🖥️ **Desenvolvimento Frontend**: Criar interfaces
7. 🔄 **Integração e Testes**: Validar fluxo completo
8. 📋 **Documentação**: Atualizar manuais de usuário

---

**Preparado por**: Claude Code
**Revisão**: v1.0 - Dezembro 2025
**Status**: 📋 Aguardando Aprovação para Implementação