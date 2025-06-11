import React from 'react';
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

  const handleSavePatient = async (patientData) => {
    if (patientToEdit) {
      await editPatient(patientData);
    } else {
      await addPatient(patientData);
    }
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
          {/* MELHORIA: A grelha agora adapta-se a partir de ecrãs médios (md) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AssignedProgramsList />
            <SessionProgress />
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

      {/* Renderiza o modal do formulário do paciente */}
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
