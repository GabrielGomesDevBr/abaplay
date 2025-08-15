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
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [error, setError] = useState('');
  const { user, isAuthenticated, token } = useAuth();

  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);
  
  // Estado para persistir níveis de prompting por programa/paciente
  const [promptLevels, setPromptLevels] = useState(() => {
    const saved = localStorage.getItem('promptLevels');
    return saved ? JSON.parse(saved) : {};
  });
  
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
      if (user.is_admin) {
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
        console.error("Erro ao executar ação e recarregar:", error);
        throw error;
    }
  };

  const assignProgram = (programId) => performActionAndReload(() => assignProgramToPatient(selectedPatient.id, programId, token));
  
  const removeProgram = (programId) => {
      if (!selectedPatient) return;
      const assignment = selectedPatient.assigned_programs?.find(p => p.program_id === programId);
      if (!assignment) {
        console.error("Erro: Não foi possível encontrar a referência do programa para remoção.");
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

  // Funções para gerenciar níveis de prompting persistentes com fallback
  const getPromptLevelForProgram = useCallback(async (patientId, programId) => {
    const key = `${patientId}_${programId}`;
    
    // 1. Tenta localStorage primeiro (rápido)
    const localStorageLevel = promptLevels[key];
    if (localStorageLevel !== undefined) {
      return localStorageLevel;
    }
    
    // 2. Se não encontrou no localStorage, tenta buscar no banco
    try {
      const { getPromptLevelByPatientAndProgram } = await import('../api/promptLevelApi');
      const response = await getPromptLevelByPatientAndProgram(patientId, programId);
      const bankLevel = response.currentPromptLevel;
      
      // Salva no localStorage para próximas consultas
      if (bankLevel !== null && bankLevel !== undefined) {
        const newLevels = { ...promptLevels, [key]: bankLevel };
        setPromptLevels(newLevels);
        localStorage.setItem('promptLevels', JSON.stringify(newLevels));
        return bankLevel;
      }
    } catch (error) {
      console.warn('Erro ao buscar prompt level do banco:', error);
    }
    
    // 3. Fallback final: padrão 5 (Independente)
    return 5;
  }, [promptLevels]);

  const setPromptLevelForProgram = useCallback(async (patientId, programId, level, assignmentId = null) => {
    const key = `${patientId}_${programId}`;
    
    // 1. Salva no localStorage imediatamente (experiência rápida)
    const newLevels = { ...promptLevels, [key]: level };
    setPromptLevels(newLevels);
    localStorage.setItem('promptLevels', JSON.stringify(newLevels));
    
    // 2. Tenta salvar no banco de dados (persistência segura)
    if (assignmentId) {
      try {
        const { updatePromptLevel } = await import('../api/promptLevelApi');
        await updatePromptLevel(assignmentId, level);
        console.log(`[PROMPT-LEVEL] Salvo no banco: Assignment ${assignmentId} → Nível ${level}`);
      } catch (error) {
        console.warn('Erro ao salvar prompt level no banco:', error);
        // Não remove do localStorage - mantém a funcionalidade mesmo com erro de rede
      }
    }
  }, [promptLevels]);

  const value = {
    patients, selectedPatient, 
    isLoading, 
    isLoadingPatient,
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
