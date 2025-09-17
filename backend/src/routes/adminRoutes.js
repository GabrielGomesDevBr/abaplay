// backend/src/routes/adminRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const { verifyToken } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Middleware para verificar se o utilizador tem o papel de administrador
const verifyAdminRole = (req, res, next) => {
    if (req.user && req.user.is_admin) {
        next();
    } else {
        console.warn(`Tentativa de acesso à rota de admin por utilizador não-admin (ID: ${req.user?.userId}).`);
        return res.status(403).json({ errors: [{ msg: 'Acesso negado. Recurso disponível apenas para administradores.' }] });
    }
};

// Aplica a verificação de token e de admin para todas as rotas deste ficheiro
router.use(verifyToken, verifyAdminRole);


// --- ROTAS DE GESTÃO DE UTILIZADORES ---

router.get('/users', adminController.getAllUsers);

router.post(
    '/users',
    [
        body('fullName', 'O nome completo é obrigatório.').not().isEmpty().trim(),
        body('username', 'O nome de utilizador é obrigatório.').not().isEmpty().trim(),
        body('password', 'A senha deve ter pelo menos 6 caracteres.').isLength({ min: 6 }),
        body('role', 'A função (role) é obrigatória e deve ser "terapeuta" ou "pai".').isIn(['terapeuta', 'pai']),
        body('associated_patient_id', 'ID do paciente inválido.').optional({ checkFalsy: true }).isInt()
    ],
    adminController.createUser
);

router.put(
    '/users/:userId',
    [
        param('userId', 'ID do utilizador inválido.').isInt(),
        body('fullName', 'O nome completo é obrigatório.').not().isEmpty().trim(),
        body('username', 'O nome de utilizador é obrigatório.').not().isEmpty().trim(),
        body('password', 'A senha deve ter pelo menos 6 caracteres.').optional({ checkFalsy: true }).isLength({ min: 6 }),
        body('role', 'A função (role) é obrigatória e deve ser "terapeuta" ou "pai".').isIn(['terapeuta', 'pai']),
    ],
    adminController.updateUser
);

router.delete(
    '/users/:userId',
    [
        param('userId', 'ID do utilizador inválido.').isInt()
    ],
    adminController.deleteUser
);

// <<< NOVAS ROTAS PARA TRANSFERÊNCIA DE TERAPEUTAS >>>
router.get(
    '/users/:userId/assignments',
    [
        param('userId', 'ID do utilizador inválido.').isInt()
    ],
    adminController.getTherapistAssignments
);

router.post(
    '/users/:userId/transfer',
    [
        param('userId', 'ID do utilizador inválido.').isInt(),
        body('transferList', 'Lista de transferências é obrigatória.').isArray().notEmpty(),
        body('transferList.*.assignment_id', 'ID da atribuição inválido.').isInt(),
        body('transferList.*.to_therapist_id', 'ID do terapeuta destino inválido.').isInt()
    ],
    adminController.transferTherapistAssignments
);


// --- ROTAS DE GESTÃO DE PACIENTES ---

router.get('/patients', adminController.getAllPatients);

router.post(
    '/patients',
    [
        body('name', 'O nome do paciente é obrigatório.').not().isEmpty().trim(),
        body('dob', 'A data de nascimento deve ser uma data válida.').optional({ checkFalsy: true }).isISO8601().toDate(),
    ],
    adminController.createPatient
);

// <<< NOVO: Rota para apagar um paciente existente >>>
// DELETE /api/admin/patients/:patientId
router.delete(
    '/patients/:patientId',
    [
        param('patientId', 'ID do paciente inválido.').isInt()
    ],
    adminController.deletePatient
);


// --- ROTAS DE GESTÃO DE ATRIBUIÇÕES ---

router.get(
    '/assignments/:patientId',
    [ param('patientId', 'ID do paciente inválido.').isInt() ],
    adminController.getPatientAssignments
);

router.put(
    '/assignments/:patientId',
    [
        param('patientId', 'ID do paciente inválido.').isInt(),
        body('therapistIds', 'therapistIds deve ser um array de números.').isArray(),
        body('therapistIds.*', 'Cada ID de terapeuta deve ser um número inteiro.').isInt()
    ],
    adminController.updatePatientAssignments
);

module.exports = router;
