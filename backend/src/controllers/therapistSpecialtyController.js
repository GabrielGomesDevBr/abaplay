// backend/src/controllers/therapistSpecialtyController.js

const therapistSpecialtyModel = require('../models/therapistSpecialtyModel');

/**
 * Controller para gerenciar especialidades dos terapeutas
 */
const therapistSpecialtyController = {
  /**
   * GET /api/therapists/:therapistId/specialties
   * Retorna todas as especialidades de um terapeuta
   */
  async getTherapistSpecialties(req, res) {
    try {
      const { therapistId } = req.params;

      console.log('[THERAPIST_SPECIALTY] Buscando especialidades do terapeuta:', therapistId);

      const specialties = await therapistSpecialtyModel.getTherapistSpecialties(therapistId);

      console.log('[THERAPIST_SPECIALTY] Especialidades encontradas:', specialties.length);

      res.json({
        success: true,
        data: specialties
      });
    } catch (error) {
      console.error('[THERAPIST_SPECIALTY] Erro ao buscar especialidades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar especialidades do terapeuta',
        error: error.message
      });
    }
  },

  /**
   * POST /api/therapists/:therapistId/specialties
   * Adiciona uma nova especialidade ao terapeuta
   */
  async addTherapistSpecialty(req, res) {
    try {
      const { therapistId } = req.params;
      const { discipline_id, certification_date, notes } = req.body;

      console.log('[THERAPIST_SPECIALTY] Adicionando especialidade:', {
        therapistId,
        discipline_id,
        certification_date,
        notes
      });

      // Validações
      if (!discipline_id) {
        return res.status(400).json({
          success: false,
          message: 'ID da disciplina é obrigatório'
        });
      }

      const specialtyData = {
        therapist_id: parseInt(therapistId),
        discipline_id: parseInt(discipline_id),
        certification_date: certification_date || null,
        notes: notes || null
      };

      const newSpecialty = await therapistSpecialtyModel.addTherapistSpecialty(specialtyData);

      console.log('[THERAPIST_SPECIALTY] Especialidade adicionada com sucesso:', newSpecialty);

      res.status(201).json({
        success: true,
        message: 'Especialidade adicionada com sucesso',
        data: newSpecialty
      });
    } catch (error) {
      console.error('[THERAPIST_SPECIALTY] Erro ao adicionar especialidade:', error);

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
   * DELETE /api/therapists/:therapistId/specialties/:disciplineId
   * Remove uma especialidade do terapeuta
   */
  async removeTherapistSpecialty(req, res) {
    try {
      const { therapistId, disciplineId } = req.params;

      console.log('[THERAPIST_SPECIALTY] Removendo especialidade:', {
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

      console.log('[THERAPIST_SPECIALTY] Especialidade removida com sucesso');

      res.json({
        success: true,
        message: 'Especialidade removida com sucesso'
      });
    } catch (error) {
      console.error('[THERAPIST_SPECIALTY] Erro ao remover especialidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao remover especialidade',
        error: error.message
      });
    }
  },

  /**
   * PUT /api/therapists/:therapistId/specialties/:disciplineId
   * Atualiza informações de uma especialidade
   */
  async updateTherapistSpecialty(req, res) {
    try {
      const { therapistId, disciplineId } = req.params;
      const { certification_date, notes } = req.body;

      console.log('[THERAPIST_SPECIALTY] Atualizando especialidade:', {
        therapistId,
        disciplineId,
        certification_date,
        notes
      });

      const updateData = {
        certification_date: certification_date || null,
        notes: notes || null
      };

      const updated = await therapistSpecialtyModel.updateTherapistSpecialty(
        parseInt(therapistId),
        parseInt(disciplineId),
        updateData
      );

      console.log('[THERAPIST_SPECIALTY] Especialidade atualizada com sucesso');

      res.json({
        success: true,
        message: 'Especialidade atualizada com sucesso',
        data: updated
      });
    } catch (error) {
      console.error('[THERAPIST_SPECIALTY] Erro ao atualizar especialidade:', error);

      if (error.message.includes('não encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar especialidade',
        error: error.message
      });
    }
  }
};

module.exports = therapistSpecialtyController;
