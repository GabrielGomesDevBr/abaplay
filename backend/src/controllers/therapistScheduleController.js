// backend/src/controllers/therapistScheduleController.js

const { validationResult } = require('express-validator');
const ScheduledSessionModel = require('../models/scheduledSessionModel');

const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

/**
 * Controller para agenda dos terapeutas
 * Implementação da Fase 1 - MVP do Sistema de Agendamento
 */
const TherapistScheduleController = {

    /**
     * Buscar agenda pessoal do terapeuta
     * GET /api/therapist/schedule
     */
    async getPersonalSchedule(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { start_date, end_date, days_ahead = 7 } = req.query;

            let appointments;

            if (start_date && end_date) {
                // Buscar por período específico
                appointments = await ScheduledSessionModel.findByTherapist(userId, start_date, end_date);
            } else {
                // Buscar próximos agendamentos
                appointments = await ScheduledSessionModel.getUpcomingByTherapist(userId, parseInt(days_ahead));
            }

            res.status(200).json({
                appointments,
                therapist_id: userId,
                period: { start_date, end_date, days_ahead }
            });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao buscar agenda do terapeuta ${req.user.id}:`, error);
            next(error);
        }
    },

    /**
     * Buscar próximos agendamentos do terapeuta
     * GET /api/therapist/schedule/upcoming
     */
    async getUpcomingAppointments(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { days_ahead = 3 } = req.query;

            const upcomingAppointments = await ScheduledSessionModel.getUpcomingByTherapist(userId, parseInt(days_ahead));

            // Separar por data para melhor organização
            const appointmentsByDate = {};
            upcomingAppointments.forEach(appointment => {
                const date = appointment.scheduled_date;
                if (!appointmentsByDate[date]) {
                    appointmentsByDate[date] = [];
                }
                appointmentsByDate[date].push(appointment);
            });

            res.status(200).json({
                appointments: upcomingAppointments,
                appointments_by_date: appointmentsByDate,
                therapist_id: userId
            });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao buscar próximos agendamentos do terapeuta ${req.user.id}:`, error);
            next(error);
        }
    },

    /**
     * Buscar agendamentos do dia atual
     * GET /api/therapist/schedule/today
     */
    async getTodaySchedule(req, res, next) {
        try {
            const { id: userId } = req.user;
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            const todayAppointments = await ScheduledSessionModel.findByTherapist(userId, today, today);

            // Organizar por horário
            const sortedAppointments = todayAppointments.sort((a, b) => {
                return a.scheduled_time.localeCompare(b.scheduled_time);
            });

            // Calcular estatísticas do dia
            const stats = {
                total: sortedAppointments.length,
                completed: sortedAppointments.filter(a => a.status === 'completed').length,
                scheduled: sortedAppointments.filter(a => a.status === 'scheduled').length,
                missed: sortedAppointments.filter(a => a.status === 'missed').length,
                cancelled: sortedAppointments.filter(a => a.status === 'cancelled').length
            };

            res.status(200).json({
                appointments: sortedAppointments,
                daily_stats: stats,
                date: today,
                therapist_id: userId
            });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao buscar agenda de hoje do terapeuta ${req.user.id}:`, error);
            next(error);
        }
    },

    /**
     * Adicionar justificativa para agendamento perdido
     * POST /api/therapist/schedule/justify/:id
     */
    async justifyMissedAppointment(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const { id } = req.params;
            const { missed_reason, missed_by } = req.body;
            const { id: userId, clinic_id } = req.user;

            // Verificar se o agendamento pertence ao terapeuta
            const appointment = await ScheduledSessionModel.findById(parseInt(id), clinic_id);

            if (!appointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            if (appointment.therapist_id !== userId) {
                return res.status(403).json({
                    errors: [{ msg: 'Acesso negado. Este agendamento não pertence a você.' }]
                });
            }

            // Verificar se o agendamento pode ser justificado
            if (appointment.status !== 'missed') {
                return res.status(400).json({
                    errors: [{ msg: 'Apenas agendamentos perdidos podem ser justificados.' }]
                });
            }

            const updateData = {
                missed_reason,
                missed_by,
                justified_by: userId,
                justified_at: new Date().toISOString()
            };

            const justifiedAppointment = await ScheduledSessionModel.update(parseInt(id), updateData, clinic_id);

            res.status(200).json({
                message: 'Justificativa adicionada com sucesso!',
                appointment: justifiedAppointment
            });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao justificar agendamento ID ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Buscar estatísticas pessoais do terapeuta
     * GET /api/therapist/schedule/statistics
     */
    async getPersonalStatistics(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { start_date, end_date, period = 'month' } = req.query;

            let calculatedStartDate = start_date;
            let calculatedEndDate = end_date;

            // Se não informar período, usar padrão baseado no parâmetro period
            if (!start_date || !end_date) {
                const now = new Date();
                calculatedEndDate = now.toISOString().split('T')[0];

                switch (period) {
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        calculatedStartDate = weekAgo.toISOString().split('T')[0];
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                        calculatedStartDate = monthAgo.toISOString().split('T')[0];
                        break;
                    case 'quarter':
                        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                        calculatedStartDate = quarterAgo.toISOString().split('T')[0];
                        break;
                    default:
                        calculatedStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                }
            }

            // Buscar estatísticas usando função do banco
            const stats = await ScheduledSessionModel.getTherapistStats(userId, calculatedStartDate, calculatedEndDate);

            // Buscar agendamentos do período para análises adicionais
            const appointments = await ScheduledSessionModel.findByTherapist(userId, calculatedStartDate, calculatedEndDate);

            // Análises adicionais
            const analysisData = {
                // Agendamentos por dia da semana
                appointments_by_weekday: {},
                // Agendamentos por horário
                appointments_by_hour: {},
                // Pacientes atendidos
                unique_patients: new Set(appointments.map(a => a.patient_id)).size,
                // Programas trabalhados
                unique_programs: new Set(appointments.map(a => a.program_id)).size
            };

            // Análise por dia da semana
            appointments.forEach(appointment => {
                const date = new Date(appointment.scheduled_date);
                const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });

                if (!analysisData.appointments_by_weekday[weekday]) {
                    analysisData.appointments_by_weekday[weekday] = 0;
                }
                analysisData.appointments_by_weekday[weekday]++;

                // Análise por horário
                const hour = appointment.scheduled_time.split(':')[0];
                if (!analysisData.appointments_by_hour[hour]) {
                    analysisData.appointments_by_hour[hour] = 0;
                }
                analysisData.appointments_by_hour[hour]++;
            });

            res.status(200).json({
                statistics: stats,
                analysis: analysisData,
                period: {
                    start_date: calculatedStartDate,
                    end_date: calculatedEndDate,
                    period_type: period
                },
                therapist_id: userId
            });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao buscar estatísticas do terapeuta ${req.user.id}:`, error);
            next(error);
        }
    },

    /**
     * Buscar agendamentos perdidos que precisam de justificativa
     * GET /api/therapist/schedule/missed
     */
    async getMissedAppointments(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { include_justified = false } = req.query;

            // Buscar agendamentos perdidos
            const appointments = await ScheduledSessionModel.findByTherapist(userId);

            let missedAppointments = appointments.filter(appointment => appointment.status === 'missed');

            // Filtrar por justificados se solicitado
            if (!include_justified) {
                missedAppointments = missedAppointments.filter(appointment => !appointment.justified_at);
            }

            // Organizar por data (mais recentes primeiro)
            missedAppointments.sort((a, b) => {
                const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`);
                const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
                return dateB - dateA;
            });

            res.status(200).json({
                appointments: missedAppointments,
                total_missed: missedAppointments.length,
                pending_justification: missedAppointments.filter(a => !a.justified_at).length,
                therapist_id: userId
            });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao buscar agendamentos perdidos do terapeuta ${req.user.id}:`, error);
            next(error);
        }
    },

    /**
     * Buscar agendamento específico do terapeuta
     * GET /api/therapist/schedule/appointments/:id
     */
    async getAppointmentDetails(req, res, next) {
        try {
            const { id } = req.params;
            const { id: userId, clinic_id } = req.user;

            const appointment = await ScheduledSessionModel.findById(parseInt(id), clinic_id);

            if (!appointment) {
                return res.status(404).json({
                    errors: [{ msg: 'Agendamento não encontrado.' }]
                });
            }

            // Verificar se pertence ao terapeuta
            if (appointment.therapist_id !== userId) {
                return res.status(403).json({
                    errors: [{ msg: 'Acesso negado. Este agendamento não pertence a você.' }]
                });
            }

            res.status(200).json({ appointment });

        } catch (error) {
            console.error(`[THERAPIST-SCHEDULE] Erro ao buscar detalhes do agendamento ID ${req.params.id}:`, error);
            next(error);
        }
    }
};

module.exports = TherapistScheduleController;