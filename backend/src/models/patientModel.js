// backend/src/models/patientModel.js

const pool = require('./db.js');

const getFullPatientData = async (patientId) => {
    const patientQuery = `
        SELECT id, clinic_id, name, dob, diagnosis, general_notes, created_at, updated_at
        FROM patients WHERE id = $1
    `;
    const patientResult = await pool.query(patientQuery, [patientId]);
    if (patientResult.rows.length === 0) return null;
    
    const patient = patientResult.rows[0];

    const programsResult = await pool.query(
        `SELECT program_id, status FROM patient_programs WHERE patient_id = $1`, 
        [patientId]
    );
    patient.assigned_programs = programsResult.rows.map(row => ({ id: row.program_id, status: row.status || 'active' }));

    const sessionsResult = await pool.query(
      `SELECT id, program_id, session_date, score, is_baseline, notes, created_at FROM program_sessions WHERE patient_id = $1 ORDER BY session_date ASC, created_at ASC`,
      [patientId]
    );
    patient.sessionData = sessionsResult.rows.map(session => ({ ...session, score: parseFloat(session.score) }));

    return patient;
};

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

  // <<< CORREÇÃO CRÍTICA: A query estava correta, mas a forma de processar o resultado pode ser otimizada >>>
  // Esta função é a chave para o terapeuta ver os seus pacientes.
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
        console.log(`[findAllByTherapistId] Nenhum paciente encontrado para o terapeuta ID: ${therapistId}`);
        return [];
    }
    
    console.log(`[findAllByTherapistId] Encontrados ${result.rows.length} IDs de pacientes para o terapeuta ID: ${therapistId}`);
    // Usamos Promise.all para buscar os detalhes de todos os pacientes em paralelo.
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
  
  // O resto das funções (assignProgram, updateNotes, etc.) permanecem as mesmas
  // pois a lógica de permissão é tratada nos controladores.
  async assignProgram(patientId, programId) {
    const query = `INSERT INTO patient_programs (patient_id, program_id, status) VALUES ($1, $2, 'active') ON CONFLICT (patient_id, program_id) DO UPDATE SET status = 'active' RETURNING *`;
    const { rows } = await pool.query(query, [patientId, programId]);
    return rows[0];
  },
  async updateNotes(patientId, notes) {
      console.log(`[PatientModel.updateNotes] Tentando atualizar anotações para patientId: ${patientId}, anotações: ${notes ? notes.substring(0, 50) + '...' : 'null'}`); // Log de entrada
      try {
          const query = `UPDATE patients SET general_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, general_notes, updated_at`;
          const { rows } = await pool.query(query, [notes, patientId]);
          
          if (rows.length > 0) {
              console.log(`[PatientModel.updateNotes] Anotações atualizadas com sucesso para patientId: ${patientId}. Retorno:`, rows[0]); // Log de sucesso
              return rows[0];
          } else {
              console.warn(`[PatientModel.updateNotes] Nenhuma linha atualizada para patientId: ${patientId}. Paciente não encontrado?`); // Log de aviso
              return null; // Retorna null se nenhuma linha foi afetada (paciente não encontrado)
          }
      } catch (error) {
          console.error(`[PatientModel.updateNotes] Erro ao executar query para patientId: ${patientId}:`, error); // Log de erro na query
          throw error; // Relança o erro para ser tratado no controlador
      }
  },
  async createSession(patientId, sessionData) {
    const { programId, date, score, notes, isBaseline } = sessionData;
    const query = `INSERT INTO program_sessions (patient_id, program_id, session_date, score, is_baseline, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [patientId, programId, date, score, isBaseline || false, notes || null];
    const { rows } = await pool.query(query, values);
    return { ...rows[0], score: parseFloat(rows[0].score) };
  },
  async updateProgramStatus(patientId, programId, status) {
    const query = `UPDATE patient_programs SET status = $1 WHERE patient_id = $2 AND program_id = $3 RETURNING *`;
    const { rows } = await pool.query(query, [status, patientId, programId]);
    return rows[0];
  },
  async removeProgram(patientId, programId) {
    const query = `DELETE FROM patient_programs WHERE patient_id = $1 AND program_id = $2`;
    return (await pool.query(query, [patientId, programId])).rowCount;
  }
};

module.exports = PatientModel;
