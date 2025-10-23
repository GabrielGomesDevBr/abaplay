-- Migration 014: Adicionar validação de disponibilidade do terapeuta
-- Função para verificar se um horário está dentro da disponibilidade configurada do terapeuta

-- Criar função para verificar disponibilidade do terapeuta
CREATE OR REPLACE FUNCTION check_therapist_availability(
    p_therapist_id INTEGER,
    p_scheduled_date DATE,
    p_scheduled_time TIME,
    p_duration_minutes INTEGER DEFAULT 60
) RETURNS TABLE (
    is_available BOOLEAN,
    available_slots TEXT,
    day_name TEXT
) AS $$
DECLARE
    day_num INTEGER;
    day_name_pt TEXT;
    slot_count INTEGER;
    available_times TEXT;
BEGIN
    -- Extrair dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
    day_num := EXTRACT(DOW FROM p_scheduled_date);

    -- Nome do dia em português
    day_name_pt := CASE day_num
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda-feira'
        WHEN 2 THEN 'Terça-feira'
        WHEN 3 THEN 'Quarta-feira'
        WHEN 4 THEN 'Quinta-feira'
        WHEN 5 THEN 'Sexta-feira'
        WHEN 6 THEN 'Sábado'
    END;

    -- Verificar se existe slot ativo que cubra completamente o horário solicitado
    -- O horário + duração devem estar dentro de algum slot
    SELECT COUNT(*) INTO slot_count
    FROM therapist_availability_template
    WHERE therapist_id = p_therapist_id
      AND day_of_week = day_num
      AND is_active = TRUE
      AND start_time <= p_scheduled_time
      AND end_time >= (p_scheduled_time + (p_duration_minutes || ' minutes')::INTERVAL)::TIME;

    -- Buscar todos os slots disponíveis neste dia para mensagem de erro
    SELECT STRING_AGG(
        start_time::TEXT || '-' || end_time::TEXT,
        ', '
        ORDER BY start_time
    ) INTO available_times
    FROM therapist_availability_template
    WHERE therapist_id = p_therapist_id
      AND day_of_week = day_num
      AND is_active = TRUE;

    -- Se não há slots neste dia
    IF available_times IS NULL THEN
        available_times := 'Nenhum horário disponível';
    END IF;

    RETURN QUERY SELECT
        (slot_count > 0)::BOOLEAN,
        available_times,
        day_name_pt;
END;
$$ LANGUAGE plpgsql;

-- Comentário para documentação
COMMENT ON FUNCTION check_therapist_availability IS
'Verifica se um terapeuta está disponível em um horário específico baseado em sua configuração de disponibilidade semanal. Retorna se está disponível, os slots disponíveis naquele dia e o nome do dia da semana.';

-- Criar índice adicional para melhorar performance da query
CREATE INDEX IF NOT EXISTS idx_therapist_avail_composite
ON therapist_availability_template(therapist_id, day_of_week, is_active, start_time, end_time);

-- Análise para atualizar estatísticas do otimizador
ANALYZE therapist_availability_template;
