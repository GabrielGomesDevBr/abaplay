const pool = require('./db.js');
const { normalizeProgramsStatus } = require('../utils/statusNormalizer');

// Função auxiliar para buscar todos os dados de um paciente
const getFullPatientData = async (patientId) => {
    const patientQuery = `
        SELECT id, clinic_id, name, dob, diagnosis, general_notes, created_at, updated_at
        FROM patients WHERE id = $1
    `;
    const patientResult = await pool.query(patientQuery, [patientId]);
    if (patientResult.rows.length === 0) return null;
    
    const patient = patientResult.rows[0];

    // Query ajustada para incluir todos os status possíveis como na grade
    const programsQuery = `
        SELECT
            ppa.id AS assignment_id,
            p.id AS program_id,
            p.name AS program_name,
            p.objective,
            p.procedure,
            p.trials,
            ppa.status,
            d.name AS discipline_name
        FROM
            patient_program_assignments ppa
        JOIN programs p ON ppa.program_id = p.id
        JOIN program_sub_areas psa ON p.sub_area_id = psa.id
        JOIN program_areas pa ON psa.area_id = pa.id
        JOIN disciplines d ON pa.discipline_id = d.id
        WHERE ppa.patient_id = $1;
    `;
    const programsResult = await pool.query(programsQuery, [patientId]);
    
    console.log(`[DEBUG-PATIENT] Paciente ${patientId} - Total programas carregados:`, programsResult.rows.length);
    console.log('[DEBUG-PATIENT] Status dos programas:', 
        programsResult.rows.map(r => ({ name: r.program_name, status: r.status, discipline: r.discipline_name }))
    );
    
    // Mapeia os dados e aplica normalização de status
    const rawPrograms = programsResult.rows.map(row => ({ 
        assignment_id: row.assignment_id,
        program_id: row.program_id,
        program_name: row.program_name,
        objective: row.objective,
        procedure: row.procedure,
        trials: row.trials,
        status: row.status,
        discipline_name: row.discipline_name
    }));
    
    // Normaliza todos os status usando o utilitário
    patient.assigned_programs = normalizeProgramsStatus(rawPrograms);
    
    console.log(`[DEBUG-PATIENT] Programas ativos após normalização:`, 
        patient.assigned_programs.filter(p => p.status === 'active').length
    );

    // A busca de sessões permanece a mesma.
    const sessionsResult = await pool.query(
      `SELECT 
         ppp.id, ppa.program_id, ppp.session_date, ppp.score, ppp.details, ppp.created_at 
       FROM patient_program_progress ppp
       JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
       WHERE ppa.patient_id = $1 ORDER BY ppp.session_date ASC, ppp.created_at ASC`,
      [patientId]
    );
    patient.sessionData = sessionsResult.rows.map(session => ({ 
        ...session, 
        score: parseFloat(session.score),
        is_baseline: session.details?.is_baseline || false,
        notes: session.details?.notes || null
    }));

    return patient;
};


// --- O RESTANTE DO MODELO ---
// As outras funções permanecem como estavam.

const PatientModel = {
  async create(patientData, clinicId) {
    if (!clinicId) throw new Error("O ID da clínica é obrigatório para criar um paciente.");
    const { name, dob, diagnosis, general_notes } = patientData;
    const query = `
      INSERT INTO patients (clinic_id, name, dob, diagnosis, general_notes)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    const values = [clinicId, name, dob || null, diagnosis || null, general_notes || null];
    const { rows } = await pool.query(query, values);
    return getFullPatientData(rows[0].id);
  },
  async findById(patientId) {
    return getFullPatientData(patientId);
  },
  async findAllByTherapistId(therapistId) {
    console.log(`[MODEL-LOG] findAllByTherapistId: Buscando pacientes para terapeuta ${therapistId}`);
    const query = `
      SELECT p.id
      FROM patients p
      INNER JOIN therapist_patient_assignments tpa ON p.id = tpa.patient_id
      WHERE tpa.therapist_id = $1
      ORDER BY p.name ASC
    `;
    const result = await pool.query(query, [therapistId]);
    console.log(`[MODEL-LOG] findAllByTherapistId: Query retornou ${result.rows.length} registros`);
    
    if (result.rows.length === 0) {
        console.log('[MODEL-LOG] findAllByTherapistId: Nenhum paciente encontrado');
        return [];
    }
    
    console.log('[MODEL-LOG] findAllByTherapistId: Carregando dados completos dos pacientes');
    const patientPromises = result.rows.map(row => getFullPatientData(row.id));
    const patients = await Promise.all(patientPromises);
    console.log(`[MODEL-LOG] findAllByTherapistId: ${patients.length} pacientes carregados com sucesso`);
    return patients;
  },
  async findAllByClinicId(clinicId) {
    const query = `SELECT id FROM patients WHERE clinic_id = $1 ORDER BY name ASC`;
    const result = await pool.query(query, [clinicId]);
    if (result.rows.length === 0) return [];
    const patientPromises = result.rows.map(row => getFullPatientData(row.id));
    return Promise.all(patientPromises);
  },
  async isTherapistAssigned(patientId, therapistId) {
    const query = 'SELECT 1 FROM therapist_patient_assignments WHERE patient_id = $1 AND therapist_id = $2';
    const { rowCount } = await pool.query(query, [patientId, therapistId]);
    return rowCount > 0;
  },
  async adminDelete(patientId, clinicId) {
    const query = `DELETE FROM patients WHERE id = $1 AND clinic_id = $2`;
    const { rowCount } = await pool.query(query, [patientId, clinicId]);
    return rowCount;
  },
  async assignProgram(patientId, programId) {
    const query = `INSERT INTO patient_program_assignments (patient_id, program_id, status) VALUES ($1, $2, 'active') ON CONFLICT (patient_id, program_id) DO UPDATE SET status = 'active' RETURNING *`;
    const { rows } = await pool.query(query, [patientId, programId]);
    return rows[0];
  },
  async updateNotes(patientId, notes) {
      try {
          const query = `UPDATE patients SET general_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, general_notes, updated_at`;
          const { rows } = await pool.query(query, [notes, patientId]);
          return rows.length > 0 ? rows[0] : null;
      } catch (error) {
          console.error(`[PatientModel.updateNotes] Erro ao executar query para patientId: ${patientId}:`, error);
          throw error;
      }
  },
  async createSession(patientId, sessionData) {
    console.error("CHAMADA A UMA FUNÇÃO DESATUALIZADA: PatientModel.createSession.");
    throw new Error("Não é possível registrar a sessão. A funcionalidade foi atualizada para registrar progresso por etapa do programa.");
  },
  async updateProgramStatus(patientId, programId, status) {
    const query = `UPDATE patient_program_assignments SET status = $1 WHERE patient_id = $2 AND program_id = $3 RETURNING *`;
    const { rows } = await pool.query(query, [status, patientId, programId]);
    return rows[0];
  },
  async removeProgram(patientId, programId) {
    const query = `DELETE FROM patient_program_assignments WHERE patient_id = $1 AND program_id = $2`;
    return (await pool.query(query, [patientId, programId])).rowCount;
  },
  
  // Nova função para buscar terapeutas atribuídos ao paciente
  async getAssignedTherapists(patientId) {
    console.log(`[MODEL-LOG] getAssignedTherapists: Buscando terapeutas para paciente ${patientId}`);
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.role,
        u.created_at,
        COUNT(DISTINCT p.id) as total_patients
      FROM users u
      INNER JOIN therapist_patient_assignments tpa ON u.id = tpa.therapist_id
      LEFT JOIN therapist_patient_assignments tpa2 ON u.id = tpa2.therapist_id
      LEFT JOIN patients p ON tpa2.patient_id = p.id
      WHERE tpa.patient_id = $1 
        AND (u.role = 'therapist' OR u.role = 'terapeuta')
      GROUP BY u.id, u.full_name, u.role, u.created_at
      ORDER BY u.full_name ASC
    `;
    
    const { rows } = await pool.query(query, [patientId]);
    console.log(`[MODEL-LOG] getAssignedTherapists: Encontrados ${rows.length} terapeutas`);
    
    return rows.map(row => ({
      id: row.id,
      full_name: row.full_name,
      role: row.role,
      total_patients: parseInt(row.total_patients),
      created_at: row.created_at
    }));
  }
};

module.exports = PatientModel;
