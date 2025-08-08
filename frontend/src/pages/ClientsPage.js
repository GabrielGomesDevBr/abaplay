import React, { useState, useEffect } from 'react';
import { usePatients } from '../context/PatientContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';

import PatientDetails from '../components/patient/PatientDetails';
import PatientForm from '../components/patient/PatientForm';
import AssignedProgramsList from '../components/program/AssignedProgramsList';
import SessionProgress from '../components/program/SessionProgress';
import ConsolidatedReportModal from '../components/patient/ConsolidatedReportModal';

// Adicionando estilos de animação
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.6s ease-out;
  }
`;

// Injeta os estilos no head
if (typeof document !== 'undefined' && !document.querySelector('#clients-page-styles')) {
  const style = document.createElement('style');
  style.id = 'clients-page-styles';
  style.textContent = fadeInStyle;
  document.head.appendChild(style);
}

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          {/* Container principal com espaçamento adequado */}
          <div className="space-y-8 p-6">
            {/* Seção de detalhes do paciente */}
            <div className="animate-fade-in">
              <PatientDetails />
            </div>
            
            {/* Seção de programas e progresso */}
            <div className="animate-fade-in">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full mr-4"></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">🎯 Gestão de Programas</h2>
                    <p className="text-gray-600 text-sm">Selecione um programa à esquerda para visualizar o progresso detalhado</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Lista de programas - 2 colunas */}
                <div className="lg:col-span-2">
                  <AssignedProgramsList 
                    onProgramSelect={handleProgramSelect}
                    selectedProgramId={selectedProgram?.assignment_id}
                  />
                </div>
                
                {/* Progresso do programa selecionado - 3 colunas */}
                <div className="lg:col-span-3">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[600px]">
                    {selectedProgram ? (
                      <>
                        {/* Cabeçalho do progresso */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                          <h3 className="text-xl font-bold text-white flex items-center">
                            📈 Progresso do Programa
                          </h3>
                          <p className="text-blue-100 text-sm mt-1 truncate">{selectedProgram.program_name}</p>
                        </div>
                        
                        {/* Conteúdo do progresso */}
                        <div className="p-6">
                          <SessionProgress program={selectedProgram} assignment={selectedProgram} />
                        </div>
                      </>
                    ) : (
                      /* Estado vazio quando nenhum programa está selecionado */
                      <div className="flex items-center justify-center h-full text-center p-8">
                        <div>
                          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                            <span className="text-4xl">📈</span>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-3">Selecione um Programa</h3>
                          <p className="text-gray-500 leading-relaxed max-w-md mx-auto">
                            Escolha um programa na lista ao lado para visualizar gráficos de progresso, 
                            histórico de sessões e dados detalhados de desempenho.
                          </p>
                          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span>Aguardando seleção</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Estado vazio melhorado */
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-8 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faUserCircle} className="text-6xl text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Bem-vindo à Gestão de Clientes</h2>
            <p className="text-lg text-gray-600 mb-6 max-w-lg mx-auto leading-relaxed">
              Selecione um cliente na barra lateral para acessar informações detalhadas, 
              gerenciar programas de intervenção e acompanhar o progresso.
            </p>
            <div className="bg-white border-2 border-dashed border-indigo-300 rounded-lg p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-3 text-indigo-600">
                <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Aguardando seleção de cliente</span>
              </div>
            </div>
          </div>
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
