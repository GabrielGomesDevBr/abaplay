// backend/src/controllers/schedulingController.js

const { validationResult } = require('express-validator');
const ScheduledSessionModel = require('../models/scheduledSessionModel');
const AssignmentModel = require('../models/assignmentModel');
const { validateAppointmentDateTime, formatDateTimeForLog, normalizeToDateString } = require('../utils/appointmentValidation');

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

            res.status(201).json({
                message: 'Agendamento criado com sucesso!',
                appointment: completeAppointment
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
     * Cancelar agendamento
     * DELETE /api/admin/scheduling/appointments/:id
     */
    async cancelAppointment(req, res, next) {
        try {
            const { id } = req.params;
            const { reason = 'Cancelado pelo administrador' } = req.body;
            const { clinic_id } = req.user;

            const cancelledAppointment = await ScheduledSessionModel.cancel(parseInt(id), reason, clinic_id);

            if (!cancelledAppointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            res.status(200).json({
                message: 'Agendamento cancelado com sucesso!',
                appointment: cancelledAppointment
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
     * Adicionar justificativa categorizada a agendamento perdido - NOVA ESTRUTURA
     * POST /api/scheduling/justify-absence/:id
     */
    async justifyAbsence(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const { id } = req.params;
            const { missed_reason_type, missed_reason_description } = req.body;
            const { clinic_id, id: userId } = req.user;

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

            if (!justifiedAppointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            res.status(200).json({
                message: 'Justificativa adicionada com sucesso!',
                appointment: justifiedAppointment
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
    }
};

module.exports = SchedulingController;