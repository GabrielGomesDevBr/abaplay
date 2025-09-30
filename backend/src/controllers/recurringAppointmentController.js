// backend/src/controllers/recurringAppointmentController.js

const { validationResult } = require('express-validator');
const RecurringAppointmentModel = require('../models/recurringAppointmentModel');
const { normalizeToDateString } = require('../utils/appointmentValidation');

const formatValidationErrors = (errors) => {
    return { errors: errors.array().map(err => ({ msg: err.msg, param: err.param || err.path })) };
};

/**
 * Controller para gerenciar templates de agendamentos recorrentes
 * Adaptado para a estrutura atual (patient_id + therapist_id + discipline_id)
 */
const RecurringAppointmentController = {

    /**
     * Criar template de recorrência
     * POST /api/admin/recurring-appointments
     */
    async createTemplate(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const {
                patient_id,
                therapist_id,
                discipline_id = null,
                recurrence_type,
                day_of_week,
                scheduled_time,
                duration_minutes = 60,
                start_date,
                end_date = null,
                generate_weeks_ahead = 4,
                skip_holidays = false,
                notes
            } = req.body;

            const { id: userId } = req.user;

            // Verificar conflitos antes de criar
            const conflictData = {
                patient_id: parseInt(patient_id),
                therapist_id: parseInt(therapist_id),
                day_of_week: parseInt(day_of_week),
                scheduled_time,
                start_date: normalizeToDateString(start_date),
                end_date: end_date ? normalizeToDateString(end_date) : null
            };

            const conflicts = await RecurringAppointmentModel.checkConflicts(conflictData);
            if (conflicts.length > 0) {
                return res.status(409).json({
                    errors: [{
                        msg: `Conflito detectado: já existem ${conflicts.length} agendamentos no mesmo horário`,
                        conflicts: conflicts.slice(0, 3) // Mostrar apenas os primeiros 3
                    }]
                });
            }

            const templateData = {
                patient_id: parseInt(patient_id),
                therapist_id: parseInt(therapist_id),
                discipline_id: discipline_id ? parseInt(discipline_id) : null,
                recurrence_type,
                day_of_week: parseInt(day_of_week),
                scheduled_time,
                duration_minutes: parseInt(duration_minutes),
                start_date: normalizeToDateString(start_date),
                end_date: end_date ? normalizeToDateString(end_date) : null,
                generate_weeks_ahead: parseInt(generate_weeks_ahead),
                skip_holidays: Boolean(skip_holidays),
                created_by: userId,
                notes
            };

            const newTemplate = await RecurringAppointmentModel.createTemplate(templateData);

            // Gerar primeiros agendamentos automaticamente
            const generationResults = await RecurringAppointmentModel.generateAppointments(newTemplate.id);

            res.status(201).json({
                message: 'Template de recorrência criado com sucesso!',
                template: newTemplate,
                generated_appointments: generationResults.filter(r => r.success).length,
                conflicts: generationResults.filter(r => !r.success).length
            });

        } catch (error) {
            if (error.message.includes('não encontrado')) {
                return res.status(400).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error('[RECURRING-CONTROLLER] Erro ao criar template:', error);
            next(error);
        }
    },

    /**
     * Listar templates de recorrência
     * GET /api/admin/recurring-appointments
     */
    async getTemplates(req, res, next) {
        try {
            const { clinic_id } = req.user;
            const { patient_id, therapist_id, status } = req.query;

            const filters = {
                patient_id: patient_id ? parseInt(patient_id) : undefined,
                therapist_id: therapist_id ? parseInt(therapist_id) : undefined,
                status
            };

            const templates = await RecurringAppointmentModel.getActiveTemplates(clinic_id, filters);

            res.status(200).json({
                templates,
                total: templates.length
            });

        } catch (error) {
            console.error('[RECURRING-CONTROLLER] Erro ao buscar templates:', error);
            next(error);
        }
    },

    /**
     * Buscar template específico
     * GET /api/admin/recurring-appointments/:id
     */
    async getTemplateById(req, res, next) {
        try {
            const { id } = req.params;
            const { clinic_id } = req.user;

            const template = await RecurringAppointmentModel.findById(parseInt(id), clinic_id);

            if (!template) {
                return res.status(404).json({
                    errors: [{ msg: 'Template não encontrado.' }]
                });
            }

            // Buscar agendamentos do template
            const appointments = await RecurringAppointmentModel.getTemplateAppointments(
                parseInt(id),
                { limit: 20 }
            );

            res.status(200).json({
                template,
                appointments
            });

        } catch (error) {
            console.error(`[RECURRING-CONTROLLER] Erro ao buscar template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Atualizar template de recorrência
     * PUT /api/admin/recurring-appointments/:id
     */
    async updateTemplate(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(formatValidationErrors(errors));
        }

        try {
            const { id } = req.params;
            const { clinic_id } = req.user;
            const updates = req.body;

            // Normalizar datas se presentes
            if (updates.start_date) {
                updates.start_date = normalizeToDateString(updates.start_date);
            }
            if (updates.end_date) {
                updates.end_date = normalizeToDateString(updates.end_date);
            }

            const updatedTemplate = await RecurringAppointmentModel.updateTemplate(
                parseInt(id),
                updates,
                clinic_id
            );

            res.status(200).json({
                message: 'Template atualizado com sucesso!',
                template: updatedTemplate
            });

        } catch (error) {
            if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
                return res.status(404).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error(`[RECURRING-CONTROLLER] Erro ao atualizar template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Gerar mais agendamentos de um template
     * POST /api/admin/recurring-appointments/:id/generate
     */
    async generateMoreAppointments(req, res, next) {
        try {
            const { id } = req.params;
            const { weeks_ahead = 4 } = req.body;
            const { clinic_id } = req.user;

            // Verificar se template existe e pertence à clínica
            const template = await RecurringAppointmentModel.findById(parseInt(id), clinic_id);
            if (!template) {
                return res.status(404).json({
                    errors: [{ msg: 'Template não encontrado.' }]
                });
            }

            const results = await RecurringAppointmentModel.generateAppointments(
                parseInt(id),
                parseInt(weeks_ahead)
            );

            const successful = results.filter(r => r.success);
            const conflicts = results.filter(r => !r.success);

            res.status(200).json({
                message: `Geração concluída: ${successful.length} agendamentos criados, ${conflicts.length} conflitos.`,
                generated: successful,
                conflicts: conflicts,
                summary: {
                    total_generated: successful.length,
                    total_conflicts: conflicts.length
                }
            });

        } catch (error) {
            console.error(`[RECURRING-CONTROLLER] Erro ao gerar agendamentos do template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Pausar template temporariamente
     * POST /api/admin/recurring-appointments/:id/pause
     */
    async pauseTemplate(req, res, next) {
        try {
            const { id } = req.params;
            const { reason, pause_until = null } = req.body;
            const { clinic_id } = req.user;

            if (!reason) {
                return res.status(400).json({
                    errors: [{ msg: 'Motivo da pausa é obrigatório.' }]
                });
            }

            const success = await RecurringAppointmentModel.pauseTemplate(
                parseInt(id),
                reason,
                pause_until ? normalizeToDateString(pause_until) : null,
                clinic_id
            );

            if (success) {
                res.status(200).json({
                    message: 'Template pausado com sucesso!',
                    pause_reason: reason,
                    pause_until: pause_until
                });
            } else {
                res.status(404).json({
                    errors: [{ msg: 'Template não encontrado ou já inativo.' }]
                });
            }

        } catch (error) {
            if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
                return res.status(404).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error(`[RECURRING-CONTROLLER] Erro ao pausar template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Reativar template pausado
     * POST /api/admin/recurring-appointments/:id/resume
     */
    async resumeTemplate(req, res, next) {
        try {
            const { id } = req.params;
            const { clinic_id } = req.user;

            const success = await RecurringAppointmentModel.resumeTemplate(parseInt(id), clinic_id);

            if (success) {
                // Gerar agendamentos para compensar o tempo pausado
                const results = await RecurringAppointmentModel.generateAppointments(parseInt(id));
                const generated = results.filter(r => r.success).length;

                res.status(200).json({
                    message: 'Template reativado com sucesso!',
                    generated_appointments: generated
                });
            } else {
                res.status(404).json({
                    errors: [{ msg: 'Template não encontrado ou já ativo.' }]
                });
            }

        } catch (error) {
            if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
                return res.status(404).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error(`[RECURRING-CONTROLLER] Erro ao reativar template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Desativar template permanentemente
     * DELETE /api/admin/recurring-appointments/:id
     */
    async deactivateTemplate(req, res, next) {
        try {
            const { id } = req.params;
            const { reason = 'Desativado pelo administrador' } = req.body;
            const { clinic_id, id: userId } = req.user;

            const deactivatedTemplate = await RecurringAppointmentModel.deactivateTemplate(
                parseInt(id),
                reason,
                userId,
                clinic_id
            );

            res.status(200).json({
                message: 'Template desativado com sucesso!',
                template: deactivatedTemplate
            });

        } catch (error) {
            if (error.message.includes('não encontrado') || error.message.includes('não pertence')) {
                return res.status(404).json({
                    errors: [{ msg: error.message }]
                });
            }
            console.error(`[RECURRING-CONTROLLER] Erro ao desativar template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Buscar agendamentos de um template
     * GET /api/admin/recurring-appointments/:id/appointments
     */
    async getTemplateAppointments(req, res, next) {
        try {
            const { id } = req.params;
            const { start_date, end_date, status, limit = 50 } = req.query;
            const { clinic_id } = req.user;

            // Verificar se template existe e pertence à clínica
            const template = await RecurringAppointmentModel.findById(parseInt(id), clinic_id);
            if (!template) {
                return res.status(404).json({
                    errors: [{ msg: 'Template não encontrado.' }]
                });
            }

            const appointments = await RecurringAppointmentModel.getTemplateAppointments(
                parseInt(id),
                {
                    start_date: start_date ? normalizeToDateString(start_date) : undefined,
                    end_date: end_date ? normalizeToDateString(end_date) : undefined,
                    status,
                    limit: parseInt(limit)
                }
            );

            res.status(200).json({
                appointments,
                template_info: {
                    id: template.id,
                    patient_name: template.patient_name,
                    therapist_name: template.therapist_name,
                    recurrence_type: template.recurrence_type,
                    status: template.status_calculated
                }
            });

        } catch (error) {
            console.error(`[RECURRING-CONTROLLER] Erro ao buscar agendamentos do template ${req.params.id}:`, error);
            next(error);
        }
    },

    /**
     * Verificar conflitos potenciais de um template
     * POST /api/admin/recurring-appointments/check-conflicts
     */
    async checkConflicts(req, res, next) {
        try {
            const {
                patient_id,
                therapist_id,
                day_of_week,
                scheduled_time,
                start_date,
                end_date = null
            } = req.body;

            const conflictData = {
                patient_id: parseInt(patient_id),
                therapist_id: parseInt(therapist_id),
                day_of_week: parseInt(day_of_week),
                scheduled_time,
                start_date: normalizeToDateString(start_date),
                end_date: end_date ? normalizeToDateString(end_date) : null
            };

            const conflicts = await RecurringAppointmentModel.checkConflicts(conflictData);

            res.status(200).json({
                has_conflicts: conflicts.length > 0,
                conflict_count: conflicts.length,
                conflicts: conflicts.slice(0, 5) // Mostrar apenas os primeiros 5
            });

        } catch (error) {
            console.error('[RECURRING-CONTROLLER] Erro ao verificar conflitos:', error);
            next(error);
        }
    },

    /**
     * Executar job manual de geração de agendamentos
     * POST /api/admin/recurring-appointments/generate-all
     */
    async generateAllPending(req, res, next) {
        try {
            const { clinic_id } = req.user;

            const templates = await RecurringAppointmentModel.getTemplatesForGeneration(clinic_id);

            let totalGenerated = 0;
            let totalConflicts = 0;
            const processedTemplates = [];

            for (const template of templates) {
                try {
                    const results = await RecurringAppointmentModel.generateAppointments(template.id);
                    const generated = results.filter(r => r.success).length;
                    const conflicts = results.filter(r => !r.success).length;

                    totalGenerated += generated;
                    totalConflicts += conflicts;

                    processedTemplates.push({
                        id: template.id,
                        patient_name: template.patient_name,
                        therapist_name: template.therapist_name,
                        generated,
                        conflicts
                    });
                } catch (templateError) {
                    console.error(`[RECURRING-CONTROLLER] Erro ao processar template ${template.id}:`, templateError);
                    processedTemplates.push({
                        id: template.id,
                        patient_name: template.patient_name,
                        therapist_name: template.therapist_name,
                        generated: 0,
                        conflicts: 0,
                        error: templateError.message
                    });
                }
            }

            res.status(200).json({
                message: `Job concluído: ${totalGenerated} agendamentos gerados de ${templates.length} templates.`,
                summary: {
                    templates_processed: templates.length,
                    total_generated: totalGenerated,
                    total_conflicts: totalConflicts
                },
                templates: processedTemplates
            });

        } catch (error) {
            console.error('[RECURRING-CONTROLLER] Erro no job de geração:', error);
            next(error);
        }
    }
};

module.exports = RecurringAppointmentController;