const Assignment = require('../models/assignmentModel');
const ScheduledSession = require('../models/scheduledSessionModel');
const { getAllPromptLevels, getPromptLevel, isValidPromptLevel, calculateProgressScore } = require('../utils/promptLevels');

/**
 * @description Atribui um programa a um paciente.
 * @route POST /api/assignments/
 */
exports.assignProgramToPatient = async (req, res) => {
    const { patientId, programId } = req.body;
    const therapistId = req.user.id; // Pega o ID do terapeuta logado

    try {
        const assignmentData = { patient_id: patientId, program_id: programId, therapist_id: therapistId };
        const assignment = await Assignment.create(assignmentData);
        res.status(201).json(assignment);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] assignProgramToPatient:', error);
        if (error.code === '23505') { // Código de erro para violação de chave única
            return res.status(409).send('Este programa já foi designado a este paciente.');
        }
        res.status(500).send('Erro ao atribuir programa.');
    }
};

/**
 * @description Remove a atribuição de um programa de um paciente.
 * @route DELETE /api/assignments/:assignmentId
 */
exports.removeProgramFromPatient = async (req, res) => {
    const { assignmentId } = req.params;
    try {
        const result = await Assignment.remove(assignmentId);
        if (result === 0) {
            return res.status(404).send('Atribuição não encontrada para remoção.');
        }
        res.status(200).json({ message: 'Atribuição removida com sucesso' });
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] removeProgramFromPatient (ID: ${assignmentId}):`, error);
        res.status(500).send('Erro interno ao remover atribuição.');
    }
};

/**
 * @description Busca todas as atribuições para um paciente específico.
 * @route GET /api/assignments/patient/:patientId
 */
exports.getAssignedProgramsByPatientId = async (req, res) => {
    const { patientId } = req.params;
    try {
        const assignments = await Assignment.findByPatientId(patientId);
        res.json(assignments);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getAssignedProgramsByPatientId (PatientID: ${patientId}):`, error);
        res.status(500).send('Erro ao buscar programas atribuídos.');
    }
};

/**
 * @description Busca os detalhes de uma atribuição específica.
 * @route GET /api/assignments/:id
 */
exports.getAssignmentDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const details = await Assignment.getAssignmentDetailsById(id);
        if (!details) {
            return res.status(404).json({ 
                message: 'Este programa foi arquivado ou não está mais ativo.',
                error: 'PROGRAM_ARCHIVED'
            });
        }
        res.json(details);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getAssignmentDetails (ID: ${id}):`, error);
        res.status(500).send('Erro ao buscar detalhes da designação.');
    }
};

/**
 * Busca detalhes de uma atribuição incluindo programas arquivados (para dashboards e relatórios).
 * GET /api/assignments/:id/history
 */
exports.getAssignmentDetailsWithHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const details = await Assignment.getAssignmentDetailsWithHistory(id);
        if (!details) {
            return res.status(404).json({ 
                message: 'Atribuição não encontrada.',
                error: 'ASSIGNMENT_NOT_FOUND'
            });
        }
        res.json(details);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getAssignmentDetailsWithHistory (ID: ${id}):`, error);
        res.status(500).send('Erro ao buscar detalhes da atribuição.');
    }
};

/**
 * @description Atualiza o status de uma atribuição.
 * @route PATCH /api/assignments/:id/status
 */
exports.updateAssignmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const updated = await Assignment.updateStatus(id, status);
        res.json(updated);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] updateAssignmentStatus (ID: ${id}):`, error);
        res.status(500).send('Erro ao atualizar status da atribuição.');
    }
};

/**
 * @description Registra o progresso (evolução) de uma sessão.
 * @route POST /api/assignments/progress
 */
exports.recordProgress = async (req, res) => {
    try {
        const progressData = { ...req.body, therapist_id: req.user.id };
        
        // Processa níveis de prompting se fornecidos
        if (progressData.details && progressData.details.promptLevel !== undefined) {
            const promptLevelId = progressData.details.promptLevel;
            
            // Valida nível de prompting
            if (!isValidPromptLevel(promptLevelId)) {
                return res.status(400).json({ 
                    errors: [{ msg: 'Nível de prompting inválido. Deve ser entre 0 e 5.' }] 
                });
            }
            
            // Adiciona informações do nível de prompting
            const promptLevel = getPromptLevel(promptLevelId);
            progressData.details.promptLevelName = promptLevel.name;
            progressData.details.promptLevelColor = promptLevel.color;
            
            // Calcula score de progresso se necessário
            if (progressData.attempts > 0) {
                const successRate = progressData.successes / progressData.attempts;
                progressData.details.progressScore = calculateProgressScore(promptLevelId, successRate);
                
                console.log(`[PROMPT-LEVEL] Nível: ${promptLevel.name} (${promptLevelId}), Taxa: ${Math.round(successRate * 100)}%, Score Progresso: ${progressData.details.progressScore}%`);
            }
        }
        
        const progress = await Assignment.createProgress(progressData);
        res.status(201).json(progress);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] recordProgress:', error);
        res.status(500).send('Erro ao registrar progresso.');
    }
};

/**
 * ✅ NOVO INTELIGENTE: Registra progresso e vincula automaticamente ao agendamento
 * Versão com detecção de mesma sessão, priorização por disciplina, e alertas educacionais
 * @description Registra sessão de programa e vincula ao agendamento correspondente (se existir)
 * @route POST /api/assignments/progress-with-link
 */
exports.recordProgressWithLink = async (req, res) => {
    try {
        const progressData = { ...req.body, therapist_id: req.user.id };
        const {
            patient_id,
            session_date,
            assignment_id,
            create_retroactive = false,
            selected_appointment_id = null
        } = progressData;
        const clinic_id = req.user.clinic_id;

        // 1. Processa níveis de prompting (mesmo fluxo do recordProgress)
        if (progressData.details && progressData.details.promptLevel !== undefined) {
            const promptLevelId = progressData.details.promptLevel;

            if (!isValidPromptLevel(promptLevelId)) {
                return res.status(400).json({
                    errors: [{ msg: 'Nível de prompting inválido. Deve ser entre 0 e 5.' }]
                });
            }

            const promptLevel = getPromptLevel(promptLevelId);
            progressData.details.promptLevelName = promptLevel.name;
            progressData.details.promptLevelColor = promptLevel.color;

            if (progressData.attempts > 0) {
                const successRate = progressData.successes / progressData.attempts;
                progressData.details.progressScore = calculateProgressScore(promptLevelId, successRate);
            }
        }

        // 2. NOVO: Detectar se existe sessão recente (janela de 1 hora) - "mesma sessão"
        const recentSession = await ScheduledSession.detectSameSession({
            patient_id,
            therapist_id: req.user.id,
            session_date,
            clinic_id,
            window_minutes: 60 // 1 hora
        });

        // 3. Buscar disciplina do programa para priorização
        let programDisciplineId = null;
        if (assignment_id) {
            try {
                const assignmentDetails = await Assignment.getAssignmentDetailsById(assignment_id);
                programDisciplineId = assignmentDetails?.discipline_id || null;
            } catch (err) {
                console.warn(`[PROGRESS-LINK] Não foi possível buscar disciplina do assignment ${assignment_id}:`, err.message);
            }
        }

        // 4. Registra progresso normalmente
        const progress = await Assignment.createProgress(progressData);
        console.log(`[PROGRESS-LINK] ✓ Progresso registrado: ID ${progress.id} para paciente ${patient_id} em ${session_date}`);

        // 5. Se houver sessão recente (mesma sessão), usar o mesmo agendamento vinculado
        if (recentSession && selected_appointment_id === null) {
            // Buscar o agendamento que foi vinculado à sessão recente
            const recentAppointmentQuery = await ScheduledSession.findMatchingAppointment({
                patient_id,
                therapist_id: req.user.id,
                session_date,
                discipline_id: programDisciplineId,
                clinic_id
            });

            if (recentAppointmentQuery) {
                // Adicionar nova sessão ao mesmo agendamento (múltiplos programas)
                // Nota: progress_session_id armazena o primeiro registro, mas podemos usar notas para trackear múltiplos
                const updatedNotes = recentAppointmentQuery.notes
                    ? `${recentAppointmentQuery.notes} | Programa adicional ID ${progress.id}`
                    : `Múltiplos programas trabalhados. Primeira sessão: ${recentAppointmentQuery.progress_session_id}, adicional: ${progress.id}`;

                await ScheduledSession.linkToProgressSession(
                    recentAppointmentQuery.id,
                    recentAppointmentQuery.progress_session_id || progress.id, // Manter o primeiro
                    updatedNotes
                );

                console.log(`[PROGRESS-LINK] ✓ Mesma sessão detectada! Vinculado ao mesmo agendamento ${recentAppointmentQuery.id}`);

                return res.status(201).json({
                    success: true,
                    progress,
                    linked: true,
                    same_session: true,
                    appointment: {
                        id: recentAppointmentQuery.id,
                        scheduled_time: recentAppointmentQuery.scheduled_time,
                        discipline_id: recentAppointmentQuery.discipline_id
                    },
                    message: 'Sessão registrada (mesmo atendimento da sessão anterior)!'
                });
            }
        }

        // 6. Se terapeuta selecionou agendamento manualmente (disciplina diferente)
        if (selected_appointment_id) {
            const selectedAppointment = await ScheduledSession.findById(selected_appointment_id, clinic_id);

            if (!selectedAppointment) {
                return res.status(404).json({
                    success: false,
                    errors: [{ msg: 'Agendamento selecionado não encontrado.' }]
                });
            }

            await ScheduledSession.linkToProgressSession(selected_appointment_id, progress.id, progressData.notes);

            console.log(`[PROGRESS-LINK] ✓ Vinculação manual: Agendamento ${selected_appointment_id} ← Sessão ${progress.id}`);

            return res.status(201).json({
                success: true,
                progress,
                linked: true,
                manually_selected: true,
                appointment: {
                    id: selectedAppointment.id,
                    scheduled_time: selectedAppointment.scheduled_time,
                    discipline_id: selectedAppointment.discipline_id
                },
                message: 'Sessão registrada e vinculada ao agendamento selecionado!'
            });
        }

        // 7. Busca agendamento correspondente com priorização por disciplina
        const appointment = await ScheduledSession.findMatchingAppointment({
            patient_id,
            therapist_id: req.user.id,
            session_date,
            discipline_id: programDisciplineId,
            clinic_id
        });

        // 8. Se encontrou agendamento, verificar disciplina
        if (appointment) {
            // Verificar se disciplinas são diferentes (e ambas definidas)
            const disciplineMismatch = programDisciplineId &&
                appointment.discipline_id &&
                programDisciplineId !== appointment.discipline_id;

            if (disciplineMismatch) {
                // Buscar todos os agendamentos disponíveis para o terapeuta escolher
                const allAppointments = await ScheduledSession.findAllMatchingAppointments({
                    patient_id,
                    therapist_id: req.user.id,
                    session_date,
                    clinic_id
                });

                console.log(`[PROGRESS-LINK] ⚠️ Disciplina diferente detectada. Solicitando confirmação do terapeuta.`);

                return res.status(201).json({
                    success: true,
                    progress,
                    linked: false,
                    ask_therapist: true,
                    available_appointments: allAppointments.map(apt => ({
                        id: apt.id,
                        scheduled_time: apt.scheduled_time,
                        discipline_id: apt.discipline_id,
                        discipline_name: apt.discipline_name,
                        status: apt.status
                    })),
                    program_discipline_id: programDisciplineId,
                    message: 'Disciplina do programa difere do agendamento. Qual agendamento corresponde a esta sessão?'
                });
            }

            // Disciplina match ou não definida - vincular automaticamente
            await ScheduledSession.linkToProgressSession(appointment.id, progress.id, progressData.notes);

            console.log(`[PROGRESS-LINK] ✓ Vinculação automática: Agendamento ${appointment.id} ← Sessão ${progress.id}`);

            // Calcular tempo desde o agendamento para alertas educacionais
            const appointmentDateTime = new Date(`${appointment.scheduled_date}T${appointment.scheduled_time}`);
            const now = new Date();
            const hoursSinceAppointment = (now - appointmentDateTime) / (1000 * 60 * 60);

            // Alerta educacional se registro tardio (> 4 horas)
            const delayedRegistration = hoursSinceAppointment > 4;

            return res.status(201).json({
                success: true,
                progress,
                linked: true,
                appointment: {
                    id: appointment.id,
                    scheduled_time: appointment.scheduled_time,
                    discipline_id: appointment.discipline_id,
                    discipline_name: appointment.discipline_name
                },
                delayed_registration: delayedRegistration,
                hours_since_appointment: Math.round(hoursSinceAppointment * 10) / 10,
                message: delayedRegistration
                    ? `Sessão registrada! (Dica: registre logo após a sessão para melhor organização)`
                    : 'Sessão registrada e vinculada ao agendamento!'
            });
        }

        // 9. Nenhum agendamento encontrado - oferecer criar retroativo
        if (create_retroactive) {
            const retroactiveAppointment = await ScheduledSession.createRetroactiveAppointment({
                patient_id,
                therapist_id: req.user.id,
                session_date,
                session_id: progress.id,
                created_by: req.user.id
            });

            console.log(`[PROGRESS-LINK] ✓ Agendamento retroativo criado: ID ${retroactiveAppointment.id} para sessão ${progress.id}`);

            return res.status(201).json({
                success: true,
                progress,
                linked: true,
                appointment: retroactiveAppointment,
                retroactive: true,
                message: 'Sessão registrada e agendamento retroativo criado!'
            });
        }

        // 10. Nenhum agendamento encontrado e não quer retroativo - sugerir
        console.log(`[PROGRESS-LINK] ⚠️ Nenhum agendamento encontrado para paciente ${patient_id} em ${session_date}`);

        return res.status(201).json({
            success: true,
            progress,
            linked: false,
            suggest_retroactive: true,
            message: 'Sessão registrada. Deseja criar um agendamento retroativo?'
        });

    } catch (error) {
        console.error('[CONTROLLER-ERROR] recordProgressWithLink:', error);
        res.status(500).json({
            success: false,
            errors: [{ msg: 'Erro ao registrar progresso com vinculação.' }]
        });
    }
};

/**
 * @description Busca o histórico de progresso de uma atribuição.
 * @route GET /api/assignments/:assignmentId/progress
 */
exports.getEvolutionForAssignment = async (req, res) => {
    const { assignmentId } = req.params;
    try {
        // Esta consulta foi simplificada. A lógica de associar o progresso
        // ao passo específico será feita no frontend usando os dados do progresso.
        const evolution = await Assignment.findProgressByAssignmentId(assignmentId);
        res.json(evolution);
    } catch (error) {
        console.error(`[CONTROLLER-ERROR] getEvolutionForAssignment (AssignmentID: ${assignmentId}):`, error);
        res.status(500).send('Erro ao buscar evolução do paciente.');
    }
};

/**
 * Busca todos os níveis de prompting disponíveis
 * GET /api/assignments/prompt-levels
 */
exports.getPromptLevels = async (req, res) => {
    try {
        const levels = getAllPromptLevels();
        res.status(200).json(levels);
    } catch (error) {
        console.error('[CONTROLLER-ERROR] getPromptLevels:', error);
        res.status(500).json({ errors: [{ msg: 'Erro interno do servidor.' }] });
    }
};

/**
 * @description Atualiza as tentativas customizadas de uma atribuição.
 * @route PUT /api/assignments/:assignmentId/custom-trials
 */
exports.updateCustomTrials = async (req, res) => {
    const { assignmentId } = req.params;
    const { customTrials } = req.body;

    try {
        // Validação: customTrials deve ser um número positivo ou null
        if (customTrials !== null && (isNaN(customTrials) || customTrials < 1)) {
            return res.status(400).json({
                message: 'As tentativas customizadas devem ser um número positivo ou null para usar o padrão.',
                error: 'INVALID_CUSTOM_TRIALS'
            });
        }

        const updatedAssignment = await Assignment.updateCustomTrials(assignmentId, customTrials);

        if (!updatedAssignment) {
            return res.status(404).json({
                message: 'Atribuição não encontrada.',
                error: 'ASSIGNMENT_NOT_FOUND'
            });
        }

        res.status(200).json({
            message: 'Tentativas customizadas atualizadas com sucesso.',
            data: updatedAssignment
        });

    } catch (error) {
        console.error(`[CONTROLLER-ERROR] updateCustomTrials (AssignmentID: ${assignmentId}):`, error);
        res.status(500).json({
            message: 'Erro interno ao atualizar tentativas customizadas.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};
