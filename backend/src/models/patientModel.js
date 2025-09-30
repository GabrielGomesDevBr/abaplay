const pool = require('./db.js');
const { normalizeProgramsStatus } = require('../utils/statusNormalizer');

// Função auxiliar para buscar todos os dados de um paciente
const getFullPatientData = async (patientId) => {
    const patientQuery = `
        SELECT p.id, p.clinic_id, p.name, p.dob, p.diagnosis, p.general_notes, p.created_at, p.updated_at,
               p.guardian_name, p.guardian_relationship, p.patient_occupation, p.main_complaint, p.treatment_objectives,
               c.name as clinic_name
        FROM patients p
        JOIN clinics c ON p.clinic_id = c.id
        WHERE p.id = $1
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
            COALESCE(ppa.custom_trials, p.trials) AS trials,
            p.trials AS default_trials,
            ppa.custom_trials,
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
        default_trials: row.default_trials,
        custom_trials: row.custom_trials,
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
  async countByClinicId(clinicId) {
    const query = `SELECT COUNT(*) as count FROM patients WHERE clinic_id = $1`;
    const { rows } = await pool.query(query, [clinicId]);
    return parseInt(rows[0].count) || 0;
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
  },

  // ==========================================
  // MÉTODOS PARA DADOS EXPANDIDOS
  // ==========================================

  // Buscar dados completos expandidos de um paciente
  async getPatientExpandedData(patientId) {
    try {
      console.log(`[PATIENT-MODEL] Buscando dados expandidos para paciente ${patientId}`);

      // Buscar dados básicos (usa função existente)
      const baseData = await getFullPatientData(patientId);

      if (!baseData) {
        return null;
      }

      // Buscar dados expandidos da tabela principal
      const expandedQuery = `
        SELECT
          guardian_name, guardian_relationship, guardian_phone, guardian_email,
          guardian_occupation, guardian_education,
          second_guardian_name, second_guardian_relationship, second_guardian_phone,
          second_guardian_email, second_guardian_occupation,
          address_street, address_number, address_complement, address_neighborhood,
          address_city, address_state, address_zip,
          school_name, school_phone, school_email, school_teacher, school_teacher_phone,
          school_grade, school_period, school_special_needs, school_adaptations,
          birth_weight, birth_height, birth_complications, gestational_age, delivery_type,
          development_concerns, early_intervention,
          pediatrician_name, pediatrician_phone, pediatrician_email,
          health_insurance, health_insurance_number,
          allergies, dietary_restrictions, behavioral_notes, communication_preferences,
          expanded_data_completed, expanded_data_completed_by, expanded_data_completed_at
        FROM patients
        WHERE id = $1
      `;

      const expandedResult = await pool.query(expandedQuery, [patientId]);
      const expandedData = expandedResult.rows[0] || {};

      // Buscar medicações
      const medications = await this.getPatientMedications(patientId);

      // Buscar contatos de emergência
      const emergencyContacts = await this.getPatientEmergencyContacts(patientId);

      // Buscar histórico médico
      const medicalHistory = await this.getPatientMedicalHistory(patientId);

      // Buscar contatos profissionais
      const professionalContacts = await this.getPatientProfessionalContacts(patientId);

      console.log(`[PATIENT-MODEL] Dados expandidos carregados:`, {
        medications: medications.length,
        emergencyContacts: emergencyContacts.length,
        medicalHistory: medicalHistory.length,
        professionalContacts: professionalContacts.length
      });

      return {
        ...baseData,
        ...expandedData,
        medications,
        emergencyContacts,
        medicalHistory,
        professionalContacts
      };

    } catch (error) {
      console.error('[PATIENT-MODEL] Erro ao buscar dados expandidos:', error);
      throw error;
    }
  },

  // Buscar medicações do paciente
  async getPatientMedications(patientId) {
    const query = `
      SELECT pm.*, u.full_name as created_by_name
      FROM patient_medications pm
      JOIN users u ON pm.created_by = u.id
      WHERE pm.patient_id = $1
      ORDER BY pm.is_current DESC, pm.created_at DESC
    `;

    const { rows } = await pool.query(query, [patientId]);
    return rows;
  },

  // Buscar contatos de emergência do paciente
  async getPatientEmergencyContacts(patientId) {
    const query = `
      SELECT pec.*, u.full_name as created_by_name
      FROM patient_emergency_contacts pec
      JOIN users u ON pec.created_by = u.id
      WHERE pec.patient_id = $1 AND pec.is_active = true
      ORDER BY pec.priority_order ASC, pec.created_at ASC
    `;

    const { rows } = await pool.query(query, [patientId]);
    return rows;
  },

  // Buscar histórico médico do paciente
  async getPatientMedicalHistory(patientId) {
    const query = `
      SELECT pmh.*, u.full_name as created_by_name
      FROM patient_medical_history pmh
      JOIN users u ON pmh.created_by = u.id
      WHERE pmh.patient_id = $1
      ORDER BY pmh.diagnosis_date DESC NULLS LAST, pmh.created_at DESC
    `;

    const { rows } = await pool.query(query, [patientId]);
    return rows;
  },

  // Buscar contatos profissionais do paciente
  async getPatientProfessionalContacts(patientId) {
    const query = `
      SELECT ppc.*, u.full_name as created_by_name
      FROM patient_professional_contacts ppc
      JOIN users u ON ppc.created_by = u.id
      WHERE ppc.patient_id = $1 AND ppc.is_current = true
      ORDER BY ppc.professional_type ASC, ppc.created_at DESC
    `;

    const { rows } = await pool.query(query, [patientId]);
    return rows;
  },

  // Atualizar dados expandidos do paciente (transacional)
  async updatePatientExpandedData(patientId, expandedData, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      console.log(`[PATIENT-MODEL] Iniciando atualização de dados expandidos para paciente ${patientId}`);

      // 1. Atualizar campos na tabela principal
      if (expandedData.main) {
        await this.updatePatientMainExpandedData(client, patientId, expandedData.main, userId);
      }

      // 2. Atualizar medicações
      if (expandedData.medications) {
        await this.updatePatientMedications(client, patientId, expandedData.medications, userId);
      }

      // 3. Atualizar contatos de emergência
      if (expandedData.emergencyContacts) {
        await this.updatePatientEmergencyContacts(client, patientId, expandedData.emergencyContacts, userId);
      }

      // 4. Atualizar histórico médico
      if (expandedData.medicalHistory) {
        await this.updatePatientMedicalHistory(client, patientId, expandedData.medicalHistory, userId);
      }

      // 5. Atualizar contatos profissionais
      if (expandedData.professionalContacts) {
        await this.updatePatientProfessionalContacts(client, patientId, expandedData.professionalContacts, userId);
      }

      // 6. Marcar como completo se especificado
      if (expandedData.markAsCompleted) {
        await client.query(`
          UPDATE patients
          SET expanded_data_completed = true,
              expanded_data_completed_by = $1,
              expanded_data_completed_at = NOW(),
              updated_at = NOW()
          WHERE id = $2
        `, [userId, patientId]);
      }

      await client.query('COMMIT');
      console.log(`[PATIENT-MODEL] Dados expandidos atualizados com sucesso para paciente ${patientId}`);

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PATIENT-MODEL] Erro ao atualizar dados expandidos:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Atualizar campos principais expandidos
  async updatePatientMainExpandedData(client, patientId, mainData, userId) {
    const fields = [
      'guardian_name', 'guardian_relationship', 'guardian_phone', 'guardian_email',
      'guardian_occupation', 'guardian_education',
      'second_guardian_name', 'second_guardian_relationship', 'second_guardian_phone',
      'second_guardian_email', 'second_guardian_occupation',
      'address_street', 'address_number', 'address_complement', 'address_neighborhood',
      'address_city', 'address_state', 'address_zip',
      'school_name', 'school_phone', 'school_email', 'school_teacher', 'school_teacher_phone',
      'school_grade', 'school_period', 'school_special_needs', 'school_adaptations',
      'birth_weight', 'birth_height', 'birth_complications', 'gestational_age', 'delivery_type',
      'development_concerns', 'early_intervention',
      'pediatrician_name', 'pediatrician_phone', 'pediatrician_email',
      'health_insurance', 'health_insurance_number',
      'allergies', 'dietary_restrictions', 'behavioral_notes', 'communication_preferences'
    ];

    // Campos numéricos que precisam ser convertidos para null se vazios
    const numericFields = ['birth_weight', 'birth_height', 'gestational_age'];

    // Campos com CHECK CONSTRAINTS que precisam ser null se vazios (não aceitam strings vazias)
    const constraintFields = [
      'guardian_email', 'second_guardian_email', 'pediatrician_email', 'school_email',
      'school_period', 'delivery_type', 'address_state'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    fields.forEach(field => {
      if (mainData.hasOwnProperty(field)) {
        updateFields.push(`${field} = $${paramIndex}`);

        let value = mainData[field];

        // Converter strings vazias para null em campos numéricos
        if (numericFields.includes(field) && (value === '' || value === null || value === undefined)) {
          value = null;
        }

        // Converter strings vazias para null em campos com constraints do PostgreSQL
        // Isso resolve o problema de editar pacientes antigos
        if (constraintFields.includes(field) && (value === '' || value === null || value === undefined)) {
          value = null;
        }

        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      values.push(patientId);

      const query = `
        UPDATE patients
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await client.query(query, values);
      console.log(`[PATIENT-MODEL] Atualizados ${updateFields.length - 1} campos principais`);
    }
  },

  // Atualizar medicações do paciente
  async updatePatientMedications(client, patientId, medications, userId) {
    // Primeiro, marcar todas as medicações existentes como não atuais
    await client.query(`
      UPDATE patient_medications
      SET is_current = false, updated_at = NOW()
      WHERE patient_id = $1 AND is_current = true
    `, [patientId]);

    // Inserir/atualizar medicações atuais
    for (const med of medications) {
      if (med.id && med.id > 0) {
        // Atualizar medicação existente
        await client.query(`
          UPDATE patient_medications
          SET medication_name = $1, dosage = $2, frequency = $3,
              administration_time = $4, prescribing_doctor = $5, doctor_phone = $6,
              doctor_email = $7, doctor_specialty = $8, notes = $9,
              is_current = $10, updated_at = NOW(), updated_by = $11
          WHERE id = $12 AND patient_id = $13
        `, [
          med.medication_name, med.dosage, med.frequency, med.administration_time,
          med.prescribing_doctor, med.doctor_phone, med.doctor_email, med.doctor_specialty,
          med.notes, med.is_current || true, userId, med.id, patientId
        ]);
      } else {
        // Inserir nova medicação
        await client.query(`
          INSERT INTO patient_medications (
            patient_id, medication_name, dosage, frequency, administration_time,
            prescribing_doctor, doctor_phone, doctor_email, doctor_specialty,
            notes, is_current, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          patientId, med.medication_name, med.dosage, med.frequency, med.administration_time,
          med.prescribing_doctor, med.doctor_phone, med.doctor_email, med.doctor_specialty,
          med.notes, med.is_current || true, userId
        ]);
      }
    }
  },

  // Atualizar contatos de emergência
  async updatePatientEmergencyContacts(client, patientId, contacts, userId) {
    // Desativar contatos existentes
    await client.query(`
      UPDATE patient_emergency_contacts
      SET is_active = false, updated_at = NOW()
      WHERE patient_id = $1 AND is_active = true
    `, [patientId]);

    // Inserir/atualizar contatos atuais
    for (const contact of contacts) {
      if (contact.id && contact.id > 0) {
        // Atualizar contato existente
        await client.query(`
          UPDATE patient_emergency_contacts
          SET contact_name = $1, relationship = $2, phone_primary = $3, phone_secondary = $4,
              email = $5, address = $6, priority_order = $7, can_authorize_treatment = $8,
              can_pick_up_patient = $9, notes = $10, is_active = true, updated_at = NOW()
          WHERE id = $11 AND patient_id = $12
        `, [
          contact.contact_name, contact.relationship, contact.phone_primary, contact.phone_secondary,
          contact.email, contact.address, contact.priority_order, contact.can_authorize_treatment,
          contact.can_pick_up_patient, contact.notes, contact.id, patientId
        ]);
      } else {
        // Inserir novo contato
        await client.query(`
          INSERT INTO patient_emergency_contacts (
            patient_id, contact_name, relationship, phone_primary, phone_secondary,
            email, address, priority_order, can_authorize_treatment, can_pick_up_patient,
            notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          patientId, contact.contact_name, contact.relationship, contact.phone_primary,
          contact.phone_secondary, contact.email, contact.address, contact.priority_order,
          contact.can_authorize_treatment, contact.can_pick_up_patient, contact.notes, userId
        ]);
      }
    }
  },

  // Atualizar histórico médico
  async updatePatientMedicalHistory(client, patientId, history, userId) {
    // Não removemos histórico existente, apenas adicionamos/atualizamos
    for (const item of history) {
      if (item.id && item.id > 0) {
        // Atualizar item existente
        await client.query(`
          UPDATE patient_medical_history
          SET condition_name = $1, condition_type = $2, diagnosis_date = $3,
              treating_physician = $4, physician_specialty = $5, physician_phone = $6,
              physician_email = $7, treatment_status = $8, notes = $9,
              relevant_for_therapy = $10, updated_at = NOW(), updated_by = $11
          WHERE id = $12 AND patient_id = $13
        `, [
          item.condition_name, item.condition_type, item.diagnosis_date, item.treating_physician,
          item.physician_specialty, item.physician_phone, item.physician_email,
          item.treatment_status, item.notes, item.relevant_for_therapy, userId, item.id, patientId
        ]);
      } else {
        // Inserir novo item
        await client.query(`
          INSERT INTO patient_medical_history (
            patient_id, condition_name, condition_type, diagnosis_date, treating_physician,
            physician_specialty, physician_phone, physician_email, treatment_status,
            notes, relevant_for_therapy, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          patientId, item.condition_name, item.condition_type, item.diagnosis_date,
          item.treating_physician, item.physician_specialty, item.physician_phone,
          item.physician_email, item.treatment_status, item.notes, item.relevant_for_therapy, userId
        ]);
      }
    }
  },

  // Atualizar contatos profissionais
  async updatePatientProfessionalContacts(client, patientId, contacts, userId) {
    // Marcar contatos existentes como não atuais
    await client.query(`
      UPDATE patient_professional_contacts
      SET is_current = false, updated_at = NOW()
      WHERE patient_id = $1 AND is_current = true
    `, [patientId]);

    // Inserir/atualizar contatos atuais
    for (const contact of contacts) {
      if (contact.id && contact.id > 0) {
        // Atualizar contato existente
        await client.query(`
          UPDATE patient_professional_contacts
          SET professional_type = $1, professional_name = $2, clinic_name = $3,
              phone = $4, email = $5, specialty = $6, frequency_of_visits = $7,
              last_appointment = $8, next_appointment = $9, notes = $10,
              is_current = true, updated_at = NOW(), updated_by = $11
          WHERE id = $12 AND patient_id = $13
        `, [
          contact.professional_type, contact.professional_name, contact.clinic_name,
          contact.phone, contact.email, contact.specialty, contact.frequency_of_visits,
          contact.last_appointment, contact.next_appointment, contact.notes,
          userId, contact.id, patientId
        ]);
      } else {
        // Inserir novo contato
        await client.query(`
          INSERT INTO patient_professional_contacts (
            patient_id, professional_type, professional_name, clinic_name,
            phone, email, specialty, frequency_of_visits, last_appointment,
            next_appointment, notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          patientId, contact.professional_type, contact.professional_name, contact.clinic_name,
          contact.phone, contact.email, contact.specialty, contact.frequency_of_visits,
          contact.last_appointment, contact.next_appointment, contact.notes, userId
        ]);
      }
    }
  },

  // FUNÇÃO REMOVIDA: checkExpandedDataCompleteness
  // Motivo: Todos os campos expandidos são opcionais, métrica de completude não é necessária
};

module.exports = PatientModel;
