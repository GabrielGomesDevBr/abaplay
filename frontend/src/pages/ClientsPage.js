import React from 'react';
// --- INÍCIO DA NOVA ADIÇÃO ---
import { Link } from 'react-router-dom'; // Para criar o link de navegação
// --- FIM DA NOVA ADIÇÃO ---
import { usePatients } from '../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// --- INÍCIO DA NOVA ADIÇÃO ---
import { faUserCircle, faSpinner, faComments } from '@fortawesome/free-solid-svg-icons'; // Importa o ícone de comentários
// --- FIM DA NOVA ADIÇÃO ---


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

          {/* --- INÍCIO DA NOVA ADIÇÃO --- */}
          {/* Botão para acessar a página de discussão do caso */}
          <div className="flex justify-start">
            <Link
              to={`/patient/${selectedPatient.id}/discussion`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FontAwesomeIcon icon={faComments} className="mr-2 -ml-1 h-5 w-5" />
              Discussão de Caso
            </Link>
          </div>
          {/* --- FIM DA NOVA ADIÇÃO --- */}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <AssignedProgramsList />
            </div>
            
            <div className="lg:col-span-2">
                 <SessionProgress />
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
