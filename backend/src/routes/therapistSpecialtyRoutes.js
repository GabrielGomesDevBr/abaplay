// backend/src/routes/therapistSpecialtyRoutes.js

const express = require('express');
const router = express.Router();
const therapistSpecialtyController = require('../controllers/therapistSpecialtyController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * Rotas para gerenciar especialidades dos terapeutas
 * Todas as rotas requerem autenticação
 */

// GET /api/therapists/:therapistId/specialties - Listar especialidades do terapeuta
router.get(
  '/:therapistId/specialties',
  verifyToken,
  therapistSpecialtyController.getTherapistSpecialties
);

// POST /api/therapists/:therapistId/specialties - Adicionar especialidade
router.post(
  '/:therapistId/specialties',
  verifyToken,
  therapistSpecialtyController.addTherapistSpecialty
);

// PUT /api/therapists/:therapistId/specialties/:disciplineId - Atualizar especialidade
router.put(
  '/:therapistId/specialties/:disciplineId',
  verifyToken,
  therapistSpecialtyController.updateTherapistSpecialty
);

// DELETE /api/therapists/:therapistId/specialties/:disciplineId - Remover especialidade
router.delete(
  '/:therapistId/specialties/:disciplineId',
  verifyToken,
  therapistSpecialtyController.removeTherapistSpecialty
);

module.exports = router;
