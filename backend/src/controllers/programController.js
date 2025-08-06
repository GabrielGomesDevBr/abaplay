const db = require('../models/db');

// Helper para aninhar os dados. Esta função está correta.
const structureData = (rows) => {
    const disciplines = {};
    if (!rows || rows.length === 0) return [];
    rows.forEach(row => {
        if (!row.discipline_id) return;
        if (!disciplines[row.discipline_id]) {
            disciplines[row.discipline_id] = { id: row.discipline_id, name: row.discipline_name, areas: {} };
        }
        const currentDiscipline = disciplines[row.discipline_id];
        if (row.area_id) {
            if (!currentDiscipline.areas[row.area_id]) {
                currentDiscipline.areas[row.area_id] = { id: row.area_id, name: row.area_name, sub_areas: {} };
            }
            const currentArea = currentDiscipline.areas[row.area_id];
            if (row.sub_area_id) {
                if (!currentArea.sub_areas[row.sub_area_id]) {
                    currentArea.sub_areas[row.sub_area_id] = { id: row.sub_area_id, name: row.sub_area_name, programs: {} };
                }
                const currentSubArea = currentArea.sub_areas[row.sub_area_id];
                if (row.program_id) {
                    if (!currentSubArea.programs[row.program_id]) {
                        currentSubArea.programs[row.program_id] = { id: row.program_id, name: row.program_name, objective: row.program_objective, steps: {} };
                    }
                    const currentProgram = currentSubArea.programs[row.program_id];
                    if (row.step_id) {
                        if (!currentProgram.steps[row.step_id]) {
                            currentProgram.steps[row.step_id] = { id: row.step_id, step_number: row.step_number, name: row.step_name, description: row.step_description, instructions: [] };
                        }
                        const currentStep = currentProgram.steps[row.step_id];
                        if (row.instruction_id && !currentStep.instructions.some(inst => inst.id === row.instruction_id)) {
                            currentStep.instructions.push({ id: row.instruction_id, type: row.instruction_type, description: row.instruction_description });
                        }
                    }
                }
            }
        }
    });
    return Object.values(disciplines).map(d => ({ ...d, areas: Object.values(d.areas).map(a => ({ ...a, sub_areas: Object.values(a.sub_areas).map(sa => ({ ...sa, programs: Object.values(sa.programs).map(p => ({ ...p, steps: Object.values(p.steps) })) })) })) }));
};

exports.getAllPrograms = async (req, res) => {
    try {
        // --- CORREÇÃO DEFINITIVA NA QUERY SQL ---
        // A query foi reescrita para garantir que a cascata de LEFT JOINs
        // funcione corretamente desde a tabela de mais alto nível (disciplines)
        // até a de mais baixo nível (instructions).
        const query = `
            SELECT
                d.id AS discipline_id, d.name AS discipline_name,
                pa.id AS area_id, pa.name AS area_name,
                psa.id AS sub_area_id, psa.name AS sub_area_name,
                p.id AS program_id, p.name AS program_name, p.objective AS program_objective,
                pst.id AS step_id, pst.step_number, pst.name AS step_name, pst.description AS step_description,
                psi.id AS instruction_id, psi.instruction_type, psi.description AS instruction_description
            FROM
                disciplines d
            LEFT JOIN program_areas pa ON d.id = pa.discipline_id
            LEFT JOIN program_sub_areas psa ON pa.id = psa.area_id
            LEFT JOIN programs p ON psa.id = p.sub_area_id
            LEFT JOIN program_steps pst ON p.id = pst.program_id
            LEFT JOIN program_step_instructions psi ON pst.id = psi.step_id
            ORDER BY
                d.name, pa.name, psa.name, p.name, pst.step_number;
        `;
        const { rows } = await db.query(query);
        const structuredData = structureData(rows);
        
        console.log('[DEBUG Backend] Estrutura de dados final enviada para o frontend:', JSON.stringify(structuredData, null, 2));
        res.json(structuredData);
    } catch (error) {
        console.error('Erro ao buscar programas do banco de dados:', error);
        res.status(500).send('Erro ao buscar os programas.');
    }
};

// --- O RESTANTE DO ARQUIVO PERMANECE IGUAL ---
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
