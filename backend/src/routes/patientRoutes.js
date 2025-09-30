const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const patientController = require('../controllers/patientController.js');
const { verifyToken } = require('../middleware/authMiddleware.js');

// --- ROTAS CORRIGIDAS ---
// Mantemos apenas as rotas que gerenciam PACIENTES.
// A lógica de atribuir/remover programas foi movida para programRoutes.js.

// Rota para buscar todos os pacientes do terapeuta logado
router.get('/', verifyToken, patientController.getAllPatients);

// ==========================================
// ROTAS PARA DADOS EXPANDIDOS (APENAS ADMIN)
// ROTAS ESPECÍFICAS DEVEM VIR ANTES DAS GENÉRICAS
// ==========================================

// GET /api/patients/:id/expanded - Buscar dados expandidos (apenas admin)
router.get('/:id/expanded', verifyToken, patientController.getPatientExpandedData);

// ROTA REMOVIDA: GET /api/patients/:id/completeness
// Motivo: Funcionalidade de completude removida - todos os campos são opcionais

// PUT /api/patients/:id/expanded - Atualizar dados expandidos (apenas admin)
router.put('/:id/expanded',
    verifyToken,
    [
        // Validações básicas para dados principais
        // IMPORTANTE: optional({ values: 'falsy' }) aceita strings vazias, null, undefined
        body('main.guardian_email').optional({ values: 'falsy' }).isEmail().withMessage('Email do responsável inválido'),
        body('main.second_guardian_email').optional({ values: 'falsy' }).isEmail().withMessage('Email do segundo responsável inválido'),
        body('main.pediatrician_email').optional({ values: 'falsy' }).isEmail().withMessage('Email do pediatra inválido'),
        body('main.school_email').optional({ values: 'falsy' }).isEmail().withMessage('Email da escola inválido'),

        // Estados brasileiros - apenas valida se não estiver vazio
        body('main.address_state').optional({ values: 'falsy' }).isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres'),

        // Períodos e tipos - apenas valida se não estiver vazio
        body('main.school_period').optional({ values: 'falsy' }).isIn(['manhã', 'tarde', 'integral', 'noite']).withMessage('Período escolar inválido'),
        body('main.delivery_type').optional({ values: 'falsy' }).isIn(['normal', 'cesariana', 'fórceps', 'vácuo']).withMessage('Tipo de parto inválido'),

        // Validações para medicações (apenas formato)
        body('medications').optional().isArray().withMessage('Medicações devem ser um array'),

        // Validações para contatos de emergência (apenas formato)
        body('emergencyContacts').optional().isArray().withMessage('Contatos de emergência devem ser um array'),

        // Validações para histórico médico (apenas formato)
        body('medicalHistory').optional().isArray().withMessage('Histórico médico deve ser um array'),

        // Validações para contatos profissionais (apenas formato)
        body('professionalContacts').optional().isArray().withMessage('Contatos profissionais devem ser um array')
    ],
    patientController.updatePatientExpandedData
);

// ==========================================
// ROTAS GENÉRICAS (DEVEM VIR POR ÚLTIMO)
// ==========================================

// Rota para buscar um paciente específico por ID
router.get('/:id', verifyToken, patientController.getPatientById);

// Rota para atualizar as anotações de um paciente
// A rota original era PATCH, vamos mantê-la consistente.
router.patch(
    '/:patientId/notes',
    verifyToken,
    patientController.updatePatientNotes
);

module.exports = router;
