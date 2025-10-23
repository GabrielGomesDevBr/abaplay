// backend/src/utils/automaticRescheduling.js

const pool = require('../models/db');

/**
 * Sistema de reagendamento automático
 * Sugere horários alternativos quando há conflitos de disponibilidade
 */
const automaticRescheduling = {

  /**
   * Sugere horários alternativos para sessões conflitantes
   * @param {Array} conflicts - Lista de sessões em conflito
   * @param {number} therapistId - ID do terapeuta
   * @param {Object} searchParams - Parâmetros de busca
   * @returns {Promise<Array>} Sugestões de reagendamento
   */
  async suggestAlternatives(conflicts, therapistId, searchParams = {}) {
    try {
      const {
        days_ahead = 14,        // Buscar até 14 dias à frente
        same_week_only = false, // Tentar reagendar na mesma semana
        preferred_times = []    // Horários preferenciais
      } = searchParams;

      console.log('[RESCHEDULING] Gerando sugestões para', conflicts.length, 'conflitos');

      const suggestions = [];

      for (const conflict of conflicts) {
        const originalDate = new Date(conflict.scheduled_date);
        const alternativeSlots = await this.findAvailableSlots(
          therapistId,
          conflict,
          days_ahead,
          same_week_only
        );

        suggestions.push({
          conflict: {
            session_id: conflict.id,
            patient_id: conflict.patient_id,
            patient_name: conflict.patient_name,
            original_date: conflict.scheduled_date,
            original_time: conflict.scheduled_time,
            duration_minutes: conflict.duration_minutes,
            discipline_name: conflict.discipline_name
          },
          alternatives: alternativeSlots.slice(0, 5) // Top 5 sugestões
        });
      }

      console.log('[RESCHEDULING] Sugestões geradas:', suggestions.length);
      return suggestions;
    } catch (error) {
      console.error('[RESCHEDULING] Erro ao gerar sugestões:', error);
      throw error;
    }
  },

  /**
   * Busca slots disponíveis para reagendar uma sessão
   * @param {number} therapistId - ID do terapeuta
   * @param {Object} session - Sessão a ser reagendada
   * @param {number} daysAhead - Dias à frente para buscar
   * @param {boolean} sameWeekOnly - Apenas na mesma semana
   * @returns {Promise<Array>} Slots disponíveis
   */
  async findAvailableSlots(therapistId, session, daysAhead = 14, sameWeekOnly = false) {
    try {
      const originalDate = new Date(session.scheduled_date);
      const startDate = new Date(originalDate);
      startDate.setDate(startDate.getDate() + 1); // Começar do dia seguinte

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + daysAhead);

      // Se sameWeekOnly, limitar ao final da semana
      if (sameWeekOnly) {
        const endOfWeek = new Date(originalDate);
        const daysUntilSunday = 7 - originalDate.getDay();
        endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);

        if (endDate > endOfWeek) {
          endDate.setTime(endOfWeek.getTime());
        }
      }

      // Buscar slots usando a função de disponibilidade existente
      const query = `
        SELECT * FROM search_available_slots(
          $1::INTEGER,           -- clinic_id (buscar da sessão)
          $2::INTEGER[],         -- discipline_ids
          NULL,                  -- day_of_week
          'all',                 -- time_period
          $3::DATE,              -- start_date
          $4::DATE,              -- end_date
          $5::INTEGER,           -- duration_minutes
          false,                 -- require_specialty
          $6::INTEGER,           -- preferred_therapist_id
          NULL                   -- patient_id
        )
      `;

      const result = await pool.query(query, [
        session.clinic_id || 1, // TODO: Pegar clinic_id corretamente
        session.discipline_id ? [session.discipline_id] : [],
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        session.duration_minutes || 60,
        therapistId
      ]);

      // Priorizar slots próximos ao horário original
      const originalTime = session.scheduled_time;
      const slots = result.rows.map(slot => {
        const timeDiff = this.calculateTimeDifference(originalTime, slot.available_time);
        return {
          ...slot,
          time_difference: timeDiff,
          score: this.calculateSlotScore(slot, originalDate, originalTime)
        };
      });

      // Ordenar por score (melhor match primeiro)
      slots.sort((a, b) => b.score - a.score);

      return slots;
    } catch (error) {
      console.error('[RESCHEDULING] Erro ao buscar slots:', error);
      return [];
    }
  },

  /**
   * Calcula diferença em minutos entre dois horários
   * @param {string} time1 - Horário 1 (HH:MM)
   * @param {string} time2 - Horário 2 (HH:MM)
   * @returns {number} Diferença em minutos
   */
  calculateTimeDifference(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);

    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;

    return Math.abs(minutes2 - minutes1);
  },

  /**
   * Calcula score de compatibilidade de um slot
   * Maior score = melhor match
   * @param {Object} slot - Slot disponível
   * @param {Date} originalDate - Data original
   * @param {string} originalTime - Horário original
   * @returns {number} Score (0-100)
   */
  calculateSlotScore(slot, originalDate, originalTime) {
    let score = 100;

    // Penalizar por diferença de dias (até 50 pontos)
    const slotDate = new Date(slot.available_date);
    const daysDiff = Math.abs((slotDate - originalDate) / (1000 * 60 * 60 * 24));
    score -= Math.min(daysDiff * 5, 50);

    // Penalizar por diferença de horário (até 30 pontos)
    const timeDiff = this.calculateTimeDifference(originalTime, slot.available_time);
    score -= Math.min(timeDiff / 10, 30);

    // Bonus se for o mesmo dia da semana (10 pontos)
    if (slotDate.getDay() === originalDate.getDay()) {
      score += 10;
    }

    // Bonus se terapeuta tem especialidade (10 pontos)
    if (slot.has_specialty) {
      score += 10;
    }

    // Bonus se é terapeuta preferido (10 pontos)
    if (slot.is_preferred) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  },

  /**
   * Aplica reagendamento automático para uma lista de sessões
   * @param {Array} reschedulingPlan - Plano de reagendamento
   * @param {number} approvedBy - ID do admin que aprovou
   * @returns {Promise<Object>} Resultado do reagendamento
   */
  async applyRescheduling(reschedulingPlan, approvedBy) {
    try {
      console.log('[RESCHEDULING] Aplicando reagendamento:', reschedulingPlan.length, 'sessões');

      const results = {
        success: [],
        failed: []
      };

      for (const item of reschedulingPlan) {
        try {
          const { session_id, new_date, new_time } = item;

          // Atualizar sessão
          const updateQuery = `
            UPDATE scheduled_sessions
            SET
              scheduled_date = $2,
              scheduled_time = $3,
              notes = COALESCE(notes, '') || E'\n\n[Reagendado automaticamente em ' ||
                      NOW()::DATE || ' por ausência do terapeuta]'
            WHERE id = $1
            RETURNING *
          `;

          const result = await pool.query(updateQuery, [session_id, new_date, new_time]);

          if (result.rows.length > 0) {
            results.success.push({
              session_id,
              old_date: item.old_date,
              old_time: item.old_time,
              new_date,
              new_time
            });

            console.log(`[RESCHEDULING] Sessão ${session_id} reagendada: ${item.old_date} ${item.old_time} → ${new_date} ${new_time}`);
          }
        } catch (error) {
          console.error(`[RESCHEDULING] Erro ao reagendar sessão ${item.session_id}:`, error);
          results.failed.push({
            session_id: item.session_id,
            error: error.message
          });
        }
      }

      console.log('[RESCHEDULING] Reagendamento concluído:', results.success.length, 'sucesso,', results.failed.length, 'falhas');
      return results;
    } catch (error) {
      console.error('[RESCHEDULING] Erro ao aplicar reagendamento:', error);
      throw error;
    }
  }
};

module.exports = automaticRescheduling;
