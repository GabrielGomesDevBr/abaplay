// backend/src/routes/patientRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const patientController = require('../controllers/patientController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Aplica a verificação de token para todas as rotas de pacientes
router.use(verifyToken);

// --- ROTAS DE PACIENTES PARA TERAPEUTAS ---

// GET /api/patients - Retorna os pacientes atribuídos ao terapeuta logado.
router.get('/', patientController.getAllPatients);

// GET /api/patients/:id - Retorna os detalhes de um paciente específico (com verificação de acesso).
router.get(
    '/:id', 
    [ param('id', 'ID do paciente inválido').isInt() ], 
    patientController.getPatientById
);

// <<< REMOVIDO: As rotas POST, PUT, e DELETE para / e /:id foram removidas. >>>
// A gestão de criação, edição e remoção de pacientes agora é exclusiva do painel de administração.


// --- Rotas de Programas e Sessões (Permanecem) ---

// POST /api/patients/:patientId/programs
router.post(
    '/:patientId/programs',
    [
        param('patientId', 'ID do paciente inválido').isInt(),
        body('programId', 'ID do programa é obrigatório').not().isEmpty(),
    ],
    patientController.assignProgramToPatient
);

// DELETE /api/patients/:patientId/programs/:programId
router.delete(
    '/:patientId/programs/:programId',
    [
        param('patientId', 'ID do paciente inválido').isInt(),
        param('programId', 'ID do programa inválido').notEmpty(),
    ],
    patientController.removeProgramFromPatient
);

// PATCH /api/patients/:patientId/programs/:programId/status
router.patch(
    '/:patientId/programs/:programId/status',
    [
        param('patientId', 'ID do paciente inválido').isInt(),
        param('programId', 'ID do programa inválido').notEmpty(),
        body('status', 'O status é obrigatório').isIn(['active', 'archived', 'completed']),
    ],
    patientController.updateProgramStatus
);

// POST /api/patients/:patientId/sessions
router.post(
    '/:patientId/sessions',
    [
        param('patientId', 'ID do paciente inválido').isInt(),
        body('programId', 'ID do programa é obrigatório').notEmpty(),
        body('date', 'A data da sessão é obrigatória').isISO8601().toDate(),
        body('score', 'A pontuação é obrigatória').isNumeric(),
    ],
    patientController.createSession
);

// PATCH /api/patients/:patientId/notes
router.patch(
    '/:patientId/notes',
    [
        param('patientId', 'ID do paciente inválido').isInt(),
        body('general_notes', 'O campo de anotações não pode estar vazio').exists(),
    ],
    patientController.updatePatientNotes
);


module.exports = router;
