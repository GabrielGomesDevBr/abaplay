# 🎯 Guia Completo de Implementação: Sistema de Módulos ABAplay

> **Versão Agendamento vs Versão Pro + Sistema de Trial**
> Transformando o ABAplay em uma solução modular com dois planos de assinatura e período de testes

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Análise de Viabilidade](#análise-de-viabilidade)
3. [Arquitetura da Solução](#arquitetura-da-solução)
4. [Fase 1: Banco de Dados](#fase-1-banco-de-dados)
5. [Fase 2: Backend](#fase-2-backend)
6. [Fase 3: Frontend](#fase-3-frontend)
7. [Fase 4: Analytics e Melhorias](#fase-4-analytics-e-melhorias)
8. [Fase 5: Sistema de Trial Pro](#fase-5-sistema-de-trial-pro)
9. [Testes e Validação](#testes-e-validação)
10. [Deploy e Rollback](#deploy-e-rollback)
11. [Checklist Completo](#checklist-completo)

---

## 🎯 Visão Geral

### **Objetivo**
Criar dois planos de assinatura distintos mantendo a mesma base de código, com sistema de trial para conversão:

#### **📅 Plano Agendamento (Básico)**
- **Preço**: R$ 10,00 por paciente cadastrado
- **Target**: Clínicas pequenas que precisam apenas de gestão de agendamentos
- **Estratégia**: Porta de entrada para upsell futuro

#### **🚀 Plano Pro (Completo)**
- **Preço**: R$ 35,00 por paciente cadastrado
- **Target**: Clínicas que precisam de gestão completa ABA
- **Trial**: 7-30 dias de teste (configurável pelo Super Admin)
- **Estratégia**: Produto premium atual

#### **🎁 Sistema de Trial Pro (NOVO)**
- **Ativação**: Via Super Admin (manual ou automática)
- **Duração**: Configurável (padrão 7 dias)
- **Conversão**: Alertas automáticos antes do vencimento
- **Finalização**: Downgrade automático ou upgrade para Pro

### **Diferenciais Técnicos Identificados**

✅ **Relatórios de Agendamento**: JÁ EXISTEM (`AppointmentReportGenerator.js`)
✅ **PWA Responsiva**: Aplicação já funciona como app nativo
✅ **Modelo de Cobrança**: Já é por paciente (R$ 34,90 atual)
✅ **Arquitetura Multi-tenant**: Isolamento por `clinic_id` já implementado
✅ **SuperAdmin Robusto**: 6 abas de gestão completa

---

## 📊 Análise de Viabilidade

### **Viabilidade: 95% ✅**

#### **Pontos Fortes**
1. ✅ Arquitetura multi-tenant já existe
2. ✅ Sistema de roles robusto (`is_admin`, `role`)
3. ✅ Componentes bem isolados
4. ✅ Migrations versionadas
5. ✅ PWA responsiva (não precisa adaptar mobile)

#### **Descobertas Importantes**
- ✅ Relatórios de agendamento **prontos** (PDF, estatísticas completas)
- ✅ Modelo de cobrança **já é por paciente** (só ajustar valores)
- ✅ Responsividade **já funciona** (18+ adaptações mobile/desktop)
- ✅ Não existe app nativo (é PWA instalável via navegador)

#### **Estimativa de Tempo**
- **Tempo Original Estimado**: 10-14 dias
- **Tempo Ajustado (após análise)**: **6-7 dias úteis**
- **Com Sistema de Trial**: **+1 dia** = **7-8 dias total**
- **Economia**: 50% 🎉

---

## 🏗️ Arquitetura da Solução

### **Divisão de Funcionalidades**

#### **📅 PLANO AGENDAMENTO**

**Admin da Clínica:**
- ✅ Cadastro de Terapeutas
- ✅ Cadastro Simplificado de Pacientes
- ✅ Sistema de Agendamento Completo (recorrente, calendário, conflitos)
- ✅ Relatórios de Agendamento (PDF, estatísticas)
- ✅ Notificações de Agendamento
- ✅ Gestão de Atribuições (terapeuta-paciente)

**Terapeuta:**
- ✅ Visualizar Agenda Pessoal
- ✅ Marcar Sessão Realizada (modal rápido com anotações)
- ✅ Adicionar Anotações Rápidas por Sessão
- ✅ Notificações de Agendamento
- ✅ Visualizar Lista de Pacientes

#### **🚀 PLANO PRO (TUDO ACIMA +)**

- ✅ Registro Detalhado de Sessão (níveis de prompting, trials)
- ✅ Biblioteca de Programas ABA
- ✅ Programas Customizados por Clínica
- ✅ Relatórios de Evolução com IA
- ✅ Gráficos de Progresso Detalhados
- ✅ Chat Terapeuta-Pais
- ✅ Discussões de Caso entre Profissionais
- ✅ Dashboard Completo de Progresso
- ✅ Gestão de Contatos e Colegas
- ✅ Prontuário Digital Expandido

#### **🎁 SISTEMA DE TRIAL PRO (NOVO)**

- ✅ Ativação manual pelo Super Admin
- ✅ Duração configurável (7, 14, 30 dias)
- ✅ Acesso total às features Pro durante trial
- ✅ Notificações automáticas (3 dias antes, 1 dia antes, dia do vencimento)
- ✅ Contagem regressiva visível para usuários em trial
- ✅ Downgrade automático ao fim do trial (se não converter)
- ✅ Analytics de conversão (quantos converteram após trial)

---

## 🗄️ Fase 1: Banco de Dados

### **Migration 007: Sistema de Módulos + Trial**

**Arquivo**: `backend/migrations/007_add_subscription_plans.sql`

```sql
-- ==========================================
-- Migration 007: Sistema de Módulos/Planos + Trial
-- Data: 2025-01
-- Compatibilidade: 100% retrocompatível
-- ==========================================

-- 1. Adicionar colunas de plano e trial na tabela clinics
ALTER TABLE clinics
ADD COLUMN subscription_plan VARCHAR(20) DEFAULT 'pro'
CHECK (subscription_plan IN ('pro', 'scheduling'));

ALTER TABLE clinics
ADD COLUMN trial_pro_enabled BOOLEAN DEFAULT false;

ALTER TABLE clinics
ADD COLUMN trial_pro_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE clinics
ADD COLUMN trial_pro_activated_by INTEGER REFERENCES users(id);

ALTER TABLE clinics
ADD COLUMN trial_pro_activated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE clinics
ADD COLUMN trial_converted BOOLEAN DEFAULT false;

ALTER TABLE clinics
ADD COLUMN trial_converted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN clinics.subscription_plan IS
  'Plano de assinatura: pro (R$35,00/paciente) ou scheduling (R$10,00/paciente)';

COMMENT ON COLUMN clinics.trial_pro_enabled IS
  'Indica se clínica está em período de trial do Plano Pro';

COMMENT ON COLUMN clinics.trial_pro_expires_at IS
  'Data/hora de expiração do trial Pro (null se não estiver em trial)';

COMMENT ON COLUMN clinics.trial_pro_activated_by IS
  'Super admin que ativou o trial';

COMMENT ON COLUMN clinics.trial_pro_activated_at IS
  'Data/hora de ativação do trial';

COMMENT ON COLUMN clinics.trial_converted IS
  'Indica se clínica converteu de trial para plano pago';

COMMENT ON COLUMN clinics.trial_converted_at IS
  'Data/hora da conversão (trial → pro)';

-- 2. Criar tabela de configuração de preços
CREATE TABLE subscription_plan_prices (
  plan_name VARCHAR(20) PRIMARY KEY,
  price_per_patient DECIMAL(10,2) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  features JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE subscription_plan_prices IS
  'Configuração de preços e features dos planos (centralizados no banco)';

-- 3. Inserir preços e configurações
INSERT INTO subscription_plan_prices
  (plan_name, price_per_patient, display_name, description, features)
VALUES
  (
    'pro',
    35.00,
    'ABAplay Pro',
    'Plano completo com todas as funcionalidades',
    '{
      "scheduling": true,
      "session_recording": true,
      "programs": true,
      "custom_programs": true,
      "reports": true,
      "evolution_reports": true,
      "chats": true,
      "case_discussions": true,
      "dashboard": true,
      "contacts": true
    }'::jsonb
  ),
  (
    'scheduling',
    10.00,
    'ABAplay Agenda',
    'Plano essencial focado em agendamentos',
    '{
      "scheduling": true,
      "basic_notes": true,
      "patients": true,
      "appointments_report": true,
      "notifications": true,
      "quick_session_completion": true
    }'::jsonb
  );

-- 4. Criar tabela de analytics de uso por plano
CREATE TABLE subscription_usage_analytics (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subscription_plan VARCHAR(20),
  feature_attempted VARCHAR(100) NOT NULL,
  access_granted BOOLEAN NOT NULL,
  is_trial BOOLEAN DEFAULT false,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET
);

COMMENT ON TABLE subscription_usage_analytics IS
  'Analytics de tentativas de acesso a features por plano (para identificar oportunidades de upgrade)';

-- 5. Criar tabela de histórico de trials
CREATE TABLE trial_history (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
  activated_by INTEGER REFERENCES users(id),
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by INTEGER REFERENCES users(id),
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE trial_history IS
  'Histórico completo de trials Pro ativados (para analytics de conversão)';

CREATE INDEX idx_trial_history_clinic ON trial_history(clinic_id);
CREATE INDEX idx_trial_history_dates ON trial_history(activated_at, expires_at);
CREATE INDEX idx_trial_history_converted ON trial_history(converted);

-- 6. Índices para performance
CREATE INDEX idx_clinics_subscription_plan ON clinics(subscription_plan);
CREATE INDEX idx_clinics_trial_enabled ON clinics(trial_pro_enabled) WHERE trial_pro_enabled = true;
CREATE INDEX idx_clinics_trial_expires ON clinics(trial_pro_expires_at) WHERE trial_pro_enabled = true;
CREATE INDEX idx_plan_prices_active ON subscription_plan_prices(active) WHERE active = true;
CREATE INDEX idx_analytics_clinic_plan ON subscription_usage_analytics(clinic_id, subscription_plan);
CREATE INDEX idx_analytics_feature ON subscription_usage_analytics(feature_attempted);
CREATE INDEX idx_analytics_date ON subscription_usage_analytics(attempted_at);
CREATE INDEX idx_analytics_blocked ON subscription_usage_analytics(access_granted) WHERE access_granted = false;
CREATE INDEX idx_analytics_trial ON subscription_usage_analytics(is_trial) WHERE is_trial = true;

-- 7. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_subscription_plan_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plan_prices_updated_at
    BEFORE UPDATE ON subscription_plan_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plan_prices_updated_at();

-- 8. View helper para consultas rápidas (ATUALIZADA com trial)
CREATE VIEW v_clinic_subscription_details AS
SELECT
    c.id as clinic_id,
    c.name as clinic_name,
    c.subscription_plan,
    c.status as clinic_status,
    c.max_patients,
    c.trial_pro_enabled,
    c.trial_pro_expires_at,
    c.trial_converted,
    -- Calcular dias restantes do trial
    CASE
        WHEN c.trial_pro_enabled = true AND c.trial_pro_expires_at > NOW() THEN
            EXTRACT(DAY FROM (c.trial_pro_expires_at - NOW()))::INTEGER
        ELSE 0
    END as trial_days_remaining,
    -- Status efetivo (considera trial)
    CASE
        WHEN c.trial_pro_enabled = true AND c.trial_pro_expires_at > NOW() THEN 'trial_pro'
        ELSE c.subscription_plan
    END as effective_plan,
    COALESCE(
        (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id),
        0
    ) as current_patients,
    spp.price_per_patient,
    spp.display_name as plan_display_name,
    spp.features as plan_features,
    (c.max_patients * spp.price_per_patient) as monthly_revenue,
    ROUND(
        COALESCE(
            (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id),
            0
        )::DECIMAL / NULLIF(c.max_patients, 0) * 100,
        2
    ) as utilization_rate
FROM clinics c
JOIN subscription_plan_prices spp ON c.subscription_plan = spp.plan_name
WHERE spp.active = true;

COMMENT ON VIEW v_clinic_subscription_details IS
  'View completa com detalhes de assinatura, preços, trial e utilização por clínica';

-- 9. Função para ativar trial Pro
CREATE OR REPLACE FUNCTION activate_trial_pro(
    p_clinic_id INTEGER,
    p_activated_by INTEGER,
    p_duration_days INTEGER DEFAULT 7
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_current_plan VARCHAR(20);
    v_trial_active BOOLEAN;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Verificar plano atual
    SELECT subscription_plan, trial_pro_enabled
    INTO v_current_plan, v_trial_active
    FROM clinics
    WHERE id = p_clinic_id;

    -- Validações
    IF v_current_plan IS NULL THEN
        RETURN QUERY SELECT false, 'Clínica não encontrada', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    IF v_current_plan = 'pro' THEN
        RETURN QUERY SELECT false, 'Clínica já está no Plano Pro', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    IF v_trial_active = true THEN
        RETURN QUERY SELECT false, 'Trial já está ativo para esta clínica', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Calcular data de expiração
    v_expires_at := NOW() + (p_duration_days || ' days')::INTERVAL;

    -- Ativar trial
    UPDATE clinics
    SET
        trial_pro_enabled = true,
        trial_pro_expires_at = v_expires_at,
        trial_pro_activated_by = p_activated_by,
        trial_pro_activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_clinic_id;

    -- Registrar no histórico
    INSERT INTO trial_history (
        clinic_id, activated_by, activated_at,
        expires_at, duration_days
    ) VALUES (
        p_clinic_id, p_activated_by, NOW(),
        v_expires_at, p_duration_days
    );

    RETURN QUERY SELECT
        true,
        'Trial Pro ativado com sucesso',
        v_expires_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_trial_pro IS
  'Ativa período de trial do Plano Pro para clínica no plano Agendamento';

-- 10. Função para converter trial em plano pago
CREATE OR REPLACE FUNCTION convert_trial_to_pro(
    p_clinic_id INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_trial_active BOOLEAN;
BEGIN
    -- Verificar se está em trial
    SELECT trial_pro_enabled INTO v_trial_active
    FROM clinics
    WHERE id = p_clinic_id;

    IF NOT v_trial_active THEN
        RETURN QUERY SELECT false, 'Clínica não está em período de trial';
        RETURN;
    END IF;

    -- Converter para Pro
    UPDATE clinics
    SET
        subscription_plan = 'pro',
        trial_pro_enabled = false,
        trial_pro_expires_at = NULL,
        trial_converted = true,
        trial_converted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_clinic_id;

    -- Atualizar histórico
    UPDATE trial_history
    SET
        converted = true,
        converted_at = NOW()
    WHERE clinic_id = p_clinic_id
      AND converted = false
    ORDER BY activated_at DESC
    LIMIT 1;

    RETURN QUERY SELECT true, 'Clínica convertida para Plano Pro com sucesso';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION convert_trial_to_pro IS
  'Converte clínica em trial para Plano Pro pago (conversão manual)';

-- 11. Função para expirar trials automaticamente (cron job)
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS TABLE(
    clinic_id INTEGER,
    clinic_name VARCHAR,
    expired_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH expired_trials AS (
        UPDATE clinics
        SET
            trial_pro_enabled = false,
            trial_pro_expires_at = NULL,
            subscription_plan = 'scheduling', -- Volta para plano básico
            updated_at = NOW()
        WHERE trial_pro_enabled = true
          AND trial_pro_expires_at <= NOW()
        RETURNING id, name, trial_pro_expires_at
    )
    SELECT * FROM expired_trials;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_trials IS
  'Expira trials vencidos e faz downgrade para plano Agendamento (executar diariamente via cron)';

-- 12. Função para registrar tentativa de acesso (analytics)
CREATE OR REPLACE FUNCTION log_feature_access(
    p_clinic_id INTEGER,
    p_user_id INTEGER,
    p_feature VARCHAR(100),
    p_granted BOOLEAN,
    p_is_trial BOOLEAN DEFAULT false,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_plan VARCHAR(20);
BEGIN
    -- Buscar plano da clínica
    SELECT subscription_plan INTO v_plan
    FROM clinics
    WHERE id = p_clinic_id;

    -- Registrar acesso
    INSERT INTO subscription_usage_analytics (
        clinic_id, user_id, subscription_plan,
        feature_attempted, access_granted, is_trial,
        user_agent, ip_address
    ) VALUES (
        p_clinic_id, p_user_id, v_plan,
        p_feature, p_granted, p_is_trial,
        p_user_agent, p_ip_address
    );
END;
$$ LANGUAGE plpgsql;

-- 13. Função para obter estatísticas de upgrade potencial (ATUALIZADA)
CREATE OR REPLACE FUNCTION get_upgrade_opportunities()
RETURNS TABLE(
    clinic_id INTEGER,
    clinic_name VARCHAR,
    blocked_attempts_count BIGINT,
    most_wanted_feature VARCHAR,
    feature_attempts BIGINT,
    potential_monthly_increase DECIMAL,
    in_trial BOOLEAN,
    trial_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH blocked_features AS (
        SELECT
            sua.clinic_id,
            sua.feature_attempted,
            COUNT(*) as attempts
        FROM subscription_usage_analytics sua
        WHERE sua.access_granted = false
          AND sua.attempted_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY sua.clinic_id, sua.feature_attempted
    ),
    clinic_stats AS (
        SELECT
            bf.clinic_id,
            COUNT(DISTINCT bf.feature_attempted) as blocked_attempts_count,
            (
                SELECT feature_attempted
                FROM blocked_features bf2
                WHERE bf2.clinic_id = bf.clinic_id
                ORDER BY attempts DESC
                LIMIT 1
            ) as most_wanted_feature,
            (
                SELECT MAX(attempts)
                FROM blocked_features bf2
                WHERE bf2.clinic_id = bf.clinic_id
            ) as feature_attempts
        FROM blocked_features bf
        GROUP BY bf.clinic_id
    )
    SELECT
        cs.clinic_id,
        c.name as clinic_name,
        cs.blocked_attempts_count,
        cs.most_wanted_feature,
        cs.feature_attempts,
        (
            c.max_patients * (
                (SELECT price_per_patient FROM subscription_plan_prices WHERE plan_name = 'pro') -
                (SELECT price_per_patient FROM subscription_plan_prices WHERE plan_name = 'scheduling')
            )
        ) as potential_monthly_increase,
        c.trial_pro_enabled as in_trial,
        c.trial_pro_expires_at
    FROM clinic_stats cs
    JOIN clinics c ON cs.clinic_id = c.id
    WHERE c.subscription_plan = 'scheduling'
    ORDER BY
        c.trial_pro_enabled DESC, -- Trials primeiro
        cs.blocked_attempts_count DESC,
        cs.feature_attempts DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_upgrade_opportunities IS
  'Identifica clínicas no plano básico com alto interesse em features premium (oportunidade de upsell)';

-- 14. Função para obter analytics de conversão de trial
CREATE OR REPLACE FUNCTION get_trial_conversion_stats()
RETURNS TABLE(
    total_trials INTEGER,
    active_trials INTEGER,
    expired_trials INTEGER,
    converted_trials INTEGER,
    conversion_rate DECIMAL,
    avg_days_to_convert DECIMAL,
    total_converted_revenue DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_trials,
        COUNT(CASE WHEN th.expires_at > NOW() AND NOT th.cancelled THEN 1 END)::INTEGER as active_trials,
        COUNT(CASE WHEN th.expires_at <= NOW() AND NOT th.converted THEN 1 END)::INTEGER as expired_trials,
        COUNT(CASE WHEN th.converted THEN 1 END)::INTEGER as converted_trials,
        ROUND(
            COUNT(CASE WHEN th.converted THEN 1 END)::DECIMAL /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) as conversion_rate,
        ROUND(
            AVG(CASE WHEN th.converted THEN EXTRACT(DAY FROM (th.converted_at - th.activated_at)) END),
            2
        ) as avg_days_to_convert,
        COALESCE(
            (
                SELECT SUM(c.max_patients * spp.price_per_patient)
                FROM trial_history th2
                JOIN clinics c ON th2.clinic_id = c.id
                JOIN subscription_plan_prices spp ON spp.plan_name = 'pro'
                WHERE th2.converted = true
            ),
            0
        ) as total_converted_revenue
    FROM trial_history th;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_trial_conversion_stats IS
  'Retorna estatísticas de conversão de trials Pro (para dashboard SuperAdmin)';
```

### **Como Executar a Migration**

```bash
# Conectar no banco de produção (executa UMA VEZ - afeta todos os ambientes)
psql -h dpg-d07n3madbo4c73ehoiqg-a.oregon-postgres.render.com \
     -p 5432 \
     -U abaplay_postgres_db_user \
     -d abaplay_postgres_db \
     -f backend/migrations/007_add_subscription_plans.sql
```

### **Validação da Migration**

```sql
-- Verificar colunas adicionadas
\d clinics

-- Verificar tabelas criadas
\dt subscription_*
\dt trial_history

-- Testar view
SELECT * FROM v_clinic_subscription_details LIMIT 5;

-- Testar função de ativação de trial
SELECT * FROM activate_trial_pro(1, 1, 14); -- clinic_id=1, admin_id=1, 14 dias

-- Testar função de oportunidades
SELECT * FROM get_upgrade_opportunities();

-- Testar analytics de conversão
SELECT * FROM get_trial_conversion_stats();
```

---

## ⚙️ Fase 2: Backend

### **2.1. Middleware de Verificação de Plano (ATUALIZADO com Trial)**

**Arquivo**: `backend/src/middleware/subscriptionMiddleware.js`

```javascript
// backend/src/middleware/subscriptionMiddleware.js

const pool = require('../models/db');

/**
 * Middleware para verificar acesso baseado no plano de assinatura (incluindo trial)
 * @param {string} requiredPlan - 'pro' (full) ou qualquer plano
 * @param {string} featureName - Nome da feature para analytics
 */
const checkSubscriptionPlan = (requiredPlan = 'pro', featureName = 'unknown') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Buscar plano da clínica do usuário (incluindo info de trial)
      const { rows } = await pool.query(`
        SELECT
          c.id as clinic_id,
          c.subscription_plan,
          c.status as clinic_status,
          c.trial_pro_enabled,
          c.trial_pro_expires_at,
          -- Plano efetivo (considera trial ativo)
          CASE
            WHEN c.trial_pro_enabled = true AND c.trial_pro_expires_at > NOW() THEN 'pro'
            ELSE c.subscription_plan
          END as effective_plan,
          -- Dias restantes do trial
          CASE
            WHEN c.trial_pro_enabled = true AND c.trial_pro_expires_at > NOW() THEN
              EXTRACT(DAY FROM (c.trial_pro_expires_at - NOW()))::INTEGER
            ELSE 0
          END as trial_days_remaining
        FROM users u
        JOIN clinics c ON u.clinic_id = c.id
        WHERE u.id = $1
      `, [userId]);

      if (rows.length === 0) {
        return res.status(403).json({
          error: 'Clínica não encontrada'
        });
      }

      const {
        clinic_id,
        subscription_plan,
        clinic_status,
        trial_pro_enabled,
        trial_pro_expires_at,
        effective_plan,
        trial_days_remaining
      } = rows[0];

      // Verificar se clínica está ativa
      if (clinic_status !== 'active') {
        return res.status(403).json({
          error: 'Clínica suspensa ou inativa',
          clinic_status
        });
      }

      // Verificar acesso (considera trial como Pro)
      const hasAccess = effective_plan === 'pro' || requiredPlan !== 'pro';
      const isInTrial = trial_pro_enabled && new Date(trial_pro_expires_at) > new Date();

      // Registrar tentativa de acesso (analytics)
      await pool.query(`
        SELECT log_feature_access($1, $2, $3, $4, $5, $6, $7)
      `, [
        clinic_id,
        userId,
        featureName,
        hasAccess,
        isInTrial,
        req.headers['user-agent'],
        req.ip
      ]);

      // Bloquear acesso se necessário
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Esta funcionalidade está disponível apenas no Plano Pro',
          currentPlan: subscription_plan,
          requiredPlan: 'pro',
          feature: featureName,
          upgradeUrl: '/upgrade',
          upgradeMessage: 'Faça upgrade para o Plano Pro e desbloqueie todas as funcionalidades'
        });
      }

      // Anexar dados ao request para uso posterior
      req.clinic = {
        id: clinic_id,
        subscription_plan,
        effective_plan,
        status: clinic_status,
        is_trial: isInTrial,
        trial_days_remaining: isInTrial ? trial_days_remaining : 0,
        trial_expires_at: isInTrial ? trial_pro_expires_at : null
      };

      next();
    } catch (error) {
      console.error('Erro ao verificar plano de assinatura:', error);
      res.status(500).json({
        error: 'Erro ao verificar permissões de acesso'
      });
    }
  };
};

/**
 * Middleware simplificado para verificar apenas plano PRO
 */
const requireProPlan = (featureName) => {
  return checkSubscriptionPlan('pro', featureName);
};

module.exports = {
  checkSubscriptionPlan,
  requireProPlan
};
```

### **2.2. Controller de Trial**

**Arquivo**: `backend/src/controllers/trialController.js` (NOVO)

```javascript
// backend/src/controllers/trialController.js

const pool = require('../models/db');

const trialController = {
  /**
   * Ativar trial Pro para uma clínica
   */
  async activateTrial(req, res) {
    try {
      const { clinic_id, duration_days = 7 } = req.body;
      const activated_by = req.user.id;

      // Validações
      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      if (duration_days < 1 || duration_days > 90) {
        return res.status(400).json({ error: 'Duração deve ser entre 1 e 90 dias' });
      }

      // Ativar trial usando função do banco
      const { rows } = await pool.query(`
        SELECT * FROM activate_trial_pro($1, $2, $3)
      `, [clinic_id, activated_by, duration_days]);

      const result = rows[0];

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.status(200).json({
        success: true,
        message: result.message,
        trial: {
          clinic_id,
          expires_at: result.expires_at,
          duration_days
        }
      });
    } catch (error) {
      console.error('Erro ao ativar trial:', error);
      res.status(500).json({ error: 'Erro ao ativar trial' });
    }
  },

  /**
   * Converter trial em plano Pro pago
   */
  async convertTrial(req, res) {
    try {
      const { clinic_id } = req.body;

      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      const { rows } = await pool.query(`
        SELECT * FROM convert_trial_to_pro($1)
      `, [clinic_id]);

      const result = rows[0];

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Erro ao converter trial:', error);
      res.status(500).json({ error: 'Erro ao converter trial' });
    }
  },

  /**
   * Cancelar trial (volta para plano scheduling)
   */
  async cancelTrial(req, res) {
    try {
      const { clinic_id, cancellation_reason } = req.body;
      const cancelled_by = req.user.id;

      if (!clinic_id) {
        return res.status(400).json({ error: 'clinic_id é obrigatório' });
      }

      // Cancelar trial
      await pool.query(`
        UPDATE clinics
        SET
          trial_pro_enabled = false,
          trial_pro_expires_at = NULL,
          updated_at = NOW()
        WHERE id = $1
          AND trial_pro_enabled = true
      `, [clinic_id]);

      // Registrar no histórico
      await pool.query(`
        UPDATE trial_history
        SET
          cancelled = true,
          cancelled_at = NOW(),
          cancelled_by = $2,
          cancellation_reason = $3
        WHERE clinic_id = $1
          AND cancelled = false
          AND converted = false
        ORDER BY activated_at DESC
        LIMIT 1
      `, [clinic_id, cancelled_by, cancellation_reason]);

      res.status(200).json({
        success: true,
        message: 'Trial cancelado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao cancelar trial:', error);
      res.status(500).json({ error: 'Erro ao cancelar trial' });
    }
  },

  /**
   * Obter lista de clínicas em trial
   */
  async getActiveTrials(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT
          c.id,
          c.name,
          c.trial_pro_activated_at,
          c.trial_pro_expires_at,
          EXTRACT(DAY FROM (c.trial_pro_expires_at - NOW()))::INTEGER as days_remaining,
          u.full_name as activated_by_name
        FROM clinics c
        LEFT JOIN users u ON c.trial_pro_activated_by = u.id
        WHERE c.trial_pro_enabled = true
          AND c.trial_pro_expires_at > NOW()
        ORDER BY c.trial_pro_expires_at ASC
      `);

      res.json({ trials: rows });
    } catch (error) {
      console.error('Erro ao buscar trials:', error);
      res.status(500).json({ error: 'Erro ao buscar trials' });
    }
  },

  /**
   * Obter estatísticas de conversão de trials
   */
  async getConversionStats(req, res) {
    try {
      const { rows } = await pool.query(`
        SELECT * FROM get_trial_conversion_stats()
      `);

      res.json({ stats: rows[0] });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }
};

module.exports = trialController;
```

**Adicionar rotas**:

**Arquivo**: `backend/src/routes/trialRoutes.js` (NOVO)

```javascript
// backend/src/routes/trialRoutes.js

const express = require('express');
const router = express.Router();
const trialController = require('../controllers/trialController');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifySuperAdmin } = require('../middleware/superAdminMiddleware');

// Todas as rotas de trial requerem super admin
router.post('/activate', verifyToken, verifySuperAdmin, trialController.activateTrial);
router.post('/convert', verifyToken, verifySuperAdmin, trialController.convertTrial);
router.post('/cancel', verifyToken, verifySuperAdmin, trialController.cancelTrial);
router.get('/active', verifyToken, verifySuperAdmin, trialController.getActiveTrials);
router.get('/stats', verifyToken, verifySuperAdmin, trialController.getConversionStats);

module.exports = router;
```

**Registrar no server.js**:

```javascript
// backend/src/server.js
const trialRoutes = require('./routes/trialRoutes');

app.use('/api/trial', trialRoutes);
```

### **2.3. Cron Job para Expirar Trials**

**Arquivo**: `backend/src/jobs/trialExpirationJob.js` (NOVO)

```javascript
// backend/src/jobs/trialExpirationJob.js

const cron = require('node-cron');
const pool = require('../models/db');

/**
 * Job para expirar trials vencidos
 * Executa diariamente às 3 AM
 */
const trialExpirationJob = () => {
  // Executa às 3 AM todos os dias
  cron.schedule('0 3 * * *', async () => {
    console.log('[TrialExpiration] Iniciando verificação de trials expirados...');

    try {
      const { rows } = await pool.query(`
        SELECT * FROM expire_trials()
      `);

      if (rows.length > 0) {
        console.log(`[TrialExpiration] ${rows.length} trial(s) expirado(s):`);
        rows.forEach(trial => {
          console.log(`  - Clínica: ${trial.clinic_name} (ID: ${trial.clinic_id})`);
        });

        // TODO: Enviar notificações por email (opcional)
      } else {
        console.log('[TrialExpiration] Nenhum trial expirado hoje.');
      }
    } catch (error) {
      console.error('[TrialExpiration] Erro ao expirar trials:', error);
    }
  });

  console.log('[TrialExpiration] Job agendado - executa diariamente às 3 AM');
};

module.exports = trialExpirationJob;
```

**Iniciar job no server.js**:

```javascript
// backend/src/server.js
const trialExpirationJob = require('./jobs/trialExpirationJob');

// Iniciar jobs
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_JOBS === 'true') {
  trialExpirationJob();
}
```

### **2.4. Atualizar authController (Retornar Info de Trial)**

**Arquivo**: `backend/src/controllers/authController.js`

```javascript
// backend/src/controllers/authController.js

async login(req, res) {
  try {
    // ... código existente ...

    // ✅ ATUALIZADO: Buscar plano de assinatura + trial
    const userWithPlan = await pool.query(`
      SELECT
        u.*,
        c.subscription_plan,
        c.status as clinic_status,
        c.trial_pro_enabled,
        c.trial_pro_expires_at,
        spp.display_name as plan_display_name,
        spp.features as plan_features,
        -- Plano efetivo (considera trial)
        CASE
          WHEN c.trial_pro_enabled = true AND c.trial_pro_expires_at > NOW() THEN 'pro'
          ELSE c.subscription_plan
        END as effective_plan,
        -- Dias restantes do trial
        CASE
          WHEN c.trial_pro_enabled = true AND c.trial_pro_expires_at > NOW() THEN
            EXTRACT(DAY FROM (c.trial_pro_expires_at - NOW()))::INTEGER
          ELSE 0
        END as trial_days_remaining
      FROM users u
      JOIN clinics c ON u.clinic_id = c.id
      LEFT JOIN subscription_plan_prices spp ON c.subscription_plan = spp.plan_name
      WHERE u.id = $1
    `, [user.id]);

    const userComplete = userWithPlan.rows[0];

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        clinic_id: user.clinic_id,
        is_admin: user.is_admin,
        role: user.role,
        subscription_plan: userComplete.subscription_plan,
        effective_plan: userComplete.effective_plan // ✅ NOVO
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_admin: user.is_admin,
        clinic_id: user.clinic_id,
        subscription_plan: userComplete.subscription_plan,
        effective_plan: userComplete.effective_plan, // ✅ NOVO
        plan_display_name: userComplete.plan_display_name,
        plan_features: userComplete.plan_features,
        clinic_status: userComplete.clinic_status,
        // ✅ NOVO: Informações de trial
        trial: {
          enabled: userComplete.trial_pro_enabled,
          expires_at: userComplete.trial_pro_expires_at,
          days_remaining: userComplete.trial_days_remaining
        }
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
}
```

---

## 🎨 Fase 3: Frontend

### **3.1. Atualizar AuthContext (com Trial)**

**Arquivo**: `frontend/src/context/AuthContext.js`

```javascript
// frontend/src/context/AuthContext.js

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState('pro');
  const [effectivePlan, setEffectivePlan] = useState('pro'); // ✅ NOVO
  const [planFeatures, setPlanFeatures] = useState({});
  const [trial, setTrial] = useState({ enabled: false, days_remaining: 0 }); // ✅ NOVO
  const [loading, setLoading] = useState(true);

  // ✅ ATUALIZADO: Verificar acesso considera trial
  const hasAccessToModule = useCallback((module) => {
    if (!planFeatures) return false;

    // Plano efetivo Pro (ou trial ativo) tem acesso a tudo
    if (effectivePlan === 'pro') return true;

    // Verificar se feature está nas features do plano
    return planFeatures[module] === true;
  }, [effectivePlan, planFeatures]);

  const login = async (credentials) => {
    try {
      const response = await loginApi(credentials);
      const { token, user: userData } = response.data;

      setUser(userData);
      setSubscriptionPlan(userData.subscription_plan || 'pro');
      setEffectivePlan(userData.effective_plan || userData.subscription_plan || 'pro'); // ✅ NOVO
      setPlanFeatures(userData.plan_features || {});
      setTrial(userData.trial || { enabled: false, days_remaining: 0 }); // ✅ NOVO

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('subscriptionPlan', userData.subscription_plan);
      localStorage.setItem('effectivePlan', userData.effective_plan); // ✅ NOVO

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao fazer login'
      };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      subscriptionPlan,
      effectivePlan, // ✅ NOVO
      planFeatures,
      trial, // ✅ NOVO
      hasAccessToModule,
      login,
      logout,
      syncProfile,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### **3.2. Componente de Banner de Trial**

**Arquivo**: `frontend/src/components/trial/TrialBanner.js` (NOVO)

```javascript
// frontend/src/components/trial/TrialBanner.js

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faRocket } from '@fortawesome/free-solid-svg-icons';

const TrialBanner = () => {
  const { trial, effectivePlan, subscriptionPlan } = useAuth();

  // Não mostrar se não estiver em trial
  if (!trial.enabled || effectivePlan !== 'pro' || subscriptionPlan === 'pro') {
    return null;
  }

  const daysRemaining = trial.days_remaining;
  const isExpiringSoon = daysRemaining <= 3;

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 py-2 px-4 text-white text-center text-sm
      ${isExpiringSoon ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}
    `}>
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-2">
        <FontAwesomeIcon icon={faClock} className="animate-pulse" />
        <span className="font-semibold">
          {daysRemaining === 0 ? (
            <>Seu trial Pro expira hoje!</>
          ) : daysRemaining === 1 ? (
            <>Seu trial Pro expira amanhã!</>
          ) : (
            <>Trial Pro: {daysRemaining} dias restantes</>
          )}
        </span>
        <button
          onClick={() => window.location.href = '/upgrade'}
          className="ml-4 bg-white text-blue-600 px-3 py-1 rounded-md font-bold hover:bg-gray-100 transition"
        >
          <FontAwesomeIcon icon={faRocket} className="mr-1" />
          Fazer Upgrade
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;
```

**Adicionar no MainLayout**:

```javascript
// frontend/src/components/layout/MainLayout.js

import TrialBanner from '../trial/TrialBanner';

const MainLayout = () => {
  return (
    <>
      <TrialBanner /> {/* ✅ NOVO */}
      <div className="flex h-screen">
        {/* ... resto do layout */}
      </div>
    </>
  );
};
```

---

## 📊 Fase 5: Sistema de Trial Pro (SuperAdmin)

### **5.1. Componente de Gestão de Trials**

**Arquivo**: `frontend/src/components/superAdmin/TrialManagement.js` (NOVO)

```javascript
// frontend/src/components/superAdmin/TrialManagement.js

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGift, faClock, faCheckCircle, faTimesCircle,
  faChartLine, faRocket
} from '@fortawesome/free-solid-svg-icons';
import {
  activateTrial,
  convertTrial,
  cancelTrial,
  getActiveTrials,
  getTrialConversionStats
} from '../../api/trialApi';

const TrialManagement = () => {
  const [activeTrials, setActiveTrials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);

  useEffect(() => {
    loadTrialData();
  }, []);

  const loadTrialData = async () => {
    try {
      const [trialsRes, statsRes] = await Promise.all([
        getActiveTrials(),
        getTrialConversionStats()
      ]);

      setActiveTrials(trialsRes.data.trials || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      console.error('Erro ao carregar dados de trial');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateTrial = async (clinicId, durationDays) => {
    try {
      await activateTrial({ clinic_id: clinicId, duration_days: durationDays });
      alert('Trial ativado com sucesso!');
      loadTrialData();
      setShowActivateModal(false);
    } catch (error) {
      alert('Erro ao ativar trial: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConvertTrial = async (clinicId) => {
    if (!confirm('Confirmar conversão para Plano Pro pago?')) return;

    try {
      await convertTrial({ clinic_id: clinicId });
      alert('Clínica convertida para Pro com sucesso!');
      loadTrialData();
    } catch (error) {
      alert('Erro ao converter trial');
    }
  };

  const handleCancelTrial = async (clinicId) => {
    const reason = prompt('Motivo do cancelamento:');
    if (!reason) return;

    try {
      await cancelTrial({ clinic_id: clinicId, cancellation_reason: reason });
      alert('Trial cancelado');
      loadTrialData();
    } catch (error) {
      alert('Erro ao cancelar trial');
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Trials Ativos"
          value={stats.active_trials || 0}
          icon={faClock}
          colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${stats.conversion_rate || 0}%`}
          icon={faChartLine}
          colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
        />
        <StatCard
          title="Trials Convertidos"
          value={stats.converted_trials || 0}
          icon={faCheckCircle}
          colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
        />
        <StatCard
          title="Receita de Conversões"
          value={`R$ ${parseFloat(stats.total_converted_revenue || 0).toFixed(2)}`}
          icon={faRocket}
          colorClass={{ bg: 'bg-green-100', text: 'text-green-600' }}
        />
      </div>

      {/* Tabela de Trials Ativos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center">
            <FontAwesomeIcon icon={faGift} className="mr-2 text-blue-500" />
            Trials Ativos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Clínica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ativado Por
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Início
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expira Em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Dias Restantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeTrials.map((trial) => {
                const daysRemaining = trial.days_remaining;
                const isExpiringSoon = daysRemaining <= 3;

                return (
                  <tr key={trial.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {trial.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trial.activated_by_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(trial.trial_pro_activated_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(trial.trial_pro_expires_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-bold
                        ${isExpiringSoon ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
                      `}>
                        {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleConvertTrial(trial.id)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        ✅ Converter
                      </button>
                      <button
                        onClick={() => handleCancelTrial(trial.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        ❌ Cancelar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeTrials.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum trial ativo no momento
            </div>
          )}
        </div>
      </div>

      {/* Modal de Ativação (simplificado - implementar completo) */}
      {showActivateModal && (
        <ActivateTrialModal
          onClose={() => setShowActivateModal(false)}
          onActivate={handleActivateTrial}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
    <div className="flex items-center space-x-3">
      <div className={`text-xl p-3 rounded-full ${colorClass.bg} ${colorClass.text}`}>
        <FontAwesomeIcon icon={icon} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${colorClass.text}`}>{value}</p>
      </div>
    </div>
  </div>
);

export default TrialManagement;
```

### **5.2. Adicionar Botão "Ativar Trial" na Lista de Clínicas**

**Arquivo**: `frontend/src/pages/SuperAdminPage.js`

```javascript
// SuperAdminPage.js - Na tabela de clínicas

// ADICIONAR coluna de ações
<td className="px-6 py-4 whitespace-nowrap text-sm">
  {clinic.subscription_plan === 'scheduling' && !clinic.trial_pro_enabled && (
    <button
      onClick={() => handleActivateTrial(clinic.id)}
      className="text-blue-600 hover:text-blue-800 font-medium"
    >
      🎁 Ativar Trial Pro
    </button>
  )}
  {clinic.trial_pro_enabled && (
    <span className="text-orange-600 font-medium">
      🔥 Em Trial ({clinic.trial_days_remaining}d)
    </span>
  )}
  {clinic.subscription_plan === 'pro' && !clinic.trial_pro_enabled && (
    <span className="text-green-600 font-medium">
      ✅ Plano Pro
    </span>
  )}
</td>
```

### **5.3. API de Trial (Frontend)**

**Arquivo**: `frontend/src/api/trialApi.js` (NOVO)

```javascript
// frontend/src/api/trialApi.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const activateTrial = (data) =>
  axios.post(`${API_URL}/trial/activate`, data, getAuthHeaders());

export const convertTrial = (data) =>
  axios.post(`${API_URL}/trial/convert`, data, getAuthHeaders());

export const cancelTrial = (data) =>
  axios.post(`${API_URL}/trial/cancel`, data, getAuthHeaders());

export const getActiveTrials = () =>
  axios.get(`${API_URL}/trial/active`, getAuthHeaders());

export const getTrialConversionStats = () =>
  axios.get(`${API_URL}/trial/stats`, getAuthHeaders());
```

---

## ✅ Checklist Completo de Implementação (ATUALIZADO)

### **Fase 1: Banco de Dados** ✅
- [ ] Criar `007_add_subscription_plans.sql` (com trial)
- [ ] Executar migration em produção
- [ ] Validar colunas de trial criadas
- [ ] Testar funções de trial (activate, convert, expire)
- [ ] Backup do banco antes da migration

### **Fase 2: Backend** ✅
- [ ] Atualizar `subscriptionMiddleware.js` (suporte a trial)
- [ ] Criar `trialController.js`
- [ ] Criar rotas `/api/trial/*`
- [ ] Atualizar `authController.js` (retornar info de trial)
- [ ] Criar `trialExpirationJob.js` (cron diário)
- [ ] Testar endpoints de trial

### **Fase 3: Frontend** ✅
- [ ] Atualizar `AuthContext.js` (effectivePlan, trial)
- [ ] Criar `TrialBanner.js` (contagem regressiva)
- [ ] Criar `trialApi.js`
- [ ] Adaptar `BottomNavigation` (usar effectivePlan)
- [ ] Testar banner de trial

### **Fase 5: Sistema de Trial (SuperAdmin)** ✅
- [ ] Criar `TrialManagement.js`
- [ ] Adicionar aba "Trials" no SuperAdmin
- [ ] Botão "Ativar Trial" na lista de clínicas
- [ ] Testar ativação de trial
- [ ] Testar conversão manual
- [ ] Testar expiração automática

### **Testes de Trial** ✅
- [ ] Ativar trial para clínica teste
- [ ] Verificar acesso a features Pro durante trial
- [ ] Verificar banner de contagem regressiva
- [ ] Testar conversão manual (trial → pro)
- [ ] Testar expiração automática (aguardar cron ou forçar)
- [ ] Verificar analytics de conversão

---

## 🎉 Conclusão

**Tempo estimado total: 7-8 dias úteis** 🚀

**Sistema de Trial adiciona**:
- ✅ Porta de entrada premium (testar antes de comprar)
- ✅ Conversão assistida (notificações, contagem regressiva)
- ✅ Analytics de conversão (otimizar duração do trial)
- ✅ Automação completa (ativação, expiração, downgrade)

**Última atualização**: Janeiro 2025
**Versão**: 1.1 (com Trial Pro)
