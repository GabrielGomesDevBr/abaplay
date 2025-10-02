// PATCH para backend/src/controllers/schedulingController.js
// Adicionar estes métodos ao objeto SchedulingController existente

/**
 * NOVO: Buscar ações pendentes (órfãs + perdidos + detectados hoje)
 * GET /api/scheduling/pending-actions
 */
async getPendingActions(req, res, next) {
  try {
    const { clinic_id } = req.user;
    const pool = require('../models/db');

    // Buscar órfãs dos últimos 7 dias
    const orphanSessions = await ScheduledSessionModel.findOrphanSessions({
      clinic_id,
      lookbackDays: 7
    });

    // Buscar agendamentos perdidos sem justificativa
    const missedQuery = `
      SELECT * FROM v_scheduled_sessions_complete
      WHERE patient_clinic_id = $1
      AND status = 'missed'
      AND justified_at IS NULL
      ORDER BY scheduled_date DESC
      LIMIT 100
    `;
    const { rows: missedAppointments } = await pool.query(missedQuery, [clinic_id]);

    // Contar sessões detectadas hoje
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

/**
 * NOVO: Criar agendamentos retroativos em lote
 * POST /api/scheduling/retroactive/batch
 */
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

    // Criar retroativo para cada sessão
    for (const sessionId of session_ids) {
      try {
        // Buscar dados da sessão órfã
        const orphanQuery = `
          SELECT
            ppp.id as session_id,
            ppp.session_date,
            ppa.patient_id,
            ppa.therapist_id,
            p.clinic_id
          FROM patient_program_progress ppp
          JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
          JOIN patients p ON ppa.patient_id = p.id
          WHERE ppp.id = $1 AND p.clinic_id = $2
        `;

        const { rows } = await pool.query(orphanQuery, [sessionId, clinic_id]);

        if (rows.length === 0) {
          results.failed++;
          results.errors.push(`Sessão ${sessionId}: não encontrada ou não pertence a esta clínica`);
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
          discipline_id: common_data.discipline_id || null,
          notes: common_data.notes || 'Agendamento retroativo criado em lote'
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
},

/**
 * NOVO: Executar manutenção manual (admin apenas)
 * POST /api/scheduling/run-maintenance
 */
async runMaintenanceManually(req, res, next) {
  try {
    // Verificar se é admin
    if (!req.user.is_admin) {
      return res.status(403).json({
        errors: [{ msg: 'Acesso negado. Apenas administradores podem executar manutenção manual.' }]
      });
    }

    const SessionMaintenanceJob = require('../jobs/sessionMaintenanceJob');

    const results = await SessionMaintenanceJob.runMaintenanceRoutine({
      lookbackHours: 24,
      missedAfterHours: 2,
      notifyUsers: false
    });

    res.status(200).json({
      message: 'Manutenção executada com sucesso',
      results
    });

  } catch (error) {
    console.error('[SCHEDULING] Erro ao executar manutenção manual:', error);
    next(error);
  }
}

// ====================
// INSTRUÇÕES DE USO:
// ====================
// 1. Abra o arquivo: backend/src/controllers/schedulingController.js
// 2. Localize o objeto SchedulingController
// 3. Adicione os 3 métodos acima ANTES do "module.exports = SchedulingController;"
// 4. Salve o arquivo