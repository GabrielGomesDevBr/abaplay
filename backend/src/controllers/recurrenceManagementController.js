// backend/src/controllers/recurrenceManagementController.js

const pool = require('../config/db.config');

/**
 * Controller para gerenciamento de agendamentos recorrentes
 * Inclui cancelamento em lote, pausas e encerramentos
 */

/**
 * Gerenciar sessões recorrentes (cancelar, pausar, modificar)
 * POST /api/recurrence/manage
 */
const manageRecurrence = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      action,
      appointmentId,
      parentAppointmentId,
      startDate,
      endDate,
      reason
    } = req.body;

    const userId = req.user?.id;

    // Validar ação
    const validActions = ['cancel_single', 'cancel_future', 'cancel_range', 'end_recurrence', 'pause'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Ação inválida'
      });
    }

    let result;

    switch (action) {
      case 'cancel_single':
        // Cancelar apenas um agendamento específico
        await client.query(
          `UPDATE appointments
           SET status = 'cancelled',
               notes = COALESCE(notes || E'\n\n', '') || '🚫 Cancelado em ' || CURRENT_TIMESTAMP ||
                       COALESCE(E'\nMotivo: ' || $2, ''),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [appointmentId, reason]
        );

        result = {
          cancelled_count: 1,
          affected_dates: [startDate]
        };
        break;

      case 'cancel_future':
        // Cancelar esta e todas as futuras
        result = await client.query(
          `SELECT * FROM cancel_future_appointments(
            (SELECT patient_id FROM appointments WHERE id = $1),
            NULL, -- discipline_id
            NULL, -- therapist_id
            $2,   -- parent_appointment_id
            $3,   -- start_date
            NULL, -- end_date
            $4,   -- reason
            $5    -- user_id
          )`,
          [appointmentId, parentAppointmentId, startDate, reason, userId]
        );

        result = result.rows[0];
        break;

      case 'cancel_range':
        // Cancelar intervalo específico
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Datas de início e fim são obrigatórias para cancelamento de intervalo'
          });
        }

        result = await client.query(
          `SELECT * FROM cancel_future_appointments(
            (SELECT patient_id FROM appointments WHERE id = $1),
            NULL, -- discipline_id
            NULL, -- therapist_id
            $2,   -- parent_appointment_id
            $3,   -- start_date
            $4,   -- end_date
            $5,   -- reason
            $6    -- user_id
          )`,
          [appointmentId, parentAppointmentId, startDate, endDate, reason, userId]
        );

        result = result.rows[0];
        break;

      case 'end_recurrence':
        // Encerrar recorrência (definir data final)
        if (!endDate) {
          return res.status(400).json({
            success: false,
            message: 'Data final é obrigatória para encerrar recorrência'
          });
        }

        result = await client.query(
          `SELECT * FROM update_recurrence_end_date($1, $2, $3)`,
          [parentAppointmentId, endDate, userId]
        );

        result = result.rows[0];
        break;

      case 'pause':
        // Pausar temporariamente
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Datas de início e fim são obrigatórias para pausar recorrência'
          });
        }

        result = await client.query(
          `SELECT * FROM pause_recurrence($1, $2, $3, $4, $5)`,
          [parentAppointmentId, startDate, endDate, reason, userId]
        );

        result = result.rows[0];
        break;
    }

    res.json({
      success: true,
      message: 'Ação executada com sucesso',
      data: result
    });

  } catch (error) {
    console.error('[RECURRENCE-MANAGEMENT] Erro ao gerenciar recorrência:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar ação',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Encerrar tratamento de um paciente (cancelar todas as sessões futuras)
 * POST /api/recurrence/terminate-patient
 */
const terminatePatient = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId, reason, observations } = req.body;
    const userId = req.user?.id;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'ID do paciente é obrigatório'
      });
    }

    // Chamar função SQL
    const result = await client.query(
      `SELECT * FROM terminate_patient_treatment($1, $2, $3)`,
      [patientId, `${reason}${observations ? ' - ' + observations : ''}`, userId]
    );

    const data = result.rows[0];

    res.json({
      success: true,
      message: `Tratamento encerrado com sucesso. ${data.cancelled_count} sessões canceladas.`, 
      data: {
        cancelled_count: data.cancelled_count,
        disciplines_affected: data.disciplines_affected,
        therapists_affected: data.therapists_affected,
        summary: data.summary
      }
    });

  } catch (error) {
    console.error('[RECURRENCE-MANAGEMENT] Erro ao encerrar tratamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao encerrar tratamento do paciente',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Obter resumo de sessões futuras de um paciente (para preview antes de encerrar)
 * GET /api/recurrence/patient/:patientId/future-sessions
 */
const getPatientFutureSessions = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;

    const result = await client.query(
      `SELECT
        a.discipline_id,
        d.name as discipline_name,
        a.therapist_id,
        u.name as therapist_name,
        a.scheduled_time,
        COUNT(*) as session_count,
        MIN(a.scheduled_date) as next_session_date,
        MAX(a.scheduled_date) as last_session_date
       FROM appointments a
       LEFT JOIN disciplines d ON a.discipline_id = d.id
       LEFT JOIN users u ON a.therapist_id = u.id
       WHERE a.patient_id = $1
         AND a.status NOT IN ('completed', 'cancelled')
         AND a.scheduled_date >= CURRENT_DATE
       GROUP BY a.discipline_id, d.name, a.therapist_id, u.name, a.scheduled_time
       ORDER BY MIN(a.scheduled_date)`,
      [patientId]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[RECURRENCE-MANAGEMENT] Erro ao buscar sessões futuras:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar sessões futuras do paciente',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Obter resumo de todas as recorrências ativas
 * GET /api/recurrence/summary
 */
const getRecurrenceSummary = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM v_recurrence_summary
       WHERE scheduled_count > 0
       ORDER BY next_session_date NULLS LAST, patient_name`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('[RECURRENCE-MANAGEMENT] Erro ao buscar resumo de recorrências:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar resumo de recorrências',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Verificar conflitos de agendamento para um paciente
 * POST /api/recurrence/check-conflicts
 */
const checkPatientConflicts = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId, slots } = req.body;

    if (!patientId || !slots || !Array.isArray(slots)) {
      return res.status(400).json({
        success: false,
        message: 'patientId e slots (array) são obrigatórios'
      });
    }

    // Buscar agendamentos existentes do paciente nas datas/horários dos slots
    const conflicts = [];

    for (const slot of slots) {
      const result = await client.query(
        `SELECT
          id,
          scheduled_date,
          scheduled_time,
          discipline_id,
          therapist_id
         FROM appointments
         WHERE patient_id = $1
           AND scheduled_date = $2
           AND scheduled_time = $3
           AND status NOT IN ('cancelled')
         LIMIT 1`,
        [patientId, slot.available_date, slot.available_time]
      );

      if (result.rows.length > 0) {
        conflicts.push({
          date: slot.available_date,
          time: slot.available_time,
          existing_appointment: result.rows[0]
        });
      }
    }

    res.json({
      success: true,
      conflicts
    });

  } catch (error) {
    console.error('[RECURRENCE-MANAGEMENT] Erro ao verificar conflitos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar conflitos',
      error: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = {
  manageRecurrence,
  terminatePatient,
  getPatientFutureSessions,
  getRecurrenceSummary,
  checkPatientConflicts,
};