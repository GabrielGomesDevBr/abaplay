// backend/src/utils/appointmentValidation.js

/**
 * Utilitários para validação de agendamentos
 * Solução robusta para problemas de validação de data/hora
 */

/**
 * Converte uma data para string YYYY-MM-DD
 * @param {string|Date} dateInput - Data em string ou objeto Date
 * @returns {string} Data no formato YYYY-MM-DD
 */
function normalizeToDateString(dateInput) {
    if (!dateInput) return '';

    try {
        // Se é um objeto Date, converter para YYYY-MM-DD
        if (dateInput instanceof Date) {
            // O objeto Date vem como UTC do frontend (ex: 2025-09-27T00:00:00.000Z)
            // Usar componentes UTC pois eles representam a data correta
            const year = dateInput.getUTCFullYear();
            const month = String(dateInput.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateInput.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Se é uma string, validar se já está no formato correto
        if (typeof dateInput === 'string') {
            const trimmed = dateInput.trim();

            // Se já está no formato YYYY-MM-DD, retornar
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                return trimmed;
            }

            // Tentar converter de outros formatos
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
                const [day, month, year] = trimmed.split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            // Tentar parseamento direto
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }

        return '';
    } catch (error) {
        console.error('[APPOINTMENT-VALIDATION] Erro ao normalizar data:', error);
        return '';
    }
}

/**
 * Valida se um agendamento pode ser criado (não está no passado)
 * @param {string|Date} scheduledDate - Data no formato YYYY-MM-DD ou objeto Date
 * @param {string} scheduledTime - Horário no formato HH:MM
 * @param {number} toleranceMinutes - Tolerância em minutos (padrão: 5)
 * @returns {Object} { isValid: boolean, message: string }
 */
function validateAppointmentDateTime(scheduledDate, scheduledTime, toleranceMinutes = 5) {
    try {
        // Validar formato das entradas
        if (!scheduledDate || !scheduledTime) {
            return {
                isValid: false,
                message: 'Data e horário são obrigatórios'
            };
        }

        // Normalizar data para string YYYY-MM-DD
        const normalizedDate = normalizeToDateString(scheduledDate);

        if (!normalizedDate) {
            return {
                isValid: false,
                message: 'Formato de data inválido'
            };
        }

        // Validar formato do horário (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(scheduledTime)) {
            return {
                isValid: false,
                message: 'Horário deve estar no formato HH:MM'
            };
        }

        // Construir data/hora do agendamento no fuso horário local
        // Evitar problemas de UTC vs local timezone
        const [year, month, day] = normalizedDate.split('-').map(Number);
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0);

        // Verificar se a data é válida
        if (isNaN(appointmentDateTime.getTime())) {
            return {
                isValid: false,
                message: 'Data ou horário inválidos'
            };
        }

        // Obter momento atual com tolerância
        const now = new Date();
        const minimumDateTime = new Date(now.getTime() - (toleranceMinutes * 60 * 1000));

        // Validar se não está no passado (considerando tolerância)
        if (appointmentDateTime < minimumDateTime) {
            return {
                isValid: false,
                message: 'Não é possível agendar para datas passadas'
            };
        }

        // Validar se não está muito no futuro (máximo 1 ano)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        if (appointmentDateTime > oneYearFromNow) {
            return {
                isValid: false,
                message: 'Não é possível agendar com mais de 1 ano de antecedência'
            };
        }

        return {
            isValid: true,
            message: 'Data e horário válidos'
        };

    } catch (error) {
        return {
            isValid: false,
            message: 'Erro ao validar data/horário: ' + error.message
        };
    }
}

/**
 * Valida apenas se uma data não está no passado (sem consideração de horário)
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {Object} { isValid: boolean, message: string }
 */
function validateAppointmentDate(dateString) {
    try {
        if (!dateString) {
            return {
                isValid: false,
                message: 'Data é obrigatória'
            };
        }

        const appointmentDate = new Date(dateString + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (appointmentDate < today) {
            return {
                isValid: false,
                message: 'Não é possível agendar para datas passadas'
            };
        }

        return {
            isValid: true,
            message: 'Data válida'
        };

    } catch (error) {
        return {
            isValid: false,
            message: 'Erro ao validar data: ' + error.message
        };
    }
}

/**
 * Formata data/hora para log de forma consistente
 * @param {string} scheduledDate - Data no formato YYYY-MM-DD
 * @param {string} scheduledTime - Horário no formato HH:MM
 * @returns {string} Data/hora formatada para log
 */
function formatDateTimeForLog(scheduledDate, scheduledTime) {
    try {
        const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
        return dateTime.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return `${scheduledDate} ${scheduledTime}`;
    }
}

/**
 * Verifica se dois agendamentos têm conflito de horário
 * @param {Object} appointment1 - Primeiro agendamento
 * @param {Object} appointment2 - Segundo agendamento
 * @returns {boolean} True se há conflito
 */
function checkAppointmentConflict(appointment1, appointment2) {
    try {
        // Se são em datas diferentes, não há conflito
        if (appointment1.scheduled_date !== appointment2.scheduled_date) {
            return false;
        }

        const start1 = new Date(`${appointment1.scheduled_date}T${appointment1.scheduled_time}:00`);
        const end1 = new Date(start1.getTime() + (appointment1.duration_minutes || 60) * 60000);

        const start2 = new Date(`${appointment2.scheduled_date}T${appointment2.scheduled_time}:00`);
        const end2 = new Date(start2.getTime() + (appointment2.duration_minutes || 60) * 60000);

        // Verificar sobreposição: (start1 < end2) && (end1 > start2)
        return (start1 < end2) && (end1 > start2);

    } catch (error) {
        console.error('[APPOINTMENT-VALIDATION] Erro ao verificar conflito:', error);
        return false;
    }
}

module.exports = {
    validateAppointmentDateTime,
    validateAppointmentDate,
    formatDateTimeForLog,
    checkAppointmentConflict,
    normalizeToDateString
};