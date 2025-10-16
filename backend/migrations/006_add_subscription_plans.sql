-- Migration 007: Sistema de Planos de Assinatura e Trial
-- Data: 2025-01
-- Descrição: Adiciona suporte para múltiplos planos (pro/scheduling) e sistema de trial
-- Compatibilidade: Totalmente retrocompatível - todas clínicas existentes ficam como 'pro'

-- ========================================
-- 1. ADICIONAR COLUNAS DE ASSINATURA
-- ========================================

-- Adicionar coluna de plano na tabela clinics
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'pro'
CHECK (subscription_plan IN ('pro', 'scheduling'));

-- Adicionar colunas de trial
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS trial_pro_enabled BOOLEAN DEFAULT false;

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS trial_pro_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS trial_pro_activated_by INTEGER REFERENCES users(id);

ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS trial_pro_activated_at TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN clinics.subscription_plan IS 'Plano de assinatura da clínica: pro (completo) ou scheduling (apenas agenda)';
COMMENT ON COLUMN clinics.trial_pro_enabled IS 'Indica se o trial do plano Pro está ativo';
COMMENT ON COLUMN clinics.trial_pro_expires_at IS 'Data de expiração do trial Pro';
COMMENT ON COLUMN clinics.trial_pro_activated_by IS 'ID do super admin que ativou o trial';
COMMENT ON COLUMN clinics.trial_pro_activated_at IS 'Data/hora de ativação do trial';

-- ========================================
-- 2. TABELA DE PREÇOS DOS PLANOS
-- ========================================

CREATE TABLE IF NOT EXISTS subscription_plan_prices (
  plan_name VARCHAR(20) PRIMARY KEY,
  price_per_patient DECIMAL(10,2) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  features JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir planos iniciais
INSERT INTO subscription_plan_prices (plan_name, price_per_patient, display_name, features, active)
VALUES
  ('pro', 35.00, 'ABAplay Pro', '{"programs": true, "reports": true, "analytics": true, "chat": true, "scheduling": true}'::jsonb, true),
  ('scheduling', 10.00, 'ABAplay Agenda', '{"scheduling": true, "basic_reports": true}'::jsonb, true)
ON CONFLICT (plan_name) DO NOTHING;

-- Comentários
COMMENT ON TABLE subscription_plan_prices IS 'Tabela de preços e recursos dos planos de assinatura';
COMMENT ON COLUMN subscription_plan_prices.features IS 'JSON com features disponíveis no plano';

-- ========================================
-- 3. TABELA DE HISTÓRICO DE TRIALS
-- ========================================

CREATE TABLE IF NOT EXISTS trial_history (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  activated_by INTEGER NOT NULL REFERENCES users(id),
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),
  converted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_trial_history_clinic ON trial_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_trial_history_status ON trial_history(status);
CREATE INDEX IF NOT EXISTS idx_trial_history_expires ON trial_history(expires_at);

-- Comentários
COMMENT ON TABLE trial_history IS 'Histórico completo de ativações de trial';
COMMENT ON COLUMN trial_history.status IS 'Status do trial: active, expired, converted (virou pro), cancelled';

-- ========================================
-- 4. TABELA DE ANALYTICS DE ASSINATURA
-- ========================================

CREATE TABLE IF NOT EXISTS subscription_analytics (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_name VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscription_analytics_clinic ON subscription_analytics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_subscription_analytics_event ON subscription_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_analytics_created ON subscription_analytics(created_at);

-- Comentários
COMMENT ON TABLE subscription_analytics IS 'Registros de eventos relacionados a assinaturas para analytics';
COMMENT ON COLUMN subscription_analytics.event_type IS 'Tipo: plan_changed, trial_activated, trial_expired, trial_converted, feature_blocked';

-- ========================================
-- 5. FUNÇÃO: ATIVAR TRIAL PRO
-- ========================================

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
    -- Verificar se clínica existe
    SELECT subscription_plan, trial_pro_enabled
    INTO v_current_plan, v_trial_active
    FROM clinics
    WHERE id = p_clinic_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Clínica não encontrada', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Verificar se já tem trial ativo
    IF v_trial_active THEN
        RETURN QUERY SELECT false, 'Trial já está ativo para esta clínica', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Calcular data de expiração
    v_expires_at := CURRENT_TIMESTAMP + (p_duration_days || ' days')::INTERVAL;

    -- Ativar trial
    UPDATE clinics
    SET
        trial_pro_enabled = true,
        trial_pro_expires_at = v_expires_at,
        trial_pro_activated_by = p_activated_by,
        trial_pro_activated_at = CURRENT_TIMESTAMP
    WHERE id = p_clinic_id;

    -- Registrar no histórico
    INSERT INTO trial_history (clinic_id, activated_by, expires_at, duration_days, status)
    VALUES (p_clinic_id, p_activated_by, v_expires_at, p_duration_days, 'active');

    -- Registrar analytics
    INSERT INTO subscription_analytics (clinic_id, plan_name, event_type, event_data)
    VALUES (
        p_clinic_id,
        v_current_plan,
        'trial_activated',
        jsonb_build_object(
            'duration_days', p_duration_days,
            'activated_by', p_activated_by,
            'expires_at', v_expires_at
        )
    );

    RETURN QUERY SELECT true, 'Trial ativado com sucesso', v_expires_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_trial_pro IS 'Ativa trial do plano Pro para uma clínica';

-- ========================================
-- 6. FUNÇÃO: CONVERTER TRIAL PARA PRO
-- ========================================

CREATE OR REPLACE FUNCTION convert_trial_to_pro(p_clinic_id INTEGER)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_trial_active BOOLEAN;
BEGIN
    -- Verificar se tem trial ativo
    SELECT trial_pro_enabled INTO v_trial_active
    FROM clinics
    WHERE id = p_clinic_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Clínica não encontrada';
        RETURN;
    END IF;

    IF NOT v_trial_active THEN
        RETURN QUERY SELECT false, 'Clínica não possui trial ativo';
        RETURN;
    END IF;

    -- Converter para Pro
    UPDATE clinics
    SET
        subscription_plan = 'pro',
        trial_pro_enabled = false,
        trial_pro_expires_at = NULL
    WHERE id = p_clinic_id;

    -- Atualizar histórico
    UPDATE trial_history
    SET
        status = 'converted',
        converted_at = CURRENT_TIMESTAMP
    WHERE clinic_id = p_clinic_id
      AND status = 'active';

    -- Registrar analytics
    INSERT INTO subscription_analytics (clinic_id, plan_name, event_type, event_data)
    VALUES (
        p_clinic_id,
        'pro',
        'trial_converted',
        jsonb_build_object('converted_at', CURRENT_TIMESTAMP)
    );

    RETURN QUERY SELECT true, 'Trial convertido para plano Pro com sucesso';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION convert_trial_to_pro IS 'Converte trial ativo em plano Pro definitivo';

-- ========================================
-- 7. FUNÇÃO: EXPIRAR TRIALS
-- ========================================

CREATE OR REPLACE FUNCTION expire_trials()
RETURNS TABLE(
    expired_count INTEGER
) AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Desativar trials expirados
    UPDATE clinics
    SET
        trial_pro_enabled = false
    WHERE trial_pro_enabled = true
      AND trial_pro_expires_at <= CURRENT_TIMESTAMP
    RETURNING * INTO v_count;

    -- Atualizar histórico
    UPDATE trial_history
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at <= CURRENT_TIMESTAMP;

    -- Registrar analytics para cada trial expirado
    INSERT INTO subscription_analytics (clinic_id, plan_name, event_type, event_data)
    SELECT
        c.id,
        c.subscription_plan,
        'trial_expired',
        jsonb_build_object('expired_at', CURRENT_TIMESTAMP)
    FROM clinics c
    WHERE c.trial_pro_enabled = false
      AND c.trial_pro_expires_at <= CURRENT_TIMESTAMP
      AND c.trial_pro_expires_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour';

    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_trials IS 'Expira trials que atingiram data de expiração (executado por cron job)';

-- ========================================
-- 8. VIEW: DETALHES DE ASSINATURA
-- ========================================

CREATE OR REPLACE VIEW v_clinic_subscription_details AS
SELECT
    c.id as clinic_id,
    c.name as clinic_name,
    c.subscription_plan,
    c.trial_pro_enabled,
    c.trial_pro_expires_at,
    c.trial_pro_activated_at,
    CASE
        WHEN c.trial_pro_enabled AND c.trial_pro_expires_at > CURRENT_TIMESTAMP THEN true
        ELSE false
    END as has_active_trial,
    CASE
        WHEN c.trial_pro_enabled THEN 'pro'
        ELSE c.subscription_plan
    END as effective_plan,
    p.price_per_patient,
    p.display_name as plan_display_name,
    p.features as plan_features,
    COUNT(DISTINCT pat.id) as total_patients,
    CASE
        WHEN c.trial_pro_enabled THEN 0
        ELSE COUNT(DISTINCT pat.id) * p.price_per_patient
    END as monthly_revenue,
    u.full_name as trial_activated_by_name
FROM clinics c
LEFT JOIN subscription_plan_prices p ON p.plan_name =
    CASE
        WHEN c.trial_pro_enabled THEN 'pro'
        ELSE c.subscription_plan
    END
LEFT JOIN patients pat ON pat.clinic_id = c.id
LEFT JOIN users u ON u.id = c.trial_pro_activated_by
GROUP BY
    c.id, c.name, c.subscription_plan, c.trial_pro_enabled,
    c.trial_pro_expires_at, c.trial_pro_activated_at,
    p.price_per_patient, p.display_name, p.features, u.name;

COMMENT ON VIEW v_clinic_subscription_details IS 'View consolidada com detalhes de assinatura, trial e faturamento';

-- ========================================
-- 9. ÍNDICES DE PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_clinics_subscription_plan ON clinics(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_clinics_trial_enabled ON clinics(trial_pro_enabled);
CREATE INDEX IF NOT EXISTS idx_clinics_trial_expires ON clinics(trial_pro_expires_at);

-- ========================================
-- 10. GARANTIR COMPATIBILIDADE
-- ========================================

-- Garantir que todas clínicas existentes fiquem como 'pro' (já feito pelo DEFAULT)
UPDATE clinics
SET subscription_plan = 'pro'
WHERE subscription_plan IS NULL;

-- ========================================
-- MIGRATION COMPLETA
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 007 executada com sucesso!';
    RAISE NOTICE '📊 Sistema de assinaturas criado (pro/scheduling)';
    RAISE NOTICE '🎁 Sistema de trial implementado';
    RAISE NOTICE '📈 Tabelas de analytics criadas';
    RAISE NOTICE '🔄 Todas clínicas existentes configuradas como PRO';
END $$;
