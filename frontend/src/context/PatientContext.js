import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllAdminPatients } from '../api/adminApi';
import { fetchParentDashboardData } from '../api/parentApi';
// --- CORREÇÃO DE IMPORTAÇÃO (1/2) ---
// 'removeProgramAssignment' foi removido desta linha, pois não pertence a este arquivo.
import { updateAssignmentStatus } from '../api/programApi'; 
import { 
  fetchAllPatients,
  assignProgramToPatient,
  // --- CORREÇÃO DE IMPORTAÇÃO (2/2) ---
  // 'removeProgramAssignment' agora é importado corretamente do patientApi.
  removeProgramAssignment,
  createSession,
  updatePatientNotes
} from '../api/patientApi';

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated, token } = useAuth();

  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);
  
  // Sistema de lock para evitar condições de corrida nos prompt levels
  const promptLevelLocks = React.useRef(new Set());
  
  const refreshData = useCallback(async (patientIdToReselect = null) => {
    if (!isAuthenticated || !user || !token) {
      setPatients([]);
      setSelectedPatient(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      let patientData = [];
      if (user.role === 'super_admin') {
        // Super admin não precisa carregar pacientes no contexto
        patientData = [];
      } else if (user.is_admin) {
        patientData = await fetchAllAdminPatients(token);
      } else if (user.role === 'terapeuta') {
        patientData = await fetchAllPatients(token);
      } else if (user.role === 'pai') {
        const parentData = await fetchParentDashboardData(token);
        patientData = parentData.patient ? [parentData.patient] : [];
        if (parentData.patient) {
          setSelectedPatient(parentData.patient);
        }
      }
      setPatients(patientData);

      if (patientIdToReselect) {
        const reSelected = patientData.find(p => p.id === patientIdToReselect);
        if (reSelected) {
          setSelectedPatient(reSelected);
        }
      } else if (user.role !== 'pai') {
        setSelectedPatient(null);
      }
    } catch (err) {
      setError(err.message || 'Falha ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, token]);

  const selectPatient = useCallback(async (patient) => {
    if (!patient) {
      setSelectedPatient(null);
      return;
    }
    setSelectedPatient(patient);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const performActionAndReload = async (action) => {
    if (!selectedPatient) throw new Error("Nenhum cliente selecionado.");
    const patientId = selectedPatient.id;
    try {
        await action();
        await refreshData(patientId);
    } catch (error) {
        throw error;
    }
  };

  const assignProgram = (programId) => performActionAndReload(() => assignProgramToPatient(selectedPatient.id, programId, token));
  
  const removeProgram = (programId) => {
      if (!selectedPatient) return;
      const assignment = selectedPatient.assigned_programs?.find(p => p.program_id === programId);
      if (!assignment) {
        return;
      }
      const assignmentIdToRemove = assignment.assignment_id;
      if (window.confirm("Tem a certeza que deseja remover este programa permanentemente? Esta ação não pode ser desfeita.")) {
        // A função 'removeProgramAssignment' agora será encontrada pois a importação está correta.
        performActionAndReload(() => removeProgramAssignment(assignmentIdToRemove, token));
      }
  };

  const toggleProgramStatus = (assignmentId, currentStatus) => {
      const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
      performActionAndReload(() => updateAssignmentStatus(assignmentId, newStatus, token));
  };

  const addSession = (sessionData) => performActionAndReload(() => createSession(selectedPatient.id, sessionData, token));
  const saveNotes = (notes) => performActionAndReload(() => updatePatientNotes(selectedPatient.id, notes, token));

  // SOLUÇÃO 1: Busca SEMPRE direta do banco - SEM CACHE
  const getPromptLevelForProgram = useCallback(async (patientId, programId) => {
    try {
      // Log para tracking
      console.log(`[PROMPT-LEVEL-FETCH] Buscando nível para paciente ${patientId}, programa ${programId}`);

      const { getPromptLevelByPatientAndProgram } = await import('../api/promptLevelApi');
      const response = await getPromptLevelByPatientAndProgram(patientId, programId);
      const dbLevel = response.currentPromptLevel;

      // Retorna valor direto do banco ou padrão
      const finalLevel = dbLevel !== null && dbLevel !== undefined ? dbLevel : 5;

      console.log(`[PROMPT-LEVEL-FETCH] Nível encontrado: ${finalLevel} para paciente ${patientId}, programa ${programId}`);
      return finalLevel;

    } catch (error) {
      console.error(`[PROMPT-LEVEL-ERROR] Erro ao buscar nível para paciente ${patientId}, programa ${programId}:`, error);

      // Fallback: padrão 5 (Independente) apenas em caso de erro
      return 5;
    }
  }, []);

  // SOLUÇÃO 1 + 3: Salva IMEDIATAMENTE com lock anti-corrida
  const setPromptLevelForProgram = useCallback(async (patientId, programId, level, assignmentId = null) => {
    const key = `${patientId}_${programId}`;

    // Verifica se já existe operação em andamento
    if (promptLevelLocks.current.has(key)) {
      console.log(`[PROMPT-LEVEL-LOCK] Operação em andamento para ${key}, ignorando nova chamada`);
      return;
    }

    if (!assignmentId) {
      console.error(`[PROMPT-LEVEL-ERROR] assignmentId não fornecido para paciente ${patientId}, programa ${programId}`);
      return;
    }

    // Adiciona lock
    promptLevelLocks.current.add(key);

    try {
      console.log(`[PROMPT-LEVEL-SAVE] Salvando nível ${level} para paciente ${patientId}, programa ${programId}, assignment ${assignmentId}`);

      const { updatePromptLevel } = await import('../api/promptLevelApi');
      await updatePromptLevel(assignmentId, level);

      console.log(`[PROMPT-LEVEL-SAVE] Nível ${level} salvo com sucesso no banco para assignment ${assignmentId}`);

    } catch (error) {
      console.error(`[PROMPT-LEVEL-ERROR] Erro ao salvar nível ${level} para assignment ${assignmentId}:`, error);
      throw error; // Re-propaga o erro para o componente que chamou
    } finally {
      // Remove lock sempre
      promptLevelLocks.current.delete(key);
    }
  }, []);

  const value = {
    patients, selectedPatient,
    isLoading,
    error,
    selectPatient,
    isPatientFormOpen, patientToEdit,
    openPatientForm: useCallback((patient = null) => { setPatientToEdit(patient); setIsPatientFormOpen(true); }, []),
    closePatientForm: useCallback(() => { setPatientToEdit(null); setIsPatientFormOpen(false); }, []),
    isReportModalOpen,
    openReportModal: useCallback(() => setIsReportModalOpen(true), []),
    closeReportModal: useCallback(() => setIsReportModalOpen(false), []),
    assignProgram, removeProgram, toggleProgramStatus, addSession, saveNotes,
    refreshPatientData: refreshData,
    refreshAndReselectPatient: useCallback((patientId) => refreshData(patientId), [refreshData]),
    getPromptLevelForProgram, setPromptLevelForProgram
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (context === null) {
    throw new Error('usePatients deve ser usado dentro de um PatientProvider');
  }
  return context;
};
