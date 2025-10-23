const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireProPlan } = require('../middleware/subscriptionMiddleware');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Middleware para verificar autenticação em todas as rotas
router.use(verifyToken);

// ⚠️ PROTEGIDAS: Relatórios de evolução são feature Pro
router.use(requireProPlan);

// Rota para buscar dados completos para relatório de evolução terapêutica
router.get('/evolution-data/:patientId', reportController.getEvolutionReportData);

// Rota para atualizar dados profissionais do usuário
router.put('/professional-data', reportController.updateProfessionalData);

// Rota para atualizar dados complementares do paciente
router.put('/patient-data/:patientId', reportController.updatePatientData);

// Rota para gerar análise automática baseada nos dados das sessões
router.get('/automatic-analysis/:patientId', reportController.getAutomaticAnalysis);

// Rota para buscar dados de atendimentos/presenças do paciente
router.get('/patient-attendance/:patientId', reportController.getPatientAttendanceData);

module.exports = router;