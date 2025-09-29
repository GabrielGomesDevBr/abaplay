// backend/src/models/scheduledSessionModel.js

const pool = require('./db');

/**
 * Modelo para gerenciar agendamentos de sessões terapêuticas
 * VERSÃO CORRIGIDA V2 - Agendamento por sessão de trabalho (não por programa específico)
 * Corrige conceito fundamental: 1 sessão pode trabalhar múltiplos programas
 */
const ScheduledSession = {

    /**
     * Cria um novo agendamento de sessão de trabalho
     * @param {Object} sessionData - Dados do agendamento
     * @param {number} sessionData.patient_id - ID do paciente
     * @param {number} sessionData.therapist_id - ID do terapeuta
     * @param {number} sessionData.discipline_id - ID da disciplina (opcional)
     * @param {string} sessionData.scheduled_date - Data do agendamento (YYYY-MM-DD)
     * @param {string} sessionData.scheduled_time - Horário do agendamento (HH:MM)
     * @param {number} sessionData.duration_minutes - Duração em minutos (padrão: 60)
     * @param {number} sessionData.created_by - ID do usuário que criou o agendamento
     * @param {string} sessionData.notes - Observações do agendamento
     * @returns {Promise<Object>} O agendamento criado
     */
    async create(sessionData) {
        const {
            patient_id,
            therapist_id,
            discipline_id = null,
            scheduled_date,
            scheduled_time,
            duration_minutes = 60,
            created_by,
            notes = null
        } = sessionData;

        // Verificar conflitos antes de criar (nova função)
        const hasConflict = await this.checkSessionConflict(patient_id, therapist_id, scheduled_date, scheduled_time, duration_minutes);
        if (hasConflict) {
            throw new Error('Conflito de agendamento: Já existe uma sessão para este terapeuta no mesmo horário.');
        }

        const query = `
            INSERT INTO scheduled_sessions (
                patient_id,
                therapist_id,
                discipline_id,
                scheduled_date,
                scheduled_time,
                duration_minutes,
                created_by,
                notes,
                detection_source
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual')
            RETURNING *;
        `;

        const values = [patient_id, therapist_id, discipline_id, scheduled_date, scheduled_time, duration_minutes, created_by, notes];

        try {
            const { rows } = await pool.query(query, values);
            console.log(`[SCHEDULING-V2] Sessão agendada: ID ${rows[0].id}, Paciente ${patient_id}, Terapeuta ${therapist_id}, Data ${scheduled_date} ${scheduled_time}`);
            return rows[0];
        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro ao criar agendamento:', error);
            throw error;
        }
    },

    /**
     * Busca agendamentos com filtros opcionais
     * @param {Object} filters - Filtros de busca
     * @param {number} filters.clinic_id - ID da clínica (obrigatório)
     * @param {number} filters.therapist_id - ID do terapeuta (opcional)
     * @param {number} filters.patient_id - ID do paciente (opcional)
     * @param {string} filters.status - Status do agendamento (opcional)
     * @param {string} filters.start_date - Data inicial (opcional)
     * @param {string} filters.end_date - Data final (opcional)
     * @param {number} filters.limit - Limite de resultados (padrão: 100)
     * @param {number} filters.offset - Offset para paginação (padrão: 0)
     * @returns {Promise<Array>} Lista de agendamentos
     */
    async findAll(filters = {}) {
        const {
            clinic_id,
            therapist_id,
            patient_id,
            status,
            start_date,
            end_date,
            limit = 100,
            offset = 0
        } = filters;

        if (!clinic_id) {
            throw new Error('clinic_id é obrigatório');
        }

        let query = `
            SELECT * FROM v_scheduled_sessions_complete
            WHERE patient_clinic_id = $1
        `;

        const values = [clinic_id];
        let paramCount = 1;

        // Adicionar filtros opcionais
        if (therapist_id) {
            paramCount++;
            query += ` AND therapist_id = $${paramCount}`;
            values.push(therapist_id);
        }

        if (patient_id) {
            paramCount++;
            query += ` AND patient_id = $${paramCount}`;
            values.push(patient_id);
        }

        if (status) {
            paramCount++;
            query += ` AND status = $${paramCount}`;
            values.push(status);
        }

        if (start_date) {
            paramCount++;
            query += ` AND scheduled_date >= $${paramCount}`;
            values.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND scheduled_date <= $${paramCount}`;
            values.push(end_date);
        }

        // Ordenação e paginação
        query += `
            ORDER BY scheduled_date DESC, scheduled_time DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        values.push(limit, offset);

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro ao buscar agendamentos:', error);
            throw error;
        }
    },

    /**
     * Busca um agendamento específico por ID
     * @param {number} id - ID do agendamento
     * @param {number} clinic_id - ID da clínica (para segurança)
     * @returns {Promise<Object|null>} O agendamento encontrado ou null
     */
    async findById(id, clinic_id) {
        const query = `
            SELECT * FROM v_scheduled_sessions_complete
            WHERE id = $1 AND patient_clinic_id = $2
        `;

        try {
            const { rows } = await pool.query(query, [id, clinic_id]);
            return rows[0] || null;
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao buscar agendamento ID ${id}:`, error);
            throw error;
        }
    },

    /**
     * Busca agendamentos de um terapeuta específico
     * @param {number} therapist_id - ID do terapeuta
     * @param {string} start_date - Data inicial (opcional)
     * @param {string} end_date - Data final (opcional)
     * @returns {Promise<Array>} Lista de agendamentos do terapeuta
     */
    async findByTherapist(therapist_id, start_date = null, end_date = null) {
        let query = `
            SELECT * FROM v_scheduled_sessions_complete
            WHERE therapist_id = $1
        `;

        const values = [therapist_id];
        let paramCount = 1;

        if (start_date) {
            paramCount++;
            query += ` AND scheduled_date >= $${paramCount}`;
            values.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND scheduled_date <= $${paramCount}`;
            values.push(end_date);
        }

        query += ` ORDER BY scheduled_date ASC, scheduled_time ASC`;

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao buscar agendamentos do terapeuta ${therapist_id}:`, error);
            throw error;
        }
    },

    /**
     * Atualiza um agendamento existente
     * @param {number} id - ID do agendamento
     * @param {Object} updateData - Dados para atualizar
     * @param {number} clinic_id - ID da clínica (para segurança)
     * @returns {Promise<Object>} O agendamento atualizado
     */
    async update(id, updateData, clinic_id) {
        const allowedFields = ['scheduled_date', 'scheduled_time', 'duration_minutes', 'status', 'notes', 'missed_reason_type', 'missed_reason_description', 'discipline_id', 'justified_by', 'justified_at'];
        const updates = [];
        const values = [];
        let paramCount = 0;

        // Verificar se o agendamento pertence à clínica
        const existing = await this.findById(id, clinic_id);
        if (!existing) {
            throw new Error('Agendamento não encontrado ou não pertence a esta clínica.');
        }

        // Construir query de update dinamicamente
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`${key} = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('Nenhum campo válido para atualizar.');
        }

        // Verificar conflitos se estiver mudando data/hora
        if (updateData.scheduled_date || updateData.scheduled_time || updateData.duration_minutes) {
            const date = updateData.scheduled_date || existing.scheduled_date;
            const time = updateData.scheduled_time || existing.scheduled_time;
            const duration = updateData.duration_minutes || existing.duration_minutes;

            const hasConflict = await this.checkSessionConflict(existing.patient_id, existing.therapist_id, date, time, duration, id);
            if (hasConflict) {
                throw new Error('Conflito de agendamento: Já existe uma sessão para este terapeuta no novo horário.');
            }
        }

        paramCount++;
        const query = `
            UPDATE scheduled_sessions
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING *
        `;
        values.push(id);

        try {
            const { rows } = await pool.query(query, values);
            console.log(`[SCHEDULING] Agendamento atualizado: ID ${id}`);
            return rows[0];
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao atualizar agendamento ID ${id}:`, error);
            throw error;
        }
    },

    /**
     * Remove um agendamento (cancelamento)
     * @param {number} id - ID do agendamento
     * @param {number} clinic_id - ID da clínica (para segurança)
     * @returns {Promise<boolean>} True se removido com sucesso
     */
    async delete(id, clinic_id) {
        // Verificar se o agendamento pertence à clínica
        const existing = await this.findById(id, clinic_id);
        if (!existing) {
            throw new Error('Agendamento não encontrado ou não pertence a esta clínica.');
        }

        const query = 'DELETE FROM scheduled_sessions WHERE id = $1';

        try {
            const result = await pool.query(query, [id]);
            console.log(`[SCHEDULING] Agendamento removido: ID ${id}`);
            return result.rowCount > 0;
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao remover agendamento ID ${id}:`, error);
            throw error;
        }
    },

    /**
     * Marca um agendamento como cancelado
     * @param {number} id - ID do agendamento
     * @param {string} reason_type - Tipo do motivo do cancelamento
     * @param {string} reason_description - Descrição do motivo
     * @param {number} clinic_id - ID da clínica (para segurança)
     * @returns {Promise<Object>} O agendamento cancelado
     */
    async cancel(id, reason_type, reason_description, clinic_id) {
        return await this.update(id, {
            status: 'cancelled',
            missed_reason_type: reason_type,
            missed_reason_description: reason_description
        }, clinic_id);
    },

    /**
     * Adiciona justificativa para agendamento perdido
     * @param {number} id - ID do agendamento
     * @param {string} reason_type - Tipo da justificativa
     * @param {string} reason_description - Descrição da justificativa
     * @param {number} justified_by - ID de quem justificou
     * @param {number} clinic_id - ID da clínica (para segurança)
     * @returns {Promise<Object>} O agendamento justificado
     */
    async addJustification(id, reason_type, reason_description, justified_by, clinic_id) {
        return await this.update(id, {
            missed_reason_type: reason_type,
            missed_reason_description: reason_description,
            justified_by: justified_by,
            justified_at: new Date().toISOString()
        }, clinic_id);
    },

    /**
     * Vincula uma sessão realizada a um agendamento
     * @param {number} appointment_id - ID do agendamento
     * @param {number} progress_session_id - ID da sessão realizada
     * @returns {Promise<Object>} O agendamento atualizado
     */
    async linkToCompletedSession(appointment_id, progress_session_id) {
        const query = `
            UPDATE scheduled_sessions
            SET status = 'completed', progress_session_id = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        try {
            const { rows } = await pool.query(query, [progress_session_id, appointment_id]);
            if (rows.length > 0) {
                console.log(`[SCHEDULING] Agendamento vinculado à sessão: Appointment ${appointment_id} → Session ${progress_session_id}`);
            }
            return rows[0];
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao vincular agendamento ${appointment_id} à sessão ${progress_session_id}:`, error);
            throw error;
        }
    },

    /**
     * Busca agendamentos que podem estar relacionados a uma sessão registrada (NOVA VERSÃO)
     * @param {number} patient_id - ID do paciente
     * @param {number} therapist_id - ID do terapeuta
     * @param {string} session_date - Data da sessão (YYYY-MM-DD)
     * @param {string} session_time - Horário da sessão registrada
     * @param {number} tolerance_hours - Tolerância em horas (padrão: 24)
     * @returns {Promise<Array>} Lista de agendamentos candidatos
     */
    async findCandidatesForSession(patient_id, therapist_id, session_date, session_time = null, tolerance_hours = 24) {
        let query = `
            SELECT *
            FROM scheduled_sessions
            WHERE patient_id = $1
              AND therapist_id = $2
              AND scheduled_date = $3
              AND status = 'scheduled'
              AND progress_session_id IS NULL
        `;

        const values = [patient_id, therapist_id, session_date];

        // Se temos horário da sessão, ordenar por proximidade
        if (session_time) {
            query += `
            ORDER BY ABS(EXTRACT(EPOCH FROM (scheduled_time - $4::time))/3600) ASC
            `;
            values.push(session_time);
        } else {
            query += ` ORDER BY scheduled_time ASC`;
        }

        query += ` LIMIT 5`;

        try {
            const { rows } = await pool.query(query, values);
            return rows;
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao buscar candidatos para sessão:`, error);
            throw error;
        }
    },

    /**
     * Marca agendamentos vencidos como perdidos
     * @param {number} hours_after - Horas após o agendamento para considerar perdido (padrão: 24)
     * @returns {Promise<Array>} Lista de agendamentos marcados como perdidos
     */
    async markMissedAppointments(hours_after = 24) {
        const query = `
            UPDATE scheduled_sessions
            SET status = 'missed', updated_at = NOW()
            WHERE status = 'scheduled'
              AND (
                  scheduled_date < CURRENT_DATE
                  OR (
                      scheduled_date = CURRENT_DATE
                      AND scheduled_time < (CURRENT_TIME - INTERVAL '${hours_after} hours')
                  )
              )
            RETURNING *
        `;

        try {
            const { rows } = await pool.query(query);
            if (rows.length > 0) {
                console.log(`[SCHEDULING] ${rows.length} agendamentos marcados como perdidos`);
            }
            return rows;
        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro ao marcar agendamentos perdidos:', error);
            throw error;
        }
    },

    /**
     * Verifica conflitos de agendamento (NOVA FUNÇÃO CORRIGIDA)
     * @param {number} patient_id - ID do paciente
     * @param {number} therapist_id - ID do terapeuta
     * @param {string} scheduled_date - Data do agendamento
     * @param {string} scheduled_time - Horário do agendamento
     * @param {number} duration_minutes - Duração em minutos
     * @param {number} exclude_id - ID do agendamento a excluir da verificação
     * @returns {Promise<boolean>} True se há conflito
     */
    async checkSessionConflict(patient_id, therapist_id, scheduled_date, scheduled_time, duration_minutes = 60, exclude_id = null) {
        try {
            const { rows } = await pool.query(
                'SELECT check_session_conflict($1, $2, $3, $4, $5, $6) as has_conflict',
                [patient_id, therapist_id, scheduled_date, scheduled_time, duration_minutes, exclude_id]
            );
            return rows[0].has_conflict;
        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro ao verificar conflito:', error);
            throw error;
        }
    },

    /**
     * FUNÇÃO LEGACY - Mantida para compatibilidade temporária
     * @deprecated Use checkSessionConflict em vez desta
     */
    async checkConflict(assignment_id, scheduled_date, scheduled_time, duration_minutes = 60, exclude_id = null) {
        console.warn('[SCHEDULING] DEPRECATED: checkConflict será removido. Use checkSessionConflict.');
        // Buscar dados da assignment para converter
        try {
            const { rows } = await pool.query(
                'SELECT patient_id, therapist_id FROM patient_program_assignments WHERE id = $1',
                [assignment_id]
            );
            if (rows.length === 0) return false;

            const { patient_id, therapist_id } = rows[0];
            return await this.checkSessionConflict(patient_id, therapist_id, scheduled_date, scheduled_time, duration_minutes, exclude_id);
        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro ao verificar conflito (legacy):', error);
            throw error;
        }
    },

    /**
     * Obtém estatísticas de agendamento para um terapeuta (FUNÇÃO CORRIGIDA)
     * @param {number} therapist_id - ID do terapeuta
     * @param {string} start_date - Data inicial (opcional)
     * @param {string} end_date - Data final (opcional)
     * @returns {Promise<Object>} Estatísticas do terapeuta
     */
    async getTherapistStats(therapist_id, start_date = null, end_date = null) {
        try {
            const { rows } = await pool.query(
                'SELECT * FROM get_therapist_schedule_stats($1, $2, $3)',
                [therapist_id, start_date, end_date]
            );
            return rows[0] || {
                total_scheduled: 0,
                total_completed: 0,
                total_missed: 0,
                total_cancelled: 0,
                completion_rate: 0,
                attendance_rate: 0
            };
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao buscar estatísticas do terapeuta ${therapist_id}:`, error);
            throw error;
        }
    },

    /**
     * Busca próximos agendamentos de um terapeuta
     * @param {number} therapist_id - ID do terapeuta
     * @param {number} days_ahead - Dias à frente para buscar (padrão: 7)
     * @returns {Promise<Array>} Lista de próximos agendamentos
     */
    async getUpcomingByTherapist(therapist_id, days_ahead = 7) {
        const query = `
            SELECT * FROM v_scheduled_sessions_complete
            WHERE therapist_id = $1
              AND scheduled_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days_ahead} days')
              AND status IN ('scheduled')
            ORDER BY scheduled_date ASC, scheduled_time ASC
        `;

        try {
            const { rows } = await pool.query(query, [therapist_id]);
            return rows;
        } catch (error) {
            console.error(`[SCHEDULING-ERROR] Erro ao buscar próximos agendamentos do terapeuta ${therapist_id}:`, error);
            throw error;
        }
    },

    /**
     * NOVA FUNÇÃO: Detecta sessões realizadas sem agendamento (órfãs)
     * @param {Object} options - Opções de busca
     * @param {number} options.clinic_id - ID da clínica (opcional)
     * @param {string} options.start_date - Data inicial (opcional)
     * @param {string} options.end_date - Data final (opcional)
     * @param {number} options.lookbackDays - Quantos dias olhar para trás (padrão: 2)
     * @returns {Promise<Array>} Lista de sessões órfãs detectadas
     */
    async findOrphanSessions(options = {}) {
        const { clinic_id, start_date, end_date, lookbackDays = 2 } = options;

        // Definir período padrão se não fornecido
        const defaultStartDate = start_date || new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const defaultEndDate = end_date || new Date().toISOString().split('T')[0];

        let query = `
            SELECT DISTINCT
                ppp.id as session_id,
                ppp.session_date,
                ppp.created_at,
                ppa.patient_id,
                ppa.therapist_id,
                p.name as patient_name,
                u.full_name as therapist_name,
                u.clinic_id
            FROM patient_program_progress ppp
            JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
            JOIN patients p ON ppa.patient_id = p.id
            JOIN users u ON ppa.therapist_id = u.id
            WHERE
                ppp.session_date >= $1::date
                AND ppp.session_date <= $2::date
                AND NOT EXISTS (
                    SELECT 1 FROM scheduled_sessions ss
                    WHERE ss.patient_id = ppa.patient_id
                    AND ss.therapist_id = ppa.therapist_id
                    AND ss.scheduled_date = ppp.session_date
                    AND (ss.status = 'completed' OR ss.progress_session_id = ppp.id)
                )
        `;

        const values = [defaultStartDate, defaultEndDate];
        let paramCount = 2;

        // Filtrar por clínica se especificado
        if (clinic_id) {
            paramCount++;
            query += ` AND u.clinic_id = $${paramCount}`;
            values.push(clinic_id);
        }

        query += ` ORDER BY ppp.session_date DESC, ppp.created_at DESC`;

        try {
            const result = await pool.query(query, values);
            return result.rows;
        } catch (error) {
            console.error('[SCHEDULED-SESSION-MODEL] Erro ao buscar sessões órfãs:', error.message);
            throw error;
        }
    },

    /**
     * NOVA FUNÇÃO: Cria agendamento retroativo para sessão órfã
     * @param {Object} orphanData - Dados da sessão órfã
     * @returns {Promise<Object>} Agendamento retroativo criado
     */
    async createRetroactiveAppointment(orphanData) {
        const {
            patient_id,
            therapist_id,
            session_date,
            session_time = '10:00', // Horário padrão se não especificado
            session_id,
            created_by = 1 // ID padrão para sistema
        } = orphanData;

        const query = `
            INSERT INTO scheduled_sessions (
                patient_id,
                therapist_id,
                discipline_id,
                scheduled_date,
                scheduled_time,
                duration_minutes,
                status,
                created_by,
                notes,
                detection_source,
                is_retroactive,
                progress_session_id
            )
            VALUES ($1, $2, NULL, $3, $4, 60, 'completed', $5,
                    'Agendamento criado retroativamente para sessão realizada sem agendamento prévio',
                    'orphan_converted', TRUE, $6)
            RETURNING *;
        `;

        const values = [patient_id, therapist_id, session_date, session_time, created_by, session_id];

        try {
            const { rows } = await pool.query(query, values);
            console.log(`[SCHEDULING-V2] Agendamento retroativo criado: ID ${rows[0].id} para sessão órfã ${session_id}`);
            return rows[0];
        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro ao criar agendamento retroativo:', error);
            throw error;
        }
    },

    /**
     * NOVA FUNÇÃO: Detecção inteligente de sessões realizadas
     * Substitui a detecção antiga baseada em assignment_id
     * @param {Object} options - Opções de detecção
     * @param {number} options.clinic_id - ID da clínica
     * @param {string} options.start_date - Data inicial (YYYY-MM-DD)
     * @param {string} options.end_date - Data final (YYYY-MM-DD)
     * @param {boolean} options.auto_create_retroactive - Criar retroativos automaticamente
     * @returns {Promise<Object>} Resultado da detecção
     */
    async intelligentSessionDetection(options = {}) {
        try {
            const { clinic_id, start_date, end_date, auto_create_retroactive = false } = options;

            // Validar que clinic_id seja obrigatório para segurança
            if (!clinic_id) {
                throw new Error('clinic_id é obrigatório para a detecção inteligente');
            }

            // Definir período padrão se não fornecido
            const defaultStartDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const defaultEndDate = end_date || new Date().toISOString().split('T')[0];

            let completedSessions = [];
            let orphanSessions = [];
            let retroactiveCreated = [];

            // 1. Buscar agendamentos pendentes no período (filtrado por clínica)
            const pendingQuery = `
                SELECT ss.*, p.name as patient_name, u.full_name as therapist_name
                FROM scheduled_sessions ss
                JOIN patients p ON ss.patient_id = p.id
                JOIN users u ON ss.therapist_id = u.id
                WHERE ss.status = 'scheduled'
                AND ss.scheduled_date >= $1::date
                AND ss.scheduled_date <= $2::date
                AND ss.progress_session_id IS NULL
                AND p.clinic_id = $3
                ORDER BY ss.scheduled_date, ss.scheduled_time;
            `;

            const pendingAppointments = await pool.query(pendingQuery, [defaultStartDate, defaultEndDate, clinic_id]);

            // 2. Para cada agendamento, buscar sessão correspondente
            for (const appointment of pendingAppointments.rows) {
                const sessionQuery = `
                    SELECT DISTINCT ppp.id, ppp.created_at, ppp.session_date
                    FROM patient_program_progress ppp
                    JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
                    WHERE ppa.patient_id = $1
                    AND ppa.therapist_id = $2
                    AND ppp.session_date = $3
                    AND ppp.created_at >= $4::timestamp - INTERVAL '1 hour'
                    AND ppp.created_at <= $4::timestamp + INTERVAL '3 hours'
                    ORDER BY ppp.created_at DESC
                    LIMIT 1;
                `;

                // Converter data para formato ISO correto
                const dateObj = new Date(appointment.scheduled_date);
                const dateISO = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                const scheduledDateTime = `${dateISO}T${appointment.scheduled_time}`;
                const sessionResult = await pool.query(sessionQuery, [
                    appointment.patient_id,
                    appointment.therapist_id,
                    dateISO, // Usar data no formato ISO
                    scheduledDateTime
                ]);

                if (sessionResult.rows.length > 0) {
                    // Sessão encontrada - marcar como completed
                    await pool.query(
                        'UPDATE scheduled_sessions SET status = $1, progress_session_id = $2, updated_at = NOW() WHERE id = $3',
                        ['completed', sessionResult.rows[0].id, appointment.id]
                    );

                    completedSessions.push({
                        appointment_id: appointment.id,
                        session_id: sessionResult.rows[0].id,
                        patient_name: appointment.patient_name,
                        therapist_name: appointment.therapist_name,
                        scheduled_date: appointment.scheduled_date
                    });

                    console.log(`[DETECTION] Sessão detectada: Agendamento ${appointment.id} → Sessão ${sessionResult.rows[0].id}`);
                }
            }

            // 3. Buscar sessões órfãs no período (filtradas por clínica)
            const orphanQuery = `
                SELECT DISTINCT
                    ppp.id as session_id,
                    ppp.session_date,
                    ppp.created_at,
                    ppa.patient_id,
                    ppa.therapist_id,
                    p.name as patient_name,
                    u.full_name as therapist_name
                FROM patient_program_progress ppp
                JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
                JOIN patients p ON ppa.patient_id = p.id
                JOIN users u ON ppa.therapist_id = u.id
                WHERE ppp.session_date >= $1::date
                AND ppp.session_date <= $2::date
                AND p.clinic_id = $3
                AND NOT EXISTS (
                    SELECT 1 FROM scheduled_sessions ss
                    WHERE ss.patient_id = ppa.patient_id
                    AND ss.therapist_id = ppa.therapist_id
                    AND ss.scheduled_date = ppp.session_date
                    AND ss.status IN ('completed', 'scheduled')
                )
                ORDER BY ppp.session_date DESC, ppp.created_at DESC;
            `;

            const orphanResult = await pool.query(orphanQuery, [defaultStartDate, defaultEndDate, clinic_id]);
            orphanSessions = orphanResult.rows;

            // 4. Criar agendamentos retroativos se solicitado
            if (auto_create_retroactive && orphanSessions.length > 0) {
                for (const orphan of orphanSessions) {
                    try {
                        const retroactiveResult = await pool.query(`
                            INSERT INTO scheduled_sessions (
                                patient_id, therapist_id, scheduled_date, scheduled_time,
                                duration_minutes, status, created_by, progress_session_id,
                                is_retroactive, detection_source, notes
                            ) VALUES ($1, $2, $3, '00:00', 60, 'completed', $4, $5, true, 'auto_detected', $6)
                            RETURNING id, patient_id, therapist_id, scheduled_date
                        `, [
                            orphan.patient_id,
                            orphan.therapist_id,
                            orphan.session_date,
                            1, // created_by admin (ajustar conforme necessário)
                            orphan.session_id,
                            `Agendamento retroativo criado automaticamente para sessão realizada em ${orphan.session_date}`
                        ]);

                        retroactiveCreated.push(retroactiveResult.rows[0]);
                    } catch (error) {
                        console.error(`[DETECTION] Erro ao criar retroativo para sessão ${orphan.session_id}:`, error);
                    }
                }
            }

            return {
                completed_sessions: completedSessions,
                orphan_sessions: orphanSessions,
                retroactive_created: retroactiveCreated
            };

        } catch (error) {
            console.error('[SCHEDULING-ERROR] Erro na detecção inteligente:', error);
            throw error;
        }
    }
};

module.exports = ScheduledSession;