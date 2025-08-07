import React, { useState, useEffect } from 'react';
import { usePatients } from '../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

import PatientDetails from '../components/patient/PatientDetails';
import PatientForm from '../components/patient/PatientForm';
import AssignedProgramsList from '../components/program/AssignedProgramsList';
import SessionProgress from '../components/program/SessionProgress';
import ConsolidatedReportModal from '../components/patient/ConsolidatedReportModal';

const ClientsPage = () => {
  const { 
    selectedPatient, 
    isLoading,
    isPatientFormOpen,
    closePatientForm,
    patientToEdit,
    addPatient,
    editPatient,
    isReportModalOpen,
    closeReportModal
  } = usePatients();

  // 1. Adiciona um estado para rastrear o programa selecionado na lista
  const [selectedProgram, setSelectedProgram] = useState(null);

  // 2. Garante que o programa selecionado seja limpo ao trocar de paciente
  useEffect(() => {
    setSelectedProgram(null);
  }, [selectedPatient]);

  const handleSavePatient = async (patientData) => {
    if (patientToEdit) {
      await editPatient(patientData);
    } else {
      await addPatient(patientData);
    }
  };

  // 3. Função para atualizar o estado quando um programa é clicado
  const handleProgramSelect = (program) => {
    setSelectedProgram(program);
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full text-center p-10">
            <div>
                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-indigo-500 mb-4" />
                <p className="text-gray-500">A carregar dados dos clientes...</p>
            </div>
        </div>
    );
  }

  return (
    <>
      {selectedPatient ? (
        <div className="space-y-6">
          <PatientDetails />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                {/* 4. Passa a função de seleção e o ID do programa selecionado para a lista */}
                <AssignedProgramsList 
                  onProgramSelect={handleProgramSelect}
                  selectedProgramId={selectedProgram?.assignment_id}
                />
            </div>
            
            {/* 5. Adiciona um contêiner estilizado para o componente de progresso */}
            <div className="lg:col-span-2 bg-white p-5 rounded-lg shadow-md border border-gray-200">
                 {/* 6. Passa o programa selecionado para o componente de progresso */}
                 <SessionProgress program={selectedProgram} assignment={selectedProgram} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-gray-500 p-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 h-full">
          <FontAwesomeIcon icon={faUserCircle} className="text-5xl text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">Selecione um cliente</p>
          <p className="mt-1 text-sm">
            Escolha um cliente na barra lateral para ver os detalhes e registrar o progresso.
          </p>
        </div>
      )}

      <PatientForm
        isOpen={isPatientFormOpen}
        onClose={closePatientForm}
        onSave={handleSavePatient}
        patientToEdit={patientToEdit}
      />
      
      <ConsolidatedReportModal 
        isOpen={isReportModalOpen}
        onClose={closeReportModal}
      />
    </>
  );
};

export default ClientsPage;
