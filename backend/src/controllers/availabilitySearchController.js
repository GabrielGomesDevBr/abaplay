// backend/src/controllers/availabilityController.js

const availabilityModel = require('../models/availabilityModel');
const { validationResult } = require('express-validator');

/**
 * Helper: Formata data para YYYY-MM-DD string
 * @param {Date|string} date - Data a ser formatada
 */
const formatDate = (date) => {
    if (!date) return null;
    if (typeof date === 'string') {
        // Se já for string, verificar se tem timezone e extrair só a data
        return date.split('T')[0];
    }
    if (date instanceof Date) {
        // Se for objeto Date, converter para YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return null;
};

/**
 * Helper: Normaliza slots garantindo datas em formato string
 */
const normalizeSlots = (slots) => {
    return slots.map(slot => ({
        ...slot,
        available_date: formatDate(slot.available_date)
    }));
};

// ========================================
// BUSCA DE DISPONIBILIDADE
// ========================================

/**
 * Buscar horários disponíveis
 * POST /api/availability/search
 */
exports.searchAvailableSlots = async (req, res) => {
    try {
        console.log('[AVAILABILITY] searchAvailableSlots - Início');
        console.log('[AVAILABILITY] req.body:', JSON.stringify(req.body, null, 2));
        console.log('[AVAILABILITY] req.user:', JSON.stringify({ id: req.user?.id, clinic_id: req.user?.clinic_id }, null, 2));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('[AVAILABILITY] Erros de validação:', errors.array());
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const {
            discipline_id,        // DEPRECATED: manter para compatibilidade
            discipline_ids,       // NOVO: Array de IDs
            day_of_week,
            time_period,
            start_date,
            end_date,
            duration_minutes = 60,
            require_specialty = false,
            preferred_therapist_id,
            patient_id
        } = req.body;

        const clinicId = req.user.clinic_id;
        console.log('[AVAILABILITY] clinicId extraído:', clinicId);

        // COMPATIBILIDADE: Se vier discipline_id (singular), converter para array
        let finalDisciplineIds = discipline_ids;
        if (!finalDisciplineIds && discipline_id) {
            finalDisciplineIds = [discipline_id];
            console.log('[AVAILABILITY] Convertido discipline_id para array:', finalDisciplineIds);
        }

        const params = {
            clinic_id: clinicId,
            discipline_ids: finalDisciplineIds,  // ALTERADO: Agora é array
            day_of_week,
            time_period,
            start_date,
            end_date,
            duration_minutes,
            require_specialty,
            preferred_therapist_id,
            patient_id
        };
        console.log('[AVAILABILITY] Parâmetros para model:', JSON.stringify(params, null, 2));

        const slots = await availabilityModel.searchAvailableSlots(params);
        console.log('[AVAILABILITY] Slots retornados:', slots.length);

        // Normalizar datas para formato string
        const normalizedSlots = normalizeSlots(slots);

        res.json({
            success: true,
            slots: normalizedSlots,
            total: normalizedSlots.length
        });

    } catch (error) {
        console.error('[AVAILABILITY] ERRO em searchAvailableSlots:', error);
        console.error('[AVAILABILITY] Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar disponibilidade',
            error: error.message
        });
    }
};

/**
 * Assistente de agendamento - sugestões inteligentes
 * POST /api/availability/suggest
 */
exports.suggestAppointments = async (req, res) => {
    try {
        console.log('[AVAILABILITY] suggestAppointments - Início');
        console.log('[AVAILABILITY] req.body:', JSON.stringify(req.body, null, 2));

        const {
            patient_id,
            disciplines = [],
            time_period,
            start_date,  // NOVO: Data inicial
            end_date,    // NOVO: Data final
            require_specialty = true,
            max_suggestions_per_discipline = 5
        } = req.body;

        const clinicId = req.user.clinic_id;
        console.log('[AVAILABILITY] clinicId:', clinicId);
        console.log('[AVAILABILITY] Disciplinas solicitadas:', disciplines);
        console.log('[AVAILABILITY] Período de datas:', { start_date, end_date });

        const suggestions = {};

        // Buscar sugestões para cada disciplina
        for (const disciplineId of disciplines) {
            console.log(`[AVAILABILITY] Buscando slots para disciplina ${disciplineId}...`);

            const searchParams = {
                clinic_id: clinicId,
                discipline_id: disciplineId,
                time_period: time_period || 'all',
                duration_minutes: 60,
                require_specialty,
                patient_id
            };

            // Adicionar datas se fornecidas
            if (start_date) {
                searchParams.start_date = start_date;
            }
            if (end_date) {
                searchParams.end_date = end_date;
            }

            const slots = await availabilityModel.searchAvailableSlots(searchParams);

            console.log(`[AVAILABILITY] Disciplina ${disciplineId}: ${slots.length} slots encontrados`);
            const normalizedSlots = normalizeSlots(slots);
            suggestions[disciplineId] = normalizedSlots.slice(0, max_suggestions_per_discipline);
        }

        console.log('[AVAILABILITY] Total de disciplinas com sugestões:', Object.keys(suggestions).length);

        res.json({
            success: true,
            suggestions,
            patient_id
        });

    } catch (error) {
        console.error('[AVAILABILITY] ERRO em suggestAppointments:', error);
        console.error('[AVAILABILITY] Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar sugestões',
            error: error.message
        });
    }
};

// ========================================
// ESPECIALIDADES
// ========================================

/**
 * Obter especialidades de um terapeuta
 * GET /api/availability/therapists/:therapistId/specialties
 */
exports.getTherapistSpecialties = async (req, res) => {
    try {
        const { therapistId } = req.params;

        const specialties = await availabilityModel.getTherapistSpecialties(therapistId);

        res.json({
            success: true,
            specialties
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar especialidades',
            error: error.message
        });
    }
};

/**
 * Atualizar especialidades de um terapeuta
 * POST /api/availability/therapists/:therapistId/specialties
 */
exports.updateTherapistSpecialties = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { specialties } = req.body;

        await availabilityModel.updateTherapistSpecialties(
            therapistId,
            specialties,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Especialidades atualizadas com sucesso'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar especialidades',
            error: error.message
        });
    }
};

// ========================================
// DISPONIBILIDADE PADRÃO
// ========================================

/**
 * Obter horários de trabalho padrão
 * GET /api/availability/therapists/:therapistId/availability
 */
exports.getTherapistAvailability = async (req, res) => {
    try {
        const { therapistId } = req.params;

        const availability = await availabilityModel.getTherapistAvailability(therapistId);

        res.json({
            success: true,
            availability
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar disponibilidade',
            error: error.message
        });
    }
};

/**
 * Definir horários de trabalho padrão
 * POST /api/availability/therapists/:therapistId/availability
 */
exports.setTherapistAvailability = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { schedules } = req.body;

        await availabilityModel.setTherapistAvailability(therapistId, schedules);

        res.json({
            success: true,
            message: 'Horários de trabalho definidos com sucesso'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao definir horários',
            error: error.message
        });
    }
};

// ========================================
// AUSÊNCIAS
// ========================================

/**
 * Criar ausência
 * POST /api/availability/therapists/:therapistId/absences
 */
exports.createAbsence = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const absenceData = {
            ...req.body,
            therapist_id: therapistId,
            approved_by: req.user.id
        };

        const absence = await availabilityModel.createAbsence(absenceData);

        res.json({
            success: true,
            message: 'Ausência registrada com sucesso',
            absence
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar ausência',
            error: error.message
        });
    }
};

/**
 * Listar ausências
 * GET /api/availability/therapists/:therapistId/absences
 */
exports.getAbsences = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { future_only = 'true' } = req.query;

        const absences = await availabilityModel.getTherapistAbsences(
            therapistId,
            future_only === 'true'
        );

        res.json({
            success: true,
            absences
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ausências',
            error: error.message
        });
    }
};

/**
 * Cancelar ausência
 * DELETE /api/availability/absences/:absenceId
 */
exports.deleteAbsence = async (req, res) => {
    try {
        const { absenceId } = req.params;

        const absence = await availabilityModel.deleteAbsence(absenceId);

        if (!absence) {
            return res.status(404).json({
                success: false,
                message: 'Ausência não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Ausência cancelada com sucesso'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao cancelar ausência',
            error: error.message
        });
    }
};

// ========================================
// SALAS
// ========================================

/**
 * Criar sala
 * POST /api/availability/rooms
 */
exports.createRoom = async (req, res) => {
    try {
        const roomData = {
            ...req.body,
            clinic_id: req.user.clinic_id
        };

        const room = await availabilityModel.createRoom(roomData);

        res.json({
            success: true,
            message: 'Sala criada com sucesso',
            room
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao criar sala',
            error: error.message
        });
    }
};

/**
 * Listar salas
 * GET /api/availability/rooms
 */
exports.getRooms = async (req, res) => {
    try {
        const { active_only = 'true' } = req.query;

        const rooms = await availabilityModel.getRooms(
            req.user.clinic_id,
            active_only === 'true'
        );

        res.json({
            success: true,
            rooms
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar salas',
            error: error.message
        });
    }
};

/**
 * Obter salas disponíveis em determinado horário
 * GET /api/availability/rooms/available
 */
exports.getAvailableRooms = async (req, res) => {
    try {
        const { date, time, duration = 60 } = req.query;

        if (!date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Data e horário são obrigatórios'
            });
        }

        const rooms = await availabilityModel.getAvailableRooms(
            req.user.clinic_id,
            date,
            time,
            parseInt(duration)
        );

        res.json({
            success: true,
            rooms
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar salas disponíveis',
            error: error.message
        });
    }
};

/**
 * Atualizar sala
 * PUT /api/availability/rooms/:roomId
 */
exports.updateRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await availabilityModel.updateRoom(roomId, req.body);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Sala não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Sala atualizada com sucesso',
            room
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar sala',
            error: error.message
        });
    }
};

/**
 * Desativar sala
 * DELETE /api/availability/rooms/:roomId
 */
exports.deleteRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await availabilityModel.deleteRoom(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Sala não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Sala desativada com sucesso'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao desativar sala',
            error: error.message
        });
    }
};

// ========================================
// PREFERÊNCIAS
// ========================================

/**
 * Definir preferência paciente-terapeuta
 * POST /api/availability/patients/:patientId/preferences
 */
exports.setPatientPreference = async (req, res) => {
    try {
        const { patientId } = req.params;
        const preferenceData = {
            ...req.body,
            patient_id: patientId,
            set_by: req.user.id
        };

        const preference = await availabilityModel.setPatientPreference(preferenceData);

        res.json({
            success: true,
            message: 'Preferência definida com sucesso',
            preference
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao definir preferência',
            error: error.message
        });
    }
};

/**
 * Obter preferências de um paciente
 * GET /api/availability/patients/:patientId/preferences
 */
exports.getPatientPreferences = async (req, res) => {
    try {
        const { patientId } = req.params;

        const preferences = await availabilityModel.getPatientPreferences(patientId);

        res.json({
            success: true,
            preferences
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar preferências',
            error: error.message
        });
    }
};

// ========================================
// CONFIGURAÇÕES DE DISCIPLINA
// ========================================

/**
 * Definir configurações de disciplinas
 * POST /api/availability/clinic/discipline-settings
 */
exports.setDisciplineSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        await availabilityModel.setDisciplineSettings(req.user.clinic_id, settings);

        res.json({
            success: true,
            message: 'Configurações atualizadas com sucesso'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar configurações',
            error: error.message
        });
    }
};

/**
 * Obter configurações de disciplinas
 * GET /api/availability/clinic/discipline-settings
 */
exports.getDisciplineSettings = async (req, res) => {
    try {
        const settings = await availabilityModel.getDisciplineSettings(req.user.clinic_id);

        res.json({
            success: true,
            settings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar configurações',
            error: error.message
        });
    }
};

// ========================================
// GERENCIAMENTO ADMIN DE DISPONIBILIDADE
// ========================================

/**
 * Obter visão geral de disponibilidade de todos os terapeutas (Admin)
 * GET /api/availability/admin/therapists-overview
 */
exports.getTherapistsOverview = async (req, res) => {
    try {
        const clinicId = req.user.clinic_id;

        // Verificar se é admin (já verificado pelo middleware, mas mantém double-check)
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Acesso restrito a administradores'
            });
        }

        const therapists = await availabilityModel.getTherapistsAvailabilityOverview(clinicId);

        res.json({
            success: true,
            therapists
        });

    } catch (error) {
        console.error('[AVAILABILITY] ERRO em getTherapistsOverview:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar visão geral de terapeutas',
            error: error.message
        });
    }
};

/**
 * Atualizar permissões de um terapeuta (Admin)
 * PUT /api/availability/admin/therapists/:therapistId/permissions
 */
exports.updateTherapistPermissions = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const permissionsData = req.body;

        // Verificar se é admin (já verificado pelo middleware, mas mantém double-check)
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Acesso restrito a administradores'
            });
        }

        const updatedTherapist = await availabilityModel.updateTherapistPermissions(
            therapistId,
            permissionsData,
            req.user.id
        );

        res.json({
            success: true,
            message: 'Permissões atualizadas com sucesso',
            therapist: updatedTherapist
        });

    } catch (error) {
        console.error('[AVAILABILITY] ERRO em updateTherapistPermissions:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar permissões',
            error: error.message
        });
    }
};

/**
 * Obter log de alterações de um terapeuta (Admin)
 * GET /api/availability/admin/therapists/:therapistId/changes-log
 */
exports.getTherapistChangesLog = async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { limit = 50 } = req.query;

        // Verificar se é admin (já verificado pelo middleware, mas mantém double-check)
        if (!req.user.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Acesso restrito a administradores'
            });
        }

        const log = await availabilityModel.getTherapistChangesLog(therapistId, parseInt(limit));

        res.json({
            success: true,
            log
        });

    } catch (error) {
        console.error('[AVAILABILITY] ERRO em getTherapistChangesLog:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar histórico de alterações',
            error: error.message
        });
    }
};

module.exports = exports;
