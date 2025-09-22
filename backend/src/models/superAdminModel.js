// backend/src/models/superAdminModel.js

const pool = require('./db.js');

/**
 * Modelo para operações de super administrador.
 */
const SuperAdminModel = {

  /**
   * Cria uma nova clínica com seu administrador.
   * @param {object} clinicData - Dados da clínica e admin.
   * @returns {Promise<object>} Clínica e usuário criados.
   */
  async createClinicWithAdmin(clinicData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        clinic_name,
        max_patients = 50,
        admin_name,
        admin_username
      } = clinicData;

      // 1. Criar clínica
      const clinicQuery = `
        INSERT INTO clinics (name, max_patients)
        VALUES ($1, $2)
        RETURNING id, name, max_patients, created_at
      `;
      const clinicResult = await client.query(clinicQuery, [clinic_name, max_patients]);
      const clinic = clinicResult.rows[0];

      // 2. Criar usuário administrador
      const userQuery = `
        INSERT INTO users (clinic_id, username, full_name, role, is_admin, password_hash)
        VALUES ($1, $2, $3, 'terapeuta', TRUE, NULL)
        RETURNING id, username, full_name, role, is_admin, created_at
      `;
      const userResult = await client.query(userQuery, [
        clinic.id,
        admin_username,
        admin_name
      ]);
      const admin = userResult.rows[0];

      // 3. Não criar cobrança inicial - será criada conforme demanda real de pacientes
      // O modelo de negócio é baseado na quantidade de pacientes por clínica

      await client.query('COMMIT');

      return {
        clinic,
        admin
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Busca todas as clínicas com informações detalhadas.
   * @param {object} filters - Filtros opcionais.
   * @returns {Promise<Array<object>>} Lista de clínicas.
   */
  async getAllClinicsDetailed(filters = {}) {
    let whereConditions = ['c.id IS NOT NULL'];
    let values = [];
    let valueIndex = 1;

    if (filters.status) {
      whereConditions.push(`c.status = $${valueIndex++}`);
      values.push(filters.status);
    }

    if (filters.search) {
      whereConditions.push(`c.name ILIKE $${valueIndex++}`);
      values.push(`%${filters.search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        c.id,
        c.name,
        c.max_patients,
        c.status,
        c.created_at,
        c.suspended_at,
        c.suspension_reason,
        
        -- Contadores
        (SELECT COUNT(*) FROM users u WHERE u.clinic_id = c.id) as total_users,
        (SELECT COUNT(*) FROM users u WHERE u.clinic_id = c.id AND u.role = 'terapeuta') as therapists_count,
        (SELECT COUNT(*) FROM users u WHERE u.clinic_id = c.id AND u.role = 'pai') as parents_count,
        (SELECT COUNT(*) FROM patients p WHERE p.clinic_id = c.id) as patients_count,
        
        -- Admin info
        (SELECT u.full_name FROM users u WHERE u.clinic_id = c.id AND u.is_admin = true LIMIT 1) as admin_name,
        (SELECT u.username FROM users u WHERE u.clinic_id = c.id AND u.is_admin = true LIMIT 1) as admin_username,
        
        -- Informações financeiras
        (SELECT COUNT(*) FROM clinic_billing cb WHERE cb.clinic_id = c.id AND cb.status = 'overdue') as overdue_bills,
        (SELECT cb.due_date FROM clinic_billing cb WHERE cb.clinic_id = c.id AND cb.status = 'pending' ORDER BY cb.due_date ASC LIMIT 1) as next_due_date,
        (SELECT cb.amount FROM clinic_billing cb WHERE cb.clinic_id = c.id AND cb.status = 'pending' ORDER BY cb.due_date ASC LIMIT 1) as next_amount,
        
        -- Atividade recente
        (SELECT MAX(u.updated_at) FROM users u WHERE u.clinic_id = c.id) as last_activity

      FROM clinics c
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    return rows;
  },

  /**
   * Suspende uma clínica.
   * @param {number} clinicId - ID da clínica.
   * @param {string} reason - Motivo da suspensão.
   * @returns {Promise<object>} Clínica atualizada.
   */
  async suspendClinic(clinicId, reason) {
    const query = `
      UPDATE clinics 
      SET 
        status = 'suspended',
        suspended_at = CURRENT_TIMESTAMP,
        suspension_reason = $1
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(query, [reason, clinicId]);
    return rows[0];
  },

  /**
   * Reativa uma clínica.
   * @param {number} clinicId - ID da clínica.
   * @returns {Promise<object>} Clínica atualizada.
   */
  async reactivateClinic(clinicId) {
    const query = `
      UPDATE clinics 
      SET 
        status = 'active',
        suspended_at = NULL,
        suspension_reason = NULL,
        reactivated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [clinicId]);
    return rows[0];
  },

  /**
   * Atualiza o limite de pacientes de uma clínica.
   * @param {number} clinicId - ID da clínica.
   * @param {number} maxPatients - Novo limite.
   * @returns {Promise<object>} Clínica atualizada.
   */
  async updatePatientLimit(clinicId, maxPatients) {
    const query = `
      UPDATE clinics 
      SET max_patients = $1
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(query, [maxPatients, clinicId]);
    return rows[0];
  },

  /**
   * Busca métricas gerais do sistema.
   * @returns {Promise<object>} Métricas do sistema.
   */
  async getSystemMetrics() {
    const query = `
      SELECT 
        -- Contadores de clínicas
        COUNT(DISTINCT c.id) as total_clinics,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clinics,
        COUNT(DISTINCT CASE WHEN c.status = 'suspended' THEN c.id END) as suspended_clinics,
        
        -- Contadores de usuários
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.role = 'terapeuta' THEN u.id END) as therapists_count,
        COUNT(DISTINCT CASE WHEN u.role = 'pai' THEN u.id END) as parents_count,
        COUNT(DISTINCT CASE WHEN u.is_admin = true THEN u.id END) as admins_count,
        
        -- Contadores de pacientes
        COUNT(DISTINCT p.id) as total_patients,
        
        -- Crescimento mensal
        COUNT(DISTINCT CASE WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as new_clinics_month,
        COUNT(DISTINCT CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN u.id END) as new_users_month,
        
        -- Média de pacientes por clínica
        ROUND(AVG((SELECT COUNT(*) FROM patients p2 WHERE p2.clinic_id = c.id)), 1) as avg_patients_per_clinic

      FROM clinics c
      LEFT JOIN users u ON c.id = u.clinic_id
      LEFT JOIN patients p ON c.id = p.clinic_id
      WHERE c.id IS NOT NULL
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  },

  /**
   * Busca log de atividades do sistema.
   * @param {number} limit - Limite de registros (padrão: 50).
   * @returns {Promise<Array<object>>} Log de atividades.
   */
  async getActivityLog(limit = 50) {
    const query = `
      SELECT 
        'clinic_created' as action_type,
        c.name as entity_name,
        c.created_at as action_date,
        'Nova clínica criada' as description,
        c.id as entity_id
      FROM clinics c
      WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'clinic_suspended' as action_type,
        c.name as entity_name,
        c.suspended_at as action_date,
        'Clínica suspensa: ' || COALESCE(c.suspension_reason, 'Motivo não informado') as description,
        c.id as entity_id
      FROM clinics c
      WHERE c.suspended_at IS NOT NULL AND c.suspended_at >= CURRENT_DATE - INTERVAL '30 days'
      
      UNION ALL
      
      SELECT 
        'user_created' as action_type,
        u.full_name as entity_name,
        u.created_at as action_date,
        'Novo usuário: ' || u.role as description,
        u.id as entity_id
      FROM users u
      WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days' AND u.clinic_id IS NOT NULL
      
      ORDER BY action_date DESC
      LIMIT $1
    `;

    const { rows } = await pool.query(query, [limit]);
    return rows;
  },

  /**
   * Busca estatísticas de crescimento.
   * @param {number} months - Número de meses (padrão: 6).
   * @returns {Promise<Array<object>>} Crescimento por mês.
   */
  async getGrowthStats(months = 6) {
    const query = `
      SELECT 
        TO_CHAR(date_trunc('month', month_date), 'YYYY-MM') as month,
        TO_CHAR(date_trunc('month', month_date), 'Mon/YY') as month_label,
        COALESCE(new_clinics, 0) as new_clinics,
        COALESCE(new_users, 0) as new_users,
        COALESCE(new_patients, 0) as new_patients
      FROM (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${months} months', 
          CURRENT_DATE, 
          '1 month'::interval
        )::date as month_date
      ) months
      LEFT JOIN (
        SELECT 
          date_trunc('month', c.created_at) as month,
          COUNT(*) as new_clinics
        FROM clinics c
        WHERE c.created_at >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY date_trunc('month', c.created_at)
      ) clinics_data ON months.month_date = clinics_data.month
      LEFT JOIN (
        SELECT 
          date_trunc('month', u.created_at) as month,
          COUNT(*) as new_users
        FROM users u
        WHERE u.created_at >= CURRENT_DATE - INTERVAL '${months} months' AND u.clinic_id IS NOT NULL
        GROUP BY date_trunc('month', u.created_at)
      ) users_data ON months.month_date = users_data.month
      LEFT JOIN (
        SELECT 
          date_trunc('month', p.created_at) as month,
          COUNT(*) as new_patients
        FROM patients p
        WHERE p.created_at >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY date_trunc('month', p.created_at)
      ) patients_data ON months.month_date = patients_data.month
      ORDER BY month_date ASC
    `;

    const { rows } = await pool.query(query);
    return rows;
  },

  /**
   * Busca uma clínica específica pelo ID.
   * @param {number} clinicId - ID da clínica.
   * @returns {Promise<object>} Dados da clínica.
   */
  async getClinicById(clinicId) {
    const query = `
      SELECT 
        c.*,
        COUNT(DISTINCT p.id) as current_patients,
        COUNT(DISTINCT CASE WHEN u.role = 'terapeuta' THEN u.id END) as therapists_count,
        COUNT(DISTINCT CASE WHEN u.role = 'pai' THEN u.id END) as parents_count
      FROM clinics c
      LEFT JOIN patients p ON c.id = p.clinic_id
      LEFT JOIN users u ON c.id = u.clinic_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const { rows } = await pool.query(query, [clinicId]);
    return rows[0];
  },

  /**
   * Resetar senha do administrador de uma clínica (seta como NULL para forçar novo cadastro).
   * @param {number} clinicId - ID da clínica.
   * @returns {Promise<object>} Usuário atualizado.
   */
  async resetClinicAdminPassword(clinicId) {
    const query = `
      UPDATE users 
      SET password_hash = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE clinic_id = $1 AND is_admin = true
      RETURNING id, username, full_name, role, is_admin, updated_at
    `;

    const { rows } = await pool.query(query, [clinicId]);
    
    if (rows.length === 0) {
      throw new Error('Administrador da clínica não encontrado');
    }
    
    return rows[0];
  },

  /**
   * Elimina uma clínica com efeito cascata.
   * @param {number} clinicId - ID da clínica.
   * @returns {Promise<object>} Resultado da eliminação.
   */
  async deleteClinicCascade(clinicId) {
    // Verificar se a clínica existe
    const clinicQuery = `SELECT name FROM clinics WHERE id = $1`;
    const clinicResult = await pool.query(clinicQuery, [clinicId]);

    if (!clinicResult.rows[0]) {
      throw new Error(`Clínica com ID ${clinicId} não encontrada`);
    }

    const clinicName = clinicResult.rows[0].name;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Eliminar em ordem de dependências (das folhas para a raiz)
      const notificationsResult = await client.query(
        'DELETE FROM notificationstatus WHERE "userId" IN (SELECT id FROM users WHERE clinic_id = $1) OR "patientId" IN (SELECT id FROM patients WHERE clinic_id = $1)',
        [clinicId]
      );

      const caseDiscussionsResult = await client.query(
        'DELETE FROM case_discussions WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)',
        [clinicId]
      );

      const parentChatsResult = await client.query(
        'DELETE FROM parent_therapist_chat WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)',
        [clinicId]
      );

      const programSessionsResult = await client.query(
        'DELETE FROM program_sessions WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)',
        [clinicId]
      );

      const progressResult = await client.query(
        'DELETE FROM patient_program_progress WHERE assignment_id IN (SELECT id FROM patient_program_assignments WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1))',
        [clinicId]
      );

      const therapistAssignmentsResult = await client.query(
        'DELETE FROM therapist_patient_assignments WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)',
        [clinicId]
      );

      const programAssignmentsResult = await client.query(
        'DELETE FROM patient_program_assignments WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)',
        [clinicId]
      );

      const billingsResult = await client.query(
        'DELETE FROM clinic_billing WHERE clinic_id = $1',
        [clinicId]
      );

      const patientsResult = await client.query(
        'DELETE FROM patients WHERE clinic_id = $1',
        [clinicId]
      );

      const usersResult = await client.query(
        'DELETE FROM users WHERE clinic_id = $1',
        [clinicId]
      );

      const clinicDeleteResult = await client.query(
        'DELETE FROM clinics WHERE id = $1',
        [clinicId]
      );

      await client.query('COMMIT');

      const totalEliminated =
        notificationsResult.rowCount +
        caseDiscussionsResult.rowCount +
        parentChatsResult.rowCount +
        programSessionsResult.rowCount +
        progressResult.rowCount +
        therapistAssignmentsResult.rowCount +
        programAssignmentsResult.rowCount +
        billingsResult.rowCount +
        patientsResult.rowCount +
        usersResult.rowCount +
        clinicDeleteResult.rowCount;

      return {
        clinic_name: clinicName,
        eliminated: {
          notifications: notificationsResult.rowCount,
          case_discussions: caseDiscussionsResult.rowCount,
          parent_chats: parentChatsResult.rowCount,
          program_sessions: programSessionsResult.rowCount,
          progress_records: progressResult.rowCount,
          therapist_assignments: therapistAssignmentsResult.rowCount,
          program_assignments: programAssignmentsResult.rowCount,
          billings: billingsResult.rowCount,
          patients: patientsResult.rowCount,
          users: usersResult.rowCount,
          clinic: clinicDeleteResult.rowCount
        },
        total_eliminated: totalEliminated
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro na eliminação cascata da clínica:', error);
      throw new Error(`Falha na eliminação da clínica: ${error.message}`);
    } finally {
      client.release();
    }
  }
};

module.exports = SuperAdminModel;