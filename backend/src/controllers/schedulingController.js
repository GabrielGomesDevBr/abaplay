// backend/src/controllers/schedulingController.js

const { validationResult } = require('express-validator');
const ScheduledSessionModel = require('../models/scheduledSessionModel');
const AssignmentModel = require('../models/assignmentModel');
const { validateAppointmentDateTime, formatDateTimeForLog, normalizeToDateString } = require('../utils/appointmentValidation');
const pool = require('../models/db');

const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

/**
 * Controller para gerenciar agendamentos de sessões
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const SchedulingController = {

    /**
     * Criar novo agendamento (apenas admins) - NOVA ESTRUTURA
     * POST /api/admin/scheduling/appointments
     */
    async createAppointment(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const {
                patient_id,
                therapist_id,
                discipline_id = null, // Opcional: específica ou sessão geral
                scheduled_date,
                scheduled_time,
                duration_minutes = 60,
                notes
            } = req.body;

            const { clinic_id, id: userId } = req.user;

            // Validar data/hora usando utilitário robusto
            const dateTimeValidation = validateAppointmentDateTime(scheduled_date, scheduled_time);
            if (!dateTimeValidation.isValid) {
                return res.status(400).json({
                    errors: [{ msg: dateTimeValidation.message }]
                });
            }

            // Criar agendamento com nova estrutura
            const sessionData = {
                patient_id: parseInt(patient_id),
                therapist_id: parseInt(therapist_id),
                discipline_id: discipline_id ? parseInt(discipline_id) : null,
                scheduled_date: normalizeToDateString(scheduled_date),
                scheduled_time,
                duration_minutes: parseInt(duration_minutes),
                created_by: userId,
                notes: notes || null,
                detection_source: 'manual'
            };

            const newAppointment = await ScheduledSessionModel.create(sessionData);

            // Buscar dados completos para retorno
            const completeAppointment = await ScheduledSessionModel.findById(newAppointment.id, clinic_id);

            // ✅ NOVO: Notificar terapeuta automaticamente sobre o novo agendamento
            try {
                const NotificationStatus = require('../models/notificationStatusModel');
                await NotificationStatus.incrementUnreadCount(
                    parseInt(therapist_id),
                    parseInt(patient_id),
                    'appointment_created'
                );
                console.log(`[SCHEDULING] Notificação de novo agendamento enviada ao terapeuta ID ${therapist_id}`);
            } catch (notifError) {
                // Não bloquear a criação se a notificação falhar
                console.error('[SCHEDULING] Erro ao enviar notificação de novo agendamento:', notifError);
            }

            res.status(201).json({
                message: 'Agendamento criado com sucesso!',
                appointment: completeAppointment,
                notification_sent: true
            });

        } catch (error) {
            if (error.message.includes('Conflito de agendamento')) {
                return res.status(409).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error('[SCHEDULING-CONTROLLER] Erro ao criar agendamento:', error);
            next(error);
        }
    },

    /**
     * Listar agendamentos com filtros
     * GET /api/admin/scheduling/appointments
     */
    async getAppointments(req, res, next) {
        try {
            const { clinic_id } = req.user;
            const {
                therapist_id,
                patient_id,
                status,
                start_date,
                end_date,
                page = 1,
                limit = 50
            } = req.query;

            const offset = (page - 1) * limit;

            const filters = {
                clinic_id,
                therapist_id: therapist_id ? parseInt(therapist_id) : undefined,
                patient_id: patient_id ? parseInt(patient_id) : undefined,
                status,
                start_date,
                end_date,
                limit: parseInt(limit),
                offset
            };

            const appointments = await ScheduledSessionModel.findAll(filters);

            // Buscar total para paginação
            const totalQuery = await ScheduledSessionModel.findAll({
                ...filters,
                limit: 999999,
                offset: 0
            });
            const total = totalQuery.length;

            res.status(200).json({
                appointments,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    items_per_page: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('[SCHEDULING-CONTROLLER] Erro ao buscar agendamentos:', error);
            next(error);
        }
    },

    /**
     * Buscar agendamento específico
     * GET /api/admin/scheduling/appointments/:id
     */
    async getAppointmentById(req, res, next) {
        try {
            const { id } = req.params;
            const { clinic_id } = req.user;

            const appointment = await ScheduledSessionModel.findById(parseInt(id), clinic_id);

            if (!appointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            res.status(200).json({ appointment });

        } catch (error) {
            console.error(`[SCHEDULING-CONTROLLER] Erro ao buscar agendamento ID ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Atualizar agendamento
     * PUT /api/admin/scheduling/appointments/:id
     */
    async updateAppointment(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const { id } = req.params;
            const { clinic_id } = req.user;
            const updateData = req.body;

            // Validar data/hora se estiver sendo alterada
            if (updateData.scheduled_date && updateData.scheduled_time) {
                const dateTimeValidation = validateAppointmentDateTime(updateData.scheduled_date, updateData.scheduled_time);
                if (!dateTimeValidation.isValid) {
                    return res.status(400).json({
                        errors: [{ msg: dateTimeValidation.message }]
                    });
                }
            }

            // Normalizar data se estiver sendo alterada
            if (updateData.scheduled_date) {
                updateData.scheduled_date = normalizeToDateString(updateData.scheduled_date);
            }

            const updatedAppointment = await ScheduledSessionModel.update(parseInt(id), updateData, clinic_id);

            if (!updatedAppointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            // Buscar dados completos para retorno
            const completeAppointment = await ScheduledSessionModel.findById(parseInt(id), clinic_id);

            res.status(200).json({
                message: 'Agendamento atualizado com sucesso!',
                appointment: completeAppointment
            });

        } catch (error) {
            if (error.message.includes('Conflito de agendamento')) {
                return res.status(409).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error(`[SCHEDULING-CONTROLLER] Erro ao atualizar agendamento ID ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Cancelar agendamento com auditoria completa
     * DELETE /api/admin/scheduling/appointments/:id
     * ✅ NOVO: Inclui notificação automática ao terapeuta
     */
    async cancelAppointment(req, res, next) {
        try {
            const { id } = req.params;
            const { reason_type = 'outro', reason_description = 'Cancelado pelo administrador' } = req.body;
            const { clinic_id, id: user_id } = req.user;

            const pool = require('../models/db');
            const NotificationStatus = require('../models/notificationStatusModel');

            // Buscar informações do agendamento antes de cancelar
            const appointmentQuery = `
                SELECT ss.*, p.id as patient_id, p.name as patient_name, u.full_name as therapist_name
                FROM scheduled_sessions ss
                JOIN patients p ON ss.patient_id = p.id
                JOIN users u ON ss.therapist_id = u.id
                WHERE ss.id = $1 AND p.clinic_id = $2
            `;
            const { rows: appointments } = await pool.query(appointmentQuery, [parseInt(id), clinic_id]);

            if (appointments.length === 0) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            const appointment = appointments[0];

            // Cancelar o agendamento
            const cancellationData = {
                reason_type,
                reason_description,
                cancelled_by: user_id
            };

            const cancelledAppointment = await ScheduledSessionModel.cancel(parseInt(id), cancellationData, clinic_id);

            if (!cancelledAppointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            // ✅ NOVO: Notificar terapeuta automaticamente sobre o cancelamento
            try {
                await NotificationStatus.incrementUnreadCount(
                    appointment.therapist_id,
                    appointment.patient_id,
                    'appointment_cancelled'
                );
                console.log(`[SCHEDULING] Notificação de cancelamento enviada ao terapeuta ID ${appointment.therapist_id}`);
            } catch (notifError) {
                // Não bloquear o cancelamento se a notificação falhar
                console.error('[SCHEDULING] Erro ao enviar notificação de cancelamento:', notifError);
            }

            res.status(200).json({
                message: 'Agendamento cancelado com sucesso!',
                appointment: cancelledAppointment,
                notification_sent: true,
                therapist_notified: appointment.therapist_name
            });

        } catch (error) {
            console.error(`[SCHEDULING-CONTROLLER] Erro ao cancelar agendamento ID ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Remover agendamento permanentemente
     * DELETE /api/admin/scheduling/appointments/:id/permanent
     */
    async deleteAppointment(req, res, next) {
        try {
            const { id } = req.params;
            const { clinic_id } = req.user;

            const deleted = await ScheduledSessionModel.delete(parseInt(id), clinic_id);

            if (!deleted) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            res.status(200).json({
                message: 'Agendamento removido permanentemente!'
            });

        } catch (error) {
            console.error(`[SCHEDULING-CONTROLLER] Erro ao remover agendamento ID ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Marcar sessão como completa com anotações (Plano Agendamento)
     * PUT /api/therapist-schedule/sessions/:id/complete
     * Esta é a funcionalidade SIMPLIFICADA para o plano agendamento
     */
    async completeSessionWithNotes(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const { id } = req.params;
            const { notes } = req.body;
            const { clinic_id, id: userId, is_admin, subscription_plan } = req.user;

            // Verificar que o usuário está no plano agendamento
            // (plano Pro usa registro detalhado via patient_program_progress)
            if (subscription_plan === 'pro') {
                return res.status(400).json({
                    errors: [{
                        msg: 'Esta função é apenas para o plano agendamento. Use o registro detalhado de programas.',
                        code: 'PRO_PLAN_USE_PROGRAM_RECORDING'
                    }]
                });
            }

            if (!notes || !notes.trim()) {
                return res.status(400).json({
                    errors: [{ msg: 'É necessário adicionar anotações da sessão.' }]
                });
            }

            // Buscar agendamento para validar permissões
            const appointment = await ScheduledSessionModel.findById(parseInt(id), clinic_id);

            if (!appointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            // Validação de permissões: apenas terapeuta responsável ou admin
            const isTherapistResponsible = appointment.therapist_id === userId;

            if (!isTherapistResponsible && !is_admin) {
                return res.status(403).json({
                    errors: [{
                        msg: 'Apenas o terapeuta responsável pode marcar esta sessão como completa.',
                        code: 'NOT_THERAPIST'
                    }]
                });
            }

            // Marcar como completa com anotações
            const completedSession = await ScheduledSessionModel.completeWithNotes(
                parseInt(id),
                notes.trim(),
                clinic_id
            );

            res.status(200).json({
                message: 'Sessão marcada como completa com sucesso!',
                session: completedSession
            });

        } catch (error) {
            console.error(`[SCHEDULING-CONTROLLER] Erro ao completar sessão ID ${req.params.id}:`, error);
            res.status(500).json({
                errors: [{ msg: error.message || 'Erro ao marcar sessão como completa.' }]
            });
        }
    },

    /**
     * Adicionar justificativa categorizada a agendamento perdido - NOVA ESTRUTURA
     * POST /api/scheduling/justify-absence/:id
     * ✅ FASE 2: Validação de permissões - apenas terapeuta responsável ou admin
     */
    async justifyAbsence(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const { id } = req.params;
            const { missed_reason_type, missed_reason_description, admin_override } = req.body;
            const { clinic_id, id: userId, is_admin } = req.user;

            // Buscar agendamento para validar permissões
            const appointment = await ScheduledSessionModel.findById(parseInt(id), clinic_id);

            if (!appointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            // ✅ VALIDAÇÃO DE PERMISSÕES
            const isTherapistResponsible = appointment.therapist_id === userId;
            const isAdminOverride = is_admin && admin_override === true;

            if (!isTherapistResponsible && !isAdminOverride) {
                return res.status(403).json({
                    errors: [{
                        msg: 'Apenas o terapeuta responsável pode justificar este agendamento.',
                        code: 'NOT_THERAPIST',
                        isAdmin: is_admin,
                        requiresConfirmation: is_admin // Admin pode, mas precisa confirmar
                    }]
                });
            }

            const justificationData = {
                missed_reason_type,
                missed_reason_description: missed_reason_description || null,
                justified_by: userId,
                justified_at: new Date().toISOString()
            };

            const justifiedAppointment = await ScheduledSessionModel.addJustification(
                parseInt(id),
                justificationData,
                clinic_id
            );

            res.status(200).json({
                message: isAdminOverride
                    ? 'Justificativa adicionada pelo administrador.'
                    : 'Justificativa adicionada com sucesso!',
                appointment: justifiedAppointment,
                isAdminOverride
            });

        } catch (error) {
            console.error(`[SCHEDULING-CONTROLLER] Erro ao justificar ausência ID ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Marcar agendamentos vencidos como perdidos (job manual)
     * POST /api/admin/scheduling/mark-missed
     */
    async markMissedAppointments(req, res, next) {
        try {
            const { hours_after = 1 } = req.body;

            const missedAppointments = await ScheduledSessionModel.markMissedAppointments(hours_after);

            res.status(200).json({
                message: `${missedAppointments.length} agendamentos marcados como perdidos.`,
                missed_appointments: missedAppointments
            });

        } catch (error) {
            console.error('[SCHEDULING-CONTROLLER] Erro ao marcar agendamentos perdidos:', error);
            next(error);
        }
    },

    /**
     * Buscar estatísticas de agendamento da clínica
     * GET /api/admin/scheduling/statistics
     */
    async getClinicStatistics(req, res, next) {
        try {
            const { clinic_id } = req.user;
            const { start_date, end_date } = req.query;

            // Buscar agendamentos da clínica no período
            const appointments = await ScheduledSessionModel.findAll({
                clinic_id,
                start_date,
                end_date,
                limit: 999999
            });

            // Calcular estatísticas
            const stats = {
                total_appointments: appointments.length,
                scheduled: appointments.filter(a => a.status === 'scheduled').length,
                completed: appointments.filter(a => a.status === 'completed').length,
                missed: appointments.filter(a => a.status === 'missed').length,
                cancelled: appointments.filter(a => a.status === 'cancelled').length
            };

            stats.completion_rate = stats.total_appointments > 0 ?
                Math.round((stats.completed / stats.total_appointments) * 100 * 100) / 100 : 0;

            stats.attendance_rate = (stats.total_appointments - stats.cancelled) > 0 ?
                Math.round((stats.completed / (stats.total_appointments - stats.cancelled)) * 100 * 100) / 100 : 0;

            // Estatísticas por terapeuta
            const therapistStats = {};
            appointments.forEach(appointment => {
                const therapistId = appointment.therapist_id;
                if (!therapistStats[therapistId]) {
                    therapistStats[therapistId] = {
                        therapist_name: appointment.therapist_name,
                        total: 0,
                        completed: 0,
                        missed: 0,
                        cancelled: 0
                    };
                }
                therapistStats[therapistId].total++;
                therapistStats[therapistId][appointment.status]++;
            });

            // Calcular taxas por terapeuta
            Object.values(therapistStats).forEach(therapist => {
                therapist.completion_rate = therapist.total > 0 ?
                    Math.round((therapist.completed / therapist.total) * 100 * 100) / 100 : 0;
                therapist.attendance_rate = (therapist.total - therapist.cancelled) > 0 ?
                    Math.round((therapist.completed / (therapist.total - therapist.cancelled)) * 100 * 100) / 100 : 0;
            });

            res.status(200).json({
                clinic_statistics: stats,
                therapist_statistics: Object.values(therapistStats),
                period: { start_date, end_date }
            });

        } catch (error) {
            console.error('[SCHEDULING-CONTROLLER] Erro ao buscar estatísticas da clínica:', error);
            next(error);
        }
    },

    // === NOVAS FUNCIONALIDADES PARA SESSÕES ÓRFÃS ===

    /**
     * Buscar sessões órfãs (realizadas sem agendamento prévio)
     * GET /api/admin/scheduling/orphan-sessions
     */
    async getOrphanSessions(req, res, next) {
        try {
            const { clinic_id } = req.user;
            const { start_date, end_date, limit = 50, offset = 0 } = req.query;

            const orphanSessions = await ScheduledSessionModel.findOrphanSessions({
                clinic_id,
                start_date,
                end_date,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.status(200).json({
                orphan_sessions: orphanSessions,
                message: 'Sessões órfãs encontradas (realizadas sem agendamento prévio).'
            });

        } catch (error) {
            console.error('[SCHEDULING-CONTROLLER] Erro ao buscar sessões órfãs:', error);
            next(error);
        }
    },

    /**
     * Executar detecção inteligente de sessões
     * POST /api/admin/scheduling/intelligent-detection
     */
    async runIntelligentDetection(req, res, next) {
        try {
            const { clinic_id } = req.user;
            const { start_date, end_date, auto_create_retroactive = false } = req.body;

            const detectionResults = await ScheduledSessionModel.intelligentSessionDetection({
                clinic_id,
                start_date,
                end_date,
                auto_create_retroactive
            });

            res.status(200).json({
                detection_results: detectionResults,
                message: `Detecção concluída. ${detectionResults.completed_sessions.length} sessões marcadas como completadas.`,
                orphan_sessions_found: detectionResults.orphan_sessions?.length || 0
            });

        } catch (error) {
            console.error('[SCHEDULING-CONTROLLER] Erro na detecção inteligente:', error);
            next(error);
        }
    },

    /**
     * Criar agendamento retroativo para sessão órfã
     * POST /api/admin/scheduling/create-retroactive/:sessionId
     */
    async createRetroactiveAppointment(req, res, next) {
        try {
            const { sessionId } = req.params;
            const { discipline_id = null, notes } = req.body;
            const { clinic_id, id: userId } = req.user;

            const retroactiveAppointment = await ScheduledSessionModel.createRetroactiveAppointment(
                parseInt(sessionId),
                {
                    discipline_id: discipline_id ? parseInt(discipline_id) : null,
                    notes: notes || 'Agendamento criado retroativamente para sessão realizada.',
                    created_by: userId
                },
                clinic_id
            );

            if (!retroactiveAppointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Sessão não encontrada ou já possui agendamento.' }]
                });
            }

            res.status(201).json({
                message: 'Agendamento retroativo criado com sucesso!',
                appointment: retroactiveAppointment
            });

        } catch (error) {
            console.error(`[SCHEDULING-CONTROLLER] Erro ao criar agendamento retroativo para sessão ${req.params.sessionId}:`, error);
            next(error);
        }
    },

    /**
     * NOVO: Buscar ações pendentes (órfãs + perdidos + detectados hoje)
     * GET /api/scheduling/pending-actions
     */
    async getPendingActions(req, res, next) {
        try {
            const { clinic_id } = req.user;
            const pool = require('../models/db');

            // Buscar órfãs dos últimos 7 dias
            const orphanSessions = await ScheduledSessionModel.findOrphanSessions({
                clinic_id,
                lookbackDays: 7
            });

            // Buscar agendamentos perdidos sem justificativa
            const missedQuery = `
                SELECT * FROM v_scheduled_sessions_complete
                WHERE patient_clinic_id = $1
                AND status = 'missed'
                AND justified_at IS NULL
                ORDER BY scheduled_date DESC
                LIMIT 100
            `;
            const { rows: missedAppointments } = await pool.query(missedQuery, [clinic_id]);

            // Contar sessões detectadas hoje
            const today = new Date().toISOString().split('T')[0];
            const detectedQuery = `
                SELECT COUNT(*) as count
                FROM scheduled_sessions ss
                JOIN patients p ON ss.patient_id = p.id
                WHERE p.clinic_id = $1
                AND ss.status = 'completed'
                AND ss.detection_source IN ('auto_detected', 'orphan_converted')
                AND DATE(ss.updated_at) = $2
            `;
            const { rows: detectedResult } = await pool.query(detectedQuery, [clinic_id, today]);

            res.status(200).json({
                orphan_sessions: orphanSessions,
                missed_appointments: missedAppointments,
                detected_today: parseInt(detectedResult[0]?.count || 0),
                total_pending: orphanSessions.length + missedAppointments.length
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao buscar ações pendentes:', error);
            next(error);
        }
    },

    /**
     * NOVO: Notificar terapeuta sobre agendamentos não realizados
     * POST /api/admin/scheduling/notify-therapist
     * ✅ INTEGRADO: Usa sistema de notificações existente (notificationstatus)
     */
    async notifyTherapist(req, res, next) {
        try {
            const { therapist_id, appointment_id } = req.body;
            const { clinic_id, is_admin } = req.user;

            // Validar que é admin
            if (!is_admin) {
                return res.status(403).json({
                    errors: [{ msg: 'Apenas administradores podem enviar notificações.' }]
                });
            }

            const pool = require('../models/db');
            const NotificationStatus = require('../models/notificationStatusModel');

            // Validar terapeuta pertence à clínica
            const therapistCheck = await pool.query(
                'SELECT id, full_name FROM users WHERE id = $1 AND clinic_id = $2',
                [therapist_id, clinic_id]
            );

            if (therapistCheck.rows.length === 0) {
                return res.status(404).json({
                    errors: [{ msg: 'Terapeuta não encontrado nesta clínica.' }]
                });
            }

            // Buscar agendamento para pegar o patient_id
            const appointmentQuery = `
                SELECT ss.*, p.id as patient_id, p.name as patient_name
                FROM scheduled_sessions ss
                JOIN patients p ON ss.patient_id = p.id
                WHERE ss.id = $1 AND p.clinic_id = $2 AND ss.therapist_id = $3
            `;
            const { rows: appointments } = await pool.query(
                appointmentQuery,
                [appointment_id, clinic_id, therapist_id]
            );

            if (appointments.length === 0) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            const appointment = appointments[0];
            const therapist = therapistCheck.rows[0];

            // ✅ USAR SISTEMA EXISTENTE: Incrementar contador de notificações
            // Tipo: 'scheduling_reminder' (novo enum adicionado)
            await NotificationStatus.incrementUnreadCount(
                therapist_id,
                appointment.patient_id,
                'scheduling_reminder'
            );

            res.status(200).json({
                success: true,
                message: 'Notificação enviada com sucesso!',
                therapist_name: therapist.full_name,
                patient_name: appointment.patient_name,
                appointment_id: appointment_id
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao notificar terapeuta:', error);
            next(error);
        }
    },

    /**
     * NOVO: Criar agendamentos retroativos em lote
     * POST /api/scheduling/retroactive/batch
     */
    async createBatchRetroactive(req, res, next) {
        try {
            const { session_ids, common_data } = req.body;
            const { id: userId, clinic_id } = req.user;
            const pool = require('../models/db');

            if (!Array.isArray(session_ids) || session_ids.length === 0) {
                return res.status(400).json({
                    errors: [{ msg: 'Forneça pelo menos um session_id' }]
                });
            }

            if (session_ids.length > 50) {
                return res.status(400).json({
                    errors: [{ msg: 'Máximo de 50 agendamentos por vez' }]
                });
            }

            const results = {
                total: session_ids.length,
                created: 0,
                failed: 0,
                appointments: [],
                errors: []
            };

            // Criar retroativo para cada sessão
            for (const sessionId of session_ids) {
                try {
                    // Buscar dados da sessão órfã
                    const orphanQuery = `
                        SELECT
                            ppp.id as session_id,
                            ppp.session_date,
                            ppa.patient_id,
                            ppa.therapist_id,
                            p.clinic_id
                        FROM patient_program_progress ppp
                        JOIN patient_program_assignments ppa ON ppp.assignment_id = ppa.id
                        JOIN patients p ON ppa.patient_id = p.id
                        WHERE ppp.id = $1 AND p.clinic_id = $2
                    `;

                    const { rows } = await pool.query(orphanQuery, [sessionId, clinic_id]);

                    if (rows.length === 0) {
                        results.failed++;
                        results.errors.push(`Sessão ${sessionId}: não encontrada ou não pertence a esta clínica`);
                        continue;
                    }

                    const orphan = rows[0];

                    // Criar agendamento retroativo
                    const retroactiveData = {
                        patient_id: orphan.patient_id,
                        therapist_id: orphan.therapist_id,
                        session_date: orphan.session_date,
                        session_time: '10:00', // Horário padrão
                        session_id: sessionId,
                        created_by: userId,
                        discipline_id: common_data.discipline_id || null,
                        notes: common_data.notes || 'Agendamento retroativo criado em lote'
                    };

                    const appointment = await ScheduledSessionModel.createRetroactiveAppointment(retroactiveData);

                    results.created++;
                    results.appointments.push(appointment);

                } catch (error) {
                    results.failed++;
                    results.errors.push(`Sessão ${sessionId}: ${error.message}`);
                    console.error(`[BATCH-RETROACTIVE] Erro na sessão ${sessionId}:`, error);
                }
            }

            res.status(results.created > 0 ? 200 : 400).json({
                message: `${results.created} de ${results.total} agendamentos criados`,
                ...results
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao criar retroativos em lote:', error);
            next(error);
        }
    },

    /**
     * NOVO: Executar manutenção manual (admin apenas)
     * POST /api/scheduling/run-maintenance
     */
    async runMaintenanceManually(req, res, next) {
        try {
            // Verificar se é admin
            if (!req.user.is_admin) {
                return res.status(403).json({
                    errors: [{ msg: 'Acesso negado. Apenas administradores podem executar manutenção manual.' }]
                });
            }

            const SessionMaintenanceJob = require('../jobs/sessionMaintenanceJob');

            const results = await SessionMaintenanceJob.runMaintenanceRoutine({
                lookbackHours: 24,
                missedAfterHours: 2,
                notifyUsers: false
            });

            res.status(200).json({
                message: 'Manutenção executada com sucesso',
                results
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao executar manutenção manual:', error);
            next(error);
        }
    },

    /**
     * Atualiza toda uma série de agendamentos recorrentes futuros
     * PUT /api/admin/scheduling/recurring-series/:templateId
     */
    async updateRecurringSeries(req, res, next) {
        try {
            const { templateId } = req.params;
            const { appointment_id, scheduled_time, duration_minutes, notes } = req.body;
            const { clinic_id } = req.user;

            if (!appointment_id) {
                return res.status(400).json({
                    errors: [{ msg: 'ID do agendamento de referência é obrigatório' }]
                });
            }

            const updateData = {};
            if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
            if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
            if (notes !== undefined) updateData.notes = notes;

            const updatedAppointments = await ScheduledSessionModel.updateRecurringSeries(
                parseInt(templateId),
                updateData,
                clinic_id,
                parseInt(appointment_id)
            );

            res.status(200).json({
                message: `${updatedAppointments.length} agendamento(s) atualizado(s) com sucesso`,
                count: updatedAppointments.length,
                appointments: updatedAppointments
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao atualizar série recorrente:', error);
            next(error);
        }
    },

    /**
     * Exclui toda uma série de agendamentos recorrentes futuros
     * DELETE /api/admin/scheduling/recurring-series/:templateId
     */
    async deleteRecurringSeries(req, res, next) {
        try {
            const { templateId } = req.params;
            const { appointment_id } = req.body;
            const { clinic_id } = req.user;

            if (!appointment_id) {
                return res.status(400).json({
                    errors: [{ msg: 'ID do agendamento de referência é obrigatório' }]
                });
            }

            const deletedCount = await ScheduledSessionModel.deleteRecurringSeries(
                parseInt(templateId),
                clinic_id,
                parseInt(appointment_id)
            );

            res.status(200).json({
                message: `${deletedCount} agendamento(s) excluído(s) com sucesso`,
                count: deletedCount
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao excluir série recorrente:', error);
            next(error);
        }
    },

    /**
     * Busca próximas ocorrências de uma série recorrente
     * GET /api/admin/scheduling/recurring-series/:templateId/next
     */
    async getNextOccurrences(req, res, next) {
        try {
            const { templateId } = req.params;
            const { limit = 10 } = req.query;
            const { clinic_id } = req.user;

            const occurrences = await ScheduledSessionModel.findNextOccurrences(
                parseInt(templateId),
                clinic_id,
                parseInt(limit)
            );

            res.status(200).json({
                occurrences,
                count: occurrences.length
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao buscar próximas ocorrências:', error);
            next(error);
        }
    },

    /**
     * Valida conflitos de horário antes de criar agendamento
     * POST /api/admin/scheduling/validate-conflicts
     */
    async validateConflicts(req, res, next) {
        try {
            const { patient_id, therapist_id, scheduled_date, scheduled_time, duration_minutes = 60, exclude_id = null } = req.body;
            const { clinic_id } = req.user;

            // Validar que paciente pertence à clínica
            const patientCheck = await pool.query(
                'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2',
                [patient_id, clinic_id]
            );

            if (patientCheck.rows.length === 0) {
                return res.status(403).json({
                    errors: [{ msg: 'Paciente não pertence a esta clínica.' }]
                });
            }

            const hasConflict = await ScheduledSessionModel.checkSessionConflict(
                patient_id,
                therapist_id,
                scheduled_date,
                scheduled_time,
                duration_minutes,
                exclude_id
            );

            res.status(200).json({
                hasConflict,
                message: hasConflict
                    ? 'Conflito de horário detectado. Já existe um agendamento neste horário para o paciente ou terapeuta.'
                    : 'Nenhum conflito detectado. Horário disponível.'
            });

        } catch (error) {
            console.error('[SCHEDULING] Erro ao validar conflitos:', error);
            next(error);
        }
    },

    /**
     * Valida se existe assignment entre paciente e terapeuta
     * POST /api/admin/scheduling/validate-assignment
     */
    async validateAssignment(req, res, next) {
        try {
            const { patient_id, therapist_id } = req.body;
            const { clinic_id } = req.user;

            const validation = await ScheduledSessionModel.validatePatientTherapistAssignment(
                patient_id,
                therapist_id,
                clinic_id
            );

            res.status(200).json(validation);

        } catch (error) {
            console.error('[SCHEDULING] Erro ao validar assignment:', error);
            next(error);
        }
    }
};

module.exports = SchedulingController;