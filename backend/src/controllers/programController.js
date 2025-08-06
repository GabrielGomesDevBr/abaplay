// backend/src/controllers/programController.js

const db = require('../models/db'); // Mantido para as outras funções que ainda usam
// --- ALTERAÇÃO ---
// Importa a nova função que criamos no passo anterior.
const { getAllProgramsStructured, getProgramById, getAssignmentById } = require('../models/programModel');

/**
 * @description Busca todos os programas de forma estruturada.
 * @route GET /api/programs
 * @access Private
 */
exports.getAllPrograms = async (req, res) => {
    try {
        const structuredData = await getAllProgramsStructured();
        res.json(structuredData);
    } catch (error) {
        res.status(500).send('Erro ao buscar os programas.');
    }
};

/**
 * @description Busca os detalhes de um programa específico pelo ID.
 * @route GET /api/programs/:programId
 * @access Private
 */
exports.getProgramDetails = async (req, res) => {
    try {
        const { programId } = req.params;
        const program = await getProgramById(programId);

        if (!program) {
            return res.status(404).send('Programa não encontrado.');
        }

        res.json(program);
    } catch (error) {
        res.status(500).send('Erro ao buscar detalhes do programa.');
    }
};

/**
 * --- NOVA FUNÇÃO ---
 * @description Busca os detalhes de uma designação de programa específica.
 * @route GET /api/programs/assignment/:assignmentId
 * @access Private
 */
exports.getAssignmentDetails = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await getAssignmentById(assignmentId);

        if (!assignment) {
            return res.status(404).send('Designação de programa não encontrada.');
        }

        res.json(assignment);
    } catch (error) {
        // O erro já é logado no Model.
        res.status(500).send('Erro ao buscar detalhes da designação.');
    }
};


// --- O RESTANTE DAS FUNÇÕES PERMANECE INALTERADO ---

exports.assignProgramToPatient = async (req, res) => {
    const { patientId, programId } = req.body;
    const therapistId = req.user.id;
    try {
        const query = `INSERT INTO patient_program_assignments (patient_id, program_id, therapist_id) VALUES ($1, $2, $3) RETURNING *;`;
        const { rows } = await db.query(query, [patientId, programId, therapistId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao designar programa:', error);
        if (error.code === '23505') { return res.status(409).send('Este programa já foi designado a este paciente.'); }
        res.status(500).send('Erro interno ao designar programa.');
    }
};

exports.getAssignedProgramsForPatient = async (req, res) => {
    const { patientId } = req.params;
    try {
        const query = `
            SELECT
                ppa.id AS assignment_id, ppa.status, p.id AS program_id,
                p.name AS program_name, p.objective
            FROM patient_program_assignments ppa JOIN programs p ON ppa.program_id = p.id
            WHERE ppa.patient_id = $1;
        `;
        const { rows } = await db.query(query, [patientId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar programas designados:', error);
        res.status(500).send('Erro ao buscar programas designados.');
    }
};

exports.recordEvolution = async (req, res) => {
    const { assignmentId, stepId, sessionDate, attempts, successes, score, details } = req.body;
    const therapistId = req.user.id;
    try {
        const query = `
            INSERT INTO patient_program_progress
                (assignment_id, step_id, therapist_id, session_date, attempts, successes, score, details)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const values = [assignmentId, stepId, therapistId, sessionDate, attempts, successes, score, details];
        const { rows } = await db.query(query, values);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Erro ao registrar evolução:', error);
        res.status(500).send('Erro ao registrar evolução.');
    }
};

exports.getEvolutionForPatient = async (req, res) => {
    const { patientId, programId } = req.params;
    try {
        const query = `
            SELECT
                ppp.id, ppp.session_date, ppp.attempts, ppp.successes, ppp.score, ppp.details,
                pst.id as step_id, pst.step_number, pst.name as step_name
            FROM patient_program_progress ppp
            JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
            JOIN program_steps pst ON ppp.step_id = pst.id
            WHERE ppa.patient_id = $1 AND ppa.program_id = $2
            ORDER BY ppp.session_date, pst.step_number;
        `;
        const { rows } = await db.query(query, [patientId, programId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar evolução do paciente:', error);
        res.status(500).send('Erro ao buscar evolução do paciente.');
    }
};

exports.getConsolidatedEvolutionData = async (req, res) => {
    const { patientId } = req.params;
    try {
        const query = `
            SELECT
                p.id as program_id, p.name as program_name, pst.id as step_id, pst.name as step_name,
                pst.step_number, ppp.session_date, ppp.score
            FROM patient_program_progress ppp
            JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
            JOIN programs p ON ppa.program_id = p.id
            JOIN program_steps pst ON ppp.step_id = pst.id
            WHERE ppa.patient_id = $1
            ORDER BY p.name, pst.step_number, ppp.session_date;
        `;
        const { rows } = await db.query(query, [patientId]);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar dados consolidados de evolução:', error);
        res.status(500).send('Erro ao buscar dados consolidados de evolução.');
    }
};
