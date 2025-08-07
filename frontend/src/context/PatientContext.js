import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllAdminPatients } from '../api/adminApi';
import { fetchParentDashboardData } from '../api/parentApi';
import { updateAssignmentStatus, getAssignmentsForPatient } from '../api/programApi'; 
import { 
  fetchAllPatients,
  assignProgramToPatient,
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
  const [programForProgress, setProgramForProgress] = useState(null);

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
          await selectPatient(parentData.patient);
        }
      }
      setPatients(patientData);
      if (patientIdToReselect) {
        const reSelected = patientData.find(p => p.id === patientIdToReselect);
        if (reSelected) {
          await selectPatient(reSelected);
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
    setIsLoadingPatient(true);
    setProgramForProgress(null);
    try {
      const assignedPrograms = await getAssignmentsForPatient(patient.id, token);
      setSelectedPatient({ ...patient, assigned_programs: assignedPrograms });
    } catch (error) {
      setError('Não foi possível carregar os detalhes do cliente.');
      setSelectedPatient(patient);
    } finally {
      setIsLoadingPatient(false);
    }
  }, [token]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const performActionAndReload = async (action) => {
    if (!selectedPatient) throw new Error("Nenhum cliente selecionado.");
    const patientId = selectedPatient.id;
    try {
        await action();
        const currentPatient = patients.find(p => p.id === patientId);
        if (currentPatient) {
          await selectPatient(currentPatient);
        }
    } catch (error) {
        console.error("Erro ao executar ação e recarregar:", error);
        throw error;
    }
  };

  const assignProgram = (programId) => performActionAndReload(() => assignProgramToPatient(selectedPatient.id, programId, token));
  
  const removeProgram = (programId) => {
      if (!selectedPatient) return;
      
      const assignment = selectedPatient.assigned_programs?.find(
        (p) => p.program_id === programId
      );

      if (!assignment) {
        alert("Erro: Não foi possível encontrar a referência do programa para remoção. Tente atualizar a página.");
        return;
      }

      // SOLUÇÃO: Usar a propriedade correta 'assignment_id' que vimos nos logs.
      const assignmentIdToRemove = assignment.assignment_id;
      
      if (!assignmentIdToRemove) {
        alert("Erro: ID da atribuição é inválido.");
        return;
      }

      if (window.confirm("Tem a certeza que deseja remover este programa permanentemente? Esta ação não pode ser desfeita.")) {
        performActionAndReload(() => removeProgramAssignment(assignmentIdToRemove, token));
      }
  };

  const toggleProgramStatus = (assignmentId, currentStatus) => {
      const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
      performActionAndReload(() => updateAssignmentStatus(assignmentId, newStatus, token));
  };

  const addSession = (sessionData) => performActionAndReload(() => createSession(selectedPatient.id, sessionData, token));
  const saveNotes = (notes) => performActionAndReload(() => updatePatientNotes(selectedPatient.id, notes, token));

  const value = {
    patients, selectedPatient, 
    isLoading, 
    isLoadingPatient,
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
