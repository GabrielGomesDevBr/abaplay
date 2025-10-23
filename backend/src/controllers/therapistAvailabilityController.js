// backend/src/controllers/therapistAvailabilityController.js

const therapistAvailabilityModel = require('../models/therapistAvailabilityModel');
const therapistSpecialtyModel = require('../models/therapistSpecialtyModel');
const availabilityNotifications = require('../utils/availabilityNotifications');
const automaticRescheduling = require('../utils/automaticRescheduling');

/**
 * Controller para gestão híbrida de disponibilidade
 * Permite terapeuta e admin gerenciar horários e ausências
 */
const therapistAvailabilityController = {

  // ================================================================
  // HORÁRIO PADRÃO (SCHEDULE TEMPLATE)
  // ================================================================

  /**
   * GET /api/therapist-availability/schedule/:therapistId
   * Busca horários padrão de trabalho de um terapeuta
   */
  async getScheduleTemplate(req, res) {
    try {
      const { therapistId } = req.params;
      const requestingUser = req.user;

      // Verificar permissão: apenas o próprio terapeuta ou admin
      if (requestingUser.id !== parseInt(therapistId) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para visualizar esta agenda'
        });
      }

      console.log('[AVAILABILITY] Buscando horários padrão do terapeuta:', therapistId);

      const schedules = await therapistAvailabilityModel.getTherapistScheduleTemplate(therapistId);

      console.log('[AVAILABILITY] Horários encontrados:', schedules.length);

      res.json({
        success: true,
        data: schedules
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao buscar horários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar horários de trabalho',
        error: error.message
      });
    }
  },

  /**
   * POST /api/therapist-availability/schedule
   * Adiciona novo horário padrão
   */
  async addScheduleTemplate(req, res) {
    try {
      const { therapist_id, day_of_week, start_time, end_time, notes } = req.body;
      const requestingUser = req.user;

      // Verificar permissão: apenas o próprio terapeuta ou admin
      if (requestingUser.id !== parseInt(therapist_id) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para modificar esta agenda'
        });
      }

      // Validações
      if (!therapist_id || day_of_week === undefined || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: therapist_id, day_of_week, start_time, end_time'
        });
      }

      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({
          success: false,
          message: 'day_of_week deve ser entre 0 (domingo) e 6 (sábado)'
        });
      }

      console.log('[AVAILABILITY] Adicionando horário:', {
        therapist_id,
        day_of_week,
        start_time,
        end_time
      });

      const newSchedule = await therapistAvailabilityModel.addScheduleTemplate({
        therapist_id: parseInt(therapist_id),
        day_of_week: parseInt(day_of_week),
        start_time,
        end_time,
        notes
      });

      console.log('[AVAILABILITY] Horário adicionado com sucesso');

      res.status(201).json({
        success: true,
        message: 'Horário adicionado com sucesso',
        data: newSchedule
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao adicionar horário:', error);

      if (error.message.includes('conflita')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao adicionar horário',
        error: error.message
      });
    }
  },

  /**
   * PUT /api/therapist-availability/schedule/:id
   * Atualiza horário padrão existente
   */
  async updateScheduleTemplate(req, res) {
    try {
      const { id } = req.params;
      const { start_time, end_time, is_active, notes } = req.body;
      const requestingUser = req.user;

      console.log('[AVAILABILITY] Atualizando horário:', id);

      const updated = await therapistAvailabilityModel.updateScheduleTemplate(
        parseInt(id),
        { start_time, end_time, is_active, notes }
      );

      // Verificar permissão após buscar (para saber a qual terapeuta pertence)
      if (requestingUser.id !== updated.therapist_id && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para modificar este horário'
        });
      }

      console.log('[AVAILABILITY] Horário atualizado com sucesso');

      res.json({
        success: true,
        message: 'Horário atualizado com sucesso',
        data: updated
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao atualizar horário:', error);

      if (error.message.includes('não encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar horário',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/therapist-availability/schedule/:id
   * Remove horário padrão
   */
  async deleteScheduleTemplate(req, res) {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      console.log('[AVAILABILITY] Removendo horário:', id);

      // TODO: Buscar primeiro para verificar permissão
      // Por enquanto, assumir que middleware já validou

      const deleted = await therapistAvailabilityModel.deleteScheduleTemplate(parseInt(id));

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Horário não encontrado'
        });
      }

      console.log('[AVAILABILITY] Horário removido com sucesso');

      res.json({
        success: true,
        message: 'Horário removido com sucesso'
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao remover horário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao remover horário',
        error: error.message
      });
    }
  },

  // ================================================================
  // AUSÊNCIAS E BLOQUEIOS
  // ================================================================

  /**
   * GET /api/therapist-availability/absences/:therapistId
   * Busca ausências de um terapeuta
   */
  async getAbsences(req, res) {
    try {
      const { therapistId } = req.params;
      const { include_past, pending_only } = req.query;
      const requestingUser = req.user;

      // Verificar permissão
      if (requestingUser.id !== parseInt(therapistId) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para visualizar estas ausências'
        });
      }

      console.log('[AVAILABILITY] Buscando ausências do terapeuta:', therapistId);

      const absences = await therapistAvailabilityModel.getTherapistAbsences(
        parseInt(therapistId),
        {
          include_past: include_past === 'true',
          pending_only: pending_only === 'true'
        }
      );

      console.log('[AVAILABILITY] Ausências encontradas:', absences.length);

      res.json({
        success: true,
        data: absences
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao buscar ausências:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar ausências',
        error: error.message
      });
    }
  },

  /**
   * GET /api/therapist-availability/absences/pending/all
   * Busca todas as ausências pendentes (admin apenas)
   */
  async getPendingAbsences(req, res) {
    try {
      const requestingUser = req.user;

      // Apenas admin pode ver todas as pendências
      if (!requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem visualizar todas as ausências pendentes'
        });
      }

      console.log('[AVAILABILITY] Buscando todas as ausências pendentes');

      const absences = await therapistAvailabilityModel.getPendingAbsences();

      console.log('[AVAILABILITY] Ausências pendentes encontradas:', absences.length);

      res.json({
        success: true,
        data: absences
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao buscar ausências pendentes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar ausências pendentes',
        error: error.message
      });
    }
  },

  /**
   * POST /api/therapist-availability/absences
   * Cria nova ausência/bloqueio
   */
  async createAbsence(req, res) {
    try {
      const {
        therapist_id,
        absence_type,
        start_date,
        end_date,
        start_time,
        end_time,
        reason
      } = req.body;
      const requestingUser = req.user;

      // Verificar permissão
      if (requestingUser.id !== parseInt(therapist_id) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para criar ausência para este terapeuta'
        });
      }

      // Validações
      if (!therapist_id || !absence_type || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: therapist_id, absence_type, start_date, end_date'
        });
      }

      console.log('[AVAILABILITY] Criando ausência:', {
        therapist_id,
        absence_type,
        start_date,
        end_date
      });

      // Verificar conflitos com agendamentos
      const conflicts = await therapistAvailabilityModel.checkAppointmentConflicts(
        parseInt(therapist_id),
        start_date,
        end_date,
        start_time,
        end_time
      );

      if (conflicts.length > 0 && !requestingUser.is_admin) {
        return res.status(409).json({
          success: false,
          message: `Existem ${conflicts.length} agendamento(s) neste período. Apenas administradores podem forçar o bloqueio.`,
          conflicts: conflicts
        });
      }

      const newAbsence = await therapistAvailabilityModel.createAbsence({
        therapist_id: parseInt(therapist_id),
        absence_type,
        start_date,
        end_date,
        start_time: start_time || null,
        end_time: end_time || null,
        reason: reason || null,
        auto_approve: requestingUser.is_admin, // Admin auto-aprova
        approved_by: requestingUser.is_admin ? requestingUser.id : null
      });

      console.log('[AVAILABILITY] Ausência criada:', newAbsence.status);

      // === NOTIFICAÇÕES ===

      // Se ausência está pendente (não foi auto-aprovada), notificar admins
      if (newAbsence.status === 'pending') {
        const admins = await availabilityNotifications.getClinicAdmins(requestingUser.clinic_id);
        const adminIds = admins.map(a => a.id);

        await availabilityNotifications.notifyAdminAbsenceRequest(
          therapist_id,
          requestingUser.full_name,
          newAbsence,
          adminIds
        );
      }

      // Se há conflitos e foi forçado bloqueio, notificar pacientes afetados
      if (conflicts.length > 0 && requestingUser.is_admin) {
        await availabilityNotifications.notifyPatientsAboutConflicts(
          conflicts,
          therapist_id,
          requestingUser.full_name,
          newAbsence
        );
      }

      res.status(201).json({
        success: true,
        message: newAbsence.status === 'approved'
          ? 'Bloqueio criado com sucesso'
          : 'Solicitação enviada para aprovação',
        data: newAbsence,
        has_conflicts: conflicts.length > 0,
        conflicts: conflicts
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao criar ausência:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar ausência',
        error: error.message
      });
    }
  },

  /**
   * PUT /api/therapist-availability/absences/:id/status
   * Aprova ou rejeita ausência (admin apenas)
   */
  async updateAbsenceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'approved' ou 'rejected'
      const requestingUser = req.user;

      // Apenas admin pode aprovar/rejeitar
      if (!requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem aprovar/rejeitar ausências'
        });
      }

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status deve ser "approved" ou "rejected"'
        });
      }

      console.log('[AVAILABILITY] Atualizando status da ausência:', id, 'para', status);

      const updated = await therapistAvailabilityModel.updateAbsenceStatus(
        parseInt(id),
        status,
        requestingUser.id
      );

      console.log('[AVAILABILITY] Status atualizado com sucesso');

      // === NOTIFICAR TERAPEUTA ===
      await availabilityNotifications.notifyTherapistAbsenceDecision(
        updated.therapist_id,
        updated,
        status,
        requestingUser.full_name
      );

      res.json({
        success: true,
        message: status === 'approved' ? 'Ausência aprovada' : 'Ausência rejeitada',
        data: updated
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao atualizar status:', error);

      if (error.message.includes('não encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status da ausência',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/therapist-availability/absences/:id
   * Remove ausência
   */
  async deleteAbsence(req, res) {
    try {
      const { id } = req.params;
      const requestingUser = req.user;

      console.log('[AVAILABILITY] Removendo ausência:', id);

      // TODO: Verificar permissão (buscar primeiro para saber de quem é)

      const deleted = await therapistAvailabilityModel.deleteAbsence(parseInt(id));

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Ausência não encontrada'
        });
      }

      console.log('[AVAILABILITY] Ausência removida com sucesso');

      res.json({
        success: true,
        message: 'Ausência removida com sucesso'
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao remover ausência:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao remover ausência',
        error: error.message
      });
    }
  },

  /**
   * GET /api/therapist-availability/conflicts/check
   * Verifica conflitos de agendamentos antes de criar bloqueio
   */
  async checkConflicts(req, res) {
    try {
      const { therapist_id, start_date, end_date, start_time, end_time } = req.query;

      if (!therapist_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: therapist_id, start_date, end_date'
        });
      }

      console.log('[AVAILABILITY] Verificando conflitos:', {
        therapist_id,
        start_date,
        end_date
      });

      const conflicts = await therapistAvailabilityModel.checkAppointmentConflicts(
        parseInt(therapist_id),
        start_date,
        end_date,
        start_time || null,
        end_time || null
      );

      res.json({
        success: true,
        has_conflicts: conflicts.length > 0,
        conflict_count: conflicts.length,
        conflicts: conflicts
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao verificar conflitos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar conflitos',
        error: error.message
      });
    }
  },

  // ================================================================
  // REAGENDAMENTO AUTOMÁTICO
  // ================================================================

  /**
   * POST /api/therapist-availability/rescheduling/suggest
   * Sugere horários alternativos para sessões conflitantes
   */
  async suggestRescheduling(req, res) {
    try {
      const { conflicts, therapist_id, search_params } = req.body;
      const requestingUser = req.user;

      if (!conflicts || !Array.isArray(conflicts) || conflicts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de conflitos é obrigatória'
        });
      }

      console.log('[AVAILABILITY] Gerando sugestões de reagendamento para', conflicts.length, 'conflitos');

      const suggestions = await automaticRescheduling.suggestAlternatives(
        conflicts,
        therapist_id,
        search_params || {}
      );

      res.json({
        success: true,
        message: `Sugestões geradas para ${suggestions.length} sessão(ões)`,
        suggestions: suggestions
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao gerar sugestões:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar sugestões de reagendamento',
        error: error.message
      });
    }
  },

  /**
   * POST /api/therapist-availability/rescheduling/apply
   * Aplica reagendamento automático (admin apenas)
   */
  async applyRescheduling(req, res) {
    try {
      const { rescheduling_plan } = req.body;
      const requestingUser = req.user;

      // Apenas admin pode aplicar reagendamento
      if (!requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem aplicar reagendamento automático'
        });
      }

      if (!rescheduling_plan || !Array.isArray(rescheduling_plan)) {
        return res.status(400).json({
          success: false,
          message: 'Plano de reagendamento é obrigatório'
        });
      }

      console.log('[AVAILABILITY] Aplicando reagendamento:', rescheduling_plan.length, 'sessões');

      const results = await automaticRescheduling.applyRescheduling(
        rescheduling_plan,
        requestingUser.id
      );

      res.json({
        success: true,
        message: `Reagendamento aplicado: ${results.success.length} sucesso, ${results.failed.length} falhas`,
        results: results
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao aplicar reagendamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao aplicar reagendamento',
        error: error.message
      });
    }
  },

  // ================================================================
  // ESPECIALIDADES (INTEGRADO)
  // ================================================================

  /**
   * GET /api/therapist-availability/specialties/:therapistId
   * Retorna todas as especialidades de um terapeuta
   */
  async getSpecialties(req, res) {
    try {
      const { therapistId } = req.params;
      const requestingUser = req.user;

      // Verificar permissão: apenas o próprio terapeuta ou admin
      if (requestingUser.id !== parseInt(therapistId) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para visualizar estas especialidades'
        });
      }

      console.log('[AVAILABILITY] Buscando especialidades do terapeuta:', therapistId);

      const specialties = await therapistSpecialtyModel.getTherapistSpecialties(therapistId);

      console.log('[AVAILABILITY] Especialidades encontradas:', specialties.length);

      res.json({
        success: true,
        data: specialties
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao buscar especialidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar especialidades do terapeuta',
        error: error.message
      });
    }
  },

  /**
   * POST /api/therapist-availability/specialties
   * Adiciona uma nova especialidade ao terapeuta
   */
  async addSpecialty(req, res) {
    try {
      const { therapist_id, discipline_id, certification_date, notes } = req.body;
      const requestingUser = req.user;

      // Validações
      if (!therapist_id || !discipline_id) {
        return res.status(400).json({
          success: false,
          message: 'ID do terapeuta e disciplina são obrigatórios'
        });
      }

      // Verificar permissão: apenas o próprio terapeuta ou admin
      if (requestingUser.id !== parseInt(therapist_id) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para adicionar especialidades'
        });
      }

      console.log('[AVAILABILITY] Adicionando especialidade:', {
        therapist_id,
        discipline_id,
        certification_date,
        notes
      });

      const specialtyData = {
        therapist_id: parseInt(therapist_id),
        discipline_id: parseInt(discipline_id),
        certification_date: certification_date || null,
        notes: notes || null
      };

      const newSpecialty = await therapistSpecialtyModel.addTherapistSpecialty(specialtyData);

      console.log('[AVAILABILITY] Especialidade adicionada com sucesso:', newSpecialty);

      res.status(201).json({
        success: true,
        message: 'Especialidade adicionada com sucesso',
        data: newSpecialty
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao adicionar especialidade:', error);

      if (error.message.includes('já possui esta especialidade')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao adicionar especialidade',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/therapist-availability/specialties/:therapistId/:disciplineId
   * Remove uma especialidade do terapeuta
   */
  async removeSpecialty(req, res) {
    try {
      const { therapistId, disciplineId } = req.params;
      const requestingUser = req.user;

      // Verificar permissão: apenas o próprio terapeuta ou admin
      if (requestingUser.id !== parseInt(therapistId) && !requestingUser.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para remover especialidades'
        });
      }

      console.log('[AVAILABILITY] Removendo especialidade:', {
        therapistId,
        disciplineId
      });

      const removed = await therapistSpecialtyModel.removeTherapistSpecialty(
        parseInt(therapistId),
        parseInt(disciplineId)
      );

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Especialidade não encontrada'
        });
      }

      console.log('[AVAILABILITY] Especialidade removida com sucesso');

      res.json({
        success: true,
        message: 'Especialidade removida com sucesso'
      });
    } catch (error) {
      console.error('[AVAILABILITY] Erro ao remover especialidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao remover especialidade',
        error: error.message
      });
    }
  }
};

module.exports = therapistAvailabilityController;
