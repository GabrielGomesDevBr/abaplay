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

module.exports = reportController;