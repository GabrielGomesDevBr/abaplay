import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllAdminPatients } from '../api/adminApi';
import { fetchParentDashboardData } from '../api/parentApi';
import { 
  fetchAllPatients,
  assignProgramToPatient,
  removeProgramFromPatient,
  updateProgramStatusForPatient,
  createSession,
  updatePatientNotes
} from '../api/patientApi';

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Começa carregando
  const [error, setError] = useState('');
  const { user, isAuthenticated, token } = useAuth();

  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);
  const [programForProgress, setProgramForProgress] = useState(null);

  // Função para recarregar os dados. Agora só depende de 'user' e 'token'.
  const refreshData = useCallback(async (patientIdToReselect = null) => {
    console.log('[CONTEXT-LOG] refreshData: Iniciando carregamento de dados');
    console.log('[CONTEXT-LOG] refreshData: user -', user?.name, '| role -', user?.role, '| isAuth -', isAuthenticated);
    
    if (!isAuthenticated || !user || !token) {
      console.log('[CONTEXT-LOG] refreshData: Usuário não autenticado, limpando dados');
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
        console.log('[CONTEXT-LOG] refreshData: Carregando dados para ADMIN');
        patientData = await fetchAllAdminPatients(token);
      } else if (user.role === 'terapeuta') {
        console.log('[CONTEXT-LOG] refreshData: Carregando dados para TERAPEUTA');
        patientData = await fetchAllPatients(token);
      } else if (user.role === 'pai') {
        console.log('[CONTEXT-LOG] refreshData: Carregando dados para PAI');
        const parentData = await fetchParentDashboardData(token);
        patientData = parentData.patient ? [parentData.patient] : [];
        if (parentData.patient) {
          console.log('[CONTEXT-LOG] refreshData: Pai - paciente encontrado:', parentData.patient.name);
          setSelectedPatient(parentData.patient);
        }
      }
      
      console.log(`[CONTEXT-LOG] refreshData: ${patientData.length} pacientes carregados`);
      setPatients(patientData);

      if (patientIdToReselect) {
        const reSelected = patientData.find(p => p.id === patientIdToReselect);
        setSelectedPatient(reSelected || null);
      } else if (user.role !== 'pai') {
        // Limpa a seleção se nenhum ID for passado e não for um pai (que tem auto-seleção)
        setSelectedPatient(null);
      }

    } catch (err) {
      console.error(`[CONTEXT-LOG] refreshData: ERRO ao carregar dados:`, err);
      console.error(`[CONTEXT-LOG] refreshData: ERRO detalhado:`, err.response?.data || err.message);
      setError(err.message || 'Falha ao carregar dados.');
      setPatients([]);
      setSelectedPatient(null);
    } finally {
      console.log('[CONTEXT-LOG] refreshData: Finalizando carregamento');
      setIsLoading(false);
    }
  // --- CORREÇÃO PRINCIPAL ---
  // Removido 'patients' e 'selectedPatient' da lista de dependências para quebrar o loop infinito.
  }, [isAuthenticated, user, token]);

  // Efeito que carrega os dados apenas quando o usuário muda.
  useEffect(() => {
    refreshData();
  }, [refreshData]); // Depende da função 'refreshData' que agora é estável.

  const selectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setProgramForProgress(null);
  }, []);

  // Ações que modificam dados e depois disparam um recarregamento.
  const performActionAndReload = async (action) => {
    if (!selectedPatient) throw new Error("Nenhum cliente selecionado.");
    const patientId = selectedPatient.id;
    await action();
    await refreshData(patientId); // Recarrega e re-seleciona o paciente atual
  };

  const assignProgram = (programId) => performActionAndReload(() => assignProgramToPatient(selectedPatient.id, programId, token));
  const removeProgram = (programId) => {
      if (window.confirm("Tem a certeza que deseja remover este programa?")) {
        performActionAndReload(() => removeProgramFromPatient(selectedPatient.id, programId, token));
      }
  };
  const toggleProgramStatus = (programId, currentStatus) => {
      const newStatus = currentStatus === 'active' ? 'archived' : 'active';
      performActionAndReload(() => updateProgramStatusForPatient(selectedPatient.id, programId, newStatus, token));
  };
  const addSession = (sessionData) => performActionAndReload(() => createSession(selectedPatient.id, sessionData, token));
  const saveNotes = (notes) => performActionAndReload(() => updatePatientNotes(selectedPatient.id, notes, token));

  const value = {
    patients, selectedPatient, isLoading, error,
    selectPatient,
    isPatientFormOpen, patientToEdit,
    openPatientForm: useCallback((patient = null) => { setPatientToEdit(patient); setIsPatientFormOpen(true); }, []),
    closePatientForm: useCallback(() => { setPatientToEdit(null); setIsPatientFormOpen(false); }, []),
    programForProgress,
    selectProgramForProgress: useCallback((program) => setProgramForProgress(program), []),
    isReportModalOpen,
    openReportModal: useCallback(() => setIsReportModalOpen(true), []),
    closeReportModal: useCallback(() => setIsReportModalOpen(false), []),
    assignProgram, removeProgram, toggleProgramStatus, addSession, saveNotes,
    refreshPatientData: refreshData
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
