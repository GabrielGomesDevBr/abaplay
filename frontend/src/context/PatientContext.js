// frontend/src/context/PatientContext.js

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext'; // CORRIGIDO: Caminho de importação ajustado
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, isAuthenticated, token } = useAuth();

  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState(null);
  const [programForProgress, setProgramForProgress] = useState(null);

  // loadDataForRole agora aceita um ID para re-seleção como argumento
  // Removido selectedPatient e patients das dependências do useCallback para evitar loops
  const loadDataForRole = useCallback(async (initialSelectedPatientId = null) => {
    console.log("[PatientContext] Iniciando loadDataForRole...");
    if (!isAuthenticated || !token || !user) {
      console.log("[PatientContext] Não autenticado ou sem utilizador. Resetando estados.");
      // Apenas reseta selectedPatient se já havia algo selecionado para evitar re-render desnecessário
      if (selectedPatient !== null) setSelectedPatient(null); // Aqui 'selectedPatient' vem do closure
      setPatients([]);
      setIsLoading(false); 
      return;
    }
    
    setIsLoading(true);
    setError(null);

    console.log(`[PatientContext] ID do paciente para tentativa de re-seleção: ${initialSelectedPatientId}`);

    try {
      let patientData = [];
      let autoSelectPatient = null;

      if (user.is_admin) {
        console.log("Contexto: A carregar dados para ADMIN.");
        patientData = await fetchAllAdminPatients(token);
      } else if (user.role === 'terapeuta') {
        console.log("Contexto: A carregar dados para TERAPEUTA.");
        const response = await fetchAllPatients(token);
        
        if (Array.isArray(response)) {
            patientData = response;
        } else if (response && Array.isArray(response.patients)) {
            patientData = response.patients;
        } else {
            patientData = [];
        }

      } else if (user.role === 'pai') {
        console.log("Contexto: A carregar dados para PAI.");
        const parentData = await fetchParentDashboardData(token);
        patientData = parentData.patient ? [parentData.patient] : [];
        autoSelectPatient = parentData.patient || null;
      }

      console.log(`[PatientContext] Dados de pacientes carregados. Total: ${patientData.length}`);
      
      // Otimização: Atualiza 'patients' apenas se houver uma mudança real
      // Comparações de objetos complexos com JSON.stringify podem ser custosas em grandes datasets.
      // Para a maioria dos casos, comparar o comprimento e o ID do primeiro/último paciente pode ser suficiente
      // ou aceitar que `setPatients` pode re-renderizar, mas a seleção é preservada.
      // Vamos manter a comparação completa por enquanto, mas estar ciente.
      if (JSON.stringify(patients) !== JSON.stringify(patientData)) { // 'patients' aqui vem do closure
        setPatients(patientData || []);
        console.log("[PatientContext] Lista de pacientes atualizada.");
      } else {
        console.log("[PatientContext] Lista de pacientes inalterada. Evitando re-render de 'patients'.");
      }

      // Lógica para re-selecionar o paciente após o carregamento
      let newSelectedPatient = null;
      if (user.role === 'pai' && autoSelectPatient) {
        newSelectedPatient = autoSelectPatient;
        console.log(`[PatientContext] Modo Pai: Paciente ${autoSelectPatient.id} selecionado automaticamente.`);
      } else if (initialSelectedPatientId) { // Usa o ID passado como argumento
        const reSelected = patientData.find(p => p.id === initialSelectedPatientId);
        if (reSelected) {
          newSelectedPatient = reSelected;
          console.log(`[PatientContext] Paciente ID ${initialSelectedPatientId} re-selecionado.`);
        } else {
          console.log(`[PatientContext] Paciente ID ${initialSelectedPatientId} NÃO encontrado na nova lista. Seleção limpa.`);
        }
      } else {
        console.log(`[PatientContext] Nenhum paciente estava selecionado para re-seleção ou role diferente. Seleção limpa.`);
      }

      // Apenas atualiza selectedPatient se o objeto de referência ou o ID realmente mudar
      // 'selectedPatient' aqui também vem do closure
      if (selectedPatient?.id !== newSelectedPatient?.id || selectedPatient !== newSelectedPatient) {
          setSelectedPatient(newSelectedPatient);
          console.log(`[PatientContext] selectedPatient atualizado (nova referência ou ID diferente).`);
      } else {
          console.log(`[PatientContext] selectedPatient inalterado (mesma referência ou ID). Evitando re-render.`);
      }

    } catch (err) {
      console.error(`[PatientContext] Erro ao carregar dados para o papel '${user?.role}':`, err);
      setError(err.message);
      setPatients([]);
      setSelectedPatient(null);
    } finally {
      setIsLoading(false);
      console.log("[PatientContext] loadDataForRole finalizado.");
    }
  }, [isAuthenticated, token, user]); // Dependências do useCallback: apenas o que REALMENTE faz a função mudar

  // UseEffect que chama loadDataForRole na montagem ou quando dependências REALMENTE mudam
  useEffect(() => {
    // Na montagem inicial, não há patientId para re-selecionar, então passa null
    loadDataForRole(null); 
  }, [loadDataForRole]); 

  // --- Funções e estados que o contexto fornece ---
  
  const selectPatient = useCallback((patient) => {
    if (selectedPatient?.id !== patient?.id || selectedPatient !== patient) { // 'selectedPatient' vem do closure
        setSelectedPatient(patient);
        setProgramForProgress(null); 
        console.log(`[PatientContext] Paciente selecionado via selectPatient: ${patient?.id}`);
    } else {
        console.log(`[PatientContext] Tentativa de selecionar o mesmo paciente (ID: ${patient?.id}). Nenhuma mudança.`);
    }
  }, [selectedPatient]); // selectedPatient como dependência para a comparação correta


  // Outras funções de callback para evitar re-renders desnecessários
  const openPatientForm = useCallback((patient = null) => {
    setPatientToEdit(patient);
    setIsPatientFormOpen(true);
  }, []);

  const closePatientForm = useCallback(() => {
    setPatientToEdit(null);
    setIsPatientFormOpen(false);
  }, []);
  
  const openReportModal = useCallback(() => setIsReportModalOpen(true), []);
  const closeReportModal = useCallback(() => setIsReportModalOpen(false), []);
  
  const selectProgramForProgress = useCallback((program) => {
    setProgramForProgress(program);
  }, []);

  const performActionAndReload = useCallback(async (action) => {
    if (!token || !selectedPatient) { // 'selectedPatient' aqui é o closure, valor atual
        console.error("[PatientContext] Erro: Tentativa de performActionAndReload sem token ou paciente selecionado.");
        throw new Error("Nenhum paciente selecionado");
    }
    console.log(`[PatientContext] Executando ação e recarregando para paciente ID: ${selectedPatient.id}`);
    // Executa a ação
    await action();
    // Passa o ID do paciente atualmente selecionado para loadDataForRole
    await loadDataForRole(selectedPatient.id); 
  }, [token, selectedPatient, loadDataForRole]); // Dependências: token, selectedPatient para acessar o ID, loadDataForRole para chamar


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
    patients, 
    selectedPatient, 
    isLoading, 
    error,
    selectPatient, 
    isPatientFormOpen,
    patientToEdit,
    openPatientForm, 
    closePatientForm, 
    programForProgress, 
    selectProgramForProgress, 
    addSession,
    saveNotes, 
    isReportModalOpen, 
    openReportModal, 
    closeReportModal,
    assignProgram,
    removeProgram,
    toggleProgramStatus
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
