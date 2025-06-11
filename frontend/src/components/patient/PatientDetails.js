import React from 'react';
import { usePatients } from '../../context/PatientContext';
import { usePrograms } from '../../context/ProgramContext'; 
import { generateProgramGradePDF, generateWeeklyRecordSheetPDF } from '../../utils/pdfGenerator'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt, faFilePdf, faClipboardList, faChartPie } from '@fortawesome/free-solid-svg-icons';

const formatDate = (dateString) => {
  if (!dateString) return 'Não informado';
  try {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return dateString.split('T')[0] || 'Data inválida';
  }
};

const PatientDetails = () => {
  const { selectedPatient, openPatientForm, removePatient, openReportModal } = usePatients();
  // 1. Obtém o estado de carregamento do contexto dos programas
  const { getProgramById, allProgramsData, isLoading: programsAreLoading } = usePrograms();

  if (!selectedPatient) {
    return null;
  }
  
  const handleEdit = () => {
    openPatientForm(selectedPatient);
  };

  const handleDelete = () => {
    removePatient(selectedPatient.id);
  };

  const handleGenerateGradePdf = () => {
    generateProgramGradePDF(selectedPatient, allProgramsData);
  };
  
  const handleGenerateRecordSheet = () => {
    // Passa 'allProgramsData' para a função, em vez de 'getProgramById'
    generateWeeklyRecordSheetPDF(selectedPatient, getProgramById, allProgramsData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">{selectedPatient.name}</h2>
          <p className="text-xs text-gray-500 mt-1">ID: <span className="font-mono">{selectedPatient.id}</span></p>
        </div>
        <div className="flex space-x-2 no-print">
          <button onClick={handleEdit} title="Editar Cliente" className="text-gray-500 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <FontAwesomeIcon icon={faEdit} className="fa-fw" />
          </button>
          <button onClick={handleDelete} title="Excluir Cliente" className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <FontAwesomeIcon icon={faTrashAlt} className="fa-fw" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mb-5 border-t border-gray-100 pt-4">
        <div>
          <strong className="text-gray-500 font-medium block mb-0.5">Data Nasc.:</strong>
          <span className="text-gray-700">{formatDate(selectedPatient.dob)}</span>
        </div>
        <div>
          <strong className="text-gray-500 font-medium block mb-0.5">Diagnóstico:</strong>
          <span className="text-gray-700">{selectedPatient.diagnosis || 'Não informado'}</span>
        </div>
        <div className="col-span-1 md:col-span-2">
          <strong className="text-gray-500 font-medium block mb-0.5">Anotações Gerais:</strong>
          <span className="block mt-1 text-gray-700 whitespace-pre-wrap text-xs leading-relaxed">
            {selectedPatient.general_notes || 'Sem anotações'}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 no-print">
        {/* 2. Adiciona a propriedade 'disabled' aos botões de PDF */}
        <button 
            onClick={handleGenerateGradePdf} 
            disabled={programsAreLoading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded-md text-xs transition duration-150 ease-in-out flex items-center space-x-1.5 border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-wait">
          <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
          <span>Grade PDF</span>
        </button>
        <button 
            onClick={handleGenerateRecordSheet} 
            disabled={programsAreLoading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded-md text-xs transition duration-150 ease-in-out flex items-center space-x-1.5 border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-wait">
          <FontAwesomeIcon icon={faClipboardList} className="text-blue-500" />
          <span>Registo PDF</span>
        </button>
        <button 
            onClick={openReportModal} 
            disabled={programsAreLoading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded-md text-xs transition duration-150 ease-in-out flex items-center space-x-1.5 border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-wait">
          <FontAwesomeIcon icon={faChartPie} className="text-green-500" />
          <span>Relatório Geral</span>
        </button>
      </div>
    </div>
  );
};

export default PatientDetails;
