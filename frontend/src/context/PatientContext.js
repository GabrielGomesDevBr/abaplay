import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllAdminPatients } from '../api/adminApi';
import { fetchParentDashboardData } from '../api/parentApi';
// --- CORREÇÃO DE IMPORTAÇÃO ---
import { updateAssignmentStatus, getAllProgramsForPatient } from '../api/programApi'; 
import { 
  fetchAllPatients,
  assignProgramToPatient,
  removeProgramFromPatient,
  createSession,
  updatePatientNotes
} from '../api/patientApi';

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false); // Novo estado para loading do paciente selecionado
  const [error, setError] = useState('');
  const { user, isAuthenticated, token } = useAuth();

  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);
  const [programForProgress, setProgramForProgress] = useState(null);

  const refreshData = useCallback(async (patientIdToReselect = null) => {
    console.log('[CONTEXT-LOG] refreshData: Iniciando carregamento de dados');
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
          // Para o pai, já selecionamos e carregamos os dados completos.
          await selectPatient(parentData.patient);
        }
      }
      setPatients(patientData);

      if (patientIdToReselect) {
        const reSelected = patientData.find(p => p.id === patientIdToReselect);
        if (reSelected) {
          await selectPatient(reSelected); // Re-seleciona e carrega dados completos
        }
      } else if (user.role !== 'pai') {
        setSelectedPatient(null);
      }
    } catch (err) {
      console.error(`[CONTEXT-LOG] refreshData: ERRO ao carregar dados:`, err);
      setError(err.message || 'Falha ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, token]); // Removido selectPatient da dependência para evitar loop

  // --- CORREÇÃO PRINCIPAL ---
  // A função `selectPatient` agora busca os dados completos do paciente selecionado.
  const selectPatient = useCallback(async (patient) => {
    if (!patient) {
      setSelectedPatient(null);
      return;
    }
    
    console.log(`[CONTEXT-LOG] Selecionando paciente ${patient.id} e buscando dados completos...`);
    setIsLoadingPatient(true);
    setProgramForProgress(null);
    try {
      // Busca a lista de programas mais recente para este paciente
      const assignedPrograms = await getAllProgramsForPatient(patient.id);
      console.log(`[CONTEXT-LOG] Programas atribuídos para o paciente ${patient.id}:`, assignedPrograms);
      
      // Atualiza o objeto do paciente com a lista de programas completa
      setSelectedPatient({ ...patient, assigned_programs: assignedPrograms });

    } catch (error) {
      console.error(`Erro ao buscar detalhes do paciente ${patient.id}:`, error);
      setError('Não foi possível carregar os detalhes do cliente.');
      setSelectedPatient(patient); // Mantém os dados básicos mesmo em caso de erro
    } finally {
      setIsLoadingPatient(false);
    }
  }, [token]); // Depende apenas do token

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const performActionAndReload = async (action) => {
    if (!selectedPatient) throw new Error("Nenhum cliente selecionado.");
    const patientId = selectedPatient.id;
    await action();
    // Após a ação, recarrega os dados completos do paciente selecionado
    const currentPatient = patients.find(p => p.id === patientId);
    if (currentPatient) {
      await selectPatient(currentPatient);
    }
  };

  const assignProgram = (programId) => performActionAndReload(() => assignProgramToPatient(selectedPatient.id, programId, token));
  
  const removeProgram = (programId) => {
      if (window.confirm("Tem a certeza que deseja remover este programa permanentemente? Esta ação não pode ser desfeita.")) {
        performActionAndReload(() => removeProgramFromPatient(selectedPatient.id, programId, token));
      }
  };

  const toggleProgramStatus = (assignmentId, currentStatus) => {
      const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
      performActionAndReload(() => updateAssignmentStatus(assignmentId, newStatus));
  };

  const addSession = (sessionData) => performActionAndReload(() => createSession(selectedPatient.id, sessionData, token));
  const saveNotes = (notes) => performActionAndReload(() => updatePatientNotes(selectedPatient.id, notes, token));

  const value = {
    patients, selectedPatient, 
    isLoading, 
    isLoadingPatient, // Exporta o novo estado de loading
    error,
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
