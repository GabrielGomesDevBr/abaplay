const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const contactController = require('../controllers/contactController');

/**
 * @route GET /api/contacts/therapists/:patientId
 * @desc Busca terapeutas atribuídos a um paciente (para pais iniciarem conversas)
 * @access Private (todos os roles com permissão ao paciente)
 */
router.get('/therapists/:patientId', verifyToken, contactController.getTherapistContacts);

/**
 * @route GET /api/contacts/colleagues/:patientId
 * @desc Busca colegas terapeutas que trabalham com o mesmo paciente (para discussões de caso)
 * @access Private (apenas terapeutas)
 */
router.get('/colleagues/:patientId', verifyToken, contactController.getColleagueContacts);

module.exports = router;