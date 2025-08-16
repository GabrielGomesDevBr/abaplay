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
  
  // Cache em memória para níveis de prompting (apenas durante a sessão)
  const [promptLevelsCache, setPromptLevelsCache] = useState({});
  const [promptLevelPendingUpdates, setPromptLevelPendingUpdates] = useState({});
  
  // Referência para debouncing
  const debounceTimersRef = React.useRef({});
  
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
      // Limpa cache de prompt levels quando nenhum paciente está selecionado
      setPromptLevelsCache({});
      setPromptLevelPendingUpdates({});
      return;
    }
    setSelectedPatient(patient);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Cleanup dos timers quando o componente for desmontado
  useEffect(() => {
    return () => {
      // Limpa todos os timers de debounce
      const timers = debounceTimersRef.current;
      Object.values(timers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

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

  // Função para buscar nível de prompting (cache em memória + banco de dados)
  const getPromptLevelForProgram = useCallback(async (patientId, programId) => {
    const key = `${patientId}_${programId}`;
    
    // 1. Verifica se há update pendente (optimistic update)
    if (promptLevelPendingUpdates[key] !== undefined) {
      return promptLevelPendingUpdates[key];
    }
    
    // 2. Verifica cache em memória
    if (promptLevelsCache[key] !== undefined) {
      return promptLevelsCache[key];
    }
    
    // 3. Busca no banco de dados e salva no cache
    try {
      const { getPromptLevelByPatientAndProgram } = await import('../api/promptLevelApi');
      const response = await getPromptLevelByPatientAndProgram(patientId, programId);
      const dbLevel = response.currentPromptLevel;
      
      // Salva no cache em memória
      if (dbLevel !== null && dbLevel !== undefined) {
        setPromptLevelsCache(prev => ({ ...prev, [key]: dbLevel }));
        return dbLevel;
      }
    } catch (error) {
      console.warn('Erro ao buscar prompt level do banco:', error);
    }
    
    // 4. Fallback: padrão 5 (Independente)
    const defaultLevel = 5;
    setPromptLevelsCache(prev => ({ ...prev, [key]: defaultLevel }));
    return defaultLevel;
  }, [promptLevelsCache, promptLevelPendingUpdates]);

  const setPromptLevelForProgram = useCallback(async (patientId, programId, level, assignmentId = null) => {
    const key = `${patientId}_${programId}`;
    
    // 1. Optimistic update - atualiza imediatamente o estado visual
    setPromptLevelPendingUpdates(prev => ({ ...prev, [key]: level }));
    setPromptLevelsCache(prev => ({ ...prev, [key]: level }));
    
    // 2. Cancela timer anterior se existir
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }
    
    // 3. Debounced save no banco de dados (500ms)
    debounceTimersRef.current[key] = setTimeout(async () => {
      if (assignmentId) {
        try {
          const { updatePromptLevel } = await import('../api/promptLevelApi');
          await updatePromptLevel(assignmentId, level);
          console.log(`[PROMPT-LEVEL] Salvo no banco: Assignment ${assignmentId} → Nível ${level}`);
          
          // Remove do pending updates após sucesso
          setPromptLevelPendingUpdates(prev => {
            const newPending = { ...prev };
            delete newPending[key];
            return newPending;
          });
        } catch (error) {
          console.error('Erro ao salvar prompt level no banco:', error);
          
          // Em caso de erro, reverte o optimistic update
          setPromptLevelPendingUpdates(prev => {
            const newPending = { ...prev };
            delete newPending[key];
            return newPending;
          });
          
          // Tenta buscar o valor real do banco
          try {
            const { getPromptLevelByPatientAndProgram } = await import('../api/promptLevelApi');
            const response = await getPromptLevelByPatientAndProgram(patientId, programId);
            const realLevel = response.currentPromptLevel || 5;
            setPromptLevelsCache(prev => ({ ...prev, [key]: realLevel }));
          } catch (fetchError) {
            console.warn('Erro ao buscar valor real do banco:', fetchError);
          }
        }
      } else {
        console.warn('Não foi possível salvar: assignmentId não fornecido');
        // Remove do pending updates
        setPromptLevelPendingUpdates(prev => {
          const newPending = { ...prev };
          delete newPending[key];
          return newPending;
        });
      }
      
      // Limpa o timer
      delete debounceTimersRef.current[key];
    }, 500);
  }, []);

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
