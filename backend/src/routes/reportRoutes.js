const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Middleware para verificar autenticação em todas as rotas
router.use(verifyToken);

// Rota para buscar dados completos para relatório de evolução terapêutica
router.get('/evolution-data/:patientId', reportController.getEvolutionReportData);

// Rota para atualizar dados profissionais do usuário
router.put('/professional-data', reportController.updateProfessionalData);

// Rota para atualizar dados complementares do paciente
router.put('/patient-data/:patientId', reportController.updatePatientData);

// Rota para gerar análise automática baseada nos dados das sessões
router.get('/automatic-analysis/:patientId', reportController.getAutomaticAnalysis);

module.exports = router;