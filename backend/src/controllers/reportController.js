const ReportModel = require('../models/reportModel');
const { validationResult } = require('express-validator');

const reportController = {};

/**
 * Buscar dados completos para geração do relatório de evolução terapêutica
 */
reportController.getEvolutionReportData = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    
    // Buscar todos os dados necessários para o relatório
    const reportData = await ReportModel.getCompleteReportData(patientId, userId);
    
    if (!reportData) {
      return res.status(404).json({ 
        error: 'Paciente não encontrado ou sem acesso permitido' 
      });
    }
    
    res.json(reportData);
    
  } catch (error) {
    console.error('Erro ao buscar dados do relatório:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar dados do relatório' 
    });
  }
};

/**
 * Atualizar dados profissionais do usuário
 */
reportController.updateProfessionalData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { professional_id, qualifications, professional_signature } = req.body;
    
    const updatedUser = await ReportModel.updateUserProfessionalData(userId, {
      professional_id,
      qualifications,
      professional_signature
    });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json({ 
      message: 'Dados profissionais atualizados com sucesso',
      user: updatedUser 
    });
    
  } catch (error) {
    console.error('Erro ao atualizar dados profissionais:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao atualizar dados profissionais' 
    });
  }
};

/**
 * Atualizar dados complementares do paciente
 */
reportController.updatePatientData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { patientId } = req.params;
    const userId = req.user.id;
    const { 
      guardian_name, 
      guardian_relationship, 
      patient_occupation, 
      main_complaint, 
      treatment_objectives 
    } = req.body;
    
    const updatedPatient = await ReportModel.updatePatientComplementaryData(
      patientId, 
      userId,
      {
        guardian_name,
        guardian_relationship,
        patient_occupation,
        main_complaint,
        treatment_objectives
      }
    );
    
    if (!updatedPatient) {
      return res.status(404).json({ 
        error: 'Paciente não encontrado ou sem acesso permitido' 
      });
    }
    
    res.json({ 
      message: 'Dados complementares atualizados com sucesso',
      patient: updatedPatient 
    });
    
  } catch (error) {
    console.error('Erro ao atualizar dados do paciente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao atualizar dados do paciente' 
    });
  }
};

/**
 * Gerar análise automática baseada nos dados das sessões
 */
reportController.getAutomaticAnalysis = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.id;
    const { startDate, endDate, programIds } = req.query;
    
    const analysisData = await ReportModel.generateAutomaticAnalysis(
      patientId, 
      userId,
      {
        startDate,
        endDate,
        programIds: programIds ? programIds.split(',').map(id => parseInt(id)) : null
      }
    );
    
    if (!analysisData) {
      return res.status(404).json({ 
        error: 'Não foram encontrados dados suficientes para análise' 
      });
    }
    
    res.json(analysisData);
    
  } catch (error) {
    console.error('Erro ao gerar análise automática:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao gerar análise automática'
    });
  }
};

/**
 * Busca dados de atendimentos/presenças do paciente para relatório
 * GET /api/reports/patient-attendance/:patientId?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
reportController.getPatientAttendanceData = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { start_date, end_date } = req.query;
    const clinicId = req.user.clinic_id;

    console.log('[REPORT] getPatientAttendanceData - patientId:', patientId);
    console.log('[REPORT] período:', start_date, 'até', end_date);

    // Validações
    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Parâmetros start_date e end_date são obrigatórios'
      });
    }

    // Buscar dados do paciente
    const db = require('../models/db');
    const patientQuery = `
      SELECT id, name, dob, diagnosis
      FROM patients
      WHERE id = $1 AND clinic_id = $2
    `;
    const patientResult = await db.query(patientQuery, [patientId, clinicId]);

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const patient = patientResult.rows[0];

    // Buscar sessões do período
    const sessionsQuery = `
      SELECT
        ss.id,
        ss.scheduled_date,
        ss.scheduled_time,
        ss.duration_minutes,
        ss.status,
        ss.notes,
        d.name as discipline_name,
        u.full_name as therapist_name,
        cr.name as room_name
      FROM scheduled_sessions ss
      JOIN users u ON ss.therapist_id = u.id
      JOIN disciplines d ON ss.discipline_id = d.id
      LEFT JOIN clinic_rooms cr ON ss.room_id = cr.id
      WHERE ss.patient_id = $1
        AND ss.scheduled_date BETWEEN $2 AND $3
        AND ss.status IN ('completed', 'cancelled', 'no_show', 'scheduled')
      ORDER BY ss.scheduled_date, ss.scheduled_time
    `;

    const sessionsResult = await db.query(sessionsQuery, [
      patientId,
      start_date,
      end_date
    ]);

    const sessions = sessionsResult.rows;

    // Agrupar por disciplina e calcular estatísticas
    const byDiscipline = sessions.reduce((acc, session) => {
      const disciplineName = session.discipline_name;

      if (!acc[disciplineName]) {
        acc[disciplineName] = {
          discipline_name: disciplineName,
          total: 0,
          completed: 0,
          no_show: 0,
          cancelled: 0,
          scheduled: 0,
          sessions: [],
          therapists: new Set()
        };
      }

      acc[disciplineName].total++;
      acc[disciplineName].sessions.push(session);
      acc[disciplineName].therapists.add(session.therapist_name);

      if (session.status === 'completed') {
        acc[disciplineName].completed++;
      } else if (session.status === 'no_show') {
        acc[disciplineName].no_show++;
      } else if (session.status === 'cancelled') {
        acc[disciplineName].cancelled++;
      } else if (session.status === 'scheduled') {
        acc[disciplineName].scheduled++;
      }

      return acc;
    }, {});

    // Converter Set de terapeutas para Array
    Object.keys(byDiscipline).forEach(key => {
      byDiscipline[key].therapists = Array.from(byDiscipline[key].therapists);
    });

    // Calcular estatísticas gerais
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const noShowSessions = sessions.filter(s => s.status === 'no_show').length;
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
    const scheduledSessions = sessions.filter(s => s.status === 'scheduled').length;
    const attendanceRate = totalSessions > 0
      ? ((completedSessions / (completedSessions + noShowSessions)) * 100).toFixed(1)
      : 0;

    // Calcular horas totais
    const totalHours = sessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;

    res.json({
      patient,
      period: {
        start_date,
        end_date
      },
      summary: {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        no_show_sessions: noShowSessions,
        cancelled_sessions: cancelledSessions,
        scheduled_sessions: scheduledSessions,
        attendance_rate: parseFloat(attendanceRate),
        total_hours: totalHours.toFixed(1)
      },
      by_discipline: byDiscipline,
      all_sessions: sessions
    });

  } catch (error) {
    console.error('[REPORT] Erro ao buscar dados de atendimento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao buscar dados de atendimento'
    });
  }
};

module.exports = reportController;