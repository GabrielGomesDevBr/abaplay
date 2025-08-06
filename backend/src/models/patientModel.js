const pool = require('./db.js');

// Função auxiliar para buscar todos os dados de um paciente
const getFullPatientData = async (patientId) => {
    const patientQuery = `
        SELECT id, clinic_id, name, dob, diagnosis, general_notes, created_at, updated_at
        FROM patients WHERE id = $1
    `;
    const patientResult = await pool.query(patientQuery, [patientId]);
    if (patientResult.rows.length === 0) return null;
    
    const patient = patientResult.rows[0];

    // --- CORREÇÃO PRINCIPAL ---
    // A query agora junta (JOIN) as tabelas até 'disciplines' para buscar o nome da disciplina.
    // Isso é crucial para o frontend poder agrupar os programas.
    const programsQuery = `
        SELECT
            p.id,
            p.name,
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
    
    // O objeto agora inclui o nome da disciplina.
    patient.assigned_programs = programsResult.rows.map(row => ({ 
        id: row.id, 
        name: row.name,
        status: row.status || 'active',
        discipline: row.discipline_name // Novo campo!
    }));

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
// As outras funções permanecem como na nossa última correção.

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
    const query = `
      SELECT p.id
      FROM patients p
      INNER JOIN therapist_patient_assignments tpa ON p.id = tpa.patient_id
      WHERE tpa.therapist_id = $1
      ORDER BY p.name ASC
    `;
    const result = await pool.query(query, [therapistId]);
    if (result.rows.length === 0) {
        return [];
    }
    const patientPromises = result.rows.map(row => getFullPatientData(row.id));
    return Promise.all(patientPromises);
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
  }
};

module.exports = PatientModel;
